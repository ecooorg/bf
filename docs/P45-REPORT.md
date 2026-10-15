# P45 — UI1 start screen deploy + ui-check

## Status
`PASS` (source). Owner must upload so Railway rebuilds the client bundle.

## Evidence
- Prod bundle grep: `chooseStartMode` count 0 before this patch.
- ui-check log: `waiting for locator('.header-actions')` timeout at all widths.

## Files
- Replaced: `src/App.tsx`, `tests/ui-check.mjs`, `docs/STATUS.md`, `docs/PATCH_JOURNAL.md`, `CHANGELOG.md`
- Added: `docs/P45-SPEC.md`, `docs/P45-REPORT.md`
