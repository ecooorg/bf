## C131 P131.8g — Source-first pilot produces L2 listings — 2026-11-26
- **Live pilot (no Serper):** HappyHoliday GR index → 6 detail pages → new `processSnapshot` engine.
- **OBSERVED kept:** L2 «Haus am See» Lenzerheide (9 Zi, von privat, direct contact); L2 «Scoldasu» Lenzerheide (8 Zi, von privat, direct); L1 Berggasthaus / Posta Veglia.
- **Fixed:** seeker regex no longer matches site nav («Haus suchen») / marketing («Suche»).
- **Still open:** locality must prefer URL/title over footer chrome; package-lock/repair stamp CI green; WP5 cut-over; Serper credits.

## C131 P131.8d — Preflight allows target layout — 2026-11-26
- **Fixed:** scripts/patch-tools preflight now accepts `server/immofinder/` and `sources/` so test:models no longer fails on the WP3 scaffold.
- **Still open:** parallel dry-run wiring, remaining adapters, delta store, R9 auto-demotion, WP5 cut-over, WP2 pilot, Serper credits, WP6.

## C131 WP3 engine scaffold complete — 2026-11-26 (P131.8)
- **Implemented:** pure stages `classify`, `access`, `owner`, `run`, `pipeline` and adapters `happyholiday`, `ferienhausmiete` under `server/immofinder/`. Offline `processSnapshot` / `replaySnapshots`. R7 taxonomy retained. Legacy engine still live.
- **Open:** WP5, delta store, remaining adapters, Serper credits, WP6.

## C131 R7/R9 run-audit instrument and deploy identity — 2026-11-26 (RELIABILITY)
- **Implemented:** closed R7 reject taxonomy and per-run `qualityAudit`. Live path still legacy until WP5.
