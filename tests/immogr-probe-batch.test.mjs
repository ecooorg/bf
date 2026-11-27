import test from 'node:test';
import assert from 'node:assert/strict';
import { assessBatchProbe } from '../scripts/immogr-local-probe-batch.mjs';

const entry = { sourceId: 'sample', urls: ['https://sample.example/listing/1'] };
const authorized = {
  id: 'sample', name: 'Sample',
  probePolicy: {
    status: 'authorized_for_limited_probe',
    authorizationReference: 'operator-terms-reviewed',
    reviewedAt: '2026-11-27T10:00:00.000Z',
    allowedHosts: ['sample.example'],
    maxRequests: 2,
  },
};

test('batch assessment sends no request when source permission is missing', () => {
  const result = assessBatchProbe({ id: 'sample', probePolicy: { status: 'not_reviewed', reason: 'No permission evidence.' } }, entry);
  assert.equal(result.status, 'authorization_required');
  assert.equal(result.allowed, false);
});

test('batch assessment blocks an explicit source prohibition', () => {
  const result = assessBatchProbe({ id: 'sample', probePolicy: { status: 'prohibited', reason: 'No scripts.' } }, entry);
  assert.equal(result.status, 'blocked_by_source_policy');
  assert.equal(result.allowed, false);
});

test('batch assessment accepts only a registry-backed two-request plan', () => {
  assert.equal(assessBatchProbe(authorized, entry).allowed, true);
  const overLimit = { ...authorized, probePolicy: { ...authorized.probePolicy, maxRequests: 2 } };
  assert.equal(assessBatchProbe(overLimit, { ...entry, urls: ['https://sample.example/a', 'https://sample.example/b'] }).status, 'blocked_by_probe_gate');
  assert.equal(assessBatchProbe(authorized, { ...entry, urls: ['https://other.example/listing/1'] }).status, 'blocked_by_probe_gate');
});
