## P130.11 — Single Recheck feed button (delist + enrich + filters)

- **PROBLEM:** Two buttons (Recheck filters / Recheck list) split offline rules from page re-fetch; delisted ads (e.g. urbanhome «Inserat gelöscht») stayed in the agent feed unless the user knew to press Recheck list.
- **CHANGE:** One **Recheck feed** control. Job re-fetches each listing page, hides `listing_unavailable`, refreshes dates/contacts, then runs local quality filters (junk hide, price re-parse). Removed the separate filters button from the UI; `POST /api/immofinder/recheck` remains for API compatibility.
- **SCOPE:** USER_VALUE. `src/ImmoFinder.tsx`, `server/immofinderRoutes.ts`.

## P131.8 — New engine pure stages (WP3 scaffold)
- Add `server/immofinder/{classify,access,owner,run,pipeline,index}.ts` and adapters `sources/happyholiday.ts`, `sources/ferienhausmiete.ts`. Pure offline stages (R2 gates, host state, owner evidence, index delta, processSnapshot). Legacy runtime unchanged. RELIABILITY.

