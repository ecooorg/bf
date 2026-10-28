import test from 'node:test';
import assert from 'node:assert/strict';
import { runBuild, parseJsonLenient, validateSpec, SCHEMA_VERSION, formatFileMarker } from '../appBuilder/index.ts';

function harness(modelFn) {
  const cache = new Map();
  const events = [];
  const calls = [];
  const model = {
    async complete(args) {
      calls.push(args);
      return modelFn(args, calls.length);
    },
  };
  const store = {
    async saveJob() {},
    async loadJob() { return null; },
    async listResumable() { return []; },
    async putUnitResult(r) { cache.set(r.cacheKey, r); },
    async getUnitResult(k) { return cache.get(k) ?? null; },
    async putArtifact() { return 'artifact'; },
  };
  const ports = {
    model,
    store,
    events: { emit(e) { events.push(e); } },
    clock: { now: (() => { let n = 1000; return () => n++; })(), async sleep() {} },
  };
  return { ports, calls, events, cache };
}

const validSpec = {
  schemaVersion: 1,
  title: 'Library',
  goal: 'List and search books',
  language: 'en',
  stack: 'static_site',
  features: ['list', 'search'],
  nonGoals: ['backend'],
  acceptance: ['has_file:index.html'],
};

const validPlan = {
  schemaVersion: 1,
  specHash: 'x',
  units: [{ id: 'index', kind: 'file', path: 'index.html', purpose: 'entry', dependsOn: [], exports: [], contract: 'page', maxOutputTokens: 800, status: 'pending', attempts: 0 }],
  order: ['index'],
};

test('parseJsonLenient strips markdown fences and leading prose', () => {
  const fenced = parseJsonLenient('```json\n{"a":1}\n```');
  assert.equal(fenced.ok, true);
  assert.deepEqual(fenced.value, { a: 1 });
  const prose = parseJsonLenient('Here is the JSON:\n{"b":2}\nThanks!');
  assert.equal(prose.ok, true);
  assert.deepEqual(prose.value, { b: 2 });
  const bad = parseJsonLenient('not json at all');
  assert.equal(bad.ok, false);
});

test('validateSpec coerces schemaVersion string and rejects empty acceptance', () => {
  const ok = validateSpec({ ...validSpec, schemaVersion: '1' });
  assert.equal(ok.ok, true);
  assert.ok(ok.coerced.includes('schemaVersion:string_1_to_number'));
  const bad = validateSpec({ ...validSpec, acceptance: [] });
  assert.equal(bad.ok, false);
  assert.ok(bad.issues.includes('acceptance:empty'));
  const missing = validateSpec({ title: 'x', goal: 'y' });
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some((i) => i.startsWith('schemaVersion:')));
  assert.ok(missing.issues.includes('acceptance:not_array'));
});

test('P118.3: malformed Spec (schemaVersion string + empty acceptance) triggers one repair then succeeds', async () => {
  let phase = 0;
  const h = harness((args) => {
    if (args.prompt.includes('Create a concise project specification')) {
      phase = 1;
      // Parseable but invalid: string schemaVersion, empty acceptance
      return { text: JSON.stringify({ schemaVersion: '1', title: 'Lib', goal: 'Books', language: 'en', stack: 'static_site', features: [], nonGoals: [], acceptance: [] }), finishReason: 'stop', modelId: 'fake' };
    }
    if (args.prompt.includes('Return corrected valid JSON only for a Spec')) {
      phase = 2;
      assert.ok(args.prompt.includes('acceptance:empty') || args.prompt.includes('Previous issues'), 'recovery lists issues');
      return { text: JSON.stringify(validSpec), finishReason: 'stop', modelId: 'fake' };
    }
    if (args.prompt.includes('Create a Plan JSON')) {
      return { text: JSON.stringify(validPlan), finishReason: 'stop', modelId: 'fake' };
    }
    return { text: formatFileMarker('index.html', '<!doctype html><html><body>ok</body></html>'), finishReason: 'stop', modelId: 'fake' };
  });
  const result = await runBuild({ schemaVersion: SCHEMA_VERSION, jobId: 'job-repair', projectId: 'p', userId: 'u', taskText: 'library app' }, h.ports);
  assert.equal(phase, 2, 'recovery call was made');
  assert.equal(result.report.outcome, 'SUCCESS');
  assert.ok(h.events.some((e) => e.type === 'spec_repair'));
  assert.ok(h.events.some((e) => e.type === 'spec_accepted'));
  const attempts = h.events.filter((e) => e.type === 'spec_attempt');
  assert.ok(attempts.length >= 2);
  assert.equal(attempts[0].data.validateOk, false);
  assert.equal(attempts[1].data.validateOk, true);
});

test('P118.3: unparseable Spec recovers on second call', async () => {
  const h = harness((args) => {
    if (args.prompt.includes('Create a concise project specification')) {
      return { text: 'Sure! I will help.\nNot JSON.', finishReason: 'stop', modelId: 'fake' };
    }
    if (args.prompt.includes('Return corrected valid JSON only for a Spec')) {
      return { text: '```json\n' + JSON.stringify(validSpec) + '\n```', finishReason: 'stop', modelId: 'fake' };
    }
    if (args.prompt.includes('Create a Plan JSON')) return { text: JSON.stringify(validPlan), finishReason: 'stop', modelId: 'fake' };
    return { text: formatFileMarker('index.html', '<!doctype html><html><body>ok</body></html>'), finishReason: 'stop', modelId: 'fake' };
  });
  const result = await runBuild({ schemaVersion: SCHEMA_VERSION, jobId: 'job-fence', projectId: 'p', userId: 'u', taskText: 'library app' }, h.ports);
  assert.equal(result.report.outcome, 'SUCCESS');
  assert.ok(h.events.some((e) => e.type === 'spec_repair'));
});

test('P118.3: double-invalid Spec fails with concrete issues and diagnostic events', async () => {
  const h = harness((args) => {
    if (args.role === 'planner') {
      return { text: JSON.stringify({ schemaVersion: 2, title: '', goal: '', acceptance: 'nope' }), finishReason: 'stop', modelId: 'fake' };
    }
    return { text: 'x', finishReason: 'stop', modelId: 'fake' };
  });
  const result = await runBuild({ schemaVersion: SCHEMA_VERSION, jobId: 'job-fail', projectId: 'p', userId: 'u', taskText: 'library app' }, h.ports);
  assert.equal(result.report.outcome, 'FAILED');
  assert.equal(result.report.failedStage, 'spec');
  assert.match(result.report.failureReason, /invalid_spec/);
  assert.ok(result.report.failureReason.includes('schemaVersion') || result.report.failureReason.includes('acceptance') || result.report.failureReason.includes('title'));
  assert.equal(result.state.error?.code, 'invalid_spec');
  assert.ok(result.state.error?.detail?.issues?.length >= 1);
  assert.ok(h.events.some((e) => e.type === 'spec_failed'));
  assert.ok(h.events.some((e) => e.type === 'spec_attempt' && e.data?.textPreview));
  // Two planner attempts then stop (no plan/code)
  assert.equal(h.calls.filter((c) => c.role === 'planner').length, 2);
});

test('P118.3: schemaVersion string "1" alone is coerced without recovery when other fields ok', async () => {
  const h = harness((args) => {
    if (args.prompt.includes('Create a concise project specification')) {
      return { text: JSON.stringify({ ...validSpec, schemaVersion: '1' }), finishReason: 'stop', modelId: 'fake' };
    }
    if (args.prompt.includes('Create a Plan JSON')) return { text: JSON.stringify(validPlan), finishReason: 'stop', modelId: 'fake' };
    return { text: formatFileMarker('index.html', '<!doctype html><html><body>ok</body></html>'), finishReason: 'stop', modelId: 'fake' };
  });
  const result = await runBuild({ schemaVersion: SCHEMA_VERSION, jobId: 'job-coerce', projectId: 'p', userId: 'u', taskText: 'library app' }, h.ports);
  assert.equal(result.report.outcome, 'SUCCESS');
  assert.equal(h.calls.filter((c) => c.role === 'planner').length, 2); // spec + plan only
  assert.ok(h.events.some((e) => e.type === 'spec_coerced'));
  assert.ok(!h.events.some((e) => e.type === 'spec_repair'));
});
