/** P124.28  search planner over the last turns (T-1, T-2), hard gates, personal-data rule, fallback. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseSearchDecision, buildSearchDecision, hasPersonalData, searchPlannerGate, isSearchPlannerEnabled,
  shouldSearchWeb, planAndSearchSerper,
} from '../server/webSearch.ts';

const sets = JSON.parse(readFileSync(new URL('./search-decision-sets.json', import.meta.url), 'utf8'));
const j = (o) => JSON.stringify(o);
const client = (fn) => ({ models: { generateContent: async (a) => { const t = await fn(a); if (t instanceof Error) throw t; return { text: t }; } } });
const lastUser = (a) => String(a.contents).split('LAST USER MESSAGE:\n')[1] || '';
const trig = (userText, extra = {}) => ({ enabled: true, mode: 'auto', userText, userAskedSearch: false, ...extra });

test('fixtures: 26 positive and 26 negative questions', () => {
  assert.equal(sets.positive.length, 26);
  assert.equal(sets.negative.length, 26);
});

test('T-1: heuristic baseline on the sets is measured, not asserted as a target (fallback only)', () => {
  const hit = sets.positive.filter((q) => shouldSearchWeb(trig(q))).length;
  const fp = sets.negative.filter((q) => shouldSearchWeb(trig(q))).length;
  console.log(`heuristic fallback baseline: positive ${hit}/26, false triggers ${fp}/26`);
  assert.ok(hit >= 0 && fp >= 0);
});

test('T-1 wiring: planner decision, not regular expressions, drives the result (scripted model; NOT a model-quality measurement)', async () => {
  const pos = new Set(sets.positive);
  const c = client((a) => pos.has(lastUser(a).trim())
    ? j({ search: true, query: 'live data query', queries: [], place: '', country: '', topic: 'live', freshness: 'now' })
    : j({ search: false }));
  let hit = 0; let fp = 0;
  for (const q of sets.positive) if ((await buildSearchDecision({ userText: q, client: c, heuristic: () => false })).search) hit++;
  for (const q of sets.negative) if ((await buildSearchDecision({ userText: q, client: c, heuristic: () => true })).search) fp++;
  assert.equal(hit, 26); assert.equal(fp, 0);
});

test('T-2: the last turns reach the planner and the plan carries the resolved topic', async () => {
  let seen = '';
  const c = client((a) => { seen = String(a.contents); return j({ search: true, query: 'weather Zurich today', place: 'Zurich', country: 'ch', topic: 'weather', freshness: 'now' }); });
  const d = await buildSearchDecision({
    userText: 'I am asking you to search', heuristic: () => false, client: c,
    recentTurns: [{ role: 'user', content: 'what is the weather in Zurich' }, { role: 'assistant', content: 'I could not check.' }],
  });
  assert.match(seen, /USER: what is the weather in Zurich/);
  assert.match(seen, /ASSISTANT: I could not check/);
  assert.equal(d.search, true); assert.equal(d.decisionSource, 'model');
  assert.deepEqual([d.plan.query, d.plan.place, d.plan.country, d.plan.freshness, d.plan.planSource], ['weather Zurich today', 'Zurich', 'CH', 'now', 'model']);
});

test('parse: invalid shapes are null; search=false needs no query; extra queries capped at 2; non-English query rejected', () => {
  assert.equal(parseSearchDecision('nonsense'), null);
  assert.equal(parseSearchDecision(j({ query: 'x y z' })), null);
  assert.deepEqual(parseSearchDecision(j({ search: false })), { search: false });
  assert.equal(parseSearchDecision(j({ search: true, query: ' ' })), null);
  assert.equal(parseSearchDecision(j({ search: true, query: '\u043f\u043e\u0433\u043e\u0434\u0430 \u0432 \u0426\u044e\u0440\u0438\u0445\u0435' })), null);
  const p = parseSearchDecision(j({ search: true, query: 'bitcoin price', queries: ['btc usd', 'bitcoin chf', 'third one'], freshness: 'bogus' }));
  assert.deepEqual(p.plan.queries, ['btc usd', 'bitcoin chf']);
  assert.equal(p.plan.freshness, undefined);
});

test('personal data: never searched, never sent as a query', async () => {
  assert.equal(hasPersonalData('call me on 079 123 45 67'), true);
  assert.equal(hasPersonalData('mail anna@example.com'), true);
  assert.equal(hasPersonalData('CH93 0076 2011 6238 5295 7'), true);
  assert.equal(hasPersonalData('weather Zurich 2026-11-03'), false);
  assert.equal(hasPersonalData('bitcoin price 2026'), false);
  const c = client(() => j({ search: true, query: 'news about anna.meier@example.com', topic: 'news' }));
  const d = await buildSearchDecision({ userText: 'news about my friend', client: c, heuristic: () => true });
  assert.equal(d.search, false); assert.equal(d.decisionNote, 'personal_data_in_query');
});

test('fallback is never silent: every failure records a note and the heuristic decides', async () => {
  const h = (v) => () => v;
  assert.deepEqual(await buildSearchDecision({ userText: 'x'.repeat(10), heuristic: h(true) }), { search: true, decisionSource: 'heuristic', decisionNote: 'no_client' });
  assert.equal((await buildSearchDecision({ userText: 'x'.repeat(10), client: client(() => 'garbage'), heuristic: h(false) })).decisionNote, 'decision_unparsable');
  const e = await buildSearchDecision({ userText: 'x'.repeat(10), client: client(() => new Error('429 quota')), heuristic: h(true) });
  assert.match(e.decisionNote, /^decision_error:/); assert.equal(e.search, true); assert.equal(e.decisionSource, 'heuristic');
});

test('planner is limited to plausible freshness candidates and explicit search follow-ups', () => {
  const t = 'what is the weather in Zurich';
  assert.equal(searchPlannerGate(trig(t)), true);
  assert.equal(searchPlannerGate(trig('Can you explain the difference between these two ideas?')), false);
  assert.equal(searchPlannerGate(trig('Какое сегодня число?')), false, 'simple date question must not spend a planner call');
  assert.equal(searchPlannerGate(trig('I am asking you to search', { recentSearchIntent: true })), true);
  assert.equal(searchPlannerGate(trig(t, { distress: true })), false);
  assert.equal(searchPlannerGate(trig(t, { triage: 'CRISIS' })), false);
  assert.equal(searchPlannerGate(trig(t, { intent: 'DOCUMENT' })), false);
  assert.equal(searchPlannerGate(trig(t, { hasAttachments: true })), false);
  assert.equal(searchPlannerGate(trig(t, { enabled: false })), false);
  assert.equal(searchPlannerGate(trig('short')), false);
  assert.equal(searchPlannerGate(trig(t, { mode: 'explicit' })), false);
  assert.equal(searchPlannerGate(trig('I am asking you to search', { mode: 'explicit', recentSearchIntent: true })), true);
  assert.equal(searchPlannerGate(trig(t, { hasAttachments: true, userAskedSearch: true })), true);
  assert.equal(searchPlannerGate(trig(t, { distress: true, userAskedSearch: true })), false);
});

test('switch: WEB_SEARCH_PLANNER=false disables the planner; default on', () => {
  assert.equal(isSearchPlannerEnabled({}), true);
  assert.equal(isSearchPlannerEnabled({ WEB_SEARCH_PLANNER: 'false' }), false);
  assert.equal(isSearchPlannerEnabled({ WEB_SEARCH_PLANNER: 'true' }), true);
});

test('planned search reuses the plan (no second plan call) and passes extra queries', async () => {
  const src = readFileSync(new URL('../server/webSearch.ts', import.meta.url), 'utf8');
  assert.match(src, /opts\.plan \|\| await buildSearchPlan/);
  assert.match(src, /extraQueries: query === plan\.query \? plan\.queries : undefined/);
  let calls = 0;
  const r = await planAndSearchSerper({
    apiKey: 'k', userText: 'x', today: '2026-11-03', timeoutMs: 1000,
    client: client(() => { calls++; return j({ query: 'other' }); }),
    plan: { query: 'p', planSource: 'model' },
  }).catch(() => null);
  assert.equal(calls, 0); // network is unavailable here; the point is that no plan call was made
  void r;
});

test('server.ts: planner precedes the heuristic, userAskedSearch still forces a search, plan is handed over', () => {
  const s = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  // The bounded-latency policy splits the planner gate so the request-deadline budget is checked
  // before paying for an extra model call.
  assert.match(s, /const plannerEnabled = isSearchPlannerEnabled\(\)/);
  assert.match(s, /const plannerEligible = plannerEnabled && searchPlannerGate\(searchTrigger\) && plannerRemainingMs >= 1_000/);
  assert.match(s, /searchDecision\.search \|\| Boolean\(intentFlags\.userAskedSearch\)/);
  assert.match(s, /recentUserText, searchDecision\?\.search \? searchDecision\.plan : undefined/);
  assert.match(s, /decisionSource: searchDecision\?\.decisionSource/);
});
