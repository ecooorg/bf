# AI-NATIVE-RENOVATION — Global Roadmap

**Status:** Active strategic programme  
**Owner:** Navigator  
**Normative strategic destination:** `VIX-CONCEPT.md`  
**Audit basis:** `AI-NATIVE-GLOBAL-AUDIT-2026-10.md`  
**Renovation mandate:** `AI-NATIVE-RENOVATION-MANDATE.md`  
**Current phase:** P113 user-outcome rearchitecture contract and audit plan. P110–P112 remain delivered foundations but do not prove the user-facing modes work. Phase 0–2 closed. P92 production diagnostics frozen until full renovation completes. Canonical target: `AI-USER-VALUE-ARCHITECTURE-P113.md`.  
**Rule:** one bounded patch at a time; preserve safety; report evidence honestly.

## 1. North star

BiForge is to become a governed, evidence-driven, AI-native system that translates approved intent into safe, verified, recoverable change while keeping the Navigator out of source code, file layout, and raw CI diagnostics.

The product acceptance target is user information value and completed work, not internal activity. The target is not “more AI tools.” For repository/code evolution, retain the governed lifecycle:

**intent → policy and context → impact model → verification plan → bounded implementation → independent checks → counter-example analysis → bounded repair → evidence → decision or safe completion.**

VIX remains the long-term architectural destination: formalisation of business intent, explicit state and invariants, counter-example-driven Intent Review, verification of critical properties, executable Dataflow synthesis, and eventually controlled evolution of running systems.

## 2. Programme rules

1. `VIX-CONCEPT.md` is the long-horizon concept, not blanket authorization for immediate implementation.
2. `AI-NATIVE-RENOVATION-MANDATE.md` defines the delivery constraints and acceptance rules for this programme.
3. Safety, mandatory business invariants, law/regulation, approved policy, business goals, then efficiency is the conflict hierarchy.
4. `UNKNOWN`, `NOT_RUN`, `BLOCKED`, `TIMEOUT`, and `PARTIAL` are not `PASS`.
5. Independent safe checks must continue after unrelated failures. Only dependency-blocked or unsafe checks may be skipped, with a reason.
6. Automated repair must never weaken tests, security controls, acceptance criteria, or authorization to obtain green CI.
7. Every patch is bounded, reversible where possible, and delivered with a changed/new-files ZIP, explicit deletion list, exact checks and outcomes, and rollback notes.
8. The normal Navigator interface is a concise decision surface and `NEXT_PATCH.md`; routine work must not require source inspection.
9. GitHub writes/merges, production changes, secrets, billing, privileged host execution of generated code, and formal acceptance remain authorization-gated.
10. Superseded documents are deleted, not archived in the repository (git and the owner's backups hold history). Normative requirements must first live in a canonical source. Never delete generated inventories, schemas or architecture policy files that tools read.

## 3. Phases and gates

### Phase 0 — Documentation and truth consolidation (closed by P104)

**Goal:** remove ambiguity about what is current, historical, proposed, or superseded without losing requirements.

**Work:**
- Publish the global audit, renovation mandate, this roadmap, and the active renovation task in `docs/`.
- Update `AGENTS.md` and `docs/DOCUMENTATION-INDEX.md` so the new documents are the active entry points.
- Keep permanent operational/security rules in `docs/AI-OPERATING-RULES.md`; do not duplicate the full policy in every roadmap.
- (Done in P104) Completed P81–P103 specs, roadmaps, reports and benchmark snapshots were deleted after live requirements were moved into `OPERATIONS.md` and `architecture-guardrails.md`; tests and CI no longer read documentation prose.
- Machine-readable status vocabulary and baseline evidence are Phase 1 work (P105–P106); do not infer green CI from old reports.

**Gate (met by P104):** one clear active entry point; every live requirement has a canonical source; no active reference to deleted documents; no test or CI step reads documentation prose.

### Phase 1 — Canonical schemas and evidence ledger

**Goal:** one source of truth for intent, impact, verification, evidence, and handoff.

**Deliver:**
- Versioned Intent/Policy Contract, Change/Impact Plan, Verification Plan, Evidence Record, Artifact Manifest, Handoff Report, and Approval Decision schemas.
- A report validator and a single handoff generator.
- Explicit status semantics: `PASS`, `FAIL`, `BLOCKED`, `SKIPPED_BY_POLICY`, `TIMEOUT`, `NOT_RUN`, `UNKNOWN`, `PARTIAL`.
- Evidence provenance: revision, command/check, environment, timestamp, result, relevant log reference, redaction/completeness limits.

**Gate:** missing, malformed, contradictory, or redacted-away critical evidence cannot be reported as a successful claim. Failures in report generation still produce a bounded fallback handoff.

### Phase 2 — Dependency-aware verification and bounded repair (CLOSED by P109)

**Status:** formally accepted 2026-10-26 (Navigator Tier-3 decisions). Implementation P107–P108 + P108.1–P108.3-HF1. Hosted CI green; two-artifact handoff contract operational.

**Goal:** collect maximum useful evidence without unsafe execution.

**Delivered:**
- Verification DAG with declared prerequisites, resource/time limits, and safe parallelism.
- Completion of all independent and safe checks after an unrelated failure.
- Recorded reasons for every blocked or skipped check.
- Fault-injection coverage for timeouts, cancellation, missing logs, partial artifacts, runner interruption, and report-generator failure.
- Bounded repair protocol that preserves gates and re-runs affected regressions.
- Always-on redacted CI diagnostics, five-cycle history, and two-artifact assistant handoff (`BIForge-NEXT-PATCH.md` + `biforge-ci-logs.zip`).

**Gate (met):** tests demonstrate that independent checks complete despite unrelated failures; dependent checks are blocked correctly; repair cannot weaken the conditions being verified. Formal acceptance recorded in P109; remaining risks do not block Phase 3.

### Phase 3 — Intent, policy, provenance, and capability graph

**Goal:** make approved intent the authoritative control plane for implementation and verification.

**Deliver:**
- Versioned Intent/Policy Contract distinguishing explicit requirements, inference, assumptions, constraints, invariants, non-goals, criticality, acceptance criteria, authority and provenance.
- Generated capability graph connecting intent → modules/contracts → state/data → side effects → invariants → tests → evidence → release/rollback.
- Context selection and impact planning backed by this graph rather than overlapping independent inventories.

**Gate:** representative changes have traceability across the graph; unknown or stale context remains explicit; assumptions are never silently upgraded into approved policy.

### Phase 4 — VIX proof-of-value vertical slice

**Goal:** demonstrate VIX's core value in one narrow transactional or ETL/dataflow domain.

**Deliver:**
- Structured Intent IR with provenance and assumptions.
- State model and explicit critical invariants.
- Counter-examples that expose contradiction or ambiguity before execution.
- An executable candidate generated from the approved intent.
- At least one critical invariant checked by a suitable formal method or model checker.
- Evidence distinguishing static validity, behavior verification, invariant verification, and release eligibility.

**Gate:** contradictory/incomplete intent is surfaced before execution; critical `UNKNOWN` blocks release; the Navigator can review consequences without inspecting source code.

### Phase 5 — Governed synthesis and safe evolution

**Goal:** introduce adaptation only after the formalisation and verification path is trustworthy.

**Deliver:**
- Versioned intent diffs and candidate comparisons.
- Sandbox and side-effect isolation.
- Shadow execution, checkpoint/state compatibility contracts, and rollback.
- Explicit protocols for irreversible external effects.
- Auditable admission decisions under VIX's five autonomy levels.

**Gate:** injected transition failures recover safely; no autonomous action exceeds its authority; policy changes remain proposals until approved.

### Phase 6 — Measured autonomy

**Goal:** promote autonomy only when it produces measured value without increasing risk.

**Measure repeatedly:**
- time to correct accepted change;
- Navigator interventions and clarification rounds;
- escaped defects and regression rate;
- false PASS/false FAIL;
- evidence completeness and reproducibility;
- bounded repair success and attempts;
- recovery time and runtime/model cost;
- performance on critical-invariant and adversarial cases.

**Gate:** predefined thresholds are met across representative repeated tasks. Otherwise the capability remains experimental.

## 4. Patch cadence

Every phase is delivered as small, reviewable patches. A phase does not advance merely because its documents or code exist. It advances only when its gate has evidence.

For each patch:
1. state outcome, scope, non-goals and affected invariants;
2. inspect relevant current source and evidence;
3. make one coherent change;
4. run focused checks and all relevant independent safe checks;
5. record exact commands, outcomes, blocked checks and limitations;
6. verify no security/test/acceptance gate was weakened;
7. update `CHANGELOG.md` and `AGENTS.md` only according to repository policy;
8. deliver changed/new files and list deletions/moves separately;
9. provide rollback and compatibility notes;
10. stop for Navigator approval at Tier 2/3 boundaries.

## 5. User-outcome rearchitecture (P113–P120)

The owner reports that all four current modes are functionally unacceptable from the user's perspective. Treat this as a priority signal and reproduce the failures; do not presume root causes before source/log tracing. P113 defines the target; it does not change runtime behavior.

### P113 — User-outcome contract (current)
Exactly three target agents: Conversational Agent; Expert Problem-Solving Agent; Complex Software Architect Agent. Each owns its instructions, orchestration/state machine, model cascade, output contract and end-to-end acceptance suite. Shared low-level infrastructure is allowed. See `AI-USER-VALUE-ARCHITECTURE-P113.md`.

**Gate:** target behavior, audit protocol, acceptance scenarios and migration rules defined. Runtime behavior remains NOT_RUN.

### P114 — End-to-end audit and root-cause map
Reproduce user-reported failure scenarios and trace UI → orchestration → instructions → provider/tools → validation → persistence → UI/artifact delivery. Audit all current modes, shared infrastructure, P110–P112 runtime adoption, dependency risks and known log findings. Rank findings by user harm, recurrence, confidence and leverage.

**Gate:** every current mode has an evidence-linked path; root causes have source/log evidence or remain explicit hypotheses; normal and failure/recovery cases are reproduced or marked NOT_REPRODUCED/NOT_RUN.

### P115 — Conversational Agent recovery
Create/repair the isolated conversational workflow and instruction/cascade policy. Validate direct answers, current information when required, multi-turn context and truthful provider/tool failure handling.

**Gate:** conversational scenarios and user-quality rubric pass; live-provider evidence clearly distinguished from mocked tests.

### P116 — Expert Problem-Solving Agent
Implement durable investigation state, hypothesis/evidence distinction, alternatives, synthesis and action plan; ensure every iteration has a meaningful next action and can recover after failure.

**Gate:** six-turn scenario, state continuity, final action plan and injected failure recovery pass; no dead-end state.

### P117 — Complex Software Architect Agent
Implement requirements → architecture plan → actual files → validation → bounded repair → verified package → user-accessible delivery. Make explicit terminal failures and partial results first-class.

**Gate:** real non-empty artifact is integrity-checked and accessible; declared checks are accurately reported; malformed spec and injected stage failures never become false success.

### P118 — Three-agent separation and migration
Replace four-mode entry points with exactly three agents after each replacement agent's gate. Migrate compatible state and artifacts with integrity/rollback evidence. Remove old routes only after parity and migration acceptance.

**Gate:** every user entry maps to one target agent; no orphaned state/route; all three end-to-end suites pass; rollback is verified.

### P119 — Cross-agent resilience
Based on P114 evidence, address model cascades, instruction conflicts, retries/timeouts/cancellation/listener lifecycle, structured output, crypto/ZIP behavior, dependency vulnerabilities and observability.

**Gate:** every confirmed defect has regression evidence; fault injection yields truthful terminal states; dependency findings have a documented disposition; no gate weakened.

### P120 — User-outcome acceptance and programme closure
Run repeated representative scenarios and measure task completion, answer/problem-solution quality, artifact validity/access, false success, recovery, continuity, freshness, latency/cost and evidence completeness. Set thresholds before the evaluation run.

**Gate:** each agent meets its own acceptance contract; critical NOT_RUN/UNKNOWN cases prevent full acceptance; residual risks and unsupported claims are explicit.

These IDs are a proposed bounded sequence, not automatic authorization. Each patch still requires its own scope, evidence, rollback and approval at the applicable authorization tier.

## 6. Product acceptance principle

Green CI, build success, valid JSON, successful model calls, populated UI panels and internal service health are necessary but insufficient. Acceptance requires evidence that a representative user obtained the intended result. A failure must end in a truthful, actionable user-visible state. Never report a workflow as successful when the intended answer, plan, or artifact was not delivered.

No source-code rewrite, production action, GitHub write, permission change, or generated-code execution is authorized by this roadmap.
