import type { ImmoConfig } from './immofinderCore.ts';

/** Polite fetcher: honest User-Agent, per-host delay, robots.txt, timeout, size cap, http(s) only. */
export function createPoliteFetch(cfg: ImmoConfig, fetchImpl: typeof fetch = fetch) {
  const last = new Map<string, number>(); const robots = new Map<string, string[]>();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  async function get(url: string, timeout = cfg.limits.fetchTimeoutMs) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetchImpl(url, { headers: {
        'User-Agent': cfg.fetch.userAgent,
        Accept: 'text/html,*/*;q=0.5',
        'Accept-Language': 'de-CH,de;q=0.9,en;q=0.5',
        // Force origin response for recheck freshness (avoid stale CDN "available" pages).
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      }, signal: ctrl.signal, redirect: 'follow', cache: 'no-store' as RequestCache });
      const buf = (await r.text()).slice(0, cfg.limits.maxPageBytes);
      return { ok: r.ok, status: r.status, body: buf, finalUrl: r.url || url };
    } finally { clearTimeout(t); }
  }
  async function disallowed(u: URL): Promise<string[]> {
    if (robots.has(u.host)) return robots.get(u.host)!;
    let rules: string[] = [];
    try {
      const r = await get(`${u.protocol}//${u.host}/robots.txt`, 8000);
      if (r.ok) { let star = false; for (const line of r.body.split(/\r?\n/)) { const l = line.split('#')[0].trim(); const m = /^(user-agent|disallow)\s*:\s*(.*)$/i.exec(l); if (!m) continue; if (/^user-agent/i.test(m[1])) star = m[2].trim() === '*'; else if (star && m[2].trim()) rules.push(m[2].trim()); } }
    } catch { rules = []; }
    robots.set(u.host, rules); return rules;
  }
  return async function fetchPage(url: string): Promise<{ ok: boolean; status: number; body: string; finalUrl?: string }> {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return { ok: false, status: 0, body: 'unsupported protocol' };
    if (cfg.fetch.respectRobotsTxt && (await disallowed(u)).some((p) => u.pathname.startsWith(p))) return { ok: false, status: 403, body: 'blocked by robots.txt' };
    const wait = (last.get(u.host) || 0) + cfg.fetch.perHostDelayMs - Date.now(); if (wait > 0) await sleep(wait);
    last.set(u.host, Date.now());
    return get(url);
  };
}
