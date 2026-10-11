# P13b — отчёт по оптимизации сборки патчей

## Статус
`PARTIAL` — изменения внесены; полные тесты и production build не запускались, так как в окружении отсутствует `node_modules`.

## Цель и результат
- Сборщик выполняет preflight и создаёт/проверяет ZIP до длительных проверок.
- Ошибки, таймауты и пропущенные проверки больше не отменяют архив, если preflight пройден.
- Каждый этап получает отдельный статус и лог; итог `PARTIAL` не означает готовность к развёртыванию.
- Проверки из `package.json` запускаются независимо в `patch:pack` и CI.
- CI имеет общий предел времени, пределы для отдельных этапов и продолжает независимые этапы после неудачи.
- Обновлены stop-правила агента, `docs/NEXT.md` и описание процесса.

## Проверки, фактически выполненные в этом окружении
| Команда | Результат | Примечание |
|---|---|---|
| `find scripts tests -type f -name '*.mjs' -print0 \| xargs -0 -n1 node --check` | PASS | Синтаксис всех `.mjs` в `scripts/` и `tests/` проверен |
| `bash -n tests/run.sh` | PASS | Проверен синтаксис оболочки |
| `node -e "JSON.parse(...package.json...)"` | PASS | `package.json` корректно разбирается |
| `node scripts/check-docs.mjs` | PASS | Ссылки и пути в Markdown проверены |
| `npm run check` / тесты P13a | NOT_RUN | Нет `node_modules` |
| `npm run build` | NOT_RUN | Нет `node_modules` |
| Живые тесты PostgreSQL | NOT_RUN | Не запускались в этом окружении |

## Изменённые области
- `scripts/patch-pack.mjs`, `scripts/patch-tools.mjs`: ZIP до проверок, проверка содержимого ZIP, отдельные таймауты/логи, корректный `PARTIAL`.
- `scripts/run-independent-checks.mjs`, `.github/workflows/ci.yml`: независимые CI-проверки с ограничением времени и итоговой сводкой.
- `tests/p13a-acceptance.test.mjs`: обновлены ожидания статусов и добавлен сценарий «ошибка проверки, архив всё равно создан».
- `AGENTS.md`, `docs/NEXT.md`, `docs/P13a-SPEC.md`, `docs/P13b-SPEC.md`, `docs/REPO_MAP.md`, `docs/START_HERE.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`, `.gitignore`: правила, документация и исключение временных файлов.

## Не сделано и известные ограничения
- Полный `npm run check`, тесты P13a и `npm run build` не запускались из-за отсутствия зависимостей.
- CI не запускался; реальный результат CI можно подтвердить только после загрузки архива и выполнения workflow.
- Функциональная реализация воркера и маршрутов P13b не менялась: этот патч касается процесса сборки.
- Удалённые файлы по текущим правилам по-прежнему перечисляются в отчёте и удаляются владельцем вручную; они не включаются в ZIP.

## Действия владельца
1. Загрузить обновлённый проект в репозиторий и дождаться GitHub Actions.
2. Проверить итог CI и логи упавших этапов; `PARTIAL` не считать разрешением на развёртывание.
3. Если CI зелёный, выполнить стандартную проверку `/health` и затронутого пользовательского сценария на Railway.


## Cumulative implementation addendum (P13b + P15, 2026-10-11)

The cumulative patch adds the product integration that the original report explicitly left out:
- Project Mode routes for plans, approvals, budgets, task queueing and validation;
- UI controls for plan/approval/task lifecycle;
- worker startup from `server.ts` under configured Project Mode;
- per-call budget guard in the worker's `runAnalysis` path;
- usage ledger entries linked to persisted Task Graph Run IDs;
- worker outputs stored as versioned Artifact Registry objects;
- P15 static acceptance tests.

This does not supersede the original check results: dependencies could not be installed in the patching environment, so full typecheck/build and live PostgreSQL/provider acceptance remain `NOT_RUN`. The consolidated report is `docs/P15-REPORT.md`; P15/G2 and E-01 remain open until real evidence is recorded.
