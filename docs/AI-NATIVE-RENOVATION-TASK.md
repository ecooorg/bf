# AI-NATIVE-RENOVATION — Task: Phases 0–2 in five patches (P104–P108)

**Task IDs:** ANR-P104, ANR-P105, ANR-P106, ANR-P107, ANR-P108
**Status:** P104 and P105 delivered (see their sections); P106–P108 active. Supersedes ANR-P0-001. On 2026-10-25 the Navigator cancelled all pending Navigator decisions for this programme: the assistant decides within Tier 0/1, discloses in CHANGELOG, and asks only yes/no questions that touch Tier 3.
**Authority:** Navigator Charter in `AGENTS.md`. Normative references: `AI-OPERATING-RULES.md`, `AI-NATIVE-RENOVATION-MANDATE.md`, `AI-NATIVE-RENOVATION-ROADMAP.md`, `AI-NATIVE-GLOBAL-AUDIT-2026-10.md`.
**Reading rule for a fresh session:** read sections 1 and 2 and only the section of the current patch.

| Patch | Phase | Outcome |
|---|---|---|
| P104 | 0 | Clean documentation set; superseded documents deleted; tests/CI no longer read documentation prose |
| P105 | 1a | Evidence records written by the check runners; fail-closed assessment; structured handoff and fallback (delivered) |
| P106 | 1b | Legacy P82–P91 tools resolved; `schema:validate` in CI; Phase 1 gate accepted |
| P107 | 2a | Verification DAG: independent checks always finish; blocked checks carry reasons |
| P108 | 2b | Fault-injection suite; bounded repair protocol; Phase 2 gate accepted |

## 1. Navigator directive

The directive is the **Navigator Charter** at the top of `AGENTS.md` (laws C1–C11, reversal table, conflict rule). It replaces the former ND-1..ND-6 list and overrides this file. Mapping for readers of older text: ND-1/ND-2 = C1/C2, ND-3 = C2/C3/C9, ND-4 = C4, ND-5 = C6/C7/C8, ND-6 = C11.

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

## 4. P105 — Phase 1a: evidence records and fail-closed handoff (delivered)

**Done**

* `scripts/evidenceLib.mjs`: builds Evidence Records (schema `evidence-record`) from runner rows with provenance (revision, command, environment, timestamp, status, log reference, completeness limits), redacts secrets, maps runner statuses (a gate-skipped row is `BLOCKED`, an interrupted row `UNKNOWN`), assesses an evidence set, builds and validates Handoff Reports and the fallback handoff.
* `run-diagnostic-gate.mjs` (rows are critical), `run-secondary-diagnostic.mjs` and `run-independent-checks.mjs` write `evidence-diagnostic-gate.json`, `evidence-secondary.json`, `evidence-independent-checks.json` next to the logs and advertise them in `results.json` (`evidence.records`). The marker is set before the write, so a failed write shows up as `MISSING_RECORD`. Both secondary and independent runners now honour `CI_LOGS_DIR`.
* `patch-quality-report.mjs` assesses the set. Critical problems: `MISSING_RECORD`, `MALFORMED_RECORD`, `INVALID_RECORD` (schema), `CONTRADICTION` (record vs `results.json`), `MISSING_LOG` (critical PASS without an existing log), `MISSING_ITEM` (result row without evidence), `INVALID_TIMESTAMP`, `MISSING_REVISION`, `EVIDENCE_LIBRARY_UNAVAILABLE`, `ASSESSMENT_CRASH`. A run that would be `PASSED` with any critical problem becomes `PATCH_STATUS=UNVERIFIED`; a real failure stays `FAILED` and lists the problems. `NEXT_PATCH.md` gains `EVIDENCE=`, `EVIDENCE_PROBLEMS=` and a one-line schema-valid `HANDOFF_JSON=`; `handoff-report.json` is written beside it.
* `ci-summary.mjs` still writes a minimal `NEXT_PATCH.md` when the generator produced nothing and now also a schema-valid fallback `handoff-report.json`; it stays silent on the console. `package-ci-artifacts.mjs` bundles `evidence-*.json` and `handoff-report.json` into `diagnostics.zip` on failure or `UNVERIFIED`; a clean run still uploads only `NEXT_PATCH.md`.
* Legacy `results.json` without the marker is not enforced (reported `EVIDENCE=minimal`); every P105+ runner writes the marker.
* Tests: `tests/evidence-p105.test.mjs` (in `test:compact-ci-artifacts`): mapping, schema validity, redaction, each critical problem, generator status matrix, fallback, and an end-to-end run of the independent runner into the generator. Mutation check done: disabling the UNVERIFIED rule or the BLOCKED mapping fails the tests. The schema test no longer asserts that a Markdown file exists.

**Not done / limits.** `ci-summary.mjs` and `patch-quality-report.mjs` are kept as a generator plus a fallback; they are not merged into one file. Evidence records prove that a command ended with a status in an environment, not production behaviour. Hosted CI for P105 has not run.

## 5. P106 — Phase 1b: tool consolidation and Phase 1 acceptance

* **W1 Decision on the legacy tools** (assistant decides, discloses in CHANGELOG): `context:task`, `context:plan`, `impact:lineage`, `verification:plan`, `benchmark:real-tasks`, `intent:contract`, `context:refresh-profile`, `context:completeness`, `benchmark:context` and their `*Lib.mjs`. For each: adapt to emit a schema artifact (Change/Impact Plan, Verification Plan, Evidence Record), or retire. Evidence for the card: current exit status, whether it runs at all (`benchmark:context` reads a missing fixture), who calls it, ND-4 benefit. Default: retire everything that neither feeds a schema nor runs.
* **W2 Execute the decision.** Remove retired scripts, package entries, boundary-rule and inventory references; regenerate inventories; update `AGENTS.md` command list.
* **W3 Dangling references** left from P104-W7: fix or retire `gate-eval`, `evidence-collect`, `staging-drills` strings together with their workflows' expectations; keep `tests/gates.test.mjs` assertions intact.
* **W4 CI wiring.** `schema:validate` joins `npm run check` and `ci.yml`. A schema check over the generated records of the run itself.
* **W5 Generated status graph.** A deterministic status/capability file generated from code plus records (module → checks → last status), replacing hand-written status prose in `AGENTS.md`.
* **W6 Machine data location.** Decide whether schemas, architecture policy and generated inventories move out of `docs/` (for example flat into `scripts/` with prefixed names) so that `docs/` can be removed without breaking tools; update readers and tests together.

**Gate (Phase 1).** (P105 delivers the evidence half.) Missing/malformed/contradictory critical evidence cannot yield a success claim; a generator failure still produces a bounded handoff; no tool remains without a schema role or an explicit retirement; evidence of the gate is stored as records.
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
