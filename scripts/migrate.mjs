import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required; no migration was run.');
  process.exit(2);
}

const LOCK_KEY = 741_203_006;
const LOCK_TIMEOUT_MS = boundedEnvInt('MIGRATION_LOCK_TIMEOUT_MS', 30_000, 1_000, 120_000);
const LOCK_POLL_MS = boundedEnvInt('MIGRATION_LOCK_POLL_MS', 1_000, 250, 5_000);
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 60_000,
  lock_timeout: 15_000,
  query_timeout: 65_000,
  application_name: 'biforge-db-migrations',
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});
let client;
let locked = false;

function boundedEnvInt(name, fallback, min, max) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value))) : fallback;
}

function describe(error) {
  if (!(error instanceof Error)) return 'unknown error';
  const parts = [error.code, error.message].filter(Boolean);
  if (error instanceof AggregateError) for (const e of error.errors) parts.push(`${e.code ?? ''} ${e.address ?? ''}:${e.port ?? ''}`.trim());
  return parts.join(' ') || error.name;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The database may still be starting when the app container boots.
async function connectWithRetry(attempts = 15, delayMs = 2_000) {
  for (let i = 1; ; i++) {
    try {
      const connected = await pool.connect();
      console.info(`[db:migrate] PostgreSQL connection established (attempt ${i}/${attempts})`);
      return connected;
    } catch (error) {
      if (i >= attempts) throw error;
      console.warn(`[db:migrate] database unavailable (attempt ${i}/${attempts}): ${describe(error)}; retrying in ${delayMs} ms`);
      await sleep(delayMs);
    }
  }
}

// try-lock plus a deadline prevents startup from waiting indefinitely on a stale
// or competing migration session while still serializing concurrent deploys.
async function acquireMigrationLock() {
  const startedAt = Date.now();
  let attempt = 0;
  while (true) {
    attempt++;
    const result = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [LOCK_KEY]);
    if (result.rows[0]?.locked === true) {
      locked = true;
      console.info(`[db:migrate] migration lock acquired after ${Date.now() - startedAt} ms`);
      return;
    }
    const elapsed = Date.now() - startedAt;
    if (elapsed >= LOCK_TIMEOUT_MS) {
      throw new Error(`migration_lock_timeout: another migration holds the PostgreSQL lock for more than ${LOCK_TIMEOUT_MS} ms`);
    }
    if (attempt === 1 || attempt % 5 === 0) console.warn(`[db:migrate] migration lock busy (${elapsed}/${LOCK_TIMEOUT_MS} ms); waiting`);
    await sleep(Math.min(LOCK_POLL_MS, LOCK_TIMEOUT_MS - elapsed));
  }
}

try {
  console.info('[db:migrate] connecting to PostgreSQL');
  client = await connectWithRetry();
  console.info('[db:migrate] acquiring migration lock');
  await acquireMigrationLock();
  console.info('[db:migrate] checking migration table');
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const directory = path.resolve('migrations');
  const allFiles = (await fs.readdir(directory)).filter((file) => /^\d+_[a-z0-9_-]+\.sql$/.test(file)).sort();
  const isRetiredImmoFinderMigration = (file) => /^0(?:2[0-9]|30)_immofinder/.test(file);
  const retiredImmoFinderCount = allFiles.filter(isRetiredImmoFinderMigration).length;
  const files = allFiles.filter((file) => !isRetiredImmoFinderMigration(file));
  if (retiredImmoFinderCount) console.info(`[db:migrate] ${retiredImmoFinderCount} archived ImmoFinder migrations excluded from the active runner; existing schema preserved`);
  let applied = 0;
  let alreadyApplied = 0;
  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    const existing = await client.query('SELECT 1 FROM schema_migrations WHERE version=$1', [version]);
    if (existing.rowCount) {
      alreadyApplied++;
      console.log(`[db:migrate] ${version}: already applied`);
      continue;
    }
    console.info(`[db:migrate] applying ${version}`);
    const sql = await fs.readFile(path.join(directory, file), 'utf8');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(version) VALUES($1) ON CONFLICT DO NOTHING', [version]);
    applied++;
    console.log(`[db:migrate] ${version}: applied`);
  }
  console.info(`[db:migrate] complete: ${applied} applied, ${alreadyApplied} already applied`);
} catch (error) {
  console.error(`[db:migrate] failed: ${describe(error)}`);
  process.exitCode = 1;
} finally {
  if (client && locked) {
    try {
      await client.query({ text: 'SELECT pg_advisory_unlock($1)', values: [LOCK_KEY], query_timeout: 5_000 });
      console.info('[db:migrate] migration lock released');
    } catch (error) {
      console.error(`[db:migrate] failed to release migration lock: ${describe(error)}`);
    }
  }
  client?.release();
  await pool.end();
}
