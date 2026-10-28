# P117.3 — Navigator handoff

**Outcome:** bounded Conversational Agent repair plus regression tests and an opt-in live-retest workflow. App version remains 117. P116 acceptance is NOT claimed; P117 remains unaccepted; P121 is not started.

## Changes
- `server/webSearch.ts`: broaden conservative RU/EN freshness detection for current/latest/stable/LTS versions; retain Serper-provided dates in digest entries.
- `server/intentFlags.ts`: short referral-only answers can trigger the existing information retry; explicit no-preamble/direct wording recognized.
- `server/conversationMode.ts`: removed the generic verification closer and made Cyrillic research matching Unicode-boundary-aware.
- `tests/p117-3-conversation.test.mjs`, `package.json`: freshness positives/negatives, date propagation, prompt, and mode regressions; included in `npm run test:web`.
- `.github/workflows/p117-3-live-retest.yml`, `scripts/p117-3-live-retest.mjs`: manual workflow logs into staging, sends the 15 scenarios including C1/C2 turns and B4 three times, and uploads a raw JSON transcript.
- `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-USER-VALUE-REPORT.md`, `CHANGELOG.md`: decision resolution, evidence/limitations and patch history.

## Navigator secrets needed for workflow
In GitHub repository **Settings → Secrets and variables → Actions → New repository secret**, create:
1. `STAGING_SERVICE_URL`: HTTPS base URL of the staging deployment (Render service URL; no trailing path).
2. `STAGING_APP_PASSWORD`: the same application login password used on the staging login screen, not a database password, API key, or personal GitHub password.

Do not send either secret in chat. Enter them directly in GitHub. Then run **Actions → P117.3 live retest → Run workflow**. The workflow is manual-dispatch only and reads these secrets at runtime.

## Verification
- Regression test execution: BLOCKED (the extracted workspace has no `tsx`; `npm ci --ignore-scripts` timed out).
- Hosted CI: NOT_RUN; staging workflow: NOT_RUN; production behavior: UNKNOWN.
- Diagnostics archive review: overall PASS, no diagnostic DB write failures, but manifest byte-count mismatch for `logs/server-console.log` and contradictory database-source/skipped wording. Build report shows `invalid_spec`, zero files, 73,059 ms. No diagnostics runtime change in this patch.
- Search credits: no new Serper query/time-range parameter; existing volume unchanged. Serper dates are surfaced but strict requested-window filtering remains unresolved.
- No deployment, credentials, GitHub writes or acceptance performed.

## Next action
Run CI on the patch, then dispatch the staging workflow and inspect its transcript against the fixed rubric. Navigator makes the final P116 Да/Нет. P117 acceptance remains separate.

Rollback: restore changed runtime/test/workflow files and the updated canonical task/report/changelog/handoff from the pre-patch backup.

Charter conflicts: none


## Operational context addition

- Current Render URL is `https://biforge.onrender.com/`; owner says it is the only personal test environment, with no separate staging service.
- Owner applies assistant ZIP patches manually to GitHub. Do not assume direct repository/Render access.
- Keep app authentication enabled. With `ENABLE_PROJECT_MODE=true`, source requires a non-empty `APP_PASSWORD` and auth enabled. Configure Actions secrets instead of disabling auth.
- See `docs/AI-ENVIRONMENT-CONTEXT.md` for the canonical persistent details and credential-handling rules.
