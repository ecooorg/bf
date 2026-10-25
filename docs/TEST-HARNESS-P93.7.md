# P93.7 — bounded AI test harness and internal diagnostics

## Run

- `npm run test:ai` — deterministic local checks, no network calls to providers, hard 570-second budget.
- `BIFORGE_RUN_BROWSER_TESTS=true npm run test:ai` — also attempts the existing Playwright UI smoke test if the budget and dependencies permit.
- Optional `BIFORGE_TEST_BUDGET_MS` may lower the budget; values are clamped to 30–570 seconds.
- Optional `BIFORGE_TEST_LOG_DIR` and `BIFORGE_TEST_REPORT` choose output locations. Default output is a temporary directory outside the repository.

The runner does not install dependencies, access production databases, call Gemini/Groq, or change production data. It writes one log file per command and a JSON report. Outcomes are `PASS`, `FAIL`, `TIMEOUT`, `BLOCKED`, and `NOT RUN`. Missing `node_modules` causes dependency-based checks to be `BLOCKED`, while static checks still run. A `BLOCKED` or `NOT RUN` result is never equivalent to `PASS`.

## Included verification

- Version/changelog consistency, documentation, copy lint, architecture boundaries.
- Vite frontend build and server TypeScript compilation.
- App Builder contracts, engine, validators, recovery and adapter tests.
- Project diagnostics, archive integrity, goal checks, and P93.7 logging tests.
- Security, core and project-mode tests.
- Model cascade and rate-limit unit tests.
- Optional existing Playwright UI smoke test; the runner never downloads browser binaries.

The harness is a bounded high-value smoke suite, not a claim that the complete repository suite or production integrations were tested.

## Internal logs and privacy

- HTTP requests carry a correlation ID in `X-Request-Id`; logs record method, path without query string, status, duration and response size, never request/response bodies.
- App Builder logs model-call start/success/failure, model IDs, latency, usage counts, router status, rejection classes and job/operation IDs. Prompts and generated source are not logged.
- Diagnostic ZIP contains `logs/application-detail.jsonl` (persistent DB records merged with bounded process memory) and `logs/server-console.log` (bounded redacted console capture), with manifest hashes.
- Migration `019_application_diagnostic_logs.sql` stores structured records for up to seven days. The table prunes old records periodically on insert. If DB writes fail, logging uses a bounded in-memory ring and reports the persistence limitation.
- Exported log details omit keys associated with prompts, source code, request/response bodies, credentials, tokens, cookies and authorization. Do not add user content or secrets to diagnostic fields.

## Limits

No local harness can prove live Gemini quota, Render deployment, GitHub CI, OAuth with a real identity provider, external webhook delivery, or physical-device behavior. These must remain `NOT RUN` until an authorized integration environment executes them.
