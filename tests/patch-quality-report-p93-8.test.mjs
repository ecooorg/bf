import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('P93.8 report generator creates compact assistant handoff with failed stages and log clues', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p938-'));
  try {
    fs.writeFileSync(path.join(temp, 'results.json'), JSON.stringify({ results: [
      { id: 'test:example', status: 'FAIL', exitCode: 1, durationMs: 1200, log: 'test-example.log' },
      { id: 'typecheck', status: 'PASS', exitCode: 0, durationMs: 50, log: 'typecheck.log' }
    ] }));
    fs.writeFileSync(path.join(temp, 'test-example.log'), 'not ok 2 - example contract\nAssertionError: expected partial got complete\n');
    const result = spawnSync(process.execPath, ['scripts/patch-quality-report.mjs'], {
      cwd: root, encoding: 'utf8', env: { ...process.env, CI_LOGS_DIR: temp, CI_STATUS: 'failure', GITHUB_SHA: 'test-sha' }
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = fs.readFileSync(path.join(temp, 'NEXT_PATCH.md'), 'utf8');
    assert.match(report, /PATCH_STATUS=FAILED/);
    assert.match(report, /test:example:FAIL/);
    assert.match(report, /expected partial got complete/);
    assert.match(report, /ASSISTANT HANDOFF/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('P93.8 report generator still writes a report when results.json is missing', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p938-empty-'));
  try {
    const result = spawnSync(process.execPath, ['scripts/patch-quality-report.mjs'], {
      cwd: root, encoding: 'utf8', env: { ...process.env, CI_LOGS_DIR: temp, CI_STATUS: 'failure' }
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = fs.readFileSync(path.join(temp, 'NEXT_PATCH.md'), 'utf8');
    assert.match(report, /`results.json` is missing or unreadable/);
    assert.match(report, /PATCH_STATUS=FAILED/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
