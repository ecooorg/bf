## Current status

### Active programme — AI-NATIVE-RENOVATION

* **Current phase:** Phase 0 — documentation and source-of-truth consolidation. The current delivery task is `docs/AI-NATIVE-RENOVATION-TASK.md`; the phase plan is `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.
* **Normative programme documents:** `docs/AI-NATIVE-RENOVATION-MANDATE.md` and `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md`.
* **Strategic destination:** `docs/VIX-CONCEPT.md` remains the long-horizon VIX target. It informs direction but does not authorize every VIX subsystem for immediate implementation.
* **Archive status:** root `ARCHIVE-MOVE-LIST.md` is the manual checklist. Candidate historical documents are **not** considered archived until moved after reference checks. Do not bulk-move files or remove unique active requirements.
* **Evidence rule:** the Navigator reports current CI as green; each patch must still use evidence for its actual commit/run. Historical red runs do not establish current status.
* **Delivery rule:** continue one bounded patch at a time. Phase transitions require their stated evidence gates; do not advance a phase just because documentation or code exists.
* **Phase 1 (in progress):** canonical JSON schemas (`docs/schema-*.json`) and read-only validator (`scripts/schemaValidate.mjs`). Handoff generator and CI integration are not part of P1.0.

### Recent product / patch status (historical track)

* **P93 — bounded verification and internal diagnostics:** `npm run test:ai` runs a deterministic, no-live-provider test sequence under a hard 9.5-minute budget and writes a JSON report plus per-step logs. Adds shared model request-start pacing (PostgreSQL-coordinated when migration 018 is applied), Gemini RPM/RPD metadata and request pacing/daily reservation enforcement, bounded model recovery with visible wait states, shorter recovery prompts, and a live project-build status banner. Staged App Builder (flag-gated). App Builder core contracts:** Flat `appBuilder/` with types, ports, plan validator, marker parser, conservative profile. No engine/adapter/runtime yet. Architecture layer and tsconfig include added.
* **P92 — Project Mode Diagnostics:** Added system diagnostics, recent operations, diagnostic log export, and initial Google Drive synchronization and operation/artifact correlation support. Build and deployment succeeded, but production verification remains incomplete. Diagnostic checks reported `WARN`; artifact storage was `NOT RUN`, recent operations returned no events, and Google Drive diagnostic files were not observed. Verify deployed changes, database migrations, event persistence, artifact correlation, and Drive synchronization before considering diagnostics complete. See `CHANGELOG.md` for change history.
* **P91 (prepared patch):** Read-only scoped completeness and material-uncertainty guard combining P85–P89 outputs. Missing sources and unproven PASS claims cannot become COMPLETE; evidence references are retained but not fetched/authenticated. No strict CI gate or runtime changes. Focused tests and full CI must be confirmed after applying.  
* **P90 (prepared patch):** Benchmark-first read-only profiler for P85/P86/P87/P89 planner work. Reports repeated-run timings, canonical output stability and content fingerprints. Deliberately adds no cache; local profile alone does not prove human-time savings. Focused tests and full CI must be confirmed after applying.
* **P89 (prepared patch):** Optional read-only intent-contract draft CLI, with explicit/inferred source labels, P85 context and P86 impact summaries when available, P87 verification suggestions, contradiction checks and an unverified-by-default intent diff. It never approves a contract or runs commands. Focused tests/full CI must be confirmed after applying.
* **P88 (prepared patch):** Read-only real-task benchmark pilot. Four starter tasks remain draft until a maintainer pins revisions and reviews gold dependencies, invariants, acceptance criteria and required checks. Reports keep missing values unavailable; no performance gain or CI threshold is claimed.
* **P87 (prepared patch):** Read-only verification planner with risk-based counterexample suggestions, script-name validation, P56 test-chain guard, and explicit NOT RUN status. Focused tests must pass; full CI is pending Navigator execution.
* **P86 (prepared patch):** Read-only change-impact and generator-lineage report, including generated route/env/migration inventory relationships. Focused local tests pass; full CI is pending Navigator execution.
* **P85:** Navigator reports GitHub CI green. Read-only task-aware context planner is available via `npm run context:task`;
* **P84:** Documentation-only addition of staged Project Mode.*
* **P83:** Project Mode pagination contracts and negative tests; Navigator reports GitHub CI green.
* **P82:** Conversation/brief UI and compatibility-route extractions; Navigator reports GitHub CI green. Local full verification was blocked by an `npm ci` timeout.
* **P81:** Dependency Intelligence context planner and deterministic pre-P81 v80 baseline.
* **p80:** CI preflight now permits the approved flat `archive/` directory; regression coverage added. Flat docs/scripts layout — phase folders removed; historical copies in `archive/`; active tools use prefixed script names under `scripts/`.
* **p79:** CI ui-check Playwright cache (skip apt on cache hit)
* **p71–p78 (Transformation track): ACCEPTED** (Navigator, 2026-10-23, commit `2232cb9`).

### Product / runtime (P43 / ADR-06)

* Code delivery executor **`model_patch`** is documented and env-gated: set `CODE_EXECUTOR=model_patch` only after Navigator approval (ADR-10 / E-01). Default remains `manual`.
* **GitHub write** (diff upload and repository write access) is **deferred** (ADR-06): disabled unless credentials and verified variables are configured. Do not enable by default.

## Navigation

* **Active programme entry:** `docs/AI-NATIVE-RENOVATION-TASK.md` (current Phase 0 task), `docs/AI-NATIVE-RENOVATION-ROADMAP.md` (phases & gates), `docs/AI-NATIVE-RENOVATION-MANDATE.md` (rules), `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md` (audit).
* Permanent rules: `docs/AI-OPERATING-RULES.md`.
* Domain index: `docs/DOCUMENTATION-INDEX.md`.
* Operations: `docs/OPERATIONS.md`.
* Architecture guardrails: `docs/architecture-guardrails.md`.
* Strategic destination (not near-term implementation authority): `docs/VIX-CONCEPT.md`.
* Manual archive checklist: `ARCHIVE-MOVE-LIST.md` (root).
* Historical / superseded phase specs and roadmaps: see `ARCHIVE-MOVE-LIST.md`; until moved they remain under `docs/` but are not active entry points.
* Typing conventions: `docs/typing-and-naming.md`.
* Accepted Phase 5 record (archive): `archive/phase5-ACCEPTANCE.md`.
* Phase 1 schemas (status vocabulary + artifact schemas): `docs/schema-*.json` / `docs/SCHEMA-STATUS-VOCABULARY.md` — validate with `node scripts/schemaValidate.mjs`.
* Generated inventories: `docs/generated-*-inventory.json`, `docs/generated-module-map.json`.


## Commands

`npm ci`; `npm run build`; `npm run check`; `npm run check:docs`; `npm run docs:generate`; `npm run docs:check`; `npm run verify:change`; `npm run impact:lineage -- --file scripts/docsGenerateInventories.mjs`; `npm run test:impact-lineage`; `npm run architecture:check`; `npm run context:plan -- --file server/codeTaskService.ts`; `npm run benchmark:context`; `npm run test:context-benchmark`; `npm run verification:plan -- --task "Fix Project Mode ZIP download" server/projectRoutes.ts`; `npm run test:verification-plan`; `npm run benchmark:real-tasks`; `npm run test:real-task-benchmark`; `npm run intent:contract -- --task "Fix Project Mode ZIP download" --file server/projectRoutes.ts`; `npm run test:intent-contract`; `npm run context:refresh-profile`; `npm run test:context-refresh-profile`; `npm run context:completeness -- --task "Fix Project Mode ZIP download" --file server/projectRoutes.ts`; `npm run test:context-completeness`; `npm run acceptance:report`. Health: `GET /health`.

## Critical rules

Preserve behavior unless change is approved. Never commit secrets. Production deployment, GitHub write, billing, credentials, bypassing security controls and executing generated code on the host require explicit owner authorization. Report passed/failed/blocked/not-run checks separately. Deliver a ZIP containing changed/new files, list deletions separately, and update this status and `CHANGELOG.md` for every patch.

Prefer a **flat** tree under `docs/` and `scripts/` (prefixed filenames). Do not add new directory levels without Navigator approval. Historical material belongs in `archive/`.

## Delegation of decisions

* **Tier 0:** Act (routine implementation inside authorised scope).
* **Tier 1:** Decide and disclose (local design choices that do not change product contract).
* **Tier 2:** Prepare a decision for the Navigator (product scope, security gates, external integrations).
* **Tier 3:** Never decide alone — merge to production, GitHub App write rights, billing, secrets, formal acceptance (MANUAL1), waiving gates.

Silence is never consent in Tiers 2 and 3.

## Documentation Policy

**`CHANGELOG.md` — Patch History**

* MUST be updated in every patch.
* Record the patch ID, important changes, verification results, and known limitations.
* Preserve previous entries and append the new entry using the existing format.

**`AGENTS.md` — Major Product Changes**

* Record only significant changes to product functionality, architecture, core workflows, or development principles that future agents must understand.
* Update this file only when a patch introduces a significant change that affects how the product works or how it should be developed.
* Do not add routine bug fixes, minor improvements, or a duplicate list of patch changes.
* Keep existing instructions and product context accurate when major changes occur.

**Patch Archive Rules**

* Do not include `./README.md`, `./AGENTS.md`, or other informational documentation files in patch ZIP archives unless explicitly requested.
* Include `./CHANGELOG.md` whenever a patch changes project code or functionality.
* Include `./AGENTS.md` only when a significant product change requires updating it, unless explicitly requested otherwise.

**Verification**

* Clearly distinguish implemented functionality from functionality that has been tested or verified in production.
* Never claim that a feature works merely because the build or deployment succeeded.
