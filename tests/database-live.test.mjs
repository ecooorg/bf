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
    await assert.rejects(() => updateProjectState({ projectId: project.id, expectedVersion: 1, state: { status: 'stale' }, actor: 'human', sourceRef: 'ci:live-test' }), StateVersionConflict);
    const versions = await listStateVersions(project.id, 10);
    assert.deepEqual(versions.map(v => Number(v.state_version)).sort(), [1, 2]);
    // BX-07 provenance: every version and event records who/what made the change.
    assert.ok(versions.every(v => ['human', 'agent', 'tool', 'system'].includes(v.actor) && typeof v.source_ref === 'string' && v.source_ref.length > 0));
    await assert.rejects(() => updateProjectState({ projectId: project.id, expectedVersion: 2, state: { status: 'no-source' }, actor: 'human', sourceRef: '  ' }));
    const events = await pool.query('SELECT event_type, payload FROM project_events WHERE project_id=$1', [project.id]);
    assert.ok(events.rows.length >= 2 && events.rows.every(e => typeof e.payload.source_ref === 'string' && e.payload.source_ref.length > 0));
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
