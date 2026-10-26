import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boundedAttemptPlan, inspectRepairDiff, writeAttemptRecord } from './boundedRepairLibP108.mjs';
import { loadManifest, validateManifest, selectProfile } from './dagLib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
if (!process.env.ENABLE_BOUNDED_REPAIR) {
  console.error('BLOCKED: set ENABLE_BOUNDED_REPAIR=1 to opt in');
  process.exit(2);
}
const diffFile = opt('--diff-file');
const ids = (opt('--checks') || '').split(',').filter(Boolean);
const maxAttempts = Number(opt('--max-attempts') || 2);
const reportFile = path.resolve(opt('--report') || 'artifacts/repair/p108-attempts.json');
if (!diffFile || !fs.existsSync(path.resolve(diffFile))) { console.error('BLOCKED: --diff-file must name an existing diff'); process.exit(2); }
const guard = inspectRepairDiff(fs.readFileSync(path.resolve(diffFile), 'utf8'));
if (guard.length) { console.error(`REPAIR_REJECTED: ${guard.join(', ')}`); process.exit(3); }
const manifest = loadManifest(path.resolve(root, 'docs/verification-manifest.json'));
const problems = validateManifest(manifest);
if (problems.length) { console.error(`manifest rejected: ${problems.join('; ')}`); process.exit(2); }
const checks = new Map(selectProfile(manifest, 'check').map((c) => [c.id, c]));
if (ids.some((id) => !checks.has(id))) { console.error(`BLOCKED: unknown check id(s): ${ids.filter((id) => !checks.has(id)).join(', ')}`); process.exit(2); }
let plan;
try { plan = boundedAttemptPlan(ids, maxAttempts); } catch (e) { console.error(e.message); process.exit(2); }
let recovered = false;
for (const attempt of plan) {
  const results = [];
  for (const id of attempt.checks) {
    const check = checks.get(id);
    const startedAt = Date.now();
    const run = spawnSync(check.argv[0], check.argv.slice(1), { cwd: root, encoding: 'utf8', timeout: check.timeoutMs, env: { ...process.env, NODE_OPTIONS: `--max-old-space-size=${check.memoryLimitMb || 4096}` } });
    const status = run.error?.code === 'ETIMEDOUT' ? 'TIMEOUT' : run.error ? 'UNKNOWN' : run.status === 0 ? 'PASS' : 'FAIL';
    results.push({ id, status, exitCode: run.status ?? null, startedAt, durationMs: null, logTail: String((run.stdout || '') + (run.stderr || '')).slice(-1200) });
    if (status !== 'PASS') allPass = false;
  }
  writeAttemptRecord(path.resolve(root, reportFile), { attempt: attempt.attempt, timestamp: new Date().toISOString(), checks: results, status: results.every((r) => r.status === 'PASS') ? 'PASS' : 'FAIL' });
  if (results.every((r) => r.status === 'PASS')) { recovered = true; break; }
}
process.exit(recovered ? 0 : 1);
