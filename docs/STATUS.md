# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-15 · **v41 (UI1 mode start screen)**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **Файлы** | P34–P39: ingest, extract, ChangeSet, unified attach, export; P39 hardens tar duplicate-path handling; P41 adds explicit Simple/Expert/Project start screen |
| **UX1** | В проде (v38); решение принято: стартовый экран с тремя карточками |
| **Режимы** | UI1: явный стартовый выбор Simple/Expert/Project; недоступный Project отображается явно |
| **Поставка патчей** | P40 process-only: обязательный проверенный `bf-PNN.zip`; `.patch`/`.diff` не заменяет архив |

## 2. Следующее

| # | ID | Что | Owner кроме CI? |
| --- | --- | --- | --- |
| 1 | **UI1** | Стартовый выбор Simple / Expert / Project и Expert open dialogue | Реализовано в P41; требуется проверка |
| 2 | **QA1** | Сквозные автоматические тесты режимов и UI | После UI1; закрыть автоматические проверки |
| 3 | **MANUAL1** | Живая приёмка | После QA1; время владельца |
| — | GitHub write | Отложено | Команда + ADR |

## 3. Нельзя без команды

Server execution; silent GitHub main; откат extract/ChangeSet.

## 4. Открытые вопросы

1. UX1: решение утверждено — стартовый экран Simple / Expert / Project; Project явно disabled, автоматического переключения нет, внутренние номера этапов не показываются.
2. Export UX: нужны ли подписи на других языках?

*STATUS*
