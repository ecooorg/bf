# Current state

> State on **11 October 2026**. Replaces `BIFORGE-STATE.json` (removed in P00). Update this file in every patch that changes the state.

## Done

- Process hardening (between P13a and P13b): `patch:pack` builds the archive first, every check is a separate step with limits and attempts, a red or hanging check does not stop the delivery (`PARTIAL`), logs in `patch-logs`; test timeouts in `package.json` and `tests/run.sh`; bounded PostgreSQL waits in `server/database.ts`. Spec: `docs/P13a-SPEC.md`, section Hardening. **Not done:** the cause of the P13b hang is not found (no P13b code was available); the first real use is the next P13b attempt. Simple Mode unchanged.
- P13a: BX-28 — process automation: `npm run patch:pack` (archive of changed and new files, checks, report with `NOT_RUN`/`BLOCKED` for what was not run), preflight (manifest, nested folders, secrets, `tests/acceptance/**`, stale links), CI result line and first failed test in `ci.yml`. Spec: `docs/P13a-SPEC.md`. **Not done:** owner has not seen a real CI summary yet. No product code changed; Simple Mode unchanged.
- P14: BX-17.b — full Artifact Registry (`server/artifactFormat.ts` pure, `server/artifactRepository.ts`, migration 008: `artifact_manifests`). Binary artifacts, type from content, manifest per version (older versions backfilled), tamper and missing object detected on read, limits, inspect/preview/diff/ZIP listing/manifest export. ADR-05 (content in PostgreSQL), ADR-08 (retention). `check:docs` now checks that `server/`, `tests/` and `test:*` scripts are in `docs/REPO_MAP.md`. Spec: `docs/P14-SPEC.md`. **Not done:** routes and UI for binary files, S3 adapter, Artifact Graph. Simple Mode unchanged.
- P13: BX-16, domain part — budgets (project/task/run; calls, tokens, units, wall clock, attempts, code tasks) checked before every model call, over budget -> `BLOCKED(budget)` and one approval request; Task Graph v1 (`server/planMachine.ts` pure validator and template, `server/planService.ts`, migration 007: `budgets`, `project_settings`, `plans`, `plan_tasks`, `approvals`); a plan runs only after human approval; max 2 Runs per project; modes supervised/manual, no autonomous. Spec: `docs/P13-SPEC.md`. **Not done (P13.b):** routes and the `/project` screen to confirm a plan, starting the worker from `server.ts`, wiring `guardModelCall` into `runAnalysis`. Simple Mode unchanged.
- P12: BX-15.b — job queue and worker (`server/queueMachine.ts` pure, `server/queueService.ts`, `server/worker.ts`, migration 006: `jobs`). `FOR UPDATE SKIP LOCKED` claim, lease 60 s and heartbeat 20 s, expired lease -> Run `ABANDONED` and Task `BLOCKED(recovery)`, recovery pass on worker start; a lost worker never becomes PASS. `enqueueTask` creates the job, `finishRun` closes it. The worker is a library and is **not** started from `server.ts` (no handler yet). No automatic retry: a human decides. Report: `docs/P12-REPORT.md`. Simple Mode unchanged.
- P11: BX-15.a — Task/Run state machine and idempotency (`server/taskMachine.ts` pure, `server/taskService.ts`, migration 005: `tasks`, `runs`, `task_events`). Strict transitions, optimistic versions, an event per transition, idempotent `createTask`/`enqueueTask`, PASS only with recorded validation and evidence, ABANDONED -> BLOCKED(recovery), changed input invalidates PASS. Domain service only: no routes, no UI, `runAnalysis` not wired. Queue, worker, lease and recovery are P12. Report: `docs/P11-REPORT.md`. Simple Mode unchanged.
- P10: BX-14 — golden-eval (`scripts/golden-tasks.json`, 18 RU/EN tasks; `server/goldenEval.ts`; `npm run eval:golden`, fake adapters only) and report `docs/GOLDEN-EVAL-REPORT.md`; ADR-04 is a draft (the `cross_model` decision belongs to the owner). Live run on real providers and applying `quality_class` to the registry are not done. Simple Mode unchanged.
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

**P13b** (rest of BX-16, extended tests 16.4.4 group A): routes and the `/project` screen to confirm a plan and decide approvals, worker started from `server.ts` with a real handler, `guardModelCall` in `runAnalysis`, `writesArtifact` tied to the artifact registry (P14). Build it with `npm run patch:pack`. Then **P15** (BX-18). Plan: TZ 16.4.2.
