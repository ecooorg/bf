import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { classifyBuild, classifyRefusal, inspectZipEntries, overallVerdict, exitCodeFor, zipVerified } from '../scripts/p118-architect-live-lib.mjs';
import { runAppBuilderPipeline, irFromPlainAnswers } from '../server/appBuilderIndex.ts';
import { pipelineArchitectOutcome } from '../appBuilder/architectOutcome.ts';

const goodZip = { status: 200, contentType: 'application/zip', bytes: 900, lengthMatches: true, zip: { ok: true, fileCount: 3 } };

test('P118 live: inspectZipEntries rejects empty, unsafe and directory-only archives', () => {
  assert.equal(inspectZipEntries([{ name: 'a/', dir: true, size: 0 }]).ok, false);
  assert.equal(inspectZipEntries([{ name: 'a.txt', dir: false, size: 0 }]).ok, false);
  assert.deepEqual(inspectZipEntries([{ name: '../x', dir: false, size: 4 }]).reasons, ['unsafe_paths']);
  assert.deepEqual(inspectZipEntries([{ name: '/etc/x', dir: false, size: 4 }]).reasons, ['unsafe_paths']);
  assert.equal(inspectZipEntries([{ name: 'README.md', dir: false, size: 10 }, { name: 'src/', dir: true, size: 0 }]).ok, true);
});

test('P118 live: SUCCESS is PASS only with a verified ZIP', () => {
  const body = { data: { outcome: 'SUCCESS', goalImplemented: true, downloadUrl: '/api/projects/p/artifacts/a/download' } };
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: body, download: goodZip }).verdict, 'PASS');
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: body, download: null }).verdict, 'FALSE_SUCCESS');
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: body, download: { ...goodZip, status: 422 } }).verdict, 'FALSE_SUCCESS');
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: body, download: { ...goodZip, zip: { ok: false } } }).verdict, 'FALSE_SUCCESS');
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: body, download: { ...goodZip, contentType: 'text/html' } }).verdict, 'FALSE_SUCCESS');
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: { data: { ...body.data, downloadUrl: null } }, download: null }).verdict, 'FALSE_SUCCESS');
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: { data: { ...body.data, goalImplemented: false } }, download: goodZip }).verdict, 'FALSE_SUCCESS');
});

test('P118 live: PARTIAL is never PASS and needs reason plus verified ZIP', () => {
  const data = { outcome: 'PARTIAL', failedStage: 'slice', failureReason: 'SLICE_SKIPPED', downloadUrl: '/d' };
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: { data }, download: goodZip }).verdict, 'PARTIAL');
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: { data: { ...data, failedStage: null, failureReason: null } }, download: goodZip }).verdict, 'INCONSISTENT');
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: { data }, download: null }).verdict, 'INCONSISTENT');
});

test('P118 live: FAILED must name a stage or reason and offer no download', () => {
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: { data: { outcome: 'FAILED', failedStage: 'generate', failureReason: 'empty_artifact' } } }).verdict, 'TRUTHFUL_FAIL');
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: { data: { outcome: 'FAILED' } } }).verdict, 'INCONSISTENT');
  assert.equal(classifyBuild({ buildHttp: 201, buildBody: { data: { outcome: 'FAILED', failureReason: 'x', downloadUrl: '/d' } } }).verdict, 'INCONSISTENT');
  assert.equal(classifyBuild({ buildHttp: 202, buildBody: { data: {} }, job: { status: 'failed', error: { code: 'engine_error', message: 'boom' } } }).verdict, 'TRUTHFUL_FAIL');
  assert.equal(classifyBuild({ buildHttp: 202, buildBody: { data: {} }, job: { status: 'failed' } }).verdict, 'INCONSISTENT');
  assert.equal(classifyBuild({ buildHttp: 422, buildBody: { success: false, code: 'ZIP_INVALID' } }).verdict, 'TRUTHFUL_FAIL');
});

test('P118 live: unknown, timeout and blocked states are never PASS', () => {
  assert.equal(classifyBuild({ buildHttp: 202, buildBody: {}, job: { status: 'done' }, download: goodZip }).verdict, 'UNKNOWN');
  assert.equal(classifyBuild({ buildHttp: 202, buildBody: {}, job: { status: 'running' }, timedOut: true }).verdict, 'TIMEOUT');
  assert.equal(classifyBuild({ buildHttp: 409, buildBody: { code: 'PASSPORT_NOT_CONFIRMED' } }).verdict, 'BLOCKED');
  assert.equal(classifyBuild({ buildHttp: 0, buildBody: null }).verdict, 'BLOCKED');
  assert.equal(zipVerified(null), false);
});

test('P118 live: refusal controls demand the specific status and code', () => {
  assert.equal(classifyRefusal({ status: 409, body: { success: false, code: 'PASSPORT_NOT_CONFIRMED' }, expectStatus: 409, expectCode: 'PASSPORT_NOT_CONFIRMED' }).verdict, 'TRUTHFUL_FAIL');
  assert.equal(classifyRefusal({ status: 201, body: { success: true }, expectStatus: 409, expectCode: 'X' }).verdict, 'FALSE_SUCCESS');
  assert.equal(classifyRefusal({ status: 404, body: null, contentType: 'application/zip', expectStatus: 404, expectCode: 'NOT_FOUND' }).verdict, 'FALSE_SUCCESS');
  assert.equal(classifyRefusal({ status: 500, body: { success: false, code: 'INTERNAL' }, expectStatus: 404, expectCode: 'NOT_FOUND' }).verdict, 'INCONSISTENT');
  assert.equal(classifyRefusal({ status: 0, body: null, expectStatus: 404, expectCode: 'NOT_FOUND' }).verdict, 'BLOCKED');
});

test('P118 live: overall verdict and exit code keep honest non-pass distinct from PASS', () => {
  const ok = [{ verdict: 'TRUTHFUL_FAIL' }, { verdict: 'TRUTHFUL_FAIL' }];
  assert.deepEqual(overallVerdict({ build: { verdict: 'PASS' }, controls: ok }).overall, 'PASS');
  const partial = overallVerdict({ build: { verdict: 'PARTIAL' }, controls: ok });
  assert.equal(partial.overall, 'HONEST_NON_PASS');
  assert.equal(partial.deliveryProven, false);
  assert.equal(overallVerdict({ build: { verdict: 'PASS' }, controls: [{ verdict: 'FALSE_SUCCESS' }] }).overall, 'FAIL');
  assert.equal(overallVerdict({ build: { verdict: 'FALSE_SUCCESS' }, controls: ok }).overall, 'FAIL');
  assert.equal(exitCodeFor('PASS'), 0);
  assert.equal(exitCodeFor('HONEST_NON_PASS'), 0);
  assert.equal(exitCodeFor('FAIL'), 1);
});

test('P118 live: real scaffold-only pipeline ZIP classifies as PARTIAL, not PASS', async () => {
  const ir = irFromPlainAnswers({ idea: 'Small library web app: list books, search, add; browser storage only.', name: 'p118-live-fixture', stack: 'auto', features: [], constraints: '' });
  const result = await runAppBuilderPipeline({ ir, allowSlice: false });
  const archive = await JSZip.loadAsync(result.zipBuffer, { checkCRC32: true });
  const entries = [];
  for (const f of Object.values(archive.files)) entries.push({ name: f.name, dir: f.dir, size: f.dir ? 0 : (await f.async('nodebuffer')).length });
  const zip = inspectZipEntries(entries);
  assert.equal(zip.ok, true);
  const a3 = pipelineArchitectOutcome({ fileCount: Object.keys(result.files).length, hasDownload: true, sliceStatus: result.slice.status, sliceReason: result.slice.reason });
  const verdict = classifyBuild({
    buildHttp: 201,
    buildBody: { data: { outcome: a3.outcome, failedStage: a3.failedStage, failureReason: a3.failureReason, goalImplemented: a3.goalImplemented, downloadUrl: '/d' } },
    download: { status: 200, contentType: 'application/zip', bytes: result.zipBuffer.length, lengthMatches: true, zip },
  });
  assert.equal(verdict.verdict, 'PARTIAL');
});

const makeZip = async (files = { 'README.md': '# x', 'package.json': '{}' }) => {
  const z = new JSZip();
  for (const [k, v] of Object.entries(files)) z.file(k, v);
  return Buffer.from(await z.generateAsync({ type: 'nodebuffer' }));
};

async function fakeServer(mode) {
  const log = { deletes: [], builds: 0, polls: 0 };
  const zipBytes = await makeZip();
  const projects = new Map();
  let seq = 0;
  const json = (res, status, body, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    if (p === '/health') return json(res, 200, { status: 'ok', version: '118', commit: 'abc1234' });
    if (p === '/api/login') {
      if (mode === 'login-fail' || body.password !== 'pw-secret-123') return json(res, 401, { success: false, code: 'INVALID_PASSWORD' });
      return json(res, 200, { success: true, authenticated: true }, { 'set-cookie': 'bf_session=SESSIONTOKEN123456; Path=/; HttpOnly' });
    }
    if (!(req.headers.cookie || '').includes('SESSIONTOKEN123456')) return json(res, 401, { success: false, code: 'UNAUTHENTICATED' });
    if (p === '/api/session') return json(res, 200, { success: true, authenticated: true, projectModeEnabled: true, capabilities: { programZip: false } });
    if (p === '/api/projects' && req.method === 'POST') {
      const id = `proj-${++seq}`; const project = { id, name: body.name, state: { passport: { status: 'proposed', projectType: 'unspecified' } }, state_version: 1 };
      projects.set(id, project); return json(res, 201, { success: true, data: project });
    }
    let m = p.match(/^\/api\/projects\/([^/]+)$/);
    if (m && req.method === 'DELETE') { log.deletes.push(m[1]); projects.delete(m[1]); return json(res, 200, { success: true, data: { id: m[1], deleted: true } }); }
    m = p.match(/^\/api\/projects\/([^/]+)\/state$/);
    if (m && req.method === 'PUT') { projects.get(m[1]).state = body.state; return json(res, 200, { success: true, data: { ok: true } }); }
    m = p.match(/^\/api\/projects\/([^/]+)\/code\/build$/);
    if (m && req.method === 'POST') {
      const project = projects.get(m[1]);
      if (project.state.passport.status !== 'confirmed') return json(res, 409, { success: false, error: 'Confirm the project passport before creating software.', code: 'PASSPORT_NOT_CONFIRMED' });
      log.builds++;
      const dl = `/api/projects/${m[1]}/artifacts/art1/download`;
      if (mode === 'staged-success') return json(res, 202, { success: true, data: { jobId: 'job-1', engine: 'staged' } }, { 'x-biforge-operation-id': 'job-1' });
      if (mode === 'partial') return json(res, 201, { success: true, data: { engine: 'pipeline', outcome: 'PARTIAL', failedStage: 'slice', failureReason: 'SLICE_SKIPPED', goalImplemented: false, downloadUrl: dl, fileCount: 2 } }, { 'x-biforge-operation-id': 'op-1' });
      if (mode === 'failed') return json(res, 201, { success: true, data: { engine: 'pipeline', outcome: 'FAILED', failedStage: 'generate', failureReason: 'empty_artifact', goalImplemented: false, fileCount: 0 } });
      if (mode === 'false-success') return json(res, 201, { success: true, data: { engine: 'pipeline', outcome: 'SUCCESS', goalImplemented: true, downloadUrl: dl, fileCount: 2 } });
    }
    m = p.match(/^\/api\/projects\/([^/]+)\/code\/build\/job-1$/);
    if (m) { log.polls++; return json(res, 200, { success: true, data: log.polls < 2 ? { jobId: 'job-1', status: 'running', stage: 'code' } : { jobId: 'job-1', status: 'done', outcome: 'SUCCESS', goalImplemented: true, downloadUrl: `/api/projects/${m[1]}/artifacts/art1/download`, report: { outcome: 'SUCCESS', checksDeclared: ['validate'], checksRun: ['validate'], checksNotRun: [] } } }); }
    m = p.match(/^\/api\/projects\/([^/]+)\/artifacts\/([^/]+)\/download$/);
    if (m) {
      if (m[2] !== 'art1') return json(res, 404, { success: false, error: 'Artifact not found', code: 'NOT_FOUND' });
      const data = mode === 'false-success' ? Buffer.from('not a zip at all') : zipBytes;
      res.writeHead(200, { 'content-type': 'application/zip', 'content-length': String(data.length) }); return res.end(data);
    }
    return json(res, 404, { success: false, code: 'NOT_FOUND' });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, log, url: `http://127.0.0.1:${server.address().port}` };
}

async function runRunner(mode) {
  const fake = await fakeServer(mode);
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'p118-live-'));
  const env = { ...process.env, STAGING_SERVICE_URL: fake.url, STAGING_APP_PASSWORD: 'pw-secret-123', P118_ALLOW_LOOPBACK: 'true', P118_POLL_MS: '50', P118_OUT_DIR: outDir, P118_BUILD_WAIT_MS: '60000' };
  delete env.GITHUB_STEP_SUMMARY;
  const child = spawn(process.execPath, ['scripts/p118-architect-live.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', (d) => { stdout += d; }); child.stderr.on('data', (d) => { stderr += d; });
  const code = await new Promise((r) => child.on('close', r));
  fake.server.close();
  const transcriptText = await readFile(path.join(outDir, 'p118-architect-transcript.json'), 'utf8');
  const zipExists = await access(path.join(outDir, 'architect-source.zip')).then(() => true, () => false);
  await rm(outDir, { recursive: true, force: true });
  return { code, stdout, stderr, transcriptText, transcript: JSON.parse(transcriptText), zipExists, log: fake.log };
}

test('P118 live runner: scaffold-only ZIP is HONEST_NON_PASS with PARTIAL, controls refuse, projects cleaned', async () => {
  const r = await runRunner('partial');
  assert.equal(r.code, 0, r.stderr + r.stdout);
  assert.equal(r.transcript.build.verdict, 'PARTIAL');
  assert.equal(r.transcript.overall.overall, 'HONEST_NON_PASS');
  assert.equal(r.transcript.overall.deliveryProven, false);
  assert.equal(r.transcript.build.download.zip.ok, true);
  assert.equal(r.transcript.deployed.commit, 'abc1234');
  assert.deepEqual(r.transcript.controls.map((c) => c.verdict), ['TRUTHFUL_FAIL', 'TRUTHFUL_FAIL']);
  assert.equal(r.zipExists, true);
  assert.equal(r.log.deletes.length, 2);
});

test('P118 live runner: staged job polled to SUCCESS with verified ZIP is PASS', async () => {
  const r = await runRunner('staged-success');
  assert.equal(r.code, 0, r.stderr + r.stdout);
  assert.equal(r.transcript.build.verdict, 'PASS');
  assert.equal(r.transcript.overall.overall, 'PASS');
  assert.equal(r.transcript.overall.deliveryProven, true);
  assert.equal(r.transcript.build.engineMode, 'staged');
  assert.ok(r.log.polls >= 2);
});

test('P118 live runner: empty FAILED build is a truthful fail with no ZIP', async () => {
  const r = await runRunner('failed');
  assert.equal(r.code, 0, r.stderr + r.stdout);
  assert.equal(r.transcript.build.verdict, 'TRUTHFUL_FAIL');
  assert.equal(r.transcript.overall.overall, 'HONEST_NON_PASS');
  assert.equal(r.zipExists, false);
});

test('P118 live runner: SUCCESS claim with a corrupt ZIP is FALSE_SUCCESS and exits non-zero', async () => {
  const r = await runRunner('false-success');
  assert.equal(r.code, 1);
  assert.equal(r.transcript.build.verdict, 'FALSE_SUCCESS');
  assert.equal(r.transcript.overall.overall, 'FAIL');
  assert.ok(r.transcript.build.download.zipError);
});

test('P118 live runner: failed login stops early, exits non-zero, writes transcript without secrets', async () => {
  const r = await runRunner('login-fail');
  assert.equal(r.code, 1);
  assert.equal(r.transcript.overall.why, 'login_failed');
  assert.equal(r.transcript.build, null);
});

test('P118 live runner: transcript never contains the password or session token', async () => {
  const r = await runRunner('partial');
  assert.equal(r.transcriptText.includes('pw-secret-123'), false);
  assert.equal(r.transcriptText.includes('SESSIONTOKEN123456'), false);
  assert.equal((r.stdout + r.stderr).includes('pw-secret-123'), false);
  assert.equal((r.stdout + r.stderr).includes('SESSIONTOKEN123456'), false);
});
