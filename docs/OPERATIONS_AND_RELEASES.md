# Operations and Releases

## Quick orientation

- **Primary deploy: Render** (live URL historically `https://biforge.onrender.com/`) — reconfirm before ops work. `railway.toml` / `nixpacks.toml` are secondary/legacy, not the production contract.
- Non-secret Render settings: table in **Render environment contract** below; secrets never in docs or logs.
- Artifact download = SUCCESS only after validators + verified archive; PARTIAL/FAILED must be honest.
- Production deploy, DB mutation, destructive restore require explicit owner authorization.

## Environment and deployment

### Primary deployment host

- **Primary production / live shared environment: [Render](https://render.com)** — historically `https://biforge.onrender.com/`. Reconfirm the live URL and health before operational work.
- Non-secret Render settings are the table in **Render environment contract** below; secrets stay in the host secret manager only.
- The owner manually applies patch ZIPs to the repository unless a later authorized workflow establishes another process. Do not assume direct GitHub or Render dashboard access for the assistant.

### Secondary / legacy deploy files (not primary)

- Root `railway.toml` and `nixpacks.toml` are **not** the primary production contract. They may remain for alternate hosts or historical packaging; do not treat them as superseding Render ops or the Render env table.
- PostgreSQL is whatever `DATABASE_URL` the deployment provides (often attached on the same host). Connector inventory text must not hard-require a specific cloud vendor name for the database.

Keep authentication enabled. Use GitHub Actions secrets or the host's secret manager for credentials; never copy secret values into files or logs. A public service remains public even when used by one person. Do not assume a separate staging service exists unless the owner documents one.

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

## GitHub Actions platform-log collection

The `ImmoFinder diagnostics poll` workflow collects the previous three hours of Render service logs and up to eight recent completed GitHub Actions run logs. The `platform-logs-<run-id>` artifact is retained for 30 days; raw platform logs are not committed to the repository. The workflow also runs once on `main` when its own workflow file or the collector script changes, ensuring an immediate artifact after those operational updates; diagnostic archive commits do not trigger a loop.

Configure in **GitHub → Settings → Secrets and variables → Actions**:

| Name | Kind | Purpose |
|---|---|---|
| `RENDER_API_KEY` | Secret | Read-only Render API key with Logs access |
| `RENDER_OWNER_ID` | Variable | Render workspace ID |
| `RENDER_SERVICE_ID` | Variable | Render Web Service resource ID |
| `RENDER_POSTGRES_ID` | Variable, optional | Render Postgres resource ID, if applicable |

`NEON_POSTGRES_ID` is not a Render resource ID and is intentionally not sent to Render. Neon-hosted database logs require a separate Neon integration. HTTP request logs are available only when supported by the Render workspace plan. Treat artifacts as operationally sensitive even after automated redaction.

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

## G6 — Connector push integrity (2026-11-26)

**MUST** treat any GitHub connector write of a repository file as fail-closed:

1. After every `push_files` / `create_or_update_file`, **verify** remote size and a content fingerprint match the intended local content.
2. **MUST NOT** commit placeholder, truncated, or stub bodies.
3. Files larger than ~15 KB: prefer extracting changed logic into a **new small module** and a minimal import edit, rather than rewriting the whole large file in one connector call.
4. If verification fails, **restore** the last known-good blob (by SHA) before any further feature work.
5. Avoid literal HTML entity tokens in source pushed via connector — they can be decoded in transit; use string concatenation (`'&' + 'amp;'`) when needed.

`server/immofinder/liveFilters.ts` holds locality pre-filter and HTTP 410 demotion helpers so `live.ts` edits stay small and push-safe.
