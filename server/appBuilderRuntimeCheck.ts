/**
 * P127.32: sandboxed "open the page once" check for Project Mode builds (EXP-PROJECT-7).
 * Implements the engine's RuntimePort with a headless Chromium (Playwright, loaded lazily). Off unless
 * PROJECT_RUNTIME_CHECK=true; any problem with the browser itself is reported as "not run", never as a page defect.
 * The generated page is served from memory on a reserved origin that never resolves; only two script CDNs may be reached.
 */
import type { RuntimeIssue, RuntimePort, RuntimeResult } from '../appBuilder/index.ts';

export const RUNTIME_ORIGIN = 'https://app.invalid';
export const RUNTIME_ALLOWED_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com'] as const;
const TOTAL_LIMIT_MS = 25_000;
const SETTLE_MS = 1_500;
const MAX_ISSUES = 6;

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8', svg: 'image/svg+xml', txt: 'text/plain; charset=utf-8', md: 'text/plain; charset=utf-8',
};

/** What a request from the page may do: serve a project file, reach an allowed script CDN, or nothing. */
export function requestPolicy(url: string, files: Map<string, string>): { action: 'serve'; body: string; contentType: string } | { action: 'allow' } | { action: 'block' } {
  let u: URL;
  try { u = new URL(url); } catch { return { action: 'block' }; }
  if (u.protocol === 'data:' || u.protocol === 'blob:') return { action: 'allow' };
  if (u.origin === RUNTIME_ORIGIN) {
    const rel = decodeURIComponent(u.pathname.replace(/^\/+/, '')) || 'index.html';
    const body = files.get(rel);
    if (body === undefined) return { action: 'block' };
    return { action: 'serve', body, contentType: CONTENT_TYPES[rel.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream' };
  }
  if (u.protocol === 'https:' && (RUNTIME_ALLOWED_HOSTS as readonly string[]).includes(u.hostname)) return { action: 'allow' };
  return { action: 'block' };
}

/** Browser/network noise that says nothing about the generated code. */
const NOISE = /failed to load resource|favicon|ResizeObserver loop|webgl|gpu process|swiftshader|context lost/i;

/** Turn raw error text (message + stack) into issues attached to the project files named in the first stack frames. */
export function runtimeIssuesFromErrors(texts: string[], files: Set<string>): RuntimeIssue[] {
  const issues: RuntimeIssue[] = [];
  const seen = new Set<string>();
  const frameRe = new RegExp(`${RUNTIME_ORIGIN.replace(/[.]/g, '\\.')}/([^\\s:)]+):(\\d+)(?::\\d+)?`, 'g');
  for (const text of texts) {
    const first = text.split('\n')[0].replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!first || NOISE.test(first)) continue;
    const frames: Array<{ path: string; line: number }> = [];
    for (const m of text.matchAll(frameRe)) {
      const path = decodeURIComponent(m[1]);
      if (files.has(path) && !frames.some((f) => f.path === path)) frames.push({ path, line: Number(m[2]) });
      if (frames.length >= 3) break;
    }
    const where = frames.length ? ` (at ${frames.map((f) => `${f.path}:${f.line}`).join(' <- ')})` : '';
    const message = `runtime: ${first}${where}`;
    for (const f of frames.length ? frames : [{ path: undefined as string | undefined, line: 0 }]) {
      const key = `${f.path ?? ''}|${message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({ ...(f.path ? { path: f.path } : {}), message });
    }
    if (issues.length >= MAX_ISSUES) break;
  }
  return issues.slice(0, MAX_ISSUES);
}

export interface RuntimeCheckOptions {
  /** Tests only: answer a request before the policy is consulted (for example a stand-in for a CDN script). */
  intercept?: (url: string) => { contentType: string; body: string } | null;
  noSandbox?: boolean;
}

let queue: Promise<unknown> = Promise.resolve();

export function createRuntimePort(options: RuntimeCheckOptions = {}): RuntimePort {
  return {
    check(files, o) {
      const run = queue.then(() => openOnce(files, options, o?.signal), () => openOnce(files, options, o?.signal));
      queue = run.catch(() => undefined);
      return run;
    },
  };
}

/** The port, or undefined when the feature is not enabled for this deployment. */
export function runtimePortFromEnv(env: NodeJS.ProcessEnv = process.env): RuntimePort | undefined {
  if (env.PROJECT_RUNTIME_CHECK !== 'true') return undefined;
  return createRuntimePort({ noSandbox: env.RUNTIME_CHECK_NO_SANDBOX === 'true' });
}

async function openOnce(files: Map<string, string>, options: RuntimeCheckOptions, signal?: AbortSignal): Promise<RuntimeResult> {
  if (!files.has('index.html')) return { ran: false, issues: [], reason: 'no_index_html' };
  let browser: { close(): Promise<void> } | null = null;
  const timer: { id?: NodeJS.Timeout } = {};
  try {
    const pwName = 'playwright';
    const pw: any = await import(pwName).catch(() => null);
    if (!pw?.chromium) return { ran: false, issues: [], reason: 'playwright_unavailable' };
    const launched = await pw.chromium.launch({ args: options.noSandbox ? ['--no-sandbox'] : [] }).catch((e: Error) => { throw Object.assign(new Error(`browser_unavailable: ${String(e.message).split('\n')[0].slice(0, 160)}`), { launch: true }); });
    browser = launched;
    const work = (async (): Promise<RuntimeResult> => {
      const ctx = await launched.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: 'block', acceptDownloads: false, permissions: [], javaScriptEnabled: true });
      const page = await ctx.newPage();
      const texts: string[] = [];
      page.on('pageerror', (e: Error) => texts.push(`${e.message}\n${e.stack ?? ''}`));
      page.on('console', (m: { type(): string; text(): string }) => { if (m.type() === 'error') texts.push(m.text()); });
      page.on('popup', (p: { close(): Promise<void> }) => { void p.close().catch(() => undefined); });
      await page.route('**/*', async (route: any) => {
        const url: string = route.request().url();
        const hit = options.intercept?.(url);
        if (hit) return route.fulfill({ status: 200, contentType: hit.contentType, body: hit.body });
        const d = requestPolicy(url, files);
        if (d.action === 'serve') return route.fulfill({ status: 200, contentType: d.contentType, body: d.body });
        if (d.action === 'allow') return route.continue();
        return route.abort('blockedbyclient');
      });
      await page.goto(`${RUNTIME_ORIGIN}/index.html`, { waitUntil: 'load', timeout: 12_000 });
      await page.waitForTimeout(SETTLE_MS);
      // the same few generic actions a person tries first: tap the middle, press a key or two
      await page.mouse.click(512, 384).catch(() => undefined);
      for (const k of ['Space', 'ArrowRight']) { await page.keyboard.press(k).catch(() => undefined); await page.waitForTimeout(60); }
      await page.waitForTimeout(500);
      return { ran: true, issues: runtimeIssuesFromErrors(texts, new Set(files.keys())) };
    })();
    const limit = new Promise<RuntimeResult>((resolve) => { timer.id = setTimeout(() => resolve({ ran: false, issues: [], reason: 'timeout' }), TOTAL_LIMIT_MS); });
    const aborted = new Promise<RuntimeResult>((resolve) => { signal?.addEventListener('abort', () => resolve({ ran: false, issues: [], reason: 'aborted' }), { once: true }); });
    return await Promise.race([work, limit, aborted]);
  } catch (e) {
    return { ran: false, issues: [], reason: String((e as Error)?.message ?? e).slice(0, 200) };
  } finally {
    if (timer.id) clearTimeout(timer.id);
    await browser?.close().catch(() => undefined);
  }
}
