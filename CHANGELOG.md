## P131.5j — PipelineDeps type correction
- Remove the unused `testMode` field from the `runPipeline` dependency object; retain queued test-mode behavior.

## P131.5i — Short-search runner reliability
- Bound test mode to source-first Full, extend diagnostics polling and type retry-release SQL parameter.

## P131.5h — Correct production target for agent tests and health checks
- The first automated smoke attempt reached the stale URL stored in IMMOFINDER_BASE_URL and was handled by the old version (HTTP 200 skipped:not_due). It did not start a search.
- Pin the agent test workflow to the confirmed My Workspace production URL and correct the health monitor's Render workspace/service/Postgres IDs.
- Bump patch to 131.5h; no application listing logic changed.

## P131.5g — Accessible settings and agent-operated short search
- Replaced native Settings disclosure with an explicit accessible button/panel state.
- Added secret-gated dry-run test mode capped at 3 sources, 1 commune, 3 result pages, 2 detail pages per source and 90 seconds; listing cleanup and contact enrichment are disabled.
- Added an owner-only GitHub issue-comment trigger for repeatable short production fetcher smoke tests; reports are uploaded as workflow artifacts and commented back.
- Listing admission gates are unchanged; smoke runs do not count as WP6 Full runs.

## P131.5f — Align repair-rule stamp before CI verification
- Synchronized the repair-rule stamp with package patch `131.5f`, preventing the P131.5e pre-merge version assertion failure from recurring.
- Core CI and Answer Quality are rerun on this exact patch; no search or production data operation is performed.

## P131.5e — Preserve the current ImmoFinder core during repair
- Prevented automatic main-push repair from overwriting the current core with the stale P130.16 payload; explicit force restore remains available.
- Added a regression contract test; WP5 restore drill and legacy retirement remain NOT_RUN.

## P131.5d — Refresh health snapshots when deployment details change
- Fixed health-snapshot deduplication to compare each check's detail as well as status/verdict, so a changing deployed-commit gap is not hidden for 24 hours.
- Added regression coverage; no deploy or search action is performed by the health probe.

## P131.5c — Record post-release health trigger verification
- Core CI `45637400435` passed 18/18; Answer Quality `45637400580` passed; secret scan passed.
- The health workflow is configured for the next main push; latest production snapshot remains 08:25 UTC until that probe publishes.

## P131.5b — Verify deployment identity after ImmoFinder releases
- Added a bounded health check on main pushes affecting ImmoFinder code/config or patch metadata; it uses the existing read-only Render/log and health probe, not deployment writes.
- Recorded latest health evidence: production version `130` / commit `2ee99cb`, 369 commits behind main; post-release result remains pending.

## P131.5 — Distinguish provider outage from a zero-result search
- Persisted `INFRA_FAIL` when every Serper call fails before any candidate/page is processed; the ImmoFinder run summary now says this is not a quality result.
- Added regressions for provider-wide failure and successful empty searches; no search budget or admission rule changed.

## P131.4a — Record hosted verification and backup evidence
- Core CI `45633920254` passed 18/18 checks; Answer Quality `45633920285` passed deterministic checks.
- Recorded encrypted snapshot commit `a1ce09e` and latest carousel `INFRA_FAIL` (20 Serper credit errors, 0 candidates); restore verification and live WP6 outcome remain open.

## P131.4 — Repair evidence-bound L3 contact forms and pipeline typing
- Retained fetched HTML per candidate and verified platform-message forms against that exact page; corrected the L3 pipeline type errors.
- Added same-page form, missing-form, no-route and URL-mismatch regressions; no automatic sending.

## P131.3a — No-label invariant replay
- Removed synthetic owner labels and precision/recall claims; replay now reports only admission, infrastructure and provenance invariants.
- Platform contact route requires a structured message form; no language-specific phrase heuristics.

## P131.3 — Evidence-bound L3 letter generation
- Added same-page owner/contact verification before L3; removed unsupported personal financial claims from drafts.
- L1/L2 remain visible without drafts; no automatic sending.

## P131.2a — Run full Core CI for pull requests
- Added pull_request trigger to Core CI so full verification runs before merge, not only after push to main.
- Kept diagnostics-only data commits excluded from the verification DAG.

## P131.2 — Page-grounded locality and bounded enrichment
- Enforced fetched-page locality at final admission; URL/query hints no longer set or override locality.
- Made secondary contact search and reverse-image enrichment explicit opt-in with zero default budget.

## P131.1c — C131 no-Gold execution amendment
- Replaced owner-labelled Gold gate with repo diagnostics and deterministic invariant evidence; corrected prior audit inaccuracies.
- Updated C131 plan/spec; no runtime or production data changed.

## P131.1b — C131 WP4/WP5 audit (documentation only)
- Recorded R2 locality/contact/enrichment gaps and legacy-row quarantine blockers; added the pre-change experiment gate.
- No runtime code or production data changed; WP1/WP2 evidence remains a prerequisite for corrective implementation.

## P131.1a — Hosted verification passed
- Core CI passed 18/18 verification DAG checks and 182/182 core tests; build, typecheck, migrations, docs integrity and security scan passed.
- Ensure repair workflow passed after the synchronized `131.1a.5` repair stamp.

## P131.1a — Corrective C131 test and price-unit alignment
- Updated legacy tests to the approved page-grounded L1 contract and added explicit `Zimmer` basis to repair fixtures.
- A price is classified as monthly only when the source unit and parsed page quote both say monthly; other units do not block L1.

## P131.1 — Restore page-grounded L1 results and source-first manual run
- Removed mandatory price, publication-date and direct-contact admission gates; explicit ≥3-room detail-page evidence remains mandatory.
- Added bounded direct index pilots for HappyHoliday, Tutti and Homegate; default manual run is full/source-first, capped at 20 Serper queries, and drafts are generated only for L2 owner-reachable records.
## P131.0h — Verify provider-free replay scorer in Core CI
- Recorded successful post-correction Core CI for the C131 replay scorer; actual owner-labelled replay remains blocked.
## P131.0g — Correct scorer TypeScript narrowing
- Made the replay decision discriminant explicit for TypeScript; scorer semantics and runtime admission behavior unchanged.
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
