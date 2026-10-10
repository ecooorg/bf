# BiForge connections

Human-readable companion to [`connectors.yaml`](../connectors.yaml) (TZ Appendix E, canonical in Russian). The manifest is the only machine-readable source of variable names and checks; a test compares the two. Change both in the same patch. Secret values live only in Railway Variables, never in Git, documents, chat or logs.

## Rules for models (E.0)

- **R1 Secrets.** Never request, print, log or commit secret values. Work with variable names; report only `present: true|false`.
- **R2 Boundaries.** Accounts, keys, billing, spending limits and GitHub permissions are done by the owner only. No key: `BLOCKED(missing_secret:NAME)`, stop and ask.
- **R3 Proof.** A step is done only after `npm run verify:connections` returns `OK` and the result is recorded. "The key was added" is not proof.
- **R4 No improvisation.** If a service answers differently from this guide (URL, field, status code) report `DRIFT` with the status code and a body fragment without secrets, and stop.
- **R5 Model admission.** A registry model is available to the Router only after a last check with `OK` and `last_verified_at` not older than 90 days.
- **R6 Economy.** The check creates no branches or PRs and makes at most one short call per model.
- **R7 Data.** Real project data goes only to a provider with a confirmed paid plan and training on data disabled. `data_policy` and `training_opt_out_confirmed` are set by the owner only.

Check statuses: `OK`, `FAIL(reason)`, `BLOCKED(reason)`, `DRIFT`, `NOT_RUN`.

## Connections map

| ID | Service | Variables | Needed from |
| --- | --- | --- | --- |
| `gemini` | Gemini API (base provider) | `GEMINI_API_KEY` (paid project); optional `GEMINI_API_KEY_FREE` (synthetic data only), `GEMINI_BASE_URL` | BX-10.b |
| `groq` | Groq, OpenAI-compatible API (first additional provider; Free plan: data may be used, synthetic data only) | `GROQ_API_KEY`, `GROQ_PLAN` (`free` or `paid`) | BX-12.a |
| `postgres` | PostgreSQL on Railway | `DATABASE_URL` | BX-04 |

Planned, added to the manifest by their steps: GitHub App (BX-19), code executor (BX-21.a). Application login (`APP_PASSWORD`, `SESSION_SECRET`, `ENABLE_APP_AUTH`) is described in `DEPLOY_RAILWAY.md`.

## Gemini API

- Billing goes through Google Cloud Billing, not through a Google AI Pro subscription (A-01 below).
- New projects start on the free tier, where Google may use content to improve its products; on a paid tier it does not (A-02 below). Free-tier keys are for synthetic tests only.

Owner steps (human only):
1. In Google AI Studio, API keys page, create a project (suggested name `biforge-prod`) and a key.
2. For real data: set up billing for the project (Billing Tier column). Accounts may be on prepay.
3. Set a monthly spending limit for the project; record it in the project Passport.
4. Add the key in Railway: project BiForge, service `e`, Variables, `GEMINI_API_KEY`.
5. Run `npm run verify:connections` (with the variables set) and keep the `OK` result.

### Console checks A-01 and A-02 (owner, in the consoles)

- **A-01.** In AI Studio and Google Cloud, see which project and billing account the key belongs to, and confirm the API quota does not come from a Google AI Pro subscription. Record: project name, billing tier, date.
- **A-02.** For the project used with real data, confirm the billing tier is paid (not free) and that the data-use terms of the paid tier apply. Only then the owner sets `data_policy = paid` and `training_opt_out_confirmed` for the Gemini models in the registry seed. Until then they stay `unknown` and `false`.

## PostgreSQL

`DATABASE_URL` comes from the Railway PostgreSQL service. `npm run db:migrate` applies `migrations/`; the check runs `SELECT 1` (`FAIL(db_unreachable)` otherwise).

## `npm run verify:connections`

- No LLM. 10 s timeout per request, no retries, at most one short model call.
- Options: `--only gemini,postgres`, `--json`, `--dry-run` (plan only, no network). Tests replace the address with `<ID>_BASE_URL_OVERRIDE` pointing to a fake server.
- Secret values never reach the output (a redaction pass is applied); only presence is reported.
- Exit codes: `0` all required `OK`; `2` any `FAIL` or `DRIFT`; `3` a required connection is `BLOCKED` (for example `missing_secret:GEMINI_API_KEY`).
- The model for `tiny_call` is taken from the provider's model list and the registry seed, not typed from memory; if no registry model is in the list the result is `DRIFT`.
- With `DATABASE_URL` set, each run is recorded in `connection_checks`. Updating `last_verified_at` of registry models is not implemented yet (the registry is not in the database).

## Diagnostics (E.7)

| Symptom | Class | Automatic mode |
| --- | --- | --- |
| 401/403 from a provider, or "API key not valid" | `PROVIDER_AUTH` | Provider `disabled`, task `BLOCKED`, no retries, audit record |
| 429 with `Retry-After` | `PROVIDER_TRANSIENT` | Backoff with jitter, then fallback |
| 429 with quota exhaustion text | `PROVIDER_QUOTA` | Cooldown, next provider, no retries |
| 400/422 | `INVALID_REQUEST` | No retries; check is `FAIL` |
| 404 on a path from this guide | `DRIFT` | Stop, report without secrets |
| 5xx or timeout | `PROVIDER_TRANSIENT` | One retry, then fallback |
| Database not reachable | `FAIL(db_unreachable)` | `/ready` returns an error |
