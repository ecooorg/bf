#!/usr/bin/env node
/** P130.16 hygiene: Zweitwohnung/sale gates + helpers. Idempotent. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const corePath = join(dirname(fileURLToPath(import.meta.url)), '..', 'server/immofinderCore.ts');
let s = readFileSync(corePath, 'utf8');
let n = 0;
if (!s.includes('zweitwohnung|eigentumswohnung|kaufobjekt|stockwerkeigentum')) {
  const re = /export function isForSaleListing\(title: string, text: string, url: string\): boolean \{[\s\S]*?\n\}/;
  const neu = `export function isForSaleListing(title: string, text: string, url: string): boolean {
  const hay = \`\${title}\\n\${text}\\n\${url}\`;
  if (/\\bkaufpreis\\b/i.test(hay) || /\\bverkaufspreis\\b/i.test(hay)) return true;
  if (/flat-to-buy|zu-kaufen|einfamilienhaus-zu-kaufen|\\/kaufen\\/|[-_]kaufen(?:\\?|$)|ferien-wohnung[^/]*kaufen/i.test(url)) return true;
  if (/\\b(zu\\s+verkaufen|zum\\s+verkauf|for\\s+sale|to\\s+buy|verkauft)\\b/i.test(hay)) return true;
  if (/\\b(?:CHF|Fr\\.?|SFr\\.?)\\s*\\d{1,2}[.'\\s]\\d{3}[.'\\s]\\d{3}\\b/i.test(hay)) return true;
  if (/\\b\\d{1,2}\\s*mio\\.?\\b/i.test(hay) && /\\b(chf|fr\\.?|kauf|verkauf|wohnung|haus)\\b/i.test(hay)) return true;
  const explicitRent = /\\b(zu\\s+vermieten|vermiete[nt]?|nachmieter|miete\\s*(?:chf|fr\\.?|pro\\s*monat)|pro\\s*monat|mtl\\.?|monatsmiete|nettomiete)\\b/i.test(hay);
  if (/\\b(zweitwohnung|eigentumswohnung|kaufobjekt|stockwerkeigentum)\\b/i.test(hay) && !explicitRent) return true;
  if (/\\bverkauf(en|s|te)?\\b/i.test(hay) && !/\\b(verkauft\\s+worden|nicht\\s+verkaufen)\\b/i.test(hay)) {
    if (/\\b(wohnung|haus|eigentum|objekt)\\b/i.test(hay)) return true;
  }
  return false;
}`;
  if (re.test(s)) { s = s.replace(re, neu); n++; console.log('isForSaleListing'); }
}
if (!s.includes('Sale/purchase context: never treat truncated')) {
  const next = s.replace(
    /const ctx = t\.slice\(Math\.max\(0, \(m\.index \|\| 0\) - 40\), \(m\.index \|\| 0\) \+ m\[0\]\.length \+ 40\);\n    const hasRentWord/,
    `const ctx = t.slice(Math.max(0, (m.index || 0) - 70), (m.index || 0) + m[0].length + 70);
    // Sale/purchase context: never treat truncated Kaufpreis fragments as monthly rent.
    if (/\\b(kaufpreis|verkaufspreis|zum\\s+verkauf|zu\\s+verkaufen|for\\s+sale|zweitwohnung|eigentumswohnung|stockwerkeigentum|\\bmio\\.?\\b)\\b/i.test(ctx)) continue;
    const hasRentWord`
  );
  if (next !== s) { s = next; n++; console.log('parsePrice sale-context'); }
}
if (!s.includes("return 'price_sale_mismatch'")) {
  const next = s.replace(
    /if \(isForSaleListing\(title, ev, url\)\) return 'for_sale';\n  if \(isHolidayOrTourismListing/,
    `if (isForSaleListing(title, ev, url)) return 'for_sale';
  if (c.price && c.price.amount > 0 && c.price.amount < 20000) {
    if (/\\b(?:CHF|Fr\\.?)\\s*\\d{1,2}[.'\\s]\\d{3}[.'\\s]\\d{3}\\b/i.test(hay) || (/\\bkaufpreis\\b/i.test(hay) && /\\d{5,}/.test(hay))) {
      return 'price_sale_mismatch';
    }
  }
  if (isHolidayOrTourismListing`
  );
  if (next !== s) { s = next; n++; console.log('price_sale_mismatch'); }
}
if (!s.includes('export function verifyListingFromPageText')) {
  const helpers = `
export function buildCrossSourceSaleQuery(title: string): string | null {
  let t = String(title || '').replace(/\\s+/g, ' ').trim();
  t = t.replace(/\\s*[|·•].*$/, '').replace(/\\s*(-|–)\\s*(Flatfox|Homegate|Tutti|Anibis|iCasa).*$/i, '').trim();
  if (t.length < 24) return null;
  const words = t.split(/\\s+/).filter(Boolean);
  const core = words.slice(0, Math.min(12, words.length)).join(' ');
  if (core.length < 20) return null;
  return \`"\${core.slice(0, 120)}" (kaufen OR "zum Verkauf" OR Kaufpreis OR verkaufen OR Zweitwohnung)\`;
}
export function verifyListingFromPageText(opts: {
  title: string; url: string; pageText: string; municipality?: string | null;
  roomsEstimated?: number | null; price?: ParsedPrice | null; municipalities?: string[];
}): string | null {
  const title = opts.title || '';
  const page = String(opts.pageText || '').slice(0, 20000);
  const url = opts.url || '';
  if (isListingUnavailable(title, page)) return 'listing_unavailable';
  if (isForSaleListing(title, page, url)) return 'for_sale';
  if (opts.price && opts.price.amount > 0 && opts.price.amount < 15000) {
    if (/\\b(?:CHF|Fr\\.?)\\s*\\d{1,2}[.'\\s]\\d{3}[.'\\s]\\d{3}\\b/i.test(page) || /\\bkaufpreis\\b/i.test(page)) return 'price_sale_mismatch';
  }
  return credibilityRejectReason({
    title, evidenceText: page, url, municipality: opts.municipality ?? null,
    roomsEstimated: opts.roomsEstimated ?? null, price: opts.price ?? null,
    phone: null, email: null, evidenceKind: 'page_text', municipalities: opts.municipalities || [], allowSnippet: false,
  });
}
export function crossSourceIndicatesSale(title: string, hits: { title?: string; link?: string; snippet?: string }[]): boolean {
  if (!hits?.length) return false;
  const key = String(title || '').slice(0, 40).toLowerCase();
  for (const h of hits.slice(0, 8)) {
    const hay = \`\${h.title || ''}\\n\${h.snippet || ''}\\n\${h.link || ''}\`;
    if (key.length >= 12 && !hay.toLowerCase().includes(key.slice(0, 12))) continue;
    if (/\\/(kaufen|buy)\\//i.test(h.link || '')) return true;
    if (/\\b(kaufpreis|zum\\s+verkauf|zu\\s+verkaufen|for\\s+sale|zweitwohnung)\\b/i.test(hay) && !/\\b(zu\\s+vermieten|miete\\s*chf|pro\\s*monat)\\b/i.test(hay)) return true;
  }
  return false;
}
`;
  if (s.includes('export function formatHideLog')) {
    s = s.replace('export function formatHideLog', helpers + '\nexport function formatHideLog');
    n++; console.log('helpers');
  } else {
    s += '\n' + helpers; n++; console.log('helpers-append');
  }
}
writeFileSync(corePath, s);
console.log('P130.16 hygiene done', n);
