# P08 — Router v1: quota-aware routing, budgets, route decisions ★

**Goal.** Router decides deterministically by quality, cost tier and registry order; refuses (BLOCKED) instead of overspending; respects free-tier quotas and data sensitivity; records every decision in `route_decisions` and units/shadow cost in the ledger. Decisions: `docs/ADR-07-budget-units.md`. TZ: 7.1, 7.3, 7.8, 16.4.3 (BX-13.a).

**Base.** Repository archive after P07 (main, commit 376ef51 or later). `baseCommit` is written here by the owner at the start of implementation: `____`.

**May change.** `server/router.ts`, `server/modelRegistry.ts`, `server/analysisService.ts` (pass new context, write the decision), `server/ledger.ts`, `connectors.yaml` (only if a registry field is mirrored there; normally not); new `server/budget.ts`, `server/routeDecisions.ts`, `migrations/003_route_decisions.sql`; tests; `docs/CURRENT_STATE.md`, `docs/CONNECTIONS.md` (limits note), `CHANGELOG.md`.

**Must not change.** Simple Mode and `server.ts` behaviour; fallback matrix (`server/adapter.ts`); existing tests except where the registry schema requires the new fields (see below); `tests/p08-acceptance.test.mjs` (protected, Test Integrity). All new router inputs are optional so existing callers behave as before.

**Registry changes.** `dataPolicy` gains `self_hosted`. New required `costTier` (`self_hosted|free|paid`). New optional `limits {rpm, rpd, tpm, tpd}` and `pricing {inputPerMTok, outputPerMTok}`. Seed: Gemini `costTier: free` (assumption until A-02 confirms the paid tier; owner flips it then), Groq `costTier: free`, Groq limits 30 / 1000 / 8000 / 200000, Groq pricing for the two `openai/` models (0.15/0.60 and 0.075/0.30), none for `qwen/*` (unknown).

**Router API (contract the acceptance tests use).**
- `server/budget.ts`: `BUDGET_POLICY_VERSION = 'units-v1'`, `DEFAULT_TASK_UNITS = 30`, `unitsFor(inputTokens, outputTokens)`, `shadowCostUsd(usage, pricing)` (→ number or `null`), `createQuotaTracker()` with `record(modelKey, tokens, atMs)` and `usage(modelKey, atMs)` → `{rpm, tpm, rpd, tpd}`.
- `routeCall(req, ctx)` new optional `ctx` fields: `sensitivity` (default `normal`), `paidApproved: string[]` (default `[]`), `budget: { remainingUnits: number }` (mutated: decreased by actual units spent), `quota` (tracker; every attempted call is recorded, failed ones with 0 tokens), `estimatedInputTokens` (default `ceil(prompt.length / 4)`).
- Candidate filters, rejection reason strings: `status:<s>`, `provider_disabled`, `missing_capability:<c>`, `quality_below_minimum`, `cooldown`, `no_adapter`, **new** `sensitivity:<policy>`, `paid_not_approved`, `context_too_large`, `input_budget_exceeded`, `quota:rpm|rpd|tpm|tpd`.
- Order: quality class, cost tier rank, registry order.
- The request sent to a model has `maxOutputTokens = min(req.maxOutputTokens ?? model.maxOutputTokens, model.maxOutputTokens)` when the model has one.
- Budget check before each call with `unitsFor(estimatedInputTokens, maxOutput)`; if above `remainingUnits` → result `blocked`, `decision.reason = 'budget_exceeded'`, no call made.
- `RouteResult.decision` adds `policy: 'router-v1/units-v1'`, `unitsSpent`.
- `server/routeDecisions.ts`: `writeRouteDecision(decision, ctx)` → id; `analysisService` passes it as `route_decision_id` into ledger rows. Migration `003`: table `route_decisions` (id, run_id, policy_version, sensitivity, status, reason, candidates jsonb, rejected jsonb, attempts jsonb, units_spent, created_at) and `usage_ledger.units integer`.

**PASS criteria.**
- Machine: `npm ci`, `npm run check` (including the new `test:p08` added to `check`), `npm run build`; `test:database:live` in CI with the new migration.
- Owner: after deploy, open Project Mode and run one analysis → works as before; Railway log shows no errors. (Decisions and units appear in the database; a viewer is not part of P08.)

**Read in the TZ.** 7.1, 7.3, 7.4, 7.8, 16.4.3 (BX-13.a), ADR-07 here.

**Tests.** `tests/p08-acceptance.test.mjs` (written first, owner-approved, protected): determinism; order by cost tier; paid blocked unless approved; sensitivity filter; quota rejection before the call and recording; input budget and context limits; output cap; budget `blocked` without a call; units formula; shadow cost; decision content. Existing tests are updated only for the new required `costTier`. Add `test:p08` to `check`.

**`CHANGELOG.md`.** `P08: BX-13.a. Router v1 (quota-aware, cost-tier order, paid off by default, sensitivity filter, budget check before the call), route_decisions, units and shadow cost in the ledger, ADR-07. Simple Mode untouched.`

**Not done / postponed.** Day cap enforcement and quota state persisted across restarts (P09, with `model_health` and the full ledger); latency ordering (P09); `self_hosted` provider itself (no server yet; the schema value exists); UI for decisions; golden-eval (P10).
