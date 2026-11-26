## C131 current execution — P131.9 (2026-11-26)
- **OBSERVED:** main @ d8aa670 Core CI #45862026277 is red (15 ImmoFinder failures); Render service `bf` auto-deploys `main`, and d8aa670 was live at audit time. Failures include short index fixtures, superseded 44/12-locality assumptions, legacy TrustEngine/pipeline assertions and stale room/source defaults.
- **CHANGE:** align tests to the C131 source-first runner and retire automated legacy-search payload restoration; no legacy algorithm is an acceptable production fallback.
- **LATEST:** Core CI #45865555998 passed all checks except one owner-name assertion: the parser included the page's 'Kontaktformular' UI label after the surname. Half-room parsing now passes. Owner-name extraction is being hardened against contact-page chrome. **OBSERVED:** Core CI #45865962339 SUCCESS and Render d5abb14 LIVE. The prior issue-comment live workflow did not trigger from the connector-created comment and emits failed zero-job push runs. **NEXT:** move the bounded live acceptance run into Core CI behind an explicit commit marker. **LIVE RUN d13257a3 COMPLETED, BELOW ACCEPTANCE:** 87 candidates, 19 detail fetches, 2 kept (0 new, 2 updated), 0 Serper calls, 2 Gemini calls. Preview falsely marked no-contact-route candidates kept; CI poll expected a non-existent result.status. Fix counters/preview/polling and configure Serper discovery before another run. **ACCEPTANCE OPEN:** >=3 reviewed unique L1/L2 records with locality/rooms/detail/owner/contact provenance and provider-call/cost evidence. Never relax hard gates.

## C131 bounded paid-discovery extension — P131.8v (2026-11-26)
- The live source-first runner now adds a rotating Serper discovery layer for the supported Swiss classified portals (Flatfox, Anibis, Tutti). It searches 6 communes/run across the full saved 121-locality catalogue, at most 18 queries/run and at least 3 seconds between calls (<=18/min). Only matching detail URLs are fetched; index snippets are never evidence.
- Runtime hard floor is now 3 rooms regardless of the older saved UI value. Anibis and Tutti are enabled as supported sources even if their old toggles were off; existing HappyHoliday/Ferienhausmiete/Flatfox adapters remain active.
- Gemini LIGHT is capped at 3 logical reviews/run and is called only for borderline L1 pages that already expose an actionable contact route. A promotion to L2 requires an exact verbatim page quote plus a deterministic private-owner phrase check; Gemini cannot supply missing locality, rooms, contact or listing facts.
- Budget ceiling from configured estimates: 18 Serper calls × $0.001 + 3 Gemini reviews × $0.002 = $0.024/run. No Jina, reverse-image search, recurring schedule or delivery enabled. Existing polite fetch, robots/SSRF, 48 detail-page total cap and 240s wall-clock cap remain.
- **Acceptance OPEN:** implementation and tests are committed; production deploy, provider-key availability, actual cost and >=3 reviewed quality leads are not yet observed. Do not relax owner/locality/room/detail gates to force a positive count.

## C131 revalidation and actionable-card gate — P131.8u (2026-11-26)
- Production runner now rejects a fetched detail if no direct phone/email or actionable source contact route is present. It extracts named hosts, recognizes platform enquiry/contact-details buttons, stores normalized source price/currency and renders platform-only contact distinctly on the card.
- Corrected room parsing so "3 Schlafzimmer" is not mistaken for "3 Zimmer"; supports 2½/3½/4½ and "3.5-Zimmerwohnung". Revalidation hold hides every exploratory record from the first pilot and clears its seen-cache; only a fresh fetch with no hard reject can unhide it.
- Flatfox source added; active sources are exactly HappyHoliday, Ferienhausmiete and Flatfox. Anibis/Tutti and all unsupported legacy sources are disabled. Serper/LLM/Jina remain off; local browser rendering only on HappyHoliday/Flatfox, max 3 pages/run.
- Render keep-alive pinger disabled via `KEEP_ALIVE=false`; service can sleep on the free tier when idle. Search schedule is manual and all delivery channels are off.
- **Acceptance still OPEN:** wait for the next production run, review at least 3 unique visible leads with verified locality, total rooms, source detail evidence, price/currency and actionable contact. Hosted Core CI must be green before closure.

## C131 source expansion — P131.8t (2026-11-26)
- Added Flatfox direct rental search for Graubünden, with detail URL discovery, CHF/month parsing, 3½/2½ room parsing, locality/postcode evidence and advertiser legal-entity detection. It is enabled alongside HappyHoliday and Ferienhausmiete.
- Active production sources: HappyHoliday, Ferienhausmiete, Flatfox. Anibis/Tutti remain paused after 403; legacy paid discovery, LLM, Jina, recurring schedules and delivery remain disabled. Local browser rendering is allowlisted only for HappyHoliday/Flatfox, max 3 renders/run.
- Full 121-locality scope, 2+ rooms, no age filter. **Flatfox live yield and hosted CI are still NOT_RUN/NOT_CONFIRMED**; WP5 quality acceptance remains OPEN until >=3 reviewed visible leads and green Core CI.

## C131 quality correction — P131.8s (2026-11-26)
- The first full-canton run fetched 24 details from 87 candidates. Sixteen records were persisted hidden by the write-time quality gate; none were exposed as verified leads. HappyHoliday and Ferienhausmiete detail evidence exposed four concrete bugs: substring locality collisions (Solavers→Avers; Haus Katrin→Trin), Swiss half-room parsing (2 1/2→2), portal navigation mistaken for seeker text, and a placeholder phone number. Ferienwohnungen in Davos was also agency/list-page content. Anibis and Tutti returned HTTP 403 and are now paused.
- Fixed exact token-based locality matching across classifier and write-time collage checks; description location now outranks property-name mentions. Added 2 1/2 / 4 1/2 room parsing, substantive detail-page gate, explicit Agentur rejection, false seeker-navigation removal, and placeholder-phone rejection. FHM enquiry-form wording is recognized as a platform contact route.
- HappyHoliday now extracts meta/JSON descriptions and may use local Chromium only for short pages on `happyholiday.ch`; Flatfox direct rental search is added with price/room/advertiser extraction. Local Chromium is allowlisted only for HappyHoliday/Flatfox and capped at 3 pages/run. Serper/LLM/Jina remain off.
- Added one-time revalidation of the first pilot's hidden records (seen-cache reset); a fresh full run will unhide only if the fetched detail now passes all gates. Scope is 100 official communes + 21 locality aliases (121 total), 2+ rooms, no age filter. Fresh defaults and migrated settings enable only HappyHoliday/Ferienhausmiete, use manual scheduling and disable email/Telegram/Drive delivery.
- **Acceptance pending:** second live run must produce >=3 unique visible L1/L2 listings with reviewed locality/rooms and source detail evidence; core CI green. WP5 route cut-over is complete, quality acceptance remains OPEN.

## C131 live expansion — P131.8r (2026-11-26)
- Owner approved widening the search to any suitable scope. Updated the locality catalogue to all 100 current Graubünden municipalities (official 14.09.2026 list) plus 19 legacy/locality aliases used in listing titles and URLs.
- One-time idempotent Render startup migration will replace saved `communes=[Chur]` with the full configured catalogue, lower minimum size from 3 to 2 rooms, enable every configured source, keep schedule manual and disable email/Telegram/Drive delivery. It queues one bounded Full run. No recurring schedule or delivery spend is enabled.
- Added Anibis direct listing adapter and enabled existing Tutti adapter. Production direct adapters now cover HappyHoliday, Ferienhausmiete, Anibis and Tutti; blocked sources stop early. Source caps: up to 6 indexes/source, 12 detail pages/source, 48 details/run, 240s; 1.5s per-host politeness remains.
- Classifier fixes: accept Swiss postcode punctuation (e.g. `7000, Chur`), parse hyphenated room counts (e.g. `3.5-Zimmer`), and no longer reject every ordinary occurrence of the word `Immobilien` as an agency. Explicit agency stop-list and seeker/sale/residential/locality gates remain.
- Paid discovery, LLM, Jina and browser fallbacks remain disabled; max model calls 0. Expected provider spend remains $0.00. Only actual fetched detail pages can be admitted.
- **Verification pending:** production deployment, startup settings migration, live Anibis/Tutti fetchability, lead yield and hosted CI. WP5 production route cut-over is complete; WP5 quality acceptance remains OPEN until actual L1/L2 results and green CI are observed. Legacy modules remain temporarily because storage/types/tests still import shared contracts; not used as the production search route.

## C131 live evidence — P131.8q source-first production runs (2026-11-26)
- Render service `bf` switched to the new route and ran three bounded, non-dry-run searches against current saved scope (Chur, >=3 rooms). Across runs: 30 detail fetch attempts, 0 kept/new records, 0 infra failures, estimated provider cost $0.00; Serper/LLM/Jina/browser calls 0. The engine did not write rejected listings.
- Latest run scanned 4 HappyHoliday index pages + 1 Ferienhausmiete index page; 90/16 index candidates, 12 detail fetches, 11 outside-target, 1 agency, 82 explicit locality prefilters, 0 kept. Previous runs confirm no Chur-quality result in the current source sample. Do not report successful lead yield.
- Found a locality false positive: a Bergün listing was assigned Chur because page body/footer mentioned Chur. Fixed classifier body fallback to require explicit address/location evidence; added regression test for Bergün-vs-Chur and explicit Chur address. Fix is committed to main; production deploy pending.
- Current saved search is explicitly `communes=[Chur]`, min rooms 3; this is narrower than the 44-commune Graubünden catalogue. Do not silently broaden user scope. WP5 acceptance remains OPEN until the user approves a wider commune scope or a quality Chur lead is found.
- Diagnostics and health Actions are manual-only; health snapshots skip Render. Runtime GitHub writes disabled. Gemini candidate probes disabled. New search remains direct-only and bounded. Legacy pipeline is no longer the production route; legacy files remain temporarily for storage/types and regression compatibility.

## C131 release candidate — P131.8q final code staged (2026-11-26)
- Added direct-only fetch mode with robots/SSRF checks; no Jina or browser fallback. Source indexes now follow the selected communes; only fetched detail evidence is stored (4k cleaned evidence excerpt), owner evidence excludes page footer; 24h seen-cache and 403/429 early stop. Dry runs are read-only, including seen-cache.
- Regression coverage added to `test:core` and `test:immofinder` for positive admission, off-target rejection/no-write, dry-run no-write, paid-provider suppression and production route wiring. Tests have not yet been observed running; CI pending this main push.
- Release strategy: keep all intermediate commits Render-skipped; after CI result, trigger exactly one Render deploy for this main head. Then run one real bounded production search (DB settings currently manual/Chur/3+ rooms; delivery disabled) and inspect persisted L1/L2 records and cost counters. Do not claim production quality until the run is inspected.

## C131 update — P131.8q source-first cut-over code staged (2026-11-26, EXPERIMENT)
- Production run entry now imports `server/immofinder/live.ts`: direct HappyHoliday/Ferienhausmiete indexes → bounded detail fetch → C131 locality/rooms/agency/seeker + owner gates → evidence-backed DB upsert. Serper/LLM/Jina/browser fallbacks disabled for search; cap 2 indexes/source, 6 details/source, 12 total, 180s. Rejected pages never write.
- Runtime GitHub snapshots/diagnostic commits disabled; PostgreSQL + Render logs are primary. Diagnostics/health workflows manual-only; health snapshots skip Render. Worker idle polling 15s. Render auto-deploy is pending the final release commit; latest observed live deploy is still a pre-cut-over health-snapshot build. Hosted CI NOT_RUN; new production yield NOT_RUN.
- Existing DB settings inspected read-only: manual schedule, Chur, 3+ rooms; HappyHoliday and Ferienhausmiete enabled. No settings or secrets changed.
- Legacy pipeline file retained temporarily as a type/storage compatibility dependency; old search algorithm is no longer the production route. Removal follows after new runtime/CI verification.

## C131 update — P131.8p (2026-11-26, MAINTENANCE)
- **Fixed:** Preflight now reads repository source/tests without modifying them; only its diagnostic log is written. Added regression coverage. Direct commits to `main`; hosted CI and Render deployment identity NOT_RUN.
- **WP5 remains OPEN:** new `server/immofinder/` engine is not yet the production path. Owner approved revisiting the sequence, but live baseline, ≥5 source fixtures, same-snapshot legacy comparison and acceptance gates remain prerequisites. No cut-over or quality claim made.

## C131 consolidated status and programme plan — 2026-11-26 (P131.8n, MAINTENANCE, docs only)
- **Authority:** this root `ROADMAP.md` is the programme authority; `docs/ROADMAP_C131.md` was merged into this file (see "Imported C131 execution log" below) and removed in P131.8o; it is no longer an allowlisted document.
- **Base:** main plus patches 131.8k (geo skips off the early-stop streak), 131.8l (parallel /resolve), 131.8m (next SERP call pipelined). Deployed build seen in live logs: `c78fa4e`, patch 131.8i. Hosted CI for 131.8j–131.8n and Render commit identity are NOT_RUN/unverified.
- **OBSERVED live (Chur, dry-run short tests):** `b8e86208` 8/17 queries, 0 kept, /resolve ≈93 s of 142 s; `d470cbb4` 12/17 queries, 0 kept, goto queries 18–23 s each. All 91 candidates rejected by closed R7 taxonomy (82 `outside_target` from HappyHoliday Scuol/Lenzerheide, 5 `snippet_only`, agency, for_sale, rooms_below_min, seeker). Homegate/Tutti HTTP 403. List/index pages (huusbro, immoscout24 lieu-chur, homegate matching-list) are rejected as snippet-only, not expanded. Flatfox and urbanhome detail pages fetch.
- **Plan: gaps that block quality results, ordered by dependency** (a programme plan, not a session assignment; each session re-derives its task per AGENTS §4; each answer-path item needs its own `docs/EXPERIMENTS.md` entry first, C127 rules 1–4):
  1. **Measure P131.8m live.** Short test, same query list. Accept: ≥14/17 queries per 180 s run and no 429s; else revert 131.8m.
  2. **WP2 source decision on the own fetcher (blocks everything below).** For each source in the Chur scorecard record fetch status, cost and latency from the project's fetcher; save ≥5 HTML snapshots per fetchable source (flatfox, urbanhome first). Decide Homegate/Tutti (403): working route or drop. Accept: Tier-1 list written with measured fetch success ≥80%.
  3. **Source-first adapters for the target communes.** HappyHoliday returns holiday areas outside the whitelist (82/82 `outside_target`); keep it only where the target area has listings. Add adapters for Tier-1 sources that list the whitelisted communes. Accept: ≥10 in-target detail candidates fetched per short run.
  4. **Expand index/list pages into detail URLs** (huusbro, immoscout24, homegate matching-list, portal result pages) instead of `trust_snippet_only` rejects. Accept: in-target detail pages fetched per run rises from 3 to ≥10; reject mix reviewed with the R7 sample.
  5. **WP1 fixture corpus and invariant replay** over the saved HTML; metrics without owner labels (D-2026-11-25-03). Accept: replay green in `test:immofinder` on ≥5 snapshots per Tier-1 source.
  6. **WP3 remaining:** delta store by index hash; R9 auto-demotion (source with zero L1 over N=5 runs); R7 reject-sample audit surfaced per run.
  7. **WP5:** run `dryRunBatch` on live snapshots; cut the live path over to `server/immofinder/` only if new ≥ legacy on the same snapshots; then remove `requirePrice`, `requireContact`, `rejectNonMonthly`, and only after `ensure-repair` and `immofinder-core-restore` are retired, the transport files.
  8. **WP4 / WP6:** two letter templates, owner key, manual_check queue, 10 live letters for owner check; accepted Full run with ≥3 L2 leads (N=3) and owner review of L1+ records. WP7 only if a measured recall gap exists.
  9. **Delivery hygiene each patch:** hosted Core CI green and Render commit equals main HEAD, reported separately from answer quality (G5); structure work ≤20% of patches (C127 rule 5). Operational: the GitHub connector in assistant sessions currently returns 403 on writes, so patches are delivered as ZIP (G1).

### Imported C131 execution log (verbatim from docs/ROADMAP_C131.md)

## C131 State snapshot and open work — 2026-11-26 (MAINTENANCE, docs only)
- **Base:** main @ 0413898 (P131.8j); `package.json` patch 131.8i (not bumped here). Legacy engine is still the live path.
- **Status:** WP0 DONE (R1-R14, no gold-set, D-2026-11-25-03). WP1 PARTIAL (baseline runs; no HTML fixture corpus, no precision/recall). WP2 PARTIAL (16-source scorecard from web view; no own-fetcher runs, fixtures, cost or latency). WP3 IN PROGRESS: `server/immofinder/` has `taxonomy`, `classify`, `access`, `owner`, `run`, `pipeline`, `dryRun`, adapters `happyholiday`, `ferienhausmiete`. WP4 PARTIAL (L2/L3, letter verifier; owner key, manual_check queue, 10 live letters unconfirmed). WP5 NOT STARTED (only `dryRunBatch` compare). WP6 NOT DONE. WP7 NOT STARTED (no measured recall gap).
- **OBSERVED:** HappyHoliday source-first pilot kept L2 listings in the new engine (P131.8g). Last audited runs: Serper credits exhausted (HTTP 400); Tutti/Homegate HTTP 403; run `038d1c87` kept 0 of 113 candidates.
- **NOT_RUN:** hosted CI and production deploy identity for this head; owner review of L1+ records.
- **Open work (gaps, in dependency order):**
  1. WP2: pilot on the project's own fetcher for each shortlisted source, ≥5 HTML fixtures per source, cost/latency, Tier-1 choice; decide Tutti/Homegate access (403) or drop them.
  2. WP3: remaining adapters, delta store by index hash, R9 auto-demotion of sources with zero L1, R7 reject-sample for audit; keep R7 taxonomy closed.
  3. WP1: fixture corpus and invariant replay over saved HTML; metrics defined without owner labels.
  4. WP4: two letter templates, owner key, manual_check queue, 10 live letters for owner check.
  5. WP5: run `dryRunBatch` on live snapshots, cut live path over to `server/immofinder/`, then remove legacy filters (`requirePrice`, `requireContact`, `rejectNonMonthly`) and, only after `ensure-repair` and `immofinder-core-restore` are retired, the transport files.
  6. WP6: accepted Full run plus owner review of L1+ records; acceptance needs ≥3 L2 leads per run (N=3).
  7. WP7 only if a measured recall gap exists.
  8. Infra: top up Serper credits; confirm hosted CI green and Render commit for each delivered patch.
- **Superseded:** the old "WP1 BLOCKED" text and the "Nothing below is implemented" header are historical (see docs/EXPERIMENTS.md reconciliation entry).

## C131 P131.8i — Core CI green; soft price; dry-run helper — 2026-11-26
- **Fixed:** Core CI green (typecheck + DAG). `price_ambiguous_on_detail_page` is soft (C131 optional price); sanitize clears ambiguous price. Preflight applies soft-price patch. Locality prefers URL/title.
- **Added:** `server/immofinder/dryRun.ts` — parallel offline compare of new engine vs legacy kept flags (WP5 instrument).
- **Still open:** WP5 cut-over (switch live path), remaining adapters, delta store, Serper credits, more live L1/L2.

## C131 P131.8g — Source-first pilot produces L2 listings — 2026-11-26
- **Live pilot (no Serper):** HappyHoliday GR index → 6 detail pages → new `processSnapshot` engine.
- **OBSERVED kept:** L2 «Haus am See» Lenzerheide (9 Zi, von privat, direct contact); L2 «Scoldasu» Lenzerheide (8 Zi, von privat, direct); L1 Berggasthaus / Posta Veglia.
- **Fixed:** seeker regex no longer matches site nav («Haus suchen») / marketing («Suche»).
- **Still open:** WP5 cut-over; Serper credits.

## C131 P131.8d — Preflight allows target layout — 2026-11-26
- **Fixed:** scripts/patch-tools preflight now accepts `server/immofinder/` and `sources/` so test:models no longer fails on the WP3 scaffold.
- **Still open:** parallel dry-run wiring, remaining adapters, delta store, R9 auto-demotion, WP5 cut-over, Serper credits, WP6.

## C131 WP3 engine scaffold complete — 2026-11-26 (P131.8)
- **Implemented:** pure stages `classify`, `access`, `owner`, `run`, `pipeline` and adapters `happyholiday`, `ferienhausmiete` under `server/immofinder/`. Offline `processSnapshot` / `replaySnapshots`. R7 taxonomy retained. Legacy engine still live.
- **Open:** WP5, delta store, remaining adapters, Serper credits, WP6.

## C131 R7/R9 run-audit instrument and deploy identity — 2026-11-26 (RELIABILITY)
- **Implemented:** closed R7 reject taxonomy and per-run `qualityAudit`. Live path still legacy until WP5.

## C131 status reconciliation — 2026-11-26
- Single legacy ImmoFinder engine with C131 admission applied in place; `server/immofinder/` target layout absent. WP0 done; WP1/WP2/WP3/WP4 partial; WP5/WP6 open; WP7 not triggered. Details and evidence: `docs/ROADMAP_C131.md` (top section).
- Latest live full run `038d1c87`: 0 kept of 113 candidates, Tutti/Homegate 403. Hosted CI and deployed commit for 131.5e–131.7a NOT_RUN/unverified.

## P131.5j status — 2026-11-25
- Corrects the short-test call-site contract: `testMode` belongs in `PipelineOptions`, not `PipelineDeps`; retains the discovery page cap.
- Awaiting hosted Core CI and successful Render deployment before the next source-first dry-run. WP2 scorecard and WP6 Full runs remain open; WP7 conditional.

## P131.5j status — 2026-11-25
- Corrects the short-test call-site contract: `testMode` belongs in `PipelineOptions`, not `PipelineDeps`; retains the discovery cap.
- Awaiting hosted Core CI and successful Render deployment before the next source-first dry-run. WP2 scorecard and WP6 Full runs remain open; WP7 conditional.

## P131.5j status — 2026-11-25
- Fixes PR #89's Core CI/Render build failure: remove redundant undeclared `testMode` field from `PipelineDeps`; queue progress still controls bounded test behavior.
- Awaiting hosted Core CI and successful deployment before the next source-first smoke run. WP2 and WP6 remain open; WP7 conditional.

## P131.5i status — 2026-11-25
- Short test run produced real funnel evidence but workflow timed out during a concurrent deploy; source-first adapters were not exercised because test mode used Carousel.
- Reliability correction proposed: bounded Full mode, longer diagnostics wait and typed worker retry parameter. WP2 scorecard and WP6 Full acceptance remain open; WP7 remains conditional.

## P131.5h status — 2026-11-25
- **Correction to P131.5g Full-run interpretation:** the Tamins UMS page text states CHF 2,188/month and 7 Dec 2026–28 Mar 2027, but the saved record has price=null and price_cleared=fragment_as_price; its C131 contact route is none and owner verification is not_ready, so it remains L1 only. Run settings had maxMonthlyRentChf=1,800 but limitPrice=false, requirePrice=false, requireContact=false and rejectNonMonthly=false; therefore the CHF 1,800 cap was not active in that run. Do not describe this as a confirmed over-budget rejection or a qualifying owner listing.
- Corrected stale Render target in agent test and health workflows; awaiting CI and deploy.
- The previous short-test attempt did not start a search (old endpoint returned skipped:not_due); no search result was counted.
- WP2/WP6/WP7 remain evidence-driven and open.

## P131.5g status — 2026-11-25
- Settings menu fix and bounded agent-run harness proposed in PR; awaiting hosted CI.
- WP2 source scorecard still needs controlled per-source measurements; the test harness is a repeatable short probe, not a full WP2 pilot.
- WP6 remains open: last manual Full run returned one L1-only record, not a verified qualifying listing.
- WP7 remains conditional; no recall-gap claim without independent labelled evidence.

## C131 execution status — P131.5f (2026-11-25)
- **WP0–WP1:** DONE for approved rules and available no-label evidence.
- **WP2:** PARTIAL; configured-fetcher pilot/yield/cost not measured.
- **WP3–WP4:** PARTIAL; implementation contracts exist; production behavior not verified.
- **WP5:** PARTIAL; stale-core automatic overwrite guarded; encrypted snapshot restore and legacy retirement NOT_RUN.
- **WP6:** NOT_RUN; deployed runtime and manual Full runs unverified.
- **WP7:** NOT_TRIGGERED; no measured WP6 recall gap.

## C131 execution status — P131.5e (2026-11-25)
- **WP0–WP1:** DONE for approved rules and available no-label evidence.
- **WP2:** PARTIAL; configured-fetcher pilot/yield/cost not measured.
- **WP3–WP4:** PARTIAL; page-grounded pipeline and L3/INFRA_FAIL contracts implemented; production behavior not verified.
- **WP5:** IN PROGRESS; automatic stale-core overwrite guarded; encrypted snapshot restore and legacy-consumer retirement NOT_RUN.
- **WP6:** NOT_RUN; deployed runtime and manual Full runs unverified.
- **WP7:** NOT_TRIGGERED; no measured WP6 recall gap.

## C131 execution status — P131.5d (2026-11-25)
- **WP0:** DONE; owner-approved constitution and no-Gold amendment recorded.
- **WP1:** DONE for available evidence; deterministic no-label baseline and historical diagnostics retained.
- **WP2:** PARTIAL; scorecard and three-source shortlist exist; configured-fetcher pilot and per-source yield/cost remain NOT_RUN.
- **WP3:** PARTIAL; page-grounded source-first path exists; isolated engine consolidation remains open.
- **WP4:** PARTIAL; L3 HTML verification and `INFRA_FAIL` reporting implemented; CI verified; live owner review NOT_RUN.
- **WP5:** OPEN; encrypted snapshot exists; restore integrity and legacy restore-consumer retirement unverified.
- **WP6:** NOT_RUN; latest health snapshot reports production version 130 / commit `2ee99cb`, 488 commits behind main; no deployed Full runs.
- **WP7:** assessed but NOT_TRIGGERED; no measured WP6 recall gap.

## C131 execution status — P131.5c (2026-11-25)
- **WP0:** DONE; R1–R14 and no-Gold execution amendment recorded.
- **WP1:** DONE for available evidence; deterministic no-label baseline and historical diagnostics retained.
- **WP2:** PARTIAL; source scorecard and pilot shortlist exist; configured-fetcher measurements, robots and cost/yield remain NOT_RUN.
- **WP3:** PARTIAL; source-first page-grounded path implemented; isolated engine consolidation remains open.
- **WP4:** PARTIAL; L3 verifier/HTML fix and `INFRA_FAIL` status implemented; hosted CI green, live owner review NOT_RUN.
- **WP5:** OPEN; encrypted snapshot exists, but restore integrity and legacy restore-consumer retirement remain unverified.
- **WP6:** NOT_RUN; latest health snapshot still reports production version 130 / commit `2ee99cb`, 369 commits behind main; post-release health probe awaits next main push.
- **WP7:** assessed but NOT_TRIGGERED; no measured WP6 recall gap.

## C131 execution status — P131.5b (2026-11-25)
- **WP0:** DONE; R1–R14 and no-Gold execution amendment recorded.
- **WP1:** DONE for available evidence; deterministic no-label baseline, historical diagnostics and fixture inventory retained.
- **WP2:** PARTIAL; scorecard and pilot shortlist exist; configured-fetcher measurements/robots/cost-yield remain NOT_RUN.
- **WP3:** PARTIAL; source-first page-grounded path exists; isolated single-engine consolidation remains open.
- **WP4:** PARTIAL; L3 verifier and P131.4 HTML correction implemented; P131.5 `INFRA_FAIL` status passed hosted CI 18/18; live owner review NOT_RUN.
- **WP5:** OPEN; encrypted snapshot exists, but restore integrity and legacy restore-consumer retirement remain unverified.
- **WP6:** NOT_RUN; latest health snapshot (08:25 UTC) reports production version `130`, commit `2ee99cb`, 369 commits behind main; post-release probe is now automatic, but accepted full runs remain unverified.
- **WP7:** assessed but NOT_TRIGGERED; no measured WP6 recall gap.

## C131 execution status — P131.4 (2026-11-25)
- **WP0:** DONE; owner-approved R1–R14 and no-Gold amendment recorded.
- **WP1:** DONE for available evidence; no labels fabricated and no precision/recall claims.
- **WP2:** PARTIAL; public scorecard and three-source pilot shortlist exist; configured-fetcher measurements, robots for 12 hosts and per-source cost/yield remain NOT_RUN. Latest carousel diagnostic was `INFRA_FAIL` (20 Serper credit errors; direct sources not exercised).
- **WP3:** PARTIAL; page-grounded L1 and bounded source-first path implemented; isolated single-engine consolidation remains open.
- **WP4:** P131.4 repairs L3 HTML evidence and compile errors; PR-head Core CI 18/18 and Answer Quality passed; live owner review NOT_RUN.
- **WP5:** OPEN; encrypted snapshot commit `a1ce09e` exists (2026-11-25 14:21 UTC); restore verification and legacy restore-consumer retirement remain unverified.
- **WP6:** NOT_RUN; latest production diagnostic shows stale deployed code and a Serper-credit `INFRA_FAIL`; no accepted full run or three consecutive live runs.
- **WP7:** assessed but NOT_TRIGGERED; no measured WP6 recall gap exists, so conditional experiments are not justified.

## C131 execution status — P131.3a (2026-11-25)
- **WP0:** DONE; R1–R14 and delegated no-Gold execution recorded.
- **WP1:** DONE for available evidence; 60 historical run artifacts, ten sanitized portal examples, deterministic no-label invariant replay and source reference inventory. No precision/recall claim.
- **WP2:** PARTIAL; three-source pilot shortlist and bounded Serper policy decided; configured-fetcher HTTP/robots/latency/yield/cost measurements and ≥5 saved fixtures per source remain open.
- **WP3:** PARTIAL; page-grounded L1 and bounded source-first path exist; single-engine/adapters/access/run consolidation remains open.
- **WP4:** P131.3 adds page-bound L3 verification; CI pending after corrective invariant replay; live owner review NOT_RUN.
- **WP5:** OPEN; encrypted snapshot exists but restore verification and production-current snapshot are not confirmed; payload restore workflow still consumes legacy code.
- **WP6:** NOT_RUN; production is reported stale in last health artifact; three live runs and independent review unavailable.
- **WP7:** NOT_TRIGGERED; no measured WP6 recall gap exists.

## C131 execution status — P131.3 (2026-11-25)
- **WP0:** DONE; R1–R14 and no-Gold amendment recorded.
- **WP1:** DONE for available-evidence baseline; historical run diagnostics, ten sanitized portal examples, provider-free invariants and 17-module/26-payload reference trace recorded; no precision/recall claim.
- **WP2:** PARTIAL; public scorecard and selected bounded pilot exist; configured-fetcher measurements, robots verification for 12 hosts and per-source cost/yield remain NOT_RUN.
- **WP3:** PARTIAL; P131.2 closes page-grounded locality and budgets, but isolated single-engine architecture/adapters remain outstanding.
- **WP4:** P131.3 adds evidence-bound L3 verification; hosted CI and live letter review pending.
- **WP5:** OPEN; legacy retirement still depends on production backup and restore-consumer migration.
- **WP6:** NOT_RUN; production deployment and three completed manual runs unavailable in this session.
- **WP7:** NOT_TRIGGERED; no WP6 recall gap has been measured.

## C131 CI gate update — P131.2a
- Core CI now runs on pull requests targeting main; full verification can gate the next implementation PR before merge.
- P131.2 runtime changes are merged; live source pilot and production run remain NOT_RUN.

## C131 execution status — P131.2 (2026-11-25)
- **WP1:** no-label baseline accepted under D-2026-11-25-03; historical run diagnostics and deterministic invariant fixtures used, no precision/recall claim.
- **WP2:** public source scorecard recorded; configured-fetcher yield/cost pilot remains NOT_RUN.
- **WP3:** P131.1 legacy pipeline now requires page-grounded locality at final admission; isolated engine architecture remains outstanding.
- **WP4:** L2 route logic exists; complete L3 anti-fabrication verifier remains outstanding.
- **WP5:** not complete; legacy deletion awaits production backup and restore-consumer retirement.
- **WP6:** not run; deployment and three live runs remain outstanding.
- **WP7:** conditional on measured WP6 recall gap; not yet triggered.

## C131 owner-directed execution update — 2026-11-25 (P131.1c)

- **Gold Set:** removed as an execution prerequisite by D-2026-11-25-03. Use existing run diagnostics, sanitized public-page evidence and deterministic contract tests; never fabricate labels or claim precision/recall.
- **WP1:** existing 17-module/26-payload trace, scorer, historical diagnostics and ten sanitized Tutti/Homegate evidence records retained. Remaining work is to make the no-label evidence inventory/replay explicit; no owner-label holdout will be created.
- **WP2:** public source scorecard exists. Configured-fetcher pilot/cost-yield remains NOT_RUN; no tier is promoted without real fixtures and measurements.
- **WP3:** existing P131.1 trust/pipeline implementation is transitional legacy architecture, not the planned isolated `server/immofinder/` engine. Current correction scope first closes page-grounded locality and bounded spend.
- **WP4:** L2 owner evidence and platform/direct routes exist in part; L3 anti-fabrication verification remains to be completed and tested.
- **WP5:** legacy deletion remains gated on reference/restore-workflow retirement and a verifiable production backup; historical encrypted snapshot is not assumed current.
- **WP6:** production deployment and three completed live runs remain NOT_RUN.
- **WP7:** conditional; trigger only on an observed WP6 recall gap. No Gold Set is required to execute a bounded live experiment if its gap is evidenced.
- **Plan location:** `docs/ROADMAP_C131.md` exists; the earlier P131.1b note saying it was absent was incorrect. `ROADMAP.md` remains the repository's ordered-plan authority.

## C131 execution audit update — 2026-11-25 (P131.1b; documentation only)

- **WP4 PARTIAL:** source audit found R2 locality provenance is not enforced at the final trust boundary; short-stay records still have a direct-contact-only reject; contact enrichment remains enabled despite the delegated default-off decision. L2 metadata exists, but a complete L3 verifier/acceptance was not established. Corrective runtime work is gated on WP1 owner-labelled replay and WP2 fetcher pilot.
- **WP5 NOT_DONE:** no approved production snapshot was available to verify; pre-C131 visibility/quarantine is not implemented in the inspected store/UI path. Do not delete legacy modules or payloads while restore scripts/workflows consume them.
- **WP6 NOT_RUN; WP7 NOT_TRIGGERED:** no deployment or three consecutive live runs were performed; no measured WP6 recall gap exists.
- **Plan file:** ROADMAP_C131.md is absent; this root ROADMAP.md is the canonical C131 plan. No duplicate roadmap was created.

## C131 — ImmoFinder reset: one objective, one engine, one measurable rule set (PLAN recorded 2026-11-25)
## C131 current audit snapshot — P131.8w (2026-11-26)

- **WP0 DONE:** owner-approved R1–R14 remain normative in `TECHNICAL_SPECIFICATION.md`; no requirement changes in this audit.
- **WP1 PARTIAL/BLOCKED:** available no-label fixtures and historical traces exist; the owner-labelled ≥60-record Gold set is unavailable. No precision/recall claim is valid.
- **WP2 PARTIAL:** adapters and bounded source pilots exist; source fetchability/fixture thresholds and per-source yield/cost scorecards are incomplete. Anibis/Tutti previously returned 403; their P131.8v reactivation is not yet live-verified.
- **WP3 PARTIAL:** the new source-first engine exists in `server/immofinder/` with access, classification, owner, run, taxonomy and source adapters; deterministic fixtures exist. Gold replay and full source acceptance remain open.
- **WP4 PARTIAL:** L1/L2/L3, owner evidence and draft-verification paths exist; owner review of real L1+ records and generated letters is NOT_RUN. Drafts are not sent automatically.
- **WP5 PARTIAL:** `POST /api/immofinder/run` now executes `server/immofinder/live.ts`; legacy route/store/repair/delivery modules and shared Core/Pipeline types remain referenced. Dependency retirement, snapshot/restore verification and legacy payload cleanup are not complete.
- **WP6 NOT_RUN for P131.8v:** the earlier P131.8q three-run sample yielded 0 admitted records; it does not satisfy live acceptance. P131.8v deployment, provider availability/spend, three consecutive completed runs and owner review remain unverified.
- **WP7 NOT_TRIGGERED:** no measured WP6 recall gap supports another source/LLM/browser experiment.
- **CI reconciliation:** run 45857907223 at 5875c9a failed two tests (Davos expectation; lock patch 131.8u vs 131.8v). Both causes are corrected in the subsequent main history through d8298f1 (test/source and lock metadata); d8298f1 itself has no hosted CI run because its commit skipped CI. Current patch is 131.8w; verify this commit's Actions before calling CI green.
- **Safety/configuration:** runtime hard minimum is 3 rooms; per-run limits are 18 Serper calls, ≤3 Gemini reviews, 48 detail fetches and 240s. Cost ceiling $0.024 is estimated, not observed. Scheduling and delivery remain off; do not relax R1–R14 to force yield.


**Execution status (2026-11-25; Navigator delegated intermediate decisions):** WP0 DONE (R1–R14 approved in D-2026-11-25-01; implementation choices recorded in D-2026-11-25-02). WP1 PARTIAL: 17-module/26-payload trace and provider-free scorer exist, but ≥60 owner-labelled Gold records and page snapshots remain BLOCKED. WP2 PARTIAL: public scorecard plus five sanitized page-evidence snapshots each for Tutti and Homegate; three bounded source pilots (HappyHoliday, Tutti, Homegate) selected; fetcher cost/yield and HappyHoliday fixture threshold remain NOT_RUN. WP3 IMPLEMENTED in P131.1; P131.1a corrects stale test assumptions and monthly-unit attribution; P131.1a hosted verification passed: Core CI 18/18 DAG checks and 182/182 core tests; Ensure repair passed. The disabled price-cap display default remains 2000 and full mode covers all 44 target communes (carousel remains 12). WP4 PARTIAL: L2 requires explicit private-owner evidence plus a direct/platform route; drafts are hidden for L1 and remain unsent. WP5 NOT_DONE: legacy module/payload deletion is withheld because restore scripts/workflows still consume them; DB snapshot/legacy UI retirement not run. WP6 NOT_RUN: no production deployment or three consecutive live runs; manual outcome is not yet verified. WP7 NOT_TRIGGERED: its hypotheses are conditional on a measured WP6 recall gap, which does not yet exist. Latest inspected live API run remains INFRA_FAIL from Serper credit exhaustion, not a quality result. Cycle identity: product patch `131.1`; corrective patch `131.1a`.

- Evidence boundary: synthetic tests and sanitized public-page snapshots are not owner-labelled Gold labels; public index counts are not verified L1/L2 yield.
- Working rules: the C127 operating rules (`AGENTS.md` §0) are adopted for C131 unless the owner decides otherwise: `docs/EXPERIMENTS.md` entry before answer-path code; measure before and after; one hypothesis per primary patch; complexity budget; no example fitting; the holdout is labelled by the owner, not by the coding session.

### 1. Why a reset (evidence from the audit; not re-verified here)

- **Objective drift.** P128 = find private owners of furnished/tourist/short-term homes (>=3 rooms, 44 localities) and offer a lease of >=3 years; second type per P128.007 = private long-term direct offers. P129–P130 turned this into "current long-term listings with monthly price, date and direct contact". `quality` in `config/immofinder.json` still sets `requirePrice`, `rejectNonMonthly`, `requireContact`, which contradicts P128 (price is not an exclusion criterion; `platform_only` is allowed).
- **Vanity metric.** Run `072836e3` (2026-11-22): 152 Serper queries, 93 candidates, 72 pages, 70 LLM calls, USD 0.304, `credible_kept` = 6. Audit review of the 6 records: none acceptable (three snippet-only, one parking space, one wrong locality, one agency listing).
- **Starvation.** P130.17 fail-closed gate was never audited live; the P130.18 run had 162 of 190 results as Google `/goto` redirects, 8 processed, 0 admitted. P129.44: 125 of 145 refetches returned HTTP 403.
- **Layering.** 17 ImmoFinder server modules, about 434 KB by file size at commit `1fa089a` (Core 76, Pipeline 76, Routes 58, Repair 45, Store 30, Delivery 27, Contact enrichment 21, Fetcher 17, Refresh 14, others under 13 each), plus 26 apparent patch-transport leftovers in `server/` (`*.b64.*`, `*.zlib.b64.*`, `immofinderStore.ts.part*`). Reference tracing is part of WP1 and is `NOT_RUN`.
- **What worked and is retained.** Owner catalogs (Ferienhausmiete, Surselva) were the only sources that yielded owner contacts (P128.8); save-without-contact with `platform_only` (P128.9); broad candidate pool before page caps, geography before LLM, priority/extended waves (P128.19–P128.21); evidence-first (P129.30); spend limits (P129.44); durable queue/lease (P130.17d); polite fetcher; encrypted snapshot; Drive/Telegram delivery.
- **What is retired.** Mandatory price, mandatory direct contact, mandatory publication date as admission conditions; `kept`/`credible_kept` as success measures; snippet-built cards; unbounded fallbacks; unmeasured source additions; criteria changed without replay on historical examples.

### 2. Search constitution (target rules; normative only after WP0 owner approval)

- **R1 Objective.** Two result types only: `tourist_owner` (private owner of a furnished/tourist/seasonal/short-term home; three-year lease proposal) and `direct_offer` (private long-term offer; different letter). Everything else is a typed reject.
- **R2 Required vs optional.** Required for storage (level L1): a concrete detail page was fetched; final URL equals the record URL; locality is in the 44 with page evidence (address/title); residential apartment or house; >=3 rooms confirmed by page text; not a seeker post, sale, parking space, commercial unit or shared room; not a stop-list agency or company-operated; not expired when a date is visible. Optional and never a reject reason: price in any period, publication date, direct contact, phone, photos. Changing this list needs an owner decision in `docs/DECISIONS.md` plus a gold-set replay.
- **R3 Levels, not a single gate.** L0 candidate (URL or snippet only; never shown, never counted) → L1 verified listing → L2 owner reachable (private owner evidenced + contact route: `direct`, `platform_message` with instruction, or `none`) → L3 letter ready. UI and delivery show L1+ with the level. A separate `manual_check` queue (snippet-only hosts, unparseable pages) is not counted as results.
- **R4 Evidence per field.** Every stored field = {value, verbatim quote, source URL, fetch time}. One record = one URL. No merging across pages or sources; a contradiction leaves the field unset with a flag, never an average. Portal service contacts are never owner contacts.
- **R5 Snippet is never evidence.** A search snippet may only decide whether to fetch.
- **R6 Cheap gates first, fixed order.** Geography (URL/title/snippet) → host/type → dedupe → fetch → deterministic extraction → classification → optional bounded LLM → owner/contact routine. Each stage has a spend cap and exits with a reason code.
- **R7 Closed reject taxonomy.** Every reject carries one code (for example `not_detail_page`, `agency`, `outside_target`, `rooms_below_min`, `rooms_unknown`, `not_residential`, `seeker`, `expired`, `fetch_blocked`, `duplicate`). Counts per code appear in every run report, and a fixed-size random sample of rejects is exposed per run for false-reject audit.
- **R8 Honest metrics.** Success counters are `verified_L1`, `owner_reachable_L2`, `letter_ready_L3`, `owner_confirmed_good`. Infrastructure failures (blocked fetch, unresolved redirect, provider error) are reported separately from quality (C127 rule 8); a run whose fetch-failure rate exceeds a configured threshold is `INFRA_FAIL`, not "0 found".
- **R9 Source admission.** A source enters only with an adapter, at least 5 saved fixture pages, a measured pilot (fetchability, verified leads, cost) and a scorecard entry. A source with zero L1 over a configured number of runs is demoted automatically. No source-list expansion without per-source measurement.
- **R10 Owner discovery first.** Prefer sources that expose the owner (owner catalogs/profiles, municipality and tourism-organisation pages). One owner with several objects yields several records under one owner key (normalised phone/email or name+locality).
- **R11 Budget.** Per-run caps for search queries, page fetches, LLM calls and rendered browser pages; no unbounded fallback; repeated contact search off by default; cost per L1 and per L2 reported every run.
- **R12 Letters.** Prepared only for L2 records and only from verified fields; German; template by result type; never sent automatically; the anti-fabrication verifier is retained.
- **R13 Change control.** Any change to R2, thresholds or source tiers: EXPERIMENTS entry first, offline gold replay before and after, no drop in gold recall, one hypothesis per patch, three failed hypotheses in one area stop that area (C127 rules 1–3). No strings taken from specific eval or user examples in code, prompts or tests (C127 rule 6).
- **R14 One engine.** No parallel legacy path, no per-source ad-hoc patches outside adapters, no new regex without a deletion or a measured gain.

### 3. Target architecture [A]

New directory `server/immofinder/` (target: at most 8 modules and at most 50% of the current ~434 KB, delivery/store/snapshot included). Pure stage functions with typed input/output; every classification is reproducible offline from a saved page snapshot at zero provider cost.

- `sources/` — one adapter per source: `discover()` returns detail URLs; `extract(page)` returns typed fields with quotes, using structured data first (JSON-LD, OpenGraph, microdata, embedded page JSON) and source-specific selectors second. An adapter-less host yields only L0/`manual_check` until WP7(a) proves otherwise. Serper is a discovery channel for detail URLs, not a source of facts.
- `access` — robots, per-host delay, timeouts, redirect resolution, snapshot store; bounded browser rendering only for hosts marked `js_required` in the scorecard; hosts with persistent 403 are marked `blocked` and not retried.
- `classify` — R2 gates → level + reject code (pure function of snapshot + config).
- `owner` — private-vs-agency evidence (owner-catalog membership, "von privat" markers, stop-list, company-form markers), contact routes, owner key, bounded secondary search.
- `run` — planner, budgets, delta detection by index-page URL-set hash (an unchanged index costs no fetch, search or LLM call), reuse of the durable queue/lease from P130.17d.
- `store` / `deliver` / `snapshot` — existing behaviour kept behind unchanged interfaces.
- `letter` — two templates, verifier.

### 4. Work packages

Order: WP0 → (WP1 ‖ WP2) → WP3 → WP4 → WP5 → WP6; WP7 only on evidence. No engine code before the WP1 baseline and the WP2 scorecard exist (C127 rule 1). Patch numbers are assigned per `AGENTS.md` §2 when shipped. New checks go into existing category suites from `docs/TEST_MAP.md`; no per-patch test files.

| WP | Class | Content | Exit evidence |
|---|---|---|---|
| WP0 | MAINTENANCE (owner decision) | Record decision superseding the P130.17 gate and the "current long-term offers" wording in the ImmoFinder quality section of `docs/ARCHITECTURE.md`; replace the P128 criteria text in `TECHNICAL_SPECIFICATION.md` with the constitution of section 2; re-define `quality` in `config/immofinder.json`. | Owner yes/no on R1–R14 and open questions below; docs integrity check; hosted CI `NOT_RUN` until run. |
| WP1 | EXPERIMENT | EXPERIMENTS entry; gold set of at least 60 records (DB export, run `072836e3`, historical good and bad cases) labelled by the owner: `good_tourist_owner`, `good_direct_offer`, `wrong_object`, `agency`, `wrong_locality`, `not_listing`, `other`; snapshot store and offline replay harness that runs without provider keys; baseline of the current engine on the gold set (offline where snapshots exist, plus one live run) with owner-labelled precision; in-UI good/bad button with reason feeding the gold set [A]; reference trace of the 17 modules and the 26 leftover files. | Baseline numbers recorded; harness green in CI without keys; deletion candidates listed with reference evidence. |
| WP2 | EXPERIMENT (measurement only) | Per-source scorecard for the 3 configured catalogs and 13 portals plus candidates [A]: owner-profile pages, municipality and tourism-organisation holiday-home listings. Per source: fetchability (HTTP status, robots, JS), detail-page structure, owner/contact exposure, private/agency marking, coverage of the 44 localities, request cost. Bounded request budget; no answer-path code. | Scorecard in `docs/EXPERIMENTS.md`; owner picks tier-1 (at most 5 sources) and sets the volume target (N L2 leads per run) from observed catalog size; decision whether Serper stays as detail-URL discovery. |
| WP3 | USER_VALUE | Engine of section 3 for tier-1 sources: adapters, `access`, `classify`, `run`; deterministic extraction; reject taxonomy; run report with R8 counters. | Offline gold replay meets section 5 offline thresholds; typecheck/build/CI results recorded as such. |
| WP4 | USER_VALUE | `owner` routine, contact routes, platform-contact instructions, two letter templates, verifier. | L2/L3 correct on gold fixtures; owner reads at least 10 generated letters. |
| WP5 | MAINTENANCE | Switch run entry and routes to the new engine; delete the old Core, Pipeline, TrustEngine, Repair, RepairStore, Refresh and contact-enrichment code not reused, plus the transport leftovers, after reference check; remove obsolete config keys (`quality.requirePrice`, `requireContact`, `rejectNonMonthly`, host hacks in `skipHosts`) and obsolete tests. Pre-C131 records become `legacy_unverified`: hidden from UI and delivery, kept in the database, re-verified by URL with the new engine; snapshot taken first. | One pipeline path; byte budget met; no `.b64`/`.part*` files; Drive/Telegram contracts unchanged. |
| WP6 | USER_VALUE (live) | At least 3 consecutive live runs; owner reviews all L1+ records (or at least 30). | Section 5 live thresholds; `INFRA_FAIL` runs reported separately. |
| WP7 | EXPERIMENT (conditional) | Only if WP6 shows a recall gap, one at a time, each with hypothesis and rollback: (a) LLM extraction restricted to spans whose quotes are verified as substrings of the fetched text, for adapter-less hosts; (b) bounded browser rendering for `js_required` hosts; (c) additional source tiers. | Per-experiment record; revert on failure. |

### 5. Acceptance (proposed thresholds; owner confirms in WP0)

- Offline gold replay: zero records with fields from more than one URL; zero snippet-only L1+ records; recall of at least 90% on owner-labelled good records whose page can be fetched; `wrong_object`, `agency` and `wrong_locality` together at most 5% of L1+.
- Live (WP6): the same precision on owner-reviewed records; at least N L2 leads per run with N set after WP2; at most 40 Serper queries per run (baseline 152 on 2026-11-22); cost per L1 and per L2 reported; `INFRA_FAIL` runs not counted as quality results.
- Size and structure: engine plus delivery at most 50% of the 434 KB baseline; single pipeline path.
- Green CI or gold replay is not user value; user value stays `NOT_RUN` until the owner has reviewed live records (`AGENTS.md` G5).

### 6. Guardrails, limits, open questions

- Non-goals: automatic sending of letters; changes to the Drive/Telegram contracts; changes to the 44 localities or the stop-list without an owner decision; touching the client workspace or the Drive client (`AGENTS.md` §2); scraping social networks; ignoring robots.txt. Historical P128–P130 records stay untouched.
- Known limits of the audit: not every one of the 100+ iterations was verified against raw events; early run logs are incomplete; user labels of past records are mostly missing; per-module reference tracing and source behaviour (JS, 403, structured data) are untested until WP1 and WP2.
- Open questions for the owner [A]: (1) confirm the R2 required set, in particular "rooms >=3 confirmed by page text" and whether `rooms_unknown` goes to `manual_check`; (2) keep `direct_offer` at the same priority as `tourist_owner`; (3) who labels the gold set and the expected volume (at least 60 records); (4) volume and cost targets after WP2; (5) are platforms on the stop-list (Airbnb, Booking and similar) permanently out of scope, although private tourist owners also list there.


---

## P130.18b — Recovery test contract correction
- Aligned tests with planner-owned query ordering and post-batch checkpoint semantics; hosted verification pending.

## P130.18a — ImmoFinder recovery reliability
- Query-level resume, cumulative progress and delivery acknowledgements; recovery under an actual production deploy remains NOT_VERIFIED.

## P130.18 — Search evidence retrieval
- Added measured remediation for Google redirect URLs and JavaScript-rendered portal pages; real listing yield remains NOT_VERIFIED pending a completed live search.

## P130.17d — Durable ImmoFinder execution
- Implemented: PostgreSQL-backed queue/lease recovery, persisted run settings, cross-instance cancellation and graceful shutdown; live recovery acceptance remains NOT_VERIFIED.

## P129.50 — ImmoFinder encrypted DB backup and short-stay support

- Implemented: CI scope fix; full encrypted GitHub snapshot after manual/scheduled searches; physical-address extraction/storage/card display; seasonal/nightly/weekly offers admitted only with explicit period, exact detail URL, fetched page and verified direct contact. **Pending:** configure runtime GitHub write token/repository, run hosted CI, apply migration and verify production snapshot + all delivery channels.

## P129.48 — ImmoFinder search defaults and CI contract

- Implemented: expanded Swiss portal discovery, quality-first reset defaults, strict saved-card monthly-price audit with channel republish and env-example coverage fix. Hosted CI rerun and live result quality remain NOT_RUN.

## P129.47 — ImmoFinder database repair loop

- Implemented: complete All Logs snapshot, authenticated snapshot/preview/apply API, idempotent batch ledger, bundled repair auto-apply, first-request audit, write-time sanitation and post-repair channel refresh. Live DB repair and user-facing delivery verification remain NOT_RUN.

## P126 — Simple Mode direct Gemini conversation (owner-provided C126 specification)

### P126.3 — CONVERSATION RELIABILITY

- Status: reliability instrumentation and regression tests added in patch 126.3.
- Reviewed natural history ordering/compaction, native PDF/image attachment forwarding, client Retry payload preservation, existing key/model carousel and BYOK isolation, and distress/SafetyBox and Expert route boundaries.
- Added request, generation, rotation, search-degradation and HTTP response lifecycle diagnostic events.
- HTTP response completion is not treated as proof of client rendering; client render/user-visible success remains `NOT_OBSERVED` pending a client acknowledgement.
- Full Core CI, typecheck, production build, browser E2E, live provider/file tests and deployment remain `NOT_RUN`.
- Evidence and verification limits: `TECHNICAL_REPORT.md` — P126.3.

### P126.2 — SEARCH DECOUPLING

- Status: implementation added in patch 126.2; automated verification status is recorded in `TECHNICAL_REPORT.md`.
- Search is an optional bounded side operation on the Simple direct route. Explicit search and configured automatic freshness candidates can trigger it; successful evidence is passed to Gemini, while failure/timeout/disabled states are disclosed without blocking generation.
- Production packaging copies `config/source-policy.json` to `dist-server/config/source-policy.json`.
- Live provider behaviour, hosted CI and deployed user outcome remain `NOT_RUN` until independently observed.

### P126.1 — DIRECT CONVERSATION CORE

- Status: implementation added in patch 126.1; focused local tests `PASS`; full suite, typecheck/build and hosted verification `NOT_RUN`.
- Simple route uses a dedicated direct handler path, short system instruction, natural conversation history, existing attachment processing, Gemini model order and shared Gemini key pool.
- The legacy intelligence pipeline is bypassed for ordinary Simple turns. Expert and distress/SafetyBox turns remain on their existing path.
- Existing response envelope is preserved. P126.2 search decoupling is recorded separately above; P126.3 reliability validation/diagnostics and P126.4 30-scenario user-level comparison remain open.
- Evidence and verification limits: `TECHNICAL_REPORT.md` — P126.1.

### P124.17 — Direct Gemini pass-through

The Conversational route now defaults to a single direct Gemini text call. Search providers (including Serper), external model fallback, structured response parsing, retries, and application-side reply rewriting are bypassed on this route. This is a provenance-isolation test, not a live-data capability.

## Project Mode recovery programme (owner request, 2026-11-06)

Four sequential patches are tracked; implementation state is authoritative in `TECHNICAL_REPORT.md`, requirements and acceptance are in `TECHNICAL_SPECIFICATION.md`.

- **P127.5 — Build Reliability:** validator path normalization, explicit static-site execution contract, and regression coverage. Implemented in patch archive; full verification status remains separately recorded.
- **P127.6 — Project Continuation:** continue an existing project from immutable source/version context with bounded text-source ingestion. Implemented in patch archive; binary-source continuation remains limited.
- **P127.7 — Project Workspace:** project-scoped immutable-version inventory, version-specific downloads, artifact integrity inspection, and ZIP entry listing. Implemented; verification pending.
- **P127.8 — Recovery and Acceptance:** atomic stale-job leasing across server replicas; recovery tests; preserve Project Mode route/UI boundaries; verify project-scoped versioned artifact downloads. IMPLEMENTED; automated verification pending where dependencies/runtime are unavailable. Browser E2E and live DB recovery remain NOT_RUN. Acceptance status: see `TECHNICAL_REPORT.md` (P127.8a).

All four patches are Project Mode-only. Simple and Expert prompts, routes, model selection, response behavior, and interfaces are protected by regression tests.

## CURRENT ROADMAP CONTROL — 2026-11-03 (C124)

> **Retired documentation paths (P126.20+):** Any historical mention of `docs/C12x_*`, `docs/WEB_SEARCH_REMEDIATION.md`, `docs/INFORMATION_QUALITY_WORKFLOW.md`, `docs/RENDER_ENV_CONTRACT.md`, `docs/MODEL_ALLOWLIST.md`, `docs/MODEL_SOURCES_*`, or similar cycle/audit reports is **historical only**. Current prose authority is the Single-source-of-truth map in `AGENTS.md`. Do not recreate retired files to satisfy an old link.

> This current control section governs the historical plan below. Completed stages and historical patch records are retained as written. If an older instruction below conflicts with this section or `AGENTS.md`, it is historical and must not be followed as a current operating rule.

> **P124.0.16 status:** The P92 diagnostics contract test has been aligned with P124.0.15 full-content capture: conversation evidence is expected, while credentials remain redacted. Runtime behavior is unchanged. Targeted test and hosted CI rerun are pending.

> **P124.0.15 status:** Simple and Expert expose the shared authenticated diagnostic log in More. For the single-user test phase, conversation logs include user history, normalized model input, assembled prompt, raw model output, agent-cleaned output, final visible reply, search query/results, response metadata, and fallback context. Credentials, cookies and authentication tokens remain redacted. Local and hosted verification for this revised delivery is pending; this instrumentation does not itself resolve answer truncation.

## C125 — Answer-quality programme (owner-approved scope, 2026-11-04)

- Status (P125.16): conversation path no longer surfaces the synthetic model-unavailable string as an agent reply; transient failures recover inside the request (default 90s) and the UI shows live wait seconds. Durable job queue remains open.


Detail: historical cycle notes (consolidated); decisions: `docs/DECISIONS.md` D-2026-11-04-01 and D-2026-11-04-02. This is the approved scope list, not a next-session assignment; each session re-derives its task from current gaps (`AGENTS.md` §4). Cycle C124 closes with P124.40; C125 starts at version `125`, patch `125.1`.

- [x] WP1 query fidelity (P125.1, local tests; live `NOT_RUN`): verbatim translation up to 20 words, entity- and number-preserving compression above, deterministic loss check, logging.
- [x] WP2 source policy (P125.1, groups A and C applied; group B and IANA/EUR-Lex verification `OPEN`; live `NOT_RUN`): exclude Russian and Belarusian authority-controlled domains (country-code zones `.ru`, `.su`, `.xn--p1ai`, `.by`, `.xn--90ais`; verified Russian/Belarusian-operated zones; listed state-controlled hosts outside those zones), as versioned data, with diagnostics and a replay acceptance test. Open question O1 (bypass) is with the owner.
- [x] WP3 workflow, test and diagnostics audit (P125.3–P125.5): step-1 audit table; steps 2–4 covered by behaviour suite, diagnostics fidelity updates and unified `answer-quality-verify` workflow (incremental regex migration continues). Scope-extension items 1–8 implemented in code/tests; **live production OBSERVED still required** for owner “C125 done”.
- Status (P125.6): active CI = Core CI + Answer Quality (+ Dependabot/CodeQL platform); retired product workflows documented; live production dialogue `NOT_RUN` until release patch equals 125.6 and Navigator confirms user outcome.
- Status (P125.3): WP3 step-1 audit + search routing/grounding (items 1, 2, 5, 6, 7); WP2 group B applied (P125.2); IANA/EUR-Lex deferred.
- Status (P125.2, documentation and data): WP3 scope extended with search routing and answer grounding (historical cycle notes (consolidated), section 4); WP2 group B now applied by default, IANA and EUR-Lex reconciliation `OPEN`; live `NOT_RUN`.
- Status: WP1 and WP2 implemented in P125.1 with the limits recorded in `TECHNICAL_REPORT.md`; C125 code path through P125.5; production user-outcome evidence `NOT_RUN` until release equals 125.5. Earlier status (P124.40): all `OPEN`.

## P124.35 — Universal follow-up context and evidence relevance (2026-11-03)

- [x] Cross-domain follow-up resolution using the immediately preceding user task; deterministic fallback preserves the resolved query when the planner provider is unavailable.
- [x] Query/topic/place relevance validation; numeric evidence is required only for requests whose content requires numeric/time/measurement data.
- [x] Cross-domain regression corpus integrated into `test:core`; tests cover context retention, topic-switch isolation, provider/planner failure, personal-data exclusion and non-numeric factual evidence.
- [ ] Hosted CI, normal typecheck/build, live provider acceptance and deployed user-level outcomes remain `NOT_RUN`/`BLOCKED` as recorded in `TECHNICAL_REPORT.md`.

## P124.22 — Web-search live-data remediation programme (owner-approved scope, 2026-11-03)

Detail, findings, and decisions: historical cycle notes (consolidated), `docs/DECISIONS.md` (D-2026-11-03-01). This is the approved scope list, not a next-session assignment; each session re-derives its task from current gaps (`AGENTS.md` §4). Items are checked only with evidence of the stated type.

- [x] P124.22 documentation: audit, decisions, programme recorded (documentation checks only).
- [x] P124.23 number-validator crash fix and persistent search-decision logging (V-1, O-1). Unit evidence only; live run `NOT_RUN`.
- [x] P124.24 Simple/Expert diagnostic log separation, configuration snapshot, build-stamp, restart-reason logging. Unit evidence only; live run `NOT_RUN`.
- [x] P124.25 micro-fix (owner screenshot 2026-11-03): benign `ResizeObserver loop` window notices no longer trigger the emergency screen. Programme numbering note: the items listed below as P124.25–P124.31 keep their scope and are now delivered as the next free patch numbers in order (P124.26 onward).
- [x] P124.25 retrieval integrity (same patch number 124.25 by owner decision): fair digest budget, snippet preservation, page selection, Jina key (R-1, R-2, R-5). Unit evidence only; live run `NOT_RUN`.
- [x] P124.26 query cleaning, country-aware locale, usability check, honest search status, evidence contract (R-3, R-4, R-6, P-1, P-2, T-3).
- [x] P124.27 unified Gemini key pool, pipeline as single path, verifier opt-in (K-2…K-5, E-1, A-1).
- [x] P124.28 LLM search planner with deterministic fallback (T-1, T-2). Unit evidence only; live run and the 90% / 5% targets `NOT_RUN`. Owner fact recorded: Gemini keys are ten projects of ten scientists (D-2026-11-03-03).
- [x] P124.29 gated non-commercial weather connector and result cache (R-7). Unit evidence only (injected fetch); live run `NOT_RUN`; off unless `WEATHER_CONNECTOR_ENABLED=true`.
- [x] P124.30 search provider chain `SEARCH_CAROUSEL`, circuit breaker, separate search budgets. Unit evidence only; live run `NOT_RUN`; `serp2` adapter open until the provider is named.
- [ ] P124.30 provider chain via `SEARCH_CAROUSEL`, second SERP, circuit breaker.
- [x] P124.31 bounded model latency, freshness-only planner gating, request-wide deadline, and complete Model Carousel / Render diagnostics workflow; deterministic policy tests added, live model and Render evidence `NOT_RUN` until workflow execution.
- [ ] P124.32 live-search acceptance workflow and evidence; specification and comment corrections after owner approval.
- [ ] Validate live weather answers against timestamped official observations (open since P123.16; closes only with OBSERVED live evidence).

## P124.3 — response-path fidelity cleanup
- [x] Remove Markdown stripping from the model's main reply and document payload at the server transport boundary.
- [x] Remove obsolete fixed vocabulary filtering for legacy decision-method labels.
- [x] Keep automatic source URLs suppressed by default, while preserving URLs when the user explicitly requests links.
- [x] Add regression tests for explicit link/no-link preference and answer preservation.
- [x] Remove arbitrary output quotas from the remaining Expert staged prompts while retaining their product-specific schemas.
- [ ] Validate browser rendering of formatted replies and documents.
- [ ] Compare raw provider output with user-visible output in live Simple and Expert sessions.

## P124.4 — Architect and App Builder prompt cleanup
- [x] Remove the default single-file architecture bias; let the plan fit the requested goal while retaining file/interface validation.
- [x] Remove recovery prompt clipping and the instruction to omit optional features; retries retain the complete task and context.
- [x] Clarify that internal interfaces may be completed consistently while unspecified external APIs/data must not be invented.
- [x] Allow Architect project analysis to use general domain knowledge without misrepresenting it as project-specific fact.
- [x] Version the changed prompts and add regression coverage.
- [ ] Run hosted CI and a live Architect/App Builder comparison against representative user goals.

## C124 — Instruction Optimization (ACTIVE)

**Product version:** 124  
**Status:** ACTIVE — P124.1 inventory, P124.2 Simple/Expert dialogue cleanup, P124.3 response-path fidelity cleanup, and P124.4 Architect/App Builder prompt refinement implemented; hosted CI and model-backed evaluation NOT_RUN  
**Primary target:** Instruction sources and response-processing paths across Conversational, Expert, Architect, and shared infrastructure  
**Normative mandate:** historical cycle notes (consolidated)  

### Mandate

1. Treat external large language models as the source of substantive intelligence and substantive answer composition.
2. Keep BiForge in the role of engineering intermediary: request/context transport, model/tool routing, session isolation, execution/retry/error handling, integrity checks, deterministic validation, and faithful presentation.
3. Inventory every prompt, instruction, template, hard-coded special case, and post-processing transformation before changing it.
4. Remove or redesign instructions that attempt to reproduce model reasoning through fixed recipes, canned content, exhaustive special-case lists, or agent-authored substantive answers.
5. Preserve necessary task framing, model/tool constraints, safety boundaries, structured output contracts, and instructions required to communicate the user's intent accurately.
6. Preserve model-provided facts, numbers, qualifications, uncertainty, and useful details through the pipeline; do not invent, silently discard, or rewrite content without a user request or objective engineering/safety reason.
7. Keep deterministic checks in code where practical; do not use prompt prose as a substitute for enforceable program logic.
8. Prove changes with source-to-output tests and realistic model-backed evaluations; distinguish local tests, hosted CI, live model evidence, and user outcomes.

### C124 work sequence (planned; not a next-session assignment)

| Stage | Objective | Exit evidence |
|---|---|---|
| P124.0.1 | Documentation mandate and acceptance baseline | Canonical docs agree; version metadata synchronized |
| P124.0.2 | Cumulative baseline, CI regression closure, generic weather-search cleanup | Targeted suites pass; city allowlist/example removed; full instruction inventory remains NOT_RUN |
| P124.1 | Static instruction and transformation source inventory | historical cycle notes (consolidated); source/line references checked by `tests/c124-instruction-inventory.test.mjs`; live behavior remains NOT_RUN |
| P124.2 | Minimal, evidence-based Simple/Expert dialogue cleanup | Mandatory reasoning recipes and novelty retry removed; prompt/output-preservation regressions pass locally; hosted CI/live model comparison pending |
| P124.3 | Expert staged prompts and response-path fidelity | Arbitrary quotas removed; model-authored output preserved; browser/live comparisons remain open |
| P124.4 | Architect and App Builder prompt refinement | Task-fit planning, complete-context recovery, preserved requested features, and project-fact provenance protected by deterministic tests |
| P124.5 | Cross-agent live quality evaluation | Compare raw provider results with final Simple, Expert and Architect outputs; investigate any unexplained omissions or additions |

P124.0.2 closes the known P123.23 CI regressions and removes the evidenced weather-location special case. P124.1 inventories prompt owners and output transformations. P124.2 removes the highest-risk duplicated reasoning choreography and novelty-only rewrite from the Simple/Expert dialogue path while preserving schemas, safety, state integrity and technical recovery. P124.3 covers the remaining Expert staged prompts and response-path fidelity. P124.4 refines Architect project analysis and App Builder planner/coder/reviewer communication without changing routes, UI flow, schemas, validators, or the completion contract. Hosted CI and model-backed quality evidence remain NOT_RUN.

### Explicit non-goals

- Building a second in-repository reasoning engine.
- Replacing model intelligence with hundreds of hard-coded phrases or answer templates.
- Blindly minimizing prompt length or deleting all model instructions.
- Changing provider selection, agent product roles, security posture, or user-facing workflows unless a demonstrated dependency requires it and the owner approves.

---

## Previous cycle: C123 — Model Carousel

C123 is superseded as the active development cycle. Its implementation history and specialist documentation remain intact. This transition does not assert that every historical follow-up, CI issue, or live user outcome has been independently revalidated.

## P123.23 — follow-up regressions closed by P124.0.2
- [x] Synchronize the Expert step-prefix golden hash with the observed P123.22 CI digest.
- [x] Repair Russian weather follow-up normalization and generic place extraction.
- [x] Align compact archive expectations with the failure-first policy and numbered paste artifact uploads.
- [x] Reproduce and repair the three P123.23 `test:web` failures: stale prompt assertion, obsolete source-footer expectation, and missing generic current-observation query expansion.
- [x] Update all stale dialogue prompt snapshots affected by P123.17 evidence-preservation changes.
- [x] Regenerate the stale verification check graph.
- [ ] Full `test:core`, full CI-profile DAG, typecheck/build, and hosted GitHub Actions remain to be verified.

## P123.22
- [x] Restore prompt snapshot matrix in the primary CI paste report.
- [x] Make main CI handoff failure-first and suppress positive check noise.
- [x] Curate CI archive to retain failure-relevant logs and authoritative evidence.
- [ ] Verify all workflow artifact layouts and failure paths in hosted GitHub Actions.

## P123.21 — CI repair follow-up

- Repair only the three evidenced P123.20 contract mismatches.
- Preserve the P123.20 <=5,000-character numbered ASSISTANT_PASTE handoff behavior.
- Investigate compact artifact failure from its full log before changing packaging semantics.

## P123.20 — CI assistant handoff size limits

- [x] Define a strict 5,000-character ceiling per `ASSISTANT_PASTE` file.
- [x] Split overflow into consecutively numbered paste files without dropping summary content.
- [x] Upload all parts from canonical workflows while preserving the complete diagnostics ZIP.
- [ ] Confirm artifact contents and per-file size in the next hosted Actions run.

## P123.19 — CI repair follow-up

- Re-run the verification DAG after the syntax, digest-merge, and grouped-test-scope repairs.
- Inspect any residual failures independently; do not classify them as cascades without logs.
- Confirm complete source-context and full redacted logs are present in `biforge-ci-logs.zip`.

## P123.18 — Conversational / Expert session isolation

- [x] Start a fresh saved Decision when switching between Conversational and Expert.
- [x] Keep the previous mode session in the library rather than carrying its transcript into the next mode.
- [x] Make Expert initialization explicitly independent of Simple-mode history.
- [ ] Validate mode-switch isolation in browser e2e and real multi-turn usage.

## P123.17 — Retrieved-evidence preservation and source presentation

- Implemented: suppress automatic source URLs in visible conversation replies; retain source metadata; align shared grounding guidance across Conversational and Expert; clarify evidence scope and preserve supported numeric details.
- Validation still required: run full CI and conduct live, same-question comparisons in both modes. Do not mark user-value acceptance complete based on deterministic tests alone.

## P123.16 — Weather retrieval quality
- [x] Expand weather searches toward current observation data and MeteoSwiss.
- [x] Reject title-only search results as factual grounding.
- [x] Stop appending source URLs to user-visible conversation replies.
- [ ] Validate live Simple and Expert weather answers against timestamped MeteoSwiss observations.

## P123.16 — Weather retrieval quality
- [x] Expand weather searches toward current observation data and MeteoSwiss.
- [x] Reject title-only search results as factual grounding.
- [x] Stop appending source URLs to user-visible conversation replies.
- [ ] Validate live Simple and Expert weather answers against MeteoSwiss observations.


---

## Historical: C122 — Expert Mode Reliability (CLOSED 2026-11-01)

**Product version:** 122  
**Status:** CLOSED — sufficiently successful (Navigator)  
**Primary target:** Expert Mode  

### C122 outcomes (summary)

| Area | Result |
|------|--------|
| P122.1–P122.4 | Deterministic integrity, analysis, execution, decision quality |
| Layer B | Live Gemini flash-lite scenarios A/B/C/E heuristic pass |
| Allowlist | Only `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite` |
| expert-verify | Green including browser e2e after spawn PATH fixes |
| UX | Stage readiness + synthesis quality panel |

**Detail:** historical cycle notes (consolidated) §E, `CHANGELOG.md` P122.*, `TECHNICAL_REPORT.md`.

### Patch sequence (historical)

| Patch | Title | Status |
|-------|-------|--------|
| P122.1 | STATE INTEGRITY & PERSISTENCE | DONE |
| P122.2 | ANALYTICAL RELIABILITY & EVIDENCE INTEGRITY | DONE |
| P122.3 | EXECUTION RELIABILITY & WORKFLOW CONTINUITY | DONE |
| P122.4 | DECISION QUALITY, USER EXPERIENCE & FINAL VALIDATION | DONE |
| P122.5–P122.9 | Layer B harness, e2e/coverage fixes, allowlist, UI smoke spawn | DONE |


## Historical: P121 series (Architect selection and verification)

The P121 cycle selected the legacy Architect as the sole active implementation and strengthened related validation. Those records remain historical. Architect is now frozen for the duration of C122.

## Programme objective

## C121 — Verification cycle (current)

- Product version: `121`; first patch: `P121.0.1`. The cycle is a verification and repair cycle, not an automatic authorization to start the previously proposed browser-provider feature.
- Cycle/patch numbering is governed by `AGENTS.md` and `package.json`; historical P120 evidence remains unchanged.
- Initial audit of the available reconstructed tree found a documentation-integrity failure (15 retired documents still present), a stale P120-specific version gate in the E2E preflight, and a missing-dependency blocker for the full verification DAG. The actual remote repository and hosted CI are not available in this workspace.
- C121 acceptance requires: canonical docs checks pass; version/patch/lock metadata agree; previous P120 regression checks remain runnable; no mandatory user obligation is silently dropped; runtime/live checks are separately evidenced or marked `NOT_RUN`.
- P121.0.7 unified Architect client entry (no path chooser). Live/browser/user-value validation of the one-flow contract remains required before closing BIO-004.


The end goal is useful, reliable user outcomes in the running product—not a green repository by itself. A patch is not accepted solely because tests pass. For user-facing work, state the user problem, observable outcome, quality criteria, failure/recovery behavior, and evaluation evidence. Keep local tests, hosted CI, deployed/live checks, and actual user-outcome evidence separate.

## Standing cross-cutting stage — Repository language audit and language-neutral behavior

This is a recurring stage, not a one-time cleanup task. Reassess it during each session and execute a bounded slice when findings justify the work, without displacing higher-priority product blockers. The target is an English-only maintained repository and intent/routing logic that does not depend on isolated marker words from selected natural languages. This does not automatically restrict the languages accepted or returned by the product.

Required work sequence:
1. Inventory non-English text and non-English filenames across maintained source, tests, fixtures, snapshots, scripts, prompts, docs, generated artifacts, and developer-facing messages.
2. Classify each finding as safe text residue, test data, runtime behavior, historical evidence, or generated content.
3. Translate or remove safe residue; preserve historical meaning and record any justified exclusions.
4. Replace language-specific runtime keyword heuristics only when an equivalent structured/model-based contract is available; add regression tests for intent, routing, errors, and supported input behavior.
5. Run focused tests and repository-wide language scans, then report remaining findings and what was not tested.

**Acceptance gate:** no unexplained non-English repository residue; no behavior changes hidden inside text cleanup; no loss of supported user input behavior without owner approval; and evidence clearly separates static scan results from runtime language-neutrality tests.

## Standing cross-cutting stage — Repository minimalism and test lifecycle

Reassess repository contents during each session. Keep the active tree focused on files needed for current product behavior, development, verification, release, security, operations, and actionable documentation. Do not preserve obsolete test implementations or temporary artifacts merely because they belong to a completed cycle. This does not authorize deleting useful historical records: completed roadmap entries, changelog history, factual reports, decisions, and concise records of test/experiment outcomes remain intact unless separately corrected for factual error.

Required work sequence:
1. Inventory candidate stale test implementations, duplicate tests, old golden prompts/fixtures, one-off diagnostic scripts, temporary experiment payloads, superseded plans, and inactive generated artifacts. Keep historical records (completed stages, changelog entries, factual reports, decisions, and concise test outcome summaries) in a separate inventory category; do not treat them as disposable test payload.
2. Trace each candidate to current requirements, source imports/references, package scripts, CI/workflows, compatibility promises, and unique coverage.
3. Choose **keep, update, merge, archive outside the repository, or delete** and record the rationale for consequential decisions.
4. Keep regression tests only where they protect current obligations or material recurrence risks; replace broad historical experiments with smaller tests of current contracts where appropriate.
5. Remove retired implementations and payloads only after confirming no required coverage, active reference, or mandatory audit evidence is lost. Preserve historical records of what ran and what was concluded; do not delete a test implementation as a reason to erase its factual result. Archive raw inputs/outputs only when reproducibility or an explicit audit obligation requires them, and never make an archive a runtime/build dependency.

**Acceptance gate:** no identified repository item is retained solely because it is old or was once useful; retained tests have a current purpose; duplicate/obsolete material is removed where safe; required compatibility and regression coverage remains; and actual checks and unverified dependencies are reported honestly.

## Current documentation and session model

Canonical governance and the mandatory session-start protocol live in `AGENTS.md`. Product requirements live in `TECHNICAL_SPECIFICATION.md`; this file owns the ordered programme plan, dependencies, completed stages, and current priorities; `TECHNICAL_REPORT.md` records factual state and evidence. `CHANGELOG.md` records patch history.

There is no persistent `NEXT_PATCH.md` and no pre-written assignment that the next session should blindly execute. At the beginning of every session, the assistant must reconstruct current state, verify material prior claims, trace open mandatory obligations, and independently formulate a task for that session according to `AGENTS.md`. This roadmap informs that choice but does not replace it.

### Retired-document reference map

Historical phase text below may retain the names of documents that existed when the phase was written. Their current responsibilities are consolidated as follows; do not recreate the retired files to satisfy an old link:

- `docs/AI-USER-VALUE-SPEC.md` → `TECHNICAL_SPECIFICATION.md`.
- `docs/AI-USER-VALUE-REPORT.md` → `docs/USER_VALUE_EVALUATION.md`.
- `docs/AI-NATIVE-RENOVATION-ROADMAP.md`, `docs/AI-NATIVE-RENOVATION-TASK.md`, and `docs/p119-p121.md` → `ROADMAP.md` plus the session-start protocol in `AGENTS.md`.
- `docs/AI-OPERATING-RULES.md` and `docs/AI-ENVIRONMENT-CONTEXT.md` → `AGENTS.md` and `docs/OPERATIONS_AND_RELEASES.md`.
- `docs/ARCHIVE-DELIVERY-CANON.md` → `docs/DATA_AND_ARTIFACTS.md`, `docs/API_CONTRACTS.md`, and the normative delivery contract in `TECHNICAL_SPECIFICATION.md`.
- `docs/OPERATIONS.md` → `docs/OPERATIONS_AND_RELEASES.md`.
- `docs/architecture-guardrails.md` → `docs/ARCHITECTURE.md` plus executable boundary checks.

## Current known high-priority product gap (revalidate every session)

**P121.0.7 status:** Client entry for Architect was unified — `ProjectMode` no longer presents a novice/professional path chooser; guided start is the default single entry and full tools remain after project selection. Re-validate with live/browser runs and real artifact generation before treating BIO-004 as fully closed. Residual: unused `ProjectPathChooser.tsx`, live user-value evidence still OPEN, language residue in some runtime strings.

Older note (superseded for the dual-path UI claim): reconstructed sources previously indicated separate simplified/professional paths. Treat remaining work as validation and residual cleanup, not a blank dual-mode design.

## Roadmap and history rules

Keep completed phases and their historical descriptions. Add new status at the top or in the relevant current section; add new historical events at the top of `CHANGELOG.md` and `TECHNICAL_REPORT.md`. Never erase prior milestones or rewrite historical evidence to make the current plan look cleaner. Older phase text may mention retired task/handoff documents; those mentions are historical, not a request to recreate them.

---

# BiForge Implementation Roadmap

**Document ID:** BF-ROADMAP-001  
**Status:** Authoritative sequential plan from empty repository to P118 and onward  
**Authority:** Derived from CHANGELOG.md, AI-NATIVE-RENOVATION-ROADMAP.md, AI-NATIVE-RENOVATION-TASK.md, AGENTS.md and observed snapshots  
**Distinction:** P118 history records the implementation sequence; the Navigator accepted P118 on 2026-10-29 based on CI 27/27 for P118.5.6 and the supplied live Architect artifact evidence. P119 is now in progress. P120–P121 remain forward phases.

The plan follows the engineering loop:

**Specification → Implementation Plan → Verification Evidence → Navigator Acceptance → Next Stage.**

An AI assistant taking any stage must:

1. Read AGENTS.md, AI-OPERATING-RULES.md, the current task section and this roadmap entry.
2. Perform only the listed code/config/doc changes.
3. Execute the verification commands.
4. Produce evidence artefacts.
5. Stop and present a yes/no question to the Navigator when any stop condition is met.

---

## Phase 0 — Empty Repository Bootstrap

**Goal:** Establish a minimal, buildable TypeScript + React + Express skeleton that can later host the three agents.

**Preconditions:** Empty git repository; Node ≥ 20 available.

**Concrete changes:**

- Create `package.json` with `"type": "module"`, scripts for `dev`, `build`, `start`, `typecheck`.
- Add `tsconfig.json`, `tsconfig.server.json`, `vite.config.ts`, `index.html`.
- Add minimal `server.ts` (Express listening on process.env.PORT || 3000) and `src/App.tsx` (hello world).
- Add `.gitignore`, `.env.example`, `README.md` (AI-facing only).
- Pin initial dependencies: express, react, react-dom, vite, @vitejs/plugin-react, typescript, tsx, dotenv.

**Dependencies:** None.

**Step-by-step algorithm:**

1. `npm init -y`; set module type.
2. Install runtime and dev dependencies.
3. Write minimal source files.
4. Confirm `npx tsc --noEmit` and `npm run build` succeed.

**Repository results:** Buildable project; `/` serves the React app; `/health` returns `{ok:true}`.

**Verification commands:**

```bash
npm run typecheck
npm run build
node dist-server/server.js &  # or tsx server.ts
curl -s localhost:3000/health
```

**Expected:** Exit codes 0; health JSON present.

**Acceptance criteria:** Clean start from empty directory produces running server and client.

**Security / regression:** No secrets committed; `.env.example` only.

**Evidence required:** Build logs, health response.

**Stop conditions:** Any dependency that requires credentials or external network beyond npm must be deferred; ask Navigator.

---

## Phase 1 — Core Infrastructure (historical foundation corresponding to early bf-* snapshots through P106–P109)

**Goal:** Introduce PostgreSQL, authentication, model registry, budget/ledger, basic routing, security primitives and the verification DAG.

**Preconditions:** Phase 0 complete.

**Concrete changes (reconstructed from migrations 001–019 and server modules):**

- Add `pg`, implement `server/database.ts` and ordered migrations.
- Implement session auth, CSRF, rate limiting (`server/security.ts`, `authRoutes.ts`).
- Implement `modelRegistry.ts`, `geminiAdapter.ts`, `budget.ts`, `ledger.ts`.
- Add health routes, basic conversation endpoint skeleton.
- Introduce schemas (`docs/schema-*.json`), `scripts/schemaValidate.mjs`, evidence records.
- Introduce `scripts/run-dag.mjs` and verification-manifest.
- Architecture boundary rules and generators.

**Dependencies:** Phase 0.

**Step-by-step (high level, historical order approximate):**

1. Migrations 001–009 for projects, states, events, jobs, budgets, gates.
2. Core server modules and route mounting in `server.ts`.
3. Client panels for early modes.
4. Test suites for core, security, database.
5. CI DAG with independent nodes always finishing.

**Repository results:** Database migrates; authenticated requests possible; model calls paced; DAG runs.

**Verification:**

```bash
npm run db:migrate
npm run test:core
npm run test:security
npm run test:database
npm run check
```

**Acceptance:** All listed tests green; schema validation passes.

**Stop:** Production credentials or GitHub write required → ask Navigator (Tier 3).

---

## Phase 2 — AI-Native Foundations (P106–P112 historical)

**Goal:** Evidence integrity, fail-closed assessment, structured handoff, capability graph, context selection, intent-policy contracts.

**Preconditions:** Phase 1 complete; Navigator acceptance of Phase 2 closure (recorded for P109).

**Concrete changes:**

- Evidence Record schema and collection scripts.
- Fault injection and bounded-repair guards.
- Always-on redacted CI diagnostics + two-artefact handoff.
- Capability graph generation and checks.
- Intent-policy contract tests.
- Context selection tooling.

**Verification:** `test:compact-ci-artifacts`, architecture checks, schema tests.

**Acceptance:** Phase 2 exit gate (P109) evidence reviewed by Navigator.

**Stop:** Any weakening of evidence integrity → forbidden; stop and ask.

---

## Phase 3 — Conversational Agent Recovery (P116 historical, accepted 2026-10-28)

**Goal:** Restore useful Conversational Agent behaviour to ≥80 % live PASS.

**Preconditions:** Phase 2 closed.

**Concrete changes (from CHANGELOG and task docs):**

- Dedicated conversation orchestration adjustments.
- Cascade foundations (Gemini primary order).
- Residual fixes for Node LTS version reporting (B3 left open).
- Live evidence collection.

**Verification:** Live conversation scenarios; `test:p117-3` related conversation tests; report entry.

**Acceptance:** Navigator recorded acceptance with residual B3.

**Evidence:** Live 80 % PASS recorded in AI-USER-VALUE-REPORT.md.

---

## Phase 4 — Expert Agent Foundations (P117.x historical, closed for conversation recovery)

**Goal:** Implement Expert Problem-Solving Agent cascade foundations and progressive reasoning paths.

**Preconditions:** P116 accepted.

**Concrete changes:**

- Expert-specific prompt/instruction composition.
- Cascade and tool eligibility distinct from Conversational.
- Model availability probes.
- Partial E2E; full Expert E2E left for later slices.

**Verification:** `test:models`, model-availability tests, conversation recovery tests.

**Acceptance:** P117.3 closed; full Expert E2E remains open.

**Stop:** If live Expert scenarios regress Conversational → stop.

---

## Phase 5 — Complex Software Architect Agent (P118 — accepted 2026-10-29)

**Goal:** Deliver a working Architect pipeline that can produce a verified ZIP from a brief, with bounded repair at Spec and Unit stages.

**Preconditions:** P117 foundations present; App Builder core contracts already introduced in earlier P93 line.

**Sub-stages (historical order):**

### 5.1 P118 / P118.2 — Completion contract and live workflow

- Define exit gate.
- Implement / harden live workflow `p118-architect-live`.
- CSRF runner fix, evidence enrichment.

### 5.2 P118.3 — Spec bounded repair + diagnostics

- Explicit `schemaVersion:1`, `parseJsonLenient`, `validateSpec` with issue list.
- One recovery call that includes previous issues.
- Events `spec_attempt` / `spec_repair` / `spec_failed` with previews.
- Tests: `tests/app-builder-spec-repair-p118.test.mjs`.

### 5.3 P118.3.1 — CI repair

- Fix type narrowing under `strict:false`.
- Restore version label consistency (APP_VERSION stays 118).

### 5.4 P118.3.2 — Single version source + documentation audit

- `package.json` sole source of `version` and `patch`.
- `src/config.ts` derives values via Vite plugin.
- `scripts/check-version.mjs` and patch-tools updated.
- Documentation consolidation (AGENTS.md, task, roadmap, report, operating rules).

### 5.5 P118.3.3 — Code-stage file marker repair (current tip)

- Coder prompt names real header `<<<FILE index.html>>>`; `PROMPT_VERSION` → `static_site.v2`.
- Parser accepts three known slips for expected path and records `coerced`.
- One bounded repair call per file (budget counted).
- Events `unit_attempt` / `unit_repair`.
- Precise failure reason `expected_path_not_found:…`.
- Tests: `tests/app-builder-unit-repair-p118.test.mjs` (7 tests, mutation-checked).

**Concrete file changes for 5.5 (from CHANGELOG):**

- `appBuilder/core-prompts.ts`
- `appBuilder/core-markers.ts`
- `appBuilder/core-engine.ts`
- `server/appBuilderAdapter.ts`
- Test files and `test:app-builder` script.

**Verification commands (local):**

```bash
npm run typecheck
npm run build
npm run test:core
npm run test:app-builder
npm run test:compact-ci-artifacts
npm run check   # full DAG
```

**Expected:** All independent nodes PASS; database-dependent nodes BLOCKED only if no Postgres.

**Live verification (required for exit):**

1. Deploy commit.
2. Confirm `/health` commit matches.
3. Dispatch `p118-architect-live` once.
4. Record result (SUCCESS with ZIP or HONEST_NON_PASS with stage and diagnostics).

**Acceptance criteria for P118 close:**

- Hosted CI green on the commit.
- Live Architect run reaches ZIP packing and verification successfully, or the remaining defects are diagnosed with stage-specific evidence and accepted as residual by Navigator.
- All P118 exit-gate items in AI-NATIVE-RENOVATION-ROADMAP.md satisfied.
- Navigator explicit acceptance.

**Stop conditions:**

- Live run fails at a new stage not covered by current diagnostics → stop, enrich diagnostics, ask Navigator.
- Budget or provider changes required → Tier 3, ask.
- Any temptation to weaken evidence integrity or invent success → forbidden, stop.

**Evidence required:** Local DAG logs, hosted CI link/run ID, live workflow transcript with event previews, downloadable ZIP if SUCCESS, entry at top of AI-USER-VALUE-REPORT.md.

---



## Phase 5B — Archive Delivery Canon (P118.5) — required before P118 exit

**Goal:** One real path from user goal to a downloadable program ZIP. Eliminate competing success paths.

**Authority:** `docs/ARCHIVE-DELIVERY-CANON.md` (normative detail).

**Why before P118 exit:** Marker/spec repairs do not prove the user received a program. Historical failure mode is fragmented delivery (staged vs legacy vs PACKAGE.md vs code-task vs client export).

### Sub-stages

| Patch | Goal | Preconditions | Acceptance |
|-------|------|---------------|------------|
| P118.5.0 | Doc lock | Current tree | Canon + roadmaps/task updated |
| P118.5.1 | Staged-only A3 API default; legacy explicit flag only | 5.0 | Default build never silent-legacy SUCCESS |
| P118.5.2 | Artifact + download invariants | 5.1 | SUCCESS ⇒ stored ZIP; empty download impossible as 200 success |
| P118.5.3 | UI one button → downloadUrl | 5.2 | Manual/scripted click downloads openable ZIP |
| P118.5.4 | E2E gate | 5.3 | Evidence: GET ZIP, JSZip open, expected paths |
| P118.5.5 | Decommission noise | 5.4 green + Navigator | Residuals flagged; UI not ambiguous |

**Canonical path (only A3 SUCCESS path):**

`POST code/build (staged) → poll job → SUCCESS + downloadUrl → GET artifact download → ZIP with implementation files`

**Residuals allowed:** legacy behind `ALLOW_LEGACY_APP_BUILDER`; code-task ZIP; PACKAGE.md; client JSON export — none may claim Architect program SUCCESS.

**Stop conditions:** Production cannot run staged → ask Navigator; do not redefine scaffold ZIP as success.

**P118 exit gate (historical, satisfied):** P118.5.6 CI 27/27 + live staged build with verified ZIP and truthful refusal controls + Navigator acceptance on 2026-10-29.


## Phase 6 — Migrate to Three Agents (P119 — in progress)

**Goal:** UI and routing expose exactly three approved agents; legacy four-mode paths removed or explicitly isolated; no regression of accepted scenarios.

**Preconditions:** satisfied — Navigator accepted P118 on 2026-10-29.

**Concrete changes:** P119.0.1 starts the migration by exposing the approved names Conversational, Expert, and Architect in the start screen and agent menu. Internal legacy keys are retained temporarily to avoid breaking existing behavior; later P119 slices must isolate or remove them behind regression coverage.

- Replace mode selector with three agent entry points.
- Isolate or delete legacy Project Mode shared state machines that collapse behaviour.
- Ensure each agent owns its orchestration, prompts, cascade, tools and output contract.
- Update client components (App.tsx, ProjectMode → agent-specific panels).
- Update acceptance suites.

**P119 slice plan (reconciled in P119.0.2; this table is the authoritative numbering — it supersedes the older numbering in `docs/p119-p121.md`):**

| Patch | Content | Status |
|---|---|---|
| P119.0.1 | Three agent names in start screen and menu; P118 status reconciliation | Delivered; CI green (Navigator confirmed) |
| P119.0.2 | Inventory of routes, workflows and shared orchestration; boundary map and per-agent contracts (TECHNICAL_SPECIFICATION §6.4, REQ-AGENT-001..003); regression tests `tests/p119-agent-boundaries.test.mjs`; documentation sync; no runtime behaviour change | Delivered; CI green (Navigator confirmed) |
| P119.0.3 | Legacy isolation (first bounded step): agent selection, turn planning and prompt entry for Conversational and Expert moved into `server/agentRouting.ts`, `conversationalAgent.ts`, `expertAgent.ts` with byte-identical prompts; user-visible legacy names (Simple chat, Project mode/workspace, Expert method) removed from the in-app guide and the Architect confirmation dialog; tests `tests/p119-agent-isolation.test.mjs`. The HTTP route `POST /api/conversation`, wire key `productMode`, internal `AppMode` keys and `promptPacks.ts` text remain shared (compatibility) | Delivered; CI green (Navigator confirmed) |
| P119.0.4 | Agent-owned prompt text: intro paragraphs, `expertDialogueParagraph`, `EXPERT_STAGES`, `EXPERT_STEP_PREFIX` moved from `promptPacks.ts` into `conversationalAgent.ts` / `expertAgent.ts` (golden-hash byte identity); agent-named routes `POST /api/agent/conversational` and `POST /api/agent/expert` added (route pins the agent; client uses them), `POST /api/conversation` kept for compatibility; dead legacy IR import removed from `server.ts` (the gated `engine=legacy` branch in `server/projectRoutes.ts` stays: deployment use UNKNOWN). Navigator decisions recorded 2026-10-29. Tests `tests/p119-agent-prompts-routes.test.mjs`, HTTP checks R1–R10 in `tests/pipeline.test.mjs` | Delivered in this slice; CI result pending Navigator report |
| P119.0.5 | Workflows `p119-agent-contracts` and `p119-ui-smoke` **only for gaps** that `ci.yml` (DAG `ci`, includes the P119 contract tests via `test:core`) and `ui-check.yml` (Playwright agent-menu check) do not already cover — e.g. a manual live smoke that each of the three agents starts and answers truthfully against a deployed commit. Do not duplicate CI | Proposed; Navigator to confirm |
| P119.0.6 | Remove remaining user-visible legacy modes (raw "Advanced" project data tab if judged a fourth mode); Architect regression: build, validators, ZIP download (workflow `p119-regression`, reusing `p118-architect-live`) | Proposed; Navigator to confirm |
| P119.0.7 | P119 Release Gate: full CI + `test:ui` + live scenarios for all three agents; evidence bound to the commit; Navigator decision | Proposed; Navigator to confirm |

**Gate P119:** required checks green; three agents work; no user-visible legacy modes; no regression of accepted P116/P117/P118 behaviour. **Transition:** P120 starts only after the Navigator's explicit decision on P119.

**[SUPERSEDED by `AGENTS.md` §2 and §4] Per-patch rule (from the Navigator's historical plan):** every patch carries code/doc changes, tests, `CHANGELOG.md`, `NEXT_PATCH.md` and the related documents; the next patch starts only after the required checks of the previous one pass.

> **Supersession note (2026-10-30):** the per-patch instruction immediately above is preserved as historical text from the earlier workflow. It is no longer active. There is no `NEXT_PATCH.md`; each new session must follow the independent state-reconstruction and task-selection protocol in `AGENTS.md`.

**Dependencies:** P118 closed.

**Step-by-step algorithm:**

1. Inventory all mode flags and shared conversation paths.
2. Introduce agent-specific route and UI surfaces.
3. Migrate Conversational and Expert to dedicated pipelines if still shared.
4. Wire Architect as third agent.
5. Remove or feature-flag legacy selectors.
6. Run full regression + new three-agent scenarios.
7. Update documentation and report.

**Verification:** Full CI + live scenarios for all three agents.

**Acceptance:** Representative user can start each agent and receive truthful outcomes; no fourth mode visible.

**Stop:** Any regression of P116/P117 accepted behaviour → stop and ask.

---

## Phase 7 — Cross-Agent E2E and Stabilisation (P120 — forward)

**Goal:** Representative scenarios for all three agents pass; failures are truthful; artefacts accessible; limitations explicit.

**Preconditions:** P119 complete.

**Concrete changes:** Expand acceptance suite, harden recovery paths, surface residual limitations in UI and report.

**Verification:** Cross-agent live runs + CI.

**Acceptance:** Navigator formal acceptance of product-level outcomes.

**P120 slice plan (carried over from the Navigator's plan in `docs/p119-p121.md`):**

| Patch | Content | Result |
|---|---|---|
| P120.0.1 | E2E Conversational | Full user scenario verified |
| P120.0.2 | E2E Expert | Expert scenarios and error paths verified |
| P120.0.3 | E2E Architect | Build, validators, download and ZIP integrity verified |
| P120.0.4 | Cross-agent E2E: switching between agents and context preservation | Agents verified together |
| P120.0.5 | Stabilisation; fix regressions found | Stable integration suite |
| P120.0.6 | Workflows `p120-acceptance` and `p120-evidence` | Final CI and one evidence report |
| P120.0.7 | Final acceptance and closing documentation | Formal completion of the programme |
| P120.0.8 (conditional) | P118 residuals: download policy for `PARTIAL` (`failed_but_download_offered`) and dependency audit (`zod`, `body-parser`, `qs`); included only if the inventory confirms they still need closing before release | Optional |

**Gate P120:** required E2E pass; no false `SUCCESS`; results bound to the verified commit; acceptance criteria met. After P120 the programme is closed; P121 is optional, not an obligatory end.

**Historical sequence (recorded before cycle-based numbering):** P119.0.1 → P119.0.2–0.7 → Navigator decision on P119 → P120.0.1–0.4 → P120.0.5–0.7 → programme closed → proposed browser-provider/resilience work (optional, only after an explicit Navigator yes and closed open decisions). Current patch identifiers follow the cycle/version convention in `AGENTS.md`; do not treat the old P121 feature label as the current patch number.

---

## Phase 8 — Universal Model Resilience Layer (previously described as the P121 feature — planned only)

**Goal:** Improve outcomes when models/providers are unavailable or return low-quality answers (registry, health monitor, task-aware router, response validator, recovery engine).

**Preconditions:** P116–P120 line accepted or explicitly re-sequenced by Navigator.

**Open decisions (must be resolved before start):** budgets, probe frequency, cross-provider data transfer, selective critique, telemetry retention, local inference feasibility, exact endpoint validation.

**Stop:** Do not begin implementation until Navigator authorises and open decisions are closed.

---

## Global Rules for Every Stage

1. One bounded patch at a time.
2. `package.json` updated in every patch; version never decreases.
3. Evidence is commit-specific.
4. `UNKNOWN`, `NOT_RUN`, `BLOCKED`, `TIMEOUT`, `PARTIAL` are never treated as `PASS`.
5. Never ask Navigator to read code; present consequences + yes/no question.
6. Charter conflicts must be reported; never silently reinterpret.
7. Security, evidence integrity and product function bind above all other considerations.
8. Reassess the standing repository language audit; English-only source text must not be achieved by silently narrowing product language support.

This roadmap is the sole authoritative sequence. Update it in place when the Navigator accepts a phase transition.


## P127.6 — Existing project continuation

Implemented: project-scoped continuation endpoint using a verified prior ZIP, bounded source context, unsafe-path rejection, and a new staged build job. Remaining: repository-aware patch application and UI selection of prior versions.

## C128 — ImmoFinder GR (owner-approved spec v128, 2026-11-15)

- Status: spec and design recorded in 128.1a (`TECHNICAL_SPECIFICATION.md` P128, `docs/DECISIONS.md` D-2026-11-15-01, `docs/EXPERIMENTS.md` EXP-IMMO-1). Code `NOT_STARTED`.
- Phase 1 (MVP): workspace + home button, 1–2 sources, whitelist/rooms/stop-list filters, Postgres, Drive CSV/JSON, Telegram, universal draft, anti-fabrication verifier, dry-run, cost estimate, cron endpoint.
- Phase 2: OSINT, personalised drafts, more sources (appa.ch, commune pages, agritourism), dedupe across sources, history events.
- Phase 3: Apify/Airbnb, Facebook, soft price hint, better Russian translation.
- Open inputs from the Navigator: Telegram bot token + chat id, Google service account (the folder `ImmoFinder GR` is created by the module and shared to a given email), `IMMOFINDER_RUN_SECRET`; Gemini and Serper keys come from the existing carousel.

- 128.1 (EXPERIMENT): Phase 1 code shipped; live evidence `NOT_RUN`. Acceptance per EXP-IMMO-1 is checked on the first live run.
