import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const preflight = fs.readFileSync('scripts/neon-migration-preflight.mjs', 'utf8');
const verify = fs.readFileSync('scripts/neon-migration-verify.mjs', 'utf8');
const runner = fs.readFileSync('scripts/migrate.mjs', 'utf8');

test('Neon migration runner remains lock-gated and script-driven (workflow optional)', () => {
  // Canonical workflows no longer ship neon-initialize.yml; init is ops/script-level.
  assert.equal(fs.existsSync('.github/workflows/neon-initialize.yml'), false);
  assert.match(runner, /pg_advisory_lock/);
  assert.match(preflight, /neon-migration-preflight|schema_migrations/);
});

test('Neon preflight refuses an untracked non-empty public schema', () => {
  assert.match(preflight, /schema_migrations/);
  assert.match(preflight, /Refusing to apply migrations to an untracked schema/);
});

test('Neon verification requires the full migration ledger and core application tables', () => {
  assert.match(verify, /expectedMigrations = 19/);
  assert.match(verify, /projects/);
  assert.match(verify, /app_build_jobs/);
  assert.match(verify, /application_diagnostic_logs/);
  assert.match(verify, /NEON_MIGRATION_VERIFY=PASS/);
});
