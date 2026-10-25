# AI-NATIVE-RENOVATION — Global Roadmap

**Status:** Active strategic programme  
**Owner:** Navigator  
**Normative strategic destination:** `VIX-CONCEPT.md`  
**Audit basis:** `AI-NATIVE-GLOBAL-AUDIT-2026-10.md`  
**Renovation mandate:** `AI-NATIVE-RENOVATION-MANDATE.md`  
**Current phase:** Phase 0 — establish one authoritative source of truth  
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
10. Archive only documents that have been mapped to the new canonical sources. The initial archive list is a manual migration list; do not delete source requirements or move files automatically without checking references.

## 3. Phases and gates

### Phase 0 — Documentation and truth consolidation (current)

**Goal:** remove ambiguity about what is current, historical, proposed, or superseded without losing requirements.

**Work:**
- Publish the global audit, renovation mandate, this roadmap, and the active renovation task in `docs/`.
- Update `AGENTS.md` and `docs/DOCUMENTATION-INDEX.md` so the new documents are the active entry points.
- Keep permanent operational/security rules in `docs/AI-OPERATING-RULES.md`; do not duplicate the full policy in every roadmap.
- Prepare `ARCHIVE-MOVE-LIST.md` with each proposed move, reason, replacement canonical source, and reference-check requirement.
- Manually move the listed completed P81–P103 technical specifications/reports into root `archive/` only after confirming that no active links, scripts, tests, or operational instructions depend on their current paths.
- Update links after manual moves. Do not archive VIX, permanent AI operating rules, current operations, user guide, architecture guardrails, generated current inventories, or unresolved owner decisions.
- Establish a machine-readable status vocabulary and current baseline commit/CI evidence in a later evidence patch; do not infer green CI from an old archive.

**Gate:** one clear active entry point; every live requirement has a canonical source; archive candidates are listed rather than silently removed; all moved-document references are either updated or intentionally preserved as historical links.

### Phase 1 — Canonical schemas and evidence ledger

**Goal:** one source of truth for intent, impact, verification, evidence, and handoff.

**Deliver:**
- Versioned Intent/Policy Contract, Change/Impact Plan, Verification Plan, Evidence Record, Artifact Manifest, Handoff Report, and Approval Decision schemas.
- A report validator and a single handoff generator.
- Explicit status semantics: `PASS`, `FAIL`, `BLOCKED`, `SKIPPED_BY_POLICY`, `TIMEOUT`, `NOT_RUN`, `UNKNOWN`, `PARTIAL`.
- Evidence provenance: revision, command/check, environment, timestamp, result, relevant log reference, redaction/completeness limits.

**Gate:** missing, malformed, contradictory, or redacted-away critical evidence cannot be reported as a successful claim. Failures in report generation still produce a bounded fallback handoff.

### Phase 2 — Dependency-aware verification and bounded repair

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

Complete Phase 0 documentation consolidation and archive migration. The initial task is specified in `AI-NATIVE-RENOVATION-TASK.md`. The archive migration list is `../ARCHIVE-MOVE-LIST.md` relative to the repository root.

No source-code rewrite, production action, GitHub write, permission change, or generated-code execution is authorized by this roadmap.
