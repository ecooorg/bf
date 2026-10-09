# BX-06 — отчёт реализации

Статус: IMPLEMENTED, NOT ACCEPTED (runtime verification pending).

## Реализовано

- Project Mode добавлен как отдельный переключаемый экран; Simple Mode продолжает использовать существующее клиентское состояние и localStorage.
- Project Mode выключен по умолчанию через `ENABLE_PROJECT_MODE=false`.
- При `ENABLE_PROJECT_MODE=true` запуск требует `APP_PASSWORD`, `SESSION_SECRET` длиной не менее 16 символов и `DATABASE_URL`.
- Добавлены API списка и создания проектов, получения проекта, обновления State с `expectedVersion` и просмотра версий.
- Мутации Project Mode требуют заголовок `Origin` того же источника.
- API Project Mode использует DB-backed rate limit; при недоступности rate limiter запрос завершается 503 (fail closed).
- Добавлен структурный контрактный тест BX-06.

## Проверки, выполненные в этой среде

- `node --test tests/bx06-contract.test.mjs` — PASS, 4/4.
- `node scripts/check-docs.mjs` — PASS.
- ZIP исходного архива — PASS.

## Не подтверждено; этап не принимать

- `npm ci` не завершился: процесс установки превысил доступное время. В lock-файле отсутствует запись пакета `node_modules/pg`, хотя `pg` объявлен в корневых зависимостях. Синхронизация lock-файла НЕ выполнена.
- `npm run check`, `typecheck`, `build`, UI-тесты и интеграционные тесты с PostgreSQL не запускались, поскольку зависимости не установлены.
- Не проверены живые маршруты, cookie-auth, миграция на реальной БД, отказ при недоступности БД и сохранение состояния после рестарта.
- Перед включением Project Mode требуется синхронизировать `package-lock.json`, подтвердить `npm ci`, применить `npm run db:migrate` и пройти полный check с PostgreSQL.

## Итог

BX-06 код реализован предварительно, но критерии приёмки ТЗ не доказаны. Не включать `ENABLE_PROJECT_MODE=true` в production до завершения перечисленных проверок. Это не утверждение о наличии runtime-дефекта: эти сценарии пока не проверены.
