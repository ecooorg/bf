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
