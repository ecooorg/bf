# P39 — report

- Hardened TAR ingestion against repeated exact paths: first accepted entry wins; subsequent entries are skipped as `duplicate_path`.
- Added a regression test using a TAR archive with duplicate file names.
- Defaults chosen: first-wins for deterministic behavior; existing case-collision policy is unchanged.
- Base: owner archive `bf-main (21).zip`, 2026-10-15.
- `node scripts/check-version.mjs`: PASS (`Version check OK: 40`).
- `npm run test:p26a`: NOT RUN successfully; command failed because `tsx` was unavailable after dependency installation timed out.
- `npm ci --ignore-scripts --no-audit --no-fund`: TIMEOUT at the environment's 120-second command limit.
- `npm run patch:pack` equivalent (`node scripts/pack-simple.mjs --base '/mnt/data/bf-main (21).zip' --patch P39 --out /mnt/data/bf-P39.zip`): BLOCKED because the interrupted install left `jszip` incomplete, so pack preflight could not execute.
- Delivery status: PARTIAL. No CI or full-check PASS is claimed. Re-run install, focused tests, `npm run check`, and `npm run patch:pack` before merging.
