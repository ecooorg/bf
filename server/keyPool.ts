/**
 * C123 P123.2 — Organisational API key pool (up to 13 legitimate participant keys).
 * Secrets stay in env; runtime only tracks slot indices and cooldowns.
 */
export const MAX_ORG_KEY_SLOTS = 13;
/** Default cool-down after quota / rate-limit on a slot (5 minutes). */
export const DEFAULT_SLOT_COOLDOWN_MS = 300_000;

export interface KeySlot {
  /** 0 = GEMINI_API_KEY; 1..13 = GEMINI_API_KEY_n */
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

/** Resolve Gemini keys from env. Solo deploy keeps a single GEMINI_API_KEY (slot 0). */
export function resolveGeminiKeySlots(env: NodeJS.ProcessEnv = process.env): KeySlot[] {
  const found: KeySlot[] = [];
  const seenKeys = new Set<string>();

  const push = (slot: number, envName: string, raw: string | undefined) => {
    const key = String(raw || '').trim();
    if (!key) return;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    found.push({ slot, envName, key });
  };

  push(0, 'GEMINI_API_KEY', env.GEMINI_API_KEY);
  for (let i = 1; i <= MAX_ORG_KEY_SLOTS; i++) {
    push(i, `GEMINI_API_KEY_${i}`, env[`GEMINI_API_KEY_${i}`]);
  }
  return found;
}

export class KeyPoolState {
  private cooldownUntil = new Map<number, number>();

  constructor(private readonly cooldownMs: number = DEFAULT_SLOT_COOLDOWN_MS) {}

  isAvailable(slot: number, now: number = Date.now()): boolean {
    const until = this.cooldownUntil.get(slot);
    return until === undefined || until <= now;
  }

  /** Slots still usable at `now`, preserving catalog order. */
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

/** True when the error class should rotate to the next key slot. */
export function shouldRotateKeySlot(errorClass: string | undefined): boolean {
  return errorClass === 'PROVIDER_QUOTA' || errorClass === 'PROVIDER_TRANSIENT' || errorClass === 'PROVIDER_AUTH';
}
