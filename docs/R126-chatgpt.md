# R126 — Анализ цикла итеративных улучшений BiForge

**Дата анализа:** 2026-11-06  
**Базовый архив:** `bf-126-31-green.zip` (commit `4cfd0bf`, release `126.31`)  
**Дополнительные материалы:** `bf.zip`, вложенные All Logs / answer-quality diagnostics, deployment log, `render.md`, PDF с диалогом сессии «нулевой результат».  
**Тип документа:** диагностический отчёт и план остановки бесполезных изменений. Не патч; код и репозиторий не менялись.

---

## 1. Executive summary

### Главный вывод

BiForge не выглядит проектом, в котором «всё написано плохо». Он выглядит как проект, в котором **механизм разработки и улучшения стал сложнее, чем механизм доказательства пользовательской ценности**.

В репозитории уже есть значительные средства контроля: `AGENTS.md`, CI/DAG, category tests, generated inventories, docs/scripts allowlists, diagnostics, user-value evidence. Но эти средства преимущественно подтверждают:

- отсутствие определённых регрессий;
- соответствие структуры и документации правилам;
- успешную компиляцию/сборку;
- прохождение тестов на заранее сформулированных контрактах;
- корректность отдельных plumbing-компонентов.

Они **не подтверждают автоматически**, что конечный пользователь получил лучший ответ, успешнее создал приложение или быстрее выполнил задачу. В документах это различие уже проговорено, но оно пока не превратилось в достаточно жёсткий *операционный стоп-кран* для новых итераций.

**Не рекомендую начинать проект с нуля.** Не рекомендую и сбрасывать весь код/документацию/тесты. Нужен не «reset repository», а **reset режима разработки**: остановить необязательные улучшения, выбрать один критический пользовательский сценарий, зафиксировать baseline, определить заранее критерии успеха/неуспеха и разрешать изменения только при наличии доказательства улучшения.

Рекомендуемый курс:

1. Заморозить широкие cleanup/refactor/optimization инициативы.
2. Оставить текущий `126.31` как контрольную точку и не считать её автоматически «хорошей» — это baseline, а не сертификат качества.
3. Сначала сформировать небольшой **User Outcome Acceptance Set** (5–10 реальных задач пользователя, включая известные провалы).
4. Сравнивать до/после на одинаковых входах, с одинаковыми настройками и сохранёнными ответами/артефактами.
5. Любое изменение — один гипотезный фактор, заранее определённый критерий, ограниченный эксперимент, автоматический rollback/отмена при ухудшении.
6. Перестать принимать «тесты зелёные», «код стал чище», «модель предложила улучшение» и «CI PASS» как самостоятельные основания для следующего изменения.

---

## 2. Что было изучено и границы доказательств

### Архив и код

В архиве `bf-126-31-green.zip` находится BiForge v126.31, commit `4cfd0bf1c5ba7591fa1000a3a9befd184ab0f97f`. В дереве присутствуют:

- крупный `server.ts` и доменные модули `server/`;
- несколько продуктовых режимов (Simple, Expert, Project/Architect);
- retrieval/search, model routing, diagnostics, repair loop, app builder;
- client workspace и Google Drive;
- CI workflows, verification manifest, scripts integrity, governance tests;
- обширные append-only `CHANGELOG.md` / `TECHNICAL_REPORT.md`;
- `docs/USER_VALUE_EVALUATION.md`, `TESTING_AND_ACCEPTANCE.md`, `TEST_MAP.md`.

### Диагностика

All Logs snapshot:

- commit `4cfd0bf`, release `126.31`;
- окно 72 часа;
- 1000 application-log rows;
- 443 Simple rows, 34 Expert rows, 0 Project rows;
- 56 exchange events, 34 client-render acknowledgements;
- 37 error rows, 201 warning rows, 9 HTTP failures;
- system diagnostics: runtime, DB, migrations (19/19), event schema и application-log storage — PASS, общий статус — WARN;
- uptime около 20 180 секунд, RSS около 162 MB;
- artifact storage — NOT RUN, поскольку сохранённых артефактов не было.

Эти числа нельзя интерпретировать как общую частоту ошибок продукта: выборка логов ограничена окном/экспортом и содержит неоднородные события. Но они показывают, что «работает сервер» и «система полностью здорова» — разные утверждения.

### CI

Answer Quality diagnostics показывают workflow PASS. Offline suite: 12/12, live smoke workflow формально PASS, но summary говорит **TAP 0/0**, DAG 0 checks. Это важное различие: успешный workflow status при отсутствии структурированных проверок не является доказательством качества ответа.

В deployment log сборка и запуск успешны, но есть предупреждения:

- `.env` содержит `NODE_ENV=production`, что Vite сообщает как неподдерживаемое для `.env`;
- крупный frontend chunk (>500 KB);
- `INEFFECTIVE_DYNAMIC_IMPORT` для `jszip`;
- `MaxListenersExceededWarning` в runtime;
- отдельные Gemini quota exhaustion / fallback events.

Это реальные инженерные сигналы, но они не равны пользовательским дефектам и не должны автоматически превращаться в новые patch cycles без оценки воздействия.

---

## 3. Как проявился цикл «изменения без результата»

### 3.1. Реконструкция видимого цикла из диалога

PDF «нулевой результат» содержит последовательность решений и патчей:

| Патч | Заявленная задача | Фактический характер / урок |
|---|---|---|
| P126.20 | Уплотнение документации | Снижение документационного шума; в целом полезное структурное изменение |
| P126.21 | Docs micro-hardening | Добавлены правила и governance |
| P126.22 | Исправление CI из-за `docs/1.txt` | Пользователь справедливо заметил: первопричина устраняется удалением одного файла; дополнительный patch был необязательным hardening |
| P126.23 | scripts allowlist, удаление per-patch/one-off scripts | Полезное упорядочивание, но затронута поверхность tooling |
| P126.24 | Удаление no-op npm checks + DAG cleanup, один model-sources | Реальное повышение честности CI; но проявилась несогласованность вызывающего workflow |
| P126.25 | Зафиксировать Drive/workspace как keep | Документирование owner decision; закрывает повторяющийся вопрос |
| P126.26 | CI fix после P126.24 | Workflow всё ещё ссылался на удалённый `test:ui-smoke`; тесты не стартовали, DAG NOT_RUN |
| P126.27 | CI/docs reference fixes | Следующая цепочка зависимостей: ссылки/пины после предыдущего изменения |
| P126.28 | Render primary, security pointer, connectors path | Смешаны doc-only и небольшие path/config edits |
| P126.29 | Trigger поиска для статистики + ungrounded % gate | Изменение продуктового поведения |
| P126.30 | Удаление statistic reply gate | Отмена предыдущего поведения: ответ модели должен проходить без post-hoc replacement |
| P126.31 | Search query hygiene | Следующая корректировка retrieval query processing |

Эта последовательность **не доказывает**, что все перечисленные патчи были бесполезны. Некоторые устранили конкретные проблемы. Но она хорошо показывает паттерн:

1. Модель предлагает правдоподобный cleanup/guardrail.
2. Изменение добавляется к уже сложной governance/CI поверхности.
3. Возникает неучтённая связь или скрытая зависимость.
4. Следующий патч исправляет последствия предыдущего.
5. Проект получает ещё больше правил и файлов.
6. Пользовательский результат измеряется отдельно, непоследовательно или вовсе не измеряется.

Особенно показателен P126.22: пользователь обнаружил, что для устранения CI failure достаточно удалить `docs/1.txt`. Дополнительный patch не был необходим для восстановления CI. Это классический пример **расширения scope сверх минимального исправления**.

P126.24 → P126.26 — более существенный пример: удаление no-op scripts было разумным, но связанный workflow продолжал вызывать `test:ui-smoke`. Preflight остановил DAG, и 18 checks стали NOT_RUN. P126.26 исправил orchestration, но одновременно убрал шаг, который только имитировал UI smoke, а реального browser e2e в CI по-прежнему не было. Это не «бесполезный код» в строгом смысле — это пример того, как сложная система проверки создаёт каскад сопровождения и риск ложного ощущения coverage.

### 3.2. Самый важный продуктовый пример — лиственницы

По request index и conversation logs:

- Simple #1: запрос о проценте лиственниц в Швейцарии — search failed, 0 источников, fallback на Groq.
- Simple #2: «найди только цифру» — search used, 6 источников, но query был испорчен переводом/формулировкой: `by maximum quantity and me the percentage of larches`; точной статистики в найденном наборе не было.
- Expert: search used, 4 источника, ответ — точных данных нет.
- Поздний Simple: search used, 6 источников, в основном туристические сайты (Valais/Nendaz/SwissFamilyFun/Nationalpark), не лесоустроительная статистика.
- В более ранних пользовательских скриншотах/диалоге были несовместимые ответы: 17–18%, 12–14%, 30–35%. Они не были подтверждены источниками; в ответах смешивались доля по количеству деревьев и доля по древесному запасу.

Важно: в самой последней диагностике ответ уже часто отказывался от конкретного процента, когда источники не содержали числа. Это лучше, чем уверенная выдумка, но пользовательская задача всё ещё не решена: запросить точную статистику, найти её или ясно объяснить, почему не удалось.

Иными словами, система могла улучшить search trigger, honesty gate, query stripping и тесты — но **главная задача пользователя («дать надёжный процент») всё ещё не закрыта**. Это и есть метрика, которую нельзя подменить наличием очередного patch.

### 3.3. Другие свежие live-data сигналы

В logs:

- запрос о результатах выборов США: search timeout → честное сообщение о неудаче;
- повторный вопрос о местах в Конгрессе/Сенате: search `not_run`, ответ с общими сведениями вместо требуемых текущих цифр;
- прогноз погоды для Oslo: search used, 6 источников, выдан подробный прогноз;
- Simple иногда использует 3.5, иногда 3.1 Flash Lite, потому что 3.5 cascade может ротироваться на следующий SKU;
- quota exhaustion по Gemini приводит к fallback provider, а некоторые search planning операции тоже зависят от Gemini.

Это показывает не одну «ошибку промпта», а системную проблему: пользователь ожидает **выполнения задачи**, а приложение отслеживает главным образом состояние pipeline.

---

## 4. Почему самые сильные модели предлагают разные решения

Это не парадокс и не обязательно недостаток IQ модели. Причины системные.

### 4.1. Модель оптимизирует локальный запрос, а не долгосрочную полезность продукта

Если попросить «упорядочить scripts», модель может удалить устаревшие файлы. Если попросить «укрепить governance», она добавит тесты и allowlist. Если попросить «исправить CI», она изменит workflow. Каждый ответ может быть разумным **локально**.

Но модель не имеет автоматического знания о том, что:

- уже было сделано в 15 предыдущих сессиях;
- какая стоимость сопровождения уже накоплена;
- какие изменения не принесли пользы;
- какой пользовательский сценарий должен улучшиться;
- где владелец предпочитает простое удаление вместо дополнительной абстракции.

Даже длинный контекст и `AGENTS.md` не устраняют этот конфликт. Контекст помогает соблюдать правила, но не превращает расплывчатую цель «улучшить проект» в проверяемый продуктовый критерий.

### 4.2. «Изменить» легче, чем «доказать, что не надо менять»

LLM получает вознаграждение/оценку за полезный ответ и часто стремится предложить действие. В software task это проявляется как:

- рефакторинг, потому что файл большой;
- добавление теста, потому что тесты кажутся хорошими;
- добавление guardrail, потому что он предотвращает гипотетический риск;
- новый план, новый документ, новый patch;
- продолжение работы после того, как исходная задача уже закрыта.

Сильная модель может генерировать качественную аргументацию для противоположных решений: оставить архитектуру, разбить её; добавить post-processing, убрать его; усилить gate, сделать gate мягче. Без объективного эксперимента оба варианта могут выглядеть убедительно.

### 4.3. Кодовые метрики не совпадают с пользовательской ценностью

| Метрика | Что она подтверждает | Чего не подтверждает |
|---|---|---|
| Typecheck PASS | Типы согласованы | Пользователь получил правильный ответ |
| Unit tests PASS | Проверенные сценарии работают | Непроверенные сценарии / реальные модели |
| CI green | Workflow завершился успешно | Workflow проверял нужное качество |
| Файл стал меньше | Структура/объём изменился | Стало легче поддерживать / меньше дефектов |
| Новый guard | Есть ограничение на известный класс | Пользовательский сценарий улучшился |
| Search `used` | Search pipeline был вызван | Результаты релевантны и достаточны |
| 6 sources | Получено 6 источников | Источники authoritative и отвечают на вопрос |
| Model output без postprocess | Текст не переписан после генерации | Ответ точен, grounded и сопоставим с Google Gemini app |

**Зелёный CI — доказательство инженерной совместимости, не пользовательской полезности.**

### 4.4. Сложность и история создают «инерцию оптимизации»

В проекте уже много исторических patch records, changelog, technical report, test maps, verification manifest, architecture graphs и scripts. Часть этой структуры необходима. Но она создаёт психологический эффект: «раз есть сложный процесс — надо ещё улучшить процесс».

Оптимизация governance может превратиться в собственный продукт, который обслуживает сам себя.

### 4.5. Модель плохо распознаёт diminishing returns без внешнего stop condition

Каждый следующий patch может дать небольшой локальный выигрыш, но:

- увеличивает площадь поверхности;
- добавляет новые правила;
- требует синхронизации тестов/документации/workflows;
- увеличивает шанс случайных регрессий;
- отдаляет команду от проверки конечного сценария.

Если нет лимита итераций, заранее заданного acceptance и права остановиться, модель может продолжать почти бесконечно.

---

## 5. Известные практики и современные направления, которые помогают остановить цикл

Это не одна новая методика. Эффективнее сочетать проверенные инженерные подходы с AI-specific controls.

### 5.1. Outcome-driven development / product discovery

До изменения формулируется пользовательская проблема и ожидаемый наблюдаемый результат. Не «улучшить retrieval», а:

> На 8/10 тестовых запросов о текущих фактах система либо выдаёт проверяемый ответ с релевантными источниками, либо корректно сообщает, что доказательств недостаточно; не выдаёт неподтверждённые числа.

Это связывает изменения с user outcome.

### 5.2. Hypothesis-driven development и falsifiable hypotheses

Каждый patch — проверяемая гипотеза:

- **Гипотеза:** query cleaning уменьшит долю meta-instruction в поисковом запросе.
- **Метрика:** query fidelity; доля релевантных источников; успешность задачи.
- **Критерий:** определён до изменения.
- **Фальсификация:** если метрика не улучшилась или другая важная метрика ухудшилась — гипотеза отвергнута.

Не «кажется лучше после просмотра логов».

### 5.3. Scientific method / controlled experiments

- baseline;
- один фактор за раз;
- одинаковый corpus;
- одинаковые настройки;
- несколько повторов для stochastic LLM;
- blind/paired comparison;
- сохранить prompt, model ID, search status, evidence packet, response, latency/cost;
- не менять критерий после получения результата.

Для стохастических моделей единичный run недостаточен. Изменения сравнивать на нескольких повторениях или фиксированном наборе запросов.

### 5.4. Regression benchmark / golden tasks с реальными задачами

Golden tasks полезны только если они отражают пользовательские задачи, а не структуру текущего кода. В BiForge уже есть `scripts/golden-eval.mjs`, `tests/golden-tasks.json`, `server/goldenEval.ts`, `docs/USER_VALUE_EVALUATION.md`. Их нужно **не множить**, а связать в один понятный outcome harness.

Тестовые задачи должны включать:
- правильный ответ или acceptable answer criteria;
- обязательные источники/данные, если это research;
- допустимые альтернативы;
- критерии отказа/неопределённости;
- user task completion;
- визуальный/файловый artifact acceptance для Project/Architect.

Не pin exact prose LLM. Pin factual and behavioral properties.

### 5.5. Change budget / WIP limit / iteration cap

На одну проблему:

- максимум 1 диагностический цикл;
- максимум 1 основной patch;
- максимум 1 follow-up patch на выявленный regression;
- после этого — остановка и пересмотр гипотезы/архитектуры, не третий косметический patch.

Это не универсальный закон, а полезный guardrail для данного проекта, где уже наблюдалась серия patch-after-patch.

### 5.6. Small batch / trunk-based development / reversible changes

- один небольшой change set;
- быстрое интегрирование;
- feature flags для рискованного поведения;
- rollback прост;
- не смешивать cleanup + product logic + CI wiring + documentation in one patch;
- не удалять fallback/compat path, пока не доказана его ненужность.

### 5.7. Mutation testing / test quality, а не только test quantity

Нужно задавать вопрос не «сколько тестов добавлено?», а «сломает ли тест suite, если дефект вернётся?». Проверять:
- негативные сценарии;
- fault injection;
- stale data;
- empty/no evidence;
- timeout/quota;
- cross-mode parity;
- browser-visible outcome.

Но mutation testing — инструмент для качества тестов, не показатель пользовательской ценности сам по себе.

### 5.8. LLM-as-judge — только как вспомогательный инструмент

AI judge может ускорить сравнение, но:
- не должен быть единственным арбитром;
- может предпочитать длинные/уверенные ответы;
- может разделять bias генератора;
- критерии должны быть рубрикой и калиброваться на человеческих примерах;
- финальный acceptance для важных сценариев — владелец/человек.

### 5.9. Stop-the-line / quality gates

При критическом дефекте пользовательского сценария прекращать новые cleanup/refactor задачи до исправления. Но gate должен блокировать **релиз/изменение поведения**, а не создавать бесконечные governance-патчи.

### 5.10. YAGNI / KISS / deletion as a first-class option

Перед добавлением:
- можно ли исправить удалением?
- можно ли изменить одну строку?
- можно ли оставить известный, но не вредный technical debt?
- есть ли пользователь, который увидит улучшение?
- не существует ли уже механизма, который делает то же самое?

«Не менять» должно быть полноценным результатом исследования.

---

## 6. Что в BiForge уже хорошо и не следует сбрасывать

Не надо считать весь предыдущий труд бесполезным.

### Сохранить

- `AGENTS.md` как owner/process contract — но уменьшить его роль до ясных hard constraints, не превращать в бесконечный procedural framework.
- category-based tests и `TEST_MAP.md`;
- docs/scripts integrity allowlists;
- verification manifest и честные статусы PASS / FAIL / NOT_RUN / BLOCKED;
- user-value evidence с разделением OBSERVED / INFERRED / NOT_RUN;
- source policy / privacy / security decisions;
- migrations и data persistence;
- Google Drive и browser workspace (owner decision: KEEP);
- appBuilder core/ports boundary;
- search/model diagnostics;
- текущую версию `126.31` как baseline, которую можно воспроизвести.

### Не делать

- полный rewrite «потому что накопилось»;
- удаление workspace/Drive;
- массовое удаление серверных модулей;
- переписывание migrations;
- реорганизацию всех больших файлов ради количества строк;
- добавление ещё одного `C127_*` / patch-specific document;
- новые тесты без определённого defect class / outcome;
- повторную чистку tests/docs/scripts без конкретной наблюдаемой проблемы.

---

## 7. Что действительно требует внимания в текущем проекте

### P0 — не cleanup, а пользовательский результат

**Simple/Expert live factual answers.**

Из логов видно:
- search trigger может не включиться;
- search может timeout/quota fail;
- search may be `used`, но query не соответствует пользовательскому намерению;
- источники могут быть туристическими/общими вместо authoritative;
- model cascade меняет SKU (3.5 → 3.1);
- fallback provider может ответить без того же retrieval context;
- текущие выборы/числа иногда заменяются общими объяснениями;
- UI/diagnostics способны показать pipeline success, когда user task не выполнен.

Рекомендация: сделать один компактный factual task benchmark и приоритетно закрыть его. Не начинать с новых abstractions.

### P1 — честность evidence pipeline

Ввести/зафиксировать end-to-end evidence contract:

1. User question → resolved intent/task.
2. Search decision: expected / not expected.
3. Search query (в том виде, как реально отправлен).
4. Sources: title, host, timestamp, relevance.
5. Evidence sufficiency decision.
6. Answer claims linked to evidence, либо explicit abstention.
7. Visible result + outcome label.

Важно: `searchStatus=used` недостаточно. Система должна различать:
- search was invoked;
- sources retrieved;
- sources relevant;
- sources sufficient;
- factual claims grounded.

### P2 — model cascade and fallback

Текущая ротация между Gemini 3.5 Flash Lite и 3.1 Flash Lite объясняет часть variability. Но фиксирование 3.5 alone может снизить variability и одновременно ухудшить availability/quota resilience.

**Не менять cascade без A/B test.** Сравнить:
- 3.5-only;
- 3.5 → 3.1;
- fallback provider.
На одинаковом corpus измерить answer quality, abstention correctness, success rate, latency, quota errors, cost. «Одна модель» не равна «одна истина».

### P3 — orchestration/CI reliability

CI/DAG уже сокращён до 18 declared checks, что хорошо. Но P126.24 → P126.26 показывает важный риск: scripts, manifest, workflows, preflight должны изменяться атомарно. При workflow PASS без DAG checks нельзя сообщать «quality verified».

Не нужно ещё одного governance framework. Нужен простой status summary:
- `CI orchestration valid`;
- `checks executed: N`;
- `checks not run: M`;
- `product outcome evaluation: PASS/FAIL/NOT_RUN`.

### P4 — структура кода

Большие файлы (`server.ts`, `server/webSearch.ts`, `src/ExpertStepScreens.tsx`) — **не доказанный источник пользовательских проблем**. Их split может быть полезен, но не должен быть отдельной инициативой сейчас.

Split делать только если:
- текущая feature/bug затрагивает этот модуль;
- конкретный extraction boundary определён;
- behavior unchanged;
- есть targeted regression coverage;
- изменение упрощает реальную работу (например, уменьшает число файлов/контекст, которые нужно менять вместе).

---

## 8. Рекомендованный «reset» — не переписывание, а новый режим работы

### Фаза 0 — Freeze (сразу)

На 2–3 недели или до закрытия одного пользовательского сценария:

**Разрешено:**
- critical bug;
- security/privacy;
- build/deploy failure;
- изменение, необходимое для измерения user outcome;
- минимальный patch, подтверждённый воспроизводимым failure.

**Запрещено без отдельного решения owner:**
- general cleanup;
- file splitting;
- renaming/reorganization;
- docs polishing;
- new abstractions;
- «просто улучшить prompt»;
- patch, который не имеет user-level acceptance.

Это не заморозка продукта. Это заморозка *необязательной активности*.

### Фаза 1 — Baseline card

Создать один короткий baseline record (не новую длинную документацию):

```md
Product baseline: BiForge 126.31
Commit: 4cfd0bf
Scenario: [one user task]
Expected outcome: [observable]
Current result: [actual]
Failure rate: [N / M runs]
Latency: [median / p95]
Source/evidence quality: [rubric]
Cost/quota: [if relevant]
Known limitations: [...]
```

Не начинать с «в целом качество агента». Один сценарий.

### Фаза 2 — User Outcome Set (5–10 задач)

Для текущего live factual-answer проблемного домена рекомендуется начать с 8 задач:

1. Exact numeric statistic with a known authoritative source.
2. Current political result / live count.
3. Weather forecast for a specified place/time horizon.
4. Follow-up that refers to prior entity/context.
5. Search requested explicitly (“search multiple sites”).
6. Query with instruction meta text (“only number”, “no explanation”).
7. Search timeout/quota failure.
8. Topic switch followed by a factual question (no stale context).

Для каждой задачи записать:
- canonical user prompt;
- expected result or criteria;
- required source class;
- unacceptable failure;
- acceptable abstention;
- mode (Simple/Expert);
- whether repeatability matters.

### Фаза 3 — Baseline execution

Каждую задачу выполнить на текущем deployed baseline:
- Simple;
- Expert (если режим применим);
- 3–5 repeats для stochastic cases;
- save logs and visible outputs;
- owner scores results blind if possible.

Не использовать ответы модели, которая предложила patch, как единственный evaluator.

### Фаза 4 — One change / one hypothesis

Для каждой итерации:

1. Назвать один дефект.
2. Назвать одну гипотезу.
3. Указать target files.
4. Указать expected metric delta.
5. Указать possible regression.
6. Ограничить patch scope.
7. Запустить baseline and candidate.
8. принять/отклонить.
9. Если результат неопределён — не добавлять ещё guard; исследовать.

### Фаза 5 — Stop condition

Patch **не принимается**, если:
- нет воспроизводимого failure или user need;
- acceptance сформулирован после изменения;
- нет before/after comparison;
- улучшение только по code cleanliness;
- user value `NOT_RUN`, а change объявлен product improvement;
- второй follow-up patch исправляет первый patch’s side effect без root-cause reassessment.

Если после 2 попыток метрика не улучшилась:
- revert;
- вернуть baseline;
- изменить гипотезу;
- не продолжать «допиливание» той же идеи без новой evidence.

### Фаза 6 — Release gate

Релизное решение должно содержать отдельно:

| Gate | Status |
|---|---|
| Build/typecheck | PASS/FAIL/NOT_RUN |
| Unit/category regression | PASS/FAIL/NOT_RUN |
| Integration/live provider | PASS/FAIL/NOT_RUN |
| User task outcome | PASS/FAIL/NOT_RUN |
| Browser-visible UX | PASS/FAIL/NOT_RUN |
| Operational reliability | PASS/FAIL/NOT_RUN |

Если user outcome NOT_RUN — можно выпустить технический change только если это прямо обозначено как infrastructure/maintenance, но нельзя объявлять «качество агента улучшено».

---

## 9. Пример минимальной карточки изменения

```md
## Change hypothesis: search query fidelity

### User problem
User says “search as many sites as possible and give only the percentage”.
Current query includes translated/meta wording and misses the target metric.

### Baseline
Commit: 4cfd0bf
Prompt: [exact]
Simple runs: [captured]
Expert runs: [captured]
Query: [actual]
Sources: [actual]
Outcome: [rubric]

### Hypothesis
Removing process-only wording from query improves topical retrieval without losing
the original entity/metric.

### Change
One isolated change to query cleaning/contextualization.

### Acceptance (defined before patch)
- Query contains target entity + metric.
- Query does not contain instruction meta-phrases.
- At least X/Y benchmark cases retrieve relevant sources.
- No regressions on follow-up/topic-switch cases.
- Answer does not assert unsupported percentage.
- Owner evaluation: useful result or honest failure.

### Decision
ACCEPT / REJECT / INCONCLUSIVE
Reason: [...]
```

---

## 10. Прямой ответ: начать с нуля или обнулить части проекта?

### Полный restart: NO

Почему:
- код и данные уже несут реальные функции;
- Drive/workspace — owner-confirmed keep;
- migrations, CI, architecture contracts, source policy, logs, tests — полезные активы;
- переписывание создаст новую большую серию итераций, не гарантируя user value;
- «чистая архитектура» не решит retrieval/model/evidence failure автоматически.

### Частичный reset: YES, но процессный

Обнулить/заморозить:
- backlog «ещё что-то улучшить»;
- текущую привычку выпускать patch после каждой рекомендации модели;
- необязательные cleanup инициативы;
- критерий «всё зелёное → проект улучшен»;
- автоматическое принятие LLM-generated suggestions без owner outcome.

Сохранить:
- код;
- стабильный baseline;
- CI/test governance;
- историю и evidence;
- owner decisions;
- конкретные пользовательские сценарии.

### Перепроектировать с нуля только отдельный subsystem?

Пока нет. Search/retrieval может нуждаться в упрощении, но сначала нужен data-driven diagnosis. Если benchmark покажет, что текущая система имеет слишком много конкурирующих retrieval planners/gates, тогда рассматривать **узкий subsystem redesign** (search decision → query → retrieval → evidence sufficiency → response), а не rewrite всего BiForge.

---

## 11. Конкретный план следующих действий

### Не делать следующий cleanup patch

Сейчас **не** делать:
- очередной scripts/docs cleanup;
- server.ts split;
- webSearch.ts split;
- temperature/model cascade change;
- prompt rewrite;
- добавление ещё одного statistic gate;
- новую allowlist/manifest abstraction.

### Сделать сначала

**Step 1 — Owner выбирает один outcome.** Рекомендуемый: «Simple/Expert не выдаёт противоречивые неподтверждённые численные ответы; если запрос требует актуального/официального числа, возвращает grounded value или честно говорит, что источников недостаточно».

**Step 2 — Сформировать benchmark на 8–10 запросов** из реальных logs (лиственницы, выборы, погода, follow-up, explicit search, timeout/quota).

**Step 3 — Снять baseline 126.31** на deployed version и зафиксировать реальные search queries, sources, final answer, model ID, latency.

**Step 4 — Выбрать одну первопричину**. Предварительно наиболее вероятная зона — query/planner/evidence relevance, а не постобработка текста. Но это гипотеза, не окончательный вывод.

**Step 5 — Один эксперимент.** Например, сравнить 3.5-only и 3.5→3.1 cascade либо сравнить текущий query builder с query-fidelity candidate — не делать оба одновременно.

**Step 6 — Оценить.** Если improvement не наблюдается — revert. Не создавать follow-up patch только потому, что предыдущая модель предлагает новый refinement.

---

## 12. Важные нюансы и ограничения

- Архив содержит конкретный snapshot. Он не доказывает текущий remote HEAD после экспорта.
- PDF — часть истории диалога, а не независимая техническая telemetry.
- All Logs отражают ограниченный 72h window и включают mixed events.
- Некоторые user-visible outcomes подтверждены client render ACK; это означает, что UI получил/отрисовал ответ, а не что ответ был полезен/правилен.
- Search `used` означает invocation/availability, не answer grounding.
- В отчёте не утверждается, что все patch cycles были без пользы. Утверждается, что **системный процесс позволял продолжать изменения без обязательного outcome evidence**.
- Я не запускал приложение/CI на реальном deployment; результаты описаны по приложенным архивам/логам.

---

## 13. Итог

BiForge не нужно выбрасывать. Ему нужно прекратить **самообслуживание инженерного процесса** и вернуть фокус на реальные задачи пользователя.

Самая опасная привычка — не плохой код и не слишком большие файлы. Это ситуация, когда каждая следующая итерация выглядит профессионально, имеет changelog, tests и зелёный CI, но команда не может показать, какой пользовательский сценарий стал лучше и насколько.

**Следующий шаг — не P126.32 cleanup. Следующий шаг — baseline + benchmark + один outcome-driven experiment.**

Если эксперимент не улучшает результат — отменить изменение. Не «улучшать улучшение».
