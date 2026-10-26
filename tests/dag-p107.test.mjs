import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadManifest, validateManifest, selectProfile, decide, childEnv, timeoutScale, nextRunnable } from '../scripts/dagLib.mjs';
import { validateArtifact } from '../scripts/schemaValidate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const real = loadManifest(path.join(root, 'docs/verification-manifest.json'));
const DEFAULTS = { timeoutMs: 5000, memoryLimitMb: 512, safeToRun: true, parallelGroup: null, critical: false, needs: [], requiresEnv: [], env: {}, phase: 'check' };
const node = (code) => ['node', '-e', code];
const mk = (checks, extra = {}) => ({ kind: 'verification-manifest', profiles: { t: 't', u: 'u' }, defaults: DEFAULTS, checks: checks.map((c) => ({ profiles: ['t'], ...c })), ...extra });
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `biforge-p107-${name}-`));
function runDag(manifest, extraArgs = [], env = {}) {
  const dir = tmp('run');
  const file = path.join(dir, 'manifest.json');
  fs.writeFileSync(file, JSON.stringify(manifest));
  const r = spawnSync(process.execPath, ['scripts/run-dag.mjs', '--profile', 't', '--manifest', file, ...extraArgs], { cwd: root, encoding: 'utf8', env: { ...process.env, DAG_ALLOW_UNSAFE: '', DAG_CONCURRENCY: '', DAG_TIMEOUT_SCALE: '', DAG_TEST_DATABASE_URL: '', NODE_OPTIONS: '', CI_LOGS_DIR: dir, GITHUB_SHA: 'abc1234', ...env } });
  const read = (n) => { try { return JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')); } catch { return null; } };
  return { r, dir, results: read('results.json'), evidence: read('evidence-dag.json'), status: (id) => read('results.json')?.results.find((x) => x.id === id) };
}
const report = (dir, env) => { spawnSync(process.execPath, ['scripts/patch-quality-report.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, CI_LOGS_DIR: dir, GITHUB_SHA: 'abc1234', ...env } }); return fs.readFileSync(path.join(dir, 'NEXT_PATCH.md'), 'utf8'); };
const rm = (dir) => fs.rmSync(dir, { recursive: true, force: true });

test('P107 the real manifest is valid and its check profile keeps every legacy check', () => {
  assert.deepEqual(validateManifest(real), []);
  const ids = selectProfile(real, 'check').map((c) => c.id);
  const legacy = ['version-consistency', 'lint:copy', 'typecheck', 'test:core', 'test:models', 'test:security', 'test:files', 'test:workspace', 'test:database', 'test:integrations', 'test:project', 'test:gates', 'test:pipeline', 'test:web', 'test:turn', 'test:regression', 'test:app-builder', 'test:project-diagnostics', 'test:compact-ci-artifacts'];
  assert.deepEqual(legacy.filter((id) => !ids.includes(id)), []);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.check, 'node scripts/run-dag.mjs --profile check');
});

test('P107 the ci profile adds the critical probes, database stages and build, with the legacy limits kept', () => {
  const ci = new Map(selectProfile(real, 'ci').map((c) => [c.id, c]));
  for (const id of ['critical-router-selection', 'critical-router-policy-call-limit', 'critical-gemini-timeout', 'critical-app-builder-recovery', 'db-migrate', 'test:database:live', 'test:bx06:api', 'build']) assert.ok(ci.has(id), id);
  const legacyMs = { 'critical-router-selection': 20000, 'critical-gemini-timeout': 20000, 'test:core': 75000, 'test:models': 75000, 'test:files': 75000, 'test:app-builder': 150000, 'test:project': 120000, typecheck: 120000, 'test:regression': 90000, 'test:pipeline': 330000 };
  for (const [id, ms] of Object.entries(legacyMs)) assert.ok(ci.get(id).timeoutMs >= ms, `${id} timeout must not be lower than ${ms}`);
  for (const id of ['test:core', 'test:models', 'test:files', 'test:app-builder', 'test:project', 'typecheck']) {
    assert.equal(ci.get(id).critical, true);
    assert.equal(ci.get(id).needs.length, 4, `${id} waits for the four critical probes`);
  }
  for (const id of ['db-migrate', 'test:database:live', 'test:bx06:api']) { assert.equal(ci.get(id).safeToRun, false); assert.ok(ci.get(id).requiresEnv.includes('DAG_TEST_DATABASE_URL')); }
  assert.deepEqual(ci.get('test:database:live').needs, ['db-migrate']);
  assert.deepEqual(ci.get('test:bx06:api').needs, ['db-migrate']);
  const check = new Set(selectProfile(real, 'check').map((c) => c.id));
  for (const id of ['db-migrate', 'test:database:live', 'test:bx06:api', 'build']) assert.equal(check.has(id), false, `${id} is CI-only`);
});

test('P107 invalid manifests are rejected: cycle, missing prerequisite, duplicate id, profile gap, bad limits', () => {
  const ok = { id: 'a', argv: node('0') };
  assert.match(validateManifest(mk([{ ...ok, needs: ['b'] }, { id: 'b', argv: node('0'), needs: ['a'] }])).join('|'), /dependency cycle: a -> b -> a|dependency cycle: b -> a -> b/);
  assert.match(validateManifest(mk([{ ...ok, needs: ['a'] }])).join('|'), /needs itself/);
  assert.match(validateManifest(mk([{ ...ok, needs: ['ghost'] }])).join('|'), /missing prerequisite ghost/);
  assert.match(validateManifest(mk([ok, ok])).join('|'), /duplicate check id: a/);
  assert.match(validateManifest(mk([{ id: 'p', argv: node('0'), profiles: ['t', 'u'], needs: ['q'] }, { id: 'q', argv: node('0') }])).join('|'), /prerequisite q is absent from profile u/);
  assert.match(validateManifest(mk([{ ...ok, timeoutMs: 10 }])).join('|'), /timeoutMs/);
  assert.match(validateManifest(mk([{ ...ok, profiles: ['nope'] }])).join('|'), /unknown profile nope/);
  assert.match(validateManifest(mk([{ ...ok, argv: [] }])).join('|'), /argv/);
  assert.match(validateManifest(mk([{ ...ok, safeToRun: 'yes' }])).join('|'), /safeToRun/);
  for (const bad of [mk([{ ...ok, needs: ['ghost'] }]), mk([{ ...ok, needs: ['a'] }])]) {
    const run = runDag(bad);
    try { assert.equal(run.r.status, 2); assert.match(run.r.stderr, /manifest rejected/); assert.equal(run.results, null, 'no results are written for a rejected manifest'); } finally { rm(run.dir); }
  }
});

test('P107 planted failure: sibling branches finish, dependants are BLOCKED with the prerequisite named, status is not PASS', () => {
  const run = runDag(mk([
    { id: 'a', argv: node('process.exit(1)') }, { id: 'b', argv: node('0'), needs: ['a'] },
    { id: 'c', argv: node('console.log("c")') }, { id: 'd', argv: node('0'), needs: ['c'] },
    { id: 'e', argv: node('0'), needs: ['b'] },
  ]));
  try {
    assert.equal(run.r.status, 1);
    assert.deepEqual(['a', 'b', 'c', 'd', 'e'].map((id) => run.status(id).status), ['FAIL', 'BLOCKED', 'PASS', 'PASS', 'BLOCKED']);
    assert.deepEqual(run.status('b').blockedBy, ['a']);
    assert.match(run.status('b').note, /prerequisite a \(FAIL\)/);
    assert.deepEqual(run.status('e').blockedBy, ['b']);
    assert.equal(run.status('b').log, undefined, 'a blocked check has no log');
    assert.deepEqual(run.results.failed, ['a']);
    assert.deepEqual(run.results.blocked.map((x) => x.id).sort(), ['b', 'e']);
    assert.equal(validateArtifact(run.evidence, 'evidence-record').ok, true);
    assert.equal(run.evidence.status, 'FAIL');
    assert.equal(run.evidence.items.find((i) => i.id === 'b').provenance.status, 'BLOCKED');
    assert.match(report(run.dir, { CI_STATUS: 'failure' }), /PATCH_STATUS=FAILED/);
    assert.doesNotMatch(report(run.dir, { CI_STATUS: 'success' }), /PATCH_STATUS=PASSED/);
  } finally { rm(run.dir); }
});

test('P107 a time limit produces TIMEOUT and blocks dependants; DAG_TIMEOUT_SCALE can only raise limits', () => {
  const slow = { id: 'slow', argv: node('setTimeout(() => {}, 30000)'), timeoutMs: 1000 };
  const run = runDag(mk([slow, { id: 'after', argv: node('0'), needs: ['slow'] }, { id: 'free', argv: node('0') }]));
  try {
    assert.equal(run.status('slow').status, 'TIMEOUT');
    assert.equal(run.status('slow').timeoutOrigin, 'runner-watchdog');
    assert.equal(run.status('after').status, 'BLOCKED');
    assert.equal(run.status('free').status, 'PASS');
    assert.equal(run.r.status, 1);
  } finally { rm(run.dir); }
  assert.equal(timeoutScale('0.1'), 1); assert.equal(timeoutScale('-5'), 1); assert.equal(timeoutScale('abc'), 1); assert.equal(timeoutScale('2.5'), 2.5);
  const scaled = runDag(mk([{ id: 'work', argv: node('setTimeout(() => {}, 1500)'), timeoutMs: 1000 }]), [], { DAG_TIMEOUT_SCALE: '0.01' });
  try { assert.equal(scaled.status('work').status, 'TIMEOUT', 'a scale below 1 must not lower the limit'); assert.equal(scaled.status('work').timeoutMs, 1000); } finally { rm(scaled.dir); }
});

test('P107 policy and environment: unsafe checks are SKIPPED_BY_POLICY with the rule, missing environment is BLOCKED, neither is a success', () => {
  const m = mk([{ id: 'unsafe', argv: node('0'), safeToRun: false }, { id: 'dep', argv: node('0'), needs: ['unsafe'] }, { id: 'env', argv: node('0'), requiresEnv: ['P107_ABSENT_VARIABLE'] }, { id: 'plain', argv: node('0') }]);
  const run = runDag(m);
  try {
    assert.equal(run.status('unsafe').status, 'SKIPPED_BY_POLICY');
    assert.match(run.status('unsafe').note, /safeToRun=false requires DAG_ALLOW_UNSAFE=true/);
    assert.equal(run.status('dep').status, 'BLOCKED'); assert.deepEqual(run.status('dep').blockedBy, ['unsafe']);
    assert.equal(run.status('env').status, 'BLOCKED'); assert.match(run.status('env').note, /P107_ABSENT_VARIABLE/);
    assert.equal(run.status('plain').status, 'PASS');
    assert.equal(run.r.status, 1);
    const text = report(run.dir, { CI_STATUS: 'success' });
    assert.match(text, /PATCH_STATUS=UNVERIFIED/); assert.doesNotMatch(text, /PATCH_STATUS=PASSED/);
    const gate = spawnSync(process.execPath, ['scripts/ci-evidence-gate.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, CI_LOGS_DIR: run.dir } });
    assert.equal(gate.status, 1);
  } finally { rm(run.dir); }
  const allowed = runDag(mk([{ id: 'unsafe', argv: node('0'), safeToRun: false }]), [], { DAG_ALLOW_UNSAFE: 'true' });
  try { assert.equal(allowed.status('unsafe').status, 'PASS'); assert.equal(allowed.r.status, 0); } finally { rm(allowed.dir); }
});

test('P107 children never inherit DATABASE_URL; a check declares it, values starting with $ come from the runner environment', () => {
  const probe = 'console.log("DB=" + (process.env.DATABASE_URL || "unset") + ";SSL=" + (process.env.PGSSLMODE || "unset") + ";NO=" + process.env.NODE_OPTIONS)';
  const run = runDag(mk([{ id: 'plain', argv: node(probe) }, { id: 'db', argv: node(probe), env: { DATABASE_URL: '$P107_DB', PGSSLMODE: 'disable' }, requiresEnv: ['P107_DB'] }]), [], { DATABASE_URL: 'postgres://leak', PGSSLMODE: 'require', P107_DB: 'postgres://declared' });
  try {
    const log = (id) => fs.readFileSync(path.join(run.dir, `${id}.log`), 'utf8');
    assert.match(log('plain'), /DB=unset;SSL=unset;NO=--max-old-space-size=512/);
    assert.match(log('db'), /DB=postgres:\/\/declared;SSL=disable/);
  } finally { rm(run.dir); }
  assert.equal(childEnv({ env: {}, memoryLimitMb: 900 }, { NODE_OPTIONS: '--max-old-space-size=100' }).NODE_OPTIONS, '--max-old-space-size=100');
});

test('P107 expected test output is enforced: a probe that passes without its target tests is FAIL', () => {
  const run = runDag(mk([{ id: 'probe', argv: node('console.log("something else")'), expectOutput: ['router: target test'] }]));
  try { assert.equal(run.status('probe').status, 'FAIL'); assert.match(run.status('probe').note, /Expected target test output missing/); } finally { rm(run.dir); }
});

test('P107 scheduling: only checks of the same non-null parallelGroup overlap, default concurrency is 1', () => {
  const nap = 'setTimeout(() => {}, 700)';
  const overlap = (a, b) => Date.parse(a.startedAt) < Date.parse(b.finishedAt) && Date.parse(b.startedAt) < Date.parse(a.finishedAt);
  const grouped = mk([{ id: 'g1', argv: node(nap), parallelGroup: 'static' }, { id: 'g2', argv: node(nap), parallelGroup: 'static' }, { id: 'x1', argv: node(nap) }]);
  let run = runDag(grouped, ['--concurrency', '3']);
  try {
    assert.equal(overlap(run.status('g1'), run.status('g2')), true, 'same group overlaps');
    assert.equal(overlap(run.status('g1'), run.status('x1')) || overlap(run.status('g2'), run.status('x1')), false, 'an ungrouped check runs alone');
    assert.equal(run.results.concurrency, 3);
  } finally { rm(run.dir); }
  run = runDag(grouped);
  try { assert.equal(overlap(run.status('g1'), run.status('g2')), false, 'concurrency 1 never overlaps'); assert.equal(run.results.concurrency, 1); } finally { rm(run.dir); }
  const a = { id: 'a', parallelGroup: 'x' }; const b = { id: 'b', parallelGroup: 'x' }; const c = { id: 'c', parallelGroup: null };
  assert.deepEqual(nextRunnable([a, b, c], [], 2).map((x) => x.id), ['a', 'b']);
  assert.deepEqual(nextRunnable([c, a], [], 2).map((x) => x.id), ['c']);
  assert.deepEqual(nextRunnable([a], [c], 2), []);
});

test('P107 decide(): prerequisite failure outranks policy and environment; --plan lists the real profiles without running anything', () => {
  const statuses = new Map([['p', 'FAIL']]);
  assert.equal(decide({ needs: ['p'], safeToRun: false, requiresEnv: ['X'] }, statuses, {}, false).status, 'BLOCKED');
  assert.equal(decide({ needs: [], safeToRun: false, requiresEnv: ['X'] }, statuses, {}, false).status, 'SKIPPED_BY_POLICY');
  assert.equal(decide({ needs: [], safeToRun: true, requiresEnv: ['X'] }, statuses, { X: 'v' }, false).action, 'run');
  for (const [profile, count] of [['check', selectProfile(real, 'check').length], ['ci', selectProfile(real, 'ci').length]]) {
    const r = spawnSync(process.execPath, ['scripts/run-dag.mjs', '--profile', profile, '--plan'], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).checks.length, count);
  }
  assert.equal(spawnSync(process.execPath, ['scripts/run-dag.mjs', '--profile', 'nope', '--plan'], { cwd: root, encoding: 'utf8' }).status, 2);
});
