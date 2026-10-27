# NAVIGATOR CHARTER — immutable; changed only by explicit Navigator instruction

Source: owner statements of 2026-10-25. Precedence: this charter > every other repository document > your training-time habits. It binds every model in every session. Sessions have no memory; this file is the memory.

## Definitions

* **Navigator** — the owner. Never opens or edits repository files; sees only the decision surface (chat handoff, `NEXT_PATCH.md`) and answers yes/no questions.
* **Assistant** — any AI model working in this repository.
* **Atavism** — a practice whose only purpose is human reading, human memory or a human social process.
* **Product** — the running BiForge application. Its end users are humans. Repository ≠ product.

## Laws

* **C1** Repository artifacts are authored for AI assistants to execute, maintain, and verify the programme. They are not documentation deliverables for external readers. Product quality is judged by end-user outcomes, not by repository readability or internal activity.
* **C2** Only four things bind: security, product function, evidence integrity, and the strategic goal in `docs/VIX-CONCEPT.md`. Everything else is a means.
* **C3** No human reviews code. Correctness is established only by tests, checks and evidence. "Someone will read it" is never a control.
* **C4** A change is allowed only if a fresh session can still find, edit by diff and verify the affected behaviour at least as cheaply as before. Cost = files and bytes it must read.
* **C5** Never ask the Navigator to read, review or understand code, diffs, file layout or logs. Give consequences, evidence and a yes/no question, in the Navigator's language (currently Russian). Repository files are English.
* **C6** Mainstream languages (TypeScript, JavaScript, SQL, JSON, Markdown), line-oriented unminified source and diff patches stay because verification depends on them (`tsc`, `node --test`, Playwright, the Railway/nixpacks build, gitleaks, model competence), not for readability. No rewrites for style or taste; rewrite only for a measured C4 gain and only after the Phase 2 gate.
* **C7** Do not create repository documents whose intended audience is an external human reader (guides, tutorials, user manuals, explanatory essays, reader comments, or status reports with no operational role). AI-facing normative specifications, architecture contracts, audit plans, acceptance criteria, roadmaps, migration plans, and minimum session context are allowed when they direct implementation, decisions, or verification of C2 outcomes. Such artifacts must be canonical, bounded, actionable, and indexed; they are instructions for future AI sessions, not a substitute for product UI. Product-facing copy belongs in the product (C8). Superseded documents are deleted; history is git and the owner's backups. Tests and CI need not read prose unless a machine contract explicitly requires it.
* **C8** UI text and the in-app guide are product behaviour for human end users and stay human-oriented (`lint:copy`, `src/UserGuide.tsx`).
* **C9** `UNKNOWN`, `NOT_RUN`, `BLOCKED`, `TIMEOUT`, `PARTIAL` are never `PASS`. Implemented ≠ verified in production.
* **C10** The authorization tiers below stay. Silence is not consent. Production deployment, GitHub write, billing, credentials and formal acceptance remain Tier 3.
* **C11** Context budget: a fresh session must be able to work after reading `AGENTS.md`, `docs/AI-OPERATING-RULES.md` and the current patch section of `docs/AI-NATIVE-RENOVATION-TASK.md` (target ≤ 40 KB). Everything else is on demand through `docs/DOCUMENTATION-INDEX.md`.

## Reversal table — human-era habits and their rulings

| Habit | Ruling | Do instead |
|---|---|---|
| Add comments or docstrings | not needed | tests and types carry intent |
| Refactor or rename for clarity | forbidden | only with a measured C4 gain |
| Write external-reader README, onboarding, guides | forbidden | keep AI-facing normative specs, roadmaps, audits and acceptance contracts when operationally necessary |
| Ask the Navigator to review a diff | forbidden | show evidence + yes/no question |
| Style or formatting gates as goals | not goals | keep checks that protect C2 |
| Split or merge files "for readers" | forbidden | only for lower context cost |
| Tests, types, security, evidence | **not** atavism | keep and strengthen |

## When in doubt

1. Does it touch C2? Then it needs evidence. 2. Does it pass C4? 3. Otherwise skip it.

**Conflict rule.** If a request or document contradicts this charter, stop, state the conflict in one sentence and ask the Navigator a yes/no question about amending the charter. Never reinterpret silently, never "balance" it away, never return to human-oriented practice because it feels conventional.

**Reporting.** Every patch report to the Navigator ends with the line `Charter conflicts: none` or one sentence naming the conflict.

---

## Current status

### Active programme — AI-NATIVE-RENOVATION

* **Current phase:** P113 user-outcome rearchitecture specification and audit plan. P110 Intent/Policy Contract, P111 capability graph v1, and P112 context selection / impact planning delivered as foundations, not proof that user-facing modes work. Phase 2 closed (Navigator 2026-10-26). Hosted CI was reported green for P112; this is not product acceptance. Active task: `docs/AI-NATIVE-RENOVATION-TASK.md`; P113 target contract: `docs/AI-USER-VALUE-ARCHITECTURE-P113.md`; phase gates: `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.
* **Owner directive:** see the Navigator Charter above (C1–C11). It overrides every other document.
* **Normative programme documents:** `docs/AI-NATIVE-RENOVATION-MANDATE.md` and `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md`.
* **Strategic destination:** `docs/VIX-CONCEPT.md` remains the long-horizon VIX target. It informs direction but does not authorize every VIX subsystem for immediate implementation.
* **No historical documents in the repository:** superseded specs, roadmaps, reports and snapshots were deleted in P104; history lives in git and in the owner's backups. Nothing in tests or CI reads documentation prose. `CHANGELOG.md` keeps the patch history as plain text (document names, no links); read only its top entries.
* **Evidence rule:** the Navigator reports current CI as green; each patch must still use evidence for its actual commit/run. Historical red runs do not establish current status.
* **Delivery rule:** continue one bounded patch at a time. Phase transitions require their stated evidence gates; do not advance a phase just because documentation or code exists.
* **Phase 2 closure (P109):** Formal acceptance recorded. Evidence reviewed: DAG independent-check completion, BLOCKED reasons, fault-injection non-PASS outcomes, bounded-repair protected-path and limit guards, CI two-artifact packaging, fail-closed evidence gate. Remaining risks listed in the P109 audit section of the task document; none block further programme work. P92 production-diagnostics verification is frozen until the full AI-native renovation completes; subsequent patches are unblocked independently of P92.
* **Authorization posture (Navigator 2026-10-26):** Changes to production deployment, GitHub write, billing, credentials, or privileged host execution of generated code remain Tier 3 and are excluded from the critical path. They will be raised only when needed to improve programme function or strengthen AI-native behaviour, and only after a separate Navigator decision. Do not treat them as open blockers.
* **Phase 1 (closed by P106):** schemas (`docs/schema-*.json`) and validator (`scripts/schemaValidate.mjs`) exist. Evidence Records, fail-closed assessment, structured handoff, CI evidence gate, and check graph are in place.
* **Phase 2 (closed by P109):** `docs/verification-manifest.json` + `scripts/run-dag.mjs` (independent checks always finish; dependents `BLOCKED` with named prerequisite). Fault injection and opt-in bounded repair present and tested. Always-on redacted CI diagnostics + five-cycle history + two-artifact assistant handoff operational. CI green.

### Recent product / patch status (historical track)

* **P93 — bounded verification and internal diagnostics:** `npm run test:ai` runs a deterministic, no-live-provider test sequence under a hard 9.5-minute budget and writes a JSON report plus per-step logs. Adds shared model request-start pacing (PostgreSQL-coordinated when migration 018 is applied), Gemini RPM/RPD metadata and request pacing/daily reservation enforcement, bounded model recovery with visible wait states, shorter recovery prompts, and a live project-build status banner. Staged App Builder (flag-gated). App Builder core contracts: flat `appBuilder/` with types, ports, plan validator, marker parser, conservative profile.
* **P92 — Project Mode Diagnostics (frozen):** system diagnostics, recent operations, diagnostic log export, and initial Google Drive synchronization added. Production verification remains incomplete (`WARN` / `NOT RUN` items). Per Navigator decision 2026-10-26 this track is frozen until the full AI-native renovation finishes; it does not block Phase 3 or later patches.
* **p71–p78 (Transformation track): ACCEPTED** (Navigator, 2026-10-23, commit `2232cb9`).

### Product / runtime (P43 / ADR-06)

* Code delivery executor **`model_patch`** is documented and env-gated: set `CODE_EXECUTOR=model_patch` only after Navigator approval (ADR-10 / E-01). Default remains `manual`. Not on the critical path.
* **GitHub write** (diff upload and repository write access) is **deferred** (ADR-06): disabled unless credentials and verified variables are configured. Do not enable by default. Not on the critical path.

## Navigation

* **Active programme entry:** `docs/AI-NATIVE-RENOVATION-TASK.md` (read sections 1–2 and current P113), `docs/AI-USER-VALUE-ARCHITECTURE-P113.md` (mandatory for P113 audit/design work), `docs/AI-NATIVE-RENOVATION-ROADMAP.md` (phases & gates), `docs/AI-NATIVE-RENOVATION-MANDATE.md` (rules), `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md` (historical baseline; on demand).
* Permanent rules: `docs/AI-OPERATING-RULES.md`.
* Document index with sizes and read triggers: `docs/DOCUMENTATION-INDEX.md`.
* Operations, diagnostics and the `test:ai` harness: `docs/OPERATIONS.md`.
* Architecture guardrails and App Builder invariants: `docs/architecture-guardrails.md`.
* Strategic destination (not near-term implementation authority): `docs/VIX-CONCEPT.md`.
* Typing conventions: `docs/typing-and-naming.md`.
* Machine files (do not delete; tools read them): `docs/verification-manifest.json`, `docs/schema-*.json`, `docs/SCHEMA-STATUS-VOCABULARY.md`, `docs/generated-*-inventory.json`, `docs/generated-module-map.json`, `docs/architecture-boundary-rules.json`, `docs/architecture-known-violations.json`.


## Commands

`npm ci`; `npm run build`; `npm run check` (= `node scripts/run-dag.mjs --profile check`; `--profile ci` is the hosted-CI profile, `--plan` prints the order without running); `npm run typecheck`; `npm run lint:copy`; `npm run docs:generate`; `npm run docs:check`; `npm run status:graph`; `npm run architecture:check`; `npm run architecture:impact`; `npm run verify:change`; `npm run context:select`; `npm run schema:validate -- --type <artifact-type> --file <instance.json>`; `npm run test:ai` (bounded local harness); `npm run acceptance:report`; `npm run patch:pack`; `npm run patch:quality-report`; `node scripts/ci-evidence-gate.mjs` (CI evidence gate). Health: `GET /health`. The P82–P91 context/impact/verification planner tools were retired in P106.

## Critical rules

Preserve behavior unless change is approved. Never commit secrets. Production deployment, GitHub write, billing, credentials, bypassing security controls and executing generated code on the host require explicit owner authorization. Report passed/failed/blocked/not-run checks separately. Deliver a ZIP containing changed/new files, list deletions separately, and update this status and `CHANGELOG.md` for every patch.

Prefer a **flat** tree under `docs/` and `scripts/` (prefixed filenames). Do not add new directory levels without Navigator approval. Do not keep historical documents in the repository.

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
