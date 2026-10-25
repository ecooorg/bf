import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('P95 critical probes precede broad suites, typecheck and migrations', () => {
  const gate = fs.readFileSync('scripts/run-diagnostic-gate.mjs', 'utf8');
  assert.ok(gate.indexOf('const critical = [') < gate.indexOf('const suites = ['));
  assert.match(gate, /critical-router-selection/);
  assert.match(gate, /critical-router-policy-call-limit/);
  assert.match(gate, /critical-gemini-timeout/);
  assert.match(gate, /critical-app-builder-recovery/);
  assert.match(gate, /if \(criticalFailed\.length\)/);
});

test('P95 GitHub summary publishes the generated handoff instead of a generic table', () => {
  const summary = fs.readFileSync('scripts/ci-summary.mjs', 'utf8');
  const report = fs.readFileSync('scripts/patch-quality-report.mjs', 'utf8');
  const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.match(summary, /NEXT_PATCH\.md/);
  assert.match(summary, /GITHUB_STEP_SUMMARY/);
  assert.match(report, /ASSISTANT HANDOFF/);
  assert.match(workflow, /ASSISTANT HANDOFF — GitHub Actions summary/);
  assert.ok(workflow.indexOf('Generate NEXT_PATCH.md') < workflow.indexOf('ASSISTANT HANDOFF — GitHub Actions summary'));
});
