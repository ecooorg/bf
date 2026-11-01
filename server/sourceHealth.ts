/**
 * C123 P123.4 — Per-catalog-source health: cooldown + consecutive-failure breaker.
 * In-memory for process lifetime; optional DB persistence can layer later.
 */
export const DEFAULT_SOURCE_COOLDOWN_MS = 300_000;
export const DEFAULT_BREAKER_FAILURES = 5;
export const DEFAULT_BREAKER_WINDOW_MS = 600_000;

export interface SourceHealthConfig {
  cooldownMs?: number;
  breakerFailures?: number;
  breakerWindowMs?: number;
}

export interface SourceHealthSnapshot {
  sourceId: string;
  available: boolean;
  cooldownUntil: number | null;
  breakerOpen: boolean;
  recentFailures: number;
  lastErrorClass: string | null;
}

interface SourceState {
  cooldownUntil: number | null;
  failureTimestamps: number[];
  lastErrorClass: string | null;
}

export class SourceHealthRegistry {
  private states = new Map<string, SourceState>();

  constructor(private readonly cfg: SourceHealthConfig = {}) {}

  private conf() {
    return {
      cooldownMs: this.cfg.cooldownMs ?? DEFAULT_SOURCE_COOLDOWN_MS,
      breakerFailures: this.cfg.breakerFailures ?? DEFAULT_BREAKER_FAILURES,
      breakerWindowMs: this.cfg.breakerWindowMs ?? DEFAULT_BREAKER_WINDOW_MS,
    };
  }

  private get(sourceId: string): SourceState {
    let s = this.states.get(sourceId);
    if (!s) {
      s = { cooldownUntil: null, failureTimestamps: [], lastErrorClass: null };
      this.states.set(sourceId, s);
    }
    return s;
  }

  isAvailable(sourceId: string, now: number = Date.now()): boolean {
    const s = this.get(sourceId);
    if (s.cooldownUntil !== null && s.cooldownUntil > now) return false;
    const { breakerFailures, breakerWindowMs } = this.conf();
    const recent = s.failureTimestamps.filter((t) => now - t <= breakerWindowMs);
    s.failureTimestamps = recent;
    if (recent.length >= breakerFailures) return false;
    return true;
  }

  recordSuccess(sourceId: string): void {
    const s = this.get(sourceId);
    s.cooldownUntil = null;
    s.failureTimestamps = [];
    s.lastErrorClass = null;
  }

  recordFailure(
    sourceId: string,
    errorClass?: string,
    now: number = Date.now(),
    opts?: { cooldownMs?: number }
  ): void {
    const s = this.get(sourceId);
    s.lastErrorClass = errorClass ?? null;
    s.failureTimestamps.push(now);
    const { cooldownMs, breakerWindowMs } = this.conf();
    s.failureTimestamps = s.failureTimestamps.filter((t) => now - t <= breakerWindowMs);
    s.cooldownUntil = now + (opts?.cooldownMs ?? cooldownMs);
  }

  snapshot(sourceId: string, now: number = Date.now()): SourceHealthSnapshot {
    const s = this.get(sourceId);
    const { breakerFailures, breakerWindowMs } = this.conf();
    const recent = s.failureTimestamps.filter((t) => now - t <= breakerWindowMs);
    const breakerOpen = recent.length >= breakerFailures;
    const inCooldown = s.cooldownUntil !== null && s.cooldownUntil > now;
    return {
      sourceId,
      available: !inCooldown && !breakerOpen,
      cooldownUntil: inCooldown ? s.cooldownUntil : null,
      breakerOpen,
      recentFailures: recent.length,
      lastErrorClass: s.lastErrorClass,
    };
  }

  reset(sourceId?: string): void {
    if (sourceId) this.states.delete(sourceId);
    else this.states.clear();
  }
}

/** Process-wide registry used by the carousel when no custom instance is passed. */
export const globalSourceHealth = new SourceHealthRegistry();
