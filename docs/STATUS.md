# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-15 · **v40 (P39 File-work security)**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **Файлы** | P34–P39: ingest, extract, ChangeSet, unified attach, export; P39 hardens tar duplicate-path handling |
| **UX1** | В проде (v38); владелец может оставить/убрать по feedback |
| **Режимы** | Expert open chat (UX1); UI1 старт-выбор — ещё в очереди |
| **Поставка патчей** | P40 process-only: обязательный проверенный `bf-PNN.zip`; `.patch`/`.diff` не заменяет архив |

## 2. Следующее

| # | ID | Что | Owner кроме CI? |
| --- | --- | --- | --- |
| 1 | **UI1** | Старт-выбор режимов + доработка UX | Команда «делай UI1» |
| 2 | **MANUAL1** | Живая приёмка | Время с UI |
| 3 | — | — | — |
| — | GitHub write | Отложено | Команда + ADR |

## 3. Нельзя без команды

Server execution; silent GitHub main; откат extract/ChangeSet.

## 4. Открытые вопросы

1. UX1 feedback?
2. Export UX: нужны ли подписи на других языках?

*STATUS*
