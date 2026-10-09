# Development and QA workflow

## Standard commands

- `npm ci` — install exactly the lockfile dependencies.
- `npm run check` — run the independent static, unit, and virtual-server checks.
- `npm run build` — build the production client.
- `npm run test:ui` — run browser/UI checks (requires Playwright browser installation).

`npm run check` uses `scripts/qa.mjs`. It runs each check independently, records each exit code, and continues after failures so a single early error does not hide unrelated failures. Reports are written to `artifacts/qa/`:

- `summary.md` — human-readable status table;
- `results.json` — machine-readable result data;
- `*.stdout.log` and `*.stderr.log` — output for each individual check.

The QA runner uses these semantics:

- `PASS` — command executed and returned exit code 0;
- `FAIL` — command executed and returned a non-zero exit code;
- `BLOCKED` — command could not meaningfully run (for example, dependencies are not installed or a timeout occurred);
- `NOT_RUN` — reserved for checks intentionally skipped by a future runner version.

A `BLOCKED` check is never treated as a pass. The overall command exits non-zero when any check fails or is blocked.

## CI behavior

GitHub Actions runs the QA suite and production build independently when dependencies install successfully, uploads QA logs even when checks fail, and fails the job if QA or build fails. UI tests run in their own workflow and should be considered separately from the server/unit QA report.

## Rules for test changes

1. Do not change an expected value solely to match the observed value. First establish the product contract and whether the test or implementation is wrong.
2. For AI flows, distinguish attempted provider calls, successful provider responses, retries, and fallback outcomes.
3. Keep tests deterministic: fake-provider response sequences should explicitly define the response for each attempt and should not leak state between scenarios.
4. Preserve raw stdout/stderr for failed tests. Error messages must identify the scenario and relevant trace.
5. A real external-provider test is `REAL_ONLY` unless credentials and an explicit smoke test are available; fake-provider tests do not certify real provider connectivity.

## Architecture simplification policy

Refactor in vertical slices, not as a mass rename. Before moving or deleting historical files, search for references in scripts, tests, CI, and docs. Preserve API and storage contracts with tests first. Start by separating AI orchestration/retry/validation/fallback from HTTP routing; then split UI features by user workflow. Each slice must pass the QA baseline before the next one begins.
