# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-16 · **P47 (mode controls only in More); аудит A — PARTIAL (A2)**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **UI1** | Карточки после входа; **P47:** нет кнопки Expert/Simple в шапке — режимы только через **More** (Mode selection / Switch to Expert|Simple / Project) |
| **QA1** | P42 offline; **A2:** offline suite **12/12 PASS** (не end-to-end runtime) |
| **Code Delivery** | RM-C3 closed (P43); `model_patch` authorized, runtime still gated by `CODE_EXECUTOR=model_patch` |
| **Поставка** | P40: `bf-PNN.zip` |

## Аудит готовности (2026-10-16, AUDIT-A1 + AUDIT-A2)

- **Этап A — IN PROGRESS / PARTIAL**: read-only по продукту; в A2 исправлены только битые ссылки в `docs/BiForge_Audit.md` (sandbox: → `../AUDIT/…`). Исходники, тесты продукта, версия **не** менялись. Детали: `docs/PATCH_JOURNAL.md` (AUDIT-A1, AUDIT-A2), `docs/BiForge_Audit.md`, `AUDIT/bf_v40_stage_A_report.md`.
- Подтверждено локально (A2): `node --test tests/p41-ui1.test.mjs tests/p43-rm-c3.test.mjs tests/version-check.test.mjs` — **14/14 PASS**; `node --experimental-strip-types --test tests/qa1.test.mjs` — **12/12 PASS**; `node scripts/check-docs.mjs` — **PASS** (после фикса 4 ссылок).
- P47 source подтверждён: mode controls только в More; start-mode cards на месте.
- Не подтверждено: полный CI для конкретного SHA, `npm run check`/`build`, Playwright, PostgreSQL, live AI, staging deploy P47, MANUAL1. Слова «CI зелёный» не заменяют журналов CI.
- Матрица 764 — **кандидаты**; Out-of-scope/исторические пункты ещё не нормализованы. Подтверждённых отсутствующих обязательных функций нет.
- **Не начинать этап B или C автоматически**: нужны отдельная команда и разрешения владельца. Информационные патчи не являются приёмкой QA1/MANUAL1 и не разрешают deploy/запись в GitHub.

## 2. Следующее

| # | ID | Что | Owner |
| --- | --- | --- | --- |
| 1 | **Deploy** | P47 | Upload |
| 2 | **QA1** / **MANUAL1** | Прогон (в т.ч. end-to-end) и приёмка | Владелец |
| — | GitHub write | Отложено | ADR-06 |

## 3. Нельзя без команды

Server execution; silent GitHub main; откат extract/ChangeSet; GitHub App write.

## 4. Открытые вопросы

1. UX1 утверждено.
2. Export UX: подписи на других языках?

*STATUS*
