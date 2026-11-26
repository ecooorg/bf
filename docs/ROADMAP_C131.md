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
