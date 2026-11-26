## P131.8 — New engine pure stages (WP3 scaffold)
- Add `server/immofinder/{classify,access,owner,run,pipeline,index}.ts` and adapters `sources/happyholiday.ts`, `sources/ferienhausmiete.ts`. Pure offline stages (R2 gates, host state, owner evidence, index delta, processSnapshot). Legacy runtime unchanged. RELIABILITY.

## P131.7a — Closed reject taxonomy and source-yield audit
- Every persisted run report now carries `qualityAudit`: legacy reject reasons mapped to the closed R7 code list (`server/immofinder/taxonomy.ts`, same list in `config/immofinder.json`), a fixed 10-item reject sample for false-reject audit, and advisory R9 zero-kept source evidence. RELIABILITY; no search, admission or scoring behaviour changes.

## P131.7a — Stop data commits from redeploying the service
- Every bot commit (diagnostics, encrypted snapshot, archive) triggered a Render deploy, up to dozens per night, able to interrupt a running search. Add `[skip render]` to the server-written diagnostics and snapshot commit messages (the Actions archive commit is unchanged); no search or admission logic changes.

## P131.7a — Consistency corrections (docs/scripts, no behaviour change)
- Fix `version:sync`/`version:check` to call `scripts/version-metadata.mjs` (the referenced `sync-version.mjs` never existed); dedupe the ImmoFinder pointer in `docs/ARCHITECTURE.md`; add status reconciliation to roadmap/experiments. Patch id unchanged (lockfile not rewritten).

## P131.7a — Extend bounded Chur test duration to 180 seconds
- Allow the full configured query set more time while preserving page, candidate, detail-fetch, browser, provider-rate and no-write limits.

## P131.7 — Reject shared-flat seeker posts
- Classify shared-household pages that are seeking occupants as seeker posts before L1 admission; retain ordinary rental offers.

## P131.6a — Extend bounded all-source test to 120 seconds
- Give all 17 configured search templates enough time to run while preserving provider rate, page, candidate, detail-fetch, browser and no-write limits.

## P131.6a — Expand Chur all-source dry-run coverage
- Use all configured private and portal query templates with a finite query-count page cap; allow up to two detail pages/source and two browser renders within a 90-second dry-run.
