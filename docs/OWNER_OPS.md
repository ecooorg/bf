# Owner ops — bookmarks and environment facts

> **Public links and non-secret facts only.** No API keys, passwords, private keys, or webhook secrets.
> Updated **14 October 2026** from the owner’s Railway/GitHub screens (Android).
> Agents: use this file for URLs in reports and owner instructions. Do not invent alternate prod hosts.

---

## Production application

| What | URL |
| --- | --- |
| **App (Simple)** | https://e-production-5cc8.up.railway.app |
| **Health** | https://e-production-5cc8.up.railway.app/health |
| **Ready** (if exposed) | https://e-production-5cc8.up.railway.app/ready |
| **Ops** | https://e-production-5cc8.up.railway.app/ops |
| **Project Mode** | https://e-production-5cc8.up.railway.app/project |
| **GitHub webhook path** | `POST https://e-production-5cc8.up.railway.app/api/webhooks/github` |

- Public hostname: `e-production-5cc8.up.railway.app` → port **8080** on the service.
- **Staging:** none observed (single public domain on this service).

---

## Railway

| What | Value |
| --- | --- |
| **Project** | https://railway.com/project/310fa2f8-acd2-418e-8f7d-f440528bf49e |
| **Environment** | `production` (selector in Railway UI) |
| **App service** | `e` (shows domain e-production-5cc8…) |
| **Database** | Postgres plugin **Online** (same project canvas) |
| **Source repo** | `ecooorg/bf` |
| **Deploy branch** | `main` |
| **Auto deploy** | On push to GitHub |
| **Wait for CI** | **Enabled** (deploy after GitHub Actions success) |

**Variables UI:** open the project link → service **e** → tab **Variables** (≈30 service variables + Railway-injected).

### Variable **names** present (values secret — never commit)

`APP_PASSWORD`, `CODE_EXECUTOR`, `DAILY_CALL_CAP`, `DATABASE_URL`, `ENABLE_APP_AUTH`, `ENABLE_PROJECT_MODE`, `GEMINI_API_KEY`, `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID` (truncated in UI), `GITHUB_APP_PRIVATE_KEY`, `GITHUB_DIFF_UPLOAD`, `GITHUB_REPOSITORY_NAME`, `GITHUB_REPOSITORY_OWNER`, `GITHUB_WEBHOOK_SECRET`, `GROQ_API_KEY`, `GROQ_PLAN`, `LLM_CALL_TIMEOUT_MS`, `LLM_TOTAL_DEADLINE_MS`, `MAX_BODY_BYTES`, `MAX_MODEL_CALLS`, `MODEL_CASCADE_LIGHT`, `MODEL_CASCADE_STRONG`, `NODE_ENV`, `PGSSLMODE`, `PROJECT_RATE_LIMIT_PER_*`, `RATE_LIMIT_PER_HOUR`, `SERVICE_URL`, `SESSION_SECRET`, `TRUST_PROXY_HOPS`, `VITE_GOOGLE_CLIENT_ID`, plus variables added by Railway.

### Observed non-secret value (owner screen, 14 Oct 2026)

- `CODE_EXECUTOR` = **`model_patch`** (visible in Variables UI, observed 14 Oct 2026).  
  **RM-C3 closed (P43, 2026-10-15):** owner authorized enablement after ADR-10 / E-01. Re-confirm the variable after each deploy. GitHub App **write** and `GITHUB_DIFF_UPLOAD` remain separate owner decisions (ADR-06).

**RM-A1 check:** open Variables → search `MODEL_CASCADE` → ensure no deprecated `gemini-3.7-flash` / `gemini-3.5-flash` overrides (or clear those vars to use code defaults).

---

## GitHub

| What | URL |
| --- | --- |
| **Repository** | https://github.com/ecooorg/bf |
| **Actions (CI)** | https://github.com/ecooorg/bf/actions |
| **Upload to main** | https://github.com/ecooorg/bf/upload/main |
| **Commits on main** | https://github.com/ecooorg/bf/commits/main |
| **Pull requests** | https://github.com/ecooorg/bf/pulls |
| **Workflows folder** | https://github.com/ecooorg/bf/tree/main/.github/workflows |
| **GitHub App (settings)** | https://github.com/settings/apps/biforge-control |
| **App public name** | `biforge-control` |
| **App ID (public)** | `5276629` |
| **Owner account** | `@ecooorg` |

Workflows for connection checks: open Actions or `.github/workflows/` and pick `evidence` / `monitor-connections` / similar (names as in repo files).

---

## Docs agents and owner should open first

| Doc | URL on main |
| --- | --- |
| Start | https://github.com/ecooorg/bf/blob/main/docs/START_HERE.md |
| **Next agent patch** | https://github.com/ecooorg/bf/blob/main/docs/CURRENT_STATE.md |
| Queue / P27+ | https://github.com/ecooorg/bf/blob/main/docs/NEXT.md |
| This file | https://github.com/ecooorg/bf/blob/main/docs/OWNER_OPS.md |
| Connections log | https://github.com/ecooorg/bf/blob/main/docs/CONNECTIONS.md |
| P27 SPEC | https://github.com/ecooorg/bf/blob/main/docs/P27-SPEC.md |

---

## Owner command to the agent

```text
База — main (или приложенный zip). Следующий патч.
```

Current pointer: **P27** (`docs/P27-SPEC.md`) until advanced in `CURRENT_STATE.md`.

---

## Update rule

When prod host, Railway project id, or App id changes, edit **this file only** (and bump the date). Do not scatter new URLs across SPECs.
