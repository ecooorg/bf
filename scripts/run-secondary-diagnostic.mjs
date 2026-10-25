// P93.9 second diagnostic phase, reached only when the minimum gate is green.
// Both checks run even if one fails so a single CI run collects both outcomes.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'artifacts', 'ci-checks'); fs.mkdirSync(dir, { recursive: true });
const tasks = [
  { id: 'test-regression', script: 'test:regression', timeoutMs: 90_000 },
  { id: 'test-pipeline', script: 'test:pipeline', timeoutMs: 330_000 },
];
const rows = [];
for (const task of tasks) {
  const logPath = path.join(dir, `${task.id}.log`), out = fs.createWriteStream(logPath);
  const start = Date.now(); let timedOut = false, settled = false;
  const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', task.script], { cwd: root, env: { ...process.env, CI: process.env.CI || '1' }, stdio: ['ignore','pipe','pipe'], shell: process.platform === 'win32', detached: process.platform !== 'win32' });
  const collect = (chunk) => { out.write(chunk); process.stdout.write(chunk); };
  child.stdout.on('data', collect); child.stderr.on('data', collect);
  const timer = setTimeout(() => { timedOut = true; try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {} }, task.timeoutMs);
  await new Promise((resolve) => {
    const finish = (status, code, signal, note) => { if (settled) return; settled = true; clearTimeout(timer); out.end(); const row = { id: task.id, script: task.script, status, exitCode: code, signal, note, durationMs: Date.now()-start, log: path.relative(root, logPath) }; rows.push(row); console.log(`[${status}] ${task.id} (${(row.durationMs/1000).toFixed(1)}s)`); resolve(); };
    child.on('error', (e) => finish('FAIL', null, null, e.message));
    child.on('close', (code, signal) => finish(timedOut ? 'TIMEOUT' : code === 0 ? 'PASS' : 'FAIL', code, signal));
  });
}
const prev = (() => { try { return JSON.parse(fs.readFileSync(path.join(dir,'diagnostic-results.json'),'utf8')); } catch { return null; } })();
const failed = rows.filter((r) => r.status !== 'PASS');
const summary = { schemaVersion: 2, phase: 'secondary-diagnostic', mode: 'collect-all-then-gate', startedAt: prev?.startedAt || null, finishedAt: new Date().toISOString(), summary: Object.fromEntries(['PASS','FAIL','TIMEOUT'].map((s) => [s.toLowerCase(), rows.filter((r) => r.status === s).length])), failed: failed.map((r) => r.id), results: rows };
fs.writeFileSync(path.join(dir,'secondary-results.json'), JSON.stringify(summary,null,2)+'\n');
// Preserve primary results in a combined report input.
const combined = { schemaVersion: 2, phase: 'all-diagnostics', mode: 'collect-all-then-gate', results: [...(prev?.results || []), ...rows] };
combined.summary = Object.fromEntries(['PASS','FAIL','TIMEOUT'].map((s) => [s.toLowerCase(), combined.results.filter((r) => r.status === s).length]));
combined.failed = combined.results.filter((r) => r.status !== 'PASS').map((r) => r.id);
fs.writeFileSync(path.join(dir,'results.json'), JSON.stringify(combined,null,2)+'\n');
console.log(`Secondary diagnostics: ${summary.summary.pass} PASS, ${summary.summary.fail} FAIL, ${summary.summary.timeout} TIMEOUT.`);
process.exitCode = failed.length ? 1 : 0;
