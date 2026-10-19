# BiForge — Unified Implementation Plan for Simple / Expert / Project Modes

> **Status:** approved roadmap. MP2, MP3, UI1 and QA1 are delivered (see `docs/STATUS.md`); MANUAL1 is the open step. The baseline lines below are historical.  
> **Date:** 14 October 2026.  
> **Current baseline archive:** `bf-v27-p1.zip` (uploaded by the owner on 14 October 2026).  
> **Current package:** documentation only. Coding may begin only after an explicit owner command.  
> **Sole source of work sequence for this initiative:** this document.

## 1. Goal

BiForge must offer the user three explicitly selectable operating modes and give each mode its own behavioural contract. Common rules for honesty, safety and data handling remain shared, but Simple must not inherit the heavy decision-engine framework required for Expert and Project.

The plan organises the remaining work into a linear sequence: first model behaviour, then mode selection in the UI and propagation of the selected mode, then automated integration checks and manual acceptance. Regression tests are added at the corresponding development stages rather than deferred until the very end.

## 2. Owner Decisions Already Taken

The decisions below were approved by the owner on 14 October 2026 and do not require re-confirmation in subsequent sessions.

1. **The user selects the mode on the start screen:** Simple, Expert or Project.
2. **The selected mode is retained for the duration of the current interaction** and determines the instruction contract in use. The system must not automatically switch the user to another mode; if a request fits the chosen mode poorly, the assistant explains this and invites the user to switch, without changing the mode of its own accord.
3. **Simple** is intended for general information, explanations, practical advice and decision support. A factual question must not automatically turn into a decision session.
4. **Expert** is intended for deep problem analysis, assumption checking, discovery of non-obvious solutions and systematic risk consideration. It retains strictness and analytical depth.
5. **Project** is intended for creating and running software, scientific and engineering projects: requirements, architecture, tasks, checks, artefacts and execution status.
6. **Common core plus separate thin mode packages** is the target architecture. Only genuinely universal rules remain shared; a single compromise prompt that again subordinates Simple to Expert/Project rules is not permitted.
7. **Simple distinguishes task type internally.** `information` is the light default when intent is unclear; `decision` is activated by explicit signals of choice or “what should I do / is it worth it” questions. `research` and `engineering` keep their specialised instructions.
8. **Expert and Project are not weakened for the sake of Simple.** Any shared change must preserve their contracts and be covered by regression checks.
9. **Documentation first, then code.** This package does not authorise coding. The next stage may start only after an explicit owner command.
10. **Old technical specifications are no longer the current work queue for this initiative.** Their useful requirements and constraints have been transferred into this plan; the documents themselves remain as history / technical sources, not as parallel task plans. This does not imply that all code described in them has actually been implemented.

## 3. Terms and Boundaries

- **Product mode:** Simple / Expert / Project — selected by the user on the start screen.
- **Simple task type:** `information` / `decision` / `research` / `engineering` — internal interpretation of a message inside Simple, not a substitute for the user-selected product mode.
- **Common core:** universal requirements for honesty, response language, safety and treatment of user files.
- **Mode behavioural package:** instructions about purpose, tone, process and criteria for a good answer in the chosen mode.
- **MP1–MP3:** agreed stages for correcting Simple instructions. The names are retained from discussion; they are not a renaming of the historical PI-01…PI-03 or P27+.

### In scope for this initiative

- completion of the separation between shared rules and mode contracts;
- correction of Simple behaviour on informational requests;
- protection of Expert and Project against unintended behavioural change;
- start-screen mode selection and propagation of the choice into the corresponding prompt/router;
- automated regression and integration checks;
- manual acceptance of the three modes.

### Out of scope without a separate decision

- enabling live web search / external sources (this is a separate capability; absence of search must not be masked by a claim that a search was performed);
- changing the model, provider or model cascade;
- changing Project business logic, storage schemas, authorisation or workspace beyond what is necessary to propagate the selected mode;
- modifying `tests/regression.json`;
- introducing new production permissions, secrets or automatic deployment;
- rewriting unrelated parts of the product.

## 4. Reference Behaviour of the Three Modes

### 4.1 Simple — general information and advice

- Answer the substance first; embed a brief uncertainty caveat inside the answer rather than substituting it for the answer.
- Explain in plain, natural language without methodological preambles, lecturing or repeated disclaimers.
- Qualitative guidance, scenarios and approximate ranges are allowed when there is a reasonable basis and they are marked as estimates.
- Invented numbers, citations, current data and claims about search/verification that did not occur are forbidden.
- Do not argue with a constraint the user never stated (for example, do not attribute a requirement for an exact forecast to the request).
- Do not turn an informational request into coaching or decide for the user; do not ask for goals without necessity.
- For an explicit choice/decision request use the decision framework. When intent is unclear, prefer the light Simple interpretation rather than the heavy decision framework.

### 4.2 Expert — deep analysis

- Preserve structured analysis, checking of initial assumptions, alternative explanations, risks and non-obvious options.
- Separate facts from hypotheses and point out significant data gaps.
- Do not substitute the user’s decision with the assistant’s own choice.
- Do not inherit Simple’s simplified tone where it would reduce analytical completeness.

### 4.3 Project — project design and execution

- Work in a project context: requirements, architecture, tasks, dependencies, tests, artefacts, state and next verifiable actions.
- Preserve operational precision, safety and project constraints.
- Do not degrade into an ordinary conversational Simple answer or weaken execution control.

## 5. Architectural Contract

1. Extract a minimal common rule set into a shared core (planned file name: `server/promptCore.ts`, unless code inspection at MP2 reveals a more suitable existing location).
2. Do not copy long universal instructions into every package; do not create three giant independent prompts.
3. A mode package defines its own goal and working process. The common core must not contain the decision ritual as a mandatory format for every reply.
4. Simple/information must not require STEP 0–6, SECOND TEST, WHAT THE PERSON SHOULD EXPERIENCE, BEFORE ANSWERING, outside-view/no-homework or other decision rituals that are unnecessary for an informational answer.
5. The decision block remains without behavioural weakening; specialised research and engineering blocks are retained.
6. Recognition of informational requests (“tell me”, “explain”, “suggest” and equivalents) is expanded; it must not rely solely on a question word at the beginning.
7. When intent is unclear, use light Simple/information; activate `decision` only on explicit choice or decision signals.
8. Verify the JSON contract and all consumers. For information, fields `gain`/`newOptions` may be optional only if compatibility is confirmed by tests; do not change the external response shape more than necessary.
9. Disable `conversationGainAudit` and the heavy decision-retry for `information` if code analysis confirms that otherwise a good direct answer is rejected. This must not disable general safety checks.
10. Capture a baseline and compare the Simple/information prompt size with `scripts/measure-prompt.mjs`.

**Stage tests:** existing mode/intent/API tests; new unit tests for classification; schema/compatibility checks; tests proving that Expert and Project have not lost their special instructions. Do not modify `tests/regression.json`.

**PASS criteria:**
- direct informational requests receive the light informational contract;
- choice/decision still receives the decision contract;
- common constraints are preserved;
- Expert and Project are not weakened according to tests;
- target tests pass; prompt-measurement result is recorded in the report;
- `npm run check` and `npm run build` pass, or real blockers/NOT_RUN are explicitly stated.

### Stage MP3 — Simple/information answer quality control — **after MP2**

**Goal:** catch not only an incorrect prompt but also typical evasive answers on the output side, without forcing the user back into the heavy decision process.

**Work:**
1. Define light indicators of a failed answer: methodology preamble before the substance, answer consisting only of limitations, arguing with an invented precision requirement, repeating a lecture after an explicit prohibition.
2. Take into account intent signals “answer directly”, “don’t lecture”, “no methodology” and explicit negative feedback.
3. On a soft failure for information perform a short retry with the informational prompt, not with the decision package.
4. Do not make the retry infinite; keep current attempt limits, budget and error handling.
5. Do not run this specific quality gate on Expert/Project without separate justification.

**Tests:** unit/integration tests for the indicators; regression that Expert/Project paths remain unchanged; measurement of false-positive rate on legitimate decision answers.

**PASS:** informational answers become direct; decision answers retain structure; no increase in false blocks on Expert/Project; checks and build pass or blockers are listed.

### Stage UI1 — start-screen mode selection and Expert open dialogue — **after MP3**

**Goal:** (a) let the user choose Simple / Expert / Project on the start screen and propagate the choice into the correct backend contract; (b) keep Expert stages open for clarification rather than turning them into a closed pipeline.

**UI copy (examples, final wording may be refined):**
- Simple: “Quick answers, explanations and practical advice.”
- Expert: “Deep analysis of problems, alternatives and risks.”
- Project: “Design and run software, scientific and engineering projects: requirements, architecture, tasks and checks.”

**Work (a) — mode selection:**
1. Inspect current navigation and Project Mode availability; do not assume all modes share the same backend/API.
2. Add a start-screen choice of the three modes while preserving existing access boundaries and Project Mode opt-in behaviour.
3. Propagate the selected mode to the correct endpoint/context/prompt; retain the choice within the session/conversation according to the current state model.
4. Do not switch mode automatically. If a mode is unavailable in the current configuration (e.g. Project Mode disabled), show a clear state and do not mask it as a successful selection.
5. Do not expose internal stage numbers, versions or prompt-package names to the user.
6. Preserve accessibility of existing scenarios; do not break the workspace beyond necessity.

**Work (b) — Expert open dialogue:**
1. Keep the stepper/method (Understand → … → Learn); **do not** remove stages.
2. At every Expert stage and after Learn provide the ability to send a clarification / new fact / question (same conversation composer or equivalent).
3. The agent’s answer takes the clarification into account and may revise stage conclusions; do not reply “stage finished, dialogue closed”.
4. “Next stage / enough for a decision” buttons remain; free dialogue **supplements** the method.
5. Prefer a single shared history with Simple (already shared conversation state) without loss of context on clarifications.
6. Minimal regression checks: “on EXPAND I clarified a fact → answer relies on the fact”; “after Learn another question → there is an answer”.

**PASS:** (a) mode selection as above; (b) at any Expert stage the user can send a clarification and receive a substantive answer; the pipeline is not a dead end; UI checks/build pass.

### Stage QA1 — end-to-end automated verification — **after UI1**

**Goal:** prove that mode selection, prompt, router, audit/retry and UI work together.

**Mandatory suites:**
- Simple: ordinary informational request; “Tell/explain”; explicit decision request; ban on methodology; answer consisting only of limitations; feedback “you are being evasive”; Graubünden dialogue.
- Expert: deep analysis, alternatives, risks, separation of facts from hypotheses, no decision made for the user.
- Project: requirements statement, tasks/artefacts/checks and preservation of operational constraints.
- Modes: selection of each mode, retention of choice, unavailable Project, absence of unsolicited switching.

**PASS:** all suites green or real NOT_RUN/FAIL items explicitly listed with reasons; no silent weakening of Expert/Project.

### Stage MANUAL1 — owner manual acceptance — **after QA1**

**Goal:** the owner verifies live behaviour of the three modes.

**Scenarios (minimum):**
1. Start the application, choose each mode in turn, confirm that the choice is visible and retained.
2. In Simple ask a neutral informational question and an explicit “what should I choose / is it worth it” question. Expectation: different internal task types, same user-facing Simple mode.
3. In Expert request a deep problem breakdown with alternatives and risks. Expectation: depth is preserved, no simplification to a brief Simple answer.
3b. In Expert, mid-method (e.g. Expand/Attack) add a new fact and ask a clarifying question; after Learn ask another question. Expectation: the agent accepts clarifications, dialogue does not end with “end of stages”.
4. In Project create/analyse a software or scientific project. Expectation: operational structure, requirements, tasks and checks are retained.
5. Switch between modes only by explicit user action. Expectation: choice is predictable and does not change by itself.

**Result recording:** date, environment/commit, selected mode, input request, observed result, PASS/FAIL/NOT_RUN and a short note. Do not put secrets or personal data into the report.

**Initiative closure:** all automated checks have a recorded result; the owner has confirmed the manual scenarios or has explicitly listed accepted limitations; `docs/CURRENT_STATE.md`, `docs/PATCH_JOURNAL.md` and `CHANGELOG.md` are updated. Do not start the next initiative automatically.

## 7. Rules for Transition Between Stages

- Strict sequence of the mode initiative: **D0 → MP2 → MP3 → UI1 → QA1 → MANUAL1**.
- File-line (P38 Export → P39) on STATUS may proceed **before** UI1 if the owner has not raised mode-UX earlier; UI1 includes Expert open dialogue.
- MP1 is preparatory work recorded retrospectively; it does not replace MP2.
- Each coding stage starts only after an explicit owner command and receives its own patch/report according to the repository’s current procedure.
- Within each stage tests are written together with the change. QA1 is an additional end-to-end check, not a substitute for local tests.
- Do not start the next stage until the current one is closed or the owner has explicitly authorised continuation with noted limitations.
- If a contradiction with TZv3.0, safety, API schema or the actual architecture is found, stop and describe the exact conflict; do not resolve it silently.
- Any result that was not actually executed must be marked `NOT_RUN`; a test that finished with an error is `FAIL`/`BLOCKED`, never PASS.

## 8. What Is Known from the Baseline Archive and What Still Needs Confirmation

**Confirmed by archive inspection:**
- `server/promptPacks.ts` assembles the Simple prompt;
- `server/conversationMode.ts` selects the internal task type and forms the mode paragraph;
- `server/intentFlags.ts` contains intent flags and the limitation-only check;
- `server.ts` contains `BASE_SYSTEM`, `conversationGainAudit` and retry logic;
- `server/contextBuilder.ts` contains a separate Project instruction;
- `scripts/measure-prompt.mjs` exists;
- PI-03 / concept documentation still contains the older wording “no separate system prompts” and constraints on schema change that conflict with the newly approved decisions.

**Not confirmed and must not be treated as done:**
- actual extraction of a shared `promptCore.ts`;
- correctness of disabling audit/retry for information;
- existence and passing of new MP2/MP3 regression fixtures;
- UI for Simple/Expert/Project selection;
- manual result of the Graubünden dialogue after the changes;
- a fully green `npm run check`/build on the current environment.

## 9. Relationship to Older Documentation

- `docs/PI-03-SPEC.md` and the CONCEPTS uncertainty TZ (off-repo) remain historical sources of the PI-01…PI-03 decisions, not the current work queue for this initiative. The new owner decision lifts the ban on separate mode packages and permits verifiable changes to the answer contract provided backward compatibility is demonstrated.
- `PATCH_NOTES.md` is evidence of the original MP1-like package, not proof of successful behavioural correction.
- `docs/NEXT.md` contains the old P27+ queue and owner RM-gates. That queue is suspended as a source of task sequence for the duration of the mode initiative; this does **not** mean that the listed workspace/owner tasks are completed or cancelled. After MANUAL1 the owner will separately decide which of them to carry into the next active roadmap.
- Remaining technical specifications stay reference sources for preserving contracts. They do not create a parallel work queue for this initiative.

## 10. Plan Change Log

- **2026-10-14:** owner approved explicit selection of the three modes, common core + separate mode contracts, sequential roadmap and the “documentation first, code only on command” rule.
