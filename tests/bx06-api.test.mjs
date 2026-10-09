import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { getPool, closeDatabase } from '../server/database.ts';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for Project Mode API tests');
const PASS = 'bx06-api-test-password';
const SECRET = 'bx06-api-test-session-secret-long-enough';
const freePort = () => new Promise(resolve => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

test('BX-06 Project Mode API: authentication, CSRF, CRUD, optimistic versioning', async () => {
  const port = await freePort();
  const child = spawn('tsx', ['server.ts'], { env: { ...process.env, NODE_ENV: 'production', PORT: String(port), ENABLE_PROJECT_MODE: 'true', ENABLE_APP_AUTH: 'true', APP_PASSWORD: PASS, SESSION_SECRET: SECRET, PGSSLMODE: 'disable', SKIP_DIST_HEALTHCHECK: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', d => log += d); child.stderr.on('data', d => log += d);
  const base = `http://127.0.0.1:${port}`;
  let cookie = '';
  let projectId = '';
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (child.exitCode !== null) throw new Error(`server exited: ${log}`);
      try { if ((await fetch(base + '/api/health')).ok) { ready = true; break; } } catch {}
      await sleep(125);
    }
    assert.equal(ready, true, `server did not start: ${log}`);
    assert.equal((await fetch(base + '/api/projects')).status, 401);
    const login = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PASS }) });
    assert.equal(login.status, 200); cookie = (login.headers.get('set-cookie') || '').split(';')[0]; assert.ok(cookie);
    const pool = await getPool();
    const loginAudit = await pool.query(`SELECT 1 FROM audit_events WHERE event_type='auth.login.succeeded' AND details->>'auth_mode'='password' ORDER BY created_at DESC LIMIT 1`);
    assert.equal(loginAudit.rowCount, 1, 'successful Project Mode login must be audited');
    const csrf = await fetch(base + '/api/projects', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: JSON.stringify({ name: 'should be rejected' }) });
    assert.equal(csrf.status, 403);
    const created = await fetch(base + '/api/projects', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ name: `BX06 ${Date.now()}`, state: { phase: 'draft' } }) });
    assert.equal(created.status, 201); const createdJson = await created.json(); projectId = createdJson.data.id;
    const update = await fetch(`${base}/api/projects/${projectId}/state`, { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ expected_version: 1, state: { phase: 'active' } }) });
    assert.equal(update.status, 200); assert.equal((await update.json()).data.state_version, 2);
    const stale = await fetch(`${base}/api/projects/${projectId}/state`, { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ expected_version: 1, state: { phase: 'stale' } }) });
    assert.equal(stale.status, 409); assert.equal((await stale.json()).code, 'CONFLICT');
    const versions = await fetch(`${base}/api/projects/${projectId}/versions`, { headers: { cookie } });
    assert.equal(versions.status, 200); assert.equal((await versions.json()).data.length, 2);
  } finally {
    if (projectId) { const pool = await getPool(); await pool.query('DELETE FROM projects WHERE id=$1', [projectId]); }
    child.kill();
    await new Promise(resolve => { if (child.exitCode !== null) resolve(); else child.once('exit', resolve); });
    await closeDatabase();
  }
});
