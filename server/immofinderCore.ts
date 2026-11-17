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

/** Deterministic contact extraction: values are copied from the text, never produced by a model. */
export function extractContacts(text: string, platformDomains: string[]): { phones: string[]; emails: string[] } {
  const emails = [...new Set((text.match(EMAIL) || []).map((e) => e.toLowerCase()))].filter((e) => !platformDomains.some((d) => e.endsWith(`@${d}`) || e.endsWith(`.${d}`)) && !/\.(png|jpe?g|gif|webp)$/.test(e));
  const phones = [...new Set((text.match(PHONE) || []).map(normPhone))];
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

const LIST_TITLE = /^(alle inserate|die besten|unterk[uü]nfte in|ferienunterk[uü]nfte in|ferienwohnungen in|ferienh[aä]user in|wohnungen (mit|zum|zu|in)|\d+\s+wohnungen|wohnung(en)? mieten|immobilien in|mieten in|suchresultate|trefferliste|immobilie mieten in)/i;
const LIST_URL = /trefferliste|\/stays(\?|$)|\/ort-[^/]+(\?|$)|\/plz-\d+\/?(\?|$)|\/plz-\d+[^/]*\/\d+-zimmer|unterkunft-[a-z-]+$|\/mieten\/ort-|\/wohnung\/mieten\/ort-|\/mieten\/plz-/i;
const WANTED = /^(suche|gesucht|wir suchen|ich suche|suchen)\b/i;
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
 * Requires currency (CHF/Fr/€) or a clear period word; ignores bare "7 Tage" / "2 Wochen" (min-stay) and random integers. */
export function parsePrice(text: string): ParsedPrice | null {
  const t = String(text ?? '');
  // Prefer matches that include currency OR an explicit period after the number
  const re = /(\d{1,3}(?:[\'\s]\d{3})*|\d+)(?:[.,](\d{1,2}))?\s*(CHF|Fr\.?|SFr\.?|€|EUR)?\s*(?:\/|\s+pro\s+|\s+per\s+|\s+)?\s*(Nacht|night|Woche|week|Monat|month|Monate|Tag|day|Saison|season)?\b/gi;
  let best: ParsedPrice | null = null;
  for (const m of t.matchAll(re)) {
    const whole = m[0];
    const amount = Number(String(m[1]).replace(/[\'\s]/g, '') + (m[2] ? '.' + m[2] : ''));
    if (!(amount > 0 && amount < 100000)) continue;
    const currency = (m[3] || '').trim();
    const uRaw = (m[4] || '').toLowerCase();
    // Reject pure duration phrases without currency (e.g. "7 Tage", "2 Wochen" as min stay)
    if (!currency && !uRaw) continue;
    if (!currency && /^(tag|tage|nacht|nächte|woche|wochen)$/i.test(uRaw) && amount <= 30) continue;
    let unit: PricingUnit = 'unknown';
    if (/nacht|night|tag|day/.test(uRaw)) unit = 'night';
    else if (/woche|week/.test(uRaw)) unit = 'week';
    else if (/monat|month/.test(uRaw)) unit = 'month';
    else if (/saison|season/.test(uRaw)) unit = 'season';
    // Heuristic: amount with currency near "Miete" without unit → month
    const ctx = t.slice(Math.max(0, (m.index || 0) - 40), (m.index || 0) + whole.length + 40);
    if (unit === 'unknown' && currency && amount >= 400 && amount <= 6000 && /miete|rent|kalt|warm/i.test(ctx)) {
      unit = 'month';
    }
    // Prefer currency-bearing matches
    if (!currency && unit === 'unknown') continue;
    let monthlyChf: number | null = null;
    if (unit === 'month') monthlyChf = amount;
    else if (unit === 'week') monthlyChf = Math.round(amount * (52 / 12));
    else if (unit === 'night') monthlyChf = Math.round(amount * 30);
    const cand: ParsedPrice = { amount, unit, monthlyChf, quote: whole.slice(0, 80) };
    if (!best || (cand.unit === 'month' && best.unit !== 'month') || (Boolean(currency) && !best.quote.match(/CHF|Fr|€|EUR/i)) || (cand.monthlyChf != null && (best.monthlyChf == null || cand.monthlyChf < best.monthlyChf))) best = cand;
  }
  return best;
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
  const offer = /\b(zu vermieten|vermieten|vermiete|anzubieten|for rent|available|frei ab|ab dem \d|wir vermieten|privat vermietet)\b/i.test(h);
  if (offer) return false;
  // Explicit seeker phrases (word-bounded)
  if (/\b(wohnung gesucht|haus gesucht|zimmer gesucht|suche wohnung|suche haus|suche zimmer|wir suchen (eine )?wohnung|ich suche (eine )?wohnung|looking for (a )?(flat|apartment|house)|nachmieter gesucht)\b/i.test(h)) return true;
  // Leading "Suche ..." title that is not "Suche Nachmieter"
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
  rejectSeekerPosts: false, // detector still has residual false positives; prefer recall for owner offers
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
    // Cap applies only to explicit monthly (or unknown that looks monthly)
    if (price.unit === 'month' && price.monthlyChf != null && price.monthlyChf > q.maxMonthlyRentChf) {
      return 'price_above_max';
    }
    if (price.unit === 'unknown' && price.amount > q.maxMonthlyRentChf) {
      return 'price_above_max';
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
