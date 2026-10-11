# P17 report — Gate Engine and CI evidence (BX-20)

**Status: PARTIAL** (all automated checks passed; real GitHub App and a real signed event are REAL_ONLY / NOT_RUN). Base: `bf-main-p16.zip` (CI fix for `connectors.yaml` and `docs/CONNECTIONS.md` already in it). Tool/model: Anthropic Claude (Sonnet 5.5).

## Delivered
- `server/gateEngine.ts` (rules, no I/O), `server/gateService.ts` (evidence, waivers, webhook ingestion), `migrations/009_gate_evidence.sql`.
- `server.ts`: webhook processes `check_run` / `pull_request` of `biforge/<task_id>` branches; routes `GET /api/projects/:projectId/tasks/:taskId/gates` and `POST .../gates/:gate/waive`.
- `server/githubIntegration.ts`: P16 completion (PR, PR files, check runs, Task Package commit).
- Tests: `gate-engine`, `github-delivery`, `gate-live`, `gate-webhook-live`; `package.json` (`test:gate`, `test:github`, live list, `check`).
- Documents: `docs/P17-SPEC.md`, `docs/P16-SPEC.md` addendum, this report, `docs/P16-REPORT.md`, `docs/CURRENT_STATE.md` (rebuilt: the archive copy contained a script), `docs/NEXT.md`, `docs/REPO_MAP.md`, `docs/CONNECTIONS.md`, `CHANGELOG.md`.

## Checks (actually run; PostgreSQL 16 installed locally with apt, `DATABASE_URL` pointed at it, `PGSSLMODE=disable`)
| Command | Result |
| --- | --- |
| `npm ci` | PASS (exit 0) |
| `npm run db:migrate` (clean database, 001-009) | PASS |
| `npm run check` | PASS (exit 0, no failing test) |
| `npm run build` | PASS (exit 0) |
| `npm run test:gate` | PASS 7/7 |
| `npm run test:github` | PASS 8/8 |
| `npm run test:database:live` (incl. `gate-live`, `gate-webhook-live`) | PASS 57/57 |
| `npm run test:bx06:api` | PASS 1/1 |
| `npm run check:docs` | PASS (inside `check`) |

## Not run
- Real GitHub App: `verify:connections -- --only github` and a real signed event (REAL_ONLY, no credentials).
- `npm run test:ui` (Playwright, not part of `check`; no UI changed).
- `npm run patch:pack`: not used; the archive was assembled by hand from the files that differ from the uploaded archive.

## Defaults chosen
No P17 SPEC or acceptance tests were supplied; every decision is listed in `docs/P17-SPEC.md` (task link by branch name, check-name map, conclusion mapping, owner approval of a protected-test change as human WAIVED, gate routes without UI, Task state not tied to gates).

## Known issues
- Task PASS (`/validate`) is not yet tied to gate results; no approvals route for `requirements` / `spec` / `review`; no UI.
- The check-name map is code; a repository with other check names needs a change of `DEFAULT_CHECK_MAP`.

## Navigator checklist
1. Create and install the GitHub App (TZ E.5) and set the variables from `docs/CONNECTIONS.md` in Railway; redeploy (migration 009 runs on start).
2. Run `npm run verify:connections -- --only github`; expect `github/installation_token_and_repo: OK`.
3. Send a signed `check_run` for a `biforge/<task_id>` branch to `/api/webhooks/github`; expect HTTP 202 and the result in `GET /api/projects/<project>/tasks/<task>/gates`.
