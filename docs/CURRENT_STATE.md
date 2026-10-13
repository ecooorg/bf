# Current state

> Updated 13 October 2026 after P19x + PA-02. Base: owner archive `bf-v24.zip` (CI green).

## Product

- **Simple Mode**: PI-01…PI-03 done; product version **24**. Model pool: `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`. A quota error from one model parks that model for 30 minutes and the next one is tried; `GEMINI_QUOTA` is returned only when every model is out of quota.
- **Project Mode**: P01–P24 in the repository (State, Router v1, ledger, queue and worker, Task Graph, artifacts, GitHub integration, Gate Engine, `manual` executor, Repair Loop, security, `/ops`). **P19x**: `model_patch` driver (`driveModelPatch`) is implemented and gated by `CODE_EXECUTOR=model_patch`; default remains `manual` until E-01 / ADR-10.
- **CI**: green on `main` (owner-confirmed on base archive).

## Gates

- G1a, G1: code and reports in place; owner notes and a real fallback smoke are not recorded.
- G2: automated tests pass; the live end-to-end scenario (TZ 18.1) and E-01 are owner-confirmed but have **no data in the repository** (`NOT_RUN`). ADR-10 is `INTERIM`. PA-02 harness is ready to produce the E-01 table against the approved test GitHub repository.
- G3: open (E-01, live Repair Loop calls, pilot task to PR).
- G4: open (live backup restore, rollback drill, pilot S3, version BiForge v2.0).

## Decisions pending

ADR-06 (`Proposed`), ADR-10 (`INTERIM`).

## Next

Plan to the end of the project and queue: `docs/NEXT.md`. Process: run PA-02 harness (dry then live on test repo), complete Stage A/B evidence, then ADR-10 card.

## Process

Delegation policy in force (`docs/DELEGATION.md`). PA-01 delivered. **P19x** and **PA-02** delivered this session (no product version bump). Staging (PA-03) allowed; test GitHub repository approved.
