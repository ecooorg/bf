# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-15 · **v41 + P44 (CI hotfix for P42/P43)**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **Файлы** | P34–P39: ingest, extract, ChangeSet, unified attach, export; P39 hardens tar; P41 UI1 start screen |
| **UX1** | В проде (v38); решение принято: стартовый экран с тремя карточками |
| **Режимы** | **UI1**: явный стартовый выбор Simple/Expert/Project; Project disabled явно |
| **QA1** | P42 offline suite; P44 CI wiring (REPO_MAP, tsx, STATUS markers) |
| **Code Delivery** | **RM-C3 закрыт (P43):** `model_patch` authorized (ADR-10 / E-01). Runtime: `CODE_EXECUTOR=model_patch` |
| **Поставка патчей** | P40: обязательный `bf-PNN.zip` |

## 2. Следующее

| # | ID | Что | Owner кроме CI? |
| --- | --- | --- | --- |
| 1 | **QA1** | Прогон suite на целевой среде после зелёного CI | `npm run test:qa1` / `check` |
| 2 | **MANUAL1** | Живая приёмка mode-инициативы | Время владельца |
| 3 | **Ops** | Подтвердить Railway `CODE_EXECUTOR=model_patch` | Владелец |
| — | GitHub write | Отложено | Команда + ADR-06 |

## 3. Нельзя без команды

Server execution; silent GitHub main; откат extract/ChangeSet; GitHub App write rights.

## 4. Открытые вопросы

1. UX1: решение утверждено — стартовый экран Simple / Expert / Project; Project явно disabled, автоматического переключения нет, внутренние номера этапов не показываются.
2. Export UX: нужны ли подписи на других языках?

*STATUS*
