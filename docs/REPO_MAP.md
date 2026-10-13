# Repository map

> Compiled from the actual archive contents (10 October 2026). Start with `docs/START_HERE.md`. The structure is flat: root and first-level directories only (exception: `.github/workflows/`).

## Root

| Path | What it is / when to touch |
| --- | --- |
| `server.ts` | Server monolith (Express): routes, auth, model calls, Simple Mode API, Project Mode API. Touch for server behaviour; new logic goes to `server/*.ts` where possible |
| `server/` | Server modules (see below) |
| `src/` | Client (see below) |
| `migrations/` | SQL migrations for PostgreSQL, applied by `scripts/migrate.mjs`. Add a new numbered file; never edit an applied one |
| `scripts/` | Utility scripts (see below) |
| `tests/` | Tests (see below) |
| `public/` | Icons for the browser and PWA manifest |
| `docs/PA-04-SPEC.md` | PA-04 E-01 lab runner (process; workflow template for the test repo) |
| `docs/E01_LAB.md` | E-01 lab: Navigator runs workflow_dispatch; notes via Assistant patch |
| `docs/NEXT.md` | Plan to G4 as a flat checklist (steps `RM-*`: inputs, PASS) and queue of next patches; updated by the AI Assistant at the end of every patch |
| `docs/BiForge_TZ_v3.md` | Index of the specification (TZ v3.1): file map and section → file map. The text itself: `docs/SPEC_PRODUCT.md`, `docs/SPEC_ENGINE.md`, `docs/SPEC_DEV_PROCESS.md`, `docs/SPEC_CONNECTIONS.md` |
| `ARCHIVE/TZ_v3.0_monolith.md` | The original TZ v3.0 in one file and its retired parts (`ARCHIVE/TZ_v3.0_*.md`): history only, not read for patches |
| `docs/PATCH_PROMPT.md` | Universal session prompt for any PNN: context order, version = patch number, packaging `bf-PNN.zip`, report |
| `docs/` | Specification, policies, step specs, reports; plus informational agent-instruction materials (not binding; see table below) |
| `.github/workflows/ci.yml` | CI on every push (writes a short result line, P13a): migrations on clean PostgreSQL, `npm run check`, live PostgreSQL tests, Project Mode API tests, build, secret scan. Change only if the SPEC says so |
| `.github/workflows/evidence.yml` | PA-01: manual evidence run (service health, connections), then decision cards; read-only, no commits |
| `.github/workflows/ui-check.yml` | Browser layout check (`npm run test:ui`) |
| `package.json`, `package-lock.json` | Dependencies and npm scripts. Do not add dependencies without a reason in the SPEC |
| `tsconfig.json`, `tsconfig.server.json` | TypeScript settings for client and server build |
| `vite.config.ts`, `index.html` | Client build settings and HTML entry |
| `railway.toml`, `nixpacks.toml` | Railway build and start configuration |
| `connectors.yaml` | Inventory of external connections (no secrets). Change together with `docs/CONNECTIONS.md` |
| `.env.example` | Names and defaults of environment variables (no real values) |
| `.gitleaks.toml`, `.gitignore`, `.nvmrc` | Secret scan settings, ignored files, Node version |
| `AGENTS.md` | Rules for development models. Change only as a separate policy change |
| `README.md` | Short description, run and check commands. Version in its first line is checked by `scripts/check-version.mjs` |
| `DEPLOY_RAILWAY.md` | Railway deployment and environment variables. First line version is checked |
| `CHANGELOG.md` | Project changelog (from BX-07). Update with every behaviour change |
| `CHANGELOG_AGENT_BEHAVIOR.md` | History of the Simple Mode agent behaviour (1.x). A section for the current version is required by the version check |
| `QA_DRIVE_CHECKLIST.md` | Manual Google Drive check (real Google) |


## `docs/` — informational agent-instruction pack (not binding)

These Markdown files live under `CONCEPTS/`. They are **reference / proposal only** (including post-launch shelf plans). Coding agents must not treat them as SPEC, must not change product behaviour from them without an explicit patch, and tests must not depend on them.

| Path | What it is |
| --- | --- |
| `CONCEPTS/BiForge_Agent_Instructions_v1_Extracted.md` | Extracted current (v1.6.0) agent instructions from code |
| `CONCEPTS/BiForge_Agent_Instructions_v2_Target.md` | Proposed target instruction set (uncertainty contract, modes) |
| `CONCEPTS/TZ_BiForge_Instructions_Uncertainty.md` | TZ-INSTRUCTIONS-01: how to adopt v2 behaviour incrementally |
| `CONCEPTS/BiForge_analytical_note_recommendations.md` | Analytical note on dialogue failure and architecture options |
| `CONCEPTS/TP_BiForge_Hallucination_CrossCheck.md` | TP-HALLUC-01: post-launch anti-hallucination / multi-model cross-check (shelf; not current work) |

Binding behaviour of Simple Mode remains: runtime prompts in `server.ts` / `server/reasoningState.ts`, and history in `CHANGELOG_AGENT_BEHAVIOR.md`. Canonical product plan remains `docs/BiForge_TZ_v3.md`.

## `server/`

| File | What it is |
| --- | --- |
| `server/contracts.ts` | Shared identifier contract (URL/DB-safe ids) |
| `server/adapter.ts` | Provider adapter contract, normalized response, provider error classes, fallback matrix (not wired yet) |
| `server/statePipeline.ts` | State items schema, patch pipeline (schema, policy, apply), compaction; pure functions |
| `server/stateService.ts` | Applies a patch or compaction to a project as a new State version (the only path for model output) |
| `server/artifactRepository.ts` | Artifact Registry (P04, P14): text and binary artifacts, versions, SHA-256, manifest (migration 008), tamper and missing-object detection, inspect, diff, project manifest export (PostgreSQL) |
| `server/contextBuilder.ts` | Context Builder: State slice within a token limit, token measurement; pure function |
| `server/analysisService.ts` | Slice S1: analysis run (Router-min -> patch pipeline -> artifact -> ledger), human review, decisions |
| `server/goldenEval.ts` | Golden-eval (P10): task schema, deterministic scoring, fake adapters, report |
| `scripts/golden-tasks.json` | Golden task set (18 RU/EN tasks); report: `ARCHIVE/GOLDEN-EVAL-REPORT.md` |
| `server/taskMachine.ts` | Task/Run state machine (P11): states, transitions, errors, input fingerprint; pure functions |
| `server/taskService.ts` | Task/Run domain service (P11): tasks, runs, events in PostgreSQL; idempotent create/enqueue (not wired to routes) |
| `server/queueMachine.ts` | Job queue rules (P12): states, lease timing, `QueueError`; pure functions |
| `server/queueService.ts` | Job queue (P12): claim with `SKIP LOCKED`, lease, heartbeat, completion, recovery of expired leases (PostgreSQL) |
| `server/worker.ts` | Worker (P12): `createWorker()` with `tick/start/stop`; a library, not started from `server.ts` |
| `server/planMachine.ts` | Budgets, Task Graph v1 validator and template, approval kinds/modes, `PlanError` (P13); pure functions |
| `server/planService.ts` | Budgets, plans, approvals, budget guard, concurrency settings (P13, PostgreSQL); not wired to routes |
| `server/artifactFormat.ts` | Artifact rules without a database (P14): limits, file name check, type by content, preview, line diff, ZIP name listing, manifest checksum; pure functions |
| `server/budget.ts` | Budget units formula `units-v1` and defaults (P08) |
| `server/routeDecisions.ts` | Stores Router decisions in `route_decisions` (P08) |
| `server/modelHealth.ts` | `model_health`: provider disable with expiry, quota restore (P09) |
| `server/openaiCompatAdapter.ts` | `openai-compatible` adapter (P07) |
| `server/ledger.ts` | Ledger-min: one `usage_ledger` row per provider call |
| `server/geminiAdapter.ts` | Gemini adapter: one call, normalized response, error classification (not wired) |
| `server/fakeProvider.ts` | Fake provider with scenarios for all error classes |
| `server/router.ts` | Router-min: candidate selection and fallback by the matrix (not wired) |
| `server/modelRegistry.ts` | Model registry schema and seed (model names live only here); not wired yet |
| `server/database.ts` | Lazy PostgreSQL pool; importing the server never opens a connection |
| `server/projectRepository.ts` | Project Mode storage: projects, State versions, events (zod contracts) |
| `server/healthRoutes.ts` | `/health`, `/ready`, `/api/health` (includes `commit`) |
| `server/githubIntegration.ts` | GitHub App JWT, installation-token permission checks, webhook signature verification, read of PRs, PR files and check runs, Task Package commit to `biforge/<task_id>` only; no merge (P16) |
| `server/gateEngine.ts` | Gate Engine rules: statuses, evidence validation, Test Integrity, check-run mapping, Release Candidate manifest; pure, no I/O (P17) |
| `server/gateService.ts` | Gate evidence persistence, GitHub webhook ingestion, invalidation on a new commit, human approvals and waivers (P17) |
| `server/briefWriter.ts` | P20: build Task Package draft from a structured brief (pure) |
| `server/reviewer.ts` | P21: structured review findings from gates + delivery (pure, no model) |
| `server/repairLoop.ts` | P22: Repair Loop classification, stop rules, repair prompt, diagnostic report (pure) |
| `server/intentFlags.ts` | PI-02: pure user-intent detectors (forbade questions, approximate, search, evasion criticism) and limitation-only check |
| `server/conversationMode.ts` | PI-03: conversation mode detection (considers recent turns) and the thin mode paragraph for the shared conversation prompt |
| `server/codeExecutor.ts` | CodeExecutor interface and `manual` executor, Task Package schema, PACKAGE.md, protected paths, allowed_paths, secret scan, unified diff parse/validate/apply; pure, no I/O (P18) |
| `server/codeTaskService.ts` | Code runs (`code_tasks`): start with a package, PR / branch / diff result, validation, diff applied through the Git Data API, poll and webhook sync, cancel, PACKAGE.md export (P18); review + human decision accept/repair/reject (P21); Repair Loop (P22); **P19x** `driveModelPatch` (model_patch → validate → biforge branch → PR, gated) |
| `server/security.ts` | Session signing, cookies, login limiter, same-origin check |
| `server/redact.ts` | Secret redaction helpers (values never logged; P15a/P23) |
| `server/untrustedData.ts` | Label untrusted text as data; injection signal list (P23) |
| `server/auditCatalog.ts` | Required audit event names and human-only set (P23) |
| `server/providerMonitor.ts` | Pure S1–S2 monitoring evaluators (P15a / Appendix G) |
| `server/opsMetrics.ts` | Ops metrics, alerts, `/ops` HTML (P24 / BX-25) |
| `server/files.ts` | Reading uploaded files (PDF, Word, Excel, etc.), attachment limits |
| `server/documents.ts` | Building Word and PDF documents |
| `server/reasoningState.ts` | Reading and sanitizing the decision state sent to the model |
| `server/pg.d.ts` | Type declaration for `pg` |
| `server/NotoSans-Regular.ttf` | Font for PDF output |

## `src/`

| File | What it is |
| --- | --- |
| `src/main.tsx`, `src/index.css` | Client entry and styles |
| `src/App.tsx` | Simple Mode client (the main screen) |
| `src/ProjectMode.tsx` | The `/project` page (Project Mode) |
| `src/config.ts` | `APP_VERSION` (single source of the service version), `SCHEMA_VERSION`, feature flags |
| `src/en.ts`, `src/ui.ts`, `src/errors.ts` | Interface strings and error messages (English only) |
| `src/decision.ts`, `src/triage.ts`, `src/evpi.ts`, `src/brier.ts`, `src/numberValidator.ts` | Method domain logic: model, applicability check, EVPI, Brier score, number validation |
| `src/storage.ts`, `src/autosave.ts` | Local storage and autosave rules |
| `src/driveClient.ts`, `src/driveSync.ts`, `src/driveMerge.ts`, `src/driveExport.ts`, `src/useDrive.ts` | Google Drive: transport, sync core, merge rules, save as Google Doc, React hook |
| `src/attachments.ts`, `src/ConversationFiles.tsx`, `src/programFiles.ts` | Files in the conversation |
| `src/libraryExport.ts`, `src/exportZip.ts`, `src/exportName.ts`, `src/sha256Export.ts`, `src/icsBuilder.ts`, `src/decisionDocument.ts` | Exports: library, JSON, file names, hash, calendar file, decision document |
| `src/HistoryPanel.tsx`, `src/AutoGrow.tsx`, `src/OfflineIndicator.tsx`, `src/usePWAInstall.ts` | Small UI parts |
| `src/support.ts` | Crisis support contacts and distress markers (also used by the server) |
| `src/demo-coffee.ts` | Demo example |

## `scripts/`

| File | What it is |
| --- | --- |
| `scripts/check-docs.mjs` | Document check: local Markdown links and backticked paths in the main documents |
| `scripts/check-version.mjs` | One version everywhere (`src/config.ts`, `package.json`, README, DEPLOY, changelog) |
| `scripts/lint-copy.mjs` | Forbidden wording scan |
| `scripts/patch-tools.mjs` | Patch tools (P13a): tree diff, cumulative archive, preflight (manifest, nested folders, secrets, `tests/acceptance/**`), report, CI summary text |
| `scripts/pack-simple.mjs` | `npm run patch:pack` (P19): timeout-safe zip of changed/new files only; no hanging child processes. Legacy `scripts/patch-pack.mjs` kept for history. |
| `scripts/ci-summary.mjs` | Last step of `.github/workflows/ci.yml`: one-line CI result and annotation with the first failed test |
| `scripts/run-independent-checks.mjs` | CI check runner: runs each command in the `check` chain independently, with a 10-minute timeout and per-stage logs |
| `scripts/gate-eval.mjs` | PA-01 (`npm run gate:eval`): E-01 rule (TZ 11.9) and gate rules (TZ 17) over evidence JSON; prints decision cards |
| `scripts/evidence-collect.mjs` | PA-01 (`npm run evidence:collect`): read-only service and connection checks; JSON for `scripts/gate-eval.mjs` |
| `scripts/e01-harness.mjs` | PA-02: dry-run E-01 table helper (TZ 11.9) |
| `scripts/e01-notes-merge.mjs` | PA-04: merge e01-run.json + human minutes into NOTES/RESULTS |
| `scripts/migrate.mjs` | Applies `migrations/` to `DATABASE_URL` |
| `scripts/qa.mjs` | Runs checks independently and writes a report (see `docs/DEVELOPMENT.md`; it is not what `npm run check` runs) |
| `scripts/measure-prompt.mjs`, `scripts/cases.mjs`, `scripts/acceptance-s2-05.mjs`, `scripts/acceptance-s2-06.mjs` | Prompt size measurement and blind quality comparison on a live model (owner's key; not in CI) |

## npm scripts

| Command | What it does |
| --- | --- |
| `npm run check` | Local convenience chain: version check, `check:docs`, `test:version`, `lint:copy`, `typecheck`, then unit tests (`merge`, `security`, `core`, `reasoning`, `export`, `sync`, `files`, `drivedocs`), `test:database`, `test:contracts`, `test:model-layer`, `test:conformance`, `test:connections`, `test:state`, `test:bx06`, `test:library`, `test:package-c`, `test:virtual` |
| `npm run build` | Client (`vite build`) then server (`build:server` into `dist-server/`) |
| `npm run dev` / `npm start` | Development server / production start (runs migrations if `DATABASE_URL` is set; Project Mode needs its variables) |
| `npm run lint`, `npm run typecheck` | `tsc --noEmit` |
| `npm run lint:copy` | Forbidden wording scan |
| `npm run verify:connections` | Checks Gemini and PostgreSQL connections (`--only`, `--json`, `--dry-run`); exit 0 / 2 / 3 | 
| `npm run check:docs` | Document check |
| `npm run test:version` | Test that the version check catches stale labels |
| `npm run test:virtual` | `tests/run.sh`: real `server.ts` against a fake Gemini |
| `npm run test:ui` | Browser layout check (Playwright; not in `check`) |
| `npm run db:migrate` | Apply migrations |
| `npm run test:database:live` | Live PostgreSQL contract tests (CI only without a local database) |
| `npm run patch:pack -- --base <archive> --patch <PNN> --agent "<tool, model>"` | Builds the patch archive and the report (P13a); options in `ARCHIVE/P13a-SPEC.md` |
| `npm run test:github` | GitHub App JWT, permissions, webhook signature, fake API flow, PR/check-run reads, Task Package commit limits (P16) |
| `npm run test:gate` | Gate Engine rules without a database (P17) |
| `npm run test:pi01` | PI-01: uncertainty contract in the conversation prompt; winter dialog through the real server on a fake Gemini |
| `npm run test:pi02` | PI-02: intent flags unit + conversation integration (fake Gemini) |
| `npm run test:pi03` | PI-03: conversation mode unit + mode paragraph in the prompt and health version (fake Gemini) |
| `npm run test:p22` | P22: Repair Loop stop rules and diagnostic report |
| `npm run test:p23` | P23: BX-24 security evidence (actorKind, injection, audit catalog, redaction) |
| `npm run test:pa01` | PA-01: gate evaluator, evidence collector (fake fetch), workflow safety, secret scrubbing |
| `npm run test:p19x` | P19x: validateModelPatch matrix, modelPatchToBranchChanges, createModelPatchExecutor |
| `npm run test:pa02` | PA-02: E-01 harness dry-run, protected-path reject, gate-eval shape |
| `npm run test:pa04` | PA-04: CONCEPTS templates + e01-notes-merge |
| `npm run e01:harness` | PA-02 tool |
| `npm run evidence:collect`, `npm run gate:eval` | PA-01 tools (see `docs/PA-01-SPEC.md`) |
| `npm run test:p24` | P24: ops metrics, alerts, backup-check |
| `npm run ops:backup-check` | Backup/restore readiness (migrations on disk; optional --live) |
| `npm run test:p15a` | P15a: monitoring evaluators and monitor CLI (offline) |
| `npm run test:redact` | Secret redaction unit tests |
| `npm run test:injection` | Injection corpus fixtures (flat under tests/) |
| `npm run test:p21` | P21: reviewer findings + decision routes |
| `npm run test:p20b` | P20b: PASS ↔ gates, approve routes |
| `npm run test:p20` | P20: brief_writer, package integrity baseline, approval helpers |
| `npm run test:p18` | CodeExecutor: package, PACKAGE.md, protected paths, diff parse/validate/apply, seeded fuzz, Git Data API writes on a fake GitHub (P18) |
| `npm run test:p08`, `test:p09`, `test:p10`, `test:p11`, `test:p12`, `test:p13`, `test:p13a`, `test:p14`, `test:p15` | Acceptance tests of one patch each, no database (part of `check`) |
| `npm run test:bx06:api` | Project Mode API tests on PostgreSQL |
| `npm run test:merge`, `test:security`, `test:core`, `test:reasoning`, `test:export`, `test:sync`, `test:files`, `test:drivedocs`, `test:library`, `test:package-c`, `test:database`, `test:contracts`, `test:bx06` | Single test groups included in `check` |
| `npm run clean` | Removes `dist/` |

## Tests in `tests/`

"PostgreSQL" = needs `DATABASE_URL`; in CI it is provided by the service container.

| File | What it checks | PostgreSQL |
| --- | --- | --- |
| `tests/core.mjs` | Core method logic, no network | no |
| `tests/reasoning.test.mjs` | State reading, size cap, hypotheses never in facts | no |
| `tests/security.test.mjs` | Sessions, cookies, login limiter, same-origin | no |
| `tests/files.test.mjs` | Attachments and documents (unit) | no |
| `tests/driveMerge.test.mjs`, `tests/driveSync.test.mjs`, `tests/driveDocs.test.mjs` | Drive merge rules, sync core, save as Google Doc (fake Drive) | no |
| `tests/export-name.test.mjs`, `tests/libraryExport.test.mjs` | Export file names; library export and import | no |
| `tests/version-check.test.mjs` | Version check catches stale labels | no |
| `tests/package-c.test.mjs` | Static checks of repository files (read the file for details) | no |
| `tests/state-pipeline.test.mjs` | Patch policy, atomicity, provenance, unverified facts, compaction invariants | no |
| `tests/state-pipeline-live.test.mjs` | Patch and compaction as State versions, 409, direct model write refused (live PostgreSQL) | yes |
| `tests/connections.test.mjs` | `verify:connections` against a fake Gemini, manifest and CONNECTIONS.md agreement, artifact input, ledger hook | no |
| `tests/artifacts-live.test.mjs` | Artifact versions, hash, integrity, ledger row on live PostgreSQL | yes |
| `tests/conformance.test.mjs` | Adapter conformance (fake and Gemini) and Router-min scenarios | no |
| `tests/model-layer.test.mjs` | Adapter contract, error classes, registry seed | no |
| `tests/contracts.test.mjs`, `tests/database-contract.test.mjs` | Identifier contract; database contract without a live database | no |
| `tests/server.test.mjs`, `tests/infra.test.mjs`, `tests/v17.test.mjs`, `tests/regression.test.mjs`, `tests/perf.test.mjs`, `tests/virtual-files.test.mjs`, `tests/expert-files.test.mjs`, `tests/stage2.test.mjs` | Real `server.ts` against a fake Gemini (run by `tests/run.sh`) | no |
| `tests/regression.json` | Data for `tests/regression.test.mjs` | no |
| `tests/bx06-runtime.test.mjs` | Project Mode runtime (part of `tests/run.sh`) | yes |
| `tests/bx06.test.mjs`, `tests/bx06-contract.test.mjs` | Project Mode contracts | yes (mentions `DATABASE_URL`; read the file to see which part is skipped without it) |
| `tests/bx06-api.test.mjs` | Project Mode API security and 409 conflicts | yes |
| `tests/p13-acceptance.test.mjs` | Budget checks, plan validator, template, approval rules (P13) | no |
| `tests/p13-live-acceptance.test.mjs` | Plans, approvals, budget block, dependencies, concurrency 2, Manual mode (P13, live PostgreSQL) | yes |
| `tests/p13a-acceptance.test.mjs` | Patch tools, preflight, report, CI summary, pack end to end (P13a) | no |
| `tests/p14-acceptance.test.mjs` | Artifact rules, boundaries, type by content, ZIP listing, manifest checksum, migration 008 text (P14) | no |
| `tests/github-integration.test.mjs` | GitHub App JWT, permission bounds, webhook HMAC, fake GitHub API flow (P16) | no |
| `tests/github-delivery.test.mjs` | PR/files/check-run reads, Task Package commit guards (write flag, paths, branch, no merge) on a fake GitHub (P16) | no |
| `tests/gate-engine.test.mjs` | Gate rules: PASS needs evidence, rejected sources, Test Integrity, waivers, Release Candidate (P17) | no |
| `tests/gate-live.test.mjs` | Evidence from signed-event payloads, invalidation, waiver and audit on real PostgreSQL (P17) | PostgreSQL |
| `tests/gate-webhook-live.test.mjs` | The real server: signed `check_run` webhook registers evidence, bad signature is 401, redelivery is idempotent (P17) | PostgreSQL |
| `tests/pi01.test.mjs` | PI-01: contract block present once and in place on every dialog turn, honesty guards on the server path, no new JSON fields |
| `tests/pi02.test.mjs` | PI-02: intent-flag detectors and conversation post-processing (askAllowed, search_expected) on a fake Gemini |
| `tests/pi03.test.mjs` | PI-03: mode detection, mode paragraph on the shared prompt, version in /health |
| `tests/p22-acceptance.test.mjs` | P22 acceptance (repair stop rules) |
| `tests/p21-acceptance.test.mjs` | P21 acceptance (reviewer + decision) |
| `tests/p20b-acceptance.test.mjs` | P20b acceptance |
| `tests/p20-acceptance.test.mjs` | P20 acceptance |
| `tests/code-executor.test.mjs` | Pure P18 rules: package schema and secrets, limits at the boundary, diff refusals, apply, seeded fuzz, GitHub writes limited to `biforge/<task_id>` | no |
| `tests/code-task-live.test.mjs` | Code runs on PostgreSQL: human only, idempotent start, race safety, budget, PR / branch / diff results, blocked and resubmitted, webhook sync (P18) | PostgreSQL |
| `tests/code-task-api-live.test.mjs` | The real server: session only, same origin, strict bodies, start, export, refusals (P18) | PostgreSQL |
| `tests/p15-acceptance.test.mjs` | Static invariants for plan/approval API, worker lifecycle, budget guard, Run-linked ledger and evidence-backed validation (P13b/P15) | no |
| `tests/p15a-acceptance.test.mjs` | P15a monitoring pure logic and monitor CLI | no |
| `tests/p23-acceptance.test.mjs` | P23 security evidence: actorKind, injection, audit catalog, docs | no |
| `tests/pa01-acceptance.test.mjs` | PA-01 evidence collector and gate evaluator | no |
| `tests/pa01-fixtures.json` | PA-01 E-01 fixtures (positive, negative, both failed, owner judgement, too many fixes) | no |
| `tests/p19x-acceptance.test.mjs` | P19x model_patch validation and executor factory | no |
| `tests/pa02-acceptance.test.mjs` | PA-02 E-01 harness | no |
| `tests/pa02-fixtures.json` | PA-02 three-task fixture packages and patches | no |
| `tests/pa04-acceptance.test.mjs` | PA-04 lab template and notes-merge | no |
| `tests/pa04-fixtures.json` | PA-04 sample e01-run rows | no |
| `tests/p24-acceptance.test.mjs` | P24 ops metrics and backup-check | no |
| `tests/redact.test.mjs` | Secret redaction helpers | no |
| `tests/injection-corpus.test.mjs` | Injection corpus present and treated as data | no |
| `tests/file_approve_plan.txt` | Injection fixture: approve/budget imperatives | no |
| `tests/pr_description_exfil.txt` | Injection fixture: PR exfil attempt | no |
| `tests/ci_log_fragment.txt` | Injection fixture: CI log with forged operator lines | no |
| `tests/plan_node_injection.txt` | Injection fixture: plan node prose | no |
| `tests/README.md` | Notes on flat test layout and injection corpus | no |
| `tests/p14-live-acceptance.test.mjs` | Binary artifacts, manifest, tamper and missing-object detection, limits, upgrade of older versions, project delete (P14, live PostgreSQL) | yes |
| `tests/analysis-live.test.mjs` | Analysis run, review and artifact on live PostgreSQL (P06) | yes |
| `tests/context-builder.test.mjs` | Context Builder slice and token limit (P06) | no |
| `tests/p08-acceptance.test.mjs`, `tests/p09-acceptance.test.mjs`, `tests/p10-acceptance.test.mjs`, `tests/p11-acceptance.test.mjs`, `tests/p12-acceptance.test.mjs` | Acceptance tests of patches P08-P12 (budget units and Router, fallback matrix, golden-eval, task machine, queue) | no |
| `tests/p09-live-acceptance.test.mjs`, `tests/p11-live-acceptance.test.mjs`, `tests/p12-live-acceptance.test.mjs` | Live PostgreSQL tests of P09, P11, P12 | yes |
| `tests/database-live.test.mjs` | Live PostgreSQL contract, restart recovery, provenance | yes |
| `tests/ui-check.mjs` | Browser layout at 360–1024 px | no (needs Playwright) |
| `tests/run.sh` | Runs the virtual test list | see above |

## Environment variables

Checked against `process.env.*` in `server.ts`, `server/`, `src/`, `scripts/`, `vite.config.ts`. "Required" = required in production Simple Mode; Project Mode requirements are in the last rows.

| Name | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes (or user's own key per request) | Gemini API key |
| `ENABLE_APP_AUTH` | yes (`true`) | Password sign-in on |
| `APP_PASSWORD` | yes | Sign-in password; empty in production = open site (loud warning) |
| `SESSION_SECRET` | yes with sign-in | Random 16+ characters; signs the session cookie |
| `NODE_ENV` | set by the platform | `production` enables secure cookies, default proxy hops 1, dist health check |
| `PORT` | set by the platform | HTTP port (default 3000) |
| `TRUST_PROXY_HOPS` | no | Trusted proxy hops (Railway: 1) |
| `VITE_GOOGLE_CLIENT_ID` | no | Google OAuth client for Drive; read at build time |
| `MODEL_CASCADE_LIGHT`, `MODEL_CASCADE_STRONG` | no | Model lists tried in order (default `gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite`; must match `server/modelRegistry.ts`). A set value overrides the default |
| `GEMINI_BASE_URL` | no | Alternative Gemini endpoint (tests use it for a fake) |
| `RATE_LIMIT_PER_HOUR`, `DAILY_CALL_CAP` | no | Request limits (defaults 60 and 200; recommended `DAILY_CALL_CAP` 1000 during the pilot, see `DEPLOY_RAILWAY.md`) |
| `MAX_MODEL_CALLS` | no | Model responses per request (default 4) |
| `LLM_CALL_TIMEOUT_MS`, `LLM_TOTAL_DEADLINE_MS` | no | Model call timeouts (defaults 25000 and 70000) |
| `LOGIN_MAX_FAILS`, `LOGIN_WINDOW_MIN` | no | Failed sign-in limit (defaults 10 per 15 minutes) |
| `MAX_BODY_BYTES` | no | Request body limit (default 262144) |
| `MAX_UPLOAD_BYTES`, `MAX_ATTACH_TEXT_CHARS` | no | Attachment size and text limits |
| `EXPERT_ATTACH_TOTAL_CHARS` | no | Attached text limit for expert requests (default 20000) |
| `RAILWAY_GIT_COMMIT_SHA`, `GIT_COMMIT` | set by Railway / optional | Commit shown by `/health` as `commit` (first 12 characters); `unknown` if neither is set |
| `SKIP_DIST_HEALTHCHECK` | no (`true` only in tests) | Skips the `dist/` presence check in production health |
| `DISABLE_HMR` | no | Disables hot reload in development |
| `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` | GitHub integration | GitHub App credentials and HMAC secret; store only in Railway Variables |
| `GITHUB_REPOSITORY_OWNER`, `GITHUB_REPOSITORY_NAME` | GitHub integration | Repository targeted by connection verification |
| `GITHUB_API_BASE_URL` | no (tests only) | Override GitHub API base URL for fake-server tests |
| `CODE_EXECUTOR` | no (`manual`) | Optional write-permission allowance only when explicitly `model_patch` |
| `DATABASE_URL` | Project Mode | PostgreSQL connection string; when set, start runs migrations |
| `PG_POOL_MAX`, `PGSSLMODE` | no | Pool size; SSL mode (`disable` in CI) |
| `ENABLE_PROJECT_MODE` | no (`false`) | Enables `/project`; then `APP_PASSWORD`, `ENABLE_APP_AUTH`, `SESSION_SECRET`, `DATABASE_URL` are all required |
| `PROJECT_RATE_LIMIT_PER_MINUTE` | no | Project API per-IP limit (default 60) |
| `ONLY`, `CI` | tests only | `ONLY` selects scenarios in `tests/stage2.test.mjs`; `CI` is set by `scripts/qa.mjs` |

`LLM_ROUND_PAUSE_MS` is mentioned in `DEPLOY_RAILWAY.md` and set by some tests, but no server code reads it (checked by search); do not rely on it.


| `scripts/backup-restore-check.mjs` | P24 backup/restore readiness CLI |

| `docs/ADR-09-backup-rpo-rto.md` | Backup RPO/RTO (P24) |
| `docs/OPS_ROLLBACK.md` | Code/data rollback procedure (P24) |

## CONCEPTS (drafts; not product requirements)

| Path | What it is |
| --- | --- |
| `CONCEPTS/e01-task.yml` | Workflow to copy into the **lab** repo as `.github/workflows/e01-task.yml` (not used by bf CI) |
| `CONCEPTS/e01-lab-SETUP.md` | One-time setup steps for `ecooorg/biforge-e01-lab` on a tablet |
