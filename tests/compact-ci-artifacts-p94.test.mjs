import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import JSZip from 'jszip';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { once } from 'node:events';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (script, dir, extra = {}) => spawnSync(process.execPath, [script], {
  cwd: root, encoding: 'utf8', env: { ...process.env, CI_LOGS_DIR: dir, ...extra },
});
const runAsync = (script, dir, extra = {}) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [script], {
    cwd: root, env: { ...process.env, CI_LOGS_DIR: dir, ...extra },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = ''; let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
  child.once('error', reject);
  child.once('close', (status, signal) => resolve({ status, signal, stdout, stderr }));
});

test('P108.3 workflow publishes exactly the compact handoff and full-log archive, and prints the handoff', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(workflow, /cat artifacts\/ci-checks\/BIForge-PATCH-EVIDENCE\.md/);
  assert.match(workflow, /artifacts\/ci-checks\/BIForge-PATCH-EVIDENCE\.md[\s\S]*artifacts\/ci-checks\/biforge-ci-logs\.zip/);
  assert.doesNotMatch(workflow, /path:\s*artifacts\/ci-checks\/(?:PATCH_EVIDENCE\.md|diagnostics\.zip|ci-history\.json|ci-metrics\.json)/);
});

test('P108.3 handoff turns the two-artifact contract failure into an actionable next step', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p1083-next-action-'));
  try {
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ results: [
      { id: 'test:compact-ci-artifacts', status: 'FAIL', exitCode: 1, durationMs: 7000, log: 'test_compact-ci-artifacts.log' },
    ] }));
    fs.writeFileSync(path.join(dir, 'test_compact-ci-artifacts.log'), [
      'not ok 2 - P108.2 packaging always includes complete diagnostics on failure',
      'AssertionError: Expected values to be strictly deep-equal:',
      "expected: ['PATCH_EVIDENCE.md', 'ci-history.json', 'ci-metrics.json', 'diagnostics.zip']",
      "actual: ['BIForge-PATCH-EVIDENCE.md', 'biforge-ci-logs.zip']",
      'at TestContext.<anonymous> (tests/compact-ci-artifacts-p94.test.mjs:62:12)',
    ].join('\n'));
    const r = run('scripts/patch-quality-report.mjs', dir, { CI_STATUS: 'failure', GITHUB_SHA: 'test-sha' });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const report = fs.readFileSync(path.join(dir, 'PATCH_EVIDENCE.md'), 'utf8');
    assert.match(report, /Update tests\/compact-ci-artifacts-p94\.test\.mjs/);
    assert.match(report, /BIForge-PATCH-EVIDENCE\.md and biforge-ci-logs\.zip/);
    assert.match(report, /npm run test:compact-ci-artifacts/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P94 report preserves TAP assertion details and timeout tail', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p94-report-'));
  try {
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ results: [
      { id: 'test:router', status: 'FAIL', exitCode: 1, durationMs: 1200, log: 'test-router.log' },
      { id: 'test:files', status: 'TIMEOUT', exitCode: 1, durationMs: 60000, log: 'test-files.log' },
    ] }));
    fs.writeFileSync(path.join(dir, 'test-router.log'), [
      'ok 34 - previous test passed', 'not ok 35 - router selection', '  error: |-','    AssertionError: expected 2, actual 1',
      '    Expected: 2', '    Actual: 1', '    at TestContext.<anonymous> (tests/models.test.mjs:99:10)',
    ].join('\n'));
    fs.writeFileSync(path.join(dir, 'test-files.log'), 'ok - last completed file test\nwaiting for server close\nError: test timed out after 60000ms\n');
    const r = run('scripts/patch-quality-report.mjs', dir, { CI_STATUS: 'failure', GITHUB_SHA: 'test-sha' });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const report = fs.readFileSync(path.join(dir, 'PATCH_EVIDENCE.md'), 'utf8');
    assert.match(report, /expected 2, actual 1/);
    assert.match(report, /Expected: 2/);
    assert.match(report, /Actual: 1/);
    assert.match(report, /CI PATCH EVIDENCE/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P108.2 packaging always includes complete diagnostics on failure', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p94-package-'));
  try {
    fs.writeFileSync(path.join(dir, 'PATCH_EVIDENCE.md'), '# Report\nPATCH_STATUS=FAILED\n');
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ results: [
      { id: 'test:core', status: 'FAIL', log: 'test-core.log' }, { id: 'test:project', status: 'PASS', log: 'test-project.log' },
    ] }));
    fs.writeFileSync(path.join(dir, 'test-core.log'), 'AssertionError: expected false, actual true\nOPENAI_API_KEY=sk-test-secret-value-12345678901234567890\n');
    fs.writeFileSync(path.join(dir, 'test-project.log'), 'all passed\n');
    fs.writeFileSync(path.join(dir, 'ci-install.log'), 'npm ci ok\n');
    const r = run('scripts/package-ci-artifacts.mjs', dir);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.deepEqual(fs.readdirSync(dir).sort(), ['BIForge-PATCH-EVIDENCE.md', 'biforge-ci-logs.zip']);
    const zip = await JSZip.loadAsync(fs.readFileSync(path.join(dir, 'biforge-ci-logs.zip')));
    assert.ok(zip.file('test-core.log'));
    assert.ok(zip.file('test-project.log'), 'successful-stage log is required for complete cycle diagnostics');
    assert.ok(zip.file('results.json'));
    assert.ok(zip.file('diagnostics-index.json'));
    const core = await zip.file('test-core.log').async('string');
    assert.match(core, /AssertionError/);
    assert.match(core, /OPENAI_API_KEY=\[REDACTED\]/);
    assert.doesNotMatch(core, /sk-test-secret-value/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P108.2 packaging emits diagnostics and cycle metrics after a clean run', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p94-clean-'));
  try {
    fs.writeFileSync(path.join(dir, 'PATCH_EVIDENCE.md'), '# Report\nPATCH_STATUS=PASSED\n');
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ results: [{ id: 'typecheck', status: 'PASS' }] }));
    fs.writeFileSync(path.join(dir, 'typecheck.log'), 'no errors\n');
    const r = run('scripts/package-ci-artifacts.mjs', dir);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.deepEqual(fs.readdirSync(dir).sort(), ['BIForge-PATCH-EVIDENCE.md', 'biforge-ci-logs.zip']);
    assert.ok(fs.statSync(path.join(dir, 'biforge-ci-logs.zip')).size > 0);
    assert.ok(fs.existsSync(path.join(dir, 'BIForge-PATCH-EVIDENCE.md')));
    const zip = await JSZip.loadAsync(fs.readFileSync(path.join(dir, 'biforge-ci-logs.zip')));
    assert.ok(zip.file('typecheck.log'), 'green-run logs are retained');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


test('P108.2 history collector records current checks even without GitHub API access', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-ci-history-'));
  try {
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ profile:'test', wallClockMs:1234, startedAt:'2026-10-26T08:00:00.000Z', results:[
      {id:'one',status:'PASS',durationMs:100,critical:true,log:'one.log'},
      {id:'two',status:'FAIL',durationMs:200,critical:false,log:'two.log'},
      {id:'three',status:'BLOCKED',durationMs:0,critical:true,note:'prerequisite failed'},
    ] }));
    const r = run('scripts/ci-run-history.mjs', dir, { GITHUB_RUN_ID:'', GH_TOKEN:'', GITHUB_REPOSITORY:'' });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const history = JSON.parse(fs.readFileSync(path.join(dir, 'ci-history.json'), 'utf8'));
    assert.equal(history.requestedCycles, 5);
    assert.equal(history.current.checks.total, 3);
    assert.equal(history.current.checks.pass, 1);
    assert.equal(history.current.checks.fail, 1);
    assert.equal(history.current.checks.blocked, 1);
    assert.equal(history.historyStatus, 'UNAVAILABLE_NO_GITHUB_TOKEN');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


test('P108.2 history collector imports exact durations and check counts from the four-cycle window', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-ci-history-api-'));
  const artifactZip = await new JSZip().file('ci-metrics.json', JSON.stringify({
    run: { dagWallClockMs: 1200 },
    checks: { total: 2, completed: 2, pass: 2, fail: 0, timeout: 0, blocked: 0, skipped: 0, skipped_by_policy: 0, not_run: 0, unknown: 0 },
    checkResults: [{ id: 'a', status: 'PASS', durationMs: 400 }, { id: 'b', status: 'PASS', durationMs: 500 }],
  })).generateAsync({ type: 'nodebuffer' });
  const server = createServer((req, res) => {
    const send = (value, status = 200, type = 'application/json') => { res.writeHead(status, { 'content-type': type }); res.end(type === 'application/json' ? JSON.stringify(value) : value); };
    if (req.url === '/repos/test/repo/actions/runs/999/jobs?per_page=100') return send({ jobs: [{ name: 'check-and-build', started_at: '2026-10-26T08:00:00Z', status: 'in_progress', steps: [] }] });
    if (req.url === '/repos/test/repo/actions/workflows/ci.yml/runs?per_page=30') return send({ workflow_runs: [{ id: 998, status: 'completed', conclusion: 'success', run_started_at: '2026-10-26T07:00:00Z', updated_at: '2026-10-26T07:00:03Z', head_sha: 'prev-sha', head_branch: 'main', event: 'push', html_url: 'https://example.test/run/998' }] });
    if (req.url === '/repos/test/repo/actions/runs/998/jobs?per_page=100') return send({ jobs: [{ name: 'check-and-build', started_at: '2026-10-26T07:00:00Z', completed_at: '2026-10-26T07:00:02Z', conclusion: 'success', steps: [{ name: 'Verification DAG', number: 5, status: 'completed', conclusion: 'success', started_at: '2026-10-26T07:00:00Z', completed_at: '2026-10-26T07:00:01Z' }] }] });
    if (req.url === '/repos/test/repo/actions/runs/998/artifacts?per_page=100') return send({ artifacts: [{ id: 7, name: 'biforge-ci-report', expired: false }] });
    if (req.url === '/repos/test/repo/actions/artifacts/7/zip') return send(artifactZip, 200, 'application/zip');
    return send({ error: `unexpected ${req.url}` }, 404);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ profile: 'test', wallClockMs: 2500, results: [{ id: 'current', status: 'PASS', durationMs: 1000 }] }));
    const address = server.address();
    // Keep the parent event loop free so the in-process mock GitHub API can answer
    // requests while the history collector runs in its child process.
    const r = await runAsync('scripts/ci-run-history.mjs', dir, {
      GITHUB_API_URL: `http://127.0.0.1:${address.port}`, GITHUB_REPOSITORY: 'test/repo', GITHUB_RUN_ID: '999',
      GITHUB_SHA: 'current-sha', GH_TOKEN: 'test-token', GITHUB_SERVER_URL: 'https://example.test',
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const history = JSON.parse(fs.readFileSync(path.join(dir, 'ci-history.json'), 'utf8'));
    assert.equal(history.includedCycles, 2);
    assert.equal(history.historyStatus, 'COMPLETE');
    assert.equal(history.previousRuns[0].workflowDurationMs, 3000);
    assert.equal(history.previousRuns[0].jobDurationMs, 2000);
    assert.equal(history.previousRuns[0].dagWallClockMs, 1200);
    assert.equal(history.previousRuns[0].checks.total, 2);
    assert.equal(history.previousRuns[0].checks.pass, 2);
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
