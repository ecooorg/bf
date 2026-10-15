# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-15 · **P45 (UI1 deploy + ui-check)**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **Файлы** | P34–P39 workspace line; P41/P45 UI1 start screen in `App.tsx` |
| **UI1** | **P45:** три карточки Simple/Expert/Project после входа; More → Change mode; ui-check ждёт выбор режима |
| **QA1** | P42 offline suite; P44 CI wiring |
| **Code Delivery** | RM-C3 closed (P43): `model_patch` authorized |
| **Поставка** | P40: `bf-PNN.zip` |

## 2. Следующее

| # | ID | Что | Owner |
| --- | --- | --- | --- |
| 1 | **Deploy** | Залить P45 (`App.tsx` + `ui-check`) на main → дождаться зелёного ui-check | Upload |
| 2 | **QA1** | Прогон на целевой среде | `test:qa1` / check |
| 3 | **MANUAL1** | Живая приёмка | Владелец |
| — | GitHub write | Отложено | ADR-06 |

## 3. Нельзя без команды

Server execution; silent GitHub main; откат extract/ChangeSet; GitHub App write.

## 4. Открытые вопросы

1. UX1: утверждено — старт Simple / Expert / Project; Project disabled явно.
2. Export UX: подписи на других языках?

*STATUS*
