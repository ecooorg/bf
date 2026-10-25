import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('P96 persists probe metadata and per-probe logs before later phases', () => {
  const runner = fs.readFileSync('scripts/run-diagnostic-gate.mjs', 'utf8');
  assert.match(runner, /persist\('running'/);
  assert.match(runner, /targetPattern/);
  assert.match(runner, /timeoutOrigin/);
  assert.match(runner, /lastOutput/);
  assert.match(runner, /critical-gemini-timeout/);
});

test('P96 handoff contains exact command, assertion evidence and source context', () => {
  const report = fs.readFileSync('scripts/patch-quality-report.mjs', 'utf8');
  assert.match(fs.readFileSync('scripts/run-diagnostic-gate.mjs', 'utf8'), /expectedTestNames/);
  assert.match(report, /sourceContext/);
  assert.match(report, /COMMAND=/);
  assert.match(report, /EVIDENCE_BEGIN/);
  assert.match(report, /MISSING_LOGS=/);
  assert.match(report, /timeoutOrigin/);
});

test('P96 GitHub summary is the same compact handoff and bundle preserves all critical logs', () => {
  const summary = fs.readFileSync('scripts/ci-summary.mjs', 'utf8');
  const pack = fs.readFileSync('scripts/package-ci-artifacts.mjs', 'utf8');
  assert.match(summary, /NEXT_PATCH\.md/);
  assert.match(summary, /GITHUB_STEP_SUMMARY/);
  for (const name of ['critical-router-selection.log','critical-router-policy-call-limit.log','critical-gemini-timeout.log','critical-app-builder-recovery.log']) assert.ok(pack.includes(name));
});

test('P96 generated handoff embeds assertion values and the failing source lines', async () => {
  const os = await import('node:os');
  const path = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p96-handoff-'));
  const result = {
    schemaVersion: 4, commit: 'fixture-commit',
    summary: { pass: 0, fail: 1, timeout: 0, skipped: 7 },
    results: [{
      id: 'critical-router-selection', phase: 'critical', status: 'FAIL',
      command: process.execPath,
      args: ['--test', '--test-name-pattern=router: deterministic selection with recorded rejections', 'tests/models.test.mjs'],
      sourceFile: 'tests/models.test.mjs',
      targetPattern: 'router: deterministic selection with recorded rejections',
      timeoutMs: 20000, timeoutOrigin: null, exitCode: 1, signal: null,
      durationMs: 700, log: 'critical-router-selection.log',
      lastOutput: ['expected: 0', 'actual: 1'],
    }],
  };
  fs.writeFileSync(path.join(temp, 'results.json'), JSON.stringify(result));
  fs.writeFileSync(path.join(temp, 'critical-router-selection.log'), [
    'not ok 1 - router: deterministic selection with recorded rejections',
    "location: '/home/runner/work/bf/bf/tests/models.test.mjs:88:1'",
    'error: Expected values to be strictly equal',
    'expected: 0', 'actual: 1',
    'TestContext.<anonymous> (/home/runner/work/bf/bf/tests/models.test.mjs:93:10)',
  ].join('\n'));
  const run = spawnSync(process.execPath, ['scripts/patch-quality-report.mjs'], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { ...process.env, CI_LOGS_DIR: temp, CI_STATUS: 'failure', GITHUB_SHA: 'fixture-commit' },
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const report = fs.readFileSync(path.join(temp, 'NEXT_PATCH.md'), 'utf8');
  assert.match(report, /expected: 0/);
  assert.match(report, /actual: 1/);
  assert.match(report, /SOURCE=tests\/models\.test\.mjs:93-/);
  assert.match(report, /assert\.equal\(a\.candidates\.length/);
  fs.rmSync(temp, { recursive: true, force: true });
});
