# Operational rollback (BX-25 / P24)

## Code rollback (preferred)

1. Identify the last **green** commit on `main` (CI check-and-build + ui-check).
2. Redeploy that build on Railway (previous successful deployment) **or** `git revert` the bad commit → push → wait for CI → auto-deploy.
3. Confirm `GET /health` returns `status: ok` and the expected `version`.
4. Confirm `GET /ready` is ready when Project Mode uses PostgreSQL.

Data is **not** rolled back. Schema changes follow expand → contract so version N of the code works with schema N−1.

## Data restore (disaster)

1. Create a disposable PostgreSQL instance.
2. Restore the Railway backup dump into it (or point a staging app at a restored clone).
3. Run `npm run ops:backup-check -- --live` with `DATABASE_URL` set.
4. Point a non-production app at the restored DB; smoke Simple Mode and `/ops`.
5. Only after verification, cut production over (owner decision).

## What the product never does

- Merge or force-push to rewrite shared history as part of rollback.
- Automatic destruction of production volumes.
- Logging of secret values during restore checks.
