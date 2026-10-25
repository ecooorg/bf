// CI runner: execute every command in package.json's check chain independently.
// A failed or timed-out check is recorded, but never suppresses later checks.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const check = pkg.scripts?.check;
if (typeof check !== 'string') {
  console.error('package.json has no check script');
  process.exit(2);
}
const scriptNames = [...new Set([...check.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)].map((m) => m[1]))];
const skipScripts = new Set(String(process.env.CHECK_SKIP_SCRIPTS || '').split(',').map((s) => s.trim()).filter(Boolean));
const tasks = [['version-consistency', process.execPath, ['scripts/check-version.mjs']]];
for (const name of scriptNames) {
  if (skipScripts.has(name)) { console.log(`[SKIP already passed in diagnostic gate] ${name}`); continue; }
  if (!pkg.scripts[name]) tasks.push([`unknown-${name}`, 'npm', ['run', name]]);
  else tasks.push([name, process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', name]]);
}
const logDir = path.join(root, 'artifacts', 'ci-checks');
fs.mkdirSync(logDir, { recursive: true });
const results = [];
const startedAt = new Date().toISOString();
const previousDoc = (() => { try { return JSON.parse(fs.readFileSync(path.join(logDir, 'results.json'), 'utf8')); } catch { return null; } })();
const previousResults = Array.isArray(previousDoc?.results) ? previousDoc.results : [];
const limitMs = Math.min(600_000, Math.max(1_000, Number(process.env.CHECK_TIMEOUT_MS) || 600_000));

function run(id, command, args) {
  return new Promise((resolve) => {
    const logPath = path.join(logDir, `${id.replace(/[^a-zA-Z0-9_-]/g, '_')}.log`);
    const log = fs.createWriteStream(logPath, { flags: 'w' });
    const started = Date.now();
    let tail = '';
    let settled = false;
    let timedOut = false;
    console.log(`\n[RUN] ${id}: ${command} ${args.join(' ')} (timeout ${Math.round(limitMs / 1000)}s)`);
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, CI: process.env.CI || '1' },
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    const collect = (chunk) => {
      log.write(chunk);
      tail = (tail + chunk.toString()).slice(-6000);
      process.stdout.write(chunk);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch {}
    }, limitMs);
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      log.end();
      const result = { id, status: 'FAIL', durationMs: Date.now() - started, log: path.relative(root, logPath), note: error.message };
      results.push(result);
      console.log(`[FAIL] ${id}: ${error.message}`);
      resolve();
    });
    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      log.end();
      const status = timedOut ? 'TIMEOUT' : code === 0 ? 'PASS' : 'FAIL';
      const result = { id, status, exitCode: code, signal, durationMs: Date.now() - started, log: path.relative(root, logPath), tail: status === 'PASS' ? '' : tail.trim().split(/\r?\n/).slice(-8).join('\n') };
      results.push(result);
      console.log(`[${status}] ${id}: ${(result.durationMs / 1000).toFixed(1)}s; log ${result.log}`);
      resolve();
    });
  });
}

console.log(`CI independent checks: ${tasks.length} stages; each limited to ${Math.round(limitMs / 1000)} seconds.`);
for (const task of tasks) await run(...task);
const merged = new Map();
for (const row of previousResults) merged.set(row.id, row);
for (const row of results) merged.set(row.id, row);
const allResults = [...merged.values()];
const summary = {
  schemaVersion: 2, phase: 'remaining-checks', startedAt: previousDoc?.startedAt || startedAt, finishedAt: new Date().toISOString(),
  skippedScripts: [...skipScripts],
  summary: Object.fromEntries(['PASS', 'FAIL', 'TIMEOUT'].map((s) => [s.toLowerCase(), allResults.filter((r) => r.status === s).length])),
  results: allResults,
};
fs.writeFileSync(path.join(logDir, 'results.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(`\nCI cumulative summary: ${summary.summary.pass} PASS, ${summary.summary.fail} FAIL, ${summary.summary.timeout} TIMEOUT; ran ${results.length} remaining checks, skipped ${skipScripts.size} already-covered scripts.`);
console.log(`Detailed logs: ${path.relative(root, logDir)}`);
process.exitCode = results.some((r) => r.status === 'FAIL' || r.status === 'TIMEOUT') ? 1 : 0;
