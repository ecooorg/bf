import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('the variant-B template covers all 29 registered sources without granting authorization', () => {
  const registry = JSON.parse(readFileSync(new URL('../config/immogr/sources.json', import.meta.url), 'utf8'));
  const template = JSON.parse(readFileSync(new URL('../config/immogr/source-probe-batch.template.json', import.meta.url), 'utf8'));
  assert.equal(registry.sources.length, 29);
  assert.equal(template.probes.length, 29);
  assert.equal(new Set(template.probes.map((item) => item.sourceId)).size, 29);
  for (const entry of template.probes) {
    assert.ok(registry.sources.some((source) => source.id === entry.sourceId));
    assert.ok(entry.urls.every((url) => url.startsWith('https://')));
    assert.equal(Object.hasOwn(entry, 'probeAuthorization'), false);
  }
  assert.equal(registry.sources.filter((source) => source.probePolicy.status === 'authorized_for_limited_probe').length, 0);
});
