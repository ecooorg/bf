# P45 — UI1 start screen deploy + ui-check

**Goal.** Ship the UI1 mode start screen that production was missing, and fix `ui-check` which timed out waiting for `.header-actions` on the new start screen.

**Root cause.** Production JS (`index-D4jFtF4f.js`) contained `Expert method` but **zero** matches for `chooseStartMode` / `biforge-start-mode`. Incognito still showed the old Simple shell after password. `ui-check` expected header chrome immediately after login.

**May change.** `src/App.tsx`, `tests/ui-check.mjs`, `docs/STATUS.md`, `docs/PATCH_JOURNAL.md`, `CHANGELOG.md`, this SPEC/REPORT.

**Must not change.** Auth, API contracts, model_patch gate, Project backend.

**PASS.** After deploy: post-login shows three mode cards; More → Change mode returns to cards; `npm run test:ui` / ui-check workflow finds start card then `.header-actions`.
