# BX-07 — report

> Written in P00 from the owner's data and `CHANGELOG.md`. Status: **closes** when CI on the last commit is green and the owner has done the short Simple Mode check on Railway.

## Done

- Provenance: `updateProjectState` requires a non-empty `sourceRef`; event `project.created` records `source_ref`.
- Test: Project State and history survive a service restart, the version counter continues (`tests/database-live.test.mjs`).
- Manual check of 409 on Railway: two tabs; the second got "State version conflict"; data not overwritten.
- Interface is English only; the Russian UI dictionary and DOM translation were removed.
- `/health` returns `commit` (checked on Railway: `974cf83e69a8`).

## Closed (2026-10-11)

Closing condition met: CI is green on commit `1c2719d` and the owner confirms the Simple Mode check on Railway after every patch.

## Not run by the agent

`npm run check`, `npm run build`, live PostgreSQL tests. Evidence is CI on `main`.

## Known leftovers

Labels with a version in Simple Mode and a step number in the `/project` header: P01.
