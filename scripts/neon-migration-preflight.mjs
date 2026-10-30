import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('NEON_PREFLIGHT=FAIL DATABASE_URL is missing.');
  process.exit(2);
}
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 8000,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});
try {
  const client = await pool.connect();
  try {
    const identity = await client.query('SELECT current_database() AS database_name');
    const ledger = await client.query("SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists");
    const relations = await client.query(`
      SELECT c.relname, c.relkind
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','S','f')
        AND c.relname <> 'schema_migrations'
      ORDER BY c.relname
    `);
    console.log(`DATABASE=${identity.rows[0].database_name}`);
    console.log(`MIGRATION_LEDGER=${ledger.rows[0].exists ? 'present' : 'absent'}`);
    console.log(`EXISTING_PUBLIC_RELATIONS=${relations.rows.length}`);
    if (relations.rows.length && !ledger.rows[0].exists) {
      console.error(`NEON_PREFLIGHT=FAIL public schema already contains objects but has no migration ledger: ${relations.rows.map((row) => row.relname).join(', ')}. Refusing to apply migrations to an untracked schema.`);
      process.exitCode = 1;
    } else {
      console.log('NEON_PREFLIGHT=PASS');
    }
  } finally {
    client.release();
  }
} catch (error) {
  console.error(`NEON_PREFLIGHT=FAIL ${[error?.code, error?.message].filter(Boolean).join(' ')}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
