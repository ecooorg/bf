# BiForge — Current Task and Patch Control

**Current patch:** P118.2 — Live evidence workflow for the Architect task-to-ZIP / truthful-fail scenario.
**Status:** workflow, runner, classifier and tests delivered; live run NOT_RUN until the Navigator dispatches it. P118.1 outcome mapping delivered earlier.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task, the canonical roadmap, and the user-outcome specification.
**Current specification:** `docs/AI-USER-VALUE-SPEC.md` section A3.
**APP_VERSION:** 118.

## Closed

- P116 accepted with residual B3. P117.3 closed.

## This slice (P118.2)

1. `.github/workflows/p118-architect-live.yml` (manual dispatch) runs `scripts/p118-architect-live.mjs`: login, create + confirm an evidence project, `POST /code/build` (engine `pipeline`), poll if staged, download and integrity-check the ZIP, then two refusal controls (unconfirmed passport → 409, missing artifact → 404), then delete the projects it created.
2. `scripts/p118-architect-live-lib.mjs` classifies: PASS (SUCCESS + verified non-empty ZIP) / PARTIAL / TRUTHFUL_FAIL / FALSE_SUCCESS / INCONSISTENT / TIMEOUT / BLOCKED / UNKNOWN. Overall PASS only if build PASS and both controls refuse truthfully; PARTIAL or TRUTHFUL_FAIL is `HONEST_NON_PASS` (exit 0, `deliveryProven=false`).
3. Tests: `tests/p118-architect-live.test.mjs` (in `test:app-builder`): classifier cases, real scaffold ZIP → PARTIAL, runner against a loopback fake server, secret-redaction check.
4. P118.2.1: runner sends same-origin `Origin` on writes (live run #1 was blocked by `CSRF_ORIGIN`).
5. No product runtime change.

## Previous slice (P118.1)

1. `pipelineArchitectOutcome` / `stagedArchitectNote` pure helpers.
2. Pipeline build response: `outcome`, `failedStage`, `failureReason`; no downloadUrl on FAILED empty.
3. Client and Project Mode show SUCCESS/PARTIAL/FAILED honestly.
4. Unit tests for outcome mapping.

## Next slice candidates

- Dispatch the P118.2 workflow and record its verdict in the rolling report.
- If the live verdict is PARTIAL by `SLICE_SKIPPED`: Navigator decision whether to enable the model slice (`CODE_EXECUTOR=model_patch` + `APP_BUILDER_MODEL_SLICE=true`) or the staged engine (`APP_BUILDER_ENGINE=staged`) — Tier 2/3, not assumed.
- Surface checksDeclared/checksRun in UI beyond status line.
