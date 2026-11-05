/**
 * Category: diagnostics / ops — All Logs archive, health commit, no session-log UI dump requirement.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('All Logs server builder and authenticated download route exist', () => {
  assert.ok(existsSync(path.join(root, 'server/allLogs.ts')));
  const allLogs = read('server/allLogs.ts');
  assert.match(allLogs, /buildAllLogsZip/);
  assert.match(allLogs, /simple\//);
  assert.match(allLogs, /expert\//);
  assert.match(allLogs, /project\//);
  assert.match(allLogs, /assistant\//);
  assert.match(allLogs, /MANIFEST\.sha256|manifest/);
  const server = read('server.ts');
  assert.match(server, /\/api\/diagnostics\/all-logs/);
  assert.match(server, /buildAllLogsZip/);
});

test('client All Logs helper downloads a file and does not render log body', () => {
  const client = read('src/allLogs.ts');
  assert.match(client, /\/api\/diagnostics\/all-logs/);
  assert.match(client, /link\.download/);
  assert.doesNotMatch(client, /createPortal|innerHTML.*log/i);
});

test('buildCommit resolves platform env or build-stamp', () => {
  const src = read('server/projectDiagnostics.ts');
  assert.match(src, /resolvedBuildCommit|buildCommit/);
  assert.match(src, /build-stamp\.json|RAILWAY_GIT_COMMIT|RENDER_GIT_COMMIT/);
});
