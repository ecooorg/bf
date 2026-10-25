/** P93.7: bounded local verification harness. Never installs dependencies or calls live providers. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const totalBudgetMs = Math.max(30_000, Math.min(570_000, Number(process.env.BIFORGE_TEST_BUDGET_MS) || 570_000));
const startedAt = Date.now();
const logDir = process.env.BIFORGE_TEST_LOG_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p93-7-tests-'));
fs.mkdirSync(logDir, { recursive: true });
const report = { schemaVersion: 1, patch: 'P93.7', startedAt: new Date(startedAt).toISOString(), budgetMs: totalBudgetMs, node: process.version, platform: process.platform, cwd: root, dependenciesPresent: fs.existsSync(path.join(root, 'node_modules')), capabilities: { viteInstalled: fs.existsSync(path.join(root, 'node_modules/vite/package.json')), typescriptInstalled: fs.existsSync(path.join(root, 'node_modules/typescript/package.json')), tsxInstalled: fs.existsSync(path.join(root, 'node_modules/tsx/package.json')), playwrightInstalled: fs.existsSync(path.join(root, 'node_modules/playwright/package.json')), browserTestsRequested: process.env.BIFORGE_RUN_BROWSER_TESTS === 'true', databaseConfigured: Boolean(process.env.DATABASE_URL), liveProviderCalls: false, installsDependencies: false }, results: [], summary: {} };
const commands = [
  { id: 'version', args: ['scripts/check-version.mjs'], timeoutMs: 15_000, requiresDeps: false },
  { id: 'copy-lint', args: ['scripts/lint-copy.mjs'], timeoutMs: 20_000, requiresDeps: false },
  { id: 'architecture', args: ['scripts/architectureCheckBoundaries.mjs'], timeoutMs: 20_000, requiresDeps: false },
  { id: 'vite-build', args: ['node_modules/vite/bin/vite.js', 'build'], timeoutMs: 75_000, requiresDeps: true },
  { id: 'server-typecheck', args: ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.server.json'], timeoutMs: 75_000, requiresDeps: true },
  { id: 'app-builder-tests', args: ['node_modules/tsx/dist/cli.mjs', '--test', 'tests/app-builder-contracts.test.mjs', 'tests/app-builder-engine-p93-2a.test.mjs', 'tests/app-builder-validators-p93-2b.test.mjs', 'tests/app-builder-recovery-p93-3.test.mjs', 'tests/app-builder-adapter-p93-3.test.mjs'], timeoutMs: 65_000, requiresDeps: true },
  { id: 'diagnostics-tests', args: ['node_modules/tsx/dist/cli.mjs', '--test', 'tests/project-diagnostics-p92.test.mjs', 'tests/ci-diagnostics-chain.test.mjs', 'tests/content-disposition-p93.test.mjs'], timeoutMs: 45_000, requiresDeps: true },
  { id: 'security-tests', args: ['node_modules/tsx/dist/cli.mjs', '--test', 'tests/security.test.mjs'], timeoutMs: 35_000, requiresDeps: true },
  { id: 'core-tests', args: ['node_modules/tsx/dist/cli.mjs', '--test', 'tests/core.test.mjs'], timeoutMs: 35_000, requiresDeps: true },
  { id: 'project-mode-tests', args: ['node_modules/tsx/dist/cli.mjs', '--test', 'tests/project-mode.test.mjs'], timeoutMs: 35_000, requiresDeps: true },
  { id: 'integration-and-db-tests', args: ['node_modules/tsx/dist/cli.mjs', '--test', 'tests/integrations.test.mjs', 'tests/database.test.mjs'], timeoutMs: 45_000, requiresDeps: true },
  { id: 'model-cascade-and-rate-tests', args: ['node_modules/tsx/dist/cli.mjs', '--test', 'tests/model-cascade-p93-5.test.mjs'], timeoutMs: 25_000, requiresDeps: true },
];
if (process.env.BIFORGE_RUN_BROWSER_TESTS === 'true') commands.push({ id: 'browser-ui-tests', args: ['node_modules/tsx/dist/cli.mjs', 'tests/ui-check.mjs'], timeoutMs: 60_000, requiresDeps: true });
function run(command, timeoutMs) {
  return new Promise((resolve) => {
    const t0 = Date.now(); let stdout = ''; let stderr = ''; let settled = false;
    const child = spawn(process.execPath, command.args, { cwd: root, env: { ...process.env, CI: process.env.CI || '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 1500).unref(); }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d.toString(); }); child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (e) => finish({ status: 'FAIL', exitCode: null, error: e.message }));
    child.on('close', (code, signal) => finish({ status: code === 0 ? 'PASS' : Date.now() - t0 >= timeoutMs ? 'TIMEOUT' : 'FAIL', exitCode: code, signal }));
    function finish(out) { if (settled) return; settled = true; clearTimeout(timer); const durationMs = Date.now() - t0; resolve({ ...out, durationMs, stdout, stderr, logFile: null }); }
    command.id = command.id || 'step';
  });
}
for (const step of commands) {
  const remaining = totalBudgetMs - (Date.now() - startedAt);
  if (remaining <= 1000) { report.results.push({ id: step.id, status: 'NOT RUN', reason: 'global 9.5-minute budget exhausted' }); continue; }
  if (step.requiresDeps && !report.dependenciesPresent) { report.results.push({ id: step.id, status: 'BLOCKED', reason: 'node_modules is absent; harness will not install packages or use network' }); continue; }
  const timeoutMs = Math.max(1000, Math.min(step.timeoutMs, remaining));
  const r = await run({ ...step, id: step.id }, timeoutMs);
  const logFile = path.join(logDir, `${step.id}.log`);
  fs.writeFileSync(logFile, `COMMAND: ${process.execPath} ${step.args.join(' ')}\nSTATUS: ${r.status}\nEXIT: ${r.exitCode}\nDURATION_MS: ${r.durationMs}\n\n--- STDOUT ---\n${r.stdout}\n--- STDERR ---\n${r.stderr}\n`);
  const { stdout, stderr, ...metadata } = r;
  report.results.push({ id: step.id, ...metadata, logFile });
  console.log(`${metadata.status.padEnd(8)} ${step.id} (${metadata.durationMs} ms)${metadata.reason ? ` — ${metadata.reason}` : ''}`);
}
const statuses = report.results.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
report.finishedAt = new Date().toISOString(); report.durationMs = Date.now() - startedAt; report.logDirectory = logDir;
report.summary = { ...statuses, passed: statuses.PASS || 0, failed: (statuses.FAIL || 0) + (statuses.TIMEOUT || 0), blocked: statuses.BLOCKED || 0, notRun: statuses['NOT RUN'] || 0, withinBudget: report.durationMs <= totalBudgetMs };
const reportPath = process.env.BIFORGE_TEST_REPORT || path.join(logDir, 'report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`REPORT ${reportPath}`); console.log(`LOGS ${logDir}`); console.log(`SUMMARY ${JSON.stringify(report.summary)}`);
if (report.summary.failed > 0 || !report.summary.withinBudget) process.exitCode = 1;
else if (report.summary.blocked > 0 || report.summary.notRun > 0) process.exitCode = 2;
