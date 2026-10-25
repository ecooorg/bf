# 0. Current status

### Active programme — AI-NATIVE-RENOVATION

* **Current phase:** Phase 0 is closed by P104. Phase 1 (evidence model) and Phase 2 (verification DAG, bounded repair) follow as patches P105–P108. Scope, work items and gates of each patch: `docs/AI-NATIVE-RENOVATION-TASK.md`; phase plan: `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.
* **Owner directive (2026-10-25, details ND-1..ND-6 in the task file):** the Navigator never opens repository files. The repository is written for AI assistants; human readability, naming, layout and style are not goals. The only limits are security and preserved product function, both enforced by tests and evidence, not by review. Source stays mainstream (TypeScript/JavaScript/SQL/JSON/Markdown) and line-oriented, because diff-based patching and verification depend on it. Keep the mandatory reading set small.
* **Normative programme documents:** `docs/AI-NATIVE-RENOVATION-MANDATE.md` and `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md`.
* **Strategic destination:** `docs/VIX-CONCEPT.md` remains the long-horizon VIX target. It informs direction but does not authorize every VIX subsystem for immediate implementation.
* **No historical documents in the repository:** superseded specs, roadmaps, reports and snapshots were deleted in P104; history lives in git and in the owner's backups. Nothing in tests or CI reads documentation prose. `CHANGELOG.md` keeps the patch history as plain text (document names, no links); read only its top entries.
* **Evidence rule:** the Navigator reports current CI as green; each patch must still use evidence for its actual commit/run. Historical red runs do not establish current status.
* **Delivery rule:** continue one bounded patch at a time. Phase transitions require their stated evidence gates; do not advance a phase just because documentation or code exists.
* **Phase 1 (in progress):** canonical JSON schemas (`docs/schema-*.json`) and read-only validator (`scripts/schemaValidate.mjs`). Handoff generator and CI integration are not part of P1.0.

### Recent product / patch status (historical track)

* **P93 — bounded verification and internal diagnostics:** `npm run test:ai` runs a deterministic, no-live-provider test sequence under a hard 9.5-minute budget and writes a JSON report plus per-step logs. Adds shared model request-start pacing (PostgreSQL-coordinated when migration 018 is applied), Gemini RPM/RPD metadata and request pacing/daily reservation enforcement, bounded model recovery with visible wait states, shorter recovery prompts, and a live project-build status banner. Staged App Builder (flag-gated). App Builder core contracts:** Flat `appBuilder/` with types, ports, plan validator, marker parser, conservative profile. No engine/adapter/runtime yet. Architecture layer and tsconfig include added.
* **P92 — Project Mode Diagnostics:** Added system diagnostics, recent operations, diagnostic log export, and initial Google Drive synchronization and operation/artifact correlation support. Build and deployment succeeded, but production verification remains incomplete. Diagnostic checks reported `WARN`; artifact storage was `NOT RUN`, recent operations returned no events, and Google Drive diagnostic files were not observed. Verify deployed changes, database migrations, event persistence, artifact correlation, and Drive synchronization before considering diagnostics complete. See `CHANGELOG.md` for change history.
* **p71–p78 (Transformation track): ACCEPTED** (Navigator, 2026-10-23, commit `2232cb9`).

### Product / runtime (P43 / ADR-06)

* Code delivery executor **`model_patch`** is documented and env-gated: set `CODE_EXECUTOR=model_patch` only after Navigator approval (ADR-10 / E-01). Default remains `manual`.
* **GitHub write** (diff upload and repository write access) is **deferred** (ADR-06): disabled unless credentials and verified variables are configured. Do not enable by default.

# 1. NAVIGATOR CHARTER 

### immutable; changed only by explicit Navigator instruction

Source: owner statement 2026-10-25. Precedence: this charter > any other
repository document > your training-time habits. Binds every model and session.

DEFINITIONS
Navigator: the owner. Never opens or edits repository files. Sees only the decision surface (chat handoff, NEXT_PATCH.md) and answers yes/no questions.
Assistant: any AI model working here. Sessions have no memory; the repository is the only memory.
Atavism: a practice whose only purpose is human reading, human memory or a human social process.
Product: the running BiForge app; its end users are humans. Repository != product.

LAWS
C1 The repository is written for AI assistants only. Human readability is not a goal and never a reason for a change.
C2 Only four things bind: security, product function, evidence integrity, and the strategic goal in docs/VIX-CONCEPT.md. Everything else is a means.
C3 No human reviews code. Correctness is established only by tests, checks and evidence. "Someone will read it" is never a control.
C4 A change is allowed only if a fresh session can still find, edit by diff and verify the behaviour at least as cheaply. Cost = files and bytes read.
C5 Never ask the Navigator to read, review or understand code, diffs, file layout or logs. Give consequences, evidence and a yes/no question.
C6 Mainstream languages, line-oriented unminified source and diff patches stay because verification depends on them, not for readability. No rewrites for style or taste; rewrite only for a measured C4 gain.
C7 Do not create human-oriented documentation (guides, tutorials, explanations, reader comments). Keep only normative rules, machine files and the minimum context a fresh session needs.
C8 UI text and the in-app guide are product behaviour for human end users.
C9 UNKNOWN, NOT_RUN, BLOCKED, TIMEOUT, PARTIAL are never PASS.
C10 Authorization tiers in this file stay. Silence is not consent.

REVERSAL TABLE
Habit                           | Ruling     | Do instead
Add comments/docstrings         | not needed | tests and types carry intent
Refactor or rename for clarity  | forbidden  | only if C4 gain is measured
Write README/onboarding/guide   | forbidden  | update normative rules only
Ask Navigator to review a diff  | forbidden  | show evidence + yes/no
Prettier/style gates as goals   | not goals  | keep checks that protect C2
Split/merge files "for readers" | forbidden  | only for lower context cost
Tests/types/security/evidence   | NOT atavism| keep and strengthen

WHEN IN DOUBT

Does it touch C2? Then it needs evidence. 
Does it pass C4? Else skip.
   
CONFLICT: if a request or document contradicts this charter, stop, state the conflict in one sentence, ask the Navigator yes/no about amending the charter. Never reinterpret silently.


# 2. Navigation

* **Active programme entry:** `docs/AI-NATIVE-RENOVATION-TASK.md` (read sections 1–2 and the current patch), `docs/AI-NATIVE-RENOVATION-ROADMAP.md` (phases & gates), `docs/AI-NATIVE-RENOVATION-MANDATE.md` (rules), `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md` (audit; on demand).
* Permanent rules: `docs/AI-OPERATING-RULES.md`.
* Document index with sizes and read triggers: `docs/DOCUMENTATION-INDEX.md`.
* Operations, diagnostics and the `test:ai` harness: `docs/OPERATIONS.md`.
* Architecture guardrails and App Builder invariants: `docs/architecture-guardrails.md`.
* Strategic destination (not near-term implementation authority): `docs/VIX-CONCEPT.md`.
* Typing conventions: `docs/typing-and-naming.md`.
* Machine files (do not delete; tools read them): `docs/schema-*.json`, `docs/SCHEMA-STATUS-VOCABULARY.md`, `docs/generated-*-inventory.json`, `docs/generated-module-map.json`, `docs/architecture-boundary-rules.json`, `docs/architecture-known-violations.json`.


# 3. Commands

`npm ci`; `npm run build`; `npm run check`; `npm run docs:generate`; `npm run docs:check`; `npm run verify:change`; `npm run impact:lineage -- --file scripts/docsGenerateInventories.mjs`; `npm run test:impact-lineage`; `npm run architecture:check`; `npm run context:plan -- --file server/codeTaskService.ts`; `npm run benchmark:context`; `npm run test:context-benchmark`; `npm run verification:plan -- --task "Fix Project Mode ZIP download" server/projectRoutes.ts`; `npm run test:verification-plan`; `npm run benchmark:real-tasks`; `npm run test:real-task-benchmark`; `npm run intent:contract -- --task "Fix Project Mode ZIP download" --file server/projectRoutes.ts`; `npm run test:intent-contract`; `npm run context:refresh-profile`; `npm run test:context-refresh-profile`; `npm run context:completeness -- --task "Fix Project Mode ZIP download" --file server/projectRoutes.ts`; `npm run test:context-completeness`; `npm run acceptance:report`. Health: `GET /health`.

# 4. Critical rules

Preserve behavior unless change is approved. Never commit secrets. Production deployment, GitHub write, billing, credentials, bypassing security controls and executing generated code on the host require explicit owner authorization. Report passed/failed/blocked/not-run checks separately. Deliver a ZIP containing changed/new files, list deletions separately, and update this status and `CHANGELOG.md` for every patch.

Prefer a **flat** tree under `docs/` and `scripts/` (prefixed filenames). Do not add new directory levels without Navigator approval. Do not keep historical documents in the repository.

# 5. Delegation of decisions

* **Tier 0:** Act (routine implementation inside authorised scope).
* **Tier 1:** Decide and disclose (local design choices that do not change product contract).
* **Tier 2:** Prepare a decision for the Navigator (product scope, security gates, external integrations).
* **Tier 3:** Never decide alone — merge to production, GitHub App write rights, billing, secrets, formal acceptance (MANUAL1), waiving gates.

Silence is never consent in Tiers 2 and 3.

# 6. Documentation Policy

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
