import test from 'node:test';
import assert from 'node:assert/strict';
import { runBuild, formatFileMarker, SCHEMA_VERSION } from '../appBuilder/index.ts';
import { ensureMultiFileStaticPlan, templatePlan, expandedPlanFromBrief } from '../appBuilder/stack-static-site.ts';
import { assessGoalAdequacy, fallbackIntentBrief, parseIntentBrief, applyBriefToSpec } from '../appBuilder/intent-brief.ts';
import {
  validateRefs,
  validateModuleContracts,
  validateReachability,
  validateMemberContracts,
  validateCompleteness,
  dropUnreachableOrphansIfSelfContained,
  REQUIRED_VALIDATORS,
  runStaticValidators,
} from '../appBuilder/validator-static-site.ts';

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

test('P127.9/P127.11 required validators include reachability, completeness, and member-contracts', () => {
  for (const name of ['reachability', 'completeness', 'member-contracts']) {
    assert.ok(REQUIRED_VALIDATORS.includes(name), `missing required validator ${name}`);
  }
  const linked = new Map([
    ['index.html', '<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><script src="app.js"></script></body></html>'],
    ['style.css', 'body{margin:0}'],
    ['app.js', 'console.log(1)'],
    ['README.md', '# ok'],
  ]);
  const results = runStaticValidators(linked, null);
  assert.deepEqual(results.map((v) => v.name).sort(), [...REQUIRED_VALIDATORS].sort());
  assert.equal(results.find((v) => v.name === 'reachability').ok, true);
});

test('P127.9 reachability: self-contained HTML leaves modular assets unreachable', () => {
  const inline = '<!doctype html><html><body><canvas id="c"></canvas><script>' + 'x'.repeat(500) + '</script></body></html>';
  const files = new Map([
    ['index.html', inline],
    ['game.js', 'export class Game {}'],
    ['style.css', 'body{margin:0}'],
  ]);
  const result = validateReachability(files);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === 'game.js'));
  assert.ok(result.issues.some((i) => i.path === 'style.css'));
});

test('P127.10 dropUnreachableOrphansIfSelfContained removes dead CSS/JS beside inline HTML', () => {
  const inline = '<!doctype html><html><body><script>' + 'x'.repeat(500) + '</script></body></html>';
  const files = new Map([
    ['index.html', inline],
    ['game.js', 'export class Game {}'],
    ['style.css', 'body{margin:0}'],
    ['README.md', '# keep'],
  ]);
  const dropped = dropUnreachableOrphansIfSelfContained(files);
  assert.ok(dropped.includes('game.js'));
  assert.ok(dropped.includes('style.css'));
  assert.equal(files.has('index.html'), true);
  assert.equal(files.has('README.md'), true);
  assert.equal(files.has('game.js'), false);
});

test('P127.10 member-contracts: flags instance property mismatch (paused vs isPaused)', () => {
  const files = new Map([
    ['game.js', 'export class TetrisGame {\n  constructor() { this.isPaused = false; }\n  toggle() { this.isPaused = !this.isPaused; }\n}\n'],
    ['main.js', 'import { TetrisGame } from "./game.js";\nconst game = new TetrisGame();\ngame.paused = true;\nif (game.paused) game.toggle();\n'],
  ]);
  const result = validateMemberContracts(files);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => /paused/i.test(i.message) && /isPaused/i.test(i.message)), JSON.stringify(result.issues));
});

test('P127.9 completeness: truncated JS with unclosed brace fails', () => {
  const files = new Map([
    ['index.html', '<!doctype html><html><body><script src="app.js"></script></body></html>'],
    ['app.js', 'function start() {\n  const x = 1;\n'],
  ]);
  const result = validateCompleteness(files);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === 'app.js' && /unclosed/i.test(i.message)));
});

test('P127.9/P127.11 SUCCESS report sets runtimeVerified false', async () => {
  const w = world();
  const r = await runBuild(input, w.ports(w.model(0)));
  assert.equal(r.report.goalImplemented, true);
  assert.equal(r.report.runtimeVerified, false);
  assert.ok(r.report.checksDeclared.includes('reachability'));
  assert.ok(r.report.checksDeclared.includes('member-contracts'));
});

test('P127.16 ensureMultiFileStaticPlan expands single HTML interactive plans', () => {
  const spec = { schemaVersion: 1, title: 'Tetris', goal: 'Create a touch tetris game', language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: [] };
  const single = {
    schemaVersion: 1,
    specHash: 'x',
    units: [{ id: 'index_html', kind: 'file', path: 'index.html', purpose: 'all', dependsOn: [], exports: [], contract: '', maxOutputTokens: 8192, status: 'pending', attempts: 0 }],
    order: ['index_html'],
  };
  const out = ensureMultiFileStaticPlan(single, spec);
  assert.ok(out.coerced.includes('plan:force_multifile_static'));
  assert.ok(out.plan.units.some((u) => u.path === 'app.js'));
  assert.ok(out.plan.units.some((u) => u.path === 'index.html'));
  assert.ok(out.plan.units.length >= 3);
});

test('P127.16 template plan is already multi-file', () => {
  const spec = { schemaVersion: 1, title: 'Tetris', goal: 'tetris', language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: [] };
  const t = templatePlan(spec);
  const out = ensureMultiFileStaticPlan(t, spec);
  assert.equal(out.coerced.length, 0);
  assert.ok(t.units.some((u) => u.path === 'app.js'));
});

test('P127.17 ambitious brief rejects tiny stub via assessGoalAdequacy', () => {
  const brief = fallbackIntentBrief('3D racing game through a city with traffic');
  assert.equal(brief.complexity, 'ambitious');
  assert.ok(brief.targetModules >= 16);
  const files = new Map([
    ['index.html', '<!doctype html><canvas></canvas><script src="app.js"></script>'],
    ['app.js', 'const c=document.querySelector("canvas");c.getContext("2d");'],
  ]);
  const a = assessGoalAdequacy(files, brief);
  assert.equal(a.adequate, false);
  assert.ok(a.issues.some((i) => /stub_size|stub_modules|stub_theme/.test(i)));
});

test('P127.17 expandedPlanFromBrief yields many small modules', () => {
  const brief = fallbackIntentBrief('animals walking in a forest game');
  const spec = { schemaVersion: 1, title: 'Forest', goal: brief.expandedGoal, language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: brief.mustHave };
  const plan = expandedPlanFromBrief(spec, brief);
  assert.ok(plan.units.length >= 5, `units ${plan.units.length}`);
  assert.ok(plan.units.every((u) => u.path && u.path.length < 80));
  const coerced = ensureMultiFileStaticPlan({ schemaVersion: 1, specHash: 'x', units: [{ id: 'i', kind: 'file', path: 'index.html', purpose: 'x', dependsOn: [], exports: [], contract: '', maxOutputTokens: 1000, status: 'pending', attempts: 0 }], order: ['i'] }, spec, brief);
  assert.ok(coerced.coerced.length >= 1);
  assert.ok(coerced.plan.units.length >= 5);
});

test('P127.17 applyBriefToSpec embeds MUST acceptance', () => {
  const brief = fallbackIntentBrief('todo list');
  const spec = { schemaVersion: 1, title: 'T', goal: 'g', language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: [] };
  const next = applyBriefToSpec(spec, brief);
  assert.ok(next.acceptance.some((a) => a.startsWith('MUST:')));
});
