# P15 cumulative patch report — P13b + P15

## Status: PARTIAL (CI and Railway green on commit 1c2719d; owner manual checks confirmed; G2 and E-01 evidence not recorded; ADR-10 interim decision only)

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
| ADR-10 decision on `model_patch` | INTERIM | Owner decision 2026-10-11 in `docs/ADR-10-code-executor.md`: `manual` stays the path, `model_patch` is off; the final ADR-10 decision stays pending E-01 data |

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

## Evidence recorded on 2026-10-11

Taken from the owner's screenshots of GitHub and Railway (device time 17:47) and from the CI logs the owner sent.

| Item | Result |
|---|---|
| Checked commit on `main` | `1c2719d` |
| `/health` on the production URL | `{"status":"ok","version":"1.6.0","commit":"1c2719d18247"}`; the commit matches GitHub |
| GitHub checks on that commit | green check mark (`ci`, `ui-check` and the Railway check) |
| `ui-check` (Playwright, `npm run test:ui`) | passed in CI (44 s on the previous commit `26ea7ae`, green on the last commit) |
| Railway | deployment of that commit is Active, "Deployment successful" |
| History | commit `26ea7ae`: `ci` failed once at `test:p15` because this report had no `NOT_RUN` in the E-01 row; fixed in `1c2719d` |
| Simple Mode and Project Mode | the owner states he checks both by hand after every patch and fixes the program until it works; P01–P15 were accepted this way |

Not recorded and therefore not claimed: per-step results of TZ 18.1, the number of model calls in the scenario, the E-01 table (three pairs), the output of `verify:connections` after the latest changes, the result of the `verify-groq` workflow.

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
| GitHub Actions `ci` and `ui-check` on commit `1c2719d` | green (owner's screenshot) |

Defects found and fixed in this pass: a type error in `server.ts` (`createPlan` source) that failed `npm run build`; a SIGTERM handler that never ended the process; `migrate.mjs` failed when the database was not ready yet; `npm start` now uses `exec node` so the server gets signals.

## Still open

Owner:
1. Open the logs of the previous Railway deployment (the one stopped when `1c2719d` started: Deployments → History → that deployment → View logs) and check that `npm error signal SIGTERM` and `SSL error: unexpected eof` are absent. Applies only if that deployment already contained the fixed `server.ts` and `package.json`. Send the logs to the agent to record the result here.
2. Fill in the G2 and E-01 data from his notes (steps of 18.1, model-call count; E-01 table: patch applies, CI first try, repairs, human time, cost, CI link). Then G2 and E-01 can become PASS, together with an update of `tests/p15-acceptance.test.mjs`, which guards the E-01 row.
3. Make the final ADR-10 decision by the rule of TZ 11.9 once the E-01 table exists.

Automated or needing keys:
1. `verify-groq` workflow (Actions → verify-groq → Run workflow; needs the `GROQ_API_KEY` secret). Gemini has no workflow.
2. Golden-eval on real providers (`npm run eval:golden` uses fake adapters only; needs a code change to run live).
3. Scripted TZ 18.1 scenario against a disposable database and a real provider, 12-call cap.
4. Provider failures 429/5xx with a real provider (fault injection).
