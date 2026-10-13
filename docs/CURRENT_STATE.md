# Current state

> Updated 13 October 2026 after PA-04 (E-01 lab runner).

## Product

- Version **24**. P19x `driveModelPatch` gated; default `manual` until ADR-10.
- CI: `test:p19x` / `test:pa02` / `test:pa04` scripts present.

## E-01

- Lab: `ecooorg/biforge-e01-lab`.
- **PA-04:** copy `CONCEPTS/e01-task.yml` → lab `.github/workflows/e01-task.yml`, then Run workflow (see `docs/E01_LAB.md`).
- t1 model done via web earlier; continue via workflow for remaining pairs.
- Notes: Assistant patches `ARCHIVE/E01-NOTES.md` after your one-line reports.

## Gates

- ADR-10 `INTERIM` until six pairs + RESULTS in repo.
