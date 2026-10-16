# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-16 · **v47 / P47; B-AUDIT.2; version sync restored**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **Version** | **47** (`APP_VERSION` = patch ID) |
| **UI1** | Карточки Simple / Expert / Project; **P47:** mode controls только через **More** |
| **QA1** | Offline suite PASS; end-to-end runtime не доказан → далее **MANUAL1** |
| **Code Delivery** | **RM-C3** closed (**P43**); `model_patch` authorized; runtime still gated by `CODE_EXECUTOR=model_patch` |
| **CI** | B-AUDIT.2: audit artifacts in `ARCHIVE/` (flat). Residual `AUDIT/` / `docs/AUDIT/` must be deleted if present. |
| **Поставка** | Deploy v47 — owner |

## Аудит / патчи

- **B-AUDIT.2:** `docs/AUDIT/*` → `ARCHIVE/bf_v40_*` (preflight forbids nested under `docs/`).
- **B-AUDIT:** version 40→47; top-level `AUDIT/` removed.
- Export UX: **EN until separate patch** (owner decision). UX1 approved.

## 2. Следующее

| # | ID | Что | Owner |
| --- | --- | --- | --- |
| 1 | **CI** | Confirm green after B-AUDIT.2 | Owner (log) |
| 2 | **Deploy** | v47 staging | Owner |
| 3 | **MANUAL1** | Acceptance after QA1 evidence | Owner |
| — | GitHub write | **Отложено** (ADR-06) | Owner |

## 3. Нельзя без команды

Server execution; silent GitHub main; откат extract/ChangeSet; GitHub App write.

## 4. Открытые вопросы

1. UX1 утверждено.
2. Export UX: **closed** — EN until separate patch.

*STATUS*
