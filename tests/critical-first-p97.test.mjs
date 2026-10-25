import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('P97 Router test fixture is independent of production registry size', () => {
  const source = fs.readFileSync('tests/models.test.mjs', 'utf8');
  assert.match(source, /while \(entries\.length < 4\)/);
  assert.match(source, /Do not couple this fixture to production seed size/);
});

test('P97 diagnostic runner passes test-name-pattern as a separate argv item', () => {
  const runner = fs.readFileSync('scripts/run-diagnostic-gate.mjs', 'utf8');
  assert.match(runner, /'--test-name-pattern', task\.pattern, task\.file/);
  assert.match(runner, /nodeTestTimeoutMs/);
  assert.match(runner, /watchdogTimeoutMs/);
});

test('P97 handoff records exact argv and distinguishes timeout limits', () => {
  const report = fs.readFileSync('scripts/patch-quality-report.mjs', 'utf8');
  assert.match(report, /COMMAND_ARGV=/);
  assert.match(report, /node-test-limit=/);
  assert.match(report, /watchdog-limit=/);
});
