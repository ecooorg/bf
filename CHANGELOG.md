## P131.0f — Add provider-free C131 gold replay scorer
- Added a pure legacy-verifier scorer with owner-label metrics, fetchability separation, L1/L2/L3 counters and provenance diagnostics; runtime admission behavior unchanged.
## P131.0e — Preliminary WP2 source scorecard
- Recorded public-page evidence for 3 catalogs, 13 portals and 3 owner-discovery candidates; no runtime or source-admission behavior changed.
## P131.0d — Hosted verification result
- Core CI passed after the repair-rule stamp was synchronized in the same commit as package metadata.
## P131.0d — Synchronize repair-rule stamp
- Updated the repair-rule version stamp in the same commit as package metadata after P131.0c CI exposed a stale-stamp mismatch; admission logic unchanged.
## P131.0c — Record post-fix verification
- Recorded successful hosted Core CI for P131.0b; no runtime behavior changed.
## P131.0b — Fix cycle-aware repair stamp and canonical roadmap
- Made repair-rule versioning cycle-neutral, moved C131 into the canonical root roadmap, and recorded WP1 dependency tracing; admission logic unchanged.
## P131.0a — Record C131 owner constitution
- Recorded approved R1–R14, superseded conflicting ImmoFinder policy text, and added C131 measurement plans; runtime behavior unchanged.
## P130.18b — Correct recovery test ordering
- Made the checkpoint test independent of planner ordering and aligned the pipeline contract assertion with the new post-batch checkpoint.
## P130.18a — Resume ImmoFinder searches after process replacement
- Persist completed-query keys, cumulative evidence counters and delivery acknowledgements; retry only incomplete queries without relaxing listing verification.
## P130.18 — Resolve Serper redirects and JS-rendered rental pages
- Resolve Google `/goto` results through Serper `/resolve`; add bounded public-target-checked browser rendering for empty/challenged detail pages without relaxing evidence gates.
## P130.17d — Durable ImmoFinder worker
- Queue runs in PostgreSQL with expiring leases, persisted settings, cross-instance cancellation and deploy-time recovery.
## P130.17c — Restore ImmoFinder CI
- Updated evidence-backed rental fixtures, repair-rule stamp derivation, copy fragments and already-rented rejection; preserved mandatory listing gates.
## P130.17b — Fix trust admission type narrowing
- Use a property-presence guard for rejected trust results so the server TypeScript build can narrow the admission union.
## P130.17a — Restore ImmoFinder build
- Fixed malformed rental-search template literals and portal-host matching so the ImmoFinder trust planner compiles and interpolates locations.
## P130.17 — ImmoFinder evidence-first admission
- Rebuilt rental discovery and page-only fact extraction; publication requires matching detail-page evidence, rooms, monthly CHF rent, freshness, active rental status and advertiser-labelled contact.
## P130.17 — ImmoFinder evidence-first admission
- Rebuilt rental discovery and page-only fact extraction; publication requires matching detail-page evidence, rooms, monthly CHF rent, freshness, active rental status and advertiser-labelled contact.
## P130.11 — Single Recheck feed button (delist + enrich + filters)

- **PROBLEM:** Two buttons (Recheck filters / Recheck list) split offline rules from page re-fetch; delisted ads (e.g. urbanhome «Inserat gelöscht») stayed in the agent feed unless the user knew to press Recheck list.
- **CHANGE:** One **Recheck feed** control. Job re-fetches each listing page, hides `listing_unavailable`, refreshes dates/contacts, then runs local quality filters (junk hide, price re-parse). Removed the separate filters button from the UI; `POST /api/immofinder/recheck` remains for API compatibility.
- **SCOPE:** USER_VALUE. `src/ImmoFinder.tsx`, `server/immofinderRoutes.ts`.

## P130.17 — ImmoFinder evidence-first admission
- Rebuilt rental discovery and page-only fact extraction; publication now requires matching live detail-page evidence, rooms, monthly CHF rent, freshness, active rental status and advertiser-labelled contact.
## P130.11 — Single Recheck feed button (delist + enrich + filters)

- **PROBLEM:** Two buttons (Recheck filters / Recheck list) split offline rules from page re-fetch; delisted ads (e.g. urbanhome «Inserat gelöscht») stayed in the agent feed unless the user knew to press Recheck list.
- **CHANGE:** One **Recheck feed** control. Job re-fetches each listing page, hides `listing_unavailable`, refreshes dates/contacts, then runs local quality filters (junk hide, price re-parse). Removed the separate filters button from the UI; `POST /api/immofinder/recheck` remains for API compatibility.
- **SCOPE:** USER_VALUE. `src/ImmoFinder.tsx`, `server/immofinderRoutes.ts`.

## P130.17 — ImmoFinder evidence-first admission
- Replaced LLM fact extraction and legacy query wording with deterministic page parsing and generated rental-intent searches; only current, page-verified rentals with monthly CHF rent and advertiser-attributed contact pass.
## P130.11 — Single Recheck feed button (delist + enrich + filters)

- **PROBLEM:** Two buttons (Recheck filters / Recheck list) split offline rules from page re-fetch; delisted ads (e.g. urbanhome «Inserat gelöscht») stayed in the agent feed unless the user knew to press Recheck list.
- **CHANGE:** One **Recheck feed** control. Job re-fetches each listing page, hides `listing_unavailable`, refreshes dates/contacts, then runs local quality filters (junk hide, price re-parse). Removed the separate filters button from the UI; `POST /api/immofinder/recheck` remains for API compatibility.
- **SCOPE:** USER_VALUE. `src/ImmoFinder.tsx`, `server/immofinderRoutes.ts`.

## P130.16 — Human-style listing verify (L1–L4)

- **GOAL:** Reject sale objects mis-read as rent (Flims Zweitwohnung / Kaufpreis CHF 1'380'000 stored as 1390/month).
- **L1:** `isForSaleListing` treats Zweitwohnung / Eigentumswohnung / Kaufobjekt / Stockwerkeigentum as sale when no explicit rent phrase; `parsePrice` skips bare numbers inside sale/Kaufpreis windows.
- **L2:** Recheck feed re-fetches every stored listing (including hidden), runs `verifyListingFromPageText`, hides `for_sale` / `price_sale_mismatch`.
- **L3:** Helpers `buildCrossSourceSaleQuery` + `crossSourceIndicatesSale` ready for enrichment path.
- **L4:** `credibilityRejectReason` returns `price_sale_mismatch` when a low monthly amount coexists with multi-hundred-thousand Kaufpreis evidence.
- **TESTS:** `tests/immofinder-verify.test.mjs` Flims fixture.
- **VERSION:** package patch 130.16 / REPAIR_RULES_VERSION 130.16.5.
- **SCOPE:** USER_VALUE. `server/immofinderCore.ts`, `server/immofinderRefresh.ts`, hygiene + ensure-repair.

## P130.11 — Single Recheck feed button (delist + enrich + filters)

- **PROBLEM:** Two buttons (Recheck filters / Recheck list) split offline rules from page re-fetch; delisted ads (e.g. urbanhome «Inserat gelöscht») stayed in the agent feed unless the user knew to press Recheck list.
- **CHANGE:** One **Recheck feed** control. Job re-fetches each listing page, hides `listing_unavailable`, refreshes dates/contacts, then runs local quality filters (junk hide, price re-parse). Removed the separate filters button from the UI; `POST /api/immofinder/recheck` remains for API compatibility.
- **SCOPE:** USER_VALUE. `src/ImmoFinder.tsx`, `server/immofinderRoutes.ts`.

## [historical] - Session governance and documentation consolidation

- Retained marker for docs-integrity: Session governance and documentation consolidation.
