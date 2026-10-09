import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const repo = fs.readFileSync(new URL('../server/projectRepository.ts', import.meta.url), 'utf8');

test('Project Mode is opt-in and requires credentials plus PostgreSQL at startup', () => {
  assert.match(server, /ENABLE_PROJECT_MODE === 'true'/);
  assert.match(server, /APP_PASSWORD is required when ENABLE_PROJECT_MODE=true/);
  assert.match(server, /DATABASE_URL is required when ENABLE_PROJECT_MODE=true/);
  assert.match(server, /SESSION_SECRET is required/);
});

test('Project Mode mutating routes require same-origin Origin and persistent rate limiting', () => {
  assert.match(server, /Same-origin request required/);
  assert.match(server, /consumeRateLimit\(\{ key, limit: projectRateLimit, windowMs: 60_000 \}\)/);
  assert.match(repo, /INSERT INTO rate_limits/);
});

test('Project Mode routes are gated and UI is separately switchable', () => {
  assert.match(server, /PROJECT_MODE_DISABLED/);
  assert.match(server, /app\.get\('\/api\/projects'/);
  assert.match(server, /app\.post\('\/api\/projects'/);
  assert.match(app, /function ProjectWorkspace/);
  assert.match(app, /onProjectMode=\{projectModeEnabled \?/);
});

test('Simple Mode still uses its existing decision state and local storage path', () => {
  assert.match(app, /getStoredDecisions/);
  assert.match(app, /saveDecisions/);
  assert.match(app, /setProjectMode\(false\)/);
});
