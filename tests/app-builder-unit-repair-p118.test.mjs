import test from 'node:test';
import assert from 'node:assert/strict';
import { runBuild, parseFileMarkers, formatFileMarker, promptFor, SCHEMA_VERSION } from '../appBuilder/index.ts';

const HTML = '<!doctype html>\n<html><body>ok</body></html>';
const validSpec = { schemaVersion: 1, title: 'Library', goal: 'List and search books', language: 'en', stack: 'static_site', features: ['list'], nonGoals: ['backend'], acceptance: ['has_file:index.html'] };
const validPlan = { schemaVersion: 1, specHash: 'x', units: [{ id: 'index', kind: 'file', path: 'index.html', purpose: 'entry', dependsOn: [], exports: [], contract: 'page', maxOutputTokens: 800, status: 'pending', attempts: 0 }], order: ['index'] };

function harness(coder) {
  const cache = new Map(); const events = []; const calls = [];
  const model = { async complete(args) {
    calls.push(args);
    if (args.role === 'coder') return coder(args, calls.filter((c) => c.role === 'coder').length);
    if (args.prompt.includes('Create a Plan JSON')) return { text: JSON.stringify(validPlan), finishReason: 'stop', modelId: 'fake' };
    return { text: JSON.stringify(validSpec), finishReason: 'stop', modelId: 'fake' };
  } };
  const store = { async saveJob() {}, async loadJob() { return null; }, async listResumable() { return []; }, async putUnitResult(r) { cache.set(r.cacheKey, r); }, async getUnitResult(k) { return cache.get(k) ?? null; }, async putArtifact() { return 'artifact'; } };
  const ports = { model, store, events: { emit(e) { events.push(e); } }, clock: { now: (() => { let n = 1000; return () => n++; })(), async sleep() {} } };
  return { ports, calls, events };
}
const reply = (text, finishReason = 'stop') => ({ text, finishReason, modelId: 'fake' });
const run = (h, jobId, options) => runBuild({ schemaVersion: SCHEMA_VERSION, jobId, projectId: 'p', userId: 'u', taskText: 'library app' }, h.ports, options);
const coderCalls = (h) => h.calls.filter((c) => c.role === 'coder');

test('P118.3.3: the exact live failure (placeholder header "<<<FILE path>>>index.html") is accepted without another call', async () => {
  const h = harness(() => reply(`<<<FILE path>>>index.html\n${HTML}\n<<<END>>>`));
  const result = await run(h, 'job-placeholder');
  assert.equal(result.report.outcome, 'SUCCESS');
  assert.equal(coderCalls(h).length, 1);
  const attempt = h.events.find((e) => e.type === 'unit_attempt');
  assert.deepEqual(attempt.data.coerced, ['marker_path_placeholder']);
  assert.deepEqual(attempt.data.foundPaths, ['index.html']);
  assert.ok(!h.events.some((e) => e.type === 'unit_repair'));
});

test('P118.3.3: wrong file path triggers exactly one repair call that names the problem, then succeeds', async () => {
  const h = harness((args, n) => n === 1 ? reply(`<<<FILE main.html>>>\n${HTML}\n<<<END>>>`) : reply(formatFileMarker('index.html', HTML)));
  const result = await run(h, 'job-repair');
  assert.equal(result.report.outcome, 'SUCCESS');
  assert.equal(coderCalls(h).length, 2);
  assert.match(coderCalls(h)[1].prompt, /expected_path_not_found:index\.html \(found: main\.html\)/);
  assert.equal(result.report.units[0].attempts, 2);
  const repair = h.events.find((e) => e.type === 'unit_repair');
  assert.ok(repair && repair.level === 'warn');
  assert.deepEqual(h.events.filter((e) => e.type === 'unit_attempt').map((e) => e.data.ok), [false, true]);
});

test('P118.3.3: truncated first reply (no END) is repaired with a "keep it compact" hint', async () => {
  const h = harness((args, n) => n === 1 ? reply(`<<<FILE index.html>>>\n${HTML}`, 'length') : reply(formatFileMarker('index.html', HTML)));
  const result = await run(h, 'job-trunc');
  assert.equal(result.report.outcome, 'SUCCESS');
  assert.match(coderCalls(h)[1].prompt, /missing_end_for:index\.html/);
  assert.match(coderCalls(h)[1].prompt, /cut off/);
  assert.equal(h.events.find((e) => e.type === 'unit_attempt').data.finishReason, 'length');
});

test('P118.3.3: failure after the single repair is specific, bounded, and keeps previews for diagnostics', async () => {
  const h = harness(() => reply(`<<<FILE other.html>>>\n${HTML}\n<<<END>>>`));
  const result = await run(h, 'job-doublefail');
  assert.equal(result.report.outcome, 'FAILED');
  assert.equal(result.report.failedStage, 'code');
  assert.equal(result.report.failureReason, 'expected_path_not_found:index.html (found: other.html)');
  assert.equal(coderCalls(h).length, 2, 'one original call plus one repair, never more');
  assert.ok(h.events.some((e) => e.type === 'unit_failed'));
  assert.ok(h.events.filter((e) => e.type === 'unit_attempt').every((e) => e.data.textPreview && e.data.foundPaths.includes('other.html')));
});

test('P118.3.3: no repair call is made when the call budget is already used', async () => {
  const h = harness(() => reply(`<<<FILE other.html>>>\n${HTML}\n<<<END>>>`));
  const result = await run(h, 'job-budget', { maxCallsPerJob: 3 }); // spec + plan + one code call
  assert.equal(result.report.outcome, 'FAILED');
  assert.equal(coderCalls(h).length, 1);
  assert.ok(!h.events.some((e) => e.type === 'unit_repair'));
});

test('P118.3.3: parser repairs only known slips for the expected path and never accepts a different file', () => {
  const p = (text, expected) => parseFileMarkers(text, expected);
  assert.deepEqual(p(`<<<FILE path=index.html>>>\n${HTML}\n<<<END>>>`, 'index.html').coerced, ['marker_path_decorated']);
  const fenced = p(`<<<FILE index.html>>>\n\`\`\`html\n${HTML}\n\`\`\`\n<<<END>>>`, 'index.html');
  assert.deepEqual(fenced.coerced, ['code_fence']);
  assert.equal(fenced.files[0].content, HTML);
  // Placeholder header followed by a different name stays unrecognised (no silent acceptance).
  const other = p(`<<<FILE path>>>other.html\n${HTML}\n<<<END>>>`, 'index.html');
  assert.deepEqual(other.files.map((f) => f.path), ['path']);
  assert.deepEqual(other.coerced, []);
  // Without an expected path nothing is coerced (previous behaviour).
  assert.deepEqual(p(`<<<FILE path>>>index.html\n${HTML}\n<<<END>>>`).files.map((f) => f.path), ['path']);
  // Garbage before the block and a correct marker are unchanged.
  assert.equal(p(`Sure!\n${formatFileMarker('index.html', HTML)}\nDone.`, 'index.html').files[0].content, HTML);
});

test('P118.3.3: the coder prompt names the real path and no longer contains the copyable placeholder', () => {
  const { prompt, version } = promptFor('coder', 'Implement unit.', 'index.html');
  assert.ok(prompt.includes('<<<FILE index.html>>>'));
  assert.ok(!prompt.includes('<<<FILE path>>>'));
  assert.equal(version, 'static_site.v2');
});
