import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('canonical diagnostics collector emits the same five-file handoff contract', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-diagnostics-'));
  try {
    const run = spawnSync(process.execPath, ['scripts/diagnostics-report.mjs'], {
      cwd: root, encoding: 'utf8',
      env: { ...process.env, DIAGNOSTICS_DIR: out, CI_STATUS: 'test', GITHUB_WORKFLOW: 'diagnostics-contract' },
    });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    for (const name of ['summary.md', 'summary.json', 'tests.log', 'failures.log', 'environment.log']) {
      assert.ok(fs.existsSync(path.join(out, name)), `missing ${name}`);
    }
    const summary = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf8'));
    assert.equal(summary.environment.workflow, 'diagnostics-contract');
    assert.ok(Array.isArray(summary.dagResults));
    assert.match(fs.readFileSync(path.join(out, 'summary.md'), 'utf8'), /Verification counts/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
