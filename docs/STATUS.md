# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-16 · **v47 deployed; next = MANUAL1**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **Version** | **47** (`APP_VERSION` = patch ID) |
| **UI1** | Карточки Simple / Expert / Project; **P47:** mode controls только через **More** |
| **QA1** | Offline suite PASS (12/12); live path → **MANUAL1** |
| **Code Delivery** | **RM-C3** closed (**P43**); `model_patch` authorized; runtime still gated by `CODE_EXECUTOR=model_patch` |
| **CI** | B-AUDIT.2/3 applied; p13a structure fixed; STATUS markers restored |
| **Поставка** | **Deployed** 2026-10-16 ≈09:00 CEST · `https://e-production-5cc8.up.railway.app` · health `version":"47"` · commit **`2bdd6ae96ce3`** |

## Аудит / патчи

- B-AUDIT → B-AUDIT.3: CI structure + version sync + STATUS contracts.
- Export UX: **EN until separate patch**. UX1 approved.
- **Следующий шаг владельца: MANUAL1** (пошагово — `docs/OWNER_OPS.md` § MANUAL1).

## 2. Следующее

| # | ID | Что | Owner |
| --- | --- | --- | --- |
| 1 | **MANUAL1** | Приёмка на production (см. OWNER_OPS) | Владелец |
| — | GitHub write | **Отложено** (ADR-06) | Owner |

## 3. Нельзя без команды

Server execution; silent GitHub main; откат extract/ChangeSet; GitHub App write.

## 4. Открытые вопросы

1. UX1 утверждено.
2. Export UX: **closed** — EN until separate patch.

*STATUS*
