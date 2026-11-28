import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAcquisitionUrl } from '../server/immogr/acquisition-contract.ts';

test('accepts HTTPS URLs for newly registered sources', () => {
  assert.equal(validateAcquisitionUrl({ id: 'future-source' }, 'https://example.ch/listing/1').valid, true);
});
test('rejects malformed, insecure and credential-bearing URLs as transport safety checks', () => {
  assert.equal(validateAcquisitionUrl({ id: 'x' }, 'http://example.ch/').valid, false);
  assert.equal(validateAcquisitionUrl({ id: 'x' }, 'https://user:pass@example.ch/').valid, false);
  assert.equal(validateAcquisitionUrl({ id: 'x' }, 'not a url').valid, false);
});
