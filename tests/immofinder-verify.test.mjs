import test from 'node:test';
import assert from 'node:assert/strict';

test('P130.16 Zweitwohnung without rent is for_sale (Flims)', async () => {
  const { isForSaleListing, parsePrice, credibilityRejectReason, verifyListingFromPageText, buildCrossSourceSaleQuery, crossSourceIndicatesSale } = await import('../server/immofinderCore.ts');
  const title = 'Seltene Gelegenheit in Flims: Kernsanierte 3.5-Zimmer-Zweitwohnung';
  const snippet = "Kernsanierte 3.5-Zimmer-Zweitwohnung mit Terrasse im Herzen von Flims. 1'390";
  const url = 'https://www.tutti.ch/de/vi/10011127181';
  assert.equal(isForSaleListing(title, snippet, url), true);
  const bad = parsePrice(snippet);
  assert.ok(!bad || bad.amount !== 1390);
  assert.equal(credibilityRejectReason({
    title, evidenceText: snippet, url, municipality: 'Flims', roomsEstimated: 3.5,
    price: { amount: 1390, unit: 'month', currency: 'CHF', quote: "1'390" },
    phone: null, email: null, evidenceKind: 'snippet', municipalities: ['Flims'], allowSnippet: true,
  }), 'for_sale');
  const full = title + "\nKaufpreis CHF 1'380'000.-\nVia Nova 61, 7017 Flims Dorf.";
  assert.equal(verifyListingFromPageText({ title, url, pageText: full, price: { amount: 1390, unit: 'month', currency: 'CHF', quote: 'x' } }), 'for_sale');
  const rent = "3.5 Zimmer in Chur zu vermieten. Miete CHF 1'750.– pro Monat.";
  assert.equal(verifyListingFromPageText({ title: '3.5 Chur', url: 'https://flatfox.ch/x', pageText: rent, price: { amount: 1750, unit: 'month', currency: 'CHF', quote: 'y' } }), null);
  assert.ok(buildCrossSourceSaleQuery(title)?.includes('kaufen'));
  assert.equal(crossSourceIndicatesSale(title, [{ title: 'Flims kaufen', link: 'https://dreamo.ch/kaufen/x', snippet: 'Kaufpreis 1380000 Zweitwohnung' }]), true);
});
