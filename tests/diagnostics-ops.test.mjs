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
  const bundle = read('server/immofinderPostRunBundle.ts');
  const server = read('server.ts');
  const store = read('server/immofinderRunDiagnostics.ts');
  const migration = read('migrations/028_immofinder_run_diagnostics.sql');
  const poll = read('.github/workflows/immofinder-diagnostics-poll.yml');
  // Persist happens in the post-run bundle (called from the durable worker completion path).
  assert.match(bundle, /persistImmoFinderRunDiagnostics\(runId, report\)/);
  assert.match(route, /publishPostRunBundle/);
  assert.match(route, /latestImmoFinderRunDiagnostics\(\)/);
  assert.match(route, /isImmoDiagnosticsCall/);
  assert.match(route, /if \(diagnosticsPoll\) return next\(\)/, 'read-only polling must not trigger repair bootstrap');
  assert.equal((route.match(/publishGitHubDiagnosticsAfterRun\(runId!, result, errors\)/g) || []).length, 1, 'manual and scheduled runs share the durable worker completion path');
  assert.equal((route.match(/startRun\(trigger, dryRun, \{ settings, wave, cycle: await realRunCount\(\) \}\)/g) || []).length, 2);
  assert.match(server, /installLogCapture\(\)/);
  assert.match(server, /isImmoDiagnosticsCall\(req\)/);
  assert.match(store, /INSERT INTO immofinder_run_diagnostics/);
  assert.match(store, /OFFSET 100/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS immofinder_run_diagnostics/);
  assert.match(poll, /workflow_dispatch/);
  assert.doesNotMatch(poll, /cron:|push:/, 'diagnostics polling is manual-only to avoid recurring Actions and Render costs');
  assert.match(poll, /scripts\/collect-platform-logs\.mjs/);
  assert.match(poll, /api\/immofinder\/diagnostics\/latest/);
  assert.match(poll, /contents: read/);
  assert.doesNotMatch(poll, /contents: write|Commit new run report/, 'diagnostics no longer commits to main');
});


test('P130.1 collects redacted Render and GitHub Actions logs as artifacts', () => {
  const workflow = read('.github/workflows/immofinder-diagnostics-poll.yml');
  const collector = read('scripts/collect-platform-logs.mjs');
  const patchTools = read('scripts/patch-tools.mjs');
  const integrity = read('scripts/scripts-integrity.mjs');
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /secrets.RENDER_API_KEY/);
  assert.match(workflow, /vars.RENDER_OWNER_ID/);
  assert.match(workflow, /vars.RENDER_SERVICE_ID/);
  assert.match(workflow, /scripts\/collect-platform-logs\.mjs/);
  assert.match(workflow, /retention-days: 30/);
  assert.match(collector, /api\.render\.com\/v1\/logs/);
  assert.match(collector, /nextStartTime/);
  assert.match(collector, /actions\/runs\/.*\/logs/);
  assert.match(collector, /REDACTED/);
  assert.match(collector, /r\.status===429\|\|r\.status>=500/);
  assert.match(collector, /retry-after/);
  assert.match(collector, /x-ratelimit-reset/);
  assert.match(collector, /serverDelay>0\?serverDelay:backoff/);
  assert.match(collector, /event:'api_retry'/);
  assert.match(collector, /if\(!report\.render&&!report\.github\)process\.exitCode=1/);
  assert.match(integrity, /collect-platform-logs\.mjs/);
});


test('P130.4 health check names the failing GitHub publisher and compares deployed commit with main', async () => {
  const { classifyPublisherFailures, countRuntimeSignals, searchQuality, runChecks, verdict, renderMarkdown } = await import('../scripts/immofinder-health-check.mjs');
  const logs = 'x github_diagnostics_write_failed_http_403_resource_not_accessible_by_integration_request_AB12-34 y github_app_contents_write_token_http_403 z gemini request timeout after 30s; TLS certificate verification failed';
  const failures = classifyPublisherFailures(logs);
  assert.deepEqual(failures.map((f) => [f.publisher, f.status]).sort(), [['diagnostics', 403], ['github_app_token', 403]]);
  assert.equal(failures.find((f) => f.publisher === 'diagnostics').requestId, 'AB12-34');
  assert.match(failures.find((f) => f.publisher === 'github_app_token').hint, /Contents: write/);
  assert.match(failures.find((f) => f.publisher === 'diagnostics').hint, /contents:write/);
  assert.equal(classifyPublisherFailures('github_app_contents_write_token_http_422')[0].status, 422);
  assert.deepEqual(countRuntimeSignals(logs), { geminiTimeouts: 1, sslWarnings: 1, http5xx: 0 });
  assert.equal(searchQuality({ result: { counts: { candidates: 57, credible_kept: 5 }, sourceStats: [{ id: 'a', consecutiveBad: 7 }] } }).quality, 5);

  const main = 'a'.repeat(40), deployed = 'b'.repeat(40);
  const files = new Map();
  const io = {
    exists: (p) => files.has(p),
    readFile: (p) => files.get(p),
    async getJson(url) {
      if (url.endsWith('/commits/main')) return { status: 200, body: { sha: main } };
      if (url.includes('/check-runs')) return { status: 200, body: { check_runs: [{ name: 'core', status: 'completed', conclusion: 'success' }] } };
      if (url.includes('/actions/workflows/')) return { status: 200, body: { workflow_runs: [{ conclusion: 'success', updated_at: '2026-11-21T00:00:00Z' }] } };
      if (url.endsWith('/health')) return { status: 200, body: { status: 'ok', version: '130', commit: deployed } };
      if (url.endsWith('/ready')) return { status: 200, body: { status: 'ready' } };
      if (url.includes('/compare/')) return { status: 200, body: { ahead_by: 2, files: [{ filename: 'data/immofinder/diagnostics/latest.json' }, { filename: 'server/immofinderCore.ts' }] } };
      if (url.includes('/diagnostics/latest')) return { status: 200, body: { report: { runId: 'r1', generatedAt: new Date().toISOString(), result: { counts: { candidates: 57, credible_kept: 5 }, sourceStats: [] } } } };
      throw new Error('unexpected ' + url);
    },
  };
  const env = { IMMOFINDER_BASE_URL: 'https://x.example', IMMOFINDER_RUN_SECRET: 's', GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'o/r' };
  files.set('data/immofinder/diagnostics/latest.json', JSON.stringify({ runId: 'old' }));
  const checks = await runChecks(env, io);
  const by = (name) => checks.find((c) => c.name === name);
  assert.equal(by('CI on main').status, 'OK');
  assert.equal(by('Service /health').status, 'OK');
  assert.equal(by('Deployed commit').status, 'WARN', 'a non-archive file separates production from main');
  const shortIo = { ...io, async getJson(url) { return url.endsWith('/health') ? { status: 200, body: { status: 'ok', version: '130', commit: main.slice(0, 7) } } : io.getJson(url); } };
  assert.equal((await runChecks(env, shortIo)).find((c) => c.name === 'Deployed commit').status, 'OK', 'production reports a 7-character commit');
  files.set('artifacts/platform-logs/collection-summary.json', JSON.stringify({ errors: [{ source: 'render', message: 'Render pagination safety limit exceeded' }] }));
  const collectorFailed = (await runChecks(env, io)).find((c) => c.name === 'Runtime signals');
  assert.equal(collectorFailed.status, 'WARN');
  assert.match(collectorFailed.detail, /collection failed/);
  files.delete('artifacts/platform-logs/collection-summary.json');
  assert.equal(by('Result quality').status, 'WARN', '5 of 10 quality listings is not complete');
  assert.equal(by('Archive').status, 'WARN', 'fresh run not yet archived is a warning, not a failure');
  assert.equal(by('GitHub publishers').status, 'SKIP', 'missing logs are SKIP, never OK');
  assert.equal(verdict(checks), 'WARN');
  assert.match(renderMarkdown(checks), /IMMOFINDER — DAILY HEALTH: WARN[\s\S]*PRIORITIES/);
  assert.equal(verdict([{ status: 'FAIL' }, { status: 'OK' }]), 'FAIL');
});

test('P130.4 health workflow is manual-only and uses the shared collector', () => {
  const wf = read('.github/workflows/immofinder-health.yml');
  assert.match(wf, /workflow_dispatch/);
  assert.doesNotMatch(wf, /cron:|push:/, 'health checks are manual to avoid recurring platform usage');
  assert.match(wf, /workflow_dispatch/);
  assert.match(wf, /issues: write/);
  assert.match(wf, /contents: write/, 'manual health snapshot publication remains explicitly available');
  assert.match(wf, /\[skip render\] \[skip ci\]/, 'health snapshots must never trigger Render deployments');
  assert.doesNotMatch(wf, /pull-requests: write|actions: write/);
  assert.match(wf, /RENDER_LOG_LOOKBACK_MINUTES: '180'/, 'a 24 h window exceeds the collector pagination limit');
  assert.match(wf, /scripts\/collect-platform-logs\.mjs/);
  assert.match(wf, /scripts\/immofinder-health-check\.mjs/);
  assert.match(read('scripts/scripts-integrity.mjs'), /immofinder-health-check\.mjs/);
});

test('P130.5 health check reports the live probe and downgrades old log failures when it is OK', async () => {
  const { runChecks } = await import('../scripts/immofinder-health-check.mjs');
  const logs = 'github_app_contents_write_token_http_422_the_level_of_access';
  const mk = (verdict) => ({
    exists: (p) => p.endsWith('render-logs.jsonl'), readFile: () => logs,
    async getJson(url) {
      if (url.includes('/github/probe')) return { status: 200, body: { probe: { verdict, cause: verdict === 'OK' ? 'none' : 'permission_not_accepted_on_installation', fix: 'accept it', app: { slug: 'x', permissions: { contents: 'write' } }, installation: { account: 'o', repositorySelection: 'selected', permissions: { contents: verdict === 'OK' ? 'write' : 'read' } }, steps: [{ step: 'installation', httpStatus: 200, message: '', requestId: '' }] } } };
      return { status: 404, body: null };
    },
  });
  const env = { IMMOFINDER_BASE_URL: 'https://x.example', IMMOFINDER_RUN_SECRET: 's' };
  const bad = await runChecks(env, mk('FAIL'));
  assert.equal(bad.find((c) => c.name === 'GitHub App (live)').status, 'FAIL');
  assert.match(bad.find((c) => c.name === 'GitHub App (live)').detail, /permission_not_accepted_on_installation.*installation on o holds/);
  assert.equal(bad.find((c) => c.name === 'Publisher github_app_token').status, 'FAIL');
  const good = await runChecks(env, mk('OK'));
  assert.equal(good.find((c) => c.name === 'GitHub App (live)').status, 'OK');
  assert.equal(good.find((c) => c.name === 'Publisher github_app_token').status, 'WARN', 'old log failures are history once the probe is OK');
});

test('P130.5 workflows: health snapshots skip Render and diagnostics polling is manual-only', () => {
  const health = read('.github/workflows/immofinder-health.yml');
  assert.match(health, /workflow_dispatch/);
  assert.doesNotMatch(health, /cron:|push:/);
  assert.match(health, /HEALTH_SNAPSHOT_DIR: data\/immofinder\/health/);
  assert.match(health, /\[skip ci\]/);
  const poll = read('.github/workflows/immofinder-diagnostics-poll.yml');
  assert.match(poll, /Collect Render and GitHub Actions logs\n\s+if: \$\{\{ failure\(\) \|\| github\.event_name == 'workflow_dispatch' \}\}/);
  assert.doesNotMatch(poll, /cron: '\*\/5/);
});

test('P131.7a bot data commits carry [skip render] so they do not redeploy a running service', () => {
  const snap = read('server/immofinderSnapshot.ts');
  assert.match(snap, /publish search diagnostics ' \+ runId \+ ' \[skip render\]'/);
  assert.match(snap, /encrypted listings snapshot [^`]*\[skip render\]`/);
});
