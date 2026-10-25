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
"""

# AI-NATIVE-RENOVATION — Phase 0 Technical Assignment

**Task ID:** ANR-P0-001  
**Status:** Active  
**Priority:** P1 — establish a reliable operating baseline before architecture changes  
**Normative references:** `VIX-CONCEPT.md`, `AI-NATIVE-RENOVATION-MANDATE.md`, `AI-NATIVE-RENOVATION-ROADMAP.md`, `AI-NATIVE-GLOBAL-AUDIT-2026-10.md`  
**Scope:** documentation and navigation only, plus the explicitly listed manual archival operation  
**Not authorized:** source-code changes, database/migration changes, security-gate changes, production deployment, GitHub writes, permission changes, generated-code execution.

## 1. Objective

Establish one unambiguous active documentation path for the AI-NATIVE-RENOVATION programme, while preserving completed technical history in the root `archive/` directory.

The Navigator should be able to give an AI agent the active entry instructions and this task/roadmap, without requiring the agent to reconstruct current direction from completed P81–P103 specifications and reports.

## 2. Required deliverables

1. `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md` — findings and evidence limits.
2. `docs/AI-NATIVE-RENOVATION-MANDATE.md` — global architectural assignment and safety/acceptance rules.
3. `docs/AI-NATIVE-RENOVATION-ROADMAP.md` — phases, deliverables, and evidence gates.
4. `docs/AI-NATIVE-RENOVATION-TASK.md` — current executable task with scope, checks and done criteria.
5. Updated `AGENTS.md` with the active programme entry point and current phase.
6. Updated `docs/DOCUMENTATION-INDEX.md` with canonical active documents and a short historical-document policy.
7. Updated `CHANGELOG.md` with patch identifier, changes and verification limitations.
8. Root `ARCHIVE-MOVE-LIST.md` — explicit manual list of completed/historical documents, replacement canonical source, and safe-move procedure.
9. A patch ZIP containing only changed/new files and a manifest; no automatic deletion or movement of legacy documents in this patch.

## 3. Archival policy

The first migration is a documentation relocation, not content destruction.

- Move completed phase-specific technical assignments, status reports, benchmark snapshots and superseded roadmaps to `archive/` only after checking references.
- Preserve each file's original basename where possible; use a stable `archive/` prefix or subfolder only if needed to avoid collisions. The repository's existing preference is a flat archive, so do not create a deep archive hierarchy without a reason.
- Keep the original content and dates. Do not rewrite historical reports to make them appear current.
- Replace active navigation links with links to the new roadmap/mandate and, where history is useful, to the archived copy.
- Before moving each file, search source, tests, package scripts, workflows, README, AGENTS, docs and generated reports for references to its path.
- If an active tool, test, workflow or current requirement depends on a legacy file path, do not move it until that dependency has been migrated and verified.
- Do not archive `VIX-CONCEPT.md`, `AI-OPERATING-RULES.md`, `OPERATIONS.md`, `USER-GUIDE.md`, current architecture guardrails, generated current inventories, unresolved decisions, or any file that remains the sole source of an active contract.
- Do not delete files in Phase 0. Relocation only; deletions require a later explicit inventory and approval.

## 4. Scope and implementation steps

1. Read `AGENTS.md`, `docs/AI-OPERATING-RULES.md`, `docs/VIX-CONCEPT.md`, the global audit, and the renovation mandate.
2. Publish the audit and mandate under `docs/` so the repository, not a chat attachment, owns the canonical copies.
3. Add the new roadmap and this task.
4. Update the entry-point and index to identify the active programme and keep permanent safety rules authoritative.
5. Add the root archive move list. Group entries as:
   - completed technical tasks/specifications;
   - completed roadmap/status reports;
   - historical benchmark and verification snapshots;
   - review-required candidates.
6. For each candidate, state the replacement canonical document and reference-check requirements.
7. Append a changelog entry and update the current status in `AGENTS.md`.
8. Validate links, markdown consistency and the patch file manifest.
9. Deliver a ZIP of changed/new files and the manual archival checklist. Do not claim the manual moves have happened until the Navigator or an authorized tool performs them.

## 5. Verification

Required checks where the repository environment permits:
- Markdown link/path scan for changed documents.
- Confirm all listed deliverable files exist in the patch.
- Confirm no files are silently deleted or moved in the patch.
- Confirm `VIX-CONCEPT.md` and permanent security/authorization rules remain active and unchanged.
- Confirm the patch does not alter application source, package scripts, CI workflows, migrations or runtime behavior.

If dependencies are unavailable, do not install them merely for this documentation-only task. Mark dependency-backed checks `NOT RUN` and state why. Do not claim full CI passed based on static inspection.

## 6. Definition of done

Phase 0 documentation preparation is complete when:
- all four canonical AI-NATIVE-RENOVATION documents exist in `docs/`;
- `AGENTS.md` and `DOCUMENTATION-INDEX.md` point to them as the active source of truth;
- the archive list is complete enough for a safe manual migration;
- every proposed move has a reason and replacement source;
- no legacy file has been moved/deleted without the explicit manual archival step;
- changed/new paths and exact verification results are delivered.

Phase 0 archival execution remains open until manual moves are completed and their references are rechecked. This distinction must remain visible in the handoff.


# Manual Archive Migration List — AI-NATIVE-RENOVATION Phase 0

**Purpose:** move completed or superseded technical documents from `docs/` into the root `archive/` directory after reference checks.  
**Status:** proposed checklist; **no listed files have been moved by this patch**.  
**Safety rule:** do not move a file while a live source, test, workflow, script, or current operational instruction depends on its path or unique requirements.

## Canonical documents that remain active

Do **not** move these:
- `AGENTS.md`
- `docs/AI-OPERATING-RULES.md`
- `docs/VIX-CONCEPT.md`
- `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md`
- `docs/AI-NATIVE-RENOVATION-MANDATE.md`
- `docs/AI-NATIVE-RENOVATION-ROADMAP.md`
- `docs/AI-NATIVE-RENOVATION-TASK.md`
- `docs/OPERATIONS.md`
- `docs/USER-GUIDE.md`
- `docs/architecture-guardrails.md`
- current generated inventories and their generator/check scripts
- unresolved policy/architecture decisions until migrated to an approved canonical source.

## Group A — completed P81–P91 implementation specifications

Move only after checking all references and preserving any unique active requirements in the canonical renovation documents.

| Current path | Why candidate | Canonical replacement / retained source |
|---|---|---|
| `docs/TASK-CONTEXT-P85.md` | Completed phase-specific tool spec | Global audit; renovation mandate; roadmap |
| `docs/CHANGE-IMPACT-P86.md` | Completed phase-specific tool spec | Global audit; renovation mandate; roadmap |
| `docs/VERIFICATION-PLANNER-P87.md` | Completed phase-specific tool spec | Global audit; renovation mandate; roadmap |
| `docs/REAL-TASK-BENCHMARK-P88.md` | Completed benchmark pilot spec | Global audit; renovation mandate; roadmap; benchmark workstream |
| `docs/INTENT-CONTRACT-P89.md` | Prior draft-contract spec; superseded as strategic direction | Renovation mandate W1/W2; roadmap Phase 3 |
| `docs/CONTEXT-REFRESH-P90.md` | Completed profiler spec | Global audit; roadmap |
| `docs/CONTEXT-COMPLETENESS-P91.md` | Completed guard spec | Global audit; mandate evidence semantics |
| `docs/AI-NATIVE-ROADMAP-P81-P84.md` | Superseded phase roadmap | Global audit; renovation roadmap |
| `docs/AI-NATIVE-ROADMAP-P85-P91.md` | Superseded phase roadmap | Global audit; renovation roadmap |

## Group B — accepted transformation plan and completed audits

These documents may contain useful history. Preserve them unchanged in `archive/`; do not discard them.

| Current path | Why candidate | Canonical replacement / retained source |
|---|---|---|
| `docs/AI-TRANSFORMATION-SPEC.md` | Prior transformation phases marked accepted/closed; replaced as active programme mandate | `docs/AI-NATIVE-RENOVATION-MANDATE.md`; `docs/AI-NATIVE-RENOVATION-ROADMAP.md` |
| `docs/DOCUMENTATION-BASELINE.md` | Historical baseline report | `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md` (new baseline is not a byte-for-byte replacement) |
| `docs/test-audit-p103.md` | Completed P103 test audit | Global audit, plus changelog history |
| `docs/PROJECT-MODE-DIAGNOSTICS-ROADMAP.md` | Historical proposal tied to P85–P91 roadmap | Renovation mandate; roadmap |
| `docs/tz-appbuilder.md` | Phase-specific App Builder technical spec; review before moving | Renovation mandate W6; VIX Stage I |

## Group C — historical benchmark and verification snapshots

These are evidence snapshots, not current status. Archive them only if current tooling does not read their existing paths.

| Current path | Why candidate | Required check |
|---|---|---|
| `docs/context-locality-p82.json` | Historical P82 benchmark | Search scripts/tests/workflows/docs for exact path |
| `docs/contracts-verification-p83.json` | Historical P83 verification record | Search scripts/tests/workflows/docs for exact path |
| `docs/context-benchmark-p84.json` | Historical P84 benchmark | Search scripts/tests/workflows/docs for exact path |
| `docs/context-benchmark-verification-p84.json` | Historical P84 verification record | Search scripts/tests/workflows/docs for exact path |
| `docs/context-baseline-v80.json` | Frozen pre-P81 baseline; retain as historical evidence | Search references; if moved, preserve explicit historical designation |
| `docs/generated-acceptance-summary.json` | Generated report; may be consumed by tools | **Review required:** inspect generator/consumer before any move |
| `docs/generated-boundary-report.json` | Generated report; may be consumed by tools | **Review required:** inspect generator/consumer before any move |
| `docs/generated-env-inven
