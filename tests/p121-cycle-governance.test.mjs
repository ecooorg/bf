import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));

function run(args) {
  return spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 30_000 });
}

test('C121 product version, patch identifier, and lockfile metadata agree', () => {
  assert.equal(pkg.version, '121');
  assert.match(pkg.patch, /^\d+\.\d+\.\d+$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages?.['']?.version, pkg.version);
  assert.equal(pkg.patch.split('.')[0], pkg.version);
});

test('Architect opens without a browser confirmation dialog', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.doesNotMatch(app, /Open Architect\?/);
  assert.match(app, /window\.location\.href = '\/project'/);
});

test('retired task and competing prose files are absent', () => {
  const retired = [
    'NEXT_' + 'PATCH.md',
    'docs/AI-USER-VALUE-SPEC.md', 'docs/AI-USER-VALUE-REPORT.md',
    'docs/AI-NATIVE-RENOVATION-ROADMAP.md', 'docs/AI-NATIVE-RENOVATION-TASK.md',
    'docs/AI-OPERATING-RULES.md', 'docs/AI-ENVIRONMENT-CONTEXT.md',
    'docs/OPERATIONS.md', 'docs/ARCHIVE-DELIVERY-CANON.md',
    'docs/architecture-guardrails.md', 'docs/DOCUMENTATION-INDEX.md',
    'docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md', 'docs/AUDIT-2026-10-29.md',
    'docs/P121_Browser_based_Model_Providers.md', 'docs/p119-p121.md',
  ];
  assert.deepEqual(retired.filter(existsSync), []);
});

test('canonical documentation integrity passes', () => {
  const result = run(['scripts/docs-integrity.mjs']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /docs:integrity PASS/);
});

test('P120 browser E2E preflight remains usable as regression coverage in C121', () => {
  const result = run(['scripts/p120-e2e-preflight.mjs']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /P120 regression E2E preflight: PASS/);
  assert.ok(result.stdout.includes(`current version ${pkg.version}, patch ${pkg.patch}`), result.stdout);
});


test('version metadata check reads package.json and validates lockfile', () => {
  const result = run(['scripts/version-metadata.mjs']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /version: PASS/);
});
