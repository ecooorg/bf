/**
 * Category: agents — ModeMenu, routes, isolation of Simple / Expert / Project.
 * Add new agent UI/route contracts here (do not create per-patch files).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyListingAdmission } from '../server/immofinderTrustEngine.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('ModeMenu exposes three agents with stable internal keys Simple | Expert | Project', () => {
  const menu = read('src/ModeMenu.tsx');
  assert.match(menu, /export type AppMode = 'Simple' \| 'Expert' \| 'Project'/);
  assert.match(menu, /mode: 'Simple'/);
  assert.match(menu, /mode: 'Expert'/);
  assert.match(menu, /mode: 'Project'/);
  assert.match(menu, /data-testid="mode-menu-button"/);
  assert.match(menu, /data-testid=\{`mode-item-\$\{it\.mode\.toLowerCase\(\)\}`\}/);
});

test('User-facing labels are Simple, Expert, Project (not Conversational / Architect)', () => {
  const menu = read('src/ModeMenu.tsx');
  const app = read('src/App.tsx');
  assert.match(menu, /label: 'Simple'/);
  assert.match(menu, /label: 'Expert'/);
  assert.match(menu, /label: 'Project'/);
  assert.doesNotMatch(menu, /label: 'Conversational'/);
  assert.doesNotMatch(menu, /label: 'Architect'/);
  assert.match(app, /<h2>Simple<\/h2>/);
  assert.match(app, /<h2>Expert<\/h2>/);
  assert.match(app, /<h2>Project<\/h2>/);
});

test('Project opens on dedicated routes; main entry has no Architectural Test Lab', () => {
  const main = read('src/main.tsx');
  const app = read('src/App.tsx');
  assert.match(main, /'\/project'/);
  assert.match(main, /ProjectMode/);
  assert.doesNotMatch(main, /pathname === '\/architect-lab'|isArchitectLab|ArchitectLab/);
  assert.ok(!existsSync(path.join(root, 'src/ArchitectLab.tsx')), 'ArchitectLab.tsx must be removed');
  assert.ok(!existsSync(path.join(root, 'src/ArchitectShellHeader.tsx')), 'ArchitectShellHeader.tsx must be removed');
  assert.match(app, /window\.location\.href = '\/project'/);
});

test('AppHeader and ProjectMode More menus share All Logs and omit legacy diagnostic dump items', () => {
  const header = read('src/AppHeader.tsx');
  const project = read('src/ProjectMode.tsx');
  assert.match(header, /data-testid="all-logs-menu-item"/);
  assert.match(project, /data-testid="all-logs-menu-item"/);
  assert.doesNotMatch(header, /Diagnostic log/);
  assert.doesNotMatch(project, /Run system diagnostics/);
  assert.doesNotMatch(project, /Download diagnostic logs/);
});

test('Commit badge is wired for all shells that show ModeMenu', () => {
  assert.match(read('src/CommitBadge.tsx'), /data-testid="commit-badge"/);
  assert.match(read('src/AppHeader.tsx'), /CommitBadge/);
  assert.match(read('src/ProjectMode.tsx'), /CommitBadge/);
});

// ---- P128.1 ImmoFinder GR (module logic, pipeline with fake fetch/LLM, UI wiring) ----
import { formatListingsText, listingsTable, exportDrive, checkDrive, buildSheetRequests, buildDocRequests } from '../server/immofinderDelivery.ts';
import { immoCardModel, immoLinkLine } from '../src/immoCard.ts';
import { generateKeyPairSync } from 'node:crypto';
import { classifyType, contactAdvice, draftMessage as draftMsg, matchMunicipality as matchMuni, nonListingReason, isSpecificLink, parseListedAt, pageMeta, parsePrice, qualityRejectReason, isShortStayListing, shortStayPreflightReason, shortStayContactReason } from '../server/immofinderCore.ts';
import { parseDriveFolderId, formatZurich, defaultSettings, sanitizeSettings, applySettings, isDue } from '../server/immofinderSettings.ts';
import { communesForRun, buildQueries, pickItems } from '../server/immofinderDiscovery.ts';
import { cutAtMarkers, slugVariants, agencyQuoteCounts, matchMunicipality, parseRooms, registrationForbidden, verifyQuote, extractContacts, draftMessage, candidateLinks, canonicalKey } from '../server/immofinderCore.ts';
import { runPipeline } from '../server/immofinderPipeline.ts';

const immoCfg = JSON.parse(read('config/immofinder.json'));
const immoPage = (title, body) => `<html><head><title>${title}</title><meta property="og:image" content="/img/a.jpg"></head><body>${body}</body></html>`;

test('P128.1 whitelist match is whole-word and accent-insensitive; rooms parse Swiss notation', () => {
  assert.equal(matchMunicipality('Ferienhaus in Churwalden, Graubünden', immoCfg.municipalities), 'Churwalden');
  assert.equal(matchMunicipality('Wohnung in Domat/Ems', immoCfg.municipalities), 'Domat/Ems');
  assert.equal(matchMunicipality('Wohnung in Davos', immoCfg.municipalities), null);
  assert.equal(parseRooms('charmante 4½ Zimmer Wohnung').rooms, 4.5);
  assert.equal(parseRooms('3.5-Zimmer-Wohnung').rooms, 3.5);
  assert.equal(parseRooms('3 Schlafzimmer, 2 1/2 Zimmer').rooms, 2.5);
  assert.equal(parseRooms('2 Schlafzimmer').basis, 'bedrooms');
  assert.equal(parseRooms('Studio mit Balkon'), null);
});

test('P128.1 quotes and ZWG exclusion need verbatim, explicit evidence', () => {
  const text = 'Die Wohnung ist schön. Eine Anmeldung als Erstwohnsitz ist nicht möglich.';
  assert.equal(verifyQuote(text, 'Anmeldung als Erstwohnsitz ist nicht möglich'), true);
  assert.equal(verifyQuote(text, 'invented sentence'), false);
  assert.equal(registrationForbidden(text, 'Anmeldung als Erstwohnsitz ist nicht möglich'), true);
  assert.equal(registrationForbidden(text, 'Die Wohnung ist schön'), false);
  assert.equal(registrationForbidden(text, 'Erstwohnsitz verboten'), false);
});

test('P128.1 contacts are copied from text; platform domains are excluded; draft has no amount and no sharp s', () => {
  const c = extractContacts('Tel +41 81 123 45 67 oder 081 765 43 21, mail owner@example.org, info@happyholiday.ch', immoCfg.platformDomains);
  assert.deepEqual(c.emails, ['owner@example.org']);
  assert.equal(c.phones.length, 2);
  const d = draftMessage({ ownerName: null, propertyName: 'Chesa Test', municipality: 'Chur' });
  assert.ok(!/ß|CHF|Fr\.\s*\d/.test(d) && /drei Jahren/.test(d));
  assert.equal(canonicalKey('Chesa Süd', 'Chur'), canonicalKey('chesa sud', 'chur'));
  assert.ok(candidateLinks('<a href="/mietwohnung/12345">x</a><a href="https://other.com/a">y</a><a href="/impressum">z</a>', 'https://www.example.ch/list', 10).length === 1);
});

test('P128.1 pipeline keeps matching private listings, filters the rest, never stores unverified model facts', async () => {
  const cfg = { ...immoCfg, sources: [{ id: 't', url: 'https://t.example/area', phase: 1 }], fetch: { ...immoCfg.fetch, perHostDelayMs: 0 } };
  const pages = {
    'https://t.example/area': immoPage('Index', '<a href="/mietwohnung/1">a</a><a href="/mietwohnung/2">b</a><a href="/mietwohnung/3">c</a>'),
    'https://t.example/mietwohnung/1': immoPage('Chesa Alba', '<p>Chesa Alba in Churwalden, 4.5 Zimmer Wohnung zu vermieten. Privatvermietung von privat. Inseriert am: 20.11.2026. Nettomiete CHF 1\'200 pro Monat. Kontakt Vermieter: Hans Muster, hans@example.org, +41 81 111 22 33.</p>'),
    'https://t.example/mietwohnung/2': immoPage('Interhome Haus', '<p>Interhome Ferienhaus in Chur, 5 Zimmer.</p>'),
    'https://t.example/mietwohnung/3': immoPage('Studio Davos', '<p>Studio in Davos, 1.5 Zimmer. Ruhige Lage mit Balkon und schöner Aussicht.</p>'),
  };
  const saved = [];
  const seenDb = new Map();
  const store = { findByUrl: async () => null, touch: async () => {}, upsert: async (r) => { saved.push(r); return 'new'; }, getSeen: async (u) => seenDb.get(u) || null, markSeen: async (u) => { seenDb.set(u, { checked_at: new Date().toISOString() }); } };
  const llm = async (_s, prompt) => prompt.includes('Chesa Alba')
    ? { single_property: true, property_name: 'Chesa Alba', municipality_quote: 'Chesa Alba in Churwalden', rooms_quote: '4.5 Zimmer', owner_name: 'Fritz Erfunden', owner_name_quote: 'Fritz Erfunden', is_agency_or_manager: false, agency_quote: null, registration_forbidden_quote: null, summary_de: 'Wohnung in Churwalden', title_ru: 'Chesa Alba', summary_ru: 'Квартира в Churwalden' }
    : { single_property: true, property_name: null, municipality_quote: null, rooms_quote: null, owner_name: null, owner_name_quote: null, is_agency_or_manager: false, agency_quote: null, registration_forbidden_quote: null, summary_de: '', title_ru: '', summary_ru: '' };
  const res = await runPipeline({ config: cfg, fetchPage: async (u) => (pages[u] ? { ok: true, status: 200, body: pages[u], finalUrl: u } : { ok: false, status: 404, body: '' }), llm, store }, { dryRun: false });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].municipality, 'Churwalden');
  assert.equal(saved[0].owner_name, null, 'owner name not found in the page text must be dropped');
  assert.ok(saved[0].direct_phone, 'the advertiser-labelled phone is verified on the detail page');
  assert.equal(saved[0].direct_email, null, 'the verified phone is the selected direct contact channel');
  assert.equal(saved[0].contact_status, 'found');
  assert.ok(saved[0].draft_message_de.length > 200, JSON.stringify(saved[0].raw?.c131_letter_verification || saved[0].raw));
  assert.equal(saved.some((item) => /Interhome/i.test(item.property_name)), false, 'the managed holiday result is never saved');
  assert.ok(res.preview.filter((item) => !item.kept).length >= 2, 'the managed and incomplete detail pages are rejected');
  const dry = await runPipeline({ config: cfg, fetchPage: async (u) => ({ ok: true, status: 200, body: pages[u] || '', finalUrl: u }), llm, store }, { dryRun: true });
  assert.equal(dry.counts.llm_calls, 0);
  assert.equal(saved.length, 1, 'dry run persists nothing');
});

test('P128.1 empty source is reported, not silent; UI, route and cron wiring exist', async () => {
  const cfg = { ...immoCfg, sources: [{ id: 'x', url: 'https://x.example/', phase: 1 }], discovery: { ...immoCfg.discovery, enabled: false } };
  const res = await runPipeline({ config: cfg, fetchPage: async () => ({ ok: true, status: 200, body: '<html></html>' }), llm: null, store: {} }, { dryRun: true });
  assert.ok(res.errors.some((e) => e.code === 'source_no_candidates'), JSON.stringify(res.errors));
  const app = read('src/App.tsx');
  assert.match(app, /data-testid="start-immofinder"/);
  const ui = read('src/ImmoFinder.tsx');
  for (const id of ['immofinder-root', 'immofinder-run', 'immofinder-status-filter', 'immofinder-card', 'immofinder-last-run', 'immofinder-live']) assert.match(ui, new RegExp(id));
  assert.match(read('server.ts'), /registerImmoFinderRoutes\(app/);
  assert.match(read('.github/workflows/immofinder-cron.yml'), /api\/immofinder\/run/);
});

test('P128.2 footer cut, slug variants, agency flag needs a business-form quote, pattern-only links, city pages, seen cache', async () => {
  assert.equal(cutAtMarkers(`${'x'.repeat(400)} Andere Häuser Camuns Laax`, ['Andere Häuser']).includes('Camuns'), false);
  assert.deepEqual(slugVariants('Fläsch'), ['flaesch', 'flasch']);
  assert.equal(slugVariants('Domat/Ems')[0], 'domat-ems');
  assert.equal(agencyQuoteCounts('Alpweg 21, 4900 Langenthal', 'happyholiday.ch'), false);
  assert.equal(agencyQuoteCounts('Muster Immobilien AG', 'happyholiday.ch'), true);
  assert.equal(agencyQuoteCounts('HappyHoliday Immobilien GmbH', 'happyholiday.ch'), false);
  const html = '<a href="/haus/a-graubuenden-in-chur/">1</a><a href="/haus/b-sardinien-in-alghero/">2</a><a href="/city/chur/">3</a>';
  assert.deepEqual(candidateLinks(html, 'https://h.example/x', 10, /\/haus\/[^/]+-graubuenden-in-[^/]+\/?$/), ['https://h.example/haus/a-graubuenden-in-chur/']);
  const cfg = { ...immoCfg, municipalities: ['Chur', 'Zizers'], sources: [{ id: 'h', url: 'https://h.example/area/', phase: 1, cityUrl: 'https://h.example/city/{slug}/', detailPattern: '^https://h\\.example/haus/[^/]+-graubuenden-in-[^/]+/?$', privateTitleHint: 'von privat' }], fetch: { ...immoCfg.fetch, perHostDelayMs: 0 } };
  const pages = {
    'https://h.example/area/': '<html></html>',
    'https://h.example/city/chur/': '<a href="/haus/chesa-x-graubuenden-in-chur/">x</a>',
    'https://h.example/haus/chesa-x-graubuenden-in-chur/': immoPage('Chesa X in Chur – von privat', '<p>Chesa X in Chur, 4 Zimmer Wohnung zu vermieten. Inseriert am: 20.11.2026. Mietzins CHF 1\'350 pro Monat. Kontakt Vermieter: +41 79 123 45 67. Wohnzimmer. Andere Häuser Laax 9 Zimmer</p>'),
  };
  let fetched = 0; const saved = []; const seen = new Map();
  const store = { findByUrl: async () => null, touch: async () => {}, upsert: async (r) => { saved.push(r); return 'new'; }, getSeen: async (u) => seen.get(u) || null, markSeen: async (u) => { seen.set(u, { checked_at: new Date().toISOString() }); } };
  const fetchPage = async (u) => { fetched++; return pages[u] ? { ok: true, status: 200, body: pages[u], finalUrl: u } : { ok: false, status: 404, body: '' }; };
  const res = await runPipeline({ config: cfg, fetchPage, llm: null, store }, { dryRun: true });
  // cityUrl path only records successful commune index pages; Zizers has no fixture page → 1
  assert.equal(res.counts.index_pages, 1);
  assert.equal(res.counts.candidates, 1);
  assert.equal(res.counts.kept, 1);
  assert.ok(res.preview[0].detail.includes('platform_says_private'));
  assert.equal(res.preview[0].title.includes('Chesa X'), true);
});

test('P128.3 discovery: commune rotation, host policy, snippet-only portals, owner pages fetched, dedupe, no key = reported', async () => {
  assert.deepEqual(communesForRun(['a', 'b', 'c', 'd'], 3, 0), ['a', 'b', 'c']);
  assert.deepEqual(communesForRun(['a', 'b', 'c', 'd'], 3, 1), ['d', 'a', 'b']);
  const cfg = { ...immoCfg, municipalities: ['Chur', 'Zizers'], sources: [], fetch: { ...immoCfg.fetch, perHostDelayMs: 0 }, discovery: { ...immoCfg.discovery, communesPerRun: 1, queries: ['Ferienwohnung {commune} privat'], portalQueries: [], maxPagesPerRun: 10 } };
  assert.deepEqual(buildQueries(cfg, 1), ['Ferienwohnung Zizers privat']);
  const hits = [
    { title: 'Interhome Chur', link: 'https://www.interhome.ch/x', snippet: 'Interhome' },
    { title: 'Wikipedia', link: 'https://de.wikipedia.org/wiki/Chur', snippet: '' },
    { title: 'Ferienwohnung Chur 4 Zimmer von privat', link: 'https://www.facebook.com/marketplace/item/1', snippet: 'Schöne 4 Zimmer Wohnung in Chur, CHF 1\'400 pro Monat, Tel 079 123 45 67' },
    { title: 'Chesa Mia', link: 'https://chesa-mia.example/listing/123456', snippet: '' },
    { title: 'dup', link: 'https://chesa-mia.example/listing/123456', snippet: '' },
  ];
  const items = pickItems(hits, cfg);
  assert.deepEqual(items.map((i) => [i.host, i.snippetOnly]), [['chesa-mia.example', false], ['facebook.com', true]]);
  const pages = { 'https://chesa-mia.example/listing/123456': immoPage('Chesa Mia Chur', '<p>Chesa Mia in Chur, 5 Zimmer Wohnung zu vermieten. Inseriert am: 20.11.2026. CHF 1\'800 pro Monat. Kontakt Vermieter: Tel +41 79 123 45 67, mia@chesa-mia.example. Die Wohnung verfügt über Balkon, Küche, Bad, Kellerabteil und gute Verkehrsanbindung.</p>') };
  const saved = [];
  const store = { findByUrl: async () => null, touch: async () => {}, upsert: async (r) => { saved.push(r); return 'new'; }, getSeen: async () => null, markSeen: async () => {} };
  const fetchPage = async (u) => (pages[u] ? { ok: true, status: 200, body: pages[u], finalUrl: u } : { ok: false, status: 403, body: '' });
  const search = async () => hits;
  // Priority wave only: one commune from cycle (not full allCommunes).
  const res = await runPipeline({ config: cfg, fetchPage, llm: null, store, search, cycle: 0 }, { dryRun: false, wave: 'priority' });
  assert.equal(res.counts.search_queries, 1);
  assert.equal(res.counts.snippet_only, 1);
  assert.equal(res.counts.kept, 1);
  const fb = saved.find((r) => r.listing_url.includes('facebook'));
  assert.equal(fb, undefined, 'snippet-only short-stay results are not saved without direct-page evidence');
  assert.ok(saved.find((r) => r.listing_url.includes('chesa-mia')).direct_phone, 'the advertiser-labelled phone is verified');
  assert.equal(saved.find((r) => r.listing_url.includes('chesa-mia')).direct_email, null, 'the verified phone is the selected contact channel');
  const nokey = await runPipeline({ config: cfg, fetchPage, llm: null, store, search: null }, { dryRun: true });
  assert.equal(nokey.errors[0].code, 'discovery_skipped');
});

test('P128.4 pipeline reports live progress with stage, text and counters', async () => {
  const cfg = { ...immoCfg, municipalities: ['Chur'], discovery: { ...immoCfg.discovery, communesPerRun: 1, queries: ['q {commune}'] }, sources: [{ id: 'h', url: 'https://h.example/area/', phase: 1 }], fetch: { ...immoCfg.fetch, perHostDelayMs: 0 } };
  const pages = { 'https://h.example/area/': '<a href="/mietwohnung/1">a</a>', 'https://h.example/mietwohnung/1': immoPage('Chesa A', '<p>Chesa A in Chur, 4 Zimmer Wohnung zu vermieten. Inseriert am: 20.11.2026. Mietzins CHF 1\'100 pro Monat. Kontakt Vermieter: +41 79 123 45 67. Helle Räume mit Balkon, Küche, Bad, Kellerabteil und ruhiger Lage.</p>') };
  const ev = [];
  const store = { findByUrl: async () => null, touch: async () => {}, upsert: async () => 'new', getSeen: async () => null, markSeen: async () => {} };
  await runPipeline({ config: cfg, fetchPage: async (u) => (pages[u] ? { ok: true, status: 200, body: pages[u], finalUrl: u } : { ok: false, status: 404, body: '' }), llm: null, store, search: async () => [], onProgress: (e) => { ev.push(e); if (ev.length === 2) throw new Error('progress must not break runs'); } }, { dryRun: true });
  assert.ok(ev.some((e) => e.stage === 'catalogue' && /reading 1\/1/.test(e.text)));
  assert.ok(ev.some((e) => e.stage === 'search' && /Searching: .*Chur.*Wohnung/.test(e.text)));
  assert.ok(ev.some((e) => /match: Chesa A/.test(e.text)) && ev.at(-1).counts.kept === 1);
});

test('P129.48 settings: invalid input falls back to new defaults, scope applies, schedule due logic', async () => {
  const d = defaultSettings(immoCfg);
  assert.equal(d.schedule.mode, 'manual');
  assert.equal(d.delivery.telegram, false);
  assert.equal(d.delivery.drive, false);
  const s = sanitizeSettings({ schedule: { mode: 'hours', everyHours: 5, dailyAt: '25:99' }, delivery: { email: true, emailTo: 'bad address', telegram: false }, search: { minRooms: 99, communes: ['Chur', 'Atlantis'], maxAiPages: 7, sources: { search: false } } }, immoCfg);
  assert.equal(s.schedule.everyHours, 3); assert.equal(s.schedule.dailyAt, '06:00');
  assert.equal(s.delivery.email, false, 'email stays off without a valid address'); assert.equal(s.delivery.telegram, false);
  assert.deepEqual(s.search.communes, ['Chur']); assert.equal(s.search.minRooms, 3); assert.equal(s.search.maxAiPages, 40);
  const eff = applySettings(immoCfg, s);
  assert.deepEqual(eff.municipalities, ['Chur']); assert.equal(eff.discovery.enabled, false);
  assert.equal(sanitizeSettings({ search: { communes: [] } }, immoCfg).search.communes.length, immoCfg.municipalities.length);
  const now = new Date('2026-11-16T11:07:00Z');
  assert.equal(isDue({ mode: 'manual', everyHours: 3, dailyAt: '06:00' }, null, now), false);
  assert.equal(isDue({ mode: 'hours', everyHours: 3, dailyAt: '06:00' }, new Date('2026-11-16T08:07:00Z'), now), true);
  assert.equal(isDue({ mode: 'hours', everyHours: 3, dailyAt: '06:00' }, new Date('2026-11-16T09:30:00Z'), now), false);
  const daily = { mode: 'daily', everyHours: 3, dailyAt: '06:00' };
  assert.equal(isDue(daily, new Date('2026-11-15T05:10:00Z'), new Date('2026-11-16T04:30:00Z')), false, '05:30 Swiss time is before 06:00');
  assert.equal(isDue(daily, new Date('2026-11-15T05:10:00Z'), new Date('2026-11-16T05:07:00Z')), true, '06:07 Swiss time, last run yesterday');
  assert.equal(isDue(daily, new Date('2026-11-16T05:10:00Z'), new Date('2026-11-16T09:00:00Z')), false, 'already ran today after 06:00');
  const cap = []; const pages = { 'https://c.example/a': '<a href="/mietwohnung/1">1</a><a href="/mietwohnung/2">2</a><a href="/mietwohnung/3">3</a>', 'https://c.example/mietwohnung/1': immoPage('A Chur', '<p>A in Chur, 4 Zimmer Wohnung zu vermieten. Inseriert am: 20.11.2026. CHF 900 pro Monat. Kontakt Vermieter: +41 79 123 45 67. Helle Wohnung mit Balkon und Küche.</p>'), 'https://c.example/mietwohnung/2': immoPage('B Chur', '<p>B in Chur, 4 Zimmer Wohnung zu vermieten. Inseriert am: 20.11.2026. CHF 950 pro Monat. Kontakt Vermieter: +41 79 123 45 68. Helle Wohnung mit Balkon und Küche.</p>'), 'https://c.example/mietwohnung/3': immoPage('C Chur', '<p>C in Chur, 4 Zimmer Wohnung zu vermieten. Inseriert am: 20.11.2026. CHF 1\'000 pro Monat. Kontakt Vermieter: +41 79 123 45 69. Helle Wohnung mit Balkon und Küche.</p>') };
  const llm = async () => { cap.push(1); return null; };
  const cfg = { ...immoCfg, municipalities: ['Chur'], discovery: { ...immoCfg.discovery, enabled: false }, sources: [{ id: 'c', url: 'https://c.example/a', phase: 1 }], fetch: { ...immoCfg.fetch, perHostDelayMs: 0 } };
  const store = { findByUrl: async () => null, touch: async () => {}, upsert: async () => 'new', getSeen: async () => null, markSeen: async () => {} };
  const res = await runPipeline({ config: cfg, fetchPage: async (u) => (pages[u] ? { ok: true, status: 200, body: pages[u] } : { ok: false, status: 404, body: '' }), llm, store, maxLlmCalls: 2 }, { dryRun: false });
  assert.equal(cap.length, 0, 'the new extractor never calls the model');
  assert.equal(res.counts.llm_calls, 0);
  assert.equal(res.counts.kept, 0, 'pages without identity-matched direct fetches fail closed');
  assert.ok(res.filtered.trust_fetch_url_unverified >= 1);
});

test('P128.6 email content mode, found date/time, Drive folder id, Drive writes existing Sheet/Doc only, header menu', async () => {
  const s = sanitizeSettings({ delivery: { emailContent: 'all', driveFolderId: 'https://drive.google.com/drive/folders/199CkTuXRf52H0r-8-KTOsI-nFQFnZoxT?usp=sharing' } }, immoCfg);
  assert.equal(s.delivery.emailContent, 'all'); assert.equal(s.delivery.driveFolderId, '199CkTuXRf52H0r-8-KTOsI-nFQFnZoxT');
  assert.equal(sanitizeSettings({ delivery: { emailContent: 'x', driveFolderId: 'bad' } }, immoCfg).delivery.emailContent, 'new');
  assert.equal(parseDriveFolderId('nonsense'), ''); assert.equal(immoCfg.driveFolderId, '199CkTuXRf52H0r-8-KTOsI-nFQFnZoxT');
  assert.match(formatZurich('2026-11-16T02:07:36Z'), /16\.11\.2026.*03:07/);
  const rows = [{ property_name: 'Old', municipality: 'Chur', rooms_estimated: 3, first_seen_at: '2026-11-10T10:00:00Z', listing_url: 'https://a.example/1', status: 'CONTACTED', photo_urls: [], source_urls: [] },
    { property_name: 'New', municipality: 'Chur', rooms_estimated: 4, first_seen_at: '2026-11-16T02:07:36Z', listing_url: 'https://a.example/2', direct_phone: '+41811234567', contact_status: 'found', status: 'NEW', photo_urls: [], source_urls: [] }];
  const txt = formatListingsText(rows, { heading: 'H', limit: 10 });
  assert.ok(txt.indexOf('New') < txt.indexOf('Old'), 'newest first');
  assert.ok(!/Status: CONTACTED/.test(txt), 'status removed from email text');
  assert.match(txt, /📍 Chur · .* · 4 rooms · \+41811234567/);
  const tab = listingsTable(rows); assert.equal(tab.length, 3); assert.ok(tab.every((r) => r.length === 1), 'one column');
  assert.match(tab[2][0], /📍 Chur · .* · 4 rooms · \+41811234567/);
  assert.ok(!/found 16\.11\.2026/.test(tab[2][0]), 'search found time is not shown on cards');
  assert.match(tab[1][0], /Chur · .* · 3 rooms · no direct contact/, 'sheet keeps the order of the screen (rows as given), not a re-sort');
  assert.ok(!/Betreff|Guten Tag/.test(tab.flat().join('')), 'no letter drafts in the sheet');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'sa@p.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
  const calls = []; let haveDoc = true;
  const fake = async (url, init = {}) => {
    const u = String(url); calls.push(`${init.method || 'GET'} ${u.split('?')[0]}`);
    const ok = (b) => ({ ok: true, status: 200, json: async () => b, text: async () => '' });
    if (u.includes('oauth2')) return ok({ access_token: 't' });
    if (u.includes('/drive/v3/files/199C')) return ok({ id: '199C' });
    if (u.includes('/drive/v3/files?')) return ok({ files: u.includes('document') && !haveDoc ? [] : [{ id: 'F1' }] });
    if (u.includes('docs.googleapis.com') && !init.method) return ok({ body: { content: [{ endIndex: 40 }] } });
    return ok({});
  };
  const folder = '199CkTuXRf52H0r-8-KTOsI-nFQFnZoxT';
  const good = await exportDrive(rows, folder, fake);
  assert.equal(good.status, 'exported');
  assert.ok(calls.some((c) => c.startsWith('POST https://sheets.googleapis.com') && c.includes(':batchUpdate')), 'sheet is written with formatting');
  assert.ok(calls.some((c) => c.startsWith('POST https://docs.googleapis.com') && c.includes(':batchUpdate')), 'doc is written with formatting');
  assert.ok(!calls.some((c) => c === 'POST https://www.googleapis.com/upload/drive/v3/files'), 'never tries to create files');
  haveDoc = false;
  assert.match(await checkDrive(folder, fake), /missing in the folder.*ImmoFinder drafts/);
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const ui = read('src/ImmoFinder.tsx'); assert.match(ui, /data-testid="immofinder-header"/); assert.match(ui, /ModeMenu/); assert.match(ui, /immofinder-found-at/);
  assert.match(read('src/ImmoFinderSettings.tsx'), /immofinder-email-content/);
});

test('P129.7 screen, Sheet and Doc show the same cards (shared model), no letters, no German-letter reader on screen', () => {
  const rows = [
    { id: 'a', property_name: '3 1/2 ZI- Wohnung', description_de: 'Zu vermieten in Schiers. '.repeat(12), municipality: 'Schiers', rooms_estimated: '3.5', pricing_unit: 'month', rent_monthly_chf: 1450, listing_url: 'https://www.facebook.com/groups/1/posts/2/', photo_urls: [], private_signals: [], contact_status: 'found', direct_phone: '+41814140008', first_seen_at: '2026-11-17T20:37:00Z', status: 'NEW', raw: { price: { amount: 1450, unit: 'month' } }, draft_message_de: 'Betreff: Geheimer Brief' },
    { id: 'b', property_name: 'Casa Calanda', description_de: 'Geräumige Attikawohnung', municipality: 'Jenins', rooms_estimated: '5.0', pricing_unit: 'night', listing_url: 'https://heidiholiday.ch/', photo_urls: ['https://i.example/1.jpg', 'https://i.example/2.jpg', 'https://i.example/3.jpg', 'https://i.example/4.jpg'], private_signals: ['generic_link'], contact_status: 'found', owner_name: 'v. koenig', direct_phone: '+41794175102', first_seen_at: '2026-11-17T17:52:00Z', status: 'CONTACTED', raw: { price: { amount: 365, unit: 'night' } }, draft_message_de: 'Betreff: Geheimer Brief' }];
  const [a, b] = rows.map(immoCardModel);
  assert.equal(a.headline, '📍 Schiers · CHF 1450 per month · 3.5 rooms · +41814140008');
  assert.equal(b.headline, '📍 Jenins · CHF 365 per night · 5.0 rooms · v. koenig · +41794175102');
  assert.equal(a.openLabel, 'Open post'); assert.equal(b.openLabel, 'Open listing');
  assert.equal(a.about.length <= 360, true); assert.equal(b.photos.length, 3);
  assert.equal(immoLinkLine(b), 'https://heidiholiday.ch/ (list/group page — not a single object)');
  const sheet = buildSheetRequests(rows, 7); const cells = sheet.requests.find((q) => q.updateCells?.rows).updateCells.rows.flatMap((r) => r.values.map((v) => v.userEnteredValue?.stringValue).filter(Boolean));
  const docReq = buildDocRequests(rows, 40); const docText = docReq.find((q) => q.insertText).insertText.text;
  for (const k of [a, b]) {
    for (const part of [k.headline, k.about, immoLinkLine(k), k.openLabel]) assert.ok(cells.includes(part), `sheet has: ${part}`);
    for (const part of [k.headline, k.about, immoLinkLine(k), k.openLabel, ...k.photos.map((p) => p.label)]) assert.ok(docText.includes(part), `doc has: ${part}`);
  }
  assert.ok(docText.indexOf(a.headline) < docText.indexOf(b.headline) && cells.indexOf(a.headline) < cells.indexOf(b.headline), 'order of rows is kept');
  const links = JSON.stringify(sheet.requests) + JSON.stringify(docReq);
  assert.ok(links.includes('https://i.example/3.jpg') && !links.includes('https://i.example/4.jpg'), 'up to three photo links');
  assert.ok(!/Betreff|Geheimer Brief|Guten Tag/.test(links + docText), 'no letters in Sheet or Doc');
  assert.ok(buildSheetRequests([], 7).requests.length > 0 && buildDocRequests([], 2).some((q) => q.insertText));
  const ui = read('src/ImmoFinder.tsx');
  assert.match(ui, /immoCardModel/); assert.match(ui, /immofinder-delete/); assert.ok(!/Copy German letter/.test(ui)); assert.ok(!/Read the German letter/.test(ui));
  assert.match(read('server/immofinderDelivery.ts'), /immoCardModel/);
});

test('P129.23 Show menu = current | hidden | all (default current); publication date on screen, Sheet, Doc and email', () => {
  const ui = read('src/ImmoFinder.tsx');
  const sel = /data-testid="immofinder-status-filter"[\s\S]*?<\/select>/.exec(ui)[0];
  assert.deepEqual([...sel.matchAll(/<option value="(\w+)">(\w+)<\/option>/g)].map((m) => [m[1], m[2]]), [['current', 'current'], ['hidden', 'hidden'], ['all', 'all']]);
  assert.match(ui, /useState<'current' \| 'hidden' \| 'all'>\('current'\)/);
  assert.match(read('server/immofinderRoutes.ts'), /includeHidden: scope === 'all'/);
  const row = { id: 'p', property_name: 'Haus', municipality: 'Chur', rooms_estimated: 4, listing_url: 'https://a.example/9', photo_urls: [], private_signals: [], first_seen_at: '2026-11-17T20:37:00Z', status: 'NEW', raw: { listed_at: '2026-11-12T12:00:00.000Z' } };
  const platformCard = immoCardModel({
    ...row,
    owner_name: 'Frau N. Egger',
    contact_status: 'platform_only',
    raw: { price: { amount: 80, unit: 'night', quote: 'ab 80 CHF pro Nacht' } },
  });
  assert.match(platformCard.headline, /CHF 80 per night/);
  assert.match(platformCard.headline, /via platform enquiry · Frau N\. Egger/);
  const euroCard = immoCardModel({
    ...row,
    raw: { price: { amount: 90, unit: 'night', currency: 'EUR', quote: '€90 per night' } },
  });
  assert.match(euroCard.headline, /EUR 90 per night/);
  const k = immoCardModel(row);
  assert.equal(k.published, 'published 12.11.2026');
  assert.equal(immoLinkLine(k), 'https://a.example/9 · published 12.11.2026');
  assert.equal(immoCardModel({ ...row, raw: {} }).published, '');
  assert.equal(immoLinkLine(immoCardModel({ ...row, raw: {} })), 'https://a.example/9', 'no publication date = no date segment');
  assert.match(formatListingsText([row], { heading: 'H', limit: 5 }), /Published: 12\.11\.2026/);
  assert.ok(!/Found:/.test(formatListingsText([row], { heading: 'H', limit: 5 })), 'email export omits search found time');
  assert.ok(!/Published:/.test(formatListingsText([{ ...row, raw: {} }], { heading: 'H', limit: 5 })));
  assert.ok(buildSheetRequests([row], 7).requests.find((q) => q.updateCells?.rows).updateCells.rows.flatMap((r) => r.values.map((v) => v.userEnteredValue?.stringValue)).includes(immoLinkLine(k)));
  assert.ok(buildDocRequests([row], 40).find((q) => q.insertText).insertText.text.includes('published 12.11.2026'));
  assert.match(ui, /immofinder-published/);
  const html = '<html><head><meta property="article:published_time" content="2026-10-30T08:15:00+01:00"><title>x</title></head><body>Aktualisiert 05.11.2026</body></html>';
  assert.equal(pageMeta(html, 'https://a.example/').published, '2026-10-30T08:15:00+01:00');
  assert.equal(parseListedAt('Aktualisiert 05.11.2026', 'https://a.example/', '2026-10-30T08:15:00+01:00').toISOString().slice(0, 10), '2026-10-30', 'declared date wins over text dates');
  assert.equal(pageMeta('<script type="application/ld+json">{"datePosted":"2026-10-01"}</script>', 'https://a.example/').published, '2026-10-01');
  assert.equal(parseListedAt('Inserat vom 03.11.2026', 'https://a.example/', null).toISOString().slice(0, 10), '2026-11-03');
  assert.equal(parseListedAt('nothing here', 'https://a.example/', 'not a date'), null);
});

test('P128.7 non-listing pages are rejected; specific links detected; UI contrast, More menu and quiet polling', async () => {
  const bad = [['Alle Inserate in 7126 (Castrisch)', 'https://www.homegate.ch/mieten/wohnobjekt/plz-7126/trefferliste', 'list_or_search_page'], ['Ferienunterkünfte in Castrisch', 'https://www.airbnb.ch/x/stays', 'list_or_search_page'],
    ['Wohnungen mit Balkon mieten in Rothenbrunnen', 'https://www.immoscout24.ch/de/wohnung/mieten/ort-rothenbrunnen?an=400', 'list_or_search_page'], ['Suche dringend eine Wohnung in Landquart', 'https://www.facebook.com/groups/1/posts/2', 'wanted_ad'],
    ['Pension Versam: Zimmer & Fewo', 'https://www.pension-zimmer.ch/pension-versam.html', 'hotel_or_guesthouse'], ['3.5-Zimmer-Wohnung', 'https://homematch.ch/de/mieten/immobilien/plz-7403-rhaezuens/3-zimmer', 'list_or_search_page']];
  for (const [title, url, want] of bad) assert.equal(nonListingReason(title, url), want, title);
  assert.equal(nonListingReason('Ferienhaus Scoldasu in Lenzerheide', 'https://happyholiday.ch/haus/ferienhaus-scoldasu-graubuenden-in-lenzerheide/'), null);
  assert.equal(nonListingReason('3.5-Zimmer-Wohnung in Thusis', 'https://www.facebook.com/groups/179401345726919/posts/2547662738900756'), null);
  assert.equal(isSpecificLink('https://www.facebook.com/groups/179401345726919/'), false); assert.equal(isSpecificLink('https://www.facebook.com/groups/1794013457/posts/2547662738900756'), true);
  assert.equal(isSpecificLink('https://flatfox.ch/de/wohnung/7403-rhazuns/86136483/'), true); assert.equal(isSpecificLink('https://www.immoscout24.ch/de/immobilien'), false);
  const ui = read('src/ImmoFinder.tsx');
  assert.match(ui, /\.immo-btn\{background:#1457b8!important;color:#fff!important/); assert.match(ui, /data-testid="all-logs-menu-item"/); assert.match(ui, /downloadAllLogs/);
  assert.match(ui, /setInterval\(\(\) => \{ setTick\(Date\.now\(\)\); void loadRun\(\)/, 'polling only reads the small run status');
  assert.match(read('server/projectDiagnostics.ts'), /immofinder\\\/\(runs\\\/latest\|listings\)/);
});

test('P128.8 type split, extra rejects, municipality from URL, type-specific letters and contact advice, ferienhausmiete source', async () => {
  assert.equal(nonListingReason('3 bis 3.5 Zimmer | Immobilien zum Kauf', 'https://www.immoscout24.ch/de/immobilien/kaufen/ort-trimmis?nrf=3'), 'for_sale');
  assert.equal(nonListingReason('Moderne Attikawohnungen mit grosser Terrasse', 'https://www.home.ch/de/mieten/wohnung/in-maienfeld/zimmer-4.0-5.0'), 'list_or_search_page');
  assert.equal(nonListingReason('Moderne Attikawohnungen mit Terrasse', 'https://example.ch/projekt'), 'development_project');
  assert.equal(nonListingReason('wg zimmer in Tamins, ems, flims', 'https://www.facebook.com/groups/1/posts/2'), 'shared_room');
  assert.equal(nonListingReason('Ferienwohnungen Chesa Sur in Lenzerheide', 'https://happyholiday.ch/haus/chesa-sur-graubuenden-in-lenzerheide/'), null, 'holiday hosts with several flats stay');
  assert.equal(nonListingReason('3.5 Zimmer-Wohnung in Chur', 'https://flatfox.ch/de/wohnung/7000-chur/123456/'), null);
  assert.equal(matchMuni('https://www.immoscout24.ch/de/wohnung/mieten/ort-lueen', ['Lüen', 'Zizers']), 'Lüen');
  assert.equal(classifyType('Ferienhaus Carrera', 'https://www.surselva.info/ukv/house/x', ''), 'holiday_owner');
  assert.equal(classifyType('3.5-Zimmer-Wohnung in Thusis', 'https://www.facebook.com/groups/1/posts/2', 'Wohnung zu vermieten'), 'long_term_offer');
  assert.match(contactAdvice('https://www.facebook.com/groups/1/posts/2', 'long_term_offer'), /Messenger/);
  assert.match(contactAdvice('https://flatfox.ch/x', 'long_term_offer'), /contact form/);
  const direct = draftMsg({ propertyName: '3.5-Zimmer-Wohnung', municipality: 'Thusis', type: 'long_term_offer', rooms: 3.5 });
  assert.match(direct, /Inserat/); assert.ok(!/Ihre Ferienwohnung|Vorteile/.test(direct) && !/ß|CHF/.test(direct));
  assert.match(draftMsg({ municipality: 'Chur', type: 'holiday_owner' }), /Ihre Ferienwohnung/);
  const fhm = immoCfg.sources.find((s) => s.id === 'ferienhausmiete');
  assert.ok(new RegExp(fhm.detailPattern).test('https://www.ferienhausmiete.de/45141.htm') && !new RegExp(fhm.detailPattern).test('https://www.ferienhausmiete.de/blog/'));
  assert.ok(fhm.indexUrls.length >= 5);
  const ui = read('src/ImmoFinder.tsx'); assert.match(ui, /immofinder-actions/); assert.match(ui, /api\/immofinder\/(recheck|cleanup)/); assert.match(ui, /immofinder-recheck/);
  assert.match(read('migrations/024_immofinder_types.sql'), /listing_type/);
});

// ---- P128.18 ImmoFinder cron must pass the global session gate (secret is checked by the ImmoFinder middleware) ----
test('ImmoFinder cron POST with a valid secret and no session reaches the route; every other unauthenticated call stays 401', async () => {
  const { default: express } = await import('express');
  const { registerImmoFinderRoutes, isImmoCronCall } = await import('../server/immofinderRoutes.ts');
  const saved = { s: process.env.IMMOFINDER_RUN_SECRET, d: process.env.DATABASE_URL };
  const secret = 'cron-secret-0123456789';
  process.env.IMMOFINDER_RUN_SECRET = secret; delete process.env.DATABASE_URL;
  const app = express();
  app.use((req, res, next) => { // same shape as the global /api gate in server.ts
    if (!req.path.startsWith('/api/')) return next();
    if (isImmoCronCall(req)) return next();
    return res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' });
  });
  registerImmoFinderRoutes(app, { authenticated: () => false, appAuthEnabled: true, llm: null });
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const call = async (method, p, headers = {}) => { const r = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...headers }, body: method === 'POST' ? '{}' : undefined }); return { status: r.status, body: await r.json() }; };
    const ok = await call('POST', '/api/immofinder/run', { 'x-immofinder-secret': secret });
    assert.equal(ok.status, 503, 'valid secret must get past both auth layers (503 only because no DATABASE_URL in this test)');
    assert.equal(ok.body.code, 'DATABASE_UNAVAILABLE');
    assert.equal((await call('POST', '/api/immofinder/run', { 'x-immofinder-secret': secret + 'x' })).status, 401, 'wrong secret');
    assert.equal((await call('POST', '/api/immofinder/run')).status, 401, 'no secret and no session');
    assert.equal((await call('GET', '/api/immofinder/listings', { 'x-immofinder-secret': secret })).status, 401, 'secret must not open other ImmoFinder routes');
    const profile = await call('POST', '/api/immofinder/settings/prepare-chur-test', { 'x-immofinder-secret': secret });
    assert.equal(profile.status, 503, 'valid secret passes the gate; no DB is configured in this test');
    assert.equal(profile.body.code, 'DATABASE_UNAVAILABLE');
    assert.equal((await call('POST', '/api/immofinder/settings/prepare-chur-test', { 'x-immofinder-secret': secret + 'x' })).status, 401, 'wrong profile secret');
    assert.equal((await call('POST', '/api/immofinder/enrich-existing', { 'x-immofinder-secret': secret })).status, 401, 'secret must not open other ImmoFinder POST routes');
  } finally {
    await new Promise((r) => server.close(r));
    if (saved.s === undefined) delete process.env.IMMOFINDER_RUN_SECRET; else process.env.IMMOFINDER_RUN_SECRET = saved.s;
    if (saved.d !== undefined) process.env.DATABASE_URL = saved.d;
  }
});

test('server.ts lets the ImmoFinder cron call through the global /api auth gate before the session check', () => {
  const src = read('server.ts');
  const gate = src.indexOf('// Auth middleware for /api/*');
  const cron = src.indexOf('isImmoCronCall(req)', gate);
  const session = src.indexOf('if (!authenticated(req))', gate);
  const routes = src.indexOf('registerImmoFinderRoutes(app,');
  assert.ok(gate > 0 && cron > gate && session > cron, 'cron exemption must sit inside the global gate, before the session check');
  assert.ok(routes > session, 'ImmoFinder routes are registered after the global gate');
});


test('P129.23a ImmoFinder recheck exports, wiring, and diagnostic completeness are present', () => {
  const core = read('server/immofinderCore.ts');
  const refresh = read('server/immofinderRefresh.ts');
  const diag = read('server/immofinderDiag.ts');
  const routes = read('server/immofinderRoutes.ts');
  const ui = read('src/ImmoFinder.tsx');
  assert.match(core, /export function parseListedAtDetailed/);
  assert.match(core, /export function dateDiagSnippet/);
  assert.match(refresh, /parseListedAtDetailed/);
  assert.match(refresh, /recheck_refresh_item/);
  assert.match(refresh, /enrichSearches: status\.contactSearches/);
  assert.match(diag, /export function completenessSummary/);
  assert.match(routes, /recheck-list-status/);
  assert.match(routes, /recheck-list/);
  assert.match(routes, /search_quality_summary/);
  assert.match(routes, /log: \(level, event, details\) => immoLog/);
  assert.match(routes, /refreshSearchBudget/);
  assert.match(ui, /immofinder-recheck-list/);
  assert.match(ui, /Recheck feed/);
});


test('P129.23a refresh reads publication dates and contacts while preserving stored fields on fetch failure', async () => {
  const { runRefreshJob, newRefreshStatus } = await import('../server/immofinderRefresh.ts');
  const rows = [
    { id: 'date-contact', listing_url: 'https://owner.example.ch/listing/1', property_name: 'Flat A', municipality: 'Chur', direct_phone: null, direct_email: null, contact_evidence: [], contact_status: 'not_found', contact_advice: '', raw: {} },
    { id: 'preserve', listing_url: 'https://blocked.example.ch/listing/2', property_name: 'Flat B', municipality: 'Chur', direct_phone: '+41791234567', direct_email: null, contact_evidence: [], contact_status: 'found', contact_advice: '', raw: { listed_at: '2026-11-01T12:00:00.000Z' } },
  ];
  const saved = new Map(); const logs = [];
  const status = newRefreshStatus();
  assert.deepEqual(pageMeta('<meta name=\"datePublished\" content=\"2026-11-18\">', 'https://owner.example.ch/listing/1').photos, [], 'empty image metadata must not count as a photo');
  await runRefreshJob(rows, {
    fetchPage: async (url) => url.includes('owner.example') ? { ok: true, status: 200, body: '<meta name=\"datePublished\" content=\"2026-11-18\"><title>Flat A</title><p>Contact owner@flat.ch, phone +41 79 123 45 67</p>' } : { ok: false, status: 403, body: '' },
    platformDomains: ['owner.example.ch'], update: async (id, fields) => saved.set(id, fields),
    log: (level, event, details) => logs.push({ level, event, details }),
  }, status);
  assert.equal(saved.get('date-contact').raw.listed_at_source, 'declared');
  assert.ok(saved.get('date-contact').raw.listed_at);
  assert.equal(saved.get('date-contact').direct_email, 'owner@flat.ch');
  assert.ok(saved.get('date-contact').direct_phone);
  assert.equal(saved.get('preserve').direct_phone, rows[1].direct_phone);
  assert.equal(saved.get('preserve').raw.listed_at, rows[1].raw.listed_at);
  assert.equal(status.checked, 2); assert.equal(status.unreachable, 1);
  assert.ok(logs.some((x) => x.event === 'recheck_refresh_done'));
});



test('C131 L1 admits page-grounded residential rentals without price, date or direct contact', () => {
  const url = 'https://www.tutti.ch/de/vi/83553049';
  const pageText = [
    'Schöne, sonnige 4.5-Zimmerwohnung in Untervaz.',
    'Zu vermieten nach Vereinbarung. Ruhige Wohnung an zentraler Lage mit tollem Ausblick.',
    'Die Wohnung hat zwei Nasszellen, einen Balkon und einen Kellerraum.',
    'PLZ 7204, Untervaz. Zimmer 4.5. Typ Mieten. Inserent kontaktieren.',
  ].join(' ');
  const base = {
    requestedUrl: url, finalUrl: url, title: 'Schöne, sonnige 4.5-Zimmerwohnung',
    pageText, municipality: 'Untervaz', municipalities: ['Untervaz'], provisional: false, rooms: 4.5,
    priceMonthlyChf: null, priceUnit: null, priceQuote: null,
    listedAt: null, maxAgeDays: 180, phone: null, email: null,
    contactEvidenceUrls: [], nowMs: Date.parse('2026-11-25T12:00:00Z'),
  };
  const admitted = verifyListingAdmission(base);
  assert.equal(admitted.accepted, true);
  if (admitted.accepted) {
    assert.equal(admitted.rooms, 4.5);
    assert.equal(admitted.monthlyRentChf, null);
    assert.equal(admitted.listedAt, null);
    assert.equal(admitted.contact, 'platform_only');
  }
  assert.equal(verifyListingAdmission({ ...base, provisional: true }).accepted, false, 'snippets never reach L1');
  const small = verifyListingAdmission({ ...base, pageText: pageText.replaceAll('4.5', '2.5'), title: '2.5-Zimmerwohnung', rooms: 2.5 });
  assert.equal(small.accepted, false, 'below three rooms is not L1');
  const bedroomsOnly = verifyListingAdmission({ ...base, pageText: 'Apartment zu vermieten in Untervaz. 3 bedrooms. ' + 'Residential description. '.repeat(8) });
  assert.equal(bedroomsOnly.accepted, false, 'bedroom count is not a Zimmer count');
  assert.equal(verifyListingAdmission({ ...base, finalUrl: 'https://www.tutti.ch/de/vi/99999999' }).accepted, false, 'final URL must match');
  const commercial = verifyListingAdmission({ ...base, title: 'Büro zu vermieten', pageText: 'Büro zu vermieten in Chur. 4.5 Zimmer. ' + 'Gewerbefläche. '.repeat(12) });
  assert.equal(commercial.accepted, false, 'commercial space is not residential');
});

test('C131 short-stay L1 requires a detail page, but not price period or direct contact', () => {
  const seasonal = parsePrice('CHF 850 pro Saison');
  assert.ok(seasonal);
  assert.equal(seasonal.unit, 'season');
  assert.equal(isShortStayListing('Holiday apartment', 'https://stay.example/listing/123456', 'Seasonal rental', seasonal), true);
  assert.equal(qualityRejectReason({
    maxMonthlyRentChf: 2000, maxListingAgeDays: 180, requirePrice: true,
    rejectNonMonthly: false, rejectSeekerPosts: true, requireContact: false,
  }, seasonal, null, false, true), null, 'explicit seasonal price is not rejected as non-monthly');
  const valid = { shortStay: true, price: seasonal, url: 'https://stay.example/listing/123456', evidenceKind: 'page_text' };
  assert.equal(shortStayPreflightReason(valid), null);
  assert.equal(shortStayPreflightReason({ ...valid, price: parsePrice('CHF 850') }), null, 'price is optional for L1');
  assert.equal(shortStayPreflightReason({ ...valid, url: 'https://stay.example/search' }), 'short_stay_specific_link_required');
  assert.equal(shortStayPreflightReason({ ...valid, evidenceKind: 'snippet' }), 'short_stay_page_evidence_required');
  assert.equal(shortStayContactReason(true, null, null), null, 'platform message routes are sufficient for L1');
  assert.equal(shortStayContactReason(true, '+41791234567', null), null);
  assert.equal(shortStayContactReason(false, null, null), null);
});

test('P129.50 direct holiday listing hosts are discoverable while aggregators remain excluded', () => {
  const d = immoCfg.discovery;
  for (const host of ['airbnb.com', 'booking.com', 'interhome.ch', 'vrbo.com']) {
    assert.ok(!d.skipHosts.includes(host), `${host} is a direct listing platform, not a meta-search host`);
    assert.ok(!d.snippetOnlyHosts.includes(host), `${host} must be fetched for page/contact verification`);
  }
  for (const host of ['holidu.com', 'cozycozy.com', 'hometogo.com', 'trivago.ch']) {
    assert.ok(d.skipHosts.includes(host), `${host} remains a meta-search aggregator`);
  }
  assert.equal(isShortStayListing('Apartment', 'https://www.booking.com/hotel/ch/example.en-gb.html', 'monthly apartment', parsePrice('CHF 1 200 pro Monat')), true);
  assert.doesNotMatch(read('server/immofinderCore.ts'), /booking\.com\/hotel/);
  assert.match(d.queries.join(' '), /Ferienwohnung|Saison|pro Nacht|pro Woche/i);
});

test('P129.50 full database snapshot is authenticated ciphertext and is committed after manual and scheduled runs', async () => {
  const { encryptSnapshotPayload, decryptSnapshotPayload, publishGitHubListingsSnapshot, IMMOFINDER_SNAPSHOT_PATH } =
    await import('../server/immofinderSnapshot.ts');
  const secret = 'stable-test-session-secret-'.padEnd(48, 'x');
  const payload = { rows: [{ direct_phone: '+41791234567', direct_email: 'owner@private.example', street_address: 'Exampleweg 12', listing_url: 'https://stay.example/123456' }] };
  const envelope = encryptSnapshotPayload(payload, secret);
  assert.equal(envelope.algorithm, 'aes-256-gcm');
  assert.ok(!JSON.stringify(envelope).includes('+41791234567'));
  assert.ok(!JSON.stringify(envelope).includes('owner@private.example'));
  assert.ok(!JSON.stringify(envelope).includes('Exampleweg 12'));
  assert.deepEqual(decryptSnapshotPayload(envelope, secret), payload);
  assert.throws(() => decryptSnapshotPayload(envelope, 'a-different-session-secret-that-is-long-enough'), /authenticate|Unsupported state/i);

  const calls = [];
  const result = await publishGitHubListingsSnapshot(payload.rows, { runId: 'test-run' }, {
    env: {
      IMMOFINDER_GITHUB_TOKEN: 'test-token',
      IMMOFINDER_GITHUB_REPOSITORY: 'owner/repo',
      SESSION_SECRET: secret,
    },
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, init });
      if (!init.method) return { ok: false, status: 404, json: async () => ({}) };
      const request = JSON.parse(init.body);
      const committedEnvelope = JSON.parse(Buffer.from(request.content, 'base64').toString('utf8'));
      assert.ok(!JSON.stringify(committedEnvelope).includes('+41791234567'));
      assert.ok(!JSON.stringify(committedEnvelope).includes('Exampleweg 12'));
      assert.deepEqual(decryptSnapshotPayload(committedEnvelope, secret).rows, payload.rows);
      return { ok: true, status: 201, json: async () => ({ commit: { sha: 'abc123' } }) };
    },
  });
  assert.equal(result.status, 'committed');
  assert.equal(result.path, IMMOFINDER_SNAPSHOT_PATH);
  assert.equal(result.commitSha, 'abc123');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].init.method, 'PUT');

  const pipeline = read('server/immofinderPipeline.ts');
  const routes = read('server/immofinderRoutes.ts');
  assert.match(pipeline, /knownAutoHidden: Boolean\(known\?\.autoHidden\)/);
  assert.match(pipeline, /pages\[i\]\.knownAutoHidden/);
  assert.equal((routes.match(/publishGitHubSnapshotAfterRun\(runId!\)/g) || []).length, 1, 'manual and scheduled runs share one durable worker completion path');
  assert.equal((routes.match(/startRun\(trigger, dryRun, \{ settings, wave, cycle: await realRunCount\(\) \}\)/g) || []).length, 2);
});


test('P129.50 verified street address is carried into the shared user-facing card model', () => {
  const card = immoCardModel({
    municipality: 'Sampletown',
    street_address: 'Exampleweg 12',
    property_name: 'Apartment',
    description_de: 'Bright apartment',
    listing_url: 'https://stay.example/listing/123456',
    status: 'NEW',
  });
  assert.match(card.about, /Exampleweg 12/);
  assert.match(card.about, /Bright apartment/);
});


test('C131 repair gate admits page-verified seasonal listings without price period or direct contact', async () => {
  const { hardRejectReason } = await import('../server/immofinderRepair.ts');
  const url = 'https://stay.example/listing/123456';
  const evidence = 'Ferienwohnung in Sampletown, 3.5 Zimmer. CHF 850 pro Saison. Kontakt: +41 79 123 45 67. Die Wohnung hat einen Balkon, eine moderne Küche, ein separates Bad, einen hellen Wohnbereich und liegt in ruhiger Lage nahe dem öffentlichen Verkehr.';
  const seasonal = {
    id: '123e4567-e89b-12d3-a456-426614174010',
    listing_url: url,
    municipality: 'Sampletown',
    property_name: 'Ferienwohnung in Sampletown',
    rooms_estimated: 3.5,
    rooms_basis: 'zimmer',
    rent_monthly_chf: null,
    pricing_unit: 'season',
    direct_phone: '+41791234567',
    direct_email: null,
    contact_evidence: [{ type: 'phone', value: '+41791234567', url }],
    hidden: false,
    raw: { evidence_kind: 'page_text', evidence_url: url, evidence_text: evidence, price: { amount: 850, unit: 'season', quote: 'CHF 850 pro Saison' } },
  };
  const ctx = { municipalities: ['Sampletown'] };
  assert.equal(hardRejectReason(seasonal, ctx), null);
  assert.equal(hardRejectReason({ ...seasonal, direct_phone: null, contact_evidence: [] }, ctx), null);
  assert.equal(hardRejectReason({ ...seasonal, raw: { ...seasonal.raw, evidence_text: evidence.replace('pro Saison', ''), price: { amount: 850, unit: 'unknown' } } }, ctx), null);
});



test('P129.50 physical address is persisted as a verified field and included in snapshots', () => {
  const store = read('server/immofinderStore.ts');
  const migration = read('migrations/026_immofinder_short_stay.sql');
  const repair = read('server/immofinderRepair.ts');
  const pipeline = read('server/immofinderPipeline.ts');
  assert.match(store, /street_address = COALESCE/);
  assert.match(store, /hide_reason, street_address/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS street_address/);
  assert.match(pipeline, /address_quote/);
  assert.match(repair, /street_address: row\.street_address/);
});


test('P130.3 ImmoFinder GitHub publishing uses a repository-scoped contents:write App token and exposes safe 403 diagnostics', async () => {
  const { generateKeyPairSync } = await import('node:crypto');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const { publishGitHubRunDiagnostics, publishGitHubListingsSnapshot } = await import('../server/immofinderSnapshot.ts');
  const env = {
    GITHUB_APP_ID: '5276629',
    GITHUB_APP_INSTALLATION_ID: '170347326',
    GITHUB_APP_PRIVATE_KEY: privateKey,
    GITHUB_REPOSITORY_OWNER: 'owner',
    GITHUB_REPOSITORY_NAME: 'repo',
    IMMOFINDER_GITHUB_REPOSITORY: 'owner/repo',
    IMMOFINDER_GITHUB_BRANCH: 'main',
    SESSION_SECRET: 'stable-test-session-secret'.padEnd(48, 'x'),
  };
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/app/installations/')) {
      const body = JSON.parse(init.body);
      if (body.permissions.contents === 'read') return { ok: true, status: 201, json: async () => ({ token: 'bootstrap-token' }) };
      assert.deepEqual(body.repository_ids, [123]);
      assert.deepEqual(body.permissions, { contents: 'write' });
      return { ok: true, status: 201, json: async () => ({ token: 'repo-scoped-token', permissions: { metadata: 'read', contents: 'write' } }) };
    }
    if (String(url) === 'https://api.github.com/repos/owner/repo') {
      assert.equal(init.headers.Authorization, 'Bearer bootstrap-token');
      return { ok: true, status: 200, json: async () => ({ id: 123, full_name: 'owner/repo' }) };
    }
    if (String(url).includes('/contents/')) {
      assert.equal(init.headers.Authorization, 'Bearer repo-scoped-token');
      if (!init.method) return { ok: false, status: 404, json: async () => ({ message: 'Not Found' }), headers: { get: () => null } };
      return { ok: true, status: 201, json: async () => ({ commit: { sha: 'published-sha' } }) };
    }
    throw new Error('unexpected_github_request:' + url);
  };
  const diagnostics = await publishGitHubRunDiagnostics({ runId: 'run-403-test', events: [] }, { runId: 'run-403-test' }, { env, fetchImpl });
  assert.equal(diagnostics.status, 'committed');
  assert.equal(diagnostics.paths.length, 2);
  const snapshot = await publishGitHubListingsSnapshot([{ id: 'private-row' }], { runId: 'run-403-test' }, { env, fetchImpl });
  assert.equal(snapshot.status, 'committed');
  assert.ok(calls.filter((c) => c.init.method === 'PUT').length >= 3);

  const failing = await publishGitHubRunDiagnostics({ events: [] }, { runId: 'forbidden' }, {
    env: { IMMOFINDER_GITHUB_TOKEN: 'legacy-read-only-token', IMMOFINDER_GITHUB_REPOSITORY: 'owner/repo' },
    fetchImpl: async (_url, init = {}) => init.method
      ? { ok: false, status: 403, json: async () => ({ message: 'Resource not accessible by integration' }), headers: { get: () => 'REQ-403' } }
      : { ok: false, status: 404, json: async () => ({}) },
  }).catch((error) => error);
  assert.match(failing.message, /github_diagnostics_write_failed_http_403_resource_not_accessible_by_integration_request_REQ-403/);
  assert.doesNotMatch(failing.message, /legacy-read-only-token/);

  const snapshot403 = await publishGitHubListingsSnapshot([], { runId: 'snapshot-forbidden' }, {
    env: {
      IMMOFINDER_GITHUB_TOKEN: 'legacy-read-only-token',
      IMMOFINDER_GITHUB_REPOSITORY: 'owner/repo',
      SESSION_SECRET: 'stable-test-session-secret'.padEnd(48, 'x'),
    },
    fetchImpl: async (_url, init = {}) => init.method
      ? { ok: false, status: 403, json: async () => ({ message: 'Resource not accessible by integration' }), headers: { get: () => 'REQ-SNAPSHOT-403' } }
      : { ok: false, status: 404, json: async () => ({}) },
  }).catch((error) => error);
  assert.match(snapshot403.message, /github_snapshot_write_failed_http_403_resource_not_accessible_by_integration_request_REQ-SNAPSHOT-403/);
  assert.doesNotMatch(snapshot403.message, /legacy-read-only-token/);

  const app422 = await publishGitHubRunDiagnostics({ events: [] }, { runId: 'app-permission-denied' }, {
    env,
    fetchImpl: async (url, init = {}) => {
      if (String(url).includes('/app/installations/')) {
        const body = JSON.parse(init.body);
        if (body.permissions.contents === 'read') return { ok: true, status: 201, json: async () => ({ token: 'bootstrap-token' }) };
        return {
          ok: false, status: 422,
          json: async () => ({ message: 'Resource not accessible by integration' }),
          headers: { get: (name) => name.toLowerCase() === 'x-github-request-id' ? 'REQ-APP-422' : null },
        };
      }
      if (String(url) === 'https://api.github.com/repos/owner/repo') {
        return { ok: true, status: 200, json: async () => ({ id: 123, full_name: 'owner/repo' }) };
      }
      throw new Error('unexpected_github_request:' + url);
    },
  }).catch((error) => error);
  assert.match(app422.message, /github_app_contents_write_token_http_422_resource_not_accessible_by_integration_request_REQ-APP-422/);
  assert.doesNotMatch(app422.message, /bootstrap-token|repo-scoped-token|privateKey/);
});


test('P130.18a PostgreSQL query checkpoints resume completed work and retry only failed queries', async () => {
  const { buildTrustSearchPlan } = await import('../server/immofinderTrustEngine.ts');
  const cfg = {
    ...immoCfg,
    municipalities: ['Chur'],
    sources: [],
    discovery: {
      ...immoCfg.discovery,
      enabled: true,
      communesPerRun: 1,
      queries: ['template one', 'template two'],
      portalQueries: [],
      fallbackPortalQueries: [],
      resultsPerQuery: 10,
      maxPagesPerRun: 10,
      serperMinIntervalMs: 1,
    },
  };
  const plan = buildTrustSearchPlan({
    municipalities: ['Chur'], communeLimit: 1, privateTemplateCount: 2, portalQueryTemplates: [],
  }, 0, { allCommunes: false, families: ['private'] });
  const makeStore = () => ({
    findByUrl: async () => null, touch: async () => {}, upsert: async () => 'new',
    getSeen: async () => null, markSeen: async () => {},
  });
  const firstCalls = [];
  const checkpoints = [];
  const first = await runPipeline({
    config: cfg, fetchPage: async () => ({ ok: false, status: 404, body: '' }), llm: null, store: makeStore(),
    search: async (query) => {
      firstCalls.push(query);
      if (query === plan[0]) throw new Error('temporary search outage');
      return [];
    },
    cycle: 0,
    onCheckpoint: async (checkpoint) => { checkpoints.push(checkpoint); },
  }, { dryRun: true, wave: 'carousel' });
  assert.deepEqual([...firstCalls].sort(), [...plan].sort(), 'both planned queries are attempted; ordering is planner-owned');
  assert.equal(first.counts.search_queries, 2);
  const saved = checkpoints.at(-1);
  assert.deepEqual(saved.completedQueryKeys, [plan[1]], 'failed query is not checkpointed as complete');

  const resumedCalls = [];
  const resumed = await runPipeline({
    config: cfg, fetchPage: async () => ({ ok: false, status: 404, body: '' }), llm: null, store: makeStore(),
    search: async (query) => { resumedCalls.push(query); return []; },
    cycle: 0,
    resume: saved,
    onCheckpoint: async (checkpoint) => { checkpoints.push(checkpoint); },
  }, { dryRun: true, wave: 'carousel' });
  assert.deepEqual(resumedCalls, [plan[0]], 'completed query is skipped, failed query is retried');
  assert.equal(resumed.counts.search_queries, 3, 'attempt counters survive worker replacement');
  assert.deepEqual([...checkpoints.at(-1).completedQueryKeys].sort(), [...plan].sort());
});

test('P130.18a durable ImmoFinder worker leases, checkpoints, delivery acknowledgements and shutdown are wired', () => {
  const routes = read('server/immofinderRoutes.ts');
  const store = read('server/immofinderStore.ts');
  const server = read('server.ts');
  const pipeline = read('server/immofinderPipeline.ts');
  assert.match(routes, /claimNextRun\(workerId\)/);
  assert.match(routes, /renewRunLease\(String\(job\.id\), workerId\)/);
  assert.match(routes, /onCheckpoint: async \(checkpoint\)/);
  assert.match(routes, /completedQueryKeys: Array\.isArray\(progress\.completedQueryKeys\)/);
  assert.match(routes, /discoveryProcessedItems: Number\(progress\.discoveryProcessedItems\)/);
  assert.match(routes, /deliveryCompleted/);
  assert.match(routes, /waveAListingIds/);
  assert.match(routes, /releaseRunForRetry\(String\(job\.id\), workerId/);
  assert.match(routes, /leaseLost = true/);
  assert.match(store, /FOR UPDATE SKIP LOCKED/);
  assert.match(store, /attempts < 12/);
  assert.match(store, /return Number\(r\.rowCount \|\| 0\) > 0/);
  assert.match(pipeline, /completedQueryKeys\.has\(q\)/);
  assert.match(pipeline, /discoveryProcessedItems = processedItems/);
  assert.match(pipeline, /deps\.onCheckpoint/);
  assert.match(server, /await stopImmoFinderWorker\(\)/);
  assert.match(server, /process\.exit\(0\), 25_000/);
});
