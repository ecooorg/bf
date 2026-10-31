import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/architect-dual-compare.mjs');
const workflow = path.join(root, '.github/workflows/architect-dual-compare.yml');
const fixture = path.join(root, 'scripts/architect-dual-expense-goal.txt');

test('architect dual-compare script and workflow exist', () => {
  assert.ok(existsSync(script), 'scripts/architect-dual-compare.mjs');
  assert.ok(existsSync(workflow), 'workflow file');
  assert.ok(existsSync(fixture), 'expense goal fixture');
  const yml = readFileSync(workflow, 'utf8');
  assert.match(yml, /workflow_dispatch/);
  assert.match(yml, /architect-dual-compare\.mjs/);
  assert.match(yml, /upload-artifact/);
});

test('dual-compare dry-run writes report without staging', () => {
  const out = path.join(root, 'architect-dual-compare-dry');
  const r = spawnSync(process.execPath, [script], {
    cwd: root,
    env: { ...process.env, DUAL_DRY_RUN: 'true', DUAL_OUT_DIR: out },
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const md = readFileSync(path.join(out, 'report.md'), 'utf8');
  const json = JSON.parse(readFileSync(path.join(out, 'report.json'), 'utf8'));
  assert.match(md, /Architect dual-compare report/);
  assert.match(md, /Recommendation/);
  assert.equal(json.artifactType, 'architect-dual-compare');
  assert.equal(json.dryRun, true);
  assert.ok(json.recommendation?.choice);
});
