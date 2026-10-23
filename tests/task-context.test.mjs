import test from 'node:test';
import assert from 'node:assert/strict';
import { planTaskContext } from '../scripts/architectureTaskContextLib.mjs';

test('P85: ZIP task identifies existing artifact evidence and observability gap', () => {
  const p = planTaskContext('Fix Project Mode ZIP download');
  assert.equal(p.classification.completeness, 'PARTIAL');
  assert.ok(p.changeTargets.some((x) => x.file === 'server/artifactRepository.ts'));
  assert.ok(p.requiredTests.some((x) => x.name === 'test:project'));
  assert.ok(p.uncertainties.some((x) => x.includes('HTTP completion')));
  assert.ok(p.changeTargets.every((x) => x.evidence === 'heuristic'));
});
test('P85: representative API, DB, UI, config tasks', () => {
  for (const [task, feature] of [['Fix API route contract', 'api-contract'], ['Repair database migration', 'persistence'], ['Improve user guide UI text', 'ui-guide'], ['Change env config setting', 'configuration']]) {
    assert.ok(planTaskContext(task).classification.matchedFeatures.includes(feature));
  }
});
test('P85: unknown task is not falsely complete', () => {
  const p = planTaskContext('quantum bananas');
  assert.equal(p.classification.completeness, 'UNKNOWN');
  assert.equal(p.mustRead.length, 0);
  assert.ok(p.uncertainties.some((x) => x.includes('No recognized')));
});
test('P85: empty task fails and output is deterministic', () => {
  assert.throws(() => planTaskContext('   '), /non-empty/);
  assert.deepEqual(planTaskContext('Fix ZIP download'), planTaskContext('Fix ZIP download'));
});
