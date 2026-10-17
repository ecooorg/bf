# Owner ops — bookmarks and environment facts

> **Public links and non-secret facts only.** No API keys, passwords, private keys, or webhook secrets.
> Updated **16 October 2026** from the owner’s Railway/GitHub screens (Android).
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
- **Deploy v47 observed (2026-10-16 ≈09:00 CEST):** health `https://e-production-5cc8.up.railway.app/health` → `{"status":"ok","version":"47","commit":"2bdd6ae96ce3"}`. UI start screen (Simple / Expert / Project cards) confirmed on the same host.

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
  **P53 (ADR-06 Amendment 1):** `model_patch` now means ZIP only and no longer implies GitHub write. The GitHub App must have **read-only** rights (contents, checks, pull requests, metadata). If its page still shows write rights, reduce them before deploying P53: the server now rejects a write-level token while `GITHUB_DIFF_UPLOAD` is off (Tier 3, owner action).

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
Base: `main` (or the supplied ZIP). Next patch.
```

Current pointer: **P27** (`docs/P27-SPEC.md`) until advanced in `CURRENT_STATE.md`.

---

## Update rule



---

## MANUAL1 — Owner acceptance walkthrough (v47)

> Scenario source: `docs/MASTER_IMPLEMENTATION_PLAN.md` § MANUAL1.  
> **Environment:** production `https://e-production-5cc8.up.railway.app` · commit `2bdd6ae96ce3` · version **47**.  
> **What cannot be automated:** evaluating the substance of model responses, “useful guidance vs. a lecture,” Expert depth, and preservation of Project structure. The owner must assess these.  
> Offline QA1 (12/12) and CI/structure have already been completed automatically; live multi-turn testing has not.

### Before starting (2 minutes)

1. Open the app URL; sign in with `APP_PASSWORD`.
2. Verify that the start screen shows **three cards**: Simple / Expert / Project (Project may be disabled if Project Mode is off — this is OK).
3. Prepare notes (or a draft message to the assistant) using the record template below. **Do not** put secrets or personal data in the repository.

### Scenario 1 — Simple, Graubünden (multi-turn)

1. Select **Simple**.
2. Ask an informational question about winter weather in Graubünden.
3. Continue for 2–3 turns, then explicitly request a **direct answer without methodology** / “don’t evade the question.”
4. **Expected:** useful guidance or a comparison; a brief, honest factual caveat; **no** “how AI works” lecture; **no** invented requirement for an exact forecast.
5. Record: PASS / FAIL / NOT_RUN plus a one-line note.

### Scenario 2 — Simple, information vs. decision

1. In the same or a new Simple conversation, ask a neutral informational question (e.g. “explain X”).
2. In a separate request, ask “which should I choose / is it worth it…”.
3. **Expected:** both remain in the user-facing Simple mode; internally they use different task types (information vs. decision), reflected in tone/structure without changing the mode card.
4. Record the result.

### Scenario 3 — Expert, analytical depth

1. **More → Mode selection** (or Switch to Expert) → **Expert**.
2. Request an in-depth analysis of a problem, including alternatives and risks.
3. **Expected:** the method retains its depth; the response is not reduced to a short Simple-style answer.
4. Record the result.

### Scenario 3b — Expert, mid-method follow-up

1. In Expert, proceed to the middle of the method (e.g. Expand / Attack).
2. Add a **new fact** and a follow-up question.
3. Ask another question after the Learn stage.
4. **Expected:** the agent incorporates follow-up information; the conversation does **not** end with a message such as “end of stages” / “pipeline complete.”
5. Record the result.

### Scenario 4 — Project (if enabled)

1. Mode selection → **Project** (if the card is disabled, mark **NOT_RUN** and record the reason).
2. Create or analyze a small software or scientific project.
3. **Expected:** the operational structure (requirements, tasks, checks) is preserved.
4. Record the result.

### Scenario 5 — Explicit mode changes only

1. Switch between Simple ↔ Expert (and Project, if available) **only** through More / Mode selection / Switch.
2. **Expected:** the mode never changes automatically; Mode selection shows the three cards again; no unsolicited mode switch occurs.
3. Record the result.

### Result record template (send to owner in chat / add to PATCH_JOURNAL after closure)

```
MANUAL1 | 2026-10-16 | https://e-production-5cc8.up.railway.app | commit 2bdd6ae96ce3 | v47
S1 Simple Graubünden: PASS|FAIL|NOT_RUN — …
S2 Simple info/decision: …
S3 Expert depth: …
S3b Expert mid-method: …
S4 Project: …
S5 Mode switch: …
Limitations (if any): …
```

### After MANUAL1

1. Send the results to the assistant (or paste the template).
2. The assistant will update `STATUS` and `PATCH_JOURNAL`; when the initiative closes, it will update `CURRENT_STATE` / `CHANGELOG` (per MASTER).
3. Old RM-* / P27+ items are **not** reopened automatically (MASTER §9).


When prod host, Railway project id, or App id changes, edit **this file only** (and bump the date). Do not scatter new URLs across SPECs.
