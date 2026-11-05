/**
 * Category: governance — version/patch identity, Navigator protocol, workflow pins, test layout.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));

test('package patch metadata is internally consistent', () => {
  assert.equal(String(pkg.version), '126');
  assert.match(String(pkg.patch), /^126\.\d+$/);
  assert.ok(pkg.patch.startsWith(`${pkg.version}.`));
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
