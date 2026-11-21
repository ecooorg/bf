import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, sanitizeSettings, applySettings, SOURCE_IDS } from '../server/immofinderSettings.ts';
import { runPipeline } from '../server/immofinderPipeline.ts';
import { dedupeSnippetText, htmlToText } from '../server/immofinderCore.ts';
import { buildSecondaryQueries } from '../server/immofinderContactEnrichment.ts';
import { createSerperSearch, communesForRun, pickItems, isPortalDetailLink } from '../server/immofinderDiscovery.ts';
import { sameListingUrlTarget, encodeSeenReason, decodeSeenReason, REPAIR_RULES_VERSION, hardRejectReason, ctxFromConfig } from '../server/immofinderRepair.ts';
import { createPoliteFetch } from '../server/immofinderFetcher.ts';
import { placeFromTitleOrSnippet, nonListingReason } from '../server/immofinderCore.ts';
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('../config/immofinder.json', import.meta.url), 'utf8'));

test('P129.48 defaults enable all Swiss portals and private discovery across a larger carousel slice', () => {
  const settings = defaultSettings(cfg);
  assert.equal(settings.search.carouselCommunesPerRun, 12);
  assert.deepEqual(
    Object.entries(settings.search.sources).filter(([, enabled]) => enabled).map(([id]) => id).sort(),
    [...SOURCE_IDS].sort(),
  );
  assert.equal(sanitizeSettings({}, cfg).search.carouselCommunesPerRun, 12);
  assert.equal(settings.search.privateQueryTemplates, 4);
  assert.equal(settings.schedule.everyHours, 3);
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

test('geo helper requires title, snippet and municipality allowlist and matches only explicit local evidence', () => {
  assert.deepEqual(placeFromTitleOrSnippet('3.5 Zimmer Wohnung', 'in Chur zu vermieten', ['Chur']), { matched: 'Chur', outside: false, hint: 'Chur' });
  assert.equal(placeFromTitleOrSnippet('Wohnung zu vermieten', 'Graubünden', ['Chur']).matched, null);
});

test('seen-cache entries from older rule versions are invalidated once', () => {
  assert.equal(decodeSeenReason('not_single_listing'), null);
  assert.equal(decodeSeenReason('129.51.1::not_single_listing'), null);
  assert.equal(decodeSeenReason(encodeSeenReason('not_single_listing')), 'not_single_listing');
  assert.equal(REPAIR_RULES_VERSION, '129.53.3');
  const store = readFileSync(new URL('../server/immofinderStore.ts', import.meta.url), 'utf8');
  assert.match(store, /decodeSeenReason\(r\.rows\[0\]\.reason\)/);
  assert.match(store, /encodeSeenReason\(reason\)/);
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
  assert.ok(cfg.discovery.portalQueries.every((q) => !/Graubünden|3\.5 Zimmer/.test(q)));
  assert.ok(cfg.discovery.portalQueries.some((q) => q.includes('site:homegate.ch')));
});

test('pipeline batches discovery processing and avoids poisoning seen with insufficient evidence', () => {
  const source = readFileSync(new URL('../server/immofinderPipeline.ts', import.meta.url), 'utf8');
  assert.match(source, /await flushBatch\(\);\s*try \{ console\.info\(JSON\.stringify\(\{ type: 'immofinder_discovery_batch_processed'/);
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
  assert.match(source, /allowSnippet: false/);
  assert.match(source, /6 \* 60 \* 60 \* 1000/);
  assert.match(source, /src\.id !== 'search' && st\.consecutiveBad >= stopAt/);
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
  discovery: { ...cfg.discovery, communesPerRun: 1, queries: ['A {commune}'], portalQueries: [], maxPagesPerRun: 10, serperMinIntervalMs: 0, ...over },
});
const memStore = (saved = []) => ({ findByUrl: async () => null, touch: async () => {}, upsert: async (r) => { saved.push(r); return 'new'; }, getSeen: async () => null, markSeen: async () => {} });
const noPage = async () => ({ ok: false, status: 403, body: '' });
const staleHit = [{ title: 'Wikipedia', link: 'https://de.wikipedia.org/wiki/Chur', snippet: '' }];

test('P129.48 quality-first defaults are what Reset restores and sanitize clamps the search fields', () => {
  const d = defaultSettings(cfg);
  assert.equal(d.schedule.everyHours, 3);
  assert.deepEqual([d.search.carouselCommunesPerRun, d.search.privateQueryTemplates, d.search.freshness, d.search.freshnessFallback, d.search.enrichSearchesPerRun, d.search.recheckContactSearch, d.search.maxAiPages], [12, 4, 'm', false, 12, false, 100]);
  const s = sanitizeSettings({ search: { privateQueryTemplates: 99, freshness: 'x', enrichSearchesPerRun: -4, freshnessFallback: 'yes', carouselCommunesPerRun: 50 } }, cfg);
  assert.deepEqual([s.search.privateQueryTemplates, s.search.freshness, s.search.enrichSearchesPerRun, s.search.freshnessFallback, s.search.carouselCommunesPerRun], [4, 'm', 12, false, 12]);
  assert.equal(sanitizeSettings({ search: { privateQueryTemplates: 4, freshness: 'd', enrichSearchesPerRun: 0, freshnessFallback: true } }, cfg).search.privateQueryTemplates, 4);
  assert.equal(sanitizeSettings({ search: { freshness: 'w' } }, cfg).search.freshness, 'm', 'legacy weekly default upgrades to the broader month window');
  assert.equal(sanitizeSettings({ search: { carouselCommunesPerRun: 2 } }, cfg).search.carouselCommunesPerRun, 12, 'stale two-commune setting falls back to the 12-commune default');
});

test('P129.48 applySettings maps all private templates, freshness and enrichment budget into the run config', () => {
  const eff = applySettings(cfg, sanitizeSettings({ search: { privateQueryTemplates: 1, freshness: 'd', freshnessFallback: true, enrichSearchesPerRun: 3 } }, cfg));
  assert.equal(eff.discovery.queries.length, 1);
  assert.equal(eff.discovery.freshness, 'd');
  assert.equal(eff.discovery.freshnessFallback, true);
  assert.equal(eff.contactEnrichment.maxExtraSearchesPerRun, 3);
  const lean = applySettings(cfg, defaultSettings(cfg));
  assert.equal(lean.discovery.queries.length, 4);
  const staleSlice = sanitizeSettings({ search: { communes: ['Chur', 'Zizers', 'Igis', 'Landquart'], carouselCommunesPerRun: 2 } }, cfg);
  assert.equal(applySettings(cfg, staleSlice).discovery.communesPerRun, 12);
  const four = ['Chur', 'Zizers', 'Igis', 'Landquart'];
  const fourCfg = applySettings(cfg, sanitizeSettings({ search: { communes: four, carouselCommunesPerRun: 2 } }, cfg));
  assert.deepEqual(communesForRun(fourCfg.municipalities, fourCfg.discovery.communesPerRun, 0), four);
  assert.equal(lean.contactEnrichment.maxExtraSearchesPerRun, 12);
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

test('non-standard Swiss portal detail URL survives the final write-time and repair gate', () => {
  const url = 'https://flatfox.ch/en/flat/abc-123';
  const evidence = '3.5 Zimmer Wohnung in Chur. Helle Wohnung mit Balkon und eigener Küche. Ruhige Lage nahe Bahnhof.';
  const row = { listing_url: url, property_name: '3.5 Zimmer Wohnung in Chur', municipality: 'Chur', rooms_estimated: 3.5, raw: { evidence_text: evidence, evidence_kind: 'page_text', evidence_url: url } };
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

test('discovery performs one unrestricted Serper call per query, without a freshness retry', async () => {
  const calls = [];
  const search = async (_q, options) => { calls.push(options ?? null); return staleHit; };
  const result = await runPipeline({ config: leanCfg({ freshnessFallback: true, freshness: 'd' }), fetchPage: noPage, llm: null, store: memStore(), search, cycle: 0 }, { dryRun: true, wave: 'carousel' });
  assert.equal(result.counts.serper_calls, 1);
  assert.equal(result.counts.serper_fallback, 0);
  assert.deepEqual(calls, [null]);
});

test('P129.52 snippet-only social results never reach the model or database and get a short seen TTL', async () => {
  const hits = [
    { title: 'Wohnung zu vermieten in Chur', link: 'https://www.facebook.com/groups/1/posts/11/', snippet: 'Schöne Wohnung in Chur, CHF 1\'400 pro Monat, Tel 079 123 45 67' },
    { title: '3.5 Zimmer Wohnung in Chur', link: 'https://www.facebook.com/groups/1/posts/12/', snippet: 'Zu vermieten in Chur, CHF 1\'400 pro Monat, Tel 079 123 45 67' },
  ];
  let llmCalls = 0; const marked = []; const saved = [];
  const store = { ...memStore(saved), markSeen: async (u, source, decision, reason) => { marked.push({ u, source, decision, reason }); } };
  const llm = async () => { llmCalls++; return null; };
  const res = await runPipeline({ config: leanCfg(), fetchPage: noPage, llm, store, search: async () => hits, cycle: 0 }, { dryRun: false, wave: 'carousel' });
  assert.equal(res.counts.snippet_only, 2);
  assert.equal(res.filtered.detail_page_not_verified, 2);
  assert.equal(llmCalls, 0);
  assert.equal(saved.length, 0);
  assert.equal(marked.length, 2, 'rejected snippets are cached only as transient detail-page failures');
  assert.ok(marked.every((x) => x.decision === 'filtered' && x.reason === 'detail_page_not_verified'));
});

test('P129.51 a failed portal fetch cannot downgrade to a saved SERP snippet', async () => {
  const url = 'https://www.homegate.ch/mieten/4001234567';
  const saved = []; let llmCalls = 0;
  const res = await runPipeline({
    config: leanCfg(), fetchPage: noPage,
    llm: async () => { llmCalls++; return null; }, store: memStore(saved),
    search: async () => [{ title: '3.5-Zimmer-Wohnung in Chur', link: url, snippet: 'Miete CHF 1\'500 pro Monat, Chur' }], cycle: 0,
  }, { dryRun: false, wave: 'carousel' });
  assert.equal(res.filtered.detail_page_fetch_failed, 1);
  assert.equal(res.counts.kept, 0);
  assert.equal(llmCalls, 0);
  assert.equal(saved.length, 0);
});

test('P129.52 direct detail pages accept optional final URL, reject wrong redirects and require useful page text', async () => {
  const url = 'https://www.homegate.ch/mieten/4001234567';
  const body = `<html><head><title>3.5-Zimmer-Wohnung in Chur</title><meta name="description" content="Helle Wohnung mit Balkon und Küche"></head><body><h1>3.5-Zimmer-Wohnung in Chur zu vermieten</h1><p>Miete CHF 1'500 pro Monat. Wohnfläche 80 m2. Helle Räume, Balkon, Küche und Bad. Bezug ab sofort möglich. Separates Kellerabteil und ruhige Lage.</p></body></html>`;
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
  assert.equal(noFinalUrl.counts.kept, 1, 'the documented optional finalUrl field must not discard a verified direct response');
  assert.equal(noFinalUrlSaved.length, 1);

  const wrongSaved = [];
  const redirected = await runPipeline({
    config: leanCfg(), fetchPage: async () => ({ ok: true, status: 200, body, finalUrl: 'https://www.homegate.ch/mieten/4009999999' }),
    llm: null, store: memStore(wrongSaved), search: async () => [{ title: '3.5-Zimmer-Wohnung in Chur', link: url, snippet: 'Wohnung mieten' }], cycle: 0,
  }, { dryRun: false, wave: 'carousel' });
  assert.equal(redirected.filtered.detail_page_url_mismatch, 1);
  assert.equal(redirected.counts.kept, 0);
  assert.equal(wrongSaved.length, 0);

  const shortSaved = [];
  const shortPage = await runPipeline({
    config: leanCfg(), fetchPage: async () => ({ ok: true, status: 200, body: '<html><head><title>3.5 Zimmer Wohnung in Chur</title></head><body>Zu vermieten.</body></html>', finalUrl: url }),
    llm: null, store: memStore(shortSaved), search: async () => [{ title: '3.5-Zimmer-Wohnung in Chur', link: url, snippet: 'Wohnung mieten' }], cycle: 0,
  }, { dryRun: false, wave: 'carousel' });
  assert.equal(shortPage.filtered.detail_page_evidence_too_short, 1, 'a page with fewer than 30 characters is rejected before price extraction');
  assert.equal(shortSaved.length, 0);
});

test('Google SERP crawl date is not treated as the listing publication date', async () => {
  const url = 'https://www.homegate.ch/mieten/4001234567';
  const body = `<html><head><title>3.5-Zimmer-Wohnung in Chur</title></head><body><p>3.5-Zimmer-Wohnung in Chur zu vermieten. Miete CHF 1'500 pro Monat. Helle Wohnung mit Balkon und Küche, Bezug ab sofort möglich.</p></body></html>`;
  const saved = [];
  const result = await runPipeline({
    config: leanCfg(), fetchPage: async () => ({ ok: true, status: 200, body, finalUrl: url }), llm: null, store: memStore(saved),
    search: async () => [{ title: '3.5-Zimmer-Wohnung in Chur', link: url, snippet: 'Wohnung mieten', date: '2 years ago' }], cycle: 0,
  }, { dryRun: false, wave: 'carousel' });
  assert.equal(result.counts.kept, 1);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].listed_at, null, 'only a date verified on the listing page may be shown as its publication date');
  assert.equal(saved[0].raw.search_result_date, '2 years ago', 'keep SERP date for diagnostics without applying the stale-listing gate');
});
test('P129.52 blocked direct portal pages retry through Jina Reader with source URL verification', async () => {
  const target = 'https://portal.example/listing/123456';
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), headers: init?.headers || {} });
    if (String(url).startsWith('https://r.jina.ai/')) {
      return new Response(`Title: 4.5 Zimmer Wohnung in Chur\nURL Source: ${target}\n\nMarkdown Content:\n4.5 Zimmer Wohnung in Chur. CHF 1'600 pro Monat. Helle Wohnung mit Balkon und Küche.`, {
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
