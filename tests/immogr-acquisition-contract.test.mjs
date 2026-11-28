import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAcquisitionEligibility } from '../server/immogr/acquisition-contract.ts';

test('accepts HTTPS URLs for newly registered sources', () => {
  assert.equal(evaluateAcquisitionEligibility({ id: 'future-source' }, 'https://example.ch/listing/1').allowed, true);
});
test('rejects malformed, insecure and credential-bearing URLs as transport safety checks', () => {
  assert.equal(evaluateAcquisitionEligibility({ id: 'x' }, 'http://example.ch/').allowed, false);
  assert.equal(evaluateAcquisitionEligibility({ id: 'x' }, 'https://user:pass@example.ch/').allowed, false);
  assert.equal(evaluateAcquisitionEligibility({ id: 'x' }, 'not a url').allowed, false);
});
