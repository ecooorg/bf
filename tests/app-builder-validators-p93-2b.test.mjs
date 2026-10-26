import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { runBuild, runStaticValidators, checkAcceptance, validateHtml, validateJs, validateRefs, validateSize, validateSecrets, templatePlan, validatePlan, formatFileMarker, SCHEMA_VERSION } from '../appBuilder/index.ts';

const page = (body, head = '<link rel="stylesheet" href="style.css">') => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
const good = () => new Map([['index.html', page('<canvas id="c"></canvas><script src="app.js"></script>')], ['style.css', 'body{margin:0}'], ['app.js', 'document.addEventListener("keydown",()=>{});'], ['README.md', '# Demo']]);

test('good static site passes every required validator', () => {
  const v = runStaticValidators(good(), { acceptance: ['has_file:app.js', 'html_has:index.html:canvas', 'js_contains:app.js:keydown'] });
  assert.deepEqual(v.filter((x) => !x.ok), []);
});
test('html structure: unclosed tags and missing body', () => {
  assert.equal(validateHtml(new Map([['a.html', '<!doctype html><html><body><div></body></html>']])).ok, false);
  assert.equal(validateHtml(new Map([['a.html', '<!doctype html><html></html>']])).ok, false);
});
test('missing and external references are reported', () => {
  const f = good(); f.set('index.html', page('<script src="missing.js"></script><img src="https://x.test/a.png">'));
  const r = validateRefs(f); assert.equal(r.ok, false); assert.equal(r.issues.length, 2);
});
test('JS syntax error is reported and code is not executed', () => {
  globalThis.__p932b = 0;
  assert.equal(validateJs(new Map([['app.js', 'let x = ;']])).ok, false);
  assert.equal(validateJs(new Map([['app.js', 'globalThis.__p932b = 1;']])).ok, true);
  assert.equal(globalThis.__p932b, 0);
});
test('secret-like text, empty files, size limits', () => {
  assert.equal(validateSecrets(new Map([['app.js', 'AIzaSyFakeKeyJustForTestingPurposes123456']])).ok, false);
  assert.equal(validateSecrets(good()).ok, true);
  assert.equal(validateSize(new Map([['a.js', '  ']])).ok, false);
  assert.equal(validateSize(new Map([['a.txt', 'x'.repeat(2 * 1024 * 1024 + 1)]])).ok, false);
});
test('acceptance predicates: pass, fail, unsupported', () => {
  const f = good();
  assert.equal(checkAcceptance(f, ['has_file:index.html', 'html_has:index.html:#c', 'free text criterion']).ok, true);
  assert.equal(checkAcceptance(f, ['has_file:nope.js']).ok, false);
  assert.equal(checkAcceptance(f, ['js_contains:app.js:WebSocket']).ok, false);
  const u = checkAcceptance(f, ['magic:thing']); assert.equal(u.ok, false); assert.match(u.issues[0].message, /unsupported/);
});
test('template plan is a valid plan', () => {
  const p = templatePlan({ schemaVersion: 1, title: 't', goal: 'g', language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: [] });
  assert.equal(validatePlan(p).ok, true);
  assert.deepEqual(p.units.map((u) => u.path).sort(), ['README.md', 'app.js', 'index.html', 'style.css']);
});

const golden = JSON.parse(readFileSync(new URL('./app-builder-golden.json', import.meta.url), 'utf8'));
function contentFor(path, task) {
  if (path.endsWith('.html')) return page(`<h1>${task.id}</h1><canvas></canvas><ul id="todo-list"></ul><button>1</button> contacts <script src="app.js"></script>`);
  if (path.endsWith('.css')) return 'body{margin:0}';
  if (path.endsWith('.js')) return 'document.addEventListener("keydown",()=>{}); document.body.addEventListener("click",()=>{});';
  return `# ${task.id}`;
}
function ports(task, { badPlan = true } = {}) {
  const cache = new Map(); const calls = [];
  const model = { async complete(a) {
    calls.push(a);
    if (a.prompt.includes('Create a concise project specification')) return { text: JSON.stringify({ schemaVersion: 1, title: task.task, goal: task.task, language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: task.acceptance }), finishReason: 'stop', modelId: 'fake' };
    if (a.prompt.includes('Create a Plan JSON')) return { text: badPlan ? 'not json' : '{}', finishReason: 'stop', modelId: 'fake' };
    const m = /Implement unit (\{.*?\}) for spec/s.exec(a.prompt); const path = JSON.parse(m[1]).path;
    return { text: formatFileMarker(path, contentFor(path, task)), finishReason: 'stop', modelId: 'fake' };
  } };
  const store = { async saveJob() {}, async loadJob() { return null; }, async listResumable() { return []; }, async putUnitResult(r) { cache.set(r.cacheKey, r); }, async getUnitResult(k) { return cache.get(k) ?? null; }, async putArtifact() { return 'a'; } };
  let n = 0; return { calls, ports: { model, store, events: { emit() {} }, clock: { now: () => n++, async sleep() {} } } };
}

test('golden Tetris: template-plan fallback, validators pass, goalImplemented=true', async () => {
  const task = golden.tasks.find((t) => t.id === 'tetris'); const h = ports(task);
  const r = await runBuild({ schemaVersion: SCHEMA_VERSION, jobId: 'g1', projectId: 'p', userId: 'u', taskText: task.task }, h.ports);
  assert.equal(r.report.status, 'complete'); assert.equal(r.report.goalImplemented, true);
  assert.ok(h.calls.length <= task.maxCalls);
  assert.deepEqual(r.report.files.map((f) => f.path).sort(), [...task.expectedFiles].sort());
  assert.ok(r.report.validators.length >= 6 && r.report.validators.every((v) => v.ok));
  const zip = await JSZip.loadAsync(r.archive);
  assert.ok((await zip.file('index.html').async('string')).length > 0);
  assert.ok((await zip.file('app.js').async('string')).length > 0);
  assert.match(r.report.failureReason, /plan_fallback_used/);
});

test('failing validator makes the report honest: partial, goalImplemented=false', async () => {
  const task = golden.tasks[0]; const h = ports({ ...task, acceptance: ['js_contains:app.js:NoSuchToken'] });
  const r = await runBuild({ schemaVersion: SCHEMA_VERSION, jobId: 'g2', projectId: 'p', userId: 'u', taskText: 'x' }, h.ports);
  assert.equal(r.report.status, 'partial'); assert.equal(r.report.goalImplemented, false);
  assert.match(r.report.failureReason, /validators_failed: acceptance/);
});
test('golden file lists only supported predicates', () => {
  for (const t of golden.tasks) for (const p of t.acceptance) assert.match(p, /^(has_file|html_has|js_contains):/);
});
