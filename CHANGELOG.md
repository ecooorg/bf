## P131.8d — Preflight allows server/immofinder/ layout
- **PROBLEM:** test:models preflight treated `server/immofinder/*` and `sources/*` as forbidden nested folders (only `server/appBuilder` was excepted).
- **CHANGE:** Extend preflight exceptions for C131 target layout; remove empty `server/immofinder/1` placeholder. No product behaviour change.
- **SCOPE:** RELIABILITY / CI. `scripts/patch-tools.mjs`.

## P130.11 — Single Recheck feed button (delist + enrich + filters)

- **PROBLEM:** Two buttons (Recheck filters / Recheck list) split offline rules from page re-fetch; delisted ads (e.g. urbanhome «Inserat gelöscht») stayed in the agent feed unless the user knew to press Recheck list.
- **CHANGE:** One **Recheck feed** control. Job re-fetches each listing page, hides `listing_unavailable`, refreshes dates/contacts, then runs local quality filters (junk hide, price re-parse). Removed the separate filters button from the UI; `POST /api/immofinder/recheck` remains for API compatibility.
- **SCOPE:** USER_VALUE. `src/ImmoFinder.tsx`, `server/immofinderRoutes.ts`.

## P131.8b — Restore package.json scripts and docs for CI green
- Restored missing npm scripts (`test:search-heuristics`, `carousel:*`, `workflow:preflight`) so Preflight passes. Restored CHANGELOG required markers after truncation. No product behaviour change.

## P131.8 — New engine pure stages (WP3 scaffold)
- Add `server/immofinder/{classify,access,owner,run,pipeline,index}.ts` and adapters `sources/happyholiday.ts`, `sources/ferienhausmiete.ts`. Pure offline stages. Legacy runtime unchanged. RELIABILITY.

## P131.7a — Closed reject taxonomy and source-yield audit
- Every persisted run report now carries `qualityAudit`: legacy reject reasons mapped to the closed R7 code list (`server/immofinder/taxonomy.ts`, same list in `config/immofinder.json`), a fixed 10-item reject sample for false-reject audit, and advisory R9 zero-kept source evidence. RELIABILITY; no search, admission or scoring behaviour changes.

## P131.7a — Stop data commits from redeploying the service
- Every bot commit (diagnostics, encrypted snapshot, archive) triggered a Render deploy, up to dozens per night, able to interrupt a running search. Add `[skip render]` to the server-written diagnostics and snapshot commit messages; no search or admission logic changes.

## P131.7a — Consistency corrections (docs/scripts, no behaviour change)
- Fix `version:sync`/`version:check` to call `scripts/version-metadata.mjs`; dedupe the ImmoFinder pointer in `docs/ARCHITECTURE.md`; add status reconciliation to roadmap/experiments.

## P131.7a — Extend bounded Chur test duration to 180 seconds
- Allow the full configured query set more time while preserving page, candidate, detail-fetch, browser, provider-rate and no-write limits.

## P131.7 — Reject shared-flat seeker posts
- Classify shared-household pages that are seeking occupants as seeker posts before L1 admission; retain ordinary rental offers.

## Session governance and documentation consolidation
- AGENTS.md, ROADMAP, TECHNICAL_REPORT, CHANGELOG and related docs remain the single source of truth; append-only history; no NEXT_PATCH assignment file.
