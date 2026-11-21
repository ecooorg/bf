import { htmlToText, type ImmoConfig } from './immofinderCore.ts';
import { isPublicFetchTarget } from './webSearch.ts';

/** Polite fetcher: honest User-Agent, per-host delay, robots.txt, timeout, size cap, http(s) only. */
export function createPoliteFetch(cfg: ImmoConfig, fetchImpl: typeof fetch = fetch, isPublicTarget: (url: string) => Promise<boolean> = isPublicFetchTarget) {
  type RobotsRule = { allow: boolean; path: string };
  const last = new Map<string, number>(); const robots = new Map<string, RobotsRule[]>();
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
  async function disallowed(u: URL): Promise<boolean> {
    let rules = robots.get(u.host);
    if (!rules) {
      const groups: { agents: string[]; rules: RobotsRule[] }[] = [];
      let current: { agents: string[]; rules: RobotsRule[] } | null = null;
      try {
        const r = await get(`${u.protocol}//${u.host}/robots.txt`, 8000);
        if (r.ok) {
          for (const line of r.body.split(/\r?\n/)) {
            const clean = line.split('#')[0].trim();
            const m = /^(user-agent|allow|disallow)\s*:\s*(.*)$/i.exec(clean);
            if (!m) continue;
            const key = m[1].toLowerCase(); const value = m[2].trim();
            if (key === 'user-agent') {
              if (current && current.rules.length) { groups.push(current); current = null; }
              if (!current) current = { agents: [], rules: [] };
              current.agents.push(value.toLowerCase());
            } else if (current && value) {
              current.rules.push({ allow: key === 'allow', path: value });
            }
          }
          if (current) groups.push(current);
        }
      } catch { /* unavailable robots.txt means no additional path restriction */ }
      const ua = String(cfg.fetch.userAgent || '').split(/[\s(/]/, 1)[0].toLowerCase();
      const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && a && ua.includes(a)));
      const longest = specific.reduce((n, g) => Math.max(n, ...g.agents.filter((a) => a !== '*' && a && ua.includes(a)).map((a) => a.length)), 0);
      const selected = longest > 0
        ? specific.filter((g) => g.agents.some((a) => a !== '*' && a.length === longest && ua.includes(a)))
        : groups.filter((g) => g.agents.includes('*'));
      rules = selected.flatMap((g) => g.rules);
      robots.set(u.host, rules);
    }
    const target = `${u.pathname}${u.search}`;
    const matches = rules.map((rule) => {
      const pattern = rule.path.endsWith('$') ? rule.path.slice(0, -1) : rule.path;
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const regex = new RegExp(`^${escaped}${rule.path.endsWith('$') ? '$' : ''}`);
      return regex.test(target) ? { ...rule, specificity: rule.path.replace(/[\*$]/g, '').length } : null;
    }).filter((x): x is RobotsRule & { specificity: number } => Boolean(x));
    if (!matches.length) return false;
    matches.sort((a, b) => b.specificity - a.specificity || Number(b.allow) - Number(a.allow));
    return !matches[0].allow;
  }
  const normalizeTarget = (raw: string) => {
    try {
      const u = new URL(raw); u.hash = '';
      for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$|source$)/i.test(k)) u.searchParams.delete(k);
      return `${u.hostname.replace(/^www\./i, '').toLowerCase()}${u.pathname.replace(/\/+$/, '')}${u.search}`;
    } catch { return ''; }
  };
  const jinaFallback = async (target: string) => {
    if (!await isPublicTarget(target)) return null;
    const configuredBase = String(process.env.JINA_READER_BASE_URL || '').trim();
    const base = /^https:\/\/[^\s?#]+$/i.test(configuredBase)
      ? (configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`)
      : 'https://r.jina.ai/';
    const headers: Record<string, string> = {
      Accept: 'text/plain',
      'X-Return-Format': 'markdown',
      'X-Timeout': '10',
    };
    const key = String(process.env.JINA_API_KEY || '').trim();
    if (key) headers.Authorization = `Bearer ${key}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 11_000);
    try {
      const r = await fetchImpl(`${base}${target}`, { method: 'GET', headers, signal: ctrl.signal, redirect: 'error' });
      if (!r.ok || !/^text\//i.test(String(r.headers.get('content-type') || ''))) return null;
      const raw = String(await r.text()).slice(0, Math.max(16_000, cfg.limits.maxPageBytes));
      const source = /^URL Source:\s*(https?:\/\/[^\s]+)\s*$/im.exec(raw)?.[1]?.replace(/[),.;]+$/, '');
      if (!source || normalizeTarget(source) !== normalizeTarget(target)) return null;
      const title = /^Title:\s*(.+)$/im.exec(raw)?.[1]?.trim() || new URL(target).hostname;
      const marker = /(?:^|\n)Markdown Content:\s*/i.exec(raw);
      const content = (marker ? raw.slice(marker.index + marker[0].length) : raw)
        .replace(/^Title:\s*.+$/im, '').replace(/^URL Source:\s*.+$/im, '').trim();
      if (content.length < 30) return null;
      const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return {
        ok: true, status: 200, finalUrl: target, fetchMode: 'jina_reader',
        body: `<html><head><title>${esc(title)}</title></head><body><pre>${esc(content)}</pre></body></html>`,
      };
    } catch { return null; }
    finally { clearTimeout(timer); }
  };

  return async function fetchPage(url: string): Promise<{ ok: boolean; status: number; body: string; finalUrl?: string; fetchMode?: string }> {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return { ok: false, status: 0, body: 'unsupported protocol' };
    if (cfg.fetch.respectRobotsTxt && await disallowed(u)) return { ok: false, status: 403, body: 'blocked by robots.txt', fetchMode: 'robots_blocked' };
    const wait = (last.get(u.host) || 0) + cfg.fetch.perHostDelayMs - Date.now(); if (wait > 0) await sleep(wait);
    last.set(u.host, Date.now());
    let direct: { ok: boolean; status: number; body: string; finalUrl?: string };
    try { direct = await get(url); }
    catch (e) { direct = { ok: false, status: 0, body: String((e as Error)?.message || e).slice(0, 120) }; }
    const directTextChars = htmlToText(direct.body).trim().length;
    if (!direct.ok || directTextChars < 30) {
      const fallback = await jinaFallback(url);
      if (fallback) {
        try { console.info(JSON.stringify({ type: 'immofinder_fetch_fallback', host: u.hostname, outcome: 'jina_reader_ok', directStatus: direct.status, directTextChars })); } catch { /* diagnostics only */ }
        return fallback;
      }
      try { console.info(JSON.stringify({ type: 'immofinder_fetch_fallback', host: u.hostname, outcome: 'jina_reader_unavailable', directStatus: direct.status, directTextChars })); } catch { /* diagnostics only */ }
    }
    return { ...direct, fetchMode: 'direct' };
  };
}
