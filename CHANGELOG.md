## P131.8i — Repair restore + locality prefers URL/title
- Restored full `immofinderRepair.ts` via ensure-repair historical fetch; short_stay_contact_required permanently retired. Classify locality prefers URL slug and title over footer chrome. RELIABILITY.

## P130.11 — Single Recheck feed button (delist + enrich + filters)

- **PROBLEM:** Two buttons (Recheck filters / Recheck list) split offline rules from page re-fetch; delisted ads (e.g. urbanhome «Inserat gelöscht») stayed in the agent feed unless the user knew to press Recheck list.
- **CHANGE:** One **Recheck feed** control. Job re-fetches each listing page, hides `listing_unavailable`, refreshes dates/contacts, then runs local quality filters (junk hide, price re-parse). Removed the separate filters button from the UI; `POST /api/immofinder/recheck` remains for API compatibility.
- **SCOPE:** USER_VALUE. `src/ImmoFinder.tsx`, `server/immofinderRoutes.ts`.

## P131.8g — Source-first pilot + seeker false-positive fix
- HappyHoliday pilot (no Serper) yields L2 private listings in Lenzerheide via new engine. Seeker gate tightened (nav/marketing no longer reject). Script `immofinder:pilot`. RELIABILITY / USER_VALUE instrument.

## P131.8f — WP3 engine unit coverage
- Unit tests for classify/owner/pipeline/adapters. Patch metadata alignment.

## P131.8d — Preflight allows server/immofinder/
- Nested-folder exception for WP3 layout; removed empty placeholder.

## P131.8 — New engine pure stages (WP3 scaffold)
- Add `server/immofinder/{classify,access,owner,run,pipeline,index}.ts` and source adapters. Offline processSnapshot. Legacy runtime unchanged.

## P131.7a — Closed reject taxonomy and source-yield audit
- qualityAudit on every run report; R7 codes closed. RELIABILITY.

## Session governance and documentation consolidation
- AGENTS.md, ROADMAP, TECHNICAL_REPORT, CHANGELOG remain single source of truth; append-only history.
