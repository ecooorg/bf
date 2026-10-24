# Documentation Baseline and Evidence

Source: Navigator-supplied `bf-v70` tree (post documentation-foundation patch).

## Current documentation set (authoritative)

- `AGENTS.md` — AI entry point, status, commands, tiers
- `docs/AI-OPERATING-RULES.md` — permanent operating and security rules
- `docs/AI-TRANSFORMATION-SPEC.md` — phased transformation mandate
- `docs/DOCUMENTATION-INDEX.md` — navigation
- `docs/DOCUMENTATION-BASELINE.md` — this file
- `docs/tz-appbuilder.md` — English App Builder core specification (P93.x), contracts, patch sequence, acceptance gates
- `docs/OPERATIONS.md` — deployment, backup, restore, rollback
- `archive/phase0-*` — Phase 0 forensic audit artifacts (p71)

Legacy numbered documents (`docs/01`–`docs/18`) are historical and live outside the active repository. Do not treat them as current requirements.

## Phase 0 observations (p71)

- Largest modules: `server.ts` (~2993 lines), `src/App.tsx` (~2947), `server/codeTaskService.ts` (~949).
- Confirmed import cycles: `taskService` ↔ `gateService` ↔ `codeTaskService`.
- `tsconfig.server.json` has `"strict": false`.
- ~81 literal route registrations in `server.ts` / `healthRoutes.ts`.
- 14 SQL migrations; product `APP_VERSION` / `package.json` version label is `93` (P93.0).
- 69 distinct `process.env` names referenced; `.env.example` does not list all of them.
- Full static inventories: `archive/ (phase0-*)`.

## Phase 1 (p72)

- Architecture scripts under `scripts/architecture*.mjs `.
- Ratchet: two known import cycles; zero new boundary violations on baseline.
- Commands: `architecture:map`, `architecture:check`, `architecture:impact`, `verify:change`.
- Not yet wired into default `npm run check` (optional until Navigator confirms CI).

## Verification limitations

- p71 is documentation and inventory only. No application source was modified.
- `npm run check`, database, browser and live provider suites were **not** executed in the audit environment.
- Functional equivalence to any prior CI green build is therefore **not proven** by p71 alone.

## Risks carried forward

- Stale hand-written inventories must not be reintroduced; prefer generated maps (Phase 1 / 4).
- Historical requirements in the owner’s archive must be re-validated before deletion or re-incorporation (owner decision D05).
- Documentation files that tests assert on are part of the public contract; change them with the same discipline as code.
