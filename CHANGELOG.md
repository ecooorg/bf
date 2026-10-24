## P88 — Real-task AI benchmark pilot (2026-10-24)

- Added a read-only, data-driven benchmark CLI and validation library for task prompts, pinned revisions, reviewed dependency gold sets, protected invariants, acceptance criteria, required checks and baseline/context-engine run records.
- Added four starter scenarios, all explicitly marked draft, plus a separate results template. No task execution, human review, provider-token trace, or improvement is claimed by the starter dataset.
- Reports measured, estimated, unavailable and not-run values honestly; computes dependency metrics only for reviewed gold sets; checks metadata before marking paired runs comparable; and never treats missing values as zero.
- Added nine focused tests to `npm run check`. No runtime/UI/API/database changes, no performance threshold, and no new CI regression gate.

## P87 — Verification Planner (2026-10-24)

- Added read-only `verification:plan` CLI with explicit task/file rules, existing-script validation, fast/targeted/full tiers, required `check`/build/hosted-CI gates, and actionable uncertainty when file ownership is unknown.
- Added counterexample-oriented test suggestions for Project Mode archives/downloads, database persistence, API/authentication, security/configuration, UI/copy, generated documentation, and test/CI tooling. Suggested commands are marked `SUGGESTED_NOT_RUN`; the planner never executes shell commands.
- Added `test:verification-plan` to `npm run check`, including a negative regression case for a test script omitted from both the check chain and explicit CI-step allowlist.
- No product runtime, UI, API, database, migration, generated inventory, or persisted format changed. Local focused tests are reported separately; full CI is pending.

## P86 — Change impact graph and generator lineage (2026-10-24)

- Added read-only `impact:lineage` reporting static import impact and typed, provenance-labelled relationships for generated route, environment, migration and module-map artifacts.
- Closed the known route-inventory lineage gap with explicit `docsGenerateInventories.mjs` output mapping, known consumers, route registration records and suggested verification commands.
- Added limited artifact health checks and a concise intent diff that marks suggested tests as not run and preserves uncertainty for dynamic imports, missing generators, stale metadata and unknown lineage.
- Added nine focused tests for generator outputs, generated-file edits, multiple consumers, missing generators, stale metadata, source relationships, import cycles, dynamic imports and false filename-based inference. Integrated `test:impact-lineage` into `npm run check`.
- No product runtime/API/UI/database behavior or generated inventory contents changed. Full CI is pending; no benchmark recall improvement or time savings are claimed.

## P85 — Task-aware context engine (2026-10-23)

- Added read-only `context:task` CLI and deterministic task-to-file suggestions layered on P81 static context planning.
- Added provenance labels, explicit partial/unknown evidence, Project Mode artifact observability gaps and focused tests integrated into `npm run check`.
- No runtime API, UI, database or generator changes; benchmark improvement and full CI not claimed.

## P84.3 — Project Mode diagnostics roadmap (2026-10-23)

- Added `docs/PROJECT-MODE-DIAGNOSTICS-ROADMAP.md` describing proposed structured operation logs, Project Mode stage correlation, archive/source validation, artifact save/readback verification, download-transfer evidence, bounded/redacted diagnostic export, and system diagnostics.
- Integrated diagnostics as a cross-cutting, incremental workstream across P85–P91: task context (P85), generator/artifact lineage (P86), counterexample-oriented tests (P87), real-task measurements (P88), optional artifact intent criteria (P89), evidence-driven refresh (P90), and uncertainty guards against false success (P91).
- Documented candidate More-menu entries (`Download diagnostic logs`, `Run system diagnostics`, `View recent operations`) as future proposals, not existing features. No runtime, UI, API, package, test, security gate, or persisted format changed.
- Human-simplicity goal: reduce repeated manual diagnosis and prevent a download link from being mistaken for proof of successful delivery. Measurement ideas include stage-localization rate, false-success rate, diagnosis time and rework; no savings are claimed before measurement.

## P84.2 — VIX-integrated human-simplicity roadmap (2026-10-23)

- Revised `docs/AI-NATIVE-ROADMAP-P85-P91.md` to selectively incorporate the VIX principles most useful to current BiForge: intent before edits, explicit invariants, counterexample-oriented verification, concise intent diff, honest uncertainty, and traceability from request to verification evidence.
- Made total human effort per safely completed change the north-star metric. Every future patch must state human work removed, safety/evidence added, complexity introduced, and how net benefit will be evaluated.
- Adjusted P85–P91 to avoid a parallel VIX subsystem, mandatory manual task forms, duplicate sources of truth, noisy warnings, and optimization infrastructure without measured benefit. Added a cross-patch human-simplicity acceptance gate.
- Documentation-only patch: no product runtime, package scripts, tests, security gates, or generated inventories changed. P85–P91 remain future work; each patch requires separate review and green CI before the next begins.
- Added `docs/VIX-CONCEPT.md`, a Markdown edition preserving the broader long-term VIX architecture with source attribution and CC BY 4.0 notice. Added it to the documentation index. This is a conceptual reference, not a commitment to implement every target component.

## 23 October 2026 — Detailed in-app User Guide

- Replaced the short help overlay with a full English beginner manual for Simple, Expert, and Project modes.
- Added step-by-step instructions for attachments, workspace privacy consent, history, import/export, project descriptions, analysis review, plan approvals, task validation, code packages, Drive, and troubleshooting.
- Kept the guide available in the modal and in a separate browser tab, using one shared content source.
- Added `docs/USER-GUIDE.md` and indexed it. Documentation/UI only; no workflow behavior changed.

## P84.1 — AI-native roadmap for P85–P91 (2026-10-23)

- Added `docs/AI-NATIVE-ROADMAP-P85-P91.md`, a detailed implementation plan for task-aware context planning, change-impact and generator lineage, verification planning, real-task AI benchmarking, task contracts, incremental refresh, and context-completeness guards.
- Documented patch dependencies, scope boundaries, implementation steps, acceptance gates, stop conditions, measurement rules, cross-patch verification checklist, and a reusable bootstrap prompt for the next AI implementation session.
- Updated `AGENTS.md`, `docs/DOCUMENTATION-INDEX.md`, and the P81–P84 roadmap to record that the Navigator reports P84 CI green after the P56 check-chain fix and to point to the next roadmap.
- Documentation-only patch: no product runtime, package scripts, test behavior, security gates, or generated inventories changed. The roadmap does not authorize automatic merges, deployment, or bypassing mandatory CI.

## P84 CI integration fix — 2026-10-23

- Routed `test:context-benchmark` through `npm run check` by invoking the named npm script instead of calling its test file directly. This satisfies the P56 invariant that every `test:*` script is explicitly part of the check chain or declared as a separate CI step.
- No benchmark logic, gold-set data, product runtime behavior, or test coverage was changed.

## P84 — AI-Native Context Benchmark (2026-10-23)

- Added a read-only deterministic benchmark harness (`scripts/contextBenchmark.mjs`, `scripts/contextBenchmarkLib.mjs`) and a six-scenario curated gold-set file covering Expert conversation UI, Project Mode API contracts, task-state/database, environment configuration, generated route artifacts and localized compatibility routes.
- The harness compares the same scenario intent against a pinned v80 + p80.1 tree and the current tree, recording gold-set recall, false-positive candidate rate, candidate source-line cost, source graph size, planner uncertainties and suggested verification commands with explicit `not-run` status. It does not execute application code.
- Added `npm run benchmark:context` and `npm run test:context-benchmark`; the benchmark fixture test is included in `npm run check`. No metric threshold or regression gate is enabled until a maintainer reviews the gold set and repeatability is established.
- Initial static result: 6 scenarios; 35,221 → 23,551 summed candidate source lines (−33.1%) and comparable-gold recall 83.3% → 86.1% over the 36 dependencies present in both trees (non-comparable all-available-gold summaries are 83.3% → 83.8%). These are non-deduplicated static proxies, not tokens or agent completion-time measurements. The generated-route-artifact scenario has 0 recall, showing the generator-to-artifact relationship is currently missed; the lower aggregate line cost must not be read as an unconditional improvement.
- Gold-set status is author-curated and requires maintainer confirmation. AI token use and implementation touched-file counts are unavailable/not measured. `docs/context-benchmark-verification-p84.json` records local command durations/statuses: focused checks passed, `npm run check` is blocked at typecheck by missing `vite/client` definitions, build was not run, and GitHub CI is pending. No product runtime code changed.

## P83 — Contract & Verification Integrity (2026-10-23)

- Added authoritative Zod query-string schemas in `server/contracts.ts` for Project Mode project listing and state-version pagination. The HTTP boundary now validates query values before repository calls rather than relying on repository validation after `Number(...)` coercion; existing 400 validation response, defaults (100/50), range (1–200), and successful response shapes are preserved.
- Added negative tests for malformed, fractional, exponent, whitespace-padded, array, zero, negative and out-of-range query values, including default and boundary cases.
- `context:plan` now adds explicit contract/test evidence for Project Mode route/schema targets and suggests focused test suites.
- `docs/contracts-verification-p83.json` inventories selected contracts, consumers, guarantees, reviewed structural tests, risks and verification status. No auth/approval gates, SQL schema, persisted data format, model-output contract or generated artifact was changed.
- P83 focused tests and full CI are pending in this patch; do not treat P82's reported green CI as P83 verification.

## P82 — Context Locality (2026-10-23)

- Extracted `BriefScreen`, `ConversationScreen`, `SharedConversationContext`, `SafetyBox` and conversation helpers into `src/ConversationScreens.tsx`; updated `App.tsx`, aggregated source tests and the feature manifest. No intended UI or state behavior change.
- Extracted `/api/analyze-full`, `/api/radar-legacy` and `/api/evpi` into `server/compatibilityRoutes.ts`; registration remains at the prior position in `server.ts` to preserve middleware and route order.
- `context:plan` now reports the `server.ts` import and registration lines for the recognized route-registration pattern instead of listing the entire entry point as routine context.
- `docs/context-locality-p82.json` records before/after static evidence. Conversation/brief one-hop proxy: 37 files / 7,376 lines → 15 files / 3,400 lines (53.9% fewer candidate lines; not token measurements).
- Focused planner tests (5/5), `check:docs`, `architecture:check` and `docs:generate` passed. `npm ci` timed out; full check, typecheck, build, behavioral/UI checks and GitHub CI are **NOT RUN / BLOCKED**. No deletions.

## P81 — Dependency Intelligence and P82–P84 approved roadmap (2026-10-23)

- Added read-only `context:plan` with one-hop static imports/importers, explicit env/SQL/manifest evidence, test hints and uncertainties. No claim of exhaustive cross-layer dependencies.
- Captured reproducible static pre-P81 v80 metrics in `docs/context-baseline-v80.json`; source-line costs are proxies, not measured agent tokens.
- Added context-planner regression tests and documented approved P82–P84 scopes, verification gates, metrics and stop conditions in `docs/AI-NATIVE-ROADMAP-P81-P84.md`.
- No product runtime or security policy changes; no deletions.

## p80.1 — Fix CI preflight for flat historical archive (2026-10-23)

- `scripts/patch-tools.mjs`: include the existing lowercase `archive/` in allowed top-level folders. Keeps nested-folder, unsafe-path, secret and protected-acceptance checks unchanged.
- `tests/models.test.mjs`: cover flat archive paths, reject nested archive paths, and preserve archive paths when reading ZIPs.
- No product runtime behavior changes.

## p80 — Flatten docs/scripts; archive phase history (2026-10-23)

- Removed nested `docs/phase0…phase5` and `scripts/architecture|docs/`.
- Active flat docs: `architecture-guardrails.md`, `architecture-boundary-rules.json`, `architecture-known-violations.json`, `typing-and-naming.md`, `generated-*.json`.
- Scripts with prefixes: `architecture*.mjs`, `docsGenerateInventories.mjs`, `docsCheckInventories.mjs`, `acceptanceReport.mjs`.
- Historical copies in `archive/` (flat filenames) + `archive/README.md`.
- AGENTS / INDEX / package.json / preflight updated. No product behaviour change.

## p79 — CI ui-check: stop 20+ min Playwright apt install (2026-10-23)

- Root cause of “UI runs 20–25 minutes”: GitHub Actions job `ui` stuck on `npx playwright install --with-deps chromium` (apt packages), before `npm run test:ui`.
- `.github/workflows/ui-check.yml`: cache `~/.cache/ms-playwright`; run `--with-deps` only on cache miss; on hit only `playwright install chromium`; job `timeout-minutes: 20`.
- No product application code changes.

## p78.1 — Navigator Accept (Tier 3) recorded (2026-10-23)

- `docs/phase5/ACCEPTANCE.md`: Decision **ACCEPT**, date 2026-10-23, commit `2232cb9` (green CI).
- AGENTS / AI-TRANSFORCE-SPEC status: transformation track **accepted**; next focus product issues (UI long busy state), not new phases 0–5.
- No application code changes in this documentation-only record.

## p78 — Phase 5 acceptance package (2026-10-23)

- `docs/phase5/ACCEPTANCE.md` — evidence checklist, structural vs behavioural equivalence, residual risks, rollback, Navigator decision block.
- `scripts/acceptance-report.mjs` + `npm run acceptance:report` → `docs/phase5/generated/acceptance-summary.json` (static gates only).
- AGENTS / SPEC / INDEX / roadmap updated: transformation track packaged; formal accept is Tier 3 (Navigator).
- No application behaviour or SQL changes.

## p77 — Phase 4 documentation generators (2026-10-23)

- Generators: `scripts/docs/generate-inventories.mjs` → `docs/phase1/generated/{route,env,migration}-inventory.json` (75 routes, 54 env names, 14 migrations in this tree).
- Check: `scripts/docs/check-inventories.mjs`; npm scripts `docs:generate`, `docs:check`.
- `verify:change` runs inventory generate + check; preflight allows `scripts/docs/`.
- Docs: `docs/phase4/PHASE4-GENERATORS.md`, INDEX / AGENTS / roadmap / SPEC updated.
- No application behaviour or SQL changes.

## p76.1 — restore P43 AGENTS product facts (2026-10-23)

- `AGENTS.md`: re-added `model_patch` executor note and deferred **GitHub write** (ADR-06) required by `tests/security.test.mjs` P43; transformation status (p76 / roadmap) kept.
- No code changes.

## p76 — Phase 3 closed + Phase 4/5 roadmap (2026-10-23)

- Phase 3 completion: `docs/phase3/PHASE3-COMPLETE.md` (what shipped, what is deferred).
- Roadmap for next session: `docs/phase4-5-ROADMAP.md` (**p77** doc generators, **p78** acceptance package) with copy-paste bootstrap prompts.
- Code: `taskOfProject` parses path ids via `domainIds` (`parseProjectId` / `parseTaskId`); `codeTaskService` shares `idSchema` from `contracts.ts`.
- Docs: AGENTS, AI-TRANSFORMATION-SPEC, DOCUMENTATION-INDEX, TYPING-AND-NAMING updated.
- No intentional product behaviour or SQL changes. Optional full `strict: true` remains post-acceptance.

## p75.7 — fix lease-loss test timing constraint (2026-10-23)

- p75.6 set `heartbeatMs: 60_000` with `leaseMs: 1000`, which violates `heartbeatMs * 2 <= leaseMs` → `INVALID_TIMING` in live CI.
- Now `leaseMs: 2000`, `heartbeatMs: 1000` (valid); recovery still runs before the first heartbeat; short retry kept for SKIP LOCKED races.

## p75.6 — stabilize flaky live lease-loss test (2026-10-23)

- `tests/database.test.mjs`: worker lease-loss case no longer races heartbeat `FOR UPDATE` vs `recoverExpired` `SKIP LOCKED` (empty recovery → flaky CI). Long `heartbeatMs` + short retry loop.
- Product code unchanged. Full check stages and gitleaks were already green.

## p75.5 — CI: gitleaks false positive in CHANGELOG (2026-10-23)

- Reworded `AI/conversation` → `AI and conversation` in the p73 CHANGELOG line (gitleaks `generic-api-key` false positive after `auth middleware`).
- All `npm run check` stages, live DB, Project Mode API, and client build were already green.

## p75.4 — CI red fix (project-mode static scopes) (2026-10-23)

- `tests/project-mode.test.mjs`: import `serverSources` in P20b / P21 / P22 blocks (was ReferenceError); program-creation static test reads aggregated server sources after route split.
- No product code changes. Prior stages already green (typecheck, core, models, pipeline, regression, live DB).

## p75.3 — CI red fix (typecheck, tests, preflight) (2026-10-23)

- `tsconfig.server.json`: `noImplicitReturns` off again (was failing Express handlers with early `return res.status...`).
- Preflight: allow `scripts/architecture/*` nested path.
- Static tests: no bare `await import` inside sync `test()` callbacks (async tests / top-level imports); package-c shell uses `appSources()` so `/Retry/` is found after App split.
- P56 orphans: ignore `tests/_*.mjs` helper modules.
- No intentional product behaviour change.

## p75.2 — CI red fix (module-split follow-up) (2026-10-23)

- Source: `appApi` imports `getStoredUiLanguage` from `ui.ts`; `App` imports `SharedConversationContext`; `AppHeader` imports `isFolderPickerSupported`; `projectRoutes` dynamic import path `./codeExecutor.ts` (not `./server/...`).
- Tests: `tests/_sources.mjs` aggregates `server.ts` + route modules and App + extracted UI for static contract tests; project-mode / models / core P52 / pipeline updated to use it.
- Preflight allows `docs/phaseN/` and `docs/phaseN/generated/`.
- `tests/feature-manifest.json` UI needles updated for AppHeader / ExpertStepScreens.
- P56: architecture/verify scripts listed as separate CI steps.
- No intentional product behaviour change.

## p75.1 — CI red fix after Phase 2–3 patches (2026-10-23)

- `src/AppHeader.tsx`: import `ModeMenu` and `PICK_FOLDER_EVENT` (were missing after p74 extract — broke Mode menu at runtime and P51 static checks).
- `src/App.tsx`: import `StepTitle` and `isBriefWorthShowing` from `ExpertStepScreens` (typecheck errors).
- `tests/core.test.mjs` (P51): assert ModeMenu markup in `AppHeader.tsx`; keep handler wiring asserts on `App.tsx`.
- `server/projectRoutes.ts`: add missing `getPool` import (P54 live gates endpoint returned 500 → `gates.data` undefined).
- Revert premature `DbRow`/`unknown` row typing in `taskService`, `codeTaskService`, `artifactRepository` that produced ~100 typecheck errors under `tsc --noEmit`. Keep `server/domainIds.ts` for later gradual adoption.
- No intentional product behaviour change beyond restoring broken paths.

## p75 — Phase 3 start: typing infrastructure and naming conventions (2026-10-23)

- Added `server/domainIds.ts`: branded `ProjectId`, `TaskId`, `CodeTaskId`, `RunId` (Zod parse helpers) and `DbRow`.
- `taskService`: shared `idSchema` from `contracts.ts`; `Db` rows and mappers use `DbRow` instead of `any`.
- `codeTaskService` / `artifactRepository`: row mappers and helpers prefer `DbRow` over `any`.
- `tsconfig.server.json`: `noImplicitReturns`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames` (full `strict: true` still false — gradual).
- Documented policy: `docs/phase3/TYPING-AND-NAMING.md` (verb dictionary, boundary rules, rename targets).
- No intentional API, SQL schema, or product behaviour changes. Full typecheck/suite NOT_RUN in patch environment if dependencies unavailable.

## p74 — Phase 2b: App.tsx modularization + cycle break (2026-10-23)

- Split `src/App.tsx` (~2947 → ~641 lines) without UI behaviour change:
  - `src/appApi.ts` — `api`, `sessionStatus`, `loginWithPassword`, `stageIndex`
  - `src/ErrorBoundary.tsx` — screen error boundary
  - `src/AppHeader.tsx` — `Header`, `MethodGuide`
  - `src/ExpertStepScreens.tsx` — triage through learn step screens and brief panel
- Broke static import cycle `taskService` ↔ `gateService` ↔ `codeTaskService` by replacing the static `gateService` → `codeTaskService` import with a dynamic `import()` at the PR-sync call site.
- Updated `docs/phase1/known-violations.json` (known cycles empty). `architecture:check` reports 0 cycles.
- No SQL, route contract, or intentional product behaviour changes. Full `npm run check` / UI viewport not executed in patch environment (NOT_RUN).

## p73 — Phase 2a: split server.ts route groups (2026-10-23)

- Extracted HTTP route groups from `server.ts` without behaviour change:
  - `server/authRoutes.ts` — `/api/session`, `/api/login`, `/api/logout`
  - `server/projectRoutes.ts` — Project Mode boundary middleware and all `/api/projects/*` routes (incl. code tasks, artifacts, ledger)
  - `server/opsRoutes.ts` — `/api/ops`, `/ops`
- `server.ts` retains bootstrap, body parsers, CSRF/origin checks, GitHub webhook, auth middleware, AI and conversation helpers, static/SPA, and `start()`.
- Registration order and security middleware chain preserved.
- No SQL, client, or test changes. Full runtime suite not executed in patch environment (BLOCKED/NOT_RUN).

## p72 — Phase 1 mechanical guardrails (2026-10-23)

- Added architecture tooling under `scripts/architecture/`: module-map generation, cycle/boundary check with ratchet, change-impact analysis, and `verify:change` orchestrator.
- Config: `docs/phase1/boundary-rules.json`, `docs/phase1/known-violations.json` (two known cycles from Phase 0).
- Docs: `docs/phase1/PHASE1-GUARDRAILS.md`; generated reports under `docs/phase1/generated/`.
- npm scripts: `architecture:map`, `architecture:check`, `architecture:impact`, `verify:change`.
- No application source, SQL, tests or runtime behaviour changed. Ratchet holds on current tree (`architecture:check` PASSED).
- Full `npm run check` not required for this infrastructure-only patch; `check:docs` PASSED via `verify:change`.

## p71 — Phase 0 forensic audit (2026-10-23)

- Completed static Phase 0 audit of the v70 baseline; no application source, SQL, tests or runtime configuration modified.
- Added `docs/phase0/BiForge-v70-Phase0-Audit.md` with module sizes, confirmed import cycles (`taskService` ↔ `gateService` ↔ `codeTaskService`), route/ENV/migration/test inventories, coarse capability map and prioritized risk register.
- Supporting artifacts: `module-inventory.csv`, `dependency-graph.json`, `literal-route-inventory.csv`, `environment-variable-inventory.csv`, `migration-inventory.csv`, `test-inventory.csv`.
- Updated `AGENTS.md` status, `DOCUMENTATION-INDEX.md` and `DOCUMENTATION-BASELINE.md` to point at Phase 0 results.
- Runtime `npm run check`, database, browser and live suites were not executed in the audit environment (BLOCKED / NOT RUN).
- Next: p72 Phase 1 mechanical guardrails after Navigator accepts this baseline.

## Documentation migration — retire legacy numbered documents

- Retired the numbered documentation set (`docs/01`–`docs/18`) from the active repository.
- Preserved required security rules in `docs/AI-OPERATING-RULES.md`.
- Preserved current deployment, backup, restore and rollback guidance in `docs/OPERATIONS.md`.
- Updated security tests to validate current operating rules instead of reading the legacy security document.
- Updated operational scripts and documentation navigation to remove dependencies on legacy paths.
- Historical copies are retained by the owner outside the active repository.
- Validation status: record actual test and CI results after applying the changes.

## Documentation-first AI-native transformation proposal

- Introduced a concise AI entry point, permanent rules, technical transformation specification, navigation index and evidence baseline.
- Preserved all legacy domain documentation pending source-audited migration.
- No runtime source, configuration, migrations or tests modified.
- Implementation awaits Navigator approval and Phase 0 baseline audit.

## P70 — Close the UI cross-mode audit (2026-10-23)

- New `src/uiStates.tsx`: one `StateNotice` for empty / loading / unavailable / error / done in Simple, Expert and Project, plus `BusyHint` (reason next to paused buttons) and one wording for Drive («Drive off / Drive / Drive on») and History («History / History off»). Docs: `docs/06` §6.8.
- New `src/projectLabels.ts`: plan, approval and task values in plain words. Removed plan ids from notices, the project version counter, «units», and `kind: id` from approvals.
- Simple: mode banner removed; header button is «New conversation».
- Project: capability block lists only what is not available; one «Next:» line replaces the five-step path; Results link reads «Open the pull request»; empty project panel no longer repeats the page title; shorter leave/return dialogs.
- Copy: all remaining long strings and the last «scaffold» fixed (App, Delivery, ProjectMode, Wizard, PathChooser, WorkspacePanel, driveMirror, en). `DEBT` in `scripts/lint-copy.mjs` is now empty. Contract strings kept: «Project Mode is disabled», «BiForge never merges», «file access was not granted».
- `docs/18` got §7 with the status of every finding. No API, state-machine or product-logic change; `tests/feature-manifest.json` unchanged.
- Tests: P70 block added to `tests/project-mode.test.mjs`.
- Validation: full `npm run check` PASS; `test:database` ran only its non-live tests (no PostgreSQL). Browser `test:ui` and the 1200 px / 390 px look were not run (no Chromium download here).

## P69.1 — Fix CI lint:copy failure (2026-10-23)

- CI `check-and-build` failed at `lint:copy`: `src/projectAppBuilder.ts` had 3 × internal term «scaffold» and 6 × text over 24 words (allowance 0).
- Reworded the stack build hints, success criteria, goal line and manual deploy steps (step 5 split in two, steps renumbered). No allowance raised; no logic or API change.
- Model prompt text is slightly shorter; the README requirements in the goal are unchanged in meaning.
- Validation: `lint:copy` PASS, `typecheck` PASS, `test:project` 75/75, `test:regression` 8/8. Full `npm run check` and `test:ui` not run.

## P69 — Plan and Results hierarchy (2026-10-22)

- Results: **Run analysis** is the primary action; **Create a small program** moved under optional details; last-run token/model stats under «Last run details».
- Plan: **Create a simple plan**, **Approve**, **Start task**, and **Mark as passed** use primary styling; **Open in Code package** is secondary.
- Files: removed duplicate «Files» heading; **Model request history** collapsed by default.
- Open project title is the project name (no second «Project workspace» heading).
- Validation: `npm run lint:copy` PASS. No API or product-logic change.

## P68 — Code package copy and primary actions (2026-10-22)

- User-facing **hand-off / waive / gates / fingerprint** removed from Code package UI and related labels (coding task, Skip check, Skipped by you, Advanced check details, Work in your tool).
- One primary control per step: New/Create task, Download or Approve package, Send result, Refresh from GitHub, Run review, Accept, Request repair.
- Package line no longer shows a content fingerprint; status is «approved» / «not approved yet».
- `projectCapabilities` and `projectDeliveryModel` plain labels aligned; lint debt for those jargon rules cleared on Delivery files.
- Tests and `feature-manifest.json` updated for the new strings (including P67 Code package expectations).
- Validation: `npm run lint:copy` PASS. No API or state-machine change.

## P67 — Project labels and quieter lists (2026-10-22)

- Tab **Delivery** → **Code package**; heading and suggested path aligned; **Open in Code package**.
- Notices and status: **Passport** → description language (`Description confirmed/saved`, status «confirmed» / «not confirmed yet»).
- Advanced: one tab name **Advanced** (was «Data · developers»).
- Default lists no longer show task ids, plan ids, or file content hashes; build result omits machine ids and raw statusReason.
- `tests/feature-manifest.json` updated for the new strings.
- `scripts/lint-copy.mjs`: ProjectMode passport debt cleared; projectAppBuilder allowances lowered to match measured zero.
- Validation: `npm run lint:copy` PASS. No product logic or API change.

## P66 — Cross-mode UI audit (2026-10-22)

- Added `docs/18-UI-Cross-Mode-Audit.md`: confirmed defects across Simple, Expert and Project (labels, competing actions, controls without a job, inconsistent states), with priorities and source evidence.
- No application code or product logic changed.
- Next fix order recorded in AGENTS STATE: P67 labels (Delivery / Passport / Advanced), P68 Delivery copy, P69+ hierarchy and shared states.
- Validation: docs-only. `npm run check:docs` not re-run here (no new broken links expected; path registered in AGENTS.md).

## P65 — Header tap targets ≥44px on mobile/tablet (2026-10-22)

- Raised header action `min-height` from 38px to 44px under `@media (max-width: 900px)` so Mode, Drive, History and More meet the 44px tap-area rule in `tests/ui-check.mjs`.
- Fixes CI `test:ui` failures at 360, 414 and 768 px viewports (height was 38px).
- Validation: CSS-only change. Browser/`npm run test:ui` not re-run here (Playwright chromium deps not installed in this environment).

## P64 — Restore Project scope copy and remove administrator wording (2026-10-22)

- Restored the P53 Project scope sentence inside the existing collapsed capability details; shortened it to stay within the interface-copy limit.
- Removed “administrator” from user-facing unavailable-state and guide copy.
- Reduced the `projectCapabilities.ts` long-copy allowance from one to zero.
- Validation: `npm run lint:copy` PASS; `npm run check:docs` PASS. `npm run test:project` BLOCKED because the supplied `node_modules/tsx` package is empty. Full CI/browser acceptance not confirmed.

## P63 — Simple empty screen, mobile header and guide (2026-10-22)

- Simple empty state now has one primary action; optional file controls are disclosed separately and no longer refer to a missing message box.
- Mobile header keeps short navigation labels visible and adds accessible names to icon actions.
- Shortened the User Guide consistently in the in-app view and its new-tab view, covering Simple, Expert and Project.
- Lowered `scripts/lint-copy.mjs` allowances for the cleaned Project and guide copy; no allowance was increased.
- Validation: `npm run lint:copy` and `npm run check:docs` passed. `npm run typecheck` was BLOCKED by missing `vite/client` types; `npm run test:core` was BLOCKED because `tsx` was absent. Browser checks and production build were not run.

## P62 — Project interface cleanup (2026-10-22)

- Simplified the Project start screen and removed repeated scope copy.
- Show workspace file controls only after a project or builder path is active.
- Keep the project list available while a project is open; provide a clear return to all projects and hide the create form in the open-project view.
- Renamed the developer-data entry to “Advanced” and shortened the budget labels.
- Lowered `scripts/lint-copy.mjs` allowances for Project Mode copy that no longer violates the rules.
- Validation: `npm run lint:copy` and `npm run check:docs` passed. `npm run check` was BLOCKED at typecheck because `vite/client` type definitions were unavailable. `npm ci` timed out; build and browser acceptance were not run.

## Docs hygiene

- Retired duplicate `CHANGELOG_AGENT_BEHAVIOR.md`. Agent and product history: **only** this file (`CHANGELOG.md`).
- Operator deploy: `docs/DEPLOY.md` only (no root `DEPLOY_RAILWAY.md`).

## P61 — Expert screens (2026-10-22)

- Every step has a title and a one-line hint at the top (`STEP_TITLE` in `src/uiTerms.ts`). The unused `ExpertStageIntro` component and its long texts are removed.
- Content starts at the top: the page no longer centres vertically (`margin:auto` on the content in a tall grid row). Step cards, history and dialogue share one width.
- Input fields that had no style (Decide, Synthesis, Learn and others) now look like fields: `AutoTextarea` gets the `auto-input` class unless a class is passed.
- Quick check: result shown only after something is ticked; five statements with the same meaning («Tick what applies»); Attach / Download no longer shown there.
- Download / save reply is hidden when there is nothing to save (empty Your story). Under a disabled Continue a short reason is shown (Test, Decide).
- Sidebar footer («Understand → Explore → …», «Your decision: not yet») removed: it repeated the list above.
- Texts shortened and jargon removed (kill criteria, locked card, "two-way door", "Section 11", hand-off). Copy-lint allowance for `App.tsx` lowered from 21 to 4; `ConversationFiles.tsx` removed from the list. The lint no longer counts code fragments as text.
- Test: `STEP_TITLE` covers every step; hints are at most 12 words.

## P60 — Interface-copy rules (2026-10-21)

- `src/uiTerms.ts`: one vocabulary for the five loops (Understand, Explore, Challenge, Check, Learn). The Expert navigation now shows these names instead of the internal ids (EXPAND, ATTACK, VERIFY), matching the formula text.
- `scripts/lint-copy.mjs`: besides the legacy phrases it now fails visible text that contains internal jargon (kill criteria, locked card, fingerprint, waive, hand-off, gates, scaffold, passport, developer data, raw JSON, model_patch) or is longer than 24 words. Existing violations are recorded per file as allowances that may only go down; P61–P63 remove them.
- `AGENTS.md` RULES: new §9 "Screens and interface text" (title and one action, hints up to 12 words, no internals, one name per thing, no control without a job, never point at what is not on screen, visible fields, check at 1200 and 390 px). Old §9 is now §10.
- Tests in `tests/core.test.mjs`: vocabulary equals the formula text and the navigation; the copy lint passes plain text and fails jargon, long text and legacy phrases.
- No screen layout change besides the loop names in the Expert navigation.

## P59 — Expert screen: one history, one step list, one files block (2026-10-21)

- Expert: the conversation that existed before the method steps is one collapsed line («Earlier conversation» + the first question). Only messages written after that appear in the open dialogue at the bottom; the question and the answer are no longer shown three times.
- One files block (Attach files, Download / save reply) instead of two; the full-review save option moved into it. The mode banner and the attach hint are hidden in Expert.
- One step list: five loops, the detailed steps of the current loop open inside it. Wide screens: left column. Narrow screens (900 px and below): one line at the bottom with five segments and the current step; tapping a reachable segment goes back to that loop.
- New `src/ExpertNav.tsx`, `src/expertNav.ts`, `src/expertHistory.ts`; tests in `tests/core.test.mjs`. Server, API and data unchanged.
- Test change: `tests/core.test.mjs` (package C static checks) used to require the number 360 in `src/App.tsx`, which was the length cap of the removed answer preview. It now requires `expert-history`.

## P58 — Start-file consolidation, no product change (2026-10-21)

- `AGENTS.md` is now the only start file: a STATE zone rewritten by every patch, the map, run commands and the frozen RULES.
- Merged into it and removed: `docs/START_HERE.md`, `docs/STATUS.md`, `docs/DEPLOY.md` (moved to `docs/08` §8.10), `docs/README.md`, root `README.md`.
- Removed unreferenced files: `APPLY.sh`, `docs/AUDIT_EVIDENCE.json`, `docs/ROUTE-CATALOG.csv` (71 of 74 line numbers were already wrong; routes are guarded by `tests/feature-manifest.json`).
- `scripts/check-docs.mjs` checks paths in `AGENTS.md` only; `tests/security.test.mjs` reads `AGENTS.md` instead of the removed status file.
- Product version unchanged.

## P57 — Conversation latency, no product version change (2026-10-20)

- `conversation_timing` log line per turn: time spent before the model, in the main call, in the quality retry and in the verifier.
- The quality retry is skipped when the turn has already taken longer than `QUALITY_RETRY_MAX_ELAPSED_MS` (default 12000 ms); the first draft is returned. `0` restores the earlier behaviour.
- The optional Groq verifier waits `EPISTEMIC_TIMEOUT_MS` (default 5000 ms, was 12000 ms); the reply never depends on it.
- Assistant messages older than the last two messages are cut to `OLDER_ASSISTANT_MAX_CHARS` (default 2500) in the model input; user messages, the latest exchange and the durable state are unchanged. `0` restores the earlier behaviour.
- New `server/latencyPolicy.ts`; tests in `tests/conversation-turn.test.mjs`.

## P56 — Regression guard and test hygiene (2026-10-18)

- No product change. All test files now run in CI; a guard test fails when a route, module, control or check disappears.
- Documents synchronised; spec coverage audit added.

## P55 — First test round: Drive, Decision brief, More menu (2026-10-18)

- Google Drive: files from every mode go to BiForge / Simple | Expert | Project; every save or refusal is shown; files attached before Connect are saved after it.
- Project: Drive buttons (connect, save all, save file, save ZIP).
- «Decision brief» is readable text in a proper dialog.
- The More menu is closed by default at every width.

## P54 — Project Delivery tab: gates and manual Code Delivery (2026-10-17)

- New tab **Delivery**: hand-off task, package, result, checks, review, decision, repair, close. GitHub stays read-only.
- New `POST /api/projects/:projectId/code/manual`, `GET /api/projects/:projectId/code`; `expectedBranch` on code tasks.

## P53 — Project scope «analysis + ZIP», GitHub read-only (2026-10-17)

- `CODE_EXECUTOR=model_patch` no longer implies GitHub write; `GITHUB_DIFF_UPLOAD=true` is the only write switch.
- `/api/session` reports capability booleans to a signed-in person; the Project page shows what is available on this server.
- ADR-06 Amendment 1.

## P47 — Mode controls only in More menu (2026-10-15)

- Removed top-level **Expert method / Simple chat** and **Modes** header buttons.
- Mode changes only via **More**: Mode selection (three cards), Switch to Expert/Simple, Project workspace.

## P46 — Return to mode cards from Simple/Expert (2026-10-15)

- Header **Modes** button (and More → Change mode) clears `biforge-start-mode` and shows the three-card start screen again.
- Stale `Project` session on `/` no longer skips the start screen.
- Project workspace «Back» links clear session and go to mode selection (symmetric with chat).

## P45 — UI1 start screen on prod + ui-check (2026-10-15)

- Confirmed production bundle lacked `chooseStartMode` / start cards; ship `src/App.tsx` with explicit Simple / Expert / Project start screen after sign-in.
- More menu: **Change mode** returns to the start screen (clears session selection).
- `tests/ui-check.mjs`: click Simple on the mode start screen before waiting for `.header-actions` (fixes ui-check red).

## P44 — CI hotfix for P42/P43 (2026-10-15)

- `docs/REPO_MAP.md`: describe `tests/qa1.test.mjs`, `tests/p43-rm-c3.test.mjs`, `test:qa1`, `test:p43`.
- `tests/p41-ui1.test.mjs`: keep UI1 → QA1 → MANUAL1 marker order requirements with clearer asserts.
- `package.json`: `test:qa1` uses `node --import tsx --test` so TypeScript server modules load in CI.
- `docs/STATUS.md`: restore `**UI1**` marker ahead of `**QA1**` / `**MANUAL1**`.

## P43 — RM-C3 close: authorize `model_patch` (2026-10-15)

- Owner command closed checklist **RM-C3**: `CODE_EXECUTOR=model_patch` authorized after accepted ADR-10 / E-01.
- Process/docs only: STATUS, OWNER_OPS, DELEGATION, `.env.example` updated; runtime still requires the environment variable.
- GitHub App write permissions and `GITHUB_DIFF_UPLOAD` remain deferred (ADR-06).
- Regression: `tests/p43-rm-c3.test.mjs`.

## P42 — QA1 cross-mode automated checks (2026-10-15)

- Added offline QA1 suite (`tests/qa1.test.mjs`) covering Simple classification and soft-fail, Expert/Project instruction isolation, UI start cards, shared honesty core, triage wiring and integrity of prior mode regressions.
- Wired `npm run test:qa1` into package scripts; product runtime behaviour unchanged.
- STATUS next gate advanced to MANUAL1 after offline QA1.

## P40 — Mandatory patch delivery contract (2026-10-15)

- Documented `bf-PNN.zip` as the required primary artifact; `.patch`/`.diff` cannot substitute for the ZIP.
- Required independent archive read-back/content verification and explicit `DELIVERY BLOCKED` when a verified ZIP cannot be produced.
- `patch:pack` now defaults to `bf-PNN.zip`; added a regression guard for the contract. Process-only; product behavior/version unchanged.

# P39 — file-work security

- TAR ingestion now keeps the first occurrence of an exact duplicate path and reports later duplicates as skipped.

## P38 — Workspace export UI (2026-10-15)

- Workspace card: Download all (.zip), Changes only, Text diff (when version ≥ 2).
- Uses existing `exportWorkspace` (byte-identical full export).
- `test:p38`; product version 39.

## DOC1 — STATUS hub (2026-10-15)

- Added `docs/STATUS.md` as the only day-to-day progress file (where we are, next, owner blockers, open questions).
- `START_HERE`, `CURRENT_STATE`, `NEXT` reduced to pointers; AGENTS / PATCH_TEMPLATE / DEVELOPMENT_PROTOCOL require STATUS updates each patch.
- No product version bump (docs-only hygiene).

## P37 — Unified Workspace attach (2026-10-15)

- One primary **Attach** button: a single zip/tar is unpacked into the workspace tree; other files are stored as entries. Optional Folder on desktop.
- Composer drag-and-drop / `be:attach-files` routes into the same workspace (agent-visible place after privacy ack).
- Clearer status copy: file count and “say what to do in your message”.
- Product version 37. Export remains the next planned capability (P38 in the file-work plan).

## P36 — Workspace ChangeSet UI (2026-10-15)

- Human confirmation card for agent ChangeSet: unified diff, Apply / Reject / Rollback.
- Version never advances until Apply; validate re-checks baseSha256; rollback commits a new version.
- `parseChangeSetFromText` extracts ChangeSet from agent JSON fences; App surfaces it to WorkspacePanel.
- Docs: parallel TZ rules + “later green CI closes earlier gates” in `docs/BiForge_TZ_P26.md` §15.
- `npm run test:p36`; product version 36.

## P35 — Universal File Analysis (2026-10-15)

- Shared `FileContentExtractor` (`src/workspace/extract.ts`): PDF via `unpdf`, DOCX/XLSX/PPTX via `jszip`+XML, CSV/TSV/JSON/text via pure JS. No new npm dependencies.
- Office zip packages classified as `office` by extension. `readWorkspaceFile` / WorkspacePanel attachments use extracted text with DATA markers (D-07); images and undecodable binaries stay metadata-only.
- Secrets remain excluded without explicit approval; original blobs are never mutated.
- `npm run test:p35`; product version 35.

## P34 — Universal Workspace MVP (2026-10-15)

- WorkspacePanel is available in the shared Simple/Expert application surface and supports individual/multiple files in addition to archives and folders.
- After explicit privacy acknowledgement, bounded readable text and safe metadata are attached to agent requests; secret-flagged files are excluded. Unsupported binary formats remain preserved but are not claimed to be decoded.
- Fixed Workspace persistence to accept content-addressed SHA-256 blobs produced by ingest; added P34 ingest/persistence/byte-integrity tests.
- Automated checks were NOT RUN: dependency installation timed out in the patch environment. CI must run `npm run test:p27`, `npm run test:p34`, `npm run check`, and `npm run build`.

# Changelog

## MP2 completion — light Simple/information prompt (2026-10-14)

- `buildSimpleConversationPrompt` takes the detected conversation mode. `information` now gets a light prompt (shared core, light method, boundaries, unavailable-answer contract, files/documents rules, compact crisis triage, JSON keys with optional scaffold fields) instead of the full decision method. Simple prompt for `information`: 28 668 → 12 413 chars on the same input.
- `decision`, `research`, `engineering` and an omitted mode keep the previous prompt text unchanged (verified against a pre-change snapshot). Expert and Project instructions untouched.
- `server.ts` passes the detected mode to the prompt builder. The information mode paragraph no longer mentions the removed rituals.
- New `tests/mp2.test.mjs` (`npm run test:mp2`, part of `npm run check`). Product version label stays 24.

## Mode initiative — master implementation plan (2026-10-14)

- Added `docs/MASTER_IMPLEMENTATION_PLAN.md` as the single active sequence for the Simple / Expert / Project mode initiative.
- Recorded owner-approved mode definitions, shared-core architecture, MP1–MP3, explicit start-screen mode selection, integrated automated QA and manual acceptance.
- Updated `docs/CURRENT_STATE.md`, `docs/NEXT.md`, `docs/START_HERE.md`, `docs/REPO_MAP.md`, and `AGENTS.md` to point to the plan. Marked the earlier PI-03 SPEC and uncertainty concept as historical for active planning.
- Documentation only: no runtime code, UI, prompt, model or test behaviour changed. Coding requires a separate owner command.

## Docs — history off-repo + patch journal (2026-10-14)

- `docs/HISTORY_OFFREPO.md`: full path list for owner local archive (ARCHIVE/CONCEPTS bulk + optional CHANGELOG_AGENT_BEHAVIOR).
- `docs/PATCH_JOURNAL.md`: short newest-first agent patch log.
- `ARCHIVE/README.md`, `CONCEPTS/README.md`: stubs after bulk leaves GitHub.
- `AGENTS.md` / `START_HERE.md`: no extra md files; one SPEC + one REPORT per patch.

## Docs — OWNER_OPS bookmarks (2026-10-14)

- Added `docs/OWNER_OPS.md`: single non-secret registry of prod URL, Railway project, GitHub App, deploy facts.
- Pointers from START_HERE, CURRENT_STATE, REPO_MAP, AGENTS.

## Docs — agent patches from P27 (2026-10-14)

- **Next agent patch** pointer in `docs/CURRENT_STATE.md` (current: **P27**).
- `docs/P27-SPEC.md`: Simple Mode workspace attach UI (~½ session scope).
- `docs/NEXT.md`: schedule **P27–P34+**; owner `RM-*` separated from agent patches.
- `docs/START_HERE.md`, `AGENTS.md`: “next patch” = pointer + SPEC only.
- Supersedes unfinished naming P26a.2 UI / P26b-UI (work moves to P27–P29).

## Docs — agent queue snapshot (2026-10-14)

- `docs/CURRENT_STATE.md` rewritten: done / partial / open gates for the next AI Assistant.
- `docs/NEXT.md`: **Unified queue** table (G4 + P26 in one order).
- `docs/START_HERE.md`, `AGENTS.md`: pointers to snapshot and queue; do not re-do closed P26a/P26b core.

## P26b — Workspace ChangeSet and export (2026-10-14)

- changeset.ts / exportZip.ts / diff.ts; test:p26b; docs P26b-SPEC/REPORT.

## P26a.2 — tar/folder ingest and workspace storage/context (2026-10-13)

- Added POSIX tar + gzip-tar reader (PAX/GNU long names), folder-ingest helper, IndexedDB store, privacy-gated WORKSPACE context, safe file reads/search and bounded model follow-up contract.
- Added `test:p26a2` to `npm run check`.
- AC-04 Simple/Expert UI + fake-Gemini end-to-end remains NOT_RUN; this slice provides the core helpers but does not yet wire them into the chat UI.

## P26a — Workspace zip ingest (2026-10-13)

- ADR-12: controlled server-side archive unpack in Project Mode only.
- New `src/workspace/` core: paths, classify, hash, zip ingest, memory store.
- `server/files.ts`: accept source/config extensions as text; fix zip path `..` check.
- Tests: `npm run test:p26a` (paths + ingest + bf-v24 fixture).

## Process tooling — 2026-10-13 (no product version change)

- **PA-05:** E-01 closed. `ARCHIVE/E01-NOTES.md`, `ARCHIVE/E01-RESULTS.json`. ADR-10 status → **Accepted** (TZ §11.9 PASS: 3/3 green first, 0 fixes, model ≤ manual human time). Owner: `ok ADR-10`. RM-B5 and RM-B6 closed; Stage C open on command. Product version unchanged (24).

## Process tooling — 2026-10-13 (no product version change)

- **PA-04:** E-01 lab runner template (`CONCEPTS/e01-task.yml`, `workflow_dispatch`, `GITHUB_TOKEN`), setup guide, `scripts/e01-notes-merge.mjs`, `tests/pa04-acceptance.test.mjs`. Navigator: Run workflow + one-line minutes; notes via Assistant patch.

## Process tooling — 2026-10-13 (no product version change)

- **P19x:** `model_patch` driver — `driveModelPatch` (code_author payload → `validateModelPatch` → `biforge/<task_id>` commit → PR). Still gated by `CODE_EXECUTOR=model_patch` and ADR-10. Tests: `tests/p19x-acceptance.test.mjs`.
- **PA-02:** E-01 harness (`scripts/e01-harness.mjs`) separate from the product (TZ 11.9); fixtures and `tests/pa02-acceptance.test.mjs`. Test GitHub repository approved for the experiment.

## Process tooling — 2026-10-13 (no product version change)

- PA-01: evidence workflow and gate evaluator (process tooling, no product change). `scripts/gate-eval.mjs`, `scripts/evidence-collect.mjs`, `.github/workflows/evidence.yml`, `tests/pa01-acceptance.test.mjs`. Delegation policy `docs/DELEGATION.md` accepted; `AGENTS.md` section 12.

## Documentation — 2026-10-13 (no product version change)

- TZ v3.0 (one 284 KB file) split into parts, no change of decisions or requirements: `docs/SPEC_PRODUCT.md`, `docs/SPEC_ENGINE.md`, `docs/SPEC_DEV_PROCESS.md`, `docs/SPEC_CONNECTIONS.md`; `docs/BiForge_TZ_v3.md` is now the index with a section → file map. Former section 16.7 became the flat checklist `docs/NEXT.md` (steps `RM-*`). History, Appendices C/F/G and the original monolith moved to `ARCHIVE/TZ_v3.0_*.md`. Section numbers are preserved.

## v24 — 2026-10-12

- **P24 (BX-25):** authenticated `/ops` and `/api/ops` metrics, `ops:backup-check`, ADR-09 (RPO/RTO), OPS_ROLLBACK procedure.

## v23 — 2026-10-12

- **P23 (BX-24):** security evidence — formal threat model, injection corpus CI assertions, redaction, rights review, audit completeness (login fail, project delete, settings change).
- Product version **23**.

## v15a — 2026-10-12

- **P15a (BX-27.a):** provider connection and quota monitoring (Appendix G S1–S2). Migration `014_provider_snapshots`, pure evaluators, CLI `monitor:connections`, weekly GitHub Actions workflow, ADR-11.
- Instruction track **PI-01 / PI-02 / PI-03final** recorded as complete in CURRENT_STATE.
- Security foundation for P23: `docs/THREAT_MODEL.md`, `docs/RIGHTS_REVIEW.md`, injection corpus fixtures, `server/redact.ts` + tests.

# Changelog
- PI-01: Simple Mode conversation prompt gets the uncertainty contract (TZ-INSTRUCTIONS-01 P1): best available result of a marked kind instead of a repeated limitation, no invented numbers, no claimed search. No schema or post-processing change; test `tests/pi01.test.mjs`. Product version label `PI-01`.
- P22: BX-23 Repair Loop — classify failure, at most two repair packages, stop on limit / identical diff / identical error / no progress / budget with a diagnostic artifact; one flaky CI restart. Product version 22.
- P21: BX-22.b pilot — structured reviewer findings on DELIVERED code tasks; human decision accept/repair/reject; review gate evidence; product version 21.

Format: newest first. Behavior changes must update tests and this file in the same step (TZ 16.3).

- P20b: Task PASS blocked unless gates Release Candidate is PASS/WAIVED when a code head exists; `POST .../gates/:gate/approve` for requirements/spec/review.
- P20: brief_writer package drafts; human package approval; Test Integrity package baseline; optional commit of approved package to `biforge/<task_id>` (writes gated). Product version 20.
## PI-02

- PI-02 (TZ-INSTRUCTIONS-01 P2): server-side intent flags (`userForbadeQuestions`, `userAskedApproximate`, `userAskedSearch`, `userCriticizedEvasion`) adjust Simple Mode post-processing — `askAllowed`, soft quality-audit / retry text, and `meta.search_expected`. No new model JSON fields. Version label `PI-02`.

## Unreleased
- P19: BX-21.b. `model_patch` executor (gated by CODE_EXECUTOR=model_patch): structured patch schema, validateModelPatch (protected paths, size, allowed_paths), createModelPatchExecutor; ADR-10 remains interim. Repository: ARCHIVE/ (historical SPECs and reports) and CONCEPTS/ (future drafts); AGENTS.md and START_HERE updated. Packer: `scripts/pack-simple.mjs` replaces the previous patch:pack path (timeout-safe, no hanging children). Simple Mode unchanged.


- P18: BX-21.a. CodeExecutor interface and the `manual` executor (`server/codeExecutor.ts`, `server/codeTaskService.ts`, migration 010: `code_tasks`). A human starts a run with a Task Package, takes `PACKAGE.md` (artifact, no secrets, deterministic) to any tool and returns a PR, a branch or a unified diff; results are validated (10 files / 400 lines, `allowed_paths`, protected paths, text only, no modes, symlinks or renames) and a refused result is `BLOCKED` with violation codes. Diff upload is applied through the Git Data API as one commit on `biforge/<task_id>` plus a PR, only with `GITHUB_DIFF_UPLOAD=true`; no merge, no `main`. PR found by webhook or `refresh`. `max_code_tasks` is checked at start; `model_patch` is unavailable until P19. Seven routes under `/api/projects/:projectId/tasks/:taskId/code`, human session only. Simple Mode unchanged.
- P13b (build process): the ZIP is created and validated before long-running tests; independent stages use timeouts, forced process-group termination, and streaming logs; report `PARTIAL` for errors, timeouts, blockers, and checks that did not start. Critical preflight still blocks delivery. Agent stop rules, report and CI clarified; test and PostgreSQL time limits added.

- Process (documents only): TZ 16.3.2 and 16.4.4, patches P13a and P13b in the plan, Navigator / AI Assistant terms and AGENTS.md section 3.1, `docs/NEXT.md`. No program code changed.

- P13a: BX-28. Process automation (TZ 16.3.2): `npm run patch:pack` builds the cumulative archive (changed and new files, no manifest) and a report with only the commands actually run; the preflight refuses a manifest, nested or new top-level folders, possible secrets and changes to `tests/acceptance/**`; `ci.yml` writes a one-line CI result and the first failed test (job summary and annotation). Scripts `patch-tools.mjs`, `patch-pack.mjs`, `ci-summary.mjs`. No product code changed; Simple Mode unchanged.
- P14: BX-17.b. Full Artifact Registry: any file as an artifact (unknown format = binary), type from content, manifest per version (migration 008, older versions backfilled), tamper and missing-object detection on every read, limits (5 MB, 200 versions, 1000 artifacts, file name), executables flagged and never run, inspect, preview (text), diff, ZIP name listing without unpacking, project manifest export; ADR-05, ADR-08; `check:docs` now requires `server/`, `tests/` and `test:*` scripts in `docs/REPO_MAP.md`. No routes, no UI; Simple Mode unchanged.
- P13: BX-16 (domain part). Budgets on project/task/run (calls, tokens, units, wall clock, attempts, code tasks) checked before every model call, over budget -> Task BLOCKED(budget) plus one approval request, only a human raises a budget; Task Graph v1 (validator: no cycles, known dependencies, at most 12 tasks, total within the project limit; static template; a plan runs only after human approval); `approvals` table, modes supervised/manual (no autonomous); at most 2 Runs per project. Migration 007; `server/planMachine.ts`, `server/planService.ts`. No routes, no UI, worker not started from server.ts; Simple Mode unchanged.
- P12: BX-15.b. Job queue and worker (server/queueMachine.ts, server/queueService.ts, server/worker.ts, migration 006: jobs): FOR UPDATE SKIP LOCKED claim, lease and heartbeat, expired lease -> Run ABANDONED and Task BLOCKED(recovery), recovery pass on worker start, a lost worker never becomes PASS; enqueueTask creates the job and finishRun closes it. Worker is not started from server.ts; Simple Mode and S1 untouched.
- P11: BX-15.a. Task/Run state machine (server/taskMachine.ts, server/taskService.ts, migration 005: tasks, runs, task_events): strict transitions, optimistic versions, an event per transition, idempotent createTask/enqueueTask by key and input fingerprint, PASS only with recorded validation and evidence, a lost or failed run never becomes PASS (ABANDONED -> BLOCKED(recovery)), changed input invalidates PASS. No routes or UI; Simple Mode and S1 untouched.
- P10: BX-14. Golden-eval: 18 RU/EN tasks (10 analysis, 8 verify with injected defects and clean controls), deterministic scoring, runner on fake adapters, Markdown report docs/GOLDEN-EVAL-REPORT.md (quality, units, shadow cost, provisional quality_class suggestions), ADR-04 draft (cross_model decision belongs to the owner; report is a hypothesis). Simple Mode and Router untouched.
- P09: BX-13.b. Fallback matrix rows implemented and tested (deadline-aware retry, cooldown until reset via retryAfterMs, provider disable with audit event and 6 h expiry, category system, escalate human), model_health table and hydration, quota windows restored from the ledger, daily cap per project with 80 %/100 % levels. Simple Mode untouched.
- P08: BX-13.a. Router v1 (`server/router.ts`): candidate order by quality class, cost tier (`self_hosted` < `free` < `paid`) and registry order; paid models only with explicit approval; sensitivity filter (`high` admits only `paid`/`self_hosted` data policies); context, input-budget and quota-window checks (rpm/tpm/rpd/tpd) before the call; output capped by the model limit; per-run budget in units (30 by default) checked before every call, `blocked` instead of overspending. New `server/budget.ts` (units formula `units-v1`, quota tracker, shadow cost), `server/routeDecisions.ts`, migration `003_route_decisions.sql` (`route_decisions`, `usage_ledger.units`); ledger rows carry `route_decision_id`, units and shadow cost. Registry: `costTier`, `limits`, `pricing`, `self_hosted` data policy. `tests/p08-acceptance.test.mjs` (owner-approved, protected) added to `check`. ADR-07 accepted. Simple Mode untouched.
- P07: BX-12.a. `server/openaiCompatAdapter.ts` (universal Chat Completions adapter), Groq in the registry (`openai/gpt-oss-120b` active, two others disabled; Free-plan limits and budgets recorded), `groq` in `connectors.yaml` and `verify:connections` (Bearer auth, JSON content check), manual workflow `verify-groq.yml`. `verify:connections --only groq` returned OK on 10 October 2026.
- TZ: Appendix G (monitoring of free and limited provider capacity; planned after G2 as reserve patches P15a/P15b, steps BX-27.a/b), ADR-11, risk R-21, pointer in 7.5. Documentation only.
- P06: BX-09.a part 2 and BX-09.b (slice S1, TZ 18.0). `server/contextBuilder.ts` (instruction + State slice by relevance within a token limit + decisions and requirements always + referenced artifacts + task; unverified and rejected items excluded; chat history only with a recorded reason; tokens measured per block); `server/analysisService.ts` (passport must be confirmed -> Router-min -> patch pipeline as `proposed` -> `analysis.md` artifact -> ledger rows with `run_id`; human confirm/reject; decisions human only); routes `POST /api/projects/:id/analyze`, `/items/review`, `/decisions`, `GET .../artifacts`, `.../artifacts/:artifactId`, `.../ledger`; Project Mode panel (task, proposed items with Confirm/Reject, decision form, artifacts, model calls with tokens). Simple Mode untouched. UI and code name "Bifurcation Engine" replaced with "BiForge" everywhere. Tests `context-builder.test.mjs`, `analysis-live.test.mjs`.
- P05: BX-09.a part 1. `server/statePipeline.ts` (State items schema, patch pipeline schema -> policy -> apply, atomic; model items always `proposed`; decisions human only; fact without `ref` is `unverified`; one rule-based confirmation: artifact ref + quote; deterministic compaction that never touches decisions, requirements and open high risks); `server/stateService.ts` (applies a patch or compaction as a new State version with audit events); `updateProjectState` refuses `actor: agent` without the pipeline; State with invalid `items` is refused. Not wired to any route or to Simple Mode. Tests `state-pipeline.test.mjs`, `state-pipeline-live.test.mjs`.
- P04: BX-17.a and BX-10.b. Migration `002_artifacts_ledger.sql` (`artifacts`, `usage_ledger`, `connection_checks`); `server/artifactRepository.ts` (text artifacts, versions, SHA-256, same content is not duplicated, hash checked on read); `server/ledger.ts` and an `onCall` hook in Router-min (every call is reported); `connectors.yaml` in manifest format v1 (gemini, postgres); `npm run verify:connections` (`scripts/verify-connections.mjs`); `docs/CONNECTIONS.md` rewritten (rules R1-R7, A-01/A-02 console checks); tests `connections.test.mjs`, `artifacts-live.test.mjs`. Simple Mode untouched.
- P03: BX-10.a part 2 and BX-11. Added `server/geminiAdapter.ts`, `server/fakeProvider.ts`, `server/router.ts` (Router-min, fallback by TZ 7.4), `tests/conformance.test.mjs`, `docs/ADR-02-gemini-adapter.md`. `generate()` and Simple Mode untouched (not switched).
- P02: BX-10.a part 1 (no switching). Added `server/adapter.ts` (provider error classes, fallback matrix as data, `ProviderAdapter` contract, normalized response schema) and `server/modelRegistry.ts` (registry schema, Gemini seed, capability and 90-day checks); `tests/model-layer.test.mjs`. `generate()` and Simple Mode untouched; the registry is not stored in the database yet.
- P00: documentation only. Added `docs/START_HERE.md`, `docs/REPO_MAP.md`, `docs/CURRENT_STATE.md`, `docs/PATCH_TEMPLATE.md`, `docs/BX-07-REPORT.md`; one specification name `docs/BiForge_TZ_v3.md`; TZ status approved, section "How to read" and 16.3.1 (actual process); `AGENTS.md` aligned with the real process; `scripts/check-docs.mjs` also checks backticked paths; environment variables documented; removed root clutter files and `BIFORGE-STATE.json`.
- P00b: deleted historical step specs, reports and audits (BX-01…BX-05, BF-01, QA diagnostic of 9 October 2026, `AUDIT_REPORT_RU.md`); references updated.
- Patch A: `/health`, `/ready`, `/api/health` return `commit` (RAILWAY_GIT_COMMIT_SHA).
- Patch B: TZ updated (language rule 6.1.1, step rules in 16.3, BX-07 narrowed); CHANGELOG.md added.
- BX-07.a: `updateProjectState` requires a non-empty `sourceRef`; `project.created` event records `source_ref`; live test checks provenance on versions and events.
- BX-07.b: live test that Project State and history survive a service restart and the version counter continues.
- BX-07.c (part 1): `/project` UI (src/ProjectMode.tsx) is English; test text updated. Simple Mode (src/ui.ts, src/App.tsx) is still Russian — next part.
- BX-07.c: UI is English only (TZ 6.1.1). Removed the Russian UI dictionary and DOM translation from `src/ui.ts` (`installUiLanguage` is now a no-op), Russian variants of error/status messages (`src/errors.ts`, `attachments.ts`, `ConversationFiles.tsx`, `App.tsx`, `libraryExport.ts`), and the Russian model-unavailable fallback reply (`server.ts`). Kept on purpose: Russian number words and keyword lists (recognition logic), crisis phrases, transliteration table, language detection, and Russian test inputs. Generated document labels still follow the dialogue language.
- TZ: section 16.4 reworked into a patch-based delivery plan (P01-P25); UI shows only 'BiForge' (6.1.1 rule 4); 16.3 rule 6 and 16.5 updated.


## 1.6.0 — cumulative P13b + P15 patch (2026-10-11)
- Wired Task Graph plan/approval/task routes and Project Mode controls.
- Started queue worker in configured Project Mode and connected task model calls to pre-call budget guards, Run-linked ledger, and Artifact Registry.
- Added P15 static acceptance checks and truthful report/ADR-10 pending record.
- Live G2/E-01 remain unverified; no `model_patch` execution or deployment approval is implied.

## P17 — Gate Engine and CI evidence (BX-20)
- Gate Engine (`server/gateEngine.ts`, `server/gateService.ts`, migration 009: `gate_evidence`, `gate_waivers`, `task_heads`). PASS only from registered evidence bound to the head commit; model statements rejected; evidence of another commit or invalidated evidence is ignored; a new head SHA invalidates earlier evidence; changes under `tests/acceptance/**` are FAIL, an unreadable diff is BLOCKED; WAIVED only by a human with a reason, audited; Release Candidate is derived and has a manifest.
- `/api/webhooks/github` now registers evidence for `check_run` and `pull_request` events of `biforge/<task_id>` branches (typed fields only, idempotent); invalid signatures still 401. Routes `GET /api/projects/:projectId/tasks/:taskId/gates` and `POST .../gates/:gate/waive`.
- P16 completion: read of PRs, PR files and check runs; Task Package commit helper limited to `biforge/<task_id>` and Task Package paths, off unless writes are enabled, no merge operation.
- Fix: `connectors.yaml` github block (literal `\n`) and `github` row in `docs/CONNECTIONS.md`; `docs/CURRENT_STATE.md` rebuilt (the archive copy held a script); `docs/REPO_MAP.md` rows separated.

## P16 — GitHub integration foundation
- Added least-privilege GitHub App connection verification and signed webhook ingress for `pull_request` / `check_run` events. Event processing and Code Delivery remain disabled pending owner decisions.

- Model pool: removed deprecated aliases gemini-3.7-flash and gemini-3.5-flash (routed by Google to 3.8 / 3.6). A quota error from one model no longer aborts the whole request: the model is parked for 30 min (`llm_quota` log) and the next one is tried; `GEMINI_QUOTA` is returned only when every model is out of quota. Defaults: LLM_CALL_TIMEOUT_MS 25000, LLM_TOTAL_DEADLINE_MS 70000.

- Documents (12 October 2026): TZ section 16.7 added (step-by-step plan to G4: stages A-F, owner and agent roles, PASS criteria, branch on E-01, recommended Railway Variables, after-G4 work); 16.4.1 and 16.4.2.a brought to the actual state (P01-P24 done); `docs/NEXT.md`, `docs/CURRENT_STATE.md`, `docs/START_HERE.md`, `AGENTS.md`, `DEPLOY_RAILWAY.md`, `docs/REPO_MAP.md` updated. No program code changed.


## 13 October 2026 — Project Mode program creation

- Added a gated “Create a small program” action in Project Mode and `POST /api/projects/:projectId/code/build`.
- Wired the model_patch start path to the configured Router-backed JSON code author.
- Validated generated source is stored as a downloadable ZIP artifact under `generated-projects/<task_id>/**`; GitHub PR delivery remains gated and merge is still human-only.
- Documented maximum automation as an owner-set primary priority without expanding delegation permissions.
- Generated code is not executed by the BiForge server; runtime tests/preview and CI evidence are not implied by source generation.

## P41 — UI1 mode start screen (2026-10-15)

- Added explicit Simple, Expert, and Project start cards. Project shows an explicit disabled state when unavailable; selecting a mode is user-driven and does not auto-switch later.
- Recorded the existing folder-picker-to-menu behavior (`PICK_FOLDER_EVENT`) in the patch journal.
- Corrected STATUS sequencing to UI1 → QA1 → MANUAL1 and removed the resolved UX1 feedback question.
