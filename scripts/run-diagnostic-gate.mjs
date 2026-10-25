// P96: deterministic critical-first runner with durable per-probe evidence.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
fs.mkdirSync(dir, { recursive: true });
const critical = [
  { id: 'critical-router-selection', file: 'tests/models.test.mjs', pattern: 'router: deterministic selection with recorded rejections', expected: ['router: deterministic selection with recorded rejections'], timeoutMs: 20_000 },
  { id: 'critical-router-policy-call-limit', file: 'tests/critical-router-policy-call-limit.test.mjs', expected: ['router: invalid request stops before fallback', 'router: policy rejection stops before fallback', 'router: call limit stops after maxCalls'], timeoutMs: 20_000 },
  { id: 'critical-gemini-timeout', file: 'tests/models.test.mjs', pattern: 'conformance gemini: timeout', expected: ['conformance gemini: timeout'], timeoutMs: 20_000 },
  { id: 'critical-app-builder-recovery', file: 'tests/app-builder-recovery-p93-3.test.mjs', pattern: 'recovery: interrupted on unit three, resume reuses completed units without regenerating|cancellation stops before the next unit and reports cancelled', expected: ['recovery: interrupted on unit three, resume reuses completed units without regenerating', 'cancellation stops before the next unit and reports cancelled'], timeoutMs: 20_000 },
];
const suites = [
  { id: 'test-core', script: 'test:core', timeoutMs: 75_000 },
  { id: 'test-models', script: 'test:models', timeoutMs: 75_000 },
  { id: 'test-files', script: 'test:files', timeoutMs: 75_000 },
  { id: 'test-app-builder', script: 'test:app-builder', timeoutMs: 150_000 },
  { id: 'test-verification-plan', script: 'test:verification-plan', timeoutMs: 45_000 },
  { id: 'test-project', script: 'test:project', timeoutMs: 120_000 },
  { id: 'typecheck', script: 'typecheck', timeoutMs: 120_000 },
];
const results = [];
const startedAt = new Date().toISOString();
const nodeVersion = process.version;
const npmVersion = (() => { try { return fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8').match(/"lockfileVersion"\s*:\s*(\d+)/)?.[1] ? 'see package-lock.json' : 'unknown'; } catch { return 'unknown'; } })();
const summaryPath = path.join(dir, 'results.json');
function persist(phase, extra = {}) {
  const failed = results.filter((r) => r.status === 'FAIL' || r.status === 'TIMEOUT');
  const summary = {
    schemaVersion: 4, phase, mode: 'critical-probes-then-collect-all-minimum-suites',
    startedAt, updatedAt: new Date().toISOString(), finishedAt: extra.finishedAt || null,
    active: extra.active || null,
    commit: process.env.GITHUB_SHA || 'local/unknown', nodeVersion, platform: process.platform,
    criticalFailed: results.filter((r) => r.phase === 'critical' && r.status !== 'PASS').map((r) => r.id),
    suitesSkipped: Boolean(extra.suitesSkipped),
    summary: Object.fromEntries(['PASS','FAIL','TIMEOUT','SKIPPED'].map((s) => [s.toLowerCase(), results.filter((r) => r.status === s).length])),
    failed: failed.map((r) => r.id), results,
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'diagnostic-results.json'), JSON.stringify(summary, null, 2) + '\n');
}
function run(task, args, logName, stage) {
  return new Promise((resolve) => {
    const logPath = path.join(dir, logName);
    const start = Date.now();
    const started = new Date().toISOString();
    let settled = false;
    let watchdogExpired = false;
    let timeoutHandle;
    const command = task.script ? (process.platform === 'win32' ? 'npm.cmd' : 'npm') : process.execPath;
    const childArgs = task.script ? ['run', task.script] : args;
    const child = spawn(command, childArgs, {
      cwd: root,
      env: { ...process.env, CI: process.env.CI || '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      detached: process.platform !== 'win32',
    });
    const tail = [];
    let carry = '';
    const capture = (chunk) => {
      const text = chunk.toString();
      fs.appendFileSync(logPath, text);
      process.stdout.write(text);
      const parts = (carry + text).split(/\r?\n/);
      carry = parts.pop() || '';
      for (const line of parts) { tail.push(line); if (tail.length > 160) tail.shift(); }
    };
    fs.writeFileSync(logPath, '');
    persist('running', { active: { id: task.id, phase: stage, command, args: childArgs, sourceFile: task.file || null, targetPattern: task.pattern || null, timeoutMs: task.timeoutMs, nodeTestTimeoutMs: task.script ? null : 15_000, watchdogTimeoutMs: task.timeoutMs, startedAt: started, pid: child.pid || null, log: path.relative(root, logPath) } });
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    const finish = async (row) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      if (carry) tail.push(carry);
      const logText = (() => { try { return fs.readFileSync(logPath, 'utf8'); } catch { return ''; } })();
      const internalTimeout = /test timed out after|testTimeoutFailure|ERR_TEST_FAILURE.*timeout/i.test(logText);
      const externalTimeout = watchdogExpired;
      const timeoutOrigin = internalTimeout ? 'node-test-timeout' : externalTimeout ? 'runner-watchdog' : null;
      let status = row.status;
      if (internalTimeout || externalTimeout) status = 'TIMEOUT';
      if (status === 'PASS' && task.expected) {
        const missing = task.expected.filter((name) => !logText.includes(name));
        if (missing.length) { status = 'FAIL'; row.note = `Expected target test output missing; possible name-pattern mismatch: ${missing.join('; ')}`; }
      }
      const result = {
        id: task.id, phase: stage, status,
        script: task.script || `${process.execPath} ${args.map((arg) => JSON.stringify(arg)).join(' ')}`,
        command: command, args: childArgs, cwd: root,
        nodeTestTimeoutMs: task.script ? null : 15_000, watchdogTimeoutMs: task.timeoutMs,
        sourceFile: task.file || null, targetPattern: task.pattern || null,
        expectedTestNames: task.expected || [],
        timeoutMs: task.timeoutMs, timeoutOrigin,
        exitCode: row.exitCode ?? null, signal: row.signal || null,
        pid: child.pid || null, startedAt: started, finishedAt: new Date().toISOString(),
        durationMs: Date.now() - start, log: path.relative(root, logPath),
        lastOutput: tail.slice(-35), ...(row.note ? { note: row.note } : {}),
      };
      results.push(result);
      persist('running', { suitesSkipped: results.some((r) => r.status === 'SKIPPED'), active: null });
      console.log(`[${result.status}] ${task.id} (${(result.durationMs / 1000).toFixed(1)}s; exit=${result.exitCode ?? 'null'}; timeout=${result.timeoutOrigin || 'none'})`);
      resolve(result);
    };
    timeoutHandle = setTimeout(() => {
      watchdogExpired = true;
      try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {}
    }, task.timeoutMs);
    child.on('error', (error) => { void finish({ status: 'FAIL', exitCode: null, note: `spawn error: ${error.message}` }); });
    child.on('close', (code, signal) => {
      const logText = (() => { try { return fs.readFileSync(logPath, 'utf8'); } catch { return ''; } })();
      const timedOut = watchdogExpired || /test timed out after|testTimeoutFailure|ERR_TEST_FAILURE.*timeout/i.test(logText);
      void finish({ status: timedOut ? 'TIMEOUT' : code === 0 ? 'PASS' : 'FAIL', exitCode: code, signal });
    });
  });
}
console.log(`P96 critical-first diagnostic gate: ${critical.length} targeted probes start before broad suites, typecheck, or database migrations; node=${nodeVersion}; platform=${process.platform}.`);
persist('critical-probes', { suitesSkipped: false });
for (const task of critical) {
  const args = ['--import', 'tsx', '--test', '--test-timeout=15000'];
  if (task.pattern) args.push('--test-name-pattern', task.pattern);
  args.push(task.file);
  await run(task, args, `${task.id}.log`, 'critical');
}
const criticalFailed = results.filter((r) => r.phase === 'critical' && r.status !== 'PASS');
let suitesSkipped = false;
if (criticalFailed.length) {
  suitesSkipped = true;
  for (const task of suites) results.push({
    id: task.id, phase: 'minimum-suite', script: task.script, log: `${task.id}.log`,
    status: 'SKIPPED', exitCode: null, durationMs: 0, timeoutMs: task.timeoutMs,
    note: 'Skipped because one or more first-wave critical probes failed.',
  });
  persist('critical-failed', { suitesSkipped: true, active: null });
  console.error(`Critical probes failed (${criticalFailed.map((r) => r.id).join(', ')}); broad suites/typecheck intentionally skipped.`);
} else {
  console.log('All first-wave critical probes passed; now run the complete minimum diagnostic suite.');
  for (const task of suites) await run(task, [], `${task.id}.log`, 'minimum-suite');
}
const failed = results.filter((r) => r.status === 'FAIL' || r.status === 'TIMEOUT');
const final = {
  schemaVersion: 4, phase: 'critical-first-minimum', mode: 'critical-probes-then-collect-all-minimum-suites',
  startedAt, finishedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA || 'local/unknown',
  nodeVersion, platform: process.platform, criticalFailed: criticalFailed.map((r) => r.id), suitesSkipped, active: null,
  summary: Object.fromEntries(['PASS','FAIL','TIMEOUT','SKIPPED'].map((s) => [s.toLowerCase(), results.filter((r) => r.status === s).length])),
  failed: failed.map((r) => r.id), results,
};
fs.writeFileSync(summaryPath, JSON.stringify(final, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'diagnostic-results.json'), JSON.stringify(final, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'diagnostic-gate.env'), `DIAGNOSTIC_GATE=${failed.length ? 'failed' : 'passed'}\nDIAGNOSTIC_PASSED_SCRIPTS=${results.filter((r) => r.status === 'PASS' && r.script).map((r) => r.script).join(',')}\n`);
console.log(`Diagnostic gate complete: ${final.summary.pass} PASS, ${final.summary.fail} FAIL, ${final.summary.timeout} TIMEOUT, ${final.summary.skipped} SKIPPED.`);
process.exitCode = failed.length ? 1 : 0;
