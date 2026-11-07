#!/usr/bin/env node
/**
 * P127.19 — LIVE Project Mode user-value run against a DEPLOYED instance.
 * Real path: /api/login -> create project -> /code/build (real model) -> poll -> download ZIP
 *            -> open the package in headless Chromium -> interact -> optional independent LLM judge.
 * Reports (never mixes): INFRA failures (login/API/quota/timeout) vs PRODUCT outcomes (what the person got).
 * Evidence honesty (G5): anything not executed is NOT_RUN. Deployed commit is compared with GITHUB_SHA, never assumed.
 * Zero-input defaults: EVAL_BASE_URL=https://biforge.onrender.com, UV_REPEATS=2, waits for the deploy of UV_EXPECTED_SHA (if set).
 *      `--list` prints scenarios and exits (no network).
 * Env: EVAL_BASE_URL (optional), UV_REPEATS, UV_EXPECTED_SHA, UV_DEPLOY_WAIT_MS, APP_PASSWORD|EVAL_APP_PASSWORD, GEMINI_API_KEY (judge, optional),
 *      UV_SCENARIOS (comma ids), UV_BUILD_TIMEOUT_MS (default 720000), UV_MIN_PASS_RATE (default 0 = measure only),
 *      UV_JUDGE_MODEL (optional; else ids from config/model-sources.json are tried in order), UV_OUT_DIR (default artifacts/project-user-value-live)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;
const BASE = String(env.EVAL_BASE_URL || 'https://biforge.onrender.com').replace(/\/+$/, '');
const REPEATS = Math.max(1, Number(env.UV_REPEATS) || 2);
const EXPECTED_SHA = String(env.UV_EXPECTED_SHA || '').trim();
const DEPLOY_WAIT_MS = Number(env.UV_DEPLOY_WAIT_MS) || 25 * 60_000;
const PASSWORD = env.EVAL_APP_PASSWORD || env.APP_PASSWORD || '';
const OUT = path.resolve(root, env.UV_OUT_DIR || 'artifacts/project-user-value-live');
const BUILD_TIMEOUT = Number(env.UV_BUILD_TIMEOUT_MS) || 720_000;
const MIN_PASS = Number(env.UV_MIN_PASS_RATE) || 0;
const configuredModels = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'config/model-sources.json'), 'utf8')); } catch { return null; } })();
const configIds = JSON.stringify(configuredModels ?? {}).match(/gemini-[\w.-]+/g) ?? [];
const JUDGE_MODELS = [...new Set([env.UV_JUDGE_MODEL, ...configIds].filter(Boolean))];
let JUDGE_MODEL = JUDGE_MODELS[0] || 'none';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class InfraError extends Error {}

/* ---------- HTTP helpers (cookie jar, same-origin header required by Project Mode writes) ---------- */
let cookie = '';
async function api(method, url, body, { raw = false } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), origin: BASE, ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
  if (raw) return res;
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: res.status, json, text: text.slice(0, 300) };
}

/* ---------- runtime check: what a person sees when opening the package ---------- */
async function runtimeCheck(browser, dir, shotPrefix) {
  // P127.30: open the package exactly like a person does (double-click / file manager): file://, no web server.
  const url = pathToFileURL(path.join(dir, 'index.html')).href;
  const out = { opened: false, pageErrors: [], consoleErrors: [], failedRequests: [], visibleText: 0, canvases: 0, canvasDrawn: null, controls: 0, reactsToInput: false, animatedWithoutInput: false, screenshots: [] };
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(String(e.message).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') out.consoleErrors.push(m.text().slice(0, 200)); });
  page.on('response', (r) => { if (r.status() >= 400) out.failedRequests.push(`${r.status()} ${r.url().replace(url, 'index.html')}`); });
  const snap = async () => {
    const png = await page.screenshot();
    const state = await page.evaluate(() => {
      const cs = [...document.querySelectorAll('canvas')];
      const drawn = cs.map((c) => { try { const g = c.getContext('2d'); if (!g || !c.width || !c.height) return null; const d = g.getImageData(0, 0, Math.min(c.width, 200), Math.min(c.height, 200)).data; const seen = new Set(); for (let i = 0; i < d.length; i += 4) { seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2] | (d[i + 3] << 24)); if (seen.size > 3) return true; } return false; } catch { return null; } });
      return { text: document.body.innerText.trim(), canvases: cs.length, drawn, controls: document.querySelectorAll('button, input, select, textarea, a[href], [role=button]').length, html: document.body.innerHTML.length };
    });
    return { hash: crypto.createHash('sha256').update(png).digest('hex'), png, state };
  };
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 20_000 });
    out.opened = true;
    await page.waitForTimeout(1200);
    const a = await snap();
    await page.waitForTimeout(1200);
    const b = await snap();
    out.animatedWithoutInput = a.hash !== b.hash;
    // generic human actions: click visible controls, type in inputs, press keys, tap the middle
    const clickable = await page.$$('button:visible, [role=button]:visible, input[type=checkbox]:visible');
    for (const el of clickable.slice(0, 6)) { try { await el.click({ timeout: 800 }); } catch { /* ignore */ } }
    for (const el of (await page.$$('input[type=text]:visible, input[type=number]:visible, input:not([type]):visible, textarea:visible')).slice(0, 3)) { try { await el.fill('12'); await el.press('Enter'); } catch { /* ignore */ } }
    for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter']) { await page.keyboard.press(k).catch(() => {}); await page.waitForTimeout(80); }
    await page.mouse.click(512, 384).catch(() => {}); await page.touchscreen.tap(512, 384).catch(() => {});
    await page.waitForTimeout(1200);
    const c = await snap();
    out.reactsToInput = c.state.text !== b.state.text || c.state.html !== b.state.html || c.hash !== b.hash;
    out.visibleText = c.state.text.length; out.canvases = c.state.canvases; out.controls = c.state.controls;
    out.canvasDrawn = c.state.drawn.length ? c.state.drawn.some((d) => d === true) : null;
    for (const [n, s] of [['before', a], ['after', c]]) { const f = `${shotPrefix}-${n}.png`; fs.writeFileSync(f, s.png); out.screenshots.push(f); }
  } catch (e) { out.error = String(e.message).slice(0, 200); }
  await ctx.close();
  out.rendersSomething = out.opened && (out.visibleText > 20 || out.canvasDrawn === true);
  out.noRuntimeErrors = out.pageErrors.length === 0 && out.failedRequests.length === 0;
  return out;
}

/* ---------- independent judge (optional): looks at screenshots, not at the code ---------- */
async function judge(scenario, rt) {
  if (!env.GEMINI_API_KEY) return { status: 'NOT_RUN', reason: 'no GEMINI_API_KEY' };
  if (!rt.screenshots.length) return { status: 'NOT_RUN', reason: 'no screenshots' };
  const parts = [{ text: `A person asked for: "${scenario.request}"\nThe images are what they see right after opening the delivered app (before, then after trying buttons/keys/taps).\nFor each statement answer yes/no/unclear based ONLY on the images:\n${scenario.mustObserve.map((m, i) => `${i + 1}. ${m}`).join('\n')}\nAlso give "useful" 0-3 (0 blank/broken, 1 unrecognisable, 2 partly what was asked, 3 clearly what was asked).\nReturn JSON only: {"answers":["yes|no|unclear",...],"useful":0-3,"why":"one sentence"}` },
    ...rt.screenshots.map((f) => ({ inlineData: { mimeType: 'image/png', data: fs.readFileSync(f).toString('base64') } }))];
  try {
    let r = null, j = null; const tried = [];
    for (const model of JUDGE_MODELS) {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }) });
      j = await r.json().catch(() => null);
      if (r.ok && j?.candidates?.length) { JUDGE_MODEL = model; break; }
      tried.push(`${model}:${r.status}:${String(j?.error?.message ?? '').slice(0, 80)}`); j = null;
    }
    if (!j) return { status: 'NOT_RUN', reason: `judge_unavailable ${tried.join(' | ')}`.slice(0, 400) };
    const v = JSON.parse(j?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'null');
    if (!v || !Array.isArray(v.answers)) return { status: 'NOT_RUN', reason: `judge_unparseable http=${r.status}` };
    const yes = v.answers.filter((a) => a === 'yes').length;
    return { status: 'RUN', model: JUDGE_MODEL, yes, total: scenario.mustObserve.length, useful: Number(v.useful) || 0, answers: v.answers, why: String(v.why || '').slice(0, 300) };
  } catch (e) { return { status: 'NOT_RUN', reason: String(e.message).slice(0, 120) }; }
}

/* ---------- wait until the deployed commit is the one under test (no manual /health check) ---------- */
async function waitForDeploy() {
  const t0 = Date.now(); let last = { version: 'unknown', commit: 'unknown' };
  for (;;) {
    try {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 60_000);
      const h = await fetch(`${BASE}/health`, { signal: ctl.signal }).then((x) => x.json()); clearTimeout(timer);
      last = { version: h.version ?? 'unknown', commit: h.commit ?? 'unknown' };
    } catch { /* cold start or deploy in progress */ }
    const match = !EXPECTED_SHA || (last.commit !== 'unknown' && (EXPECTED_SHA.startsWith(String(last.commit).slice(0, 7)) || String(last.commit).startsWith(EXPECTED_SHA.slice(0, 7))));
    if (match) return last;
    if (Date.now() - t0 > DEPLOY_WAIT_MS) return { ...last, waitFailed: `deployed commit ${last.commit} never matched ${EXPECTED_SHA.slice(0, 7)} within ${Math.round(DEPLOY_WAIT_MS / 60000)} min (deploy not live or health unreachable)` };
    console.log(`waiting for deploy: live=${last.commit} want=${EXPECTED_SHA.slice(0, 7)}`); await sleep(30_000);
  }
}

/* ---------- one scenario ---------- */
async function runScenario(browser, scenario, tag) {
  const t0 = Date.now();
  const dir = path.join(OUT, tag); fs.mkdirSync(path.join(dir, 'pkg'), { recursive: true });
  const rec = { id: tag, scenario: scenario.id, request: scenario.request, class: 'UNKNOWN', build: {}, runtime: null, judge: null };
  try {
    const proj = await api('POST', '/api/projects', { name: `uv-${scenario.id}-${Date.now()}`, state: { passport: { status: 'confirmed', projectType: 'web_app', goal: scenario.request, users: '', inputsOutputs: '', constraints: '', securityData: '', successCriteria: '', budget: { calls: 100, tokens: 500000, executorRuns: 0 }, executor: 'manual', humanLevel: 'supervised' } } });
    const pid = proj.json?.data?.id;
    if (!pid) throw new InfraError(`create_project http=${proj.status} ${proj.text}`);
    const start = await api('POST', `/api/projects/${pid}/code/build`, { goal: scenario.request, engine: 'staged' });
    const jobId = start.json?.data?.jobId;
    if (!jobId) throw new InfraError(`start_build http=${start.status} ${start.text}`);
    let job = null; const stages = [];
    while (Date.now() - t0 < BUILD_TIMEOUT) {
      await sleep(5000);
      const s = await api('GET', `/api/projects/${pid}/code/build/${jobId}`);
      job = s.json?.data; if (!job) continue;
      if (stages.at(-1) !== job.stage) stages.push(job.stage);
      if (['done', 'failed', 'cancelled'].includes(job.status)) break;
    }
    if (!job || !['done', 'failed', 'cancelled'].includes(job.status)) throw new InfraError(`build_timeout after ${Math.round((Date.now() - t0) / 1000)}s stage=${job?.stage}`);
    rec.build = { status: job.status, stage: job.stage, stages, outcome: job.outcome, goalImplemented: job.goalImplemented, callsUsed: job.callsUsed, callsBudget: job.callsBudget, failureReason: job.report?.failureReason ?? job.error?.message ?? null, units: (job.units || []).map((u) => `${u.path}:${u.status}`), seconds: Math.round((Date.now() - t0) / 1000), jobError: job.error ?? null, hasDownloadUrl: Boolean(job.downloadUrl), reportStatus: job.report?.status ?? null };
    if (/rate_limited|quota|429|unavailable|timeout/i.test(String(rec.build.failureReason))) throw new InfraError(`provider: ${rec.build.failureReason}`);
    if (!job.downloadUrl) { rec.class = 'PRODUCT_NO_PACKAGE'; return rec; }
    const dl = await api('GET', job.downloadUrl, null, { raw: true });
    if (dl.status !== 200) throw new InfraError(`download http=${dl.status}`);
    const zipPath = path.join(dir, 'package.zip'); fs.writeFileSync(zipPath, Buffer.from(await dl.arrayBuffer()));
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
    let jsBytes = 0, files = 0;
    for (const [name, entry] of Object.entries(zip.files)) {
      if (entry.dir || name.includes('..')) continue;
      const buf = await entry.async('nodebuffer'); files++; if (/\.m?js$/i.test(name)) jsBytes += buf.length;
      const dest = path.join(dir, 'pkg', name); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf);
    }
    rec.package = { files, jsBytes };
    const indexDir = fs.existsSync(path.join(dir, 'pkg', 'index.html')) ? path.join(dir, 'pkg') : null;
    if (!indexDir) { rec.class = 'PRODUCT_NO_INDEX'; return rec; }
    rec.runtime = await runtimeCheck(browser, indexDir, path.join(dir, 'shot'));
    rec.judge = await judge(scenario, rec.runtime);
    const rt = rec.runtime;
    const ok = rt.rendersSomething && rt.noRuntimeErrors && rt.reactsToInput && (rec.judge.status !== 'RUN' || (rec.judge.useful >= 2 && rec.judge.yes / rec.judge.total >= 0.67));
    rec.class = ok ? 'PRODUCT_PASS' : 'PRODUCT_FAIL';
    rec.honestyMismatch = (job.outcome === 'SUCCESS' && rec.class === 'PRODUCT_FAIL') ? 'SUCCESS reported but human check failed' : (job.outcome !== 'SUCCESS' && rec.class === 'PRODUCT_PASS' ? 'not SUCCESS but package works' : null);
  } catch (e) { rec.class = e instanceof InfraError ? 'INFRA_FAIL' : 'RUNNER_ERROR'; rec.error = String(e.message).slice(0, 300); }
  return rec;
}

function markdown(rep) {
  const L = ['# Project Mode — LIVE user-value run', '', `Base: ${rep.baseUrl}`, `Deployed: version ${rep.deployed.version} commit ${rep.deployed.commit}`, `Repo commit: ${rep.repoCommit || 'unknown'} · deployed==repo: **${rep.commitMatch}**`, `Judge: ${rep.judgeModel || 'NOT_RUN'}`, '',
    `Product pass: **${rep.summary.productPass}/${rep.summary.productRuns}** · infra failures: ${rep.summary.infra} (reported separately, not counted as product failures)`, '',
    '| Scenario | Class | Build outcome | Calls | Renders | No errors | Reacts | Judge | Mismatch |', '|---|---|---|---|---|---|---|---|---|'];
  for (const r of rep.results) L.push(`| ${r.id} | ${r.class} | ${r.build.outcome ?? '-'} | ${r.build.callsUsed ?? '-'}/${r.build.callsBudget ?? '-'} | ${r.runtime?.rendersSomething ?? '-'} | ${r.runtime?.noRuntimeErrors ?? '-'} | ${r.runtime?.reactsToInput ?? '-'} | ${r.judge?.status === 'RUN' ? `${r.judge.yes}/${r.judge.total}, useful ${r.judge.useful}` : r.judge?.status ?? '-'} | ${r.honestyMismatch ?? ''} |`);
  if (rep.byScenario) { L.push('', '## Per scenario (repeats)'); for (const [id, cs] of Object.entries(rep.byScenario)) L.push(`- ${id}: ${cs.map((c) => c.replace('PRODUCT_', '')).join(', ')}`); }
  L.push('', '## Details');
  for (const r of rep.results) L.push(`- **${r.id}** ${r.class}${r.error ? ` — ${r.error}` : ''}${r.build.failureReason ? ` — failureReason: ${String(r.build.failureReason).slice(0, 200)}` : ''}${r.runtime?.pageErrors?.length ? ` — pageErrors: ${r.runtime.pageErrors.slice(0, 2).join(' | ')}` : ''}${r.judge?.why ? ` — judge: ${r.judge.why}` : ''}`);
  L.push('', 'Interpretation: runtime checks are generic signals (rendered, no errors, reacts to input); the judge only sees screenshots. A pass is evidence for these scenarios on this commit, not a general guarantee. Prompt set authorship is stated in config/project-user-value-prompts.json.');
  return L.join('\n');
}

async function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config/project-user-value-prompts.json'), 'utf8'));
  const want = String(env.UV_SCENARIOS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const scenarios = cfg.scenarios.filter((s) => !want.length || want.includes(s.id));
  if (process.argv.includes('--list')) { console.log(scenarios.map((s) => s.id).join('\n')); console.log(`base=${BASE} repeats=${REPEATS}`); process.exit(0); }
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const deployed = await waitForDeploy();
  if (deployed.waitFailed) {
    const rep = { mode: 'live', baseUrl: BASE, deployed, repoCommit: EXPECTED_SHA, commitMatch: false, summary: { productRuns: 0, productPass: 0, infra: 1, runnerErrors: 0 }, results: [{ id: 'deploy', class: 'INFRA_FAIL', build: {}, error: deployed.waitFailed }] };
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rep, null, 2)); fs.writeFileSync(path.join(OUT, 'report.md'), markdown(rep));
    console.log(markdown(rep)); if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, markdown(rep) + '\n');
    process.exit(1);
  }
  const repoCommit = EXPECTED_SHA || env.GITHUB_SHA || '';
  const commitMatch = !repoCommit || deployed.commit === 'unknown' ? 'UNKNOWN' : String(deployed.commit).startsWith(repoCommit.slice(0, 7)) || repoCommit.startsWith(String(deployed.commit).slice(0, 7));
  const login = PASSWORD ? await api('POST', '/api/login', { password: PASSWORD }) : { status: 0, json: null, text: 'no password' };
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const results = [];
  if (!PASSWORD || login.json?.authenticated !== true && login.json?.success !== true) {
    for (const s of scenarios) results.push({ id: s.id, request: s.request, class: 'INFRA_FAIL', build: {}, error: `login failed http=${login.status} ${login.text}` });
  } else for (let n = 1; n <= REPEATS; n++) for (const s of scenarios) { const tag = `${s.id}-r${n}`; console.log(`▶ ${tag}`); results.push(await runScenario(browser, s, tag)); console.log(`  → ${results.at(-1).class}`); }
  await browser.close();
  const productRuns = results.filter((r) => r.class.startsWith('PRODUCT')).length;
  const productPass = results.filter((r) => r.class === 'PRODUCT_PASS').length;
  const rep = { mode: 'live', baseUrl: BASE, deployed, repoCommit, commitMatch, promptSet: { version: cfg.version, authoredBy: cfg.authoredBy }, judgeModel: env.GEMINI_API_KEY ? JUDGE_MODELS.join(' → ') : null, byScenario: Object.fromEntries([...new Set(results.map((r) => r.scenario).filter(Boolean))].map((id) => [id, results.filter((r) => r.scenario === id).map((r) => r.class)])), summary: { productRuns, productPass, infra: results.filter((r) => r.class === 'INFRA_FAIL').length, runnerErrors: results.filter((r) => r.class === 'RUNNER_ERROR').length }, results };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rep, null, 2));
  fs.writeFileSync(path.join(OUT, 'report.md'), markdown(rep));
  console.log(markdown(rep));
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, markdown(rep) + '\n');
  const noMeasure = productRuns === 0;
  const belowBar = productRuns > 0 && productPass / productRuns < MIN_PASS;
  process.exit(noMeasure || belowBar || rep.summary.runnerErrors ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
