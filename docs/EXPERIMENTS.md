## P131.8u — Actionable lead acceptance (2026-11-26)
- **OBSERVED:** Prior run's 14 visible rows were not acceptable: several were thin portal shells, placeholder contacts or wrong locality/room data. Keep them hidden until revalidated.
- **CHANGE:** Fresh-fetch hold + seen-cache reset; detail must pass locality, 2+ room, substantive body and direct/platform contact route. Preserve price/currency, owner name and enquiry route in the card.
- **SOURCES:** HappyHoliday, Ferienhausmiete, Flatfox. Anibis/Tutti paused after 403. No paid discovery/LLM/Jina. Local browser max 3 pages/run.
- **ACCEPTANCE:** >=3 unique visible leads, each with correct commune and room count, substantive detail evidence, source price/currency and actionable contact route; no agency, placeholder number or false locality. Paid-provider cost $0.00; Core CI green.
- **STATUS:** Pending next production deployment/run. A positive count alone is not sufficient.

## P131.8t — Flatfox direct-source pilot (2026-11-26)
- **HYPOTHESIS:** Flatfox's direct listing pages expose full rental details and monthly price without a paid search provider.
- **CHANGE:** Added Graubünden bbox index, detail URL adapter, half-room/price/advertiser extraction and agency rejection.
- **BUDGET:** 12 detail pages/source, max 3 local Chromium renders across allowlisted hosts, zero Serper/LLM/Jina.
- **ACCEPTANCE:** At least 3 unique visible L1/L2 leads with verified locality, >=2 rooms, monthly price and contact route; no agency/placeholder contacts; paid-provider cost $0.00.
- **STATUS:** NOT_RUN; do not claim Flatfox yield until the next production run finishes.

## P131.8s — Detail evidence and locality correction (2026-11-26)
- **OBSERVED:** First full-canton production run returned 87 index candidates and 24 fetched details; 16 were hidden at write time, 0 visible leads. HappyHoliday pages were short JS shells; FHM pages showed that a property name can mention another commune. Anibis/Tutti index fetches returned 403. Paid-provider estimate remained $0.00.
- **HYPOTHESIS:** Exact locality tokens + description-first locality, Swiss half-room parsing, a substantive-detail gate, corrected seeker/agency gates and up to 3 local HappyHoliday renders will allow actual detail evidence to pass while keeping false positives hidden.
- **CHANGE:** source-first classifier, core write-time mismatch checks, owner phone validation, HappyHoliday adapter, browser allowlist and one-time seen-cache reset.
- **ACCEPTANCE:** >=3 visible unique L1/L2 leads; correct locality and room count in every reviewed lead; >=10 substantive body words or structured price/amenity evidence; no placeholder contacts; second run cost $0.00 in paid providers; Core CI green.
- **ROLLBACK:** keep any source paused if 403/429 persists; never relax locality, room or substantive-detail gates to force a positive count.
- **SOURCE STATUS:** HappyHoliday/Flatfox local render is capped to 3 pages/run. Fresh defaults enable only HappyHoliday/Ferienhausmiete/Flatfox; Anibis/Tutti remain paused until access changes and fixture evidence is captured. Schedule and delivery stay off.

## P131.8r — Full-canton direct-source yield experiment (2026-11-26)
- **HYPOTHESIS:** Replacing the one-commune saved scope with the full official Graubünden commune catalogue plus locality aliases, lowering the room threshold to 2, and adding direct Anibis/Tutti adapters will produce verified rental leads without paid search/model calls.
- **SCOPE:** production path `server/immofinder/live.ts`; direct adapters HappyHoliday, Ferienhausmiete, Anibis, Tutti; 100 official communes + 19 locality aliases. Schedule and delivery remain manual/off. Hard caps: 6 index pages/source, 12 details/source, 48 details/run, 240s, 1.5s host pacing.
- **QUALITY GATE:** only fetched detail pages with matching final URL, explicit in-scope locality evidence, residential rental classification and explicit room count >=2; reject sale, seeker and known agency records. No snippets or inferred room counts. L1 is a verified listing; L2 requires private-owner evidence plus a contact route.
- **COST GATE:** Serper, LLM, Jina and browser rendering stay disabled; target provider cost $0.00/run. No recurring schedule, notifications or drive exports.
- **ACCEPTANCE:** >=3 unique L1/L2 listings in a real production run; no locality/room false positives in reviewed sample; successful detail fetches from at least two sources; core CI green. If yield remains zero, report each source's HTTP/fetchability and reject reasons; do not weaken page-evidence gates to manufacture results.
- **SOURCE STATUS:** Anibis and Tutti are pilot adapters, not R9 Tier-1 approved. They require >=5 saved detail fixtures/source and measured fetch/yield/cost scorecards before Tier-1 designation.
- **ROLLBACK:** disable a blocked source after 403/429; revert an adapter if final-URL, locality or detail-page validation fails. Do not reactivate paid discovery automatically.
- **CLASSIFICATION:** USER_VALUE + EXPERIMENT; live production yield pending.

## P131.8q — Source-first live engine and provider-cost freeze (EXPERIMENT)
- **PROBLEM/EVIDENCE:** Legacy search produced no owner-accepted quality listings; prior C131 pilots show Serper credits exhausted and major portals returning 403. New C131 classifier produced L1/L2 on bounded HappyHoliday live pilot, but its pipeline was offline-only and never the production path.
- **HYPOTHESIS:** A bounded source-first runtime using direct index/detail fetches, strict page-level locality/rooms/agency/seeker gates, owner evidence and durable listing writes can surface better candidates without paid Serper/LLM calls. Keep only sources with verified fetchability; blocked sources are skipped, not retried.
- **METRICS/ACCEPT:** live fetch counts, verified L1/L2 count, rejection reasons, duration and provider spend; no paid search/model calls; no writes for rejected/snippet-only pages; each saved fact traceable to the fetched detail page. Rollback criterion: runtime/type/DB failure or any unverified record admitted.
- **BASELINE:** previous full legacy runs: 0 kept; one HappyHoliday source pilot: 4/6 retained, including 2 L1 and 2 L2 (limited pilot, not production acceptance). Hosted CI and new-engine production outcome NOT_RUN.
- **SCOPE:** replace the production run entry with the new engine; reuse DB/delivery/auth plumbing only; disable runtime GitHub snapshot/diagnostic commits in favor of DB + Render logs; constrain fetches to configured direct sources and strict per-run budgets. Remove old discovery/classification pipeline only after dependency checks.
- **CLASSIFICATION:** EXPERIMENT; production user value NOT_RUN until first real completed run and review of its L1/L2 records.

## P131.8m — Pipeline the next SERP call behind candidate processing (RELIABILITY)
- **EVIDENCE:** run `d470cbb4` (after P131.8l): queries completed 12/17 (was 8/17), still `run_time_budget`, 0 kept. Per-query step times: queries with /goto links 18-23 s (Q1, Q2, Q6, Q10, Q12), others ~4 s. Earlier resolve durations (2 links 15.2/23.4 s, 3 links 16.2 s) are not proportional to link count, so the P131.8l hypothesis (serial per-link cost) is NOT confirmed; the 8→12 gain is attributable to fewer goto queries in that run (5/12 vs 5/8), not to parallel resolve.
- **HYPOTHESIS:** `/resolve` has ~15-23 s fixed latency per call. Starting the next SERP call while the current query's candidates are fetched/verified hides that latency (sequential wall time → max of the two).
- **METRIC/ACCEPT:** queries completed per 180 s run ≥14/17 with the same query list; no change in rejects. Baseline 12/17. Live re-run: NOT_RUN. Guard: only when `!finishAll` and >90 s left; pacing via `paceSerper`.
- **SCOPE:** `server/immofinderPipeline.ts`, `tests/immofinder-p0.test.mjs`. **ROLLBACK:** revert if queries completed does not rise or Serper 429s appear.
- **OBSERVED (quality):** all 91 candidates rejected legitimately by taxonomy (82 outside target, 5 snippet_only, agency, for_sale, rooms_below_min, seeker); no L1/L2 in this short test. Homegate/Tutti 403 and list-page URLs remain open.
- **CLASSIFICATION:** RELIABILITY; user value NOT_RUN.

## P131.8l — Resolve Serper /goto links in parallel (RELIABILITY)
- **EVIDENCE:** short test `b8e86208` (build c78fa4e, dryRun, Chur): 8 Serper calls ok (credits restored); `immofinder_serper_redirect_resolution` took 15.2-23.4 s for 2-3 links per query, 5 of 8 queries, ≈93 s of a 142.6 s run; `run_time_budget` stopped with 9 of 17 queries left; 0 kept. HappyHoliday: 82 candidates, 82 `municipality_not_whitelisted` by URL (Scuol, Lenzerheide), `consecutiveBad` 0, no early stop: P131.8k was not the blocker in this run.
- **HYPOTHESIS:** `/resolve` follows links serially (~8 s each); one call per goto row in parallel cuts per-query wait to the slowest link, so more queries fit the 180 s budget.
- **METRIC/ACCEPT:** `durationMs` of resolution ≤ 10 s per query; queries completed per run rises from 8/17. Baseline: 8/17, ≈18 s per resolve. Live re-run: NOT_RUN.
- **SCOPE:** `server/immofinderDiscovery.ts`, `tests/immofinder-p0.test.mjs`. **ROLLBACK:** revert if resolved-link share falls (`after` > 0 more often) or queries completed does not rise.
- **KNOWN (not in scope):** Homegate/Tutti 403 → 7 `trust_snippet_only`; list/index URLs (huusbro, immoscout, homegate matching-list) rejected as snippet-only instead of expanded. Separate hypotheses.
- **CLASSIFICATION:** RELIABILITY; user value NOT_RUN.

## P131.8k — Prefetch geo skips must not trigger source early-stop (BUGFIX)
- **PROBLEM/EVIDENCE:** catalogue sources early-stop after 14 consecutive non-keeps (`consecutiveStopFor`). URL/title geo rejects happen before any fetch yet increment `consecutiveBad`, so a wide index (HappyHoliday: 738 candidates, 20 fetched, 0 kept over 4 runs; run `038d1c87` stopped after 14 skips, 14 locale rejects) ends before in-area listings are reached.
- **HYPOTHESIS:** prefetch geo skips cost no fetch/LLM budget, so they must not count toward the streak; the streak keeps counting fetched non-keeps.
- **METRIC/ACCEPT:** a catalogue source with >14 out-of-area items before in-area ones is no longer stopped by geo skips alone; fetched candidates per source rise in the next live run. Baseline: 20 fetched / 738 candidates. Live run: NOT_RUN (Serper credits; source-first pilot usable).
- **SCOPE:** `server/immofinderPipeline.ts` (2 lines), `tests/immofinder-p0.test.mjs`. **ROLLBACK:** revert if fetched-per-source does not rise or budget use grows without kept gain.
- **CLASSIFICATION:** BUGFIX; user value NOT_RUN.

## C131 reconciliation — ledger corrections (non-product, no answer-path change)
- **SUPERSEDED:** "C131 WP1 — Owner-labelled baseline and offline replay (BLOCKED)" no longer blocks C131: D-2026-11-25-03 replaced the owner gold set with no-label invariant replay; its ≥60-label acceptance is void and no precision/recall may be claimed.
- **CORRECTED:** the three P131.5j and two P131.5i entries below describe one patch each; the final wording is "Place bounded testMode in PipelineOptions". The "C131 WP4/WP5 implementation audit" entry's acceptance (Gold replay) is superseded the same way.
- **OBSERVED:** run `038d1c87` (full, 44 communes): 113 candidates, 13 fetched, 0 kept, 20 Serper queries, 483 s; filters: 16 municipality_not_whitelisted, 7 rooms_unknown, 4 trust_snippet_only; Tutti/Homegate 403; HappyHoliday early stop after 14 non-keeps. Source yield, not recall; no hypothesis opened here.
- **CLASSIFICATION:** MAINTENANCE (docs + script path fix). Next answer-path change needs its own entry first (C127 rule 1).

## P131.7a — Give all-source Chur discovery enough bounded time
- **OBSERVED:** run `2acc4c0e-e085-4945-8c96-a8ff17fb59c5`: 91 candidates, 8/17 Serper queries, 5 index pages, 1 fetched detail page, 0 kept, 14 out-of-commune rejects, 7 snippet-only rejects, 1 shared-flat seeker rejected, Homegate/Tutti HTTP 403, 9 queries left at the 120-second test cap; USD 0.008.
- **HYPOTHESIS:** raise only the test duration ceiling to 180 seconds. The pipeline reserves 45 seconds for later stages, leaving up to 135 seconds for all 17 queries; retain one commune, 3 candidates/query, 2 detail pages/source, 2 browser renders, no contact enrichment and dry-run/no writes.
- **ACCEPTANCE:** all 17 queries complete or a typed provider/source failure is recorded; duration <=180s; no snippet-only or seeker L1; no listing/cache writes.

## P131.7 — Reject shared-flat seeker posts before L1 admission
- **OBSERVED:** dry-run `daab22a7-7e7f-4a87-9418-9754a85095d5`: 179 candidates, 15 Serper calls, 5 fetched detail pages, 1 L1 admission from Flatfox, 0 L2, USD 0.015. The admitted page described a WG/flatshare seeking new people; owner was not verified. This is a seeker/roommate request, not a private rental offer. No listing/cache writes.
- **HYPOTHESIS:** extend the generic seeker classifier to detect a shared-flat/household seeking roommates, even when the title itself looks like a rental offer in another language.
- **METRICS:** existing ImmoFinder quality and verify suites; assert `trust_seeker_post` for generic WG-seeker text and preserve normal 4-room rental offers; run bounded Chur dry-run after deploy.
- **ACCEPTANCE:** shared-flat seeker pages are rejected; ordinary owner rental offers remain eligible; no other C131 admission gates are weakened; no example-specific phrase is embedded in code.

## P131.6a — Extend the bounded all-query window to 120 seconds
- **OBSERVED:** run `92ced2d0-fdd2-4311-8732-c8b0e20d5847`: 86 candidates, 4/17 Serper queries, 5 index pages, 0 detail pages fetched, 0 kept, 4 snippet-only rejects, 14 out-of-commune rejects, Homegate and Tutti HTTP 403. Search stopped with 13 queries left because only 33 seconds remained under the 90-second cap and the pipeline reserves 45 seconds for later work.
- **HYPOTHESIS:** raise only the bounded test ceiling to 120 seconds. With the existing 45-second reserve, this gives up to 75 seconds for the 17 configured queries; the 20/min provider cap, one commune, 3 candidates/query, 2 detail pages/source, 2 browser renders and no enrichment remain.
- **ACCEPTANCE:** run has up to 17 query pages, never exceeds config page cap, 120 seconds, or provider rate limit; dry-run/no listing writes; no snippet-only L1.

## P131.6a — Expand the all-source Chur dry-run after first evidence
- **OBSERVED:** run `5dc40093-a7be-40f2-82a5-8a5510184bac`: 85 candidates, 2 Serper queries, 3 detail fetch attempts, 3 HTTP 403 challenge responses, 14 off-target HappyHoliday candidates, 0 fetched detail pages, 0 kept, USD 0.002. The test profile was correctly Chur-only and all source flags were true, but the harness still limited discovery to 3 pages and one private query.
- **HYPOTHESIS:** let all configured private/portal queries run within a finite page cap derived from query count; allow up to 2 detail pages/source and 2 browser renders; extend the hard timeout to 90 seconds. Keep one commune, max 3 candidates/query, no contact enrichment, dry-run/no writes.
- **ACCEPTANCE:** all queries and configured source adapters remain eligible; max pages never exceed query count or config cap; detail pages/source <=2; browser renders <=2; duration <=90s; no L1 admission from snippets; no listing/cache writes.

## P131.6a — Complete Chur all-source dry-run wiring
- **OBSERVED:** the fixed profile route passed the global auth gate but the ImmoFinder router middleware still only exempted `/run`; the first route contract returned 401. The test helper also truncated source adapters to three and portal queries to one.
- **CHANGE:** allow only the exact fixed-profile POST through the router middleware after timing-safe secret validation; keep every configured adapter and portal query eligible under the existing finite caps.
- **ACCEPTANCE:** profile endpoint returns DATABASE_UNAVAILABLE in no-DB tests with a valid secret and 401 for a bad secret; all configured sources/portal queries remain eligible; one commune, 3 pages, 1 detail/source, 1 browser render, no enrichment, 60 seconds, dry-run/no writes.

## P131.6a — Secret-gated reset to the Chur all-source test profile
- **OBSERVED:** production settings are persisted in Postgres and the reset endpoint requires a browser session; the owner-only agent workflow has a separate timing-safe run secret.
- **HYPOTHESIS:** expose one fixed-profile endpoint behind that same secret and make the owner-only dry-run workflow apply it before searching.
- **ACCEPTANCE:** endpoint cannot be called without the secret; it sets Chur only, all configured source flags on, minRooms=3, all optional price/contact/period/age filters off, schedule and delivery off, contact enrichment off; C131 admission gates remain unchanged.
- **SAFETY:** no arbitrary settings payload, no listing/cache mutation, dry-run only, existing search budgets remain in force.

## P131.6a — Repair CI metadata and copy regressions (BUGFIX)
- **OBSERVED / BASELINE:** P131.6 CI: ImmoFinder settings regression PASS; `lint:copy` failed on one 25+ word string; Core/Project suites failed because `REPAIR_RULES_VERSION` remained `131.5j.5` while package patch was `131.6`.
- **HYPOTHESIS:** Shorten only the UI string and synchronize the repair stamp with the non-product follow-up patch.
- **METRICS:** lint:copy, ImmoFinder category suite, Core CI and Project suite.
- **ACCEPTANCE:** no copy lint violation; repair stamp equals package patch plus `.5`; all prior settings tests remain green.
- **SCOPE:** UI copy, repair-rule version constant, package metadata and concise history only.
- **ROLLBACK:** revert only the stamp/copy edits if the version contract or copy linter changes.

## P131.6 — Restore user control over optional ImmoFinder filters (BUGFIX)
- **OBSERVED / BASELINE:** Advanced settings hard-coded price-period and direct-contact requirements as checked/disabled although C131 R2 makes price and direct contact optional; three configured catalogues were absent from the source selector; room selector offered values below the C131 minimum.
- **HYPOTHESIS:** Bind optional filters to persisted settings, expose every configured source, and provide a single reset-and-prepare action for manual Chur-only testing with all sources enabled and optional filters off.
- **METRICS:** Existing ImmoFinder category suite; settings contract assertions; typecheck/build; hosted CI; deployed settings round-trip and live dry-run diagnostics.
- **ACCEPTANCE:** No disabled optional filter; all configured source IDs are selectable/enablable; preset stores Chur only, all sources on, minRooms=3, no price/contact/period/age restrictions, manual schedule and delivery off; seeker/sale/non-residential/room evidence gates remain intact.
- **SCOPE:** ImmoFinder settings UI, existing tests/immofinder-quality.test.mjs, patch metadata and concise history. No admission-engine changes or listing/database mutation.
- **ROLLBACK:** Revert the UI/preset if settings round-trip changes any unrelated setting or if a C131 admission invariant can be bypassed.

## P131.5j — Place bounded testMode in PipelineOptions (BUGFIX)
- **OBSERVED / BASELINE:** PR #89 Core CI failed `typecheck`/`build` with TS2353 at `server/immofinderRoutes.ts:851`: `testMode` was placed on `PipelineDeps`. `PipelineOptions` declares `testMode?: boolean` and `runPipeline` uses `opts.testMode` to cap discovery pages. Render build for merge commit `6e3beb2` failed; previous successful deployment remained live.
- **HYPOTHESIS:** Move the flag from the first `runPipeline` argument (`PipelineDeps`) to the second (`PipelineOptions`); retain the bounded page cap and dry-run semantics.
- **METRICS:** Core CI typecheck/build, category test for call-site placement, successful Render build/deploy; test runner capped at 3 sources, 1 commune, 3 discovery pages, 2 detail pages/source, 90 seconds.
- **ACCEPTANCE:** `testMode` absent from dependency object and present in options object; pipeline cap test passes; no change to normal Full runs or listing admission.
- **SCOPE:** One route argument correction, one regression assertion, patch metadata and history.
- **ROLLBACK:** Revert only the argument move if pipeline option semantics change; preserve test-mode dry-run and all side-effect guards.
- **CLASSIFICATION:** BUGFIX; no USER_VALUE claim.

## P131.5j — Place bounded testMode in PipelineOptions (BUGFIX)
- **OBSERVED / BASELINE:** PR #89 Core CI failed `typecheck`/`build` with TS2353 at `server/immofinderRoutes.ts:851`: `testMode` was placed on `PipelineDeps`. `PipelineOptions` explicitly declares `testMode?: boolean` and `runPipeline` uses `opts.testMode` to cap discovery pages. Render build for merge commit `6e3beb2` failed; previous successful deployment remained live.
- **HYPOTHESIS:** Move the flag from the first `runPipeline` argument (`PipelineDeps`) to the second (`PipelineOptions`); retain the bounded page cap and dry-run semantics.
- **METRICS:** Core CI typecheck/build, category test for call-site placement, successful Render build/deploy; test runner still capped at 3 sources, 1 commune, 3 discovery pages, 2 detail pages/source, 90 seconds.
- **ACCEPTANCE:** `testMode` absent from dependency object and present in options object; pipeline cap test passes; no change to normal Full runs or listing admission.
- **SCOPE:** One route argument correction, one regression assertion, patch metadata and history.
- **ROLLBACK:** Revert only the argument move if pipeline option semantics change; preserve test-mode dry-run and all side-effect guards.
- **CLASSIFICATION:** BUGFIX; no USER_VALUE claim.

## P131.5j — Remove undeclared testMode from PipelineDeps (BUGFIX)
- **OBSERVED / BASELINE:** PR #89's hosted Core CI failed `typecheck` and `build`: `server/immofinderRoutes.ts(851,11) TS2353`, `testMode` is not a member of `PipelineDeps`. Render build for merge commit `6e3beb2` failed; the last successful service deploy remained live.
- **HYPOTHESIS:** The test-mode flag is already stored in queue progress and used to cap config before calling `runPipeline`; passing it again inside `PipelineDeps` is redundant and violates the pipeline contract. Remove that property and add a regression assertion.
- **METRICS:** Hosted typecheck/build/Core CI green; production deploy commit matches main; bounded test path remains Full/dry-run.
- **ACCEPTANCE:** `PipelineDeps` object has no undeclared testMode property; existing testMode queue, budget, dry-run and snapshot-skip behavior remains.
- **SCOPE:** One property deletion, one category regression assertion, patch metadata and history. No runtime algorithm or listing gate changes.
- **ROLLBACK:** Revert only this deletion if a real pipeline consumer is identified; no consumer currently reads the property.
- **CLASSIFICATION:** BUGFIX; no USER_VALUE claim.

## P131.5i — Make the bounded smoke runner complete and exercise direct sources (RELIABILITY)
- **OBSERVED / BASELINE:** Production dry-run `b9ea9f5f-bf0c-4a1b-bf84-3b114323c650` completed with 6 Serper calls, 14 candidates, 2 fetched pages, 0 kept, estimated cost USD 0.006; diagnostics persisted with 23 events. The workflow's 160-second poll expired before completion during an overlapping Render deploy; the run needed 3 worker attempts. Carousel mode exercised only `search`, `portal-homegate`, and `portal-tutti`, skipping phase-1 direct catalogues.
- **HYPOTHESIS:** Force test mode through the bounded Full/source-first path, allow up to 360 seconds for deploy/retry recovery, and explicitly type the retry-release SQL parameter to prevent PostgreSQL's unknown `$3` inference error.
- **METRICS:** Same-run diagnostics returned within the extended wait; sourceStats include phase-1 adapters; max 3 sources, 1 commune, 3 discovery pages, 2 detail pages/source, 90s per worker attempt; `dry_run=true`; no listing/seen-cache writes, delivery or snapshot publish.
- **ACCEPTANCE:** Test workflow succeeds after a controlled run, artifact/report matches runId, source-first fetcher counts are visible, and retry path regression passes CI.
- **SCOPE:** Test-mode wave selection, retry SQL cast, workflow timeout/poll window, ImmoFinder category regression, patch metadata and concise history. No listing admission thresholds or normal Full mode changes.
- **ROLLBACK:** Revert test-mode Full selection if it exceeds the bounded time/page budget or causes any persistent listing/cache/delivery side effect.
- **CLASSIFICATION:** RELIABILITY; smoke result is not a WP6 Full run and 0 kept is not a recall measurement.

## P131.5h — Correcting the agent test target
- **Correction to P131.5g Full-run interpretation:** the Tamins UMS page text states CHF 2,188/month and 7 Dec 2026–28 Mar 2027, but the saved record has price=null and price_cleared=fragment_as_price; its C131 contact route is none and owner verification is not_ready, so it remains L1 only. Run settings had maxMonthlyRentChf=1,800 but limitPrice=false, requirePrice=false, requireContact=false and rejectNonMonthly=false; therefore the CHF 1,800 cap was not active in that run. Do not describe this as a confirmed over-budget rejection or a qualifying owner listing.
- **OBSERVED:** The first /immofinder-test workflow ran but targeted the legacy IMMOFINDER_BASE_URL secret. That endpoint was the stale v130 Render service and returned HTTP 200 with skipped=not_due; the testMode field was ignored by the old code. No search was run and no listing data changed.
- **HYPOTHESIS:** Pinning the workflow to the verified My Workspace URL will route the test to commit 6be29f7 / patch 131.5g.
- **METRICS:** Target service health, accepted runId, bounded query/page budget, diagnostics and zero listing/seen-cache/snapshot writes.
- **ACCEPTANCE:** Correct-target test returns 202 and completes; health monitor reports the same deployed commit as main.
- **ROLLBACK:** Revert only workflow target changes; app route and test-mode code remain unchanged.

## P131.5g — Accessible settings panel and bounded agent-operated smoke search
- **OBSERVED / BASELINE:** Settings uses a native details/summary disclosure; user reports it does not expand on the search screen. Latest production Full run completed with 104 candidates, 20 result pages fetched and one L1-only record outside the configured rent ceiling; no L2/L3-qualified record was established.
- **HYPOTHESIS:** An explicit controlled button/panel with aria-expanded removes native disclosure ambiguity; a secret-gated, dry-run-only bounded test mode enables rapid source/parser iteration without user clicks or listing writes.
- **METRICS:** Accessible expanded-state contract; deterministic budget tests; source funnel, fetched pages, candidate decisions, duration and estimated Serper cost; full hosted CI.
- **ACCEPTANCE:** Settings opens/closes by mouse and keyboard; test runs require the existing run secret, force dry-run and Carousel, cap scope/time, skip cleanup/delivery and never persist listing rows or seen-cache entries.
- **SCOPE:** ImmoFinder UI, pure test-budget helper, run queue metadata/route, owner-only GitHub issue-comment workflow, category tests and patch docs. No changes to listing quality gates or normal Full-run behavior.
- **ROLLBACK:** Revert UI/route/helper/workflow together; normal manual and scheduled run paths remain unchanged.
- **CLASSIFICATION:** BUGFIX + DEVELOPER_TOOLING; live smoke results do not count as WP6 Full runs.

## P131.5e — Prevent stale payload from overwriting the current ImmoFinder core (BUGFIX)

- **OBSERVED / BASELINE:** The main-push `ensure-repair.yml` workflow invokes `immofinder-core-restore.mjs`, which unconditionally writes the P130.16 payload over the current core whenever payload fragments exist.
- **HYPOTHESIS:** Preserve an existing core by default; allow restoration only when the target is absent or an explicit force-restore environment flag is set.
- **METRICS:** Existing ImmoFinder category suite and hosted Core CI; regression assertion for the default-preserve and explicit-force contract.
- **ACCEPTANCE:** Ordinary main pushes cannot replace the current core with a stale payload; deliberate recovery remains possible; no payload or legacy file is deleted.
- **SCOPE:** Core restore script, existing ImmoFinder quality category test, version metadata and concise history. No database, production or source-tier mutation.
- **ROLLBACK:** Revert if a documented recovery workflow requires unconditional overwrite; use the explicit force flag for intentional restoration.
- **CLASSIFICATION:** BUGFIX; hosted verification required before merge.

## P131.5 — Surface provider-wide search failure as INFRA_FAIL (BUGFIX / USER_VALUE)

- **OBSERVED / BASELINE:** Production diagnostics `c9912bcf`, `98790669` and `85549585` show all Serper calls failing with HTTP 400 `Not enough credits`, 0 candidates and 0 fetched pages; the run is persisted and rendered as an ordinary zero-result run.
- **HYPOTHESIS:** Classify a run as `INFRA_FAIL` when every attempted Serper call fails and no candidate/page was processed; persist that status and show it instead of implying a quality result.
- **METRICS:** Deterministic pipeline status tests, persisted run summary, ImmoFinder UI summary, full Core CI.
- **ACCEPTANCE:** All-provider-failure/zero-candidate runs show `INFRA_FAIL`; successful empty searches remain `COMPLETED`; partial search failures with real candidate/page processing are not mislabeled; no change to search budgets or listing admission.
- **SCOPE:** Pipeline result status, run-store JSON summary, ImmoFinder last-run UI, existing ImmoFinder category tests, version/history. No external API calls, production DB mutation or source promotion.
- **ROLLBACK:** Revert if successful empty searches are marked `INFRA_FAIL` or provider failures are hidden.
- **CLASSIFICATION:** BUGFIX + USER_VALUE; no precision/recall claims.

## P131.4a — Production run diagnostic (no-label operational evidence)

- **OBSERVED:** Run `c9912bcf-38e8-45fd-9030-8fef3858ed2f` (2026-11-25 14:19 UTC) ran `carousel`; all 20 Serper requests failed HTTP 400 `Not enough credits`, with 0 candidates, 0 fetched pages and 0 L1 records.
- **INTERPRETATION:** `INFRA_FAIL`, not a quality/recall result. Carousel intentionally skips direct catalogues, so this run did not exercise HappyHoliday, Tutti or Homegate; the current source-first path is exercised only by `full`.
- **LIMIT:** Runtime diagnostics also show the deployed process is older than current `main` (`sourceCount: 0`, `llmEnabled: true` versus the current configured sources and deterministic extractor). Deployment identity must be checked before WP6.
- **NEXT EVIDENCE:** A deployed manual `full` run is needed to measure direct-source fetchability/yield; no source tier is promoted and WP7 remains conditional on a real WP6 recall gap.

## P131.4 — Repair L3 HTML evidence flow and restore CI type safety (BUGFIX)

- **OBSERVED / BASELINE:** Core CI run 45630696024 failed typecheck because the pipeline discarded fetched HTML before L3 verification (pages[i].body does not exist); the L3 verifier also checked platform forms against normalized text instead of the fetched HTML.
- **HYPOTHESIS:** Retain the exact fetched HTML with each candidate and verify platform-message forms against that same page body; keep page-text quote verification and URL identity checks unchanged.
- **METRICS:** Typecheck, ImmoFinder category tests, L3 direct/platform/none route outcomes, same-page URL rejection, full hosted Core CI.
- **ACCEPTANCE:** No TypeScript errors; a real same-page structured contact form can reach L3; missing/foreign-page form cannot; no auto-send and no unsupported draft facts.
- **SCOPE:** Pipeline page snapshot, L3 verifier, existing ImmoFinder category test, patch/version and concise history. No source-policy promotion, database mutation or production deployment.
- **ROLLBACK:** Revert if HTML evidence is not identity-bound to the fetched listing or any form without a textarea and submit control is accepted.
- **CLASSIFICATION:** BUGFIX. Hosted CI failure is the measured baseline; live owner review remains separate.

## P131.3a — Replace synthetic Gold scorer with no-label invariant replay (MAINTENANCE)

- **PROBLEM / OBSERVED:** Existing provider-free test fabricates labels such as good-owner/agency and reports precision/recall, contradicting D-2026-11-25-03; the fixture also omitted required page-grounded locality and failed admission.
- **HYPOTHESIS:** A no-label invariant replay will report only fetchability, admission/reject reasons, snippet admission and same-page provenance, with no owner-quality labels or precision/recall.
- **METRICS:** Core CI; admitted L1; infrastructure failures; reject taxonomy; cross-URL, mismatched-source and unverifiable-quote counts.
- **ACCEPTANCE:** No synthetic owner labels or precision/recall outputs; deterministic tests cover page-locality, fetchability and provenance; Core CI green.
- **SCOPE:** TrustEngine replay helper and existing ImmoFinder category test only. No runtime admission behavior change.
- **ROLLBACK:** Restore prior helper only if a real consumer is found; none is currently referenced outside its test.
- **CLASSIFICATION:** MAINTENANCE.

## P131.3 — Evidence-bound L3 letter generation (USER_VALUE / BUGFIX)

- **PROBLEM / BASELINE:** Current pipeline creates drafts from a free-form owner name and sets L2 using a broad phrase plus generic contact advice; it has no separate L3 verifier. The existing draft also asserts personal financial/insurance facts not supplied by the user. No owner-labelled precision/recall is available; baseline is deterministic TrustEngine and existing sanitized page fixtures.
- **HYPOTHESIS:** Build L3 only when private-owner evidence, an actual page contact route, and every listing-specific draft fact are grounded in the same fetched page; remove unsupported personal claims.
- **METRICS:** L1/L2/L3 counts; L3 rejection reasons; owner quote/page identity; contact route evidence; unsupported draft facts; existing ImmoFinder category tests.
- **ACCEPTANCE:** No L3 without exact owner quote and direct/platform action evidence; no owner name/property/locality/room fact absent from the fetched page; no invented personal financial claims; no auto-send; category tests, typecheck, build and hosted Core CI pass.
- **SCOPE:** Pure letter builder/verifier, existing pipeline integration, existing ImmoFinder tests, version and concise status/history. No source expansion, DB mutation or policy change.
- **ROLLBACK:** Revert if valid page-grounded private-owner/platform-route fixtures cannot reach L3 or any unsupported fact survives verification.
- **CLASSIFICATION:** USER_VALUE + BUGFIX. Gold labels are not fabricated; offline invariant evidence only.

## P131.2 — Enforce page-grounded locality and disable repeat contact enrichment (BUGFIX / RELIABILITY)

- **PROBLEM / BASELINE:** C131 R2 requires target locality evidence on the fetched detail page. The pipeline previously filled missing locality from URL/query hints and later allowed URL locality to override page extraction; the final trust boundary did not verify locality. Contact enrichment remained enabled with 35 secondary searches and 10 reverse-image lookups despite the delegated default-off decision. Existing baseline: deterministic locality and source-first tests; historical runs 072836e3 and 85549585 remain operational diagnostics only.
- **HYPOTHESIS:** Requiring the final verifier to independently match the configured locality against fetched page title/text, removing URL/snippet assignment, and making enrichment explicit opt-in will eliminate URL-only locality admissions and uncontrolled repeat searches without weakening other L1 requirements.
- **METRICS:** locality missing/conflict rejects; snippet-only L1+; source fixture/test outcomes; enrichment enabled flag and maximum per-run calls; ImmoFinder category CI.
- **ACCEPTANCE:** URL/query-only locality is rejected; page-grounded locality is accepted; conflicting locality is rejected; default enrichment and both budgets are zero; all ImmoFinder category tests, typecheck/build and hosted Core CI pass.
- **SCOPE:** TrustEngine, pipeline, contact enrichment defaults, config, existing ImmoFinder category suites, patch/version and concise history. No Gold labels, source expansion, production DB writes or legacy deletion.
- **ROLLBACK:** revert if page-grounded locality fixtures regress, URL-only locality remains admissible, or any snippet-only L1+ is observed.
- **CLASSIFICATION:** BUGFIX + RELIABILITY. No owner-labelled precision/recall is claimed.

## C131 — owner-directed no-Gold execution and trust-boundary correction (2026-11-25; pre-code gate)

- **PROBLEM / OBSERVED:** No owner-labelled Gold Set will be supplied. Existing repo evidence is usable without inventing labels: run 072836e3 has 620 events / 93 candidates / 72 fetched / 6 historically retained (audit review found none acceptable); run 85549585 records Serper credit exhaustion and zero candidates/fetches; ten sanitized portal evidence records exist in tests. These are operational/fixture observations, not a labelled holdout.
- **CORRECTION TO PRIOR AUDIT:** `shortStayContactReason` currently returns `null`; the earlier P131.1b audit incorrectly described a live direct-contact rejection. Do not change this helper. The verified gaps are URL-derived locality admission and contact enrichment enabled by configuration.
- **HYPOTHESIS:** The final L1 boundary will require locality evidence in the fetched detail page itself, never URL/snippet inference; enrichment will be off by default. Existing deterministic tests will assert both invariants without claiming labelled precision/recall.
- **METRICS:** page-grounded locality pass/reject; snippet-only and cross-URL admission counts; fixture-contract pass rate; source-index/detail fetch counts; per-source fetchability, L1/L2, Serper calls and spend when observed; enrichment calls.
- **ACCEPTANCE:** zero L1 locality sourced only from URL/search metadata; zero snippet-only L1+; no field provenance crossing URLs; enrichment defaults to zero extra searches/reverse-image calls; existing ImmoFinder category CI green. No precision/recall claim without independent labels.
- **SCOPE:** TrustEngine, pipeline locality provenance, config enrichment defaults, existing ImmoFinder category suites, version and concise history. No source expansion, no synthetic Gold labels, no production DB mutation or legacy deletion.
- **ROLLBACK:** revert if valid page-grounded locality fixtures are rejected, URL-only locality can pass, snippet-only records pass, or configured default spend exceeds the C131 cap.
- **CLASSIFICATION:** BUGFIX + RELIABILITY. **BASELINE:** 072836e3 and 85549585 historical diagnostics; current invariant baseline is covered by existing contract tests. Code edits follow this entry.

## C131 WP4/WP5 implementation audit — 2026-11-25 (pre-change gate)

- **OBSERVED:** The current pipeline derives a missing locality from the listing URL before admission, while the final trust verifier does not receive or verify locality; this can admit an L1 record without R2 page-grounded locality. The post-admission short-stay check still rejects records without direct phone/email, contrary to R2 optional-contact policy. contactEnrichment remains enabled with 35 secondary searches and 10 reverse-image lookups, contrary to the delegated default-off decision and the 20-query Serper ceiling.
- **OBSERVED:** WP4 currently writes L1/L2 and a draft string into stored metadata, but this audit did not establish a complete L3 verifier and result-type-specific anti-fabrication acceptance. Pre-C131 rows are not shown to be policy-version quarantined; the existing store/UI path still reads visible rows by hidden status.
- **HYPOTHESIS:** A narrowly scoped corrective experiment should restore page-grounded locality, remove the short-stay direct-contact bypass, disable repeated enrichment by default, and complete the L2/L3 owner/letter contract without admitting snippets or estimating rooms.
- **METRICS:** Owner-labelled Gold replay precision/recall and fetchable-good recall; R2 false-admission count; L1/L2/L3 counts; direct/platform/none route accuracy; enrichment and Serper calls/cost; legacy-row visibility and snapshot integrity.
- **ACCEPTANCE:** First obtain the ≥60-record owner-labelled WP1 baseline and complete the configured-fetcher WP2 pilot. Then replay before/after; no Gold recall regression, zero locality-from-URL L1 admissions, zero snippet-only L1+, zero short-stay rejection solely for missing direct contact, and no automatic letter sending. No source tier is promoted without ≥5 saved real page fixtures and measured pilot evidence.
- **SCOPE:** Trust admission, pipeline owner/contact/letter stages, enrichment defaults, and focused existing ImmoFinder category tests. No production DB mutation, legacy deletion, source expansion, or WP7 experiment.
- **ROLLBACK:** Revert the corrective runtime patch if owner-labelled recall falls, field provenance crosses URLs, or any false-positive admission rises above the approved threshold.
- **CLASSIFICATION:** EXPERIMENT / planned product correction. **BLOCKED:** owner-labelled Gold records and configured-fetcher pilot are not available in this session; no runtime code changed.

## P131.1a — Hosted verification result
- **PASS:** Core CI `45612490342`: 18/18 DAG checks, 182/182 core tests, typecheck/build, DB migrations, docs integrity, security scan and evidence gate.
- **PASS:** Ensure repair `45612490402` restored/synchronized repair modules successfully.
- **LIMIT:** Hosted CI validates code contracts; it does not establish owner-labelled recall, live source yield, production user value or WP6 acceptance.

## P131.1a — Corrective verification of the C131 L1 contract (CORRECTIVE)
- **OBSERVED:** The first post-merge Core CI run found 14 test failures; most were legacy assertions for mandatory price/date/contact and all-portal fallback, not implementation failures. A separate mismatch could classify a weekly quote as monthly if the caller's unit disagreed with the page quote.
- **HYPOTHESIS:** Updating tests to the already-approved R2 semantics and requiring source-unit agreement for monthly price metadata will restore a trustworthy green baseline without relaxing any C131 admission gate.
- **PRIMARY CORRECTION:** Preserve L1 admission with unknown/weekly/seasonal price and platform-only contact; keep explicit detail URL, locality, residential type, ≥3 Zimmer and reject conditions mandatory. Update old test fixtures with explicit `rooms_basis: 'zimmer'`.
- **ACCEPTANCE:** Core CI passes all existing category suites; no stale test may reintroduce a price/date/contact gate or unbounded source fallback.
- **LIMIT:** No Gold labels, production fetcher run, or user-value result is inferred from synthetic tests.

## P131.1 — Restore C131 L1 admission and make manual run source-first (EXPERIMENT)

- **PROBLEM / OBSERVED BASELINE:** WP0 policy is present in config/spec, but runtime still rejects a fetched listing unless it has a monthly CHF price, publication date and direct phone/email. Short-stay admission separately requires explicit price period and direct contact. Settings also force those gates on; default manual run is Carousel, which skips catalogues. A fresh public-page inspection found a directly fetchable Tutti GR rental index with 209 listings, including current 4.5-room offers in target communes, and a Homegate GR rental index with 236 results; Serper credits remain exhausted.
- **HYPOTHESIS:** A page-grounded L1 gate (URL + fetched detail + explicit ≥3 Zimmer + target locality + residential rental + not agency/seeker/expired), optional price/date/contact, and source-first full manual run will admit more genuine records without admitting snippets or estimated bedroom counts.
- **PRIMARY CHANGE:** Align TrustEngine, repair write gate and runtime quality settings with R1–R8; add bounded direct index adapters for HappyHoliday, Tutti and Homegate; default to a bounded full run with these sources before Serper; preserve per-host robots/pacing and no automatic sending.
- **SOURCE DECISIONS (Navigator delegated autonomy):** Prioritize `tourist_owner` first, then `direct_offer`; `rooms_unknown` → reject from L1 (review via diagnostics, never infer from bedrooms); pilot shortlist = HappyHoliday, Tutti, Homegate (three sources, below the five-source ceiling); N target = 3 L2 per run (aspirational, not a fabricated acceptance); Serper remains bounded secondary discovery (≤20 queries/run); repeated contact enrichment off. Platform messaging counts as a route, not proof of private ownership. Stop-list remains agencies/aggregators; direct host platforms are not blanket-rejected.
- **ACCEPTANCE:** Tests prove no price/date/contact requirement; no snippet-only admission; explicit page room count ≥3; final URL identity; target locality and residential type; source-first run with no Serper key; existing category CI green. A live production run remains NOT_RUN until the owner deploys and presses Run.
- **LIMITS / ROLLBACK:** No owner-labelled gold labels are authored. No source is declared R9 tier-1 until ≥5 saved real fixtures and a fetcher pilot scorecard are retained; these are controlled pilots. Roll back the admission/settings/source changes if wrong-object/agency/locality rates exceed the C131 threshold.
- **CLASSIFICATION:** USER_VALUE + EXPERIMENT; one primary hypothesis.

**Public-page evidence fixtures (2026-11-25):** `tests/immofinder-p0.test.mjs` retains five sanitized Tutti detail-page snapshots and five Homegate detail-page snapshots. Tutti samples include 4.5-room offers in target localities Untervaz and Cazis, two 3-room Jenaz/Pragg-Jenaz pages outside the 44-locality target, and a 1-room Splügen company-advertised studio (negative). Homegate samples include 4.5-room candidates in Jenins and Grüsch and company-advertised negatives in Ilanz, Untervaz and Chur. The fixtures omit personal names, phone numbers and street addresses. HappyHoliday's 90-item regional index is selected as a pilot source, but fewer than five sanitized detail fixtures are retained; it is not R9 tier-1. Tutti/Homegate fixtures are metadata/evidence snapshots, not raw HTML or owner labels; configured-fetcher pilot and cost/yield measurement remain outstanding.

## C131 WP1 — Owner-labelled baseline and offline replay (BLOCKED)

- **PROBLEM / BASELINE:** Audit run `072836e3` (2026-11-22) reported 152 Serper queries, 93 candidates, 72 pages, 70 LLM calls and USD 0.304; audit review found none of six retained records acceptable. The run is historical evidence, not a newly reproduced baseline.
- **HYPOTHESIS:** A provider-free replay over an owner-labelled, URL-grounded gold set will quantify current-engine precision/recall and distinguish product rejection from fetch infrastructure failure before any engine rewrite.
- **METRICS:** Per-label confusion matrix for `good_tourist_owner`, `good_direct_offer`, `wrong_object`, `agency`, `wrong_locality`, `not_listing`, `other`; page fetchability; L1/L2/L3; reject reasons; query/fetch/LLM/browser spend; module reference graph and transport-leftover inventory.
- **ACCEPTANCE:** ≥60 owner-labelled records; offline replay without provider keys; baseline precision/recall reported by label; fetchable-good recall baseline; reference trace of 17 ImmoFinder modules and 26 reported transport leftovers. Gold labels must be supplied by the owner; this coding session must not author or label holdout records.
- **SCOPE:** Existing ImmoFinder category suites and harness, snapshot fixtures/store, `server/immofinder*` reference inventory. No answer-path code or engine rewrite before WP1 baseline and WP2 scorecard.
- **ROLLBACK:** Remove only measurement instrumentation if it changes runtime decisions, leaks personal contact data, or makes replay depend on provider credentials.
- **CLASSIFICATION:** EXPERIMENT. **BLOCKED:** no ≥60-record owner-labelled gold set or owner labels were supplied in this session; baseline run and live run NOT_RUN.


**WP1 replay-harness design addendum (2026-11-25; written before implementation):** Add a pure scorer beside the existing trust verifier, with an explicit owner-label enum, fetchability flag, current-engine decision/reject reason, optional L2/L3 owner-review flags, and per-field `{field, sourceUrl, verbatimQuote}` provenance. It must make zero network/provider calls, report precision and fetchable-good recall plus per-label counts, infra failure rate, L1/L2/L3 counts, snippet-only admissions, and cross-URL/missing/unverifiable provenance. Tests use synthetic non-holdout inputs only; no fixture labels or records are authored by this session. This scorer measures the **legacy current engine** as-is and does not change admission behavior. Actual replay remains BLOCKED until the owner supplies ≥60 labelled page records.

**WP1 reference-trace observation (2026-11-25):** 17 runtime modules are present: `immofinderContactEnrichment`, `Core`, `Delivery`, `Diag`, `Discovery`, `Fetcher`, `Pipeline`, `Refresh`, `Repair`, `RepairStore`, `Routes`, `RunDiagnostics`, `SearchGuards`, `Settings`, `Snapshot`, `Store`, `TrustEngine`. Main wiring: `server.ts` → Routes; Routes imports the delivery, discovery, fetch, pipeline, refresh, repair/store, settings, snapshot and diagnostics services; Pipeline imports Discovery/Core/ContactEnrichment/Repair/TrustEngine; `allLogs.ts` imports RepairStore. Category suites reference the current contracts. The generated module map is dated 2026-11-21 and omits RunDiagnostics, SearchGuards and TrustEngine, so it is not a complete current graph.

**WP1 transport-leftover trace:** 26 files remain: Core payloads `p13016.b64.0–5` and `zlib.b64.p00,p04`; Repair payloads `zlib.b64.p0–p7,part1`; Store payloads `part0,part1,part2,part3,part3a,part3b,zlib.b64,zlib.b64.p0,p1`. `scripts/ensure-repair.mjs` and `.github/workflows/ensure-repair.yml` consume Repair/Store payloads; `scripts/immofinder-core-restore.mjs` consumes Core fragments. These are **not safe deletion candidates** until restoration scripts/workflow are retired and references rechecked.

**WP1 available-evidence gap:** `data/immofinder/listings.snapshot.enc` is an encrypted DB snapshot, not a fetched-page fixture set. The inspected run diagnostic contains event traces, not page HTML. No ≥60-record owner-labelled gold set or page snapshots were available; no labels were fabricated.

**Observed live infrastructure baseline:** run `85549585-515a-4938-870c-f492c751f753` (2026-11-25) stopped after 20 Serper HTTP 400 “Not enough credits” failures; 0 candidates, 0 fetches, 0 LLM calls, 0 saved listings, 94.2 s. Classify as **INFRA_FAIL**, not a quality result or zero-recall baseline.

## C131 WP2 — Source scorecard (PARTIAL MEASUREMENT; tier decision pending)

**Inspection protocol (2026-11-25):** Public page/index inspection of the 3 configured catalogs and all 13 configured portal hosts, plus three owner-discovery candidates. This was a bounded web-indexed inspection, not a run through the repository fetcher: no Serper/LLM API calls, no production requests, no saved fixtures, no per-host latency or backend request-cost measurement. Robots.txt was readable for 4/16 configured hosts (ImmoScout24, Homegate, Newhome, Tutti); the other 12 are **NOT_VERIFIED**, not presumed disallowed. Page accessibility in this inspection does not override robots or the configured polite fetch policy. USD paid-provider spend for this inspection: **$0**; production fetch cost remains **NOT_MEASURED**.

| Source | Fetch / JS / robots observation | Detail structure and owner/contact evidence | 44-locality coverage | Preliminary fit (not tier approval) |
|---|---|---|---|---|
| `ferienhausmiete` (catalog) | Region index readable; robots NOT_VERIFIED; HTML cards readable. | 43 GR offers across 8 named subregions. Cards expose guests, m² and bedrooms, not a reliable room count; price is often per night in EUR/CHF. Platform says direct host contact, but some API-fed direct-booking objects do not permit pre-booking contact. | Partial subregion coverage; not all 44 verified. | **MEDIUM / tourist_owner candidate**; bedroom count cannot satisfy R2 rooms without detail-page evidence. |
| `happyholiday` (catalog) | GR index and sample detail pages readable as HTML; robots NOT_VERIFIED. | Index reports 90 GR stays. Sample detail has exact address/locality, room count, bedrooms, description and a “Contact the owner” form. Some titles carry a private-owner signal; owner identity/direct contact is not exposed in the inspected page. | Several GR localities observed; not all 44 verified. | **HIGH / tourist_owner candidate**; strongest configured catalog structure, but private ownership still needs evidence. |
| `landwirtschaft-gr` (catalog) | Public association/agritourism pages readable; robots NOT_VERIFIED. | Not a listing catalogue. Agrotourism page routes farm owners to 17 destination organisations and lists destination contacts; no property detail records or room fields. | Destination network spans GR; per-locality listing coverage not present. | **MEDIUM / owner-discovery route**, not a listing adapter source. |
| `portal-immoscout24` | Search and detail HTML readable; robots readable with path/query disallow rules and explicit listing-search allows. | Sample detail exposes rooms, m², address, description and advertiser name; contact form available, but sample contact request restricted to TenantPlus. Private-vs-agency is not a dependable field in the sample. | GR search yielded dozens of 3–3.5-room examples across multiple communes; full 44 not measured. | **MEDIUM / direct_offer discovery**; strong structured detail, contact friction and owner classification remain. |
| `portal-homegate` | Search and detail HTML readable; robots readable with many query disallows and explicit search-path allows. | Sample detail exposes room count, address, description, named advertiser and phone; contact form also present. Sample was 2 rooms, not a qualifying lead; private/agency not established. | GR search index showed 236 rental results; locality coverage not exhaustive. | **MEDIUM / direct_offer discovery**; strong fields/contact, needs ownership and duplicate checks. |
| `portal-newhome` | Root renders JS-only shell to this crawler; indexed search/detail URLs are readable; robots readable and sitemap declared. | Search cards expose address, rent, rooms and area. Sample detail exposed either a private person's name/phone, an anonymous contact form, or an agency/company with business phone. | GR search and Chur pages indexed (226 rentals in GR in one result; 60 Chur); all 44 not measured. | **HIGH / direct_offer candidate**; unusually useful owner-vs-agency evidence, but adapter must handle JS/index-vs-detail differences. |
| `portal-flatfox` | Home page readable; search route returned no text; robots NOT_VERIFIED. | Search appears client-rendered; no stable detail fields or owner route verified. | NOT_MEASURED. | **LOW / JS_REQUIRED candidate**; defer unless bounded browser pilot proves yield. |
| `portal-tutti` | Category and sample detail pages readable as HTML; robots readable (broad allow with account/message/API paths disallowed). | Sample detail exposes title, monthly rent, date, locality, rooms, area, description and advertiser display name/profile age. A sample appears cross-posted from Homegate; advertiser identity alone does not prove private owner. | Multiple GR listings observed (Felsberg, Ilanz, Fläsch); all 44 not measured. | **HIGH / direct_offer discovery**; good fields and private-person clues, but dedupe and ownership verification are essential. |
| `portal-anibis` | Category/search HTML readable; robots NOT_VERIFIED. | Property taxonomy and search cards readable; a stable detail/owner-contact sample was not verified in this inspection. | GR coverage NOT_MEASURED. | **LOW–MEDIUM / unverified**; needs a detail-page pilot. |
| `portal-petitesannonces` | Web inspection was blocked by robots.txt/restricted URL. | No detail structure or contact route inspected. | NOT_MEASURED. | **LOW / blocked for this inspection**; do not fetch until robots/policy are independently checked. |
| `portal-immobilier` | Home page readable but explicitly indicates JS requirement; shows 28,190 active listings and 2,179 partner agencies. | Agency-heavy marketplace signal; no GR detail/owner sample verified. | Site describes 6 French-speaking cantons and 661 communes; GR target coverage not evidenced. | **LOW / likely geographic mismatch and agency-heavy**. |
| `portal-acheter-louer` | Root returned HTTP 403 in this inspection; robots NOT_VERIFIED. | No detail or owner route inspected. | NOT_MEASURED. | **LOW / blocked**, no retry budget spent. |
| `portal-immostreet` | Search/index HTML readable; robots NOT_VERIFIED. | Structured room/area/price/locality cards; observed listings cross-link to Homegate, creating a material mirror/duplicate risk. Detail ownership/contact may be inherited from source portal. | GR search index returned many listings in multiple communes; all 44 not measured. | **MEDIUM / discovery-only until provenance/dedupe proven**. |
| `portal-home` (home.ch) | Search/index HTML readable; robots NOT_VERIFIED. | GR results show room/area/monthly rent and multiple links to Homegate; aggregator/mirror risk. No independent owner contact verified. | GR search index showed 272 results; all 44 not measured. | **MEDIUM-LOW / likely duplicate discovery layer**, not a separate source of truth. |
| `portal-icasa` | Home page readable; robots NOT_VERIFIED; sample listing click hit a redirect loop. | Home page shows structured property cards, but inspected example was for sale; rental detail and owner contact not verified. | NOT_MEASURED. | **LOW / unresolved detail route**. |
| `portal-urbanhome` | Search and sample detail readable as HTML; robots NOT_VERIFIED. | Detail exposes rooms, monthly rent, address, description and provider identity. Sample advertiser was a verified professional company; platform also reports 571 private listings nationally, but the sample does not validate that pool. | No GR qualifying sample confirmed in this inspection. | **MEDIUM-LOW / potentially useful private pool, but local yield unknown**. |
| `graubuenden.ch` (candidate) | Public accommodation detail pages indexed/readable; robots NOT_VERIFIED. | Structured listing pages can include rooms, address, description and contact. Sample 4.5-room entry explicitly says private rental/direct landlord response, but the visible email/phone may be the destination office; another listing exposed a private email/phone. | Province-wide directory; 44-target locality coverage not enumerated. | **HIGH / tourist_owner discovery candidate**; separate owner contact from tourism-office contact. |
| `surselva.info` (candidate) | Owner-facing rental-service page readable; robots NOT_VERIFIED. | Describes owner onboarding and TOMAS reservation system, both “on request” and online booking; page exposes destination-office contact, not individual listings. | Surselva-only; likely relevant to several target communes, but mapping not completed. | **HIGH / owner-acquisition/referral channel**, not yet a listing adapter. |
| `berguen-filisur.graubuenden.ch` (candidate) | Owner-facing rental page readable; robots NOT_VERIFIED. | Owners register with the destination and receive TOMAS login to manage prices, availability, images and descriptions; no open listing feed inspected. | Bergün-Filisur destination only; target-locality overlap not confirmed. | **LOW–MEDIUM / owner-acquisition channel**, geography overlap must be checked. |

**Observed sample evidence (not gold labels):** HappyHoliday sample “Haus am See” exposes 9 rooms and a contact-owner form; a second sample is 2.5 rooms and therefore illustrates why room thresholds must be deterministic. ImmoScout24 sample detail exposes advertiser “Marcel” but contact is TenantPlus-gated. Homegate sample detail exposes a named advertiser and phone. Newhome samples include both a named private individual and a professional agency. Tutti sample details expose advertiser profile age; another result explicitly points back to Homegate. Graubünden Ferien sample listings include both direct private contacts and destination-office routing.

**Preliminary source ranking (proposal only):** tourist-owner discovery: HappyHoliday, Graubünden Ferien, Ferienhausmiete; owner acquisition: Surselva Tourism; direct-offer discovery: Newhome, Tutti, ImmoScout24/Homegate. These are candidates, not tier-1 approvals. No source can be admitted under R9 until an adapter exists, ≥5 saved fixture pages are reviewed, a fetcher-based pilot measures yield/cost, and its scorecard is retained.

**WP2 exit remains OPEN:** this inspection did not execute the configured fetcher, capture fixtures, measure per-host latency/cost, enumerate all 44 localities, or prove L1/L2 yield. Owner must select at most five tier-1 sources, set N L2/run after observed catalogue size, and decide whether Serper remains the detail-URL discovery channel. No tier, volume target, or Serper policy is silently inferred.

## P130.18a — Durable query-level recovery
- **PROBLEM / BASELINE:** P130.17d persists a PostgreSQL run queue and leases, but a recovered worker replays the query plan from the beginning; a process replacement can also interrupt a query before its candidates are committed.
- **HYPOTHESIS:** Persisting exact completed-query keys, cumulative counters and delivery acknowledgements after each fully processed query will let a new worker skip completed work, retry only incomplete queries and avoid duplicate wave notifications.
- **METRICS:** completed/skipped/retried queries, lease owner/loss, resumed run attempts, listing rows created per run, delivery acknowledgements, cancellation counts and CI.
- **ACCEPTANCE:** successful queries are skipped after recovery; failed/interrupted queries retry; counts/filters/source stats survive; no concurrent lease owners; completed channel deliveries are not repeated; manual cancellation preserves progress; SIGTERM drains or releases the lease.
- **SCOPE:** existing ImmoFinder pipeline, PostgreSQL worker/store/routes, shutdown hook and existing category tests. Preserve P130.18 Serper redirect resolution and browser-rendered fetching. No new service or relaxed admission gate.
- **ROLLBACK:** revert query checkpoint/resume and delivery acknowledgements independently if a query is skipped without success, duplicate rows/notifications occur, or cancellation loses its final counters.
- **CLASSIFICATION:** RELIABILITY. **NOT_RUN:** hosted recovery during a real deploy, live search yield and user outcome pending.
## P130.17e — Query-level recovery and search-result URL normalization
- **PROBLEM / BASELINE:** P130.17d adds a PostgreSQL run queue, but retries currently restart the 68-query search from its beginning; the prior run also discarded 162/190 Serper results because their links were Google redirect URLs.
- **HYPOTHESIS:** Persisting completed query keys and cumulative counters after each fully processed query will resume after process replacement without replaying completed work; unwrapping supported Google redirect parameters before host filtering will recover original listing URLs without admitting Google pages.
- **METRICS:** completed-query keys, resumed/skipped query counts, duplicate listing writes, lease-loss/retry events, normalized versus unresolved redirect URLs, direct-page fetch/admission yield, CI.
- **ACCEPTANCE:** a restart skips only successfully completed queries; an interrupted query is retried; counts and delivery state survive recovery; one lease owner per run; manual cancellation preserves progress; Google redirect URLs resolve only to valid HTTP(S) targets and unresolved wrappers remain rejected.
- **SCOPE:** existing ImmoFinder pipeline, PostgreSQL run progress/worker, Serper result normalization, existing category tests, patch metadata and concise release records. No new Render service, Key Value resource, or relaxed listing evidence gate.
- **ROLLBACK:** revert query-key resume or URL unwrapping independently if a failed query is skipped, duplicate writes/deliveries appear, or a Google wrapper is admitted as a listing.
- **CLASSIFICATION:** RELIABILITY. **NOT_RUN:** hosted recovery after an actual deploy, live search yield and user-visible outcome until independently verified.
## P130.18 — Resolve search redirects and render JS-backed listings
- **PROBLEM / BASELINE:** Production search run `7c91fdb1-b189-4858-8bab-a9dbc378c2a6`: 190 SERP hits included 162 Google `/goto` wrappers; only 9 candidates were selected, 8 processed, 0 admitted. Direct fetches included Homegate/Huusbro HTTP 403 and Newhome HTTP 200 with zero extracted text; 7 candidates fell back to snippets and were rejected.
- **HYPOTHESIS:** Resolve Serper redirect links through its zero-credit `/resolve` endpoint and use a bounded, public-target-checked Playwright render when direct HTML/Jina extraction is empty or challenged; more real detail pages should reach the unchanged trust gate.
- **METRICS:** goto links before/after resolution; resolver latency and unresolved count; direct/Jina/browser text length and status by host; trust-gate admissions and rejection reasons; no snippet-only admission.
- **ACCEPTANCE:** resolver preserves result-array shape and falls back safely; only public HTTP(S) requests are allowed in browser fallback; page identity is rechecked; at least 120 visible characters are required; monthly CHF rent, rooms, date, active status and advertiser contact remain mandatory; Core CI and Render deploy pass.
- **SCOPE:** Serper result normalization, ImmoFinder fetcher, search/fetch step timeouts and existing ImmoFinder category tests. No new search provider, no model extraction, no relaxed trust gate.
- **ROLLBACK:** revert redirect resolution and browser fallback together if resolver latency exceeds the run budget, browser memory destabilizes Render, or source identity/public-target checks fail.
- **CLASSIFICATION:** EXPERIMENT. The baseline run was interrupted by deploy and admitted zero listings; user-visible rental yield after this change remains NOT_RUN until a completed live search is observed.
## P130.17d — Durable ImmoFinder run recovery
- **PROBLEM / BASELINE:** Production run `7c91fdb1-b189-4858-8bab-a9dbc378c2a6` was replaced during Render deploy after 19/68 queries; 8 candidates were processed, 0 admitted, and the run row later lost its latest counters on manual stop.
- **HYPOTHESIS:** A PostgreSQL-backed queue with expiring worker leases, persisted run settings, durable cancellation, and idempotent retry will let a new app process recover unfinished searches after deploy/restart without concurrent workers.
- **METRICS:** queued/claimed/recovered/attempted/completed/cancelled runs; lease age/owner; query progress; saved-listing duplication; delivery status; CI recovery contracts.
- **ACCEPTANCE:** only one live lease per run; queued work is claimed after boot; expired leases are recovered; settings/wave/cycle survive process replacement; stop is persisted and does not erase counts; retries do not duplicate listing rows; worker drains or releases its lease on SIGTERM; migration is idempotent.
- **SCOPE:** existing PostgreSQL `immofinder_runs`, run routes/store, in-process queue consumer, server shutdown hook, migration 029 and existing ImmoFinder category tests. No new paid Render service or Key Value instance.
- **ROLLBACK:** revert worker dispatch/lease handling and migration 029 only if concurrent claim, lost queued work, duplicate listing writes, or unrecoverable stop state is observed.
- **CLASSIFICATION:** RELIABILITY. Baseline search yield was zero; live recovery after this patch and user-visible listing value remain NOT_RUN until independently exercised.
## P130.17 — ImmoFinder page-evidence gate
- **PROBLEM:** Prior diagnostics showed snippet-only and weakly attributed facts in visible results.
- **HYPOTHESIS:** Generated rental-intent queries plus deterministic extraction and fail-closed page admission reduce false listings.
- **METRIC:** admitted candidates must have matching detail URL, rooms, CHF/month rent, publication date, active rental status and advertiser-labelled contact; snippet-only admitted count = 0.
- **BASELINE / POST:** baseline evidence from P129.49/P129.51; post-change live run **NOT_RUN**.
- **SCOPE / ROLLBACK:** ImmoFinder pipeline, trust engine, settings and category tests; revert if a negative fixture is admitted or complete page evidence is rejected.
## P130.17 — ImmoFinder evidence-first trust engine

- **PROBLEM / BASELINE:** P129.49 observed 29/30 visible rows with snippet or missing page evidence; P129.51 supplied diagnostics still counted snippet-only candidates as kept. Existing pipeline also permits inferred dates, optional price/contact, and contact enrichment that never drops a row.
- **HYPOTHESIS:** A new fail-closed admission engine, isolated from discovery and extraction, will prevent any candidate lacking an identity-matched fetched detail page, explicit rental intent, consistent page-sourced room count, explicit monthly CHF price, fresh publication date, active status, and direct page-attributed contact from entering storage or delivery.
- **METRICS:** zero snippet/fetch-failure/redirect candidates admitted; zero unknown or conflicting required facts admitted; per-reason rejection counts; existing ImmoFinder category tests and typecheck/build; live search and user-visible quality separately reported.
- **ACCEPTANCE:** require a successful direct detail-page fetch with matching final URL and >=120 text chars; explicit rent intent and no sale/seeker/unavailable markers; page-only room evidence matching extracted value; exact page-quoted CHF/month rent; publication date within configured age; at least one plausible phone/email found on that same page; all missing/ambiguous facts reject; no enrichment or SERP fact can satisfy admission.
- **SCOPE:** new trust-engine module, pipeline admission integration, existing ImmoFinder quality category tests, patch/version metadata and concise experiment/report/changelog records. Preserve discovery provider, storage schema, UI, delivery, auth, privacy and all non-ImmoFinder systems. Serper credits, migrations, production DB and deployment are out of scope.
- **ROLLBACK:** revert the isolated trust-engine integration if a fixture with all required page evidence is rejected or any negative fixture (snippet, stale date, missing fact, wrong final URL, sale, unavailable, absent contact) is admitted.
- **CLASSIFICATION:** USER_VALUE. Baseline live quality and post-change live search remain NOT_RUN until independently observed.

## P129.53 — Purge legacy seen cache and restore CI metadata contract

- **PROBLEM / BASELINE:** The supplied P129.52 commit has inconsistent lock metadata: `package.json.patch` and top-level `package-lock.json.patch` are `129.52`, but `package-lock.json.packages[""].patch` remains `129.51`; `tests/project-mode-contract.test.mjs` asserts equality and therefore fails. Production `immofinder_seen` contains 2,483 legacy rows that the owner explicitly wants physically removed.
- **HYPOTHESIS:** Synchronizing all lock metadata to P129.53 restores the package metadata contract; a one-time idempotent migration with `TRUNCATE TABLE immofinder_seen` physically removes every old cache row on the next deployment migration run.
- **METRICS:** version metadata check; project-mode metadata contract; migration-source contract; focused ImmoFinder tests; typecheck/build/CI where dependencies permit.
- **ACCEPTANCE:** all three package patch fields equal `129.53`; migration 027 truncates the entire seen table exactly once; the migration runs through the existing startup migration runner; no listing rows or deletion behavior are changed.
- **SCOPE:** package metadata, one migration, seen-rule version and focused regression test, concise history/evidence. No listing-table changes and no change to manual deletion behavior.
- **ROLLBACK:** revert migration 027 only if it targets any table other than `immofinder_seen`; do not restore old seen rows.
- **CLASSIFICATION:** BUGFIX / RELIABILITY. Live PostgreSQL row count after deployment remains NOT_RUN until migration runs against production.

## P129.52 — ImmoFinder incremental processing and blocked-page recovery

- **PROBLEM / BASELINE:** P129.51 run `fde71391-dca5-4c0c-bbb2-ca532ee3b1df` logged discovery for only Zizers and Igis (32 query records / 11 picked-candidate counts), then Render started a new process at 09:47:30; no completion summary exists. CI run `44890826398` has five distinct ImmoFinder test failures. P129.51 admission requires `finalUrl` although the pipeline contract makes it optional, and rejects all detail text below 120 chars. The database also retained 2,483 seen-cache rows (259 checked in the prior 24h) while listing rows were zero. Prior recheck evidence shows many portal 403s; ImmoFinder fetcher does not use configured Jina Reader.
- **HYPOTHESIS:** incremental per-query processing plus the selected-commune scope prevents losing accumulated in-memory batches; `qdr:m` suppresses still-active portal ads and should not be applied to portal queries; `immofinder_seen` can suppress previously evaluated URLs even after their listing rows are deleted; optional URL provenance and a lower page-text floor restore legitimate direct listings without admitting snippets; Jina Reader fallback recovers public pages blocked by direct fetch.
- **METRICS:** query/candidate/fetch/reject/keep counts by host, fetch mode, final URL mismatch, seen-cache skips, freshness mode and commune coverage; CI contract tests.
- **ACCEPTANCE:** old matching private/direct fixtures pass; snippets and failed fetches remain unsaved; wrong-listing redirects remain rejected; thin non-listing pages remain rejected by downstream fact gates; portal queries omit `qdr`; all four selected communes appear in the run; deleting a card clears its URL cache; old seen-cache decisions are invalidated by the rule-version change; candidate outcomes and seen-cache skips are diagnosable by host/reason.
- **SCOPE:** ImmoFinder discovery loop, page fetcher, settings and focused regression tests. Deletion, database recovery, price limits and contact rules unchanged.
- **ROLLBACK:** revert Jina fallback independently if it yields mismatched URL evidence or unreliable page content; revert 30-char floor if direct-page fixtures bypass existing fact gates.
- **CLASSIFICATION:** BUGFIX / RELIABILITY. Live Serper, Jina, portal, DB and deployed result verification remain NOT_RUN.

## P129.51 — ImmoFinder discovery breadth and verified-page admission

- **PROBLEM / BASELINE:** Supplied 2026-11-21 run `d2b7faa5-b250-446e-b8e1-7b1a799a6657`: 68 Serper queries across the four-commune carousel produced 11 candidates, 2 fetched pages, 7 snippet-only candidates, 2 `kept` records with `snippet_only` evidence, and 0 saved rows at final diagnostics. `counts.new=1` conflicts with `sourceStats.new=0` because write-time hard rejects were counted before sanitation. Manual DELETE requests were intentional owner actions and are out of scope.
- **HYPOTHESIS:** A monthly discovery window and broader commune+portal queries will increase candidate discovery; snippet-only, failed-fetch, short-page and redirected-URL candidates must be rejected before extraction/persistence; write-time hard rejects must never count as kept/new.
- **METRICS:** queries, Serper calls/fallbacks, candidates, fetched pages, snippet-only rejects, final-URL mismatches, page-evidence length rejects, kept/new/updated and per-source counters.
- **ACCEPTANCE:** the legacy weekly freshness setting migrates to month; snippets never reach LLM or storage; a fetched page is admissible only with explicit final URL matching the requested listing URL and >=120 chars of page text; `sanitizeNewRecord.hardReason` prevents persistence; accepted monthly/seasonal prices still obey existing strict evidence/contact gates; aggregate and per-source kept/new counters agree.
- **SCOPE:** ImmoFinder discovery query config/settings/UI, fetcher final-URL contract, pipeline admission/counters, focused regression tests and patch metadata/history. No deletion behavior, database recovery, snapshot/auth, or price-limit loosening.
- **ROLLBACK:** revert query/freshness changes if candidate yield or useful direct-page fetches decline; revert admission changes only if a direct-page fixture that passes existing hard rules is rejected.
- **CLASSIFICATION:** BUGFIX / EXPERIMENT. Live Serper yield, live portal fetchability, deployed DB outcome and user-visible result quality remain **NOT_RUN** until deployment.

## P129.50 — ImmoFinder encrypted GitHub snapshot and short-stay listings

- **PROBLEM / BASELINE:** Hosted CI run `44884418425` fails both `typecheck` and `build:server` on `server/immofinderPipeline.ts:468` (`known` is out of scope); 16 checks pass and 2 fail. P129.49 excluded night/week/season prices by default and `config/immofinder.json` blocks direct holiday-rental hosts; no automatic full-DB GitHub snapshot exists.
- **HYPOTHESIS:** Carry auto-hide provenance with each fetched page; permit short-stay/seasonal offers only with fetched detail-page evidence, a concrete listing URL, an explicit amount+period and a direct phone/e-mail; publish every completed run's complete DB snapshot to the public repository only as authenticated AES-256-GCM ciphertext.
- **METRICS:** TypeScript typecheck/build; category tests; accepted short-stay fixture; rejected missing-period/contact/link/page-evidence fixtures; encrypted snapshot round-trip and GitHub Contents API contract; snapshot invocation on manual and scheduled finalization.
- **ACCEPTANCE:** CI source error removed; default/reset and existing persisted settings no longer reject non-monthly prices; direct seasonal sources are discoverable but meta-search aggregators remain excluded; strict short-stay gates pass; all rows (including hidden rows and contacts) are encrypted before GitHub commit; no plaintext personal data or secrets enter Git history/logs. Hosted CI, production GitHub write and live search outcome remain **NOT_RUN** until deployment/configuration.
- **SCOPE:** ImmoFinder pipeline/core/settings/config/routes/store snapshot integration; encrypted snapshot module; migration, env example, existing category tests, package metadata and concise history.
- **ROLLBACK:** Revert the snapshot integration if encryption round-trip or negative privacy tests fail; revert short-stay admission if a no-period/no-contact/non-specific-link fixture can be saved or delivered.
- **CLASSIFICATION:** USER_VALUE. CI infrastructure failure is reported separately from listing-quality outcome.

## P129.49 — ImmoFinder primary-page identity and price verification

- **PROBLEM / BASELINE:** Supplied 21 Nov snapshot has 30 visible / 86 total cards; 29 visible cards have snippet or no page evidence, and the sole `page_text` card has a 5-room stored value against a 3.5-room Flatfox title. Direct web checks confirm wrong/redirected targets, 404s and price conflicts. Baseline `node --experimental-strip-types --test tests/immofinder-quality.test.mjs tests/immofinder-p0.test.mjs`: **42 PASS**.
- **HYPOTHESIS:** A card is presentable only when evidence comes from a fetched detail page, the final response URL identifies the same listing URL, the stored monthly price is unambiguous and appears on that page, and the municipality/room facts do not conflict. Search snippets remain discovery hints only.
- **METRICS:** Visible cards without page evidence; URL redirect mismatches; price evidence missing/ambiguous; room/municipality conflicts; existing ImmoFinder category suites.
- **ACCEPTANCE:** Snippet-only, missing-page-evidence, redirected and price-ambiguous cards are hidden from screen/Drive/e-mail/Telegram; direct-page matching fixture remains presentable; pipeline stores the final fetched URL; versioned audit key reruns after deploy; only automatic hides can be restored after a later passing direct re-fetch; auto-hidden cards retry after a six-hour cooldown; category tests pass. Live post-deploy DB and delivery: **NOT_RUN**.
- **SCOPE:** `server/immofinder{Repair,RepairStore,Store,Fetcher,Pipeline}.ts`, `tests/immofinder-quality.test.mjs`, patch metadata and concise history.
- **ROLLBACK:** Revert if direct-page fixture fails, legitimate exact-URL monthly listings are systematically rejected, or source fetches do not provide final URLs.
- **CLASSIFICATION:** BUGFIX. The supplied data audit is user-value evidence; deterministic tests do not establish live post-deploy correctness.

## P129.44 — ImmoFinder spend control and lean defaults

- **PROBLEM / BASELINE:** Supplied 72h logs (17 hourly runs in ~11h, commit 3e8f5d7): ~28-32 discovery queries/run, up to 35 enrichment searches/run, 21 new / 24 kept listings in total, 9 of 17 runs with no new listing; 125/145 recheck fetches were HTTP 403 and two rechecks spent 70 searches for 0 contacts added. `search_queries` counts only the first Serper call, so unfiltered fallback calls are invisible. Live baseline re-run: **NOT_RUN**.
- **HYPOTHESIS:** Fewer, cheaper runs (6h cadence, 2 private templates, 8 communes/tick), no automatic unfiltered fallback, a 6-search enrichment budget, no contact search in recheck and no model call for snippets without a parseable room count cut Serper and LLM spend by well over half with unchanged kept/new per day. A persisted reset restores these defaults.
- **METRICS:** `serper_calls` and `serper_fallback` (new, in `immofinder_search_quality_summary`), `llm_calls`, `llm_skipped_no_rooms`, kept/new per day, communes covered per day.
- **ACCEPTANCE:** defaults sanitize and reset to the lean values; fallback fires only when enabled; snippet without rooms makes no model call and is not persisted; recheck makes no contact search by default; real Serper calls are counted; no loosening of price/room/agency/geo gates. Live spend and yield: **NOT_RUN** until deployed.
- **SCOPE:** `server/immofinder{Core,Settings,Pipeline,ContactEnrichment,Routes}.ts`, `src/ImmoFinderSettings.tsx`, existing immofinder test suites, patch metadata.
- **ROLLBACK:** Revert if kept/new per day falls below the 21/24 baseline over a comparable window or commune coverage drops below one cycle per two days.
- **CLASSIFICATION:** RELIABILITY (cost control). No claim of production improvement without a post-deploy run.

## P129.43 — Settings reset, CI contract repair, and higher-signal discovery

- **PROBLEM / BASELINE:** Supplied 20 Nov logs show 38 queries, 20 candidates, 9 fetched pages, 9 snippet-only hits, 14 junk rejects, 5 geo rejects, 0 kept/new; persisted UI still shows 2 communes and all source checkboxes selected. CI log shows 7 `test:core` failures and 1 `test:project` failure. User-value baseline: **0 new / 1 run**.
- **HYPOTHESIS:** A persisted “Reset to defaults” action is required because changing `defaultSettings()` cannot override DB-stored preferences. Defaulting to four communes and the four historically highest-yield discovery sources makes actual settings match intended defaults. More specific long-term rental queries plus unfiltered retry when fresh SERP results contain no specific listing link with a selected-commune signal should improve candidate relevance.
- **METRICS:** Saved settings after reset (4 communes; search/Tutti/Flatfox/Homegate enabled only), candidates, usable links after pickItems plus selected-commune evidence, fetched, kept/new, rejection reasons, and CI DAG.
- **ACCEPTANCE:** Reset persists exact defaults; 4 communes are used per carousel cycle; non-default sources remain off; CI `test:core` and `test:project` pass; no loosening of price/room/agency/geo credibility gates. Live Serper/DB user-value outcome: **NOT_RUN** until deployed.
- **SCOPE:** ImmoFinder settings routes/UI, discovery query templates and fallback, evidence card/footer fixes, focused tests, package patch metadata.
- **ROLLBACK:** Revert query/fallback changes if the usable-link rate or `kept/new` declines; reset action can be reverted independently.
- **CLASSIFICATION:** BUGFIX / EXPERIMENT. No claim of production improvement without a post-deploy run.

## P129.42 — ImmoFinder discovery freshness and recovery

- **PROBLEM / BASELINE:** 13 runs in the supplied 72h logs; 25/26 and 25/35 candidates already seen; saved export 45 listings, 26 Facebook (24 from two groups). `skipped_seen` reached 25/35. Baseline user-value re-run: **NOT_RUN**.
- **HYPOTHESIS:** weekly Serper freshness with no-filter fallback, commune-specific private queries, 5-query incremental processing, and not persisting incomplete-evidence rejects will increase distinct candidates and prevent partial-run loss.
- **METRICS:** candidates, skipped_seen/candidates, kept/new, and per-source host counts in `immofinder_search_quality_summary`; DB snapshots before/after run.
- **ACCEPTANCE:** settings default to 4 communes; freshness fallback is exercised; every batch of up to 5 queries is processed before continuing; `rooms_unknown` / `municipality_not_whitelisted` and snippet-only `price_unknown` are not persisted to `immofinder_seen`; DB diagnostic event includes listing/seen counts and pool state.
- **SCOPE:** `config/immofinder.json`, `server/immofinderDiscovery.ts`, `server/immofinderPipeline.ts`, `server/immofinderSettings.ts`, `server/immofinderDiag.ts`, `server/immofinderRoutes.ts`, `src/ImmoFinderSettings.tsx`, focused tests and patch metadata.
- **ROLLBACK:** revert P129.42 if fresh-query fallback, incremental processing, or source defaults regress candidate yield or cause Serper budget exhaustion.
- **CLASSIFICATION:** BUGFIX / RELIABILITY. Live Serper, database and user-value outcome remain **NOT_RUN**.

# EXPERIMENTS — measurement ledger (C129 Quality Search)

> **Phase shift (C129):** ImmoFinder **searcher construction is complete** (sources, waves, geo, contacts, price extraction, settings, Drive/email).  
> From **P129 / C129** the programme is **quality of search**: denser private long-term leads, commune coverage over a day (carousel), better prices/contacts, less junk — not new product scaffolding.

## EXP-IMMO-4 — Recheck stored listings for date/contact completeness (P129.23a, EXPERIMENT)

| Field | Value |
|---|---|
| **Problem and evidence** | Stored cards can have missing/stale publication dates or contacts; prior Recheck only reapplied stored filters and parsed prices. |
| **Hypothesis** | Refetching each saved listing, parsing declared/text dates and page contacts, then searching publicly only when contacts remain absent will improve completeness without deleting existing values. |
| **Baseline** | Current stored-card completeness and date/contact counts are captured at job start; dev-set and live baseline `NOT_RUN`. |
| **Metric / acceptance** | Per-run completeness before/after; date/contact additions; source/host gaps; no data loss on fetch failure; CI test contracts pass. Dev-set before/after and live completeness gain `NOT_RUN`. |
| **Files in scope** | `server/immofinderCore.ts`, `server/immofinderRefresh.ts`, `server/immofinderDiag.ts`, `server/immofinderRoutes.ts`, `server/immofinderStore.ts`, `src/ImmoFinder.tsx`, `tests/agents-contract.test.mjs`, generated graph, history/version files. |
| **Rollback criterion** | Any existing date/contact is erased by an unsuccessful recheck, or recheck updates the wrong listing; revert refresh path. |
| **Result** | `NOT_RUN` (live deploy and real listing sample required). |


## C129 operating modes (quality phase)

| Profile / wave | Intent |
|---|---|
| **carousel** (default schedule) | Next N communes (default 2) via Serper + model extract; catalogues skipped on the tick; cycle = realRunCount. |
| **priority / extended / full** | Burst modes for manual wide coverage. |

Serper = live URLs; LLM via model router = extract only. Prefer quality metrics over new scaffolding.


## EXP-IMMO-3 — Hourly commune carousel (P129.0, USER_VALUE)

| Field | Value |
|---|---|
| **Problem and evidence** | Full burst over 44 communes in one run is expensive and still under-filled cards; Navigator needs steady private leads over a day. Discussion 2026-11-17: agent may work for 24h; 2 communes/hour via Google + model extract is enough. |
| **Hypothesis** | `wave=carousel` + `profile=carousel` + `carouselCommunesPerRun=2` + `cycle=realRunCount` covers all whitelist communes in ~22 hourly ticks; Serper+LLM extract without catalogues per tick raises kept/private density vs one noisy full run. Model router carousel remains the LLM failover. |
| **Baseline** | P128 full run: ~7 objects, many price n/a, discovery limited historically to 5 communes. |
| **Metric / acceptance** | (a) One carousel tick touches ≤ carouselCommunesPerRun communes in search queries; (b) over 22+ scheduled ticks all enabled communes appear in progress/search lines; (c) tick finishes without multi-minute AI waits; (d) new listings still pass geo/agency gates; (e) price_quote path fills rent when page text has CHF. |
| **Files in scope** | server/immofinder{Pipeline,Routes,Settings}.ts, src/ImmoFinder{,Settings}.tsx, config/immofinder.json, docs/C129_QUALITY_SEARCH.md, docs/EXPERIMENTS.md, CHANGELOG.md, TECHNICAL_REPORT.md, package.json. |
| **Rollback criterion** | Carousel produces zero discovery queries or skips all communes for >3 ticks: revert profile default to burst / wave full. |
| **Result** | `NOT_RUN` (needs hourly schedule + Navigator). |


## EXP-IMMO-2 — Priority-first search stages + contact/geo quality (P128.21, USER_VALUE)

| Field | Value |
|---|---|
| **Problem and evidence** | Logs 128-20: candidates=512, fetched=76, llm=75, kept=1; 38/75 municipality_not_whitelisted after LLM (Scuol/Engadin); search stage barely started; PDF shows fake phones (+41000000000) and garbage emails. Recommendations: first 10 min must capture majority of valuable private listings; productive sources first; stages runnable separately. |
| **Hypothesis** | (1) Early geo prefilter on URL + title/snippet + post-fetch text before LLM, (2) consecutive-bad early-stop per source, (3) web-search slice inside priority wave, (4) plausible contact filters, (5) explicit wave modes priority|extended|full with UI controls — raise kept/private density in first 10 min and cut wasted LLM on out-of-zone pages. |
| **Baseline** | Run 93df10a9 / ff9355c7: kept≈1 over ~30 min; many geo rejects after LLM; search incomplete. |
| **Metric / acceptance** | (a) Stage-1-only run finishes ≤12 min and produces ≥ previous full-run kept count on same commune set when re-run within a day; (b) skipped_geo before LLM increases vs post-LLM municipality rejects; (c) zero stored contacts matching isPlausibleSwissPhone/Email false cases; (d) sourceStats present on every run; (e) Navigator can start Stage 1 only from UI. |
| **Files in scope** | server/immofinder{Core,Pipeline,Routes}.ts, src/ImmoFinder.tsx, tests/immofinder-quality.test.mjs, docs/EXPERIMENTS.md, CHANGELOG.md, TECHNICAL_REPORT.md. |
| **Rollback criterion** | Fabricated contact stored, or Stage-1 kept collapses vs baseline without geo improvement: revert P128.21. |
| **Result** | `NOT_RUN` (needs live deploy + Navigator verification). |

## EXP-IMMO-1 — Verified-evidence extraction of private short-term-rental owners (P128.x, USER_VALUE)

| Field | Value |
|---|---|
| **Problem and evidence** | Owner's months of portal searches yield nothing: agencies dominate and select tenants opaquely. Owner found current flat via a private listing. Evidence is owner-reported (OBSERVED by owner, not measured here). |
| **Hypothesis** | Niche holiday-rental catalogues, filtered by a fixed commune whitelist, room count and agency stop-list, then LLM-classified with evidence quotes and verified deterministically against fetched text, give ≥ 3 real private-owner listings per run-week with zero fabricated contact data. |
| **Baseline** | `NOT_RUN` — no pipeline exists. A frozen fixture set of fetched listing pages (≥ 30, saved by the first fetch patch, labelled by the Navigator, not by the coding session) is the dev set; holdout is labelled separately by the Navigator. |
| **Metric / acceptance** | (a) ≥ 3 distinct listings in whitelist, ≥ 3 rooms, not on stop-list, with working listing URL on the first live run; (b) fabricated phone/email/owner name = 0 (every stored contact value appears verbatim in a stored source text, checked in unit tests and per run); (c) Navigator-labelled private-owner precision ≥ 70% on the dev set; (d) every run reports found / filtered-by-reason / errors / estimated cost. |
| **Files in scope** | `server/immofinder/*`, routes under `/api/immofinder`, migration for `immofinder_*` tables, `src/ImmoFinder*.tsx`, `config/immofinder.json`, existing category suites per `docs/TEST_MAP.md`. |
| **Rollback criterion** | Fabricated contact > 0 in any run, or precision < 50% on holdout after one corrective patch: disable the module by config flag and stop. |
| **Result** | `NOT_RUN` |

## EXP-PROJECT-9 — Compact plan + human brief + shared contracts (P127.34, FEATURE)

| Field | Value |
|---|---|
| **Problem and evidence** | Session 2026-11-08: chess job `06171406-…` produced 12 units with incompatible shapes (Board stores letter codes; rules expect `{type,color}`; serialize returns string vs array; Coord `{r,c}` vs `{row,col}`). Validators mostly green, `goalImplemented=false`, program unusable. Root cause: plan prose contracts + independent multi-unit generation without a shared data model. |
| **Hypothesis** | Preferring a compact 3-file plan with one owner of state+DOM, attaching machine-readable `Plan.shared` (types/wiring/smoke), injecting those contracts into every coder prompt, and exposing a short human brief before/with the build reduces shape divergence enough that a mini chess (or similar board game) opens and accepts a move. |
| **Baseline** | Live chess-class builds in the log window: multi-module PARTIAL / unusable (see app-source.zip sample). Unit tests: prior ensureMultiFile forced expand to many modules for standard goals. |
| **Metric / acceptance** | Unit: compact chess-like plan ≤4 files with `shared`; single-HTML interactive coerces to compact template; `buildHumanBrief` is short and free of internal jargon; ambitious goals still expand but ≤8 files. Live (next deploy, prompt «классические шахматы»): delivered ZIP has ≤4 runtime files + `manifest.json`, opens with visible board, at least one legal click-move works; `human_brief_ready` appears in logs. |
| **Scope** | `appBuilder/core-types.ts`, `intent-brief.ts`, `stack-static-site.ts`, `core-prompts.ts`, `core-cache.ts`, `core-engine.ts`, `index.ts`, `tests/project-builder-recovery.test.mjs`, patch records. No UI mount/routing change in this patch (brief is on Spec/report/events for host to surface). |
| **Rollback criterion** | Compact builds systematically under-implement stated goals vs multi-module baseline, or live chess-class still unusable after one corrective patch: revert P127.34. |
| **Result** | Unit tests: see TECHNICAL_REPORT. Live: NOT_RUN. User value: NOT_RUN. |

## EXP-PROJECT-8 — Names that two files must agree on (P127.33, BEHAVIOUR)

| Field | Value |
|---|---|
| **Problem and evidence** | Navigator session 2026-11-07, commit 9387144 (127.32), three builds, all `SUCCESS` with 12 of 12 validators ok and `runtimeVerified=false`, all unusable when opened (delivered `index.html` opened in headless Chromium, screenshots). (1) The stylesheet only styles `.square.light`/`.square.dark` and `.square.selected`, the script gives squares the classes `white`/`black`/`highlight`: the board is transparent and invisible. (2) The stylesheet shows a slide only as `.slide.active`, no script ever sets `active`: every slide has opacity 0. (3) Scripts name six picture files (`img/…jpg`); a package holds text files only, so none exist (`ERR_FILE_NOT_FOUND`). A fourth defect in the same builds (a click handler reads `dataset.row` while the renderer wrote `dataset.pos`) throws on the first tap and is found only by the browser check. A fifth (the piece type names `p` in the engine and `pawn` in the renderer: board, no pieces) is silent and found by no check below. |
| **Hypothesis** | Two mechanical checks on names shared between files, reported as one validator `name-contracts` and sent into the existing bounded cross-file repair: (a) a CSS rule that needs a second class (`.a.b`) where `b` appears in no script or markup (as a whole word, or as the prefix of a composed name), (b) a script or stylesheet that names a local picture, sound or font file that is not in the package. They catch (1), (2), (3) in the replayed builds and are not triggered by the same files after the defect is removed. |
| **Baseline** | Replay of the three delivered packages: `name-contracts` does not exist; 0 of 3 flagged. Live: 3 of 3 builds SUCCESS and unusable in this log window (n=3). |
| **Metric / acceptance** | Tests: each defect above flagged with the defect in place and not flagged after it is removed; dynamic prefix names, single-class rules, data/external URLs and files present in the package are not flagged; an integration build repairs a missing-asset reference through the cross-file repair. Replay: the three delivered packages give >= 3 issues in total and the two non-defective neutral fixtures give 0. Live (same prompt set, runtime check enabled): builds that finish `SUCCESS` and open with something visible >= 60%, versus 0 of 3 now; false `PARTIAL` (working program held back by this validator) observed in <= 1 of 10 builds. |
| **Scope** | `appBuilder/validator-static-site.ts`, `appBuilder/core-engine.ts` (CROSS list, CSS targets, one prompt sentence), `tests/project-builder-recovery.test.mjs`, patch records. No scenario words in code or tests (neutral names only). Deletion: none; the validator is added to `REQUIRED_VALIDATORS`. |
| **Rollback criterion** | Any program that worked before is held back by a flagged name that is in fact set dynamically (false `PARTIAL`), or live visible-and-`SUCCESS` rate is not above 0 of 3: revert P127.33. One corrective patch allowed, then stop or revert. |
| **Result** | Unit tests and replay: see TECHNICAL_REPORT. Live: NOT_RUN. User value: NOT_RUN. |

## EXP-PROJECT-7 — Open the built page in a sandboxed browser and repair what throws (P127.32, BEHAVIOUR)

| Field | Value |
|---|---|
| **Owner authorisation** | Navigator, session 2026-11-07: "да. запускай" in reply to the request to run generated code in Project Mode (AGENTS.md: running generated code needs explicit owner authorisation). Scope of the authorisation: a sandboxed headless browser opening the built page. Not given: any change of the deployment image or hosting configuration. |
| **Problem and evidence** | Job after P127.31 (commit a3932a4, 3D board program, outcome PARTIAL `validators_failed: refs`). Opening the delivered page in headless Chromium with a stub of the 3D library logged `Initialization failed: TypeError: scene.add is not a function` at `setupLights`, 0 frames rendered, status text visible, canvas empty (matches the user's screenshot). The cause is a cross-file shape mismatch (a factory returns an object, the caller uses it as the scene) that none of 12 static validators can see (type-contracts: ok, no issues). Earlier builds in the same log window (mazes, race, board) also ended without any run; `runtimeVerified` is false in every report. |
| **Hypothesis** | Opening the page once and feeding the thrown error (message plus the first stack frames, mapped to project files) into the existing bounded cross-file repair lets the model fix errors that only appear at run time, and an error that stays is reported instead of a green static result. |
| **Baseline** | Offline replay on the delivered sources: 1 uncaught initialisation error, 0 frames. Live: runtime errors found by the build = 0 of 6 builds (nothing ran); n too small for a rate. |
| **Metric / acceptance** | Tests: a fake runtime port with an error drives one repair and the report ends with `runtimeVerified=true` only when the second run is clean; an unavailable or absent port leaves every report exactly as before (`runtimeVerified=false`, no new validator); request policy of the runner blocks every host except two script CDNs; a real headless run of the delivered sources reproduces the error. Live (same prompt set as `project-user-value`, deployed with the browser installed): pages opened without an uncaught error >= 50% of builds that finished, measured against the 0 recorded by the independent runner at 127.31. |
| **Scope** | `appBuilder/core-ports.ts`, `appBuilder/core-engine.ts`, `appBuilder/index.ts`, `server/appBuilderRuntimeCheck.ts` (new), `server/appBuilderAdapter.ts`, `tests/project-builder-recovery.test.mjs`, generated inventories, patch records. No prompt rewrite beyond one sentence in the cross-file repair prompt. No scenario words in code or tests. |
| **Safety** | Off unless `PROJECT_RUNTIME_CHECK=true` and a Chromium for Playwright exists on the host; otherwise the build behaves exactly as before. Fresh browser context per check, one check at a time, hard time limit, service workers and downloads blocked, the page is served from memory on a reserved never-resolving origin, only two script CDN hosts may be reached, everything else is aborted. `--no-sandbox` only with `RUNTIME_CHECK_NO_SANDBOX=true`. |
| **Rollback criterion** | Any build that was complete before is reported failed because of an environment error (browser missing, GPU absent, CDN unreachable) instead of "not run"; or live clean-open rate is not above the 127.31 value: unset `PROJECT_RUNTIME_CHECK` (no redeploy needed) and revert P127.32. One corrective patch allowed, then stop or revert. |
| **Result** | Local tests and one real browser run: see TECHNICAL_REPORT. Live: NOT_RUN. User value: NOT_RUN. |

## EXP-PROJECT-6 — Keep a usable model plan (P127.31, BUGFIX)

| Field | Value |
|---|---|
| **Problem and evidence** | Navigator session 2026-11-07, commit c39688e, job 71621f10: the planner returned a usable plan (9 files) whose unit ids have no extension (`index`, `board`) while `dependsOn` and `order` name files (`style.css`, `game.js`). `validatePlan` rejected it (16 issues: `missing_dep`, `unknown_unit_in_order`, plus a two-unit cycle between the entry script and the input script), the template fallback replaced it, the entry script was generated before three of the modules it must use and became a stub, and the build ended PARTIAL (`plan_fallback`). The delivered page showed an empty board strip and no pieces (screenshot). |
| **Hypothesis** | Dependencies are generation-order hints. Resolving a reference by unit id, file path or file stem, dropping hints that name nothing and breaking a dependency cycle at its least-connected unit keeps a model plan that is sound in substance, so the entry script is generated after the modules it imports and the generic fallback is used only for plans that are really unusable (no units, unsafe or duplicate paths, too many units). |
| **Baseline** | Replay of the logged plan shape (neutral names, same graph): `validatePlan` ok=false, 16 issues; build outcome PARTIAL with `plan_fallback`. Live: this log window had 6 builds, 1 hit `plan_validate_failed` (1/6); n is too small for a rate. |
| **Metric / acceptance** | Unit tests: the replayed plan validates, keeps its own units and contracts, the entry unit runs after every unit it depends on; unusable plans (empty, unsafe path, duplicate path, too many units) are still rejected. Live (next automatic run, same prompt set): `plan_fallback` events <= 1/20 builds. |
| **Scope** | `appBuilder/core-plan.ts`, `appBuilder/core-engine.ts`, `tests/project-builder-recovery.test.mjs`, patch records. No change to prompts, validators, the fallback plans or any model call. No scenario words in code or tests; no regex on user language. Deletion: the empty dependency loop in `validatePlan`. |
| **Rollback criterion** | Any rejected-plan case above is accepted, or live `plan_fallback` is not lower than the 2026-11-07 window: revert P127.31. One corrective patch allowed, then stop or revert. |
| **Result** | Unit tests: red before, green after (see TECHNICAL_REPORT). Live: NOT_RUN. User value: NOT_RUN. |

## EXP-PROJECT-DOM — Entry HTML first (P127.26, EXPERIMENT)

| Field | Value |
|---|---|
| **Problem and evidence** | Live run bfc8eb6: `dom-wiring` failed in 3/20 builds; Navigator session 2026-11-07: 3/6 builds (ids such as `current`, `btn-nitro`, `hud-*` absent from the HTML); repair rejected `no_improvement`. |
| **Hypothesis** | Generating the HTML first and giving scripts and styles its real ids removes most dom-wiring failures. |
| **Baseline** | commit bfc8eb6, 20 live runs: dom-wiring failures 3/20; reachability 4/20; refs 0/20; module-contracts 1/20; PRODUCT_PASS 1/20. |
| **Metric / acceptance** | Same live set on the deployed commit: dom-wiring failures <= 1/20 AND reachability + refs + module-contracts failures not above 5/20 combined AND PRODUCT_PASS >= 1/20. |
| **Scope** | `appBuilder/stack-static-site.ts`, `core-prompts.ts`, `core-engine.ts`, tests. No scenario words in code; no new language-specific regex. Deletion: HTML dependency lines in `expandedPlanFromBrief`. |
| **Rollback criterion** | Acceptance not met: revert P127.26. One corrective patch allowed (for example HTML told which scripts are modules), then stop or revert. |
| **Result** | NOT_RUN (needs the deployed commit and the live workflow). |

## EXP-PROJECT-RACE — Archive stored before terminal state (P127.25, BUGFIX)

| Field | Value |
|---|---|
| **Problem and evidence** | Live run on bfc8eb6: 7/7 SUCCESS builds polled without `downloadUrl` (`hasDownloadUrl=false`). Code: `core-engine.ts` saved `done`, the adapter stored the ZIP afterwards; the client stops polling on the first terminal status. |
| **Hypothesis** | Storing the ZIP before the terminal save removes the window. |
| **Metric / acceptance** | Unit test: first terminal save carries `artifactId` (complete and partial). Live: SUCCESS builds with `hasDownloadUrl=true` = 100% on the next live run. |
| **Scope** | `appBuilder/core-engine.ts`, `server/appBuilderAdapter.ts`, `server/projectRoutes.ts`, chat UI (`BuildFilesPanel`), tests. UI requested by the Navigator in the same patch. |
| **Rollback criterion** | New failures in resume or cancel tests, or SUCCESS builds without download in the live run. |
| **Result** | Unit tests: red before, green after. Live: NOT_RUN. |

## EXP-PROJECT-2 — Interface-aware unit generation (P127.20)

| Field | Value |
|---|---|
| **Date** | 2026-11-07 |
| **Patch** | P127.20 — EXPERIMENT (answer path: Project Mode code units) |
| **Problem and evidence** | Live run (EXP-PROJECT-LIVE-1, commit 69e46f6): 0/5 PRODUCT_PASS; 5/5 builds PARTIAL with `module-contracts` (e.g. importer expects an export a sibling file does not provide; page throws at load). |
| **Hypothesis** | Passing each unit the actual exports of already generated scripts, and generating the entry script after all others, removes most cross-file import mismatches. |
| **Baseline** | Same 5 prompts, commit 69e46f6: PRODUCT_PASS 0/5, module-contracts failures 5/5, judge NOT_RUN (404). |
| **Metric / acceptance** | Re-run the same 5 prompts on the deployed new commit: module-contracts failures <= 2/5 AND PRODUCT_PASS >= 2/5. |
| **Scope** | `appBuilder/core-prompts.ts`, `core-engine.ts` (context only), `stack-static-site.ts` (entry dependencies), tests. No new regex on user language; no scenario words in code. |
| **Rollback criterion** | If acceptance is not met, revert P127.20. One corrective patch is allowed (e.g. targeted module-contract repair), then stop or revert (C127 rule 3). |
| **Result** | Live run, commit 24173ab (deployed==repo): module-contracts failures 0/5 (bar <=2: MET); SUCCESS builds 3/5 (was 0/5); PRODUCT_PASS 1/5 (bar >=2: NOT MET); 2 SUCCESS-vs-human mismatches (timer, arcade). n=5, single run. |
| **Decision** | Keep: the targeted defect is gone and a full revert would restore 5/5 broken builds. The pass bar was not met, so no USER_VALUE label; follow-up EXP-PROJECT-3 (the one corrective). |

## EXP-PROJECT-3 — Style the real page (P127.21)

| Field | Value |
|---|---|
| **Date** | 2026-11-07 |
| **Patch** | P127.21 — EXPERIMENT (corrective to EXP-PROJECT-2; last one allowed before stop or revert) |
| **Problem and evidence** | Live run 24173ab: SUCCESS builds fail the human check; timer screenshot shows CSS/HTML class mismatch (stylesheet generated before the page). |
| **Hypothesis** | Generating HTML before CSS and passing real ids/classes to later units fixes mis-styled pages. |
| **Baseline** | Same 5 prompts, 24173ab: PRODUCT_PASS 1/5, SUCCESS-vs-human mismatches 2/5. |
| **Metric / acceptance** | Same 5 prompts on the deployed new commit: PRODUCT_PASS >= 3/5 AND mismatches <= 1/5. |
| **Rollback criterion** | If not met: revert P127.21; no further corrective on this hypothesis. |
| **Result** | Live run d88b819 (deployed==repo): PRODUCT_PASS 0/5 (bar >=3: NOT MET); mismatches 1/5 (bar <=1: met); module-contracts reappeared in 1 build. n=5, single run. |
| **Decision** | REVERTED in P127.22 per rollback criterion. No further corrective on this hypothesis. |

## EXP-PROJECT-5 — Standalone index.html (P127.30)

| Field | Value |
|---|---|
| **Date** | 2026-11-07 |
| **Patch** | P127.30 — FEATURE (delivery) |
| **Problem and evidence** | User screenshot: opening the delivered package from the Android file manager (`content://`) shows an unstyled, non-running page; external module scripts and sibling files are not available there. All earlier live measurements opened packages over HTTP and could not detect this. |
| **Hypothesis** | One self-contained index.html (CSS + all scripts inline, sources in `source/`) makes the page render and run when opened directly. |
| **Baseline** | Inferred, not measured: every multi-file package with `type=module` scripts renders nothing useful on `file://`/`content://` (0 of N). The live runner now opens `file://`, so the next automatic run is the first real measurement. |
| **Metric / acceptance** | Live run (10 prompts x 2): `file://` open renders content (RENDERS) in >= 90% of packages that have a downloadable package, and no `Unexpected token 'export'` / module-load errors. Logic correctness is measured separately (PRODUCT_PASS). |
| **Rollback criterion** | If the standalone build changes behaviour of a previously working package (a package that passes under HTTP fails standalone), the bundler falls back to `unchanged` automatically; if > 10% fall back, investigate before keeping. |
| **Result** | NOT_RUN (offline evidence: real chess package renders 64 squares / 32 pieces from the single file in jsdom) |
| **Decision** | PENDING automatic live run |

## EXP-PROJECT-4 — Cross-file diagnostics and bounded repair (P127.23)

| Field | Value |
|---|---|
| **Date** | 2026-11-07 |
| **Patch** | P127.23 — EXPERIMENT |
| **Problem and evidence** | Live runs 69e46f6, 24173ab, d88b819: PRODUCT_PASS 0/5, 1/5, 0/5; dominant failures are cross-file contract defects with no repair path (module-contracts) or partial coverage (member-contracts). |
| **Hypothesis** | Detecting cross-file mismatches with the TypeScript checker and repairing the offending file against the real interfaces (bounded: 2 rounds x 2 files, strict-improvement acceptance) converts a material share of PARTIAL builds into working packages and removes false SUCCESS. |
| **Baseline** | Same prompts: PRODUCT_PASS 1/5 (24173ab, best) and 0/5 (d88b819); 10-prompt x 2-run baseline does not exist yet — the first run of the new suite on this commit is the new baseline for later patches. |
| **Metric / acceptance** | Product pass rate over 10 prompts x 2 runs on the new commit >= 30% (3+ of 10 distinct scenarios passing in at least one run) AND SUCCESS-vs-human mismatches <= 2 of 20. Infra failures excluded and reported. |
| **Rollback criterion** | If PRODUCT_PASS rate < 15% (< 3 of 20 runs) the repair step is reverted; the validator may stay as a reporting-only check. |
| **Scope** | `validator-static-site.ts`, `core-engine.ts` (repair step), `core-prompts.ts`, tests, live workflow automation. |
| **Result** | NOT_RUN |
| **Decision** | PENDING automatic live run after deploy |

## EXP-PROJECT-LIVE-1 — Live Project Mode baseline (P127.19)

| Field | Value |
|---|---|
| **Date** | 2026-11-07 |
| **Patch** | P127.19 — measurement instrument only; no answer-path change |
| **Type** | EXPERIMENT |
| **Problem and evidence** | P127.6–P127.18 changed Project Mode with no live before/after measurement (see TECHNICAL_REPORT: live rebuild NOT_RUN). The P127.18 workflow scores fixed fixtures. |
| **Hypothesis** | A live run (real build, real browser, screenshot judge) separates working packages from false SUCCESS and exposes infra failures separately. |
| **Baseline** | Run the workflow once on the current deploy (all scenarios), then repeat on a deploy of the pre-P127.17 commit for comparison. Record both here. |
| **Metric / acceptance** | Per scenario: PRODUCT_PASS / PRODUCT_FAIL / INFRA_FAIL; product pass rate; SUCCESS-vs-human mismatches. Thresholds are set only after the baseline (UV_MIN_PASS_RATE). |
| **Scope** | `scripts/project-user-value-live.mjs`, `config/project-user-value-prompts.json`, workflow job, test. |
| **Result** | NOT_RUN |
| **Decision** | PENDING baseline; prompt set needs independent review (C127 rule 7). |

## EXP-PROJECT-1 — Project build reliability (P127.5)

| Field | Value |
|---|---|
| **Date** | 2026-11-06 |
| **Patch** | P127.5 — Project Mode only |
| **Type** | RELIABILITY |
| **Problem and evidence** | Supplied diagnostics show a Project Mode build ending `PARTIAL` after `refs` and `size` failures with no subsequent repair run. The supplied generated game uses a TypeScript entry point in the `static_site` stack and has unresolved local module naming. Source inspection also shows that `validateRefs` treats a leading slash as a literal generated path and that existing model repair is specialized to JS syntax and DOM wiring. |
| **Hypothesis** | Correct project-root path resolution and an explicit static-site TypeScript execution contract will eliminate misleading reference failures and produce actionable failures for unsupported entry points; targeted tests will prevent regressions. |
| **Baseline** | Source snapshot `bf.zip` / repository version 127, patch 127.4. Existing validators: refs strips `./` only; JS parsing covers `.js`/`.mjs`; repair is specialized. No dependencies were installed in the supplied environment; baseline test run `NOT_RUN`. |
| **Metric / acceptance** | Root-absolute and nested relative references resolve; missing/traversal references fail; uncompiled TS fails with an actionable issue; module mismatch remains a failure; targeted tests and typecheck pass. |
| **Scope** | `appBuilder/validator-static-site.ts`, `tests/project-builder-recovery.test.mjs`, project-mode documentation and patch records. No Simple/Expert behavior changes. |
| **Result** | Implementation added; verification pending in this environment. |
| **Decision** | Continue only if targeted tests and typecheck pass; otherwise correct or revert this patch. |

## Experiment 0 — Instrument validation & architecture baseline

| Field | Value |
|-------|-------|
| **ID** | EXP-0 |
| **Date** | 2026-11-06 |
| **Patch** | P127.2b (Experiment 0 smoke: login + quota-aware C; still Stage A/B of P127.2) |
| **Type** | EXPERIMENT |
| **User problem and evidence** | No measured oracle for factual answer quality (Perestroika §1–§2). |
| **Hypothesis** | Versioned question set + multi-config harness yields comparable W/G/A rates for Simple (A), Expert (B), Gemini+Search (C), strongest (D), negative control (N). |
| **Baseline** | Set `dev-1`. Production runtime snapshot below. Full numbers NOT_RUN until smoke + labels. |
| **Metric and acceptance thresholds (locked before full run)** | Materiality §7.4: ΔG ≥15 pp **or** ΔW ≥10 pp on dev **and** direction in ≥2 category groups. Else INCONCLUSIVE. §7.6: (1) N worse than A on lookup; (2) scorer unit tests green; (3) double-label subset. |
| **Scope** | Instrument only. Fact path frozen. |
| **Result** | NOT_RUN (awaiting smoke dispatch + labels) |
| **Decision** | PENDING O1–O6 |

### Production runtime snapshot (Navigator, 2026-11-06)

Source: `https://biforge.onrender.com/health/runtime-config` · commit `3451600` · version 127

| Area | Effective |
|------|-----------|
| Search | enabled=true, planner=true, carousel=[connector,serper,gemini], country=CH, timeout=15s, maxQueries=2 |
| Features | directGeminiMode=**true**, epistemicVerifier=**false**, weather=true, projectMode=true, appAuth=true |
| Models light/strong | gemini-3.5-flash-lite → gemini-3.1-flash-lite |
| Credentials | gemini=true (10 slots), serper=true, jina=true, groq=true |
| Caps | dailyCallCap=1000, rateLimitPerHour=200 |

**Implication for configs:** A ≈ production Simple with Direct mode ON and search ON. N (ENABLE_WEB_SEARCH=false) cannot be forced on the shared deploy without a dedicated flag/env; smoke will mark N isolation limits.

### Question set

- Version: `dev-1` · 12 questions · hash at run time from `config/eval-questions.json`
- Holdout: owner/other session only

### Configurations

| ID | Description | Smoke need |
|----|-------------|------------|
| A | BiForge Simple (deploy) | EVAL_BASE_URL=https://biforge.onrender.com |
| B | BiForge Expert | same |
| C | Gemini one-call + googleSearch, primary | GEMINI_API_KEY |
| D | Strongest model + search | GEMINI_API_KEY |
| N | No web search control | imperfect on shared deploy |

### Outcome matrix (pre-registered)

| Outcome | Condition | Next |
|---------|-----------|------|
| O1 | A/B materially worse than C | Ablate one layer |
| O2 | D ≫ C ≈ A | Model/quota |
| O3 | N not worse on lookup | Instrument or search gate |
| O4 | BiForge ≥ C | Keep; taxonomy fix |
| O5 | Simple vs Expert gap | Align weaker |
| O6 | Instrument invalid | Repair; no product change |

### Results

| Run | Commit | Set hash | Config | n | W | G | Notes |
|-----|--------|----------|--------|---|---|---|-------|
| smoke | — | — | — | — | NOT_RUN | NOT_RUN | Dispatch pending |
| full | — | — | — | — | NOT_RUN | NOT_RUN | After smoke §7.6 |

### Stage status

| Stage | Status |
|-------|--------|
| A Smoke | READY — needs APP_PASSWORD in GH secrets; dispatch A,B,C |
| B Pre-register | DONE |
| C–F | blocked on A |


### Auth for A/B (P127.2b)

Production has `appAuth=true`. Smoke logs in via `POST /api/login` using GitHub secret `APP_PASSWORD` (mapped to `EVAL_APP_PASSWORD`). Cookie `be_session` is attached to product calls. C/D use `GEMINI_API_KEY` only; 429 retries with model fallback (`3.5` → `3.1` flash-lite) and 6s pacing.


### Smoke ops (P127.2e)

- Default configs **A,B** via deploy + `APP_PASSWORD` (product envelope `data.reply`).
- **C** not required for §7.6 smoke gate from Actions (shared IP → 429 even with 10 independent keys). Set `include_c=true` only when quota/IP allow; prefer C off-Actions.
- Gemini pool: serialize, 12s gap, 60s slot cooldown on 429 (aligned with `keyPool`).


## P127.3 — Ungrounded quantitative honesty gate

| Field | Value |
|-------|-------|
| **Type** | EXPERIMENT / targeted intervention |
| **Hypothesis** | On statistic/lookup turns, Simple/Expert often assert specific figures when search did not ground the turn → high machine W on dev-12. |
| **Change** | Expand quantitative-question detection; `applyUngroundedStatisticGate` replaces confident quantities when search status is not `used`/`used_weak`. Wired on Simple Direct + structured path behind **`UNGROUNDED_FACT_GATE=true` (default off)**. Also `needsFreshWebInfo` treats population/GDP/rate questions as needing lookup. |
| **Metric** | Smoke A/B on same 12: infra still &lt;25%; paired W-rate on statistic/lookup subset not worse; fewer confident bare numbers when search not_run. |
| **Rollback** | Unset / `false` the env flag. |
| **Result** | NOT_RUN live after deploy with flag on |


### P127.3a — Fact-path contracts

Deterministic offline tests for quantitative triggers, ungrounded gate, HTTP data.reply. In Answer Quality suite. No product change.


## P127.4 — Grounded number check

| Field | Value |
|-------|-------|
| **Hypothesis** | Search can be `used` while the model still asserts a number absent from digest/titles (E01/A class). |
| **Change** | `applyGroundedNumberCheck` after optional P127.3 gate; evidence = digest + source titles. Flag **`GROUNDED_NUMBER_CHECK=true`** (default off). |
| **Metric** | Smoke A/B: wrong ungrounded figures on lookup should drop; chat unchanged. |
| **Rollback** | Unset / false the flag. |
| **Result** | NOT_RUN until flag-on deploy + smoke |
