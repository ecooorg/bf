import {
  isForSaleListing,
  isListingUnavailable,
  isPlausibleEmail,
  isPlausibleSwissPhone,
  isSeekerPost,
  matchMunicipality,
  normPhone,
  parsePrice,
  parseRooms,
} from './immofinderCore.ts';
import { sameListingUrlTarget } from './immofinderRepair.ts';

export interface TrustAdmissionInput {
  requestedUrl: string;
  finalUrl: string | null | undefined;
  title: string;
  pageText: string;
  municipality: string | null;
  municipalities: string[];
  provisional: boolean;
  rooms: number | null;
  priceMonthlyChf: number | null;
  priceUnit: string | null;
  priceQuote: string | null;
  listedAt: string | Date | null;
  maxAgeDays: number;
  phone: string | null;
  email: string | null;
  contactEvidenceUrls: string[];
  nowMs?: number;
}

export type TrustRejectReason =
  | 'trust_snippet_only'
  | 'trust_fetch_url_unverified'
  | 'trust_page_too_short'
  | 'trust_locality_missing'
  | 'trust_locality_conflict'
  | 'trust_not_rental'
  | 'trust_not_residential'
  | 'trust_for_sale'
  | 'trust_seeker_post'
  | 'trust_listing_unavailable'
  | 'trust_rooms_missing'
  | 'trust_rooms_conflict'
  | 'trust_monthly_price_missing'
  | 'trust_price_quote_missing'
  | 'trust_price_not_monthly_chf'
  | 'trust_publication_date_missing'
  | 'trust_publication_date_future'
  | 'trust_listing_stale'
  | 'trust_contact_missing'
  | 'trust_contact_not_page_attributed'
  | 'trust_contact_not_advertiser';

export type TrustAdmission = { accepted: true; rooms: number; monthlyRentChf: number | null; listedAt: string | null; contact: 'phone' | 'email' | 'platform_only' } | { accepted: false; reason: TrustRejectReason };

/**
 * Final admission boundary. Search results, model output, enrichment pages and stored
 * values are never evidence here: every required fact must be present on the one
 * identity-matched detail page fetched for this candidate.
 */
function hasAdvertiserContactContext(text: string, value: string, kind: 'phone' | 'email'): boolean {
  const labels = /(kontakt|vermieter|anbieter|kontaktperson|ansprechpartner|ansprechperson|contact|e-?mail|propri[eé]taire|annonceur|telefon|tel\.?|tél\.?|mobile|phone|landlord|owner|advertiser)/i;
  if (kind === 'email') {
    const index = text.toLowerCase().indexOf(value.toLowerCase());
    if (index < 0) return false;
    return labels.test(text.slice(Math.max(0, index - 120), Math.min(text.length, index + value.length + 120)));
  }
  const digits = value.replace(/\D/g, '').slice(-9);
  if (digits.length !== 9) return false;
  const phonePattern = new RegExp(digits.split('').join('\\D*'));
  const match = phonePattern.exec(text);
  if (!match) return false;
  return labels.test(text.slice(Math.max(0, match.index - 120), Math.min(text.length, match.index + match[0].length + 100)));
}

function isResidentialDetail(title: string, text: string): boolean {
  const h = String(title) + '\n' + String(text || '').slice(0, 2500);
  if (/\b(wg[- ]?zimmer|zimmer\s+in\s+(?:einer\s+)?wg|shared\s+room|room\s+in\s+shared|chambre\s+en\s+colocation|camera\s+condivisa)\b/i.test(h)) return false;
  if (/^\s*(?:parkplatz|stellplatz|garage|büro|gewerbe|geschäftsfläche|ladenfläche|lager(?:raum|halle)?|atelier|praxis)\b/i.test(title)) return false;
  if (/\b(?:objekttyp|property\s*type|type)\s*[:：]\s*(?:büro|gewerbe|geschäftsfläche|ladenfläche|lager|atelier|praxis|parking|garage)\b/i.test(h)) return false;
  return /\b(wohnung|wohnhaus|haus|chalet|ferienwohnung|ferienhaus|apartment|flat|house|maison|appartement|casa|abitazione)\b/i.test(h);
}

/**
 * C131 L1 admission: one fetched identity-matched detail page, explicit room count,
 * target-residential rental and no known reject condition. Price, date and direct
 * contact enrich the card but never determine whether the listing exists.
 */
export function verifyListingAdmission(input: TrustAdmissionInput): TrustAdmission {
  const reject = (reason: TrustRejectReason): TrustAdmission => ({ accepted: false, reason });
  const text = String(input.pageText || '').trim();
  const full = String(input.title) + '\n' + text;
  if (input.provisional) return reject('trust_snippet_only');
  if (!input.finalUrl || !sameListingUrlTarget(input.requestedUrl, input.finalUrl)) return reject('trust_fetch_url_unverified');
  if (text.length < 120) return reject('trust_page_too_short');
  const pageMunicipality = matchMunicipality(full, input.municipalities || []);
  if (!pageMunicipality || !input.municipality) return reject('trust_locality_missing');
  if (pageMunicipality !== input.municipality) return reject('trust_locality_conflict');
  if (isForSaleListing(input.title, text, input.requestedUrl)) return reject('trust_for_sale');
  if (isSeekerPost(input.title, text)) return reject('trust_seeker_post');
  if (isListingUnavailable(input.title, text)) return reject('trust_listing_unavailable');
  if (!isResidentialDetail(input.title, text)) return reject('trust_not_residential');
  if (!/(mieten|miete|vermieten|mietwohnung|zur\s+miete|zu\s+vermieten|loyer|à\s+louer|louer|affitto|in\s+affitto|for\s+rent|rent\s+out|to\s+let|ferienwohnung|ferienhaus|holiday\s+rental|vacation\s+rental|unterkunft)/i.test(full)) return reject('trust_not_rental');

  const pageRooms = parseRooms(text);
  if (!pageRooms || pageRooms.basis !== 'zimmer' || pageRooms.rooms < 3) return reject('trust_rooms_missing');
  if (input.rooms == null || Math.abs(pageRooms.rooms - input.rooms) > 0.01) return reject('trust_rooms_conflict');

  const now = input.nowMs ?? Date.now();
  let listedAt: string | null = null;
  if (input.listedAt) {
    const published = new Date(input.listedAt);
    if (Number.isFinite(published.getTime())) {
      if (published.getTime() > now + 24 * 60 * 60 * 1000) return reject('trust_publication_date_future');
      listedAt = published.toISOString();
    }
  }

  let monthlyRentChf: number | null = null;
  const quote = String(input.priceQuote || '').trim();
  if (quote && text.includes(quote)) {
    const parsedPrice = parsePrice(quote);
    if (input.priceUnit === 'month' && parsedPrice?.unit === 'month' && parsedPrice.monthlyChf != null &&
        input.priceMonthlyChf != null && parsedPrice.monthlyChf === input.priceMonthlyChf) {
      monthlyRentChf = parsedPrice.monthlyChf;
    }
  }

  const pageUrl = input.finalUrl;
  const attributed = (url: string) => {
    try {
      const a = new URL(url); const b = new URL(pageUrl);
      return a.origin === b.origin && a.pathname === b.pathname;
    } catch { return false; }
  };
  const phone = input.phone ? normPhone(input.phone) : null;
  const validPhone = Boolean(phone && isPlausibleSwissPhone(phone) && hasAdvertiserContactContext(text, phone, 'phone') &&
    input.contactEvidenceUrls.some(attributed));
  const email = input.email ? input.email.trim().toLowerCase() : null;
  const validEmail = Boolean(email && isPlausibleEmail(email) && hasAdvertiserContactContext(text, email, 'email') &&
    input.contactEvidenceUrls.some(attributed));
  const contact = validPhone ? 'phone' : validEmail ? 'email' : 'platform_only';
  void input.maxAgeDays;
  return { accepted: true, rooms: pageRooms.rooms, monthlyRentChf, listedAt, contact };
}

export type C131GoldLabel =
  | 'good_tourist_owner'
  | 'good_direct_offer'
  | 'wrong_object'
  | 'agency'
  | 'wrong_locality'
  | 'not_listing'
  | 'other';

export interface C131GoldReplayRecord {
  id: string;
  label: C131GoldLabel;
  /** True only when the saved detail page was fetched successfully at capture time. */
  fetchable: boolean;
  input: TrustAdmissionInput;
  /** Owner-reviewed reachability/letter readiness; do not infer these from portal contact forms. */
  ownerReachable?: boolean;
  letterReady?: boolean;
  /** One provenance item per captured field; quotes must occur verbatim in the saved page text. */
  fieldEvidence?: Array<{ field: string; sourceUrl: string; verbatimQuote: string }>;
}

export interface C131GoldReplayLabelStats {
  total: number;
  fetchable: number;
  admittedL1: number;
  rejected: number;
  falsePositive: number;
  falseNegative: number;
}

const C131_GOOD_LABELS = new Set<C131GoldLabel>(['good_tourist_owner', 'good_direct_offer']);
const C131_WRONG_OBJECT_LABELS = new Set<C131GoldLabel>(['wrong_object', 'agency', 'wrong_locality']);
const C131_GOLD_LABELS = new Set<C131GoldLabel>([
  'good_tourist_owner', 'good_direct_offer', 'wrong_object', 'agency', 'wrong_locality', 'not_listing', 'other',
]);

/**
 * Provider-free measurement of the current admission verifier against owner-labelled,
 * saved-page records. This is a scorer only: it never changes runtime admission decisions.
 * The caller is responsible for loading the input from the encrypted snapshot store.
 */
export function scoreC131GoldReplay(records: readonly C131GoldReplayRecord[]) {
  if (!Array.isArray(records)) throw new Error('c131_gold_records_must_be_array');
  const seenIds = new Set<string>();
  const perLabel = Object.fromEntries([...C131_GOLD_LABELS].map((label) => [label, {
    total: 0, fetchable: 0, admittedL1: 0, rejected: 0, falsePositive: 0, falseNegative: 0,
  }])) as Record<C131GoldLabel, C131GoldReplayLabelStats>;
  const rejectReasons: Record<string, number> = {};
  let fetchableCount = 0;
  let infrastructureFailures = 0;
  let truePositive = 0;
  let falsePositive = 0;
  let fetchableGood = 0;
  let fetchableGoodMissed = 0;
  let admittedL1 = 0;
  let ownerReachableL2 = 0;
  let letterReadyL3 = 0;
  let snippetOnlyAdmitted = 0;
  let acceptedNotFetchable = 0;
  let crossUrlFieldMergeCount = 0;
  let sourceUrlMismatchCount = 0;
  let missingFieldEvidenceCount = 0;
  let unverifiableQuoteCount = 0;

  for (const record of records) {
    if (!record || typeof record.id !== 'string' || !record.id.trim() || seenIds.has(record.id)) {
      throw new Error('c131_gold_record_id_missing_or_duplicate');
    }
    seenIds.add(record.id);
    if (!C131_GOLD_LABELS.has(record.label)) throw new Error('c131_gold_label_invalid');
    if (typeof record.fetchable !== 'boolean' || !record.input) throw new Error('c131_gold_record_shape_invalid');

    const labelStats = perLabel[record.label];
    labelStats.total++;
    if (record.fetchable) {
      fetchableCount++;
      labelStats.fetchable++;
    } else infrastructureFailures++;

    const evidence = Array.isArray(record.fieldEvidence) ? record.fieldEvidence : [];
    if (!evidence.length) missingFieldEvidenceCount++;
    const evidenceUrls = new Set(evidence.map((item) => String(item?.sourceUrl || '').trim()).filter(Boolean));
    if (evidenceUrls.size > 1) crossUrlFieldMergeCount++;
    if (evidence.some((item) => !item?.sourceUrl || !sameListingUrlTarget(record.input.requestedUrl, item.sourceUrl))) {
      sourceUrlMismatchCount++;
    }
    if (evidence.some((item) => !item?.field || !item?.verbatimQuote || !String(record.input.pageText || '').includes(item.verbatimQuote))) {
      unverifiableQuoteCount++;
    }

    const decision = verifyListingAdmission(record.input);
    if (decision.accepted === true) {
      admittedL1++;
      labelStats.admittedL1++;
      if (record.label === 'good_tourist_owner' || record.label === 'good_direct_offer') truePositive++;
      else {
        falsePositive++;
        labelStats.falsePositive++;
      }
      if (record.input.provisional) snippetOnlyAdmitted++;
      if (!record.fetchable) acceptedNotFetchable++;
      if (record.ownerReachable === true) {
        ownerReachableL2++;
        if (record.letterReady === true) letterReadyL3++;
      }
    } else {
      labelStats.rejected++;
      rejectReasons[decision.reason] = (rejectReasons[decision.reason] || 0) + 1;
      if (C131_GOOD_LABELS.has(record.label) && record.fetchable) {
        fetchableGoodMissed++;
        labelStats.falseNegative++;
      }
    }
    if (C131_GOOD_LABELS.has(record.label) && record.fetchable) fetchableGood++;
  }

  return {
    total: records.length,
    fetchable: fetchableCount,
    infrastructureFailures,
    fetchFailureRate: records.length ? infrastructureFailures / records.length : null,
    admittedL1,
    ownerReachableL2,
    letterReadyL3,
    precision: admittedL1 ? truePositive / admittedL1 : null,
    fetchableGoodRecall: fetchableGood ? (fetchableGood - fetchableGoodMissed) / fetchableGood : null,
    falsePositiveCount: falsePositive,
    wrongObjectAgencyWrongLocalityRate: admittedL1
      ? [...C131_WRONG_OBJECT_LABELS].reduce((sum, label) => sum + perLabel[label].falsePositive, 0) / admittedL1
      : null,
    snippetOnlyAdmitted,
    acceptedNotFetchable,
    provenance: {
      crossUrlFieldMergeCount,
      sourceUrlMismatchCount,
      missingFieldEvidenceCount,
      unverifiableQuoteCount,
    },
    rejectReasons,
    perLabel,
  };
}

export interface TrustSearchPlanInput {
  municipalities: string[];
  communeLimit: number;
  privateTemplateCount: number;
  portalQueryTemplates: string[];
}
export interface TrustSearchPlanOptions {
  allCommunes: boolean;
  families?: Array<'private' | 'portals'>;
}

/** Generate rental-intent searches without inheriting legacy query wording. */
export function buildTrustSearchPlan(config: TrustSearchPlanInput, cycle: number, options: TrustSearchPlanOptions): string[] {
  const municipalities = config.municipalities || [];
  if (!municipalities.length) return [];
  const count = options.allCommunes
    ? municipalities.length
    : Math.max(1, Math.min(municipalities.length, Math.floor(config.communeLimit) || 1));
  const start = options.allCommunes ? 0 : (Math.max(0, Math.floor(cycle) || 0) * count) % municipalities.length;
  const communes = Array.from({ length: count }, (_, index) => municipalities[(start + index) % municipalities.length]);
  const families = options.families || ['private', 'portals'];
  const privateTemplates = [
    (place: string) => `"${place}" ("Wohnung zu vermieten" OR "Mietwohnung" OR "Wohnung mieten") -kaufen -verkaufen`,
    (place: string) => `"${place}" ("3 Zimmer" OR "3.5 Zimmer" OR "4 Zimmer" OR "4.5 Zimmer") (Miete OR Mietzins) -kaufen -verkaufen`,
    (place: string) => `"${place}" (Privat OR Eigentümer OR "von privat") (Wohnung OR Haus) mieten -kaufen -verkaufen`,
    (place: string) => `"${place}" ("à louer" OR affitto OR "for rent") (appartement OR Wohnung) -vente -kaufen`,
  ].slice(0, Math.max(0, Math.min(4, config.privateTemplateCount)));
  const portalHosts = [...new Set((config.portalQueryTemplates || []).map((query) => /site:([a-z0-9.-]+)/i.exec(query)?.[1]?.replace(/^www\./i, '').toLowerCase()).filter((host): host is string => Boolean(host)))];
  const portalTemplates = portalHosts.map((host) => (place: string) =>
    `site:${host} "${place}" (Wohnung OR Appartement) (mieten OR vermieten OR "à louer") -kaufen -verkaufen`);
  const out: string[] = [];
  const slots = Math.max(families.includes('private') ? privateTemplates.length : 0, families.includes('portals') ? portalTemplates.length : 0);
  for (let slot = 0; slot < slots; slot++) {
    if (families.includes('private') && privateTemplates[slot]) for (const place of communes) out.push(privateTemplates[slot](place));
    if (families.includes('portals') && portalTemplates[slot]) for (const place of communes) out.push(portalTemplates[slot](place));
  }
  return out;
}
