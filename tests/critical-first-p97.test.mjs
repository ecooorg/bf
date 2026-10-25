import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('P97 Router selection fixture is independent of production registry size', () => {
  const source = fs.readFileSync('tests/models.test.mjs', 'utf8');
  assert.match(source, /while \(entries\.length < 4\)/);
  assert.match(source, /Do not couple this fixture to production seed size/);
});

test('P98 policy/call-limit probe runs from a dedicated file without name filtering', () => {
  const runner = fs.readFileSync('scripts/run-diagnostic-gate.mjs', 'utf8');
  const probe = fs.readFileSync('tests/critical-router-policy-call-limit.test.mjs', 'utf8');
  assert.match(runner, /file: 'tests\/critical-router-policy-call-limit\.test\.mjs'/);
  assert.match(runner, /if \(task\.pattern\) args\.push\('--test-name-pattern', task\.pattern\)/);
  assert.match(probe, /router: invalid request stops before fallback/);
  assert.match(probe, /router: policy rejection stops before fallback/);
  assert.match(probe, /router: call limit stops after maxCalls/);
});

test('P98 timeout report preserves exact argv and distinct timeout limits', () => {
  const runner = fs.readFileSync('scripts/run-diagnostic-gate.mjs', 'utf8');
  const report = fs.readFileSync('scripts/patch-quality-report.mjs', 'utf8');
  assert.match(runner, /nodeTestTimeoutMs/);
  assert.match(runner, /watchdogTimeoutMs/);
  assert.match(report, /COMMAND_ARGV=/);
  assert.match(report, /node-test-limit=/);
  assert.match(report, /watchdog-limit=/);
});
