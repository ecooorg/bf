# P11 — Task/Run state machine and idempotency ★

**Goal.** Tasks and Runs exist as database records with a strict state machine, optimistic versions, an event for every transition, and idempotent creation/enqueue. PASS is impossible without a recorded validation. A lost or failed run never becomes PASS. TZ: 8.1, 8.2, 16.4 (P11), BX-15.a. Builds on P09/P10.

**Base.** Repository archive after P10. `baseCommit`: `____` (owner fills at the start of implementation).

**Defaults chosen (owner may change before approval).** (1) New migration `005`: tables `tasks`, `runs`, `task_events`. (2) `input_fingerprint` = SHA-256 of the canonical JSON of the task input. (3) `runAnalysis` (slice S1) is **not** wired to Task/Run in P11. (4) Domain service only: no HTTP routes, no UI. (5) `max_attempts` default **3**.

**Delivered with this kit (not to be rewritten in the implementation patch).** `docs/P11-SPEC.md`, `tests/p11-acceptance.test.mjs` (no database), `tests/p11-live-acceptance.test.mjs` (PostgreSQL); both protected by Test Integrity.

**May change.** New `server/taskMachine.ts` (pure), `server/taskService.ts` (database), `migrations/005_tasks_runs.sql`; `package.json` (`test:p11` added to `check`; the live file added to `test:database:live`); `docs/CURRENT_STATE.md`, `docs/REPO_MAP.md`, `CHANGELOG.md`.

**Must not change.** Simple Mode and `server.ts`; Router, adapters, ledger, `analysisService.ts`, registry, migrations 001–004; all earlier tests and `tests/p08-*`, `tests/p09-*`, `tests/p10-*`, `tests/p11-*`.

## 1. Task input and fingerprint
Task input (zod, strict): `{task:string, artifactRefs:string[], stateVersion:int|null, profile:string|null, profileVersion:string|null, criteria:string[]}`. `taskFingerprint(input)` = SHA-256 hex (64 chars) of canonical JSON: keys sorted, `artifactRefs` sorted. Key order and artifact order do not change it; any other change does.

## 2. Task states (TZ 8.1)
`TASK_STATES = DRAFT, READY, QUEUED, RUNNING, VALIDATING, PASS, FAIL, BLOCKED, CANCELLED`. Allowed transitions:

| From | To |
| --- | --- |
| DRAFT | READY, CANCELLED |
| READY | QUEUED, BLOCKED, CANCELLED |
| QUEUED | RUNNING, BLOCKED, CANCELLED, FAIL |
| RUNNING | VALIDATING, FAIL, BLOCKED, CANCELLED |
| VALIDATING | PASS, FAIL, BLOCKED, CANCELLED |
| PASS | VALIDATING, only with reason `input_changed` |
| FAIL | READY (only while attempts used < `max_attempts`), CANCELLED |
| BLOCKED | READY, FAIL, CANCELLED |
| CANCELLED | none |

`assertTaskTransition(from, to, ctx)` throws `TaskError`:
- `INVALID_TRANSITION` for anything not in the table.
- `RUN_API_REQUIRED` when `from` or `to` is QUEUED or RUNNING and `ctx.via !== 'run'` (these moves belong to the Run API).
- `VALIDATION_REQUIRED` for `VALIDATING → PASS` unless `ctx.validation = {passed:true, evidence:[≥1 non-empty string]}`.
- `ATTEMPTS_EXHAUSTED` for `FAIL → READY` when `ctx.attemptsUsed >= ctx.maxAttempts`.

## 3. Run states (TZ 8.1)
`RUN_STATES = QUEUED, RUNNING, SUCCEEDED, FAILED, TIMED_OUT, CANCELLED, ABANDONED`. `QUEUED → RUNNING | CANCELLED`; `RUNNING → SUCCEEDED | FAILED | TIMED_OUT | CANCELLED | ABANDONED`; the rest are final. A retry is a new Run; earlier Runs are never overwritten. `runEffectOnTask(status)`: SUCCEEDED → `VALIDATING`; FAILED, TIMED_OUT → `FAIL`; CANCELLED → `CANCELLED`; ABANDONED → `BLOCKED` with reason `recovery`. No status maps to PASS.

## 4. Errors
`TaskError(code, message, status)`: `NOT_FOUND` 404, `VERSION_CONFLICT` 409, `IDEMPOTENCY_CONFLICT` 409, `INVALID_TRANSITION` 409, `RUN_API_REQUIRED` 409, `VALIDATION_REQUIRED` 409, `ATTEMPTS_EXHAUSTED` 409, `INPUT_LOCKED` 409. `DEFAULT_MAX_ATTEMPTS = 3`.

## 5. Database (`migrations/005_tasks_runs.sql`, `server/taskService.ts`)
- `tasks`: id, project_id (FK, cascade), title, input jsonb, input_fingerprint, idempotency_key, state, version (starts at 1, +1 per change), max_attempts, blocked_reason (null or text), validated_fingerprint, timestamps; `UNIQUE (project_id, idempotency_key)`.
- `runs`: id, task_id (FK), project_id, attempt, status, idempotency_key, input_fingerprint, input_refs jsonb, profile, profile_version, provider_id, model_id, policy_version, budget jsonb, evidence jsonb (default `[]`), queued_at, started_at, finished_at; `UNIQUE (task_id, attempt)`, `UNIQUE (task_id, idempotency_key)`. Unknown values are `null`, never invented.
- `task_events`: id, task_id, project_id, run_id (nullable), event_type, from_state, to_state, actor, details jsonb, created_at. Event types: `task.created`, `task.transition`, `task.input_changed`, `task.pass_invalidated`, `run.queued`, `run.started`, `run.finished`.
- Every state change happens in one transaction, with the task row locked (`FOR UPDATE`), the version checked and one event written.

## 6. Service functions (all return camelCase objects)
- `createTask({projectId, idempotencyKey, title, input, maxAttempts?, actor})` → `{task, created}`. Same key and same fingerprint → the existing task, `created:false`. Same key and a different fingerprint → `IDEMPOTENCY_CONFLICT`. The key is unique per project. New task is `DRAFT`, version 1.
- `getTask(id)`, `listRuns(taskId)` (by attempt), `listTaskEvents(taskId)` (in order).
- `transitionTask({taskId, expectedVersion, to, actor, reason?, validation?})` → task. Stale `expectedVersion` → `VERSION_CONFLICT`. Applies `assertTaskTransition` with `via` unset, so moves into or out of QUEUED/RUNNING are refused. A blocked task keeps `blockedReason`; leaving BLOCKED clears it. PASS stores `validated_fingerprint`.
- `changeTaskInput({taskId, expectedVersion, input, actor})` → task. Allowed in DRAFT, READY, FAIL, BLOCKED (fingerprint updated, event `task.input_changed`) and in PASS (state returns to VALIDATING, event `task.pass_invalidated`: a new validation is required). In QUEUED, RUNNING, VALIDATING, CANCELLED → `INPUT_LOCKED`.
- `enqueueTask({taskId, expectedVersion, idempotencyKey, actor})` → `{task, run, created}`. Under the task lock: if a Run with this key exists, return it (`created:false`, no change; a different fingerprint → `IDEMPOTENCY_CONFLICT`). Otherwise check the version, require state READY, require runs so far < `max_attempts` (else `ATTEMPTS_EXHAUSTED`), create Run `QUEUED` with `attempt = previous + 1`, copy profile, profile version, input refs and fingerprint, move the task to QUEUED.
- `startRun({runId, actor})` → `{task, run}`: run `QUEUED → RUNNING`, task `QUEUED → RUNNING`, `started_at` set.
- `finishRun({runId, status, actor, providerId?, modelId?, policyVersion?, budget?, evidence?})` → `{task, run}`: run to the final status (`finished_at` set, provider/model/policy/budget/evidence stored), task moved by `runEffectOnTask`; `ABANDONED` sets `blockedReason = 'recovery'`. Allowed statuses from QUEUED: only `CANCELLED`.

## 7. PASS criteria
- Machine: `npm ci`, `npm run check` (with `test:p11`), `npm run build`; `test:database:live` including `tests/p11-live-acceptance.test.mjs`.
- Owner: nothing to click; read the spec and tests before approval. After implementation the CI run is the evidence.

## 8. Not done / postponed
Queue, worker, lease, heartbeat, recovery producer of `ABANDONED` (P12); budgets, `BLOCKED(budget)`, approvals, Task Graph, Task limit of 12 calls and Project limit (P13); wiring `runAnalysis` to Task/Run; HTTP routes and UI.

**`CHANGELOG.md`.** `P11: BX-15.a. Task/Run state machine (server/taskMachine.ts, server/taskService.ts, migration 005: tasks, runs, task_events): strict transitions, optimistic versions, an event per transition, idempotent createTask/enqueueTask by key and input fingerprint, PASS only with recorded validation and evidence, a lost or failed run never becomes PASS (ABANDONED -> BLOCKED(recovery)), changed input invalidates PASS. No routes or UI; Simple Mode and S1 untouched.`
