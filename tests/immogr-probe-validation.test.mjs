import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResearchProbe } from '../server/immogr/probe-validation.ts';
test('accepts an ordinary HTTPS GET for a registered source', () => {
  const result = validateResearchProbe({ id: 'example' }, { sourceId: 'example', requests: [{ url: 'https://example.ch/listing/1', method: 'GET' }] });
  assert.equal(result.valid, true);
});
test('retains transport safety checks and single-host request plans', () => {
  assert.equal(validateResearchProbe({ id: 'x' }, { sourceId: 'x', requests: [{ url: 'http://example.ch/', method: 'GET' }] }).valid, false);
  assert.equal(validateResearchProbe({ id: 'x' }, { sourceId: 'x', requests: [{ url: 'https://a.ch/', method: 'GET' }, { url: 'https://b.ch/', method: 'GET' }] }).valid, false);
});
