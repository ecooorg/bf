## P130.11 — Single Recheck feed button (delist + enrich + filters)

- **PROBLEM:** Two buttons (Recheck filters / Recheck list) split offline rules from page re-fetch; delisted ads (e.g. urbanhome «Inserat gelöscht») stayed in the agent feed unless the user knew to press Recheck list.
- **CHANGE:** One **Recheck feed** control. Job re-fetches each listing page, hides `listing_unavailable`, refreshes dates/contacts, then runs local quality filters (junk hide, price re-parse). Removed the separate filters button from the UI; `POST /api/immofinder/recheck` remains for API compatibility.
- **SCOPE:** USER_VALUE. `src/ImmoFinder.tsx`, `server/immofinderRoutes.ts`.

## P130.16 — Human-style listing verify (in progress)

- **GOAL:** Reject sale objects mis-read as rent (Flims Zweitwohnung / Kaufpreis CHF 1'380'000 stored as 1390/month).
- **LANDED:** ensure-repair wires `immofinder-p13016-verify-hygiene.mjs`; scripts-integrity allowlist; `tests/immofinder-verify.test.mjs` (Flims fixture); refresh restored after placeholder incident.
- **PENDING on next green CI:** apply full core L1/L4 patches (Zweitwohnung, sale-context parsePrice, price_sale_mismatch, verifyListingFromPageText, crossSourceIndicatesSale) via hygiene on main; L2 hide on Recheck feed; package patch 130.16.
- **VERSION:** targeting patch 130.16 / REPAIR 130.16.5.

