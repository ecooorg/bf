/**
 * ImmoFinder listing card — the single source of truth for what one card says and how it is coloured.
 * The screen (src/ImmoFinder.tsx) and the Google Sheet / Doc export (server/immofinderDelivery.ts) both read
 * this model, so a listing reads the same everywhere. Pure functions only: no DOM, no Node APIs.
 */

export type ImmoCardInput = {
  municipality?: string | null; property_name?: string | null; description_de?: string | null;
  rooms_estimated?: string | number | null; rent_monthly_chf?: number | null; pricing_unit?: string | null;
  listing_url?: string | null; photo_urls?: string[] | null; private_signals?: string[] | null;
  contact_status?: string | null; owner_name?: string | null; direct_phone?: string | null; direct_email?: string | null;
  first_seen_at?: string | Date | null; listed_at?: string | Date | null; status?: string | null; raw?: any;
};

export type ImmoCard = {
  headline: string;
  about: string;
  url: string;
  /** Warning shown right after the URL, or '' when the link is one object. */
  linkNote: string;
  /** Search/discovery time — kept for diagnostics only; not shown on cards or in exports (owner: source publication date only). */
  found: string;
  /** "published 12.11.2026" — date the ad was published on the source, when extractable; '' otherwise. */
  published: string;
  openLabel: 'Open post' | 'Open listing';
  photos: { label: string; url: string }[];
  status: string;
};

/** Screen palette (same values as the inline styles of the ImmoFinder screen). */
export const IMMO_COLORS = {
  page: '#07101b', card: '#0b1626', border: '#243a57', text: '#e8edf5', about: '#cfe6ff', link: '#7db8ff',
  warn: '#ffd28a', muted: '#8fa6c2', btnBg: '#1457b8', btnBorder: '#7db8ff', btnText: '#ffffff', chipBg: '#13263f', chipText: '#cfe6ff',
} as const;

export const IMMO_LINK_NOTE = '(list/group page — not a single object)';

/** "17.11.2026, 21:37" in Swiss local time. */
export function immoFormatFound(v: string | Date | null | undefined): string {
  if (!v) return '';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('de-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

/** "12.11.2026" (date only, Swiss local time); '' when missing or invalid. */
export function immoFormatDate(v: string | Date | null | undefined): string {
  if (!v) return '';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Price with an explicit period; never shows a night/week rate as a bare monthly amount. */
export function immoPriceText(l: ImmoCardInput): string {
  const unit = String(l.pricing_unit || l.raw?.price?.unit || '').toLowerCase();
  const period =
    unit === 'night' || unit === 'day' ? 'per night'
    : unit === 'week' ? 'per week'
    : unit === 'month' ? 'per month'
    : unit === 'season' ? 'per season'
    : null;
  const rawAmt = l.raw?.price?.amount;
  const amount = rawAmt != null && Number.isFinite(Number(rawAmt)) ? Number(rawAmt) : null;
  const quote = typeof l.raw?.price?.quote === 'string' ? String(l.raw.price.quote).replace(/\s+/g, ' ').trim() : '';
  if (amount != null && period) return `CHF ${amount} ${period}`;
  if (unit === 'month' && l.rent_monthly_chf != null) return `CHF ${l.rent_monthly_chf} per month`;
  if (quote.length >= 3 && /\d/.test(quote)) {
    const hasPw = /per\s+(night|week|month)|\/(mo|wk|night)|\b(nacht|tag|woche|monat|saison)\b/i.test(quote);
    if (period && !hasPw) return `${quote.slice(0, 36)} (${period})`;
    if (!period && !hasPw) return `${quote.slice(0, 36)} (period unclear)`;
    return quote.slice(0, 48);
  }
  if (amount != null) return period ? `CHF ${amount} ${period}` : `CHF ${amount} (period unclear)`;
  return 'price n/a';
}

/** Publication date of the ad: `listed_at` (pipeline record) or `raw.listed_at` (stored row). '' when the page gave none. */
export function immoPublishedText(l: ImmoCardInput): string {
  const d = immoFormatDate(l.listed_at ?? l.raw?.listed_at);
  return d ? `published ${d}` : '';
}

/** Card/export date line: publication date only (search/discovery time is not shown). */
export function immoDatesText(c: Pick<ImmoCard, 'published' | 'found'>): string {
  return c.published || '';
}

export function immoCardModel(l: ImmoCardInput): ImmoCard {
  const contact = l.contact_status === 'found' ? [l.owner_name, l.direct_phone, l.direct_email].filter(Boolean).join(' · ') : '';
  const rooms = l.rooms_estimated != null && String(l.rooms_estimated) !== '' ? `${l.rooms_estimated} rooms` : 'rooms n/a';
  const url = String(l.listing_url || '').trim();
  return {
    headline: `📍 ${l.municipality || '?'} · ${immoPriceText(l)} · ${rooms} · ${contact || 'no direct contact'}`,
    about: [l.property_name, l.description_de].filter(Boolean).join(' — ').slice(0, 220).replace(/\s+/g, ' ').trim(),
    url,
    linkNote: (l.private_signals || []).includes('generic_link') ? IMMO_LINK_NOTE : '',
    // Diagnostics only — never rendered on card / sheet / doc / telegram (owner request: source publish date, not search time).
    found: l.first_seen_at ? `found ${immoFormatFound(l.first_seen_at)}` : '',
    published: immoPublishedText(l),
    openLabel: /facebook\.com/.test(url) ? 'Open post' : 'Open listing',
    photos: (l.photo_urls || []).slice(0, 3).map((u, i) => ({ label: `Photo ${i + 1}`, url: u })),
    status: String(l.status || 'NEW'),
  };
}

/** The line under the description: URL, optional warning, publication and found dates. Same pieces and order as on screen. */
export function immoLinkLine(c: ImmoCard): string {
  const dates = immoDatesText(c);
  return `${c.url}${c.linkNote ? ` ${c.linkNote}` : ''}${dates ? ` · ${dates}` : ''}`;
}

/** Plain-text fallback of one card (used when rich formatting is unavailable). No letters. */
export function immoCardPlainText(c: ImmoCard): string {
  return [c.headline, c.about, immoLinkLine(c), [c.openLabel, ...c.photos.map((p) => p.label)].join(' · '), `Status: ${c.status}`].filter(Boolean).join('\n');
}
