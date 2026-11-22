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
  assert.match(routes, /\{\s*dryRun,\s*wave\s*\}/);
});

test('UI exposes carousel and full run controls', () => {
  const ui = read('src/ImmoFinder.tsx');
  assert.match(ui, /immofinder-run-carousel/);
  assert.match(ui, /start\('carousel'\)/);
  assert.match(ui, /start\('full'\)/);
});

test('ImmoFinder run lock is atomic and outlives the server run deadline', () => {
  const store = read('server/immofinderStore.ts');
  const cfg = JSON.parse(read('config/immofinder.json'));
  const app = read('src/ImmoFinder.tsx');
  assert.match(store, /pg_advisory_xact_lock/);
  assert.match(store, /interval '50 minutes'/);
  assert.equal(cfg.runMaxDurationMs, 2700000);
  assert.match(app, /50 \* 60 \* 1000/);
});
test('ImmoFinder controls reflect live discovery behaviour and run duration', () => {
  const settingsUi = read('src/ImmoFinderSettings.tsx');
  const settings = read('server/immofinderSettings.ts');
  const core = read('server/immofinderCore.ts');
  const app = read('src/ImmoFinder.tsx');
  assert.match(settingsUi, /Private-owner web search/);
  assert.match(settingsUi, /social snippets are not saved as verified listings/);
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

test('settings UI does not claim a published monthly price is mandatory', () => {
  const ui = read('src/ImmoFinderSettings.tsx');
  assert.match(ui, /undisclosed rent may remain marked as unknown/);
  assert.doesNotMatch(ui, /with a stated monthly price pass the quality gate/);
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
  const { defaultSettings, applySettings } = await import('../server/immofinderSettings.ts');
  const cfg = JSON.parse(read('config/immofinder.json'));
  const defaults = defaultSettings(cfg);
  const routes = read('server/immofinderRoutes.ts');
  const ui = read('src/ImmoFinderSettings.tsx');

  assert.equal(defaults.schedule.everyHours, 3);
  assert.equal(defaults.search.minRooms, 3);
  assert.equal(defaults.search.carouselCommunesPerRun, 12);
  assert.equal(defaults.search.privateQueryTemplates, 4);
  assert.equal(defaults.search.maxAiPages, 100);
  assert.equal(defaults.search.enrichSearchesPerRun, 12);
  assert.equal(defaults.search.requirePrice, false);
  assert.equal(defaults.search.rejectNonMonthly, false);
  assert.equal(defaults.search.rejectSeekerPosts, true);
  assert.equal(defaults.search.requireContact, false);
  assert.equal(defaults.search.maxMonthlyRentChf, 3500);
  assert.equal(defaults.delivery.driveFolderId, cfg.driveFolderId);
  assert.ok(Object.values(defaults.search.sources).filter(Boolean).length >= 14);

  const applied = applySettings(cfg, defaults);
  assert.equal(applied.discovery.portalQueries.length, cfg.discovery.portalQueries.length);
  assert.equal(applied.discovery.communesPerRun, 12);
  assert.equal(applied.discovery.queries.length, 4);

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
  assert.equal(hardRejectReason(weekly, ctx), 'short_stay_contact_required');
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
  const { hardRejectReason, isPresentable } = await import('../server/immofinderRepair.ts');
  const ctx = { municipalities: ['Exampleville'] };
  const url = 'https://example.ch/listing/42';
  const base = {
    id: '11111111-1111-4111-8111-111111111111',
    listing_url: url,
    municipality: 'Exampleville',
    property_name: '3.5 Zimmer Wohnung in Exampleville',
    rooms_estimated: 3.5,
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
  assert.equal(hardRejectReason(ambiguousPrice, ctx), 'price_ambiguous_on_detail_page');
});

test('P129.52 pipeline validates optional final URL, same-listing redirects and verified page text', () => {
  const pipeline = read('server/immofinderPipeline.ts');
  const fetcher = read('server/immofinderFetcher.ts');
  assert.match(pipeline, /evidence_url:\s*evidenceUrl/);
  assert.match(pipeline, /const fetchedUrl = String\(pg\.finalUrl \|\| ''\)\.trim\(\)/);
  assert.match(pipeline, /sameListingUrlTarget\(it\.url, fetchedUrl\)/);
  assert.match(pipeline, /evidenceUrl = fetchedUrl \|\| it\.url/);
  assert.match(pipeline, /MIN_DIRECT_PAGE_TEXT_CHARS = 30/);
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

test('ImmoFinder expands to all configured portals when selected portals yield fewer than ten verified ads', async () => {
  const { defaultSettings, applySettings } = await import('../server/immofinderSettings.ts');
  const cfg = JSON.parse(read('config/immofinder.json'));
  const settings = defaultSettings(cfg);
  for (const id of Object.keys(settings.search.sources)) settings.search.sources[id] = id === 'portal-flatfox';
  const applied = applySettings(cfg, settings);
  assert.ok(applied.discovery.portalQueries.length > 0);
  assert.ok(applied.discovery.portalQueries.every((q) => q.includes('site:flatfox.ch')));
  assert.equal(applied.discovery.fallbackPortalQueries.length, cfg.discovery.portalQueries.length);
  assert.match(read('server/immofinderPipeline.ts'), /res\.counts\.kept < 10/);
  assert.match(read('server/immofinderPipeline.ts'), /discovery_source_fallback_started/);
  assert.match(read('server/immofinderPipeline.ts'), /remainingPages/);
  assert.match(read('server/immofinderPipeline.ts'), /discovery_target_reached/);
  assert.match(read('server/immofinderPipeline.ts'), /stopAtKept: 10/);
});
