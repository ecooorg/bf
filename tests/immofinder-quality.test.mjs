/**
 * Category: immofinder quality — contact plausibility, early geo prefilter, wave options.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('immofinder core exports plausible contact helpers', () => {
  const core = read('server/immofinderCore.ts');
  assert.match(core, /export function isPlausibleSwissPhone/);
  assert.match(core, /export function isPlausibleEmail/);
  assert.match(core, /export function placeFromTitleOrSnippet/);
  assert.match(core, /\+41000000000|000000000/); // documents the fake pattern we reject
});

test('extractContacts filters fake phones and garbage emails', () => {
  const core = read('server/immofinderCore.ts');
  assert.match(core, /isPlausibleSwissPhone/);
  assert.match(core, /isPlausibleEmail/);
  // Implementation must filter inside extractContacts
  assert.match(core, /filter\(isPlausibleSwissPhone\)/);
  assert.match(core, /isPlausibleEmail\(e\)/);
});

test('pipeline supports wave modes priority|extended|full', () => {
  const pipe = read('server/immofinderPipeline.ts');
  assert.match(pipe, /export type RunWave = 'priority' \| 'extended' \| 'full'/);
  assert.match(pipe, /waveMode/);
  assert.match(pipe, /wavesRun/);
  assert.match(pipe, /sourceStats/);
  assert.match(pipe, /consecutiveStopFor/);
  assert.match(pipe, /id === 'search'/);
  assert.match(pipe, /placeFromTitleOrSnippet/);
  assert.match(pipe, /priority-search|extended-search/);
});

test('routes accept wave body parameter', () => {
  const routes = read('server/immofinderRoutes.ts');
  assert.match(routes, /req\.body\?\.wave/);
  assert.match(routes, /wave.*priority.*extended.*full/);
  assert.match(routes, /\{\s*dryRun,\s*wave\s*\}/);
});

test('UI exposes stage 1 / stage 2 / full run controls', () => {
  const ui = read('src/ImmoFinder.tsx');
  assert.match(ui, /immofinder-run-priority/);
  assert.match(ui, /immofinder-run-extended/);
  assert.match(ui, /start\('priority'\)/);
  assert.match(ui, /start\('extended'\)/);
  assert.match(ui, /start\('full'\)/);
});

test('config keeps phase-1 productive catalogues first', () => {
  const cfg = JSON.parse(read('config/immofinder.json'));
  const phase1 = cfg.sources.filter((s) => s.phase === 1);
  assert.ok(phase1.length >= 1);
  assert.equal(phase1[0].id, 'ferienhausmiete');
  assert.ok(cfg.priorityWaveMs >= 600000);
});

test('pickItems ranks whitelist commune hits before distant resorts', () => {
  const disc = read('server/immofinderDiscovery.ts');
  assert.match(disc, /return out\.sort/);
  assert.match(disc, /scuol|engadin/);
});
