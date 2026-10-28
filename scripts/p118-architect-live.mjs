import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import JSZip from 'jszip';
import { classifyBuild, classifyRefusal, inspectZipEntries, overallVerdict, exitCodeFor } from './p118-architect-live-lib.mjs';

const base = String(process.env.STAGING_SERVICE_URL || '').replace(/\/+$/, '');
const password = process.env.STAGING_APP_PASSWORD || '';
const loopbackOk = process.env.P118_ALLOW_LOOPBACK === 'true' && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(base);
if (!base || !(/^https:\/\//i.test(base) || loopbackOk)) throw new Error('STAGING_SERVICE_URL must be an HTTPS URL');
if (!password) throw new Error('STAGING_APP_PASSWORD is required');

const DEFAULT_GOAL = 'Small web app for a neighborhood library: list books, search by title, add a book. Data stays in the browser; no backend.';
const goal = String(process.env.P118_GOAL || '').trim().slice(0, 2000) || DEFAULT_GOAL;
const cleanup = String(process.env.P118_CLEANUP || 'true').toLowerCase() !== 'false';
const BUILD_WAIT_MS = Math.max(60_000, Math.min(900_000, Number(process.env.P118_BUILD_WAIT_MS) || 600_000));
const CALL_MS = 60_000;
const POLL_MS = Math.max(50, Math.min(10_000, Number(process.env.P118_POLL_MS) || 3_000));
const outDir = process.env.P118_OUT_DIR || 'p118-live';
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const startedAt = new Date().toISOString();

const secrets = [password];
const redact = (s) => secrets.reduce((acc, v) => (v ? acc.split(v).join('[REDACTED]') : acc), String(s));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let cookie = '';
const request = async (method, urlPath, body, { binary = false, timeoutMs = CALL_MS } = {}) => {
  try {
    const r = await fetch(`${base}${urlPath}`, {
      method,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(method !== 'GET' ? { origin: new URL(base).origin } : {}), ...(cookie ? { cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const pairs = (typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : []).map((c) => c.split(';')[0]).filter(Boolean);
    if (pairs.length) { cookie = pairs.join('; '); secrets.push(...pairs.map((p) => p.split('=').slice(1).join('=')).filter((v) => v.length > 8)); }
    const contentType = r.headers.get('content-type') || '';
    const operationId = r.headers.get('x-biforge-operation-id') || null;
    const declaredLength = Number(r.headers.get('content-length')) || null;
    if (binary && r.ok) return { status: r.status, contentType, operationId, declaredLength, buf: Buffer.from(await r.arrayBuffer()) };
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON body */ }
    return { status: r.status, contentType, operationId, json, text: json ? undefined : text.slice(0, 2000) };
  } catch (err) {
    return { status: 0, contentType: '', operationId: null, json: null, error: { name: err?.name || 'Error', message: String(err?.message || err).slice(0, 300), timeout: /timeout|abort/i.test(`${err?.name}${err?.message}`) } };
  }
};

const steps = [];
const note = (id, extra) => { steps.push({ id, at: new Date().toISOString(), ...extra }); console.log(`[${id}] ${JSON.stringify(extra).slice(0, 300)}`); };
const result = { scenario: 'P118 task-to-ZIP or truthful fail', base, startedAt, goal, cleanup, steps, deployed: null, session: null, build: null, controls: [], overall: null };
const created = [];

const finish = async (blockedReason) => {
  if (cleanup) {
    for (const id of created) {
      const r = await request('DELETE', `/api/projects/${encodeURIComponent(id)}`);
      note('cleanup_delete_project', { projectId: id, status: r.status });
    }
  } else note('cleanup_skipped', { createdProjects: created });
  if (blockedReason) result.overall = { overall: 'FAIL', deliveryProven: false, why: blockedReason };
  result.finishedAt = new Date().toISOString();
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'p118-architect-transcript.json'), redact(JSON.stringify(result, null, 2)));
  const b = result.build?.verdict ?? 'NOT_RUN';
  const lines = [
    '### P118 Architect live scenario',
    `- Overall: **${result.overall?.overall ?? 'FAIL'}** (${result.overall?.why ?? 'unknown'}); delivery proven: ${result.overall?.deliveryProven ? 'yes' : 'no'}`,
    `- Deployed: version ${result.deployed?.version ?? 'unknown'}, commit ${result.deployed?.commit ?? 'unknown'}`,
    `- Task-to-ZIP verdict: **${b}** ${result.build?.reasons?.length ? `(${result.build.reasons.join(', ')})` : ''}`,
    ...result.controls.map((c) => `- Control ${c.id}: **${c.verdict}** ${c.reasons.join(', ')}`),
    '- This is raw evidence, not formal acceptance (Navigator decision).',
  ].join('\n');
  console.log(lines);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${redact(lines)}\n`);
  process.exit(exitCodeFor(result.overall?.overall));
};

const health = await request('GET', '/health');
result.deployed = { status: health.status, version: health.json?.version ?? null, commit: health.json?.commit ?? null };
note('health', result.deployed);

const login = await request('POST', '/api/login', { password });
note('login', { status: login.status, authenticated: login.json?.authenticated ?? null });
if (login.status < 200 || login.status >= 300 || login.json?.authenticated === false || login.json?.success === false) await finish('login_failed');

const session = await request('GET', '/api/session');
result.session = { status: session.status, projectModeEnabled: session.json?.projectModeEnabled ?? null, programZip: session.json?.capabilities?.programZip ?? null };
note('session', result.session);
if (session.json?.projectModeEnabled !== true) await finish('project_mode_disabled');

const makeProject = async (label, confirm) => {
  const r = await request('POST', '/api/projects', { name: `p118-evidence-${label}-${stamp}`, goal });
  const project = r.json?.data;
  if (r.status !== 201 || !project?.id) { note(`create_${label}`, { status: r.status, code: r.json?.code ?? null }); return null; }
  created.push(project.id);
  if (confirm) {
    const pp = project.state?.passport;
    const c = await request('PUT', `/api/projects/${encodeURIComponent(project.id)}/state`, { expected_version: project.state_version, state: { ...project.state, passport: { ...pp, status: 'confirmed' } } });
    note(`confirm_${label}`, { projectId: project.id, status: c.status, code: c.json?.code ?? null });
    if (c.status !== 200) return null;
  } else note(`create_${label}`, { projectId: project.id, status: r.status });
  return project;
};

const okProject = await makeProject('build', true);
if (!okProject) await finish('project_setup_failed');
const pid = encodeURIComponent(okProject.id);

const started = await request('POST', `/api/projects/${pid}/code/build`, { goal, engine: 'pipeline' }, { timeoutMs: 120_000 });
note('build_request', { status: started.status, operationId: started.operationId, jobId: started.json?.data?.jobId ?? null, error: started.error ?? null });
let job = null;
let timedOut = Boolean(started.error?.timeout);
if (started.status === 202 && started.json?.data?.jobId) {
  const deadline = Date.now() + BUILD_WAIT_MS;
  timedOut = true;
  while (Date.now() < deadline) {
    const poll = await request('GET', `/api/projects/${pid}/code/build/${encodeURIComponent(started.json.data.jobId)}`);
    job = poll.json?.data ?? job;
    if (job && ['done', 'failed', 'cancelled'].includes(job.status)) { timedOut = false; break; }
    await sleep(POLL_MS);
  }
  note('build_poll_end', { status: job?.status ?? null, stage: job?.stage ?? null, outcome: job?.outcome ?? null, timedOut });
}

const downloadUrl = (job ?? started.json?.data)?.downloadUrl ?? null;
let download = null;
if (downloadUrl && /^\/api\/projects\//.test(downloadUrl)) {
  const d = await request('GET', downloadUrl, undefined, { binary: true, timeoutMs: 120_000 });
  download = { status: d.status, contentType: d.contentType, bytes: d.buf?.length ?? 0, lengthMatches: d.buf && d.declaredLength ? d.buf.length === d.declaredLength : null, zip: null, zipError: null, sha256: null, entries: [] };
  if (d.buf) {
    download.sha256 = createHash('sha256').update(d.buf).digest('hex');
    try {
      const archive = await JSZip.loadAsync(d.buf, { checkCRC32: true });
      const entries = [];
      for (const f of Object.values(archive.files)) entries.push({ name: f.name, dir: f.dir, size: f.dir ? 0 : (await f.async('nodebuffer')).length });
      download.entries = entries.slice(0, 300);
      download.zip = inspectZipEntries(entries);
    } catch (err) { download.zipError = String(err?.message || err).slice(0, 200); }
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'architect-source.zip'), d.buf);
  } else download.error = d.json ?? d.error ?? null;
  note('download', { status: download.status, bytes: download.bytes, zipOk: download.zip?.ok ?? false, zipError: download.zipError });
}

const build = classifyBuild({ buildHttp: started.status, buildBody: started.json, job, timedOut, download });
result.build = { ...build, operationId: started.operationId, jobId: started.json?.data?.jobId ?? null, diagnosticsUrl: job?.diagnosticsUrl ?? null, engineMode: started.status === 202 ? 'staged' : started.status === 201 ? 'pipeline' : 'unknown', download };
note('build_verdict', { verdict: build.verdict, reasons: build.reasons });

const unconfirmed = await makeProject('unconfirmed', false);
if (unconfirmed) {
  const r = await request('POST', `/api/projects/${encodeURIComponent(unconfirmed.id)}/code/build`, { goal, engine: 'pipeline' });
  result.controls.push({ id: 'N1_unconfirmed_passport_build_refused', httpStatus: r.status, code: r.json?.code ?? null, ...classifyRefusal({ status: r.status, body: r.json, expectStatus: 409, expectCode: 'PASSPORT_NOT_CONFIRMED', contentType: r.contentType }) });
} else result.controls.push({ id: 'N1_unconfirmed_passport_build_refused', verdict: 'BLOCKED', reasons: ['control_project_not_created'] });

const missing = await request('GET', `/api/projects/${pid}/artifacts/app_zip_p118_missing/download`, undefined, { binary: true });
result.controls.push({ id: 'N2_missing_artifact_download_refused', httpStatus: missing.status, code: missing.json?.code ?? null, ...classifyRefusal({ status: missing.status, body: missing.json, expectStatus: 404, expectCode: 'NOT_FOUND', contentType: missing.contentType }) });

for (const c of result.controls) note(`control_${c.id}`, { verdict: c.verdict, reasons: c.reasons });
result.overall = overallVerdict({ build: result.build, controls: result.controls });
await finish(null);
