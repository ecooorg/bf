import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateArtifact, ARTIFACT_TYPES, SCHEMA_DIR, schemaPathFor } from '../scripts/schemaValidate.mjs';

function meta(artifactType) {
  return {
    schemaId: `https://biforge.local/schemas/schema-${artifactType}.json`,
    schemaVersion: '1.0.0',
    artifactType,
    generatedAt: '2026-10-25T12:00:00.000Z',
  };
}

function provenance(status = 'PASS') {
  return {
    revision: 'abc1234',
    commandOrObservation: 'npm run test:core',
    environment: 'local',
    timestamp: '2026-10-25T12:00:00.000Z',
    status,
    logRef: 'logs/test-core.log',
    completenessLimits: 'unit tests only',
  };
}

test('all seven schema files exist flat under docs/', () => {
  assert.equal(path.basename(SCHEMA_DIR), 'docs');
  for (const t of ARTIFACT_TYPES) {
    const file = schemaPathFor(t);
    assert.equal(fs.existsSync(file), true, `missing ${file}`);
    assert.equal(file.includes(`${path.sep}schemas${path.sep}`), false, 'must not use nested schemas/ dir');
  }
  assert.equal(fs.existsSync(path.join(SCHEMA_DIR, 'schema-common.json')), true);
  assert.equal(fs.existsSync(path.join(SCHEMA_DIR, 'SCHEMA-STATUS-VOCABULARY.md')), true);
});

test('intent-policy-contract accepts minimal valid instance', () => {
  const instance = {
    meta: meta('intent-policy-contract'),
    goal: 'Add schema validation',
    status: 'PASS',
    items: [
      { id: 'r1', kind: 'requirement', text: 'Validate evidence records', source: 'explicit', criticality: 'critical' },
    ],
  };
  const r = validateArtifact(instance, 'intent-policy-contract');
  assert.equal(r.ok, true, r.errors.join('; '));
});

test('intent-policy-contract rejects invalid status', () => {
  const instance = {
    meta: meta('intent-policy-contract'),
    goal: 'x',
    status: 'SUCCESS',
    items: [],
  };
  const r = validateArtifact(instance, 'intent-policy-contract');
  assert.equal(r.ok, false);
});

test('evidence-record rejects PASS when critical item provenance is UNKNOWN', () => {
  const instance = {
    meta: meta('evidence-record'),
    status: 'PASS',
    items: [{ id: 'e1', claim: 'CI is green', critical: true, provenance: provenance('UNKNOWN') }],
  };
  const r = validateArtifact(instance, 'evidence-record');
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('PASS is not allowed')));
});

test('evidence-record accepts PASS when critical provenance is PASS', () => {
  const instance = {
    meta: meta('evidence-record'),
    status: 'PASS',
    items: [{ id: 'e1', claim: 'Focused tests passed', critical: true, provenance: provenance('PASS') }],
  };
  const r = validateArtifact(instance, 'evidence-record');
  assert.equal(r.ok, true, r.errors.join('; '));
});

test('evidence-record rejects missing required provenance fields', () => {
  const instance = {
    meta: meta('evidence-record'),
    status: 'PARTIAL',
    items: [{ id: 'e1', claim: 'Something', provenance: { status: 'PASS' } }],
  };
  const r = validateArtifact(instance, 'evidence-record');
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('missing required')));
});

test('handoff-report accepts fallback-style minimal report', () => {
  const instance = {
    meta: meta('handoff-report'),
    status: 'FAIL',
    summary: 'Runner interrupted before full suite completed.',
    evidenceCompleteness: 'minimal',
    failedStages: ['test:core'],
    notRunStages: ['test:live'],
    nextAction: 'Re-run focused tests after inspecting logs.',
    secretsRedacted: true,
  };
  const r = validateArtifact(instance, 'handoff-report');
  assert.equal(r.ok, true, r.errors.join('; '));
});

test('approval-decision validates authority tier bounds', () => {
  assert.equal(validateArtifact({
    meta: meta('approval-decision'), status: 'PASS', decision: 'not_required', authorityTier: 0,
  }, 'approval-decision').ok, true);
  assert.equal(validateArtifact({
    meta: meta('approval-decision'), status: 'PASS', decision: 'approve', authorityTier: 9,
  }, 'approval-decision').ok, false);
});

test('verification-plan requires at least one check', () => {
  const r = validateArtifact({
    meta: meta('verification-plan'), status: 'NOT_RUN', checks: [],
  }, 'verification-plan');
  assert.equal(r.ok, false);
});

test('artifact-manifest accepts add/modify entries', () => {
  const r = validateArtifact({
    meta: meta('artifact-manifest'),
    status: 'PASS',
    patchId: 'ANR-P1-0',
    entries: [
      { path: 'docs/schema-common.json', action: 'add' },
      { path: 'AGENTS.md', action: 'modify' },
    ],
    deletionsListedSeparately: true,
  }, 'artifact-manifest');
  assert.equal(r.ok, true, r.errors.join('; '));
});

test('change-impact-plan rejects additional properties', () => {
  const r = validateArtifact({
    meta: meta('change-impact-plan'),
    summary: 'Docs only',
    status: 'PASS',
    impacts: [{ id: 'i1', area: 'docs', description: 'schemas', status: 'PASS' }],
    unexpected: true,
  }, 'change-impact-plan');
  assert.equal(r.ok, false);
});
