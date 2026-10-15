# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-15 · **v41 + P43 (RM-C3 model_patch enablement)**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **Файлы** | P34–P39: ingest, extract, ChangeSet, unified attach, export; P39 hardens tar duplicate-path handling; P41 adds explicit Simple/Expert/Project start screen |
| **UX1** | В проде (v38); решение принято: стартовый экран с тремя карточками |
| **Режимы** | UI1: явный стартовый выбор Simple/Expert/Project; недоступный Project отображается явно |
| **QA1** | P42: offline сквозной набор; требуется прогон на целевой среде |
| **Code Delivery** | **RM-C3 закрыт (P43):** `model_patch` authorized after ADR-10 / E-01; owner command 2026-10-15. Runtime enablement = Railway `CODE_EXECUTOR=model_patch` |
| **Поставка патчей** | P40 process-only: обязательный проверенный `bf-PNN.zip` |

## 2. Следующее

| # | ID | Что | Owner кроме CI? |
| --- | --- | --- | --- |
| 1 | **QA1** | Прогон offline suite на целевой среде | `npm run test:qa1` / `check` |
| 2 | **MANUAL1** | Живая приёмка mode-инициативы | Время владельца |
| 3 | **Ops** | Подтвердить Railway: `CODE_EXECUTOR=model_patch` (если ещё не стоит) | Владелец, Variables |
| — | GitHub write | Отложено (App write / `GITHUB_DIFF_UPLOAD`) | Отдельная команда + ADR-06 |

## 3. Нельзя без команды

Server execution; silent GitHub main; откат extract/ChangeSet; GitHub App write rights.

## 4. Открытые вопросы

1. UX1: решение утверждено — стартовый экран Simple / Expert / Project; Project явно disabled, автоматического переключения нет, внутренние номера этапов не показываются.
2. Export UX: нужны ли подписи на других языках?

*STATUS*
