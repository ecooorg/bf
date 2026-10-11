# P11 report (BX-15.a)

Tool/model: Claude (Anthropic chat environment). Base: `bf-p10.zip` (state after P10); kit: `bf-p11-kit.zip`.

## Commands and results
- `npm ci`: exit 0.
- `npm run test:p11`: 11/11 passed.
- `npm run typecheck`: no errors.
- Local PostgreSQL 16 (installed in the sandbox), `npm run db:migrate`: 001-005 applied.
- `node --import tsx --test tests/p11-live-acceptance.test.mjs`: 11/11 passed.
- `npm run test:database:live`: 20/20 passed (with `DATABASE_URL`). `npm run test:bx06:api`: exit 0.
- `npm run check` (without `DATABASE_URL`): exit 0, 134 node tests, 26 doc checks, STAGE 2 202/202. With `DATABASE_URL` set, `tests/infra.test.mjs` fails by design (it expects 503 without a database).
- `npm run build`: exit 0.
- Not run: GitHub CI on `main` (the final word is the owner's CI run), `test:ui`.

## Changed
New: `migrations/005_tasks_runs.sql`, `server/taskMachine.ts`, `server/taskService.ts`, `docs/P11-SPEC.md`, `docs/P11-REPORT.md`, `tests/p11-acceptance.test.mjs`, `tests/p11-live-acceptance.test.mjs`.
Changed: `package.json` (`test:p11`, in `check`; live file in `test:database:live`), `docs/CURRENT_STATE.md`, `docs/REPO_MAP.md`, `CHANGELOG.md`.

## Decisions beyond the SPEC
- `task_events` has an extra `bigserial seq` column: events are ordered by it, not by time or id.
- `changeTaskInput` with an unchanged fingerprint is a no-op (no version bump, no event).
- Enqueue replay checks the key before the version (as the live test requires); then a different fingerprint gives `IDEMPOTENCY_CONFLICT`.

## Not done
Per SPEC section 8: queue, worker, lease, recovery (P12); budgets and approvals (P13); wiring `runAnalysis`; routes and UI.
