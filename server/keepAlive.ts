/**
 * Keep-alive for Render free tier (sleeps after ~15 min without inbound HTTP).
 *
 * Strategy:
 *  - schedule the *next* ping on a hard timer (11–13 min), never blocked by a hung visit;
 *  - each visit has a short AbortSignal timeout so /api/health cannot stall the loop;
 *  - first ping 20–60s after boot;
 *  - on failure, retry in 30–60s without postponing the regular cadence forever;
 *  - log every success/failure so Render logs prove the pinger is alive.
 *
 * Self-fetch only helps while the process is running. External cron is still the only
 * way to wake an already-sleeping free instance.
 */

const MIN_GAP_MS = 11 * 60_000;
const MAX_GAP_MS = 13 * 60_000; // stay clearly under Render’s ~15 min idle window
const RETRY_MIN_MS = 30_000;
const RETRY_MAX_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;
const VISIT_BUDGET_MS = 25_000;
const FIRST_PING_MIN_MS = 20_000;
const FIRST_PING_MAX_MS = 60_000;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
];
const LANGUAGES = ['en-US,en;q=0.9', 'de-CH,de;q=0.9,en;q=0.8', 'fr-CH,fr;q=0.9,en;q=0.8'];

type Identity = { ua: string; lang: string };

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function nextGapMs(): number {
  return rnd(MIN_GAP_MS, MAX_GAP_MS);
}

function resolveBaseUrl(): string {
  const fromEnv = (process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL || '').replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const name = (process.env.RENDER_SERVICE_NAME || '').trim();
  if (name) return `https://${name}.onrender.com`;
  return '';
}

export function startKeepAlive(): () => void {
  if (process.env.KEEP_ALIVE === 'false' || process.env.KEEP_ALIVE === '0') {
    console.log('[KeepAlive] disabled via KEEP_ALIVE=false');
    return () => undefined;
  }
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    console.warn('[KeepAlive] skipped: no RENDER_EXTERNAL_URL / KEEP_ALIVE_URL');
    return () => undefined;
  }

  let visits = 0;
  let consecutiveFails = 0;
  let inFlight = false;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  async function request(path: string, kind: 'api' | 'html', referer?: string, parent?: AbortSignal): Promise<{ status: number }> {
    const id: Identity = { ua: pick(USER_AGENTS), lang: pick(LANGUAGES) };
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
    const onParent = () => ac.abort();
    parent?.addEventListener('abort', onParent, { once: true });
    try {
      const headers: Record<string, string> = {
        'User-Agent': id.ua,
        'Accept-Language': id.lang,
        Accept: kind === 'api' ? 'application/json, text/plain, */*' : 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache',
      };
      if (referer) headers.Referer = referer;
      const res = await fetch(`${baseUrl}${path}`, { method: 'GET', headers, signal: ac.signal, redirect: 'follow' });
      // Drain body so the connection is released promptly
      await res.arrayBuffer().catch(() => undefined);
      return { status: res.status };
    } finally {
      clearTimeout(t);
      parent?.removeEventListener('abort', onParent);
    }
  }

  async function visit(): Promise<boolean> {
    if (inFlight) {
      console.warn('[KeepAlive] skip overlapping visit');
      return false;
    }
    inFlight = true;
    const budget = new AbortController();
    const budgetTimer = setTimeout(() => budget.abort(), VISIT_BUDGET_MS);
    const home = `${baseUrl}/`;
    const started = Date.now();
    try {
      const health = await request('/api/health', 'api', home, budget.signal);
      if (health.status >= 500) {
        console.warn(`[KeepAlive] health HTTP ${health.status}`);
        return false;
      }
      if (Math.random() < 0.5) {
        await sleep(rnd(40, 200));
        await request('/', 'html', undefined, budget.signal).catch(() => undefined);
      }
      visits += 1;
      const ms = Date.now() - started;
      console.log(`[KeepAlive] ok #${visits} health=${health.status} in ${ms}ms; cadence 11–13 min`);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[KeepAlive] visit error: ${msg.slice(0, 120)}`);
      return false;
    } finally {
      clearTimeout(budgetTimer);
      inFlight = false;
    }
  }

  function schedule(ms: number, reason: string) {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void (async () => {
        const ok = await visit();
        if (stopped) return;
        if (ok) {
          if (consecutiveFails > 0) console.log(`[KeepAlive] recovered after ${consecutiveFails} failures`);
          consecutiveFails = 0;
          schedule(nextGapMs(), 'ok');
        } else {
          consecutiveFails += 1;
          // Retry soon, but never stretch beyond the idle window: also keep a max gap from *now*.
          const retry = rnd(RETRY_MIN_MS, RETRY_MAX_MS);
          console.warn(`[KeepAlive] failed (#${consecutiveFails}, ${reason}), retry in ${Math.round(retry / 1000)}s`);
          schedule(retry, 'retry');
        }
      })();
    }, ms);
    // Do not let the timer alone keep a draining process alive forever after SIGTERM — but while
    // serving, we need the timer. unref only in test if ever needed; production must ref.
  }

  console.log(`[KeepAlive] started, target: ${baseUrl}, cadence 11–13 min (hard schedule, timed visits)`);
  schedule(rnd(FIRST_PING_MIN_MS, FIRST_PING_MAX_MS), 'boot');

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
  };
}
