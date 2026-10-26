# BiForge Operations

This document contains current operational procedures and limitations.

## 1. Configuration

* Use `.env.example` as the reference for supported environment variables.
* Never commit `.env` files or deployment credentials.
* Before enabling Project Mode, configure non-empty `APP_PASSWORD`, `SESSION_SECRET` and `DATABASE_URL`.
* Ensure `ENABLE_APP_AUTH` is not set to `false` when Project Mode is enabled.
* Configure `PGSSLMODE` according to the target environment.

## 2. Build and verification

Run the repository checks before accepting a change:

* `npm ci`
* `npm run build`
* `npm run check`

Report checks as passed, failed, blocked or not run. Do not report an unexecuted check as passed.

## 3. Deployment and authorization

* Production deployment is owner-controlled.
* Review the change and ensure that secrets are not included.
* Verify database migrations, API security, build results and secret scanning in CI.
* Record the commit, environment, timestamp, commands, results and reviewer.
* Do not perform production deployment or waive security controls without explicit owner authorization.

## 4. Rollback

Application rollback means redeploying the previous known-good build or commit.

Database rollback is a separate operation. Preserve compatibility between application versions and database migrations. Do not reverse production migrations casually.

If readiness fails after deployment, capture sanitized diagnostics, stop further changes and follow the owner-approved rollback procedure.

## 5. Backup and restore

The ADR-09 targets are:

* Backup frequency: daily.
* Retention: 7 days.
* Recovery Point Objective (RPO): no more than 24 hours.
* Recovery Time Objective (RTO): no more than 4 hours.

These are targets, not proof of the current provider configuration or actual recovery performance.

`npm run ops:backup-check` checks migration inventory. It does not perform a full database restore and does not prove recoverability.

A restore drill must be performed on a disposable database:

1. Restore a backup.
2. Run migrations if necessary.
3. Verify the expected `schema_migrations` inventory.
4. Verify `/ready`.
5. Sign in and perform a Simple-mode smoke test.
6. Record the result without exposing secrets.

Do not claim a restore or rollback drill passed unless it was actually performed and evidence was collected.

## 6. Staging evidence

Staging probes must target a dedicated HTTPS staging service.

The existing staging evidence collector performs read-only probes. It does not perform a database restore, deployment rollback or full capacity acceptance test.

Report these activities as NOT_RUN until separately performed and evidenced.

## 7. Health endpoints

* `GET /health` reports liveness and version information.
* `GET /ready` reports readiness and database availability.
* Operational endpoints must remain protected by the application's authentication and authorization rules.

Do not expose operational diagnostics without verifying access controls and data minimization.

## 8. Bounded test harness (`npm run test:ai`)

* Deterministic local checks, no provider calls, hard budget 570 s (`BIFORGE_TEST_BUDGET_MS` may lower it, clamped to 30–570 s). `BIFORGE_RUN_BROWSER_TESTS=true` adds the Playwright smoke test. `BIFORGE_TEST_LOG_DIR` / `BIFORGE_TEST_REPORT` set output locations (default: temporary directory outside the repository).
* It installs nothing and touches no production data. One log per command plus a JSON report. Outcomes: `PASS`, `FAIL`, `TIMEOUT`, `BLOCKED`, `NOT RUN`. Missing `node_modules` makes dependency-based steps `BLOCKED`; static steps still run. `BLOCKED`/`NOT RUN` never equals `PASS`.
* It cannot prove live Gemini quota, Render deployment, GitHub CI, real OAuth, webhooks or device behaviour. Those stay `NOT RUN` until an authorised environment executes them.

## 9. Project Mode diagnostics

* More-menu actions: system diagnostics, recent operations, diagnostic log download. They use the authenticated, rate-limited Project Mode API; no third-party telemetry. Apply migration `015_project_diagnostics.sql` (and `019_application_diagnostic_logs.sql` for detailed logs) with `npm run db:migrate` before relying on them.
* Events hold only operation ID, stage/status, timestamps, error codes, durations, file and byte counts. Never log prompts, generated source, request/response bodies, cookies, tokens or credentials. HTTP requests carry `X-Request-Id`; paths are logged without query strings.
* PostgreSQL keeps event rows for seven days (opportunistic pruning). If the database is unreachable a bounded in-memory ring (1,000 events) is used and does not survive restart. Lists and exports return at most 200 events.
* The diagnostic ZIP (`README.txt`, `manifest.json`, `operations/recent-operations.json`, `diagnostics/diagnostic-summary.json`, `logs/application.jsonl`, `logs/application-detail.jsonl`, `logs/server-console.log`) is verified (CRC read-back, manifest hashes) before it is sent; failure returns HTTP 422. It is a snapshot, not a continuous log archive. CI logs live in the CI workflow artifact, not in this ZIP.
* An HTTP 2xx and a server-side finish event do not prove the browser saved the ZIP. Google Drive synchronisation of diagnostics is not implemented in code.
* **Open verification (P92):** production diagnostics were reported with `WARN`, artifact storage `NOT RUN`, no recent operations and no Drive files observed. Migrations, event persistence and artifact correlation in production remain unverified.

## 10. CI evidence and handoff

* One runner, `scripts/run-dag.mjs`, executes the verification manifest (`docs/verification-manifest.json`). It writes `results.json`, one log per check (`<id>.log`, `:` becomes `_`) and an Evidence Record `evidence-dag.json` (schema `docs/schema-evidence-record.json`), listed in `results.json` under `evidence.records`. Records carry revision, command, environment, timestamp, status, log reference and limits; critical rows are the probes and minimum suites flagged `critical` in the manifest. BLOCKED and SKIPPED_BY_POLICY rows carry the reason in `note` and have no log.
* Runner environment: `CI_LOGS_DIR` (output directory), `DAG_CONCURRENCY` (default 1), `DAG_ALLOW_UNSAFE=true` (permits `safeToRun=false` checks; CI sets it because its PostgreSQL is a throw-away service container), `DAG_TEST_DATABASE_URL` (declared by the database checks), `DAG_TIMEOUT_SCALE` (can only raise limits). Children never inherit `DATABASE_URL` or `PGSSLMODE`.
* `scripts/patch-quality-report.mjs` writes `NEXT_PATCH.md` (the only handoff the Navigator-side assistant needs) with `EVIDENCE=`, `EVIDENCE_PROBLEMS=` and `HANDOFF_JSON=` (schema `docs/schema-handoff-report.json`). If a run would be `PASSED` but evidence is missing, malformed, contradictory, lacks a log for a critical PASS, or any row is BLOCKED, SKIPPED_BY_POLICY, NOT_RUN, UNKNOWN or PARTIAL, the status is `UNVERIFIED`. Treat `UNVERIFIED` like `UNKNOWN`: not a pass.
* If the generator produces nothing, `scripts/ci-summary.mjs` writes a minimal `NEXT_PATCH.md` and a fallback `handoff-report.json`. On failure or `UNVERIFIED`, `diagnostics.zip` includes the records and the handoff JSON.
* `scripts/ci-evidence-gate.mjs` runs as a CI step after the report is generated and fails the job when the handoff is missing, `UNVERIFIED`, lacks a valid `HANDOFF_JSON`, or an evidence record violates its schema.
