import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline } from '../server/immofinder/live.ts';

const indexUrl = 'https://happyholiday.ch/area/graubuenden/';
const detailUrl = 'https://happyholiday.ch/haus/wohnung-chur-123/';
const offTargetUrl = 'https://happyholiday.ch/haus/ferienwohnung-graubuenden-in-scuol/';
const indexHtml = '<html><body><a href="https://happyholiday.ch/haus/ferienwohnung-in-scuol/">Ferienwohnung Scuol</a><a href="https://happyholiday.ch/haus/wohnung-in-chur/">Wohnung Chur</a></body></html>';
const detailHtml = '<html><head><title>3.5 Zimmer Wohnung in Chur</title></head><body><h1>3.5 Zimmer Wohnung in Chur</h1><p>Diese schöne Wohnung liegt in Chur. 3.5 Zimmer, helle Räume und Balkon. Das Angebot ist von privat. Für Fragen nutzen Sie bitte das Kontaktformular oder senden Sie eine Nachricht.</p></body></html>';
const offTargetHtml = '<html><head><title>3.5 Zimmer Ferienwohnung in Scuol</title></head><body><h1>3.5 Zimmer Ferienwohnung in Scuol</h1><p>Ferienwohnung in Scuol mit 3.5 Zimmern, schöner Aussicht und Küche. Vermietung direkt vom privaten Eigentümer.</p></body></html>';

function depsFor({ dryStore = false } = {}) {
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
      sources: [{ id: 'happyholiday', url: indexUrl, indexUrls: [indexUrl], detailPattern: '^https://happyholiday\.ch/haus/[^/]+-graubuenden-in-[^/]+/?
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
    llm: async () => { throw new Error('LLM must not be called'); },
    search: async () => { throw new Error('Paid search must not be called'); },
    store,
  };
  return { deps, writes, marks, fetched };
}

test('source-first live pipeline admits a fetched private listing and persists traceable evidence', async () => {
  const { deps, writes, fetched } = depsFor();
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.counts.fetched, 1);
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

test('Anibis direct rental details are stored as long-term offers, not holiday-owner leads', async () => {
  const { deps, writes } = depsFor();
  const index = 'https://www.anibis.ch/de/q/immobilien-graubuenden-wohnungen-mieten/test';
  const detail = 'https://www.anibis.ch/de/vi/graubuenden/immobilien/wohnungen/helle-wohnung/1074103783';
  deps.config.sources = [{
    id: 'portal-anibis',
    url: index,
    maxDetailPages: 12,
    detailPattern: '^https://www\\.anibis\\.ch/de/vi/.*',
  }];
  deps.fetchPage = async (url) => {
    if (url === index) return {
      ok: true, status: 200, body: '<a href="' + detail + '">3.5-Zimmer-Wohnung Chur</a>', finalUrl: url,
    };
    if (url === detail) return {
      ok: true, status: 200,
      body: '<h1>Helle 3.5-Zimmer-Wohnung in Chur</h1><p>7000, Chur. 3.5-Zimmer-Wohnung zur Miete. Privatperson. Kontaktformular.</p>',
      finalUrl: url,
    };
    return { ok: false, status: 404, body: '', finalUrl: url };
  };
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.counts.kept, 1);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].listing_type, 'long_term_offer');
  assert.equal(writes[0].municipality, 'Chur');
});

test('Flatfox direct source stores monthly price, half rooms, host and platform contact', async () => {
  const { deps, writes } = depsFor();
  const index = 'https://flatfox.ch/de/search/?offer_type=RENT&north=47.8';
  const detail = 'https://flatfox.ch/de/wohnung/via-sogn-martin-1-7166-trun/86331649/';
  deps.config.municipalities = ['Trun'];
  deps.config.minRooms = 2;
  deps.config.sources = [{
    id: 'portal-flatfox',
    url: index,
    maxDetailPages: 12,
    detailPattern: '^https://(?:www\\.)?flatfox\\.ch/(?:de/wohnung|en/flat)/.+/\\d+/?$',
  }];
  deps.fetchPage = async (url) => {
    if (url === index) return { ok: true, status: 200, body: '<a href="' + detail + '">3 ½ Zimmer-Wohnung in Trun</a>', finalUrl: url };
    if (url === detail) return {
      ok: true, status: 200,
      body: '<h1>3 ½ Zimmer-Wohnung in Trun mieten</h1>' +
        '<p>Via Sogn Martin 1, 7166 Trun. CHF 1’520 inkl. NK pro Monat.</p>' +
        '<h2>Beschreibung</h2><p>Moderne Wohnung mit Terrasse, Küche, Waschmaschine, Keller und Parkplatz.</p>' +
        '<h3>Inserent</h3><p>Herr Max Muster</p><p>Kontaktanfrage erstellen</p>',
      finalUrl: url,
    };
    return { ok: false, status: 404, body: '', finalUrl: url };
  };
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.counts.kept, 1);
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

test('source-first dry run never writes and off-target pages are never admitted', async () => {
  const { deps, writes, marks } = depsFor();
  const result = await runPipeline(deps, { dryRun: true, testMode: true });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.counts.kept, 1);
  assert.equal(result.filtered.source_locality_mismatch, 1);
  assert.equal(writes.length, 0);
  assert.equal(marks.length, 0, 'dry run must not mutate the seen cache');
});

test('production source fetch mode never invokes Jina or browser fallbacks', async () => {
  const { createPoliteFetch } = await import('../server/immofinderFetcher.ts');
  const calls = [];
  const cfg = {
    fetch: { userAgent: 'test-agent', perHostDelayMs: 0, respectRobotsTxt: true, browserRenderHosts: ['example.com'], browserRenderMinTextChars: 1200, maxBrowserRendersPerRun: 2 },
    limits: { fetchTimeoutMs: 1000, maxPageBytes: 4096 },
  };
  const fetchImpl = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nDisallow:', { status: 200 });
    return new Response('blocked', { status: 403 });
  };
  const directOnly = createPoliteFetch(cfg, fetchImpl, async () => true, { allowJina: false, allowBrowser: false });
  const result = await directOnly('https://example.com/private-listing');
  assert.equal(result.status, 403);
  assert.deepEqual(calls, ['https://example.com/robots.txt', 'https://example.com/private-listing']);
});

test('production ImmoFinder route uses only the source-first, provider-free runtime', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const route = readFileSync(path.join(root, 'server/immofinderRoutes.ts'), 'utf8');
  assert.match(route, /import \{ runPipeline \} from '\.\/immofinder\/live\.ts'/);
  const runCall = route.slice(route.indexOf('result = await runPipeline({'), route.indexOf('pipelineCompleted = true;'));
  assert.match(runCall, /llm: null/);
  assert.match(runCall, /search: null/);
  assert.match(runCall, /allowJina: false, allowBrowser: false/);
  assert.doesNotMatch(runCall, /deps\.llm|createSerperSearch/);
  assert.match(route, /pollMs: 15_000/);
});
,
  }];
  deps.fetchPage = async (url) => {
    if (url === index) return { ok: true, status: 200, body: '<a href="' + detail + '">3 ½ Zimmer-Wohnung in Trun</a>', finalUrl: url };
    if (url === detail) return {
      ok: true, status: 200,
      body: '<h1>3 ½ Zimmer-Wohnung in Trun mieten</h1>' +
        '<p>Via Sogn Martin 1, 7166 Trun. CHF 1’520 inkl. NK pro Monat.</p>' +
        '<h2>Beschreibung</h2><p>Moderne Wohnung mit Terrasse, Küche, Waschmaschine, Keller und Parkplatz.</p>' +
        '<h3>Inserent</h3><p>Herr Max Muster</p><p>Kontaktanfrage erstellen</p>',
      finalUrl: url,
    };
    return { ok: false, status: 404, body: '', finalUrl: url };
  };
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.counts.kept, 1);
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

test('source-first dry run never writes and off-target pages are never admitted', async () => {
  const { deps, writes, marks } = depsFor();
  const result = await runPipeline(deps, { dryRun: true, testMode: true });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.counts.kept, 1);
  assert.equal(result.filtered.source_locality_mismatch, 1);
  assert.equal(writes.length, 0);
  assert.equal(marks.length, 0, 'dry run must not mutate the seen cache');
});

test('production source fetch mode never invokes Jina or browser fallbacks', async () => {
  const { createPoliteFetch } = await import('../server/immofinderFetcher.ts');
  const calls = [];
  const cfg = {
    fetch: { userAgent: 'test-agent', perHostDelayMs: 0, respectRobotsTxt: true, browserRenderHosts: ['example.com'], browserRenderMinTextChars: 1200, maxBrowserRendersPerRun: 2 },
    limits: { fetchTimeoutMs: 1000, maxPageBytes: 4096 },
  };
  const fetchImpl = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nDisallow:', { status: 200 });
    return new Response('blocked', { status: 403 });
  };
  const directOnly = createPoliteFetch(cfg, fetchImpl, async () => true, { allowJina: false, allowBrowser: false });
  const result = await directOnly('https://example.com/private-listing');
  assert.equal(result.status, 403);
  assert.deepEqual(calls, ['https://example.com/robots.txt', 'https://example.com/private-listing']);
});

test('production ImmoFinder route uses only the source-first, provider-free runtime', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const route = readFileSync(path.join(root, 'server/immofinderRoutes.ts'), 'utf8');
  assert.match(route, /import \{ runPipeline \} from '\.\/immofinder\/live\.ts'/);
  const runCall = route.slice(route.indexOf('result = await runPipeline({'), route.indexOf('pipelineCompleted = true;'));
  assert.match(runCall, /llm: null/);
  assert.match(runCall, /search: null/);
  assert.match(runCall, /allowJina: false, allowBrowser: true/);
  assert.doesNotMatch(runCall, /deps\.llm|createSerperSearch/);
  assert.match(route, /pollMs: 15_000/);
});
, phase: 1, maxDetailPages: 6 }],
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
    llm: async () => { throw new Error('LLM must not be called'); },
    search: async () => { throw new Error('Paid search must not be called'); },
    store,
  };
  return { deps, writes, marks, fetched };
}

test('source-first live pipeline admits a fetched private listing and persists traceable evidence', async () => {
  const { deps, writes, fetched } = depsFor();
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.counts.fetched, 1);
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

test('source-first dry run never writes and off-target pages are never admitted', async () => {
  const { deps, writes, marks } = depsFor();
  const result = await runPipeline(deps, { dryRun: true, testMode: true });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.counts.kept, 1);
  assert.equal(result.filtered.source_locality_mismatch, 1);
  assert.equal(writes.length, 0);
  assert.equal(marks.length, 0, 'dry run must not mutate the seen cache');
});

test('production source fetch mode never invokes Jina or browser fallbacks', async () => {
  const { createPoliteFetch } = await import('../server/immofinderFetcher.ts');
  const calls = [];
  const cfg = {
    fetch: { userAgent: 'test-agent', perHostDelayMs: 0, respectRobotsTxt: true, browserRenderHosts: ['example.com'], browserRenderMinTextChars: 1200, maxBrowserRendersPerRun: 2 },
    limits: { fetchTimeoutMs: 1000, maxPageBytes: 4096 },
  };
  const fetchImpl = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nDisallow:', { status: 200 });
    return new Response('blocked', { status: 403 });
  };
  const directOnly = createPoliteFetch(cfg, fetchImpl, async () => true, { allowJina: false, allowBrowser: false });
  const result = await directOnly('https://example.com/private-listing');
  assert.equal(result.status, 403);
  assert.deepEqual(calls, ['https://example.com/robots.txt', 'https://example.com/private-listing']);
});

test('production ImmoFinder route uses only the source-first, provider-free runtime', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const route = readFileSync(path.join(root, 'server/immofinderRoutes.ts'), 'utf8');
  assert.match(route, /import \{ runPipeline \} from '\.\/immofinder\/live\.ts'/);
  const runCall = route.slice(route.indexOf('result = await runPipeline({'), route.indexOf('pipelineCompleted = true;'));
  assert.match(runCall, /llm: null/);
  assert.match(runCall, /search: null/);
  assert.match(runCall, /allowJina: false, allowBrowser: false/);
  assert.doesNotMatch(runCall, /deps\.llm|createSerperSearch/);
  assert.match(route, /pollMs: 15_000/);
});
