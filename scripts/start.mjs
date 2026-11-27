import 'dotenv/config';
import process from 'node:process';

if (process.env.ENABLE_PROJECT_MODE === 'true') {
  const valid = Boolean(process.env.APP_PASSWORD)
    && process.env.ENABLE_APP_AUTH !== 'false'
    && Boolean(process.env.SESSION_SECRET)
    && Boolean(process.env.DATABASE_URL);
  if (!valid) {
    console.error('Project Mode requires APP_PASSWORD, ENABLE_APP_AUTH, SESSION_SECRET and DATABASE_URL');
    process.exit(1);
  }
}

// Load dotenv before this check: Render's shell does not source the app's .env file.
if (process.env.DATABASE_URL) {
  await import('./migrate.mjs');
  if (process.exitCode) process.exit(process.exitCode);
}

await import('../dist-server/server.js');
