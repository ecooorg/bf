import {
  isForSaleListing,
  isListingUnavailable,
  isPlausibleEmail,
  isPlausibleSwissPhone,
  isSeekerPost,
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
  | 'trust_not_rental'
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
  | 'trust_contact_not_page_attributed';

export type TrustAdmission = { accepted: true; rooms: number; monthlyRentChf: number; listedAt: string; contact: 'phone' | 'email' } | { accepted: false; reason: TrustRejectReason };

/**
 * Final admission boundary. Search results, model output, enrichment pages and stored
 * values are never evidence here: every required fact must be present on the one
 * identity-matched detail page fetched for this candidate.
 */
export function verifyListingAdmission(input: TrustAdmissionInput): TrustAdmission {
  const reject = (reason: TrustRejectReason): TrustAdmission => ({ accepted: false, reason });
  const text = String(input.pageText || '').trim();
  if (input.provisional) return reject('trust_snippet_only');
  if (!input.finalUrl || !sameListingUrlTarget(input.requestedUrl, input.finalUrl)) return reject('trust_fetch_url_unverified');
  if (text.length < 120) return reject('trust_page_too_short');
  if (isForSaleListing(input.title, text, input.requestedUrl)) return reject('trust_for_sale');
  if (isSeekerPost(input.title, text)) return reject('trust_seeker_post');
  if (isListingUnavailable(input.title, text)) return reject('trust_listing_unavailable');
  if (!/\b(mieten|vermieten|mietwohnung|zur\s+miete|zu\s+vermieten|loyer|à\s+louer|louer|affitto|in\s+affitto|for\s+rent|rent\s+out|to\s+let)\b/i.test(`${input.title}\n${text}`)) return reject('trust_not_rental');

  const pageRooms = parseRooms(text);
  if (!pageRooms || !(pageRooms.rooms > 0)) return reject('trust_rooms_missing');
  if (input.rooms == null || Math.abs(pageRooms.rooms - input.rooms) > 0.01) return reject('trust_rooms_conflict');

  if (!(Number(input.priceMonthlyChf) > 0)) return reject('trust_monthly_price_missing');
  const quote = String(input.priceQuote || '').trim();
  if (!quote || !text.includes(quote)) return reject('trust_price_quote_missing');
  if (input.priceUnit !== 'month' || !/\b(?:CHF|Fr\.?|SFr\.?)\b/i.test(quote) ||
      !/(?:\b(?:pro\s+Monat|im\s+Monat|monatlich|Monatsmiete|Mietzins|Nettomiete|Bruttomiete|mtl\.?|\/\s*(?:Monat|Mt\.?|month)|per\s+month|par\s+mois)\b)/i.test(quote)) {
    return reject('trust_price_not_monthly_chf');
  }
  const parsedPrice = parsePrice(quote);
  if (!parsedPrice || parsedPrice.unit !== 'month' || parsedPrice.monthlyChf !== input.priceMonthlyChf) return reject('trust_price_not_monthly_chf');

  if (!input.listedAt) return reject('trust_publication_date_missing');
  const published = new Date(input.listedAt);
  if (!Number.isFinite(published.getTime())) return reject('trust_publication_date_missing');
  const now = input.nowMs ?? Date.now();
  if (published.getTime() > now + 24 * 60 * 60 * 1000) return reject('trust_publication_date_future');
  if (now - published.getTime() > Math.max(1, input.maxAgeDays) * 86400000) return reject('trust_listing_stale');

  const phone = input.phone ? normPhone(input.phone) : null;
  const validPhone = Boolean(phone && isPlausibleSwissPhone(phone));
  const email = input.email ? input.email.trim().toLowerCase() : null;
  const validEmail = Boolean(email && isPlausibleEmail(email));
  if (!validPhone && !validEmail) return reject('trust_contact_missing');
  const pageUrl = input.finalUrl;
  const attributed = input.contactEvidenceUrls.some((url) => {
    try {
      const a = new URL(url); const b = new URL(pageUrl);
      return a.origin === b.origin && a.pathname === b.pathname;
    } catch { return false; }
  });
  if (!attributed) return reject('trust_contact_not_page_attributed');

  return { accepted: true, rooms: pageRooms.rooms, monthlyRentChf: input.priceMonthlyChf, listedAt: published.toISOString(), contact: validPhone ? 'phone' : 'email' };
}
