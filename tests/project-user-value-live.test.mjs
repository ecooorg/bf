import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const cfg = JSON.parse(fs.readFileSync('config/project-user-value-prompts.json', 'utf8'));

test('P127.23 live prompt set is well-formed, unique and states its authorship', () => {
  assert.ok(cfg.version && cfg.authoredBy);
  assert.ok(cfg.scenarios.length >= 10);
  const ids = cfg.scenarios.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of cfg.scenarios) {
    assert.ok(s.request.length > 20, s.id);
    assert.ok(Array.isArray(s.mustObserve) && s.mustObserve.length >= 2, s.id);
  }
});

test('P127.23 live runner needs no input: fixed default URL, lists scenarios offline', () => {
  const r = spawnSync(process.execPath, ['scripts/project-user-value-live.mjs', '--list'], { env: { ...process.env, EVAL_BASE_URL: '' }, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /base=https:\/\/biforge\.onrender\.com repeats=2/);
  assert.match(r.stdout, /uv-calc/);
});
