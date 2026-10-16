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



---

## MANUAL1 — пошаговая приёмка владельцем (v47)

> Источник сценариев: `docs/MASTER_IMPLEMENTATION_PLAN.md` § MANUAL1.  
> **Среда:** production `https://e-production-5cc8.up.railway.app` · commit `2bdd6ae96ce3` · version **47**.  
> **Что нельзя автоматизировать:** оценка смысла ответов модели, «полезный ориентир vs лекция», глубина Expert, сохранение Project-структуры. Это делает только владелец.  
> Offline QA1 (12/12) и CI/structure уже закрыты автоматически; live multi-turn — нет.

### Перед стартом (2 минуты)

1. Открыть app URL; при необходимости войти с `APP_PASSWORD`.
2. Убедиться, что на старте видны **три карточки**: Simple / Expert / Project (Project может быть disabled, если Project Mode выключен — это OK).
3. Подготовить блокнот (или черновик сообщения в чат с ассистентом) по шаблону записи ниже. **Не** вставлять секреты и персональные данные в репозиторий.

### Сценарий 1 — Simple, Граубюнден (многоходовый)

1. Выбрать **Simple**.
2. Спросить про зимнюю погоду в Граубюндене (информационно).
3. Продолжить диалог 2–3 хода; затем явно попросить **прямой ответ без методологии** / «не уклоняйся».
4. **Ожидание:** полезный ориентир или сравнение; короткая честная оговорка по фактам; **без** лекции «как AI»; **без** приписывания требования точного прогноза.
5. Записать: PASS / FAIL / NOT_RUN + 1 строка заметки.

### Сценарий 2 — Simple, information vs decision

1. В том же или новом Simple: нейтральный информационный вопрос (например «объясни X»).
2. Отдельный запрос: «что мне выбрать / стоит ли …».
3. **Ожидание:** оба в режиме Simple для пользователя; внутренне разные типы задачи (информация vs решение) — по тону/структуре ответа, без смены карточки режима.
4. Записать результат.

### Сценарий 3 — Expert, глубина

1. **More → Mode selection** (или Switch to Expert) → **Expert**.
2. Попросить глубокий разбор проблемы с альтернативами и рисками.
3. **Ожидание:** сохраняется глубина метода; нет упрощения до короткого Simple-ответа.
4. Записать результат.

### Сценарий 3b — Expert, уточнения на середине метода

1. В Expert дойти до середины метода (например Expand / Attack).
2. Добавить **новый факт** и уточняющий вопрос.
3. После стадии Learn задать ещё один вопрос.
4. **Ожидание:** агент принимает уточнения; диалог **не** обрывается фразой вроде «конец этапов» / pipeline complete.
5. Записать результат.

### Сценарий 4 — Project (если включён)

1. Mode selection → **Project** (если карточка disabled — отметить **NOT_RUN** и причину).
2. Создать или разобрать небольшой программный/научный проект.
3. **Ожидание:** операционная структура (требования, задачи, проверки) сохраняется.
4. Записать результат.

### Сценарий 5 — смена режимов только явно

1. Переключаться Simple ↔ Expert (и Project, если доступен) **только** через More / Mode selection / Switch.
2. **Ожидание:** режим не меняется сам; после «Mode selection» снова три карточки; нет самовольного переключения.
3. Записать результат.

### Шаблон записи результата (в чат владельцу / PATCH_JOURNAL после закрытия)

```
MANUAL1 | 2026-10-16 | https://e-production-5cc8.up.railway.app | commit 2bdd6ae96ce3 | v47
S1 Simple Graubünden: PASS|FAIL|NOT_RUN — …
S2 Simple info/decision: …
S3 Expert depth: …
S3b Expert mid-method: …
S4 Project: …
S5 Mode switch: …
Ограничения (если есть): …
```

### После MANUAL1

1. Сообщить ассистенту итог (или вставить шаблон).
2. Ассистент обновит `STATUS`, `PATCH_JOURNAL`, при закрытии инициативы — `CURRENT_STATE` / `CHANGELOG` (по MASTER).
3. Старые RM-* / P27+ **не** открываются автоматически (MASTER §9).


When prod host, Railway project id, or App id changes, edit **this file only** (and bump the date). Do not scatter new URLs across SPECs.
