// P95: execute historically risky individual tests before broad suites/typecheck.
// Run every critical probe even when one fails; if any fail, do not spend time on full suites.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'artifacts', 'ci-checks');
fs.mkdirSync(dir, { recursive: true });
const critical = [
  { id: 'critical-router-selection', file: 'tests/models.test.mjs', pattern: 'router: deterministic selection with recorded rejections', expected: ['router: deterministic selection with recorded rejections'], timeoutMs: 20_000 },
  { id: 'critical-router-policy-call-limit', file: 'tests/models.test.mjs', pattern: 'router: invalid request and policy stop at once; call limit holds', expected: ['router: invalid request and policy stop at once; call limit holds'], timeoutMs: 20_000 },
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
function run(task, args, logName, stage) {
  return new Promise((resolve) => {
    const logPath = path.join(dir, logName);
    const output = fs.createWriteStream(logPath);
    const start = Date.now(); let settled = false; let timedOut = false;
    const command = task.script ? (process.platform === 'win32' ? 'npm.cmd' : 'npm') : process.execPath;
    const childArgs = task.script ? ['run', task.script] : args;
    const child = spawn(command, childArgs, { cwd: root, env: { ...process.env, CI: process.env.CI || '1' }, stdio: ['ignore','pipe','pipe'], shell: process.platform === 'win32', detached: process.platform !== 'win32' });
    const collect = (chunk) => { output.write(chunk); process.stdout.write(chunk); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    const timer = setTimeout(() => { timedOut = true; try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {} }, task.timeoutMs);
    const finish = (row) => { if (settled) return; settled = true; clearTimeout(timer); output.end(); const result = { id: task.id, phase: stage, script: task.script || `${task.file} --test-name-pattern=${task.pattern}`, log: path.relative(root, logPath), ...row, durationMs: Date.now()-start }; results.push(result); console.log(`[${result.status}] ${task.id} (${(result.durationMs/1000).toFixed(1)}s)`); resolve(result); };
    child.on('error', (e) => finish({ status: 'FAIL', exitCode: null, note: e.message }));
    child.on('close', (code, signal) => {
      let finalLog = ''; try { finalLog = fs.readFileSync(logPath, 'utf8'); } catch {}
      if (/test timed out after|ERR_TEST_FAILURE.*timeout/i.test(finalLog)) timedOut = true;
      if (!timedOut && code === 0 && task.expected) {
        let text = ''; try { text = fs.readFileSync(logPath, 'utf8'); } catch {}
        const missing = task.expected.filter((name) => !text.includes(name));
        if (missing.length) return finish({ status: 'FAIL', exitCode: code, signal, note: `Critical test name(s) not observed in output (possible pattern mismatch): ${missing.join('; ')}` });
      }
      finish({ status: timedOut ? 'TIMEOUT' : code === 0 ? 'PASS' : 'FAIL', exitCode: code, signal });
    });
  });
}
console.log(`P95 critical-first diagnostic gate: ${critical.length} targeted probes start before broad suites, typecheck, or database migrations.`);
for (const task of critical) {
  const args = ['--import', 'tsx', '--test', '--test-timeout=15000', `--test-name-pattern=${task.pattern}`, task.file];
  await run(task, args, `${task.id}.log`, 'critical');
}
const criticalFailed = results.filter((r) => r.phase === 'critical' && r.status !== 'PASS');
let suitesSkipped = false;
if (criticalFailed.length) {
  suitesSkipped = true;
  for (const task of suites) results.push({ id: task.id, phase: 'minimum-suite', script: task.script, log: `${task.id}.log`, status: 'SKIPPED', exitCode: null, durationMs: 0, note: 'Skipped because one or more first-wave critical probes failed.' });
  console.error(`Critical probes failed (${criticalFailed.map((r) => r.id).join(', ')}); broad suites/typecheck intentionally skipped.`);
} else {
  console.log('All first-wave critical probes passed; now run the complete minimum diagnostic suite.');
  // Run all minimum suites despite any failure so one run collects the complete diagnostic picture.
  for (const task of suites) await run(task, [], `${task.id}.log`, 'minimum-suite');
}
const failed = results.filter((r) => r.status === 'FAIL' || r.status === 'TIMEOUT');
const summary = {
  schemaVersion: 3, phase: 'critical-first-minimum', mode: 'critical-probes-then-collect-all-minimum-suites',
  startedAt, finishedAt: new Date().toISOString(), criticalFailed: criticalFailed.map((r) => r.id), suitesSkipped,
  summary: Object.fromEntries(['PASS','FAIL','TIMEOUT','SKIPPED'].map((s) => [s.toLowerCase(), results.filter((r) => r.status === s).length])),
  failed: failed.map((r) => r.id), results,
};
fs.writeFileSync(path.join(dir, 'diagnostic-results.json'), JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'diagnostic-gate.env'), `DIAGNOSTIC_GATE=${failed.length ? 'failed' : 'passed'}\nDIAGNOSTIC_PASSED_SCRIPTS=${results.filter((r) => r.status === 'PASS' && r.script).map((r) => r.script).join(',')}\n`);
console.log(`Diagnostic gate complete: ${summary.summary.pass} PASS, ${summary.summary.fail} FAIL, ${summary.summary.timeout} TIMEOUT, ${summary.summary.skipped} SKIPPED.`);
process.exitCode = failed.length ? 1 : 0;
