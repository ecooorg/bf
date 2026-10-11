# Current state

> State on **11 October 2026**. Replaces `BIFORGE-STATE.json` (removed in P00). Update this file in every patch that changes the state.

## Done

- P10: BX-14 — golden-eval (`evals/golden/tasks.json`, 18 RU/EN tasks; `server/goldenEval.ts`; `npm run eval:golden`, fake adapters only) and report `docs/GOLDEN-EVAL-REPORT.md`; ADR-04 is a draft (the `cross_model` decision belongs to the owner). Live run on real providers and applying `quality_class` to the registry are not done. Simple Mode unchanged.
- P09: BX-13.b — fallback matrix (TZ 7.4) fully tested, `model_health` (migration 004, `server/modelHealth.ts`), provider disable expires after 6 h with audit event `provider.disabled`, quota restored from the ledger, daily cap 300 units per project (80 % warn, 100 % stop, `DAILY_BUDGET_EXCEEDED`). Latency recorded, not used for ordering (after P10). Simple Mode unchanged.
- P08: BX-13.a — Router v1 (quota-aware, cost-tier order, paid off by default, sensitivity filter, per-run budget in units), `route_decisions` (migration 003), units and shadow cost in the ledger, ADR-07. Simple Mode unchanged. Live PostgreSQL tests passed on a local database; CI on `main` is the final word.
- P07: BX-12.a — `openai-compatible` adapter, Groq (`openai/gpt-oss-120b` active as a fallback after Gemini; Free plan, so only open or synthetic data), `verify:connections --only groq` OK.
- BX-01…BX-05: baseline, documents, CI and operations fixes, characterization tests, PostgreSQL with migrations, base contracts.
- BX-06: Project Mode separated (`/project`, opt-in), mandatory authentication, CSRF/origin protection, rate limits in the database. Checked by the owner on Railway (`docs/BX-06-REPORT.md`).
- BX-07: provenance, restart test, manual 409 check, English-only interface, `/health` shows `commit` (`docs/BX-07-REPORT.md`). **Closing condition:** green CI on the last commit and a short Simple Mode check on Railway.
- P06 (this patch): BX-09.a part 2 and BX-09.b — Context Builder with token measurement, analysis in Project Mode (model -> patch -> human review -> artifact -> ledger). Gate G1a waits for the owner's real analysis.
- P05: BX-09.a part 1 — State patch pipeline, validator, compaction, state service (not wired to routes; no model call yet).
- P04: BX-17.a and BX-10.b — artifact registry (migration 002), ledger-min, `connectors.yaml`, `verify:connections`, `docs/CONNECTIONS.md`. Owner still has to run `verify:connections` with the real key and do the A-01/A-02 console checks.
- P03: BX-10.a part 2 and BX-11 — Gemini adapter, fake provider, Router-min, conformance tests, ADR-02. Not wired to Simple Mode (`generate()` unchanged).
- P02: BX-10.a part 1 — adapter contract, normalized response, error classes, model registry schema and Gemini seed in code; not connected to `generate()`; registry not in the database yet.
- P01: BX-08 — project passport (State `passport`, zod schema, `proposed`→`confirmed`; confirming moves a `draft` project to `active`); passport form in `/project`; versions, `v…` and `BX-06` removed from screens (`APP_VERSION` stays in `/health`, logs, files).
- P00: documentation for working with different models; no program code changed.

## Checked by the owner on Railway

- `/health` returns `commit` (value `974cf83e69a8` was seen).
- Two tabs on one project: the second write got "State version conflict", data not overwritten.

## Not checked by the agent

`npm run check`, `npm run build`, live PostgreSQL tests (`npm run test:database:live`, `npm run test:bx06:api`) were not run in the environment of P00 (no installed dependencies). Their result is the CI result on `main`.

## Known leftovers

- `DEPLOY_RAILWAY.md`, section "Planned changes", is partly outdated (some items were done in BX-02…BX-06); the rest of the file is accurate. Clean up when touching deployment.
- `docs/DEVELOPMENT.md` says `npm run check` uses `scripts/qa.mjs`; in fact `package.json` runs a chain of commands (see `docs/REPO_MAP.md`).
- Policy documents `docs/GIT_POLICY.md` and `docs/DEVELOPMENT_PROTOCOL.md` describe branches and Pull Requests; the real process is in `docs/START_HERE.md`.
- Test Integrity path `tests/acceptance/**` does not exist yet; it is created when the TZ requires expectation tests.

## G1a: owner check on Railway (TZ 18.0, items 1-9)

Needs `ENABLE_PROJECT_MODE=true`, `GEMINI_API_KEY`, `DATABASE_URL`. After upload, `/health` `commit` must match GitHub.

1. Open `/project`, create a project, confirm the passport. The "Analysis" block appears only after that.
2. Type a real task, press "Run analysis". Expect: proposed items (yellow), an artifact `analysis.md`, one line under "Model calls" with tokens.
3. Confirm one item and reject one; add a decision. Restart the service on Railway and reopen the project: items, decision and artifact are still there.
4. Open the project in two tabs; change in one, then press any button in the other: expected "State version conflict".
5. Write your remarks on the analysis (what was useful, what was wrong) in `docs/CURRENT_STATE.md` or tell the next session.

Not run by the agent: live PostgreSQL tests (`npm run test:database:live`, including `tests/analysis-live.test.mjs`) and the real Gemini call; their result is CI and your check.

## Next patch

**P09** (BX-13.b): fallback matrix, `model_health` in the database, full ledger (day cap and persisted quota state). Plan: TZ 16.4.2.
