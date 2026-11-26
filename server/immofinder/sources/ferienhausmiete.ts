/**
 * Ferienhausmiete.de source adapter (owner-catalog tier).
 */

export interface DetailCandidate {
  url: string;
  titleHint?: string;
}

export interface ExtractedFields {
  title: string | null;
  rooms: { value: number; quote: string } | null;
  locality: { value: string; quote: string } | null;
  priceText: string | null;
  privateMarker: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  evidenceQuotes: string[];
}

const DETAIL_RE = /https:\/\/www\.ferienhausmiete\.de\/\d+\.htm/gi;
const TITLE_RE = /<h1[^>]*>([^<]+)<\/h1>/i;
const ROOMS_RE = /(\d+(?:[.,]\d+)?(?:\s*1\/2|½)?)(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*(?:\bzimmer\b|\bzi\.|\brooms?\b)/i;

export function discover(indexHtml: string, indexUrl: string): DetailCandidate[] {
  const found = new Set<string>();
  const out: DetailCandidate[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(DETAIL_RE.source, 'gi');
  while ((m = re.exec(indexHtml)) !== null) {
    const url = m[0];
    if (found.has(url)) continue;
    found.add(url);
    out.push({ url });
  }
  const rel = /href="(\/\d+\.htm)"/gi;
  while ((m = rel.exec(indexHtml)) !== null) {
    const url = `https://www.ferienhausmiete.de${m[1]}`;
    if (found.has(url)) continue;
    found.add(url);
    out.push({ url });
  }
  const hints = new Map<string, string>();
  const anchors = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = anchors.exec(indexHtml)) !== null) {
    try {
      const url = new URL(m[1], indexUrl).toString();
      if (!new RegExp(DETAIL_RE.source, 'i').test(url)) continue;
      const hint = m[2].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim().slice(0, 160);
      if (hint) hints.set(url, hint);
    } catch { /* ignore malformed index links */ }
  }
  return out.map((item) => ({ ...item, titleHint: hints.get(item.url) }));
}

export function extract(pageHtmlOrText: string, pageUrl: string): ExtractedFields {
  const plain = pageHtmlOrText
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let title: string | null = null;
  const tm = pageHtmlOrText.match(TITLE_RE);
  if (tm) title = tm[1].trim();
  else {
    const og = pageHtmlOrText.match(/property="og:title"\s+content="([^"]+)"/i);
    if (og) title = og[1].trim();
  }

  let rooms: ExtractedFields['rooms'] = null;
  const rm = plain.match(ROOMS_RE);
  if (rm) {
    const raw = rm[1].replace(/\s+/g, '').replace(',', '.');
    const half = raw.endsWith('1/2') || raw.endsWith('½');
    const base = parseFloat(raw.replace(/(?:1\/2|½)$/, ''));
    const n = half ? base + 0.5 : base;
    if (Number.isFinite(n)) rooms = { value: n, quote: rm[0].trim() };
  }

  const evidenceQuotes: string[] = [];
  if (rooms) evidenceQuotes.push(rooms.quote);

  return {
    title,
    rooms,
    locality: null,
    priceText: null,
    privateMarker: null,
    contactPhone: null,
    contactEmail: null,
    evidenceQuotes,
  };
}

export const ferienhausmieteAdapter = {
  id: 'ferienhausmiete' as const,
  discover,
  extract,
};
