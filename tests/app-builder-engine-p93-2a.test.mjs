import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { runBuild, makeCacheKey, PROMPT_VERSION, SCHEMA_VERSION } from '../appBuilder/index.ts';
import { formatFileMarker } from '../appBuilder/core-markers.ts';

function harness() {
  const cache = new Map(); const calls = []; const events = [];
  const model = { async complete(args) {
    calls.push(args);
    if (args.prompt.includes('Create a concise project specification')) return { text: JSON.stringify({ schemaVersion: 1, title: 'Demo', goal: 'Demo site', language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: ['has_file:index.html'] }), finishReason: 'stop', modelId: 'fake-v1' };
    if (args.prompt.includes('Create a Plan JSON')) return { text: JSON.stringify({ schemaVersion: 1, specHash: 'abc', units: [{ id: 'index', kind: 'file', path: 'index.html', purpose: 'entry', dependsOn: [], exports: [], contract: 'entry page', maxOutputTokens: 1000, status: 'pending', attempts: 0 }], order: ['index'] }), finishReason: 'stop', modelId: 'fake-v1' };
    return { text: formatFileMarker('index.html', '<!doctype html><html><body>demo</body></html>'), finishReason: 'stop', modelId: 'fake-v1' };
  } };
  const store = { async saveJob() {}, async loadJob() { return null; }, async listResumable() { return []; }, async putUnitResult(r) { cache.set(r.cacheKey, r); }, async getUnitResult(k) { return cache.get(k) ?? null; }, async putArtifact() { return 'artifact'; } };
  const ports = { model, store, events: { emit(e) { events.push(e); } }, clock: { now: (() => { let n = 1000; return () => n++; })(), async sleep() {} } };
  return { ports, calls, events, cache };
}

test('P93.2a engine creates report and ZIP using fake ModelPort', async () => {
  const h = harness();
  const result = await runBuild({ schemaVersion: SCHEMA_VERSION, jobId: 'job-1', projectId: 'p', userId: 'u', taskText: 'make a demo site' }, h.ports);
  assert.equal(result.report.status, 'complete');
  assert.equal(result.report.outcome, 'SUCCESS');
  assert.equal(result.report.goalImplemented, true);
  assert.ok(result.report.checksDeclared.length > 0);
  assert.deepEqual(result.report.checksNotRun, []);
  assert.equal(result.report.files[0].path, 'index.html');
  assert.ok(result.archive instanceof Uint8Array);
  const zip = await JSZip.loadAsync(result.archive);
  assert.match(await zip.file('index.html').async('string'), /<html>/);
  const report = JSON.parse(await zip.file('build-report.json').async('string'));
  assert.equal(report.goalImplemented, true);
  assert.ok(h.events.some((e) => e.type === 'job_done'));
});

test('cache key is stable and prompt-version-sensitive', () => {
  const base = { unitInput: { path: 'index.html', prompt: 'x' }, modelId: 'fake' };
  assert.equal(makeCacheKey(base), makeCacheKey(base));
  assert.notEqual(makeCacheKey(base), makeCacheKey({ ...base, promptVersion: 'static_site.v2' }));
  assert.equal(PROMPT_VERSION, 'static_site.v1');
});

test('one-level nested paths are allowed but deeper paths are rejected', async () => {
  const { isSafePath } = await import('../appBuilder/core-plan.ts');
  assert.equal(isSafePath('assets/logo.svg'), true);
  assert.equal(isSafePath('assets/img/logo.svg'), false);
  assert.equal(isSafePath('../secret'), false);
});


test('P118 empty artifact cannot be SUCCESS', async () => {
  const h = harness();
  // Force invalid plan generation by returning empty plan units after a valid spec.
  const orig = h.ports.model.complete.bind(h.ports.model);
  h.ports.model.complete = async (args) => {
    if (args.prompt.includes('Create a Plan JSON')) {
      return { text: JSON.stringify({ schemaVersion: 1, specHash: 'abc', units: [], order: [] }), finishReason: 'stop', modelId: 'fake-v1' };
    }
    return orig(args);
  };
  const result = await runBuild({ schemaVersion: SCHEMA_VERSION, jobId: 'job-empty', projectId: 'p', userId: 'u', taskText: 'make a demo site' }, h.ports);
  assert.notEqual(result.report.outcome, 'SUCCESS');
  assert.equal(result.report.files.length, 0);
  assert.ok(result.report.failureReason);
});
