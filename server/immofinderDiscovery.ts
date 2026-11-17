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

export function buildQueries(cfg: ImmoConfig, cycle: number): string[] {
  const d = cfg.discovery; if (!d?.enabled) return [];
  return communesForRun(cfg.municipalities, d.communesPerRun, cycle).flatMap((c) => d.queries.map((q) => q.replace('{commune}', c)));
}

/** Search hits -> items to examine. Agency hosts are skipped; hosts that must not be fetched (social/booking portals) are used from the search snippet only.
 * Rank: whitelist match in URL/title first, then unknown, outside-zone last (so early-stop does not kill the good tail). */
export function pickItems(hits: SearchHit[], cfg: ImmoConfig): DiscoveryItem[] {
  const d = cfg.discovery!; const seen = new Set<string>(); const out: DiscoveryItem[] = [];
  for (const h of hits) {
    if (!/^https?:\/\//i.test(h.link) || seen.has(h.link)) continue;
    const host = hostOf(h.link); if (!host) continue;
    if (hostMatches(host, d.skipHosts) || isStopAgency(host.replace(/[.-]/g, ' '), cfg.stopAgencies)) continue;
    seen.add(h.link); out.push({ url: h.link, host, hit: h, snippetOnly: hostMatches(host, d.snippetOnlyHosts) });
  }
  // Lazy import avoided: ranking uses only URL/title strings (pipeline applies placeFromUrl). Prefer hosts/paths that mention communes.
  const list = cfg.municipalities || [];
  const score = (it: DiscoveryItem) => {
    const hay = `${it.url} ${it.hit?.title || ''} ${it.hit?.snippet || ''}`.toLowerCase();
    for (const m of list) {
      if (m && hay.includes(m.toLowerCase())) return 0;
    }
    // clear distant resorts often in GR tourism SERP noise
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
