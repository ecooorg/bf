# AI-NATIVE-RENOVATION — Task: Phases 0–2 in five patches (P104–P108)

**Task IDs:** ANR-P104, ANR-P105, ANR-P106, ANR-P107, ANR-P108
**Status:** Active. Supersedes ANR-P0-001 (its documents exist; its archival step is executed by P104).
**Authority:** Navigator directive of 2026-10-25 (section 1). Normative references: `AI-OPERATING-RULES.md`, `AI-NATIVE-RENOVATION-MANDATE.md`, `AI-NATIVE-RENOVATION-ROADMAP.md`, `AI-NATIVE-GLOBAL-AUDIT-2026-10.md`.
**Reading rule for a fresh session:** read sections 1 and 2 and only the section of the current patch.

| Patch | Phase | Outcome |
|---|---|---|
| P104 | 0 | Clean documentation set; archive candidates moved; zero live references to them; guard in `check:docs` |
| P105 | 1a | Evidence records written by the check runners; one handoff generator validated against schemas |
| P106 | 1b | Legacy P82–P91 tools resolved; `schema:validate` in CI; Phase 1 gate accepted |
| P107 | 2a | Verification DAG: independent checks always finish; blocked checks carry reasons |
| P108 | 2b | Fault-injection suite; bounded repair protocol; Phase 2 gate accepted |

## 1. Navigator directive (owner, 2026-10-25)

The owner never opens or edits repository files and does not care about code style, file names, file layout or implementation language. The only limits are security and that the product keeps doing what it is meant to do.

* **ND-1 Audience.** The repository is operated by AI assistants. Human readability of code, documents, names and layout is not a goal and not an acceptance criterion.
* **ND-2 Freedom.** Any structure, naming, formatting, layout or language is permitted if ND-3 and ND-4 hold.
* **ND-3 Hard constraints.** Security (authorization tiers, secrets, no host execution of generated code), preserved product function unless a change is approved, evidence integrity (status vocabulary). No human reviews code, so these are enforced by tests, checks and evidence. "Someone will read it" is never a control.
* **ND-4 AI-legibility test.** A change is acceptable only if a fresh assistant session with no memory can still locate, change by diff and verify the affected behaviour at least as cheaply as before (cost = files and bytes it must read).
* **ND-5 Decisions already taken under ND-1..4 (Tier 1, disclosed):**
  * Implementation stays TypeScript/JavaScript/SQL/JSON/Markdown. `tsc`, `node --test`, Playwright, the nixpacks/Railway build, gitleaks and model competence exist for these. Assembly, machine code or invented languages would remove the verification ND-3 depends on. Revisit only with a measured benefit and a verification path (Tier 2).
  * Source stays line-oriented and unminified. Patches are delivered as diffs and `str_replace` edits and failures are localised by line; single-line blobs break all three.
  * No style-only rewrites. Structural rewrites (for example splitting files above 50 KB) only with a measured ND-4 gain and only after the Phase 2 gate.
  * Human-facing material that stays because it is product, not documentation: UI strings (`lint:copy`), the in-app guide `src/UserGuide.tsx`, and the Navigator decision surface (`NEXT_PATCH.md`, chat handoff).
  * History is git. `archive/` is dead storage and is never loaded as context.
* **ND-6 Context budget.** Mandatory reading for a fresh session: `AGENTS.md`, `docs/AI-OPERATING-RULES.md`, sections 1–2 of this file plus the current patch section. Target ≤ 40 KB in total. Everything else is on demand through `docs/DOCUMENTATION-INDEX.md`, which lists each document with size and trigger.

## 2. Rules for every patch

1. **Baseline.** Record the CI result of the previous patch using the status vocabulary. If it is `NOT_RUN`/`UNKNOWN` (true for P103.3 at the time of writing), the patch may be prepared but must not claim green.
2. **Bounded.** One patch, one outcome. Stop at its gate; Tier 2/3 items need an explicit Navigator decision. Silence is not consent.
3. **Delivery.** ZIP with changed/new files, separate list of deletions/moves, manifest, exact commands with outcomes, rollback note.
4. **CHANGELOG.** New entry with patch ID, changes, verification, limitations. Code patches bump the version and keep the `## P<N>` top-entry format that `check-version` requires.
5. **`AGENTS.md`** only for significant changes of how the product or development works.
6. **No weakening.** Tests, gates, security controls and acceptance criteria are never relaxed to get green. A test may be removed only with evidence in CHANGELOG that it is an orphan or duplicate.
7. **Honest status.** `UNKNOWN`, `NOT_RUN`, `BLOCKED`, `TIMEOUT`, `PARTIAL` are never `PASS`. Implemented ≠ verified in production.

## 3. P104 — Phase 0 closure: documentation order and archive

**Objective.** Leave only documents an assistant needs. Move every archive candidate to `archive/` so that no active file, script, test or workflow refers to it, and keep everything the running product needs.

**Facts established from the P103.3 tree (re-verify with `grep -rIF` before each move).**

* The 16 candidates of Groups A and B reference almost only each other (roadmaps P81–P84 / P85–P91 ↔ specs P85–P91 ↔ `PROJECT-MODE-DIAGNOSTICS-ROADMAP`; `DOCUMENTATION-BASELINE` → `AI-TRANSFORMATION-SPEC`, `tz-appbuilder`; the specs cite `test-audit-p103`). Moving them together removes those links.
* `tests/context-benchmark.test.mjs` is the only reader of `docs/context-benchmark-verification-p84.json`. It is an orphan: no `package.json` script runs it and its fixture `tests/context-benchmark-gold-p84.json` is not in the repository. `scripts/contextBenchmarkLib.mjs` reads the same missing fixture.
* `scripts/acceptanceReport.mjs` and `scripts/architectureCheckBoundaries.mjs` **write** `docs/generated-acceptance-summary.json` and `docs/generated-boundary-report.json`. Moving these files without changing the writers would recreate them. `docs:check` requires only the route/env/migration inventories.
* `docs/DOCUMENTATION-INDEX.md` links `context-baseline-v80.json`; `AGENTS.md` links `typing-and-naming.md`; `tests/security.test.mjs` asserts that `AGENTS.md` mentions "GitHub write" and "deferred/ADR-06". That wording must survive any `AGENTS.md` cleanup.
* `scripts/check-docs.mjs` validates markdown links in `AGENTS.md` and `docs/` and backtick paths in `AGENTS.md` only.
* Scripts mention documents that do not exist: `docs/NEXT.md`, `docs/CURRENT_STATE.md`, `docs/DECISION_CARD_TEMPLATE.md`, `docs/ADR-10-code-executor.md`, `docs/08-Deployment-and-Runbook.md`, `docs/${patch}-REPORT.md` (in `gate-eval`, `evidence-collect`, `staging-drills`, `patch-pack`).
* `CHANGELOG.md` is 108 KB / 87 entries; `check-version` and `patch-quality-report` read only its top.

**Work items**

* **W1 Preserve live requirements first.** Before moving, extract what is still true into canonical files: the `test:ai` harness usage and diagnostics operation notes (from `TEST-HARNESS-P93.7`, `PROJECT-MODE-DIAGNOSTICS-P92`) into `OPERATIONS.md`, with the unfinished P92 production verification as an explicit open item; the App Builder invariants (staged, flag-gated, no execution of generated JS, ports/contracts) from `tz-appbuilder.md` into `architecture-guardrails.md`. Compare `docs/USER-GUIDE.md` with `src/UserGuide.tsx`; if it holds no requirement that is absent from the code and tests, archive it; otherwise record a hold reason.
* **W2 Move to `archive/<basename>`** (flat, content unchanged): the 11 Group A files, the 5 Group B files, and `context-locality-p82.json`, `contracts-verification-p83.json`, `context-benchmark-p84.json`, `context-benchmark-verification-p84.json`, `context-baseline-v80.json`, plus `docs/USER-GUIDE.md` if W1 allows. Do not move `AI-OPERATING-RULES.md`, `VIX-CONCEPT.md`, `OPERATIONS.md`, `architecture-*`, `typing-and-naming.md`, the schema files, or the four current `generated-*` inventories/module map.
* **W3 Remove the orphan consumer.** Delete `tests/context-benchmark.test.mjs` and record the evidence (unwired, fixture missing). Leave `scripts/contextBenchmark*.mjs` for P106.
* **W4 Redirect generated reports.** `acceptanceReport.mjs` and `architectureCheckBoundaries.mjs` write to `artifacts/qa/` (already git-ignored). No behaviour change besides the output directory; `architecture:check` keeps failing on new violations.
* **W5 Split the changelog.** Keep the newest 10 entries in `CHANGELOG.md`; move older entries unchanged to `archive/CHANGELOG-P1-P93.md` (exact range set at execution). Re-run `check-version`.
* **W6 Clean entry points.** `AGENTS.md`: one-line historical track, current phase P104+, Navigator directive summary (ND-1..ND-6), keep the "GitHub write … deferred (ADR-06)" wording. `DOCUMENTATION-INDEX.md`: tier each document as *mandatory / on demand*, with size and trigger; remove the archive-policy prose. Move `ARCHIVE-MOVE-LIST.md` into `archive/` as the last step.
* **W7 Dangling-reference inventory.** List every script string naming a non-existent document. Fix messages/comments that no test asserts; leave logic-bearing ones (`gate-eval`, `evidence-collect`) to P106 with the list recorded in CHANGELOG.
* **W8 Guard.** Extend `scripts/check-docs.mjs`: fail if any file outside `archive/` and `CHANGELOG.md` references `archive/` or a moved basename, and extend backtick-path checks from `AGENTS.md` to `docs/*.md`. `CHANGELOG.md` is excepted because it is append-only history.

**Verification.** `check:docs`, `docs:check`, `architecture:check`, `check-version`, `lint:copy`, `schema:validate`; a repository-wide `grep -rIF` for every moved basename returning only `archive/` and `CHANGELOG.md`; `npm run check` (CI) for the changed generators. Report each result separately; dependency-backed checks that cannot run locally are `NOT_RUN`.

**Done when:** the mandatory reading set is ≤ 40 KB; no active reference to any moved file; guard W8 passes and fails on a planted bad reference; generators no longer write into `docs/` except the four current inventories; CHANGELOG lists every move and deletion.

**Non-goals.** No application source, migration, CI-logic or security change. No deletion of `archive/`. No work on P82–P91 tool scripts.

**Rollback.** Move the files back and revert the generator output path; nothing else depends on the change.

## 4. P105 — Phase 1a: evidence records and one handoff generator

**Objective.** Check runners emit machine-readable evidence; one generator turns it into the handoff.

* **W1 Evidence emission.** `run-diagnostic-gate.mjs`, `run-independent-checks.mjs`, `run-secondary-diagnostic.mjs` write one Evidence Record per check (`docs/schema-evidence-record.json`): revision, command, environment, start/end time, status, log reference, redaction/completeness limits. Records go to `artifacts/ci-checks/`.
* **W2 Single generator.** New `scripts/handoffGenerate.mjs` builds `NEXT_PATCH.md` and a Handoff Report (`schema-handoff-report.json`) from the records. `ci-summary.mjs` and `patch-quality-report.mjs` become thin callers or are removed. The existing contract stays: zero console output from `ci-summary`, compact `biforge-ci-report` artifact, `diagnostics.zip` only on failure.
* **W3 Fallback.** If the generator or the records are broken, a minimal handoff (revision, failed stages, log names) is still written. The fallback path is tested.
* **W4 Rule enforcement.** A critical check whose record is missing, malformed, contradictory or redacted away cannot appear as `PASS`; the report shows `UNKNOWN`.

**Tests.** Missing record, malformed record, contradictory statuses, redacted provenance, generator crash → fallback. Existing P94/P102 handoff tests keep passing unchanged.
**Gate.** The handoff for a failing run contains the same actionable information as today and validates against the schema. Negative cases never produce `PASS`.
**Non-goals.** No DAG, no new checks, no change to what gets checked.
**Rollback.** Revert to the previous `ci-summary`/`patch-quality-report` pair; records are additive files.

## 5. P106 — Phase 1b: tool consolidation and Phase 1 acceptance

* **W1 Decision card for the legacy tools** (Tier 2, Navigator approval): `context:task`, `context:plan`, `impact:lineage`, `verification:plan`, `benchmark:real-tasks`, `intent:contract`, `context:refresh-profile`, `context:completeness`, `benchmark:context` and their `*Lib.mjs`. For each: adapt to emit a schema artifact (Change/Impact Plan, Verification Plan, Evidence Record), or retire. Evidence for the card: current exit status, whether it runs at all (`benchmark:context` reads a missing fixture), who calls it, ND-4 benefit. Default recommendation: retire everything that neither feeds a schema nor runs.
* **W2 Execute the decision.** Remove retired scripts, package entries, boundary-rule and inventory references; regenerate inventories; update `AGENTS.md` command list.
* **W3 Dangling references** left from P104-W7: fix or retire `gate-eval`, `evidence-collect`, `staging-drills` strings together with their workflows' expectations; keep `tests/gates.test.mjs` assertions intact.
* **W4 CI wiring.** `schema:validate` joins `npm run check` and `ci.yml`. A schema check over the generated records of the run itself.
* **W5 Generated status graph.** A deterministic status/capability file generated from code plus records (module → checks → last status), replacing hand-written status prose in `AGENTS.md`.
* **W6 Optional deletion of `archive/`** (Tier 2): only if a git tag of the pre-P104 tree exists and the Navigator approves; otherwise keep.

**Gate (Phase 1).** Missing/malformed/contradictory critical evidence cannot yield a success claim; a generator failure still produces a bounded handoff; no tool remains without a schema role or an explicit retirement; evidence of the gate is stored as records.
**Rollback.** Retired scripts are recoverable from git; the decision card lists the commit.

## 6. P107 — Phase 2a: verification DAG

* **W1 Manifest.** One machine-readable file declares every check: id, command, prerequisites, time and memory limits, `safeToRun`, parallel group. It replaces the order embedded in `ci.yml`, `check` and `CHECK_SKIP_SCRIPTS`.
* **W2 Runner.** Executes the DAG: independent safe checks always run to completion after an unrelated failure; a check whose prerequisite failed becomes `BLOCKED` with the prerequisite named; policy-skipped checks become `SKIPPED_BY_POLICY` with the rule; each check writes its P105 record.
* **W3 Compatibility.** `npm run check` and the CI jobs call the runner; the seven minimum checks and the PostgreSQL-dependent stages keep their current semantics.

**Tests.** Planted failure in one branch: sibling branches complete, dependants are `BLOCKED`, final status is not `PASS`. Cycle and missing-prerequisite manifests are rejected. Time limit produces `TIMEOUT`.
**Gate.** The above demonstrated in CI; total CI time not worse than today by more than the agreed margin (record the baseline in P107).
**Non-goals.** No repair logic; no new product checks.
**Rollback.** Restore the previous `check` chain and `ci.yml`.

## 7. P108 — Phase 2b: fault injection and bounded repair

* **W1 Fault-injection suite.** Scenarios: check timeout, cancellation, missing log, partial artifact, runner interruption, handoff generator failure, corrupted record. Each must end with a correct status and a handoff.
* **W2 Repair protocol.** A bounded loop: fixed attempt budget, re-run of affected regressions, record per attempt. A mechanical guard rejects a repair diff that touches protected paths (tests asserting security, gates, acceptance criteria, `.github/workflows`, authorization code) or lowers a timeout/threshold.
* **W3 Phase 2 acceptance.** Evidence package for the Phase 2 gate; roadmap/`AGENTS.md` set the next phase only after the Navigator accepts (Tier 3).

**Gate (Phase 2).** Independent checks complete despite unrelated failure; dependants are blocked correctly; injected faults recover or report honestly; repair cannot weaken what it verifies.
**Rollback.** The repair loop is opt-in; disabling it restores P107 behaviour.

## 8. Not authorized by this task

Production deployment, GitHub writes, credential or permission changes, execution of generated code on the host, formal acceptance, Phase 3+ work. Candidate later work, only after the Phase 2 gate and ND-4 measurement: splitting very large files (`server.ts`, `projectRoutes.ts`, `codeTaskService.ts`), stable rule IDs linking invariants to checks, a generated context manifest.
