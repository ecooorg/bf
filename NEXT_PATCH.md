# P118.2.1 — Navigator handoff (runner fix after live run #1)

**Live run #1:** stopped at project creation with 403 `CSRF_ORIGIN` (runner defect: missing `Origin` header). This patch fixes the runner only; the task-to-ZIP verdict is still NOT_RUN.

**Outcome:** a manual workflow that proves, on the real service, whether a software task ends in a verified non-empty ZIP or in a truthful failure. No product code changed; app version stays 118. P118 acceptance is NOT claimed.

## Changes
- `.github/workflows/p118-architect-live.yml`, `scripts/p118-architect-live.mjs`, `scripts/p118-architect-live-lib.mjs`: live scenario, ZIP integrity check, two refusal controls, verdict classifier.
- `tests/p118-architect-live.test.mjs`, `package.json`: tests wired into `test:app-builder`.
- `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-USER-VALUE-REPORT.md`, `docs/AI-ENVIRONMENT-CONTEXT.md`, `CHANGELOG.md`: slice, evidence record, live-mutation note, history.

## How to run
Secrets `STAGING_SERVICE_URL` and `STAGING_APP_PASSWORD` already exist from P117.3. Actions → **P118 architect live** → Run workflow (leave fields as is) → download artifact `p118-architect-live`.

## Verification
- New tests: PASSED locally (14). Mutation checks: PASSED. Hosted CI: NOT_RUN. Live workflow: NOT_RUN. Production: UNKNOWN.

## Next action
Apply, wait for green CI, dispatch the workflow again (no redeploy needed beyond the repo update; the workflow runs from the repository). Expected by source analysis (not proven): PARTIAL with `SLICE_SKIPPED`.

Rollback: delete the three new script/workflow files and the test; restore the edited docs/package.json from backup.

Charter conflicts: none
