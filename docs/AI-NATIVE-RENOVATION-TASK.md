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


