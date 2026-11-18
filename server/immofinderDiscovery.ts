import { type ImmoConfig, isStopAgency } from './immofinderCore.ts';

export interface SearchHit { title: string; link: string; snippet: string }
export interface DiscoveryItem { url: string; host: string; hit: SearchHit; snippetOnly: boolean }

export const hostOf = (u: string): string => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const hostMatches = (host: string, list: string[]) => list.some((h) => host === h || host.endsWith(`.${h}`));

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
  const families = opts?.families?.length ? opts.families : (['private', 'portals'] as QueryFamily[]);
  const per = opts?.allCommunes ? Math.max(cfg.municipalities.length, 1) : d.communesPerRun;
  const startCycle = opts?.allCommunes ? 0 : cycle;
  const communes = communesForRun(cfg.municipalities, per, startCycle);

  const templates: string[] = [];
  if (families.includes('private')) {
    let use = d.queries || [];
    if (opts?.allCommunes) {
      const prefer = use.filter((q) =>
        /facebook|privat|Eigentümer|Vermieter Kontakt|Nachmieter|zu vermieten|anibis|tutti/i.test(q)
      ).slice(0, 4);
      use = prefer.length ? prefer : use.slice(0, 3);
    }
    templates.push(...use);
  }
  if (families.includes('portals')) {
    let portals = d.portalQueries || [];
    if (opts?.allCommunes) portals = portals.slice(0, 6);
    templates.push(...portals);
  }
  if (!templates.length) return [];
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
    seen.add(h.link);
    // Portal detail pages: fetch. Social/booking: snippet only.
    const snippetOnly = hostMatches(host, d.snippetOnlyHosts) && !hostMatches(host, portalHosts);
    out.push({ url: h.link, host, hit: h, snippetOnly });
  }
  const list = cfg.municipalities || [];
  const score = (it: DiscoveryItem) => {
    const hay = `${it.url} ${it.hit?.title || ''} ${it.hit?.snippet || ''}`.toLowerCase();
    for (const m of list) {
      if (m && hay.includes(m.toLowerCase())) return 0;
    }
    if (portalHosts.some((ph) => it.host === ph || it.host.endsWith(`.${ph}`))) return 0;
    if (/\b(scuol|engadin|samnaun|st\.?\s*moritz|davos|klosters|arosa|pontresina)\b/i.test(hay)) return 2;
    return 1;
  };
  return out.sort((a, b) => score(a) - score(b));
}

/** Serper.dev Google search (Switzerland, German). Uses SERPER_API_KEY; never logs the key. */
export function createSerperSearch(fetchImpl: typeof fetch = fetch, num = 10) {
  return async function search(q: string): Promise<SearchHit[]> {
    const key = String(process.env.SERPER_API_KEY || '').trim(); if (!key) throw new Error('SERPER_API_KEY not set');
    const r = await fetchImpl('https://google.serper.dev/search', { method: 'POST', headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ q, gl: 'ch', hl: 'de', num }) });
    if (!r.ok) throw new Error(`Serper HTTP ${r.status}`);
    const d: any = await r.json();
    return (d.organic || []).map((o: any) => ({ title: String(o.title || ''), link: String(o.link || ''), snippet: String(o.snippet || '') })).filter((h: SearchHit) => h.link);
  };
}
