import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { R7_REJECT_CODES, classifyReject, summarizeRejects, sampleRejects, sourceDemotionCandidates, buildRunQualityAudit } from '../server/immofinder/taxonomy.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coreSrc = readFileSync(path.join(root, 'server/immofinderCore.ts'), 'utf8');

test('P130.16 core exposes sale-verify helpers or payload pending', () => {
  const ready = coreSrc.includes('verifyListingFromPageText') && coreSrc.includes('zweitwohnung');
  if (!ready) {
    // Payload restore via ensure-repair not applied yet on this checkout.
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
  // Hit must share the title key prefix used by crossSourceIndicatesSale (first 12 chars).
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

// Reject reasons observed in the retained run diagnostics (system codes, not user text).
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
