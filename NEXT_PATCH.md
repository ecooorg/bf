# P118.2.2 — Runner evidence enrichment (invalid_spec diagnosis)

**Live run #2 (commit 1f7c07b):** library-app task → staged engine → terminal FAILED in ~3 s, `failedStage=spec`, `failureReason=invalid_spec`, no ZIP, controls N1/N2 truthful. Classifier: `HONEST_NON_PASS`, `deliveryProven=false`. Transcript lacked `error.message`, `callsUsed`/`callsBudget`, `units`, and did not download `diagnosticsUrl` / `build-report.json`.

**This slice:** enrich the live runner only. No product change; version stays 118.

## Changes
- `scripts/p118-architect-live.mjs`: write job evidence (`error.message`/`code`, `callsUsed`/`callsBudget`, `units`, `failedStage`/`failureReason`) into the poll step and `result.build.jobEvidence`; when `diagnosticsUrl` is present, download the diagnostics ZIP, extract `build-report.json`, and store both as artifacts under `p118-live/`.
- `tests/p118-architect-live.test.mjs`: staged-fail mode with error/calls/units and a diagnostics export endpoint; asserts transcript fields and artifact files.
- Docs: this handoff, `CHANGELOG.md`, task status.

## How to run
Actions → **P118 architect live** → Run workflow → download artifact `p118-architect-live` (now includes `diagnostics.zip` and `build-report.json` when the job exposes them).

## Verification
- New/updated tests: to be run locally after apply. Hosted CI: NOT_RUN. Live workflow: NOT_RUN until re-dispatched. Production: UNKNOWN.

## Next action
Apply, wait for green CI, dispatch the live workflow once. Use the new transcript + build-report to decide whether a bounded product repair of the spec stage is warranted (Navigator decision).

Rollback: restore the two script/test files and docs from the previous commit.

Charter conflicts: none
