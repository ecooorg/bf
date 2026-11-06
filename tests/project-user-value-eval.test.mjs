/**
 * P127.18 — Ensures the human-simulator offline suite stays wired and green.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('P127.18 offline human-simulator rejects SUCCESS stub and accepts richer forest', () => {
  const r = spawnSync(process.execPath, ['scripts/project-user-value-eval.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /stub-racer-false-success/);
  assert.match(r.stdout, /rich-forest-animals/);
  assert.match(r.stdout, /\*\*PASS\*\*/);
});

test('P127.18 fixtures exist', () => {
  assert.ok(fs.existsSync(path.join(root, 'tests/fixtures/project-user-value/stub-racer/app.js')));
  assert.ok(fs.existsSync(path.join(root, 'tests/fixtures/project-user-value/rich-forest/js/main.js')));
  assert.ok(fs.existsSync(path.join(root, '.github/workflows/project-user-value.yml')));
});
