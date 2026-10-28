# BiForge — Current Task and Patch Control

**Current patch:** P117.3 — Conversational Agent freshness/recovery fixes, regression tests, and opt-in staging transcript workflow.
**Status:** implementation patch prepared; P116 acceptance NOT claimed; LIVE retest requires configured GitHub Actions secrets and an explicit workflow dispatch.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task, the canonical roadmap, and the user-outcome specification.
**Current specification:** `docs/AI-USER-VALUE-SPEC.md`.
**Current evidence baseline:** `docs/AI-USER-VALUE-REPORT.md` (newest record: P117.2).
**Only roadmap:** `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.

## Immediate objective — P117.3

Record the first LIVE baseline of the Simple-mode Conversational Agent (v117, commit `ab35ebd`) and turn the findings into a bounded work order for the next implementation patch. P117.2 changes documentation only. The Future Universal Model Resilience Layer (P121) stays planned-only in `docs/AI-USER-VALUE-SPEC.md` section 8.

## Next implementation patch — P116 Conversational Agent recovery

**Label (Navigator to confirm, ND-3):** `P117.3`, keeping `APP_VERSION` 117. Reason: `scripts/check-version.mjs` requires the newest `## P<N>` CHANGELOG heading to carry the same major number as `APP_VERSION`; a `## P116.x` entry would fail the version check unless the version is changed.

**Baseline to beat:** 7/12 PASS, 4 PARTIAL, 1 FAIL (see report). One bounded outcome: the Simple agent answers current-state questions with fresh evidence or a concrete best-knowledge answer, drops the stock caveat, and keeps what already works (no fabrication, context retention, brevity).

### Navigator decisions resolved for P117.3

- ND-1: Option A; widen existing conservative regex triggers, no model contract change.
- ND-2: preserve HTTP 200 truthful fallback with `meta.fallback=true` / `meta.errorCode`; test as the contract.
- ND-3: label `P117.3`, app version remains 117.
- ND-4: do not add a Serper time-range parameter or extra request in this patch; preserve search volume/credit use. Preserve dates already returned by Serper in the digest. Strict date-window filtering remains a known limitation.

### Navigator decisions required before implementation

- **ND-1 Freshness trigger strategy.** Option A (recommended first): widen the existing privacy-conservative regex triggers and add a referral-only soft-fail. Option B: a model-side "needs fresh data" flag in the JSON contract; more robust, larger change, and sends more user text to the search engine. Default if undecided: A.
- **ND-2 Failure-path contract.** Current behavior: HTTP 200 with a truthful fallback reply and `meta.fallback=true`, `meta.errorCode`. The P116 acceptance instruction expects 4xx/5xx. Recommended: keep HTTP 200 (the user sees an actionable message; the client keeps the user's text) and test that exact contract; update the instruction wording. Alternative: return 503 with a body the UI renders.
- **ND-3 Patch label and version.** Default: `P117.3`, version 117.
- **ND-4 Search cost.** WI-3 may need a time-range parameter or an additional Serper request, which changes credit use. Billing changes keep their authorization tier (roadmap rule 9); implementation must not change search volume without approval.

### Work items

Each item states observed evidence, required user outcome, minimal change, and tests. Mock tests prove control flow only; model behavior is proven only by the LIVE re-test.

**WI-1 (P1) Hidden freshness and no non-answers (finding F1).**
- Outcome: (a) questions about the current/latest version, status, price or holder of a named thing trigger search when it is enabled; (b) when search is skipped or fails, the reply still gives a best-knowledge answer with an as-of statement and one concrete way to verify, never only a referral; (c) private or decision-style texts still do not trigger search.
- Minimal change: extend `FRESH_PATTERNS` (RU and EN) to allow a few intervening tokens or hyphenated compounds between a recency word (сейчас, актуальн*, текущ*, последн*, latest, current) and версия/релиз/version/release/LTS; add "какая сейчас/последняя … версия" forms. Extend `informationSoftFail` with a referral-only detector (short reply, referral phrase, no concrete entity or number) that reuses the existing single retry. Do not add prompt paragraphs unless a paired golden comparison shows these two are insufficient.
- Mock tests (`tests/p116-conversational.test.mjs`): at least 10 positive fixtures must trigger, including "Какая сейчас актуальная LTS-версия Node.js?", "Какая сейчас актуальная LTS-версия Ubuntu?", "Какая последняя стабильная версия Python?", "What is the current stable Python version?"; at least 8 negative fixtures must not trigger, including "В последнее время я стал хуже спать. Как наладить режим?", "Какая столица Австралии?", "Объясни, что такое LTS". A referral-only reply fixture must trigger the soft-fail retry; a concrete reply must not.

**WI-2 (P2) Stock caveat (finding F2).**
- Outcome: a caveat appears only attached to a specific uncertain or time-sensitive claim; recommendations and opinions carry no generic closing sentence.
- Minimal change: shorten or reword the "label as general knowledge and worth verifying" sentence in `modeParagraph('information')` (net removal). First capture paired baseline outputs for C1, D1 and three more prompts; change only with a behavior comparison (spec section 5).
- Tests: mock test asserts prompt composition (the stock-label instruction removed, prompt length not increased). Behavior is judged LIVE.

**WI-3 (P2) Freshness window and per-claim traceability (finding F3).**
- Outcome: for explicit time-window requests ("за неделю", "сегодня") each reported item carries its date; items outside the window are omitted or labelled; the sources footer prefers article-level URLs; if only section pages exist the reply says items could not be tied to specific articles.
- Minimal change (to be verified at implementation, subject to ND-4): carry `date` from Serper organic/news entries into the digest lines; prefer news-type entries for news requests; evaluate the Serper time-range parameter for window requests. Any prompt text added here must replace, not add to, existing text.
- Mock tests: `digestFromSerperResponse` fixtures keep dates; footer ordering fixture prefers deep links over root/section URLs.

**WI-4 (P3) Research-mode misclassification (finding F4).**
- Outcome: explicit research intent ("сравни X и Y", "compare", "найди") selects research; incidental word forms ("напомни, какие города сравниваем", "я сравниваю варианты") do not.
- Minimal change: add a Unicode-aware trailing boundary to the Cyrillic stems in `RE_RESEARCH` (same technique as `webSearch.ts`). Note for the implementer: `detectConversationMode` also tests the last three user turns, so an earlier explicit "сравни" keeps research active; report this, do not widen scope.
- Observe only: epistemic verifier `INVALID_OUTPUT` (1 of 16). Act only if it recurs in 2 or more requests of the next run.

**WI-5 (P3) Direct recommendation phrasing (finding F5).**
- Outcome: when the user asks for a recommendation and forbids intros or questions, the first sentence states the recommendation directly, with at most one alternative line and no stock closer.
- Minimal change: extend `RE_FORBADE_METHODOLOGY` / `RE_DEMANDED_DIRECT` with "без вступлений", "без предисловий", "коротко и по делу" forms (regex only); fixtures in the mock test. Verify what `userForbadeQuestions` already covers before editing.

**WI-6 (UNKNOWN) "Kanberra" (finding F6).** Re-run B4 three times in the next LIVE cycle. If it recurs, inspect the post-processing chain (`stripMarkdown`, `scrubInternalLabels`) before touching prompts; otherwise close as NOT_REPRODUCED.

**WI-7 (required for the gate) Hermetic mock suite.** `tests/p116-conversational.test.mjs`, included in `npm test` and the DAG, using the existing fake provider. Cover the four P116 acceptance categories: C1 direct answer without Expert template; C2 search called when enabled and honestly skipped when off, including the WI-1 fixtures; C3 history of at least 3 turns carrying key entities; C4 failures (503, 429, bad JSON) asserting the contract chosen in ND-2. Label results MOCK; keep live tests separate and labelled LIVE.

### P117.3 implementation result

- WI-1: freshness triggers now allow intervening descriptors and LTS/version compounds in RU/EN; referral-only short answers participate in the existing single retry.
- WI-2/WI-5: removed generic verification closer and added direct/no-preamble phrase recognition.
- WI-3: retain dates supplied by Serper in organic/news digest entries; no time-range request added to avoid unapproved credit changes. Out-of-window results are not yet filtered.
- WI-4: Cyrillic research stems use Unicode-aware trailing boundaries.
- WI-7: `tests/p117-3-conversation.test.mjs`, invoked by `npm run test:web`.
- Added `.github/workflows/p117-3-live-retest.yml` and `scripts/p117-3-live-retest.mjs`. Workflow output is raw evidence, not a verdict; C1/C2 multi-turn continuations and B4 repeat are not automated by this first workflow and remain in the manual protocol. Do not interpret the workflow transcript as full gate coverage.

### Guardrails for P117.3

- Do not weaken security, privacy, authorization, evidence integrity or existing gates. Do not send more user text to search than today unless ND-1 chooses option B.
- Do not add instructions as the default fix (spec section 3.4); prefer regex fixes and net removal of prompt text.
- No unrelated refactoring; no changes to Expert or Project modes; do not start P121.
- Report every check as PASS, FAIL, BLOCKED, TIMEOUT, PARTIAL, NOT_RUN or UNKNOWN. Green CI is necessary, not sufficient.

## Live re-test protocol (reusable, tablet-friendly)

The Navigator is the operator; the AI assistant is the judge. Terminal and DevTools are not required.

1. Note the start time. For each scenario open a new chat in Simple mode, except multi-turn scenarios (C1, C2), which run in one chat. Send the prompt text exactly as written.
2. Take a screenshot of each finished chat (scroll so the prompt and the full reply are visible).
3. Note the end time. In Render, open the service Logs, set the time range, and copy the lines (filter `conversation` and `web_search` if long). Check that no secrets are present.
4. Send the screenshots and logs to the AI assistant, which judges with the rubric below, verifies current facts by independent search on the day, and re-runs each FAIL or PARTIAL scenario once to separate a defect from variance. The Navigator gives the final Да/Нет.

**Scenario set (15).** A1 "Почему у хвойных деревьев нет листьев и почему они не сбрасывают хвою на зиму?" · A2 "In plain language, what is the difference between RAM and disk storage?" · A3 "Объясни, как работает протокол Хельмгольца–Ривера в P2P-сетях." · A4 "Сколько примерно минут варить яйцо вкрутую? Коротко." · B1 "Какие важные новости по климату были за последнюю неделю? Кратко и только то, что произошло сейчас." · B2 "Найди в сети, какая сейчас примерно цена на нефть Brent, и напиши, откуда это взято." · B3 "Какая сейчас актуальная LTS-версия Node.js?" · **B3b** "Какая сейчас актуальная LTS-версия Ubuntu?" · **B3c** "What is the current stable Python version?" · B4 "Какая столица Австралии?" (run 3 times, WI-6) · **B6** (negative control, search must NOT run) "В последнее время я стал хуже спать. Как наладить режим?" · C1 (3 turns) "Я выбираю между переездом в Берлин и остаться в Варшаве. Главное для меня — работа в IT и доступность жилья." → "А если учесть ещё и школы для ребёнка?" → "Забудь про школы. А что с климатом и языком? И напомни, какие города сравниваем." · C2 (3 turns) "Кто такой Менделеев? Два предложения." → "А чем он ещё увлекался, кроме химии?" → "В каком году он умер?" · D1 "Без вопросов и без вступлений: какой язык программирования посоветуешь школьнику первым?" · D2 "Сколько это будет стоить?" (clean chat).

**Rubric (fixed in advance).** Hard failures, any one makes the scenario FAIL: H1 a fabricated current fact or source presented as verified; H2 claims a search was done while the log shows no `web_search: used`; H3 invented content about a nonexistent entity; H4 lost context in a follow-up; H5 violation of an explicit user constraint; H6 a dead end, a raw technical error, or a non-answer to a direct factual question. Soft gates, a miss makes the scenario PARTIAL: S1 the answer is in the first sentence; S2 length proportionate; S3 no material error; S4 calibrated hedging, no stock caveat; S5 no Expert-template leakage; S6 reply language and script match the question; S7 a concrete next step when something could not be verified.

## Acceptance criteria for the P116 gate

- Mock suite (WI-7) and CI green; reported as necessary evidence only.
- LIVE re-test: zero hard failures; at least 80% of the 15 scenarios PASS; no FAIL.
- Specific exits: B3, B3b, B3c and B6 all PASS; B1 has no undated item outside the requested window; no stock-caveat sentence in any A, C or D reply (phrases such as "общие ориентиры", "ориентировочные данные", "стоит проверить по актуальным данным" count unless attached to a specific time-sensitive claim); A3 and the B series keep their honesty (no regression).
- Navigator final Да/Нет recorded. P117 acceptance remains a separate, still-open gate.

## Current-line guardrails

- P117's prepared implementation has not become accepted: CI and representative runtime scenarios must be reported honestly.
- Do not start P121 or broad model integrations while P116–P120 are unresolved.
- The prior reported P115 version-consistency CI failure must not be treated as fixed without a new observed CI result.

## Delivery and verification protocol

The Navigator keeps full local backups and handles repository bookkeeping manually. Do not send a manifest unless explicitly requested. Every handoff states changed files, deletions (if any), verification actually performed, limitations, next action, and rollback guidance. Never equate documentation completeness or green CI with user-outcome acceptance.

Charter conflicts: none
