# P09 — Fallback matrix, model health in the database, full ledger ★

**Goal.** Every row of the fallback matrix (TZ 7.4) behaves exactly as written and is tested; model health survives restarts and several replicas (TZ 7.5); the ledger gives the day cap and quota state that P08 deferred. TZ: 7.4, 7.5, 7.8, 14.3, 14.4, 16.4.3 (BX-13.b). Builds on ADR-07.

**Base.** Repository archive after P08. `baseCommit`: `____` (owner fills at the start of implementation).

**May change.** `server/router.ts`, `server/adapter.ts` (one optional response field), `server/openaiCompatAdapter.ts`, `server/geminiAdapter.ts` (only if it can read a reset time; otherwise untouched), `server/budget.ts`, `server/analysisService.ts`, `server/ledger.ts`; new `server/modelHealth.ts`, `migrations/004_model_health.sql`; tests; `docs/CURRENT_STATE.md`, `docs/ADR-07-budget-units.md` (revisit note), `CHANGELOG.md`.

**Must not change.** Simple Mode and `server.ts` behaviour; the registry schema; P08 behaviour (all P08 acceptance tests stay green); `tests/p08-acceptance.test.mjs`, `tests/p09-acceptance.test.mjs`, `tests/p09-live-acceptance.test.mjs` (protected, Test Integrity). All new router inputs and hooks are optional.

## 1. Matrix, row by row (exact behaviour)

| Class | Behaviour in P09 |
| --- | --- |
| `PROVIDER_TRANSIENT` | One retry on the same model after `backoffMs()` (exponential with jitter in production), **only if** the optional `deadlineAt` leaves room for the wait (`now + backoff < deadlineAt`); otherwise go straight to the next model. A second failure puts the model in cooldown (60 s) and moves on. |
| `PROVIDER_QUOTA` | No retry. Model in cooldown until reset: `max(180 s, retryAfterMs)`, capped at 24 h. Next candidate. |
| `PROVIDER_AUTH` | The whole provider is disabled (its other models are skipped), event `provider_disabled`. Fallback only to another provider; if none is left: `blocked`, reason `no_provider_after_auth`. |
| `INVALID_REQUEST` | No retry. Result `error`, `decision.reason = INVALID_REQUEST`, **`decision.category = 'system'`**. |
| `INVALID_OUTPUT` | One retry on the same model with the repair hint appended to the prompt; then the next model; when all are exhausted: `error`, reason `candidates_exhausted`. |
| `POLICY_REJECTED` | No retry. Result `error`, reason `POLICY_REJECTED`, **`decision.escalate = 'human'`**. |
| Call limit | 4 model calls per Run (default `maxCalls`) → `blocked`, reason `call_limit`. The Task limit (12) and the Project limit belong to the Task/Run state machine (P11/P13). |

**Contract additions.** `ProviderResponse.retryAfterMs` (optional, integer ≥ 0). The `openai-compatible` adapter fills it from the `retry-after` header (seconds → ms) on 429. `RouteContext.deadlineAt` (ms, optional), `RouteContext.onHealth` (optional hook). `RouteDecision.category` and `RouteDecision.escalate` (optional).

## 2. Model health (TZ 7.5)

- Events emitted by Router through `onHealth`: `{type:'call', model, ok, latencyMs, errorClass?}`, `{type:'cooldown', model, until}`, `{type:'provider_disabled', providerId, reason}`.
- `server/modelHealth.ts`, pure part: `applyHealthEvent(rows, event, now)` (successes, failures, average latency as EMA with α = 0.2 — first sample sets it, last error class, cooldown), `hydrateRouterState(state, rows, now)` (future cooldowns and provider disables restored), `rehydrateQuota(tracker, rows, now)`, `AUTH_DISABLE_TTL_MS = 6 h`.
- Database part (migration `004`): table `model_health`; `saveHealthEvent`, `loadHealthRows`, `loadRouterState` (with a short in-memory cache, so several replicas converge), `loadQuotaRows` (last 24 h of `usage_ledger`).
- **Decision (owner may change):** a persisted provider disable **expires after 6 hours** and the provider is tried again. Reason: there is no admin screen yet, and a revoked-then-replaced key must not leave a provider off forever. A repeated `PROVIDER_AUTH` disables it again and raises the audit event again.
- `provider_disabled` also writes an audit event `provider.disabled` (actor `system`, details: provider id and reason, no secrets).
- **Decision (owner may change):** average latency is **recorded but not used for ordering yet.** Using it now would silently promote the fast Groq Free model above Gemini, whose limits are far larger. Order stays quality → cost tier → registry order. The latency key waits for the P10 evidence.

## 3. Full ledger, day cap, persisted quota

- On start of an analysis, Router state is hydrated from `model_health` and the quota tracker from the last 24 h of `usage_ledger`; quota windows therefore survive restarts.
- `server/budget.ts`: `DEFAULT_DAILY_UNITS = 300` (per project, per 24 h), `budgetLevel(used, cap)` → `{percent, level}` with `warn` from 80 % and `stop` from 100 % (TZ 14.4), `runBudget(usedToday, {dayCap, taskUnits})` → units available to this run (never negative).
- `analysisService`: run budget = `runBudget(...)`; at `stop` the analysis is refused with `AnalysisError('DAILY_BUDGET_EXCEEDED', …, 429)` before any call; the response carries `budget: {used_units, cap_units, level}` (`used_units` = units of the last 24 h including this run). No UI change in P09 (the panel line comes with P13).
- Ledger rows keep P08 fields; nothing is removed.

## 4. PASS criteria

- Machine: `npm ci`, `npm run check` (with `test:p09` added), `npm run build`; `test:database:live` including `tests/p09-live-acceptance.test.mjs`.
- Owner: after deploy open `/project`, run one analysis: it works as before; the response/ledger shows units. Nothing else is required.

**Read in the TZ.** 7.4, 7.5, 7.8, 14.3, 14.4, 16.4.3 (BX-13.b), Appendix G (G.2 relies on this patch).

**Tests.** `tests/p09-acceptance.test.mjs` (no database): one test per matrix row, call limit, health events, pure health functions, quota rehydration, day-cap functions, adapter `retryAfterMs`. `tests/p09-live-acceptance.test.mjs` (PostgreSQL): migration, persistence, restart simulation, audit event, day cap, persisted quota. Both written first and owner-approved.

**`CHANGELOG.md`.** `P09: BX-13.b. Fallback matrix rows implemented and tested (deadline-aware retry, cooldown until reset via retryAfterMs, provider disable with audit event and 6 h expiry, category system, escalate human), model_health table and hydration, quota windows restored from the ledger, daily cap per project with 80 %/100 % levels. Simple Mode untouched.`

**Not done / postponed.** Latency ordering (after P10); Task and Project call limits (P11/P13); budget line in the UI (P13); executor-run ledger units (P18); `last_verified_at` update by `verify:connections`; global `DAILY_CALL_CAP` migration from `server.ts` (Simple Mode untouched).
