# AI-native engineering roadmap — P85–P91 (VIX-integrated)

Status: Navigator-requested documentation revision, 2026-10-23. This roadmap selectively integrates VIX principles into existing BiForge workflows; it does not propose a separate VIX subsystem. This document describes future work; it does not authorize automatic merges, production deployment, security-gate changes, GitHub write access, or acceptance on the Navigator's behalf. Build and review one patch at a time. Do not begin the next patch until the current patch has green GitHub CI reported by the Navigator.

## 1. North star

Make AI-assisted BiForge development **simpler for the human** while making changes safer: understand the request, gather the minimum sufficient verified context, preserve important invariants, choose useful verification, and explain what changed in terms the Navigator can review.

Optimize for **total human effort per safely completed task**, including clarification, review, rework, and maintenance—not minimum file count, smallest context, fewest tests, or smallest diff in isolation. A smaller context that omits a required contract is a regression. Static analysis must label evidence, heuristics, and unknowns separately; absence of a detected relationship is not proof that no relationship exists.

### VIX principles adopted selectively

BiForge will borrow only VIX elements that improve the existing workflow. This is a design direction, not a commitment to implement the full VIX concept or a formal verification system.

1. **Intent before edits:** make the goal, observable acceptance criteria, material constraints, assumptions, and out-of-scope items explicit. Generate this draft from the user's request and existing repository evidence; do not require the user to fill out a new form for routine tasks.
2. **Protect invariants:** identify relevant security, compatibility, persistence/data-safety, API and UI invariants using existing contracts and tests. The AI may suggest an invariant, but must not silently reinterpret user intent or weaken a mandatory rule.
3. **Counterexamples, not just happy paths:** where a change introduces or modifies behavior, include a small number of plausible failure/edge cases that could falsify the intended result. Reuse existing tests and verification commands.
4. **Intent diff:** explain meaningful behavior changes against the requested intent and invariants, not just a file list. Report unintended or unverified behavior differences when evidence exists; do not claim exhaustive semantic analysis.
5. **Honest uncertainty:** use `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`, `PARTIAL`, and `UNKNOWN` as appropriate. These are evidence states, not formal proof statuses. Passing tests do not mean arbitrary code has been mathematically proved correct.
6. **Traceable change:** keep a lightweight chain from request → draft intent/criteria → changed areas → verification evidence → final summary, using the existing patch, Git, test and CI workflow. Do not add a new database or duplicate inventories just to store this chain.
7. **Human-effort gate:** every patch must state what human work it removes, what safety/evidence it adds, and what ongoing complexity it introduces. Prefer no implementation if the net benefit is unclear.

### Current foundation

- **P81:** deterministic file-oriented `context:plan`, static import/importer evidence, selected env/SQL/manifest clues, test suggestions, and explicit uncertainties.
- **P82:** context locality improvements and explicit integration points for selected composition-root patterns.
- **P83:** selected runtime API-boundary validation and negative tests.
- **P84:** six curated static benchmark scenarios, pinned historical comparison, recall/false-positive/context-line proxies, and documented measurement limitations. The Navigator reports P84 CI green after the P56 check-chain fix. The gold set still requires maintainer review; the generated-route-artifact scenario exposed a generator-to-artifact discovery gap. No benchmark regression threshold is enabled.

Use `docs/AI-NATIVE-ROADMAP-P81-P84.md` for the original scope and detailed P81–P84 notes, `docs/context-benchmark-p84.json` for recorded results, and `docs/context-benchmark-verification-p84.json` for verification evidence and limits. Do not rewrite historical metrics to make a new result look better.

## 2. Delivery rules for every future patch

1. **Inspect before editing.** Read `AGENTS.md`, relevant operating rules, this roadmap, `package.json`, the relevant source/test files, and the latest P84 benchmark report. Use repository evidence rather than assumptions.
2. **Start from the user's current tree.** Do not silently rebuild from an old archive or overwrite later fixes. If the current tree is unavailable, request an archive or clearly label the patch's expected base revision.
3. **Keep scope narrow.** One patch should have one primary outcome. Prefer docs/tooling/tests before runtime changes where that achieves the goal. Avoid unrelated formatting and generated-file churn.
4. **Respect repository layout.** Keep active `docs/` and `scripts/` flat with prefixed filenames. Do not create nested directories such as `tests/fixtures/`; put a small curated gold set beside tests (for example, `tests/context-benchmark-gold-p84.json`) or use an existing approved flat layout. Do not add directories without explicit Navigator approval.
5. **Preserve the verification chain.** Every `test:*` npm script must be included in `npm run check` or explicitly declared as a separate CI step, in a way that the existing P56 check detects. Add a regression test for that invariant when changing the check chain. Do not call a test file directly while leaving its named `test:*` script disconnected.
6. **Preserve security and contracts.** Never weaken auth, authorization, secret handling, approval gates, SQL protections, or compatibility guarantees to make a test pass. Do not enable GitHub write, production operations, or generated-code execution without explicit approval.
7. **Test negative paths.** For new inference or planning features, test missing evidence, malformed inputs, ambiguous/dynamic relationships, stale generated artifacts, and safe failure modes—not only the happy path.
8. **Report verification truthfully.** Separate `PASS`, `FAIL`, `BLOCKED`, and `NOT RUN`; distinguish local results from the Navigator-reported GitHub CI result. Never infer green CI from focused tests or archive integrity.
9. **Ship a patch ZIP.** Include only changed/new files with repository-relative paths. List deletions separately, explain the base, provide SHA-256, rollback instructions, and commands to run. Verify ZIP integrity. Do not include `node_modules`, secrets, logs containing sensitive data, or the whole repository.
10. **Update documentation.** Each patch updates `CHANGELOG.md` and relevant status/index documentation. Keep metrics reproducible and explain their limits. Do not claim token or wall-clock savings without actual captured measurements.
11. **Stop on scope escalation.** Ask the Navigator before changing product behavior, public API behavior, persisted formats, data migrations, external integrations, access permissions, acceptance criteria, or mandatory security gates.

## Cross-cutting workstream — Project Mode observability and artifact diagnostics

The roadmap now includes a staged diagnostics workstream for Project Mode. The detailed proposal, event contract, artifact checks, More-menu concepts, and acceptance guidance live in `docs/PROJECT-MODE-DIAGNOSTICS-ROADMAP.md`.

This is **not** an instruction to implement a large logging subsystem in P85. Integrate the smallest useful part into each patch only when it fits that patch's existing scope. Reuse existing logs, operation identifiers, artifact metadata, tests and reports; do not duplicate inventories or create a separate VIX/diagnostics service. Runtime logging and UI changes remain future work and require a focused implementation patch and the normal review/CI gate.

The core principle is that **a generated URL is not evidence of a valid, delivered artifact**. Eventually, Project Mode should distinguish file generation, source validation, ZIP assembly, archive validation, artifact persistence/readback, HTTP transfer, and optional client-side download verification. A valid ZIP is not proof that the requested application works; app-specific behavior needs separate verification. Missing evidence must remain `UNKNOWN`/`PARTIAL`/`BLOCKED`, not be promoted to `PASS`.

Patch-level integration is mapped in the diagnostics document and summarized below:

- **P85:** discover relevant logs, validators and failure tests as part of task context; mark observability gaps explicitly.
- **P86:** trace intent → engine/generator → file manifest → archive → artifact/download route using existing identifiers and evidence.
- **P87:** plan positive and negative artifact tests, including empty output, malformed ZIP, storage corruption, missing artifact and download interruption.
- **P88:** measure stage-localization rate, false-success rate, diagnosis time and human rework on reviewed real-task scenarios.
- **P89:** express expected artifact properties and behavior checks as optional, provenance-backed intent criteria.
- **P90:** refresh diagnostic/source lineage only if measured staleness justifies the cost.
- **P91:** prevent confident success claims when required artifact evidence is missing or contradictory.

The More-menu items `Download diagnostic logs`, `Run system diagnostics`, and `View recent operations` are candidates, not current product features. Inspect existing UI/access controls and logging before implementation. Diagnostic exports must be bounded, redacted, truthful about unavailable evidence, and useful even when generation fails.

## 3. Recommended sequence and dependency graph

The sequence is intentionally incremental. P85 and P86 together form the context-planning initiative, but they remain separate patches so each has a clear review and rollback boundary. Begin collecting P88 measurements as soon as a few stable task scenarios exist; do not wait for all roadmap items to finish.

| Patch | Main result | Depends on | Runtime code expected? | Diagnostics integration (see detailed proposal) |
| **P85** | Intent-aware task context plan: goal, assumptions, invariants, bounded context | P81–P84 | No, unless later explicitly justified | Discover relevant logs/validators/tests and report observability gaps |
| **P86** | Change impact, generator lineage and concise intent diff | P85, existing inventories | Prefer no | Trace known generator-to-artifact/download lineage without inventing links |
| **P87** | Verification planner with counterexample-oriented test suggestions | P85–P86, current check-chain rules | No product runtime change | Suggest positive/negative artifact and transfer tests |
| **P88** | Real-task benchmark including human effort and rework | P84, stable P85 plans; can start early | No | Measure diagnosis time, stage-localization and false-success rate |
| **P89** | Lightweight generated intent contract, not a mandatory user form | P85–P87 | No by default | Capture optional expected artifact properties and behavior checks |
| **P90** | Incremental architecture/context refresh, only if profiling proves value | P86 and stable deterministic outputs | No | Refresh stale lineage only if evidence proves the need |
| **P91** | Context completeness and material-uncertainty guard | P85–P90 evidence | No | Keep missing artifact evidence from becoming a false PASS |

P88 is an evidence stream as well as a patch. If P85/P86 materially change planner outputs, update benchmark expectations with a reviewed rationale rather than silently replacing the gold set.

---

## 4. P85 — Task-Aware Context Engine

### Goal

Extend file-oriented `context:plan` to plan around a natural-language change request. The output should identify the likely task area, a concise draft of the requested intent, minimal candidate read set, contracts, integration points, tests, invariants, material assumptions and unresolved questions without loading the whole repository by default. It should reduce the amount the human must explain repeatedly, not introduce a form-filling step.

### Implementation plan

1. Inspect the current CLI argument parser and planner library. Reuse existing evidence collectors and stable output conventions; do not fork a second dependency engine.
2. Add a task-planning entry point (proposed CLI: `npm run context:task -- --task "Fix project saving"`). Confirm naming against existing scripts before implementation.
3. Start with deterministic task-to-evidence rules and explicit keyword/feature mappings backed by existing manifests, route inventory, module map, tests and contracts. Do not imply that free-text classification is complete or semantically authoritative.
4. Emit a compact JSON plan, with human-readable output available if consistent with existing tooling. Suggested fields:
   - `taskSummary` — normalized task intent;
   - `acceptanceCriteria` — observable outcomes inferred from the request, clearly marked as draft when not explicitly stated;
   - `outOfScope` — exclusions only when explicit or strongly supported by the request;
   - `assumptions` — assumptions that may affect behavior, marked as inferred;
   - `changeTargets` — candidate files with reasons and evidence source;
   - `mustRead` — minimum files needed before changing code;
   - `readIfNeeded` — conditional follow-up context;
   - `notNeededByDefault` — known irrelevant candidates, explicitly not prohibited;
   - `contracts` — request/response, domain, DB, configuration or artifact contracts;
   - `requiredTests` — targeted tests plus mandatory global checks;
   - `invariants` — relevant compatibility, auth, data and UI behaviors to preserve, with source/evidence;
   - `uncertainties` — unknown/dynamic links and why they matter;
   - `confidence` / `completeness` — calibrated labels, not an unexplained numeric score.
5. Every suggested item must include a reason and evidence class: `static`, `manifest`, `contract`, `heuristic`, or `unknown`. Keep the distinction between evidence and guess explicit.
6. Add representative tests for UI, API contract, persistence/DB, env/config and generated artifact tasks. Include ambiguous, unrecognized and empty tasks; safe fallback must request more context or return a broad-but-bounded plan rather than a falsely precise one.
7. Re-run P84 benchmark scenarios unchanged as a baseline, then add task-oriented variants only with reviewed gold dependencies. Compare recall and false positives, not just output size.

### Acceptance gates

- Stable deterministic output for the same tree and task.
- Existing `context:plan` behavior remains compatible.
- No default whole-repository read or hidden network call.
- Each candidate and uncertainty is traceable to evidence.
- Unknown task types do not return an empty plan presented as complete.
- `test:*` is integrated into `npm run check` or an explicit CI step satisfying P56.
- Relevant focused tests, `check:docs`, `docs:check`, `architecture:check`, typecheck/build, full check and CI status are reported separately.

### Stop conditions

Stop if a natural-language heuristic cannot distinguish likely targets without unacceptable false negatives, if P84 recall regresses without an approved tradeoff, if task planning duplicates existing feature/route inventories instead of referencing them, or if the added planning ceremony costs more human effort than it saves.

### Deliverables

CLI/API documentation, focused tests, a compact example plan, benchmark deltas with limitations, changelog/status updates, changed-files ZIP, SHA-256 and rollback instructions.

---

## 5. P86 — Change Impact Graph and generator lineage

### P86 implementation status (patch prepared; CI pending)

The current P86 patch adds a read-only `impact:lineage` CLI, a small typed evidence graph, generator/output mappings for generated inventories, artifact structural-health labels, intent-diff reporting, and focused counterexample tests. It does not prove artifact freshness where source fingerprints are absent, and it does not claim complete semantic/runtime lineage. See `docs/CHANGE-IMPACT-P86.md`.


### Goal

Show what an edit may affect beyond direct imports: public API consumers, tests, manifests, SQL/data paths, environment settings, route registration, and generated artifacts. Add a concise intent diff: requested behavior/invariants versus the observed change surface and available verification evidence. Explicitly close P84's known generator-to-generated-route-inventory gap.

### Implementation plan

1. Inventory current graph sources and generators before adding new data structures. Identify how `docs/generated-route-inventory.json`, env/migration inventories, module map and feature manifest are produced.
2. Represent a small, typed edge vocabulary such as `imports`, `importedBy`, `registers`, `consumesContract`, `coveredByTest`, `readsEnv`, `queriesTable`, `generatedBy`, `consumesArtifact`. Use only edges supported by evidence; unknown edges remain unknown.
3. Add generator lineage: source generator script → output artifact → runtime/test/documentation consumers. Prefer explicit metadata or deterministic source inspection over filename guesses.
4. Provide a read-only command or extend the existing plan output to show impact for a target. Keep output bounded and sorted; include a short path explaining why each impact node is included.
5. Summarize an intent diff from existing task criteria and repository evidence: expected behavior, potentially affected behavior, and what could not be verified. Avoid claiming a complete semantic diff.
6. Keep human-facing output short by default; expose detailed evidence only on request or when material risk/uncertainty requires it.
7. Use the route inventory scenario as a mandatory regression: planner should discover the generator and related checks, or clearly report why it cannot. A zero-recall result must never be presented as a successful low-context plan.
8. Add tests for missing generator, stale artifact, generated-file edits, multiple consumers, cycles, dynamic paths and false inferred edges.
9. Keep the graph generated/reproducible where possible. Do not hand-edit generated inventories; update source rules and run the repository's documented generator.

### Acceptance gates

- P84 generated-artifact gold scenario improves in recall without unexplained false-positive growth.
- Each edge carries provenance and confidence/evidence type.
- Generated artifacts can be traced back to a generator and verification command, or explicitly marked unresolved.
- No cycles/boundary regressions; existing architecture checks stay intact.
- Repeated generation is deterministic and produces no timestamp-only diff.

### Stop conditions

Stop if the graph treats heuristics as proven relationships, requires a repository-wide scan for every local request, creates a second source of truth, increases recall only by listing nearly every file, or makes the default human-facing report noisier without improving decisions.

### Deliverables

Documented edge schema, example impact report, generator-lineage tests, before/after P84 scenario metrics, changelog/status and rollback.

---

## 6. P87 — Verification Planner

**Implementation status (2026-10-24):** read-only `verification:plan` CLI and `test:verification-plan` are implemented in this patch. The planner uses explicit file/task rules, validates suggested command names against `package.json`, emits risk-specific counterexamples, preserves full repository/build/hosted-CI gates, and labels commands `SUGGESTED_NOT_RUN`. It does not execute commands. GitHub CI remains pending until the Navigator applies the patch and runs the workflow.

### Goal

Recommend the cheapest sufficient targeted verification for a change while preserving mandatory repository and CI gates. For behavior changes, include counterexample-oriented tests: a small, risk-based set of cases that could disprove the intended behavior. It must not let an AI agent declare a change complete based only on the fastest test tier.

### Implementation plan

1. Inventory existing `npm run` scripts, test file ownership, CI workflow steps and P56's `test:*` check-chain invariant.
2. Create explicit machine-readable mappings from change evidence to test commands. Reuse existing names; do not invent commands that do not exist.
3. Define tiers:
   - **Fast:** low-cost checks directly associated with changed files;
   - **Targeted:** affected contracts, integration tests and relevant architecture checks;
   - **Full:** required full `npm run check`, build/typecheck and mandatory CI workflows.
4. For each command record why it is selected, prerequisite/environment needs, expected coverage, and whether it is required or advisory. For new/changed behavior, name at least one relevant negative or boundary case where practical; do not generate boilerplate tests unrelated to the risk.
5. Include special handling for DB, migrations, generated artifacts, secrets/security-sensitive code, UI/browser tests and env-dependent checks. If a required check cannot run locally, mark it `BLOCKED` or `NOT RUN`; do not silently downgrade it.
6. Add a `verify:plan`-style read-only CLI only if it fits current naming and script conventions. The first version should print a plan; it must not execute arbitrary commands automatically.
7. Add a CI/test-chain regression test ensuring every `test:*` script is in `npm run check` or explicitly represented as a CI step. Include a negative test that demonstrates the failure mode.

### Acceptance gates

- Commands are real, deterministic and ordered by prerequisites/cost.
- Plan distinguishes required from optional and local checks from CI gates.
- Security, contract, DB and generated-artifact changes cannot be assigned Fast-only completion.
- P56 invariant remains enforced.
- No shell command execution or auto-approval is introduced by the planner.

### Stop conditions

Stop if test ownership cannot be mapped reliably; report ambiguity and ask for an explicit mapping rather than pretending to know coverage. Also stop if counterexample suggestions become generic noise rather than testing a stated invariant or acceptance criterion.

---

## 7. P88 — Real-task AI benchmark

### Goal

Measure whether the system improves end-to-end AI development and makes work simpler for the human—not merely whether it reduces static context-line counts.

### Dataset

Build a small, reviewed set of approximately 20–30 representative BiForge tasks over time: bug fixes, UI behavior, API changes, DB/persistence, configuration, generated artifacts, refactors, documentation and CI failures. Begin with a smaller pilot; do not wait for all tasks to exist.

Each task should define a stable starting revision, task prompt, known relevant dependencies, protected invariants, acceptance criteria, required checks, and human-reviewed outcome. Keep task data in the approved flat layout; no nested `fixtures/` directory. Avoid including secrets, personal data or production records.

### Measurements

- Input tokens and output tokens only when a named model/tokenizer or provider trace actually supplies them.
- Wall-clock time from task start to accepted result, with environment and model recorded.
- Number of agent turns/iterations and human interventions, including clarification requests and manual context gathering.
- Human review/acceptance effort where it can be captured consistently (for example, elapsed review time or a small documented ordinal scale); mark unavailable when not measured.
- Rework caused by missed dependencies, misunderstood intent, false alarms or incomplete verification.
- Pass rate for acceptance criteria and required tests.
- Dependency recall and false-positive rate against a reviewed gold set.
- Actual changed-file count and change surface, with unrelated changes identified.
- Contract/security regressions and rollback/rework.
- Cost per safely completed task where reliable provider pricing data exists.

The primary decision is whether total effort and risk per accepted change improve. Do not optimize one metric (such as fewer tokens) if it increases human review, rework or maintenance burden.

Never convert source lines into token counts. Never compare runs with materially different task wording, model, repository base, tools or test environment without disclosing the difference. Keep failed and abandoned runs in the report to avoid survivorship bias.

### Acceptance gates

- Repeatable harness with pinned task and revision metadata.
- Results distinguish measured, estimated, unavailable and not-run values.
- Gold-set changes are reviewed and explained; historical reports are not silently overwritten.
- Compare baseline workflow and context-engine workflow on matched tasks where practical.
- No threshold is enabled until the sample and variability justify one.

---

## 8. P89 — Lightweight Intent Contract (VIX-inspired)

### Goal

Turn a natural-language request into a small, reviewable statement of intended behavior and constraints before editing code, using an automatically generated draft rather than a mandatory user-authored form. This is the practical Intent IR element adopted from VIX; it is not a separate orchestration framework.

### Proposed contract fields

- `goal` and explicit out-of-scope items;
- `allowedAreas` or candidate change boundaries, not absolute prohibitions on discovering a required dependency;
- `requiredInvariants` (API compatibility, authorization, persistence, UI behavior, data safety);
- `acceptanceCriteria` stated as observable outcomes;
- `requiredVerification` derived from P87;
- `assumptions` and `openQuestions`;
- references to the P85 context plan and P86 impact evidence.

The contract is generated from the prompt and existing evidence as a draft. Explicit user requirements and inferred assumptions must be distinguishable. It must not silently change the user's requested behavior or treat inferred criteria as user-approved. Ask the Navigator only when ambiguity could materially alter product behavior, data migration, security, legal/contractual constraints or external integrations; routine low-risk uncertainty should be recorded and handled conservatively without unnecessary interruption.

### Implementation plan and gates

1. Define a minimal schema with runtime validation using the project's existing validation approach.
2. Add deterministic validation and readable diagnostics for missing goals, empty acceptance criteria, conflicting invariants and unknown verification command names.
3. Add a draft-only CLI or compact report integrated with P85; no mandatory manual form, autonomous approval or auto-merge.
4. Link the contract to the context and verification plans without duplicating their underlying inventories.
5. Test valid, incomplete, contradictory, malformed and security-sensitive examples.
6. Confirm that the final summary maps each acceptance criterion to evidence or clearly says it is unverified. Include a concise intent diff: met, not met, changed, or unverified.

---

## 9. P90 — Incremental architecture/context refresh

### Goal

Avoid recomputing all derived architecture data after every small edit while preserving a deterministic full rebuild as the correctness oracle. This is an optimization, not a goal by itself: implement only if profiling shows a meaningful reduction in developer wait or repeated work.

### Implementation plan

1. Profile existing generators and planner commands first; optimize only a measured bottleneck.
2. Define cache keys using relevant input content hashes, tool/version/config and schema version—not timestamps alone.
3. Track dependency invalidation: source module changes invalidate its edges and affected summaries; generator changes invalidate generated outputs and consumers; contract changes invalidate linked plans and tests.
4. Keep a full rebuild command and compare incremental output to full output in tests/CI.
5. Handle file deletion, rename, case sensitivity, branch switch, stale cache, changed tool version, failed generator and interrupted run.
6. Prefer ephemeral/local caches or clearly generated artifacts; do not commit machine-specific absolute paths or nondeterministic state.

### Acceptance gates

- Incremental and full rebuilds yield identical canonical output for the same tree.
- Cache invalidation tests cover add/change/delete/rename and generator lineage.
- Report measured speed-up and workload size; do not claim faster operation without timing evidence.
- Cache corruption or uncertainty falls back safely to a full rebuild.

---

## 10. P91 — Context completeness and material-uncertainty guard

### Goal

Prevent a planner from mistaking “no relationship found” for “no relationship exists”, while keeping uncertainty reporting useful rather than alarming or verbose.

### Required states

- **Complete:** all required links for the declared scenario are found within validated rule coverage. This is scoped completeness, never a claim that all runtime relationships in the entire application are known.
- **Partial:** some relationships are unresolved, dynamic or heuristic.
- **Unverified:** insufficient evidence to safely claim the plan is adequate.

Each unresolved relationship should name the possible consequence, missing evidence and recommended next action. A scalar confidence score alone is not sufficient. Show material uncertainty in the default summary; keep low-impact technical details available in expanded evidence so the human is not forced to triage noise.

### Implementation plan

1. Define rules that cause Partial/Unverified: dynamic import or dispatch, unknown generator, absent test mapping, contract with untracked consumers, unresolved env/SQL/data access, stale generated artifact, benchmark gold dependency not found.
2. Make P85/P86/P87 outputs propagate those states rather than dropping them at the next stage.
3. Add adversarial tests where an edge is intentionally hidden, a generator is renamed, a test mapping is absent or an artifact is stale.
4. Add an optional strict mode for CI only after false-positive/false-negative behavior is reviewed. Initially it should report; it must not block product CI based on unreviewed heuristics.
5. Use P84/P88 benchmark evidence to calibrate rules and avoid a guard that merely marks every task Unverified. Measure whether warnings change a decision or prevent rework; remove warnings that consistently add no value.

### Acceptance gates

- Missing known gold dependencies cannot be represented as Complete.
- Every non-complete state has actionable explanations.
- Strict-mode behavior, if approved later, is deterministic and has a documented override policy; no security or required test gate may be bypassed.

---

## 11. Human-simplicity acceptance gate (applies to P85–P91)

Before implementing each patch, answer these questions in the patch plan and final report:

1. **Human work removed:** Which repeated explanation, file search, test selection, risk discovery, manual comparison or rework should become unnecessary?
2. **Safety/evidence added:** Which concrete failure mode or blind spot does the patch address?
3. **Complexity introduced:** What code, rule, data, maintenance or cognitive overhead is added?
4. **Net result:** How will we observe that the benefit exceeds the cost? If there is no practical measure yet, label it a hypothesis and prefer a small pilot.
5. **Simplest viable implementation:** Can the goal be achieved by extending an existing planner, report, test or inventory rather than adding a new subsystem?

A patch should be narrowed, deferred or rejected if it adds mandatory human ceremony, duplicate sources of truth, noisy warnings or unmeasured infrastructure without a credible net benefit. Do not make the internal architecture “simple” at the expense of safety; optimize the human's end-to-end experience and the project's long-term maintenance burden.

## 12. Cross-patch verification checklist

For every patch P85–P91, report this checklist explicitly:

- [ ] Base revision/current tree confirmed.
- [ ] Scope and non-goals stated; product runtime changes justified or absent.
- [ ] Changed/new/deleted files enumerated.
- [ ] Tests cover positive, negative and uncertainty cases.
- [ ] All `test:*` scripts satisfy P56 check-chain or explicit CI-step policy.
- [ ] Focused tests run and results recorded.
- [ ] `npm run check:docs`, `npm run docs:check`, `npm run architecture:check` and applicable generators run.
- [ ] Typecheck, build, full `npm run check`, browser/DB checks and CI are separately reported as pass/fail/blocked/not run.
- [ ] P84/P88 metrics compared where relevant; gold-set edits explained.
- [ ] No nested directories added without approval; no `tests/fixtures/` introduced.
- [ ] Security, API, persisted-data and approval invariants reviewed.
- [ ] ZIP integrity and SHA-256 verified; rollback instructions included.
- [ ] Changelog and status docs updated; next patch not started until Navigator reports green CI.

## 13. Bootstrap prompt for the next AI implementation session

Copy this prompt when starting P85 (and adapt the patch number only after the prior patch is accepted):

> Work on BiForge patch P85 — Intent-Aware Task Context. Read `AGENTS.md`, `docs/AI-OPERATING-RULES.md`, `docs/AI-NATIVE-ROADMAP-P81-P84.md`, this document `docs/AI-NATIVE-ROADMAP-P85-P91.md`, the current `package.json`, context planner implementation/tests, and P84 benchmark reports. Treat the checked-out user tree as authoritative; do not rebuild from an older archive. First report exact current implementation and a narrow plan, then implement only P85. Reuse existing planner/inventory evidence; do not create a second source of truth. Apply the VIX-inspired principles in this roadmap without creating a separate VIX subsystem or a mandatory manual task form. State what human work the patch removes, what safety/evidence it adds, and how its added complexity will be evaluated. Keep docs/scripts flat; do not create nested `tests/fixtures/`. Do not change product runtime behavior unless the Navigator explicitly approves a justified need. Preserve security and compatibility. Add positive, negative and uncertainty tests, including relevant counterexamples. Ensure every `test:*` script is in `npm run check` or an explicit CI step detectable by P56. Run focused tests and available docs/architecture/typecheck/build/full-check commands, reporting PASS/FAIL/BLOCKED/NOT RUN honestly. Update benchmarks only with reviewed, traceable evidence. Deliver a ZIP of changed/new repository-relative files, list deletions separately, include SHA-256 and rollback instructions, and update `CHANGELOG.md`, `AGENTS.md`, and `docs/DOCUMENTATION-INDEX.md`. Do not claim CI is green; wait for the Navigator to report it before beginning P86.

For P86–P91, reuse the same operating requirements but replace the scope, acceptance gates and prompt with the corresponding section above. Each patch should be independently reviewable and revertible.

## 14. Decision points reserved for the Navigator

The AI implementer may make routine local design decisions and disclose them, but must request explicit direction before:

- enabling an automatic benchmark regression threshold or making it a required merge gate;
- changing product/runtime behavior or public API compatibility;
- adding a new persistent data format, migration or external service;
- executing planned shell commands automatically from a planner;
- introducing automatic task approval, auto-merge, GitHub write, deployment or production operations;
- creating new directory levels or changing repository layout rules;
- accepting a patch formally or waiving mandatory checks.

The goal of this roadmap is a controlled sequence of evidence-backed improvements that reduces total human effort—not a parallel VIX subsystem and not a grant of autonomy to modify or deploy the product without review.
