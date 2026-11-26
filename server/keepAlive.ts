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
    // Render free tier sleeps after ~15 min idle. Without keep-alive, the first
    // user request pays a cold-start tax (often >60s) and schedule ticks cannot run.
    console.error('[KeepAlive] DISABLED via KEEP_ALIVE=false — free-tier instance will sleep; set KEEP_ALIVE=true (or unset) and ensure RENDER_EXTERNAL_URL is set');
    return () => undefined;
  }
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    console.warn('[KeepAlive] skipped: no RENDER_EXTERNAL_URL / KEEP_ALIVE_URL');
    return () => undefined;
  }

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let visits = 0;
  let consecutiveFails = 0;
  let inFlight = false;

  const identity = (): Identity => ({ ua: pick(USER_AGENTS), lang: pick(LANGUAGES) });

  const schedule = (ms: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void visit(); }, ms);
    timer.unref?.();
  };

  const visit = async () => {
    if (stopped) return;
    if (inFlight) {
      console.warn('[KeepAlive] skip overlapping visit');
      schedule(nextGapMs());
      return;
    }
    inFlight = true;
    const started = Date.now();
    const id = identity();
    const controller = new AbortController();
    const kill = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const health = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': id.ua,
          'Accept-Language': id.lang,
          'Cache-Control': 'no-cache',
        },
      });
      if (!health.ok) {
        console.warn(`[KeepAlive] health HTTP ${health.status}`);
        throw new Error(`health ${health.status}`);
      }
      // Drain body so the connection can close promptly on some runtimes.
      await health.text().catch(() => undefined);
      visits += 1;
      const ms = Date.now() - started;
      if (ms > VISIT_BUDGET_MS) {
        console.warn(`[KeepAlive] slow health ${ms}ms (budget ${VISIT_BUDGET_MS}ms)`);
      }
      console.log(`[KeepAlive] ok #${visits} health=${health.status} in ${ms}ms; cadence 11–13 min`);
      if (consecutiveFails > 0) console.log(`[KeepAlive] recovered after ${consecutiveFails} failures`);
      consecutiveFails = 0;
      schedule(nextGapMs());
    } catch (error) {
      consecutiveFails += 1;
      const msg = String((error as Error)?.message || error);
      console.warn(`[KeepAlive] visit error: ${msg.slice(0, 120)}`);
      const reason = consecutiveFails >= 3 ? 'repeated' : 'transient';
      const retry = rnd(RETRY_MIN_MS, RETRY_MAX_MS);
      console.warn(`[KeepAlive] failed (#${consecutiveFails}, ${reason}), retry in ${Math.round(retry / 1000)}s`);
      schedule(retry);
    } finally {
      clearTimeout(kill);
      inFlight = false;
    }
  };

  console.log(`[KeepAlive] started, target: ${baseUrl}, cadence 11–13 min (hard schedule, timed visits)`);
  schedule(rnd(FIRST_PING_MIN_MS, FIRST_PING_MAX_MS));

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
  };
}
