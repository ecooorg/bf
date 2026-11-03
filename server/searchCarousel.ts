/**
 * P124.30 — search provider chain (`SEARCH_CAROUSEL`).
 *
 * Order is configuration: comma list of `connector`, `serper`, `gemini`, `serp2`.
 *  - connector: gated structured-data connector (weather, P124.29). Runs in parallel with the first provider and its
 *    evidence is merged into every provider result for the first query; it is not a fallback by itself.
 *  - serper / gemini (Gemini `googleSearch`, step one of the two-step flow; step two is the pipeline's generation call) / serp2.
 *  - serp2: slot for the second SERP provider. Provider name and variable are still to be supplied by the owner, so no
 *    adapter is registered yet and the slot reports `not_configured` (no invented API).
 * A provider that fails repeatedly is skipped by a circuit breaker. Search budgets are separate from the generation
 * budget (`DAILY_CALL_CAP`). Pure module: no network, no imports from server.ts.
 */
import { searchWithUsability, combineWeatherWithSearch, skippedWebSearch, type SearchPlan, type WebSearchResult } from './webSearch.ts';

export type ProviderId = 'connector' | 'serper' | 'gemini' | 'serp2';
export const PROVIDER_IDS: ProviderId[] = ['connector', 'serper', 'gemini', 'serp2'];
type Env = Record<string, string | undefined>;

/** Parse SEARCH_CAROUSEL. Unset/empty → default derived from the legacy WEB_SEARCH_PROVIDER / key presence. Unknown ids are reported, never executed. */
export function parseSearchCarousel(env: Env = process.env): { order: ProviderId[]; unknown: string[]; source: 'env' | 'default' } {
  const raw = String(env.SEARCH_CAROUSEL || '').trim();
  if (raw) {
    const order: ProviderId[] = []; const unknown: string[] = [];
    for (const t of raw.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)) {
      if ((PROVIDER_IDS as string[]).includes(t)) { if (!order.includes(t as ProviderId)) order.push(t as ProviderId); } else if (!unknown.includes(t)) unknown.push(t);
    }
    if (order.length) return { order, unknown, source: 'env' };
    return { order: defaultOrder(env), unknown, source: 'default' };
  }
  return { order: defaultOrder(env), unknown: [], source: 'default' };
}
function defaultOrder(env: Env): ProviderId[] {
  const p = String(env.WEB_SEARCH_PROVIDER || '').trim().toLowerCase();
  if (p === 'gemini') return ['connector', 'gemini'];
  if (p === 'serper') return ['connector', 'serper'];
  return String(env.SERPER_API_KEY || '').trim() ? ['connector', 'serper', 'gemini'] : ['connector', 'gemini'];
}

/** Failure kinds. `hard` (auth/quota/billing) opens the breaker at once for a long time. */
export function classifyProviderFailure(r: WebSearchResult): 'none' | 'soft' | 'hard' {
  if (r.status !== 'failed') return 'none';
  const m = /_http_(\d{3})/.exec(String(r.reason || ''));
  if (m && ['401', '402', '403', '429'].includes(m[1])) return 'hard';
  if (/quota|resource_exhausted|\b429\b/i.test(String(r.reason || ''))) return 'hard';
  return 'soft';
}

export class SearchCircuitBreaker {
  private st = new Map<string, { fails: number; openUntil: number; trial: boolean }>();
  constructor(private o: { threshold?: number; softOpenMs?: number; hardOpenMs?: number } = {}) {}
  private get threshold() { return this.o.threshold ?? 3; }
  private get softMs() { return this.o.softOpenMs ?? 60_000; }
  private get hardMs() { return this.o.hardOpenMs ?? 15 * 60_000; }
  /** Closed or half-open (cooldown elapsed: exactly one trial call is allowed). */
  allow(id: string, now = Date.now()): boolean {
    const s = this.st.get(id); if (!s || s.openUntil === 0) return true;
    if (now < s.openUntil) return false;
    if (s.trial) return false; // a trial is already running
    s.trial = true; return true;
  }
  isOpen(id: string, now = Date.now()): boolean { const s = this.st.get(id); return Boolean(s && s.openUntil > now); }
  success(id: string): void { this.st.delete(id); }
  failure(id: string, kind: 'soft' | 'hard', now = Date.now()): void {
    const s = this.st.get(id) || { fails: 0, openUntil: 0, trial: false };
    s.fails += 1; s.trial = false;
    if (kind === 'hard') s.openUntil = now + this.hardMs;
    else if (s.fails >= this.threshold || s.openUntil) s.openUntil = now + this.softMs; // failed trial reopens
    this.st.set(id, s);
  }
  /** A provider answered but had nothing (not a fault): release a half-open trial without counting. */
  neutral(id: string): void { const s = this.st.get(id); if (s) s.trial = false; }
  snapshot(now = Date.now()): Record<string, { fails: number; openForMs: number }> {
    const out: Record<string, { fails: number; openForMs: number }> = {};
    for (const [k, s] of this.st) out[k] = { fails: s.fails, openForMs: Math.max(0, s.openUntil - now) };
    return out;
  }
}

/** Daily search budget per provider (UTC day), independent of the generation cap. cap 0/unset = unlimited. */
export class SearchBudget {
  private day = ''; private used = new Map<string, number>();
  constructor(private caps: Partial<Record<ProviderId, number>> = {}, private today: () => string = () => new Date().toISOString().slice(0, 10)) {}
  static fromEnv(env: Env = process.env): SearchBudget {
    const caps: Partial<Record<ProviderId, number>> = {};
    for (const id of ['serper', 'gemini', 'serp2'] as ProviderId[]) {
      const n = Number(env[`SEARCH_DAILY_CAP_${id.toUpperCase()}`]);
      if (Number.isFinite(n) && n > 0) caps[id] = Math.floor(n);
    }
    return new SearchBudget(caps);
  }
  private roll() { const d = this.today(); if (d !== this.day) { this.day = d; this.used.clear(); } }
  allows(id: ProviderId): boolean { this.roll(); const cap = this.caps[id]; return !cap || (this.used.get(id) ?? 0) < cap; }
  record(id: ProviderId, units = 1): void { this.roll(); this.used.set(id, (this.used.get(id) ?? 0) + Math.max(0, units)); }
  snapshot(): Record<string, { used: number; cap: number | null }> {
    this.roll(); const out: Record<string, { used: number; cap: number | null }> = {};
    for (const id of ['serper', 'gemini', 'serp2'] as ProviderId[]) out[id] = { used: this.used.get(id) ?? 0, cap: this.caps[id] ?? null };
    return out;
  }
}

export type SearchProvider = {
  /** Reason string when the provider cannot run at all (no key, no client), else undefined. */
  unavailable?: () => string | undefined;
  search: (query: string, country: string | undefined, plan: SearchPlan) => Promise<WebSearchResult>;
  /** Budget units spent by one finished call (default 1). Serper spends one credit per sub-query. */
  units?: (r: WebSearchResult) => number;
};
export type ChainAttempt = { provider: string; outcome: 'used' | 'used_weak' | 'no_relevant_data' | 'failed' | 'no_grounding' | 'skipped'; detail?: string };

const RANK: Record<string, number> = { used: 5, used_weak: 4, no_relevant_data: 3, no_grounding: 2, failed: 1, skipped: 0 };

/**
 * Walk the chain: first provider with `used`/`used_weak` wins. `no_relevant_data`, `no_grounding`, `failed` fall through to the next.
 * Breaker-open and budget-exhausted providers are skipped and recorded. If nothing is usable the best attempt is returned
 * (so the prompt's SEARCH STATUS stays honest), or `failed` / `all_providers_unavailable` when nothing ran.
 */
export async function runSearchCarousel(opts: {
  plan: SearchPlan;
  order: ProviderId[];
  providers: Partial<Record<ProviderId, SearchProvider>>;
  breaker: SearchCircuitBreaker;
  budget: SearchBudget;
  /** Started by the caller (parallel with the chain); merged into the first-query result of every provider. */
  connector?: Promise<WebSearchResult | null>;
}): Promise<WebSearchResult> {
  const attempts: ChainAttempt[] = [];
  let best: WebSearchResult | null = null;
  const weatherP = opts.connector ?? Promise.resolve(null);
  for (const id of opts.order) {
    if (id === 'connector') continue;
    const p = opts.providers[id];
    if (!p) { attempts.push({ provider: id, outcome: 'skipped', detail: 'not_configured' }); continue; }
    const why = p.unavailable?.();
    if (why) { attempts.push({ provider: id, outcome: 'skipped', detail: why }); continue; }
    if (!opts.breaker.allow(id)) { attempts.push({ provider: id, outcome: 'skipped', detail: 'circuit_open' }); continue; }
    if (!opts.budget.allows(id)) { opts.breaker.neutral(id); attempts.push({ provider: id, outcome: 'skipped', detail: 'search_budget_exhausted' }); continue; }
    let r: WebSearchResult;
    try {
      r = await searchWithUsability(opts.plan, async (q, c) => {
        const raw = await p.search(q, c, opts.plan);
        opts.budget.record(id, p.units ? p.units(raw) : 1);
        return combineWeatherWithSearch(q === opts.plan.query ? await weatherP : null, raw, q);
      });
    } catch (e: any) {
      r = { ...skippedWebSearch('failed', String(e?.message || e).slice(0, 120)), model: id };
    }
    const kind = classifyProviderFailure(r);
    if (kind === 'none') { if (r.status === 'used' || r.status === 'used_weak') opts.breaker.success(id); else opts.breaker.neutral(id); } else opts.breaker.failure(id, kind);
    attempts.push({ provider: id, outcome: r.status as ChainAttempt['outcome'], detail: r.reason ? String(r.reason).slice(0, 80) : undefined });
    const tagged = { ...r, provider: id } as WebSearchResult;
    if (!best || (RANK[r.status] ?? 0) > (RANK[best.status] ?? 0)) best = tagged;
    if (r.status === 'used' || r.status === 'used_weak') return { ...tagged, chain: attempts };
  }
  if (best) return { ...best, chain: attempts };
  // Nothing ran. A connector result alone still counts as evidence.
  const w = await weatherP;
  if (w) return { ...w, provider: 'connector', plan: opts.plan, chain: attempts };
  const quota = attempts.some((a) => /_http_(402|429)|quota|budget/i.test(a.detail || ''));
  return { ...skippedWebSearch('failed', `all_providers_unavailable${quota ? ':quota' : ''}`), plan: opts.plan, chain: attempts };
}
