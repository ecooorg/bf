# P27 REPORT — Simple Mode workspace attach UI

**Date:** 2026-10-14  
**Base:** `bf-v26.zip`  
**Product version:** 24 (unchanged)

## Done

- `src/workspace/persistIngest.ts` — persist `IngestResult` into any `WorkspaceStore`; language summary; `canBuildWorkspaceContext` privacy guard.
- `src/WorkspacePanel.tsx` — Simple Mode UI: archive (zip/tar/tgz) and folder pick, progress/errors, project card, privacy acknowledgement, skipped list, read-only tree + text/binary view.
- Wired into Simple Mode brief + conversation entry (`src/App.tsx`) next to existing `FilesPanel`.
- Styles in `src/index.css`.
- Tests: `tests/workspace-p27.test.mjs` (`npm run test:p27`); included in `npm run check`.
- `docs/REPO_MAP.md`, journal, CURRENT_STATE notes.

## PASS mapping

| ID | Result |
| --- | --- |
| P27-1 | UI + persist path for synthetic zip/folder (manual UI on device; glue covered by tests) |
| P27-2 | `canBuildWorkspaceContext(false) === false` — no model block without ack (P28 will wire `buildWorkspaceBlock`) |
| P27-3 | Existing p26 tests unchanged; new `test:p27` |
| P27-4 | Folder pick NOT_RUN on browsers without `webkitdirectory` (message in UI; typical Android Chrome) |

## Out of scope (as SPEC)

Expert Mode, needFiles loop, ChangeSet card, export buttons, Project Mode, Railway.

## Owner

CI: run `check-and-build` on main after upload.  
Advance **Next agent patch** to **P28** when ready (`docs/CURRENT_STATE.md`).
