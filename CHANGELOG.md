## P131.9 follow-up — C131 regression corrections
- Restore required canonical documentation sections while retaining the new ImmoFinder status; fix detail URL canonicalization in tests, model Anibis as SERP-only, and reject seeker wording such as "Ich suche eine 3.5 Zimmer Wohnung". Report real Serper/Gemini call counts in production-run artifacts rather than hardcoding zero.

## P131.9 — Source-first reliability and recovery retirement (RELIABILITY)
- Align C131 tests with the live runner without weakening fetched-page gates; remove automatic legacy payload restoration and sync patch metadata.

## P131.8w — ImmoFinder state audit (MAINTENANCE)
- Reconcile the two historical red-CI causes against their fixes on main; align package, lockfile and repair-rule patch metadata.
- Document the live-engine cut-over, remaining legacy dependencies, CI evidence and unverified production acceptance.

## P131.8v — Bounded provider-assisted discovery (FEATURE)
- Add a rotating, 18-query maximum Serper layer across Flatfox, Anibis and Tutti; respect a 3-second minimum spacing and fetch only validated detail URLs.
- Enforce a runtime minimum of 3 rooms and activate the remaining supported classified adapters.
- Add at most 3 Gemini LIGHT borderline owner-evidence reviews/run; only exact, semantically validated page quotes can promote L1 to L2.
- Estimated provider budget <=$0.024/run; no recurring schedule or notification delivery is enabled. Production yield remains unverified until deployment and live review.

## P131.8u — Actionable evidence gate (BUGFIX)
- Do not admit listings without a direct contact or source-platform enquiry route. Extract named hosts, preserve source price/currency and show platform enquiry as actionable contact on cards.
- Fix bedroom-vs-room false positives; support half-room and hyphenated Zimmerwohnung labels. Hold exploratory rows hidden until a clean fresh fetch revalidates them.
- Keep-alive pings disabled for Render idle savings; manual schedule, no delivery and zero paid provider calls.

## P131.8t — Add Flatfox direct rentals (FEATURE)
- Added a bounded Flatfox Graubünden rental source and detail adapter, including monthly price, ½-room and advertiser extraction. Enabled only alongside HappyHoliday/Ferienhausmiete.
- Production remains manual-only with all delivery channels off. No Serper, LLM or Jina spend; local Chromium fallback remains capped at 3 pages/run.

## P131.8s — Evidence-first quality correction (BUGFIX)
- Corrected locality false positives from substrings and property names; description evidence now wins over property-title mentions. Added Swiss half-room parsing (2 1/2, 4 1/2), substantive detail-page gate and agency detection.
- Removed portal navigation as a seeker-post signal and reject sequential placeholder phone numbers. Recognize host enquiry forms.
- HappyHoliday extracts structured descriptions; Flatfox direct rental discovery now parses half rooms, monthly price and advertiser identity. Local Chromium is allowlisted only for HappyHoliday/Flatfox and capped at 3 pages/run. Anibis/Tutti paused after HTTP 403. Fresh defaults enable only HappyHoliday/Ferienhausmiete/Flatfox; schedule and all delivery channels default off. No paid provider calls enabled.
- First pilot's hidden candidates are rechecked once; existing records recover only after a clean new fetch. Second production yield and hosted CI pending.

## P131.8r — Full-canton source expansion (EXPERIMENT)
- Expanded locality scope to all 100 current Graubünden municipalities plus 19 locality aliases; one-time startup migration enables all configured sources, sets 2+ rooms, keeps scheduling and delivery off, and queues one bounded production run.
- Added Anibis adapter and enabled Tutti direct adapter; widened bounded source-first coverage to 4 adapters and 48 detail attempts/run. Improved postcode locality, hyphenated room-count and false agency rejection.
- Paid discovery/model/browser fallbacks remain disabled. Final release push includes the full settings/UI and source-adapter changes; Render deploy, live lead yield and hosted CI must be verified before acceptance closes.

## P131.8q — Source-first ImmoFinder cut-over (EXPERIMENT)
- Added bounded direct-source live runner and switched production route to it; paid search/model and Jina/browser fallbacks disabled for this path. Added locality/evidence/no-write regression tests and provider-free route guard. Deployment, hosted CI and live lead yield pending verification.
- Removed per-run GitHub snapshot/diagnostic writes, disabled scheduled diagnostic/health Actions, prevented health snapshots from triggering Render, and reduced idle worker DB polling to 15s.

## P131.8p — Make Preflight read-only (MAINTENANCE)
- Removed source/test mutation and automatic verification-test restoration from Preflight; added an immutable-test regression guard.

## P131.8o — Retire docs/ROADMAP_C131.md
- **PROBLEM:** a second roadmap file made assistants read two sources of truth.
- **CHANGE:** removed it from the `docs/` allowlists (AGENTS §6, docs-integrity, governance test); its content already lives in `ROADMAP.md`. Navigator deletes the file in the same commit; patch 131.8o.
- **SCOPE:** MAINTENANCE.

## P131.8n — Roadmap consolidation and version bump (docs only)
- **PROBLEM:** C131 status lived only in `docs/ROADMAP_C131.md`; the root roadmap lagged and `package.json` still said 131.8i.
- **CHANGE:** C131 log imported into `ROADMAP.md` with an ordered quality-search plan; patch 131.8n synced to lockfile; `REPAIR_RULES_VERSION` follows it (seen-cache invalidated once).
- **SCOPE:** MAINTENANCE, docs + version metadata.

## P131.8m — Pipeline next SERP call
- **PROBLEM:** run `d470cbb4` still hit the time budget at 12/17 queries; /goto resolve costs 15-23 s per call regardless of link count (P131.8l parallelism did not help).
- **CHANGE:** the next query's Serper call starts while the current query's candidates are processed.
- **SCOPE:** RELIABILITY, `server/immofinderPipeline.ts`; no version bump.

## P131.8l — Parallel Serper redirect resolution
- **PROBLEM:** serial `/goto` resolution took 15-23 s per query and consumed ≈65% of the run budget (9 of 17 queries skipped).
- **CHANGE:** each goto row is resolved in its own parallel call; a failed row keeps its original link.
- **SCOPE:** RELIABILITY, `server/immofinderDiscovery.ts`; no version bump.

## P131.8k — Prefetch geo skips no longer trigger source early-stop
- **PROBLEM:** out-of-area URL/title skips counted as a bad streak and stopped catalogue sources after 14 items.
- **CHANGE:** those two skips no longer increment `consecutiveBad`; fetched non-keeps still do.
- **SCOPE:** BUGFIX, `server/immofinderPipeline.ts`; no version bump.

## P131.8j+ — C131 state snapshot (docs only)
- **PROBLEM:** roadmap status and open WP0-WP7 work were scattered across entries.
- **CHANGE:** added one status and open-work entry to `docs/ROADMAP_C131.md`; no code change, no version bump.
- **SCOPE:** MAINTENANCE.

## P131.8i — Core CI green; C131 soft price; WP5 dry-run helper
- **PROBLEM:** `price_ambiguous_on_detail_page` hard-rejected verified listings; Core CI red on P129.49.
- **CHANGE:** Ambiguous optional price is soft (clear on sanitize, never hide). Preflight applies the soft-price patch. Added `dryRunBatch` for offline new-vs-legacy compare. Core CI Verification DAG green.
- **SCOPE:** RELIABILITY / C131 engine. `server/immofinderRepair.ts`, `scripts/workflow-preflight.mjs`, `server/immofinder/dryRun.ts`.

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
