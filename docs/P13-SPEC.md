# P13 — Budgets, Task Graph v1, approvals

**Goal.** Limits on calls, tokens, units, time, attempts and code tasks are checked before every model call; over budget the Task becomes `BLOCKED(budget)` and a human gets one approval request. A plan is a validated graph that runs only after a human approves it; at most 2 Runs per project run at once. TZ: 8.1, 8.2, 8.4-8.6, 16.4 (P13), BX-16. Builds on P12.

**Base.** Archive `bf-p12.zip` (repository after P12).

**Defaults chosen.** (1) Migration `007`: `budgets`, `project_settings`, `plans`, `plan_tasks`, `approvals`. (2) Limits (all optional, null = none): `max_model_calls`, `max_tokens`, `max_cost_units`, `max_wall_clock_ms`, `max_attempts`, `max_code_tasks`, on scopes `project`, `task`, `run`; spend is read from `usage_ledger` and `runs`. (3) Violation = used + requested > limit. (4) A first budget or a lower one may be set by anyone; a higher one (or a removed limit) only by a human (`actorKind: 'human'`). (5) Plan = up to 12 nodes `{key, title, task, profile, deps, units, writesArtifact, criteria}`; the validator refuses cycles, unknown or repeated dependencies, duplicates, and a total of `units` above the project `max_cost_units`. One static template `spec_arch_review_approval`. (6) Approval modes: `supervised` (default) and `manual` (every task start of a plan needs an approved `task_start`); no autonomous mode and no flag for it. (7) Concurrency 2 per project (`project_settings.max_concurrent_runs`, changed by a human); `claimJob` applies the limit only when the project has a settings row (created when a plan is approved) or `maxConcurrent` is passed, so P12 behaviour is unchanged. (8) A Run stopped by the guard ends `FAILED` with `blockReason: 'budget'`: the Task becomes `BLOCKED(budget)`; never PASS.

**May change.** New `server/planMachine.ts` (pure), `server/planService.ts`, `migrations/007_budgets_plans_approvals.sql`, `tests/p13-*.test.mjs`. In `server/taskService.ts`: `createTaskInTx`, `transitionTaskInTx`, `enqueueTaskInTx` (same behaviour, now callable inside a transaction), `blockReason` in `finishRunInTx`. In `server/taskMachine.ts`: optional `blockReason` of `runEffectOnTask`. `server/queueService.ts` (`maxConcurrent`, `blockReason`), `server/worker.ts` (`maxConcurrent`; a `BUDGET_EXCEEDED` error from the handler ends the Run with `blockReason: 'budget'`). `package.json`, docs, `CHANGELOG.md`.

**Must not change.** Simple Mode, `server.ts`, Router, adapters, ledger, registry, migrations 001-006, earlier tests.

## API (`server/planService.ts`)
`setBudget`, `getBudget`, `guardModelCall({taskId, runId?, request?, actor})` (throws `PlanError BUDGET_EXCEEDED` with `details.violations` and `details.approvalId`), `createPlan({projectId, source: template|model|human, ...})` (stores the plan `PENDING` and opens a `plan` approval; nothing runs), `decideApproval` (human only; APPROVED plan creates READY tasks with unit budgets and supersedes the previous approved plan; a budget approval needs new limits and returns the Task to READY; REJECTED fails it), `enqueuePlanTask` (approved plan, dependencies PASS, no other active writer of the same artifact, Manual-mode approval, budget for one more attempt and call), `requestApproval`, `listApprovals`, `hasApproval`, `getPlan`, `listPlanTasks`, `getProjectSettings`, `setProjectSettings`.

## PASS criteria
`npm run check` (with `test:p13`), `npm run build`; `test:database:live` including `tests/p13-live-acceptance.test.mjs`. Over budget -> `BLOCKED`; a cycle is refused; without approval a plan does not start.

## Not done / postponed (P13.b)
HTTP routes and the `/project` screen where the owner confirms a plan (the owner check "confirm a task plan" is not possible yet); starting the worker from `server.ts` with a real handler; wiring `guardModelCall` into `runAnalysis`; model-proposed plan generation (only the validation and storage of a proposal); automatic retry.
