# BiForge: подключения (Приложения D и E ТЗ v3.0)

*Нормативное руководство: карточки подключений, манифест `connectors.yaml` (E.6), проверка `npm run verify:connections`, диагностика, внешние факты. Часть ТЗ v3.1 (индекс — `docs/BiForge_TZ_v3.md`). Рабочая англоязычная сводка для агентов — `docs/CONNECTIONS.md` (тест `tests/connections.test.mjs` сверяет её с `connectors.yaml`); при расхождении приоритет у этого файла.*

---

## Приложение D. Внешние факты

Основная часть ТЗ не опирается на непроверенные внешние факты (п. 3.1). Подтверждённые 9 октября 2026 по документации Google факты о Gemini API (биллинг через Cloud Billing; на платном уровне промпты и ответы не используются для улучшения продуктов Google; лимиты расходов задаются на уровне платёжного аккаунта и проекта; предоплата для аккаунтов разработчиков) — в E.8. Факты о Jules (лимиты, условия доступа, REST API `v1alpha`) и Mistral, собранные при подготовке v2.0, сохранены в F как исторические; в основной части они не используются.

Не проверено и подлежит проверке при подключении (A-01, A-02, A-05…A-10): квоты и биллинг Gemini API относительно подписки Google AI Pro; условия использования данных каждого дополнительного провайдера; лимиты GitHub Actions для выбранной видимости репозиториев; параметры резервного копирования Railway PostgreSQL; качество `model_patch` (E-01).

## Приложение E. Руководство по подключению моделей и сервисов

Нормативное руководство: как подключить Gemini, любого дополнительного провайдера моделей, GitHub и Railway так, чтобы человек выполнил его по шагам, а модель или скрипт проверили результат без догадок. Подключения Jules и Mistral вынесены в Приложение F. Дата проверки внешних фактов — 9 октября 2026.

### E.0. Как пользоваться (человек и модель)

Руководство состоит из трёх слоёв, которые MUST совпадать друг с другом:

1. **Карточки подключений (E.1–E.5)** — шаги для человека и правила для модели.
2. **Манифест `connectors.yaml` (E.6)** — единственный машиночитаемый источник имён переменных, адресов и проверок. Тест в CI сравнивает его с таблицами карточек.
3. **Проверка `npm run verify:connections` (E.6)** — детерминированный скрипт без вызова LLM, возвращает JSON-статусы.

В репозитории лежат `docs/CONNECTIONS.md` (копия этого приложения) и `connectors.yaml`. Заготовки создаются в BX-01.b, наполняются в BX-10.b и дополняются в BX-12.a, BX-19, BX-21.a. Изменение подключения без обновления обоих файлов в том же PR не принимается (пункт чек-листа ревью 16.6).

**Метки шагов.** **\[ЧЕЛОВЕК\]** — только человек (аккаунты, платежи, ключи, права). **\[АВТО\]** — выполняет скрипт или модель. **\[ПОЛУАВТО\]** — модель готовит команду или текст, человек выполняет и подтверждает.

**Статусы проверки.** `OK`; `FAIL(причина)` — проверка выполнена и не пройдена; `BLOCKED(причина)` — не хватает входов или прав; `DRIFT` — реальность расходится с инструкцией; `NOT_RUN`.

**Правила для моделей** (автоматический и полуавтоматический режим):

- **R1. Секреты.** Не запрашивать, не выводить, не логировать и не коммитить значения секретов. Работать только с именами переменных; о значении сообщать лишь `present: true|false`.
- **R2. Границы.** Создание аккаунтов, ключей, платёжных настроек, лимитов расходов и прав GitHub — только \[ЧЕЛОВЕК\]. Нет ключа → `BLOCKED(missing_secret:ИМЯ_ПЕРЕМЕННОЙ)`, остановка и запрос человеку.
- **R3. Доказательство.** Шаг выполнен только после проверки E.6 со статусом `OK` и записи результата (время, статус). Фраза «ключ добавлен» доказательством не является.
- **R4. Без импровизации.** Если ответ сервиса не совпадает с описанием (другой URL, поле, код ответа, название кнопки) → `DRIFT`: остановиться, приложить код ответа и фрагмент тела без секретов, сослаться на официальную документацию. Исправление руководства — отдельный PR с ревью человека.
- **R5. Допуск моделей.** Модель из Registry доступна Router только при статусе `OK` последней проверки и `last_verified_at` не старше 90 дней.
- **R6. Экономия.** Проверка не создаёт веток, PR и запусков исполнителей и делает не более одного короткого вызова на модель.
- **R7. Данные.** Реальные данные проектов отправляются только провайдеру с подтверждённым платным планом и отключённым обучением на данных (E.1, E.2). Признаки `data_policy` и `training_opt_out_confirmed` в Registry ставит только человек.

### E.0.1. Карта подключений

| ID | Сервис | Назначение | Переменные окружения | Нужно к шагу |
| --- | --- | --- | --- | --- |
| `gemini` | Gemini API | Базовый провайдер | `GEMINI_API_KEY` (платный проект); `GEMINI_API_KEY_FREE` (необязательно, только синтетические данные) | BX-10.b |
| `<provider_id>` | Дополнительный провайдер (любой) | `cross_model`, fallback, `code_author` | `<ID>_API_KEY`, `<ID>_PLAN` (`free` или `paid`) | BX-12.a |
| `postgres` | PostgreSQL на Railway | Хранилище | `DATABASE_URL` | BX-04 |
| `app` | Вход и сессии | Защита Project Mode | `APP_PASSWORD`, `SESSION_SECRET`, `ENABLE_APP_AUTH` | BX-06 |
| `github` | GitHub App | PR, check runs, webhook, ветки `biforge/*` | `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` | BX-19 |
| `code_executor` | Исполнитель кода | Режим `manual` или `model_patch` | `CODE_EXECUTOR` (`manual` по умолчанию) | BX-21.a |

### E.1. Gemini API (Google)

**Назначение.** Основной исполнитель, адаптер `gemini`. В текущем BE уже используются пакет `@google/genai` и переменная `GEMINI_API_KEY`; имя переменной сохраняется.

**Что важно знать**

- Gemini API оплачивается через Google Cloud Billing, а не через подписку Google AI Pro. В документации API подписка не названа источником квоты, поэтому не рассчитывать на неё и подтвердить в консоли (A-01).
- Новые проекты начинают на бесплатном уровне, где Google может использовать содержимое для улучшения своих продуктов. На платном уровне промпты и ответы для этого не используются (документация Google, проверено 9 октября 2026).

**Шаги**

1. **\[ЧЕЛОВЕК\]** Открыть Google AI Studio (aistudio.google.com), страницу API keys.
2. **\[ЧЕЛОВЕК\]** Создать проект (или импортировать существующий проект Google Cloud) и создать ключ. Назвать проект `biforge-prod`.
3. **\[ЧЕЛОВЕК\]** Для реальных данных: у проекта в колонке Billing Tier нажать Set up billing и привязать платёжный аккаунт. Google переводит аккаунты разработчиков на предоплату (Prepay), поэтому может потребоваться пополнение баланса.
4. **\[ЧЕЛОВЕК\]** Задать ежемесячный лимит расходов проекта: Gemini API поддерживает такие лимиты на уровне платёжного аккаунта и проекта. Значение записать в Passport проекта; приложение дополнительно ставит суточный потолок вызовов (раздел 14.4).
5. **\[ЧЕЛОВЕК\]** Добавить ключ в Railway: проект BiForge → сервис `e` → Variables → `GEMINI_API_KEY` (E.3). Не вставлять ключ в чат, Git и документы.
6. **\[ЧЕЛОВЕК, необязательно\]** Для синтетических тестов создать отдельный бесплатный проект и ключ `GEMINI_API_KEY_FREE`. Модели, вызываемые этим ключом, получают `data_policy = free` и не допускаются к реальным данным.
7. **\[ПОЛУАВТО\]** Получить список доступных моделей проверкой E.6 и предложить обновление Registry. Имена моделей не вписываются в код; изменение Registry — PR с одобрением человека. До BX-13.a действуют текущие `MODEL_CASCADE_LIGHT` и `MODEL_CASCADE_STRONG`.

**Проверка** (то же делает `verify:connections`):

```bash
# 1. Ключ рабочий, список моделей доступен: ожидается HTTP 200
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models?pageSize=5"

# 2. Короткий вызов выбранной модели: ожидается HTTP 200, текст в candidates[0], поле usageMetadata
curl -s -H "x-goog-api-key: $GEMINI_API_KEY" -H "Content-Type: application/json" \
  "https://generativelanguage.googleapis.com/v1beta/models/<MODEL_ID>:generateContent" \
  -d '{"contents":[{"parts":[{"text":"Ответь одним словом: ok"}]}],"generationConfig":{"maxOutputTokens":10}}'
```

**Критерий OK:** оба запроса вернули 200, во втором есть текст и `usageMetadata`.

**Разбор ответов:** 400 с сообщением о недействительном ключе → `PROVIDER_AUTH`; 403 → API недоступен проекту или региону (`PROVIDER_AUTH`); 429 → `PROVIDER_TRANSIENT` или `PROVIDER_QUOTA` (по тексту ответа); 503 → `PROVIDER_TRANSIENT`.

**Запись в Registry (формат seed):**

```yaml
provider_id: gemini
adapter: gemini
secret_env_ref: GEMINI_API_KEY
data_policy: paid          # paid | free; free только для ключа GEMINI_API_KEY_FREE
models:
  - model_id: <ВЗЯТЬ ИЗ СПИСКА ПРОВЕРКИ>   # не вписывать по памяти
    capabilities: [json_output]            # остальное — только после проверки
    last_verified_at: <дата проверки>
```

### E.2. Подключение дополнительного провайдера (шаблон)

**Назначение.** Подключить любого провайдера моделей, чтобы использовать его для проверки `cross_model`, fallback или роли `code_author`. Конкретный провайдер выбирает владелец (ADR-03). Ничего вендорского в код и схему не добавляется (D-13): добавляются запись в реестре и переменные окружения.

**Что важно знать (проверяется для каждого провайдера, A-08)**

- Ключ API и подписка на чат-интерфейс этого провайдера — разные вещи; для сервера нужен ключ API с биллингом.
- На бесплатных планах данные могут использоваться для улучшения моделей; для реальных данных — платный план с подтверждённым отказом от обучения. Точное название настройки и условия подтверждаются в интерфейсе и документации провайдера, не по памяти.
- Явно указывать версию модели; псевдонимы вида `*-latest` не использовать, так как они могут тихо переключиться на другую версию с другим поведением и ценой.
- Задать лимит расходов в консоли провайдера; в реестр записать фактические RPM/TPM.

**Шаги**

1. **\[ЧЕЛОВЕК\]** Зарегистрироваться в консоли провайдера и выбрать план (для синтетических данных — бесплатный, для реальных — платный).
2. **\[ЧЕЛОВЕК\]** Для реальных данных отключить использование данных для обучения и записать факт в реестр (`training_opt_out_confirmed: true`).
3. **\[ЧЕЛОВЕК\]** Создать ключ с понятным именем (`<id>-dev`, `<id>-prod`; для dev и prod — разные ключи) и задать лимит расходов.
4. **\[ЧЕЛОВЕК\]** Добавить в Railway переменные `<ID>_API_KEY` и `<ID>_PLAN`.
5. **\[ПОЛУАВТО\]** Выбрать адаптер по формату API провайдера: `openai-compatible` (если он следует формату Chat Completions) либо `anthropic` (формат Messages). Описать провайдера в seed реестра и в `connectors.yaml` по шаблонам ниже; модель в `disabled`.
6. **\[АВТО\]** Выполнить `verify:connections --only <id>`; при `OK` человек переводит модель в `active` и записывает `capabilities`, `rate_limit_policy`, `data_policy`, `last_verified_at`.

**Шаблон проверки для `openai-compatible`** (значения в угловых скобках берутся из документации провайдера; расхождения — `DRIFT`):

```bash
# 1. Ключ рабочий, список моделей: ожидается HTTP 200
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $<ID>_API_KEY" <BASE_URL>/models

# 2. Короткий вызов: ожидается HTTP 200, choices[0].message.content — валидный JSON, есть usage
curl -s <BASE_URL>/chat/completions -H "Authorization: Bearer $<ID>_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"<MODEL_ID>","messages":[{"role":"user","content":"Верни JSON {\"ok\":true}"}],"response_format":{"type":"json_object"},"max_tokens":20}'
```

**Шаблон проверки для `anthropic`** (формат по общеизвестной документации; подтверждается conformance-тестом и скриптом на `DRIFT`):

```bash
curl -s <BASE_URL>/v1/messages -H "x-api-key: $<ID>_API_KEY" \
  -H "anthropic-version: <ВЕРСИЯ_ИЗ_ДОКУМЕНТАЦИИ>" -H "Content-Type: application/json" \
  -d '{"model":"<MODEL_ID>","max_tokens":20,"messages":[{"role":"user","content":"Ответь одним словом: ok"}]}'
```

**Критерий OK:** оба запроса вернули 200; содержимое разбирается; `usage` присутствует.

**Типовой разбор ответов:** 401/403 → `PROVIDER_AUTH`; 400/422 → `INVALID_REQUEST`; 429 → `PROVIDER_TRANSIENT` либо `PROVIDER_QUOTA` (по тексту ответа); 5xx и таймаут → `PROVIDER_TRANSIENT`. Отличия провайдера от базового формата (имя параметра детерминизма, способ принудительного вызова инструмента, требования к JSON-режиму) описываются в `param_map`, `tool_choice_map`, `json_mode`, `error_map` и проверяются conformance-тестом.

**Шаблон записи (seed):**

```yaml
provider_id: <id>
adapter: openai-compatible         # или anthropic
base_url: <BASE_URL>
auth: {header: Authorization, scheme: Bearer, secret_env_ref: <ID>_API_KEY}
plan_env: <ID>_PLAN                # free | paid -> data_policy
chat_path: /chat/completions
models_path: /models
param_map: {}                      # отличия от базового формата
tool_choice_map: {}
json_mode: {kind: response_format, json_object_requires_prompt_instruction: false}
error_map: {401: PROVIDER_AUTH, 422: INVALID_REQUEST, 429: TRANSIENT_OR_QUOTA, 5xx: PROVIDER_TRANSIENT}
training_opt_out_confirmed: false  # ставит только человек
models:
  - model_id: <ВЗЯТЬ ИЗ СПИСКА МОДЕЛЕЙ ПРОВАЙДЕРА; явное имя, не *-latest>
    status: disabled
    role_hint: verifier
    capabilities: []               # только после проверки
    last_verified_at: <дата проверки>
```

**Роль в продукте.** Проверяющая модель обязана быть другого провайдера, чем исполнитель (п. 7.6). Если подключён один провайдер, проверка `cross_model` получает `NOT_RUN(no_second_provider)`. Конкретный готовый пример (Mistral) — F.2.

### E.3. Railway: переменные окружения и PostgreSQL

**Шаги**

1. **\[ЧЕЛОВЕК\]** В Railway открыть проект BiForge → окружение `production` → добавить сервис PostgreSQL (если его нет).
2. **\[ЧЕЛОВЕК\]** В сервисе `e` открыть Variables. Для `DATABASE_URL` использовать ссылку на переменную сервиса PostgreSQL (reference variable), а не копировать значение вручную.
3. **\[ЧЕЛОВЕК\]** Добавить остальные переменные из таблицы. Особо чувствительные значения допускается хранить как Sealed Variables (раздел 4.4); такие значения недоступны для `railway run`, и проверку для них выполняют в самом окружении Railway.
4. **\[ЧЕЛОВЕК\]** Для разработки завести отдельное окружение или локальный `.env` с **другими** ключами. Ключи production не используются в разработке.
5. **\[АВТО\]** Запустить `npm run verify:connections` (E.6) и сохранить JSON результата как артефакт проекта.

| Переменная | Обязательна | Назначение | Правило значения |
| --- | --- | --- | --- |
| `DATABASE_URL` | с BX-04 | PostgreSQL | Ссылка на переменную сервиса БД |
| `APP_PASSWORD` | да | Общий пароль входа | Длинная случайная фраза; не использовать значение из `.env.example` |
| `SESSION_SECRET` | да | Подпись cookie | 16 и более символов, случайная строка |
| `ENABLE_APP_AUTH` | да | Включение входа | `true` |
| `TRUST_PROXY_HOPS` | да | Число прокси перед приложением | `1` на Railway |
| `GEMINI_API_KEY` | да | Платный проект Gemini | Из E.1 |
| `GEMINI_API_KEY_FREE` | нет | Бесплатный проект, только синтетика | Из E.1 |
| `<ID>_API_KEY` | с BX-12.a | Ключ дополнительного провайдера | Из E.2; имя задаётся в seed реестра |
| `<ID>_PLAN` | с BX-12.a | `free` или `paid` | Определяет `data_policy` |
| `CODE_EXECUTOR` | с BX-21.a | `manual` или `model_patch` | По умолчанию `manual` (E.4) |
| `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` | с BX-19 | GitHub App | Из E.5 |
| `BIFORGE_PROJECTS_ORG` | с BX-19 | Организация для репозиториев проектов | `ecooorg` |
| `DAILY_CALL_CAP`, `MAX_MODEL_CALLS` | да | Потолки вызовов | Из раздела 14 |

**Правила.** Файл `.env.example` содержит только имена и пустые значения; `.env` остаётся в `.gitignore`. После изменения переменных Railway запускает новый деплой, после которого проверка E.6 выполняется заново. Ключ приватного ключа GitHub хранится одной строкой с экранированными переводами строк.

### E.4. Исполнитель кода

**Режим `manual`** (по умолчанию, `CODE_EXECUTOR=manual`): внешних подключений не требуется. Продукт формирует Task Package и `PACKAGE.md` (п. 11.3); человек передаёт их в любой инструмент и возвращает PR, ветку или diff (п. 11.4).

**Режим `model_patch`** (`CODE_EXECUTOR=model_patch`, после положительного решения ADR-10):

1. **\[ЧЕЛОВЕК\]** Убедиться, что подключён провайдер с моделью, у которой подтверждена `capability = code_patch` (проверкой по E.2 и golden-набором E-01).
2. **\[ЧЕЛОВЕК\]** Включить права записи GitHub App по E.5 (только `biforge/*`) и ruleset, запрещающий запись в `main`.
3. **\[ПОЛУАВТО\]** Указать в реестре `role_hint: code_author` для выбранной модели.
4. **\[АВТО\]** `verify:connections` проверяет: права приложения не шире манифеста; запись в тестовую ветку `biforge/_verify` проходит, запись в `main` отклоняется. Проверка не создаёт PR.

Подключение Jules и других облачных агентов тем же интерфейсом — F.3.

### E.5. GitHub App (интеграция продукта)

Нужна для BX-19. Продукт не имеет права merge и не получает прав администратора.

**Шаги**

1. **\[ЧЕЛОВЕК\]** В настройках организации `ecooorg` (Developer settings → GitHub Apps) создать приложение `biforge-control`.
2. **\[ЧЕЛОВЕК\]** Права репозитория (Repository permissions): Metadata — read; Contents — read; write включается только при `model_patch`, загрузке diff и коммите Task Package и только в ветки `biforge/*` (ruleset; ADR-06); Pull requests — read, write — только для создания PR при `model_patch`; Checks — read. Все остальные права, включая Administration, Secrets, Workflows и merge, **не выдавать**.
3. **\[ЧЕЛОВЕК\]** Подписаться на события `pull_request` и `check_run`. Адрес webhook — `https://e-production-5cc8.up.railway.app/api/webhooks/github`. Придумать длинную случайную строку и записать её как `GITHUB_WEBHOOK_SECRET` (в приложении GitHub и в Railway одно и то же значение).
4. **\[ЧЕЛОВЕК\]** Сгенерировать приватный ключ (`.pem`), сохранить в Railway как `GITHUB_APP_PRIVATE_KEY`, файл с компьютера удалить. Записать `GITHUB_APP_ID`.
5. **\[ЧЕЛОВЕК\]** Установить приложение в организации **только на выбранные репозитории**; из адреса установки взять `GITHUB_APP_INSTALLATION_ID`.
6. **\[ЧЕЛОВЕК\]** В репозиториях включить защиту `main`, required checks (раздел 15.2) и ruleset, ограничивающий запись приложения ветками `biforge/*`.
7. **\[АВТО\]** Проверка (последовательность, которую выполняет скрипт): подписать JWT (RS256; `iss` = `GITHUB_APP_ID`; срок жизни не более 10 минут) → `POST /app/installations/{id}/access_tokens` → `GET /repos/{owner}/{repo}` с полученным токеном. Заголовки: `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`.

**Критерий OK:** все три запроса вернули 2xx; `permissions` в ответе на выпуск токена **не шире** манифеста (E.6): иначе `FAIL(permissions_too_broad)`.

**Webhook.** Подпись проверяется заголовком `X-Hub-Signature-256` (HMAC-SHA256 от необработанного тела с `GITHUB_WEBHOOK_SECRET`); при несовпадении ответ 401 и запись в аудит. Токены установки живут около часа; скрипт и продукт выпускают их заново, а не хранят.

### E.6. Манифест и проверка подключений

**Манифест `connectors.yaml`** (версия 1; ниже — обязательный минимум, остальные поля добавляются шагами BX):

```yaml
version: 1
connectors:
  gemini:
    required_from: BX-10.b
    env: {required: [GEMINI_API_KEY], optional: [GEMINI_API_KEY_FREE]}
    checks:
      - {id: list_models, method: GET, url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=5", auth: {header: x-goog-api-key, env: GEMINI_API_KEY}, expect: {status: 200, json_has: [models]}}
      - {id: tiny_call, method: POST, url: "https://generativelanguage.googleapis.com/v1beta/models/{MODEL_ID}:generateContent", auth: {header: x-goog-api-key, env: GEMINI_API_KEY}, expect: {status: 200, json_has: [candidates, usageMetadata]}}
  # Шаблон дополнительного провайдера (добавляется в BX-12.a; значения — из документации провайдера)
  # <provider_id>:
  #   required_from: BX-12.a
  #   env: {required: [<ID>_API_KEY, <ID>_PLAN]}
  #   checks:
  #     - {id: list_models, method: GET, url: "<BASE_URL>/models", auth: {header: Authorization, scheme: Bearer, env: <ID>_API_KEY}, expect: {status: 200}}
  #     - {id: tiny_json_call, method: POST, url: "<BASE_URL>/chat/completions", auth: {header: Authorization, scheme: Bearer, env: <ID>_API_KEY}, expect: {status: 200, json_has: [choices, usage], content_is_json: true}}
  github:
    required_from: BX-19
    env: {required: [GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET]}
    max_permissions: {metadata: read, contents: read, checks: read, pull_requests: read}
    max_permissions_model_patch: {contents: write, pull_requests: write}   # только при CODE_EXECUTOR=model_patch
    checks:
      - {id: installation_token_and_repo, kind: github_app_flow, expect: {status: 2xx, permissions_within_max: true}}
  postgres:
    required_from: BX-04
    env: {required: [DATABASE_URL]}
    checks:
      - {id: select_1, kind: sql, query: "SELECT 1", expect: {rows: 1}}
```

**Спецификация `npm run verify:connections`** (создаётся в BX-10.b, расширяется в BX-12.a, BX-19, BX-21.a):

- Не вызывает LLM. Таймаут запроса 10 секунд, повторов нет, не более одного короткого вызова на модель.
- Значения секретов никогда не попадают в вывод, логи и ошибки; печатается только `present: true|false`. Покрыто тестом редактирования (BX-24).
- Параметры: `--only gemini,<id>`, `--json`, `--dry-run` (печатает план без сети). Для тестов в CI адреса подменяются переменной `<ID>_BASE_URL_OVERRIDE`, указывающей на fake-серверы.
- Необязательные подключения с отсутствующей переменной получают `NOT_RUN`, а не `FAIL`.
- Результат записывается в таблицу `connection_checks` и обновляет `last_verified_at` проверенных моделей Registry.
- Коды выхода: `0` — все обязательные `OK`; `2` — есть `FAIL` или `DRIFT`; `3` — есть `BLOCKED` у обязательного подключения.

```json
{"version":1,"checked_at":"2026-10-09T12:00:00Z",
 "results":[
  {"connector":"gemini","check":"list_models","status":"OK","http":200,"latency_ms":412},
  {"connector":"github","check":"installation_token_and_repo","status":"BLOCKED","reason":"missing_secret:GITHUB_APP_PRIVATE_KEY"}],
 "summary":{"OK":1,"FAIL":0,"DRIFT":0,"BLOCKED":1,"NOT_RUN":0}}
```

### E.7. Диагностика

| Симптом | Класс | Человек | Автоматический режим |
| --- | --- | --- | --- |
| 401 или 403 у провайдера | `PROVIDER_AUTH` | Проверить, не отозван ли ключ; создать новый и обновить Variables | Провайдер `disabled`, задача `BLOCKED`, без повторов, запись в аудит |
| 429 с `Retry-After` | `PROVIDER_TRANSIENT` | Подождать | Backoff с jitter, затем fallback |
| 429 с сообщением об исчерпании объёма или квоты | `PROVIDER_QUOTA` | Сменить план, пополнить баланс или ждать сброса | Cooldown до сброса, следующий провайдер, без повторов |
| 400 или 422 | `INVALID_REQUEST` | Сообщить в PR с фрагментом ответа | Без повторов; в проверке — `FAIL` |
| 404 на пути из этого руководства | `DRIFT` | Сверить с официальной документацией, обновить руководство PR-ом | Остановка, отчёт без секретов |
| 5xx или таймаут | `PROVIDER_TRANSIENT` | Подождать | Один повтор, затем fallback |
| `model_patch`: патч не прошёл валидацию (защищённый путь, выход из корня, размер) | `INVALID_OUTPUT` | Изучить патч, при необходимости уточнить SPEC | Одна повторная попытка с описанием ошибки, затем запрос человеку |
| GitHub: 401 на webhook | Подпись не совпала | Сверить `GITHUB_WEBHOOK_SECRET` в двух местах | Событие отклоняется, запись в аудит |
| GitHub: токен шире манифеста | `FAIL(permissions_too_broad)` | Сузить права приложения | Подключение не допускается |
| GitHub: запись в `main` не отклонена | `FAIL(main_not_protected)` | Включить ruleset | `model_patch` не запускается |
| Не открывается БД | `FAIL(db_unreachable)` | Проверить ссылку `DATABASE_URL` и статус сервиса | `/ready` возвращает ошибку; новые Run не стартуют |

### E.8. Проверка внешних фактов на 9 октября 2026

**Подтверждено по документации Google:** Gemini API оплачивается через Cloud Billing; на платном уровне промпты и ответы не используются для улучшения продуктов Google; лимиты расходов задаются на уровне платёжного аккаунта и проекта; монитор использования — AI Studio, Dashboard → Usage; аккаунты разработчиков переводятся на предоплату (раздел Billing документации Gemini API).

**Не утверждается основной частью ТЗ и проверяется при подключении:** лимиты, цены, условия данных и поведение API любого дополнительного провайдера; точные пути REST Gemini и GitHub App (приведены по общеизвестной документации и проверяются скриптом на `DRIFT`); интерфейсные названия кнопок Railway, GitHub и консолей провайдеров (могут отличаться); имена моделей (берутся из списка моделей провайдера, не из ТЗ и не по памяти).

Перед каждым шагом BX, использующим подключение, раздел E.8 перечитывается и при расхождении обновляется (правило R4). Исторические факты о Jules и Mistral — F.

### E.9. Чек-лист допуска подключений

Для человека; модели отмечать пункты не вправе, пока соответствующий пункт не подтверждён проверкой E.6.

- [ ] Gemini: платный проект создан, ограничение расходов задано, ключ в Railway, проверка `OK`
- [ ] Каждый дополнительный провайдер: план выбран; для реальных данных платный план и отключено обучение; лимит расходов задан; ключ в Railway; лимиты записаны в Registry; проверка `OK`
- [ ] PostgreSQL: сервис создан, `DATABASE_URL` — ссылка на переменную, проверка `OK`
- [ ] Вход: `APP_PASSWORD`, `SESSION_SECRET`, `ENABLE_APP_AUTH=true` заданы
- [ ] GitHub App: права ровно по E.5, webhook с подписью, установка на выбранные репозитории, ruleset на `main` и на `biforge/*`, проверка `OK`
- [ ] Исполнитель кода: `manual` настроен; для `model_patch` — решение ADR-10 и проверка записи в `biforge/*`
- [ ] Результат `verify:connections` сохранён как артефакт; обязательные подключения уровня текущего G — `OK`
- [ ] Registry: каждая модель имеет `data_policy`, `rate_limit_policy` и свежий `last_verified_at`
- [ ] Секрет-сканирование CI зелёное; секретов в Git, логах и ответах API нет
