import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planVerification, validateTestChain } from '../scripts/verificationPlannerLib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const separateCiSteps = ['lint', 'test', 'test:live', 'test:ui', 'verify:connections', 'test:database:live', 'test:bx06:api', 'verify:change', 'architecture:check', 'architecture:impact', 'architecture:map'];

test('P87 project ZIP task suggests targeted negative cases and never executes checks', () => {
  const plan = planVerification({ task: 'Fix Project Mode ZIP download', changedFiles: ['server/projectRoutes.ts'], scripts: pkg.scripts, separateCiSteps });
  assert.equal(plan.status, 'PLANNED');
  assert.ok(plan.suggestedCommands.some((x) => x.script === 'test:project'));
  assert.ok(plan.suggestedCommands.some((x) => x.script === 'check' && x.required));
  assert.ok(plan.counterexamples.some((x) => /Empty or malformed archive/.test(x)));
  assert.ok(plan.suggestedCommands.every((x) => x.status === 'SUGGESTED_NOT_RUN'));
  assert.ok(plan.requiredFullGates.some((x) => x.name === 'GitHub Actions required workflow' && x.status === 'NOT_RUN'));
});

test('P87 security and database changes cannot be fast-only', () => {
  for (const changed of ['server/auth.ts', 'server/migrations/004.sql']) {
    const plan = planVerification({ changedFiles: [changed], scripts: pkg.scripts, separateCiSteps });
    assert.ok(plan.suggestedCommands.some((x) => x.tier === 'targeted'), changed);
    assert.ok(plan.requiredFullGates.some((x) => x.command === 'npm run check'), changed);
    assert.ok(plan.requiredFullGates.some((x) => x.command === 'npm run build'), changed);
  }
});

test('P87 only recommends npm scripts that exist', () => {
  const plan = planVerification({ task: 'Change user interface', changedFiles: ['src/UserGuide.tsx'], scripts: pkg.scripts, separateCiSteps });
  for (const item of plan.suggestedCommands) assert.ok(pkg.scripts[item.script], item.script);
});

test('P87 marks unrecognized files as partial rather than inventing coverage', () => {
  const plan = planVerification({ changedFiles: ['odd/place/newthing.zzz'], scripts: pkg.scripts, separateCiSteps });
  assert.equal(plan.status, 'PARTIAL');
  assert.match(plan.coverage, /UNKNOWN_OR_PARTIAL/);
  assert.ok(plan.uncertainties.some((x) => x.includes('without a recognized ownership rule')));
});

test('P87 P56 test-chain invariant catches a test script omitted from check and CI', () => {
  const fakeScripts = { check: 'npm run typecheck', 'test:example': 'node --test tests/example.test.mjs', typecheck: 'tsc --noEmit' };
  const errors = validateTestChain(fakeScripts, []);
  assert.ok(errors.some((x) => x.includes('test:example')));
});

test('P87 planner detects the repository test-chain contract without violations', () => {
  const errors = validateTestChain(pkg.scripts, separateCiSteps);
  assert.deepEqual(errors, []);
});

test('P87 missing npm script referenced by check blocks the plan', () => {
  const plan = planVerification({ task: 'review source tooling', changedFiles: ['scripts/newTool.mjs'], scripts: { check: 'npm run missing-check', build: 'vite build', typecheck: 'tsc --noEmit' }, separateCiSteps: [] });
  assert.equal(plan.status, 'BLOCKED');
  assert.ok(plan.testChain.errors.some((x) => x.includes('missing-check')));
});
