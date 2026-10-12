# P12 report (BX-15.b)

Tool/model: Claude (Anthropic chat environment). Base: `bf-p12.zip` (state after P11, without the P12 kit); kit: `bf-p12-kit.zip`.

## Commands and results
- `npm ci`: exit 0. `npm run typecheck`: no errors. `npm run test:p12`: 7/7.
- Local PostgreSQL 16 (installed in the sandbox), `npm run db:migrate`: 001-006 applied.
- `tests/p12-live-acceptance.test.mjs`: 14/14, four runs in a row (the two timer-based tests were stable).
- `npm run test:database:live`: 34/34 (includes the P11 live tests). `npm run test:bx06:api`: exit 0.
- `npm run check` (without `DATABASE_URL`) and `npm run build`: see the chat report for the final result.
- Not run: GitHub CI on `main`, `test:ui`.

## Deviation: protected test changed (needs the owner's approval)
`tests/p12-live-acceptance.test.mjs`, test "worker.start recovers a job left by a dead worker". The kit version claimed the job with `now` 120 s in the past; `available_at` of the job is the real time, so `claimJob` correctly returned `null` (SPEC section 3: `available_at <= now`), the job stayed queued and the worker ran it. The defect was in the test. One line changed: the dead worker claims with `leaseMs: 1` and the test waits 50 ms. It checks the same thing (restart recovery). If not approved, restore the kit version; that test then fails.

## Changed
New: `migrations/006_jobs.sql`, `server/queueMachine.ts`, `server/queueService.ts`, `server/worker.ts`, `docs/P12-SPEC.md`, `docs/P12-REPORT.md`, `tests/p12-acceptance.test.mjs`, `tests/p12-live-acceptance.test.mjs`.
Changed: `server/taskService.ts` (`enqueueTask` inserts the job; `startRun`/`finishRun` split into `startRunInTx`/`finishRunInTx`, the latter closes the job; some helpers exported), `package.json`, `docs/CURRENT_STATE.md`, `docs/REPO_MAP.md`, `CHANGELOG.md`.

## Decisions beyond the SPEC
- Claim and recovery lock the job and its task in one statement (`FOR UPDATE OF j, t SKIP LOCKED`), so they never wait and cannot deadlock with `finishRun` (lock order task, then job).
- Recovery takes one job per transaction, until none is left.
- A handler result with an unknown status is stored as `FAILED` with evidence `worker:invalid_result`.
- Runs queued before migration 006 (none exist in production: no routes yet) have no job.

## Not done
Per SPEC section 7: starting the worker from `server.ts`, a real handler, concurrency limit and budgets (P13), automatic retry, priorities, backoff, routes, UI.
