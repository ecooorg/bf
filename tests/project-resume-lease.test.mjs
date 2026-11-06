import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorePort } from '../server/appBuilderAdapter.ts';

const row = {
  id: 'job-lease-1', project_id: 'project-1', user_id: 'user-1', status: 'running',
  stage: 'code', spec: null, plan: null, calls_used: 2, calls_budget: 25,
  error: null, report: null, artifact_id: null, created_at: '2026-11-06T10:00:00.000Z',
  updated_at: '2026-11-06T10:00:00.000Z', heartbeat_at: '2026-11-06T10:00:00.000Z',
};

test('stale-job recovery claims jobs atomically with row locks and refreshes heartbeat', async () => {
  let statement = ''; let values;
  const pool = { async query(sql, params) { statement = sql; values = params; return { rows: [row] }; } };
  const store = createStorePort({ getPoolFn: async () => pool });
  const claimed = await store.claimResumable(120_000);
  assert.equal(claimed.length, 1);
  assert.equal(claimed[0].id, row.id);
  assert.match(statement, /ORDER BY created_at\s+LIMIT 20\s+FOR UPDATE SKIP LOCKED/);
  assert.match(statement, /UPDATE app_build_jobs AS jobs/);
  assert.match(statement, /heartbeat_at\s*=\s*now\(\)/);
  assert.match(statement, /status IN \('queued','running'\)/);
  assert.deepEqual(values, [120_000]);
});

test('stale-job recovery enforces the minimum lease age', async () => {
  let values;
  const pool = { async query(_sql, params) { values = params; return { rows: [] }; } };
  const store = createStorePort({ getPoolFn: async () => pool });
  assert.deepEqual(await store.claimResumable(1), []);
  assert.deepEqual(values, [5_000]);
});
