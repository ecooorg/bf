import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/neon-initialize.yml', 'utf8');
const preflight = fs.readFileSync('scripts/neon-migration-preflight.mjs', 'utf8');
const verify = fs.readFileSync('scripts/neon-migration-verify.mjs', 'utf8');
const runner = fs.readFileSync('scripts/migrate.mjs', 'utf8');

test('Neon initialization is manual, confirmation-gated, and uses the repository migration runner', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /BACKUP_CREATED/);
  assert.match(workflow, /biforge-production/);
  assert.match(workflow, /secrets\.DATABASE_URL/);
  assert.match(workflow, /npm run db:migrate/);
  assert.match(workflow, /neon-migration-preflight\.mjs/);
  assert.match(workflow, /neon-migration-verify\.mjs/);
  assert.doesNotMatch(workflow, /DROP TABLE|TRUNCATE|DELETE FROM/);
  assert.match(runner, /pg_advisory_lock/);
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
