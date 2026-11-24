/** P130.10j — shared ImmoFinder search quality guards (Serper budget, junk hosts, list noise). */
/** Module-level: once Serper reports no credits, further calls fail immediately without network. */
let serperCreditsExhausted = false;

export function isSerperCreditsExhausted(): boolean {
  return serperCreditsExhausted;
}

export function markSerperCreditsExhausted(): void {
  serperCreditsExhausted = true;
}

export function resetSerperCreditsFlagForTests(): void {
  serperCreditsExhausted = false;
}

/** True when a Serper error message means the key has no remaining quota. */
export function isSerperCreditsError(message: string): boolean {
  return /not enough credits/i.test(String(message || ''));
}

/**
 * Hosts / paths that are aggregators, holiday catalogues, news, hotels, or district indexes —
 * never a single long-term rental detail page for GR discovery.
 */
export function isJunkDiscoveryTarget(title: string, url: string): boolean {
  const t = String(title || '');
  const u = String(url || '');
  let host = '';
  try {
    host = new URL(u).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return false;
  }
  // Aggregators / SEO mirrors / holiday catalogs
  if (/(^|\.)(trovit\.|feriwa\.com|gites\.fr|marloo\.swiss|rentola\.ch|rentumo\.ch|properstar\.|homematch\.|moving24\.|roomlala\.|bedandbreakfast\.eu)$/i.test(host)) return true;
  // Google Hotels / Travel entities are not long-term rentals
  if (/^google\./i.test(host) && /\/travel\/hotels\b/i.test(u)) return true;
  // Acheter-louer: district indexes, "à vendre", commercial
  if (/acheter-louer\.ch/i.test(host)) {
    if (/\/district-|\/quartier-|\/acheter\/|a-vendre|commerciaux/i.test(u)) return true;
    if (/\b(tous les|à vendre|verkauf|kaufen)\b/i.test(t)) return true;
  }
  if (/\/news\/?$/i.test(u) || /\/urlaub\//i.test(u)) return true;
  if (/\btrovit\.|feriwa\.|gites\.fr|rentola\.ch\b/i.test(u)) return true;
  // Aggregate SERP titles
  if (/\b\d+[’']?\d*\s+(h[aä]user|wohnungen|immobilien|angebote|inserate)\s+mieten\b/i.test(t)) return true;
  if (/^(alle inserate|tous les biens|page\s+\d+)\b/i.test(t)) return true;
  if (/\b(inserate|wohnungen)\s+mieten\s+in\b/i.test(t) && /\b\d+\s+inserate\b/i.test(t)) return true;
  // Sale titles that leak into rental SERP
  if (/\b(kaufpreis|zu verkaufen|zum verkauf|à vendre|for sale)\b/i.test(t) && !/\b(mieten|zu vermieten|à louer)\b/i.test(t)) return true;
  return false;
}

/** Homegate trefferliste consistently returns HTTP 403 from our fetchers — do not expand. */
export function shouldExpandIndexUrl(url: string): boolean {
  const u = String(url || '');
  if (/homegate\.ch/i.test(u) && /trefferliste|\/liste(\/|$)/i.test(u)) return false;
  if (/immoscout24\.ch/i.test(u) && /trefferliste|\/liste(\/|$)/i.test(u)) return true;
  return false;
}
