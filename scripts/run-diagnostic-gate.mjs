// P93.9 diagnostic gate: run the minimum high-risk suite, collect every result,
// and stop only after the whole diagnostic set has completed.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logDir = path.join(root, 'artifacts', 'ci-checks');
fs.mkdirSync(logDir, { recursive: true });
const tasks = [
  { id: 'typecheck', script: 'typecheck', timeoutMs: 120_000 },
  { id: 'test-core', script: 'test:core', timeoutMs: 75_000 },
  { id: 'test-models', script: 'test:models', timeoutMs: 90_000 },
  { id: 'test-files', script: 'test:files', timeoutMs: 75_000 },
  { id: 'test-app-builder', script: 'test:app-builder', timeoutMs: 150_000 },
  { id: 'test-verification-plan', script: 'test:verification-plan', timeoutMs: 45_000 },
  { id: 'test-project', script: 'test:project', timeoutMs: 120_000 },
];
const results = [];
const startedAt = new Date().toISOString();
function run(task) {
  return new Promise((resolve) => {
    const logPath = path.join(logDir, `${task.id}.log`);
    const output = fs.createWriteStream(logPath);
    const started = Date.now();
    let settled = false;
    let timedOut = false;
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', task.script], {
      cwd: root, env: { ...process.env, CI: process.env.CI || '1' },
      stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32',
      detached: process.platform !== 'win32',
    });
    const collect = (chunk) => { output.write(chunk); process.stdout.write(chunk); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const timer = setTimeout(() => {
      timedOut = true;
      try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {}
    }, task.timeoutMs);
    const finish = (result) => {
      if (settled) return;
      settled = true; clearTimeout(timer); output.end();
      const row = { id: task.id, script: task.script, log: path.relative(root, logPath), ...result, durationMs: Date.now() - started };
      results.push(row);
      console.log(`[${row.status}] ${task.id} (${(row.durationMs / 1000).toFixed(1)}s)`);
      resolve(row);
    };
    child.on('error', (error) => finish({ status: 'FAIL', exitCode: null, note: error.message }));
    child.on('close', (code, signal) => finish({ status: timedOut ? 'TIMEOUT' : code === 0 ? 'PASS' : 'FAIL', exitCode: code, signal }));
  });
}
console.log(`P93.9 diagnostic gate: run all ${tasks.length} high-risk checks; do not stop at first failure.`);
for (const task of tasks) await run(task);
const failed = results.filter((r) => r.status !== 'PASS');
const summary = {
  schemaVersion: 2, phase: 'diagnostic-minimum', mode: 'collect-all-then-gate',
  startedAt, finishedAt: new Date().toISOString(),
  summary: Object.fromEntries(['PASS', 'FAIL', 'TIMEOUT'].map((s) => [s.toLowerCase(), results.filter((r) => r.status === s).length])),
  failed: failed.map((r) => r.id), results,
};
fs.writeFileSync(path.join(logDir, 'diagnostic-results.json'), JSON.stringify(summary, null, 2) + '\n');
// results.json is consumed by the report generator and kept as the current phase summary.
fs.writeFileSync(path.join(logDir, 'results.json'), JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(path.join(logDir, 'diagnostic-gate.env'), `DIAGNOSTIC_GATE=${failed.length ? 'failed' : 'passed'}\nDIAGNOSTIC_PASSED_SCRIPTS=${tasks.map((t) => t.script).join(',')}\n`);
console.log(`Diagnostic gate complete: ${summary.summary.pass} PASS, ${summary.summary.fail} FAIL, ${summary.summary.timeout} TIMEOUT.`);
if (failed.length) console.error(`Full checks/build will be skipped. Failed: ${failed.map((r) => `${r.id}:${r.status}`).join(', ')}`);
process.exitCode = failed.length ? 1 : 0;
