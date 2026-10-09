# BiForge — Bifurcation + Forge: от пространства возможностей к созданному решению

Высокоуровневое и инженерно-детализированное техническое задание на развитие Bifurcation Engine в универсальную среду проектирования, оркестрации и производства интеллектуальных систем

| **Параметр**      | **Значение**                                                                                               |
|-------------------|------------------------------------------------------------------------------------------------------------|
| Продукт           | BiForge                                                                                                    |
| Базовая система   | Bifurcation Engine (BE)                                                                                    |
| Документ          | TZv1.4                                                                                                  |
| Статус            | Консолидированная версия ТЗ для Git-репозитория; открытые решения отмечены отдельно                     |
| Основание         | Аванпроект «BiForge», версия 1.0 / v3                                                                      |
| Целевая аудитория | Некоммерческие организации, научные и технологические инициативы, исследовательские коллективы, энтузиасты |
| Ключевой принцип  | Максимум полезного результата при минимально необходимом расходе токенов, времени и ресурсов               |

История документа: TZv1 — базовое техническое задание; TZv1.1 — пошаговый реестр BF-01…BF-44; TZv1.2 — GitHub/Agent Handoff; TZv1.3 — Railway Production Protocol; TZv1.4 — инвентаризация GitHub и текущего экземпляра. Настоящий файл объединяет эти материалы в один Markdown-документ.

Примечание: документ разворачивает согласованные положения аванпроекта в инженерные требования. Конкретные провайдеры, модели, тарифы и актуальные лимиты API не считаются данным документом навсегда зафиксированными и подлежат верификации перед реализацией соответствующих адаптеров.

# 0. Назначение и нормативный статус

Настоящее ТЗ определяет требования к следующему поколению BiForge: универсальной среде, объединяющей обычное интеллектуальное взаимодействие, длительную проектную работу, Project Intelligence, мультиагентное оркестрирование, мульти-модельный слой, файлово-артефактный контур, производство программных и иных результатов, контроль качества и ресурсную оптимизацию.

Аванпроект является исходным нормативным основанием. Там, где аванпроект намеренно оставляет выбор открытым, настоящее ТЗ формулирует требование к механизму выбора, а не выдумывает уже утверждённую конкретную технологию.

## 0.1. Термины обязательности

- MUST / ДОЛЖЕН — обязательное требование.

- SHOULD / СЛЕДУЕТ — предпочтительное требование; отклонение требует обоснования.

- MAY / МОЖЕТ — допустимая возможность.

- MUST NOT / НЕ ДОЛЖЕН — запрещённое поведение.

# 1. Цели системы

1.  Сохранить Simple Mode как быстрый, независимый контур обычного общения, анализа и поддержки решений.

2.  Создать Project Mode как отдельную долгоживущую среду структурированной работы.

3.  Превратить Bifurcation Engine из механизма диалога в Project Intelligence, управляющую неопределённостью и решениями.

4.  Предоставить конфигурируемую мультиагентную архитектуру.

5.  Отделить логику агентов от конкретных AI-моделей и провайдеров.

6.  Создать универсальный File & Artifact Layer, принимающий практически любые форматы.

7.  Обеспечить Task Graph и Artifact Graph для управляемого производства результата.

8.  Встроить Quality Engine, Quality Gates и Repair Loop.

9.  Обеспечить безопасную серверную работу с API-ключами и инструментами.

10. Сделать экономию ресурсов постоянным архитектурным критерием.

# 2. Архитектурные принципы

- Simple Mode и Project Mode — два независимых рабочих пространства.

- Conversation не является эквивалентом Project.

- Первый содержательный запрос в Project Mode инициирует Project Initialization и предварительную классификацию типа проекта.

- Project Type является изменяемой рабочей классификацией.

- Project State — компактное состояние проекта, а не полная история.

- Facts / Unknowns / Hypotheses / Questions / Decisions / Risks образуют базовое Project Intelligence.

- Agent не должен быть жёстко связан с конкретным провайдером модели.

- Model Router является обязательным абстракционным слоем между Agent и Provider.

- File & Artifact Layer отделяет бинарное хранение от семантической обработки.

- Модель не является файловой системой; доступ к файлам идёт через контролируемые инструменты.

- Все критические операции должны иметь проверяемые состояния, права, трассировку и возможность отката.

- Сверхэкономность является постоянной архитектурной константой.

# 3. Область охвата

| **Контур**                    | **Входит в TZv1** | **Примечание**                    |
|-------------------------------|-------------------|-----------------------------------|
| Simple Mode                   | Да                | Сохраняется как независимый поток |
| Project Mode                  | Да                | Основной новый контур             |
| Project Intelligence / State  | Да                | Обязательный                      |
| Agent Registry                | Да                | Конфигурируемый                   |
| Orchestration Engine          | Да                | Task Graph + execution            |
| Model Registry / Router       | Да                | Провайдер-независимый             |
| File & Artifact Layer         | Да                | Универсальный                     |
| Workspace / Build             | Да                | Изолированный и контролируемый    |
| Quality Engine                | Да                | Включая repair                    |
| Security / Secrets            | Да                | Server-side                       |
| Deployment                    | Да                | Через контролируемые инструменты  |
| Конкретные тарифы провайдеров | Нет               | Проверяются перед интеграцией     |

# 4. Пользовательские режимы

## 4.1. Simple Mode

- Минимальная когнитивная и интерфейсная нагрузка.

- Обсуждение, анализ, сравнение, рекомендации, decision support.

- Не создавать Project автоматически.

- Не переносить историю в Project без явной операции пользователя.

- Использовать компактное состояние и экономную контекстную стратегию.

## 4.2. Project Mode

- Создание и ведение Project State.

- Project Initialization по первому содержательному запросу.

- Управление типом проекта, требованиями, решениями, рисками, задачами, агентами и артефактами.

- Отображение прогресса, зависимостей, Quality Gates и результатов.

- Поддержка длительного жизненного цикла проекта.

## 4.3. Импорт из Simple

Импорт допускается только как явная пользовательская операция. Импортируемый материал должен получить происхождение, время импорта и связь с созданным/обновлённым Project Artifact или Project Intelligence.

# 5. Project Model

## 5.1. Project entity

Минимальная логическая сущность Project должна содержать:

- project_id

- name

- type

- status

- vision

- current_phase

- state_version

- created_at

- updated_at

- owner/actor context

- requirements

- facts

- unknowns

- hypotheses

- questions

- decisions

- risks

- tasks

- agents

- artifacts

- deployments

- history

## 5.2. Project Type

- Problem Analysis

- Software Development

- AI Agent Development

- Business / Process Design

- Research

- Engineering

- Decision System

- расширяемые пользовательские типы

Система должна допускать изменение Project Type без потери истории и происхождения предыдущих решений.

# 6. Project Intelligence и Project State

## 6.1. Состав

- current goal

- current phase

- facts

- unknowns

- hypotheses

- open questions

- decisions

- risks

- active tasks

- blocked tasks

- relevant artifacts

- next recommended action

## 6.2. Требования

- State MUST быть версионируемым.

- Каждое существенное изменение должно иметь источник: user, agent, tool, system.

- Решение, принятое человеком, должно отличаться от гипотезы модели.

- Состояние не должно бесконтрольно разрастаться; должна существовать компактификация.

- State должен позволять восстановить текущий контекст без передачи всей истории.

- Изменения State должны быть трассируемыми.

# 7. История и память

Система должна разделять полную историческую запись и рабочий контекст модели.

| **Слой**                     | **Назначение**                 | **Передаётся модели?**   |
|------------------------------|--------------------------------|--------------------------|
| Full Conversation History    | Полная история проекта/диалога | Только при необходимости |
| Project State                | Компактное текущее состояние   | Да                       |
| Relevant Artifacts           | Релевантные материалы          | Да, выборочно            |
| Decisions / ADR-like records | Обоснованные решения           | Да, выборочно            |
| Execution Logs               | Техническая трассировка        | Только по задаче         |

Запрещается использовать полную историю как единственный механизм памяти проекта.

# 8. Agent Registry

## 8.1. Модель агента

- agent_id

- role

- instructions

- model_policy

- fallback_policy

- tools

- input_contract

- output_contract

- permissions

- authority

- escalation_rules

- quality_requirements

- resource_budget

## 8.2. Базовые роли

- Product Owner / Business Analyst

- Software Architect

- UI/UX Designer

- Frontend Developer

- Backend Developer

- Database Engineer

- QA / Testing Engineer

- Security Engineer

- DevOps Engineer

- Documentation Agent

- Code Reviewer

- Release Manager

- Master / Orchestrator

Система должна поддерживать динамическое формирование состава команды и добавление новых ролей без изменения ядра оркестратора.

# 9. Orchestration Engine

## 9.1. Функции

- разбиение цели на задачи

- создание и изменение Task Graph

- назначение агентов

- контроль зависимостей

- параллельное выполнение независимых задач

- передача артефактов между задачами

- retry с ограничениями

- fallback

- Quality Gates

- Repair Loop

- эскалация человеку

- остановка по бюджету ресурсов

## 9.2. Идемпотентность

Повторное выполнение задачи не должно без необходимости создавать дубликаты артефактов или повторять дорогие внешние операции. Для операций должны использоваться task_id, input fingerprint и execution record.

# 10. Task Graph

## 10.1. Task entity

- task_id

- project_id

- type

- description

- status

- priority

- dependencies

- assigned_agent

- inputs

- outputs

- acceptance_criteria

- resource_budget

- attempt_count

- created_at

- started_at

- finished_at

## 10.2. Состояния

Минимальный конечный автомат: PENDING → READY → RUNNING → {SUCCEEDED \| FAILED \| BLOCKED \| CANCELLED}. Retry должен быть отдельным переходом/событием и не скрывать исходные попытки.

# 11. Artifact Graph

Artifact Graph связывает происхождение и зависимость результатов.

| **Узел**          | **Примеры**                          |
|-------------------|--------------------------------------|
| Requirement       | requirements.md, acceptance criteria |
| Architecture      | ADR, diagrams, API spec              |
| Implementation    | source tree, patches                 |
| Test              | unit/integration/UI/security tests   |
| Result            | logs, reports, metrics               |
| Release Candidate | build/package/container              |
| Deployment        | deployment record, smoke result      |

Каждый производный Artifact должен иметь связь с входными Artifacts и операцией, породившей его.

# 12. File & Artifact Layer

## 12.1. Универсальная модель

Практически любой файл должен приниматься как Binary Artifact независимо от расширения. Специализированная семантическая обработка подключается адаптерами.

## 12.2. Уровни

- Binary — хранение и базовые операции.

- Structured — parse, metadata, preview, conversion, validation.

- Executable/Buildable — build, test, run, package в контролируемой среде.

## 12.3. Artifact Registry

- artifact_id

- project_id

- version

- filename

- mime_type

- extension

- size

- hash

- storage_ref

- parent_artifacts

- derived_from

- created_by

- created_at

- security_status

- classification

## 12.4. Операции

- upload

- download

- copy

- move

- rename

- hash

- inspect

- preview

- parse

- extract

- compress

- convert

- generate

- assemble

- validate

- export

- version

- restore

- diff

## 12.5. Архивы

Архив является Artifact. Система должна поддерживать создание, инспекцию и распаковку архивов через безопасные адаптеры, а также manifest. Небезопасные архивные операции должны быть ограничены политикой безопасности.

## 12.6. Storage abstraction

Metadata хранится отдельно от content. Storage Adapter должен поддерживать локальное и объектное хранение. Конкретный провайдер не должен быть зашит в бизнес-логику.

## 12.7. Workspace

Для сборки и обработки создаётся изолированный workspace. Агент не получает произвольный доступ к серверному filesystem.

# 13. Processing Router

Processing Router выбирает, где выполнять файловую операцию:

- локально детерминированным кодом

- специализированным инструментом/сервисом

- в изолированном build/runtime environment

- через AI model/tool

Критерии выбора: безопасность, размер данных, формат, стоимость, latency, наличие инструмента, необходимость семантического понимания, reproducibility.

# 14. Workspace и выполнение кода

## 14.1. Требования

- Изоляция workspace от control plane.

- Ограничение CPU, RAM, disk и времени выполнения.

- Ограничение сети по политике.

- Отдельные credentials для инструментов.

- Сборка/тестирование должны иметь воспроизводимые execution records.

- Опасные команды должны быть запрещены или требовать дополнительного разрешения.

## 14.2. Build pipeline

Минимальный pipeline: prepare → dependency resolution → build → static checks → tests → package → artifact registration → cleanup.

# 15. Multi-Model Architecture

## 15.1. Model Registry

Model Registry описывает провайдеры и модели без хранения секретов.

- provider_id

- model_id

- capabilities

- context_limits

- quality_class

- cost_class

- latency_class

- availability

- rate_limit_policy

- supported_features

- secret_env_ref

- status

## 15.2. Model Router

Agent → Role/Task Requirements → Model Router → Model Registry → Provider Adapter → External Provider.

## 15.3. Политика выбора

- роль агента

- тип задачи

- требуемое качество

- стоимость

- latency

- rate limits

- доступность

- контекст

- специализированные способности

- диверсификация

- текущий resource budget

## 15.4. Fallback

Fallback должен быть ограниченным, наблюдаемым и экономически оправданным. Повторные вызовы не должны происходить бесконтрольно.

## 15.5. Multi-model diversity

Для критических задач допускается независимое получение нескольких решений и последующее сравнение Judge/Critic. Число моделей должно зависеть от ценности независимой проверки и resource budget.

# 16. Provider Adapters

Каждый внешний провайдер подключается через Adapter с единым внутренним контрактом.

- request normalization

- authentication via runtime secret

- timeout

- retry policy

- usage telemetry

- response normalization

- error classification

- capability reporting

Потенциальные провайдеры из аванпроекта: Google/Gemini, Mistral, Groq, NVIDIA, OpenRouter. Конкретные модели и лимиты подлежат актуальной проверке перед внедрением.

# 17. Secrets и API keys

## 17.1. Хранение

На начальном этапе ключи хранятся в Railway Environment Variables; для особо чувствительных значений допускаются Sealed Variables. Секреты не хранятся в GitHub, исходниках, Project State, Artifact Graph, логах или frontend bundle.

## 17.2. Доступ

- Только server-side runtime.

- Provider Adapter получает ключ по ссылке на secret variable.

- Agent Registry хранит имя/ссылку переменной, но не значение.

- UI не отображает секрет.

- Логи должны редактировать/маскировать секретные значения.

## 17.3. Эволюция

При росте системы Model Router может быть выделен в отдельный сервис с service-scoped secrets.

# 18. Tool Layer

Все внешние действия агента выполняются через Tool Layer.

| **Категория** | **Примеры**                 | **Контроль**              |
|---------------|-----------------------------|---------------------------|
| Repository    | read/write/branch/commit/PR | permissions + approval    |
| Files         | read/write/archive/export   | artifact policy           |
| Execution     | build/test/run              | sandbox + resource limits |
| Web           | search/fetch                | allowlist/policy          |
| Deployment    | deploy/rollback             | release gate + approval   |
| AI Providers  | model calls                 | Model Router              |

Инструменты должны иметь типизированные контракты, валидацию входов и структурированные результаты.

# 19. Quality Engine

## 19.1. Обязательные классы проверок

- requirements validation

- static analysis

- unit tests

- integration tests

- UI tests

- security checks

- artifact integrity

- build checks

- deployment smoke tests

- regression tests

## 19.2. Virtual Testing

Виртуальное тестирование из текущего BE рассматривается как фундамент: mock/fake provider servers, network fault injection, retry/fallback, token telemetry, long-context tests, file tests, fuzz/property tests, concurrency/load tests, browser/UI tests и production-like deployment tests.

## 19.3. Evidence

Каждая проверка должна иметь PASS / FAIL / BLOCKED и evidence. VIRTUAL PROVEN и REAL-ONLY должны различаться явно.

# 20. Quality Gates

| **Gate**          | **Минимальное условие**                                     |
|-------------------|-------------------------------------------------------------|
| Requirements Gate | Требования и acceptance criteria определены                 |
| Architecture Gate | Архитектура, API, модель данных и ключевые риски определены |
| Build Gate        | Сборка и статические проверки успешны                       |
| QA Gate           | Обязательные тесты и проверки успешны                       |
| Release Gate      | Deployment + smoke test + rollback readiness подтверждены   |

Переход между критическими стадиями должен быть связан с состоянием gate, а не только с ответом оркестратора.

# 21. Repair Loop

При FAIL создаётся диагностическая задача, а не бесконечный повтор.

QA FAIL → Failure Classification → Bug/Root Cause Analysis → Developer/Responsible Agent → Build → Tests → QA.

- Максимальное число попыток должно быть конфигурируемым.

- Каждая попытка фиксируется.

- Повторение идентичного действия без изменения входа должно предотвращаться.

- После исчерпания бюджета — escalation человеку.

# 22. Human-in-the-loop

| **Режим**  | **Описание**                                                   |
|------------|----------------------------------------------------------------|
| Autonomous | Система действует в пределах заранее выданных прав и бюджетов. |
| Supervised | Критические действия требуют подтверждения.                    |
| Manual     | Агент готовит действия, человек выполняет/подтверждает.        |

Обязательное подтверждение рекомендуется/требуется для секретов, destructive operations, production deploy, irreversible data operations и действий за пределами authority агента.

# 23. Security Architecture

- Least privilege для агентов и инструментов.

- Разделение control plane и execution plane.

- Sandbox для выполнения кода.

- Изоляция workspace.

- Secret redaction.

- Проверка типов и размеров файлов.

- Защита от path traversal и archive extraction abuse.

- Ограничение ресурсов.

- Audit log для критических действий.

- Проверка внешних входов и tool arguments.

## 23.1. Недоверенный файл

Любой загруженный файл считается недоверенным. Парсеры и конвертеры должны работать в безопасном контуре; потенциально исполняемые форматы не должны автоматически запускаться.

# 24. Resource Economy — фундаментальная константа

BiForge предназначен прежде всего для некоммерческих организаций, научных и технологических инициатив, исследовательских коллективов и энтузиастов. Поэтому экономия ресурсов является архитектурным ограничением, а не вторичной оптимизацией.

## 24.1. Объекты оптимизации

- input tokens

- cached tokens

- output tokens

- number of model calls

- latency

- CPU

- RAM

- disk

- network traffic

- external API usage

- storage duplication

## 24.2. Требования

- Передавать модели только необходимый контекст.

- Использовать Project State вместо повторной передачи полной истории.

- Передавать только релевантные Artifacts.

- Кэшировать повторно используемый контекст и результаты, если это экономически оправдано.

- Использовать детерминированные операции вместо AI там, где это возможно.

- Маршрутизировать простые задачи на более дешёвые/быстрые модели.

- Использовать дорогие модели только при доказуемой добавочной ценности.

- Не выполнять повторно уже завершённую работу без изменения входов.

- Избегать дублирования больших файлов.

- Учитывать стоимость fallback и multi-model diversity.

## 24.3. Budget-aware execution

Каждый Project/Task может иметь resource budget. Оркестратор должен уметь остановить или эскалировать выполнение при превышении бюджета.

# 25. Context Optimization

## 25.1. Context Assembly

Context Builder формирует запрос из: system/role instructions + Project State + relevant decisions + relevant artifacts + current task + user input.

## 25.2. Принцип

Не включать в запрос данные, не влияющие на текущую задачу.

## 25.3. Кэширование

Архитектура должна позволять использовать provider-side или application-side context caching там, где это экономически оправдано. Конкретные API-механизмы проверяются на этапе реализации.

## 25.4. Telemetry

Должны учитываться inputTokens, cachedTokens, outputTokens, latency, retries и model/provider.

# 26. Observability

Система должна иметь структурированную telemetry.

| **Измерение** | **Минимальные поля**                                           |
|---------------|----------------------------------------------------------------|
| LLM usage     | provider, model, task, input, cached, output, latency, retries |
| Task          | task_id, status, duration, attempts                            |
| Artifact      | artifact_id, operation, size, hash, duration                   |
| Tool          | tool, actor, success/failure, duration                         |
| Gate          | gate, result, evidence                                         |
| Deployment    | version, environment, status, smoke result                     |

Секреты и чувствительные данные не должны попадать в telemetry.

# 27. Data Model — логические сущности

| **Entity**       | **Назначение**                |
|------------------|-------------------------------|
| Project          | контейнер долгоживущей работы |
| ProjectState     | компактное состояние          |
| Conversation     | история диалога               |
| Agent            | конфигурация исполнителя      |
| Task             | единица работы                |
| TaskDependency   | связь задач                   |
| Artifact         | файл/результат                |
| ArtifactVersion  | версия                        |
| ArtifactRelation | граф происхождения            |
| Execution        | попытка выполнения            |
| Model            | модель из registry            |
| Provider         | AI provider                   |
| Tool             | инструмент                    |
| QualityGate      | контрольный этап              |
| TestRun          | результат тестов              |
| Deployment       | развёртывание                 |
| Decision         | зафиксированное решение       |
| Risk             | риск                          |
| AuditEvent       | критическое событие           |

# 28. API и внутренние контракты

API должен быть versioned и typed. Внешний UI не должен напрямую обращаться к AI providers.

## 28.1. Пример логических ресурсов

- /projects

- /projects/{id}/state

- /projects/{id}/tasks

- /projects/{id}/agents

- /projects/{id}/artifacts

- /projects/{id}/decisions

- /projects/{id}/quality

- /projects/{id}/deployments

- /models

- /providers

- /tools

## 28.2. Контракт задачи

Каждая task request должна идентифицировать project, task, actor/agent, inputs, acceptance criteria и resource policy.

## 28.3. Идемпотентность

Для дорогих операций API должен поддерживать idempotency key или эквивалентный механизм.

# 29. UI/UX

## 29.1. Главный принцип

UI Project Mode должен представлять проект как управляемую систему, а не только как чат.

- переключатель Simple / Project

- Project dashboard

- Project type/status

- current goal

- tasks and dependencies

- agents

- artifacts

- quality gates

- resource usage

- history/decisions

- conversation as one project tool

## 29.2. Simple Mode

Сохраняет лёгкость текущего интерфейса. Сложность Project Mode не должна проникать в обычный диалог.

# 30. Deployment Architecture

## 30.1. Начальная конфигурация

Допускается один основной backend service на Railway с последующим выделением Model Router, Worker/Execution и других компонентов по мере необходимости.

## 30.2. Логическое разделение

- Web/UI

- API/Control Plane

- Project Engine

- Orchestrator

- Model Router

- Artifact/File Layer

- Execution Worker

- Database

- Object Storage

- Observability

## 30.3. Эволюция

Архитектура должна позволять сначала реализовать модули внутри одного сервиса, а затем вынести их в отдельные сервисы без изменения доменных контрактов.

# 31. CI/CD

- lint

- type checking

- unit tests

- integration tests

- virtual provider tests

- security checks

- build

- artifact packaging

- deployment

- smoke tests

- rollback path

Release должен быть связан с версией исходного кода и набором входных/выходных Artifacts.

# 32. Failure handling

| **Класс ошибки**         | **Стратегия**                     |
|--------------------------|-----------------------------------|
| Transient provider error | bounded retry / fallback          |
| Rate limit               | backoff / alternate provider      |
| Timeout                  | bounded retry / alternate route   |
| Invalid model output     | validation + bounded repair/retry |
| Tool failure             | diagnose + retry if safe          |
| Build failure            | Repair Loop                       |
| Quality failure          | return to responsible task        |
| Budget exceeded          | stop/escalate                     |
| Security violation       | block + audit                     |

Ошибки не должны маскироваться под успешный результат.

# 33. Versioning и reproducibility

- Версия проекта должна ссылаться на commit/build/release artifacts.

- Artifact hashes должны позволять идентифицировать содержимое.

- Execution records должны сохранять версию инструментов/моделей там, где это возможно.

- Критические решения должны иметь timestamp и actor.

- Воспроизводимый build предпочтителен.

# 34. Performance requirements

На этапе ТЗ архитектура должна поддерживать измерение, но конкретные SLA не должны быть искусственно зафиксированы без baseline.

- Latency каждого этапа должна измеряться.

- Параллельные независимые задачи должны иметь возможность выполняться одновременно.

- Большие Artifacts не должны передаваться через БД или LLM prompt целиком без необходимости.

- UI не должен ждать завершения долгих задач синхронно; должен существовать task status/progress.

- Долгие операции должны быть возобновляемыми или корректно завершаться по timeout.

# 35. Scalability

Система должна масштабироваться по числу проектов, задач, артефактов и параллельных execution jobs без изменения доменной модели.

- Асинхронная очередь для долгих задач.

- Workers для build/test/processing.

- Object storage для больших файлов.

- DB indexes по project_id, artifact_id, task_id, status, timestamps.

- Возможность горизонтального масштабирования stateless control plane.

# 36. Backup и recovery

- Регулярное резервное копирование metadata database.

- Защита object storage от случайного удаления.

- Проверка восстановления.

- Раздельное хранение production secrets.

- Recovery procedures должны быть документированы.

# 37. Acceptance criteria

| **Область**    | **Критерий приемки**                                                          |
|----------------|-------------------------------------------------------------------------------|
| Simple/Project | Потоки независимы; явный импорт работает                                      |
| Project State  | Состояние сохраняется и восстанавливается без полной истории                  |
| Agents         | Роли и права конфигурируются                                                  |
| Orchestration  | Зависимости и parallel tasks работают                                         |
| Model Router   | Минимум два provider adapters могут быть подключены без изменения Agent logic |
| Secrets        | Ключи не попадают в source/UI/logs                                            |
| Artifacts      | Произвольный бинарный файл принимается и хранится как Artifact                |
| Archives       | Архивы создаются/извлекаются через безопасный контур                          |
| Workspace      | Build/test изолированы                                                        |
| Quality        | Gates + repair loop работают                                                  |
| Economy        | Telemetry показывает token/call/latency/resource metrics                      |
| Deployment     | Есть smoke test и rollback path                                               |

# 38. Test strategy

## 38.1. Unit

Тестирование доменных сущностей, state transitions, routing policy, permission policy, artifact metadata и deterministic operations.

## 38.2. Integration

Provider adapters, storage adapters, database, queue, workspace, artifact graph, orchestration.

## 38.3. Virtual provider tests

Fake providers должны моделировать success, timeout, 429, 5xx, malformed JSON, partial output и usage metadata.

## 38.4. Security tests

Path traversal, archive bombs/abuse, oversized files, malformed parsers, secret leakage, unauthorized tool calls, permission escalation.

## 38.5. Load/concurrency

Параллельные tasks, конкурирующее обновление Project State, duplicate task submission, artifact version conflicts.

## 38.6. Browser/UI

Simple/Project switching, mobile/desktop layouts, project dashboard, artifact upload/download, task state.

## 38.7. Production-like

Deploy to Railway-like environment, real HTTP boundaries, secrets, external provider adapter smoke tests where credentials are available.

# 39. Research/engineering validation

Для критических архитектурных решений допускается экспериментальная валидация нескольких вариантов с измерением quality/cost/latency/reliability.

Результаты экспериментов должны сохраняться как Artifacts и Decision records. Решения не должны основываться только на субъективном качестве одного модельного ответа.

# 40. Phased implementation

| **Этап**          | **Содержание**                                             |
|-------------------|------------------------------------------------------------|
| P0 Foundation     | доменная модель, Project/State, persistence, базовый UI    |
| P1 Project Mode   | Project Initialization, Project dashboard, import          |
| P2 Agent Registry | агенты, contracts, permissions                             |
| P3 Orchestrator   | Task Graph, execution records, retry                       |
| P4 Model Layer    | Registry, Router, Provider Adapters, telemetry             |
| P5 Artifact Layer | Artifact Registry, Storage, upload/download, versions      |
| P6 Workspace      | sandbox/build/test/packaging                               |
| P7 Quality        | Gates, tests, repair loop                                  |
| P8 Factory        | Software/AI Agent production flows                         |
| P9 Optimization   | caching, budget-aware routing, deduplication               |
| P10 Scale         | service extraction, workers, queue, advanced observability |

## 40.1. Нормативный принцип пошаговой реализации

Реализация BiForge ДОЛЖНА выполняться как последовательность атомарных инженерных шагов. Каждый шаг имеет уникальный идентификатор BF-XX, ограниченный объём работ, входные артефакты, ожидаемые выходные артефакты, зависимости, тесты и критерий PASS. Шаг считается завершённым только после выполнения его критерия PASS и фиксации результата.

Цель декомпозиции — сделать разработку пригодной для работы в бесплатных/ограниченных сессиях моделей. Шаг должен быть достаточно мал, чтобы одна модель могла понять контекст, внести ограниченное изменение, выполнить тесты и передать результат следующей модели без необходимости пересказывать весь проект.

Номер шага является стабильным идентификатором задания. При передаче работы другой модели или новой сессии НЕ требуется повторно формулировать архитектуру всего проекта: модель получает настоящий документ, актуальный репозиторий/архив и команду на конкретный BF-XX.

## 40.2. Канонический контракт выполнения одного шага

Команда для модели должна иметь форму: «Выполни шаг BF-XX из TZv1. Используй актуальный репозиторий/архив. Не изменяй требования вне границ шага. Выполни реализацию, тесты и исправь только дефекты, относящиеся к шагу. В конце выдай отчёт PASS/FAIL/BLOCKED, список изменённых файлов, тесты и следующий рекомендуемый шаг».

Модель НЕ ДОЛЖНА самовольно объединять несколько шагов, перескакивать через зависимости, менять архитектурные решения более высокого уровня или удалять существующую функциональность, если это не требуется текущим шагом.

Если входные условия шага не выполнены, модель должна вернуть BLOCKED с точным перечнем недостающих входов. Если обнаружен дефект предыдущего шага, допускается локальный FIX только при сохранении границ текущего шага; существенное изменение предыдущего шага оформляется отдельным исправляющим шагом.

## 40.3. Унифицированная структура каждого шага

- ID — уникальный номер BF-XX.

- Название — краткое название инженерной операции.

- Цель — измеримый результат.

- Входы — обязательные документы, код, конфигурация и результаты предыдущих шагов.

- Границы — что разрешено менять и что запрещено менять.

- Выходы — код, тесты, схемы, документы или иные Artifact Objects.

- Тесты — обязательные автоматические/виртуальные/интеграционные проверки.

- Рекомендуемый класс модели — FAST/CHEAP, GENERAL, STRONG или CRITIC/QA.

- Free-session class — SMALL/MEDIUM/LARGE; это планировочная оценка, а не гарантия конкретного провайдера.

- Зависимости — BF-XX, которые должны иметь PASS до начала.

- PASS — объективное условие завершения.

- Отчёт — краткий журнал результата и ссылки/ID созданных Artifact Objects.

## 40.4. Реестр атомарных шагов разработки BiForge

Ниже приведён базовый нормативный план из 44 шагов. Шаги BF-01…BF-44 являются единицами делегирования работы отдельным AI-моделям/сессиям. При изменении архитектуры шаги могут быть дополнены или разбиты, но существующий ID нельзя переиспользовать для другой семантики.

Размеры SMALL/MEDIUM/LARGE обозначают планировочную сложность и предполагаемый объём контекста/работы. Они не являются гарантией лимитов бесплатного провайдера. Фактические лимиты проверяются непосредственно перед запуском шага.

### Фаза 0 — Основание и рабочий контур

#### BF-01 — Baseline и воспроизводимая сборка

Цель: Зафиксировать исходное состояние репозитория, команды build/test, версию, окружение и контрольную точку.

Входы: TZv1, текущий репозиторий

Выходы: README/build metadata, baseline report

Рекомендуемый класс модели: GENERAL

Free-session class: SMALL

Зависимости: нет

PASS: Чистый baseline, воспроизводимая сборка или документированный BLOCKED с причиной.

#### BF-02 — Структура BiForge и модульные границы

Цель: Создать/зафиксировать целевую модульную структуру без реализации всей логики.

Входы: BF-01

Выходы: Architecture skeleton

Рекомендуемый класс модели: STRONG

Free-session class: SMALL

Зависимости: BF-01

PASS: Границы модулей и зависимости зафиксированы; сборка не деградировала.

#### BF-03 — Контракты и идентификаторы

Цель: Определить базовые ID/DTO/event conventions для Project, Task, Artifact, Agent, Run.

Входы: BF-02

Выходы: Domain contracts

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-02

PASS: Контракты однозначны и покрыты schema/unit tests.

### Фаза 1 — Project Mode

#### BF-04 — Разделение Simple / Project

Цель: Физически и логически разделить два независимых режима.

Входы: BF-03

Выходы: Mode routing/UI/state

Рекомендуемый класс модели: GENERAL

Free-session class: MEDIUM

Зависимости: BF-03

PASS: Нет автоматического дублирования Simple → Project; оба режима работают независимо.

#### BF-05 — Project Initialization

Цель: Первый запрос создаёт Project и первоначальный Project Type.

Входы: BF-04

Выходы: Project creation flow

Рекомендуемый класс модели: GENERAL

Free-session class: MEDIUM

Зависимости: BF-04

PASS: Проект создаётся детерминированно, тип сохраняется и может быть изменён.

#### BF-06 — Project Passport

Цель: Ввести паспорт проекта: цель, пользователи, входы/выходы, ограничения, безопасность, нагрузка, критерии успеха.

Входы: BF-05

Выходы: Project Passport model/UI

Рекомендуемый класс модели: GENERAL

Free-session class: MEDIUM

Зависимости: BF-05

PASS: Паспорт создаётся, редактируется, сохраняется и валидируется.

#### BF-07 — Project workspace UI

Цель: Представить Project как рабочее пространство, а не только чат.

Входы: BF-06

Выходы: Project workspace

Рекомендуемый класс модели: GENERAL

Free-session class: MEDIUM

Зависимости: BF-06

PASS: Основные Project objects доступны через UI без нарушения Simple Mode.

### Фаза 2 — Project Intelligence

#### BF-08 — Project State

Цель: Реализовать Facts, Unknowns, Hypotheses, Questions, Decisions, Risks.

Входы: BF-03,BF-05

Выходы: State store/API

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-03, BF-05

PASS: State versioned, validated and recoverable.

#### BF-09 — Project History

Цель: Ввести историю изменений состояния и решений.

Входы: BF-08

Выходы: History/events

Рекомендуемый класс модели: GENERAL

Free-session class: MEDIUM

Зависимости: BF-08

PASS: Любое существенное изменение имеет provenance.

#### BF-10 — Context Assembly

Цель: Собирать контекст модели из role instructions + Project State + relevant decisions/artifacts + task + user input.

Входы: BF-08,BF-09

Выходы: Context builder

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-08, BF-09

PASS: В контекст не попадает нерелевантная история сверх заданной политики.

#### BF-11 — Context economy

Цель: Добавить compaction, relevance filtering, caching hooks и измерение input/cached/output tokens.

Входы: BF-10

Выходы: Context optimizer + telemetry

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-10

PASS: Контекст сокращается без потери обязательных state elements; метрики измеряются.

### Фаза 3 — Agent Registry

#### BF-12 — Agent Registry model

Цель: Реализовать Role, Instructions, Model, Fallback, Tools, Contracts, Permissions, Authority, Escalation.

Входы: BF-03

Выходы: Agent Registry

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-03

PASS: Агент описывается декларативно и валидируется.

#### BF-13 — Core agent roles

Цель: Зарегистрировать PO/BA, Architect, UI/UX, Developer, QA, Security, DevOps, Reviewer, Release, Master.

Входы: BF-12

Выходы: Initial registry

Рекомендуемый класс модели: GENERAL

Free-session class: SMALL

Зависимости: BF-12

PASS: Все роли имеют контракты и permissions.

#### BF-14 — Agent I/O contracts

Цель: Формализовать вход/выход агента и Artifact references.

Входы: BF-12

Выходы: Schemas

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-12

PASS: Невалидный результат агента отклоняется до передачи дальше.

#### BF-15 — Agent permissions and authority

Цель: Реализовать read/write/create/delete/execute/deploy boundaries и escalation.

Входы: BF-12,BF-14

Выходы: Policy engine

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-12, BF-14

PASS: Агент не может выполнить действие вне разрешений.

### Фаза 4 — Orchestration и Task Graph

#### BF-16 — Task model/state machine

Цель: PENDING → READY → RUNNING → SUCCEEDED/FAILED/BLOCKED/CANCELLED.

Входы: BF-03

Выходы: Task engine

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-03

PASS: Переходы состояния валидируются.

#### BF-17 — Task Graph

Цель: Зависимости, параллельность, приоритеты и блокировки.

Входы: BF-16

Выходы: DAG/task graph

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-16

PASS: Граф не допускает некорректных циклов там, где требуется DAG.

#### BF-18 — Master/Orchestrator

Цель: Распределение задач между агентами по контрактам и зависимостям.

Входы: BF-13,BF-17

Выходы: Orchestrator

Рекомендуемый класс модели: STRONG

Free-session class: LARGE

Зависимости: BF-13, BF-17

PASS: Минимальный end-to-end workflow проходит автоматически.

#### BF-19 — Human-in-the-loop

Цель: Autonomous/Supervised/Manual режимы и точки подтверждения.

Входы: BF-15,BF-18

Выходы: Approval gates

Рекомендуемый класс модели: GENERAL

Free-session class: MEDIUM

Зависимости: BF-15, BF-18

PASS: Опасные действия требуют подтверждения согласно policy.

#### BF-20 — Repair Loop

Цель: QA FAIL → analysis → developer → build → tests с лимитом попыток.

Входы: BF-18,BF-19

Выходы: Repair workflow

Рекомендуемый класс модели: STRONG

Free-session class: LARGE

Зависимости: BF-18, BF-19

PASS: Контролируемый цикл ремонта не зацикливается.

### Фаза 5 — Multi-Model Layer

#### BF-21 — Model Registry

Цель: Описать provider/model, capabilities, context, quality/cost/latency class, availability, limits.

Входы: BF-03

Выходы: Model Registry

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-03

PASS: Модель отделена от Agent Role.

#### BF-22 — Provider Adapter contract

Цель: Единый интерфейс auth/request/timeout/retry/telemetry/response/error/capabilities.

Входы: BF-21

Выходы: Provider interface

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-21

PASS: Адаптеры взаимозаменяемы по контракту.

#### BF-23 — First provider adapters

Цель: Подключить минимум два независимых provider/model paths.

Входы: BF-22

Выходы: Provider adapters

Рекомендуемый класс модели: GENERAL

Free-session class: MEDIUM

Зависимости: BF-22

PASS: Оба пути проходят одинаковый conformance test.

#### BF-24 — Model Router

Цель: Маршрутизация по роли, задаче, quality/cost/latency/rate/context/capability/availability.

Входы: BF-21,BF-22,BF-23

Выходы: Router

Рекомендуемый класс модели: STRONG

Free-session class: LARGE

Зависимости: BF-21, BF-22, BF-23

PASS: Для тестового набора выбирается допустимая модель и fallback.

#### BF-25 — Secrets and provider telemetry

Цель: Server-side secrets, env references, redaction, usage/cost/latency/retry metrics.

Входы: BF-22,BF-24

Выходы: Secrets policy + telemetry

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-22, BF-24

PASS: Секреты не попадают в client/logs/state; usage измеряется.

### Фаза 6 — File & Artifact Layer

#### BF-26 — Artifact Registry

Цель: Artifact ID, metadata/content separation, versions, hashes, provenance.

Входы: BF-03

Выходы: Artifact Registry

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-03

PASS: Artifact идентифицируется независимо от filename.

#### BF-27 — Storage Adapter

Цель: DB metadata + object storage abstraction.

Входы: BF-26

Выходы: Storage interface

Рекомендуемый класс модели: GENERAL

Free-session class: MEDIUM

Зависимости: BF-26

PASS: Storage provider можно заменить без изменения domain model.

#### BF-28 — File Operations Engine

Цель: upload/download/copy/move/rename/version/hash/inspect/preview/export.

Входы: BF-27

Выходы: File operations

Рекомендуемый класс модели: GENERAL

Free-session class: MEDIUM

Зависимости: BF-27

PASS: Операции проходят security/permission tests.

#### BF-29 — Archive/Conversion/Parser layer

Цель: Архивы как first-class artifacts; adapters для structured formats; unknown formats сохраняются как binary.

Входы: BF-28

Выходы: Processing adapters

Рекомендуемый класс модели: GENERAL

Free-session class: MEDIUM

Зависимости: BF-28

PASS: Неподдерживаемый формат не уничтожается и остаётся валидным Artifact.

#### BF-30 — Artifact Graph and manifests

Цель: Связи Requirement → Architecture → Implementation → Tests → Release → Deployment.

Входы: BF-26,BF-29

Выходы: Artifact Graph

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-26, BF-29

PASS: Происхождение результата трассируется.

### Фаза 7 — Workspace, Build и QA

#### BF-31 — Workspace Manager

Цель: Sandbox workspace /src /tests /docs /assets /build /dist /tmp и quotas.

Входы: BF-28,BF-30

Выходы: Workspace manager

Рекомендуемый класс модели: GENERAL

Free-session class: MEDIUM

Зависимости: BF-28, BF-30

PASS: Workspace изолирован и имеет лимиты.

#### BF-32 — Build/Execution Manager

Цель: Безопасное выполнение build/test/tool actions.

Входы: BF-31,BF-15

Выходы: Execution layer

Рекомендуемый класс модели: STRONG

Free-session class: LARGE

Зависимости: BF-31, BF-15

PASS: Команды выполняются только по policy и с resource limits.

#### BF-33 — Quality Engine

Цель: Автоматические quality checks: schema, tests, security, lint, build, artifact integrity.

Входы: BF-32

Выходы: Quality Engine

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-32

PASS: Quality report формируется машинно.

#### BF-34 — Quality Gates

Цель: Requirements, Architecture, Build, QA, Release gates.

Входы: BF-33

Выходы: Gate engine

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-33

PASS: Нельзя перейти к следующей стадии при FAIL gate.

#### BF-35 — Virtual testing harness

Цель: Mock providers, fake AI, fault injection, retries, timeouts, long context, files, security/fuzz, concurrency.

Входы: BF-33

Выходы: Test harness

Рекомендуемый класс модели: STRONG

Free-session class: LARGE

Зависимости: BF-33

PASS: Критические сценарии воспроизводимы без платного API.

### Фаза 8 — Software Factory

#### BF-36 — Requirement → Architecture flow

Цель: PO/BA → Architect → approved architecture artifact.

Входы: BF-18,BF-34

Выходы: First factory pipeline

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-18, BF-34

PASS: Проект получает проверенную архитектуру.

#### BF-37 — Architecture → Implementation flow

Цель: Developer agents получают только relevant state/artifacts/task.

Входы: BF-36,BF-30

Выходы: Implementation pipeline

Рекомендуемый класс модели: STRONG

Free-session class: LARGE

Зависимости: BF-36, BF-30

PASS: Код создаётся с provenance и проходит build.

#### BF-38 — Implementation → QA → Repair

Цель: Автоматический QA и repair loop до PASS или escalation.

Входы: BF-20,BF-35,BF-37

Выходы: Factory repair pipeline

Рекомендуемый класс модели: STRONG

Free-session class: LARGE

Зависимости: BF-20, BF-35, BF-37

PASS: Дефект проходит полный цикл до исправления или BLOCKED.

#### BF-39 — Release Candidate

Цель: Формирование RC с manifest, versions, tests, decisions, risks.

Входы: BF-34,BF-38

Выходы: Release artifact

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-34, BF-38

PASS: RC воспроизводим и имеет полный provenance.

### Фаза 9 — Production, economy и hardening

#### BF-40 — Resource Economy Engine

Цель: Учитывать tokens, cached tokens, model calls, latency, CPU/RAM/disk/network/API/storage duplication.

Входы: BF-11,BF-25,BF-32

Выходы: Economy telemetry

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-11, BF-25, BF-32

PASS: Каждый run получает resource profile.

#### BF-41 — Budget-aware routing

Цель: Router выбирает стратегию с учётом доступного бюджета/лимитов и стоимости ошибки.

Входы: BF-24,BF-40

Выходы: Budget policy

Рекомендуемый класс модели: STRONG

Free-session class: MEDIUM

Зависимости: BF-24, BF-40

PASS: При ограничении ресурса система деградирует управляемо.

#### BF-42 — Security hardening

Цель: Threat model, secret isolation, sandbox, permissions, prompt/file injection defenses, audit.

Входы: BF-15,BF-32,BF-40

Выходы: Security baseline

Рекомендуемый класс модели: STRONG

Free-session class: LARGE

Зависимости: BF-15, BF-32, BF-40

PASS: Критические security tests PASS.

#### BF-43 — Observability, backup, recovery

Цель: Run logs, metrics, audit trail, backup/restore, rollback.

Входы: BF-09,BF-25,BF-39

Выходы: Ops baseline

Рекомендуемый класс модели: GENERAL

Free-session class: MEDIUM

Зависимости: BF-09, BF-25, BF-39

PASS: Restore test восстанавливает согласованное состояние.

#### BF-44 — Production acceptance and release

Цель: End-to-end acceptance, documentation, reproducibility, deployment and final gate.

Входы: BF-34,BF-39,BF-41,BF-42,BF-43

Выходы: Release package

Рекомендуемый класс модели: STRONG/CRITIC

Free-session class: LARGE

Зависимости: BF-34, BF-39, BF-41, BF-42, BF-43

PASS: Все обязательные gates PASS; BLOCKED/WAIVED требования явно зарегистрированы.

## 40.5. Правила передачи шага между моделями

После PASS модель обязана вернуть минимум: Step ID, статус, краткое резюме, изменённые/созданные файлы, выполненные тесты, известные ограничения, Artifact/commit identifiers и рекомендуемый следующий шаг.

Следующая модель получает: TZv1, актуальное состояние репозитория, результат предыдущего шага и только те дополнительные артефакты, которые указаны как входы. Полную историю всех предыдущих чатов передавать не требуется.

Если шаг не помещается в рабочую сессию модели, он НЕ должен выполняться частично молча. Модель должна остановиться на безопасной границе, выдать BLOCKED/PARTIAL и предложить разбиение на BF-XX.a/BF-XX.b с сохранением исходного шага как родительского.

Рекомендуемый цикл каждого шага: SPEC CHECK → IMPLEMENT → TEST → FIX LOCAL DEFECTS → VERIFY → REPORT → COMMIT/ARTIFACT.

Для архитектурно критических шагов допускается схема двух независимых моделей: одна выполняет, другая выступает CRITIC/QA и проверяет результат. Для обычных малых шагов достаточно одной модели + автоматических тестов.

Модель должна использовать самый дешёвый/быстрый допустимый класс, если задача не требует более сильного reasoning. STRONG/CRITIC назначаются только там, где риск ошибки оправдывает дополнительный ресурс.

## 40.6. Стандартная команда пользователя для запуска шага

Минимальная команда: «Выполни BF-XX из TZv1. Возьми текущий репозиторий как исходное состояние. Соблюдай границы шага. Реализуй, протестируй, исправь локальные дефекты, зафиксируй результат. Не переходи к следующему шагу. В конце верни PASS/FAIL/BLOCKED и отчёт по шаблону TZv1.»

Расширенная команда при необходимости: «Выполни BF-XX из TZv1. Перед началом проверь зависимости. Если зависимость не PASS — остановись с BLOCKED. Не меняй публичные контракты и архитектурные решения вне шага. Используй существующие тесты и добавь минимальные тесты для нового поведения. Не удаляй рабочую функциональность. После PASS подготовь список изменённых файлов и commit/artifact identifier.»

## 40.7. Политика работы в бесплатных сессиях моделей

Бесплатные лимиты провайдеров являются динамическими и не фиксируются как постоянное инженерное условие. Текущая документация Gemini указывает бесплатный доступ только для определённых моделей и с модельно-зависимыми ограничениями; текущий Free-план OpenRouter указывает 50 запросов/день. Поэтому BiForge должен проектироваться так, чтобы работа продолжалась при смене конкретной модели, провайдера или лимита.

Для экономии ресурса предпочтительно: один шаг = одна рабочая сессия; передавать только актуальные входы; не дублировать весь проект в prompt; использовать Project State и Artifact references; выполнять детерминированные операции локально; использовать кэширование; разделять implementation и independent review только для критических шагов.

Рекомендуемое распределение: FAST/CHEAP — документация, небольшие UI/рефакторинг и простые тесты; GENERAL — обычная реализация; STRONG — архитектура, оркестрация, router, security и сложная отладка; CRITIC/QA — независимая проверка критических результатов.

Оценка количества шагов 44 является исходной плановой декомпозицией, а не жёстким числом. При фактической разработке шаг допускается разбить, если это уменьшает контекст и повышает воспроизводимость. При этом исходный BF-ID должен сохраняться как родительский идентификатор.

# 41. Open engineering decisions before implementation

Следующие решения должны быть приняты на архитектурной спецификации/детальном design stage, если они не определены отдельным документом:

- конкретная СУБД и схема миграций

- конкретный object storage provider

- очередь/брокер

- sandbox technology

- конкретные API contracts

- формат Agent DSL/config

- формат Task/Artifact events

- точная стратегия context caching для каждого provider

- конкретные модели и тарифные политики

- resource budget units и формулы стоимости

- authentication/authorization пользователя

- retention policies

- disaster recovery targets

- точные performance/SLA thresholds

Эти пункты не являются пробелом ТЗ: это сознательно выделенные решения следующего инженерного уровня, которые должны приниматься на основании экспериментов, ограничений инфраструктуры и актуальных API.

# 42. Приоритеты требований

| **Приоритет** | **Класс**                                                                                              |
|---------------|--------------------------------------------------------------------------------------------------------|
| P0            | безопасность, целостность данных, секреты, корректность state, отсутствие несанкционированных действий |
| P1            | Project Mode, Project State, Agent Registry, Orchestrator, Model Router, Artifact Layer                |
| P2            | Quality Engine, Workspace, Factory workflows, advanced multi-model diversity                           |
| P3            | расширенные оптимизации, дополнительные providers/adapters, advanced UX                                |

# 43. Критерий инженерной готовности

BiForge считается готовым к переходу от архитектурного прототипа к производственной итерации только при наличии: воспроизводимого build; автоматизированного test suite; работающего Project State; безопасного secrets management; минимум двух независимых model/provider adapters в тестовой конфигурации; Artifact Registry и object storage abstraction; sandboxed execution; Quality Gates; resource telemetry; documented rollback; и evidence по критическим security checks.

# 44. Итоговая целевая архитектура

Целевая система представляет собой взаимосвязанный набор слоёв:

- Simple Conversation Engine

- Project Engine

- Project Intelligence / Project State

- Agent Registry

- Orchestration Engine

- Task Graph

- Artifact Engine

- File & Artifact Layer

- Artifact Graph

- Processing Router

- Workspace / Execution Layer

- Model Registry

- Model Router

- Provider Adapters

- Tool Layer

- Quality Engine

- Quality Gates

- Repair Loop

- Project Memory

- Template Engine

- Observability / Resource Economy

Формула взаимодействия: User/Project → Project Intelligence → Tasks → Agents → Tools/Models/Artifacts → Quality Gates → Release/Result, при постоянном контроле безопасности, происхождения и стоимости.

# 45. Заключительные положения

BiForge должен строиться как универсальная, расширяемая и ресурсно-экономичная инженерная система. Его ценность определяется не количеством подключённых моделей или агентов, а способностью организовать сложную работу как управляемый процесс: понять задачу, структурировать неопределённость, выбрать минимально достаточные ресурсы, сформировать задачи и артефакты, выполнить работу специализированными агентами, проверить результат, исправить ошибки и выдать воспроизводимый итог.

Ключевая инженерная философия: сильные модели используются точечно; детерминированные инструменты — там, где они эффективнее; память представляется структурированным состоянием; файлы представлены артефактами; агенты действуют через разрешённые инструменты; критические действия проходят quality gates; а каждый расход токенов, времени и инфраструктурного ресурса должен быть оправдан полезностью результата.

# Приложение A. Минимальный словарь

| **Термин**           | **Определение**                                       |
|----------------------|-------------------------------------------------------|
| BiForge              | Расширенная система на базе Bifurcation Engine        |
| Simple Mode          | Независимый поток обычного общения и decision support |
| Project Mode         | Долгоживущая структурированная проектная среда        |
| Project Intelligence | Структурированное знание и неопределённость проекта   |
| Project State        | Компактное текущее состояние проекта                  |
| Agent                | Конфигурируемый исполнитель роли                      |
| Orchestrator         | Управляющий задачами и зависимостями компонент        |
| Model Router         | Компонент выбора модели/провайдера                    |
| Artifact             | Файл или производный проверяемый результат            |
| Artifact Graph       | Граф происхождения артефактов                         |
| Workspace            | Изолированная среда файловой и вычислительной работы  |
| Quality Gate         | Контрольная точка допуска к следующей стадии          |
| Repair Loop          | Управляемый цикл исправления после failure            |
| Resource Budget      | Ограничение расхода вычислительных/API ресурсов       |

# Приложение B. Принцип трассируемости

Для любой существенной операции должна быть возможна цепочка: кто инициировал → какая задача → какой агент → какая модель/версия инструмента → какие входные Artifacts → какое действие → какие выходные Artifacts → какие проверки → какой итог. Трассируемость не должна раскрывать секреты.

# Приложение C. Источник требований

Нормативной основой данного TZv1 является аванпроект «BiForge», версия v3, включая решения о Simple/Project Mode, Project Intelligence, Agent Registry, Orchestration Engine, Task Graph, Artifact Graph, Model Registry/Router, server-side secrets, File & Artifact Layer и Resource Economy. Материалы о конкретных AI-провайдерах рассматриваются как исходные варианты интеграции, а не как вечные технические ограничения.

**40.8 Repository State, GitHub Integration & Agent Handoff Protocol**

**40.8.1 Нормативный статус**

Этот раздел является обязательным продолжением протокола BF-01…BF-44. Git-репозиторий является Source of Truth для исходного кода и версионируемых текстовых конфигураций. Проектное состояние BiForge, артефакты и журналы выполнения дополняют Git, но не заменяют его. Ни один следующий агент не должен получать предыдущий проект только в виде ZIP-архива, если доступна Git-база.

**40.8.2 Принцип единой базы**

Каждый шаг BF-XX начинается с точно идентифицированного baseCommit. Агент обязан получить репозиторий в состоянии этого commit, проверить чистоту/согласованность рабочей области и только после этого приступать к работе. Результатом шага является resultCommit либо Pull Request, однозначно происходящий от baseCommit. Следующий шаг получает resultCommit как новый baseCommit только после прохождения предусмотренных Quality Gates.

**40.8.3 Что является Source of Truth**

1\) Git repository — исходный код, тесты, конфигурация, документация, инструкции агентов, история commits/branches/tags. 2) Project State — требования, решения, архитектурное состояние, Task Graph, Agent Registry, Quality Gates и эксплуатационное состояние. 3) Artifact Store — крупные бинарные/сгенерированные объекты. Между тремя слоями должны существовать стабильные идентификаторы и ссылки. Секреты не являются содержимым Git или Project State.

**40.8.4 Обязательная структура репозитория BiForge**

.biForge/ рекомендуется использовать для машинно-читаемого состояния проекта: project.yaml, current-state.json, steps/BF-XX/{SPEC.md,REPORT.md,TEST_RESULT.md,MANIFEST.json}, agents/, decisions/, architecture/, policies/. Корневой AGENTS.md или эквивалентный файл должен содержать обязательные правила работы агента. Конкретные имена файлов могут быть уточнены реализацией, но семантика должна сохраняться.

**40.8.5 Контракт запуска шага**

Каждый запуск должен содержать: projectId, repository, repositoryRef/branch, baseCommit, stepId, TZ version, step specification, previousStepStatus, relevant Project State references, relevant Artifact references, agentId, model/provider, autonomy level, allowed tools, budget/resource limits. Если baseCommit отсутствует или не может быть подтверждён, выполнение изменяющего шага запрещается и результатом является BLOCKED.

**40.8.6 Канонический жизненный цикл BF-шага**

INIT → RESOLVE_BASE → CHECKOUT → VERIFY_BASE → LOAD_CONTEXT → PLAN → IMPLEMENT → LOCAL_TEST → QUALITY_GATE → COMMIT/BRANCH → PUSH → PR (если требуется) → REVIEW → MERGE/ACCEPT → PUBLISH_STEP_STATE → HANDOFF. Агент не должен переходить к следующему BF-XX автоматически, если это прямо не разрешено оркестратором соответствующей политикой.

**40.8.7 Рабочая ветка агента**

По умолчанию агент не изменяет protected main/master непосредственно. Для изменяющего шага создаётся из baseCommit отдельная ветка вида bf/BF-XX-\<short-name\>-\<run-id\>. Один run изменяет одну логическую ветку. Merge выполняется после Quality Gate. Для малых локальных изменений допускается прямой commit только если это явно разрешено repository policy и уровнем автономности.

**40.8.8 Pull Request как контрольная точка**

Для Supervised и критических шагов PR является стандартной точкой передачи результата. PR должен содержать stepId, baseCommit, resultCommit, краткое описание, изменённые файлы, тесты, Quality Gate, ограничения, риски и ссылки на Step Report. PR не должен считаться PASS только потому, что агент создал commit; PASS определяется Quality Gate.

**40.8.9 Передача между разными моделями**

Модель N+1 не получает историю чата модели N как обязательный контекст. Она получает repository state от принятого commit, спецификацию шага, релевантный Project State, предыдущий Step Report и необходимые Artifact references. Это обеспечивает независимость провайдеров и моделей и предотвращает накопление лишнего контекста.

**40.8.10 Подключение coding agents к GitHub**

Поддерживаемая реализация может использовать GitHub Actions/Agentic Workflows либо собственный runner/control plane. На текущей документации GitHub в Agentic Workflows поддерживаются GitHub Copilot, Anthropic Claude, OpenAI Codex и Google Gemini; engine задаётся конфигурацией workflow. Для Claude, Codex и Gemini API-ключи могут храниться как repository secrets; для Copilot в organization repository возможен встроенный GITHUB_TOKEN с необходимым copilot-requests permission. Конкретные тарифы, лимиты и доступность являются внешними изменяемыми параметрами и не должны быть зашиты в архитектуру.

**40.8.11 GitHub Actions / Agentic Workflow**

Для автоматизированного исполнения допускается .github/workflows/\*.md с YAML frontmatter и естественно-языковыми инструкциями, компилируемый в защищённый .lock.yml workflow согласно механизму GitHub Agentic Workflows. Workflow должен явно задавать triggers, permissions, engine, network policy и safe outputs. В production использование preview-механизмов GitHub должно быть защищено внутренней совместимостью/версионированием BiForge.

**40.8.12 Аутентификация и секреты**

API keys провайдеров хранятся только в GitHub Secrets/Environment Secrets либо в секретном хранилище BiForge. GitHub token должен иметь минимально необходимые права. Секреты запрещено помещать в source code, AGENTS.md, prompts, Project State, artifacts, logs, patches, Step Reports и PR descriptions. Значения секретов никогда не должны выводиться агентом. Ротация ключей не должна требовать изменения исходного кода.

**40.8.13 Модель прав**

Права агента разделяются на read, write-branch, create-PR, merge, release и production-deploy. По умолчанию агент получает минимальный набор. Merge, production deployment, изменение branch protection, secrets и destructive operations требуют отдельной авторизации. Права workflow должны быть явными и минимальными.

**40.8.14 GitHub и provider adapter**

BiForge Model Router не должен считать GitHub частью конкретной модели. Provider Adapter отвечает за вызов модели и её telemetry, а GitHub Adapter/Repository Adapter — за clone/fetch/checkout/branch/commit/push/PR/status. Такое разделение позволяет заменить Codex на Claude или Gemini без изменения Task Graph и Agent Registry.

**40.8.15 Стандартные инструкции агента**

В репозитории должен существовать нормативный файл AGENTS.md (или эквивалентный механизм конкретного coding agent), содержащий: Source of Truth; правила ветвления; запрет секретов; правила тестирования; запрет перехода к следующему BF; требования к отчёту; правила commit/PR; требования к сохранению архитектурных контрактов; процедуру BLOCKED. Специфические файлы вроде GEMINI.md могут дополнять общий контракт, но не отменяют его.

**40.8.16 Контекст, который разрешено передавать модели**

Минимальный контекст: текущая задача, Project State subset, релевантные decisions/ADRs, relevant artifacts, текущая ветка/commit, требования тестов и ограничения. Полная история проекта, старые чаты и все предыдущие patch-файлы передаются только при доказанной необходимости. Context Builder обязан уменьшать дублирование.

**40.8.17 Проверка базы перед изменениями**

Перед изменением файлов агент обязан: получить актуальный ref; проверить commit SHA; проверить отсутствие неожиданных незакоммиченных изменений; проверить соответствие baseCommit ожидаемому; прочитать обязательные project instructions; определить scope BF-XX. Несоответствие базы, конфликт ветки или неизвестные изменения → BLOCKED, без автоматического уничтожения чужих изменений.

**40.8.18 Commit contract**

Каждый логический BF-XX должен иметь минимум один идентифицируемый result commit. Commit message должен содержать stepId, например \`BF-18: implement master orchestrator\`. Commit должен быть воспроизводим относительно baseCommit. Если шаг состоит из нескольких технических commits, итоговый Step Manifest обязан перечислить их порядок и итоговый accepted commit.

**40.8.19 Step Delivery Package**

Обязательный результат шага: commit/result reference + STEP_REPORT.md + TEST_RESULT.txt или эквивалентный структурированный отчёт + ARTIFACT_MANIFEST.json. BF-XX.patch является переносимым дополнительным артефактом и должен ссылаться на baseCommit. Полный ZIP не является обязательным результатом обычного шага.

**40.8.20 Правило архивов**

Полный архив проекта создаётся только для milestone/release/backup/transfer/recovery или когда Git недоступен. Для больших бинарных файлов используются Artifact Store и ссылки/хэши. Если изменение бинарного файла нельзя корректно передать через обычный текстовый patch, бинарный объект передаётся как Artifact, а его идентификатор, hash и связь с commit фиксируются в Manifest.

**40.8.21 Step Manifest**

Минимальные поля: projectId, stepId, status, baseCommit, resultCommit, branch, runId, agentId, providerId, modelId, startedAt, finishedAt, changedFiles, createdFiles, deletedFiles, tests, qualityGate, artifactIds, reportRef, patchRef, risks, blockers, nextAllowedStep. Manifest должен быть машиночитаемым и валидируемым.

**40.8.22 Step Report**

Отчёт обязан содержать: цель; входные условия; baseCommit; что реализовано; что сознательно не реализовано; changed/created/deleted files; архитектурные решения; тесты; результаты Quality Gates; known issues; resource/token telemetry если доступна; resultCommit/PR; Artifact references; статус PASS/FAIL/BLOCKED; условия для следующего шага.

**40.8.23 Правила FAIL и BLOCKED**

FAIL означает, что агент выполнил попытку, но acceptance criteria не достигнуты. BLOCKED означает отсутствие безопасной возможности продолжить: неверная база, отсутствие credentials, отсутствие зависимости, конфликт, превышение разрешённого бюджета или необходимость человеческого решения. BLOCKED не должен маскироваться под PASS. Следующий шаг не запускается автоматически после FAIL/BLOCKED.

**40.8.24 Repair Loop**

Исправление выполняется в пределах разрешённого BF-XX и его retry budget. После каждой существенной коррекции повторяются релевантные тесты. Если превышен лимит попыток, создаётся отдельный repair task и human escalation. Агент не должен бесконечно изменять код ради прохождения одного теста без проверки требований.

**40.8.25 Quality Gates и merge**

Минимальные gates: scope, build, tests, lint/typecheck при наличии, security checks при применимости, artifact integrity и step acceptance criteria. Только PASS позволяет принять результат. Для защищённых веток merge выполняется GitHub branch protection/required checks либо оркестратором с эквивалентным контролем.

**40.8.26 Параллельные агенты**

Параллельные задачи разрешаются только при отсутствии конфликтующих областей и при наличии независимых baseCommit/branches. Слияние выполняется через PR/merge queue и обязательный повторный validation после merge. Два агента не должны одновременно редактировать один логический контракт без coordination record.

**40.8.27 Работа при сбое агента**

Если агент завершился без результата, оркестратор сохраняет run metadata и рабочую ветку, если это безопасно. Следующий запуск начинается с последнего подтверждённого commit либо с явно указанного recovery commit. Нельзя считать частично изменённую рабочую область успешным результатом.

**40.8.28 Воспроизводимость**

Для каждого run фиксируются repository, commit, branch, workflow version, agent version, model/provider, configuration version, relevant prompt/spec version, tests and outputs. Цель — возможность воспроизвести не обязательно побайтно ответ модели, но состояние кода, набор входных данных и процедуру принятия результата.

**40.8.29 GitHub permissions matrix**

Рекомендуемая матрица: Reader — contents:read, metadata:read; Developer — contents:read/write на feature branch, pull-requests:write; QA — contents:read, checks/statuses:write при необходимости; Orchestrator — управление runs/branches/PR в пределах проекта; Release — merge/release/deploy только после gates; Production Agent — отдельный минимальный scope и обязательный human approval для опасных операций.

**40.8.30 Протокол запуска через GitHub**

Канонический flow: 1) создать/выбрать BF-XX run; 2) определить baseCommit; 3) выбрать agent/model через Router; 4) создать branch/workspace; 5) передать минимальный context; 6) checkout; 7) execute; 8) test; 9) produce report/manifest; 10) commit; 11) push; 12) create/update PR; 13) run gates; 14) accept/merge или FAIL/BLOCKED; 15) publish Project State; 16) set next step baseCommit.

**40.8.31 Ручной fallback без GitHub Agent**

Если конкретная AI-среда не поддерживает GitHub write access, допускается локальный runner: clone → checkout baseCommit → модель работает с локальным workspace → tests → commit/patch → push/PR человеком или сервисом. Полный ZIP используется только как последний fallback при отсутствии Git.

**40.8.32 Независимость от конкретного провайдера**

Архитектура не должна требовать, чтобы все BF-XX выполняла одна модель. Agent Registry описывает роль, Model Router выбирает provider/model, а Repository Adapter обеспечивает одинаковый Git contract. Замена модели не должна менять Project State, Task Graph или Artifact Graph.

**40.8.33 Технологическая рекомендация для первой реализации**

Для первого работающего контура рекомендуется GitHub repository + protected main + feature branch per BF step + GitHub Actions + один из поддерживаемых coding agents. После стабилизации протокола подключается BiForge Orchestration Engine, который автоматизирует запуск, выбор модели, сбор контекста, проверку, PR и передачу baseCommit.

**40.8.34 Внешние зависимости и актуальность**

GitHub Agentic Workflows находятся в public preview и могут изменяться. Поэтому конкретные engine names, permissions, CLI версии, secret names, workflow syntax и поддерживаемые агенты должны храниться в Provider/GitHub Adapter configuration и проверяться при установке/CI, а не рассматриваться как неизменяемая часть доменной модели.

**40.8.35 Нормативное правило для всех BF-01…BF-44**

Ни один шаг не считается корректно выполненным, если невозможно ответить на четыре вопроса: (1) от какого baseCommit он стартовал; (2) какой агент/модель его выполнял; (3) каким resultCommit/PR он закончился; (4) какие проверки доказали PASS. Отсутствие любого из этих доказательств переводит результат в INCOMPLETE/BLOCKED и запрещает бесконтрольную передачу следующему шагу.

**Приложение D. Канонические шаблоны GitHub/Agent Handoff**

**D.1 Команда запуска шага**

> Выполни BF-XX из TZv1.x. Репозиторий является Source of Truth. Начни строго с указанного baseCommit. Не переходи к следующему шагу. Работай только в пределах scope BF-XX. Выполни implementation, tests и Quality Gates. Создай result commit/PR. Верни STEP_REPORT, TEST_RESULT и MANIFEST со статусом PASS/FAIL/BLOCKED.

**D.2 Минимальный handoff**

> projectId: \<id\>  
> stepId: BF-XX  
> repository: \<owner/repo\>  
> baseCommit: \<sha\>  
> branch: \<branch\>  
> agentId: \<agent\>  
> providerId: \<provider\>  
> modelId: \<model\>  
> tzVersion: TZv1.x  
> previousStep: BF-YY  
> previousStatus: PASS  
> relevantState: \<refs\>  
> artifacts: \<refs\>  
> allowedScope: \<scope\>  
> acceptance: \<criteria\>

**D.3 Канонический результат**

> BF-XX/  
> STEP_REPORT.md  
> TEST_RESULT.txt  
> ARTIFACT_MANIFEST.json  
> BF-XX.patch (optional portable transfer artifact)  
> Git:  
> baseCommit = \<sha\>  
> resultCommit = \<sha\>  
> branch = bf/BF-XX-...  
> PR = \<number/url if used\>  
> Status:  
> PASS \| FAIL \| BLOCKED

**D.4 Запреты**

> Не использовать неизвестную базу. Не удалять чужие незакоммиченные изменения. Не менять protected main без разрешения. Не передавать/записывать секреты. Не считать commit доказательством качества. Не переходить к следующему BF без разрешения. Не заменять Project State неструктурированной историей чата. Не отправлять полный архив, если достаточно Git state + references.

**Приложение E. Внешние нормативные источники (проверены при редакции TZv1.2)**

- GitHub Docs — Develop agentic workflows in GitHub Actions: поддержка Claude Code, OpenAI Codex, Google Gemini CLI и Copilot CLI; настройка credential через repository secrets/permissions.

- GitHub Docs — Creating GitHub Agentic Workflows: workflow markdown + YAML frontmatter, engine, permissions, safe outputs и компиляция в .lock.yml.

- GitHub Docs — About GitHub Agentic Workflows: agentic workflows выполняются в GitHub Actions, используют natural-language instructions и guardrails.

- GitHub Docs — Copilot cloud agent: ограничения repository/branch/session и требования совместимости с repository rules.

- Google GitHub Actions — run-gemini-cli: Gemini CLI GitHub Action, repository secret GEMINI_API_KEY и GEMINI.md.

**Историческая отметка версии TZv1.2:** эта редакция добавила нормативный Repository State, GitHub Integration & Agent Handoff Protocol. В текущей консолидированной редакции соответствующие требования сохранены и дополнены последующими разделами.

## 40.9. Конкретная инфраструктура текущего экземпляра BiForge

**40.9.1. GitHub Source of Truth.** Текущий репозиторий проекта: https://github.com/ecooorg/bf. Страница настроек репозитория: https://github.com/ecooorg/bf/settings. Репозиторий ecооorg/bf является фактической базой исходного кода для текущего экземпляра BiForge. URL страницы Settings используется для настройки правил репозитория, Actions, Secrets/Variables, Environments, веток и средств безопасности; секретные значения в ТЗ не фиксируются.

**40.9.2. Railway Runtime.** Текущий публичный runtime/deployment endpoint BiForge: https://e-production-5cc8.up.railway.app/. Он является адресом работающего экземпляра, а не источником исходного кода. В ТЗ его следует использовать как BIFORGE_PUBLIC_URL. Если API действительно опубликован на стандартном пути, его API-адрес должен быть отдельно подтверждён как BIFORGE_API_URL; до подтверждения нельзя считать /api гарантированным.

**40.9.3. Канонические идентификаторы окружения.**

- GITHUB_REPOSITORY_URL = https://github.com/ecooorg/bf

- GITHUB_REPOSITORY_OWNER = ecooorg

- GITHUB_REPOSITORY_NAME = bf

- GITHUB_SETTINGS_URL = https://github.com/ecooorg/bf/settings

- BIFORGE_PUBLIC_URL = https://e-production-5cc8.up.railway.app/

- BIFORGE_API_URL = TBD — подтвердить фактический API base path

**40.9.4. Разделение ролей GitHub и Railway.** GitHub хранит исходный код, историю версий, pull requests, workflows и контроль изменений. Railway выполняет сборку/развёртывание и предоставляет runtime, публичный домен, переменные окружения, логи, метрики и deployment history. Railway поддерживает подключение GitHub-репозитория как source; при подключении ветки новые commits могут запускать автоматическую сборку и deployment.

**40.9.5. Запрещённая передача секретов.** API keys, GitHub tokens, Railway tokens, database passwords, signing keys, OAuth secrets и другие секретные значения не должны включаться в ТЗ, STEP_REPORT, prompts, Git commits, Project State или Artifact Manifest. В ТЗ фиксируются только имена переменных, тип секрета, назначение, область действия и место хранения. GitHub Secrets/Environment Secrets и Railway Variables предназначены для этой функции.

## 40.10. Данные, которые необходимо собрать для полного инфраструктурного профиля

Для завершения инженерного описания текущего экземпляра BiForge требуется не пароль и не значения ключей, а метаданные конфигурации. Данные разделены на GitHub и Railway.

### 40.10.1. GitHub — обязательный минимум

- **Repository visibility:** Public или Private.

- **Default branch:** Например main/master; фактическое имя необходимо подтвердить.

- **Branches/rules:** Правила защиты основной ветки, PR requirements, required status checks, запрет force-push/delete.

- **Actions:** Список workflows в .github/workflows и какие из них запускаются на push/PR/manual.

- **Environments:** Например production/staging; какие secrets/approvals связаны с ними.

- **Repository secrets/variables — только имена:** Названия переменных/секретов без значений.

- **Collaborators/teams:** Кто имеет Read/Triage/Write/Maintain/Admin; секретные персональные данные не нужны.

- **Webhook/integration status:** Связь GitHub → Railway и иные CI/CD интеграции.

- **Code/security settings:** Dependabot, secret scanning/push protection, code scanning, dependency graph.

- **Repository tree:** Верхнеуровневый список каталогов/файлов; особенно package.json, lockfile, src, tests, Dockerfile, railway config.

- **Current commit:** SHA и branch, который сейчас считается базовым для BiForge.

### 40.10.2. GitHub — желательно

- PR template и issue templates.

- AGENTS.md, CONTRIBUTING.md, CODEOWNERS и существующие developer instructions.

- Последние 3–5 merged PR: только metadata/ссылки и краткое содержание.

- Названия required checks и среднее время их выполнения.

- Release/tag strategy.

- GitHub Actions runner/permissions configuration.

- Наличие GitHub App/OAuth integration для будущих coding agents.

### 40.10.3. Railway — обязательный минимум

- **Project name:** Имя Railway Project.

- **Environment:** Production/staging/development и фактическое активное окружение.

- **Service name:** Имя сервиса, которому принадлежит e-production-5cc8.up.railway.app.

- **Deployment source:** GitHub repository + branch или Docker image; подтвердить связь с ecooorg/bf.

- **Current deployment:** Deployment ID и Git commit SHA; это позволит связать runtime с resultCommit.

- **Build command:** Фактическая команда сборки или auto-detected configuration.

- **Start command:** Фактическая команда запуска.

- **Healthcheck:** Endpoint/команда, timeout и ожидаемый результат.

- **Public domains:** Railway domain и custom domains, если есть.

- **Service variables — только имена:** Названия переменных без значений; отдельно отметить secret/sealed.

- **Volumes:** Есть ли persistent volume, mount path, размер и назначение.

- **Database/other services:** Есть ли Postgres/Redis/queue/object storage и их роль; секреты не передавать.

- **Region/replicas:** Регион и число реплик, если настроено.

- **Resource limits:** CPU/RAM/storage/network limits или фактические настройки тарифа/сервиса.

- **Logs/metrics:** Какие наблюдаемость и retention доступны.

### 40.10.4. Railway — желательно

- Deployment history последних 5–10 deployment.

- Причины последних failed deployments, если были.

- Auto-deploy/trigger policy.

- Rollback strategy.

- Cron/scheduled jobs, если существуют.

- Private networking/service-to-service dependencies.

- Backup policy для persistent data.

- OpenTelemetry/tracing configuration, если используется.

## 40.11. Формат передачи конфигурации в BiForge

Для подготовки следующей редакции ТЗ не требуется присылать скриншоты всего интерфейса. Предпочтителен структурированный инвентаризационный отчёт. Его можно получить вручную из GitHub/Railway или сформировать через API/CLI. Секретные значения должны быть заменены на \[REDACTED\].

GITHUB  
repository: ecooorg/bf  
visibility: \<public/private\>  
default_branch: \<...\>  
current_commit: \<SHA\>  
protected_branches: \<...\>  
required_checks: \<...\>  
actions_workflows: \<...\>  
environments: \<...\>  
secret_names: \<names only\>  
variable_names: \<names only\>  
security_features: \<...\>  
railway_integration: \<yes/no\>  
  
RAILWAY  
project: \<...\>  
environment: \<...\>  
service: \<...\>  
deployment_id: \<...\>  
git_commit_sha: \<...\>  
git_branch: \<...\>  
build_command: \<...\>  
start_command: \<...\>  
healthcheck: \<...\>  
public_domain: https://e-production-5cc8.up.railway.app/  
api_base_url: \<confirmed or TBD\>  
variable_names: \<names only\>  
sealed_variables: \<names only\>  
volumes: \<...\>  
databases/other_services: \<...\>  
region: \<...\>  
replicas: \<...\>  
resource_limits: \<...\>  
auto_deploy: \<...\>  
rollback: \<...\>

## 40.12. Нормативная связь Git commit → Railway deployment

Каждый принятый шаг BF должен иметь resultCommit. Railway deployment должен быть трассируем до этого commit. Если deployment создан из GitHub trigger, Railway предоставляет deployment/git metadata, включая commit SHA, branch, repository owner/name и commit message. Поэтому связка BF step → resultCommit → Railway deployment → runtime URL является обязательной частью воспроизводимости.

# Приложение F. Источники текущей инфраструктурной конфигурации

Пользовательские исходные адреса:

- GitHub repository/settings: https://github.com/ecooorg/bf/settings

- Railway public runtime: https://e-production-5cc8.up.railway.app/

Актуальные правила Railway по service variables, Git metadata и public domain сверяются с официальной документацией Railway; секретные значения в документацию BiForge не копируются.

## 40.13. Фактический GitHub-инвентарь текущего экземпляра BiForge

Источник данного раздела: предоставленные пользователем скриншоты GitHub repository ecооorg/bf от 08.10.2026. Значения ниже считаются подтверждёнными только в пределах видимой на скриншотах информации.

### Идентификация репозитория

- Repository: ecooorg/bf

- URL: https://github.com/ecooorg/bf

- Visibility: Public

- Default branch: main

- Видимый последний commit: f1db1d — “Delete BFv1.zip” (на момент скриншота 35 минут назад).

- На главной странице отображается 2 deployments, включая BiForge / production.

### Видимая структура репозитория

- .github/workflows, public, scripts, server, src, tests

- .env.example, .gitignore, CHANGELOG_AGENT_BEHA... (имя обрезано интерфейсом), DEPLOY_RAILWAY.md, QA_DRIVE_CHECKLIST.md, README.md, index.html, nixpacks.toml, package-lock.json, package.json, railway.toml, server.ts, tsconfig.json, vite.config.ts

### Языковой состав

- TypeScript 68.6%

- JavaScript 24.5%

- CSS 6.5%

- Other 0.4%

### General / repository policy

- Template repository: выключено.

- Release immutability: выключено.

- Wiki: включён; редактирование ограничено collaborators only.

- Issues: включены; создание разрешено All users.

- Sponsorships: выключены.

- Preserve repository: включено.

- Discussions: выключены.

- Projects: включены.

- Pull requests: включены; создание разрешено All users.

- Merge commit: разрешён.

- Squash merging: разрешён.

- Rebase merging: разрешён.

- Auto-merge: выключен.

- Automatic deletion head branches: выключено.

- Web-based commit sign-off: не требуется.

- Комментарии к individual commits: разрешены.

- Git LFS objects in archives: не включены.

- Push branch/tag limit: не включён.

- Auto-close linked issues after merged PR: включён.

### Branch protection

- Classic branch protection rules: не настроены.

- На экране Branches не отображается настроенный branch ruleset.

### GitHub Actions

- Actions policy: Allow all actions and reusable workflows.

- Require actions to be pinned to full-length commit SHA: выключено.

- Check/workflow/status/artifact/log retention: 90 days.

- Fork PR workflow approval: требуется для first-time contributors.

- Default GITHUB_TOKEN workflow permissions: Read repository contents and packages permissions.

- GitHub Actions create/approve pull requests: выключено.

### Environment и secrets

- Environment: BiForge / production.

- На экране Actions secrets and variables указано: Repository secrets отсутствуют.

- Environment secrets на показанном экране отсутствуют.

- Секретные значения не раскрывались и в инвентарь не заносятся.

### Advanced Security

- Private vulnerability reporting: выключено.

- Dependency graph: выключен.

- Dependabot alerts: выключены.

- Dependabot security updates: выключены.

- Grouped security updates: выключены.

- Dependabot version updates: не настроены.

- CodeQL analysis: не настроен; доступна кнопка Set up.

- AI Scan for pull requests: выключен.

- Copilot Autofix: включён.

- Check runs failure threshold: security alerts High or higher; standard alerts Only errors.

- Secret Protection: включён.

- Push protection: включён.

### Что ещё не подтверждено этими скриншотами

- Список и содержимое GitHub Actions workflows.

- Collaborators/Teams и их уровни доступа.

- Webhooks и GitHub Apps.

- Детали rulesets, если они существуют на другом уровне.

- Связка конкретного Railway deployment с commit SHA.

- Все параметры Railway.

## 40.14. Нормативная оговорка по визуальному инвентарю

Скриншоты являются первичным визуальным источником для этого инвентаря. Если в последующих скриншотах обнаружится более новая конфигурация, применяется последняя подтверждённая версия. Непоказанные параметры не считаются отключёнными или отсутствующими — они имеют статус NOT_OBSERVED.

# Приложение G. Машиночитаемый инвентарь

JSON-файл сохранён отдельно: /mnt/data/BiForge_GitHub_Inventory_2026-10-08.json


---

## Контроль редакции документа

- **Идентификатор:** BiForge-TZ
- **Редакция:** TZv1.4 (консолидированная Markdown-версия)
- **Дата подготовки:** 2026-10-09
- **Рекомендуемый путь в репозитории:** `docs/specs/BIFORGE_TECHNICAL_SPEC.md`
- **Нормативность:** требования `MUST`/`ДОЛЖЕН` обязательны; `SHOULD`/`СЛЕДУЕТ` требуют обоснования при отклонении; `MAY`/`МОЖЕТ` допускают вариантность.
- **Важно:** описание фактической инфраструктуры и инвентаря отражает сведения, собранные при подготовке редакции, и должно обновляться после подтверждённых изменений. Секретные значения в документ не включаются.
- **Правило реализации:** документ не означает, что все функции уже реализованы. Реальное состояние подтверждается Git-коммитами, отчётами BF-шагов, результатами тестов и deployment evidence.
