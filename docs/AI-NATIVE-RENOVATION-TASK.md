# BiForge — Current Task and Patch Control

**Applied patch line:** P118.5.1 (staged default) → P118.5.2 (offline archive E2E) → P118.5.3 (CI adapter test) → **P118.5.4** (live script + docs/audit alignment).
**Phase:** P118 Complex Software Architect Agent — NOT closed until Navigator exit.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task, top of `NEXT_PATCH.md`, `docs/ARCHIVE-DELIVERY-CANON.md`, protected root docs.

## Single source for “what now”

This file + **top** entry of `NEXT_PATCH.md`. Do not read phase status from `AGENTS.md`.

## State (OBSERVED)

- Staged App Builder is the default A3 API path; legacy requires `ALLOW_LEGACY_APP_BUILDER=true`.
- Offline proof: `npm run test:archive-delivery` (5.1 unit + 5.2 E2E).
- CI on commit `bd0e95d` (patch 118.5.3 line): **PASS** 26/26 (OBSERVED from CI handoff).
- Live run before 5.4 (`p118-architect-transcript.json`): build **BLOCKED** with `http_409:LEGACY_DISABLED` because the live script sent `engine: 'pipeline'`. That client bug is fixed in **P118.5.4**; staged live evidence is still **NOT_RUN** until re-deploy + re-run.
- Full static audit: `docs/AUDIT-2026-10-29.md`.

## Next

1. Deploy commit containing P118.5.4.
2. Confirm CI PASS.
3. Re-run architect live against staged default; record outcome in `docs/AI-USER-VALUE-REPORT.md` (newest first).
4. Navigator: P118 exit yes/no.

## Not authorized

- P119 before Navigator accepts P118 exit.
- Treating PACKAGE.md, diagnostics ZIP, or legacy scaffold ZIP as Architect SUCCESS.
- Forcing `engine: 'pipeline'` / legacy on the product A3 path.

## Residual (from audit)

- Regenerate `docs/generated-*.json` when convenient (stale e01 references).
- Package name `bifurcation-engine` vs product name BiForge (cosmetic).
- `tsconfig.server.json` `strict: false` (known progressive debt).
- Node engines pinned to 22.x major; do not assume Node 24 in CI.

