/**
 * Static listing-card adapter for Swiss classifieds (Anibis/Tutti).
 * Only same-host detail URLs with numeric listing IDs are admitted.
 */
export interface DetailCandidate { url: string; titleHint?: string }
export interface ExtractedFields {
  title: string | null;
  rooms: { value: number; quote: string } | null;
  locality: { value: string; quote: string } | null;
  priceText: string | null;
  privateMarker: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  evidenceQuotes: string[];
  agencyName?: string | null;
  descriptionText?: string;
}

function plainText(html: string): string {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ').trim();
}

export function createSwissClassifiedAdapter(id: 'portal-anibis' | 'portal-tutti' | 'portal-flatfox', host: string) {
  const detailPath = id === 'portal-flatfox'
    ? /^\/(?:de\/wohnung|en\/flat)\/.+\/\d+\/?$/i
    : /^\/de\/vi\/(?:.*\/)?\d+\/?$/i;
  function discover(indexHtml: string, indexUrl: string): DetailCandidate[] {
    const found = new Map<string, string>();
    const re = /<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(indexHtml)) !== null) {
      try {
        const u = new URL(m[2], indexUrl);
        if (u.hostname.replace(/^www\./i, '').toLowerCase() !== host) continue;
        if (!detailPath.test(u.pathname)) continue;
        u.hash = ''; u.search = '';
        const url = u.toString().replace(/\/$/, '');
        const hint = plainText(m[4] || m[1] || m[3]).slice(0, 240);
        if (!found.has(url) || hint.length > (found.get(url)?.length || 0)) found.set(url, hint);
      } catch { /* ignore malformed links */ }
    }
    return [...found].map(([url, titleHint]) => ({ url, titleHint }));
  }

  function extract(html: string, _pageUrl: string): ExtractedFields {
    const plain = plainText(html);
    const titleRaw = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]
      || /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1]
      || /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '';
    const title = plainText(titleRaw).slice(0, 240) || null;
    const rm = /(\d+(?:[.,]\d+)?(?:\s*1\/2|½)?)(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*[-–]?\s*(?:zimmer|zi\.?|rooms?|chambres?|camere)\b/i.exec(plain);
    let rooms: { value: number; quote: string } | null = null;
    if (rm) {
      const raw = rm[1].replace(/\s+/g, '').replace(',', '.');
      const half = raw.endsWith('1/2') || raw.endsWith('½');
      const base = parseFloat(raw.replace(/(?:1\/2|½)$/, ''));
      rooms = Number.isFinite(base) ? { value: base + (half ? 0.5 : 0), quote: rm[0] } : null;
    }
    const loc = /\b(\d{4})\s*,?\s*([A-ZÄÖÜ][\p{L}’'/-]*(?:\s+[A-ZÄÖÜ][\p{L}’'/-]*){0,3})\b/u.exec(plain);
    const locality = loc ? { value: loc[2].trim(), quote: loc[0] } : null;
    const price = /(?:CHF\s*)?\d[\d'’., ]{1,10}\s*(?:(?:inkl\.?\s*(?:NK|Nebenkosten)\s*)?pro\s+(?:Monat|Woche|Tag)|CHF|\/\s*(?:Mt\.?|Monat|Woche))/i.exec(plain)?.[0] || null;
    const phone = /(?:\+41|0041|0)\s*\d{2}\s*(?:\d{3}|\d{2})\s*\d{2}\s*\d{2}/.exec(plain)?.[0] || null;
    const email = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.exec(plain)?.[0] || null;
    const privateMarker = /(?:von\s+privat|privatperson|private\s+anbieter|privater\s+anbieter|privat\s+inseriert)/i.exec(plain)?.[0] || null;
    const sellerSection = /(?:Inserent|Anbieter|Advertiser)[\s\S]{0,220}/i.exec(plain)?.[0] || '';
    const agencyName = /\b([A-ZÄÖÜ][\p{L}\p{N}&'’.-]+(?:\s+[A-ZÄÖÜ][\p{L}\p{N}&'’.-]+){0,4}\s+(?:AG|GmbH|SA|Sàrl|KG|Ltd\.?))\b/u.exec(sellerSection)?.[1] || null;
    const evidenceQuotes = [rooms?.quote, locality?.quote, price, privateMarker, agencyName].filter((x): x is string => Boolean(x));
    return { title, rooms, locality, priceText: price, privateMarker, contactPhone: phone, contactEmail: email, agencyName, evidenceQuotes };
  }
  return { id, discover, extract };
}
