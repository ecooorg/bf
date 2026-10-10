# Current state

> State on **10 October 2026**. Replaces `BIFORGE-STATE.json` (removed in P00). Update this file in every patch that changes the state.

## Done

- BX-01…BX-05: baseline, documents, CI and operations fixes, characterization tests, PostgreSQL with migrations, base contracts.
- BX-06: Project Mode separated (`/project`, opt-in), mandatory authentication, CSRF/origin protection, rate limits in the database. Checked by the owner on Railway (`docs/BX-06-REPORT.md`).
- BX-07: provenance, restart test, manual 409 check, English-only interface, `/health` shows `commit` (`docs/BX-07-REPORT.md`). **Closing condition:** green CI on the last commit and a short Simple Mode check on Railway.
- P00 (this patch): documentation for working with different models; no program code changed.

## Checked by the owner on Railway

- `/health` returns `commit` (value `974cf83e69a8` was seen).
- Two tabs on one project: the second write got "State version conflict", data not overwritten.

## Not checked by the agent

`npm run check`, `npm run build`, live PostgreSQL tests (`npm run test:database:live`, `npm run test:bx06:api`) were not run in the environment of P00 (no installed dependencies). Their result is the CI result on `main`.

## Known leftovers

- Label `v1.6.0` at the bottom of Simple Mode and "BIFORGE · BX-06" in the `/project` header are still shown to the user. Removed in P01.
- `DEPLOY_RAILWAY.md`, section "Planned changes", is partly outdated (some items were done in BX-02…BX-06); the rest of the file is accurate. Clean up when touching deployment.
- `docs/DEVELOPMENT.md` says `npm run check` uses `scripts/qa.mjs`; in fact `package.json` runs a chain of commands (see `docs/REPO_MAP.md`).
- Policy documents `docs/GIT_POLICY.md` and `docs/DEVELOPMENT_PROTOCOL.md` describe branches and Pull Requests; the real process is in `docs/START_HERE.md`.
- Test Integrity path `tests/acceptance/**` does not exist yet; it is created when the TZ requires expectation tests.

## Next patch

**P01** (BX-08): project initialization and passport; remove versions and step numbers from screens; the owner checks: create a project, see the passport, screens show only "BiForge". Sections to read: `docs/START_HERE.md`, table row P01. Plan: TZ 16.4.2.
