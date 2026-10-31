# Active Decisions

## D-2026-10-31-03 — Launch C122: Expert Mode Reliability, Intelligence Quality & Decision Engineering

**Decision (owner-directed via BiForge-Cycle-C122 technical specification):**
1. Development cycle C122 is approved and becomes the active programme. Product version advances to 122.
2. Primary target is Expert Mode. The four patches are P122.1 (State Integrity & Persistence), P122.2 (Analytical Reliability & Evidence Integrity), P122.3 (Execution Reliability & Workflow Continuity), P122.4 (Decision Quality, User Experience & Final Validation).
3. Architect development is frozen for the duration of C122. The selected legacy Architect remains operational; no feature work, prompt changes, or parallel Lab development.
4. Conversational Mode is out of scope for C122. Shared components may be touched only when strictly necessary for Expert reliability and with demonstrated backward compatibility.
5. Existing architecture is preserved unless a demonstrated defect requires change. Refactoring is incremental, evidence-based, and minimal.
6. Every C122 patch must eliminate a demonstrated defect, improve a measurable Expert capability, improve reliability/integrity of expert data or conclusions, improve the user's ability to complete a decision process, or provide evidence that an existing capability works under realistic conditions.
7. Documentation integration: C122 mandate content is distributed into TECHNICAL_SPECIFICATION.md (normative contract and requirements), ROADMAP.md (control section and sequence), this file (decision record), TESTING_AND_ACCEPTANCE.md, USER_VALUE_EVALUATION.md, CHANGELOG.md, and TECHNICAL_REPORT.md as applicable. No new top-level documentation files.
8. Delivery remains minimal-diff ZIPs of only changed/added repository files; AGENTS.md Hard Gates apply.
9. C122 is not complete after four technical patches if real analytical results remain mediocre. Both deterministic tests and real-model evaluation scenarios are required.

**Rationale:** Expert Mode is a functional analytical prototype whose reliability, persistence, evidence integrity, and decision quality require systematic strengthening before it can be trusted as a decision-support system. Architect has been selected and is operationally sufficient for the current stage; further Architect work is deferred to a later product-wide optimization phase.

**Authority:** Owner-supplied BiForge-Cycle-C122 technical specification (approved). Supersedes prior P121 Architect-primary direction for the duration of C122.

**Effect:** All subsequent C122 work must follow the four-patch sequence and the acceptance criteria defined in the cycle mandate. Architect and Conversational boundaries must be protected.

## D-2026-10-31-02 — Select legacy Architect as the single active implementation

**Decision (owner-directed, supersedes D-2026-10-30-08):**
1. The legacy Architect / ProjectMode is the primary Architect at `/project`; `/architect` is an alias to the same workflow.
2. Architectural Test Lab (`/architect-lab`) is frozen for diagnostic reproducibility. Do not develop or repair it in parallel with the selected primary.
3. Compare generated artifacts and reliability evidence, not model names or completion claims alone. Prefer a valid, usable artifact; weigh syntax/runtime validity, reference/DOM wiring, acceptance checks, completeness, and recovery behavior.
4. Shared engine fixes that improve the selected primary are in scope, especially validators and repair logic that can incorrectly report SUCCESS.
5. Re-evaluate only when newer comparable evidence is available; preserve previous decisions and evidence.

**Evidence (2026-10-31 supplied build reports):** the legacy Expense Tracker reports `SUCCESS`, `goalImplemented=true`, and all seven declared validators passing (6 model calls, 42.4 s). The Lab reports `PARTIAL`, `goalImplemented=false`, with JavaScript syntax and file-reference failures (10 calls, 52.8 s). Diagnostics corroborate a prior Lab failure due to provider cooldown. Static inspection of the legacy artifact found a validator blind spot: multiple distinct controller properties were repaired to reuse the same DOM id. This patch adds detection for that defect class. Browser/mobile user outcome remains NOT_RUN; selection is final as the development direction, not a claim that every generated artifact is proven correct.

**Note:** During C122 this decision remains in force for the identity of the selected Architect, but further development of that Architect is frozen (see D-2026-10-31-03).

