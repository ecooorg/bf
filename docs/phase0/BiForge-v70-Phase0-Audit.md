# BiForge v70 — Phase 0 Forensic Audit

**Status:** completed for Navigator review (p71)  
**Baseline:** owner-provided archive `bf-v70` (product label still `57` in `src/config.ts` / `package.json`)  
**Scope:** static inventory and dependency analysis only. No source code was modified.  
**Runtime checks:** not executed in this environment (no `npm ci`, no PostgreSQL, no browser). Treat all functional claims as unproven until `npm run check` and authorized live suites pass on the Navigator’s machine.

---

## 1. Executive summary

| Metric | Value |
|--------|------:|
| Tracked source/style/SQL/script files (inventory) | 184 |
| TypeScript/TSX modules | ~129 |
| Total TS/TSX lines (approx.) | ~25 800 |
| Largest unit | `server.ts` — 2 993 lines |
| Second largest | `src/App.tsx` — 2 947 lines |
| Confirmed import cycles | 2 (task/gate/codeTask cluster) |
| Literal `app.*` route registrations in `server.ts` + health | 81 |
| SQL migrations | 14 |
| Test files under `tests/` | 19 (~12 k lines) |
| `tsconfig.server.json` strict | **false** |
| Active documentation set | 5 files under `docs/` + `AGENTS.md` (legacy 01–18 retired) |

**Primary risks for AI-driven maintenance**

1. Oversized entrypoints (`server.ts`, `App.tsx`) force large context for small changes.  
2. Cyclic dependency among `taskService` ↔ `gateService` ↔ `codeTaskService`.  
3. Non-strict server TypeScript allows whole classes of errors to reach runtime.  
4. Many environment variables used in code are absent from `.env.example` (documentation drift).  
5. Documentation is already AI-oriented after the foundation patch; further work must not reintroduce stale hand-maintained inventories.

---

## 2. Module inventory (highlights)

Full table: `docs/phase0/module-inventory.csv`.

### 2.1 Largest production modules

| Lines | Path | Notes |
|------:|------|-------|
| 2993 | `server.ts` | Express bootstrap + vast majority of HTTP routes |
| 2947 | `src/App.tsx` | Root React composition and mode switching |
| 949 | `server/codeTaskService.ts` | Code-task lifecycle, package, repair, PR sync |
| 700 | `server/webSearch.ts` | Search providers and formatting |
| 623 | `src/ConversationFiles.tsx` | Conversation attachment UI |
| 563 | `src/WorkspacePanel.tsx` | Workspace UI |
| 556 | `src/workspace/extract.ts` | Archive extraction |
| 540 | `src/ProjectMode.tsx` | Project Mode UI |
| 521 | `src/decision.ts` | Decision helpers |
| 519 | `src/workspace/changeset.ts` | Change-set logic |
| 513 | `server/codeExecutor.ts` | Code execution / model_patch path |
| 420 | `server/files.ts` | Upload and attachment pipeline |

### 2.2 Suggested split boundaries (for Phase 2, not applied here)

**`server.ts`** — keep only: app creation, global middleware (auth, body limits, CORS/same-origin, rate limits), error handler, listen. Extract route groups:

- authentication / session  
- projects + state + versions  
- plans / tasks / queue / budgets / approvals  
- code tasks + artifacts + gates  
- conversation / analysis / document export  
- ops / health (already partially in `healthRoutes.ts`)

**`src/App.tsx`** — keep composition and top-level mode routing; move mode-specific panels and heavy state machines into existing or new cohesive components.

**`server/codeTaskService.ts`** — separate pure lifecycle transitions, package export, PR sync, and repair-loop orchestration after cycle is broken (see §3).

Do **not** split by line count alone. Prefer stable responsibility and existing tests as anchors.

---

## 3. Dependency graph and cycles

Summary file: `docs/phase0/dependency-graph.json`.

### 3.1 Confirmed cycles

```
server/taskService.ts
  → server/gateService.ts
    → server/codeTaskService.ts
      → server/taskService.ts

server/gateService.ts
  → server/codeTaskService.ts
    → server/gateService.ts
```

**Cause (static):**

- `codeTaskService` imports `getTask` / `inTx` / `lockTask` from `taskService` and `getTaskGates` / `recordApproval` from `gateService`.  
- `gateService` imports `syncCodeTaskFromPullRequest` from `codeTaskService`.  
- `taskService` imports `getTaskGates` from `gateService`.

**Impact:** any change in one of the three modules may require understanding the other two; initialization order and mocking in tests become fragile.

**Recommended resolution (Phase 2, separate patch):** extract a thin shared façade or move `syncCodeTaskFromPullRequest` behind an injected dependency / event so that `gateService` does not import `codeTaskService` directly. Prefer the smallest interface that removes the cycle without adding pass-through layers.

### 3.2 High fan-in modules (change impact)

| Fan-in (approx.) | Module |
|-----------------:|--------|
| 12 | `server/database.ts` |
| 11 | `src/workspace/types.ts` |
| 10 | `src/decision.ts` |
| 7 | `src/driveClient.ts` |
| 6 | `src/config.ts`, `src/attachments.ts`, `src/driveMirror.ts` |
| 5 | `server/gateEngine.ts`, `server/githubIntegration.ts`, `server/modelRegistry.ts`, `server/taskService.ts`, `server/statePipeline.ts` |

Changes to these modules should trigger broader verification (Phase 1 change-impact rules).

### 3.3 Router / modelHealth

`router.ts` and `modelHealth.ts` exchange types and functions; the static analyser reported only type-level or one-way edges in this pass. Treat as a **watch list**, not a hard cycle, until a stricter resolver is added in Phase 1.

---

## 4. HTTP surface

Full literal inventory: `docs/phase0/literal-route-inventory.csv` (81 registrations from `server.ts` + `healthRoutes.ts`).

Representative groups:

| Area | Examples |
|------|----------|
| Auth | `POST /api/login`, `POST /api/logout`, `GET /api/session` |
| Projects | CRUD, state PUT, versions, settings, analyze, decisions |
| Plans / tasks / budgets / approvals | list/create, queue, validate, gates, waive/approve |
| Code / artifacts | code tasks lifecycle, build, package, download, repair |
| Conversation / analysis | `/api/conversation`, analyze-full, attach, export-document, EVPI, etc. |
| Ops / health | `/health`, `/ready`, `/ops`, GitHub webhook |

**Authoritative product surface for regression:** `tests/feature-manifest.json` (must stay in sync with intentional route changes).

Middleware order and auth guards live primarily inside `server.ts`. Any extraction in Phase 2 **must** preserve order and the existing security middleware chain.

---

## 5. Persistence

| File | Role (summary) |
|------|----------------|
| `001_project_state.sql` | projects, state versions |
| `002_tokens_ledger.sql` | token / cost ledger |
| `003_route_decisions.sql` | model route decisions |
| `004_model_health.sql` | provider health events |
| `005_tasks_runs.sql` | tasks and runs |
| `006_jobs.sql` | background jobs |
| `007_budgets_plans_approvals.sql` | budgets, plans, approvals |
| `008_artifact_manifests.sql` | artifact manifests |
| `009_gate_evidence.sql` | gate evidence |
| `010_code_tasks.sql` | code tasks core |
| `011`–`013` | package approval, decision, repair loop columns |
| `014_provider_snapshots.sql` | provider monitoring snapshots |

Full detail: `docs/phase0/migration-inventory.csv`.  
Schema version constant: `SCHEMA_VERSION = 11` in `src/config.ts` (migrations go to 014 — confirm alignment during Phase 2/5).

---

## 6. Environment contract

- Variables referenced via `process.env.*` in source: **69** distinct names.  
- Documented in `.env.example` (including commented keys): fewer; many runtime/CI/GitHub/model flags are code-only.  

Full list: `docs/phase0/environment-variable-inventory.csv`.

**Action for later phases:** extend `.env.example` (or generate it) for every non-test variable that affects production behaviour, without printing secret values. Security-sensitive keys (GitHub private key, webhook secret, `SESSION_SECRET`, API keys) must remain documented as “set in host secrets only”.

---

## 7. Tests and verification commands

| Area | Files (lines approx.) |
|------|------------------------|
| database | `tests/database.test.mjs` (~1700) |
| models | `tests/models.test.mjs` (~1470) |
| project-mode | `tests/project-mode.test.mjs` (~1410) |
| pipeline | `tests/pipeline.test.mjs` (~1360) |
| core | `tests/core.test.mjs` (~1240) |
| workspace | `tests/workspace.test.mjs` (~1050) |
| files / security / gates / integrations / web | remaining suite |

Inventory: `docs/phase0/test-inventory.csv`.

Primary aggregate command: `npm run check`  
(version check → docs → copy-lint → typecheck → ordered unit suites).

Live / optional: `test:live`, `test:ui`, connection monitors, golden eval, gate-eval, evidence collectors.

**Phase 0 limitation:** none of these were executed in the audit environment. Results on the Navigator’s CI after applying only documentation/audit files are the first runtime evidence for this baseline.

---

## 8. Typing and tooling

| Config | Notes |
|--------|--------|
| `tsconfig.server.json` | `"strict": false` — primary Phase 3 target |
| `tsconfig.json` (client) | bundler mode, noEmit; strict not forced |
| Zod | already used; prefer as single source of truth for DTOs at trust boundaries |
| Feature flags | `src/config.ts` (`FEATURES`, `PRODUCT_LINE`, version constants) |

---

## 9. Security and trust boundaries (static notes)

Observations only — not a penetration test.

| Boundary | Location / mechanism | Notes for refactor |
|----------|----------------------|--------------------|
| Authentication | `server/security.ts`, session cookie, login limiter | Keep middleware order when splitting `server.ts` |
| Project isolation | project-scoped routes + DB queries | Do not widen query scope during extraction |
| Untrusted uploads / archives | `server/files.ts`, workspace extract/ingest | Treat as hostile input; no host execution of generated code without explicit owner gate |
| Generated code | `codeExecutor`, `CODE_EXECUTOR`, model_patch | Host execution remains owner-authorized only |
| GitHub | `githubIntegration.ts`, webhook, App credentials | Write path gated by `GITHUB_DIFF_UPLOAD` + policy |
| Secrets | `.env` / host vars; `redact.ts` | Never ship secrets in ZIPs or client bundles |
| Gates / approvals | `gateService`, `gateEngine`, DB evidence | Cycle with code tasks must not weaken approval checks |

---

## 10. Capability → code map (coarse)

| Capability | Primary modules | Tests (entry) |
|------------|-----------------|---------------|
| Simple / Expert conversation | `server.ts` routes, `promptPacks`, `reasoningState`, `App.tsx` | core, conversation-turn, models |
| Project Mode | `ProjectMode.tsx`, project repository/state, plans/tasks | project-mode, database |
| Code generation / package | `codeTaskService`, `codeExecutor`, appBuilder* | pipeline, gates |
| Workspace / files | `src/workspace/*`, `files.ts`, ConversationFiles | workspace, files |
| Model routing / health | `router.ts`, `modelHealth`, `modelRegistry`, adapters | models |
| Gates / approvals / budgets | `gateService`, `gateEngine`, budget/plan services | gates, project-mode |
| Documents / export | `documents.ts`, export helpers | files / core |
| GitHub integration | `githubIntegration.ts`, webhook route | integrations |
| Ops / health | `healthRoutes`, `opsMetrics` | core / CI |

This map is intentionally coarse. Phase 1 should attach contract and test IDs to each capability for change-impact selection.

---

## 11. Risk register (prioritized)

| ID | Risk | Severity | Phase to address |
|----|------|----------|------------------|
| R01 | `server.ts` and `App.tsx` size → high context cost / accidental middleware reordering | High | 2 |
| R02 | task ↔ gate ↔ codeTask import cycle | High | 2 (before deep edits to those services) |
| R03 | `strict: false` on server | High | 3 (gradual) |
| R04 | ENV documentation drift vs code | Medium | 1 / 4 |
| R05 | Hand-maintained inventories can go stale again | Medium | 1 + 4 (generate) |
| R06 | Large test files themselves are costly for AI to edit | Medium | later (optional) |
| R07 | SCHEMA_VERSION vs migration count mismatch perception | Low | verify in Phase 2/5 |
| R08 | Feature-manifest vs actual routes drift | Medium | keep in every route-touching patch |
| R09 | Partial documentation retirement: historical requirements only in owner archive | Medium | process (D05) |

---

## 12. Phase 0 gate checklist

| Item | Status |
|------|--------|
| Baseline archive inventoried | Done (this report + CSVs/JSON) |
| Module sizes and largest units identified | Done |
| Import cycles detected | Done (2 confirmed) |
| Route inventory | Done (literal) |
| Migration inventory | Done |
| ENV inventory | Done |
| Test inventory | Done |
| Coarse capability map | Done |
| Risk register | Done |
| Runtime `npm run check` / live DB / browser | **Blocked** (not run here) |
| Full requirement-by-requirement trace vs retired docs 01–18 | Deferred (requires owner archive); do not invent requirements |

**Gate decision for Navigator:** accept this Phase 0 package as the baseline for p72 (Phase 1 guardrails). Source behaviour remains unchanged by p71.

---

## 13. Recommended next patch (p72)

Phase 1 only:

1. Machine-readable module map (generated from imports + optional semantic annotations).  
2. Cycle and boundary checker (ratchet: report existing, fail on new).  
3. Change-impact stub and `verify:change` command skeleton with PASSED / FAILED / BLOCKED / NOT_RUN.  
4. No behaviour changes; no large file splits yet.

---

## 14. Evidence files in this package

| File | Content |
|------|---------|
| `docs/phase0/BiForge-v70-Phase0-Audit.md` | This report |
| `docs/phase0/module-inventory.csv` | Path, lines, kind |
| `docs/phase0/dependency-graph.json` | Cycles, fan-in, sample edges |
| `docs/phase0/literal-route-inventory.csv` | Method, path, source file |
| `docs/phase0/environment-variable-inventory.csv` | Name, documented?, files |
| `docs/phase0/migration-inventory.csv` | SQL files, creates/alters |
| `docs/phase0/test-inventory.csv` | Test files, sizes, approx blocks |

---

*End of Phase 0 audit (p71). No application source files were modified.*
