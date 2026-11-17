/** ImmoFinder GR — pure logic (no I/O): matching, filters, verification, drafts. Every stored fact must be verifiable in fetched text. */
export interface ImmoConfig {
  municipalities: string[]; stopAgencies: string[]; minRooms: number; platformDomains: string[];
  sources: { id: string; url: string; phase: number; cityUrl?: string; detailPattern?: string; cutMarkers?: string[]; privateTitleHint?: string; maxDetailPages?: number; indexUrls?: string[] }[];
  fetch: { userAgent: string; perHostDelayMs: number; respectRobotsTxt: boolean };
  limits: { maxDetailPagesPerSource: number; recheckAfterDays: number; fetchTimeoutMs: number; maxPageBytes: number };
  estCostPerLlmCallUsd: number;
  estCostPerSearchUsd?: number;
  driveFolderId?: string;
  discovery?: { enabled: boolean; communesPerRun: number; resultsPerQuery: number; maxPagesPerRun: number; queries: string[]; snippetOnlyHosts: string[]; skipHosts: string[] };
  /** Optional public-source contact enrichment (secondary search + optional reverse image). Default off when omitted. */
  contactEnrichment?: {
    enabled: boolean;
    maxExtraSearchesPerRun?: number;
    maxReverseImagePerRun?: number;
    maxCandidatePagesPerListing?: number;
    useReverseImage?: boolean;
    useSecondarySearch?: boolean;
    skipHosts?: string[];
    snippetOnlyHosts?: string[];
  };
  /** Default quality gates (overridden by saved user settings per run). */
  quality?: {
    maxMonthlyRentChf?: number;
    maxListingAgeDays?: number;
    requirePrice?: boolean;
    rejectNonMonthly?: boolean;
    rejectSeekerPosts?: boolean;
    requireContact?: boolean;
  };
  /** Hard wall-clock limit for one search cycle (ms). Default 30 minutes. */
  runMaxDurationMs?: number;
  /** First-wave budget for high-value catalogue sources (ms). Default 10 minutes. */
  priorityWaveMs?: number;
}

export function norm(s: string): string {
  return String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Aliases → canonical municipality from config.
 * Sites often write short forms (St. Peter, Sankt Peter, Seewis) for whitelist entries
 * that use compound official names (St. Peter-Molinis, Seewis-Pardisla).
 */
const MUNICIPALITY_ALIASES: Record<string, string[]> = {
  'St. Peter-Molinis': ['st peter', 'sankt peter', 'st peter-molinis', 'st peter molinis', 'st peter-pagig', 'st peter pagig', 'molinis', 'pagig'],
  'Seewis-Pardisla': ['seewis', 'seewis-pardisla', 'seewis pardisla', 'pardisla'],
  'Domat/Ems': ['domat', 'domat ems', 'domat/ems', 'ems'],
  'Churwalden': ['churwalden'],
  'Lenzerheide': ['lenzerheide', 'valbella', 'parpan'],
  'Flims': ['flims', 'fidaz'],
  'Laax': ['laax'],
  'Trimmis': ['trimmis'],
  'Igis': ['igis', 'landquart-igis'],
};

/** Whole-word match of a whitelist commune in text; longest commune wins. Returns the canonical config spelling. */
export function matchMunicipality(text: string, list: string[]): string | null {
  const hay = ` ${norm(text)} `;
  let best: string | null = null;
  let bestLen = 0;
  for (const m of list) {
    const translit = norm(m.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue'));
    const variants = new Set([norm(m), translit]);
    const aliases = MUNICIPALITY_ALIASES[m];
    if (aliases) for (const a of aliases) variants.add(norm(a));
    for (const n of variants) {
      if (n && hay.includes(` ${n} `) && n.length > bestLen) {
        best = m;
        bestLen = n.length;
      }
    }
  }
  if (!best) {
    for (const [canonical, aliases] of Object.entries(MUNICIPALITY_ALIASES)) {
      if (!list.includes(canonical)) continue;
      for (const a of aliases) {
        const n = norm(a);
        if (n && hay.includes(` ${n} `) && n.length > bestLen) {
          best = canonical;
          bestLen = n.length;
        }
      }
    }
  }
  return best;
}

/** Swiss "Zimmer" count from a (verified) quote: 3, 3.5, 4½, "3 1/2 Zi.", "Zimmer: 3". Bedrooms fall back to bedrooms + 1. */

/**
 * Place hint from a listing URL (e.g. happyholiday …-in-scuol, path segments).
 * Returns canonical whitelist name when the hint matches; if the URL clearly names a
 * non-whitelist place, returns { outside: true } so the pipeline can skip before fetch/LLM.
 */
export function placeFromUrl(url: string, list: string[]): { matched: string | null; outside: boolean; hint: string | null } {
  let path = '';
  try { path = decodeURIComponent(new URL(url).pathname); } catch { return { matched: null, outside: false, hint: null }; }
  const raw = path.replace(/[-_/.]+/g, ' ').replace(/\s+/g, ' ').trim();
  const inSlug = /-in-([a-z0-9äöü\-]+)/i.exec(path);
  const hints: string[] = [];
  if (inSlug) hints.push(inSlug[1].replace(/-/g, ' '));
  // last meaningful path segment as fallback
  const seg = path.split('/').filter(Boolean).pop() || '';
  if (seg && seg.length > 3) hints.push(seg.replace(/[-_]/g, ' '));
  for (const h of hints) {
    const m = matchMunicipality(h, list);
    if (m) return { matched: m, outside: false, hint: h };
  }
  // If URL has an explicit -in-{place} and it did not match whitelist → outside zone
  if (inSlug) {
    const h = inSlug[1].replace(/-/g, ' ');
    // Only treat as outside when the slug looks like a place name (not a generic token)
    if (h.length >= 3 && !/^(haus|wohnung|ferien|detail|objekt|ch|de)$/i.test(h)) {
      return { matched: null, outside: true, hint: h };
    }
  }
  return { matched: null, outside: false, hint: null };
}

/**
 * Cheap pre-LLM geo check on title + first part of page text / search snippet.
 * If a clear non-whitelist place is named and no whitelist commune appears, treat as outside.
 * Conservative: only outside when an explicit known-outside pattern appears.
 */
export function placeFromTitleOrSnippet(title: string, snippet: string, list: string[]): { matched: string | null; outside: boolean; hint: string | null } {
  const head = `${title || ''} ${snippet || ''}`.slice(0, 800);
  const m = matchMunicipality(head, list);
  if (m) return { matched: m, outside: false, hint: m };
  // Strong outside signals common in GR tourism pages (Engadin, Scuol, Samnaun, …)
  const OUTSIDE = /\b(scuol|engadin|samnaun|sils|silvaplana|st\.?\s*moritz|pontresina|zuoz|madulain|celerina|samedan|zernez|guarda|arosa(?!\s*[-–]?chur)|davos|klosters|val\s*müstair|poschiavo|brusio)\b/i;
  const om = OUTSIDE.exec(head);
  if (om) return { matched: null, outside: true, hint: om[1] };
  return { matched: null, outside: false, hint: null };
}

export function parseRooms(text: string): { rooms: number; basis: 'zimmer' | 'bedrooms' } | null {
  let t = String(text ?? '').replace(/½/g, '.5').replace(/,(\d)/g, '.$1');
  // "3 1/2" or "3 1/2 Zi." → 3.5
  t = t.replace(/(\d{1,2})\s+1\/2/g, '$1.5');
  // "Zimmer: 3" / "Zimmer 3.5"
  const labeled = [...t.matchAll(/(?:zimmer|zi\.?|rooms?|pieces?)\s*[:=]?\s*(\d{1,2}(?:\.\d)?)/gi)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 20);
  const z = [...t.matchAll(/(\d{1,2}(?:\.\d)?)\s*[- ]?\s*(?:zimmer|zi\b|zi\.|rooms?|pieces?|-?zimmerwohnung)/gi)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 20);
  const allZ = [...labeled, ...z];
  if (allZ.length) return { rooms: Math.max(...allZ), basis: 'zimmer' };
  const b = [...t.matchAll(/(\d{1,2})\s*[- ]?\s*(?:schlafzimmer|bedrooms?)/gi)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 15);
  return b.length ? { rooms: Math.max(...b) + 1, basis: 'bedrooms' } : null;
}

export function isStopAgency(text: string, agencies: string[]): string | null {
  const hay = ` ${norm(text)} `;
  for (const a of agencies) { const n = norm(a); if (n && hay.includes(` ${n} `)) return a; }
  return null;
}

/** Quote is verified only if it appears verbatim (whitespace/case-insensitive) in the source text. */
export function verifyQuote(text: string, quote: unknown): boolean {
  if (typeof quote !== 'string') return false;
  const q = quote.replace(/\s+/g, ' ').trim().toLowerCase();
  return q.length >= 3 && String(text).replace(/\s+/g, ' ').toLowerCase().includes(q);
}

/** ZWG exclusion: only an explicit prohibition of permanent registration, double-checked deterministically. */
export function registrationForbidden(text: string, quote: unknown): boolean {
  if (!verifyQuote(text, quote)) return false;
  const q = norm(String(quote));
  return /(erstwohnsitz|wohnsitz|niederlassung|anmeldung|registrier|domizil)/.test(q) && /(nicht|kein|keine|untersagt|verboten|ausgeschlossen|ausgenommen)/.test(q);
}

export function canonicalKey(name: string, municipality: string, host?: string | null): string {
  return [norm(name), norm(municipality), host ? norm(host) : ''].filter(Boolean).join('|');
}

export function htmlToText(html: string): string {
  return String(html ?? '').replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü').replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n))).replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

function abs(href: string, base: string): string | null {
  try { const u = new URL(href, base); if (!/^https?:$/.test(u.protocol)) return null; u.hash = ''; return u.toString(); } catch { return null; }
}

export function pageMeta(html: string, base: string): { title: string; description: string; photos: string[] } {
  const meta = (k: string) => (new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']*)["']`, 'i').exec(html) || new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`, 'i').exec(html))?.[1] ?? '';
  const title = htmlToText(meta('og:title') || /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '');
  const photos = new Set<string>();
  const og = abs(meta('og:image'), base); if (og) photos.add(og);
  for (const m of html.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi)) {
    const u = abs(m[1], base); if (u && !/logo|icon|sprite|avatar|flag|pixel/i.test(u)) photos.add(u); if (photos.size >= 6) break;
  }
  return { title, description: htmlToText(meta('og:description') || meta('description')), photos: [...photos] };
}

const DETAIL_HINT = /ferienwohnung|ferienhaus|unterkunft|objekt|detail|chalet|chesa|haus|wohnung|accommodation|apartment|listing|\/\d{3,}/i;
const SKIP = /login|register|agb|impressum|datenschutz|kontakt|contact|blog|news|\.(?:pdf|zip|jpe?g|png|gif|svg|css|js)(?:\?|$)/i;

/** Same-site links that look like object pages, hinted ones first, deduplicated. */
export function candidateLinks(html: string, base: string, max: number, pattern?: RegExp): string[] {
  let host = ''; try { host = new URL(base).hostname.replace(/^www\./, ''); } catch { return []; }
  const seen = new Set<string>(); const hinted: string[] = []; const other: string[] = [];
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#][^"']*)["']/gi)) {
    const u = abs(m[1], base); if (!u || seen.has(u)) continue;
    const h = new URL(u).hostname.replace(/^www\./, ''); if (h !== host && !h.endsWith(`.${host}`)) continue;
    if (pattern) { if (pattern.test(u)) { seen.add(u); hinted.push(u); } continue; }
    if (SKIP.test(u) || new URL(u).pathname.length < 4 || u === base) continue;
    seen.add(u); (DETAIL_HINT.test(u) ? hinted : other).push(u);
  }
  return [...hinted, ...other].slice(0, max);
}

const PHONE = /(?:\+41|0041)\s?\(?0?\)?\s?\d{2}[\s.]?\d{3}[\s.]?\d{2}[\s.]?\d{2}|\b0\d{2}[\s.]?\d{3}[\s.]?\d{2}[\s.]?\d{2}\b/g;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
export function normPhone(p: string): string { const d = p.replace(/[^\d+]/g, '').replace(/^0041/, '+41').replace(/^0(?=\d{9}$)/, '+41'); return d; }

/** Reject placeholder / fabricated / non-Swiss-looking numbers (e.g. +41000000000, all-zeros, sequential junk). */
export function isPlausibleSwissPhone(p: string): boolean {
  const d = normPhone(p);
  if (!/^\+41\d{9}$/.test(d)) return false;
  const local = d.slice(3); // 9 digits after +41
  if (/^0+$/.test(local) || /^1+$/.test(local) || /^(\d)\1{8}$/.test(local)) return false;
  if (/^0{3,}/.test(local) || /0{5,}/.test(local)) return false;
  // Common fake patterns seen in listings
  if (local === '000000000' || local === '123456789' || local === '111111111') return false;
  return true;
}

/** Reject obviously garbage emails (random strings, placeholder domains, image-like). */
export function isPlausibleEmail(e: string): boolean {
  const s = e.toLowerCase().trim();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(s)) return false;
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(s)) return false;
  const local = s.split('@')[0] || '';
  if (local.length < 2 || local.length > 64) return false;
  // High entropy random-looking local parts (many consecutive consonants / digits without vowels)
  if (/^[0-9._+-]+$/.test(local) && local.length >= 6) return false;
  if (/k@[0-9a-z.\-]+/.test(s) && local.length <= 2) return false; // e.g. k@48g9-...
  if (/(noreply|no-reply|donotreply|example|test|placeholder|fake|invalid)@/i.test(s)) return false;
  return true;
}

/** Deterministic contact extraction: values are copied from the text, never produced by a model. */
export function extractContacts(text: string, platformDomains: string[]): { phones: string[]; emails: string[] } {
  const emails = [...new Set((text.match(EMAIL) || []).map((e) => e.toLowerCase()))]
    .filter((e) => !platformDomains.some((d) => e.endsWith(`@${d}`) || e.endsWith(`.${d}`)) && isPlausibleEmail(e));
  const phones = [...new Set((text.match(PHONE) || []).map(normPhone))].filter(isPlausibleSwissPhone);
  return { phones, emails };
}

export const CONTACT_ADVICE = 'No direct contact found in the listing. Try: search the property name plus municipality on local.ch or search.ch; look for an imprint (Impressum) or own website of the host; use the platform message form; check the municipal tourist office; a short paid subscription to a holiday-rental directory with owner details may reveal the contact.';

export type ListingType = 'holiday_owner' | 'long_term_offer';
const HOLIDAY = /ferien|holiday|chalet|unterkunft|airbnb\.|booking\.com|happyholiday|ferienhausmiete|surselva\.info|vrbo|cozycozy/i;
/** Holiday-rental owner (cold approach for a long-term lease) or an ordinary long-term offer (reply to the ad). */
export function classifyType(title: string, url: string, text: string): ListingType {
  return HOLIDAY.test(`${title} ${url} ${String(text).slice(0, 400)}`) ? 'holiday_owner' : 'long_term_offer';
}

export const LONG_TERM_HINT = /(langzeitmiete|langzeit|ganzj[aä]hrig|dauermiete|unbefristet)/i;

/** Where to reach the advertiser, by host and type, when no direct contact was found. */
export function contactAdvice(url: string, type: ListingType): string {
  let h = ''; try { h = new URL(url).hostname.replace(/^www\./, ''); } catch { /* ignore */ }
  if (/facebook\.com$/.test(h)) return 'Open the post and message the poster in Facebook Messenger (Facebook login required).';
  if (type === 'long_term_offer') return 'Use the contact form or message button on the listing page.';
  if (/airbnb|booking|vrbo|cozycozy|tripadvisor/.test(h)) return 'Message the host through the platform; the holiday listing page rarely shows a phone number. A search for the property name plus municipality may find the owner\'s own site.';
  return CONTACT_ADVICE;
}

/** German draft (Schweizer Hochdeutsch, no "ß"). Uses only verified facts; never states an amount; never sent. */
export function draftMessage(f: { ownerName?: string | null; propertyName?: string; municipality: string; type?: ListingType; rooms?: number }): string {
  const greet = f.ownerName ? `Guten Tag ${f.ownerName}` : 'Guten Tag';
  const me = 'Zu mir: Ich habe ein festes Einkommen in der Schweiz, einen sauberen Betreibungsregisterauszug und eine Privathaftpflichtversicherung. Gerne lege ich Ihnen die Unterlagen vor.';
  if (f.type === 'long_term_offer') {
    return [
      `Betreff: Interesse an Ihrer ${f.rooms ? `${f.rooms}-Zimmer-` : ''}Wohnung in ${f.municipality}`, '',
      `${greet},`, '',
      `ich habe Ihr Inserat${f.propertyName ? ` «${f.propertyName}»` : ''} in ${f.municipality} gesehen und interessiere mich sehr für die Wohnung. Ich suche eine Wohnung für langfristige Miete, gerne ab drei Jahren.`, '',
      me, '',
      'Ist die Wohnung noch frei? Gerne komme ich zu einer Besichtigung vorbei oder rufe Sie kurz an. Über eine Rückmeldung würde ich mich sehr freuen.', '',
      'Freundliche Grüsse', '[Ihr Name]', '[Ihre Telefonnummer]',
    ].join('\n');
  }
  const obj = f.propertyName ? `Ihre Ferienwohnung «${f.propertyName}»` : 'Ihre Ferienwohnung';
  return [
    `Betreff: Anfrage zur langfristigen Miete – ${f.propertyName || 'Ferienwohnung'} in ${f.municipality}`, '',
    `${greet},`, '',
    `ich bin auf ${obj} in ${f.municipality} aufmerksam geworden und möchte anfragen, ob für Sie eine langfristige Vermietung ab drei Jahren denkbar wäre.`, '',
    'Für Sie hätte das einige Vorteile: keine Leerstände zwischen den Buchungen, keine Plattformkommissionen, kein Aufwand für Gästewechsel und Reinigung, und eine Mieterschaft, die mit der Wohnung sorgfältig umgeht.', '',
    me, '',
    'Falls Sie sich das grundsätzlich vorstellen können, melde ich mich gerne für ein kurzes Telefonat oder einen Besichtigungstermin. Über eine Rückmeldung würde ich mich sehr freuen.', '',
    'Freundliche Grüsse', '[Ihr Name]', '[Ihre Telefonnummer]',
  ].join('\n');
}

export function csvEscape(v: unknown): string { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

/** Cut site footer / "other listings" noise: text from the first marker found after the first 300 characters is dropped. */
export function cutAtMarkers(text: string, markers: string[] = []): string {
  let cut = text.length;
  for (const m of markers) { const i = text.indexOf(m, 300); if (i > 0 && i < cut) cut = i; }
  return text.slice(0, cut);
}

/** Slug variants for city index pages: "Fläsch" -> flaesch, flasch; "Domat/Ems" -> domat-ems. */
export function slugVariants(name: string): string[] {
  const a = name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const b = norm(name).replace(/ /g, '-');
  return [...new Set([a, b])].filter(Boolean);
}

/** An LLM "agency" flag counts only when its quote names a business form; platform boilerplate is not an agency signal. */
export function agencyQuoteCounts(quote: string | null, platformHost: string): boolean {
  if (!quote) return false;
  const host = norm(platformHost.replace(/^www\./, '').split('.')[0]);
  return /(immobilien|treuhand|verwaltung|agentur|property management|reisebuero|reisebüro|gmbh|\bag\b|vermittlung)/i.test(quote) && !(host && norm(quote).includes(host));
}

const LIST_TITLE = /^(alle inserate|die besten|unterk[uü]nfte in|ferienunterk[uü]nfte in|ferienwohnungen in|ferienh[aä]user in|wohnungen (mit|zum|zu|in)|\d+\s+wohnungen|wohnung(en)? mieten|immobilien in|mieten in|suchresultate|trefferliste|immobilie mieten in|.*immobilie\. h[aä]user zu vermieten|.*properties mieten)/i;
const LIST_URL = /trefferliste|\/stays(\?|$)|\/ort-[^/]+(\?|$)|\/plz-\d+\/?(\?|$)|\/plz-\d+[^/]*\/\d+-zimmer|unterkunft-[a-z-]+$|\/mieten\/ort-|\/wohnung\/mieten\/ort-|\/mieten\/plz-|\/immobilien\/mieten\/|nestoria\.|immowelt\.|immoscout24\./i;
const WANTED = /^(suche|gesucht|wir suchen|ich suche|suchen|wer hat)\b/i;
const HOTEL = /\b(hotel|pension|hostel|b&b|bed and breakfast|g[aä]stehaus|gasthof|campingplatz)\b/i;

/** Pages that are not an owner's offer: search/list pages, wanted ads, hotels and guesthouses. Checked on title and URL only. */
export type NonListing = 'list_or_search_page' | 'wanted_ad' | 'hotel_or_guesthouse' | 'for_sale' | 'shared_room' | 'development_project';
const FOR_SALE = /(zum kauf|zu verkaufen|\bkaufen\b|eigentumswohnung|\bverkauf\b)/i;
const SHARED = /(\bwg\b|wohngemeinschaft|\bzwischenmiete\b|\buntermiete\b|zimmer in (einer )?(wg|wohnung))/i;
// Multi-unit / project language. Holiday hosts with several flats ("Ferienwohnungen") stay; singular "Wohnung" stays.
const DEVELOPMENT = /\b(neubau|neubauprojekt|wohn[uü]berbauung|[uü]berbauung|eigentumswohnungen|wohnungen zum verkauf|\d{2,}\s*wohnungen)\b|\b[A-Za-zäöüÄÖÜ]*wohnungen\b/i;
const FERIEN_WOHNUNGEN = /\bferien[- ]?wohnungen\b/i;
const LIST_URL_MORE = /\/zimmer-\d+(\.\d)?(-\d+(\.\d)?)?\/?$|\/(mieten|kaufen)\/(wohnung|immobilien)\/in-[^/]+|[?&]nrf=\d|\/kaufen\//i;
export function nonListingReason(title: string, url: string): NonListing | null {
  const t = String(title ?? '').trim();
  if (WANTED.test(t)) return 'wanted_ad';
  if (FOR_SALE.test(t) || /\/kaufen\//i.test(url)) return 'for_sale';
  if (LIST_TITLE.test(t) || LIST_URL.test(url) || LIST_URL_MORE.test(url)) return 'list_or_search_page';
  if (SHARED.test(t)) return 'shared_room';
  if (DEVELOPMENT.test(t) && !FERIEN_WOHNUNGEN.test(t)) return 'development_project';
  if (HOTEL.test(t)) return 'hotel_or_guesthouse';
  return null;
}

/** True when the URL points at one concrete ad (an ID or a long slug), not at a group or generic page. */
export function isSpecificLink(url: string): boolean {
  let u: URL; try { u = new URL(url); } catch { return false; }
  const p = u.pathname;
  if (/facebook\.com$/.test(u.hostname.replace(/^www\./, '')) || /facebook\.com$/.test(u.hostname)) return /\/(marketplace\/item|posts|permalink|videos|photo)\b/.test(p) || /story_fbid|fbid/.test(u.search);
  return /\d{5,}/.test(p) || /[a-z0-9]+(-[a-z0-9]+){3,}/i.test(p.split('/').filter(Boolean).pop() || '');
}


// ---------------------------------------------------------------------------
// Quality gates: monthly rent, listing age, seeker posts
// ---------------------------------------------------------------------------

export type PricingUnit = 'night' | 'week' | 'month' | 'season' | 'unknown';

export interface ParsedPrice {
  amount: number;
  unit: PricingUnit;
  /** Approximate CHF per calendar month when conversion is unambiguous; else null. */
  monthlyChf: number | null;
  quote: string;
}

/** Parse a rent figure and its period from listing text. Never invents amounts.
 * Swiss formats: CHF 1'200.– / Fr. 1.200 / 1200 CHF / mtl. / /Mt. / pro Monat / Mietpreis.
 * Requires currency (CHF/Fr/€) or a clear period word; ignores bare min-stay numbers. */
export function parsePrice(text: string): ParsedPrice | null {
  const t = String(text ?? '');
  if (!t.trim()) return null;

  const parseAmount = (raw: string, frac?: string) => {
    // CH: 1'200 or 1.200 as thousands; keep comma/dot decimals only when 1–2 digits
    let whole = String(raw).replace(/['\s]/g, '');
    if (/^\d{1,2}\.\d{3}$/.test(whole)) whole = whole.replace(/\./g, '');
    else if (/^\d{1,3}(\.\d{3})+$/.test(whole)) whole = whole.replace(/\./g, '');
    const n = Number(whole + (frac ? '.' + frac : ''));
    return Number.isFinite(n) ? n : NaN;
  };

  type Hit = { amount: number; unit: PricingUnit; currency: boolean; quote: string; idx: number };
  const hits: Hit[] = [];

  const reCur =
    /(?:(CHF|Fr\.?\s?|SFr\.?|EUR|€)\s*)?(\d{1,3}(?:['\.]\d{3})+|\d{3,5})(?:[.,](\d{1,2}))?\s*(?:\.–|\.-|–|-)?\s*(CHF|Fr\.?|SFr\.?|EUR|€)?(?:\s*(?:\/|pro|per|im)?\s*(Nacht|Nächte|night|Woche|Wochen|week|Monat|Monate|month|mtl\.?|Mt\.?|Tag|Tage|day|Saison|season))?/gi;
  for (const m of t.matchAll(reCur)) {
    const cur = (m[1] || m[4] || '').trim();
    const amount = parseAmount(m[2], m[3]);
    if (!(amount >= 50 && amount < 100000)) continue;
    if (!cur && !m[5]) continue;
    const uRaw = (m[5] || '').toLowerCase();
    let unit: PricingUnit = 'unknown';
    if (/nacht|night|tag|day/.test(uRaw)) unit = 'night';
    else if (/woche|week/.test(uRaw)) unit = 'week';
    else if (/monat|month|mtl|mt\.?/.test(uRaw)) unit = 'month';
    else if (/saison|season/.test(uRaw)) unit = 'season';
    hits.push({ amount, unit, currency: Boolean(cur), quote: m[0].replace(/\s+/g, ' ').trim().slice(0, 80), idx: m.index || 0 });
  }

  const reLabel =
    /(?:Mietpreis|Nettomiete|Nettomietzins|Bruttomiete|Monatsmiete|Warmmiete|Kaltmiete|Monatszins|Mietzins)\s*[:=]?\s*(CHF|Fr\.?|SFr\.?|€|EUR)?\s*(\d{1,3}(?:['\.]\d{3})+|\d{3,5})(?:[.,](\d{1,2}))?/gi;
  for (const m of t.matchAll(reLabel)) {
    const amount = parseAmount(m[2], m[3]);
    if (!(amount >= 200 && amount < 100000)) continue;
    hits.push({
      amount,
      unit: 'month',
      currency: Boolean(m[1]),
      quote: m[0].replace(/\s+/g, ' ').trim().slice(0, 80),
      idx: m.index || 0,
    });
  }

  // C: trailing "2850.- CHF" / "1'790.– Fr" and leading "ab CHF 1'790.–"
  const reTrail =
    /(\d{1,3}(?:['\.]\d{3})+|\d{3,5})(?:[.,](\d{1,2}))?\s*(?:\.\-|\.–|–|-)?\s*(CHF|Fr\.?|SFr\.?|EUR|€)\b/gi;
  for (const m of t.matchAll(reTrail)) {
    const amount = parseAmount(m[1], m[2]);
    if (!(amount >= 50 && amount < 100000)) continue;
    hits.push({ amount, unit: 'unknown', currency: true, quote: m[0].replace(/\s+/g, ' ').trim().slice(0, 80), idx: m.index || 0 });
  }
  const reAb =
    /\bab\s*(CHF|Fr\.?|SFr\.?|EUR|€)\s*(\d{1,3}(?:['\.]\d{3})+|\d{3,5})(?:[.,](\d{1,2}))?/gi;
  for (const m of t.matchAll(reAb)) {
    const amount = parseAmount(m[2], m[3]);
    if (!(amount >= 50 && amount < 100000)) continue;
    hits.push({ amount, unit: 'unknown', currency: true, quote: m[0].replace(/\s+/g, ' ').trim().slice(0, 80), idx: m.index || 0 });
  }

  let best: ParsedPrice | null = null;
  const score = (c: ParsedPrice) =>
    (c.unit === 'month' ? 100 : c.unit === 'week' ? 50 : c.unit === 'night' ? 20 : 10) +
    (/CHF|Fr|€|EUR/i.test(c.quote) ? 30 : 0) +
    (c.monthlyChf != null ? 5 : 0);

  for (const h of hits) {
    if (h.amount < 80 && h.unit !== 'night') continue;
    const ctx = t.slice(Math.max(0, h.idx - 50), h.idx + h.quote.length + 50);
    let unit = h.unit;
    if (unit === 'unknown') {
      if (/pro\s*woche|\/\s*woche|weekly/i.test(ctx)) unit = 'week';
      else if (/pro\s*nacht|\/\s*nacht|per\s*night/i.test(ctx)) unit = 'night';
      else if (/pro\s*monat|\/\s*monat|mtl\.?|monatlich|nettomiete|warmmiete|kaltmiete|mietzins/i.test(ctx)) unit = 'month';
      else if (h.currency && h.amount >= 400 && h.amount <= 8000 && /miete|rent|preis|chf|fr\./i.test(ctx)) unit = 'month';
    }
    if (/pro\s*woche|\/\s*wo\b/i.test(ctx)) unit = 'week';
    if (/pro\s*nacht|\/\s*nacht/i.test(ctx)) unit = 'night';
    if (!h.currency && unit === 'unknown') continue;

    let monthlyChf: number | null = null;
    if (unit === 'month') monthlyChf = h.amount;
    else if (unit === 'week') monthlyChf = Math.round(h.amount * (52 / 12));
    else if (unit === 'night') monthlyChf = Math.round(h.amount * 30);

    const cand: ParsedPrice = { amount: h.amount, unit, monthlyChf, quote: h.quote };
    if (!best || score(cand) > score(best)) best = cand;
  }
  return best;
}

/** Prefer a verified LLM price_quote; else keyword windows; else head of page text. */
export function resolveListingPrice(pageText: string, priceQuote: string | null | undefined): ParsedPrice | null {
  const full = String(pageText ?? '');
  if (priceQuote && priceQuote.trim().length >= 3) {
    const q = priceQuote.trim();
    // verifyQuote may be strict; still try parse on the quote alone when it looks like a price
    if (/CHF|Fr\.?|SFr|€|EUR|\d{3,}/i.test(q)) {
      const fromQuote = parsePrice(q) || parsePrice(`${q} CHF`);
      if (fromQuote) return fromQuote;
    }
  }
  const windows: string[] = [];
  const lower = full.toLowerCase();
  for (const key of ['mietpreis', 'nettomiete', 'nettomietzins', 'monatsmiete', 'mietzins', 'warmmiete', 'preis', 'chf', 'fr.']) {
    let from = 0;
    while (windows.length < 10) {
      const i = lower.indexOf(key, from);
      if (i < 0) break;
      windows.push(full.slice(Math.max(0, i - 40), i + 100));
      from = i + key.length;
    }
  }
  for (const w of windows) {
    const p = parsePrice(w);
    if (p) return p;
  }
  return parsePrice(full.slice(0, 10000));
}


/** Window of page text around a price keyword (for diagnostics when parse fails). */
export function priceDiagSnippet(text: string, maxLen = 360): string | null {
  const full = String(text ?? '');
  if (!full.trim()) return null;
  const lower = full.toLowerCase();
  let bestI = -1;
  for (const key of ['chf', 'fr.', 'sfr', 'miete', 'preis', '€', 'eur', 'netto']) {
    const i = lower.indexOf(key);
    if (i >= 0 && (bestI < 0 || i < bestI)) bestI = i;
  }
  if (bestI < 0) return null;
  return full.slice(Math.max(0, bestI - 80), bestI + 200).replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

/** Extract a plausible publication / update date from page text or URL. */
export function parseListedAt(text: string, url?: string): Date | null {
  const t = String(text ?? '');
  const now = Date.now();
  const candidates: Date[] = [];
  // ISO
  for (const m of t.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
    if (!Number.isNaN(d.getTime()) && d.getTime() <= now + 86400000) candidates.push(d);
  }
  // Swiss / DE: dd.mm.yyyy
  for (const m of t.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/g)) {
    const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12));
    if (!Number.isNaN(d.getTime()) && d.getTime() <= now + 86400000) candidates.push(d);
  }
  // Relative: "vor 3 Tagen", "vor 2 Wochen", "vor 1 Monat"
  const rel = /vor\s+(\d+)\s+(Tag|Tagen|Woche|Wochen|Monat|Monaten|Jahr|Jahren)/i.exec(t);
  if (rel) {
    const n = Number(rel[1]); const u = rel[2].toLowerCase();
    const d = new Date();
    if (/tag/.test(u)) d.setDate(d.getDate() - n);
    else if (/woche/.test(u)) d.setDate(d.getDate() - n * 7);
    else if (/monat/.test(u)) d.setMonth(d.getMonth() - n);
    else if (/jahr/.test(u)) d.setFullYear(d.getFullYear() - n);
    candidates.push(d);
  }
  if (!candidates.length) return null;
  // Prefer the most recent plausible date (not future)
  candidates.sort((a, b) => b.getTime() - a.getTime());
  return candidates[0];
}

/** True when the post is from someone *looking for* a flat, not offering one.
 * Uses word boundaries so "Besucher" / "Besuchen Sie die Region" do not trigger. */
export function isSeekerPost(title: string, text: string): boolean {
  const h = `${title}\n${String(text).slice(0, 1500)}`.toLowerCase();
  // Strong offer language wins only when it is not "zu mieten" seeker phrasing
  const offer = /\b(zu vermieten|wir vermieten|vermiete(?!n gesucht)|anzubieten|for rent|privat vermietet)\b/i.test(h)
    && !/\b(suche|suchen|gesucht|looking for)\b/i.test(h);
  if (offer) return false;
  if (/\b(wohnung gesucht|haus gesucht|zimmer gesucht|suche wohnung|suche haus|suche zimmer|wir suchen (eine )?wohnung|ich suche (eine )?wohnung|looking for (a )?(flat|apartment|house)|nachmieter gesucht)\b/i.test(h)) return true;
  // "Suche ganz dringend … Wohnung … zu mieten" / "Wer hat eine … Wohnung"
  if (/\bsuche\b/i.test(h) && /(wohnung|zimmer|haus)/i.test(h) && !/nachmieter|mieter gesucht/i.test(h)) return true;
  if (/\bwer hat\b/i.test(h) && /(wohnung|zimmer|haus)/i.test(h)) return true;
  if (/\bzu mieten\b/i.test(h) && /\b(suche|suchen|dringend|gesucht)\b/i.test(h)) return true;
  if (/^\s*suche\b/i.test(title) && /wohnung|haus|zimmer/i.test(title) && !/nachmieter|mieter/i.test(title)) return true;
  return false;
}

export interface QualitySettings {
  maxMonthlyRentChf: number;
  maxListingAgeDays: number;
  requirePrice: boolean;
  rejectNonMonthly: boolean;
  rejectSeekerPosts: boolean;
  requireContact: boolean;
}

export const DEFAULT_QUALITY: QualitySettings = {
  maxMonthlyRentChf: 2000,
  maxListingAgeDays: 180,
  requirePrice: false,
  rejectNonMonthly: false, // holiday rentals are often night/week; monthly long-term is rare on these portals
  rejectSeekerPosts: true, // C129: carousel SERP is full of "Suche Wohnung" — reject by default
  requireContact: false,
};

/** Returns a filter reason or null if the listing may be kept.
 * Max rent is applied only to explicit monthly prices (or unknown large amounts with currency).
 * Night/week prices are rejected only when rejectNonMonthly is on; otherwise they pass the amount gate. */
export function qualityRejectReason(
  q: QualitySettings,
  price: ParsedPrice | null,
  listedAt: Date | null,
  seeker: boolean,
  hasContact: boolean,
  nowMs: number = Date.now(),
): string | null {
  if (q.rejectSeekerPosts && seeker) return 'seeker_post';
  if (q.requireContact && !hasContact) return 'contact_required';
  if (price) {
    if (q.rejectNonMonthly && (price.unit === 'week' || price.unit === 'night' || price.unit === 'season')) {
      return 'price_not_monthly';
    }
    // Cap applies only when maxMonthlyRentChf > 0 (0 = unlimited)
    if (q.maxMonthlyRentChf > 0) {
      if (price.unit === 'month' && price.monthlyChf != null && price.monthlyChf > q.maxMonthlyRentChf) {
        return 'price_above_max';
      }
      if (price.unit === 'unknown' && price.amount > q.maxMonthlyRentChf) {
        return 'price_above_max';
      }
    }
    // Night/week: do not convert and reject by monthly equivalent when rejectNonMonthly is off
  } else if (q.requirePrice) {
    return 'price_unknown';
  }
  if (listedAt && q.maxListingAgeDays > 0) {
    const ageDays = (nowMs - listedAt.getTime()) / 86400000;
    if (ageDays > q.maxListingAgeDays) return 'stale_listing';
  }
  return null;
}
