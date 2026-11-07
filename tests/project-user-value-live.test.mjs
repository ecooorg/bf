import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const cfg = JSON.parse(fs.readFileSync('config/project-user-value-prompts.json', 'utf8'));

test('P127.19 live prompt set is well-formed, unique and states its authorship', () => {
  assert.ok(cfg.version && cfg.authoredBy);
  assert.ok(cfg.scenarios.length >= 3);
  const ids = cfg.scenarios.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of cfg.scenarios) {
    assert.ok(s.request.length > 20, s.id);
    assert.ok(Array.isArray(s.mustObserve) && s.mustObserve.length >= 2, s.id);
  }
});

test('P127.19 live runner refuses to run without a target and never reports PASS unmeasured', () => {
  const r = spawnSync(process.execPath, ['scripts/project-user-value-live.mjs'], { env: { ...process.env, EVAL_BASE_URL: '' }, encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /EVAL_BASE_URL/);
});
