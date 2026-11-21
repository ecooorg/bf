#!/usr/bin/env node
/**
 * ImmoFinder daily health: one closed check over GitHub (CI, poller, archive), Render (service, deployed commit,
 * runtime logs) and the latest search run. Writes health.json + health.md, appends the summary to the Actions
 * step summary and, on FAIL, opens or updates one GitHub Issue. It never changes code, never merges, never touches Render.
 * Each check is OK / WARN / FAIL / SKIP; SKIP means "not configured or no evidence", never a pass.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ISSUE_TITLE = 'ImmoFinder health: failing checks';
const ARCHIVE_PREFIXES = ['data/immofinder/diagnostics/'];
const POLL_WORKFLOW = 'immofinder-diagnostics-poll.yml';
const GITHUB_HINTS = {
  403: 'GitHub rejected the write: the app installation lacks contents:write on this repository, the repository is not part of the installation, or branch protection blocks the direct commit.',
  404: 'GitHub cannot see the repository or branch with this token: wrong owner/name or branch, or the installation does not include the repository.',
  401: 'The GitHub token or app JWT is invalid or expired: check the app id, installation id and private key.',
  409: 'Concurrent write conflict that exhausted retries.',
  422: 'GitHub refused the payload or SHA: concurrent update or an invalid branch.',
};

/** Publisher failures in runtime logs: `github_<publisher>_<step>_http_<status>[_detail][_request_<id>]`. */
export function classifyPublisherFailures(logText) {
  const found = new Map();
  const re = /\b(github_(?:diagnostics|snapshot|app_[a-z_]+?|token)[a-z_]*?)_http_(\d{3})((?:_[a-z0-9_-]+)?)/gi;
  for (const m of String(logText || '').matchAll(re)) {
    const [, step, status, tail] = m;
    const publisher = /^github_diagnostics/.test(step) ? 'diagnostics' : /^github_snapshot/.test(step) ? 'snapshot' : 'github_app_token';
    const key = `${publisher}|${step}|${status}`;
    const entry = found.get(key) || { publisher, step, status: Number(status), count: 0, requestId: null };
    entry.count += 1;
    const rid = /_request_([a-z0-9-]{1,80})/i.exec(tail || '');
    if (rid) entry.requestId = rid[1];
    found.set(key, entry);
  }
  const tokenHint = 'The installation token request was refused: the GitHub App does not hold Repository permission Contents: write, or the installation has not approved it. Grant it on the App and accept the updated permissions on the installation (contents:write).';
  return [...found.values()].map((e) => ({ ...e, hint: e.publisher === 'github_app_token' && [403, 422].includes(e.status) ? tokenHint : GITHUB_HINTS[e.status] || 'See the status code in the GitHub REST API documentation.' }));
}

/** Counters that the daily report lists next to the verdicts. */
export function countRuntimeSignals(logText) {
  const text = String(logText || '');
  const count = (re) => (text.match(re) || []).length;
  return {
    geminiTimeouts: count(/gemini[^\n]{0,160}(?:timeout|timed out|deadline)/gi),
    sslWarnings: count(/(?:ssl|tls|certificate)[^\n]{0,120}(?:verif|expired|invalid|unable)/gi),
    http5xx: count(/\bhttp[_ ]5\d\d\b/gi),
  };
}

export function searchQuality(report, target = 10) {
  const counts = report?.result?.counts || {};
  const stats = Array.isArray(report?.result?.sourceStats) ? report.result.sourceStats : [];
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return {
    candidates: num(counts.candidates),
    quality: num(counts.credible_kept ?? counts.kept),
    target,
    snippetOnly: num(counts.snippet_only),
    llmCalls: num(counts.llm_calls),
    fallback: num(counts.serper_fallback),
    errors: Array.isArray(report?.result?.errors) ? report.result.errors.length : 0,
    failingSources: stats.filter((s) => num(s.consecutiveBad) >= 5).map((s) => String(s.id)),
  };
}

export function verdict(checks) {
  if (checks.some((c) => c.status === 'FAIL')) return 'FAIL';
  if (checks.some((c) => c.status === 'WARN')) return 'WARN';
  return 'OK';
}

export function renderMarkdown(checks, extra = {}) {
  const mark = { OK: '✓', WARN: '⚠', FAIL: '✗', SKIP: '–' };
  const lines = [`# IMMOFINDER — DAILY HEALTH: ${verdict(checks)}`, ''];
  for (const group of ['GITHUB', 'RENDER', 'SEARCH', 'PUBLISHING']) {
    const rows = checks.filter((c) => c.group === group);
    if (!rows.length) continue;
    lines.push(`## ${group}`, ...rows.map((c) => `- ${mark[c.status]} ${c.name}: ${c.detail}`), '');
  }
  const priorities = checks.filter((c) => c.status === 'FAIL' || c.status === 'WARN')
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'FAIL' ? -1 : 1));
  if (priorities.length) lines.push('## PRIORITIES', ...priorities.map((c, i) => `${i + 1}. ${c.name}: ${c.detail}`), '');
  if (extra.generatedAt) lines.push(`_Generated ${extra.generatedAt}. Live search outcome is judged by the latest archived run only._`);
  return lines.join('\n') + '\n';
}

const check = (group, name, status, detail, data) => ({ group, name, status, detail, ...(data ? { data } : {}) });

async function getJson(url, headers, timeoutMs = 20000) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON body */ }
  return { status: res.status, body };
}

export async function runChecks(env = process.env, io = { getJson, readFile: (p) => fs.readFileSync(p, 'utf8'), exists: fs.existsSync }) {
  const checks = [];
  const base = String(env.IMMOFINDER_BASE_URL || '').replace(/\/+$/, '');
  const repo = String(env.GITHUB_REPOSITORY || '');
  const gh = env.GITHUB_TOKEN ? { Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' } : null;
  const logsDir = env.PLATFORM_LOGS_DIR || 'artifacts/platform-logs';
  const maxAgeHours = Number(env.HEALTH_MAX_DIAGNOSTICS_AGE_HOURS || 24);
  let mainSha = '';

  // ---- GITHUB: CI on main and the diagnostics poller ----
  if (!gh || !repo) checks.push(check('GITHUB', 'CI on main', 'SKIP', 'GITHUB_TOKEN / GITHUB_REPOSITORY not available'));
  else {
    try {
      const head = await io.getJson(`https://api.github.com/repos/${repo}/commits/main`, gh);
      mainSha = String(head.body?.sha || '');
      if (!/^[0-9a-f]{40}$/.test(mainSha)) throw new Error(`HTTP ${head.status}`);
      const runs = await io.getJson(`https://api.github.com/repos/${repo}/commits/${mainSha}/check-runs?per_page=100`, gh);
      const list = Array.isArray(runs.body?.check_runs) ? runs.body.check_runs : [];
      const failed = list.filter((r) => ['failure', 'timed_out', 'cancelled', 'action_required'].includes(r.conclusion)).map((r) => r.name);
      const pending = list.filter((r) => r.status !== 'completed').length;
      if (failed.length) checks.push(check('GITHUB', 'CI on main', 'FAIL', `${failed.length} failing at ${mainSha.slice(0, 7)}: ${failed.slice(0, 5).join(', ')}`));
      else if (!list.length) checks.push(check('GITHUB', 'CI on main', 'WARN', `no check runs reported for ${mainSha.slice(0, 7)}`));
      else checks.push(check('GITHUB', 'CI on main', pending ? 'WARN' : 'OK', `${list.length} checks at ${mainSha.slice(0, 7)}${pending ? `, ${pending} still running` : ', all completed without failure'}`));
    } catch (e) { checks.push(check('GITHUB', 'CI on main', 'FAIL', `cannot read main CI: ${e.message}`)); }
    try {
      const wf = await io.getJson(`https://api.github.com/repos/${repo}/actions/workflows/${POLL_WORKFLOW}/runs?per_page=5&status=completed`, gh);
      const last = wf.body?.workflow_runs?.[0];
      if (!last) checks.push(check('GITHUB', 'Diagnostics poller', 'WARN', 'no completed poll run found'));
      else checks.push(check('GITHUB', 'Diagnostics poller', last.conclusion === 'success' ? 'OK' : 'FAIL', `last completed run ${last.conclusion} at ${last.updated_at}`));
    } catch (e) { checks.push(check('GITHUB', 'Diagnostics poller', 'FAIL', `cannot read poll runs: ${e.message}`)); }
  }

  // ---- RENDER: liveness, readiness, deployed commit ----
  if (!base) checks.push(check('RENDER', 'Service /health', 'SKIP', 'IMMOFINDER_BASE_URL not configured'));
  else {
    let deployed = '';
    try {
      const h = await io.getJson(`${base}/health`, { Accept: 'application/json' });
      deployed = String(h.body?.commit || '');
      checks.push(check('RENDER', 'Service /health', h.status === 200 && h.body?.status === 'ok' ? 'OK' : 'FAIL', `HTTP ${h.status}, version ${h.body?.version ?? '?'}, commit ${deployed.slice(0, 7) || 'unknown'}`));
    } catch (e) { checks.push(check('RENDER', 'Service /health', 'FAIL', `unreachable: ${e.name === 'TimeoutError' ? 'timeout' : e.message}`)); }
    try {
      const r = await io.getJson(`${base}/ready`, { Accept: 'application/json' });
      checks.push(check('RENDER', 'Database ready', r.status === 200 ? 'OK' : 'FAIL', `HTTP ${r.status}${r.body?.reason ? ` ${r.body.reason}` : ''}`));
    } catch (e) { checks.push(check('RENDER', 'Database ready', 'FAIL', `unreachable: ${e.message}`)); }
    deployed = deployed.toLowerCase();
    if (!/^[0-9a-f]{7,40}$/.test(deployed) || !mainSha || !gh) checks.push(check('RENDER', 'Deployed commit', 'SKIP', 'deployed commit or main HEAD unavailable'));
    else if (mainSha.startsWith(deployed)) checks.push(check('RENDER', 'Deployed commit', 'OK', 'production runs main HEAD'));
    else {
      try {
        const cmp = await io.getJson(`https://api.github.com/repos/${repo}/compare/${deployed}...${mainSha}?per_page=100`, gh);
        const files = Array.isArray(cmp.body?.files) ? cmp.body.files.map((f) => f.filename) : null;
        if (!files) throw new Error(`HTTP ${cmp.status}`);
        const code = files.filter((f) => !ARCHIVE_PREFIXES.some((p) => f.startsWith(p)));
        checks.push(code.length ? check('RENDER', 'Deployed commit', 'WARN', `production is ${cmp.body.ahead_by} commit(s) behind main with ${code.length} non-archive file(s) changed (e.g. ${code.slice(0, 3).join(', ')}); deploy may be pending or failed`)
          : check('RENDER', 'Deployed commit', 'OK', 'only diagnostics-archive commits separate production from main'));
      } catch (e) { checks.push(check('RENDER', 'Deployed commit', 'WARN', `cannot compare deployed commit with main: ${e.message}`)); }
    }
  }

  // ---- RENDER runtime logs (collected by the poller step in the same job) ----
  const logFile = path.join(logsDir, 'render-logs.jsonl');
  let logText = '';
  if (io.exists(logFile)) {
    logText = io.readFile(logFile);
    const signals = countRuntimeSignals(logText);
    checks.push(check('RENDER', 'Runtime signals', signals.geminiTimeouts || signals.sslWarnings || signals.http5xx ? 'WARN' : 'OK',
      `Gemini timeouts ${signals.geminiTimeouts}, SSL warnings ${signals.sslWarnings}, 5xx ${signals.http5xx} in collected Render logs`, signals));
  } else {
    let failure = '';
    try { failure = (JSON.parse(io.readFile(path.join(logsDir, 'collection-summary.json'))).errors || []).find((e) => e.source === 'render')?.message || ''; } catch { /* collector did not run */ }
    checks.push(failure ? check('RENDER', 'Runtime signals', 'WARN', `Render log collection failed: ${failure}; publisher errors and runtime signals are unchecked`)
      : check('RENDER', 'Runtime signals', 'SKIP', 'Render logs were not collected (RENDER_API_KEY / RENDER_OWNER_ID / RENDER_SERVICE_ID)'));
  }

  // ---- PUBLISHING: which publisher failed, with which status ----
  const failures = classifyPublisherFailures(logText);
  if (!logText) checks.push(check('PUBLISHING', 'GitHub publishers', 'SKIP', 'no runtime logs to inspect'));
  else if (!failures.length) checks.push(check('PUBLISHING', 'GitHub publishers', 'OK', 'no GitHub publisher errors in the collected window'));
  else for (const f of failures) checks.push(check('PUBLISHING', `Publisher ${f.publisher}`, 'FAIL', `${f.step} HTTP ${f.status} ×${f.count}${f.requestId ? ` (GitHub request ${f.requestId})` : ''}. ${f.hint}`, f));

  // ---- SEARCH: latest completed run and whether it is archived ----
  if (!base || !env.IMMOFINDER_RUN_SECRET) checks.push(check('SEARCH', 'Latest run', 'SKIP', 'IMMOFINDER_BASE_URL / IMMOFINDER_RUN_SECRET not configured'));
  else {
    try {
      const d = await io.getJson(`${base}/api/immofinder/diagnostics/latest`, { Accept: 'application/json', 'X-Immofinder-Secret': env.IMMOFINDER_RUN_SECRET });
      if (d.status === 404) checks.push(check('SEARCH', 'Latest run', 'WARN', 'no completed run stored yet'));
      else if (d.status !== 200 || !d.body?.report) checks.push(check('SEARCH', 'Latest run', 'FAIL', `diagnostics endpoint HTTP ${d.status}`));
      else {
        const report = d.body.report;
        const ageH = (Date.now() - Date.parse(report.generatedAt || d.body.completedAt || '')) / 3.6e6;
        const q = searchQuality(report, Number(env.HEALTH_TARGET_RESULTS || 10));
        const stale = !Number.isFinite(ageH) || ageH > maxAgeHours;
        checks.push(check('SEARCH', 'Latest run', stale ? 'WARN' : 'OK', `${report.runId}, ${Number.isFinite(ageH) ? ageH.toFixed(1) : '?'} h old${stale ? ` (limit ${maxAgeHours} h)` : ''}`));
        checks.push(!report.result?.counts ? check('SEARCH', 'Result quality', 'WARN', 'latest report carries no result counts; quality cannot be judged')
          : check('SEARCH', 'Result quality', q.quality >= q.target ? 'OK' : 'WARN', `${q.candidates} candidates, ${q.quality} quality of target ${q.target}, ${q.snippetOnly} snippet-only, ${q.fallback} fallback, LLM calls ${q.llmCalls}${q.failingSources.length ? `, failing sources: ${q.failingSources.join(', ')}` : ''}`, q));
        let archived = null;
        if (io.exists('data/immofinder/diagnostics/latest.json')) {
          try { archived = JSON.parse(io.readFile('data/immofinder/diagnostics/latest.json')).runId; } catch { archived = null; }
        }
        const archiveAgeMin = (Date.now() - Date.parse(report.generatedAt || '')) / 60000;
        checks.push(!io.exists('data/immofinder/diagnostics/latest.json') ? check('PUBLISHING', 'Archive', 'SKIP', 'repository checkout has no archive to compare')
          : archived === report.runId ? check('PUBLISHING', 'Archive', 'OK', `run ${report.runId} is archived in the repository`)
          : check('PUBLISHING', 'Archive', archiveAgeMin > 15 ? 'FAIL' : 'WARN', `latest run ${report.runId} is not archived (archive holds ${archived || 'none'}); poller runs every 5 minutes`));
      }
    } catch (e) { checks.push(check('SEARCH', 'Latest run', 'FAIL', `diagnostics unreachable: ${e.message}`)); }
  }
  return checks;
}

async function upsertIssue(env, markdown) {
  const repo = env.GITHUB_REPOSITORY;
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
  const q = encodeURIComponent(`repo:${repo} is:issue is:open in:title "${ISSUE_TITLE}"`);
  const found = await getJson(`https://api.github.com/search/issues?q=${q}`, headers);
  const existing = found.body?.items?.find((i) => i.title === ISSUE_TITLE);
  const body = markdown.slice(0, 60000);
  const url = existing ? `https://api.github.com/repos/${repo}/issues/${existing.number}/comments` : `https://api.github.com/repos/${repo}/issues`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(existing ? { body } : { title: ISSUE_TITLE, body }), signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`issue write HTTP ${res.status}`);
  return existing ? `commented on #${existing.number}` : 'opened a new issue';
}

async function main() {
  const out = process.env.HEALTH_REPORT_DIR || 'artifacts/health';
  fs.mkdirSync(out, { recursive: true });
  const checks = await runChecks();
  const generatedAt = new Date().toISOString();
  const md = renderMarkdown(checks, { generatedAt });
  fs.writeFileSync(path.join(out, 'health.json'), JSON.stringify({ generatedAt, verdict: verdict(checks), checks }, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'health.md'), md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log(md);
  if (verdict(checks) === 'FAIL' && process.env.HEALTH_OPEN_ISSUE === 'true' && process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
    try { console.log(`Issue: ${await upsertIssue(process.env, md)}`); } catch (e) { console.error(`Issue not written: ${e.message}`); }
  }
  process.exitCode = verdict(checks) === 'FAIL' ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
