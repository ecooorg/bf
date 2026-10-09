# BX-05 — базовые контракты (отчёт реализации)

## Статус
**IMPLEMENTED — acceptance не подтверждён полностью.** BX-05 ★ добавляет базовые схемы и классы ошибок, но шаг нельзя считать принятым, пока тесты не выполнены в окружении с установленными зависимостями и не пройдёт обязательная проверка CI/владельца.

## Добавлено
- `server/contracts.ts`: ID, Actor, Project, State, ProjectEvent, NormalizedRequest/NormalizedResponse; строгие схемы там, где форма контракта фиксирована.
- Стабильная базовая иерархия `BiForgeError` и классы `ValidationError`, `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `RateLimitedError`, `UnavailableError`.
- `tests/contracts.test.mjs`: позитивные и негативные проверки ID, Project, State, событий, нормализованных запросов/ответов и классов ошибок.
- `npm run test:contracts` включён в `npm run check`.

## Границы
- Не добавлялись контракты Task, Run, Artifact или Model: по TZv3 они вводятся шагами-потребителями.
- На момент реализации BX-05 контракты не были подключены к API. В последующем патче BX-06 добавлены строгие схемы запросов Project Mode; приёмка остаётся отдельной.
- State намеренно остаётся непрозрачным JSON-объектом до появления потребителя с доменной схемой.

## Проверки и ограничения
- `NOT_RUN`: `npm ci`, `npm run check`, runtime-тесты TypeScript — в текущей среде нет установленного `node_modules`, а доступ к npm registry ранее завершался `EAI_AGAIN`.
- Требуется синхронизировать `package-lock.json` с зависимостями предыдущего шага BX-04 (`pg`) и подтвердить `npm ci`; не считать этот архив production-ready до зелёного CI.
- BX-03.b ручной UI baseline остаётся отдельным незавершённым gate; этот шаг его не подменяет.

## Следующий шаг
Владелец/CI выполняет `npm ci && npm run check`, проверяет тесты контрактов и принимает BX-05 отдельно. Затем — BX-06 по явной команде владельца.
