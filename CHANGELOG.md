## P130.11 — Single Recheck feed button (delist + enrich + filters)

- **PROBLEM:** Two buttons (Recheck filters / Recheck list) split offline rules from page re-fetch; delisted ads (e.g. urbanhome «Inserat gelöscht») stayed in the agent feed unless the user knew to press Recheck list.
- **CHANGE:** One **Recheck feed** control. Job re-fetches each listing page, hides `listing_unavailable`, refreshes dates/contacts, then runs local quality filters (junk hide, price re-parse). Removed the separate filters button from the UI; `POST /api/immofinder/recheck` remains for API compatibility.
- **SCOPE:** USER_VALUE. `src/ImmoFinder.tsx`, `server/immofinderRoutes.ts`.

## P130.16 — Human-style listing verify (L1–L4)

- **GOAL:** Reject sale objects mis-read as rent (Flims Zweitwohnung / Kaufpreis CHF 1'380'000 stored as 1390/month).
- **L1:** `isForSaleListing` treats Zweitwohnung / Eigentumswohnung / Kaufobjekt / Stockwerkeigentum as sale when no explicit rent phrase; `parsePrice` skips bare numbers inside sale/Kaufpreis windows.
- **L2:** Recheck feed re-fetches the ad page and calls `verifyListingFromPageText`; hides `for_sale` / `price_sale_mismatch`.
- **L3:** Helpers `buildCrossSourceSaleQuery` + `crossSourceIndicatesSale` ready for enrichment path.
- **L4:** `credibilityRejectReason` returns `price_sale_mismatch` when a low monthly amount coexists with multi-hundred-thousand Kaufpreis evidence.
- **TESTS:** `tests/immofinder-verify.test.mjs` Flims fixture (isForSaleListing, parsePrice, credibility, verifyListingFromPageText, cross-source).
- **VERSION:** package patch 130.16 / REPAIR_RULES_VERSION 130.16.5.
- **SCOPE:** USER_VALUE. `server/immofinderCore.ts`, `server/immofinderRefresh.ts`, hygiene + ensure-repair.

## P130.11 — Single Recheck feed button (delist + enrich + filters)

- **PROBLEM:** Two buttons (Recheck filters / Recheck list) split offline rules from page re-fetch; delisted ads (e.g. urbanhome «Inserat gelöscht») stayed in the agent feed unless the user knew to press Recheck list.
- **CHANGE:** One **Recheck feed** control. Job re-fetches each listing page, hides `listing_unavailable`, refreshes dates/contacts, then runs local quality filters (junk hide, price re-parse). Removed the separate filters button from the UI; `POST /api/immofinder/recheck` remains for API compatibility.
- **SCOPE:** USER_VALUE. `src/ImmoFinder.tsx`, `server/immofinderRoutes.ts`.

