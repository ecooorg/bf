import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (script, dir, extra = {}) => spawnSync(process.execPath, [script], {
  cwd: root, encoding: 'utf8', env: { ...process.env, CI_LOGS_DIR: dir, ...extra },
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
    const report = fs.readFileSync(path.join(dir, 'NEXT_PATCH.md'), 'utf8');
    assert.match(report, /expected 2, actual 1/);
    assert.match(report, /Expected: 2/);
    assert.match(report, /Actual: 1/);
    assert.match(report, /ASSISTANT HANDOFF/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P94 packaging leaves only NEXT_PATCH.md and diagnostics.zip on failure', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p94-package-'));
  try {
    fs.writeFileSync(path.join(dir, 'NEXT_PATCH.md'), '# Report\nPATCH_STATUS=FAILED\n');
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ results: [
      { id: 'test:core', status: 'FAIL', log: 'test-core.log' }, { id: 'test:project', status: 'PASS', log: 'test-project.log' },
    ] }));
    fs.writeFileSync(path.join(dir, 'test-core.log'), 'AssertionError: expected false, actual true\n');
    fs.writeFileSync(path.join(dir, 'test-project.log'), 'all passed\n');
    fs.writeFileSync(path.join(dir, 'ci-install.log'), 'npm ci ok\n');
    const r = run('scripts/package-ci-artifacts.mjs', dir);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.deepEqual(fs.readdirSync(dir).sort(), ['NEXT_PATCH.md', 'diagnostics.zip']);
    const zip = await JSZip.loadAsync(fs.readFileSync(path.join(dir, 'diagnostics.zip')));
    assert.ok(zip.file('test-core.log'));
    assert.ok(zip.file('diagnostics-index.json'));
    assert.equal(zip.file('test-project.log'), null, 'successful stage log should not be packaged');
    const core = await zip.file('test-core.log').async('string');
    assert.match(core, /AssertionError/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P94 packaging emits only NEXT_PATCH.md after a clean run', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p94-clean-'));
  try {
    fs.writeFileSync(path.join(dir, 'NEXT_PATCH.md'), '# Report\nPATCH_STATUS=PASSED\n');
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ results: [{ id: 'typecheck', status: 'PASS' }] }));
    fs.writeFileSync(path.join(dir, 'typecheck.log'), 'no errors\n');
    const r = run('scripts/package-ci-artifacts.mjs', dir);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.deepEqual(fs.readdirSync(dir), ['NEXT_PATCH.md']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
