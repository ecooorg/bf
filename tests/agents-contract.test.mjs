/**
 * Category: agents — ModeMenu, routes, isolation of Simple / Expert / Project.
 * Add new agent UI/route contracts here (do not create per-patch files).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
import { formatListingsText, listingsTable, exportDrive, checkDrive } from '../server/immofinderDelivery.ts';
import { generateKeyPairSync } from 'node:crypto';
import { classifyType, contactAdvice, draftMessage as draftMsg, matchMunicipality as matchMuni, nonListingReason, isSpecificLink } from '../server/immofinderCore.ts';
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
  assert.ok(candidateLinks('<a href="/ferienwohnung/12345">x</a><a href="https://other.com/a">y</a><a href="/impressum">z</a>', 'https://www.example.ch/list', 10).length === 1);
});

test('P128.1 pipeline keeps matching private listings, filters the rest, never stores unverified model facts', async () => {
  const cfg = { ...immoCfg, sources: [{ id: 't', url: 'https://t.example/area', phase: 1 }], fetch: { ...immoCfg.fetch, perHostDelayMs: 0 } };
  const pages = {
    'https://t.example/area': immoPage('Index', '<a href="/ferienwohnung/1">a</a><a href="/ferienwohnung/2">b</a><a href="/ferienwohnung/3">c</a>'),
    'https://t.example/ferienwohnung/1': immoPage('Chesa Alba', '<p>Chesa Alba in Churwalden, 4.5 Zimmer Wohnung. Kontakt: Hans Muster, hans@example.org, 081 111 22 33.</p>'),
    'https://t.example/ferienwohnung/2': immoPage('Interhome Haus', '<p>Interhome Ferienhaus in Chur, 5 Zimmer.</p>'),
    'https://t.example/ferienwohnung/3': immoPage('Studio Davos', '<p>Studio in Davos, 1.5 Zimmer.</p>'),
  };
  const saved = [];
  const seenDb = new Map();
  const store = { findByUrl: async () => null, touch: async () => {}, upsert: async (r) => { saved.push(r); return 'new'; }, getSeen: async (u) => seenDb.get(u) || null, markSeen: async (u) => { seenDb.set(u, { checked_at: new Date().toISOString() }); } };
  const llm = async (_s, prompt) => prompt.includes('Chesa Alba')
    ? { single_property: true, property_name: 'Chesa Alba', municipality_quote: 'Chesa Alba in Churwalden', rooms_quote: '4.5 Zimmer', owner_name: 'Fritz Erfunden', owner_name_quote: 'Fritz Erfunden', is_agency_or_manager: false, agency_quote: null, registration_forbidden_quote: null, summary_de: 'Wohnung in Churwalden', title_ru: 'Chesa Alba', summary_ru: 'Квартира в Churwalden' }
    : { single_property: true, property_name: null, municipality_quote: null, rooms_quote: null, owner_name: null, owner_name_quote: null, is_agency_or_manager: false, agency_quote: null, registration_forbidden_quote: null, summary_de: '', title_ru: '', summary_ru: '' };
  const res = await runPipeline({ config: cfg, fetchPage: async (u) => (pages[u] ? { ok: true, status: 200, body: pages[u] } : { ok: false, status: 404, body: '' }), llm, store }, { dryRun: false });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].municipality, 'Churwalden');
  assert.equal(saved[0].owner_name, null, 'owner name not found in the page text must be dropped');
  assert.equal(saved[0].direct_email, 'hans@example.org');
  assert.equal(saved[0].contact_status, 'found');
  assert.ok(saved[0].draft_message_de.length > 200);
  assert.equal(res.filtered.agency, 1);
  assert.ok(res.filtered.municipality_not_whitelisted >= 1 || res.filtered.rooms_below_min >= 1);
  const dry = await runPipeline({ config: cfg, fetchPage: async (u) => ({ ok: true, status: 200, body: pages[u] || '' }), llm, store }, { dryRun: true });
  assert.equal(dry.counts.llm_calls, 0);
  assert.equal(saved.length, 1, 'dry run persists nothing');
});

test('P128.1 empty source is reported, not silent; UI, route and cron wiring exist', async () => {
  const cfg = { ...immoCfg, sources: [{ id: 'x', url: 'https://x.example/', phase: 1 }] };
  const res = await runPipeline({ config: cfg, fetchPage: async () => ({ ok: true, status: 200, body: '<html></html>' }), llm: null, store: {} }, { dryRun: true });
  assert.equal(res.errors[0].code, 'source_no_candidates');
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
    'https://h.example/haus/chesa-x-graubuenden-in-chur/': immoPage('Chesa X in Chur – von privat', '<p>Chesa X in Chur, 4 Zimmer. Wohnzimmer. Andere Häuser Laax 9 Zimmer</p>'),
  };
  let fetched = 0; const saved = []; const seen = new Map();
  const store = { findByUrl: async () => null, touch: async () => {}, upsert: async (r) => { saved.push(r); return 'new'; }, getSeen: async (u) => seen.get(u) || null, markSeen: async (u) => { seen.set(u, { checked_at: new Date().toISOString() }); } };
  const fetchPage = async (u) => { fetched++; return pages[u] ? { ok: true, status: 200, body: pages[u] } : { ok: false, status: 404, body: '' }; };
  const res = await runPipeline({ config: cfg, fetchPage, llm: null, store }, { dryRun: true });
  assert.equal(res.counts.index_pages, 2);
  assert.equal(res.counts.candidates, 1);
  assert.equal(res.counts.kept, 1);
  assert.ok(res.preview[0].detail.includes('platform_says_private'));
  assert.equal(res.preview[0].title.includes('Chesa X'), true);
});

test('P128.3 discovery: commune rotation, host policy, snippet-only portals, owner pages fetched, dedupe, no key = reported', async () => {
  assert.deepEqual(communesForRun(['a', 'b', 'c', 'd'], 3, 0), ['a', 'b', 'c']);
  assert.deepEqual(communesForRun(['a', 'b', 'c', 'd'], 3, 1), ['d', 'a', 'b']);
  const cfg = { ...immoCfg, municipalities: ['Chur', 'Zizers'], sources: [], fetch: { ...immoCfg.fetch, perHostDelayMs: 0 }, discovery: { ...immoCfg.discovery, communesPerRun: 1, queries: ['Ferienwohnung {commune} privat'], maxPagesPerRun: 10 } };
  assert.deepEqual(buildQueries(cfg, 1), ['Ferienwohnung Zizers privat']);
  const hits = [
    { title: 'Interhome Chur', link: 'https://www.interhome.ch/x', snippet: 'Interhome' },
    { title: 'Wikipedia', link: 'https://de.wikipedia.org/wiki/Chur', snippet: '' },
    { title: 'Ferienwohnung Chur 4 Zimmer von privat', link: 'https://www.facebook.com/marketplace/item/1', snippet: 'Schöne 4 Zimmer Wohnung in Chur, Tel 079 123 45 67' },
    { title: 'Chesa Mia', link: 'https://chesa-mia.example/', snippet: '' },
    { title: 'dup', link: 'https://chesa-mia.example/', snippet: '' },
  ];
  const items = pickItems(hits, cfg);
  assert.deepEqual(items.map((i) => [i.host, i.snippetOnly]), [['facebook.com', true], ['chesa-mia.example', false]]);
  const pages = { 'https://chesa-mia.example/': immoPage('Chesa Mia Chur', '<p>Chesa Mia in Chur, 5 Zimmer Ferienwohnung. Tel 081 222 33 44, mia@chesa-mia.example</p>') };
  const saved = [];
  const store = { findByUrl: async () => null, touch: async () => {}, upsert: async (r) => { saved.push(r); return 'new'; }, getSeen: async () => null, markSeen: async () => {} };
  const fetchPage = async (u) => (pages[u] ? { ok: true, status: 200, body: pages[u] } : { ok: false, status: 403, body: '' });
  const search = async () => hits;
  const res = await runPipeline({ config: cfg, fetchPage, llm: null, store, search, cycle: 0 }, { dryRun: false });
  assert.equal(res.counts.search_queries, 2 - 1);
  assert.equal(res.counts.snippet_only, 1);
  assert.equal(res.counts.kept, 2);
  const fb = saved.find((r) => r.listing_url.includes('facebook'));
  assert.ok(fb.private_signals.includes('snippet_only') && fb.direct_phone && fb.photo_urls.length === 0);
  assert.equal(saved.find((r) => r.listing_url.includes('chesa-mia')).direct_email, 'mia@chesa-mia.example');
  const nokey = await runPipeline({ config: cfg, fetchPage, llm: null, store, search: null }, { dryRun: true });
  assert.equal(nokey.errors[0].code, 'discovery_skipped');
});

test('P128.4 pipeline reports live progress with stage, text and counters', async () => {
  const cfg = { ...immoCfg, municipalities: ['Chur'], discovery: { ...immoCfg.discovery, communesPerRun: 1, queries: ['q {commune}'] }, sources: [{ id: 'h', url: 'https://h.example/area/', phase: 1 }], fetch: { ...immoCfg.fetch, perHostDelayMs: 0 } };
  const pages = { 'https://h.example/area/': '<a href="/ferienwohnung/1">a</a>', 'https://h.example/ferienwohnung/1': immoPage('Chesa A', '<p>Chesa A in Chur, 4 Zimmer</p>') };
  const ev = [];
  const store = { findByUrl: async () => null, touch: async () => {}, upsert: async () => 'new', getSeen: async () => null, markSeen: async () => {} };
  await runPipeline({ config: cfg, fetchPage: async (u) => (pages[u] ? { ok: true, status: 200, body: pages[u] } : { ok: false, status: 404, body: '' }), llm: null, store, search: async () => [], onProgress: (e) => { ev.push(e); if (ev.length === 2) throw new Error('progress must not break runs'); } }, { dryRun: true });
  assert.ok(ev.some((e) => e.stage === 'catalogue' && /reading 1\/1/.test(e.text)));
  assert.ok(ev.some((e) => e.stage === 'search' && /Searching: q Chur/.test(e.text)));
  assert.ok(ev.some((e) => /match: Chesa A/.test(e.text)) && ev.at(-1).counts.kept === 1);
});

test('P128.5 settings: invalid input falls back, scope applies to config, schedule due logic (Swiss time)', async () => {
  const d = defaultSettings(immoCfg);
  assert.equal(d.schedule.mode, 'manual');
  const s = sanitizeSettings({ schedule: { mode: 'hours', everyHours: 5, dailyAt: '25:99' }, delivery: { email: true, emailTo: 'bad address', telegram: false }, search: { minRooms: 99, communes: ['Chur', 'Atlantis'], maxAiPages: 7, sources: { search: false } } }, immoCfg);
  assert.equal(s.schedule.everyHours, 3); assert.equal(s.schedule.dailyAt, '06:00');
  assert.equal(s.delivery.email, false, 'email stays off without a valid address'); assert.equal(s.delivery.telegram, false);
  assert.deepEqual(s.search.communes, ['Chur']); assert.equal(s.search.minRooms, 3); assert.equal(s.search.maxAiPages, 60);
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
  const cap = []; const pages = { 'https://c.example/a': '<a href="/ferienwohnung/1">1</a><a href="/ferienwohnung/2">2</a><a href="/ferienwohnung/3">3</a>', 'https://c.example/ferienwohnung/1': immoPage('A Chur', '<p>A in Chur 4 Zimmer</p>'), 'https://c.example/ferienwohnung/2': immoPage('B Chur', '<p>B in Chur 4 Zimmer</p>'), 'https://c.example/ferienwohnung/3': immoPage('C Chur', '<p>C in Chur 4 Zimmer</p>') };
  const llm = async () => { cap.push(1); return { single_property: true, property_name: null, municipality_quote: null, rooms_quote: null, owner_name: null, owner_name_quote: null, is_agency_or_manager: false, agency_quote: null, registration_forbidden_quote: null, summary_de: '', title_ru: '', summary_ru: '' }; };
  const cfg = { ...immoCfg, municipalities: ['Chur'], discovery: { ...immoCfg.discovery, enabled: false }, sources: [{ id: 'c', url: 'https://c.example/a', phase: 1 }], fetch: { ...immoCfg.fetch, perHostDelayMs: 0 } };
  const store = { findByUrl: async () => null, touch: async () => {}, upsert: async () => 'new', getSeen: async () => null, markSeen: async () => {} };
  const res = await runPipeline({ config: cfg, fetchPage: async (u) => (pages[u] ? { ok: true, status: 200, body: pages[u] } : { ok: false, status: 404, body: '' }), llm, store, maxLlmCalls: 2 }, { dryRun: false });
  assert.equal(cap.length, 2); assert.ok(res.errors.some((e) => e.code === 'ai_budget_reached')); assert.equal(res.counts.kept, 1, 'only the page past the cap is read by rules (the two AI pages had no verifiable rooms)');
});

test('P128.6 email content mode, found date/time, Drive folder id, Drive writes existing Sheet/Doc only, header menu', async () => {
  const s = sanitizeSettings({ delivery: { emailContent: 'all', driveFolderId: 'https://drive.google.com/drive/folders/199CkTuXRf52H0r-8-KTOsI-nFQFnZoxT?usp=sharing' } }, immoCfg);
  assert.equal(s.delivery.emailContent, 'all'); assert.equal(s.delivery.driveFolderId, '199CkTuXRf52H0r-8-KTOsI-nFQFnZoxT');
  assert.equal(sanitizeSettings({ delivery: { emailContent: 'x', driveFolderId: 'bad' } }, immoCfg).delivery.emailContent, 'new');
  assert.equal(parseDriveFolderId('nonsense'), ''); assert.equal(immoCfg.driveFolderId, '199CkTuXRf52H0r-8-KTOsI-nFQFnZoxT');
  assert.match(formatZurich('2026-11-16T02:07:36Z'), /16\.11\.2026.*03:07/);
  const rows = [{ property_name: 'Old', municipality: 'Chur', rooms_estimated: 3, first_seen_at: '2026-11-10T10:00:00Z', listing_url: 'https://a.example/1', status: 'CONTACTED', photo_urls: [], source_urls: [] },
    { property_name: 'New', municipality: 'Chur', rooms_estimated: 4, first_seen_at: '2026-11-16T02:07:36Z', listing_url: 'https://a.example/2', direct_phone: '+41811234567', status: 'NEW', photo_urls: [], source_urls: [] }];
  const txt = formatListingsText(rows, { heading: 'H', limit: 10 });
  assert.ok(txt.indexOf('New') < txt.indexOf('Old'), 'newest first'); assert.match(txt, /Found: 16\.11\.2026.*03:07/); assert.match(txt, /Status: CONTACTED/);
  const tab = listingsTable(rows); assert.equal(tab.length, 3); assert.ok(tab.every((r) => r.length === 1), 'one column'); assert.match(tab[1][0], /^New\n.*Chur.*4 rooms.*NEW\nFound: 16\.11\.2026.*03:07/s); assert.ok(!/Betreff|Guten Tag/.test(tab.flat().join('')), 'no letter drafts in the sheet');
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
  assert.ok(calls.some((c) => c.startsWith('PUT https://sheets.googleapis.com')) && calls.some((c) => c.includes(':batchUpdate')));
  assert.ok(!calls.some((c) => c === 'POST https://www.googleapis.com/upload/drive/v3/files'), 'never tries to create files');
  haveDoc = false;
  assert.match(await checkDrive(folder, fake), /missing in the folder.*ImmoFinder drafts/);
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const ui = read('src/ImmoFinder.tsx'); assert.match(ui, /data-testid="immofinder-header"/); assert.match(ui, /ModeMenu/); assert.match(ui, /immofinder-found-at/);
  assert.match(read('src/ImmoFinderSettings.tsx'), /immofinder-email-content/);
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
  const ui = read('src/ImmoFinder.tsx'); assert.match(ui, /immofinder-tabs/); assert.match(ui, /api\/immofinder\/cleanup/);
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
