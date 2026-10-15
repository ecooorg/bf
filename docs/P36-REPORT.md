# P36 — отчёт о патче

## Что сделано

- Парсер `changeSetParse.ts`: ChangeSet из fenced JSON / structured object.
- Карточка `WorkspaceChangeSetCard`: diff, violations, confirm CI/lock, **Apply / Reject / Rollback**.
- Версия Workspace **не** меняется до успешного Apply; validate не пишет blob.
- Rollback создаёт **новую** версию с манифестом целевой (история не переписывается).
- App передаёт proposed ChangeSet из `data.reply`, если в ответе найден JSON ChangeSet.
- Документация: §15 в `BiForge_TZ_P26.md` — параллельные ТЗ + «поздний зелёный CI закрывает ранние gate».
- `test:p36`; product version 36.

## Проверки

- Требуется CI: `test:p36`, `test:p35`, `test:p34`, `test:p26b`, typecheck, build, check.

## Ограничения

- Export zip/diff — P37.
- Серверная версионность Project Mode UX — отдельно.
- Модель должна отдавать ChangeSet в JSON; свободный prose без JSON не предлагает карточку.
