# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-16 · **v47 freeze · P48-SPEC ready (epistemic)**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **Version** | **47** (freeze for pre-P48 baseline) |
| **UI1** | Карточки Simple / Expert / Project; **P47:** mode controls only via **More** |
| **QA1** | Offline PASS → **MANUAL1** (owner) |
| **Code Delivery** | **RM-C3** closed (**P43**); `model_patch`; runtime env-gated |
| **Build freeze** | Production **v47** · commit **`2bdd6ae96ce3`** · `https://e-production-5cc8.up.railway.app` · health ok |
| **Next coding** | **P48** — uncertainty + Groq verifier · SPEC: `docs/P48-SPEC.md` · **await owner command to implement** |

## 2. Следующее

| # | ID | Что | Owner |
| --- | --- | --- | --- |
| 1 | **P48 implement** | Epistemic layer (SPEC locked, variant A) | Command to agent |
| 2 | **MANUAL1** | Owner acceptance (OWNER_OPS) — can run on v47 now or after P48 smoke | Owner |
| 3 | **External testers** | After P48 PASS + short smoke (recommended) or on v47 if P48 deferred | Owner |
| — | GitHub write | **Отложено** (ADR-06) | Owner |

## 3. Нельзя без команды

Server execution; silent GitHub main; implement P48 without command; GitHub App write.

## 4. Открытые вопросы

1. UX1 утверждено.
2. Export UX: **closed** — EN until separate patch.

*STATUS*
