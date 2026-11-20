import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, sanitizeSettings } from '../server/immofinderSettings.ts';
import { createSerperSearch } from '../server/immofinderDiscovery.ts';
import { placeFromTitleOrSnippet } from '../server/immofinderCore.ts';
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('../config/immofinder.json', import.meta.url), 'utf8'));

test('P129.43 defaults to four communes and only evidence-backed productive discovery sources', () => {
  const settings = defaultSettings(cfg);
  assert.equal(settings.search.carouselCommunesPerRun, 4);
  assert.deepEqual(
    Object.entries(settings.search.sources).filter(([, enabled]) => enabled).map(([id]) => id).sort(),
    ['portal-flatfox', 'portal-homegate', 'portal-tutti', 'search'].sort(),
  );
  assert.equal(sanitizeSettings({}, cfg).search.carouselCommunesPerRun, 4);
});

test('Serper search sends weekly freshness filter when requested', async () => {
  process.env.SERPER_API_KEY = 'test-key';
  let sent;
  const search = createSerperSearch(async (_url, init) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ organic: [{ title: 'A', link: 'https://example.ch/a', snippet: 'B' }] }), { status: 200 });
  });
  const rows = await search('Chur Wohnung', { tbs: 'qdr:w' });
  assert.equal(sent.tbs, 'qdr:w');
  assert.equal(rows.length, 1);
  delete process.env.SERPER_API_KEY;
});

test('geo helper requires title, snippet and municipality allowlist and matches only explicit local evidence', () => {
  assert.deepEqual(placeFromTitleOrSnippet('3.5 Zimmer Wohnung', 'in Chur zu vermieten', ['Chur']), { matched: 'Chur', outside: false, hint: 'Chur' });
  assert.equal(placeFromTitleOrSnippet('Wohnung zu vermieten', 'Graubünden', ['Chur']).matched, null);
});

test('discovery query set replaces generic Facebook group search with fresh-intent wording', () => {
  assert.ok(!cfg.discovery.queries.some((q) => q.startsWith('site:facebook.com/groups')));
  assert.ok(cfg.discovery.queries.some((q) => /ab sofort|per 1\. Dezember/.test(q)));
});

test('pipeline batches discovery processing and avoids poisoning seen with insufficient evidence', () => {
  const source = readFileSync(new URL('../server/immofinderPipeline.ts', import.meta.url), 'utf8');
  assert.match(source, /qi % 5 === 0/);
  assert.match(source, /tbs: 'qdr:w'/);
  assert.match(source, /hasUsableFreshLink/);
  assert.match(source, /placeFromTitleOrSnippet\(hit\.title, `\$\{hit\.snippet\} \${hit\.link}`, cfg\.municipalities\)/);
  assert.match(source, /geo\.matched !== null && !geo\.outside/);
  assert.match(source, /reason !== 'rooms_unknown'/);
  assert.match(source, /reason !== 'municipality_not_whitelisted'/);
  assert.match(source, /reason === 'price_unknown' && pages\[i\]\.snippet/);
  assert.match(source, /6 \* 60 \* 60 \* 1000/);
  assert.match(source, /src\.id !== 'search' && st\.consecutiveBad >= stopAt/);
});

test('database diagnostics expose aggregate DB and pool health without credentials', () => {
  const diag = readFileSync(new URL('../server/immofinderDiag.ts', import.meta.url), 'utf8');
  assert.match(diag, /immoDatabaseDiagnostics/);
  assert.match(diag, /immofinder_listings/);
  assert.match(diag, /immofinder_seen/);
  assert.match(diag, /waiting: pool\.waitingCount/);
  assert.doesNotMatch(diag, /DATABASE_URL/);
});
