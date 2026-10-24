import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBenchmarkReport, validateTaskSet, validateRunSet } from '../scripts/realTaskBenchmarkLib.mjs';

const reviewedTask = {
  id: 'reviewed-task', category: 'bug-fix', prompt: 'Fix the observed bug.', baseRevision: 'abcdef1234567', reviewStatus: 'reviewed',
  goldDependencies: ['src/a.ts', 'tests/a.test.mjs'], protectedInvariants: ['No auth bypass.'],
  acceptanceCriteria: ['Bug no longer reproduces.'], requiredChecks: ['npm run test:core'],
};
const taskSet = { schemaVersion: 1, name: 'test set', tasks: [reviewedTask] };
const run = (workflow, runId, extra = {}) => ({
  runId, taskId: 'reviewed-task', workflow, baseRevision: 'abcdef1234567', promptVersion: 'prompt-v1', model: 'model-a', toolchain: 'node-22', environment: 'local',
  startedAt: '2026-10-23T10:00:00Z', acceptedAt: '2026-10-23T10:30:00Z', reviewOutcome: 'accepted',
  metrics: { inputTokens: { status: 'unavailable', reason: 'No trace' }, outputTokens: { status: 'unavailable', reason: 'No trace' }, agentTurns: { status: 'measured', value: 4 }, humanInterventions: { status: 'measured', value: 2 }, manualContextMinutes: { status: 'measured', value: 5 }, humanReviewMinutes: { status: 'measured', value: 8 }, reworkMinutes: { status: 'measured', value: 3 }, stageLocalized: true, falseSuccess: false, acceptancePassed: true, requiredChecksPassed: true },
  dependenciesFound: ['src/a.ts'], changedFiles: ['src/a.ts'], unrelatedChangedFiles: [], ...extra,
});

test('P88 accepts the starter task set while keeping unreviewed tasks explicitly draft', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const taskData = JSON.parse(fs.readFileSync(path.join(root, 'tests/p88-real-task-benchmark.json'), 'utf8'));
  assert.deepEqual(validateTaskSet(taskData), []);
  assert.ok(taskData.tasks.every((task) => task.reviewStatus === 'draft' && task.baseRevision === null));
});

test('reviewed tasks require pinned revision, gold dependencies, criteria and checks', () => {
  const broken = { schemaVersion: 1, tasks: [{ ...reviewedTask, baseRevision: null, goldDependencies: [], acceptanceCriteria: [], requiredChecks: [] }] };
  const errors = validateTaskSet(broken);
  assert.ok(errors.some((error) => error.includes('pinned commit SHA')));
  assert.ok(errors.some((error) => error.includes('gold dependency')));
  assert.ok(errors.some((error) => error.includes('acceptance criteria')));
  assert.ok(errors.some((error) => error.includes('required checks')));
});

test('measured values only contribute to aggregate averages', () => {
  const results = { schemaVersion: 1, runs: [run('baseline', 'r1'), run('context-engine', 'r2', { metrics: { ...run('context-engine', 'x').metrics, agentTurns: { status: 'estimated', value: 1 } } })] };
  const report = buildBenchmarkReport(taskSet, results);
  assert.equal(report.summary.meanAgentTurns, 4);
  assert.equal(report.summary.inputTokens.status, 'unavailable');
  assert.equal(report.summary.meanWallClockMinutes, 30);
});

test('draft gold sets do not produce dependency scores or claim a reviewed benchmark', () => {
  const draftSet = { schemaVersion: 1, tasks: [{ ...reviewedTask, reviewStatus: 'draft', baseRevision: null, goldDependencies: [], acceptanceCriteria: [], requiredChecks: [] }] };
  const report = buildBenchmarkReport(draftSet, { schemaVersion: 1, runs: [run('baseline', 'r1')] });
  assert.equal(report.datasetStatus, 'PILOT_REVIEW_REQUIRED');
  assert.equal(report.runs[0].dependencyRecall.status, 'unavailable');
  assert.match(report.runs[0].dataWarnings.join(' '), /gold set is draft/);
});

test('paired comparison is comparable only when task review and metadata match', () => {
  const report = buildBenchmarkReport(taskSet, { schemaVersion: 1, runs: [run('baseline', 'r1'), run('context-engine', 'r2')] });
  assert.equal(report.summary.pairedComparisons[0].pairs[0].comparable, true);
  const mismatch = buildBenchmarkReport(taskSet, { schemaVersion: 1, runs: [run('baseline', 'r1'), run('context-engine', 'r2', { model: 'model-b' })] });
  assert.equal(mismatch.summary.pairedComparisons[0].pairs[0].comparable, false);
});

test('unavailable and not-run values are not silently converted to zero', () => {
  const row = run('baseline', 'r1', { metrics: { humanReviewMinutes: { status: 'unavailable', reason: 'Not recorded' }, falseSuccess: null } });
  const report = buildBenchmarkReport(taskSet, { schemaVersion: 1, runs: [row] });
  assert.equal(report.summary.meanHumanReviewMinutes, null);
  assert.equal(report.summary.falseSuccessRate.rate, null);
  assert.equal(report.summary.falseSuccessRate.denominator, 0);
});

test('invalid metric values are rejected', () => {
  const bad = { schemaVersion: 1, runs: [run('baseline', 'r1', { metrics: { ...run('baseline', 'x').metrics, agentTurns: { status: 'measured', value: -1 } } })] };
  assert.ok(validateRunSet(bad, taskSet).some((error) => error.includes('non-negative number')));
});

test('duplicate run ids and unknown task ids are rejected', () => {
  const errors = validateRunSet({ schemaVersion: 1, runs: [run('baseline', 'same'), run('context-engine', 'same', { taskId: 'missing' })] }, taskSet);
  assert.ok(errors.some((error) => error.includes('duplicates')));
  assert.ok(errors.some((error) => error.includes('does not exist')));
});

test('report does not infer causal improvement or enable a CI gate', () => {
  const report = buildBenchmarkReport(taskSet, { schemaVersion: 1, runs: [run('baseline', 'r1'), run('context-engine', 'r2')] });
  assert.equal(report.methodology.noThresholdsOrCiGate, true);
  assert.match(report.summary.warning, /No improvement/);
});
