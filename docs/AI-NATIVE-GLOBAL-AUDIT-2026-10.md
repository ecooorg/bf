# BiForge Global AI-Native Audit
**Document ID:** BF-AUDIT-GLOBAL-001  
**Baseline inspected:** `bf-v103.zip` (repository snapshot labelled BiForge v103)  
**Audit date:** 2026-10-25  
**Status:** Initial architecture and operating-model audit; implementation changes are not part of this document  
**Strategic reference:** `docs/VIX-CONCEPT.md`  
**Companion mandate:** `AI-NATIVE-RENOVATION-MANDATE.md`

## 1. Executive conclusion

BiForge already contains meaningful foundations for AI-native software work: explicit operating rules, a task-context planner, change-impact and verification tools, intent-contract experiments, diagnostic evidence collection, security gates, database-backed workflows, and an early App Builder pipeline. This is not a greenfield project.

However, the repository is still primarily a conventional application whose development process has accumulated a large collection of AI-oriented helper scripts and patch-era documentation. The next transformation should not be “add more AI tools.” It should turn BiForge into a **closed-loop, evidence-driven system that can understand intent, propose and implement changes, verify the consequences, recover from bounded failures, and present the Navigator with only material decisions**.

The strongest strategic alignment with VIX is not a premature jump to formal synthesis or autonomous production changes. It is to build the trustworthy lifecycle substrate first: one authoritative intent/constraint model, traceable decisions, risk-based verification, reproducible changes, robust evidence, bounded repair, and explicit authority boundaries. These are prerequisites for the VIX path from business intent to formal models, counter-examples, executable dataflow, and controlled evolution.

The audit finds substantial capability but weak consolidation. Some documentation is stale or contradictory; multiple overlapping verification/context tools remain; the CI workflow has staged stop conditions; the handoff summary script still prints the report to stdout and GitHub Actions Summary; and the App Builder's completion claim is based on static validators rather than semantic or formal proof. These are not all defects of equal importance. The renovation should prioritise **safety and correctness, lifecycle coherence, evidence quality, and measurable reduction in Navigator effort**, not source-code aesthetics.

## 2. Audit scope and evidence limits

### Inspected
- `AGENTS.md`, `docs/VIX-CONCEPT.md`, `docs/AI-OPERATING-RULES.md`, the accepted transformation specification (historical), the P81–P91 roadmaps, the P103 test-audit note (historical), `docs/DOCUMENTATION-INDEX.md`, and `package.json`.
- CI workflow definitions, CI handoff/report scripts, the top-level application/server/module layout, migrations, tests, and App Builder core contracts/engine/validators.
- The supplied `biforge-ci-report.zip` handoff and its diagnostics archive.

### Not established by this audit
- The current live GitHub Actions status. The Navigator reports that CI is green; this report accepts that as current external status, but cannot independently query the live run from the supplied repository archive.
- Production behavior, deployed migration state, production telemetry, or real-provider quality.
- Full runtime equivalence, complete security, or formal correctness. Static inspection and conventional tests cannot establish these claims.
- End-to-end benchmark results for the AI-native workflow. The repository includes benchmark tooling and historical evidence, but this audit did not execute those benchmarks.

The supplied CI artifact contains a **failed run for commit `cc607e2cde1e02c73cc93cfc27791a41c3c4b126`**, with a missing `inspectLogs` export in `scripts/ci-summary.mjs`. This artifact is not proof that the current branch is red: it is a snapshot-specific historical observation and should not override the Navigator's statement that current CI is green.

No dependencies were installed and no full test suite was run in this audit. The command `node scripts/check-version.mjs` passed for the supplied snapshot (`Version check OK: 103 (release P103)`). `node_modules` was absent, so dependency-backed checks are **NOT RUN**, not passed.

## 3. Current system map

The snapshot contains approximately:
- 80 direct Express route registrations in `server.ts` and server modules;
- 69 top-level server source files;
- 77 files under `src/` (including workspace modules);
- 57 top-level scripts;
- 40 files under `tests/` (including fixtures and support data, not all test modules);
- 19 SQL migrations;
- 6 GitHub workflow files;
- 12 files in `appBuilder/`;
- 36 files under `docs/`.

These counts describe the supplied archive, not necessarily the current remote repository.

The architecture has several distinct capability clusters:

1. **Interactive product:** React client with Simple, Expert, and Project modes; browser-side workspace/file handling; exports and Google Drive-related functionality.
2. **Server and orchestration:** Express routes, model adapters/router, prompt and context construction, task/plan/queue state machines, project capabilities, artifacts, gates, budgets, and operations/diagnostics.
3. **Persistence and audit trail:** PostgreSQL migrations and repositories for projects, tasks, jobs, approvals, artifacts, gates, model health, and repair-related state.
4. **AI-assisted delivery experiments:** task-context planning, impact/lineage analysis, verification planning, intent-contract drafts, completeness checks, diagnostic runners, patch packaging, and App Builder.
5. **Operational control plane:** GitHub Actions, secret scanning, database migration checks, staged diagnostics, live database/API tests, build, evidence packaging, and `NEXT_PATCH.md`.

This is a credible foundation, but the pieces do not yet constitute one clearly defined, authoritative AI-native lifecycle.

## 4. Strategic interpretation of VIX

`VIX-CONCEPT.md` describes a much larger destination than an AI-assisted coding tool. Its defining capability is a governed system that translates business goals into a structured Intent IR, discovers ambiguity and contradictions through counter-examples, derives state models and invariants, verifies critical properties, synthesises executable dataflow, and evolves running systems under an explicit authority model.

The VIX principles that should govern BiForge's renovation are:

- **Normative Core:** business goals, mandatory invariants, safety rules, approved policies, authority limits, and success criteria have one versioned source of truth.
- **Provenance:** every material rule and change traces back to a requirement, an assumption, external evidence, or a Navigator decision.
- **Counter-example first:** the system explains uncertainty and disagreement through concrete scenarios and consequences, not merely prose or large diffs.
- **UNKNOWN is a real state:** missing evidence must not be silently promoted to PASS. UNKNOWN on critical properties blocks release or execution.
- **Authority is explicit:** implementation autonomy is not policy authority. High-impact, irreversible, security-sensitive, financial, production, or goal-changing actions remain gated.
- **Safe evolution:** compare before/after behavior, retain history, classify side effects, and provide a recoverable transition where possible.
- **Proof claims are calibrated:** unit tests, static analysis, runtime checks, model checking, SMT results, and theorem proofs are different evidence classes and must not be described interchangeably.

VIX's staged approach matters. The early proof points are not bare-metal execution or a custom compiler. They are (1) generate a working graph from a textual goal, (2) find contradictions before launch, and (3) prove at least one critical invariant for a concrete model. BiForge should earn each level of autonomy through measured evidence.

## 5. Principal findings

### F1 — AI-native capabilities are distributed across overlapping tools
**Priority:** P1 — high  
**Evidence:** P81–P91 documents and scripts cover context planning, impact analysis, verification planning, task benchmarks, intent contracts, refresh profiling, and completeness guards. These appear as separate utilities with separate reports and conventions. the P103 test-audit note (historical) also labels several of these tools as removal candidates, while the corresponding test files are still present in the supplied snapshot.  
**Risk:** the Navigator/agent must discover which tool is authoritative; context and evidence can diverge; maintenance cost grows faster than capability.  
**Direction:** consolidate around a single lifecycle API and a common typed artifact/evidence schema. Retain a tool only if benchmark evidence shows that it contributes unique value.

### F2 — Intent is not yet the authoritative control plane
**Priority:** P0/P1 — foundational  
**Evidence:** the P89 intent-contract note (historical) describes an optional, draft-only contract. VIX requires a versioned Normative Core and traceability for goals, assumptions, invariants, constraints, and decisions.  
**Risk:** requirements, implementation, tests, and approval decisions can disagree without a machine-enforced canonical contract.  
**Direction:** evolve the intent contract into a canonical, versioned **Intent/Policy Contract** with provenance, confidence, criticality, contradiction status, acceptance criteria, authority tier, and evidence links. Begin read-only and advisory; do not silently change product behavior.

### F3 — CI has staged stop conditions rather than universal evidence collection
**Priority:** P1 — high  
**Evidence:** `.github/workflows/ci.yml` runs the secondary diagnostic phase only if the primary diagnostic phase succeeds; migration runs only if the secondary phase succeeds; subsequent check, live API, and build phases are also conditional. This preserves safety and avoids running dependent stages on invalid prerequisites, but it does not satisfy the stronger goal of collecting all independent diagnostics after a failure.  
**Risk:** one early failure can hide unrelated failures, increase repair cycles, and make the handoff incomplete.  
**Direction:** explicitly model checks as a dependency graph. Run all **independent and safe** checks to completion, even after failures; skip only checks whose prerequisites failed or whose execution could cause unsafe side effects. Report `PASS`, `FAIL`, `BLOCKED`, `SKIPPED_BY_POLICY`, `TIMEOUT`, and `NOT_RUN` distinctly.

### F4 — The handoff contract is not yet aligned with the desired silent CI Summary
**Priority:** P1 — high, if the zero-output requirement remains active  
**Evidence:** `scripts/ci-summary.mjs` calls `console.log(report)` and appends the report to `GITHUB_STEP_SUMMARY`. The workflow runs that script in the “ASSISTANT HANDOFF — GitHub Actions summary” step.  
**Risk:** the summary becomes a second, noisy copy of the handoff; the user-facing surface is not minimal and may duplicate a large report.  
**Direction:** make the GitHub Actions Summary and summary step output truly empty if that remains the explicit product contract. Keep complete handoff evidence in the designated `NEXT_PATCH.md` artifact and the compact diagnostics artifact. A failure in report generation must still be captured in logs/artifacts, not printed as a verbose summary.

### F5 — Evidence reporting is promising but not yet a single trusted evidence model
**Priority:** P0/P1  
**Evidence:** `scripts/patch-quality-report.mjs`, diagnostic runners, test harness, artifact packaging, and individual planners each produce outputs. The historical supplied CI report demonstrates how an import/export mismatch can prevent a diagnostic test module from loading and block downstream checks. The current source and old artifact differ, so this is a general integration risk, not a claim about current CI.  
**Risk:** reports can disagree on schema, status vocabulary, provenance, and completeness; agents may overstate confidence or ask for logs that are already present.  
**Direction:** define one versioned Evidence Record and one report generator. Each claim must identify its source, exact command/check, outcome, timestamp/commit, relevant log range, and confidence. Validate the report schema and its redaction before publication.

### F6 — App Builder's “complete” signal is stronger than its actual evidence
**Priority:** P1 — high for generated software  
**Evidence:** `appBuilder/core-engine.ts` sets `goalImplemented` based on all planned units being complete plus six required static validators. The validators check HTML structure, JavaScript syntax, local references, size/path constraints, secret-like patterns, and deterministic acceptance predicates. JavaScript is compiled using `vm.Script` but not executed. These are useful safety and structure checks, but they do not prove the generated app satisfies its business goal or works at runtime.  
**Risk:** a syntactically valid artifact can be marked complete despite broken behavior, unmet semantic requirements, inaccessible UI, unsafe dependencies, or incorrect business logic.  
**Direction:** use evidence-calibrated statuses such as `generated`, `static_checks_passed`, `behavior_verified`, `invariant_verified`, and `release_eligible`. Reserve `goalImplemented=true` or equivalent strong claims for an explicit acceptance contract with sufficient independent behavioral evidence.

### F7 — The test audit reduced historical/textual tests, but the evidence policy needs a principled replacement
**Priority:** P1  
**Evidence:** the P103 test-audit note (historical) records removal of 150 tests and says tests about docs, source text, frozen history, and test-chain wiring were removed. Yet the supplied tree still contains several context-related test files named as removal candidates, and the document's status may not match this snapshot.  
**Risk:** blanket deletion can remove useful regression protection; conversely, brittle tests of incidental implementation details can block valid refactoring.  
**Direction:** classify tests by the property they protect: business behavior, security invariant, compatibility contract, reliability/recovery, architecture policy, tool self-test, or documentation-only assertion. Delete only when the property is obsolete or covered better elsewhere. Test the externally meaningful invariant, not a particular implementation shape.

### F8 — Documentation and status are fragmented and partly contradictory
**Priority:** P1  
**Evidence:** `AGENTS.md` describes P93 as current, package scripts include P94/P96-era names and tests, and the P103 test-audit note (historical) refers to P103. Some documentation marks tools as prepared or pending even though code is present. `docs/DOCUMENTATION-INDEX.md` calls the P85–P91 roadmap the next roadmap while later status records exist.  
**Risk:** an AI agent can follow obsolete instructions, misinterpret what is implemented, or waste time reconstructing status from patch history.  
**Direction:** generate a compact machine-readable capability/status manifest from code and verification evidence. Keep one authoritative current-status document; label all other material `normative`, `implemented`, `proposed`, `historical`, or `superseded`. Avoid manual status duplication.

### F9 — Security and authority rules are well articulated, but must be enforced as runtime policy
**Priority:** P0 — safety-critical  
**Evidence:** `AGENTS.md` and `docs/AI-OPERATING-RULES.md` explicitly protect production deploys, GitHub writes, credentials, billing, generated-code execution, and formal acceptance. `server/codeExecutor.ts`, `server/security.ts`, Project Mode routes, gates, budgets, and database-backed state are part of the enforcement surface.  
**Risk:** policy written in documentation is not itself a runtime control; a route or workflow regression could bypass the intended boundary.  
**Direction:** convert high-impact policy rules into executable policy checks and negative tests. Use least-privilege credentials, explicit capability grants, scoped tokens, auditable approvals, default-deny execution, and fail-closed behavior. Preserve the rule that generated output never grants itself authority.

### F10 — App Builder is an early vertical slice, not yet VIX synthesis
**Priority:** P1/P2  
**Evidence:** the flat `appBuilder/` core has typed contracts, ports, planning/marker parsing, caching, recovery, a static-site stack, and validators. It is a useful modular starting point, but the VIX stages for Intent IR, state models/invariants, dual formalisation, counter-example-driven Intent Review, formal verification, dataflow synthesis, and safe runtime switching are not evidenced as a complete end-to-end pipeline.  
**Risk:** “AI-generated app” capability may be mistaken for governed synthesis from business intent.  
**Direction:** use App Builder as the first end-to-end proving ground for the lifecycle, not as a parallel architecture. Add a narrow domain where intent, state transitions, and invariants are explicit.

### F11 — The current quality loop lacks a demonstrated human-effort outcome metric
**Priority:** P1  
**Evidence:** there are benchmark scripts and historical benchmark documents, but this audit did not run a controlled comparison of end-to-end tasks or establish current baseline measurements.  
**Risk:** more tooling can create the appearance of progress while adding steps, output, and maintenance for the Navigator.  
**Direction:** measure time-to-correct-change, Navigator interventions, clarification count, escaped regressions, false-positive/false-negative gates, evidence completeness, recovery success, and compute/cost. Make human effort and safety first-class acceptance criteria.

### F12 — The architecture inventory is rich, but a canonical dependency/ownership model should drive change planning
**Priority:** P2  
**Evidence:** generated module, route, environment, and migration inventories exist, alongside architecture boundary checks and impact tooling.  
**Risk:** separate inventories can drift or report relationships without reliably identifying the authoritative owner of a contract.  
**Direction:** consolidate inventories into a canonical capability graph: capability → intent contract → owners/modules → data/state → side effects → invariants → tests/evidence → deployment/rollback path.

## 6. Strengths to preserve

- Explicit authorization tiers and the rule that silence is not consent.
- Fail-closed Project Mode/security boundaries, least-privilege GitHub defaults, and secret redaction requirements.
- PostgreSQL-backed state, migrations, artifact manifests, gates, approvals, and task/job concepts.
- Diagnostic archives and the `NEXT_PATCH.md` handoff idea: the Navigator should be able to provide one primary report instead of a repository dump.
- Test coverage for runtime behavior, negative security cases, data contracts, persistence, model routing, files, and integrations.
- App Builder's ports/contracts and the decision not to execute generated JavaScript merely to validate syntax.
- VIX's explicit conflict hierarchy, five authority levels, provenance, counter-examples, UNKNOWN semantics, and safe-update protocol.

## 7. Target operating model

The target is a single AI-native lifecycle, not a set of disconnected scripts:

1. **Receive intent:** parse a task and the current normative policy, ask only material questions, and preserve explicit/inferred/assumed distinctions.
2. **Build context:** retrieve only the relevant source, contracts, dependencies, history, and evidence; track missing or stale context.
3. **Model impact:** build a change graph covering affected behavior, state, side effects, security boundaries, invariants, tests, and rollback.
4. **Plan verification before editing:** define positive, negative, boundary, recovery, and invariant checks; select independent checks that can run in parallel.
5. **Implement a bounded patch:** make one coherent change, with generated diffs and provenance; do not alter policy or authorization as a side effect.
6. **Verify adaptively:** run safe independent checks to completion; block dependent or unsafe checks only with a recorded reason. Repair only within a bounded budget.
7. **Compare outcomes:** evaluate acceptance criteria, critical invariants, security properties, regressions, and operational cost.
8. **Package evidence:** emit a single validated handoff plus compact diagnostics, with no duplicate noisy summary.
9. **Request a decision only when required:** show the Navigator the consequence, counter-example, uncertainty, options, and authority reason—not internal file trivia.
10. **Learn from outcomes:** update the benchmark set and failure taxonomy without silently changing normative goals.

## 8. Recommended renovation sequence

### Phase 0 — Establish the truth
- Pin the actual baseline commit and record current green CI evidence.
- Reconcile current-status metadata and label stale documentation.
- Define outcome/status vocabulary and the zero-output Summary contract.
- Establish baseline human-effort and reliability metrics.

### Phase 1 — One evidence and capability model
- Define versioned schemas for Intent/Policy Contract, Change Plan, Verification Plan, Evidence Record, and Handoff Report.
- Make all existing tools adapters/producers for these schemas or retire them based on measured value.
- Generate current capability/status and dependency graphs from code plus verification evidence.

### Phase 2 — Trustworthy verification and bounded repair
- Represent CI as a dependency graph; execute independent safe checks to completion.
- Add failure classification, evidence links, bounded repair attempts, and regression verification.
- Make status claims evidence-backed and distinguish static, behavioral, security, and formal verification.
- Add end-to-end fault-injection tests for report generation, missing logs, timeouts, cancellation, and partial artifacts.

### Phase 3 — Intent and invariant vertical slice
- Select one narrow transactional/dataflow domain.
- Create Intent IR with provenance, assumptions, invariants, state transitions, and acceptance criteria.
- Generate contrastive counter-examples and ask the Navigator only about material ambiguity.
- Prove or model-check at least one critical invariant; keep UNKNOWN blocking critical release.

### Phase 4 — Governed synthesis and controlled evolution
- Generate an executable dataflow/app from approved Intent IR.
- Run it in a constrained environment with explicit permissions and side-effect isolation.
- Compare candidate behavior in shadow mode; use intent diffs and rollback/checkpoint contracts.
- Introduce autonomous change levels only after evidence-based admission criteria exist.

### Phase 5 — Measured autonomy
- Run repeated real-task benchmarks.
- Compare against the Phase 0 baseline for correctness, safety, human intervention, time, cost, and recovery.
- Promote capabilities only when predefined thresholds are met; keep failed experiments reversible.

## 9. Global acceptance criteria

BiForge should not be declared an AI-native reference implementation until evidence demonstrates all of the following:

- **Navigator simplicity:** the normal owner workflow does not require opening source files or reading CI logs; one concise decision surface and one handoff file are sufficient for routine tasks.
- **Correctness:** each change has explicit acceptance criteria and relevant behavior checks; critical invariants are represented and checked.
- **Evidence integrity:** no PASS/COMPLETE claim exists without linked evidence; missing evidence remains UNKNOWN/BLOCKED.
- **Safety:** authority tiers are enforced by code and infrastructure; generated code cannot grant itself capabilities; high-risk and irreversible actions require explicit approval.
- **Autonomy with bounds:** independent checks run to completion; automated repair has explicit limits and cannot weaken tests, policies, or invariants to make CI green.
- **Traceability:** every material change links intent → plan → diff → checks → evidence → approval/deployment/rollback.
- **Recoverability:** cancellation, partial failure, timeout, and rollback are tested, observable, and idempotent where applicable.
- **Measured value:** repeated real tasks show a material reduction in Navigator interventions/time without increased escaped defects or security risk.
- **VIX progress:** at least one concrete domain demonstrates intent formalisation, counter-example discovery, and verification of a critical invariant before execution.

## 10. Decisions deliberately not made by this audit

The audit does **not** authorize:
- production deployment or changes to live infrastructure;
- GitHub write/merge/admin permissions;
- enabling host execution of generated code;
- changing billing, secrets, provider credentials, or security controls;
- deleting major subsystems or migrations solely to reduce file count;
- claiming formal verification where no formal method was run;
- making VIX's full hardware-oriented target an immediate implementation requirement.

These remain subject to the project's authority model.

## 11. Final recommendation

Treat this audit as the architectural mandate for the next era of BiForge. Do not begin with a large mechanical rewrite. Begin by consolidating truth and evidence, then make the lifecycle coherent, then prove one VIX-aligned vertical slice. Keep each transformation reversible and measured. The goal is not code that looks elegant to a human reviewer; it is a system that reliably converts intent into safe, verified change while keeping the Navigator's cognitive load close to zero.
