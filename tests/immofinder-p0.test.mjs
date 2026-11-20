import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, sanitizeSettings, applySettings } from '../server/immofinderSettings.ts';
import { runPipeline } from '../server/immofinderPipeline.ts';
import { dedupeSnippetText } from '../server/immofinderCore.ts';
import { buildSecondaryQueries } from '../server/immofinderContactEnrichment.ts';
import { createSerperSearch } from '../server/immofinderDiscovery.ts';
import { placeFromTitleOrSnippet } from '../server/immofinderCore.ts';
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('../config/immofinder.json', import.meta.url), 'utf8'));

test('P129.43 defaults to a small commune slice and only evidence-backed productive discovery sources', () => {
  const settings = defaultSettings(cfg);
  assert.equal(settings.search.carouselCommunesPerRun, 8);
  assert.deepEqual(
    Object.entries(settings.search.sources).filter(([, enabled]) => enabled).map(([id]) => id).sort(),
    ['portal-flatfox', 'portal-homegate', 'portal-tutti', 'search'].sort(),
  );
  assert.equal(sanitizeSettings({}, cfg).search.carouselCommunesPerRun, 8);
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

test('discovery query set replaces generic Facebook group search with fresh-intent wording', () => {
  assert.ok(!cfg.discovery.queries.some((q) => q.startsWith('site:facebook.com/groups')));
  assert.ok(cfg.discovery.queries.some((q) => /ab sofort|per 1\. Dezember/.test(q)));
});

test('pipeline batches discovery processing and avoids poisoning seen with insufficient evidence', () => {
  const source = readFileSync(new URL('../server/immofinderPipeline.ts', import.meta.url), 'utf8');
  assert.match(source, /qi % 5 === 0/);
  assert.match(source, /qdr:\$\{cfg\.discovery\?\.freshness === 'd' \? 'd' : 'w'\}/);
  assert.match(source, /hasUsableFreshLink/);
  assert.match(source, /placeFromTitleOrSnippet\(hit\.title, `\$\{hit\.snippet\} \${hit\.link}`, cfg\.municipalities\)/);
  assert.match(source, /geo\.matched !== null && !geo\.outside/);
  assert.match(source, /reason !== 'rooms_unknown'/);
  assert.match(source, /reason !== 'municipality_not_whitelisted'/);
  assert.match(source, /reason === 'price_unknown' && pages\[i\]\.snippet/);
  assert.match(source, /6 \* 60 \* 60 \* 1000/);
  assert.match(source, /src\.id !== 'search' && st\.consecutiveBad >= stopAt/);
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

test('P129.44 lean defaults are what Reset restores and sanitize clamps the new fields', () => {
  const d = defaultSettings(cfg);
  assert.equal(d.schedule.everyHours, 6);
  assert.deepEqual([d.search.carouselCommunesPerRun, d.search.privateQueryTemplates, d.search.freshness, d.search.freshnessFallback, d.search.enrichSearchesPerRun, d.search.recheckContactSearch, d.search.maxAiPages], [8, 2, 'w', false, 6, false, 40]);
  const s = sanitizeSettings({ search: { privateQueryTemplates: 99, freshness: 'x', enrichSearchesPerRun: -4, freshnessFallback: 'yes', carouselCommunesPerRun: 50 } }, cfg);
  assert.deepEqual([s.search.privateQueryTemplates, s.search.freshness, s.search.enrichSearchesPerRun, s.search.freshnessFallback, s.search.carouselCommunesPerRun], [2, 'w', 6, false, 8]);
  assert.equal(sanitizeSettings({ search: { privateQueryTemplates: 4, freshness: 'd', enrichSearchesPerRun: 0, freshnessFallback: true } }, cfg).search.privateQueryTemplates, 4);
});

test('P129.44 applySettings maps templates, freshness and enrichment budget into the run config', () => {
  const eff = applySettings(cfg, sanitizeSettings({ search: { privateQueryTemplates: 1, freshness: 'd', freshnessFallback: true, enrichSearchesPerRun: 3 } }, cfg));
  assert.equal(eff.discovery.queries.length, 1);
  assert.equal(eff.discovery.freshness, 'd');
  assert.equal(eff.discovery.freshnessFallback, true);
  assert.equal(eff.contactEnrichment.maxExtraSearchesPerRun, 3);
  const lean = applySettings(cfg, defaultSettings(cfg));
  assert.equal(lean.discovery.queries.length, 2);
  assert.equal(lean.contactEnrichment.maxExtraSearchesPerRun, 6);
});

test('P129.44 snippet text keeps each distinct segment once', () => {
  const title = 'Heimeliges Haus 4 1/2 Zimmer in Maladers';
  const out = dedupeSnippetText(title, `${title} CHF 1'690.– mietzins brutto ... ${title} CHF 1'690.– mietzins brutto ... Haustiere erlaubt`);
  assert.equal((out.match(/mietzins brutto/g) || []).length, 1);
  assert.ok(!out.includes(title));
  assert.match(out, /Haustiere erlaubt/);
});

test('P129.44 every Serper call is counted and the unfiltered fallback only runs when enabled', async () => {
  const calls = [];
  const search = async (q, o) => { calls.push(o?.tbs ?? null); return staleHit; };
  const off = await runPipeline({ config: leanCfg(), fetchPage: noPage, llm: null, store: memStore(), search, cycle: 0 }, { dryRun: true, wave: 'carousel' });
  assert.equal(off.counts.serper_calls, 1); assert.equal(off.counts.serper_fallback, 0); assert.deepEqual(calls, ['qdr:w']);
  calls.length = 0;
  const on = await runPipeline({ config: leanCfg({ freshnessFallback: true, freshness: 'd' }), fetchPage: noPage, llm: null, store: memStore(), search, cycle: 0 }, { dryRun: true, wave: 'carousel' });
  assert.equal(on.counts.serper_calls, 2); assert.equal(on.counts.serper_fallback, 1); assert.deepEqual(calls, ['qdr:d', null]);
});

test('P129.44 only a provider 400 retries without freshness; timeouts and rate limits do not double the cost', async () => {
  let n = 0;
  const rateLimited = async () => { n++; throw new Error('Serper HTTP 429: rate'); };
  const a = await runPipeline({ config: leanCfg(), fetchPage: noPage, llm: null, store: memStore(), search: rateLimited, cycle: 0 }, { dryRun: true, wave: 'carousel' });
  assert.equal(n, 1); assert.equal(a.counts.serper_calls, 1);
  n = 0;
  const rejects = async (_q, o) => { n++; if (o?.tbs) throw new Error('Serper HTTP 400: bad tbs'); return staleHit; };
  const b = await runPipeline({ config: leanCfg(), fetchPage: noPage, llm: null, store: memStore(), search: rejects, cycle: 0 }, { dryRun: true, wave: 'carousel' });
  assert.equal(n, 2); assert.equal(b.counts.serper_fallback, 1); assert.equal(b.counts.serper_calls, 2);
});

test('P129.44 a snippet without a parseable room count makes no model call and is not persisted', async () => {
  const hits = [
    { title: 'Wohnung zu vermieten in Chur', link: 'https://www.facebook.com/groups/1/posts/11/', snippet: 'Schöne Wohnung in Chur, CHF 1\'400 pro Monat, Tel 079 123 45 67' },
    { title: '3.5 Zimmer Wohnung in Chur', link: 'https://www.facebook.com/groups/1/posts/12/', snippet: 'Zu vermieten in Chur, CHF 1\'400 pro Monat, Tel 079 123 45 67' },
  ];
  let llmCalls = 0; const marked = [];
  const store = { ...memStore(), markSeen: async (u) => { marked.push(u); } };
  const llm = async () => { llmCalls++; return null; };
  const res = await runPipeline({ config: leanCfg(), fetchPage: noPage, llm, store, search: async () => hits, cycle: 0 }, { dryRun: false, wave: 'carousel' });
  assert.equal(res.counts.llm_skipped_no_rooms, 1);
  assert.equal(llmCalls, 1, 'only the snippet that names rooms reaches the model');
  assert.ok(!marked.some((u) => u.endsWith('/11/')));
});

test('P129.44 enrichment uses holiday-home wording only for house-style names', () => {
  const plain = buildSecondaryQueries({ listingUrl: 'u', propertyName: '4.5 Zimmer Wohnung in Chur', municipality: 'Chur', ownerName: null, photoUrls: [], existingPhones: [], existingEmails: [], platformDomains: [] });
  assert.ok(!plain.some((q) => /Chalet OR Chesa/.test(q)));
  const house = buildSecondaryQueries({ listingUrl: 'u', propertyName: 'Chesa Alba Chur Haus', municipality: 'Chur', ownerName: null, photoUrls: [], existingPhones: [], existingEmails: [], platformDomains: [] });
  assert.ok(house.some((q) => /Chalet OR Chesa/.test(q)));
});
