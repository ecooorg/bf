import test from 'node:test';
import assert from 'node:assert/strict';
import { pipelineArchitectOutcome, stagedArchitectNote } from '../appBuilder/architectOutcome.ts';

test('P118 pipeline SUCCESS only when files + download + slice applied', () => {
  const r = pipelineArchitectOutcome({ fileCount: 5, hasDownload: true, sliceStatus: 'applied' });
  assert.equal(r.outcome, 'SUCCESS');
  assert.equal(r.goalImplemented, true);
});

test('P118 pipeline PARTIAL for scaffold-only ZIP', () => {
  const r = pipelineArchitectOutcome({ fileCount: 3, hasDownload: true, sliceStatus: 'skipped', sliceReason: 'model slice disabled' });
  assert.equal(r.outcome, 'PARTIAL');
  assert.equal(r.goalImplemented, false);
  assert.equal(r.failedStage, 'slice');
  assert.match(r.note, /PARTIAL/);
});

test('P118 pipeline FAILED on empty artifact', () => {
  const r = pipelineArchitectOutcome({ fileCount: 0, hasDownload: false, sliceStatus: 'skipped' });
  assert.equal(r.outcome, 'FAILED');
  assert.equal(r.failureReason, 'empty_artifact');
});

test('P118 staged note distinguishes SUCCESS PARTIAL FAILED', () => {
  assert.match(stagedArchitectNote({ outcome: 'SUCCESS', status: 'done', goalImplemented: true }), /validated/i);
  assert.match(stagedArchitectNote({ outcome: 'PARTIAL', status: 'done', goalImplemented: false, failureReason: 'validators_failed' }), /PARTIAL/);
  assert.match(stagedArchitectNote({ outcome: 'FAILED', status: 'failed', failedStage: 'code', failureReason: 'empty_artifact' }), /empty_artifact|Failed stage/i);
});
