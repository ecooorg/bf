# P27 SPEC — Simple Mode workspace attach UI

**Product version:** remain **24** unless the owner orders a label bump.  
**Normative refs:** `docs/BiForge_TZ_P26.md` FW-50 (Simple part), NF-03 privacy; helpers already in `src/workspace/*` (P26a / P26a.2).  
**Out of scope:** Expert Mode, conversation `needFiles` loop, ChangeSet card, export buttons, Project Mode, Railway, `model_patch`.

## Goal

In **Simple Mode** only, the user can attach a **zip / tar / tar.gz** or a **folder**, see ingest progress/errors, accept **privacy**, and see a **project card** plus a **read-only file tree** backed by `IndexedDbWorkspaceStore` (or memory in tests).

## Must

1. Entry point next to existing attach control: accept archives and directories (browser capabilities as available on desktop; on mobile document what is NOT_RUN).
2. Call existing `ingestArchive` / `ingestFiles`; show skipped/rejected reasons from the report (no secrets).
3. Persist workspace in IndexedDB via existing adapter; set `privacyAck` only after explicit user confirmation (NF-03 copy RU/EN via existing i18n patterns).
4. UI: card with name, file count, languages summary, skipped count; panel with tree (virtualize only if already cheap — not mandatory in P27).
5. File open = read-only text view for editable text entries; binary = metadata only.
6. Tests: component or integration level that does not require a real browser if impractical — at minimum pure tests for any new glue functions; document UI checks as manual/NOT_RUN on Android if needed.
7. `npm run check` green; `docs/P27-REPORT.md` with date and CI note.
8. Update `docs/CURRENT_STATE.md` **Next agent patch** → **P28** only if the owner’s command allowed advancing the pointer; otherwise leave P27 closed and pointer for the owner to move.

## Must not

- Change default executor or server routes.
- Implement ChangeSet apply UI (P29).
- Expert Mode parity (P28).
- Expand `TEXT_EXT` / ingest rules unless a bug blocks attach.

## PASS

| ID | Criterion |
| --- | --- |
| P27-1 | User can ingest a small synthetic zip in Simple and see card + tree |
| P27-2 | Without privacy ack, workspace text is not sent to the model builder APIs (guard on existing `buildWorkspaceBlock` or equivalent) |
| P27-3 | CI green including existing `test:p26a` / `test:p26a2` / `test:p26b` |
| P27-4 | Report lists files touched and known NOT_RUN (e.g. iOS folder pick) |

## Size

Aim for **about half a free agent session** of implementation; leave the rest of the session for discussion and CI fixes. If scope slips, cut tree virtualization and Expert — do not pull P28 work in.
