/**
 * C131 WP3 classify stage — pure R2 gates → level + closed R7 reject code.
 * Operates only on a fetched page snapshot + config; zero provider cost, offline-reproducible.
 * Does not write, fetch, or call models. Legacy TrustEngine remains the live path until WP5.
 */

import { classifyReject, type R7RejectCode } from './taxonomy.ts';

export type ResultLevel = 'L0' | 'L1' | 'L2' | 'L3';

export interface PageSnapshot {
  requestedUrl: string;
  finalUrl: string | null;
  title: string;
  pageText: string;
  fetchTimeIso: string;
  provisional?: boolean;
}

export interface ClassifyConfig {
  municipalities: string[];
  minRooms: number;
  stopAgencies: string[];
}

export interface FieldEvidence {
  value: string | number | null;
  quote: string | null;
  sourceUrl: string;
  fetchTime: string;
}

export interface ClassifyResult {
  level: ResultLevel;
  rejectCode: R7RejectCode | null;
  legacyReason: string | null;
  rooms: FieldEvidence | null;
  locality: FieldEvidence | null;
  isResidential: boolean;
  isSeeker: boolean;
  isForSale: boolean;
  isAgency: boolean;
}

const ROOM_RE = /(\d+(?:[.,]\d+)?)\s*(?:[-–]?\s*\d+(?:[.,]\d+)?)?\s*(?:zimmer|zi\.|rooms?|chambres?|camere)/i;
/** Seeker posts only — not site nav ("Haus suchen") or marketing ("Starte deine Suche"). */
const SEEKER_RE =
  /(?:\bwg[\s-]?gesucht\b|\bmitbewohner(?:in)?\b|\broommate\b|\bflatshare\b|\bwohngemeinschaft\b|\b(?:suche|sucht)\s+(?:mitbewohner|nachmieter|wohnung|zimmer|wg)\b|\blooking\s+for\s+(?:a\s+)?(?:room|flat|roommate)\b|\b(?:cerco|cherche)\s+(?:colocation|chambre|appartement)\b)/i;
const SALE_RE = /(?:zu\s+verkaufen|for\s+sale|verkauf|proprietà\s+in\s+vendita|à\s+vendre|zweitwohnung|eigentumswohnung)/i;
const RESIDENTIAL_RE = /(?:wohnung|haus|apartment|ferienwohnung|ferienhaus|chalet|maison|appartamento|casa|rental|miete|mieten)/i;
const AGENCY_MARKERS = /(?:immobilienmakler|immobilienverwaltung|immobilienbüro|makler(?:in)?|property\\s+management|interhome|holidu|belvilla|e-domizil|griwarent|hometogo)/i;

/** Prefer URL slug and title over full page text (footer often lists many communes). */
function findMunicipality(
  title: string,
  pageText: string,
  url: string,
  list: string[],
): { value: string; quote: string } | null {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  // 1) URL path / query (e.g. ...-in-lenzerheide, /flims/)
  for (const m of list) {
    const slug = m.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-');
    const plain = m.toLowerCase();
    if (urlLower.includes(slug) || urlLower.includes(plain.replace(/\s+/g, ''))) {
      return { value: m, quote: `url:${slug}` };
    }
  }
  // 2) Title
  for (const m of list) {
    if (titleLower.includes(m.toLowerCase())) {
      return { value: m, quote: m };
    }
  }
  // 3) Body fallback requires explicit address/location evidence. A commune name
  // in generic copy or a footer is not sufficient to assign a listing's locality.
  const head = pageText.slice(0, 8_000);
  for (const m of list) {
    const escaped = m.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp('\\b(?:ort|standort|adresse|location|objektstandort|gemeinde)\\s*[:\\-]\\s*(?:\\d{4}\\s*)?' + escaped + '\\b', 'i'),
      new RegExp('\\b\\d{4}\\s*,?\\s*' + escaped + '\\b', 'i'),
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(head);
      if (match) return { value: m, quote: match[0] };
    }
  }
  return null;
}

function extractRooms(text: string): { rooms: number; quote: string } | null {
  const m = text.match(ROOM_RE);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(n) || n < 1) return null;
  return { rooms: n, quote: m[0].trim() };
}

export function classifyPage(snapshot: PageSnapshot, config: ClassifyConfig): ClassifyResult {
  const text = `${snapshot.title}\n${snapshot.pageText || ''}`.trim();
  const base = {
    rooms: null as FieldEvidence | null,
    locality: null as FieldEvidence | null,
    isResidential: false,
    isSeeker: false,
    isForSale: false,
    isAgency: false,
  };

  if (snapshot.provisional || !snapshot.finalUrl) {
    return { ...base, level: 'L0', rejectCode: 'snippet_only', legacyReason: 'trust_snippet_only' };
  }

  if (!snapshot.finalUrl || snapshot.finalUrl !== snapshot.requestedUrl) {
    const code = classifyReject('trust_fetch_url_unverified') || 'not_detail_page';
    return { ...base, level: 'L0', rejectCode: code, legacyReason: 'trust_fetch_url_unverified' };
  }

  if (text.length < 80) {
    return { ...base, level: 'L0', rejectCode: 'not_detail_page', legacyReason: 'trust_page_too_short' };
  }

  const locHit = findMunicipality(snapshot.title, snapshot.pageText || '', snapshot.finalUrl, config.municipalities);
  if (!locHit) {
    return { ...base, level: 'L0', rejectCode: 'outside_target', legacyReason: 'municipality_not_whitelisted' };
  }
  base.locality = { value: locHit.value, quote: locHit.quote, sourceUrl: snapshot.finalUrl, fetchTime: snapshot.fetchTimeIso };

  base.isForSale = SALE_RE.test(text);
  if (base.isForSale) {
    return { ...base, level: 'L0', rejectCode: 'for_sale', legacyReason: 'trust_for_sale' };
  }

  base.isSeeker = SEEKER_RE.test(text);
  if (base.isSeeker) {
    return { ...base, level: 'L0', rejectCode: 'seeker', legacyReason: 'trust_seeker_post' };
  }

  base.isResidential = RESIDENTIAL_RE.test(text);
  if (!base.isResidential) {
    return { ...base, level: 'L0', rejectCode: 'not_residential', legacyReason: 'trust_not_residential' };
  }

  const roomHit = extractRooms(text);
  if (!roomHit) {
    return { ...base, level: 'L0', rejectCode: 'rooms_unknown', legacyReason: 'rooms_unknown' };
  }
  if (roomHit.rooms < config.minRooms) {
    return {
      ...base,
      rooms: { value: roomHit.rooms, quote: roomHit.quote, sourceUrl: snapshot.finalUrl, fetchTime: snapshot.fetchTimeIso },
      level: 'L0',
      rejectCode: 'rooms_below_min',
      legacyReason: 'rooms_below_min',
    };
  }
  base.rooms = { value: roomHit.rooms, quote: roomHit.quote, sourceUrl: snapshot.finalUrl, fetchTime: snapshot.fetchTimeIso };

  base.isAgency =
    config.stopAgencies.some((a) => text.toLowerCase().includes(a.toLowerCase())) ||
    AGENCY_MARKERS.test(text);
  if (base.isAgency) {
    return { ...base, level: 'L0', rejectCode: 'agency', legacyReason: 'agency' };
  }

  return { ...base, level: 'L1', rejectCode: null, legacyReason: null };
}
