// P107: verification DAG library. Pure functions only (no process spawning, no filesystem writes).
// Manifest: docs/verification-manifest.json. Executor: scripts/run-dag.mjs.
import fs from 'node:fs';

export const MANIFEST_PATH = 'docs/verification-manifest.json';
const PASSING = 'PASS';
const MAX_TIMEOUT_MS = 3_600_000;

export function loadManifest(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Check with manifest defaults applied. */
export function withDefaults(manifest, check) {
  return { ...(manifest.defaults || {}), ...check };
}

/** Returns a list of error strings; empty means the manifest is valid. */
export function validateManifest(manifest) {
  const errors = [];
  const fail = (msg) => errors.push(msg);
  if (!manifest || typeof manifest !== 'object') return ['manifest is not an object'];
  if (manifest.kind !== 'verification-manifest') fail('kind must be "verification-manifest"');
  if (!manifest.profiles || typeof manifest.profiles !== 'object') fail('profiles must be an object');
  if (!Array.isArray(manifest.checks) || !manifest.checks.length) return [...errors, 'checks must be a non-empty array'];
  const profiles = new Set(Object.keys(manifest.profiles || {}));
  const byId = new Map();
  for (const raw of manifest.checks) {
    const id = raw && typeof raw.id === 'string' ? raw.id : '';
    if (!id) { fail('a check has no id'); continue; }
    if (byId.has(id)) { fail(`duplicate check id: ${id}`); continue; }
    byId.set(id, withDefaults(manifest, raw));
  }
  for (const [id, c] of byId) {
    if (!Array.isArray(c.argv) || !c.argv.length || !c.argv.every((a) => typeof a === 'string' && a.length)) fail(`${id}: argv must be a non-empty array of strings`);
    if (!Array.isArray(c.profiles) || !c.profiles.length) fail(`${id}: profiles must be a non-empty array`);
    else for (const p of c.profiles) if (!profiles.has(p)) fail(`${id}: unknown profile ${p}`);
    if (!Number.isInteger(c.timeoutMs) || c.timeoutMs < 1000 || c.timeoutMs > MAX_TIMEOUT_MS) fail(`${id}: timeoutMs must be an integer between 1000 and ${MAX_TIMEOUT_MS}`);
    if (!Number.isInteger(c.memoryLimitMb) || c.memoryLimitMb < 256) fail(`${id}: memoryLimitMb must be an integer >= 256`);
    if (typeof c.safeToRun !== 'boolean') fail(`${id}: safeToRun must be boolean`);
    if (typeof c.critical !== 'boolean') fail(`${id}: critical must be boolean`);
    if (c.parallelGroup !== null && (typeof c.parallelGroup !== 'string' || !c.parallelGroup)) fail(`${id}: parallelGroup must be null or a non-empty string`);
    if (!Array.isArray(c.needs) || !c.needs.every((n) => typeof n === 'string')) fail(`${id}: needs must be an array of ids`);
    if (!Array.isArray(c.requiresEnv) || !c.requiresEnv.every((n) => typeof n === 'string')) fail(`${id}: requiresEnv must be an array of names`);
    if (!c.env || typeof c.env !== 'object' || Array.isArray(c.env)) fail(`${id}: env must be an object`);
    for (const n of Array.isArray(c.needs) ? c.needs : []) {
      if (n === id) fail(`${id}: needs itself`);
      else if (!byId.has(n)) fail(`${id}: missing prerequisite ${n}`);
      else if (Array.isArray(c.profiles) && Array.isArray(byId.get(n).profiles)) {
        const lacking = c.profiles.filter((p) => !byId.get(n).profiles.includes(p));
        if (lacking.length) fail(`${id}: prerequisite ${n} is absent from profile ${lacking.join(', ')}`);
      }
    }
  }
  if (!errors.length) {
    const cycle = findCycle(byId);
    if (cycle) fail(`dependency cycle: ${cycle.join(' -> ')}`);
  }
  return errors;
}

function findCycle(byId) {
  const state = new Map();
  const stack = [];
  const visit = (id) => {
    if (state.get(id) === 2) return null;
    if (state.get(id) === 1) return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 1); stack.push(id);
    for (const n of byId.get(id).needs || []) { const cycle = visit(n); if (cycle) return cycle; }
    stack.pop(); state.set(id, 2);
    return null;
  };
  for (const id of byId.keys()) { const cycle = visit(id); if (cycle) return cycle; }
  return null;
}

/** Checks of one profile in manifest order, defaults applied. Throws on an unknown profile. */
export function selectProfile(manifest, profile) {
  if (!manifest.profiles || !(profile in manifest.profiles)) throw new Error(`unknown profile: ${profile}`);
  return manifest.checks.map((c) => withDefaults(manifest, c)).filter((c) => c.profiles.includes(profile));
}

/** Child environment: never inherits DATABASE_URL/PGSSLMODE; `$NAME` values come from the runner environment. */
export function childEnv(check, base, memoryOption) {
  const env = { ...base };
  delete env.DATABASE_URL; delete env.PGSSLMODE;
  for (const [key, value] of Object.entries(check.env || {})) {
    env[key] = typeof value === 'string' && value.startsWith('$') ? String(base[value.slice(1)] ?? '') : String(value);
  }
  const flag = `--max-old-space-size=${check.memoryLimitMb}`;
  if (memoryOption !== false && !/--max-old-space-size=/.test(env.NODE_OPTIONS || '')) env.NODE_OPTIONS = `${env.NODE_OPTIONS ? `${env.NODE_OPTIONS} ` : ''}${flag}`;
  return env;
}

/** Timeout scale can only raise limits. */
export function timeoutScale(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/**
 * Decision before a check starts. `statuses` maps finished check ids to their final status.
 * Returns { action: 'run' } or { action: 'settle', status, reason, blockedBy? }.
 * Precedence: unsatisfied prerequisite (BLOCKED) > policy (SKIPPED_BY_POLICY) > missing environment (BLOCKED).
 */
export function decide(check, statuses, env, allowUnsafe) {
  const bad = (check.needs || []).filter((id) => statuses.get(id) !== PASSING);
  if (bad.length) {
    return { action: 'settle', status: 'BLOCKED', blockedBy: bad, reason: `blocked by prerequisite ${bad.map((id) => `${id} (${statuses.get(id) || 'NOT_RUN'})`).join(', ')}` };
  }
  if (check.safeToRun === false && !allowUnsafe) {
    return { action: 'settle', status: 'SKIPPED_BY_POLICY', reason: 'safeToRun=false requires DAG_ALLOW_UNSAFE=true' };
  }
  const missing = (check.requiresEnv || []).filter((name) => !String(env[name] ?? '').trim());
  if (missing.length) return { action: 'settle', status: 'BLOCKED', reason: `required environment missing: ${missing.join(', ')}` };
  return { action: 'run' };
}

/**
 * Checks that may start now, in manifest order. `pending` are check objects not yet started whose prerequisites all passed.
 * With nothing running any check may start; otherwise only checks sharing a non-null parallelGroup with every running check.
 */
export function nextRunnable(pending, running, concurrency) {
  const out = [];
  for (const check of pending) {
    if (running.length + out.length >= concurrency) break;
    const peers = [...running, ...out];
    if (peers.length && !peers.every((p) => check.parallelGroup !== null && p.parallelGroup === check.parallelGroup)) continue;
    out.push(check);
  }
  return out;
}
