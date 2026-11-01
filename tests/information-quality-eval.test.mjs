import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../scripts/information-quality-eval.mjs';

const scores = Object.fromEntries([
  'factualCorrectness', 'evidenceProvenance', 'relevanceCompleteness',
  'calibration', 'reasoningIntegrity', 'continuity', 'usability',
].map((key) => [key, 4]));

test('quality evaluator passes grounded Simple output with current sources', () => {
  const result = evaluate({
    scenarioId: 'simple-weather',
    mode: 'simple',
    reply: 'The requested place is about 9°C according to the current forecast.',
    currentFactExpected: true,
    searchStatus: 'used',
    currentSources: [{ url: 'https://example.org/weather' }],
    shownSources: [{ url: 'https://example.org/weather' }],
    scores,
  });
  assert.equal(result.passed, true);
  assert.equal(result.errors.length, 0);
});

test('quality evaluator blocks stale sources and fabricated current facts', () => {
  const result = evaluate({
    mode: 'simple', reply: 'The live temperature is 9°C.',
    currentFactExpected: true, searchStatus: 'skipped', replyMarksUnverified: false,
    currentSources: [], shownSources: [{ url: 'https://stale.example' }],
    fabricatedLiveMeasurement: true, scores,
  });
  assert.equal(result.passed, false);
  assert.ok(result.errors.includes('current_fact_without_grounding_or_disclosure'));
  assert.equal(result.hardFailures[0], 'fabricatedLiveMeasurement');
});

test('quality evaluator requires runtime and module contracts for Architect', () => {
  const result = evaluate({
    mode: 'architect', reply: 'Built app.',
    artifactOutcome: 'SUCCESS', staticChecksPassed: true,
    runtimeChecksPassed: false, importContractsPassed: false,
    noFabricatedFallbacks: true, scores,
  });
  assert.equal(result.passed, false);
  assert.ok(result.errors.includes('architect_runtime_checks_not_passed'));
  assert.ok(result.errors.includes('architect_import_contracts_not_passed'));
});
