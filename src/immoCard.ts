/**
 * ImmoFinder listing card — the single source of truth for what one card says and how it is coloured.
 * The screen (src/ImmoFinder.tsx) and the Google Sheet / Doc / email / Telegram export
 * (server/immofinderDelivery.ts) both read this model, so a listing reads the same everywhere.
 * Pure functions only: no DOM, no Node APIs.
 *
 * Card layout (minimal, verified facts only):
 *   📍 place · price · rooms · contact
 *   one clean about line (no title/description echo)
 *   url · optional list-page warning · published date
 *   Open … · Photo n
 *   optional non-redundant source evidence
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
  /**
   * Verbatim source excerpt for Drive Doc/Sheet (and plain exports). Empty when none was stored.
   * Label line is built by immoEvidenceBlock().
   */
  evidenceText: string;
  evidenceKind: '' | 'page_text' | 'snippet' | 'link_only';
  /** Public URL of a page capture when the pipeline stored one. */
  evidenceScreenshotUrl: string;
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

/** Collapse whitespace and strip URLs / punctuation for fuzzy compare. */
export function immoTextFingerprint(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9äöüàèéêëïìôùâçß]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip portal suffixes, ellipsis noise and repeated phrases from a title/snippet. */
function cleanTitle(raw: string): string {
  let s = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  // Drop trailing / embedded site / portal tags: "… - Homegate", "| Flatfox", "– Immowelt"
  s = s.replace(/\s*[-|–—·]\s*(homegate|flatfox|tutti|immowelt|immoscout|newhome|comparis|facebook|marketplace)\b[^\n]*/gi, '');
  // Collapse repeated ellipsis and trailing dots; drop leading ellipsis left by cuts
  s = s.replace(/(?:\s*(?:\.{3}|…)\s*)+/g, ' … ').replace(/^(?:\s*(?:\.{3}|…)\s*)+/, '').replace(/\s*\.{2,}\s*$/, '').trim();
  // Drop a second copy of the same phrase (title echoed inside itself)
  const fp = immoTextFingerprint(s);
  if (fp.length >= 24) {
    const half = Math.floor(s.length / 2);
    const a = s.slice(0, half).trim();
    const b = s.slice(half).trim();
    if (immoTextFingerprint(a) === immoTextFingerprint(b)) s = a;
  }
  return s.slice(0, 120).trim();
}

/**
 * Build a single about line that does not repeat the title and does not paste
 * the same search-snippet twice (the main quality complaint on current cards).
 */
function buildAbout(name: string, description: string, evidence: string): string {
  const title = cleanTitle(name);
  // Run the same portal/ellipsis cleanup on description before comparing to title.
  let body = cleanTitle(String(description || ''));

  // Prefer description; only fall back to evidence when description is empty
  // (never absorb evidence into about when a short distinct blurb exists — tests and
  // exports treat evidence as a separate expandable block).
  if (!body) {
    body = cleanTitle(String(evidence || '')).slice(0, 220);
  }

  // Remove exact title prefix / "title — title" patterns.
  if (title) {
    const t = title.replace(/\s*(?:\.{3}|…)\s*$/, '').trim();
    if (t.length >= 12) {
      const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      body = body
        .replace(new RegExp(`^${esc}\\s*[—–\\-]\\s*${esc}`, 'i'), t)
        .replace(new RegExp(`^${esc}\\s*[—–\\-]\\s*`, 'i'), '')
        .replace(new RegExp(`^${esc}\\s+`, 'i'), '');
      // Drop a second full echo of the title anywhere in the body
      body = body.split(t).join(' ').replace(/\s+/g, ' ').trim();
    }
  }

  // Collapse internal duplicated halves (snippet pasted twice).
  body = body.replace(/(?:\s*(?:\.{3}|…)\s*)+/g, ' … ').replace(/^(?:\s*(?:\.{3}|…)\s*)+/, '').trim();
  const fp = immoTextFingerprint(body);
  if (fp.length >= 30) {
    const mid = Math.floor(body.length / 2);
    const left = body.slice(0, mid).trim();
    const right = body.slice(mid).trim();
    if (immoTextFingerprint(left) === immoTextFingerprint(right)) body = left;
    const parts = body.split(/\s*(?:\.{3}|…)\s*/).map((p) => p.trim()).filter(Boolean);
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
      body = uniq.join(' · ');
    }
  }

  // If after cleanup body is still basically the title, drop it (title becomes about).
  if (title && immoTextFingerprint(body) === immoTextFingerprint(title)) {
    body = '';
  }
  // Prefer a real description; fall back to cleaned title.
  const about = (body || title || '').slice(0, 220).trim();
  return about;
}

export function immoCardModel(l: ImmoCardInput): ImmoCard {
  const contact =
    l.contact_status === 'found'
      ? [l.owner_name, l.direct_phone, l.direct_email].filter(Boolean).join(' · ')
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
  const name = cleanTitle(String(l.property_name || ''));
  const about = buildAbout(name, String(l.description_de || ''), evidence);
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
    about,
    url,
    linkNote: (l.private_signals || []).includes('generic_link') ? IMMO_LINK_NOTE : '',
    // Diagnostics only — never rendered on card / sheet / doc / telegram.
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

/** The line under the description: URL, optional warning, publication date. Same pieces and order as on screen. */
export function immoLinkLine(c: ImmoCard): string {
  const dates = immoDatesText(c);
  return `${c.url}${c.linkNote ? ` ${c.linkNote}` : ''}${dates ? ` · ${dates}` : ''}`;
}

/**
 * True when evidence is only a duplicate (or near-duplicate) of the short about line.
 * In that case exporting "Source text" adds noise without new information.
 */
export function immoEvidenceIsRedundant(about: string, evidenceText: string): boolean {
  const e = immoTextFingerprint(evidenceText);
  const a = immoTextFingerprint(about);
  if (!e) return true;
  if (!a) return false;
  if (e === a) return true;
  if (e.startsWith(a) && e.length <= a.length + 40) return true;
  if (a.startsWith(e) && a.length <= e.length + 40) return true;
  if (e.includes(a) && e.length < a.length * 1.35 + 30) return true;
  if (a.includes(e) && a.length < e.length * 1.35 + 30) return true;
  // Evidence is mostly the same words as about (snippet re-echo)
  const aWords = new Set(a.split(' ').filter((w) => w.length > 2));
  if (aWords.size >= 4) {
    const eWords = e.split(' ').filter((w) => w.length > 2);
    const overlap = eWords.filter((w) => aWords.has(w)).length;
    if (overlap / Math.max(eWords.length, 1) > 0.85 && e.length < a.length * 2) return true;
  }
  return false;
}

/**
 * Evidence block under a listing (Doc / Sheet / plain).
 * - Screenshot URL only when a real capture was stored.
 * - Source text only when it adds information beyond the card "about" line (no duplicate paste).
 */
export function immoEvidenceBlock(c: ImmoCard): string {
  const parts: string[] = [];
  if (c.evidenceScreenshotUrl) {
    parts.push(`Source capture: ${c.evidenceScreenshotUrl}`);
  }
  if (c.evidenceText && !immoEvidenceIsRedundant(c.about, c.evidenceText)) {
    const kind =
      c.evidenceKind === 'snippet' ? 'search snippet' :
      c.evidenceKind === 'link_only' ? 'link only' :
      c.evidenceKind === 'page_text' ? 'page text' : 'source';
    parts.push(`Source text (${kind}):`);
    parts.push(c.evidenceText);
  }
  return parts.join('\n');
}

/** Plain-text fallback of one card (used by email, Telegram, sheet cell). Same order as the screen. */
export function immoCardPlainText(c: ImmoCard): string {
  const actions = [c.openLabel, ...c.photos.map((p) => p.label)].join(' · ');
  const evidence = immoEvidenceBlock(c);
  return [c.headline, c.about, immoLinkLine(c), actions, evidence].filter(Boolean).join('\n');
}
