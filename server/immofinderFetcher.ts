import { existsSync } from 'node:fs';
import { htmlToText, type ImmoConfig } from './immofinderCore.ts';
import { isPublicFetchTarget } from './webSearch.ts';

/** True only for explicitly allowlisted JS-shell hosts with a short but non-empty direct response. */
export function isShortPageBrowserCandidate(
  hostname: string,
  textChars: number,
  fetchConfig: Pick<ImmoConfig['fetch'], 'browserRenderHosts' | 'browserRenderMinTextChars'>,
): boolean {
  const host = hostname.replace(/^www\./i, '').toLowerCase();
  const minChars = Math.max(120, Math.floor(fetchConfig.browserRenderMinTextChars ?? 1200));
  const allowed = (fetchConfig.browserRenderHosts ?? []).map((value) => value.replace(/^www\./i, '').toLowerCase());
  return textChars >= 120 && textChars < minChars && allowed.some((value) => host === value || host.endsWith('.' + value));
}

/** Legacy fetcher: honest User-Agent, per-host delay, timeout, size cap and public-target validation. */
export function createPoliteFetch(cfg: ImmoConfig, fetchImpl: typeof fetch = fetch, isPublicTarget: (url: string) => Promise<boolean> = isPublicFetchTarget, options: { allowJina?: boolean; allowBrowser?: boolean } = {}) {
  const last = new Map<string, number>();
  let browserRenders = 0;
  const browserRenderLimit = Math.max(0, Math.min(3, Math.floor(cfg.fetch.maxBrowserRendersPerRun ?? 2)));
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
      if (content.length < 120) return null;
      const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return {
        ok: true, status: 200, finalUrl: target, fetchMode: 'jina_reader',
        body: `<html><head><title>${esc(title)}</title></head><body><pre>${esc(content)}</pre></body></html>`,
      };
    } catch { return null; }
    finally { clearTimeout(timer); }
  };

  /** Bounded browser rendering for JS-shell/anti-bot responses; all navigations remain public-target checked. */
  async function browserFallback(target: string, logFetch: (event: string, details?: Record<string, unknown>) => void) {
    if (process.env.NODE_ENV !== 'production' || process.env.IMMOFINDER_BROWSER_FALLBACK === 'false') return null;
    if (browserRenders >= browserRenderLimit) { logFetch('browser_fallback_budget_exhausted', { limit: browserRenderLimit }); return null; }
    if (!await isPublicTarget(target)) return null;
    browserRenders++;
    let browser: any = null;
    try {
      if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('/opt/render/project/playwright-browsers')) {
        process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/render/project/playwright-browsers';
      }
      const { chromium } = await import('playwright');
      browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
      const context = await browser.newContext({ userAgent: cfg.fetch.userAgent, locale: 'de-CH' });
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(9_000);
      await page.route('**/*', async (route) => {
        try {
          const request = route.request();
          const kind = request.resourceType();
          if (kind === 'image' || kind === 'media' || kind === 'font') return await route.abort();
          const requestUrl = request.url();
          if (/^https?:/i.test(requestUrl) && !await isPublicTarget(requestUrl)) return await route.abort();
          await route.continue();
        } catch { await route.abort().catch(() => {}); }
      });
      const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 9_000 });
      const targetHost = (() => { try { return new URL(target).hostname.replace(/^www\./i, '').toLowerCase(); } catch { return ''; } })();
      const jsShellHost = (cfg.fetch.browserRenderHosts ?? []).some((host) => targetHost === host.replace(/^www\./i, '').toLowerCase());
      await page.waitForLoadState('networkidle', { timeout: jsShellHost ? 5_000 : 1_500 }).catch(() => {});
      if (jsShellHost) {
        await page.waitForFunction(() => (document.body?.innerText || '').trim().length >= 300, { timeout: 4_000 }).catch(() => {});
      } else {
        await page.waitForTimeout(500);
      }
      const visible = String(await page.locator('body').innerText({ timeout: 2_000 }).catch(() => '')).trim();
      const title = String(await page.title().catch(() => new URL(target).hostname)).trim();
      const finalUrl = page.url();
      const visibleText = visible.slice(0, cfg.limits.maxPageBytes);
      const challenge = /just a moment|attention required|cf-browser-verification|checking your browser|enable javascript and cookies|ddos protection by|security check|access denied|one more step|please wait|verify you are human|captcha/i.test(visibleText);
      if (!response?.ok() || !await isPublicTarget(finalUrl) || visibleText.length < 120 || challenge) {
        logFetch('browser_fallback_rejected', { status: response?.status() ?? 0, textChars: visibleText.length, challenge, finalHost: (() => { try { return new URL(finalUrl).hostname; } catch { return 'invalid'; } })() });
        await context.close().catch(() => {});
        return null;
      }
      const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const body = '<html><head><title>' + esc(title) + '</title></head><body><main>' + esc(visibleText) + '</main></body></html>';
      await context.close().catch(() => {});
      return { ok: true, status: response.status(), body, finalUrl, fetchMode: 'browser_rendered' };
    } catch (error) {
      logFetch('browser_fallback_failed', { error: String((error as Error)?.message || error).slice(0, 180) });
      return null;
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }

  return async function fetchPage(url: string): Promise<{ ok: boolean; status: number; body: string; finalUrl?: string; fetchMode?: string }> {
    const startedAt = Date.now();
    const logFetch = (event: string, details: Record<string, unknown> = {}) => { try { console.info(JSON.stringify({ type: 'immofinder_fetch_trace', event, requestedHost: (() => { try { return new URL(url).hostname; } catch { return 'invalid'; } })(), elapsedMs: Date.now() - startedAt, ...details })); } catch { /* diagnostics only */ } };
    let currentUrl = url; let redirected = false;
    let initial: URL;
    try { initial = new URL(url); } catch { logFetch('rejected_invalid_url'); return { ok: false, status: 0, body: 'invalid URL', fetchMode: 'blocked_non_public' }; }
    if (!/^https?:$/.test(initial.protocol)) { logFetch('rejected_protocol', { protocol: initial.protocol }); return { ok: false, status: 0, body: 'unsupported protocol' }; }
    let direct: { ok: boolean; status: number; body: string; finalUrl?: string; location?: string; fetchMode?: string } = { ok: false, status: 0, body: 'not fetched' };
    for (let hop = 0; hop <= 5; hop++) {
      let target: URL;
      try { target = new URL(currentUrl); } catch { return { ok: false, status: 0, body: 'invalid redirect URL', finalUrl: currentUrl, fetchMode: 'blocked_non_public_redirect' }; }
      if (!/^https?:$/.test(target.protocol) || !await isPublicTarget(currentUrl)) {
        logFetch('blocked_non_public_target', { hop, protocol: target.protocol, host: target.hostname });
        return { ok: false, status: 0, body: 'blocked non-public target', finalUrl: currentUrl, fetchMode: redirected ? 'blocked_non_public_redirect' : 'blocked_non_public' };
      }
      const wait = (last.get(target.host) || 0) + cfg.fetch.perHostDelayMs - Date.now(); if (wait > 0) await sleep(wait);
      last.set(target.host, Date.now());
      try { direct = await get(currentUrl, cfg.limits.fetchTimeoutMs, 'manual'); }
      catch (e) { direct = { ok: false, status: 0, body: String((e as Error)?.message || e).slice(0, 240), finalUrl: currentUrl }; logFetch('direct_request_exception', { hop, host: target.host, errorName: (e as Error)?.name || typeof e, error: String((e as Error)?.message || e).slice(0, 240) }); break; }
      if (direct.status >= 300 && direct.status < 400 && direct.location) {
        logFetch('redirect', { hop, status: direct.status, fromHost: target.host, locationHost: (() => { try { return new URL(direct.location!, currentUrl).hostname; } catch { return 'invalid'; } })() });
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
    const challengeLike = /just a moment|attention required|cf-browser-verification|checking your browser|enable javascript and cookies|ddos protection by|security check|access denied|one more step|please wait|verify you are human|captcha/i.test((direct.body || '') + ' ' + ((direct as any).title || ''));
    logFetch('direct_result', { ok: direct.ok, status: direct.status, fetchMode: redirected ? 'direct_redirect' : 'direct', bodyChars: direct.body.length, textChars: directTextChars, finalHost: (() => { try { return new URL(direct.finalUrl || currentUrl).hostname; } catch { return 'invalid'; } })(), error: !direct.ok ? String(direct.body || '').slice(0, 240) : null });
    if (challengeLike) {
      logFetch('browser_fallback_skipped_challenge', { status: direct.status, directTextChars });
      logFetch('fetch_completed', { ok: direct.ok, status: direct.status, bodyChars: direct.body.length, textChars: directTextChars, fetchMode: 'direct_challenge_blocked' });
      return { ok: direct.ok, status: direct.status, body: direct.body, finalUrl: direct.finalUrl || currentUrl, fetchMode: 'direct_challenge_blocked' };
    }
    if (!direct.ok || directTextChars < 120) {
      if (direct.fetchMode?.startsWith('blocked_non_public') || direct.fetchMode === 'redirect_limit') return { ok: false, status: direct.status, body: direct.body, finalUrl: direct.finalUrl || currentUrl, fetchMode: direct.fetchMode };
      const fallback = options.allowJina === false ? null : await jinaFallback(url);
      if (fallback) {
        logFetch('jina_fallback_succeeded', { directStatus: direct.status, directTextChars, fallbackBodyChars: fallback.body.length, fallbackMode: fallback.fetchMode });
        try { console.info(JSON.stringify({ type: 'immofinder_fetch_fallback', host: initial.hostname, outcome: 'jina_reader_ok', directStatus: direct.status, directTextChars })); } catch { /* diagnostics only */ }
        return fallback;
      }
      logFetch('jina_fallback_failed', { directStatus: direct.status, directTextChars, directError: String(direct.body || '').slice(0, 240), fallbackConfigured: Boolean(process.env.JINA_READER_BASE_URL), fallbackKeyConfigured: Boolean(process.env.JINA_API_KEY) });
      const rendered = options.allowBrowser === false ? null : await browserFallback(url, logFetch);
      if (rendered) {
        const renderedChars = htmlToText(rendered.body).trim().length;
        logFetch('browser_fallback_succeeded', { directStatus: direct.status, directTextChars, renderedTextChars: renderedChars, fetchMode: rendered.fetchMode });
        try { console.info(JSON.stringify({ type: 'immofinder_fetch_fallback', host: initial.hostname, outcome: 'browser_rendered', directStatus: direct.status, directTextChars, renderedTextChars: renderedChars })); } catch { /* diagnostics only */ }
        return rendered;
      }
      try { console.info(JSON.stringify({ type: 'immofinder_fetch_fallback', host: initial.hostname, outcome: 'jina_reader_unavailable', directStatus: direct.status, directTextChars })); } catch { /* diagnostics only */ }
    }
    if (options.allowBrowser !== false && direct.ok && isShortPageBrowserCandidate(initial.hostname, directTextChars, cfg.fetch)) {
      logFetch('browser_short_page_render_attempt', { directStatus: direct.status, directTextChars, host: initial.hostname });
      const rendered = await browserFallback(url, logFetch);
      if (rendered) {
        const renderedChars = htmlToText(rendered.body).trim().length;
        const minChars = Math.max(120, Math.floor(cfg.fetch.browserRenderMinTextChars ?? 1200));
        if (renderedChars >= minChars && renderedChars > directTextChars * 1.5) {
          logFetch('browser_short_page_rendered', { directStatus: direct.status, directTextChars, renderedTextChars: renderedChars });
          try { console.info(JSON.stringify({ type: 'immofinder_fetch_fallback', host: initial.hostname, outcome: 'browser_short_page_rendered', directStatus: direct.status, directTextChars, renderedTextChars: renderedChars })); } catch { /* diagnostics only */ }
          return rendered;
        }
        logFetch('browser_short_page_not_improved', { directStatus: direct.status, directTextChars, renderedTextChars: renderedChars, minChars });
      }
    }
    logFetch('fetch_completed', { ok: direct.ok, status: direct.status, bodyChars: direct.body.length, textChars: directTextChars, fetchMode: redirected ? 'direct_redirect' : 'direct' });
    return { ok: direct.ok, status: direct.status, body: direct.body, finalUrl: direct.finalUrl || currentUrl, fetchMode: redirected ? 'direct_redirect' : 'direct' };
  };
}
