import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractSchemaFactsFromJsonLd, normalizeLocalityLabel } from '../src/immogr/local-schema.ts';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('ImmoGR persistence is additive and isolated from retired ImmoFinder', () => {
  const sql = read('migrations/031_immogr_core.sql').toLowerCase();
  for (const table of ['immogr_sources','immogr_runs','immogr_source_pages','immogr_listings','immogr_owners','immogr_contacts','immogr_evidence','immogr_events','immogr_reviews']) {
    assert.match(sql, new RegExp('create table if not exists ' + table));
  }
  assert.doesNotMatch(sql, /immofinder_/);
  assert.doesNotMatch(sql, /drop table|truncate table|alter table immofinder/i);
});

test('ImmoGR admission data model enforces evidence and explicit unknown owner state', () => {
  const sql = read('migrations/031_immogr_core.sql').toLowerCase();
  assert.match(sql, /owner_class.*unknown/);
  assert.match(sql, /quote text not null/);
  assert.match(sql, /source_url text not null/);
  assert.match(sql, /page_block text not null/);
  assert.match(sql, /extraction_method text not null/);
  assert.match(sql, /price_period.*month.*week.*night.*season.*unknown/);
  assert.match(sql, /canonical_url text not null unique/);
});

test('active migration runner quarantines only historical ImmoFinder migrations', () => {
  const runner = read('scripts/migrate.mjs');
  assert.match(runner, /isRetiredImmoFinderMigration/);
  assert.match(runner, /0\(\?:2\[0-9\]\|30\)_immofinder/);
  assert.doesNotMatch(runner, /immogr_/);
  assert.match(runner, /allFiles\.filter\(\(file\) => !isRetiredImmoFinderMigration\(file\)\)/);
});

test('owner-defined ImmoGR locality catalogue contains exactly two groups of 22', async () => {
  const { IMMOGR_LOCALITIES, localitiesForMode } = await import('../server/immogr/localities.ts');
  const csv = read('config/immogr/localities.csv');
  assert.equal(IMMOGR_LOCALITIES.length, 44);
  assert.equal(new Set(IMMOGR_LOCALITIES.map((item) => item.id)).size, 44);
  assert.equal(IMMOGR_LOCALITIES.filter((item) => item.group === 1).length, 22);
  assert.equal(IMMOGR_LOCALITIES.filter((item) => item.group === 2).length, 22);
  assert.equal(localitiesForMode('group1').length, 22);
  assert.equal(localitiesForMode('group2').length, 22);
  assert.equal(localitiesForMode('both').length, 44);
  assert.match(csv, /id,locality,canton,group/);
  assert.match(csv, /araschgen,"Araschgen",GR,1/);
  assert.match(csv, /valbella,"Valbella",GR,2/);
  assert.doesNotMatch(csv, /Chur,GR/);
});

test('ImmoGR exposes locality groups and UI submits locality-scoped discovery', () => {
  const routes = read('server/immogr/index.ts');
  const ui = read('src/ImmoGR.tsx');
  assert.match(routes, /\/api\/immogr\/localities/);
  assert.match(routes, /localitiesForMode/);
  assert.match(routes, /req\.body\?\.locality/);
  assert.match(routes, /selected\.name/);
  assert.match(ui, /fetch\('\/api\/immogr\/localities\?groupMode=/);
  assert.match(ui, /locality, groupMode, category/);
  assert.match(ui, /Group 1 · 22 important localities/);
  assert.match(ui, /Group 2 · 22 secondary localities/);
  assert.match(ui, /Both groups · all 44 localities/);
});

test('locality database migration is additive and seeds exact owner scope', async () => {
  const { IMMOGR_LOCALITIES } = await import('../server/immogr/localities.ts');
  const sql = read('migrations/033_immogr_localities.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS immogr_localities/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS locality_id text REFERENCES immogr_localities/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS immogr_listings_locality_category_idx/);
  assert.equal((sql.match(/\('[-a-z0-9]+', '[^']+', 'GR', [12]\)/g) || []).length, 44);
  for (const locality of IMMOGR_LOCALITIES) assert.ok(sql.includes(`('${locality.id}', '${locality.name}', 'GR', ${locality.group})`));
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE/i);
});



test('ImmoGR personal notebook exposes all sources and validates owner-submitted manual observations', () => {
  const routes = read('server/immogr/index.ts');
  const ui = read('src/ImmoGR.tsx');
  const registry = JSON.parse(read('config/immogr/sources.json'));
  const migration = read('migrations/034_immogr_manual_reviews.sql');
  assert.match(routes, /\/api\/immogr\/sources/);
  assert.match(routes, /\/api\/immogr\/manual-reviews/);
  assert.match(routes, /stage: 'WP2_MANUAL_RESEARCH'/);
  assert.match(routes, /validOwnerClasses/);
  assert.match(routes, /validPropertyTypes/);
  assert.match(routes, /Personal ImmoGR notebook requires application authentication/);
  assert.match(routes, /localitiesForMode|IMMOGR_LOCALITIES/);
  assert.match(ui, /immogr-manual-research/);
  assert.match(ui, /localities\?groupMode=both/);
  assert.match(ui, /Open original page/);
  assert.match(ui, /Save personal research note/);
  assert.match(ui, /Saved notes/);
  assert.match(ui, /importLocalPageFile/);
  assert.match(ui, /extractFileContent/);
  assert.match(ui, /Open source website/);
  assert.match(ui, /Image OCR is not available yet/);
  assert.match(ui, /new DOMParser\(\)/);
  assert.match(ui, /file itself was not uploaded|original file was not uploaded/);
  assert.equal(registry.sources.length, 29);
  assert.ok(registry.sources.every((source) => source.manualReview?.personalNotebookCaptureStatus === 'enabled'));
  assert.equal(registry.sources.filter((source) => source.homepageUrl).length, 29);
  assert.ok(registry.sources.every((source) => source.homepageUrl && new URL(source.homepageUrl).protocol === 'https:'));
  assert.match(migration, /CREATE TABLE IF NOT EXISTS immogr_manual_reviews/);
  assert.match(migration, /REFERENCES immogr_localities/);
  assert.doesNotMatch(migration, /immofinder_|DROP TABLE|TRUNCATE/i);
});

test('ImmoGR local HTML JSON-LD extraction suggests facts without asserting verification', () => {
  const facts = extractSchemaFactsFromJsonLd([JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Apartment',
    name: 'Bright apartment in Felsberg',
    address: { '@type': 'PostalAddress', addressLocality: 'Felsberg' },
    offers: {
      '@type': 'Offer',
      price: "1'650",
      priceCurrency: 'CHF',
      priceSpecification: { unitText: 'month' },
      availabilityStarts: '2026-12-01'
    }
  })]);
  assert.equal(facts.pageTitle, 'Bright apartment in Felsberg');
  assert.equal(facts.propertyType, 'apartment');
  assert.equal(facts.priceAmount, '1650');
  assert.equal(facts.currency, 'CHF');
  assert.equal(facts.pricePeriod, 'month');
  assert.equal(facts.localityName, 'Felsberg');
  assert.equal(facts.availability, '2026-12-01');
  assert.deepEqual(extractSchemaFactsFromJsonLd(['not json']), {});
});


test('local JSON-LD handles localized rental periods and schema availability', () => {
  const facts = extractSchemaFactsFromJsonLd([JSON.stringify({
    '@graph': [{
      '@type': ['Apartment', 'Product'],
      name: 'Wohnung in St. Moritz',
      address: { '@type': 'PostalAddress', addressLocality: 'St. Moritz' },
      offers: {
        '@type': 'Offer',
        price: '1.850,00',
        priceCurrency: 'CHF',
        priceSpecification: { unitText: 'pro Monat' },
        availability: 'https://schema.org/InStock'
      }
    }]
  })]);
  assert.equal(facts.priceAmount, '1850');
  assert.equal(facts.pricePeriod, 'month');
  assert.equal(facts.availability, 'https://schema.org/InStock');
  assert.equal(facts.localityName, 'St. Moritz');
});

test('locality label normalization removes formatting differences but does not infer aliases', () => {
  assert.equal(normalizeLocalityLabel('  ST.  MORITZ '), normalizeLocalityLabel('St Moritz'));
  assert.equal(normalizeLocalityLabel('Müstair'), 'mustair');
  assert.notEqual(normalizeLocalityLabel('Sankt Moritz'), normalizeLocalityLabel('St. Moritz'));
  const week = extractSchemaFactsFromJsonLd([JSON.stringify({
    '@type': 'Apartment',
    offers: { price: 400, priceCurrency: 'CHF', priceSpecification: { unitText: 'Woche' } }
  })]);
  const night = extractSchemaFactsFromJsonLd([JSON.stringify({
    '@type': 'Apartment',
    offers: { price: 120, priceCurrency: 'CHF', priceSpecification: { unitText: 'Nuit' } }
  })]);
  assert.equal(week.pricePeriod, 'week');
  assert.equal(night.pricePeriod, 'night');
});


test('ImmoGR tablet page viewer keeps photo loading opt-in and source selection local', () => {
  const ui = read('src/ImmoGR.tsx');
  assert.match(ui, /data-testid="immogr-page-inspector"/);
  assert.match(ui, /Load photo previews/);
  assert.match(ui, /Download local probe plan/);
  assert.match(ui, /Export selected sources for local probe/);
  assert.match(ui, /downloadSelectedProbeBatch/);
  assert.match(ui, /sourceSettingsMessage/);
  assert.match(ui, /downloadLocalProbePlan/);
  assert.match(ui, /probeSecondUrl/);
  assert.match(ui, /immogr-photo-grid/);
  assert.match(ui, /min-height: 48px/);
  assert.match(ui, /@media \(max-width: 760px\)/);
  assert.match(ui, /immogr\.enabledSourceIds/);
  assert.match(ui, /sourceIds: selectedSourceIds/);
});
