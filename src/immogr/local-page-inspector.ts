export type LocalPageLink = { url: string; text: string };
export type LocalPageImage = { url: string; alt: string; title: string };
export type LocalPageInspection = {
  title: string;
  sourceUrl: string;
  text: string;
  links: LocalPageLink[];
  images: LocalPageImage[];
  metadata: Record<string, string>;
  jsonLd: string[];
};

function safePageUrl(value: string | null | undefined, baseUrl: string): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim(), baseUrl || undefined);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) return undefined;
    return url.toString();
  } catch { return undefined; }
}

/** Inspect a DOMParser-created local document. Never executes page scripts or loads remote resources. */
export function inspectLocalHtmlDocument(documentCopy: Document, sourceUrl: string): LocalPageInspection {
  const canonical = safePageUrl(documentCopy.querySelector('link[rel="canonical"]')?.getAttribute('href'), sourceUrl);
  const baseUrl = safePageUrl(sourceUrl, '') || canonical || 'https://local.invalid/';
  const links: LocalPageLink[] = [];
  for (const anchor of Array.from(documentCopy.querySelectorAll('a[href]'))) {
    const url = safePageUrl(anchor.getAttribute('href'), baseUrl);
    if (!url) continue;
    links.push({ url, text: (anchor.textContent || anchor.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 500) });
  }
  const images: LocalPageImage[] = [];
  const imageCandidates = [
    ...Array.from(documentCopy.querySelectorAll('img')),
    ...Array.from(documentCopy.querySelectorAll('source')),
  ];
  for (const node of imageCandidates) {
    const raw = node.getAttribute('src') || node.getAttribute('data-src') || node.getAttribute('srcset')?.split(',')[0]?.trim().split(/\s+/)[0];
    const url = safePageUrl(raw, baseUrl);
    if (!url) continue;
    images.push({
      url,
      alt: (node.getAttribute('alt') || '').slice(0, 500),
      title: (node.getAttribute('title') || '').slice(0, 300),
    });
  }
  const metadata: Record<string, string> = {};
  for (const meta of Array.from(documentCopy.querySelectorAll('meta[name],meta[property],meta[itemprop]'))) {
    const key = meta.getAttribute('property') || meta.getAttribute('name') || meta.getAttribute('itemprop');
    const value = meta.getAttribute('content');
    if (key && value && !metadata[key]) metadata[key] = value.slice(0, 2000);
  }
  const jsonLd = Array.from(documentCopy.querySelectorAll('script[type="application/ld+json"]'))
    .map((script) => (script.textContent || '').trim())
    .filter(Boolean)
    .slice(0, 30);
  const body = documentCopy.body;
  const text = (body?.innerText || body?.textContent || '').replace(/[\t\r\n ]+/g, ' ').trim().slice(0, 100_000);
  return {
    title: (documentCopy.title || metadata['og:title'] || '').trim().slice(0, 500),
    sourceUrl: safePageUrl(sourceUrl, '') || canonical || '',
    text,
    links: links.slice(0, 500),
    images: images.slice(0, 300),
    metadata,
    jsonLd,
  };
}
