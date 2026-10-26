# AI-NATIVE-RENOVATION — Global Roadmap

**Status:** Active strategic programme  
**Owner:** Navigator  
**Normative strategic destination:** `VIX-CONCEPT.md`  
**Audit basis:** `AI-NATIVE-GLOBAL-AUDIT-2026-10.md`  
**Renovation mandate:** `AI-NATIVE-RENOVATION-MANDATE.md`  
**Current phase:** Phase 2 — verification as a graph (Phase 0 closed by P104; Phase 1 closed by P105–P106; Phase 2 acceptance PENDING; P108.2 CI archive verification is a prerequisite before P109)  
**Rule:** one bounded patch at a time; preserve safety; report evidence honestly.

## 1. North star

BiForge is to become a governed, evidence-driven, AI-native system that translates approved intent into safe, verified, recoverable change while keeping the Navigator out of source code, file layout, and raw CI diagnostics.

The target is not “more AI tools.” It is one coherent lifecycle:

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

### Phase 2 — Dependency-aware verification and bounded repair

**Current status:** implementation P107–P108 exists; formal acceptance is PENDING. P108.2 adds always-on CI diagnostics and five-cycle history. Before P109, verify artifact availability after both green and red CI; do not infer this from a single run.

**Goal:** collect maximum useful evidence without unsafe execution.

**Deliver:**
- Verification DAG with declared prerequisites, resource/time limits, and safe parallelism.
- Completion of all independent and safe checks after an unrelated failure.
- Recorded reasons for every blocked or skipped check.
- Fault-injection coverage for timeouts, cancellation, missing logs, partial artifacts, runner interruption, and report-generator failure.
- Bounded repair protocol that preserves gates and re-runs affected regressions.

**Gate:** tests demonstrate that independent checks complete despite unrelated failures; dependent checks are blocked correctly; repair cannot weaken the conditions being verified.

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

## 5. Current next action

Phase 0 is closed by P104. Continue with P105–P108 as specified in `AI-NATIVE-RENOVATION-TASK.md`.

No source-code rewrite, production action, GitHub write, permission change, or generated-code execution is authorized by this roadmap.
