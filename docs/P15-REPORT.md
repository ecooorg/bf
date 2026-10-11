# P15 cumulative patch report — P13b + P15

## Status: PARTIAL (implementation added; G2 and E-01 are not claimed PASS)

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
| API and UI wiring | IMPLEMENTED; automated test status pending local dependency install | Source and invariant tests in this patch |
| Human approval required before plan tasks exist | IMPLEMENTED in `planService.ts`; test included | Live PostgreSQL test not run here |
| Worker starts and polls queue | IMPLEMENTED behind Project Mode + DB + Gemini configuration | Live startup and queue run not verified in this environment |
| Pre-call budget guard and Run-linked ledger | IMPLEMENTED in worker analysis path | Requires live DB/provider test for operational confirmation |
| Artifact Registry output | IMPLEMENTED through existing `saveArtifact` path | Live manifest/hash verification not run here |
| Full E2E scenario, TZ 18.1 / G2 | NOT_RUN | Must be executed against a disposable DB and configured provider; expected limit remains 12 model calls |
| Provider failures 429/5xx and fallback in full E2E | NOT_RUN | Requires controlled provider stubs/fault injection or dedicated integration environment |
| Budget-overrun human approval in a live worker run | NOT_RUN | Requires live PostgreSQL integration test |
| E-01, TZ 11.9 | NOT_RUN | Requires three real task pairs (`manual` and `model_patch`), prewritten acceptance tests, timing/cost evidence |
| ADR-10 decision on `model_patch` | PENDING | No result is inferred from fake-provider runs or static tests |

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
