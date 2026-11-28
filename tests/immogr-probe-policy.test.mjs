import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateResearchProbe } from '../server/immogr/probe-policy.ts';
test('accepts an ordinary HTTPS GET without source-specific permission metadata', () => {
  const result = evaluateResearchProbe({ id: 'example' }, { sourceId: 'example', requests: [{ url: 'https://example.ch/listing/1', method: 'GET' }] });
  assert.equal(result.allowed, true);
});
test('retains transport safety checks and single-host request plans', () => {
  assert.equal(evaluateResearchProbe({ id: 'x' }, { sourceId: 'x', requests: [{ url: 'http://example.ch/', method: 'GET' }] }).allowed, false);
  assert.equal(evaluateResearchProbe({ id: 'x' }, { sourceId: 'x', requests: [{ url: 'https://a.ch/', method: 'GET' }, { url: 'https://b.ch/', method: 'GET' }] }).allowed, false);
});
