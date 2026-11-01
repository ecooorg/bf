/**
 * C123 — Model Carousel gateway + lineage + key-pool rotation (P123.1 / P123.2).
 *
 * Prefer `executeModelCall` over calling adapters directly.
 * P123.1: lineage on every call.
 * P123.2: optional Gemini key pool (≤13 slots) with cooldown rotation on quota/429/auth.
 * Multi-source catalog remains P123.3+.
 */
import type { ProviderAdapter, ProviderRequest } from './adapter.ts';
import { routeCall, type RouteContext, type RouteResult } from './router.ts';
import {
  KeyPoolState,
  resolveGeminiKeySlots,
  shouldRotateKeySlot,
  type KeySlot,
} from './keyPool.ts';

export type ModelChannel = 'api' | 'browser';

/** Scientific / ops lineage attached to every carousel call (success or failure). */
export interface ModelCallLineage {
  requestId: string;
  sourceId: string;
  model: string | null;
  channel: ModelChannel;
  /** Opaque slot index 0..13; null if pool unused or unknown. */
  keySlot: number | null;
  dataClass: 'public' | 'restricted';
  startedAt: string;
  finishedAt: string;
  latencyMs: number;
  status: 'ok' | 'error' | 'blocked' | 'failover';
  errorClass?: string;
  policy: string;
  attempts: { model: string; status: string; errorClass?: string; keySlot?: number }[];
}

export interface CarouselResult extends RouteResult {
  lineage: ModelCallLineage;
}

export interface ExecuteModelCallOptions {
  sourceId?: string;
  channel?: ModelChannel;
  dataClass?: 'public' | 'restricted';
  /** Force a single slot index into lineage when not using the pool loop. */
  keySlot?: number | null;
  /**
   * P123.2: organisational key slots. When set with `buildGeminiAdapter`,
   * the gateway tries successive slots on quota/transient/auth failures.
   */
  keySlots?: KeySlot[];
  keyPoolState?: KeyPoolState;
  /** Build a Gemini ProviderAdapter for one secret (never log the argument). */
  buildGeminiAdapter?: (apiKey: string) => ProviderAdapter;
}

const DEFAULT_SOURCE = 'gemini-free-pool';

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

export function buildModelCallLineage(
  req: Pick<ProviderRequest, 'requestId'>,
  result: RouteResult,
  startedAtMs: number,
  opts: ExecuteModelCallOptions = {},
  extraAttempts: ModelCallLineage['attempts'] = []
): ModelCallLineage {
  const finishedAtMs = Date.now();
  const response = result.response;
  const model =
    response?.modelId ||
    result.decision.attempts.map((a) => a.model).filter(Boolean).at(-1) ||
    result.decision.candidates[0] ||
    null;
  const mergedAttempts = [
    ...extraAttempts,
    ...result.decision.attempts.map((a) => ({
      model: a.model,
      status: a.status,
      ...(a.errorClass ? { errorClass: a.errorClass } : {}),
    })),
  ];
  const lastAttempt = mergedAttempts.at(-1);
  const multi = mergedAttempts.length > 1 || result.decision.attempts.length > 1;
  const status: ModelCallLineage['status'] =
    result.status === 'ok' ? (multi ? 'failover' : 'ok') : result.status;

  return {
    requestId: String(req.requestId || 'unknown'),
    sourceId: opts.sourceId || DEFAULT_SOURCE,
    model: model ? String(model).split('/').pop() || String(model) : null,
    channel: opts.channel || 'api',
    keySlot: opts.keySlot === undefined ? null : opts.keySlot,
    dataClass: opts.dataClass || 'public',
    startedAt: iso(startedAtMs),
    finishedAt: iso(finishedAtMs),
    latencyMs: Math.max(0, finishedAtMs - startedAtMs),
    status,
    ...(lastAttempt?.errorClass || response?.errorClass
      ? { errorClass: lastAttempt?.errorClass || response?.errorClass }
      : {}),
    policy: result.decision.policy || 'unknown',
    attempts: mergedAttempts,
  };
}

/**
 * Preferred entry for model calls in C123+.
 * Without key pool options → single routeCall (P123.1 behaviour).
 * With keySlots + buildGeminiAdapter → rotate keys on rotatable errors (P123.2).
 */
export async function executeModelCall(
  req: Omit<ProviderRequest, 'modelId'>,
  ctx: RouteContext,
  opts: ExecuteModelCallOptions = {}
): Promise<CarouselResult> {
  const startedAtMs = Date.now();
  const slots = opts.keySlots?.length ? opts.keySlots : null;
  const pool = opts.keyPoolState;
  const build = opts.buildGeminiAdapter;

  if (!slots || !build) {
    const result = await routeCall(req, ctx);
    const lineage = buildModelCallLineage(req, result, startedAtMs, opts);
    return { ...result, lineage };
  }

  const now = () => Date.now();
  const available = pool ? pool.available(slots, now()) : slots;
  if (!available.length) {
    const empty: RouteResult = {
      status: 'blocked',
      decision: {
        candidates: [],
        rejected: slots.map((s) => ({ model: `key_slot:${s.slot}`, reason: 'key_slot_cooldown' })),
        attempts: [],
        policy: 'carousel-key-pool/v1',
        unitsSpent: 0,
        reason: 'no_available_key_slot',
      },
    };
    return {
      ...empty,
      lineage: buildModelCallLineage(req, empty, startedAtMs, { ...opts, keySlot: null }),
    };
  }

  const poolAttempts: ModelCallLineage['attempts'] = [];
  let last: RouteResult | undefined;

  for (const slot of available) {
    const gemini = build(slot.key);
    const result = await routeCall(req, {
      ...ctx,
      adapters: { ...ctx.adapters, gemini },
    });
    last = result;

    for (const a of result.decision.attempts) {
      poolAttempts.push({
        model: a.model,
        status: a.status,
        keySlot: slot.slot,
        ...(a.errorClass ? { errorClass: a.errorClass } : {}),
      });
    }

    if (result.status === 'ok') {
      pool?.clearCooldown(slot.slot);
      const lineage = buildModelCallLineage(
        req,
        result,
        startedAtMs,
        { ...opts, keySlot: slot.slot },
        poolAttempts.length ? poolAttempts : undefined
      );
      // Prefer poolAttempts as the full picture
      if (poolAttempts.length) lineage.attempts = poolAttempts;
      return { ...result, lineage };
    }

    const errClass =
      result.response?.errorClass ||
      result.decision.attempts.map((a) => a.errorClass).filter(Boolean).at(-1);

    if (shouldRotateKeySlot(errClass)) {
      pool?.markCooldown(slot.slot, now());
      continue;
    }

    // Non-rotatable failure (invalid request, blocked policy, etc.)
    const lineage = buildModelCallLineage(req, result, startedAtMs, { ...opts, keySlot: slot.slot });
    if (poolAttempts.length) lineage.attempts = poolAttempts;
    return { ...result, lineage };
  }

  const failed = last ?? {
    status: 'blocked' as const,
    decision: {
      candidates: [],
      rejected: [],
      attempts: [],
      policy: 'carousel-key-pool/v1',
      unitsSpent: 0,
      reason: 'all_key_slots_exhausted',
    },
  };
  const lineage = buildModelCallLineage(req, failed, startedAtMs, {
    ...opts,
    keySlot: available.at(-1)?.slot ?? null,
  });
  if (poolAttempts.length) lineage.attempts = poolAttempts;
  if (failed.status !== 'ok') lineage.status = failed.status === 'blocked' ? 'blocked' : 'error';
  return { ...failed, lineage };
}

export function lineageLogFields(lineage: ModelCallLineage): Record<string, unknown> {
  return {
    requestId: lineage.requestId,
    sourceId: lineage.sourceId,
    model: lineage.model,
    channel: lineage.channel,
    keySlot: lineage.keySlot,
    status: lineage.status,
    latencyMs: lineage.latencyMs,
    errorClass: lineage.errorClass ?? null,
    attempts: lineage.attempts.length,
  };
}

export { resolveGeminiKeySlots, KeyPoolState, shouldRotateKeySlot };
export type { KeySlot };
