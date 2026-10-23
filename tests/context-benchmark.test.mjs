import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root } from '../scripts/architectureLib.mjs';
import { runBenchmark } from '../scripts/contextBenchmarkLib.mjs';

const fixturePath = path.join(root, 'tests/fixtures/context-benchmark-gold-p84.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

test('P84 gold fixture contains 4–6 uniquely named scenarios and explicit review status', () => {
  assert.ok(fixture.scenarios.length >= 4 && fixture.scenarios.length <= 6);
  assert.equal(new Set(fixture.scenarios.map((s) => s.id)).size, fixture.scenarios.length);
  assert.match(fixture.status, /maintainer-review-required/);
  for (const scenario of fixture.scenarios) {
    assert.ok(scenario.baselineTarget && scenario.currentTarget && scenario.description);
    assert.ok(Array.isArray(scenario.goldDependencies) && scenario.goldDependencies.length > 0);
    assert.equal(new Set(scenario.goldDependencies).size, scenario.goldDependencies.length);
  }
});

test('P84 report can attach a captured verification manifest without fabricating durations', () => {
  const verificationPath = path.join(root, 'docs/context-benchmark-verification-p84.json');
  const report = runBenchmark({ currentRoot: root, verificationPath });
  assert.ok(report.verificationRun.commands.some((item) => item.command === 'npm run check' && item.status === 'blocked' && Number.isInteger(item.durationMs)));
  assert.ok(report.verificationRun.commands.some((item) => item.command === 'GitHub CI' && item.status === 'pending' && item.durationMs === null));
});

test('P84 benchmark is deterministic and reports recall, false positives, line cost and verification state', () => {
  const first = runBenchmark({ currentRoot: root, baselineRoot: root, fixturePath });
  const second = runBenchmark({ currentRoot: root, baselineRoot: root, fixturePath });
  assert.deepEqual(first, second);
  assert.equal(first.current.summary.scenarioCount, fixture.scenarios.length);
  assert.equal(first.verificationRun.status, 'not-provided');
  assert.equal(first.baseline.summary.scenarioCount, fixture.scenarios.length);
  assert.equal(first.comparison.status, 'measured-static-proxy');
  assert.ok(first.comparison.comparableAggregate.goldDependenciesPresentInBothTrees > 0);
  assert.ok(first.comparison.comparableAggregate.baselineRecall >= 0 && first.comparison.comparableAggregate.baselineRecall <= 1);
  assert.ok(first.comparison.comparableAggregate.currentRecall >= 0 && first.comparison.comparableAggregate.currentRecall <= 1);
  for (const row of first.current.scenarios) {
    assert.ok(row.targetExists, `${row.id} target should exist`);
    assert.ok(row.goldRecall === null || (row.goldRecall >= 0 && row.goldRecall <= 1));
    assert.ok(row.falsePositiveRate === null || (row.falsePositiveRate >= 0 && row.falsePositiveRate <= 1));
    assert.ok(Number.isInteger(row.candidateSourceLineCost) && row.candidateSourceLineCost >= 0);
    assert.ok(row.verification.every((v) => v.status === 'not-run-by-benchmark' && v.durationMs === null));
    assert.equal(row.touchedFiles.status, 'not-applicable-read-only-analysis');
  }
  assert.ok(first.current.scenarios.find((s) => s.id === 'generated-route-artifact').goldRecall < 1,
    'fixture should expose the known generated-artifact discovery gap');
  assert.equal(first.methodology.noRegressionGate.includes('Intentionally absent'), true);
});
