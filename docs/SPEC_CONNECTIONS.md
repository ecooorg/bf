# BiForge: Connections (Appendices D and E of TZ v3.0)

*Normative guide: connection cards, `connectors.yaml` manifest (E.6), `npm run verify:connections`, diagnostics, external facts. Part of TZ v3.1 (index — `docs/BiForge_TZ_v3.md`). Working English summary for agents — `docs/CONNECTIONS.md` (test `tests/connections.test.mjs` compares it to `connectors.yaml`); on conflict this file takes priority.*

---

## Appendix D. External facts

The main body of the TZ does not rely on unverified external facts (§3.1). Facts about the Gemini API confirmed on 9 October 2026 from Google documentation (billing via Cloud Billing; on the paid tier prompts and responses are not used to improve Google products; spend limits are set at billing-account and project level; prepay for developer accounts) — see E.8. Facts about Jules (limits, access terms, REST API `v1alpha`) and Mistral collected for v2.0 are kept in Appendix F as historical; they are not used in the main body.

Not verified and must be checked at connection time (A-01, A-02, A-05…A-10): Gemini API quotas and billing relative to a Google AI Pro subscription; data-use terms of each additional provider; GitHub Actions minutes for the chosen repository visibility; Railway PostgreSQL backup parameters; quality of `model_patch` (E-01).

## Appendix E. Guide to connecting models and services

Normative guide: how to connect Gemini, any additional model provider, GitHub and Railway so a human can follow the steps and a model or script can verify the result without guessing. Jules and Mistral connections are in Appendix F. External-fact check date — 9 October 2026.

### E.0. How to use (human and model)

The guide has three layers that **MUST** agree:

1. **Connection cards (E.1–E.5)** — steps for the human and rules for the model.
2. **Manifest `connectors.yaml` (E.6)** — the only machine-readable source of variable names, endpoints and checks. CI compares it to the card tables.
3. **`npm run verify:connections` (E.6)** — deterministic script, no LLM call, returns JSON statuses.

The repository holds `docs/CONNECTIONS.md` (companion summary) and `connectors.yaml`. Stubs are created in BX-01.b, filled in BX-10.b and extended in BX-12.a, BX-19, BX-21.a. Changing a connection without updating both files in the same PR is not accepted (review checklist §16.6).

**Step labels.** **[HUMAN]** — human only (accounts, payments, keys, permissions). **[AUTO]** — script or model. **[SEMI]** — model prepares a command or text; human runs and confirms.

**Check statuses.** `OK`; `FAIL(reason)` — check ran and failed; `BLOCKED(reason)` — missing inputs or rights; `DRIFT` — reality diverges from the guide; `NOT_RUN`.

**Rules for models** (automatic and semi-automatic modes):

- **R1. Secrets.** Do not request, print, log or commit secret values. Work only with variable **names**; report presence only as `present: true|false`.
- **R2. Boundaries.** Creating accounts, keys, billing settings, spend limits and GitHub permissions is **[HUMAN]** only. No key → `BLOCKED(missing_secret:VAR_NAME)`, stop and ask the human.
- **R3. Evidence.** A step is done only after an E.6 check with status `OK` and a recorded result (time, status). The phrase “key added” is not evidence.
- **R4. No improvisation.** If a service response does not match the description (different URL, field, status code, button name) → `DRIFT`: stop, attach status code and a body fragment without secrets, cite official docs. Fixing the guide is a separate PR with human review.
- **R5. Model admission.** A Registry model is available to the Router only if the last check is `OK` and `last_verified_at` is not older than 90 days.
- **R6. Economy.** A check creates no branches, PRs or executor runs and makes at most one short call per model.
- **R7. Data.** Real project data is sent only to a provider with a confirmed paid plan and training opt-out (E.1, E.2). Registry flags `data_policy` and `training_opt_out_confirmed` are set only by a human.

### E.0.1. Connection map

| ID | Service | Purpose | Environment variables | Needed by step |
| --- | --- | --- | --- | --- |
| `gemini` | Gemini API | Baseline provider | `GEMINI_API_KEY` (paid project); `GEMINI_API_KEY_FREE` (optional, synthetic data only) | BX-10.b |
| `<provider_id>` | Additional provider (any) | `cross_model`, fallback, `code_author` | `<ID>_API_KEY`, `<ID>_PLAN` (`free` or `paid`) | BX-12.a |
| `postgres` | PostgreSQL on Railway | Storage | `DATABASE_URL` | BX-04 |
| `app` | Login and sessions | Project Mode protection | `APP_PASSWORD`, `SESSION_SECRET`, `ENABLE_APP_AUTH` | BX-06 |
| `github` | GitHub App | PR, check runs, webhook, `biforge/*` branches | `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` | BX-19 |
| `code_executor` | Code executor | `manual` or `model_patch` mode | `CODE_EXECUTOR` (`manual` by default) | BX-21.a |

### E.1. Gemini API (Google)

**Purpose.** Primary executor, `gemini` adapter. Current BE already uses `@google/genai` and `GEMINI_API_KEY`; the variable name is kept.

**What matters**

- Gemini API is billed via Google Cloud Billing, not a Google AI Pro subscription. API docs do not name the subscription as the quota source — do not rely on it; confirm in the console (A-01).
- New projects start on the free tier, where Google may use content to improve products. On the paid tier, prompts and responses are not used for that (Google docs, verified 9 October 2026).

**Steps**

1. **[HUMAN]** Open Google AI Studio (aistudio.google.com), API keys page.
2. **[HUMAN]** Create a project (or import an existing Google Cloud project) and create a key. Name the project `biforge-prod`.
3. **[HUMAN]** For real data: in the project Billing Tier column, set up billing and attach a billing account. Google moves developer accounts to Prepay — balance top-up may be required.
4. **[HUMAN]** Set a monthly project spend limit (Gemini API supports account- and project-level limits). Record the value in the project Passport; the app also applies a daily call ceiling (§14.4).
5. **[HUMAN]** Add the key in Railway: BiForge project → service `e` → Variables → `GEMINI_API_KEY` (E.3). Do not paste the key into chat, Git or documents.
6. **[HUMAN, optional]** For synthetic tests create a separate free project and key `GEMINI_API_KEY_FREE`. Models called with this key get `data_policy = free` and must not receive real project data.
7. **[SEMI]** Obtain the model list via E.6 and propose a Registry update. Model names are not hard-coded; Registry changes are a PR with human approval. Until BX-13.a, current `MODEL_CASCADE_LIGHT` and `MODEL_CASCADE_STRONG` apply.

**Check** (also performed by `verify:connections`):

```bash
# 1. Key works, model list available: expect HTTP 200
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models?pageSize=5"

# 2. Short call to the chosen model: expect HTTP 200, text in candidates[0], usageMetadata present
curl -s -H "x-goog-api-key: $GEMINI_API_KEY" -H "Content-Type: application/json" \
  "https://generativelanguage.googleapis.com/v1beta/models/<MODEL_ID>:generateContent" \
  -d '{"contents":[{"parts":[{"text":"Reply with one word: ok"}]}],"generationConfig":{"maxOutputTokens":10}}'
```

**OK criterion:** both requests returned 200; the second has text and `usageMetadata`.

**Response mapping:** 400 with invalid-key message → `PROVIDER_AUTH`; 403 → API unavailable to project or region (`PROVIDER_AUTH`); 429 → `PROVIDER_TRANSIENT` or `PROVIDER_QUOTA` (from response text); 503 → `PROVIDER_TRANSIENT`.

**Registry seed format:**

```yaml
provider_id: gemini
adapter: gemini
secret_env_ref: GEMINI_API_KEY
data_policy: paid          # paid | free; free only for GEMINI_API_KEY_FREE
models:
  - model_id: <FROM_CHECK_LIST>   # never invent from memory
    capabilities: [json_output]   # more only after verification
    last_verified_at: <check_date>
```

### E.2. Additional provider (template)

**Purpose.** Connect any model provider for `cross_model`, fallback or `code_author`. The owner chooses the provider (ADR-03). Nothing vendor-specific is added to code or schema (D-13): only a registry entry and env vars.

**What matters (checked per provider, A-08)**

- API key and a chat-UI subscription are different; the server needs an API key with billing.
- Free plans may use data for training; real data requires a paid plan with confirmed training opt-out. Exact setting names are confirmed in the provider UI/docs, not from memory.
- Use explicit model versions; avoid `*-latest` aliases (silent behaviour/price changes).
- Set a spend limit in the provider console; record actual RPM/TPM in the registry.

**Steps**

1. **[HUMAN]** Register in the provider console and choose a plan (free for synthetic data; paid for real data).
2. **[HUMAN]** For real data, disable training use of data and record `training_opt_out_confirmed: true` in the registry.
3. **[HUMAN]** Create a key with a clear name (`<id>-dev`, `<id>-prod`; different keys for dev and prod) and set a spend limit.
4. **[HUMAN]** Add Railway variables `<ID>_API_KEY` and `<ID>_PLAN`.
5. **[SEMI]** Choose adapter by API shape: `openai-compatible` (Chat Completions) or `anthropic` (Messages). Describe the provider in registry seed and `connectors.yaml`; model starts `disabled`.
6. **[AUTO]** Run `verify:connections --only <id>`; on `OK` a human sets the model `active` and records `capabilities`, `rate_limit_policy`, `data_policy`, `last_verified_at`.

**Check template for `openai-compatible`:**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $<ID>_API_KEY" <BASE_URL>/models
curl -s <BASE_URL>/chat/completions -H "Authorization: Bearer $<ID>_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"<MODEL_ID>","messages":[{"role":"user","content":"Return JSON {\"ok\":true}"}],"response_format":{"type":"json_object"},"max_tokens":20}'
```

**Check template for `anthropic`:**

```bash
curl -s <BASE_URL>/v1/messages -H "x-api-key: $<ID>_API_KEY" \
  -H "anthropic-version: <VERSION_FROM_DOCS>" -H "Content-Type: application/json" \
  -d '{"model":"<MODEL_ID>","max_tokens":20,"messages":[{"role":"user","content":"Reply with one word: ok"}]}'
```

**OK criterion:** both return 200; body parses; `usage` present.

**Typical mapping:** 401/403 → `PROVIDER_AUTH`; 400/422 → `INVALID_REQUEST`; 429 → `PROVIDER_TRANSIENT` or `PROVIDER_QUOTA`; 5xx and timeout → `PROVIDER_TRANSIENT`. Provider deviations from the base format go in `param_map`, `tool_choice_map`, `json_mode`, `error_map` and are covered by a conformance test.

**Seed template:**

```yaml
provider_id: <id>
adapter: openai-compatible         # or anthropic
base_url: <BASE_URL>
auth: {header: Authorization, scheme: Bearer, secret_env_ref: <ID>_API_KEY}
plan_env: <ID>_PLAN                # free | paid -> data_policy
chat_path: /chat/completions
models_path: /models
param_map: {}
tool_choice_map: {}
json_mode: {kind: response_format, json_object_requires_prompt_instruction: false}
error_map: {401: PROVIDER_AUTH, 422: INVALID_REQUEST, 429: TRANSIENT_OR_QUOTA, 5xx: PROVIDER_TRANSIENT}
training_opt_out_confirmed: false  # human only
models:
  - model_id: <EXPLICIT_NAME_FROM_PROVIDER_LIST>
    status: disabled
    role_hint: verifier
    capabilities: []
    last_verified_at: <check_date>
```

**Product role.** The verifying model **MUST** be a different provider from the executor (§7.6). With one provider, `cross_model` is `NOT_RUN(no_second_provider)`. Worked example (Mistral) — F.2.

### E.3. Railway: environment variables and PostgreSQL

**Steps**

1. **[HUMAN]** In Railway open BiForge → environment `production` → add PostgreSQL if missing.
2. **[HUMAN]** In service `e` open Variables. For `DATABASE_URL` use a **reference** to the Postgres service variable, do not paste the value by hand.
3. **[HUMAN]** Add the other variables from the table. Highly sensitive values may be Sealed Variables (§4.4); those are unavailable to `railway run` and are checked inside the Railway environment.
4. **[HUMAN]** For development use a separate environment or local `.env` with **different** keys. Production keys are not used in development.
5. **[AUTO]** Run `npm run verify:connections` (E.6) and keep the JSON result as a project artifact.

| Variable | Required | Purpose | Value rule |
| --- | --- | --- | --- |
| `DATABASE_URL` | from BX-04 | PostgreSQL | Reference to DB service variable |
| `APP_PASSWORD` | yes | Shared login password | Long random phrase; not the `.env.example` value |
| `SESSION_SECRET` | yes | Cookie signing | ≥16 random characters |
| `ENABLE_APP_AUTH` | yes | Enable login | `true` |
| `TRUST_PROXY_HOPS` | yes | Proxies in front of the app | `1` on Railway |
| `GEMINI_API_KEY` | yes | Paid Gemini project | From E.1 |
| `GEMINI_API_KEY_FREE` | no | Free project, synthetic only | From E.1 |
| `<ID>_API_KEY` | from BX-12.a | Extra provider key | From E.2; name from registry seed |
| `<ID>_PLAN` | from BX-12.a | `free` or `paid` | Sets `data_policy` |
| `CODE_EXECUTOR` | from BX-21.a | `manual` or `model_patch` | Default `manual` (E.4) |
| `GITHUB_APP_*` | from BX-19 | GitHub App | From E.5 |
| `BIFORGE_PROJECTS_ORG` | from BX-19 | Org for project repos | `ecooorg` |
| `DAILY_CALL_CAP`, `MAX_MODEL_CALLS` | yes | Call ceilings | From §14 |

**Rules.** `.env.example` has names and empty values only; `.env` stays in `.gitignore`. After variable changes Railway redeploys; then re-run E.6. GitHub private key is stored as one line with escaped newlines.

### E.4. Code executor

**Mode `manual`** (default, `CODE_EXECUTOR=manual`): no external connections required. The product builds a Task Package and `PACKAGE.md` (§11.3); a human passes them to any tool and returns a PR, branch or diff (§11.4).

**Mode `model_patch`** (`CODE_EXECUTOR=model_patch`, after positive ADR-10):

1. **[HUMAN]** Ensure a provider is connected with a model that has verified `capability = code_patch` (E.2 check and E-01 golden set).
2. **[HUMAN]** Enable GitHub App write permissions per E.5 (`biforge/*` only) and a ruleset that forbids writes to `main`.
3. **[SEMI]** Set `role_hint: code_author` for the chosen model in the registry.
4. **[AUTO]** `verify:connections` checks: app permissions are not broader than the manifest; write to test branch `biforge/_verify` succeeds; write to `main` is rejected. The check does not create a PR.

Jules and other cloud agents on the same interface — F.3.

### E.5. GitHub App (product integration)

Required for BX-19. The product has no merge right and no admin rights.

**Steps**

1. **[HUMAN]** In org `ecooorg` (Developer settings → GitHub Apps) create app `biforge-control`.
2. **[HUMAN]** Repository permissions: Metadata — read; Contents — read; write only when `model_patch`, diff upload and Task Package commit, and only to `biforge/*` (ruleset; ADR-06); Pull requests — read/write only to create PRs under `model_patch`; Checks — read.
3. **[HUMAN]** Install on selected repositories; set webhook URL and `GITHUB_WEBHOOK_SECRET`.
4. **[HUMAN]** Put `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` in Railway.
5. **[AUTO]** Verify signature handling and that pushes to `main` are rejected while `biforge/*` works as designed.

### E.6. Manifest and connection verification

`connectors.yaml` lists every connection id, env names, check commands and expected outcomes. `npm run verify:connections` runs without LLM, emits JSON per connection (`OK` / `FAIL` / `BLOCKED` / `DRIFT` / `NOT_RUN`). CI compares manifest names to documentation tables. Changing either without the other fails review.

### E.7. Diagnostics

| Symptom | Status | Action | Effect |
| --- | --- | --- | --- |
| Missing secret | `BLOCKED(missing_secret:…)` | Human adds variable | Connection not admitted |
| Auth failure | `FAIL(PROVIDER_AUTH)` | Check key and billing | Models of that provider stay disabled |
| GitHub permissions too broad | `FAIL(permissions_too_broad)` | Narrow app permissions | Connection not admitted |
| Write to `main` not rejected | `FAIL(main_not_protected)` | Enable ruleset | `model_patch` does not start |
| DB unreachable | `FAIL(db_unreachable)` | Check `DATABASE_URL` reference and service status | `/ready` errors; new Runs do not start |

### E.8. External facts checked on 9 October 2026

**Confirmed from Google documentation:** Gemini API is billed via Cloud Billing; on the paid tier prompts and responses are not used to improve Google products; spend limits are at billing-account and project level; usage monitor — AI Studio, Dashboard → Usage; developer accounts move to prepay (Gemini API Billing docs).

**Not asserted by the main TZ and checked at connection time:** limits, prices, data terms and API behaviour of any additional provider; exact REST paths for Gemini and GitHub App (given from common docs and verified by script for `DRIFT`); UI button labels in Railway, GitHub and provider consoles (may differ); model names (taken from the provider model list, not from the TZ or memory).

Before every BX step that uses a connection, re-read E.8 and update on divergence (R4). Historical Jules/Mistral facts — Appendix F.

### E.9. Connection admission checklist

For humans; models must not tick items until the matching E.6 check confirms them.

- [ ] Gemini: paid project created, spend limit set, key in Railway, check `OK`
- [ ] Each additional provider: plan chosen; for real data paid plan and training opt-out; spend limit set; key in Railway; limits in Registry; check `OK`
- [ ] PostgreSQL: service created, `DATABASE_URL` is a variable reference, check `OK`
- [ ] Login: `APP_PASSWORD`, `SESSION_SECRET`, `ENABLE_APP_AUTH=true` set
- [ ] GitHub App: permissions exactly per E.5, signed webhook, install on selected repos, rulesets on `main` and `biforge/*`, check `OK`
- [ ] Code executor: `manual` configured; for `model_patch` — ADR-10 and write check to `biforge/*`
- [ ] `verify:connections` result stored as artifact; required connections for the current G level are `OK`
- [ ] Registry: every model has `data_policy`, `rate_limit_policy` and fresh `last_verified_at`
- [ ] Secret-scanning CI green; no secrets in Git, logs or API responses
