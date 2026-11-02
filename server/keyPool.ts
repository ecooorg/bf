/**
 * C123 — Organisational API key pool per vendor.
 * Up to MAX_ORG_KEY_SLOTS (10) legitimate keys; any count 1..10 is valid (solo = 1).
 * Tests and runtime must never require a fixed full set of 10.
 */
export const MAX_ORG_KEY_SLOTS = 10;
/** Default cool-down after quota / rate-limit on a slot (5 minutes). */
export const DEFAULT_SLOT_COOLDOWN_MS = 300_000;

export interface KeySlot {
  /** 0 = primary env (e.g. GEMINI_API_KEY); 1..10 = PREFIX_n */
  slot: number;
  envName: string;
  /** Secret material — never log this field. */
  key: string;
}

export interface KeyPoolSnapshot {
  provider: string;
  totalSlots: number;
  availableSlots: number;
  cooledSlots: number[];
}

/**
 * Resolve keys from env for a provider prefix.
 * Accepts PRIMARY (slot 0) and PREFIX_1 … PREFIX_10; skips empty; dedupes identical secrets.
 * Any number of present keys from 1 to 10 is valid.
 */
export function resolveKeySlots(
  env: NodeJS.ProcessEnv,
  options: { primaryEnv: string; numberedPrefix: string; maxSlots?: number } = {
    primaryEnv: 'GEMINI_API_KEY',
    numberedPrefix: 'GEMINI_API_KEY',
  }
): KeySlot[] {
  const max = Math.min(options.maxSlots ?? MAX_ORG_KEY_SLOTS, MAX_ORG_KEY_SLOTS);
  const found: KeySlot[] = [];
  const seenKeys = new Set<string>();

  const push = (slot: number, envName: string, raw: string | undefined) => {
    const key = String(raw || '').trim();
    if (!key) return;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    found.push({ slot, envName, key });
  };

  push(0, options.primaryEnv, env[options.primaryEnv]);
  for (let i = 1; i <= max; i++) {
    const name = `${options.numberedPrefix}_${i}`;
    push(i, name, env[name]);
  }
  return found;
}

/** @deprecated alias — Gemini-specific resolver */
export function resolveGeminiKeySlots(env: NodeJS.ProcessEnv = process.env): KeySlot[] {
  return resolveKeySlots(env, { primaryEnv: 'GEMINI_API_KEY', numberedPrefix: 'GEMINI_API_KEY' });
}

export class KeyPoolState {
  private cooldownUntil = new Map<number, number>();

  private readonly cooldownMs: number;

  constructor(cooldownMs: number = DEFAULT_SLOT_COOLDOWN_MS) {
    this.cooldownMs = cooldownMs;
  }

  isAvailable(slot: number, now: number = Date.now()): boolean {
    const until = this.cooldownUntil.get(slot);
    return until === undefined || until <= now;
  }

  available(slots: KeySlot[], now: number = Date.now()): KeySlot[] {
    return slots.filter((s) => this.isAvailable(s.slot, now));
  }

  markCooldown(slot: number, now: number = Date.now(), ms?: number): void {
    this.cooldownUntil.set(slot, now + (ms ?? this.cooldownMs));
  }

  clearCooldown(slot: number): void {
    this.cooldownUntil.delete(slot);
  }

  reset(): void {
    this.cooldownUntil.clear();
  }

  snapshot(slots: KeySlot[], now: number = Date.now()): KeyPoolSnapshot {
    const cooled = slots.filter((s) => !this.isAvailable(s.slot, now)).map((s) => s.slot);
    return {
      provider: 'gemini',
      totalSlots: slots.length,
      availableSlots: slots.length - cooled.length,
      cooledSlots: cooled,
    };
  }
}

export function shouldRotateKeySlot(errorClass: string | undefined): boolean {
  return errorClass === 'PROVIDER_QUOTA' || errorClass === 'PROVIDER_TRANSIENT' || errorClass === 'PROVIDER_AUTH';
}

/** P124.20: classify a Gemini SDK error for key rotation. Timeouts/aborts and other errors are not rotated. */
export function classifyKeyError(e: any): 'PROVIDER_QUOTA' | 'PROVIDER_TRANSIENT' | 'PROVIDER_AUTH' | 'OTHER' {
  const status = Number(e?.status ?? e?.code ?? e?.error?.code);
  const msg = String(e?.message || e || '');
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msg)) return 'PROVIDER_QUOTA';
  if (status === 401 || status === 403 || /API[_ ]key (not valid|invalid)|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) return 'PROVIDER_AUTH';
  if ([500, 502, 503, 504].includes(status) || /UNAVAILABLE|overloaded/i.test(msg)) return 'PROVIDER_TRANSIENT';
  return 'OTHER';
}
