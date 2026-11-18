/**
 * Keep-alive for Render free tier (sleeps after ~15 min without inbound HTTP).
 *
 * Strategy:
 *  - ping the public URL every 12–14 min (strictly under the 15 min idle window);
 *  - first ping soon after boot (30–90s), not after several quiet minutes;
 *  - always hit a cheap /api/health (and often /) so traffic is clearly inbound via the edge;
 *  - log every success/failure so Render logs prove the pinger is alive;
 *  - on failure, retry in 45–75s so a single miss cannot open a 15+ min gap.
 *
 * Self-fetch only prevents sleep while the process is running. External cron is still
 * the only way to wake an already-sleeping free instance.
 */

const MIN_GAP_MS = 12 * 60_000;
const MAX_GAP_MS = 14 * 60_000; // must stay < 15 min
const RETRY_MIN_MS = 45_000;
const RETRY_MAX_MS = 75_000;
const REQUEST_TIMEOUT_MS = 40_000;
const FIRST_PING_MIN_MS = 30_000;
const FIRST_PING_MAX_MS = 90_000;

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

/** Uniform 12–14 min (not averaged to the edges of a wider band). */
function nextGapMs(): number {
  return rnd(MIN_GAP_MS, MAX_GAP_MS);
}

function resolveBaseUrl(): string {
  const fromEnv = (process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL || '').replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  // Last resort so production still pings if Render forgot to inject RENDER_EXTERNAL_URL
  if (process.env.NODE_ENV === 'production') return 'https://biforge.onrender.com';
  return '';
}

export function startKeepAlive(): () => void {
  if (process.env.KEEP_ALIVE === 'false') {
    console.log('[KeepAlive] disabled via KEEP_ALIVE=false');
    return () => undefined;
  }
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    console.warn('[KeepAlive] skipped: no RENDER_EXTERNAL_URL / KEEP_ALIVE_URL');
    return () => undefined;
  }

  const ac = new AbortController();
  let identity: Identity = { ua: pick(USER_AGENTS), lang: pick(LANGUAGES) };
  let consecutiveFails = 0;
  let visits = 0;

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      if (ac.signal.aborted) return resolve();
      const t = setTimeout(resolve, ms);
      ac.signal.addEventListener('abort', () => {
        clearTimeout(t);
        resolve();
      }, { once: true });
    });

  async function request(path: string, kind: 'html' | 'api' | 'asset', referer?: string): Promise<{ status: number; body: string }> {
    const accept =
      kind === 'html'
        ? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        : kind === 'api'
          ? 'application/json, text/plain, */*'
          : '*/*';
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        'User-Agent': identity.ua,
        Accept: accept,
        'Accept-Language': identity.lang,
        'Cache-Control': 'no-cache',
        ...(referer ? { Referer: referer } : {}),
      },
      signal: AbortSignal.any([ac.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    });
    if (kind === 'asset') {
      await res.arrayBuffer().catch(() => undefined);
      return { status: res.status, body: '' };
    }
    const body = await res.text().catch(() => '');
    return { status: res.status, body };
  }

  /** One activation: health is always hit (cheap inbound). Optional home + session. */
  async function visit(): Promise<boolean> {
    if (Math.random() < 0.15) identity = { ua: pick(USER_AGENTS), lang: pick(LANGUAGES) };
    const home = `${baseUrl}/`;
    const started = Date.now();
    try {
      // Primary: health — must succeed for the visit to count as ok
      const health = await request('/api/health', 'api', home);
      if (health.status >= 500) {
        console.warn(`[KeepAlive] health HTTP ${health.status}`);
        return false;
      }

      // Secondary noise so the edge sees more than one path (still cheap)
      if (Math.random() < 0.55) {
        await sleep(rnd(80, 400));
        await request('/', 'html', undefined).catch(() => undefined);
      }
      if (Math.random() < 0.45) {
        await sleep(rnd(80, 400));
        await request('/api/session', 'api', home).catch(() => undefined);
      }

      visits += 1;
      const ms = Date.now() - started;
      console.log(
        `[KeepAlive] ok #${visits} health=${health.status} in ${ms}ms; next in 12–14 min`,
      );
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[KeepAlive] visit error: ${msg.slice(0, 120)}`);
      return false;
    }
  }

  async function loop() {
    console.log(`[KeepAlive] started, target: ${baseUrl}, interval 12–14 min`);
    await sleep(rnd(FIRST_PING_MIN_MS, FIRST_PING_MAX_MS));
    while (!ac.signal.aborted) {
      const ok = await visit();
      if (ok) {
        if (consecutiveFails > 0) {
          console.log(`[KeepAlive] recovered after ${consecutiveFails} failures`);
        }
        consecutiveFails = 0;
        await sleep(nextGapMs());
      } else {
        consecutiveFails += 1;
        console.warn(`[KeepAlive] failed visit (#${consecutiveFails}), retry in ~1 min`);
        await sleep(rnd(RETRY_MIN_MS, RETRY_MAX_MS));
      }
    }
  }

  void loop();
  return () => ac.abort();
}
