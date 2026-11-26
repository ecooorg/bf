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
