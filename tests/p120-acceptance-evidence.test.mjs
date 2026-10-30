import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const script = path.resolve('scripts/p120-acceptance-evidence.mjs');
const sha = 'a'.repeat(40);
function run(args, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_STEP_SUMMARY: '', ...env },
  });
}
function tempDir() { return mkdtempSync(path.join(os.tmpdir(), 'p120-evidence-')); }

test('collect mode passes only when every required acceptance check succeeds', () => {
  const dir = tempDir();
  try {
    const out = path.join(dir, 'acceptance.json');
    const result = run(['--mode', 'collect', '--out', out], {
      GITHUB_SHA: sha, GITHUB_RUN_ID: '12345', GITHUB_RUN_ATTEMPT: '2',
      DEPENDENCIES_OUTCOME: 'success', DAG_OUTCOME: 'success', BROWSER_OUTCOME: 'success', UI_OUTCOME: 'success',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(report.verdict, 'PASS');
    assert.equal(report.commit, sha);
    assert.equal(report.workflow.runId, '12345');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('collect mode fails closed for a skipped or missing required check', () => {
  const dir = tempDir();
  try {
    const out = path.join(dir, 'acceptance.json');
    const result = run(['--mode', 'collect', '--out', out], {
      GITHUB_SHA: sha, GITHUB_RUN_ID: '12345', GITHUB_RUN_ATTEMPT: '1',
      DEPENDENCIES_OUTCOME: 'success', DAG_OUTCOME: 'success', BROWSER_OUTCOME: 'success', UI_OUTCOME: 'skipped',
    });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(readFileSync(out, 'utf8')).verdict, 'FAIL');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('verify mode binds evidence to commit, source run, attempt and workflow conclusion', () => {
  const dir = tempDir();
  try {
    const input = path.join(dir, 'acceptance.json');
    const out = path.join(dir, 'final.json');
    const source = {
      schemaVersion: 1, gate: 'P120.0.6', verdict: 'PASS', commit: sha,
      workflow: { name: 'P120 Acceptance', runId: '12345', runAttempt: '2' },
      checks: { dependencies: 'success', verificationDag: 'success', playwrightInstall: 'success', p120UiSuite: 'success' },
    };
    writeFileSync(input, JSON.stringify(source));
    const result = run(['--mode', 'verify', '--input', input, '--out', out], {
      EXPECTED_SHA: sha, EXPECTED_ACCEPTANCE_RUN_ID: '12345', EXPECTED_ACCEPTANCE_RUN_ATTEMPT: '2', EXPECTED_ACCEPTANCE_CONCLUSION: 'success',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(report.verdict, 'PASS');
    assert.equal(report.formalAcceptance, 'PENDING_NAVIGATOR');

    const mismatch = run(['--mode', 'verify', '--input', input, '--out', out], {
      EXPECTED_SHA: 'b'.repeat(40), EXPECTED_ACCEPTANCE_RUN_ID: '12345', EXPECTED_ACCEPTANCE_RUN_ATTEMPT: '2', EXPECTED_ACCEPTANCE_CONCLUSION: 'success',
    });
    assert.equal(mismatch.status, 1);
    assert.equal(JSON.parse(readFileSync(out, 'utf8')).verdict, 'FAIL');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


test('P120.0.6 evidence workflow remains commit-bound while the current patch is P120.0.7', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const acceptance = readFileSync('.github/workflows/p120-acceptance.yml', 'utf8');
  const evidence = readFileSync('.github/workflows/p120-evidence.yml', 'utf8');
  assert.equal(packageJson.version, '120');
  assert.equal(packageJson.patch, '120.0.7');
  assert.match(packageJson.scripts['test:p120-evidence-check'], /p120-acceptance-evidence\.test\.mjs/);
  assert.match(acceptance, /name: P120 Acceptance/);
  assert.match(acceptance, /--mode collect/);
  assert.match(acceptance, /name: p120-acceptance-evidence/);
  assert.match(evidence, /workflows: \["P120 Acceptance"\]/);
  assert.match(evidence, /--mode verify/);
  assert.match(evidence, /EXPECTED_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
});
