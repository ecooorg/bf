# BX-03 → BX-04 implementation report

## Included in this delivery
- BX-03.a health-route extraction retained; `/ready` now checks PostgreSQL when `DATABASE_URL` is configured and returns 503 otherwise.
- BX-04 forward-only migration for `projects`, `project_states`, append-only `project_state_versions`, `project_events`, `audit_events`, `rate_limits`, and `schema_migrations`.
- Lazy PostgreSQL pool, Zod-validated project/state repository, optimistic `expected_version` check with transaction lock, and atomic event/audit/version writes.
- `npm run db:migrate` migration runner; database contract tests; ADR-01; owner UI checklist for BX-03.b.
- No API for Project Mode was exposed yet; repository functions are a storage foundation for BX-05/BX-07.

## Checks actually run
- `node --test tests/database-contract.test.mjs`: **3/3 passed**.
- `npm ci`, full `npm run check`, UI baseline, migration against a clean PostgreSQL instance, and Railway healthcheck: **not run**. Dependencies could not be downloaded because npm registry DNS/network access failed in this environment.

## Explicit blockers / incomplete acceptance
1. The `pg` dependency was added to `package.json` and the lockfile root dependency list, but npm could not resolve and write the full dependency graph. **Run `npm install pg@^8.16.3` in a network-enabled environment to regenerate `package-lock.json`, then run `npm ci`. Do not deploy this archive until that succeeds.**
2. No live PostgreSQL instance was available; migration and transactional repository behavior have not been integration-tested.
3. BX-03.b is not complete: UI baseline must run and owner must complete `docs/BX-03B-MANUAL-CHECKLIST.md` before `src/App.tsx` decomposition. Per BX-03 spec, this step is intentionally not falsely marked complete.
4. No live Railway variables/healthcheck were changed or verified.

## Safety notes
- No real Gemini calls or provider credentials were used by these tests.
- Existing assertions were not weakened.
