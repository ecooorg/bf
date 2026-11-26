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

test('P131.5e automatic repair preserves the current core unless force restore is explicit', () => {
  const restore = read('scripts/immofinder-core-restore.mjs');
  assert.match(restore, /existsSync\(target\) && process\.env\.FORCE_IMMOFINDER_CORE_RESTORE !== '1'/);
  assert.match(restore, /writeFileSync\(target, buf\)/);
  assert.match(restore, /Current immofinderCore\.ts preserved/);
  const workflow = read('.github/workflows/ensure-repair.yml');
  assert.match(workflow, /node scripts\/ensure-repair\.mjs/);
});

test('P131.0a C131 constitution config preserves approved result and evidence rules', () => {
  const cfg = JSON.parse(read('config/immofinder.json'));
  const q = cfg.quality;
  assert.equal(q.policyVersion, 'C131-R1-R14');
  assert.deepEqual(q.resultTypes, ['tourist_owner', 'direct_offer']);
  for (const field of [
    'fetched_detail_page', 'final_url_matches_record_url',
    'locality_in_configured_44_with_page_evidence', 'residential_apartment_or_house',
    'rooms_gte_3_confirmed_by_page_text', 'not_seeker_sale_parking_commercial_or_shared_room',
    'not_stop_list_agency_or_company_operated', 'not_expired_when_date_visible',
  ]) assert.ok(q.requiredForL1.includes(field), `missing L1 requirement: ${field}`);
  for (const field of ['price_any_period', 'publication_date', 'direct_contact', 'phone', 'photos']) {
    assert.ok(q.optionalForL1.includes(field), `missing optional L1 field: ${field}`);
  }
  assert.equal(q.snippetPolicy, 'discovery_only_never_evidence');
  assert.deepEqual(q.provenance, ['value', 'verbatim_quote', 'source_url', 'fetch_time']);
  assert.equal(q.legacyRuntimeUntilWp5, false);
  assert.equal(q.requirePrice, false);
  assert.equal(q.rejectNonMonthly, false);
  assert.equal(q.requireContact, false);
  const spec = read('TECHNICAL_SPECIFICATION.md');
  for (const rule of Array.from({ length: 14 }, (_, i) => `R${i + 1} —`)) assert.ok(spec.includes(rule), `missing approved rule ${rule}`);
});

test('C131 TrustEngine admits same-page residential rentals when price, date and direct contact are absent', async () => {
  const { verifyListingAdmission } = await import('../server/immofinderTrustEngine.ts');
  const url = 'https://example.ch/listing/123456';
  const quote = "CHF 1'450.– pro Monat";
  const pageText = [
    '3.5 Zimmer Wohnung zu vermieten in Chur',
    'Inseriert am: 20.11.2026',
    'Verfügbar ab sofort. Helle Wohnung mit Balkon und eigener Küche.',
    quote,
    'Kontakt Vermieter: +41 79 123 45 67',
    'Weitere Angaben zur Wohnung: renoviertes Bad, Kellerabteil, Waschküche und ruhige Lage.',
  ].join('\\n');
  const input = {
    requestedUrl: url, finalUrl: url, title: '3.5 Zimmer Wohnung zu vermieten', municipality: 'Chur', municipalities: ['Chur'], pageText: pageText.replace('3.5 Zimmer Wohnung zu vermieten','3.5 Zimmer Wohnung zu vermieten in Chur'),
    municipality: 'Chur', municipalities: ['Chur'], provisional: false, rooms: 3.5, priceMonthlyChf: 1450, priceUnit: 'month', priceQuote: quote,
    listedAt: '2026-11-20T10:00:00.000Z', maxAgeDays: 180, phone: '+41791234567', email: null,
    contactEvidenceUrls: [url], nowMs: Date.parse('2026-11-24T12:00:00.000Z'),
  };
  const accepted = verifyListingAdmission(input);
  assert.equal(accepted.accepted, true);
  if (accepted.accepted) assert.deepEqual([accepted.rooms, accepted.monthlyRentChf, accepted.contact], [3.5, 1450, 'phone']);
  assert.deepEqual(verifyListingAdmission({ ...input, provisional: true }), { accepted: false, reason: 'trust_snippet_only' });
  assert.deepEqual(verifyListingAdmission({ ...input, finalUrl: 'https://example.ch/listing/999999' }), { accepted: false, reason: 'trust_fetch_url_unverified' });
  const staleButNotMarkedExpired = verifyListingAdmission({ ...input, listedAt: '2025-01-01T00:00:00.000Z' });
  assert.equal(staleButNotMarkedExpired.accepted, true, 'age alone is not an expiry signal');
  const noDirectContact = verifyListingAdmission({ ...input, phone: null, email: null });
  assert.equal(noDirectContact.accepted, true);
  if (noDirectContact.accepted) assert.equal(noDirectContact.contact, 'platform_only');
  const wrongContactPage = verifyListingAdmission({ ...input, contactEvidenceUrls: ['https://example.ch/contact'] });
  assert.equal(wrongContactPage.accepted, true);
  if (wrongContactPage.accepted) assert.equal(wrongContactPage.contact, 'platform_only');
  const noAdvertiserLabel = verifyListingAdmission({ ...input, pageText: input.pageText.replace('Kontakt Vermieter: ', '') });
  assert.equal(noAdvertiserLabel.accepted, true);
  if (noAdvertiserLabel.accepted) assert.equal(noAdvertiserLabel.contact, 'platform_only');
  const wrongPriceUnit = verifyListingAdmission({ ...input, priceUnit: 'week' });
  assert.equal(wrongPriceUnit.accepted, true);
  const urlOnlyLocality = verifyListingAdmission({ ...input, pageText: input.pageText.replaceAll('Chur', 'Luzern'), municipality: 'Chur' });
  assert.deepEqual(urlOnlyLocality, { accepted: false, reason: 'trust_locality_missing' });
  const conflictingLocality = verifyListingAdmission({ ...input, pageText: input.pageText.replaceAll('Chur', 'Untervaz'), municipality: 'Chur', municipalities: ['Chur', 'Untervaz'] });
  assert.deepEqual(conflictingLocality, { accepted: false, reason: 'trust_locality_conflict' });
  if (wrongPriceUnit.accepted) assert.equal(wrongPriceUnit.monthlyRentChf, null);
});

test('C131 TrustEngine rejects sale, seeker, unavailable and unverified room facts while allowing unknown date', async () => {
  const { verifyListingAdmission } = await import('../server/immofinderTrustEngine.ts');
  const base = {
    requestedUrl: 'https://example.ch/listing/123456', finalUrl: 'https://example.ch/listing/123456',
    title: '3.5 Zimmer Wohnung zu vermieten',
    pageText: "3.5 Zimmer Wohnung zu vermieten in Untervaz. CHF 1'450.– pro Monat. Inseriert am: 20.11.2026. Verfügbar ab sofort. Kontakt +41 79 123 45 67. Heller Wohnbereich, Küche, Bad, Balkon und Kellerabteil.",
    municipality: 'Untervaz', municipalities: ['Untervaz'], provisional: false, rooms: 3.5, priceMonthlyChf: 1450, priceUnit: 'month', priceQuote: "CHF 1'450.– pro Monat",
    listedAt: '2026-11-20T10:00:00.000Z', maxAgeDays: 180, phone: '+41791234567', email: null,
    contactEvidenceUrls: ['https://example.ch/listing/123456'], nowMs: Date.parse('2026-11-24T12:00:00.000Z'),
  };
  assert.deepEqual(verifyListingAdmission({ ...base, title: '3.5 Zimmer Eigentumswohnung Kaufpreis CHF 450000' }), { accepted: false, reason: 'trust_for_sale' });
  assert.deepEqual(verifyListingAdmission({ ...base, title: 'Ich suche eine 3.5 Zimmer Wohnung' }), { accepted: false, reason: 'trust_seeker_post' });
  assert.deepEqual(verifyListingAdmission({ ...base, pageText: base.pageText + ' Inserat bereits vermietet.' }), { accepted: false, reason: 'trust_listing_unavailable' });
  assert.deepEqual(verifyListingAdmission({ ...base, rooms: 4 }), { accepted: false, reason: 'trust_rooms_conflict' });
  const noPageRoomQuote = verifyListingAdmission({ ...base, pageText: base.pageText.replaceAll('3.5 Zimmer', '3 Schlafzimmer') });
  assert.deepEqual(noPageRoomQuote, { accepted: false, reason: 'trust_rooms_missing' });
  const noPublicationDate = verifyListingAdmission({ ...base, listedAt: null });
  assert.equal(noPublicationDate.accepted, true);
  if (noPublicationDate.accepted) assert.equal(noPublicationDate.listedAt, null);
});

test('P130.17 search planner ignores legacy query wording and generates rental-intent searches', async () => {
  const { buildTrustSearchPlan } = await import('../server/immofinderTrustEngine.ts');
  const plan = buildTrustSearchPlan({
    municipalities: ['Town A', 'Town B', 'Town C'], communeLimit: 2, privateTemplateCount: 2,
    portalQueryTemplates: ['site:flatfox.ch obsolete wording {commune}'],
  }, 0, { allCommunes: false });
  assert.equal(plan.length, 6);
  assert.match(plan[0], /Wohnung zu vermieten/);
  assert.ok(plan[0].includes('"Town A"'));
  assert.ok(plan[2].includes('"Town A"'));
  assert.match(plan[2], /site:flatfox\.ch/);
  assert.ok(plan.every((query) => !/obsolete wording/.test(query)));
  assert.ok(plan.every((query) => !/Town C/.test(query)));
});

test('P130.17 repair automation preserves current patch and append-only history', () => {
  const versionScript = read('scripts/immofinder-p3-version.mjs');
  assert.doesNotMatch(versionScript, /pkgPath|pkg\.patch\s*=/);
  assert.match(versionScript, /REPAIR_RULES_VERSION/);
  const repairScript = read('scripts/immofinder-recheck-feed.mjs');
  assert.match(repairScript, /!cl\.includes\('## P130\.11'\)/);
  assert.match(repairScript, /!tr\.includes\('## P130\.11'\)/);
  const ciRepairScript = read('scripts/fix-ci-scripts.mjs');
  assert.doesNotMatch(ciRepairScript, /pkg\.patch\s*=|REPAIR_RULES_VERSION/);
});

test('P130.17d ImmoFinder runs use durable PostgreSQL leases and recover after process replacement', () => {
  const store = read('server/immofinderStore.ts');
  const routes = read('server/immofinderRoutes.ts');
  const migration = read('migrations/029_immofinder_durable_worker.sql');
  const server = read('server.ts');
  assert.match(migration, /lease_owner/);
  assert.match(migration, /lease_until/);
  assert.match(migration, /cancel_requested/);
  assert.match(migration, /recoveredFromLegacy/);
  assert.match(store, /FOR UPDATE SKIP LOCKED/);
  assert.match(store, /workerId',\$1::text/);
  assert.match(store, /lease_until/);
  assert.match(store, /settingsSnapshot/);
  assert.match(store, /cancel_requested = true/);
  assert.match(routes, /claimNextRun\(workerId\)/);
  assert.match(routes, /executeQueuedRun/);
  assert.match(routes, /await requestRunCancel/);
  assert.match(routes, /releaseRunForRetry/);
  assert.doesNotMatch(routes.slice(routes.indexOf("app.post('/api/immofinder/run'"), routes.indexOf('// --- In-process schedule')), /void \(async \(\) => \{/);
  assert.match(server, /stopImmoFinderWorker/);
});

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

test('pipeline supports carousel and full search waves', () => {
  const pipe = read('server/immofinderPipeline.ts');
  assert.match(pipe, /export type RunWave = 'priority' \| 'extended' \| 'full'/);
  assert.match(pipe, /waveMode/);
  assert.match(pipe, /wavesRun/);
  assert.match(pipe, /sourceStats/);
  assert.match(pipe, /consecutiveStopFor/);
  assert.match(pipe, /id === 'search'/);
  assert.match(pipe, /placeFromTitleOrSnippet/);
  assert.match(pipe, /waveMode === 'carousel'/);
  assert.match(pipe, /waveMode === 'full'/);
});

test('routes accept carousel and full wave body parameters', () => {
  const routes = read('server/immofinderRoutes.ts');
  assert.match(routes, /req\.body\?\.wave/);
  assert.match(routes, /wave.*carousel.*full/);
  assert.match(routes, /\{\s*dryRun,\s*wave,\s*testMode:\s*progress\.testMode === true\s*\}/);
});

test('UI exposes carousel and full run controls', () => {
  const ui = read('src/ImmoFinder.tsx');
  assert.match(ui, /immofinder-run-carousel/);
  assert.match(ui, /start\('carousel'\)/);
  assert.match(ui, /start\('full'\)/);
});

test('ImmoFinder run lock uses durable worker leases across app instances', () => {
  const store = read('server/immofinderStore.ts');
  const cfg = JSON.parse(read('config/immofinder.json'));
  const app = read('src/ImmoFinder.tsx');
  assert.match(store, /pg_advisory_xact_lock/);
  assert.match(store, /FOR UPDATE SKIP LOCKED/);
  assert.match(store, /lease_until = now\(\) \+ interval '45 seconds'/);
  assert.doesNotMatch(store, /interval '50 minutes'/);
  assert.equal(cfg.runMaxDurationMs, 2700000);
  assert.match(app, /50 \* 60 \* 1000/);
});
test('ImmoFinder controls reflect live discovery behaviour and run duration', () => {
  const settingsUi = read('src/ImmoFinderSettings.tsx');
  const settings = read('server/immofinderSettings.ts');
  const core = read('server/immofinderCore.ts');
  const app = read('src/ImmoFinder.tsx');
  assert.match(settingsUi, /Directly fetched classified details/);
  assert.match(settingsUi, /HappyHoliday/);
  assert.match(settingsUi, /Anibis/);
  assert.doesNotMatch(settingsUi, /Private-owner web search|Google owner-direct ads/);
  assert.match(settingsUi, /No date filter is applied/);
  assert.doesNotMatch(settingsUi, /Facebook & private|Search freshness|immofinder-freshness/);
  assert.doesNotMatch(settings, /freshnessFallback|freshness:/);
  assert.doesNotMatch(core, /freshnessFallback|freshness\?:/);
  assert.match(app, /50 \* 60 \* 1000/);
  assert.doesNotMatch(app, /30 \* 60 \* 1000/);
});

test('ImmoFinder reports a readable service-unavailable error when fetch cannot reach the backend', () => {
  const ui = read('src/ImmoFinder.tsx');
  assert.match(ui, /const reason = .*'the server could not be reached'/s);
  assert.match(ui, /ImmoFinder request failed: \$\{reason\}/);
  assert.match(ui, /Check that the service is online, then retry/);
});

test('P131.6 settings UI exposes optional price/contact filters and a complete Chur test preset', () => {
  const ui = read('src/ImmoFinderSettings.tsx');
  assert.match(ui, /data-testid="immofinder-require-price"/);
  assert.match(ui, /data-testid="immofinder-require-contact"/);
  assert.match(ui, /data-testid="immofinder-reject-nonmonthly"/);
  assert.doesNotMatch(ui, /checked=\{true\}\s+disabled/);
  assert.match(ui, /data-testid="immofinder-prepare-chur-test"/);
  assert.match(ui, /communes: \['Chur'\]/);
  assert.match(ui, /Object\.keys\(base\.search\.sources\)\.map\(\(id\) => \[id, true\]\)/);
  assert.match(ui, /requirePrice: false/);
  assert.match(ui, /requireContact: false/);
  assert.match(ui, /rejectNonMonthly: false/);
  assert.match(ui, /rejectSeekerPosts: true/);
  assert.match(ui, /minRooms: 3/);
  assert.match(ui, /id: 'ferienhausmiete'/);
  assert.match(ui, /id: 'happyholiday'/);
  assert.match(ui, /id: 'portal-anibis'/);
  assert.match(ui, /id: 'portal-tutti'/);
  assert.doesNotMatch(ui, /id: 'landwirtschaft-gr'/);
  assert.match(ui, /AI extraction is disabled/i);
  assert.match(ui, /\[3, 4, 5, 6, 7, 8\]/);
});

test('config prioritises long-term Swiss rental discovery portals', () => {
  const cfg = JSON.parse(read('config/immofinder.json'));
  const queries = cfg.discovery.portalQueries.join(' ');
  assert.match(queries, /homegate\.ch/);
  assert.match(queries, /flatfox\.ch/);
  assert.match(queries, /tutti\.ch/);
  assert.match(queries, /anibis\.ch/);
  assert.match(queries, /newhome\.ch/);
  assert.match(queries, /urbanhome\.ch/);
  assert.match(queries, /petitesannonces\.ch/);
  for (const host of ['properstar.ch', 'rentumo.ch', 'moving24.ch', 'homematch.ch', 'roomlala.de', 'bedandbreakfast.eu']) {
    assert.ok(cfg.discovery.skipHosts.includes(host), `aggregator/service host remains excluded: ${host}`);
  }
  assert.ok(cfg.discovery.communesPerRun >= 12);
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
  assert.match(ui, /Recheck feed/);
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
  const modifiedOnly = pageMeta('<html><head><meta property="article:modified_time" content="2020-01-01T08:00:00Z"/><meta property="og:updated_time" content="2020-01-02T08:00:00Z"/><script type="application/ld+json">{"dateModified":"2020-01-03T08:00:00Z"}</script></head></html>', 'https://example.ch/x');
  assert.equal(modifiedOnly.published, null, 'modified timestamps are not listing publication dates');
  assert.equal(parseListedAt('Aktualisiert am: 01.01.2020', undefined, null), null);
  assert.equal(parseListedAt('Mietbeginn ab: 01.01.2020', undefined, null), null);
  assert.equal(parseListedAt('random 01.01.2020 text', undefined, null), null, 'unlabelled page dates are not treated as listing dates');
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




test('P130.6 rooms gate and empty SERP titles', async () => {
  const { nonListingReason, parseRooms, isListingUnavailable, isPortalDetailUrl } = await import('../server/immofinderCore.ts');
  assert.equal(nonListingReason('Aucun appartement ou maison à louer à Landquart (GR)', 'https://www.immobilier.ch/fr/louer/appartement-maison/grisons/landquart'), 'list_or_search_page');
  assert.equal(parseRooms('Appartement 3 pièces à louer à Landquart')?.rooms, 3);
  assert.equal(parseRooms('3 pièces appartement')?.rooms, 3);
  assert.equal(isListingUnavailable('Rent a 4 ½ rooms apartment', 'Modern apartment with balcony. Available now.'), false);
  const portals = ['immobilier.ch', 'flatfox.ch'];
  assert.equal(isPortalDetailUrl('https://flatfox.ch/de/wohnung/landquart-kantonsstrasse-23-7302-landquart/86180998/', portals), true);
  assert.equal(isPortalDetailUrl('https://flatfox.ch/de/mieten/wohnung', portals), false);
});

test('nonListingReason rejects portal list/index URLs and challenge titles', async () => {
  const { nonListingReason, isPortalDetailUrl } = await import('../server/immofinderCore.ts');
  assert.equal(
    nonListingReason('Page 2 - Wohnung mieten: Chur', 'https://www.home.ch/de/mieten/wohnung/unterkategorie-wohnung/in-chur'),
    'list_or_search_page',
  );
  assert.equal(
    nonListingReason('Chur: Tous les biens immobiliers', 'https://www.acheter-louer.ch/immobilier/Chur-immobilier-maison-appartement-villa-chalet-appartement-terrain.html'),
    'list_or_search_page',
  );
  assert.equal(
    nonListingReason('Just a moment...', 'https://www.acheter-louer.ch/x'),
    'list_or_search_page',
  );
  assert.equal(
    nonListingReason('3 ½ Zimmer-Wohnung in Chur mieten | Flatfox', 'https://flatfox.ch/de/wohnung/lagerstr-9-7000-chur/1289164/'),
    null,
  );
  const portals = ['home.ch', 'acheter-louer.ch', 'flatfox.ch', 'icasa.ch'];
  assert.equal(isPortalDetailUrl('https://www.home.ch/de/mieten/wohnung/unterkategorie-wohnung/in-chur', portals), false);
  assert.equal(isPortalDetailUrl('https://flatfox.ch/de/wohnung/lagerstr-9-7000-chur/1289164/', portals), true);
});

test('parseRooms handles Swiss half-room spellings and prefers earliest Zimmer hit', async () => {
  const { parseRooms, roomsEvidenceConflict } = await import('../server/immofinderCore.ts');
  assert.equal(parseRooms('2 ½ Zimmer-Wohnung in Maladers mieten | Flatfox')?.rooms, 2.5);
  assert.equal(parseRooms('2 1/2 Zimmer Wohnung in Chur')?.rooms, 2.5);
  assert.equal(parseRooms('3.5 Zimmer Wohnung in Thusis')?.rooms, 3.5);
  assert.equal(parseRooms('Zimmer: 4.5 · Miete CHF 1800')?.rooms, 4.5);
  const mixed = parseRooms('2.5 Zimmer-Wohnung in Churwalden. Etage 5. Baujahr 1995. 65 m2.');
  assert.equal(mixed?.rooms, 2.5);
  assert.equal(roomsEvidenceConflict('2.5 Zimmer', 'Schöne 5.5 Zimmer Maisonette'), true);
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


test('credibility gate rejects seeker, sale, holiday, rooms conflict', async () => {
  const {
    credibilityRejectReason,
    buildEvidenceText,
    isForSaleListing,
    isHolidayOrTourismListing,
    roomsEvidenceConflict,
    isPlatformOrJunkContact,
    priceFromEvidence,
  } = await import('../server/immofinderCore.ts');

  assert.equal(
    credibilityRejectReason({
      title: 'Zu vermieten gesucht: Haus in Grüsch',
      evidenceText: 'Wir suchen ein Haus 4.5 Zimmer in Grüsch',
      url: 'https://www.facebook.com/groups/1/posts/2/',
      municipality: 'Grüsch',
      roomsEstimated: 5,
      price: null,
      phone: null,
      email: null,
      evidenceKind: 'snippet',
      municipalities: ['Grüsch', 'Chur'],
      allowSnippet: true,
    }),
    'seeker_post',
  );

  assert.equal(isForSaleListing('9 Rooms house to buy', 'For sale in Haldenstein', 'https://icasa.ch/x-zu-kaufen-y'), true);
  assert.equal(
    credibilityRejectReason({
      title: '9 Rooms Single-house to buy',
      evidenceText: 'Haus zu kaufen in Haldenstein',
      url: 'https://icasa.ch/9-zimmer-einfamilienhaus-zu-kaufen-haldenstein',
      municipality: 'Haldenstein',
      roomsEstimated: 9,
      price: null,
      phone: null,
      email: null,
      evidenceKind: 'page_text',
      municipalities: ['Haldenstein', 'Chur'],
      allowSnippet: true,
    }),
    'for_sale',
  );

  assert.equal(
    isHolidayOrTourismListing('Ferienwohnung Jenins', 'pro Nacht CHF 120', 'https://shop.heidiland.com/x'),
    true,
  );

  assert.equal(
    roomsEvidenceConflict('5.5 Zimmer Wohnung', 'Schöne 2.5 Zimmer Wohnung mit Balkon, 65m2, Miete CHF 1320'),
    true,
  );

  assert.equal(isPlatformOrJunkContact('support@immoswipe.ch', null), true);
  assert.equal(isPlatformOrJunkContact(null, '+41001045992'), true);
  assert.equal(isPlatformOrJunkContact('owner@example.ch', '+41791234567'), false);

  const ev = buildEvidenceText('Wohnung Chur', 'Miete CHF 1\'750.– pro Monat. 3.5 Zimmer in Chur.');
  const price = priceFromEvidence(ev, null);
  assert.ok(price && price.amount >= 1700);

  assert.equal(
    credibilityRejectReason({
      title: '3.5 Zimmer in Chur',
      evidenceText: 'Schöne 3.5-Zimmer-Wohnung in Chur ab 1. Dezember. Miete CHF 1750 pro Monat. Tel +41791234567',
      url: 'https://www.facebook.com/groups/1/posts/99/',
      municipality: 'Chur',
      roomsEstimated: 3.5,
      price,
      phone: '+41791234567',
      email: null,
      evidenceKind: 'snippet',
      municipalities: ['Chur', 'Igis'],
      allowSnippet: true,
    }),
    null,
  );
});

test('pipeline stores evidence_text and runs credibilityRejectReason', () => {
  const pipe = read('server/immofinderPipeline.ts');
  assert.match(pipe, /credibilityRejectReason/);
  assert.match(pipe, /evidence_text/);
  assert.match(pipe, /buildEvidenceText/);
  const card = read('src/immoCard.ts');
  assert.match(card, /evidence_text/);
});


test('user-facing cards omit source evidence dumps; raw still stored on model', async () => {
  const { immoCardModel, immoEvidenceBlock, immoCardPlainText } = await import('../src/immoCard.ts');
  const row = {
    municipality: 'Chur', property_name: '3.5 Zi', description_de: 'Helle Wohnung nahe Bahnhof mit Balkon',
    rooms_estimated: 3.5, listing_url: 'https://example.com/a',
    photo_urls: [], private_signals: [], status: 'NEW',
    raw: { evidence_text: 'Miete CHF 1\'750.– pro Monat in Chur. Parkplatz optional.', evidence_kind: 'page_text' },
  };
  const k = immoCardModel(row);
  assert.ok(k.evidenceText.includes('1\'750'), 'raw evidence kept on model for diagnostics');
  assert.equal(immoEvidenceBlock(k), '', 'evidence block not shown on cards/exports');
  const plain = immoCardPlainText(k);
  assert.ok(!/Source text/i.test(plain));
  assert.ok(!/Status:/.test(plain));
  assert.match(plain, /📍 Chur/);
  assert.match(plain, /Helle Wohnung nahe Bahnhof/);
  // Garbage about fragments are dropped
  const junk = immoCardModel({
    municipality: 'Maladers', property_name: "CHF 1'", description_de: "CHF 1'",
    rooms_estimated: 4.5, listing_url: 'https://example.com/b', status: 'NEW',
  });
  assert.equal(junk.about, '');
});



test('P129.37 precision: unavailable, for_sale, weak FB photo, platform contact, footer strip', async () => {
  const {
    isListingUnavailable,
    isForSaleListing,
    isWeakFacebookListingUrl,
    isPlatformOrJunkContact,
    roomsEvidenceConflict,
    stripEvidenceChrome,
    credibilityRejectReason,
    formatHideLog,
  } = await import('../server/immofinderCore.ts');

  assert.equal(isListingUnavailable('x', 'Unfortunately, this listing is currently not available.'), true);
  assert.equal(isForSaleListing('Dachwohnung', 'Charmante Wohnung zu verkaufen. Auch mieten möglich?', 'https://facebook.com/groups/1/posts/2'), true);
  assert.equal(isWeakFacebookListingUrl('https://www.facebook.com/photo.php?fbid=1&set=gm.123&type=3'), true);
  assert.equal(isWeakFacebookListingUrl('https://www.facebook.com/groups/1/posts/999/'), false);
  assert.equal(isPlatformOrJunkContact('info@betterhomes.ch', null), true);
  assert.equal(isPlatformOrJunkContact('einwohnerkontrolle@domat-ems.ch', null), true);
  assert.equal(roomsEvidenceConflict('5.5 Zimmer', '2.5 Zimmer ca 65m2 Miete CHF 1320', 5.5), true);
  const stripped = stripEvidenceChrome('Nice flat in Chur CHF 1500\nFlatfox AG\nAbout us Contact Imprint');
  assert.ok(stripped.includes('Nice flat'));
  assert.ok(!/About us/.test(stripped));
  assert.equal(
    credibilityRejectReason({
      title: 'Wohnung',
      evidenceText: 'Unfortunately, this listing is currently not available.',
      url: 'https://flatfox.ch/x',
      municipality: 'Chur',
      roomsEstimated: 3.5,
      price: null,
      phone: null,
      email: null,
      evidenceKind: 'page_text',
      municipalities: ['Chur'],
      allowSnippet: true,
    }),
    'listing_unavailable',
  );
  const line = formatHideLog({ reason: 'rooms_conflict', host: 'facebook.com', title: 'Test title long '.repeat(10), url: 'https://x' });
  assert.match(line, /"type":"immofinder_hide"/);
  assert.match(line, /rooms_conflict/);
});

test('P129.37 pipeline logs product quality summary symbols', () => {
  const pipe = read('server/immofinderPipeline.ts');
  assert.match(pipe, /immofinder_product_quality_summary/);
  assert.match(pipe, /credible_kept/);
  assert.match(pipe, /formatHideLog/);
  const disc = read('server/immofinderDiscovery.ts');
  assert.match(disc, /snippetOnly && \/facebook/);
});


test('sanitizeSerperQuery trims and caps length', async () => {
  const { sanitizeSerperQuery } = await import('../server/immofinderDiscovery.ts');
  assert.equal(sanitizeSerperQuery('  a   b  '), 'a b');
  assert.ok(sanitizeSerperQuery('x '.repeat(300)).length <= 380);
  assert.ok(!/OR$/i.test(sanitizeSerperQuery('foo OR')));
});

test('ImmoFinder reset defaults enable full Swiss rental discovery with bounded quality-first cadence', async () => {
  const { defaultSettings, applySettings, churTestSettings } = await import('../server/immofinderSettings.ts');
  const cfg = JSON.parse(read('config/immofinder.json'));
  const defaults = defaultSettings(cfg);
  const testProfile = churTestSettings(cfg);
  assert.deepEqual(testProfile.search.communes, ['Chur']);
  assert.equal(testProfile.schedule.mode, 'manual');
  assert.equal(testProfile.search.minRooms, 3);
  assert.ok(Object.values(testProfile.search.sources).every(Boolean));
  assert.equal(testProfile.search.limitPrice, false);
  assert.equal(testProfile.search.requirePrice, false);
  assert.equal(testProfile.search.rejectNonMonthly, false);
  assert.equal(testProfile.search.requireContact, false);
  assert.equal(testProfile.search.rejectSeekerPosts, true);
  assert.equal(testProfile.search.enrichSearchesPerRun, 0);
  assert.equal(testProfile.delivery.telegram, false);
  assert.equal(testProfile.delivery.email, false);
  assert.equal(testProfile.delivery.emailTo, '');
  assert.equal(testProfile.delivery.drive, false);
  const routes = read('server/immofinderRoutes.ts');
  const ui = read('src/ImmoFinderSettings.tsx');

  assert.equal(defaults.schedule.everyHours, 3);
  assert.equal(defaults.search.minRooms, 3);
  assert.equal(defaults.search.carouselCommunesPerRun, 12);
  assert.equal(defaults.search.privateQueryTemplates, 2);
  assert.equal(defaults.search.maxAiPages, 40);
  assert.equal(defaults.search.enrichSearchesPerRun, 0);
  assert.equal(defaults.search.requirePrice, false);
  assert.equal(defaults.search.rejectNonMonthly, false);
  assert.equal(defaults.search.rejectSeekerPosts, true);
  assert.equal(defaults.search.requireContact, false);
  assert.equal(defaults.search.maxMonthlyRentChf, 2000);
  assert.equal(defaults.search.limitPrice, false);
  assert.equal(defaults.delivery.driveFolderId, cfg.driveFolderId);
  assert.equal(Object.values(defaults.search.sources).filter(Boolean).length, 4);

  const applied = applySettings(cfg, defaults);
  assert.equal(applied.discovery.portalQueries.length, 2);
  assert.equal(applied.discovery.communesPerRun, 44, 'full profile covers all target communes');
  assert.equal(applied.discovery.queries.length, 2);

  assert.match(routes, /\/api\/immofinder\/settings\/reset/);
  assert.match(routes, /const current = await getSettings\(cfg\)/);
  assert.match(routes, /email: Boolean\(current\.delivery\.emailTo\)/);
  assert.match(ui, /Reset to defaults/);
  assert.match(ui, /immofinder-settings-reset/);
  assert.doesNotMatch(ui, /immofinder-default-wave/);
});

test('Serper freshness options are forwarded to the provider request', async () => {
  const { createSerperSearch } = await import('../server/immofinderDiscovery.ts');
  const previous = process.env.SERPER_API_KEY;
  process.env.SERPER_API_KEY = 'test-key';
  let sent = null;
  try {
    const search = createSerperSearch(async (_url, init) => {
      sent = JSON.parse(String(init?.body || '{}'));
      return new Response(JSON.stringify({ organic: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }, 10);
    await search('Chur Wohnung mieten', { tbs: 'qdr:w' });
    assert.equal(sent.tbs, 'qdr:w');
    await search('Chur Wohnung mieten');
    assert.equal(Object.hasOwn(sent, 'tbs'), false);
  } finally {
    if (previous === undefined) delete process.env.SERPER_API_KEY;
    else process.env.SERPER_API_KEY = previous;
  }
});


test('P129.47 repair protocol validates a closed operation whitelist and evidence-backed prices', async () => {
  const repair = await import('../server/immofinderRepair.ts');
  const id = '123e4567-e89b-12d3-a456-426614174000';
  const valid = repair.validateOps([{ op: 'set_price', id, reason: 'price_repair', price: { amount: 1800, unit: 'month' } }]);
  assert.equal(valid.issues.length, 0);
  assert.equal(valid.ops.length, 1);
  const invalid = repair.validateOps([{ op: 'hide', id, reason: 'junk_listing', arbitrary_text: 'overwrite' }]);
  assert.equal(invalid.ops.length, 0);
  assert.match(invalid.issues[0].error, /unsupported field/);
  assert.equal(repair.amountInText(1800, 'CHF 1’800 pro Monat'), true);
  assert.equal(repair.amountInText(1800, 'CHF 1’500 pro Monat'), false);
});

test('P129.48 repair audit allows undisclosed rent and writes evidence-backed price repairs', async () => {
  const { auditRow, hardRejectReason, isPresentable, evaluateOp, sanitizeNewRecord, REPAIR_RULES_VERSION } = await import('../server/immofinderRepair.ts');
  const ctx = { municipalities: ['Chur'] };
  const missing = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    listing_url: 'https://www.homegate.ch/mieten/4001234567',
    municipality: 'Chur',
    property_name: '3.5-Zimmer-Wohnung in Chur',
    description_de: 'Helle Wohnung mit Balkon in Chur.',
    rooms_estimated: 3.5,
    rooms_basis: 'zimmer',
    rent_monthly_chf: null,
    pricing_unit: null,
    hidden: false,
    raw: { evidence_kind: 'page_text', evidence_url: 'https://www.homegate.ch/mieten/4001234567', evidence_text: '3.5-Zimmer-Wohnung in Chur zu vermieten. Helle Wohnung mit Balkon und Küche. Bezug ab sofort möglich, Wohnfläche 80 m2. Separates Kellerabteil, ruhige Lage und gute Anbindung an den öffentlichen Verkehr.' },
  };
  assert.equal(REPAIR_RULES_VERSION, `${JSON.parse(read('package.json')).patch}.5`);
  assert.equal(hardRejectReason(missing, ctx), null);
  assert.equal(isPresentable(missing, ctx), true);
  assert.equal(sanitizeNewRecord(missing, ctx).hardReason, null);
  assert.ok(!auditRow(missing, ctx).ops.some((op) => op.op === 'hide'));

  const evidencePriced = {
    ...missing,
    id: '123e4567-e89b-12d3-a456-426614174002',
    raw: { evidence_kind: 'page_text', evidence_url: 'https://www.homegate.ch/mieten/4001234567', evidence_text: "3.5-Zimmer-Wohnung in Chur zu vermieten. Miete CHF 1'500 pro Monat. Helle Wohnung mit Balkon und Küche, Bezug ab sofort." },
  };
  const audit = auditRow(evidencePriced, ctx);
  assert.equal(audit.hardReason, null);
  const priceOp = audit.ops.find((op) => op.op === 'set_price');
  assert.ok(priceOp);
  const applied = evaluateOp(priceOp, evidencePriced, ctx, { source: 'test', batchId: 'p12948-price-test' });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.patch.rent_monthly_chf, 1500);
  assert.equal(applied.patch.pricing_unit, 'month');

  const unknownUnit = {
    ...evidencePriced,
    id: '123e4567-e89b-12d3-a456-426614174004',
    rent_monthly_chf: null,
    pricing_unit: 'unknown',
    raw: {
      evidence_kind: 'page_text', evidence_url: 'https://www.homegate.ch/mieten/4001234567',
      evidence_text: "3.5-Zimmer-Wohnung in Chur zu vermieten. CHF 2'900 pro Monat. Helle Wohnung mit Balkon und Küche. Wohnfläche 90 m2, ruhige Lage und Bezug ab sofort möglich.",
      price: { amount: 130, unit: 'unknown' },
    },
  };
  const unknownAudit = auditRow(unknownUnit, ctx);
  assert.equal(unknownAudit.hardReason, null);
  assert.equal(unknownAudit.ops.find((op) => op.op === 'set_price')?.price.amount, 2900);

  const weekly = {
    ...evidencePriced,
    id: '123e4567-e89b-12d3-a456-426614174003',
    pricing_unit: 'week',
    raw: { evidence_kind: 'page_text', evidence_url: 'https://www.homegate.ch/mieten/4001234567', evidence_text: '3.5-Zimmer-Wohnung in Chur zu vermieten. CHF 800 pro Woche. Helle Wohnung mit Balkon und Küche. Wohnfläche 90 m2, ruhige Lage und Bezug ab sofort möglich.', price: { amount: 800, unit: 'week' } },
  };
  assert.equal(hardRejectReason(weekly, ctx), null, 'weekly price and missing direct contact do not block L1');
});

test('P129.47 All Logs contains the complete ImmoFinder snapshot and repair endpoints are authenticated', () => {
  const allLogs = read('server/allLogs.ts');
  const routes = read('server/immofinderRoutes.ts');
  const store = read('server/immofinderRepairStore.ts');
  assert.match(allLogs, /immofinder\/listings\.jsonl/);
  assert.match(allLogs, /exportRepairSnapshot/);
  assert.match(routes, /\/api\/immofinder\/export-snapshot/);
  assert.match(routes, /\/api\/immofinder\/repair\/preview/);
  assert.match(routes, /\/api\/immofinder\/repair\/apply/);
  assert.match(routes, /runAutomaticRepairAudit/);
  assert.match(routes, /publishQualityCheckedListings\('automatic repair audit'\)/);
  assert.match(routes, /settings\.delivery\.email && settings\.delivery\.emailTo/);
  assert.match(routes, /settings\.delivery\.drive/);
  assert.match(store, /FOR UPDATE/);
  assert.match(store, /ON CONFLICT \(batch_id\) DO NOTHING/);
  assert.match(store, /patch\.rent_monthly_chf/);
  assert.match(store, /patch\.pricing_unit/);
});

test('P129.47 write-time sanitation applies to every newly discovered or refreshed listing', () => {
  const store = read('server/immofinderStore.ts');
  assert.match(store, /sanitizeNewRecord\(input/);
  assert.match(store, /write_time_quality/);
  assert.match(store, /hidden = CASE WHEN \$15::boolean THEN true WHEN \$17::boolean THEN false ELSE hidden END/);
});

test('P129.47 a repair patch can carry batches that auto-apply once on first request', () => { const store = read('server/immofinderRepairStore.ts'); assert.match(store, /data\/immofinder\/repair-ops\.json/); assert.match(store, /applyBundledRepairBatches/); });


test('P129.49 only presents cards backed by the exact fetched detail page and one matching monthly price', async () => {
  const { hardRejectReason, isPresentable, sanitizeNewRecord } = await import('../server/immofinderRepair.ts');
  const ctx = { municipalities: ['Exampleville'] };
  const url = 'https://example.ch/listing/42';
  const base = {
    id: '11111111-1111-4111-8111-111111111111',
    listing_url: url,
    municipality: 'Exampleville',
    property_name: '3.5 Zimmer Wohnung in Exampleville',
    rooms_estimated: 3.5,
    rooms_basis: 'zimmer',
    rent_monthly_chf: 1450,
    pricing_unit: 'month',
    description_de: '3.5 Zimmer Wohnung in Exampleville, zu vermieten.',
    hidden: false,
    raw: {
      price: { amount: 1450, unit: 'month', quote: 'CHF 1 450 pro Monat' },
      evidence_kind: 'page_text',
      evidence_url: url,
      evidence_text: '3.5 Zimmer Wohnung in Exampleville zu vermieten. Mietzins CHF 1 450 pro Monat. Wohnfläche 82 m2. Helle Räume, Balkon, Küche und Bad. Bezug ab sofort möglich.',
    },
  };
  assert.equal(hardRejectReason(base, ctx), null);
  assert.equal(isPresentable(base, ctx), true);

  const snippet = { ...base, raw: { ...base.raw, evidence_kind: 'snippet' } };
  assert.equal(hardRejectReason(snippet, ctx), 'detail_page_not_verified');
  assert.equal(isPresentable(snippet, ctx), false);

  const noProvenance = { ...base, raw: { ...base.raw, evidence_url: null } };
  assert.equal(hardRejectReason(noProvenance, ctx), 'detail_page_url_missing');

  const redirected = { ...base, raw: { ...base.raw, evidence_url: 'https://example.ch/search?query=Exampleville' } };
  assert.equal(hardRejectReason(redirected, ctx), 'detail_page_url_mismatch');

  const ambiguousPrice = {
    ...base,
    raw: { ...base.raw, evidence_text: '3.5 Zimmer Wohnung in Exampleville zu vermieten. Miete CHF 1 450 pro Monat. Zweiter Preis CHF 1 650 pro Monat. Wohnfläche 82 m2. Helle Räume, Balkon und Küche vorhanden.' },
  };
  assert.equal(hardRejectReason(ambiguousPrice, ctx), null, 'ambiguous optional price must not hide a verified listing');
  const cleaned = sanitizeNewRecord(ambiguousPrice, ctx);
  assert.equal(cleaned.hardReason, null);
  assert.equal(cleaned.rec.rent_monthly_chf, null);
  assert.equal(cleaned.rec.raw.price, null);
});

test('P129.52 pipeline validates optional final URL, same-listing redirects and verified page text', () => {
  const pipeline = read('server/immofinderPipeline.ts');
  const fetcher = read('server/immofinderFetcher.ts');
  assert.match(pipeline, /evidence_url:\s*evidenceUrl/);
  assert.match(pipeline, /const fetchedUrl = String\(pg\.finalUrl \|\| ''\)\.trim\(\)/);
  assert.match(pipeline, /sameListingUrlTarget\(it\.url, fetchedUrl\)/);
  assert.match(pipeline, /evidenceUrl = fetchedUrl \|\| it\.url/);
  assert.match(pipeline, /MIN_DIRECT_PAGE_TEXT_CHARS = 120/);
  assert.match(fetcher, /Promise<\{ ok: boolean; status: number; body: string; finalUrl\?: string; fetchMode\?: string \}>/);
  assert.match(fetcher, /jinaFallback/);
  assert.match(fetcher, /URL Source/);
  assert.match(fetcher, /finalUrl:\s*r\.url\s*\|\|\s*url/);
});


test('P129.49 automatic audit idempotency key changes with repair rules version', () => {
  const store = read('server/immofinderRepairStore.ts');
  const repair = read('server/immofinderRepair.ts');
  assert.match(store, /REPAIR_RULES_VERSION/);
  assert.match(store, /current_database\(\)\s*\|\|\s*':'\s*\|\|\s*\$1/);
  assert.match(store, /COALESCE\(max\(updated_at\)::text/);
  assert.match(repair, /export const REPAIR_RULES_VERSION/);
});


test('P129.49 automatically rechecks and restores only previously auto-hidden listings', () => {
  const store = read('server/immofinderStore.ts');
  const pipeline = read('server/immofinderPipeline.ts');
  assert.match(store, /auto_hidden/);
  assert.match(store, /prevRaw\.repair\?\.source === 'automatic_rules'/);
  assert.match(store, /WHEN \$17::boolean THEN false/);
  assert.match(pipeline, /hidden: boolean; autoHidden: boolean/);
  assert.match(pipeline, /known\?\.autoHidden/);
  assert.match(pipeline, /6 \* 60 \* 60 \* 1000/);
  assert.match(pipeline, /!known\.hidden/);
  assert.match(pipeline, /res\.newListings\.push\(safeRec\)/);
});

test('ImmoFinder does not widen beyond selected portals when fewer than ten ads are found', async () => {
  const { defaultSettings, applySettings } = await import('../server/immofinderSettings.ts');
  const cfg = JSON.parse(read('config/immofinder.json'));
  const settings = defaultSettings(cfg);
  for (const id of Object.keys(settings.search.sources)) settings.search.sources[id] = id === 'portal-flatfox';
  const applied = applySettings(cfg, settings);
  assert.ok(applied.discovery.portalQueries.length > 0);
  assert.ok(applied.discovery.portalQueries.every((q) => q.includes('site:flatfox.ch')));
  assert.equal(applied.discovery.fallbackPortalQueries.length, applied.discovery.portalQueries.length);
  assert.ok(applied.discovery.fallbackPortalQueries.every((q) => q.includes('site:flatfox.ch')));
  assert.match(read('server/immofinderPipeline.ts'), /res\.counts\.kept < 10/);
  assert.match(read('server/immofinderPipeline.ts'), /discovery_source_fallback_started/);
  assert.match(read('server/immofinderPipeline.ts'), /remainingPages/);
  assert.match(read('server/immofinderPipeline.ts'), /discovery_target_reached/);
  assert.match(read('server/immofinderPipeline.ts'), /stopAtKept: 10/);
});

test('C131 no-label invariant replay reports admission, infrastructure and provenance only', async () => {
  const { replayC131Invariants } = await import('../server/immofinderTrustEngine.ts');
  const url = 'https://example.test/property/one';
  const pageText = [
    '3.5 Zimmer Wohnung zu vermieten in Chur',
    'Helle Wohnung mit Balkon und eigener Küche. Ruhige Lage und gute Verkehrsanbindung.',
    'Kontakt Vermieter: +41 79 123 45 67',
    'Weitere Angaben zur Wohnung: Kellerabteil, Waschküche und ein zusätzlicher Abstellraum.',
  ].join('\\n');
  const input = {
    requestedUrl: url, finalUrl: url, title: '3.5 Zimmer Wohnung zu vermieten in Chur', pageText,
    municipality: 'Chur', municipalities: ['Chur'], provisional: false, rooms: 3.5,
    priceMonthlyChf: null, priceUnit: null, priceQuote: null, listedAt: null,
    maxAgeDays: 180, phone: null, email: null, contactEvidenceUrls: [], nowMs: Date.parse('2026-11-24T12:00:00.000Z'),
  };
  const result = replayC131Invariants([
    { id: 'page-one', fetchable: true, input, fieldEvidence: [{ field: 'rooms', sourceUrl: url, verbatimQuote: '3.5 Zimmer' }] },
    { id: 'page-cross-url', fetchable: true, input, fieldEvidence: [
      { field: 'rooms', sourceUrl: url, verbatimQuote: '3.5 Zimmer' },
      { field: 'rent', sourceUrl: 'https://example.test/other', verbatimQuote: 'Wohnung' },
    ] },
    { id: 'fetch-blocked', fetchable: false, input: { ...input, pageText: '' } },
  ]);
  assert.equal(result.total, 3);
  assert.equal(result.fetchable, 2);
  assert.equal(result.infrastructureFailures, 1);
  assert.equal(result.admittedL1, 2);
  assert.equal(result.rejected, 1);
  assert.equal(result.snippetOnlyAdmitted, 0);
  assert.equal(result.acceptedNotFetchable, 0);
  assert.equal(result.provenance.crossUrlFieldMergeCount, 1);
  assert.equal(result.provenance.sourceUrlMismatchCount, 1);
  assert.equal(result.provenance.missingFieldEvidenceCount, 1);
  assert.equal(result.provenance.unverifiableQuoteCount, 0);
  assert.deepEqual(result.rejectReasons, { trust_page_too_short: 1 });
  assert.equal('precision' in result, false);
  assert.equal('fetchableGoodRecall' in result, false);
  assert.throws(() => replayC131Invariants([{ id: 'dup', fetchable: true, input }, { id: 'dup', fetchable: true, input }]), /id_missing_or_duplicate/);
});

test('P131.3 L3 letter requires page-grounded private owner and actual contact route', async () => {
  const { buildC131LetterDraft } = await import('../server/immofinderLetter.ts');
  const pageText = [
    '4.5 Zimmer Ferienwohnung zu vermieten in Flims.',
    'Diese Ferienwohnung wird von privat vermietet. Helle Wohnung mit Balkon und Küche.',
    'Kontakt aufnehmen über das Formular. Weitere Angaben zur Unterkunft und Ausstattung.',
  ].join(' ');
  const base = {
    resultType: 'tourist_owner', listingUrl: 'https://example.ch/listing/123',
    finalUrl: 'https://example.ch/listing/123', title: '4.5 Zimmer Ferienwohnung in Flims',
    pageText, pageHtml: '<form><textarea name="message"></textarea><button type="submit">Send</button></form>', municipalities: ['Flims'], municipality: 'Flims', propertyName: 'Ferienwohnung',
    rooms: 4.5, ownerName: 'Nicht belegter Name', ownerEvidenceQuote: 'von privat vermietet',
    contactRoute: 'platform_message', contactEvidence: [], fetchedAt: '2026-11-25T12:00:00.000Z',
  };
  const result = buildC131LetterDraft(base);
  assert.equal(result.ready, true);
  if (result.ready) {
    assert.match(result.draft, /Flims/);
    assert.match(result.draft, /4.5-Zimmer/);
    assert.doesNotMatch(result.draft, /Nicht belegter Name/);
    assert.doesNotMatch(result.draft, /festes Einkommen|Betreibungsregister|Privathaftpflicht/);
    assert.equal(result.evidence.every((item) => item.sourceUrl === base.finalUrl), true);
  }
  assert.deepEqual(buildC131LetterDraft({ ...base, pageText: pageText.replace('von privat vermietet', 'professionell verwaltet') }), { ready: false, reason: 'private_owner_evidence_missing' });
  assert.deepEqual(buildC131LetterDraft({ ...base, contactRoute: 'none' }), { ready: false, reason: 'contact_route_missing' });
  assert.deepEqual(buildC131LetterDraft({ ...base, pageHtml: '<form><input type="search"><button type="submit">Search</button></form>' }), { ready: false, reason: 'platform_action_not_page_evidenced' });
  assert.deepEqual(buildC131LetterDraft({ ...base, municipality: 'Chur' }), { ready: false, reason: 'locality_not_page_grounded' });
  assert.deepEqual(buildC131LetterDraft({ ...base, rooms: 2.5 }), { ready: false, reason: 'rooms_not_page_grounded' });
});

test('P131.3 L3 direct contact must be copied from the same fetched detail page', async () => {
  const { buildC131LetterDraft } = await import('../server/immofinderLetter.ts');
  const pageText = '3.5 Zimmer Wohnung zu vermieten in Chur. Von privat vermietet. Kontakt: owner@example.ch. ' + 'Weitere Angaben zur Wohnung und Ausstattung. '.repeat(3);
  const base = {
    resultType: 'direct_offer', listingUrl: 'https://example.ch/ad/1', finalUrl: 'https://example.ch/ad/1',
    title: '3.5 Zimmer Wohnung', pageText, pageHtml: '', municipalities: ['Chur'], municipality: 'Chur',
    propertyName: 'Wohnung', rooms: 3.5, ownerName: null, ownerEvidenceQuote: 'Von privat vermietet',
    contactRoute: 'direct', contactEvidence: [{ type: 'email', value: 'owner@example.ch', url: 'https://example.ch/ad/1' }],
    fetchedAt: '2026-11-25T12:00:00.000Z',
  };
  assert.equal(buildC131LetterDraft(base).ready, true);
  assert.deepEqual(buildC131LetterDraft({ ...base, contactEvidence: [{ type: 'email', value: 'owner@example.ch', url: 'https://example.ch/contact' }] }), { ready: false, reason: 'direct_contact_not_page_grounded' });
  assert.deepEqual(buildC131LetterDraft({ ...base, finalUrl: 'https://example.ch/ad/2' }), { ready: false, reason: 'listing_url_mismatch' });
});

test('P131.5g settings disclosure is an explicit accessible button', () => {
  const ui = read('src/ImmoFinder.tsx');
  assert.match(ui, /data-testid="immofinder-settings-toggle"/);
  assert.match(ui, /aria-expanded=\{settingsOpen\}/);
  assert.match(ui, /aria-controls="immofinder-settings-panel"/);
  assert.match(ui, /setSettingsOpen\(\(open\) => !open\)/);
  assert.match(ui, /settingsOpen && <div id="immofinder-settings-panel"/);
});
test('P131.5g agent smoke search has a strict bounded budget', async () => {
  const { applyImmoFinderTestBudget } = await import('../server/immofinderTestMode.ts');
  const original = {
    municipalities: ['Chur', 'Flims'], stopAgencies: [], minRooms: 3, platformDomains: [],
    sources: [{ id: 'a', url: 'https://a.example', phase: 1 }, { id: 'b', url: 'https://b.example', phase: 1 }, { id: 'c', url: 'https://c.example', phase: 2 }, { id: 'd', url: 'https://d.example', phase: 2 }],
    fetch: { userAgent: 'test', perHostDelayMs: 0, respectRobotsTxt: true, browserRenderHosts: ['newhome.ch'], browserRenderMinTextChars: 1200, maxBrowserRendersPerRun: 2 },
    limits: { maxDetailPagesPerSource: 20, recheckAfterDays: 7, fetchTimeoutMs: 5000, maxPageBytes: 100000 },
    estCostPerLlmCallUsd: 0,
    discovery: { enabled: true, communesPerRun: 12, resultsPerQuery: 10, maxPagesPerRun: 40, maxCandidatesPerQuery: 8, queries: ['private-a', 'private-b', 'private-c'], portalQueries: ['site:homegate.ch query', 'site:newhome.ch query', 'site:flatfox.ch query'], snippetOnlyHosts: [], skipHosts: [] },
    contactEnrichment: { enabled: true, maxExtraSearchesPerRun: 12, maxReverseImagePerRun: 5 },
  };
  const bounded = applyImmoFinderTestBudget(original);
  assert.equal(bounded.sources.length, original.sources.length, 'all configured source adapters remain in the bounded test');
  assert.equal(bounded.discovery?.communesPerRun, 1);
  assert.ok((bounded.discovery?.resultsPerQuery ?? 99) <= 3);
  assert.equal(bounded.discovery?.maxPagesPerRun, Math.min(original.discovery.maxPagesPerRun, original.discovery.queries.length + original.discovery.portalQueries.length));
  assert.ok((bounded.discovery?.maxCandidatesPerQuery ?? 99) <= 3);
  assert.deepEqual(bounded.discovery?.queries, original.discovery.queries);
  assert.deepEqual(bounded.discovery?.portalQueries, original.discovery.portalQueries, 'all enabled portal queries remain eligible within the page cap');
  assert.ok(bounded.limits.maxDetailPagesPerSource <= 2);
  assert.equal(bounded.sources.every((source) => source.maxDetailPages <= 2), true);
  assert.equal(bounded.fetch.maxBrowserRendersPerRun, 2);
  assert.equal(bounded.contactEnrichment?.enabled, false);
  assert.equal(bounded.runMaxDurationMs, 180_000);
  assert.ok((bounded.priorityWaveMs ?? 999999) <= 45_000);
  assert.equal(original.sources.length >= bounded.sources.length, true);
  const route = read('server/immofinderRoutes.ts');
  assert.match(route, /testMode && \(!\(req as any\)\.immoCron \|\| req\.body\?\.dryRun !== true\)/);
  assert.match(route, /progress\.testMode === true \? applyImmoFinderTestBudget\(baseCfg\)/);
  assert.match(route, /testMode \? 'full'/);
  assert.match(route, /progress\.testMode === true \? 'skipped:test_mode' : await publishGitHubSnapshotAfterRun/);
  const pipeline = read('server/immofinderPipeline.ts');
  const store = read('server/immofinderStore.ts');
  assert.match(store, /jsonb_build_object\('state','queued','text',\$3::text,'releasedAt',now\(\)\)/);
  assert.match(pipeline, /if \(!opts\.dryRun\) \{\s*try \{ await deps\.store\.markSeen/);
});

test('P131.5h agent test and health workflows target the confirmed My Workspace service', () => {
  const smoke = read('.github/workflows/immofinder-test-search.yml');
  assert.match(smoke, /BASE_URL: https:\/\/bf-3tqo\.onrender\.com/);
  assert.doesNotMatch(smoke, /secrets\.IMMOFINDER_BASE_URL/);
  const health = read('.github/workflows/immofinder-health.yml');
  assert.match(health, /RENDER_OWNER_ID: tea-dbbjfi7avr4c73e32e8g/);
  assert.match(health, /RENDER_SERVICE_ID: srv-dc2joprrjlhs73cuo3n0/);
  assert.match(health, /RENDER_POSTGRES_ID: dpg-dc2jq267bikc738t6u30-a/);
});

test('P131.5i browser rendering is host-allowlisted and skips anti-bot challenge pages', async () => {
  const { isShortPageBrowserCandidate } = await import('../server/immofinderFetcher.ts');
  const cfg = { browserRenderHosts: ['newhome.ch'], browserRenderMinTextChars: 1200 };
  assert.equal(isShortPageBrowserCandidate('www.newhome.ch', 863, cfg), true);
  assert.equal(isShortPageBrowserCandidate('homegate.ch', 863, cfg), false);
  assert.equal(isShortPageBrowserCandidate('newhome.ch', 1300, cfg), false);
  const fetcher = read('server/immofinderFetcher.ts');
  assert.match(fetcher, /if \(challengeLike\) \{[\s\S]*browser_fallback_skipped_challenge/);
  assert.match(fetcher, /browserRenders >= browserRenderLimit/);
});
test('P131.5j bounded test mode uses PipelineOptions and durable retry SQL is typed', () => {
  const pipeline = read('server/immofinderPipeline.ts');
  assert.match(pipeline, /opts\.testMode \? Math\.min\(cfg\.discovery\?\.maxPagesPerRun \?\? 3, 3\)/);
  assert.match(pipeline, /if \(processedItems >= pageLimit\)/);
  const route = read('server/immofinderRoutes.ts');
  assert.match(route, /\}, \{ dryRun, wave, testMode: progress\.testMode === true \}\);/);
  const runCall = route.slice(route.indexOf('result = await runPipeline({'), route.indexOf('pipelineCompleted = true;'));
  const depsArgument = runCall.slice(0, runCall.indexOf('}, { dryRun, wave'));
  assert.doesNotMatch(depsArgument, /testMode:/);
  const store = read('server/immofinderStore.ts');
  assert.match(store, /jsonb_build_object\('state','queued','text',\$3::text,'releasedAt',now\(\)\)/);
});


test('P131.7 rejects shared-flat seeker posts but preserves ordinary rental offers', async () => {
  const { isSeekerPost } = await import('../server/immofinderCore.ts');
  const { verifyListingAdmission } = await import('../server/immofinderTrustEngine.ts');
  const seekerTitle = 'Appartement 4 pièces à louer à Chur';
  const seekerText = [
    'Appartement de 4 pièces à louer à Chur.',
    'Die Wohngemeinschaft in der Stadt sucht neue Mitbewohner und organisiert die Übernahme der gemeinsamen Wohnung.',
    'Die Anzeige beschreibt eine bestehende Wohngemeinschaft, die weitere Personen für den Haushalt sucht.',
    'Die Wohnung liegt in Chur und umfasst vier Zimmer.',
  ].join(' ');
  assert.equal(isSeekerPost(seekerTitle, seekerText), true);
  const common = {
    requestedUrl: 'https://example.test/chur-4-room-flat',
    finalUrl: 'https://example.test/chur-4-room-flat',
    municipality: 'Chur',
    municipalities: ['Chur'],
    provisional: false,
    rooms: 4,
    priceMonthlyChf: null,
    priceUnit: null,
    priceQuote: null,
    listedAt: null,
    maxAgeDays: 0,
    phone: null,
    email: null,
    contactEvidenceUrls: [],
  };
  assert.deepEqual(verifyListingAdmission({ ...common, title: seekerTitle, pageText: seekerText }), {
    accepted: false,
    reason: 'trust_seeker_post',
  });
  const offerTitle = '4-Zimmer-Wohnung zu vermieten in Chur';
  const offerText = [
    '4-Zimmer-Wohnung zu vermieten in Chur.',
    'Die helle Wohnung befindet sich in zentraler Lage und verfügt über vier abgeschlossene Zimmer.',
    'Die Wohnung ist ab sofort zu mieten; Besichtigung nach Vereinbarung.',
  ].join(' ');
  assert.equal(isSeekerPost(offerTitle, offerText), false);
  assert.equal(verifyListingAdmission({ ...common, title: offerTitle, pageText: offerText }).accepted, true);
});
