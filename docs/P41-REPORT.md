# P41 — UI1 mode start screen

## Status
`PARTIAL` — archive verification and the focused source-level regression test are run separately; full checks, build, browser UI checks, and live acceptance remain unverified.

## Summary
- **Step:** UI1
- **Base archive:** `bf-v40.zip`
- **Goal:** Add explicit Simple / Expert / Project start screen and correct the requested documentation records.

## Files
- Replaced: `CHANGELOG.md`, `docs/NEXT.md`, `docs/PATCH_JOURNAL.md`, `docs/REPO_MAP.md`, `docs/STATUS.md`, `package.json`, `src/App.tsx`.
- Added: `docs/P41-REPORT.md`, `docs/P41-SPEC.md`, `tests/p41-ui1.test.mjs`.

## Acceptance status
- Start screen has Simple / Expert / Project cards: implemented; source-level regression test covers card labels.
- Project unavailable state is explicit and disabled: implemented; source-level regression test covers the disabled state and guard.
- QA1 appears between UI1 and MANUAL1: documented and tested.
- Existing `PICK_FOLDER_EVENT` folder-picker-to-menu behavior recorded: documented and tested.
- UX1 decision recorded instead of open feedback question: documented and tested.

## Checks
- `node --test tests/p41-ui1.test.mjs`: PASS (5/5).
- `node scripts/check-docs.mjs`: PASS (101 Markdown files; 404 backticked paths).
- `npm run patch:pack -- --base /mnt/data/bf-v40.zip --patch P41 --out /mnt/data/bf-P41.zip`: BLOCKED because `jszip` is not installed in the supplied environment; a fallback archive is independently preflighted and verified byte-for-byte.
- `npm run check`: NOT_RUN.
- `npm run build`: NOT_RUN.
- `npm run test:ui`: NOT_RUN.

## Not done
QA1 cross-mode end-to-end checks and MANUAL1 live owner acceptance remain future gates. No deployment was performed.
