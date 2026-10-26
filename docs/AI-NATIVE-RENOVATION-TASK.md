# AI-NATIVE-RENOVATION — Task: Phases 0–2 and CI handoff (P104–P108.3)

**Task IDs:** ANR-P104, ANR-P105, ANR-P106, ANR-P107, ANR-P108, ANR-P108.1, ANR-P108.2, ANR-P108.2-HF1
**Status:** P104–P107 delivered; P108 implementation present but Phase 2 acceptance remains PENDING; P108.2 adds always-on CI diagnostics and five-cycle history before P109; the first hosted run exposed a blocking test-harness bug, addressed by P108.2-HF1 and awaiting rerun. Supersedes ANR-P0-001. On 2026-10-25 the Navigator cancelled all pending Navigator decisions for this programme: the assistant decides within Tier 0/1, discloses in CHANGELOG, and asks only yes/no questions that touch Tier 3.
**Authority:** Navigator Charter in `AGENTS.md`. Normative references: `AI-OPERATING-RULES.md`, `AI-NATIVE-RENOVATION-MANDATE.md`, `AI-NATIVE-RENOVATION-ROADMAP.md`, `AI-NATIVE-GLOBAL-AUDIT-2026-10.md`.
**Reading rule for a fresh session:** read sections 1 and 2 and only the section of the current patch.

| Patch | Phase | Outcome |
|---|---|---|
| P104 | 0 | Clean documentation set; superseded documents deleted; tests/CI no longer read documentation prose |
| P105 | 1a | Evidence records written by the check runners; fail-closed assessment; structured handoff and fallback (delivered) |
| P106 | 1b | Legacy tools retired; fail-closed CI evidence gate; check graph; Phase 1 gate (delivered) |
| P107 | 2a | Verification DAG: independent checks always finish; blocked checks carry reasons (delivered) |
| P108 | 2b | Fault injection and bounded repair implementation; Phase 2 formal acceptance pending |
| P108.1 | 2b | Documentation alignment mini-patch; patch status must be verified against repository state |
| P108.2 | 2b operational gate | Always package redacted diagnostics, current check metrics, and up to four prior CI cycles on both green and red runs |
| P108.3 | CI assistant handoff | Publish exactly `BIForge-NEXT-PATCH.md` and `biforge-ci-logs.zip`; print the compact handoff in the Actions console |

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
* `ci-summary.mjs` writes a minimal `NEXT_PATCH.md` when the generator produced nothing and a schema-valid fallback `handoff-report.json`; it stays silent on the console. At P105 the package contained diagnostics only on failure/UNVERIFIED; P108.2 supersedes that policy and always bundles all available logs/evidence and CI history on green and red runs.
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

## 7. P108 — Phase 2b: fault injection and bounded repair

* **W1 Fault-injection suite.** Scenarios: check timeout, cancellation, missing log, partial artifact, runner interruption, handoff generator failure, corrupted record. Each must end with a correct status and a handoff.
* **W2 Repair protocol.** A bounded loop: fixed attempt budget, re-run of affected regressions, record per attempt. A mechanical guard rejects a repair diff that touches protected paths (tests asserting security, gates, acceptance criteria, `.github/workflows`, authorization code) or lowers a timeout/threshold.
* **W3 Phase 2 acceptance.** Evidence package for the Phase 2 gate; roadmap/`AGENTS.md` set the next phase only after the Navigator accepts (Tier 3).

**Gate (Phase 2).** Independent checks complete despite unrelated failure; dependants are blocked correctly; injected faults recover or report honestly; repair cannot weaken what it verifies.
**Rollback.** The repair loop is opt-in; disabling it restores P107 behaviour.

## 8. P108.2 — always-on assistant CI report and five-cycle history (pre-P109)

**Status:** implementation prepared in mini-patch; hosted CI verification is NOT_RUN until the patch is applied. This is a development-observability prerequisite for P109, not product functionality and not Phase 2 acceptance.

**Goal.** Every completed CI attempt, green or red, uploads one `biforge-ci-report` artifact containing `NEXT_PATCH.md`, `diagnostics.zip`, `ci-metrics.json`, and `ci-history.json`. The inner diagnostics bundle includes every available log, result/evidence JSON, workflow metadata, current metrics, and the handoff after secret redaction; it must not filter out passing-check logs on a failed run or omit logs on a green run.

**Current-run metrics.** Record workflow/run URL, commit, event/ref/attempt, runtime and platform, package/lockfile versions, DAG profile and wall-clock duration, each check's status/duration/exit code/timeout/critical flag/log reference, and totals for PASS, FAIL, TIMEOUT, BLOCKED, SKIPPED, SKIPPED_BY_POLICY, NOT_RUN, UNKNOWN and INTERRUPTED. Report the workflow job's elapsed time at packaging separately from DAG duration. The current job's final duration is not yet knowable before upload; later CI runs should recover its final duration from the GitHub Actions API.

**Recent history.** Include the current attempt and up to the four most recent completed `ci.yml` workflow runs. Prefer metrics from each prior artifact; use the Actions API for exact run/job/step durations and conclusions. Legacy runs without retained per-check data must show `null`/`unknown`, never synthesized PASS counts. If the API/token/artifact is unavailable, package the current run anyway and mark history `UNAVAILABLE`/`PARTIAL` with a bounded reason.

**Safety and resilience.** Grant only `actions: read` in addition to `contents: read`; pass the ephemeral workflow token only to the collector; never serialize the token. Redact credentials, bearer tokens, connection-string passwords and known provider key formats before bundling. API/history collection failure must not mask the original CI outcome or prevent a fallback archive. `diagnostics.zip` is always created; the outer GitHub artifact always includes all four named files. Do not include the ZIP inside itself.

**Tests/gate.** Test green and red packaging, retention of successful-stage logs on red runs, redaction, fallback when the history API is unavailable, count accuracy, history limit of five cycles, unknown legacy metrics, and archive contents. Hosted acceptance requires a green run and a deliberately red or fault-injected run both uploading `biforge-ci-report`; verify the green archive contains logs/results and that red archives preserve passing and failing evidence. Record actual workflow/job/DAG durations separately.

**Navigator action before P109.** Navigator need not inspect source. Confirm only that the new `biforge-ci-report` artifact is downloadable after both green and red CI, and provide the artifact to the assistant if the CI output does not expose it. P109 starts only after the artifact contract is verified, or explicitly records the unverified part as BLOCKED.

**P108.2-HF1 follow-up (2026-10-26).** The first hosted run after P108.2 failed one test in `tests/compact-ci-artifacts-p94.test.mjs:128`: expected `includedCycles=2`, actual `1`. The test launched the collector with `spawnSync` while the mock GitHub API server ran in the same parent process. That blocks the parent's event loop, preventing the mock server from serving the child's API requests. HF1 changes only this test to use asynchronous child-process execution. The collector implementation is unchanged. Syntax check passes; targeted/full test and hosted rerun remain PENDING. **P109 remains blocked** until the collector test passes and the green/red artifact contract is verified.

**Rollback.** Revert the `ci-run-history.mjs`, `package-ci-artifacts.mjs`, `patch-quality-report.mjs`, `ci.yml`, associated tests and this documentation entry; restore conditional diagnostics packaging. This affects CI artifacts only, not application runtime.

## 9. Not authorized by this task

Production deployment, GitHub writes, credential or permission changes, execution of generated code on the host, formal acceptance, Phase 3+ work. Candidate later work, only after the Phase 2 gate and ND-4 measurement: splitting very large files (`server.ts`, `projectRoutes.ts`, `codeTaskService.ts`), stable rule IDs linking invariants to checks, a generated context manifest.


## 8a. P108.3 — two-artifact CI handoff

- The `biforge-ci-report` artifact contains exactly two top-level files: `BIForge-NEXT-PATCH.md` (self-contained repair handoff) and `biforge-ci-logs.zip` (all available redacted diagnostic logs/evidence, including successful checks and history JSON).
- The compact handoff is printed in the GitHub Actions console after packaging, so it can be copied into an assistant prompt when file attachments are unavailable. It includes failure excerpts and source context, next action, runtime/commit/run identifiers, current metrics, and up to five cycles; missing historical values stay explicitly unknown.
- No separate top-level metrics/history files are uploaded. Full data remains in the ZIP; the handoff remains the primary prompt-ready artifact.
- Acceptance: green and red runs each produce exactly the two named files; console output matches the handoff file; ZIP contains available diagnostic inputs with secrets redacted; compact CI tests pass. P108.3-HF1 also requires the handoff to turn the known stale two-artifact assertion into a specific next action. Hosted verification is PENDING until the patch runs.

## P108.3-HF1 — align tests with the two-artifact contract

- The red run `40302158394` failed because `tests/compact-ci-artifacts-p94.test.mjs` still asserted the retired four-file outer artifact. Update the assertion to the intended two-file contract and continue validating the full inner ZIP contents.
- Make `NEXT_ACTION` actionable: identify the stale packaging test and list exact rerun commands for this evidenced mismatch; for other failures, include failed stage names and available rerun commands. Timeout cases remain separately handled.
- Acceptance: `npm run test:compact-ci-artifacts` passes, the generated handoff contains a specific action for the planted mismatch, and a subsequent hosted CI run confirms the two-file contract on green and red runs.
