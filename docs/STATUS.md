# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-15 · **v41 + P42 (QA1 offline suite)**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **Файлы** | P34–P39: ingest, extract, ChangeSet, unified attach, export; P39 hardens tar duplicate-path handling; P41 adds explicit Simple/Expert/Project start screen |
| **UX1** | В проде (v38); решение принято: стартовый экран с тремя карточками |
| **Режимы** | UI1: явный стартовый выбор Simple/Expert/Project; недоступный Project отображается явно |
| **QA1** | P42: offline сквозной набор (classification, soft-fail, Expert/Project isolation, UI cards, contracts) |
| **Поставка патчей** | P40 process-only: обязательный проверенный `bf-PNN.zip`; `.patch`/`.diff` не заменяет архив |

## 2. Следующее

| # | ID | Что | Owner кроме CI? |
| --- | --- | --- | --- |
| 1 | **QA1** | Сквозные автоматические тесты режимов и UI | Реализовано offline в P42; требуется прогон `npm run check` / `test:qa1` на целевой среде |
| 2 | **MANUAL1** | Живая приёмка | После подтверждения QA1; время владельца |
| — | GitHub write | Отложено | Команда + ADR |

## 3. Нельзя без команды

Server execution; silent GitHub main; откат extract/ChangeSet.

## 4. Открытые вопросы

1. UX1: решение утверждено — стартовый экран Simple / Expert / Project; Project явно disabled, автоматического переключения нет, внутренние номера этапов не показываются.
2. Export UX: нужны ли подписи на других языках?

*STATUS*
