# P114 — User-Outcome Audit and Root-Cause Map

**Status:** source/log audit complete; live end-to-end reproduction NOT_RUN. No runtime code changed.  
**Baseline:** P112 / commit `b32357d23efceb5d02e193c5175f45a95a5e5316`; P113 contract accepted by Navigator.  
**Authority:** `AGENTS.md`; target behavior and scope: `AI-USER-VALUE-ARCHITECTURE-P113.md`.  
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
