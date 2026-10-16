# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-16 · **P47; аудит A — PARTIAL (A3); CI RED (p13a / AUDIT/)**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **UI1** | Карточки после входа; **P47:** mode controls только через **More** |
| **QA1** | Offline **12/12 PASS** (A2/A3); end-to-end runtime не доказан |
| **Code Delivery** | RM-C3 closed (P43); `CODE_EXECUTOR=model_patch` |
| **CI (main)** | **RED** — 64 PASS, **1 FAIL**: `test:p13a` (top-level `AUDIT/`) |
| **Поставка** | P40: `bf-PNN.zip`; Deploy P47 — ожидает владельца |

## Аудит готовности (A1 → A3, 2026-10-16)

- **Этап A — IN PROGRESS / PARTIAL.** Продукт/версия не менялись в A1–A3 (кроме docs).
- **CI logs** (`logs_105299845117.zip`, job ~2026-10-16T05:27–05:31, `ecooorg/bf` main):
  - Independent checks: **64 PASS, 1 FAIL** (`test:p13a`: *the real repository passes the preflight*).
  - Причина FAIL: top-level folder **`AUDIT/`** (5 файлов) — preflight требует flat structure.
  - Live PostgreSQL: **66/66 PASS**.
  - Project Mode API security: **1/1 PASS**.
  - Build: **PASS** (vite + tsc server).
  - Gitleaks: **no leaks**.
  - Итог job: `CI: red. First failed: the real repository passes the preflight (no false positives)`.
- Локально (A2/A3): p41+p43+version **14/14**, qa1 offline **12/12**, check-docs **PASS** (после фикса ссылок в A2).
- `npm ci` в этой среде: **PARTIAL** (Node v24 vs required `>=22.12 <23`; полный install не завершён за разумное время). Авторитет — CI-логи.
- **Подтверждённый дефект A-10 (блокирует CI):** top-level `AUDIT/`. Исправление = перенос в `docs/AUDIT/` или `ARCHIVE/` → **этап B**, нужна команда владельца.
- Export UX: **решение владельца 2026-10-16 — оставить EN до отдельного патча** (закрыто).
- **Не начинать B** без команды. Deploy / MANUAL1 — владелец.

## 2. Следующее

| # | ID | Что | Owner |
| --- | --- | --- | --- |
| 1 | **B-AUDIT** (опц.) | Перенести `AUDIT/*` → `docs/AUDIT/` (или ARCHIVE), чтобы CI green | Команда владельца |
| 2 | **Deploy** | P47 на staging | Владелец |
| 3 | **MANUAL1** | Приёмка | Владелец |
| — | GitHub write | Отложено | ADR-06 |

## 3. Нельзя без команды

Server execution; silent GitHub main; откат extract/ChangeSet; GitHub App write; этап B (правки кода/структуры).

## 4. Открытые вопросы

1. UX1 утверждено.
2. Export UX: **закрыто** — EN до отдельного патча.

*STATUS*
