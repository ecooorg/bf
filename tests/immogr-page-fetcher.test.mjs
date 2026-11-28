import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchImmoGRPage } from '../server/immogr/page-fetcher.ts';
import { parseImmoGRHtml } from '../server/immogr/page-parser.ts';

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];
test('page fetcher retrieves bounded HTML and fingerprints it', async () => {
  const result = await fetchImmoGRPage('https://example.com/listing', {
    lookupImpl: publicLookup,
    fetchImpl: async () => new Response('<html><body>Apartment</body></html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }),
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.page.statusCode, 200);
    assert.match(result.page.contentFingerprint, /^[a-f0-9]{64}$/);
    assert.equal(result.page.bytes > 0, true);
  }
});
test('page fetcher rejects private and mixed public/private DNS answers', async () => {
  const fetchImpl = async () => { throw new Error('must not fetch'); };
  const privateResult = await fetchImmoGRPage('https://example.com/', { lookupImpl: async () => [{ address: '127.0.0.1', family: 4 }], fetchImpl });
  assert.equal(privateResult.ok, false);
  const mixedResult = await fetchImmoGRPage('https://example.com/', { lookupImpl: async () => [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.2', family: 4 }], fetchImpl });
  assert.equal(mixedResult.ok, false);
});
test('page fetcher follows only bounded redirects and revalidates the destination', async () => {
  const hosts = [];
  const result = await fetchImmoGRPage('https://example.com/start', {
    lookupImpl: async (host) => { hosts.push(host); return publicLookup(); },
    fetchImpl: async (url) => String(url).endsWith('/start')
      ? new Response('', { status: 302, headers: { location: 'https://example.com/detail' } })
      : new Response('<html><body>Detail</body></html>', { status: 200, headers: { 'content-type': 'text/html' } }),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(hosts, ['example.com', 'example.com']);
  if (result.ok) assert.equal(result.page.redirectCount, 1);
});
test('page fetcher rejects cross-domain redirects before requesting the destination', async () => {
  const requested = [];
  const result = await fetchImmoGRPage('https://example.com/start', {
    allowedHosts: ['example.com'],
    lookupImpl: publicLookup,
    fetchImpl: async (url) => {
      requested.push(String(url));
      return new Response('', { status: 302, headers: { location: 'https://other.example/detail' } });
    },
  });
  assert.equal(result.ok, false);
  assert.deepEqual(requested, ['https://example.com/start']);
});

test('page fetcher rejects oversized and non-HTML responses', async () => {
  const big = await fetchImmoGRPage('https://example.com/', {
    lookupImpl: publicLookup, maxBytes: 16384,
    fetchImpl: async () => new Response('x'.repeat(17000), { status: 200, headers: { 'content-type': 'text/html' } }),
  });
  assert.equal(big.ok, false);
  const pdf = await fetchImmoGRPage('https://example.com/', {
    lookupImpl: publicLookup,
    fetchImpl: async () => new Response('%PDF', { status: 200, headers: { 'content-type': 'application/pdf' } }),
  });
  assert.equal(pdf.ok, false);
});
test('HTML parser extracts text, canonical URL, links, description and JSON-LD', () => {
  const html = `<html><head><title>Chalet &amp; Apartment</title><meta name="description" content="Nice home"><link rel="canonical" href="/detail"></head><body><h1>Wohnung CHF 1'800 pro Monat</h1><a href="/detail">View listing</a><script type="application/ld+json">{"@type":"Offer","price":1800}</script><script>ignoreMe()</script></body></html>`;
  const parsed = parseImmoGRHtml(html, 'https://example.com/search');
  assert.equal(parsed.title, 'Chalet & Apartment');
  assert.equal(parsed.description, 'Nice home');
  assert.equal(parsed.canonicalUrl, 'https://example.com/detail');
  assert.match(parsed.text, /CHF 1'800/);
  assert.equal(parsed.links[0].url, 'https://example.com/detail');
  assert.equal(parsed.jsonLd.length, 1);
});
