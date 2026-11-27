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


test('ImmoFinder diagnostics, database snapshots, and automation are permanently retired', () => {
  const server = read('server.ts');
  const main = read('src/main.tsx');
  assert.match(server, /IMMOFINDER_RETIRED/);
  assert.doesNotMatch(server, /registerImmoFinderRoutes|stopImmoFinderWorker/);
  assert.match(main, /ImmoFinder is permanently retired/);
  for (const workflow of ['immofinder-cron.yml', 'immofinder-diagnostics-poll.yml', 'immofinder-health.yml', 'restore-immofinder-routes.yml', 'ci-data-minimal.yml']) {
    assert.equal(existsSync(path.join(root, '.github/workflows', workflow)), false, workflow + ' must remain retired');
  }
  assert.doesNotMatch(read('server/allLogs.ts'), /exportRepairSnapshot|immofinder\/listings/);
});


test('ImmoGR search diagnostics expose provider failures and a direct ZIP download', () => {
  const page = read('src/ImmoGR.tsx');
  const engine = read('server/immogr/index.ts');
  assert.match(page, /downloadAllLogs/);
  assert.match(page, /Download logs/);
  assert.doesNotMatch(page, /Last search diagnostics/);
  assert.match(page, /body\.reason/);
  assert.match(engine, /discovery_failed/);
  assert.match(engine, /attemptedModels/);
  assert.match(engine, /requestId/);
  assert.match(engine, /providerStatus/);
});

test('Google service-account JSON is classified as secret in diagnostics', () => {
  const config = read('server/diagnosticsConfig.ts');
  const redaction = read('server/redact.ts');
  assert.match(config, /SERVICE_ACCOUNT/);
  assert.match(redaction, /GOOGLE_SERVICE_ACCOUNT_JSON/);
  assert.match(redaction, /CREDENTIALS_JSON/);
});

test('migration health check excludes archived ImmoFinder migrations exactly like the runner', () => {
  const diagnostics = read('server/projectDiagnostics.ts');
  const runner = read('scripts/migrate.mjs');
  assert.match(diagnostics, /isRetiredImmoFinderMigration/);
  assert.match(diagnostics, /activeOnDisk = onDisk\.filter\(\(file\) => !isRetiredImmoFinderMigration\(file\)\)/);
  assert.match(diagnostics, /archived ImmoFinder excluded/);
  assert.match(runner, /isRetiredImmoFinderMigration/);
});
