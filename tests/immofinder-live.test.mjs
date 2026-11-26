import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline } from '../server/immofinder/live.ts';
import { happyholidayAdapter } from '../server/immofinder/sources/happyholiday.ts';
import { createSwissClassifiedAdapter } from '../server/immofinder/sources/swiss-classified.ts';

const indexUrl = 'https://happyholiday.ch/area/graubuenden/';
const detailUrl = 'https://happyholiday.ch/haus/wohnung-chur-123';
const offTargetUrl = 'https://happyholiday.ch/haus/ferienwohnung-graubuenden-in-scuol/';
const indexHtml = '<html><body>' + '<nav>Wohnungen mieten in Graubünden. Angebote und Details. </nav>'.repeat(6) + '<a href="' + offTargetUrl + '">Ferienwohnung Scuol</a><a href="' + detailUrl + '">Wohnung Chur</a></body></html>';
const detailHtml = '<html><head><title>3.5 Zimmer Wohnung in Chur</title></head><body><h1>3.5 Zimmer Wohnung in Chur</h1><p>Diese schöne Wohnung liegt in Chur. 3.5 Zimmer, helle Räume und Balkon. Das Angebot ist von privat. Für Fragen nutzen Sie bitte das Kontaktformular oder senden Sie eine Nachricht.</p></body></html>';
const offTargetHtml = '<html><head><title>3.5 Zimmer Ferienwohnung in Scuol</title></head><body><h1>3.5 Zimmer Ferienwohnung in Scuol</h1><p>Ferienwohnung in Scuol mit 3.5 Zimmern, schöner Aussicht und Küche. Vermietung direkt vom privaten Eigentümer.</p></body></html>';

function depsFor() {
  const writes = [];
  const marks = [];
  const fetched = [];
  const store = {
    async findByUrl() { return null; },
    async touch() {},
    async upsert(record) { writes.push(record); return 'new'; },
    async getSeen() { return null; },
    async markSeen(...args) { marks.push(args); },
  };
  const deps = {
    config: {
      municipalities: ['Chur', 'Lenzerheide'],
      minRooms: 3,
      stopAgencies: ['Interhome', 'Holidu'],
      sources: [{ id: 'happyholiday', url: indexUrl, indexUrls: [indexUrl], detailPattern: '^https://happyholiday\\.ch/haus/[^/]+/?$' }],
      limits: { maxDetailPagesPerSource: 6, recheckAfterDays: 7, fetchTimeoutMs: 10000, maxPageBytes: 100000 },
      fetch: { userAgent: 'test', perHostDelayMs: 0, respectRobotsTxt: true },
    },
    async fetchPage(url) {
      fetched.push(url);
      if (url === indexUrl) return { ok: true, status: 200, body: indexHtml, finalUrl: url };
      if (url === detailUrl) return { ok: true, status: 200, body: detailHtml, finalUrl: url };
      if (url === offTargetUrl) return { ok: true, status: 200, body: offTargetHtml, finalUrl: url };
      return { ok: false, status: 404, body: '', finalUrl: url };
    },
    llm: async () => { throw new Error('Unexpected Gemini call'); },
    search: async () => { throw new Error('Unexpected Serper call'); },
    store,
  };
  return { deps, writes, marks, fetched };
}

test('source-first pipeline admits a fetched private listing with traceable evidence', async () => {
  const { deps, writes, fetched } = depsFor();
  assert.ok(happyholidayAdapter.discover(indexHtml, indexUrl).some((item) => item.url === detailUrl), 'fixture index must expose the canonical detail URL');
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.counts.fetched, 1, JSON.stringify({ counts: result.counts, filtered: result.filtered, errors: result.errors, sourceStats: result.sourceStats, fetched }));
  assert.equal(result.counts.kept, 1);
  assert.equal(result.counts.new, 1);
  assert.equal(writes.length, 1);
  assert.equal(result.filtered.source_locality_mismatch, 1);
  assert.equal(writes[0].listing_type, 'holiday_owner');
  assert.equal(writes[0].municipality, 'Chur');
  assert.match(writes[0].raw.evidence_text, /3.5 Zimmer/);
  assert.equal(writes[0].raw.evidence_kind, 'page_text');
  assert.equal(writes[0].raw.evidence_url, detailUrl);
  assert.equal(result.estCostUsd, 0);
  assert.deepEqual(fetched, [indexUrl, detailUrl]);
  assert.equal(fetched.includes(offTargetUrl), false);
});

test('Anibis direct rental details are stored as long-term offers', async () => {
  const { deps, writes } = depsFor();
  const index = 'https://www.anibis.ch/de/q/immobilien-graubuenden-wohnungen-mieten/test';
  const detail = 'https://www.anibis.ch/de/vi/graubuenden/immobilien/wohnungen/helle-wohnung/1074103783';
  deps.config.municipalities = ['Chur'];
  deps.config.sources = [{ id: 'portal-anibis', url: index, maxDetailPages: 12, detailPattern: '^https://www\\.anibis\\.ch/de/vi/.*' }];
  deps.config.discovery = {
    enabled: true, communesPerRun: 1, resultsPerQuery: 10,
    portalQueries: ['site:anibis.ch "{commune}" ("3.5 Zimmer" OR "4 Zimmer") Wohnung mieten'],
    portalSources: [{ id: 'portal-anibis', host: 'anibis.ch' }], portalHosts: ['anibis.ch'],
    skipHosts: [], snippetOnlyHosts: [], serperMinIntervalMs: 0,
  };
  deps.search = async () => [{ title: '3.5 Zimmer Wohnung in Chur mieten', link: detail, snippet: '3.5 Zimmer, Chur, Wohnung zu vermieten' }];
  deps.fetchPage = async (url) => {
    if (url === detail) return { ok: true, status: 200, body: '<h1>Helle 3.5-Zimmer-Wohnung in Chur</h1><p>7000, Chur. 3.5-Zimmer-Wohnung zur Miete. Privatperson. Kontaktformular. Helle Wohnung mit Balkon und Küche.</p>', finalUrl: url };
    return { ok: false, status: 404, body: '', finalUrl: url };
  };
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.counts.kept, 1, JSON.stringify({ counts: result.counts, filtered: result.filtered, errors: result.errors, sourceStats: result.sourceStats }));
  assert.equal((result.counts.kept_l1 || 0) + (result.counts.kept_l2 || 0), result.counts.kept, 'every kept listing must have an accepted quality level');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].listing_type, 'long_term_offer');
  assert.equal(writes[0].municipality, 'Chur');
});

test('pipeline rejects detail pages without an actionable contact route', async () => {
  const { deps, writes } = depsFor();
  deps.fetchPage = async (url) => url === indexUrl
    ? { ok: true, status: 200, finalUrl: url, body: indexHtml }
    : { ok: true, status: 200, finalUrl: url, body: detailHtml.replace(/Kontaktformular|Nachricht senden/gi, '') };
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.counts.kept, 0);
  assert.equal(writes.length, 0);
  assert.ok(result.filtered.no_contact_route >= 1);
  assert.equal(result.preview[0].kept, false, 'no-contact candidates must not remain marked as kept in preview');
  assert.equal(result.preview[0].reason, 'no_contact_route');
});

test('Flatfox parser retains half rooms, monthly price and platform contact', async () => {
  const { deps, writes } = depsFor();
  const index = 'https://flatfox.ch/de/search/?offer_type=RENT&north=47.8';
  const detail = 'https://flatfox.ch/de/wohnung/via-sogn-martin-1-7166-trun/86331649';
  deps.config.municipalities = ['Trun'];
  deps.config.sources = [{ id: 'portal-flatfox', url: index, maxDetailPages: 12, detailPattern: '^https://(?:www\\.)?flatfox\\.ch/(?:de/wohnung|en/flat)/.+/\\d+/?$' }];
  const flatfoxIndexHtml = '<main>' + 'Mietangebote in Graubünden. '.repeat(18) + '<a href="' + detail + '">3 ½ Zimmer-Wohnung in Trun</a></main>';
  assert.ok(createSwissClassifiedAdapter('portal-flatfox', 'flatfox.ch').discover(flatfoxIndexHtml, index).some((item) => item.url === detail), 'Flatfox index must expose its canonical detail URL');
  deps.fetchPage = async (url) => {
    if (url === index) return { ok: true, status: 200, body: flatfoxIndexHtml, finalUrl: url };
    if (url === detail) return {
      ok: true, status: 200, finalUrl: url,
      body: '<h1>3 ½ Zimmer-Wohnung in Trun mieten</h1><p>Via Sogn Martin 1, 7166 Trun. CHF 1’520 inkl. NK pro Monat.</p><h2>Beschreibung</h2><p>Moderne Wohnung mit Terrasse, Küche, Waschmaschine, Keller und Parkplatz.</p><h3>Inserent</h3><p>Herr Max Muster</p><p>Kontaktformular erstellen</p>',
    };
    return { ok: false, status: 404, body: '', finalUrl: url };
  };
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.counts.kept, 1, JSON.stringify({ counts: result.counts, filtered: result.filtered, errors: result.errors, sourceStats: result.sourceStats }));
  assert.equal(writes.length, 1);
  assert.equal(writes[0].listing_type, 'long_term_offer');
  assert.equal(writes[0].municipality, 'Trun');
  assert.equal(writes[0].rooms_estimated, 3.5);
  assert.equal(writes[0].rent_monthly_chf, 1520);
  assert.equal(writes[0].pricing_unit, 'month');
  assert.equal(writes[0].owner_name, 'Herr Max Muster');
  assert.equal(writes[0].contact_status, 'platform_only');
  assert.equal(writes[0].raw.price.amount, 1520);
});

test('dry run never writes or marks seen', async () => {
  const { deps, writes, marks, fetched } = depsFor();
  const result = await runPipeline(deps, { dryRun: true, testMode: true });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.counts.kept, 1, JSON.stringify({ counts: result.counts, filtered: result.filtered, errors: result.errors, sourceStats: result.sourceStats, fetched }));
  assert.equal(result.filtered.source_locality_mismatch, 1);
  assert.equal(writes.length, 0);
  assert.equal(marks.length, 0);
});

test('bounded Serper discovery seeds direct Anibis detail pages and counts search cost', async () => {
  const { deps, writes, fetched } = depsFor();
  const index = 'https://www.anibis.ch/de/q/immobilien-graubuenden-wohnungen-mieten/test';
  const detail = 'https://www.anibis.ch/de/vi/graubuenden/immobilien/wohnungen/helle-wohnung/1074103783';
  deps.config.municipalities = ['Chur'];
  deps.config.sources = [{ id: 'portal-anibis', url: index, maxDetailPages: 12, detailPattern: '^https://www\\.anibis\\.ch/de/vi/.*' }];
  deps.config.discovery = {
    enabled: true,
    communesPerRun: 1,
    resultsPerQuery: 10,
    portalQueries: ['site:anibis.ch "{commune}" ("3.5 Zimmer" OR "4 Zimmer") Wohnung mieten'],
    portalSources: [{ id: 'portal-anibis', host: 'anibis.ch' }],
    portalHosts: ['anibis.ch'],
    skipHosts: [],
    snippetOnlyHosts: [],
    serperMinIntervalMs: 0,
  };
  deps.search = async () => [{ title: '3.5 Zimmer Wohnung in Chur mieten', link: detail, snippet: '3.5 Zimmer, Chur, Wohnung zu vermieten' }];
  deps.fetchPage = async (url) => {
    fetched.push(url);
    if (url === index) return { ok: false, status: 403, body: '', finalUrl: url };
    if (url === detail) return {
      ok: true, status: 200, finalUrl: url,
      body: '<h1>3.5-Zimmer-Wohnung in Chur</h1><p>7000 Chur. 3.5 Zimmer. Privatperson. Kontaktformular. Helle Wohnung mit Balkon und Küche.</p>',
    };
    return { ok: false, status: 404, body: '', finalUrl: url };
  };
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.counts.fetched, 1);
  assert.equal(result.counts.kept, 1);
  assert.equal(writes.length, 1);
  assert.ok(fetched.includes(detail));
  assert.equal(result.estCostUsd, 0.001);
  assert.equal(result.counts.serper_calls, 1);
  assert.equal(result.counts.serper_available, 1);
});

test('rotating Serper discovery can fetch a Homegate detail page without crawling its blocked index', async () => {
  const { deps, writes, fetched } = depsFor();
  const index = 'https://www.homegate.ch/mieten/wohnung/kanton-graubuenden/trefferliste';
  const detail = 'https://www.homegate.ch/mieten/4001234567';
  deps.config.municipalities = ['Chur'];
  deps.config.sources = [{ id: 'portal-homegate', url: index, phase: 1, maxDetailPages: 12, detailPattern: '^https://www\\.homegate\\.ch/mieten/\\d+$' }];
  deps.config.discovery = {
    enabled: true,
    resultsPerQuery: 10,
    portalQueries: ['site:homegate.ch "{commune}" ("3.5 Zimmer" OR "4 Zimmer") Wohnung mieten'],
    portalSources: [{ id: 'portal-homegate', host: 'homegate.ch' }],
    portalHosts: ['homegate.ch'],
    skipHosts: [],
    snippetOnlyHosts: [],
    serperMinIntervalMs: 0,
  };
  deps.search = async () => [{ title: '3.5-Zimmer-Wohnung in Chur mieten', link: detail, snippet: '3.5 Zimmer, Chur' }];
  deps.fetchPage = async (url) => {
    fetched.push(url);
    if (url === detail) return {
      ok: true, status: 200, finalUrl: url,
      body: '<h1>3.5-Zimmer-Wohnung in Chur mieten</h1><p>7000 Chur. 3.5 Zimmer. Privatperson vermietet direkt. CHF 1’850 pro Monat. Kontaktformular. Balkon, Küche und Keller.</p>',
    };
    return { ok: false, status: 403, body: '', finalUrl: url };
  };
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.counts.fetched, 1);
  assert.equal(result.counts.kept, 1);
  assert.equal(writes.length, 1);
  assert.deepEqual(fetched, [detail], 'portal list pages are not fetched for SERP-only sources');
  assert.equal(writes[0].municipality, 'Chur');
  assert.equal(writes[0].rooms_estimated, 3.5);
  assert.equal(result.estCostUsd, 0.001);
});

test('Gemini promotes a borderline lead only when its private-owner quote is verbatim', async () => {
  const { deps, writes } = depsFor();
  const privateQuote = 'Ich vermiete meine Wohnung selbst.';
  const html = detailHtml.replace('Das Angebot ist von privat.', privateQuote);
  deps.fetchPage = async (url) => url === indexUrl
    ? { ok: true, status: 200, body: indexHtml, finalUrl: url }
    : { ok: true, status: 200, body: html, finalUrl: url };
  deps.maxLlmCalls = 1;
  deps.llm = async () => ({ private_owner_quote: privateQuote });
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.counts.kept, 1);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].raw.level, 'L2');
  assert.ok(writes[0].raw.owner_markers.includes(privateQuote));
  assert.equal(result.estCostUsd, 0.002);
  assert.equal(result.counts.gemini_calls, 1);
  assert.equal(result.counts.kept_l2, 1);
});

test('polite fetcher can disable Jina and browser fallbacks', async () => {
  const { createPoliteFetch } = await import('../server/immofinderFetcher.ts');
  const calls = [];
  const cfg = {
    fetch: { userAgent: 'test-agent', perHostDelayMs: 0, respectRobotsTxt: true, browserRenderHosts: ['example.com'], browserRenderMinTextChars: 1200, maxBrowserRendersPerRun: 2 },
    limits: { fetchTimeoutMs: 1000, maxPageBytes: 4096 },
  };
  const fetchImpl = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/robots.txt')) return new Response('User-agent: *\\nDisallow:', { status: 200 });
    return new Response('blocked', { status: 403 });
  };
  const directOnly = createPoliteFetch(cfg, fetchImpl, async () => true, { allowJina: false, allowBrowser: false });
  const result = await directOnly('https://example.com/private-listing');
  assert.equal(result.status, 403);
  assert.deepEqual(calls, ['https://example.com/robots.txt', 'https://example.com/private-listing']);
});

test('production route wires bounded Serper and Gemini budgets and enforces 3 rooms', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const route = readFileSync(path.join(root, 'server/immofinderRoutes.ts'), 'utf8');
  assert.ok(route.includes("import { runPipeline } from './immofinder/live.ts'"));
  const runCall = route.slice(route.indexOf('result = await runPipeline({'), route.indexOf('pipelineCompleted = true;'));
  assert.ok(runCall.includes('llm: deps.llm'));
  assert.ok(runCall.includes('maxLlmCalls: 3'));
  assert.ok(runCall.includes('search: process.env.SERPER_API_KEY ? createSerperSearch'));
  assert.ok(runCall.includes('allowJina: false, allowBrowser: true'));
  assert.ok(route.includes('baseCfg.minRooms = Math.max(3'));
  assert.ok(route.includes("['portal-anibis', 'portal-tutti']"));
  assert.ok(route.includes('pollMs: 15_000'));
});
