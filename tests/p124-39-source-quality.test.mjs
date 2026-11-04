import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRUSTED_NEWS_SOURCES, trustedSourceFor, classifySource, independentListedSources, sourceLabel, dateFromUrl,
} from '../server/sourceTrust.ts';
import {
  digestFromSerperResponse, formatSearchBlock, ensureEnglishPlan, assessUsability, digestFromPageExtracts, maxAgeDaysFor,
} from '../server/webSearch.ts';

const TODAY = '2026-11-04';

test('P124.39 trusted list holds the 20 owner-supplied organisations in three tiers', () => {
  assert.equal(TRUSTED_NEWS_SOURCES.length, 20);
  const tiers = TRUSTED_NEWS_SOURCES.reduce((a, s) => ({ ...a, [s.tier]: (a[s.tier] || 0) + 1 }), {});
  assert.deepEqual(tiers, { agency: 5, public_broadcaster: 7, quality_press: 8 });
  for (const host of ['reuters.com', 'apnews.com', 'afp.com', 'dpa.com', 'bloomberg.com', 'bbc.com', 'dw.com', 'france24.com', 'nhk.or.jp', 'npr.org', 'cbc.ca', 'sbs.com.au', 'nytimes.com', 'wsj.com', 'washingtonpost.com', 'theguardian.com', 'ft.com', 'lemonde.fr', 'elpais.com', 'straitstimes.com']) {
    assert.ok(classifySource(`https://${host}/x`).listed, host);
  }
});

test('P124.39 host matching accepts subdomains and www, never look-alike suffixes', () => {
  assert.equal(trustedSourceFor('https://www.reuters.com/world/a')?.name, 'Reuters');
  assert.equal(trustedSourceFor('https://news.bbc.co.uk/x')?.name, 'BBC News');
  assert.equal(trustedSourceFor('https://www3.nhk.or.jp/nhkworld/en/')?.name, 'NHK World-Japan');
  assert.equal(trustedSourceFor('https://notbbc.com/x'), undefined);
  assert.equal(trustedSourceFor('https://bbc.com.evil.example/x'), undefined);
  assert.equal(trustedSourceFor('https://ria.ru/20261104/x.html'), undefined);
  assert.equal(trustedSourceFor('not a url'), undefined);
  assert.match(sourceLabel('https://www.dw.com/en/a'), /trusted public broadcaster \(Deutsche Welle\)/);
  assert.match(sourceLabel('https://example.org/a'), /example\.org — unlisted/);
});

test('P124.39 two pages of one outlet count as one independent source', () => {
  const names = independentListedSources(['https://www.reuters.com/a', 'https://reuters.com/b', 'https://apnews.com/c', 'https://example.org/d']);
  assert.deepEqual(names, ['Reuters', 'Associated Press']);
});

test('P124.39 date is read from the URL path when the result has no date field', () => {
  assert.equal(dateFromUrl('https://dallasnews.com/news/2024/11/05/georgia-michigan'), '2024-11-05');
  assert.equal(dateFromUrl('https://example.org/a/2026-11-03/story'), '2026-11-03');
  assert.equal(dateFromUrl('https://example.org/story-2024'), undefined);
});

test('P124.39 freshness "now" marks old results, keeps them out of the sources and labels every line', () => {
  assert.equal(maxAgeDaysFor('now'), 30);
  const data = {
    organic: [
      { title: 'Fresh report', snippet: 'Voting went on.', link: 'https://www.reuters.com/world/us/fresh', date: '3 hours ago' },
      { title: 'Old hoax story', snippet: 'Threats came from email domains.', link: 'https://example.org/news/2024/11/05/hoax' },
      { title: 'Dated old', snippet: 'Earlier event.', link: 'https://apnews.com/article/old', date: 'Nov 5, 2024' },
      { title: 'Unlisted today', snippet: 'Claim.', link: 'https://ria.ru/20261104/x.html', date: '2 hours ago' },
    ],
  };
  const r = digestFromSerperResponse(data, 'q', { today: TODAY, freshness: 'now' });
  const lines = r.digest.split('\n');
  assert.match(lines[0], /^\[src: www?\.?reuters\.com — trusted agency|^\[src: reuters\.com — trusted agency/);
  assert.doesNotMatch(lines[0], /OLD/);
  assert.match(lines[1], /example\.org — unlisted; OLD/);
  assert.match(lines[2], /apnews\.com — trusted agency \(Associated Press\); OLD/);
  assert.match(lines[3], /ria\.ru — unlisted\]/);
  assert.doesNotMatch(lines[3], /OLD/);
  assert.deepEqual(r.sources.map((s) => new URL(s.url).hostname), ['www.reuters.com', 'ria.ru']);
  const noFresh = digestFromSerperResponse(data, 'q', { today: TODAY });
  assert.doesNotMatch(noFresh.digest, /OLD/, 'no freshness class: nothing is marked old');
  assert.equal(noFresh.sources.length, 4);
});

test('P124.39 fetched pages carry a TRUST line', () => {
  const d = digestFromPageExtracts([{ title: 'T', url: 'https://www.bbc.com/news/x', text: 'A'.repeat(80) }], '');
  assert.match(d, /TRUST: bbc\.com — trusted public broadcaster \(BBC News\)/);
});

test('P124.39 evidence block states the corroboration rule and counts listed and unlisted sources', () => {
  const r = {
    status: 'used', digest: 'x', queries: ['q'],
    sources: [{ title: 'a', url: 'https://reuters.com/a' }, { title: 'b', url: 'https://ria.ru/b' }, { title: 'c', url: 'https://reuters.com/c' }],
  };
  const block = formatSearchBlock(r, TODAY);
  assert.match(block, /1 independent listed source\(s\) \(Reuters\); 1 unlisted/);
  assert.match(block, /at least two independent LISTED sources/);
  assert.match(block, /Never merge reports about different places that share a name/);
  assert.match(block, /Items marked OLD are background only/);
  assert.match(block, /Name a public or state-funded broadcaster as such/);
});

test('P124.39 a plan in the user\'s own script is translated before it reaches the provider', async () => {
  const seen = [];
  const client = { models: { generateContent: async (a) => { seen.push(a.contents); return { text: 'US election day incidents news' }; } } };
  const plan = { query: 'найди эту новость в новостях сша', queries: ['новости сша сегодня', 'US news today'], planSource: 'heuristic', planNote: 'pre_classifier_live_data' };
  const out = await ensureEnglishPlan(plan, { client, model: 'm', timeoutMs: 2000 });
  assert.equal(out.query, 'US election day incidents news');
  assert.deepEqual(out.queries, ['US news today'], 'non-Latin extra queries are dropped');
  assert.match(out.planNote, /translated/);
  assert.equal(seen.length, 1);
});

test('P124.39 English plans are untouched and an unavailable translator is reported, not hidden', async () => {
  let called = false;
  const client = { models: { generateContent: async () => { called = true; return { text: 'x' }; } } };
  const en = { query: 'US election incidents', planSource: 'model' };
  assert.equal(await ensureEnglishPlan(en, { client }), en);
  assert.equal(called, false);
  const ru = await ensureEnglishPlan({ query: 'новости сша сегодня', planSource: 'heuristic' }, {});
  assert.equal(ru.planNote, 'untranslated');
});

test('P124.39 "City, Region" must match both parts, so a same-named place elsewhere does not pass', () => {
  const spain = { status: 'used', digest: 'Toledo railway accident in Spain, trains stopped near Toledo.', sources: [{ title: 'Toledo news', url: 'https://example.org/a' }], queries: [] };
  const ohio = { status: 'used', digest: 'Toledo, Ohio polling places: officials said ballots were counted normally in Lucas County, Ohio.', sources: [{ title: 'Toledo news', url: 'https://example.org/b' }], queries: [] };
  const plan = { query: 'Toledo election day incidents', place: 'Toledo, Ohio', topic: 'election incidents' };
  assert.equal(assessUsability(spain, plan).verdict, 'none');
  assert.equal(assessUsability(spain, plan).placeMatched, false);
  assert.equal(assessUsability(ohio, plan).placeMatched, true);
  assert.equal(assessUsability(spain, { ...plan, place: 'Toledo' }).placeMatched, true, 'a bare name still needs only one token');
});
