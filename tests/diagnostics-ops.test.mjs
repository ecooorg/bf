/**
 * Category: diagnostics / ops — All Logs archive, health commit, client-render ack.
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
  assert.match(allLogs, /REQUEST_INDEX/);
  assert.match(allLogs, /exchanges\.jsonl/);
  assert.match(allLogs, /conversations-full/);
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

test('P126.19 client-render route and simple_direct_exchange instrumentation exist', () => {
  const server = read('server.ts');
  assert.match(server, /\/api\/diagnostics\/client-render/);
  assert.match(server, /simple_direct_exchange/);
  assert.match(server, /userPreview/);
  const allLogs = read('server/allLogs.ts');
  assert.match(allLogs, /REQUEST_INDEX/);
  assert.match(allLogs, /simple_direct_exchange/);
  const screens = read('src/ConversationScreens.tsx');
  assert.match(screens, /ackClientRender/);
  assert.match(screens, /client-render/);
});

test('P126.19 safeDetails does not turn undefined into the string undefined', () => {
  const src = read('server/projectDiagnostics.ts');
  assert.match(src, /if \(value === undefined\) return undefined/);
  assert.match(src, /if \(item === undefined\) continue/);
});
