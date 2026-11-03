/** P124.30  provider chain (SEARCH_CAROUSEL), circuit breaker, separate search budgets. Offline: providers are injected. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseSearchCarousel, classifyProviderFailure, SearchCircuitBreaker, SearchBudget, runSearchCarousel,
} from '../server/searchCarousel.ts';
import { skippedWebSearch, searchDecisionDetails } from '../server/webSearch.ts';

const plan = { query: 'forecast Oslo', place: 'Oslo', country: 'NO', topic: 'weather', freshness: 'now', planSource: 'model' };
const good = (model, digest = 'Oslo forecast: 7 C now with light rain, 8 C tomorrow, 9 C on Thursday; wind 11 km/h from the southwest; precipitation 1.2 mm per day across the week.') => ({ status: 'used', digest, sources: [{ title: 'Oslo forecast', url: 'https://example.no/oslo' }], queries: ['forecast Oslo'], model });
const fresh = () => ({ breaker: new SearchCircuitBreaker({ threshold: 2, softOpenMs: 1000, hardOpenMs: 5000 }), budget: new SearchBudget({}) });

test('carousel parsing: order, dedup, unknown ids reported, defaults derived from legacy variables', () => {
  assert.deepEqual(parseSearchCarousel({ SEARCH_CAROUSEL: 'connector, Serper,gemini ,serp2,serper,bogus' }), { order: ['connector', 'serper', 'gemini', 'serp2'], unknown: ['bogus'], source: 'env' });
  assert.deepEqual(parseSearchCarousel({ SEARCH_CAROUSEL: 'bogus' }).order, ['connector', 'gemini']);
  assert.deepEqual(parseSearchCarousel({ SERPER_API_KEY: 'k' }).order, ['connector', 'serper', 'gemini']);
  assert.deepEqual(parseSearchCarousel({ SERPER_API_KEY: 'k', WEB_SEARCH_PROVIDER: 'serper' }).order, ['connector', 'serper']);
  assert.deepEqual(parseSearchCarousel({ WEB_SEARCH_PROVIDER: 'gemini' }).order, ['connector', 'gemini']);
});

test('failure classes: auth/quota/billing hard, other failures soft, empty results are not faults', () => {
  assert.equal(classifyProviderFailure(skippedWebSearch('failed', 'serper_http_429:x')), 'hard');
  assert.equal(classifyProviderFailure(skippedWebSearch('failed', 'serper_http_402:x')), 'hard');
  assert.equal(classifyProviderFailure(skippedWebSearch('failed', 'RESOURCE_EXHAUSTED quota')), 'hard');
  assert.equal(classifyProviderFailure(skippedWebSearch('failed', 'timeout')), 'soft');
  assert.equal(classifyProviderFailure(skippedWebSearch('no_grounding', 'serper_empty')), 'none');
  assert.equal(classifyProviderFailure(good('x')), 'none');
});

test('breaker: opens after threshold, half-open allows exactly one trial, success closes, failed trial reopens', () => {
  const b = new SearchCircuitBreaker({ threshold: 2, softOpenMs: 1000, hardOpenMs: 5000 });
  b.failure('s', 'soft', 0); assert.equal(b.allow('s', 1), true);
  b.failure('s', 'soft', 1); assert.equal(b.allow('s', 500), false);
  assert.equal(b.allow('s', 1100), true);   // trial
  assert.equal(b.allow('s', 1101), false);  // second caller blocked while trial runs
  b.failure('s', 'soft', 1200);             // failed trial reopens
  assert.equal(b.isOpen('s', 1300), true);
  assert.equal(b.allow('s', 2300), true); b.success('s');
  assert.equal(b.allow('s', 2301), true);
  b.failure('h', 'hard', 0); assert.equal(b.allow('h', 4999), false); assert.equal(b.allow('h', 5001), true);
});

test('budget: per-provider daily cap, UTC-day rollover, no cap means unlimited, parsed from SEARCH_DAILY_CAP_*', () => {
  let day = '2026-11-03';
  const b = new SearchBudget({ serper: 3 }, () => day);
  b.record('serper', 3); assert.equal(b.allows('serper'), false); assert.equal(b.allows('gemini'), true);
  day = '2026-11-04'; assert.equal(b.allows('serper'), true);
  const e = SearchBudget.fromEnv({ SEARCH_DAILY_CAP_GEMINI: '2', SEARCH_DAILY_CAP_SERPER: 'x' });
  e.record('gemini', 2); assert.equal(e.allows('gemini'), false); assert.equal(e.allows('serper'), true);
});

test('chain: first usable provider wins and later ones are not called', async () => {
  const calls = []; const { breaker, budget } = fresh();
  const r = await runSearchCarousel({ plan, order: ['connector', 'serper', 'gemini'], breaker, budget, providers: {
    serper: { search: async () => { calls.push('serper'); return good('serper'); } },
    gemini: { search: async () => { calls.push('gemini'); return good('gemini'); } },
  } });
  assert.equal(r.status, 'used'); assert.equal(r.provider, 'serper'); assert.deepEqual(calls, ['serper']);
  assert.deepEqual(r.chain.map((x) => `${x.provider}:${x.outcome}`), ['serper:used']);
  assert.ok(Number.isFinite(r.chain[0].latencyMs) && r.chain[0].latencyMs >= 0, 'provider attempt includes latency');
});

test('chain: Serper quota (429) falls through to Gemini, opens the breaker, next request skips Serper (A5 reserve path)', async () => {
  const calls = []; const { breaker, budget } = fresh();
  const providers = {
    serper: { search: async () => { calls.push('serper'); return { ...skippedWebSearch('failed', 'serper_http_429:quota'), model: 'serper' }; } },
    gemini: { search: async () => { calls.push('gemini'); return good('gemini'); } },
  };
  const r1 = await runSearchCarousel({ plan, order: ['serper', 'gemini'], breaker, budget, providers });
  assert.equal(r1.provider, 'gemini'); assert.equal(r1.status, 'used');
  assert.deepEqual(r1.chain.map((x) => `${x.provider}:${x.outcome}`), ['serper:failed', 'gemini:used']);
  const r2 = await runSearchCarousel({ plan, order: ['serper', 'gemini'], breaker, budget, providers });
  assert.equal(r2.provider, 'gemini');
  assert.deepEqual(r2.chain[0], { provider: 'serper', outcome: 'skipped', detail: 'circuit_open' });
  assert.deepEqual(calls, ['serper', 'gemini', 'gemini']);
});

test('chain: weak/no-data result falls through; best attempt is returned when nothing is usable', async () => {
  const { breaker, budget } = fresh();
  const empty = { status: 'used', digest: 'Weather in Oslo is a topic people ask about often and many sites cover it in detail.', sources: [{ title: 't', url: 'https://example.com/' }], queries: ['q'], model: 'x' };
  const r = await runSearchCarousel({ plan: { ...plan, query: 'forecast Oslo', place: 'Oslo' }, order: ['serper', 'gemini'], breaker, budget, providers: {
    serper: { search: async () => ({ ...empty, model: 'serper' }) },
    gemini: { search: async () => ({ ...skippedWebSearch('no_grounding', 'no_grounding'), model: 'gemini' }) },
  } });
  assert.notEqual(r.status, 'used');
  assert.equal(r.chain.length >= 1, true);
  assert.ok(['used_weak', 'no_relevant_data', 'no_grounding'].includes(r.status));
});

test('chain: separate search budget skips a provider without touching others; exhausted chain is an honest quota failure', async () => {
  const budget = new SearchBudget({ serper: 1, gemini: 1 }); const breaker = new SearchCircuitBreaker();
  budget.record('serper', 1); budget.record('gemini', 1);
  const r = await runSearchCarousel({ plan, order: ['serper', 'gemini', 'serp2'], breaker, budget, providers: {
    serper: { search: async () => good('serper') }, gemini: { search: async () => good('gemini') },
  } });
  assert.equal(r.status, 'failed'); assert.equal(r.reason, 'all_providers_unavailable:quota');
  assert.deepEqual(r.chain.map((x) => x.detail), ['search_budget_exhausted', 'search_budget_exhausted', 'not_configured']);
});

test('chain: used call is charged units; unavailable provider (no key) is skipped; a throwing provider cannot break the chain', async () => {
  const { breaker, budget } = fresh();
  const r = await runSearchCarousel({ plan, order: ['serper', 'gemini', 'serp2'], breaker, budget, providers: {
    serper: { unavailable: () => 'no_serper_key', search: async () => good('serper') },
    gemini: { search: async () => { throw new Error('boom'); } },
  } });
  assert.equal(r.status, 'failed');
  assert.equal(r.chain[0].detail, 'no_serper_key');
  assert.equal(r.chain[1].outcome, 'failed');
  const b2 = new SearchBudget({}); await runSearchCarousel({ plan, order: ['serper'], breaker: new SearchCircuitBreaker(), budget: b2, providers: { serper: { units: (x) => x.queries.length + 2, search: async () => good('serper') } } });
  assert.equal(b2.snapshot().serper.used, 3);
});

test('chain: connector evidence is merged into the provider result and survives total provider failure', async () => {
  const w = { status: 'used', digest: 'Oslo connector: 6 C now (model output, not a station observation); daily minimum 4 C and maximum 9 C for the next seven days; precipitation probability 60 percent.', sources: [{ title: 'Open-Meteo', url: 'https://open-meteo.com/' }], queries: ['weather connector: Oslo'], model: 'weather-connector' };
  const { breaker, budget } = fresh();
  const ok = await runSearchCarousel({ plan, order: ['connector', 'serper'], breaker, budget, connector: Promise.resolve(w), providers: { serper: { search: async () => good('serper') } } });
  assert.match(ok.digest, /Open-Meteo|model output/); assert.equal(ok.provider, 'serper');
  assert.equal(ok.chain[0].provider, 'connector'); assert.ok(Number.isFinite(ok.chain[0].latencyMs));
  const down = await runSearchCarousel({ plan, order: ['connector', 'serper'], breaker: new SearchCircuitBreaker(), budget: new SearchBudget(), connector: Promise.resolve(w), providers: { serper: { search: async () => skippedWebSearch('failed', 'timeout') } } });
  assert.equal(down.status, 'used'); assert.match(down.digest, /Oslo connector: 6 C/);
});

test('log record carries the chain; generation cap is not charged by search (source check)', () => {
  const rec = searchDecisionDetails({ status: 'used', digest: 'x', sources: [], queries: [], chain: [{ provider: 'serper', outcome: 'failed' }] }, { provider: 'gemini' });
  assert.deepEqual(rec.chain, [{ provider: 'serper', outcome: 'failed' }]);
  const src = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const start = src.indexOf('async function runConversationWebSearch(');
  const fn = src.slice(start, src.indexOf('\n}\n', start));
  assert.equal(/globalDayCount|DAILY_CALL_CAP/.test(fn), false);
});
