# Render environment contract

This document is the repository-side contract for non-secret Render settings. The running service exposes the effective, sanitized subset at `GET /health/runtime-config`; the **Model Carousel — Routing, Health and Live Smoke** workflow compares that live snapshot with the source's diagnostic policy. Never put secret values in documentation, workflow inputs, or diagnostic artifacts.

## Canonical latency settings

Set these values in Render → Environment:

| Variable | Canonical value | Runtime rule | Reason |
|---|---:|---|---|
| `LLM_CALL_TIMEOUT_MS` | `12000` | Hard maximum 12000 ms | Stops one slow model call from occupying 20–25 seconds. |
| `LLM_TOTAL_DEADLINE_MS` | `30000` | Hard maximum 30000 ms | Bounds search/planner preparation plus model generation/fallback across one conversational request. |
| `MAX_MODEL_CALLS` | `3` | Hard maximum 3 | Prevents long chains of repeated model calls. |

The application clamps larger values at runtime and logs both configured and effective settings. Operators may set stricter values, but cannot raise these hard ceilings through Render. The Gemini candidate cascade makes one pass per request; it does not repeat a complete pass after transient failures.

## Search settings

| Variable | Canonical value / guidance | Notes |
|---|---|---|
| `SEARCH_CAROUSEL` | `connector,serper,gemini` | Only these providers are implemented in `server/searchCarousel.ts`. |
| `WEB_SEARCH_TIMEOUT_MS` | `15000` | Search-only budget; not added to ordinary no-search turns. |
| `WEB_SEARCH_MAX_QUERIES` | `2` for a latency-sensitive deployment; otherwise `5` | Higher values can increase Serper work and search duration. |
| `WEB_SEARCH_MAX_PAGES` | `2` | Current Serper implementation hard-caps this to 2 fetched pages per query; `4` does not increase the cap. Page fetching still adds external requests. |
| `WEB_SEARCH_FETCH_PAGES` | `true` when deeper source reading is needed; `false` for a controlled latency comparison | Turning it off may reduce evidence depth. |
| `WEB_SEARCH_PLANNER` | `true` for normal operation; set `false` only for A/B diagnosis | The planner now runs only for likely-current-info questions and explicit search follow-ups; ordinary conversation turns bypass it. |
| `WEB_SEARCH_DEFAULT_COUNTRY` | Deployment's ISO alpha-2 country, currently `CH` | Used only when the user has not named a place. |

`jina` is not a `SEARCH_CAROUSEL` provider. Jina Reader is a page-fetch/extraction service configured separately through `JINA_READER_BASE_URL` and optional `JINA_API_KEY`. `serp2` is a reserved slot without an adapter in this source snapshot; do not include it in the production chain until the provider adapter is implemented. A value such as `connector,serper,gemini,jina,serp2` therefore contains an unknown `jina` entry and a currently unimplemented `serp2` entry.

## Other supplied settings

- `BIFORGE_GEMINI_DIRECT_MODE=false`: correct for the current pipeline-first implementation; keep it false.
- `ENABLE_EXTERNAL_MODEL_FALLBACK=true`: permits Groq/Cloudflare fallback, but can send eligible prompt content to another provider. Keep enabled only with the applicable privacy/consent decision. The bounded model-call budget applies to the main conversation path.
- `MODEL_CASCADE_LIGHT` / `MODEL_CASCADE_STRONG`: both currently contain Flash-Lite models. This is a cost/availability choice, not a true strong-model cascade. It may affect answer quality, not explain a 20-second single call by itself.
- `GROQ_PLAN=free`: descriptive deployment metadata only in this source snapshot; it does not configure Groq service limits. Actual plan/rate limits must be checked in the Groq account.
- `MODEL_MIN_INTERVAL_MS` (unset in the supplied configuration): the current code defaults to 4700 ms between Flash-Lite starts and 6100 ms for other Flash models, coordinated through the database with a process-local fallback. This is a quota-protection gate and can queue concurrent requests; do not set it to `0` in production without checking the separate Google-project quotas. The workflow reports the effective intervals.
- `WORKER_POLL_MS=5000`: affects background worker pickup latency, not synchronous Conversational generation. It can add up to roughly one polling interval to queued Project Mode work. Reduce only if faster worker pickup is required and the additional polling load is acceptable.
- `APP_BUILDER_ENGINE`, `APP_BUILDER_MODEL_SLICE`, `CODE_APP_BUILDER_MAX_FILES`, `CODE_APP_BUILDER_MAX_LINES`, `CODE_EXECUTOR`: affect Architect/App Builder workflows, not ordinary Conversational turns.
- `DAILY_CALL_CAP`, `RATE_LIMIT_PER_HOUR`, `PROJECT_RATE_LIMIT_PER_MINUTE`: quotas/rate gates, not per-call latency settings.
- `GITHUB_*`, `DATABASE_URL`, `PGSSLMODE`, `APP_PASSWORD`, `SESSION_SECRET`, `VITE_GOOGLE_CLIENT_ID`, `MAX_BODY_BYTES`, `TRUST_PROXY_HOPS`, `NODE_ENV`, `SERVICE_URL`: operational, security, build, or request-size settings; they do not directly explain slow model generation when correctly configured.

## Workflow and operational response

Run **Actions → Model Carousel — Routing, Health and Live Smoke**. The deterministic job checks the runtime latency policy. The optional live job measures each configured light model twice using a tiny JSON probe and reports per-sample latency, status, error class, min/median/max and slow bands. The Render probe checks public `/health`, `/api/health`, `/ready`, and `/health/runtime-config` endpoints, then flags latency-cap or unsupported-search-provider mismatches. Its runtime snapshot also captures App Builder, request/rate limits, security/proxy, worker, hosting, database-mode, and credential-presence settings without secret values, plus process-local per-model and per-source health counters/cooldowns. Artifacts contain no API key values or prompt/response bodies.

For live provider probes, configure GitHub Actions secrets `GEMINI_API_KEY` (required when `live=true`), optional `GEMINI_API_KEY_1`…`GEMINI_API_KEY_10` (pool inventory), `GROQ_API_KEY`, `SERPER_API_KEY`, and `JINA_API_KEY`. Configure non-secret repository variables `SERVICE_URL`, `SEARCH_CAROUSEL`, `WEB_SEARCH_DEFAULT_COUNTRY`, `JINA_READER_BASE_URL`, `GROQ_BASE_URL`, `GROQ_FALLBACK_MODEL`, and `WEATHER_CONNECTOR_ENABLED` as needed. The live Gemini timing uses the GitHub primary key, so use the same primary project key as Render if you want a meaningful comparison. To exercise the weather connector, set `WEATHER_CONNECTOR_ENABLED=true` as a GitHub variable and enter a `weather_place` when dispatching. Missing optional provider secrets are reported as `NOT_CONFIGURED`, not exposed.

If the live runtime snapshot differs from the canonical values or reports unknown carousel providers, update Render → Environment and redeploy. If runtime settings match but live Gemini samples remain slow, the artifact distinguishes provider latency from routing/fallback behaviour and should be attached to the next diagnosis. A successful workflow does not prove user-facing answer quality; it only provides operational evidence.

## Secret handling

Never document or emit `GEMINI_API_KEY*`, `GROQ_API_KEY`, `SERPER_API_KEY`, `JINA_API_KEY`, `SERP2_API_KEY`, `DATABASE_URL`, `APP_PASSWORD`, `SESSION_SECRET`, `GITHUB_WEBHOOK_SECRET`, or `GITHUB_APP_PRIVATE_KEY`. Diagnostics may report only whether a credential is configured.
