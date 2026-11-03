/** P124.25 — retrieval integrity: fair budget, snippets kept, home pages/foreign sources dropped, Jina key. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeWebSearchResults, fairDigestShares, digestFromPageExtracts, pickUrlsToFetch,
  isHomePageUrl, sourceCountry, jinaHeaders, jinaReaderBase,
} from '../server/webSearch.ts';

const part = (n, tag) => ({ status: 'used', digest: `${tag}: `.concat(`${tag}${tag} `.repeat(n)).slice(0, n), sources: [{ title: tag, url: `https://www.${tag}.example/p` }], queries: [tag], model: 'serper' });

test('R-1: four sub-queries of 4400 chars all keep a share of the budget', () => {
  const m = mergeWebSearchResults([part(4400, 'a'), part(4400, 'b'), part(4400, 'c'), part(4400, 'd')], 'q');
  assert.ok(m.digest.length <= 5000);
  for (const t of ['a: ', 'b: ', 'c: ', 'd: ']) assert.ok(m.digest.includes(t), `missing ${t}`);
  assert.equal(m.diagnostics.digestCharsBeforeBudget - m.diagnostics.droppedByBudget, m.digest.length);
});

test('R-1: short digests keep everything; long ones share the remainder', () => {
  assert.deepEqual(fairDigestShares([100, 4400, 4400], 5000), [100, 2450, 2450]);
  assert.deepEqual(fairDigestShares([10, 20], 5000), [10, 20]);
});

test('R-1: sub-queries that opened the same page are not duplicated across sources', () => {
  const a = { ...part(100, 'a'), sources: [{ title: 'x', url: 'https://x.example/w' }] };
  const b = { ...part(100, 'b'), sources: [{ title: 'x', url: 'https://x.example/w' }] };
  assert.equal(mergeWebSearchResults([a, b], 'q').sources.length, 1);
});

test('R-2: snippets/answerBox stay in the digest next to page bodies', () => {
  const d = digestFromPageExtracts(
    [{ title: 'P', url: 'https://a.example/w', text: 'Zurich forecast: Monday 12 degrees, Tuesday 9 degrees, cloudy.' }],
    'AnswerBox: Zurich 11 °C now. Snippet two about the weekly forecast.',
  );
  assert.match(d, /SEARCH SNIPPETS/);
  assert.match(d, /Zurich 11 °C now/);
  assert.match(d, /SOURCE: P/);
  assert.ok(d.length <= 5000);
});

test('R-2: with many large pages the snippets are still present and the total fits', () => {
  const pages = [1, 2, 3, 4].map((i) => ({ title: `T${i}`, url: `https://s${i}.example/p`, text: `data${i} `.repeat(800) }));
  const d = digestFromPageExtracts(pages, 'KEEP-ME snippet text '.repeat(10));
  assert.match(d, /KEEP-ME/);
  assert.ok(d.length <= 5000);
  for (let i = 1; i <= 4; i++) assert.match(d, new RegExp(`SOURCE: T${i}`));
});

test('R-5: home pages are not fetched; deep pages are', () => {
  assert.equal(isHomePageUrl('https://www.meteoswiss.admin.ch/'), true);
  assert.equal(isHomePageUrl('https://example.com'), true);
  assert.equal(isHomePageUrl('https://example.com/?q=zurich'), false);
  assert.equal(isHomePageUrl('https://example.com/weather/zurich'), false);
  const picked = pickUrlsToFetch([
    { title: 'home', url: 'https://www.meteoswiss.admin.ch/' },
    { title: 'deep', url: 'https://example.com/weather/zurich' },
  ], 4);
  assert.deepEqual(picked.map((s) => s.title), ['deep']);
});

test('R-5: weather.gov / noaa.gov get no global preference', () => {
  const picked = pickUrlsToFetch([
    { title: 'gov', url: 'https://forecast.weather.gov/zip/60047' },
    { title: 'noaa', url: 'https://www.noaa.gov/x/y' },
    { title: 'other', url: 'https://example.com/a/b' },
  ], 1);
  assert.equal(picked[0].title, 'gov'); // original order is kept: no preference reorders it
  const picked2 = pickUrlsToFetch([
    { title: 'other', url: 'https://example.com/a/b' },
    { title: 'gov', url: 'https://forecast.weather.gov/zip/60047' },
  ], 1);
  assert.equal(picked2[0].title, 'other');
});

test('R-5: with a known country, sources with a different ccTLD are dropped; generic TLDs stay', () => {
  assert.equal(sourceCountry('https://www.meteoschweiz.admin.ch/x'), 'CH');
  assert.equal(sourceCountry('https://www.bbc.co.uk/x'), 'GB');
  assert.equal(sourceCountry('https://example.com/x'), undefined);
  const picked = pickUrlsToFetch([
    { title: 'de', url: 'https://wetter.example.de/zuerich' },
    { title: 'ch', url: 'https://wetter.example.ch/zuerich' },
    { title: 'com', url: 'https://weather.example.com/zurich' },
  ], 4, { country: 'CH' });
  assert.deepEqual(picked.map((s) => s.title).sort(), ['ch', 'com']);
  assert.equal(pickUrlsToFetch([{ title: 'de', url: 'https://a.example.de/x/y' }], 4).length, 1); // no country: no filter
});

test('R-5: URLs claimed by one sub-query are not fetched by another', () => {
  const claimed = new Set();
  const src = [{ title: 'a', url: 'https://a.example/x/y' }, { title: 'b', url: 'https://b.example/x/y' }];
  assert.deepEqual(pickUrlsToFetch(src, 1, { claimed }).map((s) => s.title), ['a']);
  assert.deepEqual(pickUrlsToFetch(src, 1, { claimed }).map((s) => s.title), ['b']);
  assert.deepEqual(pickUrlsToFetch(src, 1, { claimed }), []);
});

test('R-5: JINA_API_KEY is used only as a bearer header when set; base URL must be https', () => {
  assert.equal(jinaHeaders(9000, {}).Authorization, undefined);
  assert.equal(jinaHeaders(9000, { JINA_API_KEY: ' k123 ' }).Authorization, 'Bearer k123');
  assert.equal(jinaReaderBase({}), 'https://r.jina.ai/');
  assert.equal(jinaReaderBase({ JINA_READER_BASE_URL: 'http://evil.example' }), 'https://r.jina.ai/');
  assert.equal(jinaReaderBase({ JINA_READER_BASE_URL: 'https://reader.example/r' }), 'https://reader.example/r/');
});
