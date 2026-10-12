# Current state

> Updated at the end of every patch (AGENTS.md section 8). Rebuilt in P17: the previous file in the archive held a copy of a script instead of this document. This version is compiled from `CHANGELOG.md`, `docs/NEXT.md` and the patch reports; anything not stated there is not claimed here.

## Product

- **Simple Mode** (`/`): works; internal version 1.6.0; not changed by P16 or P17.
- **Project Mode** (`/project`, opt-in, PostgreSQL): built patch by patch from `docs/BiForge_TZ_v3.md` (plan: TZ 16.4.2).

## Done (see `CHANGELOG.md` for details)

| Patch | Result |
| --- | --- |
| P02-P03 | Provider adapter contract, model registry, Router-min, fake provider, conformance tests |
| P04 | Artifacts, usage ledger, `connection_checks`, `connectors.yaml` v1, `npm run verify:connections` |
| P05-P06 | State pipeline (model items always `proposed`), context builder, analysis service and routes (slice S1) |
| P07 | Universal OpenAI-compatible adapter; Groq in the registry and in `verify:connections` |
| P08-P10 | Router v1, fallback matrix, model health, quotas, golden-eval |
| P11-P12 | Task/Run state machine, job queue and worker |
| P13, P13b | Budgets, Task Graph, approvals; plan/approval/task routes and UI, worker wired into `server.ts` |
| P13a | `npm run patch:pack` and the CI result line |
| P14 | Full Artifact Registry (manifests, tamper detection, limits) |
| P15 | Project Mode wiring; owner manual checks confirmed 2026-10-11 |
| P16 | GitHub App connection check, signed webhook, read of PRs / PR files / check runs, Task Package commit to `biforge/<task_id>` (library only, writes off by default, no merge) |
| P17 | Gate Engine (`server/gateEngine.ts`, `server/gateService.ts`, migration 009): evidence from CI via webhook, Test Integrity, invalidation on a new commit, human waiver, Release Candidate manifest; routes `GET .../tasks/:taskId/gates`, `POST .../gates/:gate/waive` |
| P18 | CodeExecutor and `manual` executor (`server/codeExecutor.ts`, `server/codeTaskService.ts`, migration 010): Task Package, PACKAGE.md export, PR / branch / diff results with 11.4 validation, diff upload through the Git Data API (off by default), webhook and polling PR lookup; routes under `.../tasks/:taskId/code` |

CI fix applied before P17: `connectors.yaml` (literal `\n` in the `github` block made it invalid JSON) and the `github` row in `docs/CONNECTIONS.md`.

## Open

- Owner: GitHub App creation and installation (TZ E.5), then `npm run verify:connections -- --only github` and a signed `check_run` for a `biforge/<task_id>` branch (REAL_ONLY until done). ADR-06 stays proposed (repository visibility/organization, Actions limits).
- G2 and E-01 evidence and the final ADR-10 (see `docs/NEXT.md`); `model_patch` stays disabled; BX-18.b is NOT_RUN.
- P17 limits: no UI for gates; no route for `requirements` / `spec` / `review` approvals (`recordApproval` exists as a service function); Task PASS is not yet tied to gate results.
- P18 limits: no UI; no separate package approval and no `sensitivity = high` hand-over; the Task Package is not committed to the task branch (conflicts with the P17 Test Integrity rule; decision needed in P20, see `docs/P18-SPEC.md`); a code run does not move the Task or gates; real GitHub App not exercised (REAL_ONLY).
- Next in the plan: P15a (monitoring of connections and quotas), P19 (`model_patch`, only if E-01 allows). Not started: the owner gives the command.
