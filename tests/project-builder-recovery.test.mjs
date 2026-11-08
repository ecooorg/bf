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
    if (a.role === 'planner') {
      calls.planner++;
      const p = a.prompt || '';
      // P127.17 intent stage
      if (/User request \(plain language\)|elaborate what a typical person means|expandedGoal/i.test(p) || /app_builder\.intent/i.test(a.system || '')) {
        return {
          text: JSON.stringify({
            expandedGoal: 'A simple browser Tetris with keyboard controls and a visible playfield',
            mustHave: ['canvas playfield', 'keyboard moves pieces', 'line clear'],
            shouldHave: ['score'],
            notSuccessIf: ['blank page'],
            complexity: 'simple',
            targetModules: 4,
            suggestedModules: [
              { id: 'style', path: 'style.css', purpose: 'layout' },
              { id: 'app', path: 'app.js', purpose: 'game' },
              { id: 'index', path: 'index.html', purpose: 'shell' },
              { id: 'readme', path: 'README.md', purpose: 'usage' },
            ],
          }),
          finishReason: 'stop',
          modelId: 'fake',
        };
      }
      if (p.includes('Create a focused but complete project specification')) {
        return {
          text: JSON.stringify({
            schemaVersion: 1,
            title: 'Tetris',
            goal: 'Tetris',
            language: 'en',
            stack: 'static_site',
            features: [],
            nonGoals: [],
            acceptance: ['has_file:index.html', 'html_has:index.html:canvas', 'js_contains:app.js:keydown'],
          }),
          finishReason: 'stop',
          modelId: 'fake',
        };
      }
      // plan JSON
      if (/units|plan|schemaVersion/i.test(p) && !p.includes('Create a focused')) {
        return {
          text: JSON.stringify({
            schemaVersion: 1,
            units: [
              { id: 'style', kind: 'file', path: 'style.css', purpose: 'css', dependsOn: [], exports: [], contract: 'css', maxOutputTokens: 1500, status: 'pending', attempts: 0 },
              { id: 'app', kind: 'file', path: 'app.js', purpose: 'js', dependsOn: [], exports: [], contract: 'js', maxOutputTokens: 4096, status: 'pending', attempts: 0 },
              { id: 'index', kind: 'file', path: 'index.html', purpose: 'html', dependsOn: ['style', 'app'], exports: [], contract: 'html', maxOutputTokens: 1500, status: 'pending', attempts: 0 },
              { id: 'readme', kind: 'file', path: 'README.md', purpose: 'doc', dependsOn: ['index'], exports: [], contract: 'md', maxOutputTokens: 600, status: 'pending', attempts: 0 },
            ],
            order: ['style', 'app', 'index', 'readme'],
            specHash: 'test',
          }),
          finishReason: 'stop',
          modelId: 'fake',
        };
      }
      return { text: 'not json', finishReason: 'stop', modelId: 'fake' };
    }
    calls.coder++;
    if (failCoderCall && calls.coder >= failCoderCall && calls.coder < failCoderCall + 2) return { code: 'unavailable', message: 'provider down' };
    const path = JSON.parse(/Implement unit (\{.*?\}) for spec/s.exec(a.prompt)[1]).path;
    // Adequacy floor for simple still low; pad app.js so static validators + adequacy can pass
    let content = body(path);
    if (path.endsWith('.js')) {
      content = content + '\n' + ('// pad ' + 'x'.repeat(900) + '\n').repeat(6);
    }
    return { text: formatFileMarker(path, content), finishReason: 'stop', modelId: 'fake' };
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
  assert.ok(w.events.some((e) => e.type === 'unit_failed' && e.unitId === first.report.units[2].id), 'the third unit in run order failed');
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
  assert.ok(result.issues.some((i) => i.path === 'app.js' && /likely truncated/i.test(i.message)));
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
  // P127.34: compact 3-file template (not a large multi-module expand).
  assert.ok(out.coerced.some((c) => /force_compact_static|force_multifile/.test(c)));
  assert.ok(out.plan.units.some((u) => u.path === 'app.js'));
  assert.ok(out.plan.units.some((u) => u.path === 'index.html'));
  assert.ok(out.plan.units.length >= 3);
  assert.ok(out.plan.units.length <= 4);
  assert.ok(out.plan.shared);
});

test('P127.16 template plan is already multi-file', () => {
  const spec = { schemaVersion: 1, title: 'Tetris', goal: 'tetris', language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: [] };
  const t = templatePlan(spec);
  const out = ensureMultiFileStaticPlan(t, spec);
  assert.equal(out.coerced.length, 0);
  assert.ok(t.units.some((u) => u.path === 'app.js'));
  assert.ok(t.shared);
});

test('P127.17 ambitious brief rejects tiny stub via assessGoalAdequacy', () => {
  // P127.40: explicit 3D stays ambitious but package stays compact (<=5 modules).
  const brief = fallbackIntentBrief('3D racing game through a city with traffic using three.js');
  assert.equal(brief.complexity, 'ambitious');
  assert.ok(brief.targetModules >= 3 && brief.targetModules <= 5);
  const files = new Map([
    ['index.html', '<!doctype html><canvas></canvas><script src="app.js"></script>'],
    ['app.js', 'const c=document.querySelector("canvas");c.getContext("2d");'],
  ]);
  const a = assessGoalAdequacy(files, brief);
  assert.equal(a.adequate, false);
  assert.ok(a.issues.some((i) => /stub_size|stub_modules|stub_theme|stub_controls|stub_loop/.test(i)));
});

test('P127.17 expandedPlanFromBrief yields several modules for ambitious goals', () => {
  const brief = fallbackIntentBrief('animals walking in a forest game');
  const spec = { schemaVersion: 1, title: 'Forest', goal: brief.expandedGoal, language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: brief.mustHave };
  const plan = expandedPlanFromBrief(spec, brief);
  assert.ok(plan.units.length >= 3, `units ${plan.units.length}`);
  assert.ok(plan.units.length <= 8, `units capped ${plan.units.length}`);
  assert.ok(plan.units.every((u) => u.path && u.path.length < 80));
  const coerced = ensureMultiFileStaticPlan({ schemaVersion: 1, specHash: 'x', units: [{ id: 'i', kind: 'file', path: 'index.html', purpose: 'x', dependsOn: [], exports: [], contract: '', maxOutputTokens: 1000, status: 'pending', attempts: 0 }], order: ['i'] }, spec, brief);
  assert.ok(coerced.coerced.length >= 1);
  assert.ok(coerced.plan.units.length >= 3);
});

test('P127.34 compact chess-like plan stays at 3 files with shared contracts', () => {
  const brief = fallbackIntentBrief('classic chess game two players click to move');
  assert.ok(brief.targetModules <= 3);
  const spec = { schemaVersion: 1, title: 'Mini Chess', goal: brief.expandedGoal, language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: brief.mustHave };
  const plan = templatePlan(spec);
  assert.equal(plan.units.filter((u) => u.path && !/readme/i.test(u.path)).length, 3);
  assert.ok(plan.shared?.types);
  assert.ok(plan.shared?.wiring?.length);
  const out = ensureMultiFileStaticPlan(plan, spec, brief);
  assert.ok(out.plan.units.length <= 4);
  assert.ok(out.plan.shared);
});

test('P127.34 buildHumanBrief is short and user-facing', async () => {
  const { buildHumanBrief } = await import('../appBuilder/intent-brief.ts');
  const brief = fallbackIntentBrief('classic chess');
  const text = buildHumanBrief(brief, { title: 'Mini Chess', maxFiles: 3 });
  assert.ok(text.length > 40 && text.length < 2000);
  assert.match(text, /I will build|What you will see|How you control|Package:/);
  assert.doesNotMatch(text, /serialize|unitId|dependsOn/);
});

test('P127.17 applyBriefToSpec embeds MUST acceptance', () => {
  const brief = fallbackIntentBrief('todo list');
  const spec = { schemaVersion: 1, title: 'T', goal: 'g', language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: [] };
  const next = applyBriefToSpec(spec, brief);
  assert.ok(next.acceptance.some((a) => a.startsWith('MUST:')));
});

import { exportedNames, interfaceBlock } from '../appBuilder/core-prompts.ts';

test('P127.20 entry script is planned after every other script and the plan stays acyclic', () => {
  const spec = { schemaVersion: 1, title: 'T', goal: 'g', language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: [] };
  const brief = { ...fallbackIntentBrief('a todo list'), complexity: 'standard', targetModules: 6, suggestedModules: [
    { id: 'main', path: 'main.js', purpose: 'entry' }, { id: 'cards', path: 'cards.js', purpose: 'c' }, { id: 'game', path: 'game.js', purpose: 'g' },
    { id: 'style', path: 'style.css', purpose: 's' }, { id: 'index', path: 'index.html', purpose: 'h' } ] };
  const plan = expandedPlanFromBrief(spec, brief);
  const main = plan.units.find((u) => u.id === 'main');
  assert.ok(main.dependsOn.includes('cards'));
  // game would depend on the first script (main) by name; the entry must not also depend on it (no cycle)
  assert.ok(!(main.dependsOn.includes('game') && plan.units.find((u) => u.id === 'game').dependsOn.includes('main')));
});

import { exportSurface } from '../appBuilder/core-prompts.ts';
import { validateTypeContracts } from '../appBuilder/validator-static-site.ts';

test('P127.23 exportedNames/exportSurface/interfaceBlock describe real signatures', () => {
  const src = 'export function renderBoard(cards, onClick = null) {}\nexport class Player { constructor(x, y) {} move(dx) {} #p() {} }\nexport const MAX = 3;\nconst tick = (a, b) => 1;\nfunction helper(z) {}\nexport { tick, helper as h };\nexport default function () {}\n';
  assert.deepEqual(exportSurface(src), ['renderBoard(cards, onClick = null)', 'class Player { constructor(x, y); move(dx) }', 'MAX', 'tick(a, b)', 'h(z)', 'default']);
  assert.deepEqual(exportedNames('export const A = 1;\nexport { A as B };').sort(), ['A', 'B']);
  const block = interfaceBlock(new Map([['lib.js', { content: src }], ['style.css', { content: 'x' }], ['plain.js', { content: 'var z = 1;' }]]));
  assert.match(block, /lib\.js: exports renderBoard\(cards, onClick = null\); class Player/);
  assert.match(block, /plain\.js: exports nothing/);
  assert.ok(!block.includes('style.css'));
});

test('P127.23 type-contracts flags cross-file mismatches and ignores DOM/platform typing', () => {
  const bad = validateTypeContracts(new Map([
    ['logic.js', 'export function a(x) { return x; }\nexport class Player { move() {} }\n'],
    ['game.js', "import { a, gone } from './logic.js';\nimport { Player } from './logic.js';\nclass G { constructor() { this.p = new Player(); } go() { this.p.reset(); a(1, 2, 3); } }\n"],
  ]));
  assert.equal(bad.ok, false);
  const msgs = bad.issues.map((i) => i.message).join(' | ');
  assert.match(msgs, /no exported member 'gone'/);
  assert.match(msgs, /'reset' does not exist on type 'Player'/);
  assert.match(msgs, /Expected 0-1 arguments, but got 3/);
  const good = validateTypeContracts(new Map([['a.js', 'export const n = 1;'], ['b.js', "import { n } from './a.js'; document.getElementById('x').value = n; [1].map((v) => v + 1);"]]));
  assert.equal(good.ok, true);
  assert.ok(REQUIRED_VALIDATORS.includes('type-contracts'));
});

test('P127.23 cross-file repair fixes a bad import with one bounded model call and never breaks other validators', async () => {
  const w = world();
  const base = w.model(0);
  const html = '<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><canvas id="c"></canvas><script type="module" src="app.js"></script></body></html>';
  const pad = '\n' + ('// pad ' + 'x'.repeat(900) + '\n').repeat(6);
  let repairCalls = 0;
  const model = { async complete(a) {
    if (a.role === 'planner') {
      if (/units|plan|schemaVersion/i.test(a.prompt || '') && !(a.prompt || '').includes('Create a focused') && !/User request \(plain language\)|expandedGoal/i.test(a.prompt || '') && !/app_builder\.intent/i.test(a.system || '')) {
        const u = (id, path, dependsOn) => ({ id, kind: 'file', path, purpose: id, dependsOn, exports: [], contract: id, maxOutputTokens: 3000, status: 'pending', attempts: 0 });
        return { text: JSON.stringify({ schemaVersion: 1, units: [u('style', 'style.css', []), u('util', 'util.js', []), u('app', 'app.js', ['util']), u('index', 'index.html', ['style', 'app'])], order: ['style', 'util', 'app', 'index'], specHash: 'test' }), finishReason: 'stop', modelId: 'fake' };
      }
      return base.complete(a);
    }
    if (/Fix cross-file contract defects in app\.js/.test(a.prompt)) {
      repairCalls++;
      return { text: formatFileMarker('app.js', "import { start } from './util.js';\naddEventListener('keydown', () => start());\nstart();" + pad), finishReason: 'stop', modelId: 'fake' };
    }
    const path = JSON.parse(/Implement unit (\{.*?\}) for spec/s.exec(a.prompt)[1]).path;
    const content = path === 'util.js' ? 'export function start() { return 1; }' + pad
      : path === 'app.js' ? "import { begin } from './util.js';\naddEventListener('keydown', () => begin());\nbegin();" + pad
      : path === 'index.html' ? html : 'body{margin:0}';
    return { text: formatFileMarker(path, content), finishReason: 'stop', modelId: 'fake' };
  } };
  const r = await runBuild({ ...input, jobId: 'job-x1' }, w.ports(model));
  assert.equal(repairCalls, 1);
  assert.ok(w.events.some((e) => e.type === 'cross_file_repair_accepted'), JSON.stringify(w.events.filter((e) => /repair/.test(e.type))));
  const failing = r.report.validators.filter((v) => !v.ok).map((v) => `${v.name}:${v.issues.map((i) => i.message).join(';')}`);
  assert.deepEqual(failing.filter((f) => /^(module|type|member)-contracts/.test(f)), []);
});

// P127.25: terminal state must never be visible before the artifact exists; per-file progress for the UI.
test('P127.25: first terminal save already carries the artifact (complete and partial builds)', async () => {
  for (const failAt of [0, 3]) {
    const w = world(); const saves = [];
    const base = w.ports(w.model(failAt));
    const ports = { ...base, store: { ...base.store, async saveJob(s) { saves.push({ status: s.status, artifactId: s.artifactId ?? null }); return base.store.saveJob(s); }, async putArtifact(...a) { saves.push({ putArtifact: true }); return base.store.putArtifact(...a); } } };
    const r = await runBuild(input, ports);
    assert.ok(r.archive, 'archive built');
    const firstTerminal = saves.findIndex((s) => ['done', 'failed', 'cancelled'].includes(s.status));
    const put = saves.findIndex((s) => s.putArtifact);
    assert.ok(put >= 0 && put < firstTerminal, `artifact stored before first terminal save (failAt=${failAt})`);
    assert.equal(saves[firstTerminal].artifactId, 'a');
  }
});

test('P127.25: running unit is persisted so the UI can show it in progress', async () => {
  const w = world(); const seen = [];
  const base = w.ports(w.model(0));
  const ports = { ...base, store: { ...base.store, async saveJob(s) { for (const u of s.plan?.units ?? []) if (u.status === 'running') seen.push(u.path); return base.store.saveJob(s); } } };
  await runBuild(input, ports);
  assert.ok(seen.length >= 1, 'a running unit was visible in a saved state');
});

test('P127.25: publicBuildFiles maps unit status to ready/working/pending/failed; only ready has a download url', async () => {
  const { publicBuildFiles } = await import('../server/appBuilderAdapter.ts');
  const mk = (status, unitStatus) => ({ id: 'j'.repeat(8), projectId: 'p1', status, plan: { units: [
    { id: 'a', path: 'a.js', status: 'done' }, { id: 'b', path: 'b.js', status: unitStatus }, { id: 'c', path: 'c.js', status: 'pending' }, { id: 'n', status: 'done' },
  ] } });
  const live = publicBuildFiles(mk('running', 'running'));
  assert.deepEqual(live.map((f) => f.state), ['ready', 'working', 'pending']);
  assert.match(live[0].downloadUrl, /code\/build\/.+\/file\?path=a\.js$/);
  assert.equal(live[1].downloadUrl, undefined);
  assert.equal(publicBuildFiles(mk('failed', 'failed'))[1].state, 'failed');
  assert.equal(publicBuildFiles(mk('failed', 'running'))[1].state, 'pending', 'a stale running unit of a finished job is not shown as in progress');
});

test('P127.25: readBuildFile serves only finished unit paths, preferring the stored ZIP', async () => {
  const { readBuildFile } = await import('../server/appBuilderAdapter.ts');
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip(); zip.file('a.js', 'repaired'); const bytes = await zip.generateAsync({ type: 'uint8array' });
  const job = { id: 'j', projectId: 'p', status: 'done', artifactId: 'z', plan: { units: [{ id: 'a', path: 'a.js', status: 'done' }, { id: 'b', path: 'b.js', status: 'running' }] } };
  assert.equal(await readBuildFile(job, 'a.js', {}, async () => bytes), 'repaired');
  assert.equal(await readBuildFile(job, 'b.js', {}, async () => bytes), null, 'unfinished file is not served');
  assert.equal(await readBuildFile(job, '../../etc/passwd', {}, async () => bytes), null, 'paths outside the plan are not served');
});

// P127.25b: entry HTML first; scripts and styles are written against its real ids.
test('P127.25b: domFirstPlan puts the HTML first and makes every script and style depend on it', async () => {
  const { domFirstPlan } = await import('../appBuilder/stack-static-site.ts');
  const u = (id, path, dependsOn) => ({ id, kind: 'file', path, purpose: id, dependsOn, exports: [], contract: '', maxOutputTokens: 100, status: 'pending', attempts: 0 });
  const plan = { schemaVersion: 1, specHash: 'x', units: [u('style', 'style.css', []), u('game', 'game.js', []), u('main', 'main.js', ['game']), u('index', 'index.html', ['style', 'game', 'main']), u('readme', 'README.md', ['index'])], order: [] };
  const out = domFirstPlan(plan);
  assert.equal(out.order[0], 'index');
  assert.deepEqual(out.units.find((x) => x.id === 'index').dependsOn, []);
  for (const id of ['style', 'game', 'main']) assert.ok(out.units.find((x) => x.id === id).dependsOn.includes('index'), `${id} depends on index`);
  assert.ok(out.order.indexOf('game') < out.order.indexOf('main'), 'script-to-script order is kept');
  const noHtml = { ...plan, units: plan.units.filter((x) => x.id !== 'index') };
  assert.equal(domFirstPlan(noHtml), noHtml, 'plans without HTML are untouched');
});

test('P127.25b: scripts see the real HTML ids; the HTML sees the planned files', async () => {
  const { domBlock, htmlPlanBlock } = await import('../appBuilder/core-prompts.ts');
  const files = new Map([['index.html', { content: '<div id="board" class="grid big"></div><button id="start">go</button>' }], ['a.js', { content: 'let id="nope"' }]]);
  const b = domBlock(files);
  assert.match(b, /ids \[board, start\]/); assert.match(b, /classes \[grid, big\]/); assert.doesNotMatch(b, /nope/);
  assert.equal(domBlock(new Map([['a.js', { content: '' }]])), '');
  const h = htmlPlanBlock([{ id: 'index', path: 'index.html', purpose: 'shell' }, { id: 'game', path: 'game.js', purpose: 'loop' }], 'index');
  assert.match(h, /game\.js: loop/); assert.doesNotMatch(h, /- index\.html/);
});

test('P127.25b: in a real build the HTML is generated first and later prompts carry its ids', async () => {
  const w = world(); const prompts = [];
  const m = w.model(0); const orig = m.complete.bind(m);
  m.complete = async (a) => { if (a.role === 'coder') prompts.push(a.prompt); return orig(a); };
  const r = await runBuild(input, w.ports(m));
  assert.equal(r.report.units[0].id, 'index');
  assert.doesNotMatch(prompts[0], /DOM CONTRACT/); assert.match(prompts[0], /generated BEFORE the scripts/);
  assert.ok(prompts.slice(1).every((p) => /DOM CONTRACT/.test(p)));
});

test('P127.27: module ids used as paths get their extension back', async () => {
  const { repairPackagePath } = await import('../appBuilder/core-plan.ts');
  assert.equal(repairPackagePath('audio_js'), 'audio.js');
  assert.equal(repairPackagePath('style_css'), 'style.css');
  assert.equal(repairPackagePath('ui_events_js'), 'ui_events.js');
  assert.equal(repairPackagePath('engine.js'), 'engine.js');
  assert.equal(repairPackagePath('notes'), 'notes');
  const brief = parseIntentBrief(JSON.stringify({ suggestedModules: [{ id: 'audio_js', path: 'audio_js', purpose: 'sound' }, { id: 'main_js', path: 'main_js', purpose: 'entry' }, { id: 'index_html', path: 'index_html', purpose: 'shell' }] }), 'a game with sound');
  assert.ok(brief.suggestedModules.some((m) => m.id === 'audio_js' && m.path === 'audio.js'));
  assert.ok(brief.suggestedModules.every((m) => !/_js$/.test(m.path)));
  const plan = expandedPlanFromBrief({ schemaVersion: SCHEMA_VERSION, title: 't', goal: 'g', language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: [] },
    { ...fallbackIntentBrief('g'), suggestedModules: [{ id: 'car_js', path: 'car_js', purpose: 'car' }, { id: 'main', path: 'main.js', purpose: 'entry' }] });
  assert.ok(plan.units.every((u) => !/_js$/.test(u.path)), 'no unit path ends in _js');
});

test('P127.27: member-contracts flags unknown keys of imported constant objects', () => {
  const files = new Map([
    ['constants.js', 'export const TILE = { EMPTY: 0, WALL: 1 };'],
    ['maze.js', "import { TILE } from './constants.js';\nexport const a = TILE.WALL;\nexport const b = TILE.PATH;"],
  ]);
  const v = validateMemberContracts(files);
  assert.equal(v.ok, false);
  assert.equal(v.issues.length, 1);
  assert.match(v.issues[0].message, /TILE\.PATH/);
  files.set('maze.js', "import { TILE } from './constants.js';\nexport const a = TILE.WALL + TILE.EMPTY;");
  assert.equal(validateMemberContracts(files).ok, true);
});

test('P127.28: mixed three.js imports become one bare specifier plus one pinned import map', async () => {
  const { normalizeThreeSetup } = await import('../appBuilder/stack-static-site.ts');
  const files = new Map([
    ['index.html', '<html><head></head><body><script type="module" src="main.js"></script></body></html>'],
    ['a.js', "import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';"],
    ['b.js', "import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';"],
    ['c.js', "import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';\nimport * as THREE from \"three\";"],
    ['d.js', "import { x } from './a.js';\nimport confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.module.mjs';"],
  ]);
  const changed = normalizeThreeSetup(files);
  assert.ok(['a.js', 'b.js', 'c.js', 'index.html'].every((p) => changed.includes(p)));
  assert.ok(!changed.includes('d.js'), 'non-three imports are untouched');
  assert.match(files.get('a.js'), /from 'three';/);
  assert.match(files.get('b.js'), /from 'three';/);
  assert.match(files.get('c.js'), /from 'three\/addons\/controls\/OrbitControls\.js'/);
  const html = files.get('index.html');
  assert.equal((html.match(/type="importmap"/g) || []).length, 1);
  assert.ok(html.indexOf('importmap') < html.indexOf('type="module"'), 'import map precedes the module script');
  assert.deepEqual(normalizeThreeSetup(files), [], 'idempotent');
  const none = new Map([['index.html', '<script type="module" src="m.js"></script>'], ['m.js', 'export {};']]);
  assert.deepEqual(normalizeThreeSetup(none), [], 'projects without three.js are untouched');
});

test('P127.28: member-contracts flags setup methods called again after the constructor already ran them', () => {
  const cls = 'export class Scene {\n  constructor() { this.initDOM(); this.initBoard(); this.run(); }\n  initDOM() {}\n  initBoard() {}\n  run() {}\n}';
  const bad = new Map([['scene.js', cls], ['main.js', "import { Scene } from './scene.js';\nconst s = new Scene();\ns.initDOM();\ns.initBoard();\ns.run();"]]);
  const v = validateMemberContracts(bad);
  assert.equal(v.ok, false);
  assert.equal(v.issues.length, 2, 'init* calls flagged, run() is not a setup method');
  assert.match(v.issues[0].message, /already calls this\.initDOM\(\)/);
  const good = new Map([['scene.js', cls], ['main.js', "import { Scene } from './scene.js';\nconst s = new Scene();\ns.run();"]]);
  assert.equal(validateMemberContracts(good).ok, true);
});

test('P127.28: unit prompt states the startup contract (initial draw, no duplicate setup)', async () => {
  const { promptFor } = await import('../appBuilder/core-prompts.ts');
  const p = promptFor('coder', 'ctx', 'scene.js').prompt;
  assert.match(p, /Startup contract/);
  assert.match(p, /draws its initial state at once/);
});

import JSZip from 'jszip';

test('P127.30 a finished build ships a standalone index.html and keeps the editable sources under source/', async () => {
  const w = world();
  const r = await runBuild({ ...input, jobId: 'job-sa1' }, w.ports(w.model(0)));
  assert.ok(r.archive && r.archive.byteLength > 0);
  const zip = await JSZip.loadAsync(r.archive);
  const names = Object.keys(zip.files);
  const idx = await zip.file('index.html').async('string');
  assert.ok(!/<script[^>]*\bsrc="(?!https?:)/i.test(idx), 'root index.html has no local script reference');
  assert.ok(!/<link[^>]*stylesheet[^>]*href="(?!https?:)/i.test(idx), 'root index.html has no local stylesheet reference');
  assert.ok(names.includes('source/index.html'));
  assert.ok(names.some((n) => /^source\/.+\.js$/.test(n)), 'sources are kept');
  assert.equal(r.report.standalone?.built, true);
  assert.ok(w.events.some((e) => e.type === 'standalone_index'));
});

// P127.31 — a model plan that is sound in substance is kept even when references are named by file or form a cycle.
const planUnit = (id, path, dependsOn = []) => ({ id, kind: 'file', path, purpose: id, dependsOn, exports: [], contract: `${id} contract`, maxOutputTokens: 1500, status: 'pending', attempts: 0 });
// Same graph shape as the plan the planner returned in the 2026-11-07 log: ids without extension, dependsOn and order
// naming files, one dangling-by-name reference per unit, and a two-unit cycle between the entry script and a leaf script.
const namedByFilePlan = () => ({
  schemaVersion: 1, specHash: 'x',
  units: [
    planUnit('page', 'page.html', ['sheet.css', 'core.js']),
    planUnit('sheet', 'sheet.css'),
    planUnit('view', 'view.js', ['lib.js']),
    planUnit('lib', 'lib.js'),
    planUnit('rules', 'rules.js', ['data.js']),
    planUnit('data', 'data.js'),
    planUnit('ctl', 'ctl.js', ['core.js']),
    planUnit('core', 'core.js', ['view.js', 'rules.js', 'ctl.js']),
  ],
  order: ['lib.js', 'data.js', 'rules.js', 'view.js', 'core.js', 'ctl.js', 'sheet.css', 'page.html'],
});

test('P127.31 a plan whose dependsOn/order name files and contain a cycle is repaired, not discarded', async () => {
  const { validatePlan, repairPlanReferences } = await import('../appBuilder/core-plan.ts');
  const raw = namedByFilePlan();
  assert.equal(validatePlan(raw).ok, false, 'fixture reproduces the rejected plan');
  const fixed = repairPlanReferences(raw);
  const checked = validatePlan(fixed);
  assert.equal(checked.ok, true, checked.issues.map((i) => i.message).join('; '));
  assert.deepEqual(fixed.units.map((u) => u.id), raw.units.map((u) => u.id), 'no unit is added, removed or renamed');
  assert.ok(fixed.units.every((u, i) => u.contract === raw.units[i].contract && u.path === raw.units[i].path), 'contracts and paths are the model\'s own');
  const byId = new Map(fixed.units.map((u) => [u.id, u]));
  assert.deepEqual(byId.get('page').dependsOn, ['sheet', 'core'], 'file names resolve to unit ids');
  assert.deepEqual(byId.get('core').dependsOn, ['view', 'rules', 'ctl'], 'the unit with the most dependencies keeps all of them');
  assert.deepEqual(byId.get('ctl').dependsOn, [], 'the cycle is broken at the least-connected unit');
  const pos = (id) => checked.order.indexOf(id);
  assert.ok(['view', 'rules', 'ctl'].every((d) => pos(d) < pos('core')), 'the entry script is generated after the modules it uses');
  assert.deepEqual(raw, namedByFilePlan(), 'the input plan is not mutated');
});

test('P127.31 unusable plans are still rejected after repair', async () => {
  const { validatePlan, repairPlanReferences } = await import('../appBuilder/core-plan.ts');
  const ok = (plan, profile) => validatePlan(repairPlanReferences(plan), profile).ok;
  const base = () => ({ schemaVersion: 1, specHash: 'x', units: [planUnit('a', 'a.js'), planUnit('b', 'b.css')], order: ['a', 'b'] });
  assert.equal(ok(base()), true);
  assert.equal(ok({ ...base(), units: [] }), false, 'no units');
  assert.equal(ok({ ...base(), units: [planUnit('a', '../a.js'), planUnit('b', 'b.css')] }), false, 'unsafe path');
  assert.equal(ok({ ...base(), units: [planUnit('a', 'same.js'), planUnit('b', 'same.js')] }), false, 'duplicate path');
  assert.equal(ok({ ...base(), units: [planUnit('a', 'a.js'), planUnit('a', 'b.css')] }), false, 'duplicate unit id');
  assert.equal(ok(base(), { maxUnits: 1 }), false, 'too many units');
  assert.equal(ok({ ...base(), schemaVersion: 2 }), false, 'unsupported schema version');
  const dangling = base(); dangling.units[0].dependsOn = ['nothing.js'];
  assert.equal(ok(dangling), true, 'a hint that names no unit is dropped, not fatal');
  assert.deepEqual(repairPlanReferences(dangling).units[0].dependsOn, []);
  const selfRef = base(); selfRef.units[1].dependsOn = ['b', 'b.css'];
  assert.deepEqual(repairPlanReferences(selfRef).units[1].dependsOn, [], 'a unit never depends on itself');
});

test('P127.31 a build keeps the model plan when only the reference naming was off (no template fallback)', async () => {
  const w = world(); const m = w.model(0); const orig = m.complete.bind(m);
  m.complete = async (a) => {
    if (a.role === 'planner' && /Create a Plan JSON/.test(a.prompt || '')) {
      return { text: JSON.stringify({
        schemaVersion: 1, specHash: 'x',
        units: [planUnit('sheet', 'style.css'), planUnit('core', 'app.js'), planUnit('page', 'index.html', ['style.css', 'app.js']), planUnit('readme', 'README.md', ['index.html'])],
        order: ['style.css', 'app.js', 'index.html', 'README.md'],
      }), finishReason: 'stop', modelId: 'fake' };
    }
    return orig(a);
  };
  const r = await runBuild({ ...input, jobId: 'job-p31' }, w.ports(m));
  assert.ok(!w.events.some((e) => e.type === 'plan_fallback'), 'no template fallback');
  assert.ok(!w.events.some((e) => e.type === 'plan_validate_failed'), 'the repaired plan validates');
  assert.deepEqual(r.report.units.map((u) => u.id).sort(), ['core', 'page', 'readme', 'sheet'], 'the model\'s own unit ids are built');
  assert.equal(r.report.units[0].id, 'page', 'entry HTML still goes first');
});

// P127.32 — open the built page in a sandboxed browser; what throws joins the bounded cross-file repair.
// The "repair" returns the current source with a marker appended, so the repair guard sees a faithful rewrite.
const runtimeModel = (w, suffix) => {
  const m = w.model(0); const orig = m.complete.bind(m);
  m.complete = async (a) => {
    if (a.role === 'coder' && /Fix cross-file contract defects in app\.js/.test(a.prompt || '')) {
      const cur = /BEGIN CURRENT SOURCE app\.js -----\n([\s\S]*?)\n----- END CURRENT SOURCE/.exec(a.prompt)?.[1] ?? '';
      return { text: formatFileMarker('app.js', cur + suffix), finishReason: 'stop', modelId: 'fake' };
    }
    return orig(a);
  };
  return m;
};
const fakeRuntime = (isBroken) => { const seen = []; return { seen, async check(files) {
  seen.push([...files.keys()].length);
  return isBroken(files) ? { ran: true, issues: [{ path: 'app.js', message: 'runtime: boom (at app.js:1)' }] } : { ran: true, issues: [] };
} }; };

test('P127.32 a thrown runtime error is repaired once and only then runtimeVerified is true', async () => {
  const w = world();
  const rt = fakeRuntime((files) => !files.get('app.js').includes('repaired'));
  const r = await runBuild({ ...input, jobId: 'job-rt1' }, { ...w.ports(runtimeModel(w, '\nvoid "repaired";')), runtime: rt });
  assert.ok(w.events.some((e) => e.type === 'runtime_checked' && e.data?.ok === false), 'the first open found the error');
  assert.ok(w.events.some((e) => e.type === 'cross_file_repair_accepted'), JSON.stringify(w.events.filter((e) => /repair|runtime/.test(e.type)).map((e) => [e.type, e.data])));
  assert.ok(rt.seen.length >= 2, 'the repaired files were opened again');
  assert.equal(r.report.runtimeVerified, true);
  assert.equal(r.report.validators.find((v) => v.name === 'runtime-smoke')?.ok, true);
  assert.equal(r.report.goalImplemented, true);
});

test('P127.32 an error that survives repair is reported, never a green result', async () => {
  const w = world(); const rt = fakeRuntime(() => true);
  const r = await runBuild({ ...input, jobId: 'job-rt2' }, { ...w.ports(runtimeModel(w, '\nvoid 0;')), runtime: rt });
  assert.equal(r.report.runtimeVerified, false);
  assert.equal(r.report.goalImplemented, false);
  assert.equal(r.report.outcome, 'PARTIAL');
  assert.match(String(r.report.failureReason), /runtime-smoke/);
});

test('P127.32 a port that did not run (no browser, disabled) changes nothing', async () => {
  const base = world(); const a = await runBuild({ ...input, jobId: 'job-rt3a' }, base.ports(base.model(0)));
  const w = world(); const rt = { async check() { return { ran: false, issues: [], reason: 'playwright_unavailable' }; } };
  const b = await runBuild({ ...input, jobId: 'job-rt3b' }, { ...w.ports(w.model(0)), runtime: rt });
  assert.deepEqual(b.report.validators.map((v) => v.name), a.report.validators.map((v) => v.name));
  assert.equal(b.report.runtimeVerified, false);
  assert.equal(b.report.outcome, a.report.outcome);
  assert.ok(w.events.some((e) => e.type === 'runtime_check_skipped'));
  const thrower = { async check() { throw new Error('browser crashed'); } };
  const w2 = world(); const c = await runBuild({ ...input, jobId: 'job-rt3c' }, { ...w2.ports(w2.model(0)), runtime: thrower });
  assert.equal(c.report.outcome, a.report.outcome, 'a crashing port is "not run", not a page defect');
});

test('P127.32 runner request policy: project files from memory, two script CDNs, nothing else', async () => {
  const { requestPolicy, runtimeIssuesFromErrors, RUNTIME_ORIGIN } = await import('../server/appBuilderRuntimeCheck.ts');
  const files = new Map([['index.html', '<p>x</p>'], ['app.js', 'let a=1;']]);
  assert.equal(requestPolicy(`${RUNTIME_ORIGIN}/index.html`, files).action, 'serve');
  assert.equal(requestPolicy(`${RUNTIME_ORIGIN}/`, files).action, 'serve');
  assert.equal(requestPolicy(`${RUNTIME_ORIGIN}/missing.js`, files).action, 'block');
  assert.equal(requestPolicy('https://cdn.jsdelivr.net/npm/x@1.0.0/x.js', files).action, 'allow');
  assert.equal(requestPolicy('https://cdnjs.cloudflare.com/ajax/libs/x/1/x.js', files).action, 'allow');
  for (const u of ['http://cdn.jsdelivr.net/x.js', 'https://evil.example/x.js', 'https://cdn.jsdelivr.net.evil.example/x.js', 'file:///etc/passwd', 'http://169.254.169.254/latest/meta-data', 'ws://localhost:1/', 'not a url']) {
    assert.equal(requestPolicy(u, files).action, 'block', u);
  }
  // error text -> issues on the project files named in the stack; browser noise is ignored
  const names = new Set(['a.js', 'b.js']);
  const stack = `TypeError: x.add is not a function\n    at f (${RUNTIME_ORIGIN}/a.js:4:9)\n    at g (${RUNTIME_ORIGIN}/b.js:10:2)\n    at h (${RUNTIME_ORIGIN}/other.js:1:1)`;
  const issues = runtimeIssuesFromErrors([stack, 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT', 'Error creating WebGL context'], names);
  assert.deepEqual(issues.map((i) => i.path).sort(), ['a.js', 'b.js']);
  assert.ok(issues.every((i) => i.message.startsWith('runtime: TypeError: x.add is not a function (at a.js:4 <- b.js:10)')));
  assert.deepEqual(runtimeIssuesFromErrors(['Failed to load resource: 404'], names), []);
  assert.deepEqual(runtimeIssuesFromErrors(['Uncaught Error: boom'], names), [{ message: 'runtime: Uncaught Error: boom' }], 'no project frame: issue without a path');
});

test('P127.32 runner opens a real page in a browser and reports what throws (explicit skip if no browser)', async (t) => {
  const { createRuntimePort } = await import('../server/appBuilderRuntimeCheck.ts');
  const port = createRuntimePort();
  const ok = await port.check(new Map([['index.html', '<!doctype html><body><p id="a">hi</p><script src="app.js"></script></body>'], ['app.js', 'document.getElementById("a").textContent="ok";']]));
  if (!ok.ran) { t.skip(`NOT_RUN: ${ok.reason}`); return; }
  assert.deepEqual(ok.issues, []);
  const bad = await port.check(new Map([['index.html', '<!doctype html><body><script type="module" src="main.js"></script></body>'], ['main.js', 'import { make } from "./lib.js";\nconst s = make();\ns.add(1);'], ['lib.js', 'export function make() { return { scene: {} }; }']]));
  assert.equal(bad.ran, true);
  assert.ok(bad.issues.some((i) => i.path === 'main.js' && /s\.add is not a function/.test(i.message)), JSON.stringify(bad.issues));
  // a page that tries to reach a server of its own must not get through: a TCP listener counts connection attempts
  const net = await import('node:net'); let hits = 0;
  const srv = net.createServer((sock) => { hits++; sock.destroy(); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = `https://127.0.0.1:${srv.address().port}/steal`;
  const probe = await port.check(new Map([['index.html', `<!doctype html><body><script>fetch(${JSON.stringify(url)}).catch(()=>{});new Image().src=${JSON.stringify(url)};</script></body>`]]));
  await new Promise((r) => srv.close(r));
  assert.equal(probe.ran, true);
  assert.equal(hits, 0, 'no connection from the generated page reached a host outside the policy');
});

// P127.33 — names two files must agree on: a CSS class that nothing sets, a local media file that does not exist.
test('P127.33 name-contracts: a CSS rule that needs a class nothing sets is flagged on the script that builds the element', async () => {
  const { validateNameContracts } = await import('../appBuilder/validator-static-site.ts');
  const css = '.item{opacity:0}.item.on{opacity:1}.item.state-a{color:red}.cell.light{color:#eee}.cell.dark{color:#111}.solo{color:red}';
  const page = '<!doctype html><body><main id="m"></main><script type="module" src="a.js"></script></body>';
  const broken = new Map([['index.html', page], ['style.css', css], ['a.js', 'const el = document.createElement("div"); el.className = "item" + (" state-" + 1); document.body.append(el);\nconst c = document.createElement("i"); c.className = `cell ${1 ? "white" : "black"} highlight`;']]);
  const r = validateNameContracts(broken);
  assert.equal(r.ok, false);
  assert.ok(r.issues.every((i) => i.path === 'a.js'), JSON.stringify(r.issues));
  const said = r.issues.map((i) => i.message).join('\n');
  assert.match(said, /"on"/); assert.match(said, /"light"/); assert.match(said, /"dark"/);
  assert.doesNotMatch(said, /"solo"/, 'a rule with one class is not a contract between two names');
  assert.doesNotMatch(said, /state-a/, 'a composed name is not flagged');
  assert.ok(r.issues.every((i) => i.message.startsWith('name:')));
  const fixed = new Map(broken); fixed.set('a.js', 'const el = document.createElement("div"); el.className = "item"; el.classList.add("on"); const k = "state-" + 1;\nconst c = document.createElement("i"); c.className = `cell ${1 ? "light" : "dark"}`;');
  const ok = validateNameContracts(fixed);
  assert.equal(ok.ok, true, JSON.stringify(ok.issues));
  const whole = new Map(broken); whole.set('a.js', 'el.className = "cell"; el.classList.add("highlight");'); // "light" only inside "highlight"
  assert.match(validateNameContracts(whole).issues.map((i) => i.message).join('\n'), /"light"/, 'whole words only');
});

test('P127.33 name-contracts: a local media file that is not in the package is flagged, present files, data and external urls are not', async () => {
  const { validateNameContracts } = await import('../appBuilder/validator-static-site.ts');
  const files = new Map([
    ['index.html', '<!doctype html><body><script type="module" src="js/a.js"></script></body>'],
    ['style.css', 'body{background:url(img/bg.png)} .x{background:url("data:image/png;base64,AAAA")} .y{background:url(https://cdn.example/z.png)}'],
    ['js/a.js', 'const a = new Image(); a.src = "../img/pic.jpg"; const b = new Audio(\'beep.mp3\'); const c = "data:image/png;base64,AAAA"; const d = "https://cdn.example/q.png"; const e = `${base}/f.png`;'],
  ]);
  const r = validateNameContracts(files);
  const said = r.issues.map((i) => `${i.path}: ${i.message}`).join('\n');
  assert.match(said, /style\.css: .*img\/bg\.png/); assert.match(said, /js\/a\.js: .*\.\.\/img\/pic\.jpg/); assert.match(said, /js\/a\.js: .*beep\.mp3/);
  assert.doesNotMatch(said, /cdn\.example|data:|f\.png/);
  const withFiles = new Map(files); withFiles.set('img/bg.png', ''); withFiles.set('img/pic.jpg', ''); withFiles.set('js/beep.mp3', '');
  assert.equal(validateNameContracts(withFiles).ok, true);
});

test('P127.33 name-contracts is a required validator and a missing-file reference is repaired through the cross-file repair', async () => {
  assert.ok(REQUIRED_VALIDATORS.includes('name-contracts'));
  const w = world(); const m = w.model(0); const orig = m.complete.bind(m);
  m.complete = async (a) => {
    const p = a.prompt || '';
    if (a.role === 'coder' && /Fix cross-file contract defects in app\.js/.test(p)) {
      const cur = /BEGIN CURRENT SOURCE app\.js -----\n([\s\S]*?)\n----- END CURRENT SOURCE/.exec(p)?.[1] ?? '';
      assert.match(p, /name:/); assert.match(p, /Lines starting with "name:"/);
      return { text: formatFileMarker('app.js', cur.replace('pic.png', 'data:image/svg+xml,%3Csvg/%3E')), finishReason: 'stop', modelId: 'fake' };
    }
    const r = await orig(a);
    if (a.role === 'coder' && /Implement unit/.test(p) && /"path":"app\.js"/.test(p) && r?.text) return { ...r, text: r.text.replace(/<<<END>>>\s*$/, 'const im = new Image(); im.src = "pic.png";\n<<<END>>>') };
    return r;
  };
  const r = await runBuild({ ...input, jobId: 'job-p33' }, w.ports(m));
  assert.ok(w.events.some((e) => e.type === 'cross_file_repair_accepted'), JSON.stringify(w.events.filter((e) => /repair/.test(e.type)).map((e) => [e.type, e.data])));
  assert.equal(r.report.validators.find((v) => v.name === 'name-contracts')?.ok, true);
  assert.equal(r.report.goalImplemented, true);
});
