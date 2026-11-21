import { type ImmoConfig, isStopAgency, nonListingReason, isSpecificLink, isPortalDetailUrl } from './immofinderCore.ts';

export interface SearchHit { title: string; link: string; snippet: string; /** Serper/organic date string when present, e.g. "2 days ago" or "15.11.2026". */ date?: string | null }
export interface DiscoveryItem { url: string; host: string; hit: SearchHit; snippetOnly: boolean }

export const hostOf = (u: string): string => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const hostMatches = (host: string, list: string[]) => list.some((h) => host === h || host.endsWith(`.${h}`));
/**
 * Swiss portals use several detail URL shapes, not all numeric IDs or long SEO slugs.
 * Accept a non-generic detail route while rejecting roots and search/category pages.
 */
export function isPortalDetailLink(url: string, cfg: ImmoConfig): boolean {
  return isPortalDetailUrl(url, cfg.discovery?.portalHosts || []);
}

/** Rotating slice of the whitelist: every run covers the next `communesPerRun` communes, so all are covered over several runs. */
export function communesForRun(all: string[], perRun: number, cycle: number): string[] {
  if (!all.length) return [];
  const n = Math.min(perRun, all.length); const start = (cycle * perRun) % all.length;
  return Array.from({ length: n }, (_, i) => all[(start + i) % all.length]);
}

export type QueryFamily = 'private' | 'portals';

/**
 * Build Serper queries for the active commune slice.
 * - private: Facebook / Eigentümer / Nachmieter templates (cfg.discovery.queries)
 * - portals: site:homegate.ch / immoscout24 / flatfox / … (cfg.discovery.portalQueries)
 * Families are selected by settings (search / swiss-portals); both default on when discovery is enabled.
 */
export function buildQueries(
  cfg: ImmoConfig,
  cycle: number,
  opts?: { allCommunes?: boolean; families?: QueryFamily[] },
): string[] {
  const d = cfg.discovery; if (!d?.enabled) return [];
  const families: QueryFamily[] = opts?.families?.length
    ? opts.families
    : [
        ...((d.queries || []).length ? (['private'] as QueryFamily[]) : []),
        ...((d.portalQueries || []).length ? (['portals'] as QueryFamily[]) : []),
      ];
  const per = opts?.allCommunes ? Math.max(cfg.municipalities.length, 1) : d.communesPerRun;
  const startCycle = opts?.allCommunes ? 0 : cycle;
  const communes = communesForRun(cfg.municipalities, per, startCycle);

  // Full list of enabled templates — no truncation (Carousel and Full both finish every selected source).
  let privateT = families.includes('private') ? [...(d.queries || [])] : [];
  let portalT = families.includes('portals') ? [...(d.portalQueries || [])] : [];
  // Interleave private and portal templates so site: portals are not starved behind a long private queue.
  const templates: string[] = [];
  const n = Math.max(privateT.length, portalT.length);
  for (let i = 0; i < n; i++) {
    if (i < privateT.length) templates.push(privateT[i]);
    if (i < portalT.length) templates.push(portalT[i]);
  }
  if (!templates.length) return [];
  // Per commune: all templates (fair). Carousel uses a small commune slice; full mode uses all communes.
  return communes.flatMap((c) => templates.map((q) => q.replace(/\{commune\}/g, c)));
}

/** Search hits -> items to examine. Agency hosts are skipped; social/booking hosts stay snippet-only.
 * Swiss rental portals (homegate, immoscout24, …) are fetched so price and private contact can be extracted.
 * Rank: whitelist match in URL/title first, then unknown, outside-zone last. */
export function pickItems(hits: SearchHit[], cfg: ImmoConfig): DiscoveryItem[] {
  const d = cfg.discovery!; const seen = new Set<string>(); const out: DiscoveryItem[] = [];
  const portalHosts = d.portalHosts || [];
  for (const h of hits) {
    if (!/^https?:\/\//i.test(h.link) || seen.has(h.link)) continue;
    const host = hostOf(h.link); if (!host) continue;
    if (hostMatches(host, d.skipHosts) || isStopAgency(host.replace(/[.-]/g, ' '), cfg.stopAgencies)) continue;
    // Drop list/search/join pages early so the fetch queue is not flooded (keeps Serper budget for real ads).
    if (nonListingReason(h.title || '', h.link)) continue;
    if (!isSpecificLink(h.link) && !isPortalDetailLink(h.link, cfg)) {
      // Owner microsites without an ID are rare but valid; portals/FB roots/lists are not.
      const dropHost = hostMatches(host, portalHosts)
        || /facebook\.com$|booking\.com$|cozycozy\.|rentola\.|happyholiday\.|ferienhausmiete\.|airbnb\.|vrbo\./i.test(host);
      if (dropHost) continue;
    }
    seen.add(h.link);
    // Portal detail pages: fetch. Social/booking: snippet only.
    const snippetOnly = hostMatches(host, d.snippetOnlyHosts) && !hostMatches(host, portalHosts);
    out.push({ url: h.link, host, hit: h, snippetOnly });
  }
  const list = cfg.municipalities || [];
  const score = (it: DiscoveryItem) => {
    const hay = `${it.url} ${it.hit?.title || ''} ${it.hit?.snippet || ''}`.toLowerCase();
    let s = 1;
    // Prefer Swiss portals we can fetch (Homegate, Tutti, Flatfox, …) over FB snippet-only.
    if (portalHosts.some((ph) => it.host === ph || it.host.endsWith(`.${ph}`))) s = 0;
    for (const m of list) {
      if (m && hay.includes(m.toLowerCase())) s = Math.min(s, 0);
    }
    if (/homegate\.ch|tutti\.ch|immoscout24\.ch|flatfox\.ch|newhome\.ch/i.test(it.host)) s = Math.min(s, 0);
    // Facebook / social snippet-only: de-prioritise so portal detail pages are examined first.
    if (it.snippetOnly && /facebook\.com|instagram\.com/i.test(it.host)) s += 3;
    if (/\b(scuol|engadin|samnaun|st\.?\s*moritz|davos|klosters|arosa|pontresina)\b/i.test(hay)) s += 2;
    // Weak FB photo links should already be dropped by isSpecificLink; if present, bury them.
    if (/\/photo\.php/i.test(it.url)) s += 5;
    return s;
  };
  return out.sort((a, b) => score(a) - score(b));
}

/** Serper.dev Google search (Switzerland, German). Uses SERPER_API_KEY; never logs the key. */
/** Cap query length and normalise whitespace — Serper returns HTTP 400 on empty/invalid or oversized q. */
export function sanitizeSerperQuery(q: string, maxLen = 380): string {
  let s = String(q || '').replace(/\s+/g, ' ').trim();
  // Drop dangling operators that often appear after template truncation
  s = s.replace(/\s+(OR|AND)\s*$/i, '').trim();
  if (s.length > maxLen) {
    s = s.slice(0, maxLen).replace(/\s+\S*$/, '').replace(/\s+(OR|AND)\s*$/i, '').trim();
  }
  return s;
}

export function createSerperSearch(fetchImpl: typeof fetch = fetch, num = 10) {
  // Serper returns HTTP 400 when num is outside 1..10 (or query empty).
  const n = Math.max(1, Math.min(10, Number(num) || 10));
  return async function search(q: string, options?: { tbs?: string }): Promise<SearchHit[]> {
    const key = String(process.env.SERPER_API_KEY || '').trim(); if (!key) throw new Error('SERPER_API_KEY not set');
    const query = sanitizeSerperQuery(q);
    if (!query) return [];
    const r = await fetchImpl('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'ch', hl: 'de', num: n, ...(options?.tbs ? { tbs: options.tbs } : {}) }),
    });
    if (!r.ok) {
      let detail = '';
      try { detail = (await r.text()).slice(0, 180); } catch { /* ignore */ }
      throw new Error(`Serper HTTP ${r.status}${detail ? `: ${detail}` : ''}`);
    }
    const d: any = await r.json();
    return (d.organic || []).map((o: any) => ({
      title: String(o.title || ''),
      link: String(o.link || ''),
      snippet: String(o.snippet || ''),
      date: o.date != null ? String(o.date) : (o.datePublished != null ? String(o.datePublished) : null),
    })).filter((h: SearchHit) => h.link);
  };
}
