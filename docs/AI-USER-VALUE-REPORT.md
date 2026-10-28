## P118.2 — Architect live-evidence workflow (delivered, live run NOT_RUN)

- Added manual workflow `p118-architect-live` and runner. Evidence it will produce: deployed version/commit, build engine mode (201 pipeline vs 202 staged), A3 outcome, downloaded ZIP with sha256, per-entry sizes and CRC check, and two refusal controls. Artifact: `p118-architect-transcript.json` + `architect-source.zip`.
- OBSERVED locally (no model, real code): `runAppBuilderPipeline` with the model slice off returns an 11-entry generic starter (`node_express_static`), `slice.status=skipped`; `pipelineArchitectOutcome` maps it to PARTIAL (`SLICE_SKIPPED`). The classifier turns that into PARTIAL, never PASS.
- INFERRED, not proven: on the live service the default config (slice and staged flags unknown) most likely yields PARTIAL. The live run decides.
- Verification: classifier and runner tests against a loopback fake server PASSED locally (14/14); mutation checks (SUCCESS without ZIP verification, PARTIAL promoted to PASS) are caught. Hosted CI for this patch, the live workflow and production behavior: NOT_RUN / UNKNOWN.
- A3 scenarios still NOT_RUN live: injected generation/validation/packaging failures, retry/resume idempotency, malformed-spec repair.

---

## P118 — Architect completion contract (start)

- Navigator accepted P116 with residual B3 (live #2: 80% PASS, 0 hard fail). P117.3 closed.
- BuildReport now carries A3 `outcome`, check inventory fields, and empty-artifact / missing-archive cannot be SUCCESS.
- Full A3 live artifact scenario: NOT_RUN in this slice.

---

## P117.3 — LIVE close-out (2026-10-28)

- Live workflow #2: 21/21 HTTP 200; rubric 12 PASS / 3 PARTIAL / 0 FAIL (80%).
- PASS includes A1–A4, B3b, B3c, B4×3, B6, C1, C2, D1, D2. PARTIAL: B1, B2, B3.
- Residual B3 accepted by Navigator; does not block P118.
- P116: **Yes (with residual B3)**.

---

## P117.3 — implementation evidence (2026-10-28)

- Implemented WI-1 freshness trigger expansion and referral-only retry detection; removed the generic information-mode verification closer; tightened Cyrillic research boundaries; preserved Serper-returned dates in digest lines.
- Added `tests/p117-3-conversation.test.mjs` and wired it into `npm run test:web`.
- Added a manual-dispatch GitHub Actions workflow and script for the 15-scenario retest, including C1/C2 follow-up turns and three B4 repetitions. Artifact is raw transcript, not an automatic rubric verdict.
- ND-4 conservative choice: no Serper time-range parameter or additional query is added, so no intentional increase in credit consumption. The current patch carries dates but does not filter results strictly to the requested week; B1 acceptance still requires manual scrutiny and may remain PARTIAL.
- Diagnostic archive review: overall checks PASS and DB write failures are zero, but the export manifest has a byte-count discrepancy for `logs/server-console.log` (manifest 549 vs actual 538) and reports `source=database` while also saying persistent logs were skipped because the database was unavailable. The build report confirms a failed build (`invalid_spec`, zero files, ~73 s). These are useful evidence but need clearer provenance/consistency; no diagnostics-runtime patch was made in this bounded P117.3 patch.
- Verification: test execution BLOCKED because dependencies are not installed in the extracted workspace; `npm ci --ignore-scripts` timed out. Hosted CI and live staging workflow NOT_RUN. P116/P117 acceptance NOT claimed.

# BIForge — Rolling User-Outcome Evidence Report

# P117.2 — P116 LIVE baseline (model-judged) and Conversational Agent recovery findings

**Status: DOCUMENTATION ONLY — no runtime behavior changed. P116 remains OPEN: the pre-set acceptance threshold was NOT met (7/12 PASS = 58%, 4 PARTIAL, 1 FAIL; threshold: zero hard failures and at least 80% PASS).**

**Evidence type: LIVE, manual, judged by the AI assistant.** Not MOCK, not automated browser E2E, not production telemetry. One run per scenario; run-to-run variance is UNKNOWN.

**Context (OBSERVED).** Stand build v117 (P117.1), commit `ab35ebd`, read from the in-app System diagnostics panel. Run on 2026-10-28, about 03:01–03:08 UTC, Simple mode, via the Android Chrome UI. Configuration as reported by the Navigator (secrets redacted): `ENABLE_WEB_SEARCH=true`, `WEB_SEARCH_PROVIDER=serper`, `WEB_SEARCH_MODE=auto`, `MODEL_CASCADE_STRONG=gemini-3.5-flash-lite,gemini-3.1-flash-lite`, `GROQ_API_KEY` present, no `ENABLE_EXTERNAL_MODEL_FALLBACK` reported.

**Method.** The assistant fixed the rubric before seeing results (see `docs/AI-NATIVE-RENOVATION-TASK.md`, "Live re-test protocol"). The Navigator sent 12 scenarios (16 requests) and returned screenshots plus Render log lines. All 16 requests matched 16 `conversation_timing` entries by order and timestamp. Stable facts were judged from assistant knowledge; current facts and cited events were verified by independent web searches on 2026-10-28.

| ID | Scenario | Verdict | Key evidence |
|---|---|---|---|
| A1 | RU stable knowledge with a false premise (conifers) | PASS | Premise corrected; larch named as exception |
| A2 | EN RAM vs disk | PASS | Short, accurate |
| A3 | Nonexistent protocol (fabrication probe) | PASS | Did not invent; wording "does not exist" is more categorical than "unknown to me" |
| A4 | "How many minutes to hard-boil an egg? Briefly." | PASS | One sentence |
| B1 | Climate news "last week", search on | PARTIAL | 4/4 events real; 2/4 older than 7 days, undated; sources are section/home pages |
| B2 | Brent price with source | PASS | 115.33–115.45 vs ~114.5–115.2 observed; real sources; no timestamp |
| B3 | "Current LTS version of Node.js?" | **FAIL** | `web_search:"skipped"`; reply gives no version |
| B4 | Capital of Australia (search-not-needed control) | PARTIAL | Correct, no search; "Kanberra" in Latin letters inside Russian text |
| C1 | Berlin/Warsaw → schools → "forget schools; climate, language; which cities?" | PARTIAL | Context kept on 3 turns; stock caveat on every turn; generic content |
| C2 | Mendeleev, pronoun follow-ups | PASS | Death date 20 Jan (2 Feb N.S.) 1907 correct |
| D1 | "No questions, no preamble: first language for a schoolchild?" | PARTIAL | No question; impersonal opener, two alternatives, stock closer |
| D2 | "How much will it cost?" in a clean chat | PASS | Correct clarifying question |

**Log observations (OBSERVED).** 16/16 requests: `product_mode=Simple`, `calls=1`, no retry, no error, model `gemini-3.5-flash-lite`. Non-search latency 1.1–2.8 s; with search 7.0 s (B1) and 12.0 s (B2). `web_search=used` only on B1 and B2; `skipped` on all others, including B3. One request (C1 third message) logged `mode=research`, `promptChars=33012` (typical 15.2–16.4k) and `epistemic_verifier: INVALID_OUTPUT`.

## Findings

**F1 (P1) — hidden-freshness miss and non-answer (B3). OBSERVED; cause HIGH confidence.** `FRESH_PATTERNS` in `server/webSearch.ts` matches "актуальн… версия" only when adjacent; the request contained "актуальная LTS-версия", so the trigger did not fire even though search was enabled. The model then answered only with a referral to official channels. `informationSoftFail` did not flag it (no retry), because its patterns cover limitation/precision phrases, not referral-only replies. A usable answer existed: sources found on 2026-10-28 indicate Node.js 24 moved from Active to Maintenance LTS on 2026-10-20 and Node.js 26 is scheduled to enter LTS in October 2026 (exact promotion date not verified by this record).

**F2 (P2) — stock caveat. OBSERVED; cause HYPOTHESIS.** C1 replies 1–3 and D1 end with a generic "these are general guidelines, verify against current data" sentence; A-series and C2 do not. `modeParagraph('information')` instructs labelling approximate answers as general knowledge worth verifying; whether that sentence causes the footer is not proven. Contradicts the A1 contract ("controls must not become the answer's purpose").

**F3 (P2) — freshness window and traceability (B1). OBSERVED.** The request asked for "the last week" (request date 2026-10-28). The EPA methane item dates from 2026-10-07 and the Slovenia glacier item from 2026-10-15/16; neither is dated in the reply. The sources footer lists section pages (Guardian climate-crisis, Reuters environment, BBC topic, NYT section, Inside Climate News home), so no claim is tied to an article. In code, `digestFromSerperResponse` ignores organic `date`; news `date` is used only as a snippet fallback; the footer is the first five sources in order. The Dolomites and UK items were genuinely within the window. The assistant first suspected the Dolomites item was stale and corrected this after verification.

**F4 (P3) — research-mode misclassification. OBSERVED; effect on reply quality NOT shown.** `RE_RESEARCH` contains `сравни(?:те)?` without a trailing boundary, so "сравниваем" in a recap question selected research mode (≈2.2× prompt size, verifier error). The reply itself was acceptable. Cost/latency risk only; wider effects are HYPOTHESIS.

**F5 (P3) — impersonal recommendation (D1). OBSERVED.** `RE_FORBADE_METHODOLOGY` / `RE_DEMANDED_DIRECT` do not contain "без вступлений" or "посоветуй" forms, so the explicit constraint is only partly operative.

**F6 (UNKNOWN) — "Kanberra" (B4).** Single occurrence, reproducibility not tested.

**Positives (OBSERVED).** No fabricated facts in any reply; search path works and is labelled; Brent within 1% of independent quotes; context retained across 3-turn dialogs; explicit "short"/"two sentences" constraints honoured; no Expert-template leakage; no retries or errors.

## Not run and discrepancies

- NOT_RUN: live failure path (C4: 429/503/bad JSON); mock tests and CI by the assistant; browser automation; repeat runs.
- Documentation discrepancy: UO-02 below states that search is off unless `ENABLE_WEB_SEARCH=true`; current `isWebSearchEnabled()` returns true unless the variable is `false|0|off|no`. The stand sets it explicitly, so this run is unaffected. The historical P114 text is left unchanged.
- Contract discrepancy: the P116 acceptance instruction expects an HTTP 4xx/5xx on model failure; the handler returns HTTP 200 with a truthful fallback reply and `meta.fallback=true`, `meta.errorCode`. Decision recorded as ND-2 in the task file.
- Not claimed: P116 acceptance, P117 acceptance, or any model/provider availability beyond the observed requests.

---


# P117.1 — Model resilience layer planning record

**Status: DOCUMENTATION ONLY — no runtime behavior changed.**

- Added a future P121 specification for registry, health monitoring, task-aware routing, response validation, and recovery.
- Recorded candidate model families and access channels as unverified candidates; exact IDs, live access, current pricing/free quotas, terms, and quality remain to be checked before implementation.
- Captured required safeguards: budgeted/staggered probes, error classification, bounded retries, circuit breakers, context preservation, selective independent critique, explicit cross-provider data-transfer authorization, and truthful failure states.
- Deferred launch decisions: global/per-provider budgets and protected reserves; probe cost/frequency; allowed data transfer; critique policy; telemetry retention; local inference feasibility; exact endpoint validation and benchmark thresholds.
- Verification: documentation edits only. Runtime tests, typecheck/build, provider probes, E2E and CI: NOT_RUN. No product outcome, model availability, or P117 acceptance is claimed. The previously reported P115 CI/version mismatch remains unresolved until new CI evidence is supplied.

---


# P117 — Expert and model cascade implementation record

**Status: PARTIAL — patch prepared; runtime and CI checks NOT_RUN. Navigator has deferred P116; this P117 is built on the corrected P115 baseline and does not contain P116 changes.**

- Implemented: Expert dialogue contract asks for persistent structured investigation, explicit fact/assumption separation, competing hypotheses, decisive unknowns, trade-offs and actionable next steps.
- Implemented: default primary Gemini order is `gemini-3.5-flash-lite` then `gemini-3.1-flash-lite` for Simple/Expert; project cascades use the same order.
- Implemented: `gemini-3.6-flash`, `gemini-3.8-flash`, `gemma-4` are only eligible after a successful minimal live probe. Probe state is process-local, hourly, and logged.
- Implemented: opt-in Groq and Cloudflare Workers AI fallback (`ENABLE_EXTERNAL_MODEL_FALLBACK=true`), with explicit provider approval at the router. The direct conversation fallback is text/JSON-only and is skipped for native file/image parts.
- Tests added: `tests/model-availability-p117.test.mjs` (probe gating, failure handling, hourly throttle, no-key behavior).
- NOT_RUN: test suite, typecheck, build, CI, browser E2E, live model probes, end-to-end Expert/project artifact tests. Do not treat this patch as accepted until CI and representative user scenarios pass.
- Risks: `gemma-4` may not be a valid Gemini API model ID; the probe intentionally verifies the exact requested ID rather than silently substituting another model. Probes can incur small token usage and repeat on multiple replicas. External providers may incur cost and receive user prompts, hence opt-in.
- Product outcome not yet proven: prompt contract changes are not evidence of a working independent Expert agent; that acceptance remains open.

---


**Purpose:** one rolling report for evidence from completed patches affecting user outcomes. Put the newest completed patch record first. Keep older records only when they preserve useful evidence, decisions, unresolved risks, or acceptance history; do not create a new report file per patch.

**Evidence semantics:** `PASS` means the named check actually passed. `NOT_RUN`, `NOT_REPRODUCED`, `UNKNOWN`, `BLOCKED`, `TIMEOUT`, and `PARTIAL` are not PASS. Separate observed facts, user reports, hypotheses, and conclusions.

## Latest record

- **Patch:** P115 — documentation consolidation and control-plan correction.
- **Runtime changes:** none.
- **Verification:** documentation consistency and package/version metadata checked locally; runtime tests, browser E2E, live-provider tests, full CI and hosted CI are NOT_RUN for P115.
- **User outcome:** no runtime repair is claimed. This patch reduces contradictory project instructions and establishes one authoritative specification, roadmap, task, and rolling evidence report.
- **Limitations:** product workflows remain unrepaired until subsequent implementation patches are verified against user scenarios.

---

## P114 — Evidence carried forward

**Historical-plan note:** any P115+ labels or recommendations inside the original P114 audit below describe the plan at that time. They are superseded by the current patch sequence in `docs/AI-NATIVE-RENOVATION-ROADMAP.md`; the roadmap alone determines the next patch.


**Status:** source/log audit complete; live end-to-end reproduction NOT_RUN. No runtime code changed.  
**Baseline:** P112 / commit `b32357d23efceb5d02e193c5175f45a95a5e5316`; P113 contract accepted by Navigator.  
**Authority:** `AGENTS.md`; target behavior and scope: `docs/AI-USER-VALUE-SPEC.md`.  
**Purpose:** identify evidenced user-outcome failures, separate facts from hypotheses, and choose bounded implementation work. This audit is an AI-facing control artifact, not a claim that the product works.

## 1. Evidence limits and interpretation

Inputs reviewed: `bf-112.zip`, `P113-patch.zip`, and `logs.zip`; static source tracing across the UI, API routes, prompt composition, provider selection, state handling, App Builder and tests; production diagnostic snapshot timestamped `2026-10-27T11:55:15Z` for app version 112 / commit `b32357d`.

The Navigator reports that all four current user workflows are unacceptable. Treat that as authoritative product feedback and the reason for the audit. The supplied archives do not include an authenticated interactive production session, the original user prompts for all failures, or credentials for live provider calls. Therefore the reported UX failures have **not** been independently reproduced end-to-end in this patch. Findings below are labelled `OBSERVED` when directly supported by code/log artifacts, `USER-REPORTED` when based on the Navigator's experience, and `HYPOTHESIS` when causal interpretation still needs a controlled scenario.

The supplied diagnostic export explicitly omits external platform logs/CI logs and says persistent application logs were unavailable for part of the export. Its runtime health checks passed, but those checks do not test user task completion. The App Builder report and the operation logs must be interpreted separately.

## 2. User-workflow inventory: current implementation versus target

The UI has three top-level choices (`Simple`, `Expert`, `Project`) in `src/App.tsx:353-379`; the reported four workflows are Simple, Expert, and the two paths inside Project (`novice` wizard and professional workspace/path chooser). Project is a separate `/project` route, not a fourth peer mode in the current top-level selector. P113 target remains exactly three agents: Conversational, Expert Problem-Solving, Complex Software Architect. The novice/professional distinction becomes interaction profiles within the third agent, not separate agents.

| Current workflow | Observed implementation path | User-reported result | Audit disposition |
|---|---|---|---|
| Simple | `src/App.tsx` → `/api/conversation` → `server.ts` prompt composition, optional web search, model cascade, quality retry and epistemic verifier | Generic/dated answers; natural conversation feels constrained | Symptom accepted; code/log evidence supports multiple plausible contributors; live quality not reproduced |
| Expert | Same `/api/conversation` for open chat plus separate stage APIs (`/api/understand`, `/api/expand`, `/api/redteam-*`, `/api/synthesis`, etc.); browser-local decision state | Several opaque/inert panels after a few iterations, no clear continuation | Symptom accepted; architecture/state and failure-transition risks observed; exact dead-end not reproduced |
| Project novice | `ProjectNoviceWizard` creates project, confirms passport, requests build, then shows download if returned | No usable ZIP/files or clear reason | Failure path is partly visible in code; one production build failure is directly evidenced |
| Project professional | `/project` workspace with project state, plans/tasks/artifacts and a separate code-build path | No usable deliverable or clear explanation | Multiple completion surfaces and gated build engines observed; full UI path not reproduced |

## 3. Findings ranked by user impact

### UO-01 — A failed software build can end with no artifact; the observed production failure produced zero files

**Severity:** P1. **Evidence:** OBSERVED. **Root cause confidence:** medium for the exact `invalid_spec` cause; high that the recorded operation failed without output files.

`biforge-diagnostics.zip/build/build-report.json` reports:

- `status: failed`, `failureReason: invalid_spec`, `goalImplemented: false`;
- `callsUsed: 1`, `durationMs: 73059`;
- `files: []`, `units: []`, `validators: []`.

`appBuilder/core-engine.ts` validates the generated spec and throws when no valid spec is available (`:80-93` in the baseline file); the build can terminate as failed with no archive (`:151-158`). `server/projectRoutes.ts` exposes both a staged build path and a default IR/scaffold path (`:408+`). The novice wizard (`src/ProjectNoviceWizard.tsx:113-124`) displays a status/note when `downloadUrl` is absent, but then moves to its final step; the exact quality and prominence of that message were not tested in a live browser. The professional workspace has a separate `programResult`/download path.

**What is established:** a real production build attempt failed after ~73 seconds and had no files.  
**What is not established:** why the model output was invalid, whether a retry would have helped, whether the user saw the failure message, or whether every build failure is handled the same way.

**P115/P117 requirement:** every failure must name the failed stage, concise reason, whether partial files exist, retry/recovery action, and operation ID; successful completion must require a verified non-empty deliverable and accessible download. Add deterministic malformed-spec and no-artifact acceptance cases before changing retry policy.

### UO-02 — Fresh information is not a default capability of the conversational path

**Severity:** P1 for time-sensitive questions. **Evidence:** OBSERVED. **Root cause confidence:** high that live search is opt-in; medium that this explains the reported answer quality by itself.

`server/webSearch.ts` says search is off unless `ENABLE_WEB_SEARCH=true`; `server.ts` confirms this at the `/api/conversation` path around line 1191. The production log contains multiple conversation requests with `web_search:"skipped"`, including information-mode requests. Other requests do use Serper when the user intent triggers search and the feature is enabled. Therefore the system has a conditional search integration, not an unconditional freshness guarantee.

Simple mode builds a large structured prompt through `server/promptPacks.ts` (`buildSimpleConversationPrompt`), shared `promptCore`, mode-specific paragraphs, information/decision methods, boundaries, unavailable contract, file/document instructions and JSON contracts. Conversation log examples show prompt sizes of 15,334–38,025 characters (roughly 3,354–8,860 logged input tokens). That size is an observed cost/complexity signal, not proof that prompt length itself causes generic answers.

**What is established:** current information can be answered without a live search when the feature is off or search is skipped.  
**What remains open:** whether production configuration enables search globally, whether search intent detection misses user needs, and whether prompt constraints or response post-processing flatten good drafts.

**P115 requirement:** use search when freshness materially matters and capability is available; if it is unavailable, answer usefully while clearly separating stable knowledge from verified current facts. Test with current-event and stable-knowledge prompts under search-on, search-off, and provider-failure conditions.

### UO-03 — Simple and Expert share one conversational prompt/orchestration path, with mode flags rather than independent agents

**Severity:** P1 architectural cause candidate. **Evidence:** OBSERVED. **Root cause confidence:** high for shared path; not proven as the sole cause of bad answers.

`server.ts` `/api/conversation` derives `productMode` from a request field and calls `buildConversationPrompt`; `buildConversationPrompt` delegates to `buildSimpleConversationPrompt` in `server/promptPacks.ts`. Expert mode adds `EXPERT_STEP_PREFIX` / `expertDialogueParagraph` and sends stage/context fields, but still uses the same `/api/conversation` endpoint and shared `generate(..., 'strong', 'conversation', ...)` route. The endpoint also applies shared quality retry and verifier logic.

The prompt pack contains substantial information and decision instruction blocks. Mode detection uses regex classification in `server/conversationMode.ts`, and unclear intent defaults to `information`. For Expert, information classification is forcibly changed to `decision`. These rules can cause a mode's intended interaction style to be inferred from classification rather than owned by a separate workflow.

**What is established:** current Simple and Expert are not independent orchestration agents.  
**Hypotheses:** instruction accumulation, classification switches, quality retries or output schema constraints may suppress natural responses; evidence does not yet isolate which element has what causal contribution.

**P115/P116 requirement:** build separate agent entry points and contracts. Before removing shared logic, use paired golden scenarios to compare draft, final answer, prompt composition, tool use, retry decisions and user-visible output. Shared low-level provider adapters may remain.

### UO-04 — The Expert workflow is a multi-stage decision method, not a durable general problem-solving workspace

**Severity:** P1. **Evidence:** OBSERVED architecture plus USER-REPORTED dead-end. **Root cause confidence:** medium.

`src/decision.ts` defines a staged method; `src/ExpertNav.tsx` derives progress from the current stage index. `src/App.tsx:503-505` only permits direct navigation to the current or an earlier stage. Several stages call separate endpoints from `src/ExpertStepScreens.tsx` (e.g. `/api/understand`, `/api/expand`, `/api/redteam-pair`, `/api/synthesis`). Open dialogue still calls `/api/conversation` and sends a bounded text summary via `src/expertContext.ts`; the summary clips fields and lists to a small number of entries. Decisions are stored through browser-side decision storage (`src/App.tsx:74, 187`), not as a server-owned durable investigation state.

This is a substantial step workflow with multiple separately generated views and transitions. If a stage API returns an error, the shared client handler displays a message, but the audit has not verified that every failed stage offers a clear retry/resume action or that all stage transitions remain coherent after partial output. Navigation is intentionally not forward-jumpable, so a missing/empty stage result can become a practical blocker if the stage's own transition is not available.

**What is established:** the Expert path relies on multiple stages, endpoints, clipped context and client-side state; it does not yet implement P113's explicit durable investigation-state contract.  
**What remains open:** exact failing transition, whether panels are empty because state is absent or rendering is gated, and whether browser persistence loses data in the reported cases.

**P116 requirement:** maintain an explicit investigation object (facts/provenance, assumptions, hypotheses, unknowns, evidence, alternatives, decisions, risks, next actions), make every visible panel derive from real state, and make each turn end with a meaningful next action. Test at least six turns, refresh/reopen, failed endpoint, empty model result, and resume.

### UO-05 — Project creation, analysis, software generation, artifact storage and delivery are separate subflows

**Severity:** P1. **Evidence:** OBSERVED. **Root cause confidence:** high that the workflow is fragmented; user-visible impact must be reproduced.

The project UI offers a novice wizard and a professional workspace/path chooser. The novice path creates a project and confirms a passport before requesting a build (`src/ProjectNoviceWizard.tsx:96-124`). The professional workspace has separate project analysis, plan/task/approval/artifact tabs and a code-build request (`src/ProjectMode.tsx`, `server/projectRoutes.ts`). The code-build route has at least three behaviors: `model_patch` gated by server configuration, staged builder gated by a flag/dependencies, and default IR/scaffold pipeline. The current top-level UI also disables Project entirely when `projectModeEnabled` is false (`src/App.tsx:372-378`).

This means a user can encounter configuration-dependent availability, passport prerequisites, a model-patch authorization gate, staged-engine gates, or a default scaffold whose optional model slice is disabled. These are not necessarily bugs; they are multiple possible execution paths that need a consistent user outcome contract.

**What is established:** the project workflow branches across UI paths and backend engines; not all paths guarantee model-customized implementation.  
**What remains open:** which path was used in the user's failures, the production flag values, whether the visible final state communicates the true engine/result, and whether a non-empty archive is consistently delivered.

**P117 requirement:** converge the user-facing flow on one software-architect state machine. Interaction profiles (simplified/professional) may vary questions and controls, but must share a single completion contract. Clearly distinguish scaffold/template output from model-implemented output; no ambiguous “project ready” success without a verified artifact.

### UO-06 — Expert output and project deliverables have different success vocabularies and no single user-facing completion contract

**Severity:** P1. **Evidence:** OBSERVED. **Root cause confidence:** high for the contract mismatch.

Expert stages return structured JSON and mutate client-side `Decision` state; project operations return different shapes (`status`, `note`, `downloadUrl`, `codeTask`, artifact rows) depending on engine. The App Builder itself distinguishes `complete`, `partial`, `failed`, `cancelled` and sets `goalImplemented` based on validators (`appBuilder/core-engine.ts:151-158`), but the user-facing surfaces do not share one explicit end-to-end contract that ties operation state to a useful answer/plan or accessible artifact.

**Requirement:** all agents need explicit terminal states and transitions. For the software architect, `SUCCESS` requires non-empty expected files, integrity-checked archive and a usable delivery URL. `PARTIAL` exposes partial files and their limitations when safe. `FAILED` names stage, reason and recovery. `UNKNOWN`, `NOT_RUN`, `BLOCKED`, `TIMEOUT`, and `PARTIAL` must never be shown as success.

### UO-07 — The verifier fails in production, but logs do not establish that it blocks or improves the final answer

**Severity:** P2 pending safety/quality impact. **Evidence:** OBSERVED. **Root cause confidence:** high for errors, low for user impact.

The 2026-10-27 production log records `epistemic_verifier` errors: `INVALID_OUTPUT` at 10:39:25 and 10:40:07 UTC, and `INVALID_REQUEST` at 10:40:44 UTC. `server/epistemicVerifier.ts` treats provider/parse errors as a skipped/error result instead of throwing. The current code path does not establish that a failed verifier rewrites the answer; it appears designed as a non-fatal claim-classification step. The available evidence does not show whether these failures made answers worse or caused dead ends.

**Disposition:** do not remove or expand verification based on these logs alone. Instrument the verifier outcome and final response relationship, then compare quality with verifier success/failure. It must not flatten answers or turn a failed optional verifier into a user-facing false success.

### UO-08 — Repeated AbortSignal listener warnings indicate a reliability issue but are not yet a proven product failure

**Severity:** P2. **Evidence:** OBSERVED. **Root cause confidence:** medium.

Production logs contain repeated `MaxListenersExceededWarning` messages for `AbortSignal` (11 listeners above Node's default limit of 10), including in application logs and the server console. This warrants tracing listener registration/removal across retries, model calls and cancellation. The warning alone does not prove a memory leak or explain the reported four-mode failures.

**Disposition:** keep as cross-agent resilience work after mapping cancellation/retry lifecycles. Do not merely raise the listener limit without evidence.

### UO-09 — Client crypto fallback and ZIP correctness need targeted artifact tests

**Severity:** P2. **Evidence:** OBSERVED warnings and source path; functional impact unproven.

Build logs report Vite excluding `node:crypto` from browser bundles in `src/workspace/exportZip.ts` and `src/workspace/hash.ts`; those paths have Web Crypto plus a Node fallback. `exportZip.ts` also contains a fallback ZIP writer whose CRC32 handling must be checked for interoperability. These may not affect supported browsers where Web Crypto is available, but the fallback paths are not established as working in browser contexts.

**Disposition:** add browser acceptance tests for project export and hash verification, including ZIP openability, non-empty files, CRC/integrity and supported-browser conditions. Do not treat a warning as a proven failure before testing.

### UO-10 — Dependency audit warning is not actionable without package-level evidence

**Severity:** P2, triage required. **Evidence:** OBSERVED warning only.

Deployment logs report two high-severity dependency vulnerabilities. The supplied evidence does not identify package names, vulnerable ranges, reachability or fixes. Run a current dependency audit against the exact lockfile and record the finding and disposition; do not blindly upgrade dependencies.

### UO-11 — Large prompts and retry latency are plausible contributors to low interaction quality

**Severity:** P2. **Evidence:** OBSERVED. **Root cause confidence:** low-to-medium.

Conversation log examples show prompt lengths around 15k–38k characters and 3.3k–8.9k input tokens. One logged conversation took about 30 seconds overall, with `main_call` around 30 seconds; another research request used a gain-audit retry. The system can skip a quality retry when latency is already high. These observations show a quality/latency trade-off, but do not prove prompt size caused generic output.

**Disposition:** collect per-stage latency and compare actual user-rated output quality, prompt composition and retry decisions on fixed scenarios. Optimize only when a measured change improves the delivered answer without reducing correctness.

### UO-12 — P110–P112 foundations are not proven to govern these user workflows

**Severity:** P2 programme-control gap. **Evidence:** OBSERVED from the current request paths. **Root cause confidence:** high that adoption is not universal.

P110–P112 provide intent/policy contracts, capability graph and context selection/impact plans. Static tracing of the primary conversation and project flows did not find evidence that the P112 impact plan is a required runtime gate for every user operation; that is consistent with P113's documented boundary that full integration was not part of P112. This is not itself a product defect, and forcing this infrastructure into runtime flows would not automatically improve user value.

**Disposition:** keep these mechanisms as development-time tools unless a concrete user-outcome or verification benefit is demonstrated. Do not prioritize their expansion over restoring answers, expert progression and deliverable creation.

## 4. Shared control-flow and instruction inventory

| Component | Current role | Risk to user outcome | Decision for future patch |
|---|---|---|---|
| `server/promptPacks.ts` | Shared Simple/Expert prompt builder; large information/decision contracts | Mode-specific behavior is mostly instruction/flag composition; potential constraint accumulation | **ISOLATE** per P113; preserve useful rules only when paired scenarios prove value |
| `server/conversationMode.ts` | Regex mode classifier; unknown intent defaults to information; Expert information is coerced to decision | Classification can steer prompt policy without user-visible state | **REPAIR/REPLACE** inside Conversational/Expert split; evaluate with multilingual scenarios |
| `server.ts` `/api/conversation` | Shared input normalization, search, generation, quality retry, verifier and response shaping | One path owns both conversational and Expert open dialogue | **ISOLATE** agent orchestration; retain proven low-level utilities |
| `src/decision.ts`, `src/ExpertStepScreens.tsx`, `src/ExpertNav.tsx` | Client-side staged decision method and views | Stage-specific state can be sparse/inconsistent; transition depends on each screen | **REPLACE/RETAIN by evidence**; do not carry stage UX forward automatically |
| `src/ProjectNoviceWizard.tsx`, `src/ProjectMode.tsx`, `server/projectRoutes.ts` | Novice wizard and professional workspace; several build engines | Fragmented status and completion surfaces | **ISOLATE** interaction profiles over one software-architect workflow |
| `appBuilder/core-engine.ts` | Spec → plan → files → validators → ZIP | Invalid spec can terminate with no files; current recorded failure proves this path matters | **REPAIR** with stage-specific failure/recovery and end-to-end artifact gate |
| `server/epistemicVerifier.ts` | Optional claim classification; errors become skipped/error | Error impact is opaque; verifier may add latency without demonstrated benefit | **MEASURE** before keeping, changing or removing |
| `server/webSearch.ts` | Optional current web lookup, opt-in by env | Freshness is not guaranteed when disabled/skipped | **REPAIR** to agent-owned freshness policy |
| cancellation/retry stack | Provider retries, quality retries, cancellation | Listener warnings and latency | **REPAIR** after lifecycle trace and fault-injection proof |
| P110–P112 graph/context tooling | Development-time intent/impact/context support | Risk of optimizing internal traceability ahead of product outcomes | **RETAIN as support**, not a substitute for end-user acceptance |

## 5. User-outcome acceptance gaps

The current tests and build checks may protect contracts, but the audit did not find evidence in the supplied archive that the following complete user journeys are all acceptance-gated end-to-end. This is an evidence gap, not a claim that no related tests exist.

- **Conversational:** direct stable-knowledge answer; current-events answer with search; search unavailable; follow-up retaining context; answer after verifier error; bounded latency.
- **Expert:** at least six meaningful turns; explicit facts versus hypotheses; multiple materially different alternatives; synthesis/action plan; refresh/reopen continuity; stage endpoint failure and resume; no empty/inert panel without next action.
- **Software architect — simplified profile:** minimal questions/defaults → actual non-empty project → validation → ZIP integrity → downloadable artifact.
- **Software architect — professional profile:** requirements/specification → architecture/build → tests/validation → bounded repair → package → accessible delivery; every failed stage has truthful recovery.
- **Cross-cutting:** cancellation, timeout, provider exhaustion, invalid structured output, missing search, partial files, corrupt ZIP, unavailable project flag and lost browser state.

For every scenario record input, environment/flags, provider/model path, expected user outcome, actual visible output, artifact hashes where relevant, stage statuses, latency, and pass/fail. Do not use model-call success or non-empty JSON as the outcome assertion.

## 6. Priority and patch sequencing recommendation

1. **P115 Conversational Agent:** restore direct, context-aware, appropriately fresh answers; isolate the prompt/orchestration and measure answer quality before/after.
2. **P116 Expert Problem-Solving Agent:** replace dead-end stage progression with durable investigation state and a guaranteed next action.
3. **P117 Complex Software Architect Agent:** make real, validated, downloadable software artifacts and honest failure/recovery the central completion contract; retain simplified/professional interaction profiles only.
4. **P118 Three-agent migration:** switch the product entry points only after each replacement agent independently passes its gate; preserve/migrate state and artifacts with rollback evidence.
5. **P119 Resilience and cross-cutting defects:** verifier disposition, cancellation/listener lifecycle, ZIP/crypto, dependency findings, retry/latency and telemetry, based on demonstrated effect.
6. **P120 final user-outcome evaluation:** repeat representative tasks and report task completion, answer quality/freshness, expert continuity, artifact integrity/access, truthful failure and recovery, latency/cost.

This order follows user impact, not dependency graph aesthetics. If a proposed patch improves internal structure, test count, graph coverage, prompt neatness or CI status without a demonstrated improvement to user outcomes, **STOP and ask the Navigator whether to proceed**. Do not silently continue such work.

## 7. Root-cause status summary

| Claim | Status | Next evidence needed |
|---|---|---|
| A production App Builder attempt failed with `invalid_spec` and zero files | OBSERVED | Reproduce with captured input/spec output and trace validation/retry |
| Current web search is opt-in and some production requests skipped it | OBSERVED | Verify deployed flags and test freshness intent across languages |
| Simple and Expert share `/api/conversation` and prompt construction | OBSERVED | Compare actual prompt/output on paired user scenarios |
| Expert state is client-side and context sent to chat is bounded/clipped | OBSERVED | Reproduce refresh/resume and multi-turn dead-end |
| Project has novice/professional UI paths and several engine gates | OBSERVED | Run both flows in controlled environment and record visible result |
| Verifier errors cause bad answers | NOT_PROVEN | Correlate verifier outcomes with final answers; compare controlled cases |
| AbortSignal warnings cause the reported UX failures | NOT_PROVEN | Trace listener lifecycle and run cancellation/retry stress case |
| Large prompts cause generic answers | NOT_PROVEN | Paired quality evaluation with controlled prompt variants |
| All four user-reported failures are reproducible from supplied artifacts alone | NOT_REPRODUCED | Authenticated live/browser scenarios and original prompts are required |

## 8. P114 scope, verification and rollback

**Changed:** AI-facing audit/control artifacts and patch/version metadata only.  
**Not changed:** runtime source, prompts, routes, provider configuration, migrations, security gates, production settings, user data, P110–P112 runtime behavior.  
**Runtime tests / live-provider tests / browser E2E / full CI / hosted CI:** NOT_RUN in this audit patch. Navigator reports the preceding CI green; that is not evidence of P114 tests or product acceptance.  
**Rollback:** revert the P114-only documentation, handoff, index, changelog and version metadata changes as one unit. No runtime state or user data changed.
