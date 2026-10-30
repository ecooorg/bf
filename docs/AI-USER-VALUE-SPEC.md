# BIForge — User-Outcome Architecture Specification

**Status:** current normative target contract. Update this file in place; do not create a new versioned copy for each patch.  
**Approved target:** exactly three user-facing agents, with Architect implemented as one mode and one workflow.  
**Primary acceptance rule:** a feature is not successful because internal components execute or CI is green; it is successful only when a representative user completes the intended task and receives useful, truthful, accessible output.

## 1. Purpose and failure model

BiForge's product purpose is to deliver information value and completed work to its user. Internal health, tests, model-call success, schema validity, and green CI are necessary evidence, but none alone proves product success. A workflow that ends in empty panels, generic stale answers, silent failure, or no downloadable artifact is a product failure even when its internal checks pass.

Historical user reports from the legacy interface describe generic or dated Simple answers, Expert progression that stalls after a few turns, and Project paths that may end without a usable archive or actionable explanation. Treat these as symptoms to reproduce against the current product, not as proven root causes. The old labels and path split are not part of the target product. Prior log findings (App Builder `invalid_spec`, verifier errors, AbortSignal listener warnings, browser `node:crypto` warnings, dependency audit warning) remain supporting evidence, not a substitute for end-to-end diagnosis.

P113 changes the programme's control question from “did the implementation pass its checks?” to “did the user receive the intended outcome, with evidence and a clear recovery path if not?”

## 2. Target product: exactly three agents

The product exposes exactly three user-facing agents. No fourth agent and no shared “project mode” selector remains in the target UX. The three agents own separate workflows, prompt/instruction sets, orchestration policies, model cascades, state machines, output contracts, and acceptance suites. They may use low-level shared infrastructure (provider adapters, authentication, persistence primitives, telemetry, cancellation, safe file storage, common UI shell), but shared infrastructure must not collapse their behavior into one prompt pipeline with mode flags.

### A1. Conversational Agent

**Job:** conduct a natural, context-aware, useful conversation comparable to a capable general-purpose AI chat.

**Required behavior:**
- Answer the actual question directly, at a proportionate level of detail; do not force every turn into an expert workflow or rigid template.
- Preserve relevant conversation context and handle follow-up references correctly.
- Use current web/search or other available tools when freshness or external facts matter; distinguish current evidence, stable knowledge, inference, and uncertainty.
- Ask a clarifying question only when ambiguity materially blocks a useful answer; otherwise state reasonable assumptions and proceed.
- Keep internal verifier/policy machinery from flattening all answers into generic, stale, over-cautious summaries. Controls must protect correctness and safety without becoming the answer's purpose.
- If a tool/provider fails, recover when bounded and useful; otherwise explain what could not be verified and offer a concrete next step.

**Non-goals:** mandatory decomposition, persistent expert workspaces, project generation, or a multi-stage approval workflow for ordinary questions.

**Success measures:** relevance to the asked question; correctness and calibrated uncertainty; freshness when required; context retention; useful follow-up continuity; user-visible completion; latency and cost tracked as constraints, not substitutes for answer quality.

### A2. Expert Problem-Solving Agent

**Job:** help a user deeply understand a complex problem, discover non-obvious options, make a reasoned decision, and leave with an actionable plan.

**Required workflow/state:**
1. Establish objective, context, constraints, stakes, and success criteria.
2. Decompose the problem into dimensions and dependencies.
3. Maintain an explicit working state: facts and provenance, assumptions, hypotheses, unknowns, questions, evidence, alternatives, decisions, risks, and next actions.
4. Investigate hypotheses using reasoning and tools where appropriate; do not present untested hypotheses as facts.
5. Generate materially different alternatives, including non-obvious approaches, then compare trade-offs and failure modes.
6. Synthesize findings into a coherent diagnosis or decision recommendation.
7. Produce a prioritized action plan with sequence, dependencies, expected outcome, and validation criteria.
8. Keep the user in a navigable loop: every turn must offer a meaningful next action, support revisiting prior decisions, and preserve state across iterations.

**UI contract:** the interface must show a comprehensible working state and a clear next action, not a set of opaque empty/inert panels. Every visible panel maps to a populated state object or is hidden/marked as not yet available. A failed operation must not strand the user.

**Success measures:** problem coverage; traceability from evidence to conclusions; quality/diversity of alternatives; explicit uncertainty; actionable plan quality; continuity across multiple turns; no dead-end state; ability to export/share the final synthesis where supported.

**Non-goals:** replacing the conversational agent for ordinary chat; pretending to guarantee exhaustive analysis; autonomously executing consequential actions without required authorization.

### A3. Complex Software Architect Agent

**Job:** transform a software-system goal into a real, inspectable, validated software artifact that the user can obtain and continue working with.

**Required workflow/state:**
1. Clarify the intended software, target users, platform, constraints, and definition of done; use sensible defaults where safe.
2. Produce and validate a requirements/specification object before generation.
3. Plan architecture, components, interfaces, data/state, dependencies, and validation strategy.
4. Generate actual project files in an isolated workspace.
5. Run relevant static checks/tests/builds in an appropriately isolated and bounded environment; do not claim checks that were not run.
6. Diagnose failures and attempt bounded repair without weakening requirements, tests, or security controls.
7. Package the result and verify archive integrity, expected files, and manifest.
8. Persist a durable operation state and deliver the artifact through a visible download/access affordance.
9. If any stage fails, show a user-facing failure state with the failed stage, concise cause, whether partial artifacts exist, safe recovery/retry action, and operation identifier. Never leave only empty panels or silently report success without a deliverable.

**Single-mode rule:** Architect has one user-facing mode and one coherent workflow/state machine. It must not present a chooser between “Simple words”/novice and “Professional”/advanced paths, and it must not route the user into independent Architect workflows with different state or completion semantics. Clear guidance, sensible defaults, and advanced controls may be offered within the same workflow. This is a product requirement, not a style preference.

**Completion contract:** `SUCCESS` requires an artifact manifest, verified non-empty expected output, archive/file integrity checks where applicable, truthful check results, and a user-accessible delivery reference. `PARTIAL` requires explicit partial-artifact status and access if safe. `FAILED` requires a specific stage/reason and next action. `UNKNOWN`, `NOT_RUN`, `BLOCKED`, `TIMEOUT`, or `PARTIAL` must never be represented as successful completion.

**Scope boundary:** this agent targets complex software systems. General business-plan/document generation is not a fourth agent and is not part of A3's acceptance scope unless separately authorized later. Reusable generic artifact infrastructure may remain underneath the software-specific workflow.

**Success measures:** task-to-artifact completion rate; artifact open/build/test success; requirement coverage; reproducibility; integrity; time to usable first artifact; transparent failure/recovery; no false-success claims.

## 3. Architecture boundaries

### 3.1 Independent agent ownership

Each agent must have an explicit entry point and own:
- system/developer instruction composition for its task;
- orchestration/state machine and turn/step transitions;
- model/provider cascade and fallback rules;
- tool eligibility and invocation policy;
- output contract and user-visible completion semantics;
- retry/timeout/cancellation policy appropriate to that workflow;
- agent-specific telemetry and end-to-end acceptance tests.

Shared provider adapters and generic safety/security primitives are allowed. Agent-specific policy must not be silently inherited from a global pile of instructions. Shared policy must be short, explicit, non-contradictory, and limited to cross-cutting requirements (security, privacy, authorization, evidence integrity, and provider interface contracts).

### 3.2 No hidden success states

Every user operation must have a durable state machine with explicit transitions and terminal outcomes. Minimum shared vocabulary: `QUEUED`, `RUNNING`, `WAITING_FOR_USER`, `RETRYING`, `SUCCESS`, `PARTIAL`, `FAILED`, `CANCELLED`, `TIMED_OUT`, `BLOCKED`. Transitions must be validated; terminal states cannot silently become success. The UI must render state and next action. Logs and telemetry support diagnosis but do not substitute for user-visible outcomes.

### 3.3 Model cascades

Current P117 implementation baseline (not final quality acceptance): all three current modes use Gemini primary order `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite`. The optional candidates `gemini-3.6-flash`, `gemini-3.8-flash`, and `gemma-4` are live-probed hourly and must not enter a cascade before a successful probe. Groq Cloud and Cloudflare Workers AI are opt-in fallbacks only (`ENABLE_EXTERNAL_MODEL_FALLBACK=true`) because they may have separate billing and data-processing terms. Credentials alone do not enable cross-provider transfer. Probes are per process/replica and may duplicate across replicas; this is a known limitation. Exact model IDs and account-level permission must be verified by live API calls.

Each agent defines its own cascade based on task quality, tool support, context needs, latency, and cost. Do not choose a provider solely because it is shared by other agents. For every cascade, specify primary/secondary providers, capability assumptions, routing criteria, timeout/retry limits, fallback behavior, context preservation, structured-output handling, and safe failure semantics. Provider names/availability are configuration facts to verify during implementation, not hard-coded assumptions in this contract.

### 3.4 Instruction governance

Create a per-agent instruction inventory during audit. For every instruction/prompt rule record: owner/agent, purpose, priority, source file, input/output contract, enforcement mechanism, failure behavior, and test evidence. Detect duplicated, contradictory, obsolete, over-broad, and non-operative rules. Remove or consolidate instructions only with a behavior test proving the intended user outcome remains protected. Do not use “more instructions” as the default response to a failure.

### 3.5 Shared infrastructure is not shared product behavior

Potential shared primitives include provider clients, identity, persistence, event/log transport, rate limiting, cancellation utilities, safe filesystem access, archive utilities, and UI shell. Agent-specific workflow logic must remain separated. The audit must prove actual dependency boundaries before deciding whether to retain, split, or rewrite existing modules.

## 4. Acceptance scenarios

**Conversational Agent**
- Answers a stable-knowledge question directly and proportionately.
- For current facts, uses an available freshness source or states clearly what could not be verified.
- Preserves relevant context in follow-up turns.
- Handles tool/provider/verifier failure with bounded recovery or a truthful, actionable explanation.

**Expert Problem-Solving Agent**
- Preserves a multi-dimensional investigation across at least six turns.
- Distinguishes facts/provenance, assumptions, hypotheses, unknowns, evidence, alternatives, decisions, risks, and next actions.
- Produces a coherent synthesis and prioritized action plan.
- Recovers from a failed stage without losing prior work or stranding the user in empty/inert panels.

**Complex Software Architect Agent**
- Produces non-empty project files for a representative software request and provides an accessible, integrity-checked archive.
- Reports which declared build/tests actually ran and their results.
- Handles malformed specifications through bounded repair or a specific failure explanation.
- Injected generation, validation, or packaging failures never produce false success; safe partial artifacts are identified.
- Retry/resume does not duplicate or corrupt project state.

**Cross-agent acceptance:** mocked control-flow tests, source-level checks, live-provider tests, browser E2E, and production evidence must be reported separately. No agent is accepted solely because CI is green, a model call succeeded, JSON validated, or panels were populated. Any unrun critical scenario remains explicit.

## 5. Instruction governance and evidence

For each agent, maintain a concise inventory of instruction composition, orchestration, state transitions, model/provider cascade, tool policy, output contract, retries/timeouts/cancellation, failure handling, and acceptance evidence. Detect conflicting or obsolete rules. Change or remove a rule only with a behavior test that demonstrates the intended user outcome remains protected; do not respond to every defect by adding more instructions.

Before changing prompts, instructions, verifiers, or model cascades, capture representative baseline inputs/outputs where feasible and compare results using a consistent rubric. Set evaluation thresholds before reviewing candidate results. Do not invent numeric baselines where none exist.

## 6. Implementation migration and rollback

- Treat existing modes and branches as legacy implementation, not as architectural constraints.
- Replace the Architect chooser and separate submode branches with the target single workflow in a bounded patch; do not ship an interim product that merely hides the chooser while retaining two independent user flows.
- Reuse a component only when it supports the target workflow and shared completion contract. Delete or refactor components whose sole purpose is preserving a rejected mode split.
- Migrate persisted projects/artifacts only when required; define mapping and rollback before any data-shape change.
- Keep user artifacts safe and accessible during routing/workflow migration.
- Roll back implementation changes if needed, but do not redefine the product target to fit legacy code.

## 7. Scope boundaries

- Shared provider adapters, identity/authentication, persistence primitives, telemetry transport, cancellation utilities, safe file storage, archive utilities, and a common UI shell may be shared.
- Agent-specific workflow policy must not collapse into one prompt/orchestration pipeline with mode flags.
- The Complex Software Architect Agent targets software systems. General business-plan or generic document generation is not a fourth agent and is outside this contract unless separately authorized.
- VIX remains long-horizon strategic direction, not automatic authorization for broad immediate implementation.

## Implementation and acceptance rules

- Accept each agent independently against representative user scenarios before the UI migration is considered complete.
- Preserve current behavior only where it serves the approved user outcome; legacy modes and routing are not architectural constraints.
- Do not rewrite unrelated infrastructure merely to make the architecture look cleaner.
- Before changing instructions, prompts, model cascades, or verifiers, capture representative baseline inputs and outputs where feasible and compare changed behavior against the baseline.
- Distinguish mocked checks, source-level checks, live-provider checks, browser end-to-end checks, and production evidence.
- A green CI run is necessary evidence about checked code, not proof that the user received a useful answer or artifact.
- Every failure path must produce a truthful user-visible state and a concrete recovery option where possible.
- Stop and ask the Navigator if a proposed patch is primarily internal restructuring and no explicit, testable user-outcome benefit can be stated.
- The Navigator maintains local backups. Do not retain duplicate historical specification files just to preserve old versions.

## 8. Product completion and scope control

The only committed product scope is the three user-facing agents and the user outcomes specified in sections 2–4. A provider-resilience layer, additional agent, browser-based model-provider branch, or broad VIX implementation is not an automatic next phase and is not a substitute for closing current user-value gaps. Such work may be proposed only when a measured user-outcome failure establishes the need, with a bounded hypothesis, privacy/cost constraints, and explicit authorization where required.

The implementation sequence is maintained only in `../ROADMAP.md`; do not create or revive competing patch roadmaps. The next product implementation is the single Architect workflow. After it is implemented, evaluate real Conversational and Expert tasks and close the programme only when the final user-value release gate in `../ROADMAP.md` is satisfied.

## 9. Final acceptance rule

For each claimed complete agent, evidence must show a representative user task, actual visible output, task-based evaluation, and a clear disposition for limitations. For Architect, evidence must include a real generation attempt and either a verified user-accessible artifact or a truthful stage-specific failure with recovery. For Conversational and Expert, deterministic UI fixtures alone are insufficient; actual response quality and context continuity must be evaluated. Mocked tests, source checks, CI, live-provider tests, and deployed-product evidence must be labelled separately.

The programme is not complete because a patch sequence ends or tests pass. It is complete only when the three agents deliver their specified user outcomes and the Navigator explicitly accepts the evidence.
