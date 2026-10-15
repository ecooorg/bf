# P41 — UI1 mode start screen

**Goal.** Add an explicit start screen for Simple, Expert, and Project, while making unavailable Project status explicit and preserving user-controlled mode selection. Correct the associated status and patch history.

**Base.** `bf-v40.zip`, uploaded 2026-10-15.

**May change.** `src/App.tsx`, UI1-specific regression coverage, `docs/STATUS.md`, `docs/PATCH_JOURNAL.md`, `docs/NEXT.md`, `CHANGELOG.md`, and this patch's report/spec.

**Must not change.** Existing API contracts, authentication, Simple/Expert conversation semantics beyond explicit mode selection, Project feature gating, and existing tests.

**Files.** Replace `src/App.tsx`, `CHANGELOG.md`, `docs/STATUS.md`, `docs/PATCH_JOURNAL.md`, `docs/NEXT.md`, `package.json`; add `tests/p41-ui1.test.mjs`, `docs/P41-SPEC.md`, `docs/P41-REPORT.md`.

**PASS criteria.**
- Start screen presents Simple, Expert, Project cards.
- Project is explicitly disabled when the feature is unavailable; it is never silently substituted with another mode.
- Choosing Simple or Expert is explicit and persists for the session.
- `npm run test:p41`, `npm run check`, `npm run build`, and applicable UI checks pass.
- Manual smoke: select Simple and verify Simple opens; return/reset session and select Expert; confirm Project's unavailable state when disabled.

**Read in the TZ.** `docs/MASTER_IMPLEMENTATION_PLAN.md` §6–§7; `AGENTS.md` §5.

**Tests to add or change.** `tests/p41-ui1.test.mjs` checks the start-card labels, disabled Project state, explicit selection and no automatic fallback.

**`CHANGELOG.md`.** Record P41 UI1 start screen and document corrections.

**Not done / postponed.** QA1 cross-mode end-to-end coverage and MANUAL1 live acceptance remain separate subsequent gates; no production deployment is performed by this patch.
