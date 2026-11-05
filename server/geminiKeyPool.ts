/**
 * P124.27 — one Gemini key pool for every Gemini call (generate(), search plan, grounding).
 *
 * - Cooldown is tracked per (key slot, model) for quota/transient errors and per slot for auth errors.
 * - When several different keys hit quota on the same model within a short window the model is parked for all
 *   slots instead of burning every key. Owner fact (2026-11-03): the keys are ten separate Google projects of ten
 *   different scientists of one organization, so a shared quota is NOT assumed; the cause of simultaneous 429
 *   (K-1) is open (`NOT_VERIFIED`) and this rule only detects the symptom.
 * - A model is reported exhausted only after the available keys were tried, not after the first 429 (K-2).
 * - No secret material is ever returned by snapshot(); slots are identified by number only.
 */
import { classifyKeyError, shouldRotateKeySlot, type KeySlot } from './keyPool.ts';

export type PoolErrorClass = ReturnType<typeof classifyKeyError>;

export const QUOTA_COOLDOWN_MS = 60_000;
export const TRANSIENT_COOLDOWN_MS = 30_000;
export const AUTH_COOLDOWN_MS = 60 * 60_000;
/** Distinct keys hitting quota on one model inside this window ⇒ shared quota suspected. */
export const SHARED_QUOTA_WINDOW_MS = 60_000;
export const SHARED_QUOTA_MIN_SLOTS = 3;
export const MODEL_PARK_MS = 30_000;

export class GeminiKeyPool {
  private slotModelUntil = new Map<string, number>();
  private slotUntil = new Map<number, number>();
  private modelParkedUntil = new Map<string, number>();
  private quotaHits = new Map<string, Map<number, number>>();
  private cursor = 0;

  constructor(private slots: KeySlot[]) {}

  setSlots(slots: KeySlot[]): void { this.slots = slots; }
  get size(): number { return this.slots.length; }

  private k(slot: number, model: string): string { return `${slot}|${model}`; }

  isModelParked(model: string, now = Date.now()): boolean {
    return (this.modelParkedUntil.get(model) ?? 0) > now;
  }

  /** Slots usable for `model` right now, rotated so successive calls start at different keys. */
  slotsFor(model: string, now = Date.now()): KeySlot[] {
    if (this.isModelParked(model, now) || !this.slots.length) return [];
    const ok = this.slots.filter((s) =>
      (this.slotUntil.get(s.slot) ?? 0) <= now && (this.slotModelUntil.get(this.k(s.slot, model)) ?? 0) <= now);
    if (!ok.length) return [];
    const start = this.cursor++ % ok.length;
    return [...ok.slice(start), ...ok.slice(0, start)];
  }

  noteSuccess(slot: number, model: string): void {
    this.slotModelUntil.delete(this.k(slot, model));
  }

  /** Returns true when this failure made the pool park the whole model (shared quota). */
  noteFailure(slot: number, model: string, cls: PoolErrorClass, now = Date.now()): boolean {
    if (cls === 'PROVIDER_AUTH') { this.slotUntil.set(slot, now + AUTH_COOLDOWN_MS); return false; }
    if (cls === 'PROVIDER_TRANSIENT') { this.slotModelUntil.set(this.k(slot, model), now + TRANSIENT_COOLDOWN_MS); return false; }
    if (cls !== 'PROVIDER_QUOTA') return false;
    this.slotModelUntil.set(this.k(slot, model), now + QUOTA_COOLDOWN_MS);
    const hits = this.quotaHits.get(model) ?? new Map<number, number>();
    hits.set(slot, now);
    for (const [s, at] of hits) if (now - at > SHARED_QUOTA_WINDOW_MS) hits.delete(s);
    this.quotaHits.set(model, hits);
    if (hits.size >= Math.min(SHARED_QUOTA_MIN_SLOTS, Math.max(2, this.slots.length))) {
      this.modelParkedUntil.set(model, now + MODEL_PARK_MS);
      return true;
    }
    return false;
  }

  /** Non-secret state for diagnostics. */
  snapshot(now = Date.now()): { totalSlots: number; authCooled: number[]; parkedModels: string[]; cooledPairs: number } {
    return {
      totalSlots: this.slots.length,
      authCooled: [...this.slotUntil].filter(([, u]) => u > now).map(([s]) => s),
      parkedModels: [...this.modelParkedUntil].filter(([, u]) => u > now).map(([m]) => m),
      cooledPairs: [...this.slotModelUntil.values()].filter((u) => u > now).length,
    };
  }
}

export class PoolExhaustedError extends Error {
  constructor(public kind: 'quota' | 'unavailable' | 'auth' | 'no_keys', public attempted: number, public last?: unknown) {
    super(`gemini_pool_exhausted:${kind}`);
  }
}

export type PoolCallLog = { slot: number; model: string; errorClass: PoolErrorClass; attempt: number; sharedQuotaSuspected?: boolean };

/**
 * Try `call(key, model)` over the pool's keys for one model. Rotates only on quota/auth/5xx errors
 * (shouldRotateKeySlot); any other error is rethrown unchanged. Throws PoolExhaustedError when the keys are used up.
 */
export async function callWithKeyPool<T>(opts: {
  pool: GeminiKeyPool;
  model: string;
  call: (key: string, slot: number) => Promise<T>;
  maxKeyAttempts?: number;
  onRotate?: (e: PoolCallLog) => void;
  now?: () => number;
}): Promise<{ value: T; slot: number; keyAttempts: number }> {
  const now = opts.now ?? Date.now;
  const slots = opts.pool.slotsFor(opts.model, now());
  if (!slots.length) throw new PoolExhaustedError(opts.pool.size ? (opts.pool.isModelParked(opts.model, now()) ? 'quota' : 'unavailable') : 'no_keys', 0);
  const max = Math.max(1, Math.min(opts.maxKeyAttempts ?? 4, slots.length));
  let last: unknown;
  let lastCls: PoolErrorClass = 'OTHER';
  let tried = 0;
  for (let i = 0; i < max; i++) {
    const { slot, key } = slots[i];
    tried++;
    try {
      const value = await opts.call(key, slot);
      opts.pool.noteSuccess(slot, opts.model);
      return { value, slot, keyAttempts: tried };
    } catch (e) {
      const cls = classifyKeyError(e);
      if (!shouldRotateKeySlot(cls)) throw e;
      last = e; lastCls = cls;
      const shared = opts.pool.noteFailure(slot, opts.model, cls, now());
      opts.onRotate?.({ slot, model: opts.model, errorClass: cls, attempt: tried, ...(shared ? { sharedQuotaSuspected: true } : {}) });
      if (shared) break;
    }
  }
  throw Object.assign(
    new PoolExhaustedError(lastCls === 'PROVIDER_QUOTA' ? 'quota' : lastCls === 'PROVIDER_AUTH' ? 'auth' : 'unavailable', tried, last),
    { status: (last as any)?.status, code: (last as any)?.code },
  );
}

export interface PooledClientLike { models: { generateContent(args: any): Promise<any> } }

/**
 * A SearchClientLike-compatible client for helper calls (search plan, grounding): rotates keys through the pool and,
 * once every key is exhausted for the requested model, tries each fallback model (K-3). A BYOK key bypasses the pool.
 */
export function createPooledClient(opts: {
  pool: GeminiKeyPool;
  makeClient: (key: string) => PooledClientLike;
  byokKey?: string;
  fallbackModels?: string[];
  onRotate?: (e: PoolCallLog) => void;
}): PooledClientLike {
  return {
    models: {
      async generateContent(args: any) {
        if (opts.byokKey) return opts.makeClient(opts.byokKey).models.generateContent(args);
        const models = [args.model, ...(opts.fallbackModels || [])].filter((m, i, a) => m && a.indexOf(m) === i);
        let last: unknown;
        for (const model of models) {
          try {
            const { value } = await callWithKeyPool({ pool: opts.pool, model, onRotate: opts.onRotate, call: (key) => opts.makeClient(key).models.generateContent({ ...args, model }) });
            return value;
          } catch (e) {
            if (!(e instanceof PoolExhaustedError)) throw e;
            last = e;
          }
        }
        throw last ?? new PoolExhaustedError('no_keys', 0);
      },
    },
  };
}
