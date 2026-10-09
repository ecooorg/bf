import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, getProject, listStateVersions, StateVersionConflict, updateProjectState, consumeRateLimit } from '../server/projectRepository.ts';
import { getPool, closeDatabase } from '../server/database.ts';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for live PostgreSQL contract tests');

test('BX-04 live PostgreSQL: create, version, optimistic concurrency, history, and rate limits', async () => {
  const project = await createProject({ name: `CI contract ${Date.now()}`, state: { status: 'initial' } });
  const pool = await getPool();
  try {
    assert.equal(project.state_version, 1);
    const current = await getProject(project.id);
    assert.equal(current.state.status, 'initial');
    const updated = await updateProjectState({ projectId: project.id, expectedVersion: 1, state: { status: 'updated' }, actor: 'human', sourceRef: 'ci:live-test' });
    assert.equal(updated.state_version, 2);
    await assert.rejects(() => updateProjectState({ projectId: project.id, expectedVersion: 1, state: { status: 'stale' }, actor: 'human' }), StateVersionConflict);
    const versions = await listStateVersions(project.id, 10);
    assert.deepEqual(versions.map(v => Number(v.state_version)).sort(), [1, 2]);
    const bucket = `ci-rate-limit-${project.id}`;
    assert.equal((await consumeRateLimit({ key: bucket, limit: 2, windowMs: 60_000 })).allowed, true);
    assert.equal((await consumeRateLimit({ key: bucket, limit: 2, windowMs: 60_000 })).allowed, true);
    assert.equal((await consumeRateLimit({ key: bucket, limit: 2, windowMs: 60_000 })).allowed, false);
  } finally {
    await pool.query('DELETE FROM projects WHERE id=$1', [project.id]);
    await pool.query("DELETE FROM rate_limits WHERE bucket_key=$1", [`ci-rate-limit-${project.id}`]);
    await closeDatabase();
  }
});
