/**
 * Category: governance — version/patch identity, Navigator protocol, workflow pins, test layout.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));

test('package patch metadata is internally consistent', () => {
  assert.match(String(pkg.version), /^\d+$/);
  assert.match(String(pkg.patch), /^\d+(?:\.\d+)*[a-z]?$/);
  assert.equal(String(pkg.version), String(pkg.patch).replace(/[a-z]$/, '').split('.')[0]);
  assert.ok(String(pkg.patch).startsWith(`${pkg.version}.`) || String(pkg.patch) === String(pkg.version));
});

test('test layout: only approved category files under tests/ (no per-patch pNNN files)', () => {
  const files = readdirSync(path.join(root, 'tests')).filter((f) => f.endsWith('.mjs') || f.endsWith('.ts'));
  const forbidden = files.filter((f) => /^p\d{2,3}/i.test(f) || /-p\d{2,3}/i.test(f) || /^c\d{3}-/i.test(f));
  assert.deepEqual(forbidden, [], `per-patch test files are forbidden: ${forbidden.join(', ')}`);
  const required = [
    'agents-contract.test.mjs',
    'governance-repo.test.mjs',
    'providers-models.test.mjs',
    'conversation-simple-direct.test.mjs',
    'diagnostics-ops.test.mjs',
    'security-redact.test.mjs',
    'security-headers.test.mjs',
  ];
  for (const f of required) {
    assert.ok(files.includes(f), `missing category suite ${f}`);
  }
});

test('npm scripts do not add per-patch test:pNNN entry points', () => {
  const bad = Object.keys(pkg.scripts || {}).filter((k) => /^test:p\d+/i.test(k) || k === 'test:architect-lab');
  assert.deepEqual(bad, [], `remove per-patch scripts: ${bad.join(', ')}`);
  assert.ok(pkg.scripts['test:core'], 'test:core required');
  assert.match(pkg.scripts['test:core'], /agents-contract/);
});

test('AGENTS.md binds test category rule and hard gates', () => {
  const agents = read('AGENTS.md');
  assert.match(agents, /Repository minimalism and test lifecycle/);
  assert.match(agents, /category suite|TEST_MAP|per-patch/i);
});

test('TEST_MAP.md exists and lists category suites', () => {
  assert.ok(existsSync(path.join(root, 'docs/TEST_MAP.md')));
  const map = read('docs/TEST_MAP.md');
  assert.match(map, /agents-contract/);
  assert.match(map, /providers-models/);
  assert.match(map, /diagnostics-ops/);
});

test('workflow action pins suite enforces immutable SHAs', () => {
  const pins = read('tests/governance-workflow-pins.test.mjs');
  assert.match(pins, /pinned to a full immutable commit SHA/);
  assert.match(pins, /actions\/checkout/);
});

test('docs layout: only allowlisted prose and machine JSON under docs/', () => {
  const docsDir = path.join(root, 'docs');
  assert.ok(existsSync(docsDir), 'docs/ must exist');
  const allowProse = new Set([
    'ARCHITECTURE.md', 'API_CONTRACTS.md', 'TESTING_AND_ACCEPTANCE.md',
    'USER_VALUE_EVALUATION.md', 'SECURITY_AND_PRIVACY.md', 'OPERATIONS_AND_RELEASES.md',
    'DATA_AND_ARTIFACTS.md', 'DECISIONS.md', 'TEST_MAP.md', 'MODEL_REGISTRY.md', 'VIX-CONCEPT.md', 'EXPERIMENTS.md', 'BIFORGE Perestroika.md',
  ]);
  const names = readdirSync(docsDir);
  const nested = names.filter((n) => {
    try { return statSync(path.join(docsDir, n)).isDirectory(); } catch { return false; }
  });
  assert.deepEqual(nested, [], `docs/ must not contain nested folders: ${nested.join(', ')}`);
  const prose = names.filter((n) => n.endsWith('.md'));
  const badProse = prose.filter((n) => !allowProse.has(n));
  assert.deepEqual(badProse, [], `docs/ prose not on allowlist: ${badProse.join(', ')}`);
  const cycleLike = prose.filter((n) => /^C\d{3}_/i.test(n) || /AUDIT-REPORT|DIAGNOSTIC_REPORT|REMEDIATION|web-search-analysis/i.test(n));
  assert.deepEqual(cycleLike, [], `cycle/audit report markdown forbidden under docs/: ${cycleLike.join(', ')}`);
  const other = names.filter((n) => !n.endsWith('.md') && !n.endsWith('.json'));
  assert.deepEqual(other, [], `docs/ only .md and .json allowed: ${other.join(', ')}`);
  for (const req of ['ARCHITECTURE.md', 'TEST_MAP.md', 'MODEL_REGISTRY.md', 'DECISIONS.md']) {
    assert.ok(prose.includes(req), `missing canonical prose ${req}`);
  }
});

test('AGENTS.md binds documentation layout rule', () => {
  const agents = read('AGENTS.md');
  assert.match(agents, /Documentation layout \(binding\)/);
  assert.match(agents, /MODEL_REGISTRY/);
  assert.match(agents, /open only on explicit Navigator request|VIX-CONCEPT/);
});

test('scripts layout: no per-patch tools; integrity allowlist present', () => {
  const dir = path.join(root, 'scripts');
  const names = readdirSync(dir);
  const patchLike = names.filter((n) => /^p\d{2,3}/i.test(n) || /-p\d{2,3}/i.test(n) || /p108|p93-7|architect-dual-compare/i.test(n));
  assert.deepEqual(patchLike, [], `per-patch or retired lab scripts forbidden: ${patchLike.join(', ')}`);
  assert.ok(names.includes('scripts-integrity.mjs'), 'scripts-integrity.mjs required');
  assert.ok(names.includes('run-dag.mjs') && names.includes('docs-integrity.mjs'));
  const agents = read('AGENTS.md');
  assert.match(agents, /Scripts layout \(binding\)/);
});

test('package.json has no no-op retired test:* scripts; DAG ids match real scripts', () => {
  const scripts = pkg.scripts || {};
  const noop = Object.entries(scripts).filter(([k, v]) =>
    /^test:/.test(k) && /retired|folded|NOT_RUN|console\.log\(|echo "/.test(String(v)) && /exit 0/.test(String(v))
  ).map(([k]) => k);
  assert.deepEqual(noop, [], `remove no-op test scripts: ${noop.join(', ')}`);
  assert.ok(!scripts['architect:dual-compare'], 'architect:dual-compare must not remain');
  const manifest = JSON.parse(read('docs/verification-manifest.json'));
  const ids = (manifest.checks || []).map((c) => c.id);
  for (const dead of ['test:files', 'test:pipeline', 'test:workspace', 'test:database', 'test:web', 'test:turn', 'test:gates', 'test:integrations', 'test:compact-ci-artifacts', 'test:database:live', 'test:bx06:api', 'test:carousel-unit-retired-placeholder']) {
    assert.ok(!ids.includes(dead), `manifest must not list ${dead}`);
  }
  for (const live of ['test:core', 'test:models', 'docs-integrity', 'build']) {
    assert.ok(ids.includes(live), `manifest missing ${live}`);
  }
});

test('config has single model-sources.json (no yaml twin)', () => {
  assert.ok(existsSync(path.join(root, 'config/model-sources.json')));
  assert.ok(!existsSync(path.join(root, 'config/model-sources.yaml')));
  assert.ok(!existsSync(path.join(root, 'config/model-sources.yml')));
});

