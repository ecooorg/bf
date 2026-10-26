// P107: verification DAG runner. One executor for `npm run check` (profile check) and hosted CI (profile ci).
//   node scripts/run-dag.mjs --profile <name> [--manifest <file>] [--concurrency <n>] [--plan]
// Independent checks always run to completion. A check whose prerequisite did not PASS is BLOCKED (prerequisite named);
// a check refused by policy is SKIPPED_BY_POLICY (rule named). Every row gets a P105 Evidence Record item. Exit 1 unless all checks PASS.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeEvidenceRecord, writeEvidenceRecord, addRecordName } from './evidenceLib.mjs';
import { MANIFEST_PATH, loadManifest, validateManifest, selectProfile, childEnv, timeoutScale, decide, nextRunnable } from './dagLib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const profile = opt('--profile');
if (!profile) { console.error('usage: node scripts/run-dag.mjs --profile <name> [--manifest <file>] [--concurrency <n>] [--plan]'); process.exit(2); }
const manifestFile = path.resolve(opt('--manifest') || path.join(root, MANIFEST_PATH));
let manifest;
try { manifest = loadManifest(manifestFile); } catch (error) { console.error(`manifest unreadable: ${error.message}`); process.exit(2); }
const problems = validateManifest(manifest);
if (problems.length) { console.error(`verification manifest rejected (${problems.length}):\n${problems.map((p) => `- ${p}`).join('\n')}`); process.exit(2); }
let checks;
try { checks = selectProfile(manifest, profile); } catch (error) { console.error(error.message); process.exit(2); }
const concurrency = Math.max(1, Math.min(8, Math.floor(Number(opt('--concurrency') || process.env.DAG_CONCURRENCY) || 1)));

if (args.includes('--plan')) {
  console.log(JSON.stringify({ profile, concurrency, checks: checks.map((c) => ({ id: c.id, needs: c.needs, timeoutMs: c.timeoutMs, memoryLimitMb: c.memoryLimitMb, safeToRun: c.safeToRun, parallelGroup: c.parallelGroup, critical: c.critical })) }, null, 2));
  process.exit(0);
}

const logDir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
fs.mkdirSync(logDir, { recursive: true });
for (const stale of ['results.json', 'evidence-dag.json']) fs.rmSync(path.join(logDir, stale), { force: true });
const scale = timeoutScale(process.env.DAG_TIMEOUT_SCALE);
const allowUnsafe = process.env.DAG_ALLOW_UNSAFE === 'true';
const revision = process.env.GITHUB_SHA || 'UNKNOWN';
const manifestSha = crypto.createHash('sha256').update(fs.readFileSync(manifestFile)).digest('hex').slice(0, 16);
const startedAt = new Date().toISOString();
const t0 = Date.now();
const byId = new Map(checks.map((c) => [c.id, c]));
const statuses = new Map();
const rows = [];
const running = [];
const activeInfo = new Map();
const safeName = (id) => id.replace(/[^a-zA-Z0-9_-]/g, '_');
const COUNTED = ['PASS', 'FAIL', 'TIMEOUT', 'BLOCKED', 'SKIPPED_BY_POLICY', 'NOT_RUN', 'UNKNOWN'];

function persist(finishedAt = null) {
  const doc = {
    schemaVersion: 5, phase: 'verification-dag', mode: 'dag', profile, manifest: { file: path.relative(root, manifestFile), sha256: manifestSha },
    concurrency, startedAt, updatedAt: new Date().toISOString(), finishedAt, wallClockMs: Date.now() - t0,
    commit: revision === 'UNKNOWN' ? 'local/unknown' : revision, nodeVersion: process.version, platform: process.platform,
    active: activeInfo.size ? [...activeInfo.values()][0] : null, activeAll: [...activeInfo.values()],
    summary: Object.fromEntries(COUNTED.map((s) => [s.toLowerCase(), rows.filter((r) => r.status === s).length])),
    failed: rows.filter((r) => r.status === 'FAIL' || r.status === 'TIMEOUT').map((r) => r.id),
    blocked: rows.filter((r) => r.status === 'BLOCKED' || r.status === 'SKIPPED_BY_POLICY').map((r) => ({ id: r.id, status: r.status, reason: r.note, blockedBy: r.blockedBy || [] })),
    evidence: addRecordName(null, 'evidence-dag.json'),
    results: rows,
  };
  fs.writeFileSync(path.join(logDir, 'results.json'), JSON.stringify(doc, null, 2) + '\n');
  return doc;
}

function settle(check, decision) {
  const now = new Date().toISOString();
  const row = {
    id: check.id, phase: check.phase, status: decision.status, command: check.argv[0], args: check.argv.slice(1), script: check.argv.join(' '),
    timeoutMs: check.timeoutMs, critical: check.critical, needs: check.needs, exitCode: null, signal: null, startedAt: now, finishedAt: now, durationMs: 0,
    note: decision.reason, ...(decision.blockedBy ? { blockedBy: decision.blockedBy } : {}),
  };
  rows.push(row); statuses.set(check.id, row.status);
  console.log(`[${row.status}] ${check.id}: ${decision.reason}`);
}

function execute(check) {
  return new Promise((resolve) => {
    const logName = `${safeName(check.id)}.log`;
    const logPath = path.join(logDir, logName);
    const limit = Math.round(check.timeoutMs * scale);
    const started = Date.now();
    const startedIso = new Date(started).toISOString();
    const command = check.argv[0] === 'node' ? process.execPath : (check.argv[0] === 'npm' && process.platform === 'win32' ? 'npm.cmd' : check.argv[0]);
    const out = fs.createWriteStream(logPath);
    const tail = []; let carry = ''; let settled = false; let watchdog = false;
    activeInfo.set(check.id, { id: check.id, phase: check.phase, log: logName, timeoutMs: limit, command: check.argv[0], args: check.argv.slice(1), startedAt: startedIso });
    persist();
    console.log(`\n[RUN] ${check.id}: ${check.argv.join(' ')} (timeout ${Math.round(limit / 1000)}s)`);
    const child = spawn(command, check.argv.slice(1), { cwd: root, env: childEnv(check, { ...process.env, CI: process.env.CI || '1', MODEL_MIN_INTERVAL_MS: '0' }), stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32', shell: process.platform === 'win32' });
    const collect = (chunk) => {
      out.write(chunk);
      if (concurrency === 1) process.stdout.write(chunk);
      const parts = (carry + chunk.toString()).split(/\r?\n/); carry = parts.pop() || '';
      for (const line of parts) { tail.push(line); if (tail.length > 160) tail.shift(); }
    };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    const timer = setTimeout(() => { watchdog = true; try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {} }, limit);
    const finish = (code, signal, note) => {
      if (settled) return; settled = true; clearTimeout(timer);
      if (carry) tail.push(carry);
      out.end(() => {
        const logText = (() => { try { return fs.readFileSync(logPath, 'utf8'); } catch { return ''; } })();
        const internal = /test timed out after|testTimeoutFailure|ERR_TEST_FAILURE.*timeout/i.test(logText);
        let status = watchdog || internal ? 'TIMEOUT' : (code === 0 ? 'PASS' : 'FAIL');
        let rowNote = note;
        if (status === 'PASS' && check.expectOutput?.length) {
          const missing = check.expectOutput.filter((name) => !logText.includes(name));
          if (missing.length) { status = 'FAIL'; rowNote = `Expected target test output missing; possible name-pattern mismatch: ${missing.join('; ')}`; }
        }
        const row = {
          id: check.id, phase: check.phase, status, command: check.argv[0], args: check.argv.slice(1), script: check.argv.join(' '),
          timeoutMs: limit, watchdogTimeoutMs: limit, nodeTestTimeoutMs: check.nodeTestTimeoutMs ?? null, timeoutOrigin: internal ? 'node-test-timeout' : watchdog ? 'runner-watchdog' : null,
          critical: check.critical, needs: check.needs, parallelGroup: check.parallelGroup, memoryLimitMb: check.memoryLimitMb,
          sourceFile: check.sourceFile || null, targetPattern: check.targetPattern || null, expectedTestNames: check.expectOutput || [],
          exitCode: code, signal: signal || null, startedAt: startedIso, finishedAt: new Date().toISOString(), durationMs: Date.now() - started, log: logName,
          ...(status === 'PASS' ? {} : { lastOutput: tail.slice(-35) }), ...(rowNote ? { note: rowNote } : {}),
        };
        rows.push(row); statuses.set(check.id, status); activeInfo.delete(check.id);
        persist();
        console.log(`[${status}] ${check.id} (${(row.durationMs / 1000).toFixed(1)}s; exit=${code ?? 'null'}; timeout=${row.timeoutOrigin || 'none'})`);
        resolve();
      });
    };
    child.on('error', (error) => finish(null, null, `spawn error: ${error.message}`));
    child.on('close', (code, signal) => finish(code, signal));
  });
}

console.log(`Verification DAG: profile=${profile}; ${checks.length} checks; concurrency=${concurrency}; manifest=${path.relative(root, manifestFile)} (${manifestSha}); unsafe checks ${allowUnsafe ? 'allowed' : 'refused'}.`);
persist();
const pending = [...checks];
const inflight = new Map();
while (pending.length || inflight.size) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const check of [...pending]) {
      if (!check.needs.every((n) => statuses.has(n))) continue;
      const decision = decide(check, statuses, process.env, allowUnsafe);
      if (decision.action !== 'settle') continue;
      pending.splice(pending.indexOf(check), 1); settle(check, decision); changed = true;
    }
  }
  const runnable = pending.filter((c) => c.needs.every((n) => statuses.has(n)));
  for (const check of nextRunnable(runnable, running, concurrency)) {
    pending.splice(pending.indexOf(check), 1); running.push(check);
    inflight.set(check.id, execute(check).then(() => { running.splice(running.indexOf(check), 1); inflight.delete(check.id); }));
  }
  if (inflight.size) await Promise.race(inflight.values());
  else if (pending.length) {
    for (const check of pending.splice(0)) settle(check, { status: 'NOT_RUN', reason: 'scheduler stalled before this check could start' });
  }
}
const doc = persist(new Date().toISOString());
try {
  writeEvidenceRecord(logDir, 'evidence-dag.json', makeEvidenceRecord(rows.map((r) => ({ id: r.id, status: r.status, command: [r.command, ...(r.args || [])].join(' '), startedAt: r.startedAt, finishedAt: r.finishedAt, log: r.log, note: r.note, critical: r.critical })), { revision }));
} catch (error) { console.error(`evidence record not written: ${error.message}`); }
const s = doc.summary;
console.log(`\nVerification DAG complete in ${(doc.wallClockMs / 1000).toFixed(1)}s: ${s.pass} PASS, ${s.fail} FAIL, ${s.timeout} TIMEOUT, ${s.blocked} BLOCKED, ${s.skipped_by_policy} SKIPPED_BY_POLICY.`);
for (const b of doc.blocked) console.log(`  ${b.status} ${b.id}: ${b.reason}`);
process.exitCode = rows.every((r) => r.status === 'PASS') ? 0 : 1;
