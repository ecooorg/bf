# Current state

> Updated 12 October 2026 after P24 and the model-pool fix. Base: owner archive `bf-v24new.zip` (CI green).

## Product

- **Simple Mode**: PI-01…PI-03 done; product version **24**. Model pool: `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`. A quota error from one model parks that model for 30 minutes and the next one is tried; `GEMINI_QUOTA` is returned only when every model is out of quota.
- **Project Mode**: P01–P24 in the repository (State, Router v1, ledger, queue and worker, Task Graph, artifacts, GitHub integration, Gate Engine, `manual` executor, Repair Loop, security, `/ops`). `model_patch` exists in code and is off.
- **CI**: green on `main`.

## Gates

- G1a, G1: code and reports in place; owner notes and a real fallback smoke are not recorded.
- G2: automated tests pass; the live end-to-end scenario (TZ 18.1) and E-01 are owner-confirmed but have **no data in the repository** (`NOT_RUN`). ADR-10 is `INTERIM`.
- G3: open (E-01, live Repair Loop calls, pilot task to PR).
- G4: open (live backup restore, rollback drill, pilot S3, version BiForge v2.0).

## Decisions pending

ADR-06 (`Proposed`), ADR-10 (`INTERIM`).

## Next

Plan to the end of the project and queue: `docs/NEXT.md` (former TZ section 16.7).

## Process

Delegation policy in force (`docs/DELEGATION.md`, 13 October 2026). PA-01 (evidence workflow and gate evaluator) delivered; it changes no product behaviour. Next: owner commands for P19x, PA-02, PA-03 or P25.
