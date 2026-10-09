# УНИВЕРСАЛЬНЫЙ ПРОТОКОЛ ИСЧЕРПЫВАЮЩЕГО ТЕСТИРОВАНИЯ
### Виртуальный стенд • эмуляция внешних сервисов • fault injection • реальные smoke-тесты

Внутренняя инструкция для построения глубокого тестирования новых программных систем.

---

## 0. Главный принцип
Цель — не доказать, что программа работает в одном счастливом сценарии, а доказать её поведение в нормальных, пограничных, ошибочных, сетевых, конкурентных и аварийных условиях.

| Класс | Проверяем | Что доказывает | Ограничение |
| :--- | :--- | :--- | :--- |
| **A. Полностью виртуальное** | Код, API, ошибки, timeout, модели, файлы, состояние, concurrency | Поведение нашей системы при заданных условиях | Не доказывает фактическое поведение внешнего провайдера |
| **B. Виртуальная инфраструктура** | Fake HTTP, proxy, latency, rate-limit, fault injection | Устойчивость интеграции | Внешняя система всё равно моделируется |
| **C. Реальный smoke** | Реальный API, CI, deployment, браузер/облако | Фактическую совместимость | Нужно ограничивать стоимость/число запросов |

> **Правило:** сначала прогонять тысячи виртуальных сценариев; реальными сервисами подтверждать только те предположения, которые нельзя доказать виртуально.

---

## 1. Старт нового проекта
* Зафиксировать архив/репозиторий, commit/branch, версию и дату.
* Построить карту проекта: runtime, frontend, backend, API, БД, файлы, очереди, AI-модели, OAuth, storage, deployment.
* Прочитать manifest и lockfile, README, CI workflows, конфигурацию, environment variables и существующие tests.
* Определить команды install, build, typecheck, lint, unit/integration/e2e.
* Составить карту внешних зависимостей и решить для каждой: real smoke, mock, fake server или simulator.
* Запустить baseline без изменений и сохранить результаты.
* Не менять production-код только ради устаревшего теста; сначала определить, устарел тест или сломан код.

---

## 2. Архитектура виртуального стенда

```
Application Under Test
 ├─ Virtual HTTP / AI Provider
 ├─ Virtual Storage / Drive
 ├─ Virtual Auth / OAuth
 ├─ Virtual DB / Cache
 ├─ Fault Injector
 ├─ Network Simulator
 └─ Test Orchestrator
      ├─ assertions
      ├─ token/latency metrics
      └─ evidence/artifacts
```

* Стенд изолирован от production.
* Mocks/stubs — временная тестовая инфраструктура, не production-код.
* Для HTTP-пути предпочтителен настоящий локальный fake server, чтобы тестировать реальную сериализацию.
* Для библиотек без возможности установки использовать временные stubs и запускать настоящую бизнес-логику.
* После каждого набора очищать состояние, кроме тестов, специально проверяющих persistence/cooldown.

---

## 3. Инструменты и техники

| Подход | Назначение |
| :--- | :--- |
| **Unit mocks/stubs** | Изоляция функций/классов |
| **Fake server** | Настоящий HTTP request/response путь |
| **Request interception** | Перехват и изменение исходящих запросов |
| **Temporary dependency stubs** | Запуск логики без внешних пакетов |
| **Transpile/syntax sweep** | Проверка TS/TSX при недоступных npm-зависимостях |
| **Property-based testing** | Множество входов + инварианты |
| **Fuzzing** | Malformed/random inputs |
| **Concurrency harness** | Параллельные запросы и race conditions |
| **Fault injection** | Целенаправленные отказы |
| **Golden/snapshot tests** | Контракт запросов/ответов |
| **Static/security scans** | Секреты и опасные конструкции |
| **Browser automation** | UI/e2e |
| **CI simulation** | Повтор workflow |
| **Production-like runtime** | Startup/shutdown/env/proxy-поведение |

---

## 4. Если реальная сеть недоступна
* Проверить уже установленные зависимости и доступные глобальные runtime-инструменты.
* Проверить исходники статически и выполнить syntax/transpile sweep.
* Создать временные stubs для внешних библиотек.
* Поднять локальные fake HTTP services.
* Запустить настоящую бизнес-логику приложения против fake services.
* Сделать fault injection и concurrency tests.
* Каждый недоступный real test пометить `BLOCKED/NOT RUN` с причиной.
* **Никогда не писать «всё протестировано», если реальный install/build/e2e не выполнен.** При этом отсутствие интернета не должно останавливать виртуальный аудит.

---

## 5. AI/LLM — обязательная матрица
* Model selection и fallback.
* Request serialization и headers.
* System/developer instructions.
* Conversation history и context compaction.
* Attachments.
* Structured output/JSON schema.
* Input/output/cached token accounting.
* Retry, timeout, total deadline.
* 429/rate limit.
* Circuit breaker/cooldown.
* Safety/triage.
* Empty/malformed model output.
* Unknown/unavailable model.
* Concurrent users.

### Матрица ответов AI

| Сценарий | Имитация | Ожидаемое |
| :--- | :--- | :--- |
| **200 OK** | Нормальный JSON | Корректный parsed result |
| **Invalid JSON** | 200 + битый body | Retry/fallback по policy |
| **429** | Rate limit | Ограниченный retry/backoff |
| **401/403** | Auth/permission | Понятная ошибка без утечки key |
| **404** | Model unavailable | Fallback/понятная ошибка |
| **408/timeout** | Задержка выше deadline | Abort + fallback |
| **500/502/503/504** | Provider failure | Fallback/retry |
| **Connection reset** | Обрыв до/во время ответа | Нет зависания |
| **Empty body** | Пустой ответ | Не считать содержательно успешным |
| **Wrong schema** | Неожиданные поля | Validation/retry/error |
| **Huge response** | Чрезмерный output | Безопасное ограничение |
| **All models fail** | Все провайдеры недоступны | Контролируемый terminal failure |
| **Usage missing** | Нет usageMetadata | Не падать из-за telemetry |
| **Cached tokens** | Есть cache telemetry | Корректно суммировать |
| **No cache tokens** | Поле отсутствует/0 | Безопасно трактовать |

---

## 6. Token Economy / контекст
* Сравнить baseline и optimized request shape.
* Проверить число сообщений, реально отправленных модели.
* Проверить максимальную длину сообщения.
* Проверить длинные истории: 0, 1, 8, 9, 20, 100+ сообщений.
* Проверить, что compaction не уничтожает полную историю приложения.
* Раздельно проверять `inputTokens`, `outputTokens`, `cachedTokens`.
* Проверить суммирование usage через retries.
* Проверить отсутствие внутренней telemetry в пользовательском ответе.
* Проверить отсутствие NaN/отрицательных/аномальных счётчиков.
* Проверить отсутствие usageMetadata.
* Проверить Unicode и очень длинные сообщения.
* Проверить, что оптимизация не ломает security/safety logic.

---

## 7. Сетевой fault injection
Инжектируемые типы воздействий:
* Latency: 0, малая, средняя, большая.
* Jitter/random delay.
* Timeout.
* Connection reset до ответа.
* Connection reset после частичного ответа.
* HTTP 4xx/5xx.
* Malformed headers/body.
* Truncated body.
* Duplicate/replayed response.
* Temporary и persistent outage.
* Rate limiting.
* Burst traffic.
* Slow server.
* DNS-подобная недоступность на уровне адаптера.

> **Критерий:** Для каждого отказа проверять отсутствие бесконечного retry, утечек ресурсов, зависших promises/requests, ложного успеха и повторной отправки небезопасной операции.

---

## 8. HTTP/API contract testing
* Valid minimum request.
* Missing fields.
* `null`/empty/wrong type.
* Array/object mismatch.
* Unknown fields.
* Too-large body.
* Wrong Content-Type.
* Duplicate/replay request.
* Concurrent requests.
* Expected status/body/schema.
* **Отсутствие stack trace, secrets и внутренних путей в ответе.**

---

## 9. Файлы и attachments
* Пустой, обычный и очень большой файл.
* Unicode/разные кодировки.
* Бинарный файл.
* Неверный MIME type.
* Расширение не соответствует содержимому.
* Повреждённый файл.
* Очень длинное имя.
* Path traversal strings.
* Concurrent uploads.
* Повторная загрузка.
* Отсутствующий файл.
* Файл, который нельзя безопасно разобрать.

> **Критерий:** Проверяются memory limits, path boundaries и отсутствие чтения произвольных локальных файлов.

---

## 10. Security audit
* Secret scan: API keys, tokens, private keys, credentials.
* Проверка `.env`/`.gitignore` и logs.
* Path traversal.
* Command injection.
* `eval`/`new Function` и опасные dynamic APIs.
* SSRF, если пользователь задаёт URL.
* XSS в пользовательском выводе.
* CSRF/auth boundaries, если применимо.
* Input/body size limits.
* Rate limiting.
* Error leakage.
* Небезопасные defaults.

> **Правило:** Никогда не использовать настоящие секреты в тестах; только явно фиктивные значения.

---

## 11. State, retry, circuit breaker
* Для независимых сценариев использовать fresh process.
* Отдельно тестировать persistent health/cooldown state.
* Схема переходов: `Healthy` → `failed` → `cooldown` → `recovered`.
* Один плохой provider не должен навсегда блокировать остальные.
* Retry count ограничен.
* Есть общий total deadline, а не только timeout отдельного вызова.
* Abort действительно прекращает работу.

---

## 12. Concurrency / load
* 1 запрос.
* 2–5 параллельных.
* 10–50 виртуальных.
* Повтор одного запроса.
* Разные пользователи с разным state.
* Медленный запрос рядом с быстрыми.
* Один failing provider при множестве успешных.

> **Критерии:** Проверить отсутствие cross-user state leakage и race conditions. Измерять success/error rate, p50/p95/p99 latency, retries/request, fallback rate, memory growth, token usage и незавершённые операции.

---

## 13. Property-based / fuzz

| Объект | Генерация | Инвариант |
| :--- | :--- | :--- |
| **Text** | empty/Unicode/long/random | Нет uncontrolled crash/leak |
| **Conversation** | 0–200 messages | Compaction ограничивает model context; state сохраняется |
| **JSON** | valid/invalid/random | Parser контролируемо обрабатывает ошибку |
| **HTTP body** | разные типы/размеры | Ожидаемый 4xx/2xx вместо uncontrolled 500 |
| **Usage** | missing/0/normal/anomalous | Telemetry численно безопасна |
| **Provider error** | разные shapes/status | Retry/fallback policy сохраняется |

---

## 14. Browser/UI
* Собрать production-like bundle.
* Проверить главный happy path.
* Проверить меню, модалки, textarea, upload.
* Проверить элементы, зависящие от наличия attachment.
* Проверить mobile viewport.
* Через browser network interception вызвать backend failures.
* Проверить reload/state recovery.
* Проверить labels, focus, keyboard, disabled states.
* **Правило:** Сверять UI tests с актуальным продуктом; не подгонять продукт под устаревший тест.

---

## 15. CI/CD
* Version check.
* Manifest/lockfile consistency.
* Clean install/ci.
* Lint.
* Typecheck.
* Unit/integration/virtual tests.
* Production build.
* UI/e2e.
* Package/archive checks.
* Security/static scans.

> Если тест противоречит актуальному UI/API, установить источник истины. Устаревший тест не доказывает дефект production-кода.

---

## 16. Production-like deployment
* Production build, не только dev server.
* PORT/environment handling.
* Startup/shutdown.
* Health endpoint, если есть.
* Graceful failure при отсутствии обязательной конфигурации.
* Termination/SIGTERM, если применимо.
* Reverse-proxy-like behavior.
* Static assets/SPA fallback.
* Startup logs.

---

## 17. Evidence
Артефакты и метрики для фиксации:
* Test ID/name.
* Input scenario.
* Expected / Actual.
* Статус: `PASS/FAIL/BLOCKED`.
* Relevant logs.
* HTTP summary.
* Model, Retries, Latency.
* Token usage & Cache telemetry.
* Error type/status.
* Runtime/version/commit.

> **Важно:** Не сохранять реальные keys, cookies, OAuth tokens или PII в artifacts.

---

## 18. Критерии PASS/FAIL
* Отсутствие exception само по себе не PASS.
* HTTP 200 само по себе не PASS.
* Для AI проверять контракт/request shape/structured result/telemetry, а не только «хороший текст».
* Mock не является доказательством реального внешнего API.
* Skipped tests не скрывать.
* `BLOCKED/NOT RUN` всегда указывать с причиной.
* Flaky test расследовать, а не считать PASS.
* После исправления повторять весь затронутый regression set.

---

## 19. Итоговый отчёт

```text
PROJECT / VERSION / COMMIT:DATE / RUNTIME:

STATIC:
  version ........ PASS/FAIL
  dependencies ... PASS/FAIL
  syntax ......... PASS/FAIL
  security ....... PASS/FAIL

BUILD:
  production ..... PASS/FAIL/BLOCKED

VIRTUAL:
  HTTP ........... PASS/FAIL
  network ........ PASS/FAIL
  AI/model matrix  PASS/FAIL
  retry/fallback . PASS/FAIL
  timeout ........ PASS/FAIL
  token economy .. PASS/FAIL
  files .......... PASS/FAIL
  security ....... PASS/FAIL
  concurrency .... PASS/FAIL
  fuzz/property .. PASS/FAIL
  UI ............. PASS/FAIL

REAL SMOKE:
  external API ... PASS/NOT RUN
  deployment ..... PASS/NOT RUN
  CI ............. PASS/FAIL

BLOCKERS:
RISKS:
CONCLUSION:
```

---

## 20. Прямая инструкция будущему ассистенту
При получении нового проекта действовать по этому порядку:
1. Не ограничиваться чтением кода — построить исполняемый virtual test harness.
2. Инвентаризировать все внешние зависимости.
3. Для каждой зависимости создать управляемый mock/fake/simulator, если это возможно.
4. Запустить реальную бизнес-логику приложения против виртуальных сервисов.
5. Инжектировать 4xx/5xx, timeout, reset, malformed response, rate limit и outage.
6. Для AI симулировать несколько моделей и проверить cascade/fallback/retry.
7. Проверяй request shape, а не только final response.
8. Проверяй token/cost telemetry, включая retries и cache counters.
9. Проверяй long context, compaction и сохранение полного state.
10. Проверяй files, malformed inputs, Unicode, size limits и path traversal.
11. Проверяй concurrency и cross-user isolation.
12. Использовать property-based/fuzz testing там, где это разумно.
13. Провести static/security audit.
14. Проверить UI browser automation, если UI входит в продукт.
15. Максимально воспроизвести CI workflow.
16. Если network/dependencies недоступны, продолжить через stubs, transpilation и fake servers.
17. Явно разделить VIRTUAL PROVEN и REAL-ONLY.
18. Сохранить evidence.
19. После исправлений повторить regression suite.
20. **Не выдавать предположение за результат.**

---

## 21. Самый важный предел виртуализации
Виртуально можно проверить почти всю логику реакции приложения на внешний мир. Нельзя честно утверждать, что fake provider доказал свойства реального provider.

* *Пример:* fake Gemini может дать 50 комбинаций 200/429/503/timeout/invalid JSON/usage metadata и проверить весь retry/fallback/token-код. Реальный Gemini нужен лишь для smoke-подтверждения model ID, authentication, request format и реального usage response.
* *Пример для облачного deployment:* local production-like simulation проверяет приложение; реальный CI/Railway/GitHub smoke подтверждает конкретную инфраструктуру.

---

## 22. Минимальный универсальный порядок
1. Зафиксировать исходники/version/commit.
2. Инвентаризировать архитектуру и внешние зависимости.
3. Снять baseline.
4. Проверить version/lock/config.
5. Static + security scan.
6. Syntax/transpile sweep.
7. Поднять virtual services.
8. Happy-path integration.
9. HTTP contract.
10. AI/model matrix.
11. Network fault injection.
12. Retry/fallback/timeout/circuit.
13. Token/context/cost.
14. Files/input/security.
15. Concurrency/load.
16. Property/fuzz.
17. Production build.
18. Browser/UI.
19. CI simulation.
20. Real smoke только для внешних утверждений, которые виртуально не доказуемы.
21. Собрать evidence.
22. Исправить дефекты.
23. Повторить regression.
24. Выдать `PASS/FAIL/BLOCKED` + риски.

---

## 23. Финальный критерий качества
Аудит качественный, если он конкретно отвечает:
1. Что проверено;
2. Какие отказы искусственно созданы;
3. Какие свойства доказаны виртуально;
4. Что всё ещё требует реального внешнего smoke.

> Для каждого существенного результата должно существовать воспроизводимое evidence.
