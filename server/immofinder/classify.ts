/**
 * C131 WP3 classify stage — pure R2 gates → level + closed R7 reject code.
 * Operates only on a fetched page snapshot + config; zero provider cost, offline-reproducible.
 * Does not write, fetch, or call models. Used by the production source-first admission route.
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

const ROOM_RE = /(\d+(?:[.,]\d+)?(?:\s*1\/2|½)?)(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*[-–]?\s*(?:\bzimmer\b|\bzi\.|\brooms?\b|\bchambres?\b|\bcamere\b|-?zimmerwohnung)/i;
/** Seeker posts only — not site nav ("Haus suchen") or marketing ("Starte deine Suche"). */
const SEEKER_RE =
  /(?:\bwg[\s-]?gesucht\b|\bmitbewohner(?:in)?\b|\broommate\b|\bflatshare\b|\bwohngemeinschaft\b|\b(?:suche|sucht)\s+(?:mitbewohner|nachmieter|wohnung|zimmer|wg)\b|\blooking\s+for\s+(?:a\s+)?(?:room|flat|roommate)\b|\b(?:cerco|cherche)\s+(?:colocation|chambre|appartement)\b)/i;
const SALE_RE = /(?:zu\s+verkaufen|for\s+sale|verkauf|proprietà\s+in\s+vendita|à\s+vendre|zweitwohnung|eigentumswohnung)/i;
const RESIDENTIAL_RE = /(?:wohnung|haus|apartment|ferienwohnung|ferienhaus|chalet|maison|appartamento|casa|rental|miete|mieten)/i;
const AGENCY_MARKERS = /(?:immobilienmakler|immobilienverwaltung|immobilienbüro|makler(?:in)?|agentur|property\s+management|interhome|holidu|belvilla|e-domizil|griwarent|hometogo)/i;

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}
function locationTokens(value: string): string[] {
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { /* retain original */ }
  return decoded.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}
function hasLocationContext(tokens: string[], index: number): boolean {
  const before = tokens.slice(Math.max(0, index - 3), index);
  const after = tokens.slice(index + 1, index + 4);
  return before.some((token) => ['in', 'von', 'bei', 'ort', 'standort', 'adresse', 'gemeinde', 'location', 'wohnort'].includes(token))
    || after.some((token) => ['graubunden', 'grisons'].includes(token))
    || /^\\d{4}$/.test(tokens[index - 1] || '');
}
function findTokenSequence(haystack: string[], needle: string[]): number {
  if (!needle.length || needle.length > haystack.length) return -1;
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/** URL and description evidence beat property-name mentions and footer chrome. */
function findMunicipality(
  title: string,
  pageText: string,
  url: string,
  list: string[],
): { value: string; quote: string } | null {
  const urlTokens = locationTokens(url);
  for (const m of list) {
    if (findTokenSequence(urlTokens, locationTokens(m)) >= 0) {
      return { value: m, quote: 'url-token:' + m };
    }
  }

  const body = title ? String(pageText || '').replace(new RegExp(escapeRegExp(title), 'gi'), ' ') : String(pageText || '');
  const marker = body.toLowerCase().indexOf('beschreibung');
  const description = marker >= 0 ? body.slice(marker, marker + 8_000) : '';
  const searchAreas = [
    { text: description, label: 'description' },
    { text: body.slice(0, 2_500), label: 'body' },
  ];
  for (const area of searchAreas) {
    if (!area.text) continue;
    const tokens = locationTokens(area.text);
    const matches = list.map((m) => ({ m, index: findTokenSequence(tokens, locationTokens(m)) }))
      .filter((x) => x.index >= 0 && hasLocationContext(tokens, x.index)).sort((a, b) => a.index - b.index);
    if (matches.length) {
      const hit = matches[0];
      return { value: hit.m, quote: area.label + ':' + hit.m };
    }
  }

  const titleTokens = locationTokens(title);
  const titleMatches = list.map((m) => ({ m, index: findTokenSequence(titleTokens, locationTokens(m)) }))
    .filter((x) => x.index >= 0).sort((a, b) => a.index - b.index);
  if (titleMatches.length) return { value: titleMatches[0].m, quote: 'title:' + titleMatches[0].m };
  return null;
}

function hasSubstantiveDetail(title: string, pageText: string): boolean {
  const body = title ? String(pageText || '').replace(new RegExp(escapeRegExp(title), 'gi'), ' ') : String(pageText || '');
  const clean = body
    .replace(/haus suchen|wohnung suchen|kontakt|über uns|agb|impressum|haus registrieren|anmelden|login|wunschliste|reisemagazin|navigation/gi, ' ')
    .replace(/[|•·]/g, ' ');
  const words = clean.match(/[\p{L}\p{N}]{3,}/gu) || [];
  return words.length >= 8 || /(?:CHF|EUR|€|m²|schlafzimmer|badezimmer|ausstattung|verfügbarkeit|preis pro|pro nacht)/i.test(clean);
}

function extractRooms(text: string): { rooms: number; quote: string } | null {
  const m = text.match(ROOM_RE);
  if (!m) return null;
  const raw = m[1].replace(/\s+/g, '').replace(',', '.');
  const half = raw.endsWith('1/2') || raw.endsWith('½');
  const base = parseFloat(raw.replace(/(?:1\/2|½)$/, ''));
  const n = half ? base + 0.5 : base;
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
  if (!hasSubstantiveDetail(snapshot.title, snapshot.pageText || '')) {
    return { ...base, level: 'L0', rejectCode: 'not_detail_page', legacyReason: 'insufficient_detail_content' };
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
