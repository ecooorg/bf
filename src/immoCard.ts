/**
 * ImmoFinder listing card — single source of truth for screen, email, Telegram, Drive.
 * Pure functions only: no DOM, no Node APIs.
 *
 * User-facing card (minimal, verified facts only):
 *   📍 place · price · rooms · contact
 *   one clean about line (omitted when empty or garbage)
 *   url · optional list-page warning · published date
 *   Open … · Photo n
 *
 * Raw evidence stays in DB/raw for diagnostics; it is NOT shown on cards or in exports.
 */

export type ImmoCardInput = {
  municipality?: string | null; street_address?: string | null; property_name?: string | null; description_de?: string | null;
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
  /** Search/discovery time — diagnostics only; never on cards/exports. */
  found: string;
  /** "published 12.11.2026" when extractable; '' otherwise. */
  published: string;
  openLabel: 'Open post' | 'Open listing';
  photos: { label: string; url: string }[];
  status: string;
  /**
   * Stored for diagnostics / future use. Never rendered on user-facing cards or exports
   * (owner: only verified minimal fields on the card).
   */
  evidenceText: string;
  evidenceKind: '' | 'page_text' | 'snippet' | 'link_only';
  evidenceScreenshotUrl: string;
};

export const IMMO_COLORS = {
  page: '#07101b', card: '#0b1626', border: '#243a57', text: '#e8edf5', about: '#cfe6ff', link: '#7db8ff',
  warn: '#ffd28a', muted: '#8fa6c2', btnBg: '#1457b8', btnBorder: '#7db8ff', btnText: '#ffffff', chipBg: '#13263f', chipText: '#cfe6ff',
} as const;

export const IMMO_LINK_NOTE = '(list/group page — not a single object)';

export function immoFormatFound(v: string | Date | null | undefined): string {
  if (!v) return '';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('de-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

export function immoFormatDate(v: string | Date | null | undefined): string {
  if (!v) return '';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', year: 'numeric' });
}

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

export function immoPublishedText(l: ImmoCardInput): string {
  const d = immoFormatDate(l.listed_at ?? l.raw?.listed_at);
  return d ? `published ${d}` : '';
}

export function immoDatesText(c: Pick<ImmoCard, 'published' | 'found'>): string {
  return c.published || '';
}

export function immoTextFingerprint(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9äöüàèéêëïìôùâçß]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip portal tags, ellipsis noise, repeated halves. */
function cleanSnippet(raw: string): string {
  let s = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  s = s.replace(/\s*[-|–—·]\s*(homegate|flatfox|tutti|immowelt|immoscout|newhome|comparis|facebook|marketplace)\b[^\n]*/gi, '');
  s = s.replace(/(?:\s*(?:\.{3}|…)\s*)+/g, ' … ').replace(/^(?:\s*(?:\.{3}|…)\s*)+/, '').replace(/\s*\.{2,}\s*$/, '').trim();
  const fp = immoTextFingerprint(s);
  if (fp.length >= 24) {
    const half = Math.floor(s.length / 2);
    const a = s.slice(0, half).trim();
    const b = s.slice(half).trim();
    if (immoTextFingerprint(a) === immoTextFingerprint(b)) s = a;
  }
  const parts = s.split(/\s*(?:\.{3}|…)\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const p of parts) {
      const k = immoTextFingerprint(p);
      if (!k || seen.has(k)) continue;
      let dup = false;
      for (const prev of seen) {
        if (k.startsWith(prev) || prev.startsWith(k)) { dup = true; break; }
      }
      if (dup) continue;
      seen.add(k);
      uniq.push(p);
    }
    s = uniq.join(' · ');
  }
  s = s.replace(/^[·•,;:\s]+/, '').replace(/[·•,;:\s]+$/, '').trim();
  return s.slice(0, 160).trim();
}

/**
 * True when a candidate about line is not worth showing:
 * pure price/rooms fragment, too short, only punctuation, or only repeats headline facts.
 */
function isGarbageAbout(s: string, rooms: string | number | null | undefined): boolean {
  const t = String(s || '').trim();
  if (!t) return true;
  // Price-only crumbs
  if (/^(chf\s*)?[\d''`.]+(?:\s*[.–])?$/i.test(t)) return true;
  if (/^chf\s*[\d''`.,\s]+$/i.test(t) && t.length < 28) return true;
  // Rooms-only crumbs already on the headline
  if (/^\d+(?:[.,]\d+)?\s*(?:zi(?:mmer)?|rooms?)\b/i.test(t) && t.length < 48) return true;
  if (/zimmer\d/i.test(t) && t.length < 48) return true; // "Zimmer80m2" glued
  if (rooms != null && new RegExp(`^${String(rooms).replace('.', '\\.')}\\s*(?:zi|zimmer|rooms?)`, 'i').test(t) && t.length < 40) return true;
  if (/^[·….\-\s]+$/.test(t)) return true;
  const letters = (t.match(/[a-zäöüàèé]/gi) || []).length;
  // Allow short real titles (e.g. "New", "Dachwohnung"); reject letter-poor noise
  if (letters < 3) return true;
  return false;
}

/**
 * One about line: cleaned title or description, never a search-snippet dump.
 * Empty when nothing reliable remains.
 */
function buildAbout(name: string, description: string, rooms: string | number | null | undefined): string {
  const title = cleanSnippet(name);
  let body = cleanSnippet(description);

  if (title && body) {
    const t = title.replace(/\s*(?:\.{3}|…)\s*$/, '').trim();
    if (t.length >= 12) {
      const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      body = body
        .replace(new RegExp(`^${esc}\\s*[—–\\-]\\s*${esc}`, 'i'), t)
        .replace(new RegExp(`^${esc}\\s*[—–\\-]\\s*`, 'i'), '')
        .replace(new RegExp(`^${esc}\\s+`, 'i'), '');
      body = body.split(t).join(' ').replace(/\s+/g, ' ').trim();
    }
    if (immoTextFingerprint(body) === immoTextFingerprint(title)) body = '';
  }

  let about = body;
  if (isGarbageAbout(about, rooms)) about = title;
  if (isGarbageAbout(about, rooms)) return '';
  return about.slice(0, 180).trim();
}

export function immoCardModel(l: ImmoCardInput): ImmoCard {
  const contact =
    l.contact_status === 'found'
      ? [l.owner_name, l.direct_phone, l.direct_email].filter(Boolean).join(' · ')
      : l.contact_status === 'platform_only'
        ? ['via platform enquiry', l.owner_name].filter(Boolean).join(' · ')
        : '';
  const rooms =
    l.rooms_estimated != null && String(l.rooms_estimated) !== ''
      ? `${l.rooms_estimated} rooms`
      : 'rooms n/a';
  const url = String(l.listing_url || '').trim();
  const evidence =
    typeof l.raw?.evidence_text === 'string'
      ? String(l.raw.evidence_text).replace(/\s+/g, ' ').trim()
      : '';
  const about = buildAbout(String(l.property_name || ''), String(l.description_de || ''), l.rooms_estimated);
  const address = String(l.street_address || '').replace(/\s+/g, ' ').trim();
  const aboutLine = [address, about].filter(Boolean).join(' · ').slice(0, 180);
  const kindRaw = l.raw?.evidence_kind;
  const evidenceKind =
    kindRaw === 'page_text' || kindRaw === 'snippet' || kindRaw === 'link_only'
      ? kindRaw
      : evidence
        ? 'page_text'
        : '';
  const shot =
    typeof l.raw?.evidence_screenshot_url === 'string'
      ? String(l.raw.evidence_screenshot_url).trim()
      : '';
  return {
    headline: `📍 ${l.municipality || '?'} · ${immoPriceText(l)} · ${rooms} · ${contact || 'no direct contact'}`,
    about: aboutLine,
    url,
    linkNote: (l.private_signals || []).includes('generic_link') ? IMMO_LINK_NOTE : '',
    found: l.first_seen_at ? `found ${immoFormatFound(l.first_seen_at)}` : '',
    published: immoPublishedText(l),
    openLabel: /facebook\.com/.test(url) ? 'Open post' : 'Open listing',
    photos: (l.photo_urls || []).slice(0, 3).map((u, i) => ({ label: `Photo ${i + 1}`, url: u })),
    status: String(l.status || 'NEW'),
    evidenceText: evidence.slice(0, 6000),
    evidenceKind: evidenceKind as ImmoCard['evidenceKind'],
    evidenceScreenshotUrl: shot,
  };
}

export function immoLinkLine(c: ImmoCard): string {
  const dates = immoDatesText(c);
  return `${c.url}${c.linkNote ? ` ${c.linkNote}` : ''}${dates ? ` · ${dates}` : ''}`;
}

/** Kept for API compatibility; always true for user-facing paths (evidence is not shown). */
export function immoEvidenceIsRedundant(_about: string, _evidenceText: string): boolean {
  return true;
}

/**
 * Evidence is intentionally omitted from all user-facing cards and exports.
 * Raw evidence remains in the model/DB for diagnostics only.
 */
export function immoEvidenceBlock(_c: ImmoCard): string {
  return '';
}

/** Plain-text card for email, Telegram, sheet cell — same fields as the screen. */
export function immoCardPlainText(c: ImmoCard): string {
  const actions = [c.openLabel, ...c.photos.map((p) => p.label)].join(' · ');
  return [c.headline, c.about, immoLinkLine(c), actions].filter(Boolean).join('\n');
}
