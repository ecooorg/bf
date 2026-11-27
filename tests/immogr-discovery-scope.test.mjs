import test from 'node:test';
import assert from 'node:assert/strict';
import { isDiscoveryUrlInScope, resolveDiscoverySourceScope } from '../server/immogr/discovery-scope.ts';

const registry = [
  { id: 'one', name: 'One', homepageUrl: 'https://www.one.example/' },
  { id: 'two', name: 'Two', homepageUrl: 'https://two.example/en' },
];

test('requires at least one known source and rejects unknown source IDs', () => {
  assert.equal(resolveDiscoverySourceScope([], registry).ok, false);
  assert.equal(resolveDiscoverySourceScope(['missing'], registry).ok, false);
});

test('resolves only selected source IDs to normalized hosts', () => {
  const result = resolveDiscoverySourceScope(['one'], registry);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.sources, [{ id: 'one', name: 'One', host: 'one.example' }]);
});

test('filters discovery results to selected hosts and their subdomains', () => {
  const result = resolveDiscoverySourceScope(['one'], registry);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(isDiscoveryUrlInScope('https://one.example/listing/1', result.sources), true);
  assert.equal(isDiscoveryUrlInScope('https://www.one.example/listing/1', result.sources), true);
  assert.equal(isDiscoveryUrlInScope('https://two.example/listing/1', result.sources), false);
  assert.equal(isDiscoveryUrlInScope('https://user:pass@one.example/listing/1', result.sources), false);
  assert.equal(isDiscoveryUrlInScope('javascript:alert(1)', result.sources), false);
});
