import { htmlToText, type ImmoConfig } from './immofinderCore.ts';
import { isPublicFetchTarget } from './webSearch.ts';

/** Polite fetcher: honest User-Agent, per-host delay, robots.txt, timeout, size cap, http(s) only. */
export function createPoliteFetch(cfg: ImmoConfig, fetchImpl: typeof fetch = fetch, isPublicTarget: (url: string) => Promise<boolean> = isPublicFetchTarget) {
  type RobotsRule = { allow: boolean; path: string };
  const last = new Map<string, number>(); const robots = new Map<string, RobotsRule[]>();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  async function readPrefix(response: Response, maxBytes = cfg.limits.maxPageBytes): Promise<string> {
    if (!response.body) return '';
    const reader = response.body.getReader(); const decoder = new TextDecoder();
    let out = ''; let used = 0; const limit = Math.max(0, maxBytes);
    try {
      while (used < limit) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = value.byteLength > limit - used ? value.subarray(0, limit - used) : value;
        used += chunk.byteLength;
        out += decoder.decode(chunk, { stream: used < limit });
        if (chunk.byteLength < value.byteLength || used >= limit) { try { await reader.cancel(); } catch { /* stream already closed */ } break; }
      }
      out += decoder.decode();
      return out;
    } finally { try { reader.releaseLock(); } catch { /* already released */ } }
  }
  async function get(url: string, timeout = cfg.limits.fetchTimeoutMs, redirect: 'follow' | 'error' | 'manual' = 'follow') {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetchImpl(url, { headers: {
        'User-Agent': cfg.fetch.userAgent,
        Accept: 'text/html,*/*;q=0.5',
        'Accept-Language': 'de-CH,de;q=0.9,en;q=0.5',
        // Force origin response for recheck freshness (avoid stale CDN "available" pages).
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      }, signal: ctrl.signal, redirect, cache: 'no-store' as RequestCache });
      const body = await readPrefix(r);
      return { ok: r.ok, status: r.status, body, finalUrl: r.url || url, location: r.headers.get('location') || undefined };
    } finally { clearTimeout(t); }
  }
  async function disallowed(u: URL): Promise<boolean> {
    let rules = robots.get(u.host);
    if (!rules) {
      const groups: { agents: string[]; rules: RobotsRule[] }[] = [];
      let current: { agents: string[]; rules: RobotsRule[] } | null = null;
      try {
        const r = await get(`${u.protocol}//${u.host}/robots.txt`, 8000, 'error');
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
      const raw = await readPrefix(r, Math.max(16_000, cfg.limits.maxPageBytes));
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
    let currentUrl = url; let redirected = false;
    let initial: URL;
    try { initial = new URL(url); } catch { return { ok: false, status: 0, body: 'invalid URL', fetchMode: 'blocked_non_public' }; }
    if (!/^https?:$/.test(initial.protocol)) return { ok: false, status: 0, body: 'unsupported protocol' };
    let direct: { ok: boolean; status: number; body: string; finalUrl?: string; location?: string; fetchMode?: string } = { ok: false, status: 0, body: 'not fetched' };
    for (let hop = 0; hop <= 5; hop++) {
      let target: URL;
      try { target = new URL(currentUrl); } catch { return { ok: false, status: 0, body: 'invalid redirect URL', finalUrl: currentUrl, fetchMode: 'blocked_non_public_redirect' }; }
      if (!/^https?:$/.test(target.protocol) || !await isPublicTarget(currentUrl)) {
        return { ok: false, status: 0, body: 'blocked non-public target', finalUrl: currentUrl, fetchMode: redirected ? 'blocked_non_public_redirect' : 'blocked_non_public' };
      }
      if (cfg.fetch.respectRobotsTxt && await disallowed(target)) return { ok: false, status: 403, body: 'blocked by robots.txt', finalUrl: currentUrl, fetchMode: 'robots_blocked' };
      const wait = (last.get(target.host) || 0) + cfg.fetch.perHostDelayMs - Date.now(); if (wait > 0) await sleep(wait);
      last.set(target.host, Date.now());
      try { direct = await get(currentUrl, cfg.limits.fetchTimeoutMs, 'manual'); }
      catch (e) { direct = { ok: false, status: 0, body: String((e as Error)?.message || e).slice(0, 120), finalUrl: currentUrl }; break; }
      if (direct.status >= 300 && direct.status < 400 && direct.location) {
        if (hop === 5) return { ok: false, status: direct.status, body: 'redirect limit exceeded', finalUrl: currentUrl, fetchMode: 'redirect_limit' };
        try {
          const next = new URL(direct.location, currentUrl);
          if (!/^https?:$/.test(next.protocol)) return { ok: false, status: 0, body: 'blocked redirect protocol', finalUrl: next.href, fetchMode: 'blocked_non_public_redirect' };
          currentUrl = next.href; redirected = true; continue;
        } catch { return { ok: false, status: 0, body: 'invalid redirect target', finalUrl: currentUrl, fetchMode: 'blocked_non_public_redirect' }; }
      }
      direct.finalUrl = currentUrl;
      break;
    }
    const directTextChars = htmlToText(direct.body).trim().length;
    if (!direct.ok || directTextChars < 30) {
      if (direct.fetchMode?.startsWith('blocked_non_public') || direct.fetchMode === 'redirect_limit') return { ok: false, status: direct.status, body: direct.body, finalUrl: direct.finalUrl || currentUrl, fetchMode: direct.fetchMode };
      const fallback = await jinaFallback(url);
      if (fallback) {
        try { console.info(JSON.stringify({ type: 'immofinder_fetch_fallback', host: initial.hostname, outcome: 'jina_reader_ok', directStatus: direct.status, directTextChars })); } catch { /* diagnostics only */ }
        return fallback;
      }
      try { console.info(JSON.stringify({ type: 'immofinder_fetch_fallback', host: initial.hostname, outcome: 'jina_reader_unavailable', directStatus: direct.status, directTextChars })); } catch { /* diagnostics only */ }
    }
    return { ok: direct.ok, status: direct.status, body: direct.body, finalUrl: direct.finalUrl || currentUrl, fetchMode: redirected ? 'direct_redirect' : 'direct' };
  };
}
