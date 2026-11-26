import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, sanitizeSettings, applySettings, SOURCE_IDS } from '../server/immofinderSettings.ts';
import { runPipeline } from '../server/immofinderPipeline.ts';
import { dedupeSnippetText, htmlToText, resolveListingPrice, looksLikeAgencyListing } from '../server/immofinderCore.ts';
import { buildSecondaryQueries, resolveEnrichmentConfig } from '../server/immofinderContactEnrichment.ts';
import { createSerperSearch, communesForRun, buildQueries, pickItems, isPortalDetailLink } from '../server/immofinderDiscovery.ts';
import { sameListingUrlTarget, encodeSeenReason, decodeSeenReason, REPAIR_RULES_VERSION, hardRejectReason, ctxFromConfig, sanitizeNewRecord } from '../server/immofinderRepair.ts';
import { createPoliteFetch } from '../server/immofinderFetcher.ts';
import { placeFromTitleOrSnippet, nonListingReason } from '../server/immofinderCore.ts';
import { readFileSync } from 'node:fs';
import { buildC131LetterDraft, hasPageContactAction } from '../server/immofinderLetter.ts';

const cfg = JSON.parse(readFileSync(new URL('../config/immofinder.json', import.meta.url), 'utf8'));


const C131_TUTTI_PAGE_FIXTURES = [
  { id: '83553049', locality: 'Untervaz', rooms: 4.5, title: 'Schöne, sonnige 4.5-Zimmerwohnung', providerText: 'Inserent kontaktieren', expected: 'L1_candidate' },
  { id: '83710092', locality: 'Cazis', rooms: 4.5, title: '4.5-Zimmerwohnung in Cazis', providerText: 'Inserent kontaktieren', expected: 'L1_candidate' },
  { id: '83680310', locality: 'Jenaz', rooms: 3, title: '3 Zimmer Wohnung in Jenaz', providerText: 'Inserent kontaktieren', expected: 'outside_target' },
  { id: '83684988', locality: 'Pragg-Jenaz', rooms: 3, title: '3 Zimmer Wohnung in Pragg-Jenaz', providerText: 'Inserent kontaktieren', expected: 'outside_target' },
  { id: '82749080', locality: 'Splügen', rooms: 1, title: 'Gemütliches Studio in Splügen Medels', providerText: 'De Blanck Immobilien GmbH', expected: 'agency_wrong_locality_small' },
];
const C131_HOMEGATE_PAGE_FIXTURES = [
  { id: '4003376560', locality: 'Jenins', rooms: 4.5, title: 'Aussichtsreiche 4.5-Zimmer-Maisonette-Wohnung', providerText: 'Kontakt: individual advertiser; three-party house', expected: 'L1_candidate' },
  { id: '4003613619', locality: 'Grüsch', rooms: 4.5, title: 'Zentral gelegene Wohnung im 2. OG', providerText: 'Kontakt: individual advertiser', expected: 'L1_candidate' },
  { id: '4003649753', locality: 'Ilanz', rooms: 4.5, title: 'Charmante 4.5 Zimmer-Wohnung in Ilanz', providerText: 'Anbieter: Privera AG', expected: 'agency' },
  { id: '4003623993', locality: 'Untervaz', rooms: 4.5, title: 'Moderne 4.5-Zimmerwohnung an ruhiger Wohnlage', providerText: 'Anbieter: Conrad + Magnin AG', expected: 'agency' },
  { id: '4003542724', locality: 'Chur', rooms: 4.5, title: 'Mieten ohne Kaution - Willkommen zu Hause', providerText: 'Anbieter: Wincasa AG', expected: 'agency' },
];

test('C131 source pilot fixtures cover five real detail pages per direct portal', () => {
  assert.equal(C131_TUTTI_PAGE_FIXTURES.length, 5);
  assert.equal(C131_HOMEGATE_PAGE_FIXTURES.length, 5);
  for (const f of C131_TUTTI_PAGE_FIXTURES) {
    assert.equal(cfg.municipalities.includes(f.locality), f.expected === 'L1_candidate');
    assert.equal(looksLikeAgencyListing(f.title, f.providerText), f.expected === 'agency_wrong_locality_small');
  }
  for (const f of C131_HOMEGATE_PAGE_FIXTURES) {
    assert.equal(cfg.municipalities.includes(f.locality), true);
    assert.equal(looksLikeAgencyListing(f.title, f.providerText), f.expected === 'agency');
  }
  assert.equal(C131_TUTTI_PAGE_FIXTURES.filter((f) => f.expected === 'L1_candidate').length, 2);
  assert.equal(C131_HOMEGATE_PAGE_FIXTURES.filter((f) => f.expected === 'L1_candidate').length, 2);
});

test('C131 defaults enable the bounded source-first full run', () => {
  const settings = defaultSettings(cfg);
  assert.equal(settings.search.carouselCommunesPerRun, cfg.municipalities.length);
  assert.deepEqual(
    Object.entries(settings.search.sources).filter(([, enabled]) => enabled).map(([id]) => id).sort(),
    ['ferienhausmiete', 'happyholiday'],
  );
  assert.equal(settings.search.defaultWave, 'full');
  assert.equal(settings.search.profile, 'burst');
  assert.equal(settings.search.requirePrice, false);
  assert.equal(settings.search.rejectNonMonthly, false);
  assert.equal(settings.search.requireContact, false);
  assert.equal(sanitizeSettings({}, cfg).search.carouselCommunesPerRun, cfg.municipalities.length);
  assert.equal(settings.search.privateQueryTemplates, 2);
  assert.equal(settings.search.enrichSearchesPerRun, 0);
  assert.equal(settings.search.maxAiPages, 40);
  assert.equal(settings.schedule.everyHours, 3);
  const enrichment = resolveEnrichmentConfig(cfg);
  assert.deepEqual([enrichment.enabled, enrichment.maxExtraSearchesPerRun, enrichment.maxReverseImagePerRun, enrichment.useReverseImage, enrichment.useSecondarySearch], [false, 0, 0, false, false]);
});


test('C131 full run processes configured direct sources before secondary Serper discovery', async () => {
  const localCfg = leanCfg({ queries: ['{commune} Wohnung privat'], portalQueries: ['site:tutti.ch {commune} Wohnung mieten'], maxPagesPerRun: 40 });
  const indexUrl = 'https://www.tutti.ch/de/q/test';
  const detailUrl = 'https://www.tutti.ch/de/vi/83553049';
  localCfg.sources = [{ id: 'portal-tutti', url: indexUrl, phase: 1, maxDetailPages: 1, detailPattern: '^https://www\\.tutti\\.ch/de/vi/\\d+$' }];
  const events = [];
  const html = '<html><head><title>Schöne 4.5-Zimmerwohnung in Chur</title></head><body><h1>Schöne 4.5-Zimmerwohnung</h1><p>Zu vermieten nach Vereinbarung. Helle Wohnung in Chur mit Balkon, Küche und zwei Nasszellen. Zimmer 4.5. Inserent kontaktieren.</p></body></html>';
  const result = await runPipeline({
    config: localCfg,
    fetchPage: async (url) => {
      events.push(url);
      return url === indexUrl
        ? { ok: true, status: 200, body: '<a href="' + detailUrl + '">4.5 Zimmer Wohnung</a>', finalUrl: indexUrl }
        : { ok: true, status: 200, body: html, finalUrl: detailUrl };
    },
    llm: null, store: memStore(), search: async () => { events.push('serper'); return []; }, cycle: 0,
  }, { dryRun: true, wave: 'full' });
  assert.equal(events[0], indexUrl, 'direct source index is fetched before Serper');
  assert.equal(events[1], detailUrl, 'a concrete detail page is fetched before Serper');
  assert.equal(result.counts.kept, 1);
  assert.equal(result.preview[0]?.rooms, 4.5);
});

test('Serper search sends weekly freshness filter when requested', async () => {
  process.env.SERPER_API_KEY = 'test-key';
  let sent;
  const search = createSerperSearch(async (_url, init) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ organic: [{ title: 'A', link: 'https://example.ch/a', snippet: 'B' }] }), { status: 200 });
  });
  const rows = await search('Chur Wohnung', { tbs: 'qdr:w' });
  assert.equal(sent.tbs, 'qdr:w');
  assert.equal(rows.length, 1);
  delete process.env.SERPER_API_KEY;
});

test('Serper Google goto links are resolved to original result URLs without another search credit', async () => {
  const previousKey = process.env.SERPER_API_KEY;
  process.env.SERPER_API_KEY = 'test-key';
  const googleLink = 'https://www.google.com/goto?url=opaque-token';
  const directLink = 'https://www.homegate.ch/mieten/4001234567';
  const searchResponse = { organic: [{ title: 'Wohnung in Chur', link: googleLink, snippet: '4.5 Zimmer Wohnung zu vermieten' }], credits: 1 };
  const resolvedResponse = { organic: [{ title: 'Wohnung in Chur', link: directLink, snippet: '4.5 Zimmer Wohnung zu vermieten' }], credits: 1 };
  const calls = [];
  try {
    const search = createSerperSearch(async (url, init) => {
      calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
      return new Response(JSON.stringify(String(url).endsWith('/resolve') ? resolvedResponse : searchResponse), { status: 200 });
    });
    const rows = await search('Chur Wohnung mieten');
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /\/search$/);
    assert.match(calls[1].url, /\/resolve$/);
    assert.equal(calls[1].body.organic[0].link, googleLink);
    assert.equal(rows[0].link, directLink);
  } finally {
    if (previousKey === undefined) delete process.env.SERPER_API_KEY;
    else process.env.SERPER_API_KEY = previousKey;
  }
});

test('browser fetch fallback is bounded and rejects private navigation targets', () => {
  const fetcher = readFileSync(new URL('../server/immofinderFetcher.ts', import.meta.url), 'utf8');
  const pipeline = readFileSync(new URL('../server/immofinderPipeline.ts', import.meta.url), 'utf8');
  assert.match(fetcher, /await import\('playwright'\)/);
  assert.match(fetcher, /await isPublicTarget\(requestUrl\)/);
  assert.match(fetcher, /visibleText\.length < 120/);
  assert.match(fetcher, /fetchMode: 'browser_rendered'/);
  assert.match(pipeline, /SERPER_STEP_MS = 40_000/);
  assert.match(pipeline, /withStepTimeout\(label, \(\) => early \?\? deps\.search!\(q\), SERPER_STEP_MS\)/);
  assert.match(pipeline, /withStepTimeout\('fetch', \(\) => deps\.fetchPage\(it\.url\), 25_000\)/);
});

test('geo helper requires title, snippet and municipality allowlist and matches only explicit local evidence', () => {
  assert.deepEqual(placeFromTitleOrSnippet('3.5 Zimmer Wohnung', 'in Chur zu vermieten', ['Chur']), { matched: 'Chur', outside: false, hint: 'Chur' });
  assert.equal(placeFromTitleOrSnippet('Wohnung zu vermieten', 'Graubünden', ['Chur']).matched, null);
});

test('seen-cache entries from older rule versions are invalidated once', () => {
  assert.equal(decodeSeenReason('not_single_listing'), null);
  assert.equal(decodeSeenReason('129.51.1::not_single_listing'), null);
  assert.equal(decodeSeenReason(encodeSeenReason('not_single_listing')), 'not_single_listing');
  assert.equal(REPAIR_RULES_VERSION, `${JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).patch}.5`);
  const store = readFileSync(new URL('../server/immofinderStore.ts', import.meta.url), 'utf8');
  assert.match(store, /decodeSeenReason\(r\.rows\[0\]\.reason\)/);
  assert.match(store, /encodeSeenReason\(reason\)/);
});



test('migration startup bounds database waits and reports each blocking phase', () => {
  const migration = readFileSync(new URL('../scripts/migrate.mjs', import.meta.url), 'utf8');
  assert.match(migration, /pg_try_advisory_lock/);
  assert.doesNotMatch(migration, /SELECT pg_advisory_lock/);
  assert.match(migration, /MIGRATION_LOCK_TIMEOUT_MS/);
  assert.match(migration, /statement_timeout: 60_000/);
  assert.match(migration, /lock_timeout: 15_000/);
  assert.match(migration, /\[db:migrate\] connecting to PostgreSQL/);
  assert.match(migration, /\[db:migrate\] complete:/);
});

test('P129.53 migration physically clears every legacy seen-cache row', () => {
  const migration = readFileSync(new URL('../migrations/027_immofinder_seen_purge.sql', import.meta.url), 'utf8');
  assert.match(migration, /^\s*--[^\n]*\n\s*TRUNCATE TABLE immofinder_seen;\s*$/i);
  assert.doesNotMatch(migration, /immofinder_listings|immofinder_progress/i);
});

test('canonical portal redirects are accepted only when the same listing id remains on the same host', () => {
  assert.equal(sameListingUrlTarget('https://www.homegate.ch/mieten/4001234567', 'https://homegate.ch/mieten/4001234567/3-5-zimmer-wohnung'), true);
  assert.equal(sameListingUrlTarget('https://www.homegate.ch/mieten/4001234567', 'https://homegate.ch/mieten/4009999999'), false);
  assert.equal(sameListingUrlTarget('https://www.homegate.ch/mieten/4001234567', 'https://other.example/mieten/4001234567'), false);
});

test('discovery query set replaces generic Facebook group search with fresh-intent wording', () => {
  assert.ok(!cfg.discovery.queries.some((q) => q.startsWith('site:facebook.com/groups')));
  assert.ok(cfg.discovery.queries.some((q) => /privat|Eigentümer/.test(q)));
  assert.ok(cfg.discovery.portalQueries.every((q) => !/Graubünden/.test(q)));
  assert.ok(cfg.discovery.portalQueries.some((q) => /3\.5 Zimmer|3 ½|4 Zimmer/.test(q)), 'portalQueries prefer room-count phrases');
  assert.ok(cfg.discovery.portalQueries.some((q) => q.includes('site:homegate.ch')));
});

test('pipeline batches discovery processing and avoids poisoning seen with insufficient evidence', () => {
  const source = readFileSync(new URL('../server/immofinderPipeline.ts', import.meta.url), 'utf8');
  assert.match(source, /await flushBatch\(\);\s*if \(deps\.shouldCancel\?\.\(\)\) break;\s*if \(querySucceeded\) completedQueryKeys\.add\(q\);/);
  assert.doesNotMatch(source, /qdr:\$\{freshWindow\}/);
  assert.match(source, /sameListingUrlTarget\(it\.url, fetchedUrl\)/);
  assert.match(source, /text\.trim\(\)\.length < MIN_DIRECT_PAGE_TEXT_CHARS/);
  assert.match(source, /if \(checked\.hardReason\) \{ await deny\(checked\.hardReason, 'write_gate'\); continue; \}/);
  assert.doesNotMatch(source, /hasUsableFreshLink/);
  assert.match(source, /const titleGeo = placeFromTitleOrSnippet\(it\.hit\?\.title \|\| '', it\.hit\?\.snippet \|\| '', cfg\.municipalities\)/);
  assert.match(source, /if \(titleGeo\.outside\)/);
  assert.match(source, /if \(pageGeo\.outside\)/);
  assert.match(source, /reason !== 'rooms_unknown'/);
  assert.match(source, /reason !== 'municipality_not_whitelisted'/);
  assert.match(source, /it\.snippetOnly && it\.hit/);
  assert.match(source, /allowSnippet: snippetEvidence/);
  assert.match(source, /6 \* 60 \* 60 \* 1000/);
  assert.match(source, /const isDiscoverySource = src\.id === 'search' \|\| src\.id\.startsWith\('portal-'\)/);
  assert.match(source, /if \(!isDiscoverySource && st\.consecutiveBad >= stopAt\)/);
});

test('manual listing deletion also clears its URL seen-cache entries', () => {
  const store = readFileSync(new URL('../server/immofinderStore.ts', import.meta.url), 'utf8');
  assert.match(store, /SELECT listing_url, source_urls FROM immofinder_listings WHERE id = \$1 FOR UPDATE/);
  assert.match(store, /DELETE FROM immofinder_seen WHERE url = ANY\(\$1::text\[\]\)/);
  assert.match(store, /await client\.query\('COMMIT'\)/);
});

test('write-time auto-hidden listings can be rechecked and recovered after rules change', () => {
  const store = readFileSync(new URL('../server/immofinderStore.ts', import.meta.url), 'utf8');
  assert.match(store, /write_time_quality.*hardReason/);
  assert.match(store, /SELECT id, listing_url, source_urls[\s\S]*hidden, hide_reason/);
  assert.match(store, /recoverAutomaticHide && writeGateAutoHide/);
});

test('seen-cache skips are reason-logged and transient detail-page rejects are retried', () => {
  const pipeline = readFileSync(new URL('../server/immofinderPipeline.ts', import.meta.url), 'utf8');
  assert.match(pipeline, /type: 'immofinder_candidate_skipped_seen'/);
  assert.match(pipeline, /detail_page_\|not_single_listing/);
  assert.match(pipeline, /markSeen\(it\.url, src\.id, 'filtered', reason\)/);
  assert.match(pipeline, /type: 'immofinder_run_scope'/);
});

test('database diagnostics expose aggregate DB and pool health without credentials', () => {
  const diag = readFileSync(new URL('../server/immofinderDiag.ts', import.meta.url), 'utf8');
  assert.match(diag, /immoDatabaseDiagnostics/);
  assert.match(diag, /immofinder_listings/);
  assert.match(diag, /immofinder_seen/);
  assert.match(diag, /waiting: pool\.waitingCount/);
  assert.doesNotMatch(diag, /DATABASE_URL/);
});

const leanCfg = (over = {}) => ({
  ...cfg, municipalities: ['Chur', 'Zizers'], sources: [], fetch: { ...cfg.fetch, perHostDelayMs: 0 },
  discovery: { ...cfg.discovery, communesPerRun: 1, queries: ['A {commune}'], portalQueries: [], maxPagesPerRun: 10, serperMinIntervalMs: 0, maxCandidatesPerQuery: 4, ...over },
});
const memStore = (saved = []) => ({ findByUrl: async () => null, touch: async () => {}, upsert: async (r) => { saved.push(r); return 'new'; }, getSeen: async () => null, markSeen: async () => {} });
const noPage = async () => ({ ok: false, status: 403, body: '' });
const staleHit = [{ title: 'Wikipedia', link: 'https://de.wikipedia.org/wiki/Chur', snippet: '' }];

test('C131 defaults are restored and sanitization clamps the search fields', () => {
  const d = defaultSettings(cfg);
  assert.equal(d.schedule.everyHours, 3);
  assert.deepEqual([d.search.carouselCommunesPerRun, d.search.privateQueryTemplates, d.search.enrichSearchesPerRun, d.search.recheckContactSearch, d.search.maxAiPages], [12, 2, 0, false, 40]);
  const s = sanitizeSettings({ search: { privateQueryTemplates: 99, enrichSearchesPerRun: -4, carouselCommunesPerRun: 50 } }, cfg);
  assert.deepEqual([s.search.privateQueryTemplates, s.search.enrichSearchesPerRun, s.search.carouselCommunesPerRun], [2, 0, 12]);
  const legacy = sanitizeSettings({ search: { freshness: 'w', freshnessFallback: true } }, cfg);
  assert.equal(Object.hasOwn(legacy.search, 'freshness'), false, 'obsolete date-filter settings are ignored');
  assert.equal(Object.hasOwn(legacy.search, 'freshnessFallback'), false);
  assert.equal(sanitizeSettings({ search: { carouselCommunesPerRun: 2 } }, cfg).search.carouselCommunesPerRun, 12, 'stale two-commune setting falls back to the 12-commune default');
});

test('P129.48 applySettings maps private templates and enrichment budget into the run config', () => {
  const eff = applySettings(cfg, sanitizeSettings({ search: { privateQueryTemplates: 1, enrichSearchesPerRun: 3 } }, cfg));
  assert.equal(eff.discovery.queries.length, 1);
  assert.equal(Object.hasOwn(eff.discovery, 'freshness'), false);
  assert.equal(Object.hasOwn(eff.discovery, 'freshnessFallback'), false);
  assert.equal(eff.contactEnrichment.maxExtraSearchesPerRun, 3);
  const lean = applySettings(cfg, defaultSettings(cfg));
  assert.equal(lean.discovery.queries.length, 2);
  const staleSlice = sanitizeSettings({ search: { communes: ['Chur', 'Zizers', 'Igis', 'Landquart'], carouselCommunesPerRun: 2 } }, cfg);
  assert.equal(applySettings(cfg, staleSlice).discovery.communesPerRun, 12);
  const four = ['Chur', 'Zizers', 'Igis', 'Landquart'];
  const fourCfg = applySettings(cfg, sanitizeSettings({ search: { communes: four, carouselCommunesPerRun: 2 } }, cfg));
  assert.deepEqual(communesForRun(fourCfg.municipalities, fourCfg.discovery.communesPerRun, 0), four);
  assert.equal(lean.contactEnrichment.maxExtraSearchesPerRun, 0);
});

test('discovery interleaves communes so a bounded run cannot starve later locations', () => {
  const planCfg = { ...cfg, municipalities: ['Chur', 'Zizers', 'Igis'], discovery: { ...cfg.discovery, communesPerRun: 3, queries: ['private-A {commune}', 'private-B {commune}'], portalQueries: ['portal-A {commune}'] } };
  const plan = buildQueries(planCfg, 0);
  assert.deepEqual(plan, [
    'private-A Chur', 'private-A Zizers', 'private-A Igis',
    'portal-A Chur', 'portal-A Zizers', 'portal-A Igis',
    'private-B Chur', 'private-B Zizers', 'private-B Igis',
  ]);
});

test('each discovery query processes at most four detail candidates and interleaves commune coverage', async () => {
  const localCfg = leanCfg({ communesPerRun: 2, queries: ['A {commune}', 'B {commune}'], portalQueries: ['site:flatfox.ch C {commune}'], maxPagesPerRun: 80 });
  const queried = []; const fetched = []; let serial = 0;
  const result = await runPipeline({
    config: localCfg,
    fetchPage: async (url) => { fetched.push(url); return { ok: false, status: 403, body: '' }; },
    llm: null, store: memStore(),
    search: async (q) => { queried.push(q); const base = ++serial * 100; return Array.from({ length: 5 }, (_, i) => ({ title: `3.5 Zimmer Wohnung in Chur ${base+i}`, link: `https://example.com/listing/${base+i+100000}`, snippet: 'Wohnung zu vermieten' })); },
    cycle: 0,
  }, { dryRun: true, wave: 'carousel' });
  assert.equal(fetched.length, 24, 'four candidates are fetched from each of six commune/template queries');
  assert.equal(queried.length, 6, 'every interleaved commune/template query is attempted');
  assert.deepEqual(queried, [
    '"Chur" ("Wohnung zu vermieten" OR "Mietwohnung" OR "Wohnung mieten") -kaufen -verkaufen',
    '"Zizers" ("Wohnung zu vermieten" OR "Mietwohnung" OR "Wohnung mieten") -kaufen -verkaufen',
    'site:flatfox.ch "Chur" (Wohnung OR Appartement) (mieten OR vermieten OR "à louer") -kaufen -verkaufen',
    'site:flatfox.ch "Zizers" (Wohnung OR Appartement) (mieten OR vermieten OR "à louer") -kaufen -verkaufen',
    '"Chur" ("3 Zimmer" OR "3.5 Zimmer" OR "4 Zimmer" OR "4.5 Zimmer") (Miete OR Mietzins) -kaufen -verkaufen',
    '"Zizers" ("3 Zimmer" OR "3.5 Zimmer" OR "4 Zimmer" OR "4.5 Zimmer") (Miete OR Mietzins) -kaufen -verkaufen',
  ]);
  assert.equal(result.counts.candidates, 24);
});
test('portal SERP sources do not early-stop after the catalogue bad-streak threshold', async () => {
  const communes = ['Chur', 'Zizers', 'Igis', 'Landquart', 'Malans', 'Maienfeld', 'Jenaz', 'Grüsch'];
  const localCfg = leanCfg();
  localCfg.municipalities = communes;
  localCfg.discovery = { ...localCfg.discovery, communesPerRun: communes.length, queries: [], portalQueries: ['site:flatfox.ch {commune} Wohnung mieten'], maxPagesPerRun: 420 };
  const queried = []; const fetched = [];
  const result = await runPipeline({
    config: localCfg,
    fetchPage: async (url) => { fetched.push(url); return { ok: false, status: 403, body: '' }; },
    llm: null, store: memStore(),
    search: async (q) => { queried.push(q); const base = queried.length * 100; const commune = communes[queried.length - 1]; return Array.from({ length: 5 }, (_, i) => ({ title: `3.5 Zimmer Wohnung in ${commune}`, link: `https://flatfox.ch/en/flat/abc-${base+i}`, snippet: 'Wohnung zu vermieten' })); },
    cycle: 0,
  }, { dryRun: true, wave: 'carousel' });
  assert.equal(queried.length, communes.length, 'every selected commune is queried for this portal');
  assert.equal(fetched.length, communes.length * 4, 'four candidates from every commune reach the fetch stage');
  const portalStats = result.sourceStats.find((s) => s.id === 'portal-flatfox');
  assert.equal(portalStats?.candidates, communes.length * 4, 'portal candidates are attributed to the actual portal source');
  assert.equal(portalStats?.queries, communes.length, 'zero-hit queries remain visible in per-portal stats');
  assert.equal(portalStats?.hits, communes.length * 5);
  assert.notEqual(portalStats?.stoppedEarly, true);
  assert.equal(result.errors.some((e) => e.code === 'source_early_stop'), false);
});
test('duplicate top SERP hits do not consume the per-query candidate cap', async () => {
  const localCfg = leanCfg({ communesPerRun: 1, queries: ['A {commune}', 'B {commune}'], portalQueries: [], maxPagesPerRun: 80 });
  const fetched = [];
  const hit = (id) => ({ title: `3.5 Zimmer Wohnung in Chur ${id}`, link: `https://example.com/listing/${100000 + id}`, snippet: 'Wohnung zu vermieten' });
  let queryIndex = 0;
  const result = await runPipeline({
    config: localCfg, fetchPage: async (url) => { fetched.push(url); return { ok: false, status: 403, body: '' }; },
    llm: null, store: memStore(), search: async () => queryIndex++ === 0 ? [hit(1), hit(2), hit(3)] : [hit(1), hit(2), hit(4), hit(5), hit(6)], cycle: 0,
  }, { dryRun: true, wave: 'carousel' });
  assert.equal(result.counts.candidates, 6, 'duplicate URLs are removed before the four-candidate cap is applied');
  assert.equal(fetched.length, 6);
});
test('P129.52 portal inventory is searched without a Google date cutoff', async () => {
  const portalOptions = [];
  const portalCfg = leanCfg({ queries: [], portalQueries: ['site:homegate.ch {commune} Wohnung mieten'] });
  await runPipeline({
    config: portalCfg, fetchPage: noPage, llm: null, store: memStore(),
    search: async (_q, options) => { portalOptions.push(options); return []; }, cycle: 0,
  }, { dryRun: true, wave: 'carousel' });
  assert.equal(portalOptions.length, 1);
  assert.equal(portalOptions[0], undefined, 'active portal ads are not excluded by qdr:m');

  const privateOptions = [];
  const privateCfg = leanCfg({ portalQueries: [], queries: ['{commune} Wohnung privat'] });
  await runPipeline({
    config: privateCfg, fetchPage: noPage, llm: null, store: memStore(),
    search: async (_q, options) => { privateOptions.push(options); return []; }, cycle: 0,
  }, { dryRun: true, wave: 'carousel' });
  assert.equal(privateOptions[0], undefined, 'private listings are not hidden by Google indexing freshness');
});

test('Swiss listings with net and gross rent remain eligible and gross rent is preferred for the budget check', () => {
  const text = "3.5-Zimmer-Wohnung in Chur. Nettomiete CHF 1'500 pro Monat. Bruttomiete CHF 1'800 pro Monat. Nebenkosten CHF 300 pro Monat. Helle Wohnung mit Balkon und Küche.";
  assert.equal(resolveListingPrice(text, null)?.amount, 1800);
  const netStored = { listing_url: 'https://www.homegate.ch/mieten/4001234567', property_name: '3.5-Zimmer-Wohnung in Chur', municipality: 'Chur', rooms_estimated: 3.5, rooms_basis: 'zimmer', rent_monthly_chf: 1500, pricing_unit: 'month', raw: { price: { amount: 1500, unit: 'month' }, evidence_text: text, evidence_kind: 'page_text', evidence_url: 'https://www.homegate.ch/mieten/4001234567' } };
  assert.equal(hardRejectReason(netStored, ctxFromConfig(cfg)), null);
  assert.equal(sanitizeNewRecord(netStored, ctxFromConfig(cfg)).rec.raw.price.amount, 1800, 'replace net rent with the gross amount for the budget check');
  const url = 'https://www.homegate.ch/mieten/4001234567';
  const row = { listing_url: url, property_name: '3.5-Zimmer-Wohnung in Chur', municipality: 'Chur', rooms_estimated: 3.5, rooms_basis: 'zimmer', rent_monthly_chf: 1800, pricing_unit: 'month', raw: { price: { amount: 1800, unit: 'month' }, evidence_text: text, evidence_kind: 'page_text', evidence_url: url } };
  assert.equal(hardRejectReason(row, ctxFromConfig(cfg)), null);
});
test('pipeline uses the configured portal allowlist at its final write gate', async () => {
  const url = 'https://flatfox.ch/en/flat/abc-123';
  const body = `<html><head><title>3.5 Zimmer Wohnung in Chur</title></head><body><h1>3.5 Zimmer Wohnung in Chur zu vermieten</h1><p>Miete CHF 1'500 pro Monat. Inseriert am: 20.11.2026. Kontakt +41 79 123 45 67. Wohnfläche 80 m2. Helle Räume mit Balkon, Küche und Bad. Bezug ab sofort möglich.</p></body></html>`;
  const saved = [];
  const localCfg = leanCfg({ contactEnrichment: { ...cfg.contactEnrichment, enabled: false } });
  const result = await runPipeline({
    config: localCfg,
    fetchPage: async () => ({ ok: true, status: 200, body, finalUrl: url }),
    llm: null, store: memStore(saved),
    search: async () => [{ title: '3.5 Zimmer Wohnung in Chur', link: url, snippet: 'CHF 1500 pro Monat in Chur' }],
    cycle: 0,
  }, { dryRun: false, wave: 'carousel' });
  assert.equal(result.counts.kept, 1);
  assert.equal(result.counts.new, 1);
  assert.equal(result.filtered.list_or_search_page || 0, 0);
  assert.equal(saved.length, 1);
});
test('sameListingUrlTarget accepts stable portal slugs across language redirects only', () => {
  assert.equal(sameListingUrlTarget('https://flatfox.ch/en/flat/abc-123', 'https://flatfox.ch/de/flat/abc-123'), true);
  assert.equal(sameListingUrlTarget('https://flatfox.ch/en/flat/abc-123', 'https://flatfox.ch/de/flat/abc-124'), false);
  assert.equal(sameListingUrlTarget('https://flatfox.ch/en/flat/abc-123', 'https://homegate.ch/en/flat/abc-123'), false);
});
test('non-standard Swiss portal detail URL survives the final write-time and repair gate', () => {
  const url = 'https://flatfox.ch/en/flat/abc-123';
  const evidence = '3.5 Zimmer Wohnung in Chur. Helle Wohnung mit Balkon und eigener Küche. Ruhige Lage nahe Bahnhof.';
  const row = { listing_url: url, property_name: '3.5 Zimmer Wohnung in Chur', municipality: 'Chur', rooms_estimated: 3.5, rooms_basis: 'zimmer', raw: { evidence_text: evidence, evidence_kind: 'page_text', evidence_url: url } };
  assert.equal(hardRejectReason(row, ctxFromConfig(cfg)), null, 'unknown rent is allowed when the page is otherwise verified');
});
test('htmlToText excludes head metadata from listing evidence', () => {
  assert.equal(htmlToText('<html><head><title>3.5 Zimmer Wohnung in Chur</title><meta name="description" content="Helle Wohnung"></head><body>Zu vermieten.</body></html>'), 'Zu vermieten.');
});

test('nonListingReason does not treat every URL as a listing/search page', () => {
  assert.equal(nonListingReason('3.5 Zimmer Wohnung in Chur', 'https://www.immoscout24.ch/rent/flat/offer-77'), null);
  assert.equal(nonListingReason('3.5 Zimmer Wohnung in Chur', 'https://www.homegate.ch/rent/123456789'), null);
  assert.equal(nonListingReason('Wohnungen mieten', 'https://www.homegate.ch/rent/search'), 'list_or_search_page');
});
test('Swiss portal detail URLs without numeric IDs or long slugs survive discovery filtering', () => {
  const portalCfg = leanCfg({ portalHosts: ['homegate.ch', 'flatfox.ch', 'immoscout24.ch'] });
  const hits = [
    { title: '3.5 Zimmer Wohnung in Chur', link: 'https://flatfox.ch/en/flat/abc-123', snippet: 'CHF 1650 in Chur' },
    { title: '4 Zimmer Wohnung in Zizers', link: 'https://www.immoscout24.ch/rent/flat/offer-77', snippet: 'CHF 1800 in Zizers' },
    { title: 'Wohnungen mieten', link: 'https://www.homegate.ch/rent/search', snippet: 'Suchresultate' },
  ];
  const picked = pickItems(hits, portalCfg);
  assert.deepEqual(picked.map((x) => x.url), hits.slice(0, 2).map((x) => x.link));
  assert.equal(isPortalDetailLink(hits[0].link, portalCfg), true);
  assert.equal(isPortalDetailLink(hits[2].link, portalCfg), false);
});
test('P129.44 snippet text keeps each distinct segment once', () => {
  const title = 'Heimeliges Haus 4 1/2 Zimmer in Maladers';
  const out = dedupeSnippetText(title, `${title} CHF 1'690.– mietzins brutto ... ${title} CHF 1'690.– mietzins brutto ... Haustiere erlaubt`);
  assert.equal((out.match(/mietzins brutto/g) || []).length, 1);
  assert.ok(!out.includes(title));
  assert.match(out, /Haustiere erlaubt/);
});

test('P131.5 marks an all-provider-failure run INFRA_FAIL, not a zero-result quality outcome', async () => {
  const result = await runPipeline({
    config: leanCfg(), fetchPage: noPage, llm: null, store: memStore(),
    search: async () => { throw new Error('Serper HTTP 400: Not enough credits'); }, cycle: 0,
  }, { dryRun: true, wave: 'carousel' });
  assert.equal(result.counts.serper_calls, 1);
  assert.equal(result.counts.candidates, 0);
  assert.equal(result.counts.fetched, 0);
  assert.equal(result.status, 'INFRA_FAIL');
});

test('discovery performs one unrestricted Serper call per query, without a freshness retry', async () => {
  const calls = [];
  const search = async (_q, options) => { calls.push(options ?? null); return staleHit; };
  const result = await runPipeline({ config: leanCfg(), fetchPage: noPage, llm: null, store: memStore(), search, cycle: 0 }, { dryRun: true, wave: 'carousel' });
  assert.equal(result.counts.serper_calls, 1);
  assert.equal(result.counts.serper_fallback, 0);
  assert.equal(result.status, 'COMPLETED', 'a successful search response remains a completed run even if no listing survives');
  assert.deepEqual(calls, [null]);
});

test('P130.17 social feed snippets are rejected and never become listings', async () => {
  const hits = [
    { title: 'Wohnung zu vermieten in Chur', link: 'https://www.facebook.com/groups/1/posts/11/', snippet: 'Schöne Wohnung in Chur, CHF 1\'400 pro Monat, Tel 079 123 45 67' },
    { title: '3.5 Zimmer Wohnung in Chur', link: 'https://www.facebook.com/groups/1/posts/12/', snippet: 'Zu vermieten in Chur, CHF 1\'400 pro Monat, Tel 079 123 45 67' },
  ];
  let llmCalls = 0; const marked = []; const saved = [];
  const store = { ...memStore(saved), markSeen: async (u, source, decision, reason) => { marked.push({ u, source, decision, reason }); } };
  const llm = async () => { llmCalls++; return null; };
  const res = await runPipeline({ config: leanCfg(), fetchPage: noPage, llm, store, search: async () => hits, cycle: 0 }, { dryRun: false, wave: 'carousel' });
  assert.equal(res.counts.snippet_only, 2);
  assert.equal(res.counts.kept, 0);
  assert.equal(llmCalls, 0, 'snippet evidence is never sent to extraction');
  assert.equal(saved.length, 0, 'snippet-only social posts never enter storage');
  assert.equal(marked.length, 2);
  assert.ok(marked.every((item) => item.reason === 'trust_snippet_only'));
});

test('P130.17 a failed portal fetch cannot fall back to a SERP-evidence listing', async () => {
  const url = 'https://www.homegate.ch/mieten/4001234567';
  const saved = []; let llmCalls = 0;
  const res = await runPipeline({
    config: leanCfg(), fetchPage: noPage,
    llm: async () => { llmCalls++; return null; }, store: memStore(saved),
    search: async () => [{ title: '3.5-Zimmer-Wohnung in Chur', link: url, snippet: 'Miete CHF 1\'500 pro Monat, Chur' }], cycle: 0,
  }, { dryRun: false, wave: 'carousel' });
  assert.equal(res.counts.snippet_only, 1);
  assert.equal(res.counts.kept, 0);
  assert.equal(llmCalls, 0, 'unverified fallback evidence is never sent to extraction');
  assert.equal(saved.length, 0);
});

test('P130.17 direct detail admission requires identity-matched URL and complete page facts', async () => {
  const url = 'https://www.homegate.ch/mieten/4001234567';
  const body = `<html><head><title>3.5-Zimmer-Wohnung in Chur</title><meta name="description" content="Helle Wohnung mit Balkon und Küche"></head><body><h1>3.5-Zimmer-Wohnung in Chur zu vermieten</h1><p>Miete CHF 1'500 pro Monat. Inseriert am: 20.11.2026. Kontakt Vermieter: +41 79 123 45 67. Wohnfläche 80 m2. Helle Räume, Balkon, Küche und Bad. Bezug ab sofort möglich. Separates Kellerabteil und ruhige Lage.</p></body></html>`;
  const saved = [];
  const good = await runPipeline({
    config: leanCfg(), fetchPage: async () => ({ ok: true, status: 200, body, finalUrl: url }),
    llm: null, store: memStore(saved), search: async () => [{ title: '3.5-Zimmer-Wohnung in Chur', link: url, snippet: 'Wohnung mieten' }], cycle: 0,
  }, { dryRun: false, wave: 'carousel' });
  assert.equal(good.counts.kept, 1);
  assert.equal(good.counts.new, 1);
  assert.equal(good.sourceStats[0].new, 1);
  assert.equal(saved.length, 1);

  const noFinalUrlSaved = [];
  const noFinalUrl = await runPipeline({
    config: leanCfg(), fetchPage: async () => ({ ok: true, status: 200, body }),
    llm: null, store: memStore(noFinalUrlSaved), search: async () => [{ title: '3.5-Zimmer-Wohnung in Chur', link: url, snippet: 'Wohnung mieten' }], cycle: 0,
  }, { dryRun: false, wave: 'carousel' });
  assert.equal(noFinalUrl.counts.kept, 0, 'missing final URL provenance fails closed');
  assert.equal(noFinalUrlSaved.length, 0);

  const wrongSaved = [];
  const redirected = await runPipeline({
    config: leanCfg(), fetchPage: async () => ({ ok: true, status: 200, body, finalUrl: 'https://www.homegate.ch/mieten/4009999999' }),
    llm: null, store: memStore(wrongSaved), search: async () => [{ title: '3.5-Zimmer-Wohnung in Chur', link: url, snippet: 'Wohnung mieten' }], cycle: 0,
  }, { dryRun: false, wave: 'carousel' });
  assert.equal(redirected.counts.snippet_only, 1);
  assert.equal(redirected.counts.kept, 0);
  assert.equal(wrongSaved.length, 0, 'redirect mismatch cannot become a provisional listing');

  const shortSaved = [];
  const shortPage = await runPipeline({
    config: leanCfg(), fetchPage: async () => ({ ok: true, status: 200, body: '<html><head><title>3.5 Zimmer Wohnung in Chur</title></head><body>Zu vermieten.</body></html>', finalUrl: url }),
    llm: null, store: memStore(shortSaved), search: async () => [{ title: '3.5-Zimmer-Wohnung in Chur', link: url, snippet: 'Wohnung mieten' }], cycle: 0,
  }, { dryRun: false, wave: 'carousel' });
  assert.equal(shortPage.counts.snippet_only, 1);
  assert.equal(shortPage.counts.kept, 0, 'short page and snippet fallback are rejected');
  assert.equal(shortSaved.length, 0);
});

test('Google SERP crawl date is not treated as the listing publication date', async () => {
  const url = 'https://www.homegate.ch/mieten/4001234567';
  const body = `<html><head><title>3.5-Zimmer-Wohnung in Chur</title></head><body><p>3.5-Zimmer-Wohnung in Chur zu vermieten. Miete CHF 1'500 pro Monat. Kontakt Vermieter: +41 79 123 45 67. Helle Wohnung mit Balkon und Küche, Bezug ab sofort möglich.</p></body></html>`;
  const saved = [];
  const result = await runPipeline({
    config: leanCfg(), fetchPage: async () => ({ ok: true, status: 200, body, finalUrl: url }), llm: null, store: memStore(saved),
    search: async () => [{ title: '3.5-Zimmer-Wohnung in Chur', link: url, snippet: 'Wohnung mieten', date: '2 years ago' }], cycle: 0,
  }, { dryRun: false, wave: 'carousel' });
  assert.equal(result.counts.kept, 1, 'publication date is optional and the SERP crawl date is not used');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].listed_at, null, 'no page publication date means no stored publication date');
});
test('polite fetcher blocks private targets and validates each redirect hop', async () => {
  const calls = [];
  const localCfg = { ...cfg, fetch: { ...cfg.fetch, respectRobotsTxt: false, perHostDelayMs: 0 }, limits: { ...cfg.limits, fetchTimeoutMs: 1000, maxPageBytes: 128 } };
  const fetchImpl = async (input, init) => {
    calls.push({ url: String(input), redirect: init?.redirect });
    if (String(input) === 'https://public.example/start') return new Response('', { status: 302, headers: { location: 'http://127.0.0.1/private' } });
    return new Response('x'.repeat(500), { status: 200, headers: { 'content-type': 'text/html' } });
  };
  const fetchPage = createPoliteFetch(localCfg, fetchImpl, async (target) => new URL(target).hostname !== '127.0.0.1');
  const privateTarget = await fetchPage('http://127.0.0.1/private');
  assert.equal(privateTarget.fetchMode, 'blocked_non_public');
  assert.equal(calls.length, 0, 'private addresses are blocked before any request');
  const redirect = await fetchPage('https://public.example/start');
  assert.equal(redirect.fetchMode, 'blocked_non_public_redirect');
  assert.equal(calls.length, 1, 'the private redirect target is never requested');
  assert.equal(calls[0].redirect, 'manual', 'redirects are validated before following');
  const large = await fetchPage('https://public.example/large');
  assert.equal(large.body.length, 128, 'response bodies are capped while streaming, not after full download');
});
test('robots.txt Allow exceptions override broader Disallow rules without bypassing specific blocks', async () => {
  const calls = [];
  const fetchImpl = async (input) => {
    const url = String(input); calls.push(url);
    if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nDisallow: /\nAllow: /mieten/\nDisallow: /mieten/private\n', { status: 200 });
    return new Response('<html><body><h1>3.5 Zimmer Wohnung in Chur</h1><p>CHF 1,600 pro Monat. Helle Wohnung mit Balkon und Küche, Bezug ab sofort.</p></body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
  };
  const fetchPage = createPoliteFetch({ ...cfg, fetch: { ...cfg.fetch, respectRobotsTxt: true, perHostDelayMs: 0 }, limits: { ...cfg.limits, fetchTimeoutMs: 1000, maxPageBytes: 100000 } }, fetchImpl, async () => true);
  const allowed = await fetchPage('https://robots-test.example/mieten/123456');
  assert.equal(allowed.ok, true, 'a specific Allow rule beats the broader Disallow /');
  const blocked = await fetchPage('https://robots-test.example/mieten/private/123456');
  assert.equal(blocked.ok, false);
  assert.equal(blocked.fetchMode, 'robots_blocked', 'the more specific Disallow still wins');
  assert.equal(calls.filter((url) => url.endsWith('/robots.txt')).length, 1, 'robots rules are cached per host');
  assert.equal(calls.filter((url) => url.startsWith('https://robots-test.example/mieten/')).length, 1, 'blocked pages are not fetched; a Jina retry is a separate host');
});
test('P129.52 blocked direct portal pages retry through Jina Reader with source URL verification', async () => {
  const target = 'https://portal.example/listing/123456';
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), headers: init?.headers || {} });
    if (String(url).startsWith('https://r.jina.ai/')) {
      return new Response(`Title: 4.5 Zimmer Wohnung in Chur\nURL Source: ${target}\n\nMarkdown Content:\n4.5 Zimmer Wohnung in Chur. CHF 1'600 pro Monat. Helle Wohnung mit Balkon und Küche, separates Kellerabteil, ruhige Lage und gute Verkehrsanbindung. Die Wohnung verfügt über einen grosszügigen Wohnbereich, eine moderne Küche, ein Badezimmer und einen sonnigen Balkon.`, {
        status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
    return new Response('forbidden', { status: 403, headers: { 'content-type': 'text/plain' } });
  };
  const fetchPage = createPoliteFetch({
    ...cfg,
    fetch: { ...cfg.fetch, respectRobotsTxt: false, perHostDelayMs: 0 },
    limits: { ...cfg.limits, fetchTimeoutMs: 1000, maxPageBytes: 100000 },
  }, fetchImpl, async () => true);
  const page = await fetchPage(target);
  assert.equal(page.ok, true);
  assert.equal(page.fetchMode, 'jina_reader');
  assert.equal(page.finalUrl, target);
  assert.match(page.body, /CHF 1'600 pro Monat/);
  assert.equal(calls.length, 2);
  assert.ok(!JSON.stringify(calls).includes('Bearer test-key'));
});

test('P129.44 enrichment uses holiday-home wording only for house-style names', () => {
  const plain = buildSecondaryQueries({ listingUrl: 'u', propertyName: '4.5 Zimmer Wohnung in Chur', municipality: 'Chur', ownerName: null, photoUrls: [], existingPhones: [], existingEmails: [], platformDomains: [] });
  assert.ok(!plain.some((q) => /Chalet OR Chesa/.test(q)));
  const house = buildSecondaryQueries({ listingUrl: 'u', propertyName: 'Chesa Alba Chur Haus', municipality: 'Chur', ownerName: null, photoUrls: [], existingPhones: [], existingEmails: [], platformDomains: [] });
  assert.ok(house.some((q) => /Chalet OR Chesa/.test(q)));
});

test('P130.5 GitHub App probe names the exact cause and never returns a token', async () => {
  const crypto = await import('node:crypto');
  const { probeGitHubAppSetup, githubAppConfigFromEnv } = await import('../server/githubIntegration.ts');
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const config = { appId: '123', installationId: '456', privateKey, owner: 'o', repository: 'r' };
  const reply = (status, body, id = 'REQ1') => ({ ok: status < 300, status, headers: { get: (k) => (k === 'x-github-request-id' ? id : null) }, json: async () => body });
  const make = ({ appPerm, instPerm, scopedStatus = 201, repoStatus = 200, instStatus = 200 }) => async (url, init = {}) => {
    if (url.endsWith('/app')) return reply(200, { id: 123, slug: 'biforge-control', permissions: { contents: appPerm } });
    if (url.endsWith('/app/installations/456')) return reply(instStatus, { id: 456, app_id: 123, account: { login: 'ecooorg' }, repository_selection: 'selected', permissions: { contents: instPerm } });
    if (url.endsWith('/access_tokens')) {
      const wantsWrite = JSON.parse(init.body).permissions.contents === 'write';
      return wantsWrite ? reply(scopedStatus, scopedStatus < 300 ? { token: 'ghs_SECRET' } : { message: 'The level of access for permissions requested are not granted to this installation' }) : reply(201, { token: 'ghs_read' });
    }
    if (url.endsWith('/repos/o/r')) return reply(repoStatus, { id: 9, full_name: 'o/r' });
    throw new Error('unexpected ' + url);
  };
  const run = (opts) => probeGitHubAppSetup(config, make(opts));
  let p = await run({ appPerm: 'read', instPerm: 'read' });
  assert.equal(p.cause, 'app_lacks_contents_write');
  p = await run({ appPerm: 'write', instPerm: 'read' });
  assert.equal(p.cause, 'permission_not_accepted_on_installation');
  assert.match(p.fix, /accept the pending permission request/);
  p = await run({ appPerm: 'write', instPerm: 'write', repoStatus: 404 });
  assert.equal(p.cause, 'repository_not_in_installation');
  p = await run({ appPerm: 'write', instPerm: 'write', scopedStatus: 422 });
  assert.equal(p.cause, 'write_token_refused');
  assert.equal(p.steps.at(-1).httpStatus, 422);
  p = await run({ appPerm: 'write', instPerm: 'write', instStatus: 404 });
  assert.equal(p.cause, 'installation_not_found');
  p = await run({ appPerm: 'write', instPerm: 'write' });
  assert.equal(p.verdict, 'OK');
  assert.equal(p.installation.account, 'ecooorg');
  assert.doesNotMatch(JSON.stringify(p), /ghs_|BEGIN/, 'no token or key in the result');
  assert.deepEqual(githubAppConfigFromEnv({}).missing.sort(), ['GITHUB_APP_ID', 'GITHUB_APP_INSTALLATION_ID', 'GITHUB_APP_PRIVATE_KEY', 'GITHUB_REPOSITORY_NAME', 'GITHUB_REPOSITORY_OWNER']);
});

test('P131.3b L3 platform contact is verified against the same fetched HTML page', () => {
  const listingUrl = 'https://www.happyholiday.ch/ferienwohnung/12345';
  const pageText = '3.5-Zimmer-Ferienwohnung in Chur zu vermieten. Diese gepflegte Wohnung bietet eine Küche, ein Bad, einen Balkon und einen schönen Wohnbereich. Vermietung von privat durch den Eigentümer.';
  const pageHtml = '<html><body><form action="/contact"><textarea name="message"></textarea><button type="submit">Nachricht senden</button></form></body></html>';
  const input = {
    resultType: 'tourist_owner', listingUrl, finalUrl: listingUrl, title: '3.5-Zimmer-Ferienwohnung in Chur',
    pageText, pageHtml, municipalities: ['Chur'], municipality: 'Chur', propertyName: 'Ferienwohnung', rooms: 3.5,
    ownerName: null, ownerEvidenceQuote: 'Vermietung von privat', contactRoute: 'platform_message', contactEvidence: [], fetchedAt: new Date().toISOString(),
  };
  assert.equal(hasPageContactAction(pageHtml), true);
  assert.equal(hasPageContactAction(pageText), false, 'normalized page text is not a substitute for fetched HTML');
  assert.equal(buildC131LetterDraft(input).ready, true, 'same-page structured form permits a verified L3 draft');
  assert.equal(buildC131LetterDraft({ ...input, pageHtml: '<html><body><p>Keine Kontaktmöglichkeit</p></body></html>' }).ready, false);
  assert.equal(buildC131LetterDraft({ ...input, contactRoute: 'none' }).ready, false);
  assert.equal(buildC131LetterDraft({ ...input, finalUrl: 'https://www.happyholiday.ch/ferienwohnung/99999' }).ready, false);
});

test('P131.8k prefetch geo skips do not count toward the source early-stop streak', () => {
  const src = readFileSync(new URL('../server/immofinderPipeline.ts', import.meta.url), 'utf8');
  for (const stage of ["stage: 'url_geo'", "stage: 'title_snippet_geo'"]) {
    const i = src.indexOf(stage);
    assert.ok(i > 0, stage);
    const block = src.slice(i, i + 450);
    assert.match(block, /st\.geo\+\+;/);
    assert.doesNotMatch(block, /consecutiveBad\+\+/);
  }
});

test('P131.8l Serper goto links are resolved in parallel and a failed row keeps its link', async () => {
  const previousKey = process.env.SERPER_API_KEY;
  process.env.SERPER_API_KEY = 'test-key';
  const goto = (n) => `https://www.google.com/goto?url=tok${n}`;
  const rowsIn = [1, 2, 3].map((n) => ({ title: `T${n}`, link: goto(n), snippet: 's' }));
  let inFlight = 0; let maxInFlight = 0;
  try {
    const search = createSerperSearch(async (url, init) => {
      if (!String(url).endsWith('/resolve')) return new Response(JSON.stringify({ organic: rowsIn }), { status: 200 });
      const row = JSON.parse(init.body).organic[0];
      inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 30));
      inFlight--;
      if (row.title === 'T2') return new Response('{}', { status: 500 });
      return new Response(JSON.stringify({ organic: [{ ...row, link: `https://example.ch/${row.title}` }] }), { status: 200 });
    });
    const rows = await search('Chur Wohnung mieten');
    assert.equal(maxInFlight, 3, 'all goto rows resolve concurrently');
    assert.deepEqual(rows.map((r) => r.link), ['https://example.ch/T1', goto(2), 'https://example.ch/T3']);
  } finally {
    if (previousKey === undefined) delete process.env.SERPER_API_KEY;
    else process.env.SERPER_API_KEY = previousKey;
  }
});

test('P131.8m next SERP call is started while the current query is processed', () => {
  const pipeline = readFileSync(new URL('../server/immofinderPipeline.ts', import.meta.url), 'utf8');
  assert.match(pipeline, /prefetchedSearch\.set\(nextQ, started\)/);
  assert.match(pipeline, /!finishAll && timeLeft\(\) > 90_000/);
});
