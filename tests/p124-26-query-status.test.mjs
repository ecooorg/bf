/** P124.26 — query plan, locale, usability + retry, honest status, single follow-up definition. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stripInstructionWords, parseSearchPlan, buildSearchPlan, serperLocale, unitsForCountry, assessUsability,
  searchWithUsability, formatSearchBlock, formatSearchStatusBlock, hasRecentSearchIntent, isSearchFollowup,
  contextualizeSearchText, retryQueryFor,
} from '../server/webSearch.ts';
import { readFileSync } from 'node:fs';

const used = (digest, extra = {}) => ({ status: 'used', digest, sources: [{ title: 'S', url: 'https://a.example/x/y' }], queries: ['q'], model: 'serper', ...extra });
const client = (text, fail) => ({ models: { generateContent: async () => { if (fail) throw new Error(fail); return { text }; } } });

test('R-3: instruction words are stripped from the query, topic and place stay', () => {
  const q = stripInstructionWords('current weather in Zurich, compare several websites, forecast for a week');
  assert.match(q, /weather/i); assert.match(q, /Zurich/);
  assert.doesNotMatch(q, /compare|several|websites|forecast for a week/i);
  assert.doesNotMatch(stripInstructionWords('пожалуйста сравни несколько сайтов погода в Цюрихе'), /сравни|сайт|пожалуйста/i);
});

test('R-3: planner JSON is parsed; non-English or malformed output is rejected', () => {
  const p = parseSearchPlan('```json\n{"query":"current weather Zurich","place":"Zurich","country":"ch","topic":"weather"}\n```');
  assert.deepEqual(p, { query: 'current weather Zurich', place: 'Zurich', country: 'CH', topic: 'weather' });
  assert.equal(parseSearchPlan('{"query":"погода в Цюрихе"}'), null);
  assert.equal(parseSearchPlan('not json'), null);
  assert.equal(parseSearchPlan('{"query":"ok query","country":"Switzerland"}').country, undefined);
});

test('R-3/K-5: model plan is used; every failure falls back deterministically WITH a recorded note', async () => {
  const good = await buildSearchPlan({ userText: 'погода в Цюрихе', client: client('{"query":"weather Zurich","place":"Zurich","country":"CH","topic":"weather"}') });
  assert.equal(good.planSource, 'model'); assert.equal(good.country, 'CH');
  const bad = await buildSearchPlan({ userText: 'weather in Zurich compare sites', client: client('', 'boom 429') });
  assert.equal(bad.planSource, 'heuristic'); assert.match(bad.planNote, /plan_error/);
  assert.doesNotMatch(bad.query, /compare|sites/i);
  const none = await buildSearchPlan({ userText: 'weather in Zurich' });
  assert.equal(none.planNote, 'no_client');
  const junk = await buildSearchPlan({ userText: 'weather in Zurich', client: client('garbage') });
  assert.equal(junk.planNote, 'plan_unparsable');
});

test('R-4: gl follows the plan country; default stays us; units from country', () => {
  assert.deepEqual(serperLocale('x', 'CH'), { hl: 'en', gl: 'ch' });
  assert.deepEqual(serperLocale('x'), { hl: 'en', gl: 'us' });
  assert.deepEqual(serperLocale('x', 'Switzerland'), { hl: 'en', gl: 'us' });
  assert.equal(unitsForCountry('CH'), 'metric'); assert.equal(unitsForCountry('US'), 'imperial'); assert.equal(unitsForCountry(''), 'unknown');
});

test('R-6: usability check is deterministic', () => {
  assert.equal(assessUsability(used('Zurich: 8 °C, cloudy, updated 19:00 today'), { place: 'Zurich' }).verdict, 'ok');
  assert.equal(assessUsability(used('Lake Michigan forecast: 70 degrees and windy conditions all week'), { place: 'Zurich' }).verdict, 'none');
  assert.equal(assessUsability(used('Zurich weather portal with forecasts and radar for the region and city'), { place: 'Zurich' }).verdict, 'weak');
  assert.equal(assessUsability(used('x'), {}).verdict, 'none');
  assert.equal(assessUsability(used('Some figure 12 appears here in the text for reading'), {}).verdict, 'ok');
  assert.equal(assessUsability(used('Node.js LTS remains in active support and is the recommended production release.'), { query: 'latest Node.js LTS version', topic: 'software release' }).verdict, 'ok', 'relevant non-numeric evidence is usable');
  assert.equal(assessUsability(used('A general page about gardening and home decoration with no related facts.'), { query: 'latest Node.js LTS version', topic: 'software release' }).verdict, 'none', 'unrelated text is rejected even when long');
});

test('R-6: weak result triggers exactly one retry with a different query; better merge wins', async () => {
  const calls = [];
  const plan = { query: 'current weather Zurich', place: 'Zurich', country: 'CH', topic: 'weather', planSource: 'model' };
  const r = await searchWithUsability(plan, async (q, c) => {
    calls.push([q, c]);
    return calls.length === 1 ? used('Zurich weather portal with forecasts and radar for the whole region') : used('Zurich today: 8 °C, cloudy, observed 19:00', { sources: [{ title: 'B', url: 'https://b.example/p/q' }] });
  });
  assert.equal(calls.length, 2); assert.notEqual(calls[0][0], calls[1][0]); assert.equal(calls[1][1], 'CH');
  assert.equal(r.status, 'used'); assert.equal(r.usability.retried, true); assert.match(r.digest, /8 °C/);
});

test('R-6: still nothing relevant after the retry → no_relevant_data; failures pass through; no retry when ok', async () => {
  const plan = { query: 'current weather Zurich', place: 'Zurich', topic: 'weather', planSource: 'heuristic' };
  let n = 0;
  const none = await searchWithUsability(plan, async () => { n++; return used('Lake Michigan forecast: 70 degrees and windy conditions all week'); });
  assert.equal(none.status, 'no_relevant_data'); assert.equal(n, 2);
  const failed = await searchWithUsability(plan, async () => ({ status: 'failed', digest: '', sources: [], queries: [], reason: 'serper_http_429' }));
  assert.equal(failed.status, 'failed');
  n = 0;
  const ok = await searchWithUsability(plan, async () => { n++; return used('Zurich now: 8 °C, cloudy, observed at 19:00 local time'); });
  assert.equal(ok.status, 'used'); assert.equal(n, 1);
  assert.equal(retryQueryFor({ query: 'x', planSource: 'heuristic' }), null);
});

test('P-1: status block never lets the model claim it lacks internet; silent when not expected or when used', () => {
  for (const [st, reason, re] of [['failed', 'serper_http_429:quota', /TEMPORARILY_UNAVAILABLE/], ['no_relevant_data', '', /NO_RELEVANT_DATA/], ['skipped', 'no_serper_key', /UNAVAILABLE/], ['failed', 'timeout', /TIMED_OUT/]]) {
    const b = formatSearchStatusBlock({ status: st, reason }, true);
    assert.match(b, re); assert.match(b, /NEVER say that you have no internet access/);
  }
  assert.match(formatSearchStatusBlock({ status: 'skipped', reason: 'search_disabled' }, true, false), /DISABLED/);
  assert.equal(formatSearchStatusBlock({ status: 'failed' }, false), '');
  assert.equal(formatSearchStatusBlock({ status: 'used' }, true), '');
  assert.equal(formatSearchStatusBlock({ status: 'used_weak' }, true), '');
});

test('P-2/P-3: evidence contract is topic-neutral, reports status, place and units; weak adds a caveat', () => {
  const b = formatSearchBlock(used('Zurich 8 °C', { status: 'used_weak', plan: { query: 'q', place: 'Zurich', country: 'CH', planSource: 'model' } }), '2026-11-03');
  assert.match(b, /SEARCH STATUS: USED_WEAK/); assert.match(b, /PLACE SEARCHED: Zurich \(CH\)/); assert.match(b, /metric units/i);
  assert.match(b, /only partly cover/);
  const ok = formatSearchBlock(used('Zurich 8 °C'), '2026-11-03');
  assert.match(ok, /SEARCH STATUS: USED —/); assert.doesNotMatch(ok, /\bLTS\b|Bank Rate|weather\b/i);
  assert.match(ok, /BEGIN UNTRUSTED DATA/);
});

test('T-3/T-2: one follow-up definition; instruction-only follow-up searches the previous topic', () => {
  assert.equal(hasRecentSearchIntent('поищи в интернет погоду'), true);
  assert.equal(hasRecentSearchIntent('hello'), false);
  assert.equal(isSearchFollowup('I am asking you to search'), true);
  assert.equal(isSearchFollowup('Я прошу тебя поискать'), true);
  assert.equal(contextualizeSearchText('I am asking you to search', 'price of diesel in California'), 'price of diesel in California');
  const src = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.ok(!/recentSearchIntent\s*=\s*\/\(\?:найди/.test(src) && !/recentSearchIntent: \/\(\?:найди/.test(src), 'no duplicate follow-up regex in server.ts');
});
