# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-16 · **P47 (mode controls only in More); аудит A — PARTIAL**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **UI1** | Карточки после входа; **P47:** нет кнопки Expert/Simple в шапке — режимы только через **More** (Mode selection / Switch to Expert|Simple / Project) |
| **QA1** | P42 offline |
| **Code Delivery** | RM-C3 closed (P43); `model_patch` authorized, runtime still gated by `CODE_EXECUTOR=model_patch` |
| **Поставка** | P40: `bf-PNN.zip` |

## Аудит готовности (2026-10-16, информационный AUDIT-A1)

- **Этап A — IN PROGRESS / PARTIAL**: read-only проверка архива `bf-v40.zip`; исходники и продуктовая версия не менялись. Детали и доказательства: запись `AUDIT-A1` в `docs/PATCH_JOURNAL.md`.
- Подтверждено локально: `node --test tests/p41-ui1.test.mjs tests/p43-rm-c3.test.mjs tests/version-check.test.mjs` — **14/14 PASS**; `node scripts/check-docs.mjs` — **PASS**, 113 Markdown / 406 путей.
- Не подтверждено: полный CI для конкретного SHA, build, PostgreSQL, Playwright, live AI, staging deploy P47 и MANUAL1. Слова владельца «CI зелёный» не заменяют журналов CI.
- Матрица из 764 строк — **кандидаты требований**, а не 764 доказанных действующих обязательства; ссылки на код/тесты в ней предварительные. Подтверждённых отсутствующих обязательных функций пока нет.
- **Не начинать этап B или C автоматически**: требуются отдельная команда и разрешения владельца. Этот информационный патч не является приёмкой QA1/MANUAL1 и не разрешает deploy/запись в GitHub.

## 2. Следующее

| # | ID | Что | Owner |
| --- | --- | --- | --- |
| 1 | **Deploy** | P47 | Upload |
| 2 | **QA1** / **MANUAL1** | Прогон и приёмка | Владелец |
| — | GitHub write | Отложено | ADR-06 |

## 3. Нельзя без команды

Server execution; silent GitHub main; откат extract/ChangeSet; GitHub App write.

## 4. Открытые вопросы

1. UX1 утверждено.
2. Export UX: подписи на других языках?

*STATUS*
