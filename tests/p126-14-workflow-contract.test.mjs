import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const dir = '.github/workflows';
const names = fs.readdirSync(dir).filter((n) => n.endsWith('.yml'));
const read = (n) => fs.readFileSync(`${dir}/${n}`, 'utf8');

test('every workflow runs the preflight and ends with an always-run assistant report', () => {
  for (const n of names) {
    const y = read(n);
    assert.match(y, /workflow-preflight\.mjs/, `${n}: preflight missing`);
    if (n === 'ci.yml') {
      assert.match(y, /diagnostics-summary\.mjs/);
      assert.match(y, /ASSISTANT_SUMMARY\.md/);
    } else {
      assert.match(y, /uses: \.\/\.github\/actions\/diagnostic-report/, `${n}: report action missing`);
    }
    assert.match(y, /if: always\(\)/, `${n}: report must run after failures`);
    assert.doesNotMatch(y, /\|\|\s*echo\b/, `${n}: "|| echo" masks a failing step`);
  }
});

test('report action uploads the assistant summary and logs', () => {
  const a = fs.readFileSync('.github/actions/diagnostic-report/action.yml', 'utf8');
  assert.match(a, /ASSISTANT_SUMMARY\.md/);
  assert.match(a, /upload-artifact@[a-f0-9]{40}/);
});

test('Answer Quality does not run manual-only heuristic packs (P125.13)', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  for (const f of ['p125-3-', 'p125-4-', 'p124-28-', 'p124-38-']) assert.ok(!pkg.scripts['test:answer-quality'].includes(f), f);
  assert.ok(pkg.scripts['test:search-heuristics'].includes('p125-3-'));
});

test('preflight passes on the current tree and detects a stale reference', () => {
  const ok = spawnSync(process.execPath, ['scripts/workflow-preflight.mjs'], { encoding: 'utf8', env: { ...process.env, CI_LOGS_DIR: 'artifacts/p126-14-preflight' } });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const stale = '.github/workflows/zz-stale-fixture.yml';
  fs.writeFileSync(stale, "name: x\non: [push]\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: node scripts/does-not-exist.mjs\n      - run: npm run no-such-script\n");
  try {
    const bad = spawnSync(process.execPath, ['scripts/workflow-preflight.mjs'], { encoding: 'utf8', env: { ...process.env, CI_LOGS_DIR: 'artifacts/p126-14-preflight', PREFLIGHT_WORKFLOW: 'zz-stale-fixture.yml' } });
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /missing file scripts\/does-not-exist\.mjs/);
    assert.match(bad.stdout, /missing npm script no-such-script/);
  } finally { fs.rmSync(stale, { force: true }); fs.rmSync('artifacts/p126-14-preflight', { recursive: true, force: true }); }
});
