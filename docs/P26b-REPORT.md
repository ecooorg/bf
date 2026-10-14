# P26b REPORT — ChangeSet and export

**Date:** 2026-10-14  
**Base:** `bf-v26a2` (CI green)  
**Status:** core library **DONE**; UI ChangeSet card / conversation wiring **NOT_RUN** (follow-up).

## Delivered

- `src/workspace/diff.ts` — line diff, EOL detect/restore, unified diff per file.
- `src/workspace/changeset.ts` — validate + apply ChangeSet (`create` / `modify` with `edits` or `content` / `delete` / `rename`); `baseSha256`; profiles `workspace` (CI/lock needs `confirmCiLock`) and `strict`; secrets via `findSecretRules`; `createEmptyWorkspace`; `rollbackWorkspace`.
- `src/workspace/exportZip.ts` — full / changed / diff export; deterministic zip (fixed 1980-01-01 UTC); `BIFORGE-CHANGES.md` for changed mode.
- Tests: `tests/workspace-changeset.test.mjs`, `tests/workspace-export.test.mjs`.
- `package.json`: `test:p26b` in `check`.
- Docs: this report, `P26b-SPEC.md`; `CURRENT_STATE.md`, `NEXT.md`, `CHANGELOG.md` updated.

## Checks

| Check | Result | Evidence |
| --- | --- | --- |
| `node --experimental-strip-types tests/workspace-changeset.test.mjs` | PASS | AC-07…09, AC-15 |
| `node --experimental-strip-types tests/workspace-export.test.mjs` | PASS | AC-10, AC-11 |
| `npm run test:p18` | NOT_RUN here | codeExecutor not modified |
| Full `npm run check` / CI | Pending push | Owner: run after upload |
| AC-07 UI card «Применить» | NOT_RUN | Library only |
| Live `git apply --check` on exported `.diff` | NOT_RUN | Diff is unified; confirm on host with git |

## Deliberately deferred

- FW-41 chat UI (card, buttons Apply/Reject/Download diff).
- Server routes `/api/.../changesets` (P26c).
- Moving `parseUnifiedDiff` out of `server/codeExecutor.ts` (avoids risking `test:p18` in this patch).
- Auto-compression of old versions (FW version GC).

## Navigator

1. Upload this tree; confirm CI includes `test:p26b` green.
2. Next agent work only on owner command: wire ChangeSet card in Simple/Expert, or start P26c.
