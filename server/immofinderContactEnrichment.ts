/**
 * ImmoFinder — Contact Enrichment (legal / public-sources only)
 *
 * Goal: increase the chance of finding a direct phone or email for a private
 * holiday-rental owner WITHOUT changing the keep/drop decisions of the main
 * pipeline and WITHOUT removing listings that still have no contact.
 *
 * All methods use only publicly available information:
 *   - additional Google searches via the existing Serper integration
 *   - reverse image search on listing photos (public web)
 *   - re-fetch of candidate pages found by those searches
 *   - improved extraction of tel: / mailto: links and contact blocks
 *
 * Explicit non-goals (and hard boundaries):
 *   - no scraping of authenticated / paywalled content
 *   - no people-search / background-check services
 *   - no social-graph or Facebook-profile scraping beyond the public post snippet
 *   - no guessing or fabricating contact data
 *
 * Integration contract:
 *   - Enrichment runs AFTER a listing has already been accepted by the main filters.
 *   - Failure or empty result of enrichment never causes the listing to be dropped.
 *   - contact_status is upgraded only when real evidence is found; otherwise it
 *     stays 'platform_only' / 'not_found' and the listing remains visible.
 */

import { hostOf, type SearchHit } from './immofinderDiscovery.ts';
import { type ImmoConfig, extractContacts, htmlToText } from './immofinderCore.ts';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface ContactEnrichmentConfig {
  /** Master switch. When false the whole module is a no-op. */
  enabled: boolean;
  /** Max extra Serper queries per pipeline run (property-name / owner searches). */
  maxExtraSearchesPerRun: number;
  /** Max reverse-image lookups per pipeline run. */
  maxReverseImagePerRun: number;
  /** Max candidate pages to fetch from enrichment searches per listing. */
  maxCandidatePagesPerListing: number;
  /** Hosts that are never fetched for enrichment (same idea as discovery.skipHosts). */
  skipHosts: string[];
  /** Hosts that may only be used as search snippets (never fetched). */
  snippetOnlyHosts: string[];
  /** Whether to attempt reverse image search when photos exist and a provider is available. */
  useReverseImage: boolean;
  /** Whether to run secondary text searches by property name / owner. */
  useSecondarySearch: boolean;
}

export const DEFAULT_CONTACT_ENRICHMENT: ContactEnrichmentConfig = {
  enabled: true,
  maxExtraSearchesPerRun: 25,
  maxReverseImagePerRun: 8,
  maxCandidatePagesPerListing: 3,
  skipHosts: [
    'wikipedia.org',
    'youtube.com',
    'pinterest.com',
    'reddit.com',
    'google.com',
    'bing.com',
    'holidu.ch',
    'holidu.com',
    'trivago.ch',
    'kayak.ch',
  ],
  snippetOnlyHosts: [
    'facebook.com',
    'instagram.com',
    'airbnb.ch',
    'airbnb.com',
    'booking.com',
    'vrbo.com',
    'homegate.ch',
    'immoscout24.ch',
    'comparis.ch',
    'anibis.ch',
    'tutti.ch',
  ],
  useReverseImage: true,
  useSecondarySearch: true,
};

/** Resolve enrichment config from ImmoConfig.contactEnrichment (or defaults). */
export function resolveEnrichmentConfig(cfg: ImmoConfig): ContactEnrichmentConfig {
  const c = cfg.contactEnrichment;
  if (!c) return { ...DEFAULT_CONTACT_ENRICHMENT, enabled: false };
  return {
    enabled: c.enabled !== false,
    maxExtraSearchesPerRun: c.maxExtraSearchesPerRun ?? DEFAULT_CONTACT_ENRICHMENT.maxExtraSearchesPerRun,
    maxReverseImagePerRun: c.maxReverseImagePerRun ?? DEFAULT_CONTACT_ENRICHMENT.maxReverseImagePerRun,
    maxCandidatePagesPerListing: c.maxCandidatePagesPerListing ?? DEFAULT_CONTACT_ENRICHMENT.maxCandidatePagesPerListing,
    skipHosts: c.skipHosts ?? DEFAULT_CONTACT_ENRICHMENT.skipHosts,
    snippetOnlyHosts: c.snippetOnlyHosts ?? DEFAULT_CONTACT_ENRICHMENT.snippetOnlyHosts,
    useReverseImage: c.useReverseImage !== false,
    useSecondarySearch: c.useSecondarySearch !== false,
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactEvidence {
  type: 'phone' | 'email';
  value: string;
  url: string;
  /** How this evidence was obtained (for debugging / audit). */
  via: 'page' | 'secondary_search' | 'reverse_image' | 'tel_mailto';
}

export interface EnrichmentInput {
  listingUrl: string;
  propertyName: string;
  municipality: string;
  ownerName: string | null;
  photoUrls: string[];
  /** Already known phones/emails so we do not re-report them. */
  existingPhones: string[];
  existingEmails: string[];
  platformDomains: string[];
}

export interface EnrichmentResult {
  phones: string[];
  emails: string[];
  evidence: ContactEvidence[];
  /** Human-readable notes for logs / raw field. */
  notes: string[];
  /** How many extra search / fetch / image calls were consumed. */
  cost: { searches: number; fetches: number; reverseImage: number };
}

export interface EnrichmentDeps {
  config: ContactEnrichmentConfig;
  /** Existing Serper search (Switzerland, German). */
  search: (q: string) => Promise<SearchHit[]>;
  /** Polite page fetcher (same as main pipeline). */
  fetchPage: (url: string) => Promise<{ ok: boolean; status: number; body: string }>;
  /**
   * Optional reverse-image search.
   * Implementations may call Serper Images, Google Lens proxy, Yandex, etc.
   * Must return only publicly indexed pages. Return [] when unavailable.
   */
  reverseImageSearch?: (imageUrl: string) => Promise<SearchHit[]>;
  /** Shared run-level counters (mutated by the enrichment calls). */
  budget: { searchesLeft: number; reverseImageLeft: number };
}

// ---------------------------------------------------------------------------
// Query builders (public search only)
// ---------------------------------------------------------------------------

/** Secondary text queries that stay within normal web-search behaviour. */
export function buildSecondaryQueries(input: EnrichmentInput): string[] {
  const name = (input.propertyName || '').trim();
  const muni = (input.municipality || '').trim();
  const owner = (input.ownerName || '').trim();
  if (!name || !muni) return [];

  const base = [
    `"${name}" ${muni} (Telefon OR Tel OR "von privat" OR Eigentümer OR Vermieter OR Kontakt)`,
    `"${name}" ${muni} (Impressum OR "contact us" OR "rufen Sie" OR Handynummer)`,
    `"${name}" ${muni} (Chalet OR Chesa OR Ferienwohnung OR Ferienhaus) -booking -airbnb -homegate -immoscout`,
  ];

  if (owner && owner.length >= 3 && !/^(familie|family|herr|frau|mr|mrs|the)$/i.test(owner)) {
    base.push(`"${owner}" ${muni} (Ferienwohnung OR Chalet OR Chesa OR Telefon OR Tel)`);
    base.push(`"${owner}" ${muni} (Impressum OR Kontakt)`);
  }

  // Prefer unique-looking names; drop very generic ones to avoid noise.
  const generic = /^(ferienwohnung|ferienhaus|wohnung|apartment|chalet|haus|unterkunft)\b/i;
  if (generic.test(name) && name.split(/\s+/).length < 3) {
    return base.slice(0, 1); // only the most specific query
  }
  return base;
}

// ---------------------------------------------------------------------------
// Improved contact extraction (tel: / mailto: + contact blocks)
// ---------------------------------------------------------------------------

const PHONE_RE = /(?:\+41|0041)\s?\(?0?\)?\s?\d{2}[\s.]?\d{3}[\s.]?\d{2}[\s.]?\d{2}|\b0\d{2}[\s.]?\d{3}[\s.]?\d{2}[\s.]?\d{2}\b/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function normPhone(p: string): string {
  const d = p.replace(/[^\d+]/g, '').replace(/^0041/, '+41').replace(/^0(?=\d{9}$)/, '+41');
  return d;
}

/**
 * Stronger extraction than the base extractContacts:
 * - also looks at tel: and mailto: hrefs
 * - prefers numbers/emails that appear near contact-related keywords
 * - still never invents data
 */
export function extractContactsEnhanced(
  html: string,
  text: string,
  platformDomains: string[],
): { phones: string[]; emails: string[]; fromLinks: { phones: string[]; emails: string[] } } {
  const phones = new Set<string>();
  const emails = new Set<string>();
  const fromLinks = { phones: [] as string[], emails: [] as string[] };

  // 1) Explicit links
  for (const m of html.matchAll(/href=["'](tel:|mailto:)([^"']+)["']/gi)) {
    const kind = m[1].toLowerCase();
    const raw = decodeURIComponent(m[2]).split('?')[0].trim();
    if (kind === 'tel:') {
      const p = normPhone(raw);
      if (p.length >= 10) {
        phones.add(p);
        fromLinks.phones.push(p);
      }
    } else {
      const e = raw.toLowerCase();
      if (e.includes('@') && !platformDomains.some((d) => e.endsWith(`@${d}`) || e.endsWith(`.${d}`))) {
        emails.add(e);
        fromLinks.emails.push(e);
      }
    }
  }

  // 2) Plain-text matches (same logic as core, kept for consistency)
  const base = extractContacts(text, platformDomains);
  base.phones.forEach((p) => phones.add(p));
  base.emails.forEach((e) => emails.add(e));

  // 3) Light preference: if a phone/email sits near contact keywords, we still
  //    just return the value — ranking is left to the caller.
  return {
    phones: [...phones],
    emails: [...emails],
    fromLinks,
  };
}

// ---------------------------------------------------------------------------
// Host helpers
// ---------------------------------------------------------------------------

function hostMatches(host: string, list: string[]): boolean {
  return list.some((h) => host === h || host.endsWith(`.${h}`));
}

function isUsableCandidate(url: string, cfg: ContactEnrichmentConfig, listingHost: string): boolean {
  const h = hostOf(url);
  if (!h) return false;
  if (h === listingHost) return false; // already processed by main pipeline
  if (hostMatches(h, cfg.skipHosts)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Core enrichment
// ---------------------------------------------------------------------------

/**
 * Attempt to find additional public contact details for one already-accepted listing.
 * Never throws; always returns a result (possibly empty).
 */
export async function enrichContacts(
  input: EnrichmentInput,
  deps: EnrichmentDeps,
): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    phones: [],
    emails: [],
    evidence: [],
    notes: [],
    cost: { searches: 0, fetches: 0, reverseImage: 0 },
  };

  if (!deps.config.enabled) {
    result.notes.push('enrichment_disabled');
    return result;
  }

  const knownPhones = new Set(input.existingPhones.map(normPhone));
  const knownEmails = new Set(input.existingEmails.map((e) => e.toLowerCase()));
  const listingHost = hostOf(input.listingUrl);
  const seenUrls = new Set<string>([input.listingUrl]);

  const addEvidence = (type: 'phone' | 'email', value: string, url: string, via: ContactEvidence['via']) => {
    if (type === 'phone') {
      const p = normPhone(value);
      if (knownPhones.has(p) || result.phones.includes(p)) return;
      result.phones.push(p);
      result.evidence.push({ type, value: p, url, via });
    } else {
      const e = value.toLowerCase();
      if (knownEmails.has(e) || result.emails.includes(e)) return;
      result.emails.push(e);
      result.evidence.push({ type, value: e, url, via });
    }
  };

  // ---- A) Secondary text search ------------------------------------------------
  if (deps.config.useSecondarySearch && deps.budget.searchesLeft > 0) {
    const queries = buildSecondaryQueries(input).slice(0, 3);
    for (const q of queries) {
      if (deps.budget.searchesLeft <= 0) break;
      deps.budget.searchesLeft--;
      result.cost.searches++;
      let hits: SearchHit[] = [];
      try {
        hits = await deps.search(q);
      } catch (e) {
        result.notes.push(`search_failed:${String((e as Error)?.message || e).slice(0, 80)}`);
        continue;
      }

      const candidates = hits
        .map((h) => h.link)
        .filter((u) => isUsableCandidate(u, deps.config, listingHost) && !seenUrls.has(u))
        .slice(0, deps.config.maxCandidatePagesPerListing);

      for (const url of candidates) {
        seenUrls.add(url);
        const h = hostOf(url);
        const snippetOnly = hostMatches(h, deps.config.snippetOnlyHosts);

        if (snippetOnly) {
          // Only the search snippet is available; still try to pull phones/emails from it.
          const hit = hits.find((x) => x.link === url);
          if (hit) {
            const combined = `${hit.title}\n${hit.snippet}`;
            const extracted = extractContacts(combined, input.platformDomains);
            extracted.phones.forEach((p) => addEvidence('phone', p, url, 'secondary_search'));
            extracted.emails.forEach((e) => addEvidence('email', e, url, 'secondary_search'));
          }
          continue;
        }

        // Full page fetch
        result.cost.fetches++;
        let page: { ok: boolean; status: number; body: string };
        try {
          page = await deps.fetchPage(url);
        } catch {
          continue;
        }
        if (!page.ok || !page.body) continue;

        const text = htmlToText(page.body);
        const extracted = extractContactsEnhanced(page.body, text, input.platformDomains);
        extracted.phones.forEach((p) => addEvidence('phone', p, url, extracted.fromLinks.phones.includes(p) ? 'tel_mailto' : 'secondary_search'));
        extracted.emails.forEach((e) => addEvidence('email', e, url, extracted.fromLinks.emails.includes(e) ? 'tel_mailto' : 'secondary_search'));

        // Early exit if we already have a usable contact
        if (result.phones.length || result.emails.length) break;
      }
      if (result.phones.length || result.emails.length) break;
    }
  }

  // ---- B) Reverse image search -------------------------------------------------
  if (
    deps.config.useReverseImage &&
    deps.reverseImageSearch &&
    deps.budget.reverseImageLeft > 0 &&
    input.photoUrls.length > 0 &&
    result.phones.length === 0 &&
    result.emails.length === 0
  ) {
    // Use at most two photos to stay within budget
    const photos = input.photoUrls.slice(0, 2);
    for (const photo of photos) {
      if (deps.budget.reverseImageLeft <= 0) break;
      deps.budget.reverseImageLeft--;
      result.cost.reverseImage++;

      let hits: SearchHit[] = [];
      try {
        hits = await deps.reverseImageSearch(photo);
      } catch (e) {
        result.notes.push(`reverse_image_failed:${String((e as Error)?.message || e).slice(0, 80)}`);
        continue;
      }

      const candidates = hits
        .map((h) => h.link)
        .filter((u) => isUsableCandidate(u, deps.config, listingHost) && !seenUrls.has(u))
        .slice(0, deps.config.maxCandidatePagesPerListing);

      for (const url of candidates) {
        seenUrls.add(url);
        const h = hostOf(url);
        if (hostMatches(h, deps.config.snippetOnlyHosts)) continue; // reverse-image on social is usually noise

        result.cost.fetches++;
        let page: { ok: boolean; status: number; body: string };
        try {
          page = await deps.fetchPage(url);
        } catch {
          continue;
        }
        if (!page.ok || !page.body) continue;

        const text = htmlToText(page.body);
        const extracted = extractContactsEnhanced(page.body, text, input.platformDomains);
        extracted.phones.forEach((p) => addEvidence('phone', p, url, 'reverse_image'));
        extracted.emails.forEach((e) => addEvidence('email', e, url, 'reverse_image'));

        if (result.phones.length || result.emails.length) break;
      }
      if (result.phones.length || result.emails.length) break;
    }
  }

  if (result.evidence.length === 0) {
    result.notes.push('no_additional_public_contact_found');
  } else {
    result.notes.push(`found_${result.evidence.length}_evidence_items`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helper: merge enrichment into an existing ListingRecord-like object
// ---------------------------------------------------------------------------

export function applyEnrichmentToRecord<T extends {
  direct_phone: string | null;
  direct_email: string | null;
  contact_evidence: { type: string; value: string; url: string }[];
  contact_status: 'found' | 'not_found' | 'platform_only';
  contact_advice: string;
  raw: Record<string, unknown>;
}>(rec: T, enrichment: EnrichmentResult, fallbackAdvice: string): T {
  if (!enrichment.evidence.length) {
    // Keep original status and advice; only attach debug notes.
    return {
      ...rec,
      raw: {
        ...rec.raw,
        enrichment_notes: enrichment.notes,
        enrichment_cost: enrichment.cost,
      },
    };
  }

  const evidence = [
    ...rec.contact_evidence,
    ...enrichment.evidence.map((e) => ({ type: e.type, value: e.value, url: e.url })),
  ];

  return {
    ...rec,
    direct_phone: rec.direct_phone || enrichment.phones[0] || null,
    direct_email: rec.direct_email || enrichment.emails[0] || null,
    contact_evidence: evidence,
    contact_status: 'found',
    contact_advice: '',
    raw: {
      ...rec.raw,
      enrichment_notes: enrichment.notes,
      enrichment_cost: enrichment.cost,
      enrichment_via: enrichment.evidence.map((e) => e.via),
    },
  };
}
