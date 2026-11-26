/**
 * P129.48 — Extend the repair protocol with evidence-backed price validation for saved and new cards.
 *
 * Pure functions only (no DB, no network). The DB layer is server/immofinderRepairStore.ts.
 *
 * Contract:
 *  - `snapshotLine(row)` is the JSONL line the Assistant reads (All Logs, export-snapshot, GitHub snapshot).
 *  - `auditRow(row)` is the single rule set that decides which saved cards are fit for screen, e-mail and Drive.
 *  - Repair ops are a closed whitelist (hide | unhide | delete | clear_contact | set_price | mark_collage).
 *    No op can write an arbitrary URL or free text; `set_price` is accepted only when the amount is literally
 *    present in the card's own stored page text.
 */
import {
  type ImmoConfig,
  buildEvidenceText,
  clearOutOfCantonRegion,
  credibilityRejectReason,
  fieldCollageMismatch,
  isShortStayListing,
  shortStayPreflightReason,
  isPlatformOrJunkContact,
  isSpecificLink,
  isPortalDetailUrl,
  municipalityEvidenceMismatch,
  nonListingReason,
  parsePrice,
  resolveListingPrice,
  roomsEvidenceConflict,
} from './immofinderCore.ts';

/** Bump when the deterministic rules change: the startup audit re-runs once per version. */
export const REPAIR_RULES_VERSION = '131.8t.5';

/** Old seen-cache decisions were made under different search rules; invalidate them on rule-version changes. */
export function encodeSeenReason(reason: string): string {
  return `${REPAIR_RULES_VERSION}::${String(reason || 'unknown')}`;
}
export function decodeSeenReason(stored: unknown): string | null {
  const value = String(stored || '');
  const prefix = `${REPAIR_RULES_VERSION}::`;
  return value.startsWith(prefix) ? value.slice(prefix.length) : null;
}

export const REPAIR_OPS = ['hide', 'unhide', 'delete', 'clear_contact', 'set_price', 'mark_collage'] as const;
export type RepairOpName = (typeof REPAIR_OPS)[number];

export type RepairOp = {
  op: RepairOpName;
  id: string;
  reason: string;
  price?: { amount: number; unit: 'month' | 'week' | 'night' | 'season' };
  /** clear_contact only: which field(s) to clear; default both. */
  fields?: ('phone' | 'email')[];
};

export type RepairBatch = {
  /** Stable id, e.g. "P129.48-1". A batch is applied at most once per database. */
  batchId: string;
  generatedAt?: string;
  basedOnSnapshot?: string;
  ops: RepairOp[];
};

type Row = Record<string, any>;
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REASON = /^[a-z0-9][a-z0-9_.\-]{2,63}$/;

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const hostOf = (u: unknown): string => { try { return new URL(String(u)).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const digitsOf = (s: string): string => String(s || '').replace(/\D+/g, '');

/** Canonical form for comparing the same URL written slightly differently (tracking params, trailing slash, host case). */
export function normalizeUrl(u: unknown): string {
  try {
    const x = new URL(String(u).trim());
    x.hash = '';
    for (const k of [...x.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$|source$)/i.test(k)) x.searchParams.delete(k);
    return `${x.hostname.replace(/^www\./, '').toLowerCase()}${x.pathname.replace(/\/+$/, '')}${x.search}`;
  } catch { return String(u || '').trim().toLowerCase(); }
}

/** A canonical redirect is the same listing only when a stable ID or distinctive slug survives on the same host. */
export function sameListingUrlTarget(requested: string, evidence: string): boolean {
  if (normalizeUrl(requested) === normalizeUrl(evidence)) return true;
  try {
    const a = new URL(requested); const b = new URL(evidence);
    if (a.hostname.replace(/^www\./i, '').toLowerCase() !== b.hostname.replace(/^www\./i, '').toLowerCase()) return false;
    const numericIds = (u: URL) => new Set(`${u.pathname} ${u.search}`.match(/(?<!\d)\d{6,}(?!\d)/g) || []);
    const leftIds = numericIds(a); const rightIds = numericIds(b);
    if ([...leftIds].some((id) => rightIds.has(id))) return true;
    const generic = new Set(['de','fr','it','en','rent','mieten','louer','affittare','buy','kaufen','acheter','acquistare','flat','wohnung','apartment','house','immobilien','real-estate','detail','listing','objekt','angebot','annonce','annunci','search','suche','results','resultate','sale']);
    const stableSlugs = (u: URL) => new Set(u.pathname.split('/').filter(Boolean).map((part) => { try { return decodeURIComponent(part).toLowerCase(); } catch { return part.toLowerCase(); } }).filter((part) => {
      const hyphens = (part.match(/-/g) || []).length;
      return part.length >= 6 && !generic.has(part) && (/\d/.test(part) || hyphens >= 3);
    }));
    const leftSlugs = stableSlugs(a); const rightSlugs = stableSlugs(b);
    return [...leftSlugs].some((slug) => rightSlugs.has(slug));
  } catch { return false; }
}

/** True when the phone number (any formatting) occurs in the text. */
export function phoneInText(phone: string, text: string): boolean {
  const p = digitsOf(phone).replace(/^0041/, '41').replace(/^0(?=\d{9}$)/, '41');
  if (p.length < 9) return false;
  const tail = p.slice(-9);
  const hay = digitsOf(text);
  return hay.includes(tail);
}
export function emailInText(email: string, text: string): boolean {
  const e = String(email || '').trim().toLowerCase();
  return Boolean(e) && String(text || '').toLowerCase().includes(e);
}

export function maskPhone(p: string | null | undefined): string | null {
  const d = String(p || '').trim();
  if (!d) return null;
  const digits = digitsOf(d);
  return `${d.startsWith('+') ? '+' : ''}${'*'.repeat(Math.max(0, digits.length - 2))}${digits.slice(-2)}`;
}
export function maskEmail(e: string | null | undefined): string | null {
  const s = String(e || '').trim();
  if (!s) return null;
  const [user, domain] = s.split('@');
  return domain ? `${user.slice(0, 1)}***@${domain}` : '***';
}
/** Replace phone numbers and e-mail addresses inside free text (used for the GitHub snapshot). */
export function maskContactsInText(text: string): string {
  return String(text || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (m) => maskEmail(m) || '')
    .replace(/(?:\+|00)?\d[\d\s().\/-]{7,}\d/g, (m) => {
      const digits = digitsOf(m);
      if (digits.length < 9 || digits.length > 14) return m; // prices, dates, areas stay readable
      return `${'*'.repeat(digits.length - 2)}${digits.slice(-2)}`;
    });
}

// ---------------------------------------------------------------------------
// Price: find the real rent when a side amount (parking, utilities, deposit) was picked
// ---------------------------------------------------------------------------

const SIDE_COST_CONTEXT = /(parkplatz|parking|garage|einstellhalle|tiefgarage|autoeinstellplatz|aussenparkplatz|abstellplatz|stellplatz|carport|nebenkosten|\bnk\b|akonto|heizkosten|reinigung|kaution|mietzinsdepot|depot|provision|geb[uü]hr|bearbeitung|verwaltung|zusatzkosten|internet|waschk[uü]che|bastelraum|estrich|keller)/i;
const RENT_CONTEXT = /(mietpreis|nettomiete|nettomietzins|bruttomiete|monatsmiete|warmmiete|kaltmiete|mietzins|miete|preis|pro\s*monat|\/\s*monat|mtl|monatlich|rent|loyer)/i;

export type PriceCandidate = { amount: number; unit: 'month' | 'week' | 'night' | 'season' | 'unknown'; quote: string; index: number; side: boolean; rentLabelled: boolean };

/** Every currency-marked amount in the text with a flag whether it sits next to parking / utilities / deposit words. */
export function priceCandidates(text: string): PriceCandidate[] {
  const t = String(text || '')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u00A0\u202F\u2009]/g, ' ');
  const out: PriceCandidate[] = [];
  const num = (raw: string): number => {
    let w = raw.replace(/['\s]/g, '');
    if (/^\d{1,3}(\.\d{3})+$/.test(w)) w = w.replace(/\./g, '');
    return Number(w);
  };
  const re = /(?:(CHF|Fr\.?|SFr\.?|EUR|€)\s*(\d{1,3}(?:['\s.]\d{3})+|\d{2,5})(?:[.,]\d{1,2})?)|(?:(\d{1,3}(?:['\s.]\d{3})+|\d{2,5})(?:[.,]\d{1,2})?\s*(?:\.[-–]|[-–])?\s*(CHF|Fr\.?|SFr\.?|EUR|€)\b)/gi;
  for (const m of t.matchAll(re)) {
    const amount = num(m[2] || m[3]);
    if (!(amount >= 50 && amount < 100000)) continue;
    const idx = m.index || 0;
    const before = t.slice(Math.max(0, idx - 45), idx);
    const after = t.slice(idx + m[0].length, idx + m[0].length + 30);
    const around = `${before} ${m[0]} ${after}`;
    // A side-cost word counts when it is in the same short clause, i.e. after the last sentence/line break before the amount.
    const clauseBefore = before.split(/[\n.;|•]/).pop() || '';
    const clauseAfter = after.split(/[\n.;|•]/)[0] || '';
    const side = SIDE_COST_CONTEXT.test(`${clauseBefore} ${clauseAfter}`);
    let unit: PriceCandidate['unit'] = 'unknown';
    if (/pro\s*nacht|\/\s*nacht|per\s*night|nacht\b/i.test(around)) unit = 'night';
    else if (/pro\s*woche|\/\s*woche|per\s*week|woche\b/i.test(around)) unit = 'week';
    else if (/saison|season/i.test(around)) unit = 'season';
    else if (/pro\s*monat|\/\s*monat|per\s*month|monatlich|mtl|monatsmiete|miete|mietzins|nettomiete|bruttomiete|warmmiete|kaltmiete/i.test(around) || (amount >= 500 && amount <= 8000)) unit = 'month';
    out.push({ amount, unit, quote: m[0].replace(/\s+/g, ' ').trim().slice(0, 60), index: idx, side, rentLabelled: RENT_CONTEXT.test(`${clauseBefore} ${m[0]}`) });
  }
  return out;
}

/** True when `amount` is literally written in the text (thousands separators ignored). */
export function amountInText(amount: number, text: string): boolean {
  const a = Math.round(Number(amount));
  if (!Number.isFinite(a) || a <= 0) return false;
  const plain = String(a);
  const grouped = a >= 1000 ? `${Math.floor(a / 1000)}['’\\s.]?${String(a % 1000).padStart(3, '0')}` : plain;
  return new RegExp(`(?<![\\d])${grouped}(?![\\d])`).test(String(text || '').replace(/[\u00A0\u202F\u2009]/g, ' '));
}

export type PriceVerdict =
  | { status: 'ok' }
  | { status: 'missing' }
  | { status: 'repair'; price: { amount: number; unit: 'month' | 'week' | 'night' | 'season' }; why: string }
  | { status: 'suspect'; why: string };

/**
 * Compare the stored price with the card's own page text.
 *  - stored amount sits in a parking / utilities / deposit clause and exactly one rent-like amount exists → repair
 *  - stored amount is a calendar year or far below 400 while a rent exists → repair
 *  - several candidate rents → suspect unless exactly one is explicitly gross / warm rent
 */
export function priceVerdict(row: Row): PriceVerdict {
  const raw = obj(row.raw);
  const price = obj(raw.price);
  const storedValue = price.amount ?? row.rent_monthly_chf;
  const stored = storedValue != null ? Number(storedValue) : NaN;
  const rawUnit = String(price.unit || '').toLowerCase();
  const rowUnit = String(row.pricing_unit || '').toLowerCase();
  const validUnits = ['month', 'week', 'night', 'season'];
  const storedUnit = validUnits.includes(rawUnit) ? rawUnit : rowUnit;
  const storedUnitUnknown = !validUnits.includes(storedUnit);
  const evidence = String(raw.evidence_text || row.description_de || '');
  if (!evidence.trim()) return Number.isFinite(stored) && stored > 0 ? { status: 'ok' } : { status: 'missing' };
  const cands = priceCandidates(evidence);
  const rentCands = cands.filter((c) => !c.side && c.unit !== 'unknown' && c.amount >= 400 && c.amount <= 9000);
  const distinct = [...new Map(rentCands.map((c) => [`${c.amount}:${c.unit}`, c])).values()];
  const grossCandidates = distinct.filter((c) => /\b(bruttomiete|bruttomietzins|warmmiete)\b/i.test(evidence.slice(Math.max(0, c.index - 60), c.index)));
  const pick = (list: PriceCandidate[]): PriceCandidate | null => {
    const gross = list.filter((c) => /\b(bruttomiete|bruttomietzins|warmmiete)\b/i.test(evidence.slice(Math.max(0, c.index - 60), c.index)));
    if (gross.length === 1) return gross[0];
    if (list.length === 1) return list[0];
    const labelled = list.filter((c) => c.rentLabelled);
    const labelledDistinct = [...new Map(labelled.map((c) => [`${c.amount}:${c.unit}`, c])).values()];
    if (labelledDistinct.length === 1) return labelledDistinct[0];
    // Two+ explicitly labelled rents (e.g. CHF 1450 and CHF 1650 both "Miete") stay ambiguous (P129.49).
    if (labelledDistinct.length > 1) return null;
    // P130.10: unlabelled monthly amounts — main rent is almost always the largest in the 900–4500 band (garage/NK are smaller).
    const band = list.filter((c) => c.unit === 'month' && c.amount >= 900 && c.amount <= 4500);
    if (band.length >= 1) {
      band.sort((a, b) => b.amount - a.amount);
      // Main rent is usually the largest monthly figure; garage/NK gaps are often 200–600 CHF.
      if (band.length === 1) return band[0];
      if (band[0].amount >= band[1].amount * 1.12) return band[0];
      if (band[0].amount - band[1].amount >= 250) return band[0];
      // Exactly two monthly amounts in band → prefer the higher (typical CH portal layout).
      if (band.length === 2) return band[0];
    }
    return null;
  };
  // P130.10: prefer labelled/gross/largest main rent; only mark ambiguous when pick cannot choose.
  if (Number.isFinite(stored) && stored > 0 && distinct.length > 1) {
    const one = pick(distinct);
    if (!one) return { status: 'suspect', why: 'price_ambiguous_on_detail_page' };
    if (one.amount !== stored) {
      return { status: 'repair', price: { amount: one.amount, unit: one.unit as 'month' | 'week' | 'night' | 'season' }, why: 'prefer_labelled_or_largest_main_rent' };
    }
  }
  if (Number.isFinite(stored) && stored > 0 && grossCandidates.length === 1 && stored !== grossCandidates[0].amount) {
    const gross = grossCandidates[0];
    return { status: 'repair', price: { amount: gross.amount, unit: gross.unit as 'month' | 'week' | 'night' | 'season' }, why: 'gross_rent_preferred' };
  }
  if (!Number.isFinite(stored) || stored <= 0) {
    const one = pick(distinct);
    return one && one.unit !== 'unknown'
      ? { status: 'repair', price: { amount: one.amount, unit: one.unit as 'month' | 'week' | 'night' | 'season' }, why: 'price_missing_but_in_evidence' }
      : { status: 'missing' };
  }
  const sameAmount = cands.filter((c) => c.amount === stored);
  const storedIsSide = sameAmount.length > 0 && sameAmount.every((c) => c.side);
  const storedIsYear = stored >= 2020 && stored <= 2035 && !sameAmount.some((c) => c.rentLabelled);
  const storedTiny = stored < 400 && (storedUnit === 'month' || !storedUnit);
  // Page text is stored truncated (4000 chars): absence of the amount only counts when the text is complete.
  const complete = evidence.length < 3900 && !evidence.endsWith('…');
  const storedAbsent = complete && !amountInText(stored, evidence);
  if (storedIsSide || storedIsYear || storedTiny || storedAbsent || storedUnitUnknown) {
    const one = pick(distinct);
    if (one && (one.amount !== stored || one.unit !== storedUnit) && one.unit !== 'unknown') {
      const why = storedIsSide ? 'parking_amount_was_picked' : storedIsYear ? 'calendar_year_as_price' : storedTiny ? 'fragment_as_price' : storedUnitUnknown ? 'price_unit_unknown' : 'price_not_in_evidence';
      return { status: 'repair', price: { amount: one.amount, unit: one.unit as 'month' | 'week' | 'night' | 'season' }, why };
    }
    return { status: 'suspect', why: storedIsSide ? 'price_from_parking' : storedIsYear ? 'calendar_year_as_price' : storedTiny ? 'fragment_as_price' : storedUnitUnknown ? 'price_unit_unknown' : 'price_not_in_evidence' };
  }
  return { status: 'ok' };
}

// ---------------------------------------------------------------------------
// Contacts: must come from this card's own page (or a recorded enrichment source)
// ---------------------------------------------------------------------------

export type ContactVerdict = {
  phone: 'none' | 'verified' | 'enrichment_unverified' | 'not_in_evidence' | 'platform';
  email: 'none' | 'verified' | 'enrichment_unverified' | 'not_in_evidence' | 'platform';
};

export function contactVerdict(row: Row): ContactVerdict {
  const raw = obj(row.raw);
  const evidence = `${String(raw.evidence_text || '')}\n${String(row.description_de || '')}\n${String(row.property_name || '')}`;
  // No stored page text → nothing to verify against; never clear on missing evidence.
  const canVerify = String(raw.evidence_text || '').trim().length >= 80;
  const own = normalizeUrl(row.listing_url);
  const ce: { type?: string; value?: string; url?: string }[] = Array.isArray(row.contact_evidence) ? row.contact_evidence : [];
  const verdict = (kind: 'phone' | 'email', value: unknown): ContactVerdict['phone'] => {
    const v = String(value || '').trim();
    if (!v) return 'none';
    if (kind === 'email' ? isPlatformOrJunkContact(v, null) : isPlatformOrJunkContact(null, v)) return 'platform';
    const inPage = kind === 'email' ? emailInText(v, evidence) : phoneInText(v, evidence);
    if (inPage) return 'verified';
    const hits = ce.filter((e) => e && e.type === kind && (kind === 'email' ? String(e.value || '').trim().toLowerCase() === v.toLowerCase() : digitsOf(String(e.value || '')).slice(-9) === digitsOf(v).slice(-9)));
    if (hits.some((e) => normalizeUrl(e.url) === own)) return 'verified';
    if (hits.length || !canVerify) return 'enrichment_unverified';
    return 'not_in_evidence';
  };
  return { phone: verdict('phone', row.direct_phone), email: verdict('email', row.direct_email) };
}

// ---------------------------------------------------------------------------
// Audit: flags + automatic ops for one stored card
// ---------------------------------------------------------------------------

export type RowAudit = {
  id: string;
  flags: string[];
  /** First hard reason that makes the card unfit to show (maps to a `hide` op), or null. */
  hardReason: string | null;
  ops: RepairOp[];
};

export type AuditContext = { municipalities: string[]; portalHosts?: string[] };

function aboutDuplicated(name: string, desc: string): boolean {
  const t = String(desc || '').replace(/\s+/g, ' ').trim();
  if (t.length < 40) return false;
  const mid = Math.floor(t.length / 2);
  const fp = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüàèé]+/gi, ' ').replace(/\s+/g, ' ').trim();
  const a = fp(t.slice(0, mid)); const b = fp(t.slice(mid));
  if (a && b && (a === b || a.startsWith(b.slice(0, 24)) || b.startsWith(a.slice(0, 24)))) return true;
  const n = fp(name);
  return n.length > 20 && fp(t).split(n).length > 2;
}

/** The hard rules shared by the startup audit, the Recheck button and the pre-delivery gate. */
export function hardRejectReason(row: Row, ctx: AuditContext): string | null {
  const title = String(row.property_name || '');
  const url = String(row.listing_url || '');
  const raw = obj(row.raw);
  const pageEvidence = String(raw.evidence_text || '');
  const text = String(pageEvidence || row.description_de || '');
  const hay = `${title}\n${text}`;
  if (!url || !/^https?:\/\//i.test(url)) return 'url_missing_or_invalid';
  let why: string | null = nonListingReason(title, url);
  const evidenceKind = String(raw.evidence_kind || 'link_only');
  const provisionalSnippet = raw.provisional === true && evidenceKind === 'snippet';
  if (!why && !provisionalSnippet && !isSpecificLink(url) && !isPortalDetailUrl(url, ctx.portalHosts || []) && /facebook\.com|tutti\.ch|flatfox|icasa|homegate|booking\.com|ferienhausmiete|happyholiday|traum-ferienwohnungen|gruppenhaus|cozycozy|rentola/i.test(url)) why = 'list_or_search_page';
  if (!why && clearOutOfCantonRegion(hay)) why = 'foreign_region';

  // A search result is only a discovery hint. It is never proof that the target
  // listing exists, or that its facts and price belong to this exact URL.
  const evidenceUrl = String(raw.evidence_url || '');
  if (!why && evidenceKind !== 'page_text' && !provisionalSnippet) why = 'detail_page_not_verified';
  if (!why && pageEvidence.trim().length < (provisionalSnippet ? 18 : 30)) why = 'detail_page_evidence_too_short';
  if (!why && !evidenceUrl) why = 'detail_page_url_missing';
  if (!why && !sameListingUrlTarget(url, evidenceUrl)) why = 'detail_page_url_mismatch';

  const rooms = Number(row.rooms_estimated);
  // Real long-term rental ads always state room count; 0 / missing is not a presentable card.
  if (!why && (!Number.isFinite(rooms) || rooms <= 0)) why = 'rooms_unknown';
  if (!why && Number.isFinite(rooms) && rooms >= 8) why = 'rooms_too_many';
  if (!why && roomsEvidenceConflict(title, pageEvidence, Number.isFinite(rooms) ? rooms : null)) why = 'rooms_conflict';
  if (!why && municipalityEvidenceMismatch(row.municipality, pageEvidence, ctx.municipalities)) why = 'municipality_mismatch';

  // Verify any stored price against this page. Swiss portals often show net rent, gross rent and side costs together;
  // multiple rent amounts are not by themselves proof that the listing is invalid. Undisclosed long-term rent is allowed.
  // Seasonal/night/week offers are allowed, but only with their own period and verified contact.
  let pagePrice = resolveListingPrice(pageEvidence, null) || parsePrice(pageEvidence);
  const shortStay = isShortStayListing(title, url, pageEvidence, pagePrice);
  if (!why) {
    const rentCandidates = [...new Map(priceCandidates(pageEvidence)
      .filter((c) => !c.side && c.unit !== 'unknown' && c.amount >= (c.unit === 'night' ? 50 : c.unit === 'week' || c.unit === 'season' ? 100 : 400) && c.amount <= 100000)
      .map((c) => [`${c.amount}:${c.unit}`, c])).values()];
    const hasStoredPrice = raw.price?.amount != null || row.rent_monthly_chf != null;
    if (rentCandidates.length === 0 && hasStoredPrice) {
      const quote = String(raw.price_quote || obj(raw.price).quote || '');
      const fromQuote = quote ? (resolveListingPrice(quote, null) || parsePrice(quote + '\n' + pageEvidence.slice(0, 2000))) : null;
      if (!fromQuote || !fromQuote.amount) why = 'price_not_confirmed_on_detail_page';
    }
  }

  if (!why) {
    const evidenceText = buildEvidenceText(title, pageEvidence, 4000);
    pagePrice = resolveListingPrice(evidenceText, null) || parsePrice(evidenceText);
    why = credibilityRejectReason({
      title, evidenceText, url,
      municipality: row.municipality || null,
      roomsEstimated: Number.isFinite(rooms) ? rooms : null,
      price: pagePrice,
      phone: null, email: null,
      evidenceKind: provisionalSnippet ? 'snippet' : 'page_text',
      municipalities: ctx.municipalities,
      allowSnippet: provisionalSnippet,
      allowShortStay: shortStay,
    });
  }
  if (!why) {
    const preflight = shortStayPreflightReason({ shortStay, price: pagePrice, url, evidenceKind: provisionalSnippet ? 'snippet' : 'page_text', evidenceText: pageEvidence });
    if (preflight) why = preflight;
  }
  if (!why) {
    const pv = priceVerdict(row);
    if (pv.status === 'suspect') {
      // C131: price optionalForL1 — ambiguity is soft, never hide a verified listing
      if (pv.why !== 'price_ambiguous_on_detail_page' && !/ambiguous/i.test(String(pv.why || ''))) {
        why = pv.why.startsWith('price_') ? pv.why : `price_${pv.why}`;
      }
    }
    else if (pv.status !== 'missing') {
      const rawUnit = String(obj(raw.price).unit || '').toLowerCase();
      const rowUnit = String(row.pricing_unit || '').toLowerCase();
      const unit = pv.status === 'repair'
        ? pv.price.unit
        : (['month', 'week', 'night', 'season'].includes(rawUnit) ? rawUnit : rowUnit);
      if (!shortStay && ['week', 'night', 'season'].includes(unit)) why = 'non_monthly_price';
      // C131: short_stay_contact_required retired (optionalForL1)
    }
  }
  return why;
}

/** One saved card → quality flags and the automatic repair ops that follow from them. Deterministic, no network. */
export function auditRow(row: Row, ctx: AuditContext): RowAudit {
  const id = String(row.id || '');
  const flags: string[] = [];
  const ops: RepairOp[] = [];
  const raw = obj(row.raw);
  const evidence = String(raw.evidence_text || '');
  const title = String(row.property_name || '');
  const url = String(row.listing_url || '');

  if (isSpecificLink(url) || isPortalDetailUrl(url, ctx.portalHosts || [])) flags.push('url_ok'); else flags.push('url_not_specific');
  if (nonListingReason('', url) === 'service_or_aggregator') flags.push('url_service_host');

  const hard = hardRejectReason(row, ctx);
  if (hard) {
    flags.push(`reject:${hard}`);
    if (/municipality|collage|rooms_conflict/.test(hard)) flags.push('possible_collage');
  } else {
    // soft collage signals that do not reach the hide threshold
    if (municipalityEvidenceMismatch(row.municipality, evidence, ctx.municipalities)) flags.push('possible_collage');
    if (fieldCollageMismatch({ municipality: row.municipality, title, evidence, url, municipalities: ctx.municipalities })) flags.push('possible_collage');
    if (roomsEvidenceConflict(title, evidence, Number.isFinite(Number(row.rooms_estimated)) ? Number(row.rooms_estimated) : null)) flags.push('possible_collage');
  }

  // Price
  const pv = priceVerdict(row);
  if (pv.status === 'missing') flags.push('no_price');
  if (pv.status === 'suspect') {
    const flag = pv.why === 'price_from_parking' ? 'price_from_parking' : pv.why.startsWith('price_') ? pv.why : `price_${pv.why}`;
    flags.push(`${flag}?`);
  }
  if (pv.status === 'repair') {
    const flag = pv.why === 'parking_amount_was_picked' ? 'price_from_parking' : pv.why.startsWith('price_') ? pv.why : `price_${pv.why}`;
    flags.push(flag);
    if (!hard) ops.push({ op: 'set_price', id, price: pv.price, reason: pv.why });
  }

  // Contacts
  const cv = contactVerdict(row);
  const clear: ('phone' | 'email')[] = [];
  if (cv.phone === 'platform' || cv.email === 'platform') flags.push('contact_platform');
  if (cv.phone === 'not_in_evidence' || cv.email === 'not_in_evidence') flags.push('contact_not_in_evidence');
  if (cv.phone === 'enrichment_unverified' || cv.email === 'enrichment_unverified') flags.push('enrichment_unverified');
  if (cv.phone === 'platform' || cv.phone === 'not_in_evidence') clear.push('phone');
  if (cv.email === 'platform' || cv.email === 'not_in_evidence') clear.push('email');
  if (clear.length && !hard) {
    const reason = (cv.phone === 'platform' || cv.email === 'platform') && !(cv.phone === 'not_in_evidence' || cv.email === 'not_in_evidence') ? 'platform_contact' : 'contact_not_in_evidence';
    ops.push({ op: 'clear_contact', id, fields: clear, reason });
  }

  if (aboutDuplicated(title, String(row.description_de || ''))) flags.push('duplicated_about');
  if (!Number.isFinite(Number(row.rooms_estimated)) || Number(row.rooms_estimated) <= 0) flags.push('no_rooms');
  if (!String(row.direct_phone || '').trim() && !String(row.direct_email || '').trim()) flags.push('no_contact');
  if (!(row.listed_at || raw.listed_at)) flags.push('no_published_date');

  if (hard) {
    const collage = /municipality_collage|municipality_mismatch|rooms_conflict/.test(hard);
    ops.unshift({ op: collage ? 'mark_collage' : 'hide', id, reason: hard });
  }
  return { id, flags: [...new Set(flags)], hardReason: hard, ops };
}

/** True when a visible card must not be sent to screen / e-mail / Drive. */
export function isPresentable(row: Row, ctx: AuditContext): boolean {
  return !row.hidden && !hardRejectReason(row, ctx);
}

// ---------------------------------------------------------------------------
// Snapshot (JSONL) — what the Assistant reads
// ---------------------------------------------------------------------------

export function snapshotLine(row: Row, ctx: AuditContext, opts: { redact?: boolean } = {}): Record<string, unknown> {
  const raw = obj(row.raw);
  const price = obj(raw.price);
  const audit = auditRow(row, ctx);
  const cv = contactVerdict(row);
  const m = (s: string) => (opts.redact ? maskContactsInText(s) : s);
  const listedAt = row.listed_at || raw.listed_at || null;
  const flags = [...audit.flags];
  const ce: { type?: string; value?: string; url?: string }[] = Array.isArray(row.contact_evidence) ? row.contact_evidence : [];
  return {
    id: row.id,
    listing_url: row.listing_url,
    source_urls: Array.isArray(row.source_urls) ? row.source_urls : [],
    municipality: row.municipality || null,
    street_address: row.street_address ? m(String(row.street_address)) : null,
    personal_website: row.personal_website || null,
    property_name: m(String(row.property_name || '')),
    description_de: m(String(row.description_de || '')),
    rooms_estimated: row.rooms_estimated != null && row.rooms_estimated !== '' ? Number(row.rooms_estimated) : null,
    rent_monthly_chf: price.monthlyChf ?? (price.unit === 'month' ? price.amount ?? null : null),
    pricing_unit: price.unit || null,
    owner_name: opts.redact ? (row.owner_name ? String(row.owner_name).slice(0, 1) + '***' : null) : (row.owner_name || null),
    direct_phone: opts.redact ? maskPhone(row.direct_phone) : (row.direct_phone || null),
    direct_email: opts.redact ? maskEmail(row.direct_email) : (row.direct_email || null),
    contact_status: row.contact_status || null,
    contact_check: { phone: cv.phone, email: cv.email },
    contact_evidence: ce.slice(0, 6).map((e) => ({ type: e.type, value: opts.redact ? (e.type === 'email' ? maskEmail(e.value) : maskPhone(e.value)) : e.value, url: e.url })),
    listed_at: listedAt,
    first_seen_at: row.first_seen_at ? new Date(row.first_seen_at).toISOString() : null,
    last_seen_at: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
    status: row.status || null,
    hidden: Boolean(row.hidden),
    hide_reason: row.hide_reason ? String(row.hide_reason) : null,
    source_ids: Array.isArray(row.source_ids) ? row.source_ids : [],
    photo_count: Array.isArray(row.photo_urls) ? row.photo_urls.length : 0,
    raw: {
      price: price.amount != null ? { amount: price.amount, unit: price.unit || null, quote: price.quote || null } : null,
      evidence_text: m(String(raw.evidence_text || '').slice(0, 2500)),
      evidence_kind: raw.evidence_kind || null,
      evidence_url: raw.evidence_url || null,
      via: raw.via || null,
      listed_at_source: raw.listed_at_source || null,
      repair: raw.repair || null,
    },
    quality_flags: flags,
  };
}

export function snapshotJsonl(rows: Row[], ctx: AuditContext, opts: { redact?: boolean } = {}): string {
  return rows.map((r) => JSON.stringify(snapshotLine(r, ctx, opts))).join('\n') + (rows.length ? '\n' : '');
}

export type SnapshotMeta = {
  schema: 1;
  generatedAt: string;
  rulesVersion: string;
  redacted: boolean;
  commit: string | null;
  counts: { total: number; visible: number; hidden: number; needsRepair: number; flagged: Record<string, number> };
  repairHistory: { batchId: string; kind: string; appliedAt: string; summary: unknown }[];
};

export function repairQueue(rows: Row[], ctx: AuditContext): { generatedAt: string; rulesVersion: string; items: { id: string; url: string; flags: string[]; proposedOps: RepairOp[] }[] } {
  const items = [] as { id: string; url: string; flags: string[]; proposedOps: RepairOp[] }[];
  for (const r of rows) {
    if (r.hidden) continue;
    const a = auditRow(r, ctx);
    const actionable = a.ops.length > 0 || a.flags.some((f) => /^reject:|possible_collage|price_from_parking\?|enrichment_unverified|duplicated_about/.test(f));
    if (actionable) items.push({ id: String(r.id), url: String(r.listing_url || ''), flags: a.flags, proposedOps: a.ops });
  }
  return { generatedAt: new Date().toISOString(), rulesVersion: REPAIR_RULES_VERSION, items };
}

export function snapshotMeta(rows: Row[], ctx: AuditContext, history: SnapshotMeta['repairHistory'], opts: { redact?: boolean; commit?: string | null } = {}): SnapshotMeta {
  const flagged: Record<string, number> = {};
  let needsRepair = 0; let hidden = 0;
  for (const r of rows) {
    if (r.hidden) { hidden++; continue; }
    const a = auditRow(r, ctx);
    if (a.ops.length) needsRepair++;
    for (const f of a.flags) flagged[f] = (flagged[f] || 0) + 1;
  }
  return {
    schema: 1, generatedAt: new Date().toISOString(), rulesVersion: REPAIR_RULES_VERSION, redacted: Boolean(opts.redact), commit: opts.commit ?? null,
    counts: { total: rows.length, visible: rows.length - hidden, hidden, needsRepair, flagged },
    repairHistory: history,
  };
}

// ---------------------------------------------------------------------------
// Ops: validation, preview (pure), row patch
// ---------------------------------------------------------------------------

export type OpIssue = { index: number; error: string };

/** Whitelist validation of untrusted ops (from an Assistant file or an API body). */
export function validateOps(input: unknown, max = 2000): { ops: RepairOp[]; issues: OpIssue[] } {
  const issues: OpIssue[] = [];
  const ops: RepairOp[] = [];
  if (!Array.isArray(input)) return { ops, issues: [{ index: -1, error: 'ops must be an array' }] };
  if (input.length > max) issues.push({ index: -1, error: `too many ops (max ${max})` });
  input.slice(0, max).forEach((o, index) => {
    const x = obj(o);
    const keys = Object.keys(x);
    const allowed = new Set(['op', 'id', 'reason', 'price', 'fields']);
    const extra = keys.filter((k) => !allowed.has(k));
    if (extra.length) return issues.push({ index, error: `unsupported field(s): ${extra.join(',')}` });
    if (!(REPAIR_OPS as readonly string[]).includes(String(x.op))) return issues.push({ index, error: `unsupported op: ${String(x.op).slice(0, 30)}` });
    if (!UUID.test(String(x.id || ''))) return issues.push({ index, error: 'id must be a listing uuid' });
    if (!REASON.test(String(x.reason || ''))) return issues.push({ index, error: 'reason must be a short code like contact_not_in_evidence' });
    const op: RepairOp = { op: x.op as RepairOpName, id: String(x.id).toLowerCase(), reason: String(x.reason) };
    if (op.op === 'set_price') {
      const p = obj(x.price);
      const amount = Number(p.amount);
      const unit = String(p.unit || '');
      if (!(amount >= 50 && amount < 100000) || !['month', 'week', 'night', 'season'].includes(unit)) return issues.push({ index, error: 'set_price needs price {amount, unit: month|week|night|season}' });
      op.price = { amount: Math.round(amount), unit: unit as 'month' };
    } else if (x.price !== undefined) return issues.push({ index, error: 'price is only allowed on set_price' });
    if (op.op === 'clear_contact') {
      const f = Array.isArray(x.fields) ? x.fields.map(String) : ['phone', 'email'];
      if (!f.length || f.some((v) => v !== 'phone' && v !== 'email')) return issues.push({ index, error: 'fields must be phone and/or email' });
      op.fields = [...new Set(f)] as ('phone' | 'email')[];
    } else if (x.fields !== undefined) return issues.push({ index, error: 'fields is only allowed on clear_contact' });
    ops.push(op);
  });
  return { ops, issues };
}

/** Parse a repair-ops file: `{batches:[{batchId, ops}]}`, `{batchId, ops}` or `{ops}` (batchId derived from content). */
export function parseRepairFile(text: string): { batches: RepairBatch[]; issues: string[] } {
  const issues: string[] = [];
  let data: any;
  try { data = JSON.parse(text); } catch { return { batches: [], issues: ['repair file is not valid JSON'] }; }
  const list: any[] = Array.isArray(data?.batches) ? data.batches : data && typeof data === 'object' ? [data] : [];
  const batches: RepairBatch[] = [];
  for (const b of list) {
    const { ops, issues: oi } = validateOps(b?.ops);
    for (const i of oi) issues.push(`batch ${String(b?.batchId || '?')}: op ${i.index}: ${i.error}`);
    const batchId = String(b?.batchId || '').trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_.\-]{2,63}$/.test(batchId)) { issues.push(`batch id missing or invalid: ${batchId.slice(0, 30)}`); continue; }
    batches.push({ batchId, generatedAt: b?.generatedAt ? String(b.generatedAt) : undefined, basedOnSnapshot: b?.basedOnSnapshot ? String(b.basedOnSnapshot) : undefined, ops });
  }
  return { batches, issues };
}

export type RowPatch = {
  delete?: boolean;
  hidden?: boolean;
  hide_reason?: string | null;
  direct_phone?: string | null;
  direct_email?: string | null;
  contact_status?: string;
  rent_monthly_chf?: number | null;
  pricing_unit?: string;
  raw?: Record<string, unknown>;
};

export type OpResult = {
  op: RepairOpName; id: string; reason: string;
  status: 'applied' | 'unchanged' | 'rejected' | 'not_found';
  detail?: string;
  before?: Record<string, unknown>; after?: Record<string, unknown>;
  patch?: RowPatch;
};

/** Evaluate one op against the current row. Returns the patch to write (or none) — never touches a DB. */
export function evaluateOp(op: RepairOp, row: Row | undefined, ctx: AuditContext, tag: { source: string; batchId?: string }): OpResult {
  const base = { op: op.op, id: op.id, reason: op.reason };
  if (!row) return { ...base, status: 'not_found' };
  const raw = obj(row.raw);
  const stamp = { at: new Date().toISOString(), rules: REPAIR_RULES_VERSION, source: tag.source, batch: tag.batchId || null, op: op.op, reason: op.reason };
  const withStamp = (extra: Record<string, unknown> = {}) => ({ ...raw, ...extra, repair: stamp });

  switch (op.op) {
    case 'delete':
      return { ...base, status: 'applied', before: { hidden: Boolean(row.hidden), url: String(row.listing_url || '').slice(0, 120) }, after: { deleted: true }, patch: { delete: true } };
    case 'hide':
    case 'mark_collage': {
      const reason = op.op === 'mark_collage' && !/collage/.test(op.reason) ? `field_collage:${op.reason}`.slice(0, 64) : op.reason;
      if (row.hidden && String(row.hide_reason || '') === reason) return { ...base, status: 'unchanged' };
      return { ...base, status: 'applied', before: { hidden: Boolean(row.hidden), hide_reason: row.hide_reason || null }, after: { hidden: true, hide_reason: reason },
        patch: { hidden: true, hide_reason: reason, raw: withStamp(op.op === 'mark_collage' ? { quality_flag: 'field_collage' } : {}) } };
    }
    case 'unhide': {
      if (!row.hidden) return { ...base, status: 'unchanged' };
      const hard = hardRejectReason(row, ctx);
      if (hard) return { ...base, status: 'rejected', detail: `card still fails quality rule: ${hard}` };
      return { ...base, status: 'applied', before: { hidden: true, hide_reason: row.hide_reason || null }, after: { hidden: false }, patch: { hidden: false, hide_reason: null, raw: withStamp() } };
    }
    case 'clear_contact': {
      const fields = op.fields || ['phone', 'email'];
      const patch: RowPatch = {};
      const before: Record<string, unknown> = {}; const after: Record<string, unknown> = {};
      let phone = row.direct_phone || null; let email = row.direct_email || null;
      if (fields.includes('phone') && phone) { before.direct_phone = maskPhone(phone); after.direct_phone = null; phone = null; patch.direct_phone = null; }
      if (fields.includes('email') && email) { before.direct_email = maskEmail(email); after.direct_email = null; email = null; patch.direct_email = null; }
      if (!Object.keys(patch).length) return { ...base, status: 'unchanged' };
      patch.contact_status = phone || email ? (row.contact_status || 'found') : 'not_found';
      patch.raw = withStamp();
      return { ...base, status: 'applied', before, after, patch };
    }
    case 'set_price': {
      const p = op.price!;
      const evidence = String(raw.evidence_text || row.description_de || '');
      if (!amountInText(p.amount, evidence)) return { ...base, status: 'rejected', detail: 'amount is not present in the card page text (set_price must come from evidence)' };
      const prev = obj(raw.price);
      const monthlyChf = p.unit === 'month' ? p.amount : p.unit === 'week' ? Math.round(p.amount * (52 / 12)) : p.unit === 'night' ? Math.round(p.amount * 30) : null;
      if (
        Number(prev.amount) === p.amount &&
        String(prev.unit || '') === p.unit &&
        Number(row.rent_monthly_chf) === monthlyChf &&
        String(row.pricing_unit || '') === p.unit
      ) return { ...base, status: 'unchanged' };
      const cand = priceCandidates(evidence).find((c) => c.amount === p.amount);
      const next = { amount: p.amount, unit: p.unit, monthlyChf, quote: cand?.quote || `CHF ${p.amount}` };
      return {
        ...base,
        status: 'applied',
        before: {
          price: prev.amount != null ? `${prev.amount} ${prev.unit || ''}`.trim() : null,
          rent_monthly_chf: row.rent_monthly_chf ?? null,
          pricing_unit: row.pricing_unit ?? null,
        },
        after: { price: `${p.amount} ${p.unit}`, rent_monthly_chf: monthlyChf, pricing_unit: p.unit },
        patch: {
          rent_monthly_chf: monthlyChf,
          pricing_unit: p.unit,
          raw: withStamp({ price: next, price_quote: next.quote }),
        } };
    }
  }
}

/** In-memory preview of a whole op list against rows (used by repair/preview and by tests). */
export function previewOps(ops: RepairOp[], rows: Row[], ctx: AuditContext, tag: { source: string; batchId?: string }): { results: OpResult[]; summary: Record<string, number> } {
  const byId = new Map(rows.map((r) => [String(r.id).toLowerCase(), r]));
  const results = ops.map((o) => evaluateOp(o, byId.get(o.id), ctx, tag));
  const summary: Record<string, number> = { applied: 0, unchanged: 0, rejected: 0, not_found: 0 };
  for (const r of results) summary[r.status]++;
  return { results, summary };
}

/** Collapse several automatic ops for the same card into the minimal consistent list (hide wins over field repairs). */
export function planAutoOps(rows: Row[], ctx: AuditContext): { ops: RepairOp[]; audits: RowAudit[] } {
  const ops: RepairOp[] = []; const audits: RowAudit[] = [];
  for (const row of rows) {
    if (row.hidden) continue; // hidden rows are not touched automatically (they stay recoverable)
    const a = auditRow(row, ctx);
    audits.push(a);
    const hide = a.ops.find((o) => o.op === 'hide' || o.op === 'mark_collage');
    if (hide) ops.push(hide); else ops.push(...a.ops);
  }
  return { ops, audits };
}

export function ctxFromConfig(cfg: Pick<ImmoConfig, 'municipalities' | 'discovery'>): AuditContext {
  return { municipalities: cfg.municipalities || [], portalHosts: cfg.discovery?.portalHosts || [] };
}

// ---------------------------------------------------------------------------
// Write-time gate for NEW or re-fetched records (so new cards are born clean)
// ---------------------------------------------------------------------------

/**
 * Applies the same contact and price rules as the audit to a record that is about to be stored.
 * Unverifiable contacts are dropped, a parking/utility amount is replaced by the rent found in the page text.
 * `hardReason` means the caller must not present the card; it may persist it hidden or reject it outright.
 */
export function sanitizeNewRecord<T extends Record<string, any>>(rec: T, ctx: AuditContext): { rec: T; notes: string[]; hardReason: string | null } {
  const notes: string[] = [];
  const row: Row = { ...rec, id: 'new', hidden: false };
  const hardReason = hardRejectReason(row, ctx);
  const next: Record<string, any> = { ...rec };
  const cv = contactVerdict(row);
  if (next.direct_phone && (cv.phone === 'platform' || cv.phone === 'not_in_evidence')) { next.direct_phone = null; notes.push(`phone_dropped:${cv.phone}`); }
  if (next.direct_email && (cv.email === 'platform' || cv.email === 'not_in_evidence')) { next.direct_email = null; notes.push(`email_dropped:${cv.email}`); }
  if (notes.length && !next.direct_phone && !next.direct_email) { next.contact_status = 'platform_only'; }
  const pv = priceVerdict(row);
  if (pv.status === 'suspect' && (pv.why === 'price_ambiguous_on_detail_page' || /ambiguous/i.test(String(pv.why || '')))) {
    next.rent_monthly_chf = null;
    next.pricing_unit = null;
    next.raw = { ...obj(rec.raw), price: null, price_quote: null };
    notes.push(`price_cleared:${pv.why}`);
  } else if (pv.status === 'repair') {
    const evidence = String(obj(rec.raw).evidence_text || rec.description_de || '');
    const cand = priceCandidates(evidence).find((c) => c.amount === pv.price.amount);
    const monthlyChf = pv.price.unit === 'month' ? pv.price.amount : pv.price.unit === 'week' ? Math.round(pv.price.amount * (52 / 12)) : pv.price.unit === 'night' ? Math.round(pv.price.amount * 30) : null;
    const price = { amount: pv.price.amount, unit: pv.price.unit, monthlyChf, quote: cand?.quote || `CHF ${pv.price.amount}` };
    next.raw = { ...obj(rec.raw), price, price_quote: price.quote, price_repaired: pv.why };
    next.rent_monthly_chf = monthlyChf;
    next.pricing_unit = pv.price.unit;
    notes.push(`price_repaired:${pv.why}`);
  }
  return { rec: next as T, notes, hardReason };
}
