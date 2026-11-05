# Operations and Releases

## Quick orientation

- Live shared environment historically: `https://biforge.onrender.com/` — reconfirm before ops work.
- Non-secret Render settings: table in **Render environment contract** below; secrets never in docs or logs.
- Artifact download = SUCCESS only after validators + verified archive; PARTIAL/FAILED must be honest.
- Production deploy, DB mutation, destructive restore require explicit owner authorization.

## Environment and deployment

The repository's historical operational notes identify `https://biforge.onrender.com/` as the public Render service and describe it as the owner's live shared test environment. Reconfirm deployment facts before operational work; do not assume a separate staging service exists. The owner manually applies patch ZIPs to the repository unless a later authorized workflow establishes another process. Do not assume direct GitHub or Render access.

Keep authentication enabled. Use GitHub Actions secrets or the host's secret manager for credentials; never copy secret values into files or logs. A public service remains public even when used by one person.

## Render environment contract (non-secret)

This is the repository-side contract for non-secret Render settings. The running service exposes the effective, sanitized subset at `GET /health/runtime-config`; the Model Carousel / routing health workflows compare that live snapshot with diagnostic policy. Never put secret values in documentation, workflow inputs, or diagnostic artifacts.

A future patch that changes a supported variable or its semantics must update this contract, `.env.example` where applicable, the runtime-config endpoint, and the Render probe in the same change.

| Variable | Canonical Production value |
|---|---|
| `APP_BUILDER_ENGINE` | `staged` |
| `APP_BUILDER_MODEL_SLICE` | `true` |
| `BIFORGE_GEMINI_DIRECT_MODE` | `true` |
| `CODE_APP_BUILDER_MAX_FILES` | `80` |
| `CODE_APP_BUILDER_MAX_LINES` | `8000` |
| `CODE_EXECUTOR` | `model_patch` |
| `DAILY_CALL_CAP` | `1000` |
| `ENABLE_APP_AUTH` | `true` |
| `ENABLE_EXTERNAL_MODEL_FALLBACK` | `true` |
| `ENABLE_PROJECT_MODE` | `true` |
| `ENABLE_WEB_SEARCH` | `true` |
| `GITHUB_APP_ID` | `5276629` |
| `GITHUB_APP_INSTALLATION_ID` | `170347326` |
| `GITHUB_DIFF_UPLOAD` | `true` |
| `GITHUB_REPOSITORY_NAME` | `bf` |
| `GITHUB_REPOSITORY_OWNER` | `ecooorg` |
| `GROQ_PLAN` | `free` |
| `JINA_READER_BASE_URL` | `https://r.jina.ai` |
| `LLM_CALL_TIMEOUT_MS` | `12000` |
| `LLM_TOTAL_DEADLINE_MS` | `30000` |
| `MAX_BODY_BYTES` | `262144` |
| `MAX_MODEL_CALLS` | `3` |
| `MODEL_CASCADE_LIGHT` | `gemini-3.5-flash-lite,gemini-3.1-flash-lite` |
| `MODEL_CASCADE_STRONG` | `gemini-3.5-flash-lite,gemini-3.1-flash-lite` |
| `NODE_ENV` | `production` |
| `PGSSLMODE` | `require` |
| `PROJECT_RATE_LIMIT_PER_MINUTE` | `300` |
| `RATE_LIMIT_PER_HOUR` | `200` |
| `SEARCH_CAROUSEL` | `connector,serper,gemini` |
| `SERVICE_URL` | `https://biforge.onrender.com` |
| `TRUST_PROXY_HOPS` | `1` |
| `WEATHER_CONNECTOR_ENABLED` | `true` |
| `WEB_SEARCH_DEFAULT_COUNTRY` | `CH` |
| `WEB_SEARCH_FETCH_PAGES` | `true` |
| `WEB_SEARCH_MAX_PAGES` | `2` |
| `WEB_SEARCH_MAX_QUERIES` | `2` |
| `WEB_SEARCH_PLANNER` | `true` |
| `WEB_SEARCH_TIMEOUT_MS` | `15000` |
| `WORKER_POLL_MS` | `5000` |

## Release evidence

A release record must bind the exact commit/build to: version/patch, hosted CI conclusion, deployed `/health` identity where available, live workflow result, artifact/download checks, and unresolved items. Separate source presence, local tests, hosted CI, deployed behavior, and user outcomes. `NOT_RUN` is not PASS.

## Artifact delivery policy

- Do not offer a download as complete SUCCESS until required generation stages and validators have passed and the archive has been created and verified.
- For PARTIAL or FAILED outcomes, state what is incomplete and why. Do not imply the result is complete. Download availability for PARTIAL must follow an explicit, tested policy; never make it accidental or provider-dependent.
- Verify artifact ownership, operation/build identity, ZIP integrity, expected files, and relevant validators. Missing/corrupt archives must produce a truthful error, not a success-shaped response.
- Refusal controls and negative cases (unconfirmed prerequisites, missing artifact, unauthorized access) are part of release evidence.

## Operational safety

Production deployment, database mutation, destructive restore/rollback, and other live changes require explicit owner authorization. Treat the public service as shared/live, not disposable. Before rollback, distinguish application rollback from database schema/data rollback.

## Backup and restore

Operational scripts are the executable source for the checks they perform. Historical targets in earlier operations material were RPO ≤ 24 hours and RTO ≤ 4 hours; these are targets, not verified guarantees. A restore drill is NOT_RUN until performed against a disposable/approved environment and the result recorded.

## Procedures

Use the existing package scripts and `.github/workflows/` definitions as the current executable procedures. Inspect the current scripts before following historical command text. Keep evidence and logs downloadable where possible, with secrets redacted.
