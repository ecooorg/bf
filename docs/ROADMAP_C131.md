## C131 P131.8d — Preflight allows target layout — 2026-11-26
- **Fixed:** scripts/patch-tools preflight now accepts `server/immofinder/` and `sources/` so test:models no longer fails on the WP3 scaffold.
- **Still open:** parallel dry-run wiring, remaining adapters, delta store, R9 auto-demotion, WP5 cut-over, WP2 pilot, Serper credits, WP6.

## C131 WP3 engine scaffold complete — 2026-11-26 (P131.8)
- **Implemented:** pure stages `classify`, `access`, `owner`, `run`, `pipeline` and adapters `happyholiday`, `ferienhausmiete` under `server/immofinder/`. Offline `processSnapshot` / `replaySnapshots`. R7 taxonomy retained. Legacy engine still live.
- **CI/Render:** package.json was truncated by partial pushes (missing deps/scripts) — restored to full 16 deps / 49 scripts, patch 131.8. CHANGELOG history restored.
- **Open:** parallel dry-run wiring, remaining adapters, delta store, R9 auto-demotion, WP5, WP2 pilot, Serper credits, WP6.

## C131 R7/R9 run-audit instrument and deploy identity — 2026-11-26 (RELIABILITY, no answer-path change)
- **Implemented:** closed R7 reject taxonomy (`server/immofinder/taxonomy.ts`; 13 codes) and per-run `qualityAudit` attached to every persisted run report. First module of target `server/immofinder/`.
- **Still open:** new engine modules were scaffolded in P131.8; live path still legacy until WP5.
