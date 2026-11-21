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
  // Interleave communes before moving to the next template. A run may hit its
  // candidate budget before exhausting the plan; every selected commune must
  // therefore receive early coverage instead of starving behind the first one.
  return templates.flatMap((q) => communes.map((c) => q.replace(/\{commune\}/g, c)));
}

/** Search hits -> items to examine. Agency hosts are skipped; social/booking hosts stay snippet-only.
 * Swiss rental portals (homegate, immoscout24, …) are fetched so price and private contact can be extracted.
 * Rank: whitelist match in URL/title first, then unknown, outside-zone last. */
export function pickItems(hits: SearchHit[], cfg: ImmoConfig, onDecision?: (decision: { accepted: boolean; reason: string; host: string; url: string; title: string }) => void): DiscoveryItem[] {
  const d = cfg.discovery!; const seen = new Set<string>(); const out: DiscoveryItem[] = [];
  const portalHosts = d.portalHosts || [];
  for (const h of hits) {
    const host = hostOf(h.link);
    const decide = (accepted: boolean, reason: string) => { try { onDecision?.({ accepted, reason, host, url: h.link, title: String(h.title || '').slice(0, 180) }); } catch { /* diagnostics only */ } };
    if (!/^https?:\/\//i.test(h.link)) { decide(false, 'invalid_or_unsupported_url'); continue; }
    if (seen.has(h.link)) { decide(false, 'duplicate_url_in_serp'); continue; }
    if (!host) { decide(false, 'invalid_host'); continue; }
    if (hostMatches(host, d.skipHosts)) { decide(false, 'configured_skip_host'); continue; }
    if (isStopAgency(host.replace(/[.-]/g, ' '), cfg.stopAgencies)) { decide(false, 'agency_host'); continue; }
    // Drop list/search/join pages early so the fetch queue is not flooded (keeps Serper budget for real ads).
    const nonListing = nonListingReason(h.title || '', h.link);
    if (nonListing) { decide(false, `non_listing:${nonListing}`); continue; }
    // Social feeds may expose ads only through snippets; retain them as provisional leads.
    const snippetOnly = hostMatches(host, d.snippetOnlyHosts) && !hostMatches(host, portalHosts);
    if (!isSpecificLink(h.link) && !isPortalDetailLink(h.link, cfg)) {
      // Owner microsites without an ID are rare but valid; portals/FB roots/lists are not.
      const dropHost = hostMatches(host, portalHosts)
        || /facebook\.com$|booking\.com$|cozycozy\.|rentola\.|happyholiday\.|ferienhausmiete\.|airbnb\.|vrbo\./i.test(host);
      if (dropHost && !snippetOnly) { decide(false, 'generic_or_search_url_on_portal_social_host'); continue; }
    }
    seen.add(h.link);
    // Keep social-feed candidates; the pipeline records their evidence as provisional.
    out.push({ url: h.link, host, hit: h, snippetOnly });
    decide(true, snippetOnly ? 'accepted_snippet_only' : 'accepted_direct_fetch');
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
