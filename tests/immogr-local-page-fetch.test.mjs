import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProbePlan, isAllowedByRobots, isPublicAddress } from '../scripts/immogr-local-page-fetch.mjs';

const authorization = {
  reference: 'owner-reviewed-2026-11-27',
  reviewedAt: '2026-11-27T10:00:00.000Z',
  researchPurposeAllowed: true,
  robotsAllowed: true,
  allowedHosts: ['example.ch'],
  allowedMethods: ['GET', 'HEAD'],
  maxRequests: 3,
};

test('local page fetcher accepts only public routable addresses', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.10.2', '::1', 'fc00::1', 'fe80::1', '2001:db8::1']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('1.1.1.1'), true);
});

test('local page fetcher includes robots and enforces the source-specific request ceiling', () => {
  const source = { id: 'example', probeAuthorization: authorization };
  const plan = buildProbePlan({ source, urls: ['https://example.ch/listing/1', 'https://example.ch/listing/2'] });
  assert.equal(plan.requests.length, 3);
  assert.equal(plan.requests[0].url, 'https://example.ch/robots.txt');
  assert.throws(() => buildProbePlan({ source: { ...source, probeAuthorization: { ...authorization, maxRequests: 2 } }, urls: ['https://example.ch/a', 'https://example.ch/b'] }), /probe_request_limit_exceeded/);
});

test('local page fetcher refuses unapproved sources and hosts', () => {
  assert.throws(() => buildProbePlan({ source: { id: 'example' }, urls: ['https://example.ch/a'] }), /authorization|denied/i);
  assert.throws(() => buildProbePlan({ source: { id: 'example', probeAuthorization: authorization }, urls: ['https://other.ch/a'] }), /host_not_allowlisted/);
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
