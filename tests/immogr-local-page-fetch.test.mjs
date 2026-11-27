import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProbePlan, isAllowedByRobots, isPublicAddress } from '../scripts/immogr-local-page-fetch.mjs';

const authorization = {
  status: 'authorized_for_limited_probe',
  authorizationReference: 'owner-reviewed-2026-11-27',
  reviewedAt: '2026-11-27T10:00:00.000Z',
  allowedHosts: ['example.ch'],
  maxRequests: 3,
};
const registry = (policy = authorization) => ({ sources: [{ id: 'example', probePolicy: policy }] });


test('local page fetcher accepts only public routable addresses', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.10.2', '::1', 'fc00::1', 'fe80::1', '2001:db8::1']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('1.1.1.1'), true);
});

test('local page fetcher includes robots and enforces the source-specific request ceiling', () => {
  const plan = buildProbePlan({ sourceId: 'example', urls: ['https://example.ch/listing/1', 'https://example.ch/listing/2'] }, registry());
  assert.equal(plan.requests.length, 3);
  assert.equal(plan.requests[0].url, 'https://example.ch/robots.txt');
  const tooSmall = registry({ ...authorization, maxRequests: 2 });
  assert.throws(() => buildProbePlan({ sourceId: 'example', urls: ['https://example.ch/a', 'https://example.ch/b'] }, tooSmall), /probe_request_limit_exceeded/);
});

test('local page fetcher refuses unapproved sources and hosts', () => {
  assert.throws(() => buildProbePlan({ sourceId: 'example', urls: ['https://example.ch/a'] }, registry({ status: 'not_reviewed' })), /authorization has not been recorded/i);
  assert.throws(() => buildProbePlan({ sourceId: 'example', urls: ['https://example.ch/a'] }, registry({ status: 'prohibited' })), /denied by the current source policy/i);
  assert.throws(() => buildProbePlan({ sourceId: 'example', urls: ['https://other.ch/a'] }, registry()), /host_not_allowlisted/);
});

test('robots rules honor the longest matching path, wildcard groups and end anchors', () => {
  const rules = ['User-agent: *', 'Disallow: /private', 'Allow: /private/public'].join(String.fromCharCode(10));
  assert.equal(isAllowedByRobots(rules, 'https://example.ch/private/secret'), false);
  assert.equal(isAllowedByRobots(rules, 'https://example.ch/private/public/page'), true);
  assert.equal(isAllowedByRobots(rules, 'https://example.ch/listing/1'), true);
  const anchored = ['User-agent: *', 'Disallow: /private$'].join(String.fromCharCode(10));
  assert.equal(isAllowedByRobots(anchored, 'https://example.ch/private'), false);
  assert.equal(isAllowedByRobots(anchored, 'https://example.ch/private/child'), true);
});
