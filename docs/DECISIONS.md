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

## D-2026-10-30-07 — Navigator protocol: Patch ZIP purity, tablet-only channel, automate first

**Decision (owner-directed):**
1. Patch ZIP purity: a delivery ZIP contains only repository files that are new or content-changed in that delivery, each at its exact repository-relative path. No PATCH_SUMMARY, README, apply guides, manifests, scripts, reports, logs, or other helpers. Apply notes, deletion lists, and verification limits go in chat only.
2. Navigator channel: every `FOR_NAVIGATOR` procedure assumes an Android tablet with the GitHub web UI, Actions, workflow logs, and an optional mobile browser. It never requires a local terminal, `npm`, or `node`.
3. Automate when possible: checks that can run in CI are added to `tests/` and/or `.github/workflows/` so the Navigator relies on Actions rather than manual technical steps.

**Effect:** Binding rules live in `AGENTS.md` (G1–G3) and `docs/TESTING_AND_ACCEPTANCE.md` (Navigator verification channel). Regression: `tests/p121-navigator-protocol.test.mjs` in `test:core`.

## D-2026-10-30-03 — Product acceptance is user outcome; evidence is labeled

**Decision (owner-directed):**
1. User outcomes are the primary product criterion. Tests, CI, deployment, and architecture checks are supporting evidence and are reported separately from user outcomes (`BIO-006`).
2. Evidence is labeled as OBSERVED, INFERRED, or NOT_RUN and tied to a commit. Absent evidence is unknown and is never reported as passing (`docs/USER_VALUE_EVALUATION.md`).

## D-2026-10-30-02 — Architect is one agent, one flow, one completion contract

**Decision (owner-directed):**
1. Architect is one user-facing agent with one state machine, one user flow, and one completion contract (`BIO-004`, `REQ-AGENT-002`).
2. There is no novice/professional mode choice. Beginner-friendly wording and advanced controls are adaptive presentation inside the same flow, not a mode switch.
3. All paths converge on the same task/specification, plan validation, artifact generation, validation, status, and delivery contract.

**Effect:** Implemented in the client by P121.0.7 (guided start is the single entry; the path chooser is unused). The C122 Architect freeze does not relax this decision.

## D-2026-10-30-01 — Canonical documentation topology and session governance

**Decision (owner-directed):**
1. Normative authority is consolidated into `AGENTS.md`, `TECHNICAL_SPECIFICATION.md`, `ROADMAP.md`, and `TECHNICAL_REPORT.md`, with specialist documents under `docs/`. `docs/VIX-CONCEPT.md` is strategy-only context.
2. There is no persistent `NEXT_PATCH.md` or other next-patch assignment file. CI evidence may suggest a fix but never assigns the next session's task.
3. Superseded prose documents are deleted once their current rules are consolidated. History in `CHANGELOG.md` and `TECHNICAL_REPORT.md` is preserved, not rewritten.
4. `scripts/docs-integrity.mjs` enforces this topology and the markers above.

**Provenance note:** The original texts of D-2026-10-30-01 through -03 were dropped from this file during the C122 rewrite (P122.x), which broke `docs:integrity`. They were restored in P122.4 from the content recorded in `AGENTS.md`, `CHANGELOG.md`, `TECHNICAL_REPORT.md`, and `scripts/docs-integrity.mjs`. If the original wording is needed verbatim, take it from the repository history of this file.
