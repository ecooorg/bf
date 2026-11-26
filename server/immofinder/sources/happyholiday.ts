/**
 * HappyHoliday source adapter (tier candidate).
 * discover() returns detail URLs from index HTML; extract() returns typed fields with quotes.
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
  descriptionText?: string;
}

const DETAIL_RE = /https:\/\/happyholiday\.ch\/haus\/[^"'>\s]+/gi;
const TITLE_RE = /<h1[^>]*>([^<]+)<\/h1>/i;
const ROOMS_RE = /(\d+(?:[.,]\d+)?)\s*(?:[-–]?\s*\d+(?:[.,]\d+)?)?\s*(?:zimmer|zi\.)/i;
const PRIVATE_RE = /von\s+privat/i;

export function discover(indexHtml: string, indexUrl: string): DetailCandidate[] {
  const found = new Set<string>();
  const out: DetailCandidate[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(DETAIL_RE.source, 'gi');
  while ((m = re.exec(indexHtml)) !== null) {
    let url = m[0].replace(/\/$/, '');
    if (found.has(url)) continue;
    found.add(url);
    out.push({ url });
  }
  const rel = /href="(\/haus\/[^"]+)"/gi;
  while ((m = rel.exec(indexHtml)) !== null) {
    const url = `https://happyholiday.ch${m[1]}`.replace(/\/$/, '');
    if (found.has(url)) continue;
    found.add(url);
    out.push({ url });
  }
  const hints = new Map<string, string>();
  const anchors = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = anchors.exec(indexHtml)) !== null) {
    try {
      const url = new URL(m[1], indexUrl).toString().replace(/\/$/, '');
      if (!new RegExp(DETAIL_RE.source, 'i').test(url)) continue;
      const hint = m[2].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim().slice(0, 160);
      if (hint) hints.set(url, hint);
    } catch { /* ignore malformed index links */ }
  }
  return out.map((item) => ({ ...item, titleHint: hints.get(item.url) }));
}

function decodeDescription(value: string): string {
  return value.replace(/\\u0026/gi, '&').replace(/\\n/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function extractDescriptionText(html: string): string {
  const values: string[] = [];
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/(?:name|property)=["'](?:description|og:description)["']/i.test(tag)) continue;
    const m = /content=["']([^"']{40,})["']/i.exec(tag);
    if (m) values.push(decodeDescription(m[1]));
  }
  const scripts = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    const re = /["'](?:description|summary|details|teaser)["']\s*:\s*["']((?:\\.|[^"'\\]){40,})["']/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(script)) !== null) {
      let value = m[1];
      try { value = JSON.parse('"' + value + '"'); }
      catch { value = value.replace(/\\(["'\\])/g, '$1'); }
      values.push(decodeDescription(value));
    }
  }
  return [...new Set(values)].filter((x) => x.length >= 60).join(' ').slice(0, 5_000);
}

export function extract(pageHtmlOrText: string, pageUrl: string): ExtractedFields {
  const text = pageHtmlOrText.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  let title: string | null = null;
  const tm = pageHtmlOrText.match(TITLE_RE);
  if (tm) title = tm[1].trim();
  else {
    const og = pageHtmlOrText.match(/property="og:title"\s+content="([^"]+)"/i);
    if (og) title = og[1].trim();
  }

  let rooms: ExtractedFields['rooms'] = null;
  const descriptionText = extractDescriptionText(pageHtmlOrText);
  const searchable = plain + ' ' + descriptionText;
  const rm = searchable.match(ROOMS_RE);
  if (rm) {
    const n = parseFloat(rm[1].replace(',', '.'));
    if (Number.isFinite(n)) rooms = { value: n, quote: rm[0].trim() };
  }

  let locality: ExtractedFields['locality'] = null;
  const locFromUrl = pageUrl.match(/-in-([a-z0-9-]+)\/?$/i);
  if (locFromUrl) {
    const name = locFromUrl[1].replace(/-/g, ' ');
    locality = { value: name, quote: locFromUrl[0] };
  }

  let privateMarker: string | null = null;
  const pm = searchable.match(PRIVATE_RE);
  if (pm) privateMarker = pm[0];

  const evidenceQuotes: string[] = [];
  if (rooms) evidenceQuotes.push(rooms.quote);
  if (privateMarker) evidenceQuotes.push(privateMarker);

  return {
    title,
    rooms,
    locality,
    priceText: null,
    privateMarker,
    contactPhone: null,
    contactEmail: null,
    evidenceQuotes,
    descriptionText,
  };
}

export const happyholidayAdapter = {
  id: 'happyholiday' as const,
  discover,
  extract,
};
