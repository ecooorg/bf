import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectLocalHtmlDocument } from '../src/immogr/local-page-inspector.ts';

function node(attrs = {}, textContent = '') {
  return {
    getAttribute: (name) => attrs[name] ?? null,
    textContent,
    innerText: textContent,
  };
}
function fakeDocument() {
  const nodes = {
    'link[rel="canonical"]': [node({ href: '/listing/42' })],
    'a[href]': [node({ href: '/contact' }, ' Contact  owner '), node({ href: 'javascript:alert(1)' }, 'bad'), node({ href: 'https://user:pass@example.com' }, 'bad auth')],
    img: [node({ src: '/images/flat.jpg', alt: 'Living room', title: 'Photo' }), node({ 'data-src': 'https://cdn.example/pic.webp' })],
    source: [node({ srcset: 'https://cdn.example/responsive.webp 2x' })],
    'meta[name],meta[property],meta[itemprop]': [node({ property: 'og:title', content: 'Sunny flat' })],
    'script[type="application/ld+json"]': [node({}, '{"@type":"Apartment"}')],
  };
  return {
    title: ' Test listing ',
    body: { innerText: '  A bright\\n apartment   in the Alps. ' },
    querySelector: (selector) => nodes[selector]?.[0] || null,
    querySelectorAll: (selector) => nodes[selector] || [],
  };
}

test('local page inspector extracts text, canonical URL, links, images and structured metadata', () => {
  const result = inspectLocalHtmlDocument(fakeDocument(), 'https://homes.example/source');
  assert.equal(result.title, 'Test listing');
  assert.equal(result.sourceUrl, 'https://homes.example/source');
  assert.equal(result.text, 'A bright apartment in the Alps.');
  assert.equal(result.links.length, 1);
  assert.equal(result.links[0].url, 'https://homes.example/contact');
  assert.equal(result.links[0].text, 'Contact owner');
  assert.equal(result.images.length, 3);
  assert.equal(result.images[0].alt, 'Living room');
  assert.equal(result.metadata['og:title'], 'Sunny flat');
  assert.deepEqual(result.jsonLd, ['{"@type":"Apartment"}']);
});

test('local page inspector rejects unsafe URL schemes and credentials', () => {
  const result = inspectLocalHtmlDocument(fakeDocument(), 'https://homes.example/source');
  assert.equal(result.links.some((item) => item.url.startsWith('javascript:')), false);
  assert.equal(result.links.some((item) => item.url.includes('@example.com')), false);
});
