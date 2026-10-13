# Current state

> Updated 13 October 2026 after P19x TS fix and E-01 lab session notes. Base: owner archive with P19x/PA-02 on main.

## Product

- **Simple Mode**: PI-01…PI-03 done; product version **24**.
- **Project Mode**: P01–P24; **P19x** `driveModelPatch` gated by `CODE_EXECUTOR=model_patch` (default `manual` until ADR-10).
- **CI**: must be green after TS2339 fix in `driveModelPatch` (narrowing `validated.ok === false`).

## E-01 lab (in progress)

- Test repo: `ecooorg/biforge-e01-lab`.
- Guide: `docs/E01_LAB.md`. Owner notes: `ARCHIVE/E01-NOTES.md`.
- e01-t1 model_patch: green PR after 1 fix. Next: e01-t1 manual, then t2/t3 pairs.
- Path: GitHub web on Android only (no token / Codespaces / Railway for the lab).

## Gates

- G2: E-01 data still incomplete (`NOT_RUN` until `ARCHIVE/E01-RESULTS.json`). ADR-10 `INTERIM`.
- G3, G4: open.

## Process

Delegation in force. PA-01, P19x, PA-02 delivered. Staging (PA-03) allowed. Test GitHub repository approved.
