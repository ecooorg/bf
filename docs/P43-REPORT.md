# P43 — RM-C3 close: authorize `model_patch`

## Status
`PASS` (process/docs) — gate closed in repository records; Railway variable remains an owner ops step.

## Summary
- **Step:** RM-C3 / Code Delivery enablement documentation
- **Owner command:** 2026-10-15 — open `model_patch`
- **Evidence already on record:** ADR-10 Accepted; E-01 3/3 green, 0 fixes (`ARCHIVE/E01-*`)
- **Code:** unchanged — `selectExecutorId` still requires `process.env.CODE_EXECUTOR === 'model_patch'`

## Files
- Replaced: `CHANGELOG.md`, `docs/NEXT.md`, `docs/PATCH_JOURNAL.md`, `docs/STATUS.md`, `docs/OWNER_OPS.md`, `docs/DELEGATION.md`, `.env.example`, `package.json`
- Added: `docs/P43-SPEC.md`, `docs/P43-REPORT.md`, `tests/p43-rm-c3.test.mjs`

## Owner action required (outside this archive)
1. Railway → Variables → confirm `CODE_EXECUTOR=model_patch` (OWNER_OPS already observed this value on 14 Oct 2026; re-confirm after deploy if needed).
2. Optional for full GitHub PR path: separate command for App write + `GITHUB_DIFF_UPLOAD=true` (not part of P43).
3. Smoke: Project Mode → code task with passport executor `model_patch` → expect drive path, not `EXECUTOR_UNAVAILABLE`.

## Checks
- `node --test tests/p43-rm-c3.test.mjs`: intended PASS
- Product behaviour without env var: still `manual` / `EXECUTOR_UNAVAILABLE` for model_patch requests
- `npm run check` / build: `NOT_RUN` in this session
