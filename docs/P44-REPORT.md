# P44 — CI hotfix for P42/P43

## Status
`PASS` (local source fixes). Full CI re-run is on the owner after upload.

## Root causes (from `logs_104943538685.zip`)
1. `check:docs`: `REPO_MAP.md` lacked `tests/qa1.test.mjs`, `tests/p43-rm-c3.test.mjs`, `test:qa1`, `test:p43`.
2. `test:p41`: STATUS no longer contained bold `**UI1**` before `**QA1**` after P43 rewrite.
3. `test:qa1`: `node --test` without tsx could not load `server/*.ts` (`ERR_UNKNOWN_FILE_EXTENSION`).

## Files
- Replaced: `docs/REPO_MAP.md`, `docs/STATUS.md`, `docs/PATCH_JOURNAL.md`, `CHANGELOG.md`, `tests/p41-ui1.test.mjs`, `package.json`
- Added: `docs/P44-SPEC.md`, `docs/P44-REPORT.md`

## Note
`ui-check` also failed on the screenshot; this log archive only contained `check-and-build`. If ui-check stays red after P44, send its log separately.
