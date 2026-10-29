/**
 * P118.5.1 — Archive Delivery Canon invariants (no live providers).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { stagedEnabled, legacyAppBuilderAllowed, publicJob } from '../server/appBuilderAdapter.ts';

test('stagedEnabled defaults to true when APP_BUILDER_ENGINE is unset', () => {
  assert.equal(stagedEnabled({}), true);
  assert.equal(stagedEnabled({ APP_BUILDER_ENGINE: 'staged' }), true);
  assert.equal(stagedEnabled({ APP_BUILDER_ENGINE: 'legacy' }), false);
  assert.equal(stagedEnabled({ APP_BUILDER_ENGINE: 'pipeline' }), false);
  assert.equal(stagedEnabled({ APP_BUILDER_ENGINE: 'off' }), false);
});

test('legacyAppBuilderAllowed is opt-in only', () => {
  assert.equal(legacyAppBuilderAllowed({}), false);
  assert.equal(legacyAppBuilderAllowed({ ALLOW_LEGACY_APP_BUILDER: 'true' }), true);
  assert.equal(legacyAppBuilderAllowed({ ALLOW_LEGACY_APP_BUILDER: '1' }), false);
});

test('publicJob exposes downloadUrl only with artifactId', () => {
  const base = {
    schemaVersion: 1,
    id: 'j1',
    projectId: 'p1',
    userId: 'u',
    status: 'done',
    stage: 'done',
    spec: null,
    plan: null,
    callsUsed: 1,
    callsBudget: 10,
    error: null,
    report: {
      schemaVersion: 1,
      status: 'complete',
      outcome: 'SUCCESS',
      goalImplemented: true,
      files: [],
      units: [],
      validators: [],
      checksDeclared: [],
      checksRun: [],
      checksNotRun: [],
    },
    artifactId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    heartbeatAt: new Date().toISOString(),
  };
  const noArt = publicJob(base, 'p1');
  assert.equal(noArt.downloadUrl, undefined);
  const withArt = publicJob({ ...base, artifactId: 'art-1' }, 'p1');
  assert.match(String(withArt.downloadUrl), /\/artifacts\/art-1\/download/);
});
