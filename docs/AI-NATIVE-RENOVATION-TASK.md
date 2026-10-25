# AI-NATIVE-RENOVATION — Task: Phases 0–2 in five patches (P104–P108)

**Task IDs:** ANR-P104, ANR-P105, ANR-P106, ANR-P107, ANR-P108
**Status:** P104 delivered (see its section); P105–P108 active. Supersedes ANR-P0-001. On 2026-10-25 the Navigator cancelled all pending Navigator decisions for this programme: the assistant decides within Tier 0/1, discloses in CHANGELOG, and asks only yes/no questions that touch Tier 3.
**Authority:** Navigator directive of 2026-10-25 (section 1). Normative references: `AI-OPERATING-RULES.md`, `AI-NATIVE-RENOVATION-MANDATE.md`, `AI-NATIVE-RENOVATION-ROADMAP.md`, `AI-NATIVE-GLOBAL-AUDIT-2026-10.md`.
**Reading rule for a fresh session:** read sections 1 and 2 and only the section of the current patch.

| Patch | Phase | Outcome |
|---|---|---|
| P104 | 0 | Clean documentation set; superseded documents deleted; tests/CI no longer read documentation prose |
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
  * Implementation stays TypeScript/JavaScript/SQL/JSON/Markdown. `tsc`, `node --test`, Playwright, the Render build, gitleaks and model competence exist for these. Assembly, machine code or invented languages would remove the verification ND-3 depends on. Revisit only with a measured benefit and a verification path (Tier 2).
  * Source stays line-oriented and unminified. Patches are delivered as diffs and `str_replace` edits and failures are localised by line; single-line blobs break all three.
  * No style-only rewrites. Structural rewrites (for example splitting files above 50 KB) only with a measured ND-4 gain and only after the Phase 2 gate.
  * Human-facing material that stays because it is product, not documentation: UI strings (`lint:copy`), the in-app guide `src/UserGuide.tsx`, and the Navigator decision surface (`NEXT_PATCH.md`, chat handoff).
  * History is git and the owner's backups. Superseded documents are deleted, not archived. Tests and CI never read documentation prose.
* **ND-6 Context budget.** Mandatory reading for a fresh session: `AGENTS.md`, `docs/AI-OPERATING-RULES.md`, sections 1–2 of this file plus the current patch section. Target ≤ 40 KB in total. Everything else is on demand through `docs/DOCUMENTATION-INDEX.md`, which lists each document with size and trigger.

## 2. Rules for every patch

1. **Baseline.** Record the CI result of the previous patch using the status vocabulary. If it is `NOT_RUN`/`UNKNOWN` (true for P103.3 at the time of writing), the patch may be prepared but must not claim green.
2. **Bounded.** One patch, one outcome. Stop at its gate; Tier 2/3 items need an explicit Navigator decision. Silence is not consent.
3. **Delivery.** ZIP with changed/new files, separate list of deletions/moves, manifest, exact commands with outcomes, rollback note.
4. **CHANGELOG.** New entry with patch ID, changes, verification, limitations. Code patches bump the version and keep the `## P<N>` top-entry format that `check-version` requires.
5. **`AGENTS.md`** only for significant changes of how the product or development works.
6. **No weakening.** Tests, gates, security controls and acceptance criteria are never relaxed to get green. A test may be removed only with evidence in CHANGELOG that it is an orphan or duplicate.
7. **Honest status.** `UNKNOWN`, `NOT_RUN`, `BLOCKED`, `TIMEOUT`, `PARTIAL` are never `PASS`. Implemented ≠ verified in production.

## 3. P104 — Phase 0 closure (delivered)

**Decisions.** Navigator, 2026-10-25: CI green at the baseline, old material is backed up locally, `USER-GUIDE.md` goes, documents the assistant does not need are deleted, `CHANGELOG.md` keeps history as plain text without links, and nothing in tests may check documents.

**Done in P104**

* Deleted 17 documents (the P85–P93.7 specs, both P81–P91 roadmaps, transformation spec, documentation baseline, P103 test audit, diagnostics roadmap, `tz-appbuilder`, `USER-GUIDE`), 7 stale JSON snapshots/reports in `docs/`, the whole `archive/` directory, `ARCHIVE-MOVE-LIST.md`, the orphan `tests/context-benchmark.test.mjs` (unwired, fixture absent), and `scripts/check-docs.mjs`.
* Live requirements preserved first: `test:ai` harness and Project Mode diagnostics (with the open P92 production verification) in `OPERATIONS.md`; App Builder invariants in `architecture-guardrails.md`.
* `check:docs` removed from `package.json`, the `check` chain, `docs:check`, `qa.mjs`, `acceptanceReport.mjs`, `architectureVerifyChange.mjs`, the test harness, patch-pack's dependency-free set and `tests/feature-manifest.json`. Suggested-command lists in the P85–P91 tool libraries no longer name it.
* `tests/security.test.mjs` asserts the GitHub-write default from code (`githubWritesEnabled`, `github_write_disabled`) instead of reading `AGENTS.md`. The only remaining repository file that tests read besides code is `CHANGELOG.md` (top entry, `check-version`), and that tolerates its absence.
* `acceptanceReport.mjs` and `architectureCheckBoundaries.mjs` write to `artifacts/qa/` (git-ignored) instead of `docs/`.
* `AGENTS.md`, `DOCUMENTATION-INDEX.md` (tiers, sizes, triggers), roadmap and audit updated; version 104.

**Known leftovers handed to P106:** scripts that name documents that never existed (`docs/NEXT.md`, `docs/CURRENT_STATE.md`, `docs/DECISION_CARD_TEMPLATE.md`, `docs/ADR-10-code-executor.md`, `docs/08-Deployment-and-Runbook.md`, `docs/${patch}-REPORT.md` in `gate-eval`, `evidence-collect`, `staging-drills`, `patch-pack`); `scripts/contextBenchmark*.mjs` reads a missing fixture. Machine files stay in `docs/` (schemas, architecture policy, generated inventories); moving all of `docs/` off the repository would break tools that read them.

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

* **W1 Decision on the legacy tools** (assistant decides, discloses in CHANGELOG): `context:task`, `context:plan`, `impact:lineage`, `verification:plan`, `benchmark:real-tasks`, `intent:contract`, `context:refresh-profile`, `context:completeness`, `benchmark:context` and their `*Lib.mjs`. For each: adapt to emit a schema artifact (Change/Impact Plan, Verification Plan, Evidence Record), or retire. Evidence for the card: current exit status, whether it runs at all (`benchmark:context` reads a missing fixture), who calls it, ND-4 benefit. Default: retire everything that neither feeds a schema nor runs.
* **W2 Execute the decision.** Remove retired scripts, package entries, boundary-rule and inventory references; regenerate inventories; update `AGENTS.md` command list.
* **W3 Dangling references** left from P104-W7: fix or retire `gate-eval`, `evidence-collect`, `staging-drills` strings together with their workflows' expectations; keep `tests/gates.test.mjs` assertions intact.
* **W4 CI wiring.** `schema:validate` joins `npm run check` and `ci.yml`. A schema check over the generated records of the run itself.
* **W5 Generated status graph.** A deterministic status/capability file generated from code plus records (module → checks → last status), replacing hand-written status prose in `AGENTS.md`.
* **W6 Machine data location.** Decide whether schemas, architecture policy and generated inventories move out of `docs/` (for example flat into `scripts/` with prefixed names) so that `docs/` can be removed without breaking tools; update readers and tests together.

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
