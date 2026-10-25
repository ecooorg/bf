# BiForge AI-Native Global Renovation Mandate
**Document ID:** BF-RENOVATION-MANDATE-001  
**Status:** Strategic assignment; implementation requires staged patches and evidence-based acceptance  
**Parent strategic reference:** `docs/VIX-CONCEPT.md`  
**Required companion:** `AI-NATIVE-GLOBAL-AUDIT-2026-10.md`

## 1. Mission

Transform BiForge from a conventional application with AI-assisted development tools into a **governed, evidence-driven, AI-native software lifecycle**. The system should be able to interpret approved intent, plan and implement bounded changes, verify their consequences, recover safely from failures, and present the human Navigator only with material choices and approvals.

The Navigator does not work as a developer. The Navigator must not need to open source files, inspect folder structure, read raw logs, or understand implementation language. Internal representations, languages, file layout, and generated code are implementation choices. The non-negotiable requirements are functional correctness, security, policy compliance, traceability, recoverability, and a demonstrable reduction in human effort.

This mandate is a direction of travel, not permission to perform high-risk actions without approval. It is subordinate to explicit Navigator decisions and the permanent safety rules.

## 2. Relationship to VIX

`VIX-CONCEPT.md` is the long-horizon architectural destination. The renovation must preserve that target rather than shrinking it to fit today's codebase. The practical route is incremental:

1. Establish one trustworthy lifecycle and evidence model.
2. Make intent, policy, assumptions, invariants, and authority machine-readable.
3. Make verification risk-based, dependency-aware, and evidence-calibrated.
4. Prove a narrow Intent IR → counter-example → invariant verification → executable dataflow path.
5. Add controlled adaptation and safe switching only after the preceding steps are evidenced.
6. Evaluate hardware-oriented execution only when the software-level model and compiler/runtime path justify it.

The first VIX demonstration should preferably use a transactional business process or ETL/dataflow task with explicit state transitions and invariants. Do not start with a broad general-purpose compiler or bare-metal runtime.

## 3. Governing principles

### 3.1 Intent before implementation
Every material task must have a concise machine-readable contract containing:
- desired outcome and non-goals;
- explicit requirements versus inferred assumptions;
- constraints and mandatory invariants;
- acceptance criteria;
- risk and criticality;
- relevant data/state transitions and side effects;
- authority level and required approvals;
- evidence requirements;
- provenance to the source request, policy, or Navigator decision.

The contract may be inferred initially, but inferred or uncertain items must be labelled. The system must not silently turn an assumption into an approved business rule.

### 3.2 Safety and authority are hard boundaries
Preserve the VIX conflict hierarchy:

1. Safety.
2. Mandatory business invariant.
3. Law, regulation, and contractual obligation.
4. Approved policy.
5. Business goal.
6. Efficiency and secondary optimisation.

Autonomy may select implementation strategies within approved constraints; it may not silently change goals, mandatory invariants, success criteria, security boundaries, or authorization. Production deployment, repository writes/merges, secrets, billing, and execution of generated code on a privileged host remain gated by explicit authorization.

### 3.3 Evidence determines status
Use a shared vocabulary:
- `PASS`: the required check ran and produced valid passing evidence.
- `FAIL`: a check ran and contradicted the required condition.
- `BLOCKED`: a prerequisite, permission, or safety condition prevented execution.
- `SKIPPED_BY_POLICY`: intentionally not run because execution was unsafe or irrelevant.
- `TIMEOUT`: the check exceeded its declared bound.
- `NOT_RUN`: no execution evidence exists.
- `UNKNOWN`: available evidence cannot establish the claim.
- `PARTIAL`: some required subconditions passed, but the whole contract is not satisfied.

Never promote `UNKNOWN`, `NOT_RUN`, or `BLOCKED` to `PASS`. Do not equate syntax checks with behavior verification, tests with formal proof, or model confidence with proof.

### 3.4 Independent checks should finish
Represent verification as a dependency graph. After a failure, continue every independent and safe check so the run provides maximum useful evidence. Skip only checks that require failed prerequisites, could corrupt state, incur uncontrolled external side effects, or violate an explicit safety rule. Record the reason for every skip. Never stop a safe independent test suite merely because another suite has failed.

### 3.5 The system must not game its own gates
Automated repair may not delete or weaken tests, lower acceptance thresholds, alter normative policy, disable security checks, or relabel failures in order to obtain a green result. Changes to tests and gates must be justified by the protected property and reviewed under the appropriate authority tier. A repaired patch must rerun the relevant regression and invariant checks.

### 3.6 One source of truth
Avoid parallel, overlapping tools and manually duplicated status. Consolidate around authoritative schemas and a capability graph. Retain an existing tool only if it adds a unique, measured benefit or is a necessary adapter.

### 3.7 Optimize for Navigator effort
The normal workflow should expose one concise decision surface and one primary handoff file. The handoff should state what changed, what was verified, what remains unknown, any required decision, and the next safe action. Detailed logs and diagnostics remain available as evidence, not as the default interface. GitHub Actions Summary must remain empty if the Navigator's zero-output requirement is active.

## 4. Target lifecycle

Implement the following loop as the canonical path for material changes:

1. **Intake:** receive goal, context, constraints, and authorization.
2. **Contract:** construct or update the Intent/Policy Contract; label explicit, inferred, and assumed facts.
3. **Context:** retrieve the smallest sufficient set of source, architecture, data, operational, and historical evidence; report staleness and gaps.
4. **Impact:** derive a capability/dependency graph for behavior, state, APIs, security boundaries, side effects, tests, observability, and rollback.
5. **Verification plan:** choose checks from risk, criticality, and change type before implementation.
6. **Implementation:** produce one bounded, traceable change; keep policy and code changes separable where practical.
7. **Verification:** execute independent safe checks to completion, then prerequisite-dependent checks; classify evidence correctly.
8. **Counter-example analysis:** seek plausible failure scenarios, contradictions, boundary cases, and invariant violations.
9. **Bounded repair:** make limited repair attempts with a declared budget; stop and escalate if evidence remains insufficient or the same failure repeats.
10. **Acceptance:** compare results against the approved contract; never silently redefine the goal to fit the output.
11. **Handoff:** publish the single primary `NEXT_PATCH.md` report and compact evidence bundle. Keep the GitHub Actions Summary empty when required.
12. **Learning:** record benchmark outcomes and failure taxonomy; propose changes to policy or success criteria rather than mutating them automatically.

## 5. Required foundational workstreams

### W1 — Canonical schemas and evidence ledger
Create versioned schemas for:
- Intent/Policy Contract;
- Change/Impact Plan;
- Verification Plan;
- Evidence Record;
- Patch/Artifact Manifest;
- Handoff Report;
- Approval and authority decision.

Each evidence item should identify the commit/revision, command or observation, environment, time, status, source/log reference, and any redaction or completeness limitation. Validation must fail closed for malformed or incomplete critical evidence.

### W2 — Capability and dependency graph
Create a generated graph connecting:
`capability → intent contract → modules → state/data → side effects → invariants → tests → evidence → release/rollback`.

Use it to select task-local context, predict impact, identify missing tests, and keep documentation current. Do not maintain separate manually curated inventories where the same fact can be generated reliably.

### W3 — Verification orchestrator
Replace sequential shell chains with a declared check graph that:
- executes independent safe checks in parallel where useful;
- enforces prerequisites and resource limits;
- captures logs and exit codes for every stage;
- supports cancellation and timeouts;
- distinguishes failure from blocked/skipped/not-run;
- collects evidence even when earlier independent checks fail;
- always emits a schema-valid handoff, including on catastrophic runner failure.

### W4 — Bounded diagnosis and repair
Provide evidence-grounded root-cause hypotheses, ranked by confidence and supported by exact source/log excerpts. Repair attempts must be bounded and auditable. The agent must not guess when decisive evidence is missing, and must not ask for an artifact already present in the handoff bundle.

### W5 — Enforceable safety policy
Map each critical rule to a code-level or infrastructure-level enforcement point and a negative test. Cover authorization, project isolation, credentials, rate/budget limits, generated-code execution, external writes, irreversible side effects, audit logs, redaction, and rollback. Treat all user uploads, repository content, model output, and generated artifacts as untrusted input.

### W6 — App Builder as the first VIX vertical slice
Evolve App Builder toward:
- structured Intent IR and typed data/state models;
- provenance for every requirement, assumption, and invariant;
- ambiguity detection and contrastive counter-examples;
- an explicit acceptance contract;
- static, behavioral, and invariant verification as distinct evidence levels;
- sandboxed execution only under an approved policy;
- artifact hashing, reproducibility, and dependency controls;
- a clear distinction between generated, statically valid, behaviorally verified, invariant-verified, and release-eligible artifacts.

Start with a constrained transactional/dataflow domain. Demonstrate at least one critical invariant checked by a suitable formal method or model checker. If a critical property is UNKNOWN, release is blocked.

### W7 — Navigator interface
The Navigator-facing interface should summarize:
- intended outcome and material interpretation;
- key alternatives and consequences;
- concrete counter-examples or risks;
- evidence-backed status;
- unresolved uncertainty;
- decisions requiring approval and why;
- the safest recommended next action.

Do not expose internal filenames, code details, or raw CI logs unless specifically requested or essential to explain a material risk.

### W8 — Real-task benchmark and value gate
Establish a versioned gold set of representative real tasks and measure:
- time to correct, accepted result;
- Navigator interventions and clarification rounds;
- regression and escaped-defect rate;
- false PASS and false FAIL rates;
- evidence completeness and reproducibility;
- bounded-repair success rate and attempts;
- model/runtime cost;
- recovery time after failure;
- performance on critical invariant and adversarial cases.

Use repeated runs and confidence intervals where appropriate. Do not claim a benefit from a single run or synthetic task alone.

## 6. Phased delivery plan and gates

### Phase 0 — Baseline and reconciliation
**Deliver:** pinned baseline commit, current green CI evidence, one current status manifest, stale-document register, benchmark protocol, explicit Summary-output contract.  
**Gate:** current state and evidence limits are unambiguous; no historical failed run is confused with current CI.

### Phase 1 — Canonical evidence
**Deliver:** versioned schemas, report validator, single handoff generator, stable status vocabulary, compact evidence archive, empty Summary behavior if required.  
**Gate:** injected failures, missing logs, malformed JSON, redaction cases, timeouts, and runner interruption still produce a valid, useful report without exposing secrets.

### Phase 2 — Verification graph and bounded repair
**Deliver:** dependency-aware check orchestrator, safe parallelism, independent-check completion, skip reasons, resource/time bounds, bounded repair protocol.  
**Gate:** fault-injection proves independent checks complete after unrelated failures; dependent/unsafe checks are correctly blocked; repair cannot weaken gates.

### Phase 3 — Intent and capability graph
**Deliver:** canonical Intent/Policy Contract, provenance, generated capability graph, task-local context and impact plan using that graph.  
**Gate:** representative changes trace intent to modules, state, invariants, checks, evidence, and rollback; missing evidence remains UNKNOWN.

### Phase 4 — VIX proof-of-value slice
**Deliver:** one constrained transactional/dataflow example with Intent IR, state model, counter-examples, at least one checked critical invariant, executable candidate, and a traceable acceptance report.  
**Gate:** contradictory and incomplete requirements are surfaced before execution; critical UNKNOWN blocks release; Navigator review is understandable without source inspection.

### Phase 5 — Safe adaptation
**Deliver:** versioned intent diffs, shadow comparison, checkpoint/state compatibility rules, irreversible-side-effect protocol, rollback and audit trail.  
**Gate:** injected transition failures recover safely; no autonomous action exceeds its authority tier; policy changes remain proposals until approved.

### Phase 6 — Measured autonomy
**Deliver:** benchmark comparison against Phase 0 and a capability promotion report.  
**Gate:** predefined safety, correctness, and Navigator-effort thresholds are met across repeated tasks. Otherwise keep the capability experimental.

## 7. Acceptance criteria for every renovation patch

Every patch must:
1. Have a clear user outcome and explicit non-goals.
2. Identify affected invariants, permissions, data/state, and side effects.
3. Be atomic enough to understand and revert.
4. Include behavior-focused positive, negative, boundary, and recovery tests appropriate to risk.
5. Run all relevant independent safe checks to completion.
6. Preserve security gates and must not weaken tests/policies to get green CI.
7. Report exact commands and outcomes; unrun checks are `NOT_RUN` or `BLOCKED`.
8. Update the authoritative status and change history without duplicating stale patch narratives.
9. Provide changed/new files in the delivery archive and list deletions explicitly.
10. Include a rollback strategy and note any migration or compatibility impact.
11. Demonstrate that the change reduces risk, reduces Navigator effort, or enables a required VIX capability.
12. Stop and request authorization for Tier 2/3 decisions.

## 8. Explicit non-goals for the first renovation wave

Do not:
- rewrite the entire codebase in one operation;
- select a new language or framework solely for ideological reasons;
- delete migrations, modules, or tests merely to reduce repository size;
- add an LLM call to every step when deterministic logic is better;
- execute generated code on the privileged host;
- grant GitHub write or production deployment rights by default;
- claim formal proof from tests, lint, typechecking, or model-generated explanations;
- implement hardware-specific or bare-metal execution before the VIX software-level proof path is demonstrated;
- optimize source layout for human aesthetics at the expense of reliable machine reasoning, security, or debuggability.

## 9. Decision protocol

- **Tier 0:** implement within the approved scope.
- **Tier 1:** make local design decisions and disclose trade-offs.
- **Tier 2:** prepare a decision for the Navigator on product scope, architecture, security, or integration.
- **Tier 3:** do not act without explicit authorization for production, GitHub write/merge, secrets, billing, host execution of generated code, or formal acceptance.

Silence is never consent. When uncertain, continue safe reversible analysis and independent tests, but do not cross an authorization boundary.

## 10. Definition of success

The renovation succeeds when BiForge behaves as a reliable AI-native system rather than a collection of AI tools: it can move from approved intent to bounded implementation and evidence, identify uncertainty before risk becomes damage, repair routine failures without gaming its gates, retain a complete causal history, and keep the Navigator out of code and operational detail.

VIX remains the long-horizon destination. The near-term obligation is to build a trustworthy path toward it, with every increase in autonomy earned by reproducible evidence.
