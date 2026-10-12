# P20 — Task Package: brief_writer, approval, integrity baseline

**Goal.** A human can build a Task Package draft (`brief_writer`), approve it, optionally commit package files to `biforge/<task_id>`, and acceptance tests declared in the package no longer cause a false Test Integrity FAIL.

**Base.** Owner archive bf-v19 (green main through P19 / plan 16.4.2.a).

**May change.** `server/briefWriter.ts` (new), `server/gateEngine.ts`, `server/gateService.ts`, `server/codeTaskService.ts`, `server.ts`, `migrations/011_code_task_package_approval.sql`, tests, docs, product version 20.

**Must not change.** Simple Mode behaviour; merge still never automated; `model_patch` remains gated; no full UI required.

## Behaviour

1. **brief_writer** — `buildTaskPackageFromBrief` builds a schema-valid Task Package from goal/constraints/paths. API: `POST .../tasks/:taskId/code/brief`.
2. **Approval** — `POST .../code/:codeTaskId/approve` sets `package_approved_at`. Export of `sensitivity=high` packages requires approval (TZ 13.6).
3. **Package commit** — `POST .../code/:codeTaskId/commit-package` commits SPEC/ACCEPTANCE/EXECUTOR_PROMPT under `.biforge/tasks/<id>/`, AGENTS.md, and `tests/acceptance/**` from the package when GitHub writes are enabled (`GITHUB_DIFF_UPLOAD` or `model_patch`). PACKAGE.md stays an artifact only.
4. **Test Integrity baseline** — `evaluateTestIntegrity(files, { packageAcceptancePaths })` ignores package-declared acceptance paths; other acceptance paths still FAIL. Gate webhook loads paths from the open/latest code_tasks package.

## PASS criteria

- Machine: `npm run test:p20`, `npm run test:gate`, `npm run check`, `npm run build`.
- Owner: 1) `POST .../code/brief` with a goal → package JSON. 2) `POST .../code/start` with that package → code task. 3) `POST .../approve` → `packageApprovedAt` set. 4) (Optional, writes on) `commit-package` → branch `biforge/<task>`.

## Read in the TZ

11.2 (`brief_writer`), 11.3, 12.4, 13.6, 16.4.2.a.

## Not done / postponed

- Model-filled brief (LLM profile) — structure only; human/API supplies text.
- P20b: Task PASS tied to gates.
- Write permissions on the live App remain off until the owner enables them.
