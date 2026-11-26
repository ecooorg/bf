## P131.8d — Preflight exception for server/immofinder/
- **OBSERVED:** Core CI failed test:models because preflight flagged every `server/immofinder/*` path as nested folder (only appBuilder was excepted).
- **CHANGE:** Allow depth-3 `server/immofinder/*` and depth-4 `server/immofinder/sources/*`; delete empty placeholder `server/immofinder/1`.
- **NOT_RUN:** hosted CI on this head; live search remains blocked by Serper credits.

## P131.7a — R7/R9 run audit block
- **OBSERVED:** replay over 78 retained runs: 1,394 rejects all map to the closed list, 100 from retired gates; HappyHoliday 738 candidates / 20 fetched / 0 kept in 4 fetching runs; Render `bf` live on `1ec7488` (= main HEAD pre-patch); run `02ee3459` all Serper HTTP 400 (credits). Local typecheck, test:core (all suites), governance, docs:integrity, architecture:check PASS.
- **CHANGE:** `server/immofinder/taxonomy.ts`, `qualityAudit` in persisted diagnostics, `quality.rejectCodes` aligned; tests in `tests/immofinder-verify.test.mjs`.
- **NOT_RUN:** hosted CI on this head, live run with the audit block, WP2/WP5/WP6. Push to `main` was NOT possible: the GitHub connector returned HTTP 403 on every write.

## P131.7a — Factual status reconciliation
- **OBSERVED:** no `server/immofinder/` target layout; legacy 17-module engine with C131 rules in place; run `038d1c87`: 0 kept / 113 candidates, Tutti/Homegate 403. Local typecheck, test:core and docs:integrity PASS on this tree.
- **CHANGE:** `version:*` scripts repaired; architecture/roadmap/experiments status corrected (additive).
- **NOT_RUN:** hosted CI, deployed commit, WP2 fetcher pilot, WP6 acceptance.
