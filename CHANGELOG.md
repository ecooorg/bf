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
