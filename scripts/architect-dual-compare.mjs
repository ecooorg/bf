/**
 * Architect dual-compare: same goal through Lab-shaped API path and Legacy-shaped API path.
 * Produces JSON + Markdown report so the navigator only reviews the verdict.
 *
 * Env:
 *   STAGING_SERVICE_URL   HTTPS base (or http://127.0.0.1 with P118_ALLOW_LOOPBACK=true)
 *   STAGING_APP_PASSWORD  app password
 *   DUAL_GOAL             optional goal text (else fixture file / default)
 *   DUAL_OUT_DIR          output directory (default architect-dual-compare)
 *   DUAL_BUILD_WAIT_MS    max wait per build (default 600000)
 *   DUAL_CLEANUP          delete projects after run (default true)
 *   DUAL_DRY_RUN          if true, write a template report and exit 0 without network
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const dryRun = String(process.env.DUAL_DRY_RUN || '').toLowerCase() === 'true';
const base = String(process.env.STAGING_SERVICE_URL || '').replace(/\/+$/, '');
const password = process.env.STAGING_APP_PASSWORD || '';
const loopbackOk = process.env.P118_ALLOW_LOOPBACK === 'true' && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(base);
const BUILD_WAIT_MS = Math.max(60_000, Math.min(900_000, Number(process.env.DUAL_BUILD_WAIT_MS) || 600_000));
const POLL_MS = Math.max(50, Math.min(10_000, Number(process.env.DUAL_POLL_MS) || 3_000));
const cleanup = String(process.env.DUAL_CLEANUP || 'true').toLowerCase() !== 'false';
const outDir = path.resolve(process.env.DUAL_OUT_DIR || path.join(root, 'architect-dual-compare'));
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const startedAt = new Date().toISOString();

const FIXTURE = path.join(__dirname, 'fixtures', 'architect-dual-expense-goal.txt');

async function loadGoal() {
  const fromEnv = String(process.env.DUAL_GOAL || '').trim();
  if (fromEnv) return fromEnv.slice(0, 4000);
  try {
    return (await readFile(FIXTURE, 'utf8')).trim().slice(0, 4000);
  } catch {
    return 'Small static expense tracker: add/list/edit/delete expenses in the browser with localStorage.';
  }
}

function proposedPassport(goal) {
  const g = goal.trim().slice(0, 2000);
  return {
    status: 'proposed',
    projectType: 'Web application',
    goal: g,
    users: 'Individual users tracking personal expenses',
    inputsOutputs: 'Inputs: amount, date, category, description. Outputs: list and totals.',
    constraints: 'Static HTML/CSS/JS; works when opened as a file on mobile.',
    securityData: 'No secrets; validate amounts client-side.',
    successCriteria: 'User can add, view, edit, delete expenses and see totals; ZIP includes the app files.',
    budget: { calls: 40, tokens: 200000, executorRuns: 8 },
    executor: 'model_patch',
    humanLevel: 'supervised',
  };
}

const secrets = [password].filter(Boolean);
const redact = (s) => secrets.reduce((acc, v) => (v ? acc.split(v).join('[REDACTED]') : acc), String(s));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let cookie = '';
async function request(method, urlPath, body, { binary = false, timeoutMs = 60_000 } = {}) {
  const r = await fetch(`${base}${urlPath}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(method !== 'GET' ? { origin: new URL(base).origin } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const pairs = (typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : []).map((c) => c.split(';')[0]).filter(Boolean);
  if (pairs.length) {
    cookie = pairs.join('; ');
    secrets.push(...pairs.map((p) => p.split('=').slice(1).join('=')).filter((v) => v.length > 8));
  }
  if (binary) {
    const buf = Buffer.from(await r.arrayBuffer());
    return { status: r.status, contentType: r.headers.get('content-type') || '', bytes: buf.length, buffer: buf };
  }
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  return { status: r.status, contentType: r.headers.get('content-type') || '', body: json, text };
}

async function login() {
  const r = await request('POST', '/api/login', { password });
  if (r.status >= 400 || !r.body?.authenticated) {
    throw new Error(`login failed: HTTP ${r.status} ${redact(r.text || '')}`);
  }
}

async function pollBuild(projectId, initial, waitMs) {
  const deadline = Date.now() + waitMs;
  let job = initial?.data || initial;
  if (job?.status === 'done' || job?.status === 'failed' || job?.status === 'cancelled' || job?.outcome) {
    return { job, timedOut: false };
  }
  const jobId = job?.jobId;
  if (!jobId) return { job, timedOut: false };
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    const r = await request('GET', `/api/projects/${encodeURIComponent(projectId)}/code/build/${encodeURIComponent(jobId)}`);
    job = r.body?.data || r.body || job;
    const st = job?.status;
    if (st === 'done' || st === 'failed' || st === 'cancelled' || job?.outcome === 'SUCCESS' || job?.outcome === 'PARTIAL' || job?.outcome === 'FAILED') {
      return { job, timedOut: false };
    }
  }
  return { job, timedOut: true };
}

async function loadLiveLib() {
  return import('./p118-architect-live-lib.mjs');
}

async function downloadAndInspect(projectId, downloadUrl, lib) {
  if (!downloadUrl) return null;
  const url = downloadUrl.startsWith('/')
    ? downloadUrl
    : `/api/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(downloadUrl)}/download`;
  const r = await request('GET', url, undefined, { binary: true, timeoutMs: 120_000 });
  let zip = null;
  if (r.status === 200 && r.bytes > 0) {
    try {
      const { default: JSZip } = await import('jszip');
      const z = await JSZip.loadAsync(r.buffer);
      const entries = [];
      z.forEach((name, entry) => { entries.push({ name, dir: entry.dir, size: entry._data?.uncompressedSize ?? 0 }); });
      zip = lib.inspectZipEntries(entries);
      zip.names = entries.filter((e) => !e.dir).map((e) => e.name);
    } catch (e) {
      zip = { ok: false, reasons: [`zip_parse:${e.message}`], fileCount: 0 };
    }
  }
  return {
    status: r.status,
    contentType: r.contentType,
    bytes: r.bytes,
    lengthMatches: true,
    zip,
  };
}

async function runPath(kind, goal, lib) {
  const name = `dual-${kind}-${stamp}`.slice(0, 80);
  const t0 = Date.now();
  const passport = proposedPassport(goal);
  let projectId = null;
  const steps = [];

  try {
    let createBody;
    if (kind === 'lab') {
      createBody = {
        name,
        goal: passport.goal,
        state: { passport, architecturalLab: { createdAt: new Date().toISOString(), dualCompare: true } },
      };
    } else {
      createBody = { name, goal: passport.goal };
    }
    const created = await request('POST', '/api/projects', createBody);
    steps.push({ step: 'create', http: created.status });
    if (created.status >= 400 || !created.body?.data?.id) {
      return {
        kind,
        ok: false,
        error: `create_failed:${created.status}:${redact(created.text || '')}`,
        durationMs: Date.now() - t0,
        steps,
      };
    }
    const project = created.body.data;
    projectId = project.id;
    let version = project.state_version;

    const confirmed = { ...passport, status: 'confirmed' };
    const stateBase = kind === 'lab'
      ? { ...(project.state || {}), passport: confirmed, architecturalLab: { dualCompare: true } }
      : { ...(project.state || {}), passport: confirmed };
    const put = await request('PUT', `/api/projects/${encodeURIComponent(projectId)}/state`, {
      expected_version: version,
      state: stateBase,
    });
    steps.push({ step: 'confirm_passport', http: put.status });
    if (put.status >= 400) {
      return {
        kind, projectId, ok: false,
        error: `confirm_failed:${put.status}:${redact(put.text || '')}`,
        durationMs: Date.now() - t0, steps,
      };
    }
    version = put.body?.data?.state_version ?? version + 1;

    const buildStart = await request('POST', `/api/projects/${encodeURIComponent(projectId)}/code/build`, {
      goal: passport.goal,
    }, { timeoutMs: 120_000 });
    steps.push({ step: 'build_start', http: buildStart.status });
    if (buildStart.status >= 400) {
      return {
        kind, projectId, ok: false,
        error: `build_start_failed:${buildStart.status}:${redact(buildStart.text || JSON.stringify(buildStart.body))}`,
        durationMs: Date.now() - t0, steps,
        buildHttp: buildStart.status,
        buildBody: buildStart.body,
      };
    }

    const { job, timedOut } = await pollBuild(projectId, buildStart.body, BUILD_WAIT_MS);
    steps.push({ step: 'build_poll', timedOut, status: job?.status, outcome: job?.outcome });

    const download = job?.downloadUrl
      ? await downloadAndInspect(projectId, job.downloadUrl, lib)
      : null;

    const classified = lib.classifyBuild({
      timedOut,
      buildHttp: buildStart.status,
      buildBody: buildStart.body,
      job,
      download,
    });

    return {
      kind,
      projectId,
      ok: classified.verdict === 'PASS' || classified.verdict === 'PARTIAL',
      verdict: classified.verdict,
      reasons: classified.reasons,
      normalized: classified.normalized,
      outcome: job?.outcome ?? job?.report?.outcome ?? null,
      goalImplemented: job?.goalImplemented ?? job?.report?.goalImplemented ?? null,
      failureReason: job?.failureReason ?? job?.report?.failureReason ?? null,
      failedStage: job?.failedStage ?? job?.report?.failedStage ?? null,
      validators: job?.report?.validators ?? job?.validators ?? null,
      callsUsed: job?.callsUsed ?? job?.report?.callsUsed ?? null,
      durationMs: Date.now() - t0,
      download: download
        ? {
            status: download.status,
            bytes: download.bytes,
            zipOk: lib.zipVerified(download),
            fileCount: download.zip?.fileCount ?? 0,
            names: download.zip?.names ?? [],
            zipReasons: download.zip?.reasons ?? [],
          }
        : null,
      steps,
    };
  } finally {
    if (cleanup && projectId) {
      try { await request('DELETE', `/api/projects/${encodeURIComponent(projectId)}`); } catch { /* ignore */ }
    }
  }
}

function recommendation(lab, legacy) {
  const rank = (v) => ({ PASS: 3, PARTIAL: 2, TRUTHFUL_FAIL: 1, FALSE_SUCCESS: 0, INCONSISTENT: 0, TIMEOUT: 0, BLOCKED: 0, UNKNOWN: 0 }[v] ?? 0);
  const lv = lab?.verdict || 'UNKNOWN';
  const rv = legacy?.verdict || 'UNKNOWN';
  if (lab?.error && legacy?.error) {
    return {
      choice: 'NEITHER',
      confidence: 'low',
      summary: 'Both paths failed before a comparable build finished. Fix API/auth/staging first.',
    };
  }
  if (rank(lv) > rank(rv)) {
    return { choice: 'LAB', confidence: rank(lv) >= 3 ? 'high' : 'medium', summary: `Lab verdict ${lv} ranks above Legacy ${rv}. Prefer Lab as primary if UX is acceptable.` };
  }
  if (rank(rv) > rank(lv)) {
    return { choice: 'LEGACY', confidence: rank(rv) >= 3 ? 'high' : 'medium', summary: `Legacy verdict ${rv} ranks above Lab ${lv}. Keep Legacy primary until Lab matches.` };
  }
  if (lv === 'PASS' && rv === 'PASS') {
    return { choice: 'TIE_PREFER_LAB', confidence: 'high', summary: 'Both PASS on the same goal. Prefer Lab as primary; keep Legacy as fallback.' };
  }
  return {
    choice: 'TIE',
    confidence: 'medium',
    summary: `Same verdict band (${lv}). Prefer the path with fewer validator failures and shorter duration; confirm once on device.`,
  };
}

function markdownReport(report) {
  const { lab, legacy, recommendation: rec, goal } = report;
  const row = (label, a, b) => `| ${label} | ${a ?? '—'} | ${b ?? '—'} |`;
  const val = (side) => {
    if (!side?.validators) return '—';
    const bad = side.validators.filter((v) => !v.ok).map((v) => v.name);
    return bad.length ? `fail:${bad.join(',')}` : 'all_ok';
  };
  return [
    '# Architect dual-compare report',
    '',
    `- Generated: ${report.generatedAt}`,
    `- Goal (truncated): ${JSON.stringify(goal.slice(0, 200))}${goal.length > 200 ? '…' : ''}`,
    `- Goal chars: ${goal.length}`,
    '',
    '## Recommendation (navigator decision aid)',
    '',
    `- **Choice:** ${rec.choice}`,
    `- **Confidence:** ${rec.confidence}`,
    `- **Summary:** ${rec.summary}`,
    '',
    '## Comparison',
    '',
    '| Metric | Lab path | Legacy path |',
    '|---|---|---|',
    row('verdict', lab?.verdict, legacy?.verdict),
    row('outcome', lab?.outcome, legacy?.outcome),
    row('goalImplemented', lab?.goalImplemented, legacy?.goalImplemented),
    row('failureReason', lab?.failureReason, legacy?.failureReason),
    row('validators', val(lab), val(legacy)),
    row('callsUsed', lab?.callsUsed, legacy?.callsUsed),
    row('durationMs', lab?.durationMs, legacy?.durationMs),
    row('zip bytes', lab?.download?.bytes, legacy?.download?.bytes),
    row('zip files', lab?.download?.fileCount, legacy?.download?.fileCount),
    row('error', lab?.error, legacy?.error),
    '',
    '## Navigator next step',
    '',
    '1. If choice is LAB or TIE_PREFER_LAB — keep Architect entry on `/architect-lab`; leave `/project` as fallback.',
    '2. If choice is LEGACY — keep dual entry until Lab matches on a re-run.',
    '3. Optional: open both ZIPs once on the tablet (manual). Automation already compared build outcomes and validators.',
    '',
    '## Automation note',
    '',
    'This report is produced without a human driving the UI. Routine create → passport → build → download → classify runs in CI/staging.',
    '',
  ].join('\n');
}

async function main() {
  const goal = await loadGoal();
  await mkdir(outDir, { recursive: true });

  if (dryRun) {
    const report = {
      schemaVersion: 1,
      artifactType: 'architect-dual-compare',
      generatedAt: startedAt,
      dryRun: true,
      goal,
      lab: { kind: 'lab', verdict: 'UNKNOWN', note: 'dry-run' },
      legacy: { kind: 'legacy', verdict: 'UNKNOWN', note: 'dry-run' },
      recommendation: {
        choice: 'NEITHER',
        confidence: 'low',
        summary: 'Dry run only — no staging calls. Set STAGING_SERVICE_URL and STAGING_APP_PASSWORD for a live compare.',
      },
    };
    await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    await writeFile(path.join(outDir, 'report.md'), markdownReport(report));
    console.log(JSON.stringify({ ok: true, dryRun: true, outDir }, null, 2));
    return;
  }

  if (!base || !(/^https:\/\//i.test(base) || loopbackOk)) {
    throw new Error('STAGING_SERVICE_URL must be an HTTPS URL (or loopback with P118_ALLOW_LOOPBACK=true)');
  }
  if (!password) throw new Error('STAGING_APP_PASSWORD is required');

  await login();
  const lib = await loadLiveLib();
  const lab = await runPath('lab', goal, lib);
  const legacy = await runPath('legacy', goal, lib);
  const rec = recommendation(lab, legacy);
  const report = {
    schemaVersion: 1,
    artifactType: 'architect-dual-compare',
    generatedAt: new Date().toISOString(),
    startedAt,
    goal,
    lab,
    legacy,
    recommendation: rec,
  };

  await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile(path.join(outDir, 'report.md'), markdownReport(report));
  console.log(JSON.stringify({
    ok: true,
    outDir,
    recommendation: rec,
    lab: { verdict: lab.verdict, outcome: lab.outcome, error: lab.error || null },
    legacy: { verdict: legacy.verdict, outcome: legacy.outcome, error: legacy.error || null },
  }, null, 2));

  // Exit 0 even on PARTIAL so the artifact is always uploaded; navigator reads recommendation.
  // Exit 2 only on total infrastructure failure (both paths errored before classify).
  if (lab.error && legacy.error) process.exitCode = 2;
}

main().catch((e) => {
  console.error(redact(e?.stack || e?.message || String(e)));
  process.exit(1);
});
