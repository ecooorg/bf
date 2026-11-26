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
