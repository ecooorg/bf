import test from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline } from '../server/immofinder/live.ts';

const indexUrl = 'https://happyholiday.ch/area/graubuenden/';
const detailUrl = 'https://happyholiday.ch/haus/wohnung-in-chur/';
const indexHtml = '<html><body><a href="https://happyholiday.ch/haus/wohnung-in-chur/">Wohnung Chur</a></body></html>';
const detailHtml = '<html><head><title>3.5 Zimmer Wohnung in Chur</title></head><body><h1>3.5 Zimmer Wohnung in Chur</h1><p>Diese schöne Wohnung liegt in Chur. 3.5 Zimmer, helle Räume und Balkon. Das Angebot ist von privat. Für Fragen nutzen Sie bitte das Kontaktformular oder senden Sie eine Nachricht.</p></body></html>';

function depsFor({ dryStore = false } = {}) {
  const writes = [];
  const fetched = [];
  const store = {
    async findByUrl() { return null; },
    async touch() {},
    async upsert(record) { writes.push(record); return 'new'; },
    async getSeen() { return null; },
    async markSeen() {},
  };
  const deps = {
    config: {
      municipalities: ['Chur', 'Lenzerheide'],
      minRooms: 3,
      stopAgencies: ['Interhome', 'Holidu'],
      sources: [{ id: 'happyholiday', url: indexUrl, indexUrls: [indexUrl], phase: 1, maxDetailPages: 6 }],
      limits: { maxDetailPagesPerSource: 6, recheckAfterDays: 7, fetchTimeoutMs: 10000, maxPageBytes: 100000 },
      fetch: { userAgent: 'test', perHostDelayMs: 0, respectRobotsTxt: true },
    },
    async fetchPage(url) {
      fetched.push(url);
      if (url === indexUrl) return { ok: true, status: 200, body: indexHtml, finalUrl: url };
      if (url === detailUrl) return { ok: true, status: 200, body: detailHtml, finalUrl: url };
      return { ok: false, status: 404, body: '', finalUrl: url };
    },
    llm: async () => { throw new Error('LLM must not be called'); },
    search: async () => { throw new Error('Paid search must not be called'); },
    store,
  };
  return { deps, writes, fetched };
}

test('source-first live pipeline admits a fetched private listing and persists traceable evidence', async () => {
  const { deps, writes, fetched } = depsFor();
  const result = await runPipeline(deps, { dryRun: false, wave: 'full' });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.counts.fetched, 1);
  assert.equal(result.counts.kept, 1);
  assert.equal(result.counts.new, 1);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].listing_type, 'holiday_owner');
  assert.equal(writes[0].municipality, 'Chur');
  assert.match(writes[0].raw.evidence_text, /3.5 Zimmer/);
  assert.equal(result.estCostUsd, 0);
  assert.deepEqual(fetched, [indexUrl, detailUrl]);
});

test('source-first dry run never writes and rejected pages never reach the store', async () => {
  const { deps, writes } = depsFor();
  const result = await runPipeline(deps, { dryRun: true, testMode: true });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.counts.kept, 1);
  assert.equal(writes.length, 0);
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
    if (url.endsWith('/robots.txt')) return new Response('User-agent: *\\nDisallow:', { status: 200 });
    return new Response('blocked', { status: 403 });
  };
  const directOnly = createPoliteFetch(cfg, fetchImpl, async () => true, { allowJina: false, allowBrowser: false });
  const result = await directOnly('https://example.com/private-listing');
  assert.equal(result.status, 403);
  assert.deepEqual(calls, ['https://example.com/robots.txt', 'https://example.com/private-listing']);
});
