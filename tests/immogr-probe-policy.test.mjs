import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateResearchProbe } from '../server/immogr/probe-policy.ts';

const authorization = {
  reference: 'terms-reviewed-2026-11-27',
  reviewedAt: '2026-11-27T10:00:00.000Z',
  researchPurposeAllowed: true,
  robotsAllowed: true,
  allowedHosts: ['example.ch'],
  allowedMethods: ['GET', 'HEAD'],
  maxRequests: 3
};
const plan = (requests) => ({ sourceId: 'example', requests });

test('allows an explicitly authorized two-request research probe', () => {
  const result = evaluateResearchProbe({ id: 'example', probeAuthorization: authorization }, plan([
    { url: 'https://example.ch/', method: 'GET' },
    { url: 'https://example.ch/robots.txt', method: 'GET' }
  ]));
  assert.equal(result.allowed, true);
});

test('rejects a fourth request and pagination', () => {
  const source = { id: 'example', probeAuthorization: authorization };
  assert.ok(evaluateResearchProbe(source, plan(Array.from({ length: 4 }, () => ({ url: 'https://example.ch/', method: 'GET' })))).reasons.includes('probe_request_limit_exceeded'));
  assert.ok(evaluateResearchProbe(source, plan([{ url: 'https://example.ch/search?page=2', method: 'GET' }])).reasons.includes('pagination_probe_forbidden'));
});

test('rejects sources whose scripted probes are prohibited', () => {
  const result = evaluateResearchProbe({ id: 'example', probeAuthorization: authorization, scriptedProbeProhibited: true }, plan([
    { url: 'https://example.ch/', method: 'GET' }
  ]));
  assert.deepEqual(result.reasons, ['scripted_probe_explicitly_prohibited']);
});

test('rejects missing permission, unapproved hosts, non-HTTPS and mutation methods', () => {
  assert.ok(evaluateResearchProbe({ id: 'example' }, plan([{ url: 'https://example.ch/', method: 'GET' }])).reasons.includes('probe_authorization_missing'));
  const source = { id: 'example', probeAuthorization: authorization };
  assert.ok(evaluateResearchProbe(source, plan([{ url: 'https://other.ch/', method: 'GET' }])).reasons.includes('host_not_allowlisted'));
  assert.ok(evaluateResearchProbe(source, plan([{ url: 'http://example.ch/', method: 'GET' }])).reasons.includes('https_required'));
  assert.ok(evaluateResearchProbe(source, plan([{ url: 'https://example.ch/delete', method: 'POST' }])).reasons.includes('method_not_allowlisted'));
});
