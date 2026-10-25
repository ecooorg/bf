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
| `docs/generated-env-inventory.json` | Current generated inventory | **Do not move** while active as current inventory |
| `docs/generated-migration-inventory.json` | Current generated inventory | **Do not move** while active as current inventory |
| `docs/generated-module-map.json` | Current generated inventory | **Do not move** while active as current inventory |
| `docs/generated-route-inventory.json` | Current generated inventory | **Do not move** while active as current inventory |

## Group D — review required; do not move in the first pass

| Current path | Reason to hold |
|---|---|
| `docs/architecture-boundary-rules.json` | Active architecture policy input |
| `docs/architecture-known-violations.json` | May be active ratchet baseline |
| `docs/typing-and-naming.md` | May still guide current changes; check whether its requirements are covered by permanent rules |
| `docs/generated-*` files | Check whether generator/check scripts or CI expect their current paths |
| `docs/architecture-boundary-rules.json`, `docs/architecture-known-violations.json` | Do not archive policy or ratchet inputs while enforcement consumes them |

## Manual procedure

For each file approved for relocation:

1. Search all repository files for the exact current path and basename.
2. Inspect any code/test/workflow/script consumer. If a live consumer exists, migrate that consumer first in a separate patch.
3. Move the file to `archive/<original-basename>`; preserve content and original headings/dates.
4. Update only links that are meant to remain navigable. Historical documents may retain historical references, but active navigation must point to canonical current documents.
5. Run Markdown/link checks and any impacted tests.
6. Add a changelog note listing moved paths.
7. Recheck the generated patch manifest and ensure no source contract was lost.
8. Mark the row complete only after the move and checks actually happened.

**Do not use this list as permission to bulk-move every candidate at once.** Some documents may still be referenced by tools, tests, or generated inventories.


## Active programme — AI-NATIVE-RENOVATION

* **Current phase:** Phase 0 — documentation and source-of-truth consolidation. The current delivery task is `docs/AI-NATIVE-RENOVATION-TASK.md`; the phase plan is `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.
* **Normative programme documents:** `docs/AI-NATIVE-RENOVATION-MANDATE.md` and `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md`.
* **Strategic destination:** `docs/VIX-CONCEPT.md` remains the long-horizon VIX target. It informs direction but does not authorize every VIX subsystem for immediate implementation.
* **Archive status:** `ARCHIVE-MOVE-LIST.md` is a manual checklist. Candidate historical documents are not considered archived until moved after reference checks. Do not bulk-move files or remove unique active requirements.
* **Evidence rule:** the Navigator reports current CI as green, but each patch must use evidence for its actual commit/run. Historical red runs do not establish current status, and this archive snapshot is not proof of the live CI state.
* **Delivery rule:** continue to deliver one bounded patch at a time. Phase transitions require their stated evidence gates; do not advance a phase just because documentation or code exists.

## Active programme — AI-NATIVE-RENOVATION" 

"docs/DOCUMENTATION-INDEX.md"

# Documentation Index

Start with repository-level `AGENTS.md`. Read only documents relevant to the task.

## Active AI-NATIVE-RENOVATION programme

* `AI-NATIVE-RENOVATION-TASK.md` — current Phase 0 task and completion criteria.
* `AI-NATIVE-RENOVATION-ROADMAP.md` — programme phases, deliverables and evidence gates.
* `AI-NATIVE-RENOVATION-MANDATE.md` — global architecture assignment and non-negotiable rules.
* `AI-NATIVE-GLOBAL-AUDIT-2026-10.md` — audit findings, evidence limits, and prioritised risks.
* `VIX-CONCEPT.md` — long-horizon strategic destination, including Intent Review, formal verification, Dataflow synthesis and safe evolution.
* `AI-OPERATING-RULES.md` — permanent AI operating, authorization, security and evidence rules.

## Other active product and operational documents

* `../AGENTS.md` — repository entry point, current programme status and authorization boundaries.
* `OPERATIONS.md` — operational, deployment, rollback and backup guidance.
* `USER-GUIDE.md` — product usage for Simple, Expert and Project modes.
* `architecture-guardrails.md` — current architecture map, boundaries and inventory commands.
* `architecture-boundary-rules.json` / `architecture-known-violations.json` — architecture enforcement policy and ratchet baseline; review before moving.
* `typing-and-naming.md` — current coding conventions, pending confirmation during Phase 0.
* `generated-route-inventory.json`, `generated-env-inventory.json`, `generated-migration-inventory.json`, `generated-module-map.json` — generated inventories; do not hand-edit.
* `context-baseline-v80.json` — frozen historical baseline, not a current generated inventory.

## Historical material and archive policy

The following phase-specific reports and roadmaps are candidates for relocation into root `archive/`: P81–P91 roadmaps/specifications, the accepted `AI-TRANSFORMATION-SPEC.md`, the documentation baseline, the P103 test audit, the Project Mode diagnostics proposal, and historical benchmark/verification snapshots.

**No candidate is archived until its exact path and basename have been checked against code, tests, scripts, workflows, package scripts and active documentation.** The root `ARCHIVE-MOVE-LIST.md` is the manual checklist. Preserve original contents and dates; do not delete historical evidence.

During Phase 0, the old files remain in place so the new entry points can be applied safely. Once manual moves are completed, update this index and the changelog to reflect the actual paths.

## Generated inventories

Regenerate current inventories with `npm run docs:generate`; validate them with the repository's documentation checks. Do not hand-edit generated files.


"docs/DOCUMENTATION-INDEX.md"

"CHANGELOG.md"

## ANR-P0-001 — start AI-NATIVE-RENOVATION and consolidate documentation entry points

- Establishes the active AI-NATIVE-RENOVATION programme, with VIX retained as the long-horizon strategic destination.
- Adds the global audit, renovation mandate, global roadmap, and Phase 0 technical assignment under `docs/`.
- Updates `AGENTS.md` and `docs/DOCUMENTATION-INDEX.md` to point to the new canonical programme documents.
- Adds `ARCHIVE-MOVE-LIST.md` as a manual, reference-checked migration checklist for completed phase documentation.
- No application source, package scripts, CI workflows, migrations, security controls, or runtime behavior are changed.
- Archive moves are intentionally not executed by this patch. The listed documents remain in their current paths until manual reference checks and moves are completed.
- Verification: documentation-only static consistency checks performed during patch assembly; repository Markdown checker and full CI are NOT RUN in this preparation environment.


## Added
- `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md`
- `docs/AI-NATIVE-RENOVATION-MANDATE.md`
- `docs/AI-NATIVE-RENOVATION-ROADMAP.md`
- `docs/AI-NATIVE-RENOVATION-TASK.md`
- `ARCHIVE-MOVE-LIST.md`

## Modified
- `AGENTS.md`
- `CHANGELOG.md`
- `docs/DOCUMENTATION-INDEX.md`

## Deleted or moved
- None. Manual archival candidates are enumerated in `ARCHIVE-MOVE-LIST.md`.

## Scope guarantees
- No application source, package scripts, CI workflows, database migrations, production configuration, security controls, or runtime behavior changed.
- No current VIX concept or permanent operating rules were moved.
- Current CI status was not independently queried. The user reports CI green; full CI was not run as part of this documentation patch.

## Required follow-up
- Apply these files at the repository root, preserving paths.
- Review and execute `ARCHIVE-MOVE-LIST.md` manually, one group at a time, only after exact-reference checks.
- Run the repository's documentation checks and current CI after applying.

