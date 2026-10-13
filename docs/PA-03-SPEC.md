# PA-03 — Staging drills and evidence automation

**Status:** implementation prepared; live staging run is `NOT_RUN` until the Navigator configures a dedicated staging app and disposable staging database.

## Goal

Turn safe operational checks into a single manually dispatched GitHub Actions run that produces a downloadable evidence artifact and a run URL. This is process tooling, not product functionality. It targets RM-B4 (scenario 18.1 checklist), RM-E2 (`/ops`), RM-E4 (database readiness/migration inventory), RM-E5 (rollback evidence), and RM-E6 (bounded load/capacity observation).

## Safety boundary

- Only `STAGING_SERVICE_URL`, `STAGING_APP_PASSWORD`, and `STAGING_DATABASE_URL` may be supplied. The workflow refuses a URL that does not explicitly identify a staging host by `staging` in its hostname; do not point these values at production.
- Use a dedicated staging service and a disposable database with synthetic data only.
- The workflow is `workflow_dispatch` only; no schedule, no automatic deployment, no commit/push, no merge, no Railway API, no database writes, no destructive restore, and no rollback command.
- Load probe is bounded to 20 concurrent GET requests to `/health`; it does not call model endpoints.
- `/ops` is checked with an authenticated session when `STAGING_APP_PASSWORD` is present. Without it, authenticated checks are `NOT_RUN`.
- A successful `/ready` or migration-count check is **not** proof of a backup restore. Restore and code rollback remain `NOT_RUN` until an operator performs the documented disposable restore / rollback and records evidence.
- Scenario 18.1 remains a 12-row checklist. Steps that need authenticated project creation, model calls, owner judgment, or real evidence are explicitly `NOT_RUN`; no synthetic success is claimed.

## Automated checks

1. `/health` returns HTTP 200 and `status: ok`.
2. `/ready` returns HTTP 200 and `status: ready`.
3. Authenticated `/ops` and `/api/ops` respond; the JSON is checked for the expected operational fields, not secret values.
4. Bounded `/health` GET probe records request count, non-200 count, and duration.
5. If `STAGING_DATABASE_URL` is configured, run `npm run ops:backup-check -- --live --json` against that database. This checks migration inventory only; it does not restore a backup.
6. Emit the 12 scenario-18.1 rows, plus explicit `NOT_RUN` records for restore and rollback until manual evidence is supplied.

## Defaults chosen (Tier 1)

- Artifact: `pa03-evidence.json`; Markdown summary in the Actions job summary.
- Synthetic load: 20 concurrent requests, no retries, GET-only.
- A missing staging secret yields `NOT_RUN`, not an invented PASS. A live endpoint returning an error is `FAIL`.
- Do not automatically commit evidence back to this repository; the Navigator can attach the run URL through a normal patch.

## Owner setup

1. Create a separate Railway staging service and separate disposable PostgreSQL database populated only with synthetic data.
2. Add GitHub Actions secrets `STAGING_SERVICE_URL`, `STAGING_APP_PASSWORD`, and `STAGING_DATABASE_URL` for this repository. Never reuse production credentials or production database URLs.
3. Run Actions → `staging-drills` → Run workflow.
4. Download artifact `pa03-evidence` and copy the Actions run URL into `docs/NEXT.md` / the relevant report only after reviewing the results.
5. For restore and rollback, follow `docs/OPS_ROLLBACK.md` manually against staging, then record date, commit SHA, CI/run link, elapsed time and outcome.

## PASS criteria

- Machine: `npm run test:pa03`, `npm run check:docs`, and full CI green.
- Live staging: the workflow run link exists; health/readiness and authenticated ops checks are recorded; bounded probe metrics are recorded.
- Restore, rollback, scenario 18.1, and capacity acceptance remain `NOT_RUN` or `PARTIAL` until their complete evidence exists. PA-03 does not close any gate by itself.

## `CHANGELOG.md`

"PA-03: manual staging-drills workflow; bounded health/ops/load evidence, with restore/rollback and scenario 18.1 honestly marked NOT_RUN until proven."
