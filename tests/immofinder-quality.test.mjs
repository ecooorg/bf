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

test('P129 carousel wave and profile defaults exist in source', () => {
  const pipe = read('server/immofinderPipeline.ts');
  const set = read('server/immofinderSettings.ts');
  assert.match(pipe, /carousel/);
  assert.match(set, /profile: 'carousel'/);
  assert.match(set, /carouselCommunesPerRun/);
});

test('recheck list refresh module and UI/API wiring exist', () => {
  const refresh = read('server/immofinderRefresh.ts');
  const routes = read('server/immofinderRoutes.ts');
  const ui = read('src/ImmoFinder.tsx');
  assert.match(refresh, /runRefreshJob/);
  assert.match(refresh, /parseListedAtDetailed/);
  assert.match(refresh, /recheck_refresh_item/);
  assert.match(routes, /\/api\/immofinder\/recheck-list/);
  assert.match(ui, /immofinder-recheck-list/);
  assert.match(ui, /Recheck list/);
});

test('diagnostics include card completeness and per-source quality', () => {
  const diag = read('server/immofinderDiag.ts');
  const routes = read('server/immofinderRoutes.ts');
  assert.match(diag, /completenessSummary/);
  assert.match(diag, /weakHosts/);
  assert.match(routes, /search_quality_summary/);
});

test('parseListedAt covers labelled DE dates, relative phrases and meta preference', async () => {
  const { parseListedAt, pageMeta } = await import('../server/immofinderCore.ts');
  const d1 = parseListedAt('Inseriert am: 03.11.2026 · Chur', undefined, null);
  assert.ok(d1);
  assert.equal(d1.getUTCFullYear(), 2026);
  assert.equal(d1.getUTCMonth(), 10);
  assert.equal(d1.getUTCDate(), 3);
  const d2 = parseListedAt('Wohnung in Chur, vor 5 Tagen online', undefined, null);
  assert.ok(d2);
  const days = (Date.now() - d2.getTime()) / 86400000;
  assert.ok(days >= 4.5 && days <= 6);
  const declared = parseListedAt('random 01.01.2020 text', undefined, '2026-11-12T10:00:00Z');
  assert.ok(declared);
  assert.equal(declared.toISOString().slice(0, 10), '2026-11-12');
  const meta = pageMeta('<html><head><meta property="article:published_time" content="2026-10-01T08:00:00Z"/><title>Test</title></head></html>', 'https://example.ch/x');
  assert.equal(meta.published, '2026-10-01T08:00:00Z');
});

test('card model and exports show published date only (not search found time)', async () => {
  const { immoCardModel, immoDatesText, immoLinkLine } = await import('../src/immoCard.ts');
  const card = immoCardModel({
    municipality: 'Chur',
    property_name: '3.5 Zi',
    description_de: 'hell',
    rooms_estimated: 3.5,
    listing_url: 'https://example.ch/listing/1',
    first_seen_at: '2026-11-19T09:00:00Z',
    listed_at: '2026-11-03T12:00:00Z',
    status: 'NEW',
  });
  assert.match(card.published, /published/);
  assert.match(card.published, /03\.11\.2026|3\.11\.2026/);
  assert.equal(immoDatesText(card), card.published);
  assert.ok(!immoLinkLine(card).includes('found'));
  assert.ok(immoLinkLine(card).includes('published') || immoLinkLine(card).includes(card.published.replace(/^published\s+/, '')));
  const noDate = immoCardModel({
    municipality: 'Chur', listing_url: 'https://example.ch/2', first_seen_at: '2026-11-19T09:00:00Z', status: 'NEW',
  });
  assert.equal(noDate.published, '');
  assert.equal(immoDatesText(noDate), '');
  assert.ok(!immoLinkLine(noDate).includes('found'));
});

test('UI does not render search found date on cards', () => {
  const ui = read('src/ImmoFinder.tsx');
  assert.match(ui, /immofinder-published/);
  // The found span must not be rendered next to the URL line any more.
  assert.ok(!/k\.found && <span/.test(ui));
});

test('isListingUnavailable detects CH portal offline phrases', async () => {
  const { isListingUnavailable } = await import('../server/immofinderCore.ts');
  assert.equal(isListingUnavailable('', 'Dieses Objekt ist leider gerade nicht verfügbar.'), true);
  assert.equal(isListingUnavailable('', 'Dieses Inserat ist nicht mehr verfügbar'), true);
  assert.equal(isListingUnavailable('Nice flat', '3.5 Zimmer Wohnung in Chur zu vermieten, CHF 1500'), false);
  assert.equal(isListingUnavailable('', 'This listing is no longer available'), true);
});

test('coerceDeclaredDate parses Serper-style relative and absolute dates', async () => {
  const { coerceDeclaredDate, parseListedAt } = await import('../server/immofinderCore.ts');
  const d1 = coerceDeclaredDate('2 days ago');
  assert.ok(d1);
  const days = (Date.now() - d1.getTime()) / 86400000;
  assert.ok(days >= 1.5 && days <= 3);
  const d2 = coerceDeclaredDate('15.11.2026');
  assert.ok(d2);
  assert.equal(d2.getUTCFullYear(), 2026);
  assert.equal(d2.getUTCMonth(), 10);
  assert.equal(d2.getUTCDate(), 15);
  const d3 = parseListedAt('Wohnung in Chur', undefined, 'vor 5 Tagen');
  assert.ok(d3);
  const d4 = coerceDeclaredDate('heute');
  assert.ok(d4);
});

test('SearchHit carries optional date from Serper mapping', () => {
  const disc = read('server/immofinderDiscovery.ts');
  assert.match(disc, /date\?:/);
  assert.match(disc, /o\.date/);
});
