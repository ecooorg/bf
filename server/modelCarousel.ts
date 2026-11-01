/**
 * C123 P123.1 — Model Carousel gateway skeleton + call lineage.
 *
 * Agents and services should prefer `executeModelCall` over calling adapters directly.
 * Behaviour for a single Gemini cascade is unchanged: this wraps `routeCall` and attaches
 * reproducible lineage (source, model, channel, key slot, timing).
 *
 * Multi-source catalog and 13-key pool land in P123.2+.
 */
import type { ProviderRequest } from './adapter.ts';
import { routeCall, type RouteContext, type RouteResult, type RouteDecision } from './router.ts';

export type ModelChannel = 'api' | 'browser';

/** Scientific / ops lineage attached to every carousel call (success or failure). */
export interface ModelCallLineage {
  requestId: string;
  sourceId: string;
  model: string | null;
  channel: ModelChannel;
  /** Opaque slot index 0..12 when a key pool is active; null if single-key / unknown. */
  keySlot: number | null;
  dataClass: 'public' | 'restricted';
  startedAt: string;
  finishedAt: string;
  latencyMs: number;
  status: 'ok' | 'error' | 'blocked' | 'failover';
  errorClass?: string;
  /** Router policy id for debugging. */
  policy: string;
  attempts: { model: string; status: string; errorClass?: string }[];
}

export interface CarouselResult extends RouteResult {
  lineage: ModelCallLineage;
}

export interface ExecuteModelCallOptions {
  /** Catalog source id (MVP: single Gemini free pool). */
  sourceId?: string;
  channel?: ModelChannel;
  dataClass?: 'public' | 'restricted';
  /** Key pool slot when multi-key is configured (P123.2); omit for solo deploy. */
  keySlot?: number | null;
}

const DEFAULT_SOURCE = 'gemini-free-pool';

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/** Build lineage from a finished routeCall result. */
export function buildModelCallLineage(
  req: Pick<ProviderRequest, 'requestId'>,
  result: RouteResult,
  startedAtMs: number,
  opts: ExecuteModelCallOptions = {}
): ModelCallLineage {
  const finishedAtMs = Date.now();
  const response = result.response;
  const model =
    response?.modelId ||
    result.decision.attempts.map((a) => a.model).filter(Boolean).at(-1) ||
    result.decision.candidates[0] ||
    null;
  const lastAttempt = result.decision.attempts.at(-1);
  const status: ModelCallLineage['status'] =
    result.status === 'ok'
      ? result.decision.attempts.length > 1
        ? 'failover'
        : 'ok'
      : result.status;

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
    attempts: result.decision.attempts.map((a) => ({
      model: a.model,
      status: a.status,
      ...(a.errorClass ? { errorClass: a.errorClass } : {}),
    })),
  };
}

/**
 * Preferred entry for model calls in C123+.
 * MVP: delegates to existing `routeCall` (Gemini cascade / registry unchanged).
 */
export async function executeModelCall(
  req: Omit<ProviderRequest, 'modelId'>,
  ctx: RouteContext,
  opts: ExecuteModelCallOptions = {}
): Promise<CarouselResult> {
  const startedAtMs = Date.now();
  const result = await routeCall(req, ctx);
  const lineage = buildModelCallLineage(req, result, startedAtMs, opts);
  return { ...result, lineage };
}

/** Summarise lineage for logs / agent meta (never includes secrets). */
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
