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


test('P130.0 ImmoFinder diagnostics are durably stored and polled without a Render GitHub token', () => {
  const route = read('server/immofinderRoutes.ts');
  const server = read('server.ts');
  const store = read('server/immofinderRunDiagnostics.ts');
  const migration = read('migrations/028_immofinder_run_diagnostics.sql');
  const poll = read('.github/workflows/immofinder-diagnostics-poll.yml');
  assert.match(route, /persistImmoFinderRunDiagnostics\(runId, report\)/);
  assert.match(route, /latestImmoFinderRunDiagnostics\(\)/);
  assert.match(route, /isImmoDiagnosticsCall/);
  assert.match(route, /if \(diagnosticsPoll\) return next\(\)/, 'read-only polling must not trigger repair bootstrap');
  assert.equal((route.match(/publishGitHubDiagnosticsAfterRun\(runId!, result, errors\)/g) || []).length, 2, 'manual and scheduled runs both persist diagnostics');
  assert.match(server, /installLogCapture\(\)/);
  assert.match(server, /isImmoDiagnosticsCall\(req\)/);
  assert.match(store, /INSERT INTO immofinder_run_diagnostics/);
  assert.match(store, /OFFSET 100/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS immofinder_run_diagnostics/);
  assert.match(poll, /cron: '\*\/5 \* \* \* \*'/);
  assert.match(poll, /api\/immofinder\/diagnostics\/latest/);
  assert.match(poll, /contents: write/);
});

\ntest('P130.1 collects redacted Render and GitHub Actions logs as artifacts', () => {
  const workflow = read('.github/workflows/immofinder-diagnostics-poll.yml');
  const collector = read('scripts/collect-platform-logs.mjs');
  const patchTools = read('scripts/patch-tools.mjs');
  const integrity = read('scripts/scripts-integrity.mjs');
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /secrets.RENDER_API_KEY/);
  assert.match(workflow, /vars.RENDER_OWNER_ID/);
  assert.match(workflow, /vars.RENDER_SERVICE_ID/);
  assert.match(workflow, /scripts\\/collect-platform-logs\\.mjs/);
  assert.match(workflow, /retention-days: 30/);
  assert.match(collector, /api\\.render\\.com\\/v1\\/logs/);
  assert.match(collector, /nextStartTime/);
  assert.match(collector, /actions\\/runs\\/.*\\/logs/);
  assert.match(collector, /REDACTED/);
  assert.match(patchTools, /data\\/immofinder\\/diagnostics/);
  assert.match(integrity, /collect-platform-logs\\.mjs/);
});
