# AI-NATIVE-RENOVATION — Active task and patch sequence

**Task IDs:** ANR-P104–P108; current documentation patch ANR-P108.1; planned follow-ups P109 onward below.
**Status:** P104–P106 documented closed; P107–P108 implementation delivered; Navigator-confirmed P108 CI green. Phase 2 acceptance remains PENDING. P108-vs-P106 timing comparison is NOT_RUN because the P106 baseline duration is unavailable. P108.1 reconciles status and future patch instructions without changing product code. Supersedes ANR-P0-001. On 2026-10-25 the Navigator cancelled pending programme decisions: the assistant decides within Tier 0/1, discloses material choices in CHANGELOG, and asks only for decisions requiring Tier 2/3 authority.
**Authority:** Navigator Charter in `AGENTS.md`. Normative references: `AI-OPERATING-RULES.md`, `AI-NATIVE-RENOVATION-MANDATE.md`, `AI-NATIVE-RENOVATION-ROADMAP.md`, `AI-NATIVE-GLOBAL-AUDIT-2026-10.md`.
**Reading rule for a fresh session:** read sections 1 and 2 and only the section of the current patch.

| Patch | Phase | Outcome |
|---|---|---|
| P104 | 0 | Clean documentation set; superseded documents deleted; tests/CI no longer read documentation prose |
| P105 | 1a | Evidence records written by the check runners; fail-closed assessment; structured handoff and fallback (delivered) |
| P106 | 1b | Legacy tools retired; fail-closed CI evidence gate; check graph; Phase 1 gate (delivered) |
| P107 | 2a | Verification DAG: independent checks always finish; blocked checks carry reasons (delivered) |
| P108 | 2b | Fault-injection suite and opt-in bounded repair delivered; hosted CI green; formal Phase 2 acceptance pending |
| P108.1 | Docs | Reconcile status, open questions, patch sequence and Navigator actions in existing canonical documents |

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

**Leftovers handled in P106:** scripts that name documents that never existed (`docs/NEXT.md`, `docs/CURRENT_STATE.md`, `docs/DECISION_CARD_TEMPLATE.md`, `docs/ADR-10-code-executor.md`, `docs/08-Deployment-and-Runbook.md`, `docs/${patch}-REPORT.md` in `gate-eval`, `evidence-collect`, `staging-drills`, `patch-pack`); `scripts/contextBenchmark*.mjs` reads a missing fixture. Machine files stay in `docs/` (schemas, architecture policy, generated inventories); moving all of `docs/` off the repository would break tools that read them.

## 4. P105 — Phase 1a: evidence records and fail-closed handoff (delivered)

**Done**

* `scripts/evidenceLib.mjs`: builds Evidence Records (schema `evidence-record`) from runner rows with provenance (revision, command, environment, timestamp, status, log reference, completeness limits), redacts secrets, maps runner statuses (a gate-skipped row is `BLOCKED`, an interrupted row `UNKNOWN`), assesses an evidence set, builds and validates Handoff Reports and the fallback handoff.
* `run-diagnostic-gate.mjs` (rows are critical), `run-secondary-diagnostic.mjs` and `run-independent-checks.mjs` write `evidence-diagnostic-gate.json`, `evidence-secondary.json`, `evidence-independent-checks.json` next to the logs and advertise them in `results.json` (`evidence.records`). The marker is set before the write, so a failed write shows up as `MISSING_RECORD`. Both secondary and independent runners now honour `CI_LOGS_DIR`.
* `patch-quality-report.mjs` assesses the set. Critical problems: `MISSING_RECORD`, `MALFORMED_RECORD`, `INVALID_RECORD` (schema), `CONTRADICTION` (record vs `results.json`), `MISSING_LOG` (critical PASS without an existing log), `MISSING_ITEM` (result row without evidence), `INVALID_TIMESTAMP`, `MISSING_REVISION`, `EVIDENCE_LIBRARY_UNAVAILABLE`, `ASSESSMENT_CRASH`. A run that would be `PASSED` with any critical problem becomes `PATCH_STATUS=UNVERIFIED`; a real failure stays `FAILED` and lists the problems. `NEXT_PATCH.md` gains `EVIDENCE=`, `EVIDENCE_PROBLEMS=` and a one-line schema-valid `HANDOFF_JSON=`; `handoff-report.json` is written beside it.
* `ci-summary.mjs` still writes a minimal `NEXT_PATCH.md` when the generator produced nothing and now also a schema-valid fallback `handoff-report.json`; it stays silent on the console. `package-ci-artifacts.mjs` bundles `evidence-*.json` and `handoff-report.json` into `diagnostics.zip` on failure or `UNVERIFIED`; a clean run still uploads only `NEXT_PATCH.md`.
* Legacy `results.json` without the marker is not enforced (reported `EVIDENCE=minimal`); every P105+ runner writes the marker.
* Tests: `tests/evidence-p105.test.mjs` (in `test:compact-ci-artifacts`): mapping, schema validity, redaction, each critical problem, generator status matrix, fallback, and an end-to-end run of the independent runner into the generator. Mutation check done: disabling the UNVERIFIED rule or the BLOCKED mapping fails the tests. The schema test no longer asserts that a Markdown file exists.

**Not done / limits.** `ci-summary.mjs` and `patch-quality-report.mjs` are kept as a generator plus a fallback; they are not merged into one file. Evidence records prove that a command ended with a status in an environment, not production behaviour. Hosted CI for P105 has not run.

## 5. P106 — Phase 1b: tool consolidation and Phase 1 acceptance (delivered)

**Done**

* Legacy P82–P91 planner tools retired (list and reasons in CHANGELOG P106): none fed a schema, none ran in CI, none had tests, one read a missing fixture. Kept: `architecture:map`, `architecture:check`, `architecture:impact`, `verify:change`, `docs:*`.
* `scripts/ci-evidence-gate.mjs` + CI step "Evidence gate (fail closed)": red on missing report, `UNVERIFIED`, missing/invalid structured handoff, schema-invalid evidence record.
* `scripts/statusGraph.mjs` / `npm run status:graph` / `docs/generated-check-graph.json`: deterministic check → file → module graph, `--check` staleness test inside `docs:check`, `--overlay` for last statuses. This replaces hand-written status prose and is the input for the P107 manifest.
* Dangling document references removed from gate scripts (strings only); `golden-eval` writes to `artifacts/qa/`.
* Decision: machine data stays in `docs/`.

**Phase 1 gate.** Critical missing, malformed or contradictory evidence cannot yield a success claim (P105 generator + P106 gate); a failing generator still produces a bounded handoff (`ci-summary.mjs`); no tool without a schema role remains. Evidence: `tests/evidence-p105.test.mjs`, hosted CI run of P106 (pending).

## 6. P107 — Phase 2a: verification DAG (delivered)

* **W1 Manifest.** One machine-readable file declares every check: id, command, prerequisites, time and memory limits, `safeToRun`, parallel group. It replaces the order embedded in `ci.yml`, `check` and `CHECK_SKIP_SCRIPTS`.
* **W2 Runner.** Executes the DAG: independent safe checks always run to completion after an unrelated failure; a check whose prerequisite failed becomes `BLOCKED` with the prerequisite named; policy-skipped checks become `SKIPPED_BY_POLICY` with the rule; each check writes its P105 record.
* **W3 Compatibility.** `npm run check` and the CI jobs call the runner; the seven minimum checks and the PostgreSQL-dependent stages keep their current semantics.

**Tests.** Planted failure in one branch: sibling branches complete, dependants are `BLOCKED`, final status is not `PASS`. Cycle and missing-prerequisite manifests are rejected. Time limit produces `TIMEOUT`.
**Gate.** The above demonstrated in CI; total CI time not worse than today by more than the agreed margin (record the baseline in P107).
**Non-goals.** No repair logic; no new product checks.
**Rollback.** Restore the previous `check` chain and `ci.yml`.

**Done**

* W1: `docs/verification-manifest.json` (27 checks; profiles `check` = 23, `ci` = 27). Limits are the CI-proven legacy limits (critical probes 20 s, minimum suites 75–150 s, regression 90 s, pipeline 330 s, others 600 s); nothing was lowered. Memory limit is `--max-old-space-size` via `NODE_OPTIONS` (4096 MB).
* W2: `scripts/dagLib.mjs` (pure: validation, decisions, scheduling) and `scripts/run-dag.mjs` (executor). Statuses: `PASS`, `FAIL`, `TIMEOUT`, `BLOCKED` (prerequisite failed or required environment missing), `SKIPPED_BY_POLICY` (`safeToRun=false` without `DAG_ALLOW_UNSAFE=true`), `NOT_RUN` (scheduler stalled; defensive). Default concurrency 1; checks overlap only inside the same non-null `parallelGroup` (`static`: version, lint:copy, typecheck). Hosted CI keeps concurrency 1.
* W3: `npm run check` = profile `check`; CI step "Verification DAG" = profile `ci` (critical probes, minimum suites, remaining checks, `db-migrate`, live PostgreSQL, API, build); gitleaks stays a workflow step. `patch-quality-report.mjs` treats any non-PASS row as `UNVERIFIED`; `statusGraph.mjs` reads the manifest. Deleted: the three former runners. Tests: `tests/dag-p107.test.mjs` (in `test:compact-ci-artifacts`); the P105 end-to-end test now drives the DAG runner.
* Semantic changes disclosed: `test:database:live` and `test:bx06:api` are `BLOCKED` (not run and failing) when `db-migrate` fails; the minimum suites are `BLOCKED` (was `SKIPPED`) when a critical probe fails; the critical probes also run in the local `check` profile; unsafe database stages need `DAG_ALLOW_UNSAFE=true`.

**Time gate.** Limit agreed by the Navigator: +15 % over the duration of the last green P106 run. Baseline duration of that run: NOT PROVIDED, so the time part of the gate is `NOT_RUN`. Compare `wallClockMs` in `results.json` (DAG step) and the job duration of the first hosted P107 run with the baseline times 1.15. Expected effect: none (same checks, same order class, concurrency 1).

## 7. P108 — Phase 2b: fault injection and bounded repair\n\n**Implementation status:** code and deterministic contract tests added in P108. Local fault-injection tests (5/5), version check, docs check, architecture check and graph freshness check passed. A Navigator-confirmed green hosted CI run for P108 is recorded from the supplied logs: job `check-and-build`, 2026-10-26T08:05:15.790Z–08:08:56.669Z, duration 220.879 s. The P106 baseline is unavailable, so comparison of P108 against P106 at +15% remains NOT_RUN. Use this green P108 run as the baseline for the next patch; maximum allowed job duration is 254.011 s (4m 14.011s).

* **W1 Fault-injection suite.** Scenarios: check timeout, cancellation, missing log, partial artifact, runner interruption, handoff generator failure, corrupted record. Each must end with a correct status and a handoff.
* **W2 Repair protocol.** A bounded loop: fixed attempt budget, re-run of affected regressions, record per attempt. A mechanical guard rejects a repair diff that touches protected paths (tests asserting security, gates, acceptance criteria, `.github/workflows`, authorization code) or lowers a timeout/threshold.
* **W3 Phase 2 acceptance.** Evidence package for the Phase 2 gate; roadmap/`AGENTS.md` set the next phase only after the Navigator accepts (Tier 3).

**Gate (Phase 2).** Independent checks complete despite unrelated failure; dependants are blocked correctly; injected faults recover or report honestly; repair cannot weaken what it verifies.
**Rollback.** The repair loop is opt-in; disabling it restores P107 behaviour.

## 8. P108.1 — documentation reconciliation (current patch; docs only)

**Outcome:** make the current implementation state, remaining acceptance work, future patch order and required Navigator decisions consistent across the existing canonical documents.

**Changed existing files:** `AGENTS.md`, `CHANGELOG.md`, this task, `AI-NATIVE-RENOVATION-ROADMAP.md`, `AI-NATIVE-GLOBAL-AUDIT-2026-10.md`, and `DOCUMENTATION-INDEX.md`.

**Non-goals:** no product/source changes, no package-version bump, no CI workflow changes, no new repository files, no phase acceptance, no production verification, and no Phase 3 implementation.

**Verification:** `npm run docs:check` PASS (inventories OK; check graph current). Documentation consistency was reviewed for P108 status and phase gates. Hosted CI is not run by this docs-only patch.

**Gate:** all active documents agree that P108 CI is green, Phase 2 formal acceptance is PENDING, the P106 timing comparison is NOT_RUN, and P109 is the next evidence-only patch. No future work is treated as authorized by this plan alone.

## 9. Phase 2 acceptance checklist — still open

The P108 green CI run is evidence for that run, not formal acceptance of the phase. Close each item with a concrete command/result or artifact reference; do not infer success from implementation or documentation.

1. **Snapshot identity:** record the exact repository revision/snapshot and ensure P108 plus P108.1 are applied. If the working tree differs from the supplied `bf-107.zip` plus P108 patches, use the actual current tree as the source of truth.
2. **DAG contract:** run the P107 test suite and verify independent safe branches finish after an unrelated failure; dependants become `BLOCKED` with a reason; unsafe checks are policy-skipped; malformed manifests fail closed; timeout is not PASS.
3. **Fault-injection contract:** run `node --test tests/fault-injection-p108.test.mjs`; confirm timeout, cancellation, missing log, partial artifact, runner interruption, handoff generator failure and corrupted record cannot produce a false PASS and result in a usable handoff.
4. **Repair guard:** test attempt bound, per-attempt append-only records, targeted regression rerun, protected paths and numeric thresholds. Verify repair is opt-in and does not modify files, push or deploy by itself.
5. **Evidence chain:** verify every mandatory CI check has an evidence record and log where required; missing, malformed, contradictory or incomplete evidence must fail closed.
6. **Required checks:** run the complete mandatory local check chain and inspect the hosted CI result. Distinguish `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `TIMEOUT` and `PARTIAL`; list every unavailable check explicitly.
7. **Timing:** P108 hosted job baseline is 220.879 s; next-patch ceiling is 254.011 s. The original P108-vs-P106 +15% comparison remains `NOT_RUN`; do not retroactively mark it PASS without a P106 source duration.
8. **Decision surface:** produce a concise acceptance handoff containing criteria, evidence references, unresolved limitations and a proposed `ACCEPT` / `REJECT` decision.
9. **Formal decision:** Phase 2 is Tier 3. The Navigator must explicitly accept or reject the phase after the evidence handoff. Until then status remains PENDING.

## 10. Patch sequence and required Navigator action

Only one bounded patch is active at a time. The rows after P108.1 are plans, not authorization to perform Tier 2/3 actions. Before each patch, the assistant checks the current snapshot, prior gate, CI baseline and authority boundary; the Navigator is not asked to inspect source, diffs or raw logs.

| Patch | Intended single outcome | Assistant actions before/during patch | Navigator action required before patch | Gate / stop condition |
|---|---|---|---|---|
| **P108.1 (current)** | Reconcile existing docs with actual P108 status, unresolved questions, next patches and owner decision points. | Update only existing canonical docs; check cross-document status consistency; package changed files only. | None; documentation-only Tier 0. | No new repository file; Phase 2 stays PENDING. |
| **P109** | Produce the Phase 2 acceptance evidence handoff from the actual current tree. | Verify DAG/fault/repair/evidence tests; run mandatory checks; inspect hosted CI artifacts; record exact status and timing; repair no code in this evidence-only patch. If a blocker is found, stop and define a separate fix patch. | Provide a newer source ZIP only if the repository has changed since the declared baseline. No source review required. | All criteria above evidenced, or explicit blockers listed. Do not claim acceptance. |
| **P110** | Apply any narrowly scoped Phase 2 defect fixes found by P109 (conditional; omit if none). | One defect class per patch; add regression test first; preserve all gates; run full relevant checks and stay within 254.011 s CI ceiling. | Before any change requiring Tier 2/3 authority, answer the exact yes/no request. | Re-run affected tests and evidence gate; then refresh P109 handoff. |
| **P111** | Start Phase 3 with one minimal, versioned Intent/Policy Contract in an existing schema/contract path. | Inspect existing `schema-intent-policy-contract.json` and consumers first; avoid duplicate representations; define provenance, explicit requirements, assumptions, constraints, invariants, non-goals, criticality, acceptance criteria and authority. | Explicit yes/no authorization to begin Phase 3 (this programme task did not authorize Phase 3 implementation). | Schema/contract tests prove unknown assumptions are not silently promoted to policy. |
| **P112** | Generate a Capability Graph from authoritative existing sources. | Identify authoritative source files and stable IDs; generate intent → modules/contracts → state/data → side effects → invariants → checks → evidence → rollback edges; add deterministic freshness tests. | No action for local reversible work; ask yes/no if the design requires a Tier 2 product/security/integration decision. | Graph is generated, deterministic, stale-detecting and has no dangling critical references. |
| **P113** | Use the graph for change-impact planning and verification selection; close Phase 3. | Connect graph to existing impact/verification tools; demonstrate at least two representative changes end-to-end; report unknown/stale nodes explicitly. | Explicit Tier 3 acceptance of Phase 3 after evidence handoff. | Traceability from intent to tests/evidence/rollback demonstrated; unknown critical context blocks release. |
| **P114** | Build a narrow VIX Intent IR and state/invariant model for one selected ETL/dataflow or transactional scenario. | Reuse Phase 3 contract/graph; identify counter-examples; keep scope to one domain; no autonomous deployment. | Navigator chooses/approves the domain if choice changes product direction (Tier 2); otherwise assistant chooses and discloses. | Contradiction/incompleteness detected before execution; provenance and assumptions explicit. |
| **P115** | Generate a constrained executable candidate and check at least one critical invariant. | Add model-check/formal-method evidence distinct from static and behavioral tests; isolate side effects; include negative cases and rollback. | Explicit authorization before executing generated code outside a sandbox or touching production (Tier 3). | Critical UNKNOWN blocks release; evidence states the model and premises. |
| **P116** | Establish a repeatable real-task value and reliability benchmark. | Define task corpus, baseline, repetitions and metrics for correctness, interventions, time, false PASS/FAIL, evidence, repair, recovery and cost. | Navigator approves material product success thresholds (Tier 2) and any budget/billing changes (Tier 3). | No autonomy promotion from a single run; thresholds and comparison are reproducible. |
| **P117+** | Governed synthesis, shadow execution, state-compatible switch-over and measured autonomy, only after prior gates. | Split into bounded patches with explicit side-effect contracts, authority checks, rollback and repeated evidence. | Explicit approval for each production, external side-effect, GitHub-write, host-execution or formal-acceptance boundary. | No phase advances on documentation/code presence alone. |
| **P92-R1 (parallel operational track)** | Resolve Project Mode Diagnostics production-verification debt. | Verify deployment/migrations, persisted operation events, artifact correlation and Drive sync; separate read-only diagnostics from changes. | Explicit yes/no authorization before production access/change or any Tier 3 operation. | Keep `NOT_RUN`/`WARN` until concrete production evidence exists; do not block Phase 3 design on unrelated read-only preparation. |

## 11. Open questions and closure actions

| Open question | Current status | Closure action | Owner / authority |
|---|---|---|---|
| Is Phase 2 formally accepted? | PENDING | Complete P109 evidence handoff, then explicit accept/reject decision. | Assistant prepares evidence; Navigator decides (Tier 3). |
| Did P108 meet +15% versus P106? | NOT_RUN; P106 duration unavailable. | Find a trustworthy P106 job-duration record; if unavailable, retain NOT_RUN and use P108 baseline for subsequent patches. | Assistant searches available artifacts; Navigator supplies alternate artifact only if one exists outside the current evidence set. |
| Is bounded repair safe on every required path? | Implementation/tests present; full gate audit pending. | Verify attempt bounds, fail-closed statuses, protected-path and threshold guards, regression reruns, opt-in default. | Assistant, P109/P110. |
| Is P92 production diagnostics complete? | NOT VERIFIED; prior record has WARN/NOT RUN and no observed recent events/Drive files. | Verify migrations, event persistence, artifact linkage and Drive synchronization with authorized evidence. | Assistant prepares; Navigator authorizes Tier 3 access/action. |
| What is the first Phase 3 consumer? | Not selected. | Select one narrow change flow and prove end-to-end traceability before generalizing. | Assistant proposes; Navigator decides only if Tier 2 product scope is affected. |
| Does VIX deliver measurable value? | Not yet established by repeatable benchmark. | Implement one vertical slice, then compare repeated tasks against a recorded baseline. | Assistant measures; Navigator approves success thresholds where material. |
| When is autonomy allowed? | Not authorized by this task. | Complete Phases 3–4, enforce authority/side-effect boundaries, and pass repeated benchmark gates before proposing Phase 5/6. | Navigator approval at each Tier 2/3 boundary. |

## 12. Not authorized by this task

Production deployment, GitHub writes/merges, credential or permission changes, billing changes, execution of generated code outside an approved sandbox, formal acceptance by the assistant, and Phase 3+ implementation before explicit authorization. Candidate later work must follow the patch sequence above and the authority model in `AGENTS.md` / `AI-OPERATING-RULES.md`.
