# P16 — GitHub integration foundation (BX-19)

**Goal.** Add a least-privilege GitHub App connection check and authenticated webhook ingress without enabling Code Delivery or granting merge/admin/workflow/secrets permissions.

**Base.** `bf-main-p15.zip`, uploaded 2026-10-11.

**May change.** GitHub integration helper, connection manifest/checker, webhook route, focused tests and supporting docs.

**Must not change.** Simple Mode behavior, existing public APIs, existing migrations/data, protected `tests/acceptance/**`, CI workflows, or executor selection. `model_patch` stays disabled unless separately configured by the owner.

**Defaults chosen.** Since no P16 SPEC or acceptance tests were supplied, GitHub credentials are named per Appendix E.5; the repository for the connection check is selected with `GITHUB_REPOSITORY_OWNER` and `GITHUB_REPOSITORY_NAME`. Webhook events are signature-checked and acknowledged but not acted upon, because processing pull requests/check runs belongs to later Gate Engine work. `GITHUB_API_BASE_URL` is test-only. No migration is needed: this patch does not persist webhook events or credentials.

**PASS criteria.**
- GitHub App JWT uses RS256 and expiry under 10 minutes.
- Installation token flow checks granted permissions against Appendix E.6, then verifies repository access.
- Invalid webhook signatures return 401; valid `pull_request` and `check_run` events are acknowledged without trusting payload instructions.
- `npm run test:github`, `npm run check`, `npm run build`, and live PostgreSQL tests are attempted and accurately reported.
- Owner configures the GitHub App and verifies the GitHub connection; valid signed events receive 202.

**Read in the TZ.** 11.2, 11.7, 11.8, 13.3, Appendix E.5, 20.2 (ADR-06), 16.3–16.4.4.

**Tests.** `tests/github-integration.test.mjs`: JWT signature/claims, permission bounds, webhook HMAC, fake GitHub API flow. No real credentials are used.

**Changelog.** Add P16 GitHub App verification and signed webhook ingress.

**Not done / postponed.** No GitHub connection was tested against a real App; no branch creation, Task Package commit, PR creation, CI evidence ingestion, migration, or executor activation. ADR-06 remains pending owner decision on repository visibility/organization/Actions limits.

## Addendum (cumulative P16 completion, BX-19)

**Added.** `readPullRequest`, `listCheckRuns`, `listPullRequestFiles`, `commitTaskPackage` in `server/githubIntegration.ts`. Tests: `tests/github-delivery.test.mjs`.

**Defaults chosen (addendum).**
- Writes are refused unless the caller passes `writeEnabled: true` (model_patch or diff upload, TZ 11.7); the token is then checked against the write manifest. Without it only read permissions are accepted.
- Task Package paths are limited to `AGENTS.md`, `.biforge/tasks/<task_id>/{SPEC,ACCEPTANCE,EXECUTOR_PROMPT}.md` and `tests/acceptance/**` (TZ 11.3); at most 50 files of 1 MB. The branch is always `biforge/<task_id>`; `main`, workflows and any other path are refused. The module has no merge operation.
- The commit helper is a library function only: no route or UI calls it yet (`CODE_EXECUTOR` stays unchanged); the Task Package is built in a later patch (P20).
- `permissions_too_broad_or_missing` is the reason string kept from the first P16 patch.
- Webhook events are now processed by P17 (`docs/P17-SPEC.md`); the response is still 202.
