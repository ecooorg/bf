import test from 'node:test';
import assert from 'node:assert/strict';
import { runBuild, formatFileMarker, SCHEMA_VERSION } from '../appBuilder/index.ts';
import { validateRefs, validateModuleContracts } from '../appBuilder/validator-static-site.ts';

const page = '<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><canvas></canvas><script src="app.js"></script></body></html>';
const body = (path) => path.endsWith('.html') ? page : path.endsWith('.css') ? 'body{margin:0}' : path.endsWith('.js') ? 'addEventListener("keydown",()=>{});' : '# Tetris';
function world() {
  const jobs = new Map(); const results = new Map(); const events = []; const calls = { planner: 0, coder: 0 };
  const store = {
    async saveJob(s) { jobs.set(s.id, JSON.parse(JSON.stringify(s))); }, async loadJob(id) { const j = jobs.get(id); return j ? JSON.parse(JSON.stringify(j)) : null; },
    async listResumable() { return [...jobs.values()].filter((j) => j.status === 'running'); },
    async putUnitResult(r) { results.set(r.cacheKey, r); }, async getUnitResult(k) { return results.get(k) ?? null; }, async putArtifact() { return 'a'; },
  };
  const model = (failCoderCall) => ({ async complete(a) {
    if (a.role === 'planner') { calls.planner++; return a.prompt.includes('Create a focused but complete project specification')
      ? { text: JSON.stringify({ schemaVersion: 1, title: 'Tetris', goal: 'Tetris', language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: ['has_file:index.html', 'html_has:index.html:canvas', 'js_contains:app.js:keydown'] }), finishReason: 'stop', modelId: 'fake' }
      : { text: 'not json', finishReason: 'stop', modelId: 'fake' }; }
    calls.coder++;
    if (failCoderCall && calls.coder >= failCoderCall && calls.coder < failCoderCall + 2) return { code: 'unavailable', message: 'provider down' };
    const path = JSON.parse(/Implement unit (\{.*?\}) for spec/s.exec(a.prompt)[1]).path;
    return { text: formatFileMarker(path, body(path)), finishReason: 'stop', modelId: 'fake' };
  } });
  const ports = (m) => { let n = 0; return { model: m, store, events: { emit(e) { events.push(e); } }, clock: { now: () => n++, async sleep() {} } }; };
  return { jobs, results, events, calls, store, model, ports };
}
const input = { schemaVersion: SCHEMA_VERSION, jobId: 'job-r1', projectId: 'p', userId: 'u', taskText: 'Tetris' };

test('recovery: interrupted on unit three, resume reuses completed units without regenerating', async () => {
  const w = world();
  const first = await runBuild(input, w.ports(w.model(3)));
  assert.equal(first.report.status, 'partial'); assert.equal(first.report.goalImplemented, false);
  assert.deepEqual(first.report.units.map((u) => u.status), ['done', 'done', 'failed']);
  assert.ok(w.events.some((e) => e.type === 'unit_failed' && e.unitId === 'index'));
  const saved = await w.store.loadJob('job-r1');
  assert.equal(saved.status, 'failed'); assert.ok(saved.spec && saved.plan);
  const plannerBefore = w.calls.planner, coderBefore = w.calls.coder;
  // restart: fresh engine, fresh model, state restored from the store
  const second = await runBuild(input, w.ports(w.model(0)), { resumeFrom: saved });
  assert.equal(w.calls.planner, plannerBefore, 'spec/plan are not regenerated');
  assert.equal(w.calls.coder - coderBefore, 2, 'only the two unfinished units are generated');
  assert.equal(second.report.status, 'complete'); assert.equal(second.report.goalImplemented, true);
  assert.deepEqual(second.report.units.slice(0, 2).map((u) => u.cacheHit), [true, true]);
  assert.equal(second.report.files.length, 4);
  assert.ok(second.state.callsUsed >= first.state.callsUsed);
});

test('recovery: completed job state resumes with zero model calls', async () => {
  const w = world();
  await runBuild(input, w.ports(w.model(0)));
  const saved = await w.store.loadJob('job-r1'); const before = { ...w.calls };
  const again = await runBuild(input, w.ports(w.model(0)), { resumeFrom: saved });
  assert.deepEqual(w.calls, before); assert.equal(again.report.goalImplemented, true);
});

test('resumeFrom for another job id is ignored', async () => {
  const w = world(); await runBuild(input, w.ports(w.model(0)));
  const other = await w.store.loadJob('job-r1'); other.id = 'someone-else';
  const before = w.calls.planner;
  await runBuild(input, w.ports(w.model(0)), { resumeFrom: other });
  assert.ok(w.calls.planner > before);
});

test('cancellation stops before the next unit and reports cancelled', async () => {
  const w = world(); let checks = 0;
  const r = await runBuild(input, w.ports(w.model(0)), { isCancelled: () => ++checks > 1 });
  assert.equal(r.state.status, 'cancelled'); assert.equal(r.report.goalImplemented, false);
  assert.equal(r.report.failureReason, 'cancelled'); assert.equal(r.report.status, 'partial');
  assert.equal((await w.store.loadJob('job-r1')).status, 'cancelled');
});

test('persistence failure does not break the build', async () => {
  const w = world(); const ports = w.ports(w.model(0)); ports.store.saveJob = async () => { throw new Error('db down'); };
  const r = await runBuild(input, ports);
  assert.equal(r.report.goalImplemented, true);
  assert.ok(w.events.some((e) => e.type === 'store_warning'));
});

test('rate-limit retry is bounded, persists a visible waiting state, and resumes after fake-clock sleep', async () => {
  const w = world();
  const base = w.model(0);
  let failedOnce = false;
  const model = { async complete(args) {
    if (!failedOnce) { failedOnce = true; return { code: 'rate_limited', message: '429 quota', retryAfterMs: 1200 }; }
    return base.complete(args);
  } };
  const ports = w.ports(model);
  const waits = [];
  ports.clock.sleep = async (ms) => { waits.push(ms); };
  const result = await runBuild(input, ports);
  assert.equal(result.report.goalImplemented, true);
  assert.deepEqual(waits, [1200]);
  assert.ok(w.events.some((e) => e.type === 'model_wait' && e.data?.reason === 'rate_limit'));
  assert.ok(result.state.callsUsed >= 1);
});


test('P127.5 refs: root-absolute generated paths resolve from project root', () => {
  const files = new Map([['index.html', '<!doctype html><html><body><script type="module" src="/src/main.js"></script></body></html>'], ['src/main.js', 'console.log("ok")']]);
  const result = validateRefs(files);
  assert.equal(result.ok, true, JSON.stringify(result.issues));
});

test('P127.5 refs: nested relative paths resolve from the HTML directory', () => {
  const files = new Map([['pages/index.html', '<!doctype html><html><body><script src="../assets/app.js"></script></body></html>'], ['assets/app.js', 'console.log("ok")']]);
  assert.equal(validateRefs(files).ok, true);
});

test('P127.5 refs: static_site rejects TypeScript entry points with an actionable issue', () => {
  const files = new Map([['index.html', '<!doctype html><html><body><script type="module" src="/src/main.ts"></script></body></html>'], ['src/main.ts', 'console.log("not transpiled")']]);
  const refs = validateRefs(files);
  const modules = validateModuleContracts(files);
  assert.ok(refs.issues.some((i) => i.message.includes('cannot execute TypeScript')));
  assert.ok(modules.issues.some((i) => i.message.includes('TypeScript source is not executable')));
});

test('P127.5 module contracts: unresolved extensionless import remains a failure', () => {
  const files = new Map([['main.js', 'import { start } from "./renderer-3d"; start();'], ['renderer3D.js', 'export function start() {}']]);
  const result = validateModuleContracts(files);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.message.includes('unresolved local module import')));
});

import { buildContinuationTask } from '../server/projectContinuation.ts';

test('P127.6 continuation prompt carries existing files and requires incremental changes', () => {
  const task = buildContinuationTask('Add a pause button', {
    artifactId: 'app_zip_existing', version: 3, filename: 'game.zip',
    files: [{ path: 'index.html', content: '<main>Game</main>' }, { path: 'src/game.js', content: 'export const start = () => {};' }],
  });
  assert.match(task, /CONTINUATION MODE/);
  assert.match(task, /Base artifact: app_zip_existing version 3/);
  assert.match(task, /Add a pause button/);
  assert.match(task, /--- FILE: src\/game.js ---/);
  assert.match(task, /smallest coherent changes/);
});
