# P26b SPEC — ChangeSet, export, create-from-scratch

**Goal:** Validate and apply workspace ChangeSets; export full / changed / unified diff; empty Workspace + seed files (AC-07…AC-11, AC-15). Simple/Expert UI cards are not required for this gate; core is library-level and test-backed.

## Scope

| Module | Responsibility |
| --- | --- |
| `src/workspace/diff.ts` | `lineDiffStats`, EOL helpers, `unifiedDiffForFile` |
| `src/workspace/changeset.ts` | `workspaceChangeSet` validate/apply; profiles `strict` \| `workspace`; limits 20/1500 (hard ceiling param); `createEmptyWorkspace`; `rollbackWorkspace` |
| `src/workspace/exportZip.ts` | Deterministic zip (fixed UTC DOS time), changed zip + `BIFORGE-CHANGES.md`, unified `.diff` |

Out of scope for this slice: Project Mode routes (P26c), GitHub branch (P26d), full chat UI ChangeSet card (FW-41 UI — follow-up), extracting `server/codeExecutor.ts` into shared module (left as-is so `test:p18` stays green; workspace has its own pure helpers).

## Acceptance mapping

| AC | Covered by |
| --- | --- |
| AC-07 | `tests/workspace-changeset.test.mjs` valid edits → version N+1 |
| AC-08 | same: stale sha, unsafe path, `.git`, secrets, CI/lock confirm, too many files, find not unique |
| AC-09 | CRLF file edit + rollback restores original sha256 |
| AC-10 | `tests/workspace-export.test.mjs` double full export same hash; byte identity via JSZip when present |
| AC-11 | changed zip has `BIFORGE-CHANGES.md`; `.diff` contains unified hunks |
| AC-15 | `createEmptyWorkspace` seeds version 1 |

## Limits (FW-39)

- Profile `workspace` default: 20 files, 1500 changed lines, 1 MB/file.
- Profile `strict`: 10 / 400 (Task Package parity).
- `hardMaxFiles` / `hardMaxChangedLines` raise the ceiling beyond defaults without hard-coding 10/400.

## Tests

- `npm run test:p26b` → changeset + export suites; wired into `npm run check`.
