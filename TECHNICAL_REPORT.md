# CURRENT EVIDENCE NOTE — P121.0.12 Architect truncation and partial-delivery correction, 2026-10-30

> Additive. Based on user-supplied P121.0.11 diagnostics and `P118 architect live` workflow artifact for commit `1bc5e81`.

## Observed failure evidence

- User-reported outcome: project creation did not result in a received ZIP; a black/unresponsive screen was also reported.
- In-app build `2aede0f4-2567-48f4-8613-72c3ffbc1419` generated only `index.html`; the planned `style.css` unit failed after two truncated model responses (`MAX_TOKENS`). The report recorded `PARTIAL`, `goalImplemented=false`, `failedStage=check`, and unresolved references to `style.css` / `tetris.js`.
- The same runtime diagnostics showed prior `HTTP_409` build attempts and `HTTP_404` download attempts. System health checks being green did not validate the generated project.
- The live workflow on the same deployed commit generated four files and downloaded a non-empty ZIP (HTTP 200), but validators failed (`storage.js` module syntax and `style.css`/`styles.css` reference mismatch). Its verdict was `INCONSISTENT` because the staged engine represents PARTIAL as an internally failed terminal job while retaining an optional starter ZIP.
- The screenshots show the diagnostics/operations modal over a dimmed workspace; they do not capture a browser exception or independently establish the reported black-screen cause.

## Change

- Raised the conservative App Builder output budget from 2,048 to 8,192 tokens to reduce the specifically observed file truncation failure mode.
- Adjusted the live evidence classifier to recognize `status=failed` + explicit `outcome=PARTIAL` as PARTIAL only when a failure stage/reason and a verified ZIP are both present. `deliveryProven` remains false for PARTIAL; this is not PASS.
- Added regression tests for both contracts.

## Checks

- `node --check scripts/p118-architect-live-lib.mjs` → PASS.
- Focused runtime assertions for `status=failed` + `outcome=PARTIAL` + verified ZIP → PARTIAL; aggregate verdict remains `HONEST_NON_PASS`, `deliveryProven=false` → PASS.
- Direct import/assertion of `conservativeProfile().maxOutputTokens === 8192` using Node type stripping → PASS.
- `node scripts/docs-integrity.mjs` → PASS.
- `node --test tests/p121-cycle-governance.test.mjs tests/p121-navigator-protocol.test.mjs` → 14/14 PASS.
- `tests/app-builder-unit-repair-p118.test.mjs` and `tests/p118-architect-live.test.mjs` → NOT_RUN to completion: dependencies were unavailable; `npm ci --ignore-scripts --no-audit --no-fund` timed out and the focused test entry points could not resolve `jszip` / `tsx`.
- Hosted CI: NOT_RUN.
- New deployed/live generation: NOT_RUN.
- Browser black-screen root cause: NOT_VERIFIED; current screenshots do not include browser console/runtime diagnostics.

# CURRENT EVIDENCE NOTE — P121.0.11 docs-integrity AGENTS marker, 2026-10-30

> Additive.

## Failure

`docs-integrity` / `test:core`: `AGENTS.md missing required text: Mandatory protocol for the beginning of every session` after P121.0.10 rewrite renamed the section to "Session protocol".

## Fix

Section §4 title restored to the required contract string; hard gates §0 unchanged.

## Checks (local)

- `node scripts/docs-integrity.mjs` → PASS
- `p121-cycle-governance` + `p121-navigator-protocol` → PASS
- Hosted CI: NOT_RUN

---

# CURRENT EVIDENCE NOTE — P121.0.10 AGENTS hard gates, 2026-10-30

> Additive. Prior notes retained.

## Change

`AGENTS.md` restructured so delivery and Navigator rules are **fail-closed hard gates at the top**, not late narrative. Explicit bans on combined re-ship, helper files in ZIP, shell steps for Navigator, and shipping UI flow changes without e2e/completion surface in the same delivery.

## Checks

- Source structure of AGENTS.md reviewed against session failure modes.
- `p121-navigator-protocol.test.mjs` updated for G1–G5 headings.
- Hosted CI / full test:core: NOT_RUN here.

---

# CURRENT EVIDENCE NOTE — P121.0.9 e2e and lint:copy fixes, 2026-10-30

> Additive. Prior notes retained.

## Failures addressed (from CI evidence)

1. **lint:copy** — UserGuide §6.2 one long paragraph exceeded 24 words; split into short paragraphs. Local `node scripts/lint-copy.mjs` → OK.
2. **p120-architect-e2e** — `novice-done` never appeared because `onFinished` set `showGuidedStart=false` and `loadProjects(id)` set `selected`, unmounting the wizard (`!selected && showGuidedStart`). Original P58 behavior kept the novice path mounted after finish. Fixed: render wizard while `showGuidedStart`; `onFinished` only refreshes/selects project; dismiss via Back.

## Checks

- lint:copy: PASS (local)
- Architect browser e2e / full DAG / hosted CI: NOT_RUN in this workspace; expect CI re-run after apply

---

# CURRENT EVIDENCE NOTE — P121.0.8 Navigator protocol rules, 2026-10-30

> Additive record. Historical notes below retained.

## Change

Binding assistant protocol in `AGENTS.md` §7 and decision D-2026-10-30-07:
1. Patch ZIP purity for Navigator delivery.
2. Navigator = Android tablet, GitHub web UI / Actions / mobile browser only.
3. Automate tests and workflows instead of terminal runbooks for the Navigator.

Governance regression: `tests/p121-navigator-protocol.test.mjs` in `test:core`.

## Checks

- Source inspection of AGENTS/DECISIONS/TESTING: rules present.
- Hosted CI and full `test:core` execution: NOT_RUN in this workspace.

## Boundary

Does not by itself close BIO-004 live user-value. P121.0.7 UI unification still requires Actions/browser evidence after apply.

---

# CURRENT EVIDENCE NOTE — P121.0.7 One Architect flow, 2026-10-30

> Additive top-level record. Prior notes below are historical and retained.

## Scope and provenance

Implemented against the reconstructed archive `bf-121-0-6.zip` (patch 121.0.6). This is not a live remote checkout; hosted CI and deployment were not run.

## Change

- **BIO-004 / one Architect experience:** `ProjectMode.tsx` no longer renders `ProjectPathChooser` or branches on `builderPath === 'novice' | 'professional'`. Default entry is the guided wizard (`ProjectNoviceWizard`); dismissing it shows the project list and optional name/goal create form with a “Guided start” return control. After a project is selected, existing workspace tools remain unchanged.
- Client strings and `UserGuide` / capability notes updated to stop advertising two paths.
- `tests/p120-architect-e2e.test.mjs` waits for `project-novice-wizard` instead of clicking `path-novice`.

## Checks run

- Static inspection: no remaining `builderPath` / `ProjectPathChooser` usage in `ProjectMode.tsx`.
- Full `npm test` / typecheck / browser e2e / hosted CI: **NOT_RUN** (incomplete dependency install in this workspace).

## Remaining gaps

- Live end-to-end Architect generation with real models and download validation still NOT_VERIFIED.
- `ProjectPathChooser.tsx` file still present (unused); language residue (e.g. Cyrillic in build-progress messages) not addressed in this patch.
- User-value evaluation of the unified flow against real tasks remains OPEN.

---

# CURRENT EVIDENCE NOTE — Historical record preservation clarification, 2026-10-30

## Scope and provenance

Documentation-only clarification prepared against the reconstructed local tree assembled from available archives. The current remote repository was not available for comparison.

## Changes

- Distinguished historical records (completed roadmap entries, changelog, factual reports, decisions, and concise test/experiment outcome summaries) from obsolete active test implementations and temporary payloads.
- Clarified that completed tests may be retired without deleting the factual record that they ran or the conclusions supported by their evidence.
- Required reference, CI, compatibility, and unique-coverage checks before retiring executable tests or fixtures.
- No tests, source files, fixtures, or historical records were removed.

## Verification boundary

Documentation and version checks are run locally where possible and their exact results are reported in the delivery message. Hosted CI, remote checkout comparison, and live product checks are NOT_RUN. This patch does not claim that a full repository retirement audit is complete.

---

# CURRENT EVIDENCE NOTE — Repository minimalism and test lifecycle policy, 2026-10-30

## Scope and provenance

Documentation-only governance update prepared in the locally reconstructed project tree assembled from available archives. The current remote repository was not available for comparison.

## Changes

- Added a requirement that every maintained file serve a current purpose.
- Defined test retention around current requirements, user scenarios, supported contracts, and material regression risks rather than age or historical origin.
- Added safe-retirement checks for references, CI/workflows, compatibility commitments, and unique coverage.
- Defined recurring classification outcomes: keep, update, merge, archive outside the repository, or delete.
- No source files, tests, fixtures, or historical records were removed by this patch.

## Verification boundary

Local checks are to be recorded after execution. Hosted CI, remote repository comparison, and live product checks are NOT_RUN. This note does not claim that a repository-wide retirement audit has been completed.

---

# CURRENT EVIDENCE NOTE — Repository language policy, 2026-10-30

## Scope and provenance

This record describes a documentation-only policy patch created against a reconstructed local tree assembled from available historical archives. It is not evidence about the current remote checkout.

## Decision and follow-up scope

- Established English as the sole language for maintained repository artifacts.
- Explicitly separated repository language from end-user input/output language support.
- Added a recurring roadmap stage to scan, classify, correct, and verify language residue, including runtime heuristics and test fixtures.
- No runtime heuristics or test prompts were changed because their behavior and intent cannot be safely inferred from a static scan alone.

## Verification boundary

Documentation integrity and version metadata checks are to be run against this reconstructed tree. Hosted CI, remote checkout comparison, runtime behavior tests, and live model tests are NOT_RUN.

---

# CURRENT EVIDENCE NOTE — C121 verification cycle bootstrap, 2026-10-30

## Scope and provenance

The cycle was checked against a local reconstruction assembled from the available `bf-119-0-4.zip` archive and the available P119/P120/documentation patches. The directory has no `.git` metadata; remote HEAD, hosted CI, deployed application, and live behavior cannot be independently verified here.

## Initial observations before repair

- `node scripts/docs-integrity.mjs`: FAIL — `NEXT_PATCH.md` plus 14 retired prose documents were still present despite the canonical governance and docs-integrity check requiring their removal.
- `node scripts/docsCheckInventories.mjs`: PASS.
- `node scripts/statusGraph.mjs --check`: PASS.
- `node scripts/capabilityGenerateGraph.mjs --check`: PASS (449 nodes, 906 edges).
- `node scripts/p120-e2e-preflight.mjs`: PASS against historical P120.0.7 before the cycle bump; its hard-coded version check would prevent moving to v121.
- `node scripts/run-dag.mjs --profile check`: FAIL; only 3 checks passed, 15 failed, 6 blocked. Several failures were caused by missing `tsx` after `npm ci --ignore-scripts --no-audit --no-fund` timed out. The docs-integrity failure was independent and reproducible.

## C121/P121.0.1 repair scope

- Set package version/patch to `121` / `121.0.1` and synchronized the root lockfile metadata.
- Generalized the P120 E2E preflight so it checks current version/patch consistency while retaining P120 browser tests as regression coverage.
- Updated the P120 acceptance-evidence test to distinguish the historical P120.0.7 acceptance record from current C121 package metadata.
- Removed the retired handoff and obsolete side-document files listed in the patch delivery summary.

## Post-repair verification results

- `node scripts/check-version.mjs` — PASS (`121` / `121.0.1`).
- `npm run docs:check` — PASS after regenerating the check/capability graphs; canonical docs, inventories, status graph, and capability graph are current.
- `node scripts/p120-e2e-preflight.mjs` — PASS; four historical P120 browser scenarios remain wired as regression coverage under C121. This is a preflight only, not a browser run.
- `node --test tests/p121-cycle-governance.test.mjs tests/p120-acceptance-evidence.test.mjs` — PASS, 8/8.
- `node --test tests/dag-p107.test.mjs tests/evidence-p105.test.mjs` — PASS, 27/27.
- `node --test tests/p119-agent-boundaries.test.mjs` — 19 PASS, 2 FAIL because the missing `tsx` package prevents loading TypeScript modules; the failures are environment/dependency blockers, not evidence of a product regression.
- `npm run check` — FAIL in this environment: 4 PASS, 14 FAIL, 6 BLOCKED. The failing runtime-dependent checks could not import `tsx`; `test:compact-ci-artifacts` could not import `jszip`. `npm ci --ignore-scripts --no-audit --no-fund` timed out, leaving dependencies incomplete.
- `node scripts/schemaValidate.mjs` without the required `--type` argument — invocation error, not a schema validation result; schema validation is NOT_VERIFIED by that command.

## Evidence boundary

Typecheck, build, full core/model/security/application tests, browser E2E, hosted CI, deployment, and live user-value scenarios remain NOT_RUN / NOT_VERIFIED. The P120 Architect browser test uses a mocked project/build API and explicitly exercises `path-novice`; it does not establish live model generation quality or compliance with the current one-flow Architect requirement. Source inspection confirms `ProjectPathChooser` still presents separate “Simple words” and “Professional” choices and `ProjectMode.tsx` renders separate branches. Therefore `BIO-004` is OPEN, not PASS. This patch repairs cycle identity and documentation governance; it does not change runtime product behavior.

---

# CURRENT EVIDENCE NOTE — Session governance and documentation consolidation, 2026-10-30

> Additive record. The previous evidence notes and all older implementation history below are retained. This patch updates governance and CI report naming; it does not claim any runtime product function has changed.

## Scope and provenance

This patch was built against a reconstructed tree extracted from `bf-119-0-4.zip`, with the previously prepared, not-yet-applied documentation consolidation patch overlaid. Other P119/P120 patch archives are present in the workspace but were not applied to runtime source in this working tree. This is not a verified remote checkout: remote HEAD, hosted CI, deployment, and live product behavior were not independently inspected. The exact checks actually run for this patch are listed below and must not be inferred beyond that list.

## Changes represented by this record

- `AGENTS.md` now contains the canonical obligation map and mandatory start-of-session protocol. Each session must independently reconstruct current state and choose its own task; no pre-written task is carried forward as binding.
- `NEXT_PATCH.md` is retired as a root planning/handoff file. CI-generated run evidence is renamed to `PATCH_EVIDENCE.md` / `BIForge-PATCH-EVIDENCE.md` so a diagnostic artifact cannot be mistaken for a future-work assignment.
- The roadmap keeps its completed phase history, but the current control section says the next task must be re-evaluated each session. Historical mentions of retired task files are not current instructions.
- Active workflow, report scripts, and related tests are updated to the new CI evidence artifact name. Product runtime behavior is not changed by this documentation/governance patch.

## Checks actually run in this reconstructed tree

- `npm run docs:check` — PASS, including canonical documentation integrity, generated inventories, check graph, and capability graph.
- `node --check` — PASS for modified JavaScript module files.
- `node --test tests/dag-p107.test.mjs tests/evidence-p105.test.mjs` — PASS, 27/27.
- Manual temporary-directory smoke test of `scripts/package-ci-artifacts.mjs` — PASS; output contained exactly `BIForge-PATCH-EVIDENCE.md` and `biforge-ci-logs.zip`.
- `tests/ci-diagnostics-chain.test.mjs` and `tests/compact-ci-artifacts-p94.test.mjs` — unable to start because `jszip` is not installed in this reconstructed tree; not counted as PASS.

## Evidence boundary

This record describes governance/documentation and CI report naming. It is not evidence that Architect has been converted to one flow or that any user-facing feature is complete. Full DAG, full test suite, browser tests, hosted CI, deployment, and live user scenarios remain `NOT_RUN`. The tree was reconstructed from an archive and patches; remote HEAD was not verified.

---

# CURRENT EVIDENCE NOTE — Documentation inventory, 2026-10-30

> This note is a new top-level record. The historical sections below are retained as written. Historical statements are evidence of what was reported at that time, not current runtime guarantees. New facts are added above older records; do not rewrite prior evidence to match the present.

## Scope and provenance

This documentation reconciliation was performed against a reconstructed working tree assembled from `/mnt/data/bf-119-0-4.zip` and the available P119/P120 patch archives through `BiForge_P120_0_8_User_Value_Documentation_Reconciliation.zip`. This is not a live checkout of the remote repository, so remote HEAD and remote CI state were not independently verified.

## Findings

- The documentation inventory had multiple competing sources for user-agent contracts, roadmap/task state, operating rules, user-value evidence, deployment context, archive delivery, and architectural guardrails.
- The older normative text allowed or described simplified/professional Architect interaction profiles in places, while the current product requirement is one Architect agent with no visible mode choice or independent flow.
- The previous documentation-integrity script enforced old document names and headings, so it would keep the obsolete document topology alive.
- This patch defines a single hierarchy, consolidates specialist documents, updates active references and documentation checks, and lists superseded prose files for deletion.

## Evidence boundaries

This is a documentation-only patch. No claim is made that the Architect UI/runtime has already been converted to one flow. No full test suite, browser E2E, live generation, deployment, or hosted CI was run as part of this inventory. Checks run for this patch are listed in the handoff message and must not be inferred beyond what was actually executed.

---

# BiForge Technical Report

**Document ID:** BF-TECH-REPORT-001  
**Status:** Historical reconstruction from available repository snapshots and documentation  
**Authority:** Evidence from analis.zip snapshots (bf-01 … bf-118), CHANGELOG.md entries, AI-USER-VALUE-REPORT.md, task documents, live-run notes and test artefacts  
**Principle:** Distinguish source-code presence, CI success, local test results and confirmed production/live behaviour. Do not equate any of them.

This report recovers the implementation history. For each material change it records:

- First appearance in a snapshot / version label
- Problem addressed
- Specified behaviour
- Affected components / files
- What was actually implemented
- Documented tests and checks
- Recorded results
- Defects found and fixed
- Open questions
- Confidence level and supporting artefacts

---

## 1. Early Foundation Snapshots (bf-01 … bf-09 / v14-main)

**First observed:** Lowest-numbered directories in the archive (bf-01, bf-1-0/v14-main, bf-1-6, bf-06, bf-09).

**Problem addressed:** Establish a working TypeScript + React + Express application with basic conversation capability, document handling and early project concepts.

**Specified behaviour:** Minimal runnable product; early CHANGELOG_AGENT_BEHAVIOR.md and README describe agent behaviour and Railway deployment.

**Components / files:**

- `server.ts` (monolithic in early versions)
- `src/App.tsx`, early CSS
- `package.json`, Vite/React scaffolding
- Early `server/documents.ts`, `reasoningState.ts`, `security.ts`
- Scripts for acceptance and prompt measurement

**Actually implemented:** Functional client-server chat surface; basic security; document generation primitives; early state tracking.

**Tests / checks:** Early acceptance scripts (`acceptance-s2-05.mjs` etc.), regression fixtures.

**Results:** Local runs possible; Railway deployment notes present.

**Defects:** Fragmented documentation; multiple competing sources of truth later consolidated.

**Open questions:** Exact commit dates unavailable (ZIP timestamps are archive creation); behavioural completeness of earliest agents not fully reconstructible from remaining artefacts.

**Confidence:** Medium for structure; low for precise behavioural contracts. Artefacts: package.json, early CHANGELOG_AGENT_BEHAVIOR.md, README, server modules.

---

## 2. Project Mode and Persistence Expansion (bf-16 … bf-26)

**First observed:** bf-16, bf-17, bf-20, bf-24, bf-26.

**Problem addressed:** Durable project state, richer orchestration, Drive integration, expanded agent behaviour logging.

**Specified behaviour:** Project state machines, file handling, history panels, offline indicators, Drive sync/merge/export.

**Components:**

- Expanded `src/ProjectMode.tsx`, `ConversationFiles.tsx`, `driveClient.ts`, `driveSync.ts`, `driveMerge.ts`, `driveExport.ts`
- `server/database.ts`, early migrations
- `AGENTS.md` (early form), larger CHANGELOG.md / CHANGELOG_AGENT_BEHAVIOR.md
- ARCHIVE/ directory with P08–P17 SPEC and REPORT documents

**Actually implemented:** PostgreSQL-backed project state; client-side Drive integration; richer UI panels; acceptance of multiple early patches (P08–P17 lineage visible in ARCHIVE).

**Tests:** Expanding test directories; golden-eval notes.

**Results:** Local and some hosted checks; Drive QA checklists present.

**Defects:** Competing documentation (later removed); production diagnostics incomplete (later frozen as P92).

**Open questions:** Which exact P-numbers map to which bf-NN snapshot; live Drive behaviour in production not fully evidenced.

**Confidence:** Medium-high for code presence; medium for live outcomes. Artefacts: ARCHIVE/*.md, expanded src/, migrations beginnings.

---

## 3. AI-Native Renovation Foundations (P106–P112, visible in later snapshots)

**First observed clearly:** bf-93, bf-104, bf-112 and documentation in bf-118.

**Problem addressed:** Lack of machine-verifiable evidence, weak fail-closed behaviour, missing capability/intent contracts, high context cost for AI sessions.

**Specified behaviour (from schemas and task docs):**

- Evidence Records, verification DAG, independent checks always complete.
- Bounded repair with protected paths and limits.
- Intent-policy contracts, capability graph, context selection.
- Schema validation, architecture boundary enforcement.

**Components:**

- `docs/schema-*.json` (common, evidence-record, handoff, intent-policy, verification-plan, …)
- `scripts/schemaValidate.mjs`, `run-dag.mjs`, architecture generators
- `docs/verification-manifest.json`, generated inventories
- Fault-injection and repair test suites

**Actually implemented:** Full set of schemas and validators; DAG runner with BLOCKED semantics; CI two-artefact handoff; architecture checks.

**Tests:** `test:compact-ci-artifacts`, schema-validate, dag, intent-contract, capability-graph, context-select, fault-injection tests.

**Results:** Phase 1 (P106) and Phase 2 (P109) closed with Navigator acceptance recorded in AGENTS.md. CI green for those commits.

**Defects:** Hosted CI status is commit-specific; later patches can re-break.

**Open questions:** Exact production runtime of evidence collection under load.

**Confidence:** High. Artefacts: schemas, scripts, AGENTS.md status section, test files, generated JSON inventories.

---

## 4. Conversational Agent Recovery (P116)

**First observed:** Documented as accepted 2026-10-28 in AGENTS.md and roadmap of bf-118.

**Problem addressed:** Simple/Expert conversation modes producing generic or stalled answers.

**Specified behaviour:** Useful multi-turn conversation comparable to a capable general-purpose chat; truthful failure signalling.

**Components:** conversationMode.ts, cascade foundations, prompt adjustments, residual Node LTS version reporting.

**Actually implemented:** Recovered conversation path with 80 % live PASS; residual B3 (Node LTS number) left open.

**Tests / checks:** Live scenarios; related unit tests later stabilised under P117.3.

**Results:** Navigator acceptance recorded; residual documented.

**Defects:** B3 remains; full isolation of Conversational from Expert shared orchestration deferred to P119.

**Open questions:** Exact live transcript set used for the 80 % figure not present in the archive.

**Confidence:** High for acceptance decision; medium for quantitative live metrics. Artefacts: AGENTS.md, AI-USER-VALUE-REPORT.md references, roadmap.

---

## 5. Expert Foundations and Cascade (P117.x)

**First observed:** P117 line closed for conversation recovery (P117.3) in bf-118 documentation.

**Problem addressed:** Need for progressive multi-step reasoning distinct from pure conversation; model availability and cascade.

**Specified behaviour:** Expert owns its cascade, tools, state machine and output contract; probes for optional models; opt-in external providers.

**Components:** modelAvailability, modelHealth, cascade ordering (gemini-3.5-flash-lite → gemini-3.1-flash-lite primary), probe logic, conversation recovery tests.

**Actually implemented:** Cascade foundations and availability probes; full Expert E2E left open.

**Tests:** `tests/model-availability-p117.test.mjs`, `tests/p117-3-conversation.test.mjs`, model cascade tests.

**Results:** P117.3 closed; conversation recovery stable.

**Defects:** Full Expert end-to-end scenarios still open under later slices.

**Open questions:** Live quality of Expert progressive reasoning under real user load.

**Confidence:** High for code and unit tests; medium for product-level Expert outcomes. Artefacts: test files, CHANGELOG, roadmap.

---

## 6. Complex Software Architect Agent (P118 line)

### 6.1 P118 / P118.2 — Contract and live workflow

**First observed:** bf-118 CHANGELOG and task document.

**Problem addressed:** Architect path previously failed with `invalid_spec`, zero files, single model call.

**Specified behaviour:** Completion contract; live workflow `p118-architect-live`; evidence enrichment; CSRF runner fix.

**Components:** appBuilder core, appBuilderAdapter, pipeline, live test harness.

**Actually implemented:** Contract and workflow harness; early live runs still HONEST_NON_PASS on old engine.

**Tests:** `tests/p118-architect-live.test.mjs`, architect-outcome tests.

**Results:** Live runs #1 BLOCKED (CSRF, fixed); later runs HONEST_NON_PASS with diagnostics.

**Defects:** Old engine still in some deployed commits; ZIP stage never reached live.

**Open questions:** Exact model responses of the earliest failing runs.

**Confidence:** High. Artefacts: CHANGELOG entries, task document, test files.

### 6.2 P118.3 — Spec bounded repair

**First observed:** CHANGELOG P118.3 on bf-118.

**Problem addressed:** Planner returned parseable JSON that failed Spec validation; recovery ran only on unparseable input.

**Specified behaviour:** Explicit schemaVersion, lenient parse, validateSpec with issue list, one recovery call carrying previous issues, concrete failureReason / error.detail, diagnostic events with previews.

**Components:** `appBuilder/core-engine.ts`, adapter logging, new test `tests/app-builder-spec-repair-p118.test.mjs`.

**Actually implemented:** As specified; APP_VERSION remains 118.

**Tests:** Spec-repair suite.

**Results:** Local tests green; commit `1a98a6a` red in hosted CI (version + type errors).

**Defects:** CI red (repaired in next sub-patch).

**Confidence:** High. Artefacts: CHANGELOG, test file, engine source.

### 6.3 P118.3.1 — CI repair

**Problem addressed:** Red CI on version-consistency, typecheck, build, compact-ci-artifacts.

**Specified / implemented:** Restore version to 118; fix TypeScript narrowing under `strict:false` by reading failure fields via `'error' in x` / `'issues' in x`. No Spec-repair behaviour change.

**Results:** Local DAG 23 PASS / 3 BLOCKED (DB). Hosted CI of the repair itself not recorded in the examined artefacts.

**Confidence:** High for local; medium for hosted. Artefacts: CHANGELOG.

### 6.4 P118.3.2 — Single version source + documentation audit

**Problem addressed:** Multiple version sources; documentation sprawl.

**Specified / implemented:** `package.json` sole source (`version` + `patch`); Vite plugin injects into client; check-version and patch-tools updated; AGENTS.md, operating rules, task, roadmap, report, environment context audited and consolidated.

**Results:** Local verification green; no product behaviour change.

**Confidence:** High. Artefacts: package.json, CHANGELOG, AGENTS.md, docs/*.

### 6.5 P118.3.3 — Code-stage file marker repair (current tip of archive)

**First observed:** Top of CHANGELOG.md and NEXT_PATCH.md in bf-118.

**Problem addressed:** Live run on `9ff44ac` passed Spec and Plan; unit `index.html` failed because the model emitted `<<<FILE path>>>index.html` (copied placeholder). Parser treated `path` as the filename.

**Specified behaviour:**

- Prompt names the real header; PROMPT_VERSION → `static_site.v2` (cache invalidation).
- Parser deterministically accepts three known slips for the expected path and records them in `coerced`.
- One bounded repair call per file (budget counted; skipped on cancel or exhausted budget).
- New events `unit_attempt` / `unit_repair`.
- Precise failure reason.
- Adapter no longer drops `unitId` from log details.

**Components:** `appBuilder/core-prompts.ts`, `core-markers.ts`, `core-engine.ts`, `server/appBuilderAdapter.ts`, new test suite (7 tests, mutation-checked).

**Actually implemented:** As described in CHANGELOG.

**Tests:** `tests/app-builder-unit-repair-p118.test.mjs`; `test:app-builder` updated.

**Results:** Local tests written and (per CHANGELOG) mutation-checked. Live evaluation of the repair, remaining units, validators and ZIP packing **NOT_RUN / NOT_EVALUATED**.

**Defects remaining:** ZIP packing and full live SUCCESS never observed in the archive; hosted CI of 118.3.3 itself not recorded here.

**Open questions:** Whether the three coercion rules cover all future model slips; whether one repair call is sufficient under real model variance; production ZIP integrity under load.

**Confidence:** High for the implemented repair and unit tests; low for end-to-end live Architect SUCCESS. Artefacts: CHANGELOG P118.3.3, NEXT_PATCH.md, core-*.ts sources, test file.

---

## 7. Cross-Cutting Observations

### 7.1 Source code vs CI vs live

- Many patches show green local DAG while hosted CI or live workflows lag or remain NOT_RUN.
- Evidence rule in AGENTS.md is strict: green CI of an earlier commit does not speak for a later one; NOT_RUN is never PASS.

### 7.2 Documentation discipline

- Transition from many competing SPECs/REPORTs (ARCHIVE/) to single rolling files (task, roadmap, report, operating rules) is complete in bf-118.
- Charter (AGENTS.md) is treated as immutable except by explicit Navigator instruction.

### 7.3 Three-agent target

- Contract fully specified in AI-USER-VALUE-SPEC.md.
- Implementation reaches Conversational (accepted), Expert foundations, Architect pipeline with repair but without confirmed live ZIP SUCCESS.
- UI still transitional (four modes) until P119.
- P119.0.3 (OBSERVED in source): Conversational and Expert planning and prompt entry moved to `server/conversationalAgent.ts` / `server/expertAgent.ts` selected by `server/agentRouting.ts`; route, wire key and prompt pack text remain shared; user copy uses the three approved names.
- P119.0.1–0.2 (post-archive tip, OBSERVED in source): UI names are Conversational / Expert / Architect. Architect is a separate route family, client surface and engine; Conversational and Expert still share `POST /api/conversation` and one prompt builder selected by `productMode`. Boundaries are documented in TECHNICAL_SPECIFICATION §6.4 and locked by `tests/p119-agent-boundaries.test.mjs`. Local and CI results for these tests are recorded in `docs/AI-USER-VALUE-REPORT.md`.

### 7.4 Security and Tier 3

- Production deployment, secrets, GitHub write remain Navigator-gated.
- No evidence of Tier 3 actions being performed autonomously in the examined history.

---

## 8. Summary of Confidence by Programme Phase

| Phase              | Code presence | Local tests | Hosted CI | Live product outcome | Overall confidence |
|--------------------|---------------|-------------|-----------|----------------------|--------------------|
| Foundations P106–P109 | High         | High        | High (at closure) | N/A                 | High              |
| P116 Conversational | High         | High        | Medium    | High (accepted)     | High              |
| P117 Expert        | High         | High        | Medium    | Medium (foundations)| Medium-High       |
| P118 Architect     | High         | High (unit) | Partial   | Low (no verified ZIP)| Medium            |
| P119–P121          | N/A (plan)   | N/A         | N/A       | N/A                 | N/A               |

---

## 9. Remaining Open Items at Archive Tip (P118.3.3)

1. Hosted CI green confirmation for the 118.3.3 commit.
2. Deploy + `/health` commit match.
3. Single live `p118-architect-live` dispatch after the marker repair.
4. Recording of the live result (stage reached, diagnostics, presence/absence of ZIP).
5. Navigator decision on P118 exit gate.
6. Residual B3 (Node LTS) still open.
7. P92 production diagnostics verification still frozen.

This report is reconstructed solely from artefacts present in the analysed archive. Claims of live SUCCESS beyond the documented acceptance of P116 are not supported by the available evidence.
