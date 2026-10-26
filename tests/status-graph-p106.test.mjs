import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildGraph } from '../scripts/statusGraph.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = (...a) => spawnSync(process.execPath, ['scripts/statusGraph.mjs', ...a], { cwd: root, encoding: 'utf8' });

test('P106 check graph is deterministic and links checks to files and modules', () => {
  const a = JSON.stringify(buildGraph()); const b = JSON.stringify(buildGraph());
  assert.equal(a, b);
  const g = buildGraph();
  const security = g.checks.find((c) => c.id === 'test:security');
  assert.ok(security, 'test:security is part of the check chain');
  assert.ok(security.files.includes('tests/security.test.mjs'));
  assert.ok(security.modules.includes('server/githubIntegration.ts'));
  assert.ok(g.modules['server/githubIntegration.ts'].includes('test:security'));
  for (const c of g.checks) for (const f of [...c.files, ...c.modules]) assert.ok(fs.existsSync(path.join(root, f)), `${c.id}: ${f} must exist`);
});

test('P106 --out and --check work on a temporary file; a stale file is reported', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p106-graph-'));
  try {
    const out = path.join(dir, 'graph.json');
    assert.equal(cli('--out', out).status, 0);
    assert.equal(cli('--check', '--out', out).status, 0);
    fs.writeFileSync(out, '{}\n');
    const stale = cli('--check', '--out', out);
    assert.equal(stale.status, 1); assert.match(stale.stderr, /stale or missing/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P106 overlay attaches last statuses from results.json and never invents PASS', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p106-overlay-'));
  try {
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ results: [
      { id: 'test-security', status: 'PASS' }, { id: 'typecheck', status: 'FAIL' }, { id: 'test-core', status: 'SKIPPED' },
    ] }));
    const out = path.join(dir, 'run.json');
    assert.equal(cli('--overlay', dir, '--out', out).status, 0);
    const run = JSON.parse(fs.readFileSync(out, 'utf8'));
    const status = Object.fromEntries(run.checks.map((c) => [c.id, c.lastStatus]));
    assert.equal(status['test:security'], 'PASS');
    assert.equal(status.typecheck, 'FAIL');
    assert.equal(status['test:core'], 'BLOCKED');
    assert.equal(status['test:models'], 'NOT_RUN');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
