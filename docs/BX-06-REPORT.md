# BX-06 — implementation report (work in progress)

## Implemented in this delivery

- Project Mode is opt-in through `ENABLE_PROJECT_MODE=true`; existing Simple Mode remains the default at `/`.
- Project Mode refuses startup without `APP_PASSWORD`, enabled app authentication, `SESSION_SECRET`, and `DATABASE_URL`.
- Added isolated `/project` UI with sign-in, project list/create, State read/update, optimistic version display, logout, and an explicit disabled-state message when Project Mode is off. Project Mode navigation appears in Simple Mode only when the server feature flag is enabled; the Expert/Simple toggle is also available on the empty-state header.
- Added authenticated API endpoints: `GET/POST /api/projects`, `GET /api/projects/:projectId`, `GET /api/projects/:projectId/versions`, `PUT /api/projects/:projectId/state`.
- Project create/update request bodies use strict Zod contracts. Stale `expected_version` returns HTTP 409; malformed input returns HTTP 400.
- Project API writes are protected by SameSite session cookies and the existing Origin check; per-IP Project API and login throttles use PostgreSQL `rate_limits` and fail closed if the limiter is unavailable. Successful Project Mode sign-ins are written to `audit_events` before the session cookie is issued.
- `/ready` checks PostgreSQL and the applied BX-04 migration, not merely `SELECT 1`.
- Migration execution is serialized with a PostgreSQL advisory lock. When `DATABASE_URL` is configured, production startup applies migrations before serving; Project Mode validates its security configuration before migration.
- Production build now includes a compiled server in `dist-server/`, started by Node; Vite is dynamically imported only in development.
- Removed the `node:crypto` fallback from the browser SHA-256 module to avoid Vite externalization; Web Crypto is used and failure is explicit when unavailable.
- Fixed the known bad-JSON retry dead end when only one model is configured: the same model receives one repair attempt if no reserve model is available. With multiple available models, normal fallback order is retained.
- CI now provisions PostgreSQL, applies migrations, runs live repository/API contract tests, builds the client/server, and scans for leaked secrets.

## Tests added or updated

- `tests/contracts.test.mjs`: strict create/update Project Mode request contracts.
- `tests/bx06.test.mjs`: static contracts for Project Mode security, route separation, and readiness.
- `tests/bx06-runtime.test.mjs`: Project Mode startup must fail closed without a password.
- `tests/database-live.test.mjs`: PostgreSQL repository, history, optimistic concurrency, and persistent rate-limit test.
- `tests/bx06-api.test.mjs`: authenticated Project Mode API, successful-login audit, CSRF origin rejection, create/update, stale version conflict, and history test.
- `tests/ui-check.mjs`: mode toggle lookup no longer depends on a direct-child/title selector and emits diagnostic DOM data on failure.

## Checks actually executed in this environment

- `node scripts/check-docs.mjs` — PASS.
- `node scripts/check-version.mjs` — PASS.
- `node tests/version-check.test.mjs` — PASS.
- `node scripts/lint-copy.mjs` — PASS.
- `node tests/database-contract.test.mjs` — 3/3 PASS.
- `node tests/bx06.test.mjs` — 4/4 PASS.
- `node --check` across all `.mjs` files under `scripts/`, `tests/`, and `.github/` — PASS.
- `bash -n tests/run.sh` — PASS.

## Not verified here

`npm ci` and the full typecheck/build/virtual/Playwright/PostgreSQL tests could not run: the environment cannot download uncached packages from npm registry (`ENOTCACHED` in offline mode; online installation timed out). A partial install is not treated as a valid dependency installation. No live PostgreSQL instance, Railway dashboard, or browser installation is available in this execution environment. These are not reported as PASS; CI must execute them after the patch is applied.

## Status

**Implementation advanced; BX-06 not yet accepted.** Human-only Railway checks and the manual A-09 / UI checklist remain outside this environment.
