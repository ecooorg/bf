# P12 — Job queue, worker, lease, recovery ★

**Goal.** Queued Runs are executed by a worker that takes jobs from a PostgreSQL table with `FOR UPDATE SKIP LOCKED`, holds a lease and refreshes a heartbeat. A Run whose lease expired becomes `ABANDONED`, its Task becomes `BLOCKED(recovery)`. A lost worker never leads to PASS. TZ: 8.3 (and 8.1), 16.4 (P12), BX-15.b, D-05. Builds on P11.

**Base.** Repository archive after P11. `baseCommit`: `____` (owner fills at the start of implementation).

**Defaults chosen (owner may change before approval).** (1) New migration `006`: table `jobs`, one job per Run. (2) Lease 60 000 ms, heartbeat 20 000 ms, poll 2 000 ms. (3) The worker is a library: `createWorker()` is **not** started from `server.ts` in P12 (no handler exists yet; wiring comes with P13/P15). (4) One job at a time per worker; the concurrency limit is P13. (5) **No automatic retry** after recovery: a human moves `BLOCKED -> READY` and enqueues a new Run (attempts still limited by `max_attempts`). (6) Strict lease: a heartbeat or completion at or after `lease_until` is refused. (7) No new environment variables; timing comes from options.

**Delivered with this kit (not to be rewritten in the implementation patch).** `docs/P12-SPEC.md`, `tests/p12-acceptance.test.mjs` (no database), `tests/p12-live-acceptance.test.mjs` (PostgreSQL); both protected by Test Integrity. The tests were checked for syntax only; no reference implementation exists.

**May change.** New `server/queueMachine.ts` (pure), `server/queueService.ts` (database), `server/worker.ts`, `migrations/006_jobs.sql`. In `server/taskService.ts` only: `enqueueTask` (also inserts the job) and `finishRun` (also closes the job), plus an internal shared-transaction helper if `claimJob` needs it. `package.json` (`test:p12` added to `check`; the live file added to `test:database:live`); `docs/CURRENT_STATE.md`, `docs/REPO_MAP.md`, `CHANGELOG.md`, `docs/P12-REPORT.md`.

**Must not change.** Simple Mode and `server.ts`; `server/taskMachine.ts`; Router, adapters, ledger, `analysisService.ts`, registry, migrations 001–005; all earlier tests (`tests/p11-*` must still pass) and `tests/p12-*`.

## 1. Table `jobs` (`migrations/006_jobs.sql`)
`id` text PK; `seq` bigserial (FIFO order); `run_id` text NOT NULL **UNIQUE**, FK `runs` (cascade); `task_id`, `project_id` (FK, cascade); `status` in `QUEUED, LEASED, DONE, ABANDONED, CANCELLED` (default `QUEUED`); `available_at` timestamptz default now(); `claims` integer default 0; `lease_owner` text null; `lease_until` timestamptz null; `heartbeat_at` timestamptz null; `created_at`; `finished_at` null. Index for claiming (`status, available_at, seq`).

## 2. Pure module `server/queueMachine.ts`
`JOB_STATES` (order as above); `DEFAULT_LEASE_MS = 60000`, `DEFAULT_HEARTBEAT_MS = 20000`, `DEFAULT_POLL_MS = 2000`.
`QueueError(code, message, status?)`: `LEASE_LOST` 409, `NOT_FOUND` 404, `INVALID_TIMING` 400, `INVALID_STATUS` 400.
`leaseUntil(now: Date, leaseMs): Date`. `isLeaseExpired(until: Date, now: Date)`: true when `now >= until`.
`validateTiming({leaseMs, heartbeatMs})`: positive integers and `heartbeatMs * 2 <= leaseMs`, else `INVALID_TIMING`.
`jobStatusForRun(status)`: SUCCEEDED, FAILED, TIMED_OUT → `DONE`; CANCELLED → `CANCELLED`; ABANDONED → `ABANDONED`; QUEUED, RUNNING → throws.

## 3. Service `server/queueService.ts` (camelCase objects; every `now` is optional and defaults to the current time, tests pass it explicitly)
Every change: one transaction, rows locked, events written. Selection of work uses `FOR UPDATE SKIP LOCKED`.
- `claimJob({workerId, projectId?, now?, leaseMs?})` → `{job, run, task} | null`. Takes the oldest (`seq`) `QUEUED` job with `available_at <= now` whose Run is still `QUEUED` (and, with `projectId`, only that project). In **one transaction**: job `LEASED`, `lease_owner`, `lease_until = now + leaseMs`, `heartbeat_at = now`, `claims + 1`; the Run and the Task start exactly as `startRun` does (`run.started`, `task.transition` to RUNNING). No job → `null`.
- `heartbeatJob({jobId, workerId, now?, leaseMs?})` → job. Job must be `LEASED`, owned by `workerId`, not expired; sets `heartbeat_at = now`, `lease_until = now + leaseMs`. Anything else → `LEASE_LOST`; unknown id → `NOT_FOUND`.
- `completeJob({jobId, workerId, status, actor?, providerId?, modelId?, policyVersion?, budget?, evidence?, now?})` → `{task, run, job}`. `status` is `SUCCEEDED | FAILED | TIMED_OUT`, otherwise `INVALID_STATUS`. Same lease checks as the heartbeat (nothing changes on `LEASE_LOST`). Then `finishRun` in the same transaction; `actor` defaults to `workerId`.
- `recoverExpired({projectId?, now?, actor?})` → `[{jobId, runId, taskId}]`. For every `LEASED` job with `lease_until <= now` (selected with `SKIP LOCKED`): Run `ABANDONED`, Task `BLOCKED` with `blockedReason = 'recovery'`, job `ABANDONED`. Idempotent: a second call returns `[]`; concurrent calls recover each job once. Default `actor` is `system`.
- `getJob(id)`, `getJobByRun(runId)` → job or `null`. Job fields: `id, runId, taskId, projectId, status, availableAt, claims, leaseOwner, leaseUntil, heartbeatAt, createdAt, finishedAt`.

## 4. `server/taskService.ts` changes
- `enqueueTask` inserts the job in the same transaction as the Run (a replay with the same key creates no second job).
- `finishRun` closes the job of the Run in the same transaction by `jobStatusForRun` (sets `finished_at`). A Run started directly with `startRun` keeps its job `QUEUED` until `finishRun` closes it; such a job is never claimable (its Run is not `QUEUED`) and is not covered by recovery.
- All P11 behaviour and tests stay as they are.

## 5. Worker `server/worker.ts`
`createWorker({workerId, handler, projectId?, leaseMs?, heartbeatMs?, pollMs?})` → `{tick, start, stop}`. Empty `workerId` or invalid timing (`validateTiming`) throws `QueueError`.
- `handler({job, run, task, signal}) → {status: 'SUCCEEDED'|'FAILED'|'TIMED_OUT', providerId?, modelId?, policyVersion?, budget?, evidence?}`.
- `tick()` → `'idle' | 'done' | 'lease_lost'`: (1) `recoverExpired` (scoped by `projectId`), (2) `claimJob`; none → `'idle'`; (3) run the handler while a timer calls `heartbeatJob` every `heartbeatMs`; (4) `completeJob`. A handler that throws completes the Run as `FAILED` with `evidence = ['worker:handler_error']`; the error message is never stored. If a heartbeat or the completion gives `LEASE_LOST`: the timer stops, `signal` is aborted, nothing is written, result `'lease_lost'`. The timer is always cleared.
- `start()` resolves after one recovery pass (this is the restart recovery of TZ 8.3), then polls with `tick()` every `pollMs` (immediately again after a `'done'`). `stop()` stops polling and waits for the tick in flight.

## 6. PASS criteria
- Machine: `npm ci`, `npm run check` (with `test:p12`), `npm run build`; `test:database:live` including `tests/p12-live-acceptance.test.mjs` and the P11 live tests.
- Owner: nothing to click; read the spec and tests before approval. After implementation the CI run is the evidence.

## 7. Not done / postponed
Starting the worker from `server.ts`; a real handler; concurrency limit, budgets, `BLOCKED(budget)`, approvals, Task Graph (P13); automatic safe retry after recovery; job priorities, backoff, scheduled jobs; HTTP routes and UI; a separate worker service.

**`CHANGELOG.md`.** `P12: BX-15.b. Job queue and worker (server/queueMachine.ts, server/queueService.ts, server/worker.ts, migration 006: jobs): FOR UPDATE SKIP LOCKED claim, lease and heartbeat, expired lease -> Run ABANDONED and Task BLOCKED(recovery), recovery pass on worker start, a lost worker never becomes PASS; enqueueTask creates the job and finishRun closes it. Worker is not started from server.ts; Simple Mode and S1 untouched.`
