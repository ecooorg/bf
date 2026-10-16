# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-16 · **v47 / P47; B-AUDIT applied; version sync restored**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **Version** | **47** (`APP_VERSION` = patch ID; sync restored after drift at 40) |
| **UI1** | Карточки после входа; **P47:** mode controls только через **More** |
| **QA1** | Offline **12/12 PASS**; end-to-end runtime не доказан |
| **Code Delivery** | RM-C3 closed (P43); `CODE_EXECUTOR=model_patch` |
| **CI** | B-AUDIT: top-level `AUDIT/` убран → ожидается green на `test:p13a` (подтвердить логом) |
| **Поставка** | Deploy P47 — ожидает владельца |

## Аудит / последние патчи

- **B-AUDIT (2026-10-16):** `AUDIT/*` → `docs/AUDIT/`; ссылки в `BiForge_Audit.md` обновлены; top-level `AUDIT/` удалён (фикс A-10 / p13a preflight).
- **Version sync:** `src/config.ts`, `package.json`, `package-lock.json`, `README.md`, `DEPLOY_RAILWAY.md`, `CHANGELOG_AGENT_BEHAVIOR.md` → **47** (AGENTS: с P19 версия = номер патча; после P39 номер застрял на 40).
- Export UX: **EN до отдельного патча** (закрыто).
- Этап A — PARTIAL (матрица не полностью нормализована). Этап B — только B-AUDIT выполнен. C / MANUAL1 — владелец.

## 2. Следующее

| # | ID | Что | Owner |
| --- | --- | --- | --- |
| 1 | **CI** | Подтвердить green после B-AUDIT | Владелец (лог) |
| 2 | **Deploy** | P47 / v47 на staging | Владелец |
| 3 | **MANUAL1** | Приёмка | Владелец |
| — | GitHub write | Отложено | ADR-06 |

## 3. Нельзя без команды

Server execution; silent GitHub main; откат extract/ChangeSet; GitHub App write.

## 4. Открытые вопросы

1. UX1 утверждено.
2. Export UX: **закрыто** — EN до отдельного патча.

*STATUS*
