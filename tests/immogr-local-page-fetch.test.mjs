import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProbePlan, isPublicAddress } from '../scripts/immogr-local-page-fetch.mjs';
const registry = { sources: [{ id: 'example' }] };
test('local page fetcher accepts registered sources using technical validation', () => {
  const plan = buildProbePlan({ sourceId: 'example', urls: ['https://example.ch/a'] }, registry);
  assert.equal(plan.requests.length, 1);
});
test('local page fetcher rejects unregistered sources and malformed plans', () => {
  assert.throws(() => buildProbePlan({ sourceId: 'unknown', urls: ['https://example.ch/a'] }, registry), /Unknown/);
  assert.throws(() => buildProbePlan({ sourceId: 'example', urls: ['http://example.ch/a'] }, registry));
});
test('local fetcher still blocks private and link-local IP destinations', () => {
  for (const ip of ['127.0.0.1','10.0.0.1','192.168.1.1','169.254.1.1','::1','fc00::1']) assert.equal(isPublicAddress(ip), false);
  assert.equal(isPublicAddress('8.8.8.8'), true);
});
