/** ImmoFinder GR — pure logic (no I/O): matching, filters, verification, drafts. Every stored fact must be verifiable in fetched text. */
export interface ImmoConfig {
  municipalities: string[];
  /** Two fixed 22-commune groups for Settings toggles. */
  municipalityGroups?: { group1: { label: string; municipalities: string[] }; group2: { label: string; municipalities: string[] } };
  stopAgencies: string[]; minRooms: number; platformDomains: string[];
  sources: { id: string; url: string; phase: number; cityUrl?: string; detailPattern?: string; cutMarkers?: string[]; privateTitleHint?: string; maxDetailPages?: number; indexUrls?: string[] }[];
  fetch: { userAgent: string; perHostDelayMs: number; browserRenderHosts?: string[]; browserRenderMinTextChars?: number; maxBrowserRendersPerRun?: number };
  limits: { maxDetailPagesPerSource: number; recheckAfterDays: number; fetchTimeoutMs: number; maxPageBytes: number };
  estCostPerLlmCallUsd: number;
  estCostPerSearchUsd?: number;
  driveFolderId?: string;
  discovery?: { enabled: boolean; communesPerRun: number; resultsPerQuery: number; maxPagesPerRun: number; queries: string[]; portalQueries?: string[]; fallbackPortalQueries?: string[]; portalHosts?: string[]; portalSources?: { id: string; label: string; host: string }[]; maxCandidatesPerQuery?: number; snippetOnlyHosts: string[]; skipHosts: string[]; /** Min delay between Serper calls (rate limit). */ serperMinIntervalMs?: number; /** Soft cap on Serper calls per rolling minute. */ serperMaxPerMinute?: number; };
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
  const OUTSIDE = /\b(scuol|engadin|samnaun|sils|silvaplana|st\.?\s*moritz|pontresina|zuoz|madulain|celerina|samedan|zernez|guarda|arosa(?!\s*[-–]?chur)|davos|klosters|val\s*müstair|poschiavo|brusio|kanton\s+bern|im\s+kanton\s+bern|\bbern\b(?!\s*hard)|kanton\s+z[uü]rich|\bz[uü]rich\b(?!\s*(see|gebiet))|\bbasel\b|\bluzern\b|\blucerne\b|\bgenf\b|\bgeneva\b|genève|obwalden|nidwalden|\bwallis\b|\bvalais\b|\btessin\b|\bticino\b|\baargau\b|\bthurgau\b|solothurn|schaffhausen|appenzell|st\.?\s*gallen)\b/i;
  const om = OUTSIDE.exec(head);
  if (om) return { matched: null, outside: true, hint: om[1] };
  return { matched: null, outside: false, hint: null };
}

export function parseRooms(text: string): { rooms: number; basis: 'zimmer' | 'bedrooms' } | null {
  // Normalize Swiss half-room spellings before matching so "2 ½" / "2 1/2" become "2.5".
  let t = String(text ?? '')
    .replace(/(\d{1,2})\s*[½]/g, '$1.5')
    .replace(/[½]/g, '.5')
    .replace(/,(\d)/g, '.$1');
  t = t.replace(/(\d{1,2})\s+1\/2/g, '$1.5');
  type Hit = { rooms: number; index: number };
  const hits: Hit[] = [];
  for (const m of t.matchAll(/(?:\bzimmer\b|\bzi\.?|\brooms?\b|\bpi[eè]ces?\b)\s*[:=]?\s*(\d{1,2}(?:\.\d)?)/gi)) {
    const n = Number(m[1]);
    if (n > 0 && n < 20) hits.push({ rooms: n, index: m.index ?? 0 });
  }
  for (const m of t.matchAll(/(\d{1,2}(?:\.\d)?)\s*[- ]?\s*(?:\bzimmer\b|\bzi\b|\bzi\.|\brooms?\b|\bpi[eè]ces?\b|-?zimmerwohnung)/gi)) {
    const n = Number(m[1]);
    if (n > 0 && n < 20) hits.push({ rooms: n, index: m.index ?? 0 });
  }
  if (hits.length) {
    hits.sort((a, b) => a.index - b.index);
    // Prefer the first room mention (title / lead). Math.max among close hits inflated
    // "3 ½ pièces" to 4.5 when a later nearby count differed by 1.
    const first = hits[0].rooms;
    const same = hits.filter((h) => Math.abs(h.rooms - first) < 0.01).map((h) => h.rooms);
    return { rooms: same[0] ?? first, basis: 'zimmer' };
  }
  const bHits: Hit[] = [];
  for (const m of t.matchAll(/(\d{1,2})\s*[- ]?\s*(?:schlafzimmer|bedrooms?)/gi)) {
    const n = Number(m[1]);
    if (n > 0 && n < 15) bHits.push({ rooms: n, index: m.index ?? 0 });
  }
  if (!bHits.length) return null;
  bHits.sort((a, b) => a.index - b.index);
  return { rooms: bHits[0].rooms + 1, basis: 'bedrooms' };
}

export function isStopAgency(text: string, agencies: string[]): string | null {
  const hay = ` ${norm(text)} `;
  for (const a of agencies) { const n = norm(a); if (n && hay.includes(` ${n} `)) return a; }
  return null;
}

/** Search snippets (esp. Facebook) often repeat the title two or three times; keep each distinct segment once so the model prompt carries no duplicate text. */
export function dedupeSnippetText(title: string, snippet: string): string {
  const seen = new Set<string>([norm(title)]);
  const out: string[] = [];
  // The title is already sent separately; drop verbatim repeats of it inside the snippet.
  const t = String(title ?? '').replace(/\s*(\.{3}|…)\s*$/, '').trim();
  const body = t.length >= 15 ? String(snippet ?? '').split(t).join(' ') : String(snippet ?? '');
  for (const raw of body.split(/\s+—\s+|\s*\.{3}\s*|…\s*/)) {
    const seg = raw.replace(/\s+/g, ' ').trim();
    if (!seg) continue;
    const k = norm(seg);
    if (!k || seen.has(k)) continue;
    seen.add(k); out.push(seg);
  }
  return out.join(' … ');
}

/** Swiss portal / classifieds: reject professional landlords (AG, GmbH, Makler) unless clearly "von privat". */
export function looksLikeAgencyListing(title: string, text: string): boolean {
  const h = `${title}\n${String(text).slice(0, 4000)}`.toLowerCase();
  const privat = /\b(von privat|privater vermieter|privatperson|direkt vom eigent[uü]mer|direkt von privat|private anbieterin|private anbieter)\b/i.test(h);
  if (privat) return false;
  if (/\b(immobilien\s*(ag|gmbh|genossenschaft)|makler|treuhand|property management|hausverwaltung|wohnungsverwaltung|vermittlung)\b/i.test(h)) return true;
  if (/\b(anbieter|vermieter|kontakt)\s*[:\s][^\n]{0,60}\b(ag|gmbh|sàrl|sarl|sa)\b/i.test(h)) return true;
  // Company-style email on the listing often means agency
  if (/@[a-z0-9.-]+\.(ch|com)\b/i.test(h) && /\b(immobilien|makler|treuhand|verwaltung|agency|properties)\b/i.test(h)) return true;
  return false;
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
  return String(html ?? '').replace(/<head\b[\s\S]*?<\/head>/gi, ' ').replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü').replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n))).replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

function abs(href: string, base: string): string | null {
  if (!String(href ?? '').trim()) return null;
  try { const u = new URL(href, base); if (!/^https?:$/.test(u.protocol)) return null; u.hash = ''; return u.toString(); } catch { return null; }
}

export function pageMeta(html: string, base: string): { title: string; description: string; photos: string[]; published?: string | null } {
  const meta = (k: string) => (new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']*)["']`, 'i').exec(html) || new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`, 'i').exec(html))?.[1] ?? '';
  const title = htmlToText(meta('og:title') || /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '');
  const photos = new Set<string>();
  const og = abs(meta('og:image'), base); if (og) photos.add(og);
  for (const m of html.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi)) {
    const u = abs(m[1], base); if (u && !/logo|icon|sprite|avatar|flag|pixel/i.test(u)) photos.add(u); if (photos.size >= 6) break;
  }
  // Publication date declared by the page itself (meta / JSON-LD / microdata); language independent.
  // Prefer explicit article times, then broader schema.org / Open Graph variants, then Facebook utime.
  let published =
    meta('article:published_time') || meta('datePublished') || meta('og:article:published_time')
    || meta('publish-date') || meta('pubdate') || meta('date') || meta('DC.date.issued')
    || /"(?:datePublished|datePosted|dateCreated|uploadDate)"\s*:\s*"([^"]{8,40})"/i.exec(html)?.[1]
    || /itemprop=["'](?:datePublished|datePosted|dateCreated)["'][^>]*content=["']([^"']{8,40})["']/i.exec(html)?.[1]
    || /content=["']([^"']{8,40})["'][^>]*itemprop=["'](?:datePublished|datePosted|dateCreated)["']/i.exec(html)?.[1]
    || null;
  if (!published) {
    const ut = /data-utime=["'](\d{9,12})["']/i.exec(html)?.[1] || /"creation_time"\s*:\s*(\d{9,12})/i.exec(html)?.[1];
    if (ut) {
      const sec = Number(ut);
      if (sec > 1e9 && sec < 2e10) published = new Date(sec * 1000).toISOString();
    }
  }
  return { title, description: htmlToText(meta('og:description') || meta('description')), photos: [...photos], published };
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
  const me = 'Bei Interesse kann ich Ihnen gerne weitere Angaben zu meiner Person zukommen lassen.';
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
    `Betreff: Anfrage zur langfristigen Miete – ${f.rooms ? `${f.rooms}-Zimmer-` : ''}${f.propertyName || 'Ferienwohnung'} in ${f.municipality}`, '',
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

const LIST_TITLE = /^(alle inserate|die besten|page\s+\d+|tous les biens|unterk[uü]nfte in|ferienunterk[uü]nfte in|ferienwohnungen in|ferienh[aä]user in|wohnungen (mit|zum|zu|in)|\d+\s+wohnungen|wohnung(en)? mieten|immobilien in|mieten in|suchresultate|trefferliste|immobilie mieten in|.*immobilie\. h[aä]user zu vermieten|.*properties mieten)|mittlere(r)?\s+mietpreis|durchschnittliche[r]?\s+mietpreis/i;
const LIST_URL = /trefferliste|\/stays(\?|$)|\/ort-[^/]+(\?|$)|\/plz-\d+\/?(\?|$)|\/plz-\d+[^/]*\/\d+-zimmer|unterkunft-[a-z-]+$|\/mieten\/ort-|\/wohnung\/mieten\/ort-|\/mieten\/plz-|\/immobilien\/mieten\/|nestoria\.|immowelt\.|realadvisor\.[a-z.]+\/.*\/mieten\/|\/mieten\/\d{4}-[^/]+\/wohnung(\/\d+-zimmer)?\/?$/i;
const WANTED = /^(suche|gesucht|wir suchen|ich suche|suchen|wer hat)\b/i;
const HOTEL = /\b(hotel|pension|hostel|b&b|bed and breakfast|g[aä]stehaus|gasthof|campingplatz|gruppenhaus|gruppenh[aä]user)\b/i;

/** Pages that are not an owner's offer: search/list pages, wanted ads, hotels and guesthouses. Checked on title and URL only. */
export type NonListing = 'list_or_search_page' | 'wanted_ad' | 'hotel_or_guesthouse' | 'for_sale' | 'shared_room' | 'development_project' | 'service_or_aggregator';
const FOR_SALE = /(zum kauf|zu verkaufen|\bkaufen\b|eigentumswohnung|\bverkauf\b)/i;
const SHARED = /(\bwg\b|wohngemeinschaft|\bzwischenmiete\b|\buntermiete\b|zimmer in (einer )?(wg|wohnung))/i;
// Multi-unit / project language. Holiday hosts with several flats ("Ferienwohnungen") stay; singular "Wohnung" stays.
const DEVELOPMENT = /\b(neubau|neubauprojekt|wohn[uü]berbauung|[uü]berbauung|eigentumswohnungen|wohnungen zum verkauf|\d{2,}\s*wohnungen)\b|\b[A-Za-zäöüÄÖÜ]*wohnungen\b/i;
const FERIEN_WOHNUNGEN = /\bferien[- ]?wohnungen\b/i;
const LIST_URL_MORE = /\/zimmer-\d+(\.\d)?(-\d+(\.\d)?)?\/?$|\/(mieten|kaufen)\/(wohnung|immobilien)\/in-[^/]+|\/unterkategorie-[^/]+|\/in-[a-z0-9äöü-]{2,}\/?$|\/immobilier\/[^/]*immobilier[^/]*\.html|[?&]nrf=\d|\/kaufen\/|\/preise\.html|\/liste(\/|$)|\/seite-\d+|\/page\/\d+|gruppenhaus\.ch|\/_join_/i;
/** Hosts that are moving companies, SEO content farms or meta-search — never a single rental object. */
const SERVICE_OR_AGGREGATOR_HOST =
  /(?:^|\.)(moving24|umzugsfirma-buchen|umzug|umzuege|rentumo|nestoria|immowelt|immoscout24|realadvisor|comparis|homegate\.ch\/rent\/list|anibis\.ch\/de\/c\/)\b/i;

export function nonListingReason(title: string, url: string, portalHosts: string[] = []): NonListing | null {
  const t = String(title ?? '').trim();
  // Bot-challenge: reject unless URL is already a portal detail (Homegate /mieten/400… + SERP facts).
  if (/^(just a moment|attention required|access denied|one more step|checking your browser|please wait|cf-browser-verification|security check|tutti\.ch - security)\b/i.test(t)) {
    if (!(portalHosts.length && isPortalDetailUrl(url, portalHosts))) return 'list_or_search_page';
  }
  // Empty SERP / zero-offer index pages must never become cards.
  if (/\b(aucun (appartement|maison|bien)|keine (wohnungen?|angebote|resultate|treffer)|no (results?|listings?|apartments?)|0\s+(wohnungen|inserate|resultate|angebote)|aucun résultat)\b/i.test(t)) return 'list_or_search_page';
  if (/\b(inserat nicht mehr|nicht mehr verfügbar|objekt nicht (mehr )?verfügbar)\b/i.test(t)) return 'list_or_search_page';
  if (/\b(tiefgarage|parkhaus|parkplatz|stellplatz|einstellplatz|garagenplatz|garage|parking)\b/i.test(t) && !/\b(wohnung|haus|chalet|zimmer)\b/i.test(t)) return 'list_or_search_page';
  if (/\.pdf(?:\?|$)/i.test(url)) return 'list_or_search_page';
  if (WANTED.test(t)) return 'wanted_ad';
  if (FOR_SALE.test(t) || /\/kaufen\//i.test(url)) return 'for_sale';
  // Homegate/ImmoScout detail ads often use titles like "Wohnung mieten in X" — do not treat those as list pages when the URL is a concrete portal detail.
  if (/google\.[a-z.]+\/travel\/hotels\//i.test(url) || /\/travel\/hotels\/entity\//i.test(url)) return 'hotel_or_guesthouse';
  if (/acheter-louer\.ch\/(acheter|fr\/achat)/i.test(url) || /rentola\.ch\/listings\//i.test(url)) return 'list_or_search_page';
  const detailLike = isSpecificLink(url) || (portalHosts.length > 0 && isPortalDetailUrl(url, portalHosts));
  const clearSerpTitle = /\d+\s+treffer|treffer\s*-|^(wohnung(en)? mieten in\s+\w+\s*$)|bei homegate\.ch findest/i.test(t);
  if (!detailLike && (LIST_TITLE.test(t) || LIST_URL.test(url) || LIST_URL_MORE.test(url))) return 'list_or_search_page';
  if (detailLike && (LIST_URL.test(url) || LIST_URL_MORE.test(url) || clearSerpTitle)) return 'list_or_search_page';
  if (SHARED.test(t)) return 'shared_room';
  if (DEVELOPMENT.test(t) && !FERIEN_WOHNUNGEN.test(t)) return 'development_project';
  if (HOTEL.test(t)) return 'hotel_or_guesthouse';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (/(^|\.)(moving24\.ch|umzugsfirma-buchen\.ch|rentumo\.ch|umzug[^/]*\.ch|rentola\.ch|trovit\.[a-z]+|feriwa\.ch)$/i.test(host)) return 'service_or_aggregator';
    if (/\bumzug|moving\s*company|offerten?\s*vergleich|stündlich\s*\d+\s*mietportale/i.test(t)) return 'service_or_aggregator';
    if (/\/(zuerich|zurich|zürich|bern|basel|luzern|lucerne|genf|geneva|genève)\b/i.test(url)) return 'list_or_search_page';
  } catch { /* ignore */ }
  return null;
}

/** Recognise concrete detail routes on configured Swiss rental portals.
 * Shared by discovery, write-time validation and stored-row audits.
 * Decode defensively so malformed percent escapes cannot abort a search run. */
export function isPortalDetailUrl(url: string, portalHosts: string[] = []): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const pathLower = u.pathname.toLowerCase().replace(/\/+$/, '');
  // Category/list routes that END at the category (no listing id): /mieten/wohnung, /rent/flat
  // but /rent/flat/offer-77 or /mieten/wohnung/4001234567 remain detail pages.
  if (/\/(mieten|rent|louer|affittare)\/(wohnung|apartment|haus|house|maison|flat)\/?$/i.test(pathLower)) return false;
  if (!portalHosts.some((h) => host === h.toLowerCase() || host.endsWith(`.${h.toLowerCase()}`))) return false;
  const parts = u.pathname.split('/').filter(Boolean).map((x) => {
    try { return decodeURIComponent(x).toLowerCase(); } catch { return x.toLowerCase(); }
  });
  if (parts[0] && /^(de|fr|it|en)$/.test(parts[0])) parts.shift();
  if (parts.length < 2) return false;
  const generic = new Set(['search','suche','results','resultate','angebote','list','listing','rent','mieten','buy','kaufen','sale','map','karte','real-estate','immobilien','wohnung-mieten','wohnungen-mieten','flat','apartment','house','suchen']);
  if (!parts[parts.length - 1] || generic.has(parts[parts.length - 1])) return false;
  // Category / commune index routes (home.ch unterkategorie…/in-chur, …/in-thusis) are not detail pages.
  if (parts.some((p) => /^(search|suche|suchen|results|resultate|map|karte|unterkategorie)/.test(p) || /^in-[a-z0-9-]{2,}$/.test(p) || /^seite-\d+$/.test(p) || /^page-?\d+$/.test(p))) return false;
  // Shallow portal index (…/louer/appartement-maison/grisons/landquart) has no listing id.
  return true;
}
/** True when the URL points at one concrete ad (an ID or a long slug), not at a group or generic page. */
export function isSpecificLink(url: string): boolean {
  let u: URL; try { u = new URL(url); } catch { return false; }
  const p = u.pathname;
  const host = u.hostname.replace(/^www\./, '');
  if (/facebook\.com$/.test(host)) {
    // Join prompts, bare group roots, and photo.php are not a single rental ad.
    if (/\/_join_/i.test(p) || /\/groups\/\d+\/?$/i.test(p)) return false;
    if (/\/photo\.php/i.test(p) || /\/photos\//i.test(p)) return false;
    return /\/(marketplace\/item|posts|permalink|videos)\b/.test(p) || /story_fbid/.test(u.search);
  }
  return /\d{5,}/.test(p) || /[a-z0-9]+(-[a-z0-9]+){3,}/i.test(p.split('/').filter(Boolean).pop() || '');
}

/**
 * Obvious non-Graubünden / non-CH places in page text (name collisions like Felsberg DE).
 * Only strong foreign markers — does not reject CH pages that merely mention "Deutschland".
 */
export function clearOutOfCantonRegion(text: string): boolean {
  const h = String(text || '').slice(0, 4000).toLowerCase();
  if (!h.trim()) return false;
  // German holiday regions that collided with GR commune names in production
  if (/\b(sauerland|eslohe|nordrhein-westfalen|nrw|niedersachsen|mecklenburg|schleswig-holstein)\b/i.test(h)) return true;
  if (/\b(bayern|baden-w[uü]rttemberg)\b/i.test(h) && !/\b(schweiz|graub[uü]nden|grisons|b[uü]ndner)\b/i.test(h)) return true;
  return false;
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
  // Normalize curly/smart quotes and thin spaces so CH prices like CHF 1’570 parse.
  const t = String(text ?? '')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/[\u00A0\u202F\u2009]/g, ' ');
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


  // D: bare Swiss amounts often written without currency on FB/Tutti — "1510.-" / "1 235.-" / "1500.- /Monat"
  const reBare =
    /(?<![A-Za-z0-9])(\d{1,2}[\s']\d{3}|\d{3,4})(?:[.,](\d{2}))?\s*(?:\.–|\.-|–|-)?(?:\s*(?:\/|pro|per)?\s*(Monat|mtl\.?|Mt\.?|month|Woche|week|Nacht|night))?/gi;
  for (const m of t.matchAll(reBare)) {
    const rawWhole = m[1].replace(/\s+/g, "'");
    const amount = parseAmount(rawWhole, m[2]);
    if (!(amount >= 400 && amount <= 8000)) continue; // long-term rent band without currency
    const uRaw = (m[3] || '').toLowerCase();
    let unit: PricingUnit = 'unknown';
    if (/nacht|night/.test(uRaw)) unit = 'night';
    else if (/woche|week/.test(uRaw)) unit = 'week';
    else if (/monat|mtl|mt\.?|month/.test(uRaw)) unit = 'month';
    const ctx = t.slice(Math.max(0, (m.index || 0) - 70), (m.index || 0) + m[0].length + 70);
    // Sale/purchase context: never treat truncated Kaufpreis fragments as monthly rent.
    if (/\b(kaufpreis|verkaufspreis|zum\s+verkauf|zu\s+verkaufen|for\s+sale|zweitwohnung|eigentumswohnung|stockwerkeigentum|\bmio\.?\b)\b/i.test(ctx)) continue;
    const hasRentWord = /miete|rent|preis|chf|fr\.?|zimmer|wohnung|nachmieter|vermieten|warm|kalt|nk\b|parkplatz/i.test(ctx);
    // CH classifieds often write only "1510.-" next to rooms; treat classic .- amounts in rent band as month.
    if (unit === 'unknown' && /(?:\.|–)\s*$|\.–|\.-/.test(m[0]) && amount >= 700 && amount <= 3500) unit = 'month';
    if (!hasRentWord && unit === 'unknown') continue;
    if (unit === 'unknown' && hasRentWord && amount >= 700 && amount <= 3500) unit = 'month';
    hits.push({ amount, unit, currency: false, quote: m[0].replace(/\s+/g, ' ').trim().slice(0, 80), idx: m.index || 0 });
  }

  // E: "fr. 1235" / "Fr 1'400" / "fr 1 235" (currency before amount, lowercase)
  const reFrFirst =
    /(?:CHF|Fr\.?|SFr\.?|fr\.?)\s*(\d{1,3}(?:[\s']\d{3})+|\d{3,5})(?:[.,](\d{1,2}))?/gi;
  for (const m of t.matchAll(reFrFirst)) {
    const amount = parseAmount(m[1].replace(/\s+/g, "'"), m[2]);
    if (!(amount >= 50 && amount < 100000)) continue;
    hits.push({ amount, unit: 'unknown', currency: true, quote: m[0].replace(/\s+/g, ' ').trim().slice(0, 80), idx: m.index || 0 });
  }

  // F: JSON-LD / meta-ish "price": 1500 or "price":"1500.00"
  const reJson =
    /"price"\s*:\s*"?(CHF\s*)?(\d{3,5})(?:[.,](\d{2}))?"?/gi;
  for (const m of t.matchAll(reJson)) {
    const amount = parseAmount(m[2], m[3]);
    if (!(amount >= 200 && amount <= 15000)) continue;
    hits.push({ amount, unit: 'month', currency: Boolean(m[1]), quote: m[0].replace(/\s+/g, ' ').trim().slice(0, 80), idx: m.index || 0 });
  }

  // G: "Miete 1'500" / "Miete: 1500" without CHF
  const reMiete =
    /(?:Miete|Mietzins|Nettomiete|Warmmiete|Kaltmiete|Monatsmiete|Loyer)\s*[:=]?\s*(?:CHF|Fr\.?|SFr\.?)?\s*(\d{1,3}(?:[\s']\d{3})+|\d{3,5})(?:[.,](\d{1,2}))?/gi;
  for (const m of t.matchAll(reMiete)) {
    const amount = parseAmount(m[1].replace(/\s+/g, "'"), m[2]);
    if (!(amount >= 200 && amount < 100000)) continue;
    hits.push({ amount, unit: 'month', currency: true, quote: m[0].replace(/\s+/g, ' ').trim().slice(0, 80), idx: m.index || 0 });
  }

    let best: ParsedPrice | null = null;
  const score = (c: ParsedPrice) =>
    (c.unit === 'month' ? 100 : c.unit === 'week' ? 50 : c.unit === 'night' ? 20 : 10) +
    (/CHF|Fr|€|EUR/i.test(c.quote) ? 30 : 0) +
    (c.monthlyChf != null ? 5 : 0) +
    // Prefer full rent (800–5000) over fragments like "300" from "1'300"
    (c.amount >= 800 && c.amount <= 5000 ? 25 : c.amount >= 400 && c.amount < 800 ? 5 : 0);

  for (const h of hits) {
    if (h.amount < 80 && h.unit !== 'night') continue;
    const ctx = t.slice(Math.max(0, h.idx - 90), h.idx + h.quote.length + 90);
    let unit = h.unit;
    if (unit === 'unknown') {
      if (/pro\s*woche|\/\s*woche|weekly/i.test(ctx)) unit = 'week';
      else if (/pro\s*nacht|\/\s*nacht|per\s*night|\/\s*night/i.test(ctx)) unit = 'night';
      else if (/pro\s*saison|\/\s*saison|per\s*season|saisonal/i.test(ctx)) unit = 'season';
      else if (/pro\s*monat|\/\s*monat|per\s*month|mtl\.?|monatlich|nettomiete|warmmiete|kaltmiete|mietzins|inkl\.?\s*(nk|nebenkosten|utilities)|incl\.?\s*(nk|nebenkosten|utilities)/i.test(ctx)) unit = 'month';
      else if (h.amount >= 400 && h.amount <= 8000 && /miete|rent|preis|chf|fr\.?|zimmer|wohnung|nachmieter|vermieten/i.test(ctx)) unit = 'month';
    }
    if (/pro\s*woche|\/\s*wo\b/i.test(ctx)) unit = 'week';
    if (/pro\s*nacht|\/\s*nacht|per\s*night/i.test(ctx)) unit = 'night';
    if (/pro\s*saison|\/\s*saison|per\s*season|saisonal/i.test(ctx)) unit = 'season';
    // Wider window often has "pro Monat" / "inkl. NK" just outside ±50 chars
    if (unit === 'unknown') {
      const wide = t.slice(Math.max(0, h.idx - 120), h.idx + h.quote.length + 120);
      if (/pro\s*saison|per\s*season|saisonal/i.test(wide)) unit = 'season';
      else if (/pro\s*monat|\/\s*monat|per\s*month|monatlich|mtl\.?|inkl\.?\s*(nk|nebenkosten)|incl\.?\s*(utilities|nk)/i.test(wide)) unit = 'month';
      else if (/pro\s*nacht|per\s*night|\/\s*nacht/i.test(wide)) unit = 'night';
      else if (/pro\s*woche|per\s*week/i.test(wide)) unit = 'week';
    }
    if (!h.currency && unit === 'unknown') continue;

    let monthlyChf: number | null = null;
    if (unit === 'month') monthlyChf = h.amount;
    else if (unit === 'week') monthlyChf = Math.round(h.amount * (52 / 12));
    else if (unit === 'night') monthlyChf = Math.round(h.amount * 30);

    // Calendar years in "ab 01.11.2026" must not become rent (was keeping amount=2026).
    if (h.amount >= 2020 && h.amount <= 2035) {
      const near = t.slice(Math.max(0, h.idx - 30), h.idx + h.quote.length + 20);
      if (/(?:^|\D)(20[2-3]\d)(?:\D|$)/.test(near) && /(?:per|ab|vom|verfügbar|bezug|frei|ab\s*dem|ab\s*sofort|\d{1,2}[./]\d{1,2}[./])/.test(near)) {
        continue;
      }
      // Bare 2026 with no currency and no month/night word — skip
      if (!h.currency && unit === 'unknown') continue;
    }
    // Swiss PLZ (4-digit 1000–9999) before a place name is not rent — e.g. "7000, Chur".
    if (h.amount >= 1000 && h.amount <= 9999 && Number.isInteger(h.amount)) {
      const after = t.slice(h.idx + h.quote.length, h.idx + h.quote.length + 48);
      const before = t.slice(Math.max(0, h.idx - 20), h.idx);
      if (/^\s*[,;./]?\s*[A-ZÄÖÜ][A-Za-zÄÖÜäöüß' -]{2,}/.test(after) || /\b(PLZ|postleitzahl)\b/i.test(before + after)) {
        if (!h.currency) continue;
        if (!/monat|mtl|miete|rent|\/mo/i.test(h.quote + after.slice(0, 20))) continue;
      }
    }
    // HTTP / fetch status codes without currency are not rent.
    if (!h.currency && [200, 403, 404, 429, 500, 502, 503].includes(h.amount)) continue;
    // Floor area "60m2" is not rent.
    {
      const tail = t.slice(h.idx + Math.max(0, h.quote.length - 4), h.idx + h.quote.length + 10);
      if (/\d\s*m(?:2|²)\b/i.test(tail)) continue;
    }
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
  for (const key of ['bruttomiete', 'bruttomietzins', 'warmmiete', 'mietpreis', 'mietzins', 'monatsmiete', 'preis', 'nettomiete', 'nettomietzins', 'chf', 'fr.']) {
    let from = 0;
    while (windows.length < 10) {
      const i = lower.indexOf(key, from);
      if (i < 0) break;
      const grossLabel = /^(bruttomiete|bruttomietzins|warmmiete)$/.test(key);
      windows.push(full.slice(Math.max(0, i - (grossLabel ? 0 : 40)), i + 100));
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

/** Extract a plausible publication / update date from page text or URL.
 * Declared meta/JSON-LD wins. Then labelled dates near publication keywords, then bare dates,
 * then relative phrases (DE/FR/IT/EN). Prefer the most recent plausible past date. */

/** Coerce Serper / portal date strings ("2 days ago", "vor 3 Tagen", "15. Nov 2026") into a Date. */
export function coerceDeclaredDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Absolute ISO / parseable
  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime()) && direct.getUTCFullYear() >= 2000 && direct.getTime() <= Date.now() + 86400000) return direct;
  // dd.mm.yyyy
  const dmy = /^(\d{1,2})\.(\d{1,2})\.(20\d{2})$/.exec(s);
  if (dmy) {
    const d = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12));
    if (!Number.isNaN(d.getTime())) return d;
  }
  // "15. Nov 2026" / "15 Nov 2026" / "Nov 15, 2026"
  const months: Record<string, number> = { jan:0, january:0, januar:0, feb:1, february:1, februar:1, mar:2, märz:2, maerz:2, march:2, apr:3, april:3, may:4, mai:4, jun:5, juni:5, june:5, jul:6, juli:6, july:6, aug:7, august:7, sep:8, sept:8, september:8, oct:9, okt:9, october:9, oktober:9, nov:10, november:10, dec:11, dez:11, december:11, dezember:11 };
  const mon = s.match(/(\d{1,2})[\.\s]+([A-Za-zäöüÄÖÜ]+)[\.\s,]+(20\d{2})/);
  if (mon) {
    const mi = months[mon[2].toLowerCase()];
    if (mi != null) {
      const d = new Date(Date.UTC(Number(mon[3]), mi, Number(mon[1]), 12));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  const monEn = s.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(20\d{2})/);
  if (monEn) {
    const mi = months[monEn[1].toLowerCase()];
    if (mi != null) {
      const d = new Date(Date.UTC(Number(monEn[3]), mi, Number(monEn[2]), 12));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  // Relative EN: "2 days ago", "1 week ago", "3 hours ago"
  const en = /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i.exec(s);
  if (en) {
    const n = Number(en[1]); const u = en[2].toLowerCase();
    const d = new Date();
    if (u.startsWith('second') || u.startsWith('minute') || u.startsWith('hour')) { /* same day */ }
    else if (u.startsWith('day')) d.setDate(d.getDate() - n);
    else if (u.startsWith('week')) d.setDate(d.getDate() - n * 7);
    else if (u.startsWith('month')) d.setMonth(d.getMonth() - n);
    else if (u.startsWith('year')) d.setFullYear(d.getFullYear() - n);
    return d;
  }
  // Relative DE already handled in body; also "vor 3 Tagen" as sole declared
  const de = /vor\s+(\d+)\s+(Tag|Tagen|Woche|Wochen|Monat|Monaten|Jahr|Jahren)/i.exec(s);
  if (de) {
    const n = Number(de[1]); const u = de[2].toLowerCase();
    const d = new Date();
    if (/tag/.test(u)) d.setDate(d.getDate() - n);
    else if (/woche/.test(u)) d.setDate(d.getDate() - n * 7);
    else if (/monat/.test(u)) d.setMonth(d.getMonth() - n);
    else if (/jahr/.test(u)) d.setFullYear(d.getFullYear() - n);
    return d;
  }
  if (/^heute$/i.test(s) || /^today$/i.test(s)) { const d = new Date(); d.setHours(12,0,0,0); return d; }
  if (/^gestern$/i.test(s) || /^yesterday$/i.test(s)) { const d = new Date(); d.setDate(d.getDate()-1); d.setHours(12,0,0,0); return d; }
  return null;
}

export function parseListedAt(text: string, url?: string, declared?: string | null): Date | null {
  if (declared) {
    const coerced = coerceDeclaredDate(declared);
    if (coerced) return coerced;
    const d = new Date(String(declared).trim());
    if (!Number.isNaN(d.getTime()) && d.getTime() <= Date.now() + 86400000 && d.getUTCFullYear() >= 2000) return d;
  }
  const t = String(text ?? '');
  const now = Date.now();
  const maxFuture = now + 86400000;
  const candidates: { d: Date; score: number }[] = [];
  const push = (d: Date, score: number) => {
    if (Number.isNaN(d.getTime()) || d.getTime() > maxFuture || d.getUTCFullYear() < 2000) return;
    candidates.push({ d, score });
  };

  // Labelled absolute dates near publication / insert keywords (DE/FR/IT/EN + CH portals).
  const labelRe = /(?:publiziert|veröffentlicht|veroffentlicht|online\s+seit|inseriert(?:\s+am)?|inserat(?:\s+vom)?|erstellt(?:\s+am)?|eingestellt(?:\s+am)?|posted(?:\s+on)?|published(?:\s+on)?|date\s*posted|date\s*published|inserted(?:\s+on)?|mise\s+en\s+ligne|publié(?:\s+le)?|inserito(?:\s+il)?|pubblicato(?:\s+il)?|online\s+since)\s*[:\-]?\s*/gi;
  let lm: RegExpExecArray | null;
  while ((lm = labelRe.exec(t)) !== null) {
    const slice = t.slice(lm.index, lm.index + 80);
    // ISO after label
    const iso = /\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(slice);
    if (iso) push(new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00Z`), 30);
    // dd.mm.yyyy / dd/mm/yyyy / dd-mm-yyyy
    const dmy = /\b(\d{1,2})[./\-](\d{1,2})[./\-](20\d{2})\b/.exec(slice);
    if (dmy) push(new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12)), 30);
  }

  // Relative: DE "vor 3 Tagen", FR "il y a 3 jours", IT "3 giorni fa", EN "3 days ago"
  const relDe = /vor\s+(\d+)\s+(Tag|Tagen|Woche|Wochen|Monat|Monaten|Jahr|Jahren)/i.exec(t);
  if (relDe) {
    const n = Number(relDe[1]); const u = relDe[2].toLowerCase();
    const d = new Date();
    if (/tag/.test(u)) d.setDate(d.getDate() - n);
    else if (/woche/.test(u)) d.setDate(d.getDate() - n * 7);
    else if (/monat/.test(u)) d.setMonth(d.getMonth() - n);
    else if (/jahr/.test(u)) d.setFullYear(d.getFullYear() - n);
    push(d, 20);
  }
  const relFr = /il\s+y\s+a\s+(\d+)\s+(jour|jours|semaine|semaines|mois|an|ans)/i.exec(t);
  if (relFr) {
    const n = Number(relFr[1]); const u = relFr[2].toLowerCase();
    const d = new Date();
    if (/jour/.test(u)) d.setDate(d.getDate() - n);
    else if (/semaine/.test(u)) d.setDate(d.getDate() - n * 7);
    else if (/mois/.test(u)) d.setMonth(d.getMonth() - n);
    else if (/an/.test(u)) d.setFullYear(d.getFullYear() - n);
    push(d, 20);
  }
  const relIt = /(\d+)\s+(giorno|giorni|settimana|settimane|mese|mesi|anno|anni)\s+fa/i.exec(t);
  if (relIt) {
    const n = Number(relIt[1]); const u = relIt[2].toLowerCase();
    const d = new Date();
    if (/giorn/.test(u)) d.setDate(d.getDate() - n);
    else if (/settiman/.test(u)) d.setDate(d.getDate() - n * 7);
    else if (/mes/.test(u)) d.setMonth(d.getMonth() - n);
    else if (/ann/.test(u)) d.setFullYear(d.getFullYear() - n);
    push(d, 20);
  }
  const relEn = /(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+ago/i.exec(t);
  if (relEn) {
    const n = Number(relEn[1]); const u = relEn[2].toLowerCase();
    const d = new Date();
    if (/day/.test(u)) d.setDate(d.getDate() - n);
    else if (/week/.test(u)) d.setDate(d.getDate() - n * 7);
    else if (/month/.test(u)) d.setMonth(d.getMonth() - n);
    else if (/year/.test(u)) d.setFullYear(d.getFullYear() - n);
    push(d, 20);
  }
  // "heute" / "gestern" / "heute online"
  if (/\bheute\b/i.test(t) && /online|inseriert|publiziert|veröffentlicht|posted/i.test(t)) {
    const d = new Date(); d.setHours(12, 0, 0, 0); push(d, 15);
  }
  if (/\bgestern\b/i.test(t) && /online|inseriert|publiziert|veröffentlicht|posted/i.test(t)) {
    const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(12, 0, 0, 0); push(d, 15);
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || b.d.getTime() - a.d.getTime());
  return candidates[0].d;
}

/** Detailed publication-date extraction used by recheck diagnostics. Declared page metadata is preferred. */
export function parseListedAtDetailed(text: string, url?: string, declared?: string | null): { date: Date | null; source: 'declared' | 'text' | 'none' } {
  if (declared) {
    const coerced = coerceDeclaredDate(declared);
    if (coerced) return { date: coerced, source: 'declared' };
    const d = new Date(String(declared).trim());
    if (!Number.isNaN(d.getTime()) && d.getTime() <= Date.now() + 86400000 && d.getUTCFullYear() >= 2000) {
      return { date: d, source: 'declared' };
    }
  }
  const date = parseListedAt(text, url, null);
  return { date, source: date ? 'text' : 'none' };
}


/** Short, privacy-conscious diagnostic excerpt around likely publication-date wording. */
export function dateDiagSnippet(text: string, maxLen = 240): string | null {
  const full = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!full) return null;
  const patterns = [/(?:publiziert|veröffentlicht|posted|published|dateposted|datepublished|aktualisiert|updated|online seit|inserted|vor\s+\d+\s+(?:tag|woche|monat|jahr)[a-z]*)/i,
    /\b20\d{2}-\d{2}-\d{2}\b/, /\b\d{1,2}\.\d{1,2}\.20\d{2}\b/];
  let idx = -1;
  for (const re of patterns) { const m = re.exec(full); if (m && (idx < 0 || m.index < idx)) idx = m.index; }
  if (idx < 0) return null;
  return full.slice(Math.max(0, idx - 60), Math.min(full.length, idx + 180)).replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[email]').replace(/(?:\+?\d[\d ()\/-]{7,}\d)/g, '[phone]').slice(0, maxLen);
}


/** True when the post is from someone *looking for* a flat, not offering one.
 * Uses word boundaries so "Besucher" / "Besuchen Sie die Region" do not trigger. */
export function isSeekerPost(title: string, text: string): boolean {
  const tOnly = String(title || '').toLowerCase();
  const h = `${title}\n${String(text).slice(0, 1500)}`.toLowerCase();
  // A shared household explicitly seeking people is a seeker post, not a private rental offer.
  if (/\b(?:wg|wohngemeinschaft)\b[\s\S]{0,180}\b(?:sucht|suchen|gesucht)\b/i.test(h) ||
      /\b(?:sucht|suchen|gesucht)\b[\s\S]{0,180}\b(?:wg|wohngemeinschaft)\b/i.test(h)) return true;
  // Clear offer title wins: "… zu vermieten" without demand language.
  if (/\bzu\s+vermieten\b/i.test(tOnly) && !/\bgesucht\b/i.test(tOnly)) return false;
  if (/\bvermiete\b/i.test(tOnly) && !/\b(suche|gesucht)\b/i.test(tOnly)) return false;
  // CH market: "Nachmieter gesucht" = current tenant / landlord seeking a successor = OFFER, not seeker.
  if (/\bnachmieter\s+gesucht\b/i.test(h) && !/\b(suche\s+wohnung|wohnung\s+gesucht|ich\s+suche)\b/i.test(h)) return false;
  // Strong offer language wins only when it is not pure seeker phrasing
  const offer = /\b(zu vermieten|wir vermieten|vermiete(?!n gesucht)|anzubieten|for rent|privat vermietet|nachmieter gesucht)\b/i.test(h)
    && !/\b(suche wohnung|wohnung gesucht|ich suche|wir suchen)\b/i.test(h);
  if (offer) return false;
  if (/\b(wohnung gesucht|haus gesucht|zimmer gesucht|suche wohnung|suche haus|suche zimmer|wir suchen (eine )?wohnung|ich suche (eine )?wohnung|looking for (a )?(flat|apartment|house))\b/i.test(h)) return true;
  // "Suche ganz dringend … Wohnung … zu mieten" / "Wer hat eine … Wohnung"
  // Do not classify portal navigation such as 'Haus suchen' as a seeker post.
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
  maxListingAgeDays: 0,
  // Optional gate; default is off so a verified listing with undisclosed rent can still be useful.
  requirePrice: false,
  rejectNonMonthly: false,
  rejectSeekerPosts: true,
  requireContact: false,
};

/** Returns a filter reason or null if the listing may be kept.
 * Max rent is applied only to explicit monthly prices (or unknown large amounts with currency).
 * Night/week prices are rejected only when rejectNonMonthly is on; otherwise they pass the amount gate. */

/** True when the ad page clearly states the object is no longer available / removed.
 * Used at ingest and on recheck so stale portal cards are not kept as active listings. */
export function isListingUnavailable(title: string, text: string): boolean {
  const h = `${title}\n${String(text ?? '').slice(0, 8000)}`.toLowerCase();
  if (!h.trim()) return false;
  // German (CH portals: Flatfox, Homegate, ImmoScout, Tutti, iCasa, …)
  if (/dieses objekt ist leider gerade nicht verfügbar/.test(h)) return true;
  if (/dieses inserat ist nicht mehr verfügbar/.test(h)) return true;
  if (/objekt ist (leider )?(gerade )?nicht (mehr )?verfügbar/.test(h)) return true;
  if (/inserat (ist )?nicht mehr verfügbar/.test(h)) return true;
  if (/anzeige (wurde )?(wurde )?gelöscht|anzeige nicht (mehr )?verfügbar/.test(h)) return true;
  if (/nicht mehr online|nicht mehr aktiv|inserat abgelaufen|inserat beendet/.test(h)) return true;
  if (/wohnung (ist )?(leider )?(schon )?vermietet|bereits vermietet|schon vergeben/.test(h)) return true;
  // English
  if (/this (listing|ad|property|object) is (no longer|not) available/.test(h)) return true;
  if (/listing (has been )?(removed|deleted|expired)/.test(h)) return true;
  // French / Italian (CH)
  if (/n['']est plus disponible|annonce (n['']est )?plus disponible|oggetto non (più )?disponibile/.test(h)) return true;
  // HTTP-ish soft pages
  if (/page not found|404 not found|inserzione non trovata/.test(h) && h.length < 1500) return true;
  if (/unfortunately,?\s*this (listing|ad|property) is (currently )?not available|this (listing|ad|property) is (no longer|currently not) available/i.test(h)) return true;
  return false;
}

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



// ---------------------------------------------------------------------------
/** Detects temporary/holiday inventory separately from long-term rental offers. */
const SHORT_STAY_HINT = /\b(ferien(?:wohnung|haus|unterkunft)|holiday\s+(?:rental|home)|saison\w*|kurzzeit\w*|kurzfristig|wochenweise|nachtweise|ferienzeit)\b/i;
const SHORT_STAY_HOST = /\b(airbnb|booking|vrbo|interhome|belvilla|e-domizil|fewo-direkt|traum-ferienwohnungen|happyholiday)\b/i;
export function isShortStayListing(title: string, url: string, text: string, price: ParsedPrice | null): boolean {
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* invalid URLs fail the link gate separately */ }
  return Boolean(price && ['night', 'week', 'season'].includes(price.unit)) ||
    SHORT_STAY_HOST.test(host) ||
    SHORT_STAY_HINT.test(`${title} ${String(text || '').slice(0, 5000)}`);
}

/** Short-stay inventory requires a fetched detail page, a concrete URL and an explicit amount + period. */
export function shortStayPreflightReason(input: {
  shortStay: boolean; price: ParsedPrice | null; url: string; evidenceKind: 'page_text' | 'snippet' | 'link_only'; evidenceText?: string;
}): string | null {
  if (!input.shortStay) return null;
  // R2: price and contact are optional. Only a fetched detail page is eligible for L1.
  if (!isSpecificLink(input.url)) return 'short_stay_specific_link_required';
  if (input.evidenceKind !== 'page_text') return 'short_stay_page_evidence_required';
  return null;
}

/** Contact route is an L2 enrichment dimension, never an L1 admission gate. */
export function shortStayContactReason(_shortStay: boolean, _phone: string | null | undefined, _email: string | null | undefined): string | null {
  return null;
}

// Evidence-first credibility (P129.30+) — product precision + diagnostics
// ---------------------------------------------------------------------------

export type EvidenceKind = 'page_text' | 'snippet' | 'link_only';

const EVIDENCE_FOOTER_MARKERS = [
  'Flatfox AG',
  'About us',
  'Imprint',
  'Data Policy',
  'Privacy Settings',
  'GTC',
  '© Flatfox',
  'Made in Switzerland',
  'Ähnliche Objekte',
  'Similar objects',
  'Weitere Angebote',
  'Alle Rechte vorbehalten',
  'Cookie',
  'Datenschutz',
  'Impressum',
];

/** Strip common portal chrome so evidence is the ad body, not the site footer. */
export function stripEvidenceChrome(text: string): string {
  let s = String(text || '');
  for (const m of EVIDENCE_FOOTER_MARKERS) {
    const i = s.toLowerCase().indexOf(m.toLowerCase());
    if (i > 20) s = s.slice(0, i);
  }
  // Flatfox / Tutti trailing nav blobs
  s = s.replace(/(?:Post listing for free|Order debt extract|Termination of rental)[\s\S]*$/i, '');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

/** Verbatim excerpt for the user and for field verification (not an LLM paraphrase). */
export function buildEvidenceText(title: string, pageText: string, maxLen = 4000): string {
  const body = stripEvidenceChrome(String(pageText || ''));
  const raw = `${String(title || '').trim()}\n${body}`.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (raw.length <= maxLen) return raw;
  return raw.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

export function isHolidayOrTourismListing(title: string, text: string, url: string): boolean {
  const hay = `${title}\n${text}\n${url}`.toLowerCase();
  const monthlyRent = /pro\s*monat|\/\s*monat|nettomiete|bruttomiete|mietzins|jahresmiete|ganzj[äae]hrig|langfrist|nachmieter|unbefristet|1\s*jahr|12\s*monat/i.test(hay);
  const nightly = /pro\s*nacht|per\s*night|nachtpreis|wochenweise|ab\s*chf\s*\d+\s*\/\s*nacht/i.test(hay);
  if (monthlyRent && !nightly) return false;
  if (/happyholiday|heidiholiday|ferienhausmiete|bedandbreakfast\.|booking\.com|\/ukv\/house/i.test(hay)) return true;
  if (/\bferienhaus\b|\bfewo\b|holiday apartment|nachtpreis|pro\s*nacht|per\s*night|wochenweise/i.test(hay) && !monthlyRent) return true;
  if (/\bferienwohnung\b/i.test(hay) && !monthlyRent) return true;
  return false;
}

/** Sale signal wins even when a rent fragment also appears in the collage. */
export function isForSaleListing(title: string, text: string, url: string): boolean {
  const hay = `${title}\n${text}\n${url}`;
  if (/\bkaufpreis\b/i.test(hay) || /\bverkaufspreis\b/i.test(hay)) return true;
  if (/flat-to-buy|zu-kaufen|einfamilienhaus-zu-kaufen|\/kaufen\/|[-_]kaufen(?:\?|$)|ferien-wohnung[^/]*kaufen/i.test(url)) return true;
  if (/\b(zu\s+verkaufen|zum\s+verkauf|for\s+sale|to\s+buy|verkauft)\b/i.test(hay)) return true;
  if (/\b(?:CHF|Fr\.?|SFr\.?)\s*\d{1,2}[.'\s]\d{3}[.'\s]\d{3}\b/i.test(hay)) return true;
  if (/\b\d{1,2}\s*mio\.?\b/i.test(hay) && /\b(chf|fr\.?|kauf|verkauf|wohnung|haus)\b/i.test(hay)) return true;
  const explicitRent = /\b(zu\s+vermieten|vermiete[nt]?|nachmieter|miete\s*(?:chf|fr\.?|pro\s*monat)|pro\s*monat|mtl\.?|monatsmiete|nettomiete)\b/i.test(hay);
  if (/\b(zweitwohnung|eigentumswohnung|kaufobjekt|stockwerkeigentum)\b/i.test(hay) && !explicitRent) return true;
  if (/\bverkauf(en|s|te)?\b/i.test(hay) && !/\b(verkauft\s+worden|nicht\s+verkaufen)\b/i.test(hay)) {
    if (/\b(wohnung|haus|eigentum|objekt)\b/i.test(hay)) return true;
  }
  return false;
}

export function isPlatformOrJunkContact(email: string | null | undefined, phone: string | null | undefined): boolean {
  const e = String(email || '').toLowerCase().trim();
  if (e) {
    if (/(immoswipe|noreply|no-reply|privacy@|dataprotection|landesbibliothek|uni-halle|volksblatt|churtourismus|heidiland|surselva|comparis|betterhomes|be-homes|semanta\.ai|hamilton\.ch|einwohnerkontrolle|warmesbett|privatanbieter)/i.test(e)) return true;
    if (/^(support|privacy|dataprotection|noreply|jobs|business|info@be-homes|info@betterhomes)@/i.test(e)) return true;
    if (/@.*\.(ai)$/i.test(e) && /business|support|info@/i.test(e)) return true;
  }
  const ph = String(phone || '').replace(/[\s()-]/g, '');
  if (/^\+4100\d+/.test(ph)) return true;
  return false;
}

/** True when title/snippet rooms and body rooms disagree by more than 1.0. */
export function roomsEvidenceConflict(title: string, evidence: string, roomsEstimated?: number | null): boolean {
  const tr = parseRooms(title);
  const br = parseRooms(String(evidence || '').slice(0, 3000));
  if (tr && br && Math.abs(tr.rooms - br.rooms) > 1.01) return true;
  if (roomsEstimated != null && Number.isFinite(roomsEstimated)) {
    if (br && Math.abs(roomsEstimated - br.rooms) > 1.01) return true;
    if (tr && Math.abs(roomsEstimated - tr.rooms) > 1.01) return true;
  }
  return false;
}

/** Card municipality does not appear in evidence, but another whitelist place does. */
export function municipalityEvidenceMismatch(cardMuni: string | null | undefined, evidence: string, list: string[]): boolean {
  if (!cardMuni || !list?.length) return false;
  const card = cardMuni.toLowerCase();
  // Token-aware matching prevents "Avers" inside "Solavers" and "Trin" inside "Katrin".
  if (matchMunicipality(evidence, [cardMuni])) return false;
  const matched = matchMunicipality(evidence, list);
  if (!matched) return false;
  return matched.toLowerCase() !== card;
}

/** Facebook photo.php / bare photo albums are not usable listing posts. */
export function isWeakFacebookListingUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!/facebook\.com$/i.test(u.hostname.replace(/^www\./, '')) && !/\.facebook\.com$/i.test(u.hostname)) return false;
    const p = u.pathname;
    if (/\/photo\.php/i.test(p) || /\/photos\//i.test(p)) return true;
    if (/\/groups\/\d+\/?$/i.test(p) || /\/groups\/[^/]+\/?$/i.test(p)) return true;
    if (/fbid=/i.test(u.search) && /set=gm\./i.test(u.search) && !/\/posts\//i.test(p)) return true;
    return false;
  } catch {
    return false;
  }
}

export interface CredibilityInput {
  title: string;
  evidenceText: string;
  url: string;
  municipality: string | null;
  roomsEstimated: number | null;
  price: ParsedPrice | null;
  phone: string | null;
  email: string | null;
  evidenceKind: EvidenceKind;
  municipalities: string[];
  allowSnippet?: boolean;
  /** Permit holiday/temporary rental detail pages; the caller must enforce strict price/contact/link gates. */
  allowShortStay?: boolean;
}

/**
 * Final product gate: reject listings that would form a misleading collage card.
 * Returns a stable hide/filter reason or null when the listing may be shown.
 */

/**
 * True when the card would mix facts from unrelated objects:
 * evidence/title names a different municipality than the card, or a different street
 * that cannot be reconciled with the listing URL path.
 */
export function fieldCollageMismatch(opts: {
  municipality?: string | null;
  title?: string;
  evidence?: string;
  url?: string;
  municipalities?: string[];
}): string | null {
  const muni = String(opts.municipality || '').trim();
  const hay = `${opts.title || ''}\n${opts.evidence || ''}`.replace(/\s+/g, ' ');
  if (!muni || !hay) return null;
  const list = opts.municipalities || [];
  // If the card's municipality is explicitly present anywhere in fetched evidence, a property name
  // mentioning another town (e.g. "Tga Davos Nord in Savognin") is not a collage.
  if (matchMunicipality(hay, [muni])) return null;
  // Another whitelist commune appears as the primary place while card is labelled differently
  for (const other of list) {
    if (!other || other.toLowerCase() === muni.toLowerCase()) continue;
    const re = new RegExp(`\\b${other.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(hay) && !new RegExp(`\\b${muni.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(hay.slice(0, 200))) {
      // Strong signal only when the other place appears early and card muni does not
      if (hay.toLowerCase().indexOf(other.toLowerCase()) < 120) return 'municipality_collage';
    }
  }
  return null;
}

export function credibilityRejectReason(c: CredibilityInput): string | null {
  const title = c.title || '';
  const ev = c.evidenceText || '';
  const url = c.url || '';
  const hay = `${title}\n${ev}`;

  if (isWeakFacebookListingUrl(url)) return 'weak_facebook_url';
  if (isListingUnavailable(title, ev)) return 'listing_unavailable';
  // "Zu vermieten gesucht" = demand, but isSeekerPost treats "zu vermieten" as offer — catch it here.
  if (/\bzu\s+vermieten\s+gesucht\b/i.test(hay)) return 'seeker_post';
  if ((/\b(wir\s+suchen|ich\s+suche)\b/i.test(hay) && /(wohnung|haus|zimmer)/i.test(hay)) && !/\b(zu\s+vermieten|nachmieter\s+gesucht|vermiete)\b/i.test(hay)) {
    return 'seeker_post';
  }
  if (isSeekerPost(title, ev)) return 'seeker_post';
  if (isForSaleListing(title, ev, url)) return 'for_sale';
  if (c.price && c.price.amount > 0 && c.price.amount < 20000) {
    if (/\b(?:CHF|Fr\.?)\s*\d{1,2}[.'\s]\d{3}[.'\s]\d{3}\b/i.test(hay) || (/\bkaufpreis\b/i.test(hay) && /\d{5,}/.test(hay))) {
      return 'price_sale_mismatch';
    }
  }
  if (isHolidayOrTourismListing(title, ev, url) && !c.allowShortStay) return 'holiday_tourism';
  if (looksLikeAgencyListing(title, ev)) return 'agency';

  const nl = nonListingReason(title, url);
  if (nl) return nl;

  if (roomsEvidenceConflict(title, ev, c.roomsEstimated)) return 'rooms_conflict';
  if (municipalityEvidenceMismatch(c.municipality, ev, c.municipalities || [])) return 'municipality_mismatch';
  const collage = fieldCollageMismatch({ municipality: c.municipality, title, evidence: ev, url, municipalities: c.municipalities || [] });
  if (collage) return collage;

  if (/\btempor\w*\b|\bbefristet\s+auf\s+\d+\s*monat/i.test(hay) && /möbliert|mobliert|furnished/i.test(hay) && !/nachmieter|unbefristet|langfrist/i.test(hay)) {
    return 'temporary_furnished';
  }

  if (c.evidenceKind === 'link_only' && !(c.allowSnippet)) return 'evidence_insufficient';

  return null;
}

/** Prefer verified price from evidence text over an unverified LLM quote. */
export function priceFromEvidence(evidence: string, llmQuote: string | null | undefined): ParsedPrice | null {
  const cleaned = stripEvidenceChrome(evidence);
  const fromEv = resolveListingPrice(cleaned, null) || parsePrice(cleaned);
  if (fromEv) return fromEv;
  if (llmQuote && verifyQuote(cleaned, llmQuote)) {
    return parsePrice(llmQuote) || parsePrice(`${llmQuote}\n${cleaned.slice(0, 500)}`);
  }
  return parsePrice(cleaned.slice(0, 8000));
}

/** Structured one-line hide log for product diagnostics. */

export function buildCrossSourceSaleQuery(title: string): string | null {
  let t = String(title || '').replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*[|·•].*$/, '').replace(/\s*(-|–)\s*(Flatfox|Homegate|Tutti|Anibis|iCasa).*$/i, '').trim();
  if (t.length < 24) return null;
  const words = t.split(/\s+/).filter(Boolean);
  const core = words.slice(0, Math.min(12, words.length)).join(' ');
  if (core.length < 20) return null;
  return `"${core.slice(0, 120)}" (kaufen OR "zum Verkauf" OR Kaufpreis OR verkaufen OR Zweitwohnung)`;
}
export function verifyListingFromPageText(opts: {
  title: string; url: string; pageText: string; municipality?: string | null;
  roomsEstimated?: number | null; price?: ParsedPrice | null; municipalities?: string[];
}): string | null {
  const title = opts.title || '';
  const page = String(opts.pageText || '').slice(0, 20000);
  const url = opts.url || '';
  if (isListingUnavailable(title, page)) return 'listing_unavailable';
  if (isForSaleListing(title, page, url)) return 'for_sale';
  if (opts.price && opts.price.amount > 0 && opts.price.amount < 15000) {
    if (/\b(?:CHF|Fr\.?)\s*\d{1,2}[.'\s]\d{3}[.'\s]\d{3}\b/i.test(page) || /\bkaufpreis\b/i.test(page)) return 'price_sale_mismatch';
  }
  return credibilityRejectReason({
    title, evidenceText: page, url, municipality: opts.municipality ?? null,
    roomsEstimated: opts.roomsEstimated ?? null, price: opts.price ?? null,
    phone: null, email: null, evidenceKind: 'page_text', municipalities: opts.municipalities || [], allowSnippet: false,
  });
}
export function crossSourceIndicatesSale(title: string, hits: { title?: string; link?: string; snippet?: string }[]): boolean {
  if (!hits?.length) return false;
  const key = String(title || '').slice(0, 40).toLowerCase();
  for (const h of hits.slice(0, 8)) {
    const hay = `${h.title || ''}\n${h.snippet || ''}\n${h.link || ''}`;
    if (key.length >= 12 && !hay.toLowerCase().includes(key.slice(0, 12))) continue;
    if (/\/(kaufen|buy)\//i.test(h.link || '')) return true;
    if (/\b(kaufpreis|zum\s+verkauf|zu\s+verkaufen|for\s+sale|zweitwohnung)\b/i.test(hay) && !/\b(zu\s+vermieten|miete\s*chf|pro\s*monat)\b/i.test(hay)) return true;
  }
  return false;
}

export function formatHideLog(opts: { reason: string; host?: string; title?: string; url?: string }): string {
  const host = (opts.host || '').slice(0, 40);
  const title = String(opts.title || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const url = String(opts.url || '').slice(0, 120);
  return JSON.stringify({ type: 'immofinder_hide', reason: opts.reason, host, title, url });
}

