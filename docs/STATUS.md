# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-16 · **v48 P48 epistemic**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **Version** | **48** |
| **UI1** | Карточки Simple / Expert / Project; mode controls via **More** |
| **QA1** | Offline suite; path to **MANUAL1** |
| **Code Delivery** | **RM-C3** closed (**P43**); `model_patch`; runtime env-gated |
| **P48** | Uncertainty core + optional Groq verifier (variant A); never blocks primary reply |
| **P49** | Multi-provider cascade SPEC **deferred** (`docs/P49-SPEC.md`) — Gemini+Groq+CF primary intent; NIM+OpenRouter spare |
| **CI / Deploy** | Owner: apply patch → CI → deploy v48 → short smoke → external testers |

## 2. Следующее

| # | ID | Что | Owner |
| --- | --- | --- | --- |
| 1 | **CI** | Confirm green on P48 | Owner (log) |
| 2 | **Deploy** | v48 production | Owner |
| 3 | **Smoke** | Simple plain / research+numbers / Expert; with and without Groq | Owner |
| 4 | **MANUAL1** | Full acceptance (OWNER_OPS) | Owner |
| — | **P49** | Cascade expansion — only when Gemini+Groq insufficient | Deferred |
| — | GitHub write | **Отложено** (ADR-06) | Owner |

## 3. Нельзя без команды

Server execution; silent GitHub main; GitHub App write.

## 4. Открытые вопросы

1. UX1 утверждено.
2. Export UX: **closed** — EN until separate patch.

*STATUS*
