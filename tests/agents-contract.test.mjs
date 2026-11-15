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
import { matchMunicipality, parseRooms, registrationForbidden, verifyQuote, extractContacts, draftMessage, candidateLinks, canonicalKey } from '../server/immofinderCore.ts';
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
  const store = { findByUrl: async () => null, touch: async () => {}, upsert: async (r) => { saved.push(r); return 'new'; } };
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
  for (const id of ['immofinder-root', 'immofinder-run', 'immofinder-status-filter', 'immofinder-card', 'immofinder-last-run']) assert.match(ui, new RegExp(id));
  assert.match(read('server.ts'), /registerImmoFinderRoutes\(app/);
  assert.match(read('.github/workflows/immofinder-cron.yml'), /api\/immofinder\/run/);
});
