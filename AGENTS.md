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
* **D1** The three files `TECHNICAL_SPECIFICATION.md`, `ROADMAP.md` and `TECHNICAL_REPORT.md` (repository root) are protected primary documents. They may only be extended or refined. Deletion of sections, removal of REQ-IDs, acceptance criteria, stage descriptions or evidence requirements, or any other reduction of semantic content is forbidden without an explicit Navigator yes.
* **D2** Creating new parallel normative prose documents (`Pxx-SPEC.md`, `Pxx-REPORT.md`, `*-NOTES.md`, or any other competing specification/report) is forbidden. All new normative content goes into one of the three protected files or into the existing rolling files listed in `docs/DOCUMENTATION-INDEX.md`.
* **D3** Any patch that changes runtime behaviour, contracts or acceptance must update the corresponding sections of `TECHNICAL_SPECIFICATION.md` (requirements) and, when evidence is produced, `TECHNICAL_REPORT.md`. `ROADMAP.md` is updated only on phase or gate changes.
* **D4** Machine guard: every patch that touches documentation must leave `docs:integrity` (or the equivalent DAG node) PASS. The guard verifies existence of the three protected files, presence of required sections, and that the count of REQ-IDs and critical headings has not decreased.

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
| Create per-patch SPEC/REPORT files | forbidden (D2) | update the three protected primary documents in place |
| Shorten protected docs to "save context" | forbidden (D1) | keep full semantic content; load on demand via index |

## When in doubt

1. Does it touch C2? Then it needs evidence. 2. Does it pass C4? 3. Does it respect D1–D4? 4. Otherwise skip it.

**Conflict rule.** If a request or document contradicts this charter, stop, state the conflict in one sentence and ask the Navigator a yes/no question about amending the charter. Never reinterpret silently, never "balance" it away, never return to human-oriented practice because it feels conventional.

**Reporting.** Every patch report to the Navigator ends with the line `Charter conflicts: none` or one sentence naming the conflict. When documentation is touched, also report: `docs:integrity PASS` (or FAIL with reason) and whether any protected file lost semantic content (must be "no").

---

## Current status

### Active programme — AI-NATIVE-RENOVATION

* **Current phase:** P118 Complex Software Architect Agent (completion contract). Applied line: P118.3 → P118.3.1 → P118.3.2 → P118.3.3. **P118.4** documentation order; **P118.5.1** staged default + artifact invariants; **P118.5.2** offline archive E2E. P118 is NOT closed until Navigator accepts exit evidence (tests + preferred live deliveryProven). P119 starts only after the P118 exit gate in the roadmap. P116 Conversational Agent accepted 2026-10-28 with residual B3 (Node LTS version number). P117.3 closed. P110–P112 foundations remain. Phase 2 closed (Navigator 2026-10-26). Active task: `docs/AI-NATIVE-RENOVATION-TASK.md`; current target contract: `docs/AI-USER-VALUE-SPEC.md` §A3; rolling evidence: `docs/AI-USER-VALUE-REPORT.md`; detailed roadmap + reconstruction: `ROADMAP.md` + `TECHNICAL_REPORT.md`; full engineering specification: `TECHNICAL_SPECIFICATION.md`.
* **Owner directive:** see the Navigator Charter above (C1–C11 + D1–D4). It overrides every other document.
* **Programme authority:** this charter, `docs/AI-OPERATING-RULES.md`, `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-NATIVE-RENOVATION-ROADMAP.md`, `docs/AI-USER-VALUE-SPEC.md`, and the three protected primary documents. `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md` is a historical audit baseline, not a current instruction source.
* **Strategic destination:** `docs/VIX-CONCEPT.md` remains the long-horizon VIX target. It informs direction but does not authorize every VIX subsystem for immediate implementation.
* **Documentation consolidation:** the three protected primary documents (`TECHNICAL_SPECIFICATION.md`, `ROADMAP.md`, `TECHNICAL_REPORT.md`) are the engineering backbone. Keep one authoritative file per ongoing purpose for the rolling set. Update in place; do not create per-patch copies. Superseded duplicate prose documents are removed after useful current content is transferred. The Navigator's local backups preserve old versions. `CHANGELOG.md` keeps patch history; read only its top entries.
* **Evidence rule:** CI status belongs to an exact commit/run: a green run of an earlier commit says nothing about a later one, and a red run is not current once a repair patch is green. Each patch must cite evidence for its own commit/run.
* **Delivery rule:** continue one bounded patch at a time. Phase transitions require their stated evidence gates; do not advance a phase just because documentation or code exists.
* **Phase 2 closure (P109):** Formal acceptance recorded. Evidence reviewed: DAG independent-check completion, BLOCKED reasons, fault-injection non-PASS outcomes, bounded-repair protected-path and limit guards, CI two-artifact packaging, fail-closed evidence gate. Remaining risks listed in the P109 audit section of the task document; none block further programme work. P92 production-diagnostics verification is frozen until the full AI-native renovation completes; subsequent patches are unblocked independently of P92.
* **Authorization posture (Navigator 2026-10-26):** Changes to production deployment, GitHub write, billing, credentials, or privileged host execution of generated code remain Tier 3 and are excluded from the critical path. They will be raised only when needed to improve programme function or strengthen AI-native behaviour, and only after a separate Navigator decision. Do not treat them as open blockers.
* **Phase 1 (closed by P106):** schemas (`docs/schema-*.json`) and validator (`scripts/schemaValidate.mjs`) exist. Evidence Records, fail-closed assessment, structured handoff, CI evidence gate, and check graph are in place.
* **Phase 2 (closed by P109):** `docs/verification-manifest.json` + `scripts/run-dag.mjs` (independent checks always finish; dependents `BLOCKED` with named prerequisite). Fault injection and opt-in bounded repair present and tested. Always-on redacted CI diagnostics + five-cycle history + two-artifact assistant handoff operational. CI green.

### Recent product / patch status (historical track)

* **P118.4 — Documentation Order (this patch):** Introduces the three protected primary documents, D1–D4, documentation integrity guard, and updated index. No runtime behaviour change.
* **P118.3.3 — Code-stage file marker repair:** Prompt, parser coercion, bounded unit repair, diagnostics. Live evaluation of full ZIP path still outstanding.
* **P118.3.2 — Single version source + documentation audit.**
* **P118.3.1 — CI repair for P118.3.**
* **P118.3 — Spec bounded repair + assistant diagnostics.**
* **P116 — Conversational Agent:** accepted 2026-10-28 with residual B3.
* **P117.3 — closed for conversation recovery; Expert cascade foundations partial.**

### Recent product / patch status (historical track)

* **P93 — bounded verification and internal diagnostics:** `npm run test:ai` runs a deterministic, no-live-provider test sequence under a hard 9.5-minute budget and writes a JSON report plus per-step logs. Adds shared model request-start pacing (PostgreSQL-coordinated when migration 018 is applied), Gemini RPM/RPD metadata and request pacing/daily reservation enforcement, bounded model recovery with visible wait states, shorter recovery prompts, and a live project-build status banner. Staged App Builder (flag-gated). App Builder core contracts: flat `appBuilder/` with types, ports, plan validator, marker parser, conservative profile.
* **P92 — Project Mode Diagnostics (frozen):** system diagnostics, recent operations, diagnostic log export, and initial Google Drive synchronization added. Production verification remains incomplete (`WARN` / `NOT RUN` items). Per Navigator decision 2026-10-26 this track is frozen until the full AI-native renovation finishes; it does not block Phase 3 or later patches.
* **p71–p78 (Transformation track): ACCEPTED** (Navigator, 2026-10-23, commit `2232cb9`).

### Product / runtime (P43 / ADR-06)

* Code delivery executor **`model_patch`** is documented and env-gated: set `CODE_EXECUTOR=model_patch` only after Navigator approval (ADR-10 / E-01). Default remains `manual`. Not on the critical path.
* **GitHub write** (diff upload and repository write access) is **deferred** (ADR-06): disabled unless credentials and verified variables are configured. Do not enable by default. Not on the critical path.

## Navigation

* **Active programme entry:** `docs/AI-NATIVE-RENOVATION-TASK.md` (current task), `docs/AI-USER-VALUE-SPEC.md` (target contract), `docs/AI-USER-VALUE-REPORT.md` (evidence when relevant), `docs/AI-NATIVE-RENOVATION-ROADMAP.md` (only roadmap), `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md` (historical baseline; on demand).
* Permanent rules: `docs/AI-OPERATING-RULES.md`.
* Document index with read triggers: `docs/DOCUMENTATION-INDEX.md`.
* Deployment, live-test protocol and runtime facts: `docs/AI-ENVIRONMENT-CONTEXT.md`.
* Planned P121 task (not authorized): `docs/P121_Browser_based_Model_Providers.md`.
* Operations, diagnostics and the `test:ai` harness: `docs/OPERATIONS.md`.
* Architecture guardrails and App Builder invariants: `docs/architecture-guardrails.md`.
* Strategic destination (not near-term implementation authority): `docs/VIX-CONCEPT.md`.
* Typing conventions: `docs/typing-and-naming.md`.
* Machine files (do not delete; tools read them): `docs/verification-manifest.json`, `docs/schema-*.json`, `docs/SCHEMA-STATUS-VOCABULARY.md`, `docs/generated-*-inventory.json`, `docs/generated-module-map.json`, `docs/architecture-boundary-rules.json`, `docs/architecture-known-violations.json`.


## Commands

`npm ci`; `npm run build`; `npm run check` (= `node scripts/run-dag.mjs --profile check`; `--profile ci` is the hosted-CI profile, `--plan` prints the order without running); `npm run typecheck`; `node scripts/check-version.mjs` (version gate); `npm run lint:copy`; `npm run docs:generate`; `npm run docs:check`; `npm run status:graph`; `npm run architecture:check`; `npm run architecture:impact`; `npm run verify:change`; `npm run context:select`; `npm run schema:validate -- --type <artifact-type> --file <instance.json>`; `npm run test:ai` (bounded local harness); `npm run acceptance:report`; `npm run patch:pack`; `npm run patch:quality-report`; `node scripts/ci-evidence-gate.mjs` (CI evidence gate). Health: `GET /health`. The P82–P91 context/impact/verification planner tools were retired in P106.

## Critical rules

Preserve behavior unless change is approved. Never commit secrets. Production deployment, GitHub write, billing, credentials, bypassing security controls and executing generated code on the host require explicit owner authorization. Report passed/failed/blocked/not-run checks separately. Deliver a ZIP containing changed/new files, list deletions separately, and for every patch update `package.json` (`patch`, `version`) and prepend a `CHANGELOG.md` entry; update this file only as the Documentation Policy allows.

Prefer a **flat** tree under `docs/` and `scripts/` (prefixed filenames). Do not add new directory levels without Navigator approval. Do not keep superseded duplicate specifications, roadmaps, or per-patch reports. Maintain the rolling report only for evidence that remains useful.

## Delegation of decisions

* **Tier 0:** Act (routine implementation inside authorised scope).
* **Tier 1:** Decide and disclose (local design choices that do not change product contract).
* **Tier 2:** Prepare a decision for the Navigator (product scope, security gates, external integrations).
* **Tier 3:** Never decide alone — merge to production, GitHub App write rights, billing, secrets, formal acceptance (MANUAL1), waiving gates.

Silence is never consent in Tiers 2 and 3.

## Documentation Policy


## Patch delivery format (Navigator copy workflow) — NON-NEGOTIABLE

The Navigator applies patches by **copying complete files into the repository**. Assistants must not create work for the Navigator.

### What a patch ZIP may contain

1. **Only complete files** whose paths match the repository layout (e.g. `CHANGELOG.md`, `NEXT_PATCH.md`, `server/foo.ts`, `tests/bar.test.mjs`).
2. Every file in the ZIP is a **ready-to-overwrite** target: after unzip, the Navigator copies paths as-is. No merge step, no “prepend this snippet”, no “paste into section X”.
3. **`package.json` is always included** when the patch changes code, tests, scripts, or version/patch fields.
4. **`CHANGELOG.md` is always the full file** with the new patch entry already at the top and all prior entries preserved below. Never ship `CHANGELOG_ENTRY.md`, `changelog-snippet.md`, or any fragment that requires manual insertion.
5. **`NEXT_PATCH.md` is always the full file**. The new current handoff goes at the **top**. All previous handoff entries remain **below** under a clear history separator (e.g. `# History (previous NEXT_PATCH entries)`). Never replace the file with only the new step. Never delete prior steps.
6. **Do not include** instructional sidecar files unless the Navigator explicitly asked for them: no `APPLY.md`, no `README-for-patch.md`, no `*_AMENDMENT.md`, no `*_ENTRY.md`, no “merge these lines into …” documents.
7. **Deletions:** list paths to delete in the chat message (or in `NEXT_PATCH.md` body), not as empty placeholder files. Do not invent delete-list-only files that the Navigator must interpret as content.
8. **`AGENTS.md`:** include the full updated file only when this charter or product rules change (as in this rule set). When included, ship the complete file, not a diff fragment.

### Forbidden delivery patterns (always wrong)

* Shipping `CHANGELOG_ENTRY.md` / “prepend this block to CHANGELOG”.
* Shipping `TECHNICAL_SPECIFICATION_AMENDMENT.md` instead of the full `TECHNICAL_SPECIFICATION.md`.
* Shipping `APPLY.md` as the primary way to explain copy paths (use chat summary; ZIP files are self-describing by path).
* Overwriting `NEXT_PATCH.md` with a single new entry and discarding previous handoffs.
* Nested archive-only paths that do not match repo layout (`bf-main/...` wrappers are allowed only if every path still maps 1:1 after stripping one root folder — prefer **repo-root-relative paths** with no wrapper).

### Assistant checklist before attaching a patch ZIP

* [ ] Every file is complete and overwrite-safe.
* [ ] `CHANGELOG.md` full, newest entry first, history intact.
* [ ] `NEXT_PATCH.md` full, current step first, previous steps retained below.
* [ ] No `APPLY.md` / `*_ENTRY.md` / `*_AMENDMENT.md` in the ZIP.
* [ ] Deletions listed in chat if any.
* [ ] `package.json` present when patch/version or scripts changed.

Violation of this section is a process defect: regenerate the ZIP before the Navigator applies anything.



**`CHANGELOG.md` — Patch History**

* MUST be updated in every patch.
* Record the patch ID, important changes, verification results, and known limitations.
* Preserve previous entries. The delivered file is always the **complete** `CHANGELOG.md` with the new entry already prepended at the top. Never deliver a separate entry-only file for the Navigator to merge.

**`AGENTS.md` — Major Product Changes**

* Record only significant changes to product functionality, architecture, core workflows, or development principles that future agents must understand.
* Update this file only when a patch introduces a significant change that affects how the product works or how it should be developed.
* Do not add routine bug fixes, minor improvements, or a duplicate list of patch changes.
* Keep existing instructions and product context accurate when major changes occur.

**Patch Archive Rules**

* **`package.json` is included in every patch ZIP, always** (see "Version and patch numbering").
* Do not include `./README.md`, `./AGENTS.md`, or other informational documentation files in patch ZIP archives unless explicitly requested.
* Include the **complete** `./CHANGELOG.md` whenever a patch changes project code or functionality (newest entry already prepended). Never include entry-only sidecars.
* Include `./AGENTS.md` only when a significant product change requires updating it, unless explicitly requested otherwise.

**Verification**

* Clearly distinguish implemented functionality from functionality that has been tested or verified in production.
* Never claim that a feature works merely because the build or deployment succeeded.

## Version and patch numbering (Navigator decision 2026-10-28; binding, no exceptions)

1. **`package.json` is the only source of the version.** It has two fields: `"patch"` = number of the patch just applied (digits separated by dots, e.g. `"118.3.2"`) and `"version"` = program version = the first number of `patch` (e.g. `"118"`).
2. **Every patch ZIP contains `package.json`** with both fields set — documentation-only and one-line patches included. A patch without it is invalid (`versionPreflight` in `scripts/patch-tools.mjs` stops `npm run patch:pack`).
3. **`version` always equals the first number of the patch just applied, even before CI is green.** Patch `P118.3.2` ⇒ `version` `118`; patch `P119` ⇒ `version` `119`. The patch name, the `patch` field and the CHANGELOG heading carry the same number.
4. **A patch number is never lower than the program version and never lower than or equal to the previously applied patch.** With program version 118 the next patch is `118.x` or `119` or higher — never 116, 85 or 30.
5. **No other place defines or is compared with the version.** `src/config.ts` derives `APP_VERSION` / `APP_PATCH` from `package.json`; `/health`, the console banner, export file names and diagnostics (`release` = `patch`) read those. CHANGELOG headings, documents, workflows and `server.ts` are never checked against the version and can never cause a version failure.
6. `scripts/check-version.mjs` (DAG node `version-consistency`) validates `package.json` only: `patch` is dotted digits, `version` equals its first number. If it fails, fix `package.json`. Never add a second version source or a second version comparison.
7. Sub-patches (`118.1`, `118.3.2`) share one program version, so a deployed build is identified by `patch` (diagnostics `release`) plus the commit from `/health`, not by `version` alone.

## Version and patch numbering
**Verification**

* Clearly distinguish implemented functionality from functionality that has been tested or verified in production.
* Never claim that a feature works merely because the build or deployment succeeded.

## Version and patch numbering (Navigator decision 2026-10-28; binding, no exceptions)

1. **`package.json` is the only source of the version.** It has two fields: `"patch"` = number of the patch just applied (digits separated by dots, e.g. `"118.3.2"`) and `"version"` = program version = the first number of `patch` (e.g. `"118"`).
2. **Every patch ZIP contains `package.json`** with both fields set — documentation-only and one-line patches included. A patch without it is invalid (`versionPreflight` in `scripts/patch-tools.mjs` stops `npm run patch:pack`).
3. **`version` always equals the first number of the patch just applied, even before CI is green.** Patch `P118.3.2` ⇒ `version` `118`; patch `P119` ⇒ `version` `119`. The patch name, the `patch` field and the CHANGELOG heading carry the same number.
4. **A patch number is never lower than the program version and never lower than or equal to the previously applied patch.** With program version 118 the next patch is `118.x` or `119` or higher — never 116, 85 or 30.
5. **No other place defines or is compared with the version.** `src/config.ts` derives `APP_VERSION` / `APP_PATCH` from `package.json`; `/health`, the console banner, export file names and diagnostics (`release` = `patch`) read those. CHANGELOG headings, documents, workflows and `server.ts` are never checked against the version and can never cause a version failure.
6. `scripts/check-version.mjs` (DAG node `version-consistency`) validates `package.json` only: `patch` is dotted digits, `version` equals its first number. If it fails, fix `package.json`. Never add a second version source or a second version comparison.
7. Sub-patches (`118.1`, `118.3.2`) share one program version, so a deployed build is identified by `patch` (diagnostics `release`) plus the commit from `/health`, not by `version` alone.

## P115 — Canonical documentation consolidation

- Established `docs/AI-USER-VALUE-SPEC.md` as the current three-agent contract and `docs/AI-USER-VALUE-REPORT.md` as the rolling evidence report.
- Corrected patch sequence: P116 Conversational Agent, P117 Expert Problem-Solving Agent, P118 Complex Software Architect Agent, P119 migration to three agents, P120 cross-agent acceptance.
- Runtime behavior unchanged; no product repair is claimed.

## P114 — User-outcome audit and root-cause map

- Added `docs/AI-USER-VALUE-REPORT.md`, tracing the four current workflows across UI, prompt composition, orchestration, model/tools, state, validation and delivery. Findings distinguish observed evidence, user-reported symptoms and unproven causal hypotheses.
- The production App Builder report proves one failed build with `invalid_spec`, zero files and ~73 seconds duration. Logs prove some conversations skipped optional web search; source confirms Simple and Expert share a conversation pipeline; project build has multiple paths and configuration gates.
- The supplied archives do not allow authenticated browser/live-provider reproduction of all four failures. Those cases remain `NOT_REPRODUCED` / `NOT_RUN`; no root cause is asserted without evidence.
- P114 changes audit/control artifacts and version metadata only. No runtime fixes are included.
- Standing Navigator directive for every later patch: if work drifts toward internal structure improvement without demonstrated improvement in user-facing information value or completed work, stop and ask the Navigator before proceeding.
