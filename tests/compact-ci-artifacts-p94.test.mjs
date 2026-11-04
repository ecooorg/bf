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

test('P124.5 Core CI publishes one summary and readable diagnostic logs', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows', 'ci.yml'), 'utf8');
  assert.match(workflow, /diagnostics-summary\.mjs/);
  assert.match(workflow, /ASSISTANT_SUMMARY\.md/);
  assert.doesNotMatch(workflow, /ASSISTANT_PASTE|biforge-ci-logs\.zip/);
});

test('P124.5 assistant handoff contains failure context and counts in one file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-diagnostics-handoff-'));
  try {
    fs.writeFileSync(path.join(dir, '01-core-tests.log'), '# tests 3\n# pass 2\n# fail 1\n# skipped 0\nnot ok 3 - prompt contract\nAssertionError: obsolete prompt wording\n');
    fs.writeFileSync(path.join(dir, '02-build.log'), 'build completed successfully\n');
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ results: [{ id: 'test:core', status: 'FAIL', durationMs: 60000, log: '01-core-tests.log' }] }));
    const r = run('scripts/diagnostics-summary.mjs', dir, { CI_STATUS: 'failure', GITHUB_SHA: 'test-sha' });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const files = fs.readdirSync(dir).sort();
    assert.deepEqual(files, ['ASSISTANT_SUMMARY.md', 'checks.log', 'environment.log', 'failures.log', '01-core-tests.log', '02-build.log', 'results.json'].sort());
    const summary = fs.readFileSync(path.join(dir, 'ASSISTANT_SUMMARY.md'), 'utf8');
    assert.match(summary, /2\/3/);
    assert.match(summary, /obsolete prompt wording/);
    assert.match(summary, /02-build\.log/);
    assert.match(summary, /test:core/);
    assert.match(summary, /npm run test:core/);
    assert.match(fs.readFileSync(path.join(dir, 'failures.log'), 'utf8'), /AssertionError/);
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

test('P124.5 clean and failing workflow runs both produce the same diagnostic file set', () => {
  for (const [status, name] of [['failure', 'core'], ['success', 'build']]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-diagnostics-shape-'));
    try {
      fs.writeFileSync(path.join(dir, `${name}.log`), status === 'failure' ? 'AssertionError: failed check\n' : 'all checks passed\n');
      const r = run('scripts/diagnostics-summary.mjs', dir, { CI_STATUS: status });
      assert.equal(r.status, 0, r.stderr || r.stdout);
      assert.deepEqual(fs.readdirSync(dir).sort(), [`${name}.log`, 'ASSISTANT_SUMMARY.md', 'checks.log', 'environment.log', 'failures.log'].sort());
      const summary = fs.readFileSync(path.join(dir, 'ASSISTANT_SUMMARY.md'), 'utf8');
      assert.match(summary, /BiForge — Diagnostic Report/);
      assert.match(summary, new RegExp(status === 'failure' ? 'FAIL' : 'PASS'));
      assert.equal(fs.readdirSync(dir).filter(x => /^ASSISTANT_/.test(x)).length, 1);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
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
  const artifactZip = await new JSZip().file('checks.log', 'PASS    a — 400 ms\nPASS    b — 500 ms\n').generateAsync({ type: 'nodebuffer' });
  const server = createServer((req, res) => {
    const send = (value, status = 200, type = 'application/json') => { res.writeHead(status, { 'content-type': type }); res.end(type === 'application/json' ? JSON.stringify(value) : value); };
    if (req.url === '/repos/test/repo/actions/runs/999/jobs?per_page=100') return send({ jobs: [{ name: 'check-and-build', started_at: '2026-10-26T08:00:00Z', status: 'in_progress', steps: [] }] });
    if (req.url === '/repos/test/repo/actions/workflows/ci.yml/runs?per_page=30') return send({ workflow_runs: [{ id: 998, status: 'completed', conclusion: 'success', run_started_at: '2026-10-26T07:00:00Z', updated_at: '2026-10-26T07:00:03Z', head_sha: 'prev-sha', head_branch: 'main', event: 'push', html_url: 'https://example.test/run/998' }] });
    if (req.url === '/repos/test/repo/actions/runs/998/jobs?per_page=100') return send({ jobs: [{ name: 'check-and-build', started_at: '2026-10-26T07:00:00Z', completed_at: '2026-10-26T07:00:02Z', conclusion: 'success', steps: [{ name: 'Verification DAG', number: 5, status: 'completed', conclusion: 'success', started_at: '2026-10-26T07:00:00Z', completed_at: '2026-10-26T07:00:01Z' }] }] });
    if (req.url === '/repos/test/repo/actions/runs/998/artifacts?per_page=100') return send({ artifacts: [{ id: 7, name: 'ci-diagnostics', expired: false }] });
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
    assert.equal(history.previousRuns[0].dagWallClockMs, null, 'new compact artifacts intentionally omit the separate metrics JSON');
    assert.equal(history.previousRuns[0].checks.total, 2);
    assert.equal(history.previousRuns[0].checks.pass, 2);
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
