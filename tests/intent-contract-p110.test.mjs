import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildContract,
  semanticProblems,
  blocksApprovedPolicyClaim,
  gateContract,
  validateFileWithSchema,
} from '../scripts/intentContractLib.mjs';

test('P110 buildContract produces schema-shaped object with meta', () => {
  const c = buildContract({ goal: 'test goal', status: 'PASS', items: [] });
  assert.equal(c.meta.artifactType, 'intent-policy-contract');
  assert.equal(c.goal, 'test goal');
  assert.equal(c.status, 'PASS');
  assert.ok(Array.isArray(c.items));
});

test('P110 semantic: requirement/constraint/invariant with assumed or inferred source is rejected', () => {
  const bad = buildContract({
    goal: 'g',
    status: 'PASS',
    items: [
      { id: 'r1', kind: 'requirement', text: 'must do X', source: 'assumed' },
      { id: 'c1', kind: 'constraint', text: 'must not Y', source: 'inferred' },
      { id: 'i1', kind: 'invariant', text: 'always Z', source: 'assumed' },
    ],
  });
  const probs = semanticProblems(bad);
  assert.ok(probs.some((p) => p.includes('requirement') && p.includes('assumed')));
  assert.ok(probs.some((p) => p.includes('constraint') && p.includes('inferred')));
  assert.ok(probs.some((p) => p.includes('invariant') && p.includes('assumed')));
});

test('P110 semantic: assumption kind is allowed with any source; explicit requirement is allowed', () => {
  const good = buildContract({
    goal: 'g',
    status: 'PASS',
    items: [
      { id: 'a1', kind: 'assumption', text: 'we assume network is available', source: 'assumed' },
      { id: 'r1', kind: 'requirement', text: 'must validate input', source: 'explicit' },
      { id: 'ng1', kind: 'non_goal', text: 'not rewriting history', source: 'explicit' },
    ],
  });
  assert.deepEqual(semanticProblems(good), []);
});

test('P110 blocksApprovedPolicyClaim: UNKNOWN or PARTIAL status blocks', () => {
  assert.equal(blocksApprovedPolicyClaim(buildContract({ status: 'UNKNOWN', items: [] })), true);
  assert.equal(blocksApprovedPolicyClaim(buildContract({ status: 'PARTIAL', items: [] })), true);
  assert.equal(
    blocksApprovedPolicyClaim(
      buildContract({
        status: 'PASS',
        items: [{ id: 'r1', kind: 'requirement', text: 'x', source: 'explicit', criticality: 'critical' }],
      }),
    ),
    false,
  );
});

test('P110 blocksApprovedPolicyClaim: critical item with source unknown or assumed blocks', () => {
  const c = buildContract({
    status: 'PASS',
    items: [
      { id: 'r1', kind: 'requirement', text: 'x', source: 'unknown', criticality: 'critical' },
    ],
  });
  // also semantic problem because requirement+unknown is not the promotion case, but critical+unknown blocks
  assert.equal(blocksApprovedPolicyClaim(c), true);
});

test('P110 gateContract combines schema-semantic and policy block', () => {
  const ok = gateContract(
    buildContract({
      status: 'PASS',
      items: [{ id: 'r1', kind: 'requirement', text: 'x', source: 'explicit' }],
    }),
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.blocksPolicy, false);

  const bad = gateContract(
    buildContract({
      status: 'PASS',
      items: [{ id: 'r1', kind: 'requirement', text: 'x', source: 'inferred' }],
    }),
  );
  assert.equal(bad.ok, false);
  assert.ok(bad.problems.length > 0);
  assert.equal(bad.blocksPolicy, true);
});

test('P110 example contract for this patch validates with schema and semantic gate', () => {
  const example = buildContract({
    goal: 'P110: establish Intent/Policy Contract foundation so approved intent is machine-readable and assumptions cannot silently become policy',
    status: 'PASS',
    items: [
      {
        id: 'req-schema',
        kind: 'requirement',
        text: 'Contracts validate against schema-intent-policy-contract.json',
        source: 'explicit',
        criticality: 'critical',
      },
      {
        id: 'req-no-promote',
        kind: 'requirement',
        text: 'Items of kind requirement/constraint/invariant must have source=explicit; assumed/inferred are rejected',
        source: 'explicit',
        criticality: 'critical',
      },
      {
        id: 'inv-unknown-blocks',
        kind: 'invariant',
        text: 'Critical items with source unknown or contract status UNKNOWN/PARTIAL block approved-policy claims',
        source: 'explicit',
        criticality: 'critical',
      },
      {
        id: 'asm-scope',
        kind: 'assumption',
        text: 'First end-to-end use is limited to this foundation patch and its tests; broader workflow binding is later patches',
        source: 'assumed',
        criticality: 'normal',
      },
      {
        id: 'ng-runtime',
        kind: 'non_goal',
        text: 'No change to application runtime behaviour or CI packaging contract',
        source: 'explicit',
      },
      {
        id: 'ac-tests',
        kind: 'acceptance_criterion',
        text: 'tests/intent-contract-p110.test.mjs passes; schema validation of the example instance succeeds',
        source: 'explicit',
      },
    ],
    changedFiles: [
      'scripts/intentContractLib.mjs',
      'tests/intent-contract-p110.test.mjs',
      'vite.config.ts',
    ],
    notes: 'P110 foundation only; capability graph and context selection are P111+',
  });

  const gate = gateContract(example);
  assert.equal(gate.ok, true, gate.problems.join('; '));
  assert.equal(gate.blocksPolicy, false);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p110-intent-'));
  const file = path.join(dir, 'contract.json');
  fs.writeFileSync(file, JSON.stringify(example, null, 2));
  const schema = validateFileWithSchema(file);
  assert.equal(schema.ok, true, schema.stderr || schema.stdout);
});
