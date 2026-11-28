import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessBatchProbe } from '../scripts/immogr-local-probe-batch.mjs';
test('batch assessment validates only the technical request plan', () => {
  assert.equal(assessBatchProbe({ id: 'sample' }, { sourceId: 'sample', urls: ['https://sample.example/listing/1'] }).valid, true);
});
test('batch assessment validates URL plan shape', () => {
  assert.equal(assessBatchProbe({ id: 'sample' }, { sourceId: 'sample', urls: ['http://sample.example/'] }).valid, false);
});
test('batch template covers all registered sources', () => {
  const registry = JSON.parse(readFileSync(new URL('../config/immogr/sources.json', import.meta.url), 'utf8'));
  const template = JSON.parse(readFileSync(new URL('../config/immogr/source-probe-batch.template.json', import.meta.url), 'utf8'));
  assert.equal(template.probes.length, registry.sources.length);
  assert.equal(new Set(template.probes.map(x => x.sourceId)).size, registry.sources.length);
});
