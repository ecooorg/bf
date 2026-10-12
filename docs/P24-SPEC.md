# P24 — Operations: backup, restore drill, /ops, ADR-09 (BX-25)

**Goal.** Make operational evidence available: authenticated `/ops` metrics, backup/restore check script, documented rollback, ADR-09 (RPO/RTO). PASS when restore check and ops tests are green offline; owner runs restore against a disposable DB when convenient.

**Base.** Owner archive `bf-v23-2.zip` (CI green, product version 23).

**May change.** `server/opsMetrics.ts`, `/ops` + `/api/ops` routes, `scripts/backup-restore-check.mjs`, ADR-09, OPS_ROLLBACK, tests, version → 24, docs (CURRENT_STATE, NEXT, REPO_MAP, CHANGELOGs).

**Must not change.** Simple Mode behaviour; Router; security tests of P23; `tests/acceptance/**`.

## Behaviour

1. **GET /api/ops** (session when auth enabled): JSON metrics — queue depth, abandoned jobs, recent run durations, disabled providers, schema migration count, process memory, alerts.
2. **GET /ops**: minimal HTML table of the same metrics (auth required when auth enabled).
3. **npm run ops:backup-check**: verifies migration files and optional live `schema_migrations` row count; documents restore steps (no secrets).
4. **ADR-09**: RPO ≤ 24h, RTO ≤ 4h targets; Railway daily backups as primary; worker split if RAM >70% sustained.
5. **OPS_ROLLBACK.md**: code rollback = redeploy previous successful build; schema expand→contract; data not rolled back.

## PASS

- Machine: `test:p24`, `check-version`, `check:docs`, existing security/p23 still pass.
- Owner: open `/ops` signed in; optional restore of a dump onto a clean DB once.

## Not done

- Automated Railway backup API calls; separate worker service; full load test of parallel Runs (capacity note only in ADR-09).
