import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAcquisitionEligibility } from '../server/immogr/acquisition-contract.ts';

const now = new Date('2026-11-27T12:00:00.000Z');
const approved = {
  id: 'example-feed',
  status: 'authorized_feed',
  acquisitionAuthorization: {
    mode: 'authorized_feed',
    reference: 'owner-approved-contract-2026-01',
    reviewedAt: '2026-11-26T10:00:00.000Z',
    termsApproved: true,
    robotsAllowed: true,
    allowedHosts: ['feed.example.ch']
  }
};

test('WP3 authorization gate permits only explicitly approved HTTPS feed hosts', () => {
  const decision = evaluateAcquisitionEligibility(approved, 'https://feed.example.ch/v1/listings', now);
  assert.equal(decision.allowed, true);
  if (decision.allowed) {
    assert.equal(decision.mode, 'authorized_feed');
    assert.equal(decision.authorizationReference, 'owner-approved-contract-2026-01');
  }
});

test('WP3 authorization gate fails closed for research-only and manually reviewed sources', () => {
  const decision = evaluateAcquisitionEligibility({ id: 'flatfox', status: 'excluded_pending_written_permission' }, 'https://flatfox.ch/listing/123', now);
  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.ok(decision.reasons.includes('source_not_authorized'));
});

test('WP3 authorization gate rejects missing terms, robots, host scope and malformed dates', () => {
  const source = {
    ...approved,
    acquisitionAuthorization: {
      ...approved.acquisitionAuthorization,
      reviewedAt: 'not-a-date',
      termsApproved: false,
      robotsAllowed: false,
      allowedHosts: []
    }
  };
  const decision = evaluateAcquisitionEligibility(source, 'https://other.example.ch/listing', now);
  assert.equal(decision.allowed, false);
  if (!decision.allowed) {
    assert.ok(decision.reasons.includes('authorization_review_date_invalid'));
    assert.ok(decision.reasons.includes('terms_not_approved'));
    assert.ok(decision.reasons.includes('robots_not_approved'));
    assert.ok(decision.reasons.includes('host_allowlist_missing'));
    assert.ok(decision.reasons.includes('host_not_allowlisted'));
  }
});

test('WP3 authorization gate rejects insecure URLs and embedded credentials', () => {
  for (const url of ['http://feed.example.ch/listings', 'https://user:pass@feed.example.ch/listings', 'not a url']) {
    const decision = evaluateAcquisitionEligibility(approved, url, now);
    assert.equal(decision.allowed, false, url);
  }
});
