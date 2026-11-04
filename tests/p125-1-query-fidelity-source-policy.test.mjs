import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  QUERY_LIMITS, plannedQueryCount, checkFidelity, buildEnglishQueries, countWords,
} from '../server/queryFidelity.ts';
import { compilePolicy, excludedGroup, filterSerperData, loadSourcePolicy } from '../server/sourcePolicy.ts';
import {
  ensureEnglishPlan, digestFromSerperResponse, fetchSerperDigest, formatSearchStatusBlock, isFetchableContentUrl, isPublicFetchTarget,
  buildSearchQuery, mergeWebSearchResults,
} from '../server/webSearch.ts';

const ru = (n, extra = '') => `${extra} ${Array.from({ length: n }, (_, i) => `слово${'абвгд'[i % 5]}`).join(' ')}`.trim();
const calls = () => { const c = { n: 0, prompts: [] }; return c; };

// ---------------- WP1 ----------------

test('P125.1 limits live in one place and the count follows min(3, ceil(n/30))', () => {
  assert.equal(QUERY_LIMITS.verbatimMaxWords, 20);
  assert.equal(QUERY_LIMITS.maxWordsPerQuery, 25);
  assert.equal(QUERY_LIMITS.maxQueries, 3);
  assert.deepEqual([5, 20, 21, 25, 45, 60, 100, 400].map((n) => plannedQueryCount(n)), [1, 1, 1, 1, 2, 2, 3, 3]);
  assert.equal(plannedQueryCount(100, 2), 2, 'capped by WEB_SEARCH_MAX_QUERIES');
  assert.equal(plannedQueryCount(100, 1), 1);
});

test('P125.1 up to 20 words: one verbatim translation, exactly one model call, none for Latin text', async () => {
  for (const n of [5, 20]) {
    const text = ru(n - 4, 'Что случилось в Толедо');
    const c = calls();
    const r = await buildEnglishQueries({ text, generate: async (p) => { c.n++; return 'What happened in Toledo word word word'; } });
    assert.equal(c.n, 1, `${n} words`);
    assert.equal(r.queries.length, 1);
    assert.equal(r.fidelity.fallback, false);
    assert.equal(r.fidelity.sourceWords, n);
  }
  const c = calls();
  const latin = await buildEnglishQueries({ text: 'not Toledo, Spain 2026 election results', generate: async () => { c.n++; return ''; } });
  assert.equal(c.n, 0);
  assert.deepEqual(latin.queries, ['not Toledo, Spain 2026 election results']);
});

test('P125.1 fidelity check keeps names, numbers, negations and conditions', () => {
  assert.equal(checkFidelity('Что случилось в Толедо, а не в Испании в ноябре 2026?', ['What happened in Toledo, not Spain, in November 2026']).ok, true);
  const lost = checkFidelity('Что случилось в Толедо 5 ноября, если не считать Вашингтон?', ['what happened']);
  const kinds = lost.missing.map((m) => m.kind);
  assert.ok(kinds.includes('name') && kinds.includes('number') && kinds.includes('negation') && kinds.includes('condition'));
  assert.equal(checkFidelity('Выборы в Вашингтоне', ['elections Washington']).ok, true, 'Cyrillic name matches its English spelling');
  assert.equal(checkFidelity('weather in Zurich', ['weather in Zurich']).ok, true);
  assert.equal(checkFidelity('weather in Zurich 14 days', ['weather Zurich']).ok, false);
});

test('P125.1 longer texts become several short queries (21, 60 and 100 words)', async () => {
  for (const [n, k] of [[21, 1], [60, 2], [100, 3]]) {
    const text = ru(n - 4, 'Толедо 2026 не Испания');
    const reply = JSON.stringify(Array.from({ length: k }, (_, i) => `Toledo not Spain 2026 part ${i}`));
    const r = await buildEnglishQueries({ text, generate: async () => reply });
    assert.equal(r.queries.length, k, `${n} words`);
    assert.ok(r.queries.every((q) => countWords(q) <= QUERY_LIMITS.maxWordsPerQuery));
    assert.equal(r.fidelity.fallback, false);
    assert.equal(r.fidelity.check, 'ok');
  }
});

test('P125.1 a lost entity triggers the fallback: first 25 words verbatim plus the missing entity as a second query', async () => {
  const text = `${ru(56, 'Что случилось в Толедо 2026 не Испания')} Вашингтон 2027 июля`;
  const seen = [];
  const generate = async (p) => {
    seen.push(p);
    if (p.includes('JSON array')) return JSON.stringify(['what happened somewhere', 'more words']);
    if (p.includes('names and dates')) return 'Washington July';
    return 'what happened in Toledo 2026 not Spain words';
  };
  const r = await buildEnglishQueries({ text, generate });
  assert.equal(r.fidelity.fallback, true);
  assert.equal(r.queries.length, 2);
  assert.match(r.queries[0], /Toledo/);
  assert.ok(countWords(r.queries[0]) <= 25);
  assert.match(r.queries[1], /Washington/);
  assert.match(r.queries[1], /2027/, 'numbers are kept verbatim, not sent to the model');
  assert.match(r.queries[1], /July/);
});

test('P125.1 no model: Latin long text falls back deterministically, non-Latin stays flagged', async () => {
  const text = `Toledo Ohio 2026 ${Array.from({ length: 60 }, () => 'word').join(' ')} ends not Spain`;
  const r = await buildEnglishQueries({ text });
  assert.equal(r.queries[0].split(' ').length, 25);
  assert.ok(r.queries.length >= 1 && r.queries.length <= 3);
  assert.equal(r.fidelity.sourceWords, countWords(text));
});

test('P125.1 a planner query that drops an entity is replaced by the faithful build', async () => {
  const client = { models: { generateContent: async () => ({ text: 'What happened in Toledo, not Spain, in 2026' }) } };
  const plan = { query: 'election incidents', planSource: 'model' };
  const out = await ensureEnglishPlan(plan, { client, sourceText: 'Что случилось в Толедо, а не в Испании в 2026', timeoutMs: 3000 });
  assert.match(out.query, /Toledo/);
  assert.equal(out.fidelity?.check, 'ok');
  const same = await ensureEnglishPlan({ query: 'Toledo Ohio election 2026', planSource: 'model' }, { client, sourceText: 'выборы в Толедо Огайо 2026' });
  assert.equal(same.query, 'Toledo Ohio election 2026', 'a faithful plan is kept as is');
});

test('P125.1 the old 500/300-character cuts are gone and the upper bound is documented', () => {
  assert.ok(QUERY_LIMITS.searchInputMaxChars >= 1500 && QUERY_LIMITS.plannerTurnMaxChars >= 600);
  const long = 'слово '.repeat(150).trim();
  assert.equal(buildSearchQuery(long).length, long.length);
  const src = fs.readFileSync('server/webSearch.ts', 'utf8');
  assert.doesNotMatch(src, /raw\.slice\(0, 500\)|userText \|\| ''\)\.slice\(0, 500\)|replace\(\/\\s\+\/g, ' '\)\.slice\(0, 300\)/);
});

// ---------------- WP2 ----------------

test('P125.1 policy file validates and matches host or subdomain only', () => {
  const policy = loadSourcePolicy();
  assert.equal(compilePolicy(JSON.parse(fs.readFileSync('config/source-policy.json', 'utf8'))).version, policy.version);
  for (const h of ['ria.ru', 'www.lenta.ru', 'a.b.rg.ru', 'example.su', 'news.by', 'https://президент.рф/x', 'https://сайт.бел/', 'xn--p1ai']) {
    assert.equal(excludedGroup(h), 'A', h);
  }
  for (const h of ['rt.com', 'https://www.rt.com/news', 'sputnikglobe.com', 'tass.com', 'x.sputniknews.com']) assert.equal(excludedGroup(h), 'C', h);
  for (const h of ['reuters.com', 'notrt.com', 'rt.com.example.org', 'example.org/ru', 'bru.org', 'ru.wikipedia.org', 'cdn.ruby-lang.org', 'tass.com.evil.io']) {
    assert.equal(excludedGroup(h), null, h);
  }
  assert.throws(() => compilePolicy({ version: 1, groups: { A: { enabled: true, suffixes: ['.RU'] }, B: { enabled: false }, C: { enabled: false } } }));
});

test('P125.2 group B is applied by default: zones and subdomains match, look-alikes pass, counted per group', () => {
  const policy = loadSourcePolicy();
  assert.ok(policy.suffixes.some((r) => r.group === 'B'), 'group B has entries');
  for (const h of ['example.rus', 'news.example.moscow', 'https://site.tatar/page', 'example.xn--p1acf', 'a.b.xn--80adxhks', 'example.xn--d1acj3b']) assert.equal(excludedGroup(h), 'B', h);
  for (const h of ['rus.example.org', 'notmoscow.com', 'example.moscow.example.com', 'tatar.io', 'example.com/rus']) assert.equal(excludedGroup(h), null, h);
  const f = filterSerperData({ organic: [{ link: 'https://x.example.moscow/1' }, { link: 'https://reuters.com/a' }, { link: 'https://y.example.rus/2' }] });
  assert.deepEqual(f.dropped, { A: 0, B: 2, C: 0 });
  assert.equal(f.kept, 1);
});

const SERP = {
  answerBox: { snippet: 'Kremlin says X', link: 'https://www.rt.com/a', title: 'RT' },
  organic: [
    { title: 'RIA', snippet: 'Ria text', link: 'https://ria.ru/1', date: '1 hour ago' },
    { title: 'Reuters', snippet: 'Reuters text', link: 'https://www.reuters.com/x', date: '1 hour ago' },
    { title: 'Rg', snippet: 'Rg text', link: 'https://rg.ru/2' },
  ],
  news: [{ title: 'TASS', snippet: 'Tass text', link: 'https://tass.com/3' }],
};

test('P125.1 excluded results never reach digest or sources; counts are per group', () => {
  const f = filterSerperData(SERP);
  assert.deepEqual(f.dropped, { A: 2, B: 0, C: 2 });
  const r = digestFromSerperResponse(SERP, 'q', { today: '2026-11-04', freshness: 'now' });
  assert.doesNotMatch(r.digest, /Ria text|Rg text|Tass text|Kremlin|rt\.com|ria\.ru/);
  assert.deepEqual(r.sources.map((s) => new URL(s.url).hostname), ['www.reuters.com']);
  assert.deepEqual(r.policyDropped, { A: 2, B: 0, C: 2 });
});

test('P125.1 only excluded results: no_relevant_data with reason source_policy_filtered, honest status', async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ organic: [{ title: 'RIA', snippet: 'x'.repeat(80), link: 'https://ria.ru/1' }, { title: 'RT', snippet: 'y'.repeat(80), link: 'https://rt.com/2' }] }), { status: 200 });
  try {
    const r = await fetchSerperDigest({ apiKey: 'k', userText: 'q', englishQuery: 'election results', today: '2026-11-04', fetchPages: false });
    assert.equal(r.status, 'no_relevant_data');
    assert.equal(r.reason, 'source_policy_filtered');
    assert.deepEqual(r.diagnostics.sourcePolicyDropped, { A: 1, B: 0, C: 1 });
    assert.deepEqual(r.sources, []);
    const merged = mergeWebSearchResults([r, r], 'q');
    assert.equal(merged.reason, 'source_policy_filtered');
    assert.deepEqual(merged.diagnostics.sourcePolicyDropped, { A: 2, B: 0, C: 2 });
    const block = formatSearchStatusBlock(r, true, true);
    assert.match(block, /source policy/);
    assert.match(block, /NEVER say that you have no internet access/);
  } finally { globalThis.fetch = real; }
});

test('P125.1 excluded hosts are not fetchable (targets and redirect hops share this gate)', async () => {
  assert.equal(isFetchableContentUrl('https://ria.ru/a'), false);
  assert.equal(isFetchableContentUrl('https://www.rt.com/a'), false);
  assert.equal(isFetchableContentUrl('https://www.reuters.com/a'), true);
  assert.equal(await isPublicFetchTarget('https://sub.tass.com/a'), false);
  const src = fs.readFileSync('server/webSearch.ts', 'utf8');
  assert.match(src, /for \(let hop = 0; hop <= MAX_REDIRECT_HOPS; hop\+\+\) \{\s*if \(!await isPublicFetchTarget\(current\)\) return '';/, 'every redirect hop is checked');
});

test('P125.1 replay of the host mix seen on 2026-11-04 leaves no excluded host (synthetic fixture; real export NOT_AVAILABLE)', () => {
  const hosts = ['ria.ru', 'lenta.ru', 'rg.ru', 'iz.ru', 'reuters.com', 'apnews.com', 'bbc.com'];
  const data = { organic: hosts.map((h) => ({ title: h, snippet: `text from ${h}`, link: `https://${h}/a` })) };
  const r = digestFromSerperResponse(data, 'q', {});
  assert.deepEqual(r.sources.map((s) => new URL(s.url).hostname), ['reuters.com', 'apnews.com', 'bbc.com']);
  assert.equal(r.policyDropped.A, 4);
});

test('P125.1 conversation prompt carries the short source rule', () => {
  assert.match(fs.readFileSync('server.ts', 'utf8'), /do not cite or rely on state-controlled outlets of Russia and Belarus; prefer international and regional sources/);
});
