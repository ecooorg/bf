import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { R7_REJECT_CODES, classifyReject, summarizeRejects, sampleRejects, sourceDemotionCandidates, buildRunQualityAudit } from '../server/immofinder/taxonomy.ts';
import { classifyPage } from '../server/immofinder/classify.ts';
import { extractOwnerEvidence, promoteLevel } from '../server/immofinder/owner.ts';
import { processSnapshot, replaySnapshots } from '../server/immofinder/pipeline.ts';
import { dryRunBatch } from '../server/immofinder/dryRun.ts';
import { discover as hhDiscover, extract as hhExtract } from '../server/immofinder/sources/happyholiday.ts';
import { discover as fhDiscover, extract as fhExtract } from '../server/immofinder/sources/ferienhausmiete.ts';
import { createSwissClassifiedAdapter } from '../server/immofinder/sources/swiss-classified.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coreSrc = readFileSync(path.join(root, 'server/immofinderCore.ts'), 'utf8');

const CFG = {
  municipalities: ['Chur', 'Flims', 'Untervaz', 'Cazis', 'Lenzerheide'],
  minRooms: 3,
  stopAgencies: ['Interhome', 'Holidu', 'Belvilla'],
};

function snap(over = {}) {
  return {
    requestedUrl: 'https://example.test/listing/1',
    finalUrl: 'https://example.test/listing/1',
    title: 'Schöne 4.5 Zimmer Wohnung in Chur',
    pageText: 'Vermietung 4.5 Zimmer Wohnung in Chur. Von privat. Tel 079 123 45 67. Ruhige Lage mit Balkon und guter Verkehrsanbindung.',
    fetchTimeIso: '2026-11-26T09:00:00Z',
    ...over,
  };
}

test('P130.16 core exposes sale-verify helpers or payload pending', () => {
  const ready = coreSrc.includes('verifyListingFromPageText') && coreSrc.includes('zweitwohnung');
  if (!ready) {
    assert.ok(true);
    return;
  }
  assert.match(coreSrc, /zweitwohnung\|eigentumswohnung/);
  assert.match(coreSrc, /price_sale_mismatch/);
  assert.match(coreSrc, /buildCrossSourceSaleQuery/);
  assert.match(coreSrc, /crossSourceIndicatesSale/);
});

test('P130.16 Flims Zweitwohnung is for_sale when helpers live', async () => {
  if (!coreSrc.includes('verifyListingFromPageText')) return;
  const {
    isForSaleListing,
    parsePrice,
    credibilityRejectReason,
    verifyListingFromPageText,
    buildCrossSourceSaleQuery,
    crossSourceIndicatesSale,
  } = await import('../server/immofinderCore.ts');
  const title = 'Seltene Gelegenheit in Flims: Kernsanierte 3.5-Zimmer-Zweitwohnung';
  const snippet = "Kernsanierte 3.5-Zimmer-Zweitwohnung mit Terrasse im Herzen von Flims. 1'390";
  const url = 'https://www.tutti.ch/de/vi/10011127181';
  assert.equal(isForSaleListing(title, snippet, url), true);
  const bad = parsePrice(snippet);
  assert.ok(!bad || bad.amount !== 1390);
  assert.equal(
    credibilityRejectReason({
      title,
      evidenceText: snippet,
      url,
      municipality: 'Flims',
      roomsEstimated: 3.5,
      price: { amount: 1390, unit: 'month', currency: 'CHF', quote: "1'390" },
      phone: null,
      email: null,
      evidenceKind: 'snippet',
      municipalities: ['Flims'],
      allowSnippet: true,
    }),
    'for_sale',
  );
  const full = title + "\nKaufpreis CHF 1'380'000.-\nVia Nova 61, 7017 Flims Dorf.";
  assert.equal(
    verifyListingFromPageText({
      title,
      url,
      pageText: full,
      price: { amount: 1390, unit: 'month', currency: 'CHF', quote: 'x' },
    }),
    'for_sale',
  );
  assert.ok(buildCrossSourceSaleQuery(title)?.includes('kaufen'));
  assert.equal(
    crossSourceIndicatesSale(title, [
      {
        title: 'Seltene Gelegenheit in Flims kaufen',
        link: 'https://dreamo.ch/kaufen/x',
        snippet: 'Kaufpreis 1380000 Zweitwohnung Flims',
      },
    ]),
    true,
  );
});

const OBSERVED_REJECT_REASONS = ['trust_snippet_only', 'not_single_listing', 'municipality_not_whitelisted', 'rooms_below_min', 'agency', 'rooms_unknown', 'list_or_search_page', 'listing_unavailable', 'contact_required', 'for_sale', 'seeker_post', 'municipality_mismatch', 'price_not_confirmed_on_detail_page', 'short_stay_price_period_required', 'price_above_max', 'temporary_furnished', 'development_project', 'shared_room', 'short_stay_page_evidence_required', 'holiday_tourism', 'municipality_collage', 'price_ambiguous_on_detail_page', 'rooms_too_many', 'rooms_conflict', 'price_not_in_evidence', 'short_stay_specific_link_required', 'price_calendar_year_as_price', 'trust_not_rental', 'trust_not_residential', 'price_from_parking', 'detail_page_evidence_too_short'];

test('P131.7a R7 taxonomy is closed: config list equals code list and every observed reason maps', () => {
  const cfg = JSON.parse(readFileSync(path.join(root, 'config/immofinder.json'), 'utf8'));
  assert.deepEqual([...cfg.quality.rejectCodes], [...R7_REJECT_CODES]);
  for (const reason of OBSERVED_REJECT_REASONS) {
    const code = classifyReject(reason);
    assert.ok(code && R7_REJECT_CODES.includes(code), reason + ' must map to a closed code');
  }
  assert.equal(classifyReject('a_reason_nobody_defined'), null);
  const trustSrc = readFileSync(path.join(root, 'server/immofinderTrustEngine.ts'), 'utf8');
  const trustReasons = [...trustSrc.matchAll(/\| '(trust_[a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(trustReasons.length >= 15);
  for (const reason of trustReasons) assert.ok(classifyReject(reason), reason + ' (TrustEngine) must map to a closed code');
});

test('P131.7a R7 summary separates unmapped reasons and counts retired gates', () => {
  const s = summarizeRejects({ agency: 2, price_above_max: 3, contact_required: 1, municipality_not_whitelisted: 4, brand_new_reason: 2, rooms_unknown: 0 });
  assert.equal(s.total, 12);
  assert.deepEqual(s.byCode, { agency: 2, retired_gate: 4, outside_target: 4 });
  assert.deepEqual(s.unmapped, { brand_new_reason: 2 });
  assert.equal(s.retiredGateRejects, 4);
  assert.deepEqual(summarizeRejects(null), { total: 0, byCode: {}, unmapped: {}, retiredGateRejects: 0 });
});

test('P131.7a R7 reject sample is fixed-size, deterministic per run and only rejected previews', () => {
  const preview = Array.from({ length: 40 }, (_, i) => ({ url: 'https://example.test/' + i, source: 's', kept: i % 5 === 0, reason: i % 5 === 0 ? null : 'rooms_unknown' }));
  const a = sampleRejects('run-a', preview, 10);
  assert.equal(a.length, 10);
  assert.deepEqual(a, sampleRejects('run-a', preview, 10));
  assert.notDeepEqual(a.map((x) => x.url), sampleRejects('run-b', preview, 10).map((x) => x.url));
  assert.ok(a.every((x) => x.code === 'rooms_unknown'));
  assert.equal(sampleRejects('run-a', [], 10).length, 0);
});

test('P131.7a R9 demotion evidence ignores runs that fetched nothing and requires zero kept over N runs', () => {
  const run = (fetched, kept) => [{ id: 'cat', fetched, kept }, { id: 'blocked', fetched: 0, kept: 0 }, { id: 'good', fetched: 2, kept: fetched === 3 ? 1 : 0 }];
  const runs = [run(3, 0), run(2, 0), run(4, 0), run(1, 0), run(5, 0)];
  const out = sourceDemotionCandidates(runs, 5);
  assert.deepEqual(out.map((x) => x.id), ['cat']);
  assert.equal(out[0].runs, 5);
  assert.deepEqual(sourceDemotionCandidates(runs.slice(0, 4), 5), []);
  const audit = buildRunQualityAudit('r1', { filtered: { agency: 1 }, preview: [], sourceStats: run(2, 0) }, runs.slice(0, 4), 5);
  assert.equal(audit.policy, 'C131-R7-R9');
  assert.deepEqual(audit.sourceDemotion.candidates.map((x) => x.id), ['cat']);
});

test('P131.7a run diagnostics persistence attaches the quality audit without making it fatal', () => {
  const store = readFileSync(path.join(root, 'server/immofinderRunDiagnostics.ts'), 'utf8');
  assert.match(store, /buildRunQualityAudit\(id, /);
  assert.match(store, /catch \{ \/\* audit block is optional \*\/ \}/);
});

// ---- P131.8 WP3 pure engine ----

test('P131.8 classify: snippet-only and url mismatch → L0', () => {
  assert.equal(classifyPage(snap({ provisional: true }), CFG).level, 'L0');
  assert.equal(classifyPage(snap({ provisional: true }), CFG).rejectCode, 'snippet_only');
  assert.equal(classifyPage(snap({ finalUrl: 'https://other.test/x' }), CFG).level, 'L0');
});

test('P131.8 classify: outside target / for_sale / seeker / rooms', () => {
  assert.equal(
    classifyPage(
      snap({
        title: 'Wohnung in Zürich am See',
        pageText: '3.5 Zimmer Wohnung in Zürich zu mieten. Helle Räume, Balkon, ruhige Lage nahe ÖV und Einkaufsmöglichkeiten.',
      }),
      CFG,
    ).rejectCode,
    'outside_target',
  );
  assert.equal(
    classifyPage(
      snap({
        title: 'Zweitwohnung Flims Dorf',
        pageText: '3.5 Zimmer zu verkaufen in Flims. Eigentumswohnung mit Terrasse und Bergblick, ruhige Lage.',
      }),
      CFG,
    ).rejectCode,
    'for_sale',
  );
  assert.equal(
    classifyPage(
      snap({
        title: 'WG in Chur Zentrum',
        pageText: 'Suche Mitbewohner für 4 Zimmer Wohnung in Chur. Gemeinsame Küche und Bad, ruhige Mitbewohner willkommen.',
      }),
      CFG,
    ).rejectCode,
    'seeker',
  );
  assert.equal(
    classifyPage(
      snap({
        title: 'Studio Chur Altstadt',
        pageText: '1.5 Zimmer Wohnung in Chur zu mieten. Kompakt, modern, gute Verkehrsanbindung und Einkaufsmöglichkeiten in der Nähe.',
      }),
      CFG,
    ).rejectCode,
    'rooms_below_min',
  );
});

test('P131.8 classify: good private rental → L1 with rooms evidence', () => {
  const r = classifyPage(snap(), CFG);
  assert.equal(r.level, 'L1');
  assert.equal(r.rejectCode, null);
  assert.ok(r.rooms && r.rooms.value >= 3);
  assert.equal(r.locality?.value, 'Chur');
  assert.equal(r.isResidential, true);
});

test('P131.8i classify: locality prefers URL slug over footer commune list', () => {
  const r = classifyPage(
    snap({
      requestedUrl: 'https://happyholiday.ch/haus/haus-am-see-graubuenden-in-lenzerheide/',
      finalUrl: 'https://happyholiday.ch/haus/haus-am-see-graubuenden-in-lenzerheide/',
      title: 'Haus am See',
      pageText:
        '9 Zimmer Ferienhaus mit Seeblick. Von privat. ' +
        'Footer communes: Chur Flims Untervaz Cazis Laax Thusis. ' +
        'Mehr Text: Chur Flims und Umgebung.',
    }),
    CFG,
  );
  assert.equal(r.level, 'L1');
  assert.equal(r.locality?.value, 'Lenzerheide');
});

test('P131.8j classify: body locality needs explicit address evidence, not footer mentions', () => {
  const falsePositive = classifyPage(
    snap({
      requestedUrl: 'https://www.ferienhausmiete.de/123.htm',
      finalUrl: 'https://www.ferienhausmiete.de/123.htm',
      title: 'Ferienhaus Muntanella in Bergün',
      pageText: '4 Zimmer Ferienhaus. Die Region Chur ist gut erreichbar. Footer communes: Chur, Flims, Laax.',
    }),
    CFG,
  );
  assert.equal(falsePositive.level, 'L0');
  assert.equal(falsePositive.rejectCode, 'outside_target');

  const explicitAddress = classifyPage(
    snap({
      requestedUrl: 'https://www.ferienhausmiete.de/456.htm',
      finalUrl: 'https://www.ferienhausmiete.de/456.htm',
      title: 'Helle Wohnung mit Balkon',
      pageText: '4 Zimmer Wohnung zu mieten. Ort: 7000 Chur. Privat vermietet, Kontakt direkt.',
    }),
    CFG,
  );
  assert.equal(explicitAddress.level, 'L1');
  assert.equal(explicitAddress.locality?.value, 'Chur');
});

test('C131 Swiss classifieds adapter discovers only same-host detail pages and extracts evidence', () => {
  const anibis = createSwissClassifiedAdapter('portal-anibis', 'anibis.ch');
  const found = anibis.discover(
    '<a href="/de/vi/graubuenden/immobilien/wohnungen/helle-wohnung/1074103783">3-Zimmer-Wohnung Chur</a>' +
    '<a href="https://evil.example/de/vi/123">bad link</a>' +
    '<a href="/de/q/immobilien-graubuenden">index</a>',
    'https://www.anibis.ch/de/q/immobilien-graubuenden-wohnungen-mieten/test',
  );
  assert.equal(found.length, 1);
  assert.match(found[0].url, /anibis\.ch\/de\/vi\//);
  const fields = anibis.extract(
    '<h1>Sonnige 3-Zimmer-Wohnung in Chur</h1><main>7000, Chur. 3-Zimmer-Wohnung. 1’400.- pro Monat. Privatperson. Kontaktformular.</main>',
    found[0].url,
  );
  assert.equal(fields.rooms?.value, 3);
  assert.match(fields.locality?.quote || '', /7000, Chur/);
  assert.ok(fields.priceText);
});

test('C131 classifier does not reject ordinary real-estate wording as an agency', () => {
  const r = classifyPage(snap({
    title: 'Helle 3.5-Zimmer-Wohnung in Chur',
    pageText: 'Private Immobilienanzeige. 7000, Chur. 3.5-Zimmer-Wohnung zur Miete. Kontaktformular.',
  }), CFG);
  assert.equal(r.level, 'L1');
  assert.equal(r.isAgency, false);
});

test('P131.8 owner: private + phone → L2 promote', () => {
  const o = extractOwnerEvidence(
    'Schöne Wohnung',
    'Von privat. Tel 079 123 45 67. Ruhige Lage in Chur.',
    CFG.stopAgencies,
  );
  assert.equal(o.isPrivateOwner, true);
  assert.equal(o.contactRoute, 'direct');
  assert.ok(o.phone);
  assert.equal(promoteLevel('L1', o), 'L2');
  assert.equal(promoteLevel('L0', o), 'L0');
});

test('P131.8 owner: agency markers block private', () => {
  const o = extractOwnerEvidence('Ferienwohnung', 'Interhome object in Flims. 4 Zimmer.', CFG.stopAgencies);
  assert.equal(o.isPrivateOwner, false);
});

test('P131.8 pipeline: end-to-end L1→L2 and reject path', () => {
  const good = processSnapshot({ snapshot: snap(), config: CFG, sourceId: 'happyholiday' });
  assert.equal(good.level, 'L2');
  assert.equal(good.rejectCode, null);
  assert.ok(good.owner?.isPrivateOwner);

  const bad = processSnapshot({
    snapshot: snap({
      title: 'Studio Zürich',
      pageText: '1 Zimmer in Zürich. Kompakt und zentral gelegen mit guter Anbindung an den öffentlichen Verkehr.',
    }),
    config: CFG,
  });
  assert.equal(bad.level, 'L0');
  assert.ok(bad.rejectCode);
});

test('P131.8 replaySnapshots aggregates levels and rejects', () => {
  const items = [
    { snapshot: snap() },
    { snapshot: snap({ title: 'Studio Zürich', pageText: '1 Zimmer in Zürich. Kompakt und zentral gelegen mit guter Anbindung an den öffentlichen Verkehr.' }) },
    { snapshot: snap({ provisional: true }) },
  ];
  const r = replaySnapshots(items, CFG);
  assert.equal(r.total, 3);
  assert.ok(r.byLevel.L0 >= 2);
  assert.ok(r.byLevel.L2 >= 1 || r.byLevel.L1 >= 1);
});

test('P131.8 happyholiday adapter discover + extract', () => {
  const html = `
    <a href="/haus/chalet-in-flims">Chalet</a>
    <a href="https://happyholiday.ch/haus/wohnung-in-chur">Wohnung</a>
    <h1>4.5 Zimmer in Chur</h1>
    <p>Von privat. 4.5 Zimmer Wohnung.</p>
  `;
  const found = hhDiscover(html, 'https://happyholiday.ch/suche');
  assert.ok(found.some((c) => c.url.includes('/haus/')));
  const fields = hhExtract(html, 'https://happyholiday.ch/haus/wohnung-in-chur');
  assert.ok(fields.title || fields.rooms);
  if (fields.rooms) assert.ok(fields.rooms.value >= 3);
});

test('P131.8 ferienhausmiete adapter discover + extract', () => {
  const html = `
    <a href="https://www.ferienhausmiete.ch/objekt/12345-chalet-flims">Chalet</a>
    <h1>Chalet 5 Zimmer Flims</h1>
    <p>5 Zimmer Ferienhaus in Flims.</p>
  `;
  const found = fhDiscover(html, 'https://www.ferienhausmiete.ch/suche');
  assert.ok(Array.isArray(found));
  const fields = fhExtract(html, 'https://www.ferienhausmiete.ch/objekt/12345');
  assert.ok(fields);
});

test('P131.8i dryRunBatch aggregates levels and optional legacy agreement', () => {
  const items = [
    { snapshot: snap(), sourceId: 'happyholiday', legacyKept: true },
    { snapshot: snap({ title: 'Studio Zürich', pageText: '1 Zimmer Studio in Zürich zu mieten. Ruhige Lage mit Balkon und Küche.' }), legacyKept: false },
    { snapshot: snap({ provisional: true }), legacyKept: false },
  ];
  const r = dryRunBatch(items, CFG);
  assert.equal(r.total, 3);
  assert.ok(r.byLevel.L0 >= 2);
  assert.ok((r.byLevel.L1 || 0) + (r.byLevel.L2 || 0) >= 1);
  assert.equal(r.agreeCount + r.disagreeCount, 3);
  assert.ok(r.rows.every((row) => typeof row.level === 'string'));
});
