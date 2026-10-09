import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required; no migration was run.');
  process.exit(2);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false } });
try {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const directory = path.resolve('migrations');
  const files = (await fs.readdir(directory)).filter((file) => /^\d+_[a-z0-9_-]+\.sql$/.test(file)).sort();
  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    const existing = await pool.query('SELECT 1 FROM schema_migrations WHERE version=$1', [version]);
    if (existing.rowCount) { console.log(`${version}: already applied`); continue; }
    const sql = await fs.readFile(path.join(directory, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations(version) VALUES($1) ON CONFLICT DO NOTHING', [version]);
    console.log(`${version}: applied`);
  }
} catch (error) {
  console.error(`Migration failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
} finally { await pool.end(); }
