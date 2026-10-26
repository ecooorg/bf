import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInjectedFault, validateFaultOutcome } from '../scripts/faultInjectionLibP108.mjs';
import { boundedAttemptPlan, inspectRepairDiff, writeAttemptRecord } from '../scripts/boundedRepairLibP108.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('P108 fault injection: every required failure mode produces non-PASS status and consistent handoff', () => {
  for (const scenario of ['timeout', 'cancellation', 'missing-log', 'partial-artifact', 'runner-interruption', 'handoff-generator-failure', 'corrupted-record']) {
    const result = resolveInjectedFault(scenario);
    assert.deepEqual(validateFaultOutcome(result), [], scenario);
    assert.notEqual(result.status, 'PASS', scenario);
    assert.ok(result.reason.length > 0, scenario);
  }
});

test('P108 fault injection rejects contradictory or absent handoffs', () => {
  assert.ok(validateFaultOutcome({ status: 'FAIL', reason: 'x' }).includes('missing handoff or reason'));
  assert.ok(validateFaultOutcome({ status: 'FAIL', reason: 'x', handoff: { status: 'PASS', reason: 'x' } }).includes('handoff contradicts outcome'));
  assert.ok(validateFaultOutcome({ status: 'PASS', reason: 'x', handoff: { status: 'PASS', reason: 'x' } }).includes('fault injection cannot pass'));
});

test('P108 repair is bounded, deduplicates affected checks, and rejects invalid budgets', () => {
  assert.deepEqual(boundedAttemptPlan(['typecheck', 'test:core', 'typecheck'], 2), [
    { attempt: 1, checks: ['typecheck', 'test:core'] }, { attempt: 2, checks: ['typecheck', 'test:core'] },
  ]);
  for (const n of [0, 4, 1.5, NaN]) assert.throws(() => boundedAttemptPlan(['typecheck'], n), /maxAttempts/);
  assert.throws(() => boundedAttemptPlan([], 1), /checkIds/);
});

test('P108 repair diff guard rejects protected paths and reduced limits', () => {
  assert.ok(inspectRepairDiff('--- a/src/a.ts\n+++ b/.github/workflows/ci.yml\n+foo').some((x) => x.startsWith('PROTECTED_PATH:')));
  assert.ok(inspectRepairDiff('--- a/config.json\n+++ b/config.json\n-timeoutMs: 2000\n+timeoutMs: 1000').some((x) => x.startsWith('LOWERED_LIMIT:')));
  assert.deepEqual(inspectRepairDiff('--- a/src/a.ts\n+++ b/src/a.ts\n+const x = 1;'), []);
});

test('P108 repair attempt records are append-only JSON with status provenance', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p108-'));
  try {
    const file = path.join(dir, 'attempts.json');
    writeAttemptRecord(file, { attempt: 1, status: 'FAIL' });
    writeAttemptRecord(file, { attempt: 2, status: 'PASS' });
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).attempts.map((x) => x.attempt), [1, 2]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
