# P15 cumulative patch report — P13b + P15

## Status: PARTIAL (owner manual checks confirmed 2026-10-11; automated checks re-run; evidence for G2/E-01 and the ADR-10 decision are still missing in the repository)

This patch wires the existing Task Graph / approval domain into the Project Mode API and UI, starts a bounded queue worker when Project Mode is enabled and authenticated configuration is present, and adds acceptance checks for the new integration. It also prepares a truthful P15 evidence record. It does not fabricate live PostgreSQL/provider results.

## P13b implementation in this patch

- Project Mode routes for plan creation/listing, plan tasks, approvals, human approval decisions, project settings, task listing/details, queueing and evidence-backed validation.
- Project Mode UI controls to create a template plan, approve/reject pending approvals, queue READY tasks, and explicitly validate a completed task.
- Worker lifecycle started from `server.ts` only when Project Mode, database, and Gemini API are configured; worker stops on SIGTERM/SIGINT.
- Worker handler invokes the analysis path, checks the current project state version, writes output to Artifact Registry, and leaves successful Runs in `VALIDATING` until a human supplies validation evidence.
- Model calls made for a Task are guarded by `guardModelCall` before each provider call; ledger entries use the persisted Run ID so task/run budget accounting can join them.
- Project ledger view/query includes both legacy project-prefixed analysis runs and Task Graph Run IDs.
- Static/invariant acceptance test added as `tests/p15-acceptance.test.mjs`, wired to `npm run check` as `test:p15`.

## P15 evidence status

| Check | Status | Evidence / limitation |
|---|---|---|
| API and UI wiring | IMPLEMENTED; automated tests PASS (2026-10-11) | `npm run test:p15` 6/6, `npm run check` exit 0 |
| Human approval required before plan tasks exist | IMPLEMENTED; PASS | `tests/p13-live-acceptance.test.mjs` on a real PostgreSQL 16 (2026-10-11) |
| Worker starts and polls queue | IMPLEMENTED; queue, lease and recovery PASS | `tests/p12-live-acceptance.test.mjs`; worker started on Railway (`Project Mode worker started` in deployment logs, 2026-10-11) |
| Pre-call budget guard and Run-linked ledger | IMPLEMENTED; guard PASS with a stub handler | Live test "budget before every model call" in `tests/p13-live-acceptance.test.mjs`; not run with a real provider |
| Artifact Registry output | IMPLEMENTED; manifest/hash PASS | `tests/p14-live-acceptance.test.mjs` |
| Full E2E scenario, TZ 18.1 / G2 | NOT_RUN | OWNER-CONFIRMED, no evidence in the repository: the owner states on 2026-10-11 that the scenario was done by hand. Not run by the agent. Add the commit SHA and output below, then G2 can be marked passed |
| Provider failures 429/5xx and fallback | PASS on fake providers; real provider NOT_RUN | `tests/p09-acceptance.test.mjs` (matrix 7.4), `tests/infra.test.mjs` |
| Budget-overrun human approval in a live worker run | PASS with a stub handler; owner-confirmed on Railway | `tests/p13-live-acceptance.test.mjs`; owner statement 2026-10-11 |
| E-01, TZ 11.9 | NOT_RUN | OWNER-CONFIRMED, no evidence in the repository: the owner states it was done. The table of three pairs (SHA, CI link, repairs, time, cost) is not in the repository yet |
| ADR-10 decision on `model_patch` | PENDING (owner decision) | Write the decision in `docs/ADR-10-code-executor.md` from the E-01 table. Until then `model_patch` stays disabled |

## Important behavior and boundaries

- Worker success means the Run completed and the Task entered `VALIDATING`; it does **not** automatically set Task `PASS`.
- The validation endpoint requires a human action and non-empty evidence. The server does not accept model-provided text alone as validation.
- This patch does not enable `model_patch`, GitHub integration, merge, or deployment.
- `PARTIAL` is not deploy approval. Do not mark G2 passed until the required E2E checks and their evidence are recorded.

## Commands to run in the project environment

```bash
npm ci
npm run test:p15
npm run check
npm run build
npm run test:database:live
```

The live database suite requires a disposable PostgreSQL database configured via the project's test environment. Run the complete TZ 18.1 scenario only after migrations are applied and a provider key is configured. Record actual command output and the checked commit SHA here before changing the status to PASS.


## Owner manual checks (recorded 2026-10-11)

The owner states that all manual checks required after patches P01–P15 are done. They are recorded here as an owner statement; the agent did not see their output.

| Check | Source | Owner status |
|---|---|---|
| Create a project, see the passport; only "BiForge" on screens | P01 | done |
| `verify:connections` for Gemini and Groq returns OK; console checks A-01 and A-02 | P04, P07 | done |
| One real analysis in Project Mode, items 1-9 of the G1a list in `docs/CURRENT_STATE.md` | P06, G1a | done |
| Read the golden-eval report `docs/GOLDEN-EVAL-REPORT.md` | P10 | done |
| Real CI summary seen; `npm run patch:pack` run | P13a | done |
| Confirm a task plan; budget overrun is visible and needs a decision | P13b | done |
| Simple Mode short check on Railway; green CI on the last commit | BX-07 closing condition | done |
| Standard scenario of TZ 18.1 (G2) and experiment E-01 | P15 | done, evidence not attached |

## Automated checks re-run by the agent (2026-10-11)

Environment: Node 22, local PostgreSQL 16, no real provider keys, no GitHub.

| Check | Result |
|---|---|
| `npm ci`, `npm run build` | PASS |
| `npm run check` (all 30+ suites, including `test:virtual`, `test:p15`) | PASS, exit 0 |
| `npm run test:database:live` (9 live files) | PASS 55/55 |
| `npm run test:bx06:api` | PASS 1/1 |
| `node scripts/migrate.mjs` on an empty and on an already migrated database; start with a database that comes up 5 s late | PASS (retry added) |
| Built server: `/health` 200; SIGTERM stops it in about 1 s | PASS |

Defects found and fixed in this pass: a type error in `server.ts` (`createPlan` source) that failed `npm run build`; a SIGTERM handler that never ended the process; `migrate.mjs` failed when the database was not ready yet; `npm start` now uses `exec node` so the server gets signals.

## Still open

Owner (see also `docs/NEXT.md`):
1. Attach the evidence for G2 and E-01 to this report: checked commit SHA, command outputs or screenshots, the E-01 table. Then change the status of these two rows from NOT_RUN to PASS (and update `tests/p15-acceptance.test.mjs` in the same patch, because it guards this row).
2. Decide ADR-10 (`model_patch`) and ADR-04 (`cross_model`); apply or reject the `provisional` `quality_class` values.
3. After the next redeploy, open the deployment logs once: `npm error signal SIGTERM` and `SSL error: unexpected eof` must be gone.

Automated or needing keys and an environment:
1. GitHub Actions `ci` on the final commit (the agent cannot see it).
2. `npm run test:ui` (Playwright, browser) — not run.
3. `npm run verify:connections` with real keys — result is in the owner's statement only.
4. Golden-eval on real providers (`npm run eval:golden` uses fake adapters only).
5. Scripted full TZ 18.1 scenario against a disposable database and a real provider with a 12-call cap, so that G2 is repeatable without hand work.
6. Provider failures 429/5xx with a real provider (fault injection).
