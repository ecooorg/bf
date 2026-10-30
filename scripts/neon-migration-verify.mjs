import pg from 'pg';

const expectedMigrations = 19;
const requiredTables = [
  'projects', 'project_states', 'project_state_versions', 'project_events', 'audit_events',
  'rate_limits', 'artifacts', 'usage_ledger', 'connection_checks', 'route_decisions',
  'model_health', 'tasks', 'runs', 'task_events', 'jobs', 'budgets', 'project_settings',
  'plans', 'plan_tasks', 'approvals', 'gate_evidence', 'gate_waivers', 'task_heads',
  'artifact_manifests', 'code_tasks', 'project_diagnostic_events',
  'project_diagnostic_artifacts', 'app_build_jobs', 'app_build_unit_results',
  'model_request_slots', 'application_diagnostic_logs',
];

function fail(message) {
  console.error(`NEON_MIGRATION_VERIFY=FAIL ${message}`);
  process.exitCode = 1;
}

if (!process.env.DATABASE_URL) {
  fail('DATABASE_URL is missing; no database was contacted.');
} else {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 8000,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  });
  try {
    const client = await pool.connect();
    try {
      const identity = await client.query('SELECT current_database() AS database_name, current_schema() AS current_schema');
      const ledgerExists = await client.query("SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists");
      if (!ledgerExists.rows[0].exists) {
        fail('schema_migrations table is missing; migration runner did not initialize the ledger.');
      } else {
        const ledger = await client.query('SELECT version FROM public.schema_migrations ORDER BY version');
        const userTables = await client.query(`
          SELECT tablename FROM pg_catalog.pg_tables
          WHERE schemaname = 'public' ORDER BY tablename
        `);
        const tableSet = new Set(userTables.rows.map((row) => row.tablename));
        const missing = requiredTables.filter((table) => !tableSet.has(table));
        const applied = ledger.rows.length;
        console.log(`DATABASE=${identity.rows[0].database_name}`);
        console.log(`SCHEMA=${identity.rows[0].current_schema}`);
        console.log(`MIGRATIONS_APPLIED=${applied}/${expectedMigrations}`);
        console.log(`PUBLIC_TABLES=${tableSet.size}`);
        console.log(`MISSING_REQUIRED_TABLES=${missing.length ? missing.join(',') : 'none'}`);
        if (applied !== expectedMigrations) fail(`expected ${expectedMigrations} migration records, found ${applied}.`);
        if (missing.length) fail(`required application tables are missing: ${missing.join(', ')}.`);
        if (!process.exitCode) console.log('NEON_MIGRATION_VERIFY=PASS');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    const detail = [error?.code, error?.message].filter(Boolean).join(' ');
    fail(`database verification failed: ${detail}`);
  } finally {
    await pool.end();
  }
}
