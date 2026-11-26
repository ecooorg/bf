## P131.8t — Flatfox source expansion
- Added Flatfox direct rental index/detail adapter, price/rooms/advertiser parsing and host allowlist. Active direct sources are now HappyHoliday, Ferienhausmiete and Flatfox; Anibis/Tutti paused after 403.
- Manual-only, no delivery, no Serper/LLM/Jina. Local Chromium cap 3 renders/run on allowlisted hosts only.
- **Flatfox live pilot:** NOT_RUN at report time. **Second full-canton revalidation run:** pending. **Hosted Core CI:** NOT_CONFIRMED; connector reports no check statuses.

## P131.8s — Production quality correction
- **P131.8r live run:** 87 candidates, 24 detail fetches, 16 rows written hidden by write-time quality rules; 0 visible verified leads. HappyHoliday 12/12 classifier-kept but hidden by quality repair (holiday/locality/room reasons); Ferienhausmiete 4/4 classifier-kept but hidden (three false seeker flags, one agency/list page). Anibis and Tutti both HTTP 403; no detail fetches. Estimated paid-provider cost: $0.00.
- Reviewed records exposed locality substring errors (Solavers/Avers, Haus Katrin/Trin, Tga Davos Nord/Savognin), Swiss half-room parsing and a placeholder phone number. No bad rows were presented as visible leads.
- P131.8s fixes token-aware locality in both classifiers and write-time gates, prioritizes description locality, parses 2 1/2 and 4 1/2 rooms, requires substantive page detail, rejects agency listings and placeholder numbers, and removes the generic seeker-nav false positive.
- HappyHoliday/Flatfox short pages can use at most 3 local Chromium renders per run; only those two hosts are allowlisted. Fresh defaults and migration enable only HappyHoliday/Ferienhausmiete/Flatfox; Serper, LLM, Jina, recurring schedules and all notifications remain disabled. Anibis/Tutti paused after 403.
- **Second live run:** NOT_RUN at report time. **Hosted Core CI:** NOT_CONFIRMED; GitHub status connector returned no check statuses. Render build/TypeScript succeeded for P131.8r.

## P131.8r — Full-canton source expansion
- Configured all 100 official Graubünden municipalities (14.09.2026 list) plus 19 locality aliases. Saved production settings are migrated once to full scope, 2+ rooms, all configured sources enabled, manual schedule and delivery disabled.
- Direct-only live adapters: HappyHoliday, Ferienhausmiete, Anibis and Tutti. Caps: 6 index pages/source, 12 detail pages/source, 48 details/run, 240 seconds. 1.5s per-host delay and robots/SSRF guards retained.
- Fixed locality matching for Swiss postcode commas, hyphenated Zimmer labels and broad false agency matches. Paid search/LLM/Jina/browser fallback remains off.
- Production deployment, real source fetchability, accepted lead yield, hosted CI: NOT_RUN at report time.

## P131.8q — Source-first production path (EXPERIMENT)
- Added bounded live runner in `server/immofinder/live.ts`; production route now uses it. Only direct HappyHoliday/Ferienhausmiete source adapters; no Serper, LLM, Jina or browser fallback. Strict fetched-page evidence, locality/rooms/agency/seeker gates; max 12 detail fetches and 180s/run; recent results cached and blocked sources stopped early.
- Runtime GitHub commits disabled; DB/Render logs remain. Diagnostics/health Actions manual-only; health commits use `[skip render] [skip ci]`. Idle worker polling reduced to 15s. Production deployment and CI/user-value: NOT_RUN at report time.

## P131.8p — Preflight immutability
- **OBSERVED in source:** Preflight patched `immofinderRepair.ts` and invoked a test-restoration script. Both mutations removed; regression guard added. Hosted CI: NOT_RUN.

## P131.8o — Single roadmap
- **CHANGE:** `docs/ROADMAP_C131.md` retired from the allowlists; `ROADMAP.md` is the only roadmap.
- **NOT_RUN:** hosted CI after the manual deletion.

## P131.8n — Roadmap consolidation
- **CHANGE:** C131 log and ordered quality plan recorded in `ROADMAP.md`; version metadata 131.8n.
- **NOT_RUN:** hosted CI for 131.8j–131.8n; Render commit identity; live yield (last short tests: 0 kept).

## P131.8m — SERP pipelining
- **OBSERVED:** run `d470cbb4`: 12/17 queries, 0 kept; resolve latency fixed 15-23 s per goto query; P131.8l parallel resolve not confirmed as cause of the gain.
- **CHANGE:** next Serper call prefetched during candidate processing.
- **NOT_RUN:** live re-measure; hosted CI.

## P131.8l — Parallel Serper resolve
- **OBSERVED:** run `b8e86208` (c78fa4e): resolve ≈93 s of 142.6 s, 8/17 queries, 0 kept; HappyHoliday 82/82 geo skips, no early stop.
- **CHANGE:** per-row parallel `/resolve`.
- **NOT_RUN:** live re-measure; hosted CI.

## P131.8k — Early-stop streak excludes prefetch geo skips
- **OBSERVED:** HappyHoliday 738 candidates / 20 fetched / 0 kept over 4 runs; early stop after 14 skips.
- **CHANGE:** URL/title geo skips no longer count toward `consecutiveBad`.
- **NOT_RUN:** live yield change; hosted CI.

## C131 state snapshot (docs only)
- **OBSERVED:** WP0 done; WP1-WP4 partial; WP5-WP7 not started; new engine under `server/immofinder/` exists but legacy is live.
- **CHANGE:** roadmap status and open-work list recorded in `docs/ROADMAP_C131.md`.
- **NOT_RUN:** hosted CI and production deploy identity on main @ 0413898.

## CURRENT EVIDENCE NOTE
Evidence is run-scoped and labelled OBSERVED / INFERRED / NOT_RUN. Hosted CI, live search yield and owner review are reported separately from local unit results.

## Evidence boundary
This report records implementation and verification state only. It does not assign the next session task and does not claim user value from green unit tests alone.

## P131.8g — Source-first HappyHoliday pilot
- **OBSERVED:** index `happyholiday.ch/area/graubuenden/` → 25 unique detail URLs; 6 fetched; new engine kept 4 (2× L2 private+direct Lenzerheide, 2× L1). Seeker false-positive from «suchen/Suche» chrome fixed.
- **CHANGE:** tighter SEEKER_RE; `scripts/immofinder-source-pilot.mjs`; patch 131.8g.
- **NOT_RUN:** hosted Core CI green on this head; production deploy; Serper-backed discovery.

## P131.8d — Preflight exception for server/immofinder/
- **OBSERVED:** test:models flagged WP3 paths as nested folders.
- **CHANGE:** allow server/immofinder and sources; delete empty placeholder.
