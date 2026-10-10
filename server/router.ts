import type { Capability, ProviderAdapter, ProviderRequest, ProviderResponse } from './adapter.js';
import type { RegistryEntry } from './modelRegistry.js';

/** Router-min (TZ 7.3, 7.4): deterministic selection from the registry and fallback by the matrix. Not wired to Simple Mode (ADR-02). */
export interface RouterState { cooldownUntil: Map<string, number>; disabledProviders: Set<string> }
export const newRouterState = (): RouterState => ({ cooldownUntil: new Map(), disabledProviders: new Set() });

const QUALITY_RANK = { A: 0, B: 1, C: 2 } as const;
const COOLDOWN_TRANSIENT_MS = 60_000;   // same values as server.ts
const COOLDOWN_QUOTA_MS = 180_000;
const REPAIR_HINT = '\n\nPREVIOUS RESPONSE was not valid JSON. Reply with one valid JSON object only.';
const key = (e: RegistryEntry) => `${e.providerId}/${e.modelId}`;

export interface Rejected { model: string; reason: string }
export function selectCandidates(registry: RegistryEntry[], state: RouterState, required: Capability[], now: number, minQuality: 'A' | 'B' | 'C' = 'C', adapters?: Record<string, unknown>) {
  const rejected: Rejected[] = [];
  const ok: { e: RegistryEntry; idx: number }[] = [];
  registry.forEach((e, idx) => {
    const m = key(e);
    const miss = required.find((c) => !e.capabilities.includes(c));
    if (e.status !== 'active') rejected.push({ model: m, reason: `status:${e.status}` });
    else if (state.disabledProviders.has(e.providerId)) rejected.push({ model: m, reason: 'provider_disabled' });
    else if (miss) rejected.push({ model: m, reason: `missing_capability:${miss}` });
    else if (QUALITY_RANK[e.qualityClass] > QUALITY_RANK[minQuality]) rejected.push({ model: m, reason: 'quality_below_minimum' });
    else if ((state.cooldownUntil.get(m) || 0) > now) rejected.push({ model: m, reason: 'cooldown' });
    else if (adapters && !adapters[e.providerId]) rejected.push({ model: m, reason: 'no_adapter' });
    else ok.push({ e, idx });
  });
  // quality class first, then registry order (= existing cascade order)
  ok.sort((a, b) => QUALITY_RANK[a.e.qualityClass] - QUALITY_RANK[b.e.qualityClass] || a.idx - b.idx);
  return { candidates: ok.map((x) => x.e), rejected };
}

export interface RouteContext {
  registry: RegistryEntry[]; adapters: Record<string, ProviderAdapter>; state: RouterState;
  required?: Capability[]; minQuality?: 'A' | 'B' | 'C'; maxCalls?: number; timeoutMs?: number;
  now?: () => number; sleep?: (ms: number) => Promise<void>; backoffMs?: () => number;
}
export interface RouteDecision { candidates: string[]; rejected: Rejected[]; attempts: { model: string; status: string; errorClass?: string }[]; reason?: string }
export interface RouteResult { status: 'ok' | 'error' | 'blocked'; response?: ProviderResponse; decision: RouteDecision }

export async function routeCall(req: Omit<ProviderRequest, 'modelId'>, ctx: RouteContext): Promise<RouteResult> {
  const now = ctx.now ?? Date.now;
  const sleep = ctx.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  const backoff = ctx.backoffMs ?? (() => 700 + Math.floor(Math.random() * 1100));
  const maxCalls = ctx.maxCalls ?? 4;
  const { candidates, rejected } = selectCandidates(ctx.registry, ctx.state, ctx.required ?? [], now(), ctx.minQuality, ctx.adapters);
  const decision: RouteDecision = { candidates: candidates.map(key), rejected, attempts: [] };
  if (!candidates.length) return { status: 'blocked', decision: { ...decision, reason: 'no_suitable_model' } };

  let calls = 0;
  let last: ProviderResponse | undefined;
  outer: for (const entry of candidates) {
    if (ctx.state.disabledProviders.has(entry.providerId)) continue;
    let retriedTransient = false, retriedOutput = false, hint = '';
    for (;;) {
      if (calls >= maxCalls) return { status: 'blocked', response: last, decision: { ...decision, reason: 'call_limit' } };
      calls++;
      const resp = await ctx.adapters[entry.providerId].call({ ...req, modelId: entry.modelId, prompt: req.prompt + hint }, { timeoutMs: ctx.timeoutMs });
      last = resp;
      decision.attempts.push({ model: key(entry), status: resp.status, ...(resp.errorClass ? { errorClass: resp.errorClass } : {}) });
      if (resp.status === 'ok') return { status: 'ok', response: resp, decision };
      switch (resp.errorClass) {
        case 'PROVIDER_TRANSIENT':
          if (!retriedTransient && calls < maxCalls) { retriedTransient = true; await sleep(backoff()); continue; }
          ctx.state.cooldownUntil.set(key(entry), now() + COOLDOWN_TRANSIENT_MS);
          continue outer;
        case 'PROVIDER_QUOTA':
          ctx.state.cooldownUntil.set(key(entry), now() + COOLDOWN_QUOTA_MS);
          continue outer;
        case 'PROVIDER_AUTH':
          ctx.state.disabledProviders.add(entry.providerId);
          continue outer;
        case 'INVALID_OUTPUT':
          if (!retriedOutput) { retriedOutput = true; hint = REPAIR_HINT; continue; }
          continue outer;
        default:   // INVALID_REQUEST, POLICY_REJECTED: no retries
          return { status: 'error', response: resp, decision: { ...decision, reason: resp.errorClass } };
      }
    }
  }
  const allAuth = decision.attempts.length > 0 && decision.attempts.every((a) => a.errorClass === 'PROVIDER_AUTH');
  return allAuth
    ? { status: 'blocked', response: last, decision: { ...decision, reason: 'no_provider_after_auth' } }
    : { status: 'error', response: last, decision: { ...decision, reason: 'candidates_exhausted' } };
}
