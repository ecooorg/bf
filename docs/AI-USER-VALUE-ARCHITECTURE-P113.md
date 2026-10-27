# P113 — User-Outcome Architecture Contract and Audit Plan

**Status:** normative target and work plan; implementation not started by this patch.  
**Owner decision:** replace the four current user-facing modes with exactly three autonomous agents.  
**Primary acceptance rule:** a feature is not successful because internal components execute or CI is green; it is successful only when a representative user completes the intended task and receives useful, truthful, accessible output.

## 1. Purpose and failure model

BiForge's product purpose is to deliver information value and completed work to its user. Internal health, tests, model-call success, schema validity, and green CI are necessary evidence, but none alone proves product success. A workflow that ends in empty panels, generic stale answers, silent failure, or no downloadable artifact is a product failure even when its internal checks pass.

The current four modes are reported by the owner as functionally unacceptable: Simple mode tends toward generic/dated answers under accumulated controls; Expert mode loses useful progression after a few turns; both Project modes can end without a usable archive/files or an actionable explanation. Treat these as user-reported symptoms to reproduce during audit, not as proven root causes. Prior log findings (App Builder `invalid_spec`, verifier errors, AbortSignal listener warnings, browser `node:crypto` warnings, dependency audit warning) remain supporting evidence, not a substitute for end-to-end diagnosis.

P113 changes the programme's control question from “did the implementation pass its checks?” to “did the user receive the intended outcome, with evidence and a clear recovery path if not?”

## 2. Target product: exactly three agents

The product exposes three modes/agents. No fourth mode and no shared “project mode” selector remains in the target UX. The three agents own separate workflows, prompt/instruction sets, orchestration policies, model cascades, state machines, output contracts, and acceptance suites. They may use low-level shared infrastructure (provider adapters, authentication, persistence primitives, telemetry, cancellation, safe file storage, common UI shell), but shared infrastructure must not collapse their behavior into one prompt pipeline with mode flags.

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

Each agent defines its own cascade based on task quality, tool support, context needs, latency, and cost. Do not choose a provider solely because it is shared by other agents. For every cascade, specify primary/secondary providers, capability assumptions, routing criteria, timeout/retry limits, fallback behavior, context preservation, structured-output handling, and safe failure semantics. Provider names/availability are configuration facts to verify during implementation, not hard-coded assumptions in this contract.

### 3.4 Instruction governance

Create a per-agent instruction inventory during audit. For every instruction/prompt rule record: owner/agent, purpose, priority, source file, input/output contract, enforcement mechanism, failure behavior, and test evidence. Detect duplicated, contradictory, obsolete, over-broad, and non-operative rules. Remove or consolidate instructions only with a behavior test proving the intended user outcome remains protected. Do not use “more instructions” as the default response to a failure.

### 3.5 Shared infrastructure is not shared product behavior

Potential shared primitives include provider clients, identity, persistence, event/log transport, rate limiting, cancellation utilities, safe filesystem access, archive utilities, and UI shell. Agent-specific workflow logic must remain separated. The audit must prove actual dependency boundaries before deciding whether to retain, split, or rewrite existing modules.

## 4. P113 scope

P113 is a specification, audit and sequencing patch. It does not implement the three agents, delete existing modes, change runtime routing, alter prompts, change providers, or deploy to production.

P113 delivers:
- this canonical user-outcome architecture contract;
- clarification of the AI-only repository-documentation rule;
- a new roadmap and gate sequence focused on user outcomes;
- an audit procedure that traces each current mode end-to-end;
- acceptance metrics and required scenario tests;
- a bounded next-patch plan that starts with evidence, not speculative refactoring.

## 5. Required audit procedure (first implementation work after P113)

For each current mode, reproduce at least one normal task and one failure/recovery task from the user interface. Trace the full path:

`user action → UI event → route/handler → composed instructions → model/provider cascade → tool calls → output validation/verifier → state persistence → UI rendering → final artifact/access (where applicable)`.

For each link record: expected contract, actual implementation, source locations, evidence/logs, state passed to the next link, failure handling, and user-visible effect. Mark claims `CONFIRMED`, `REPRODUCED`, `HYPOTHESIS`, or `NOT_RUN`; do not upgrade a hypothesis without evidence.

Audit work items:
- **AUD-1 Simple:** instruction composition, freshness/search path, conversation context, answer post-processing, verifier fail behavior, latency and response usefulness.
- **AUD-2 Expert:** state model, panel-to-state mapping, iteration transitions, persistence, meaningful next action, terminal synthesis/action plan, recoverability.
- **AUD-3 Project modes:** requirements/spec validity, generator invocation, workspace/file creation, validator/build/test sequence, archive packing, artifact manifest, download delivery, failure/retry state. Include `invalid_spec` as a known failure case.
- **AUD-4 Cross-cutting:** model cascade per mode, instruction inventory/conflicts, retries/timeouts/cancellation, listener lifecycle, structured-output contracts, telemetry, provider failures, authorization/safety boundaries.
- **AUD-5 Existing P110–P112:** determine which contracts/tools are actually used by runtime paths, whether generated inventories are current, and whether context/impact plans affect execution or are only optional CLI artifacts.
- **AUD-6 Security and dependency risk:** identify the two reported high-severity dependencies, exact versions/advisories/reachability, and safe mitigation options. Verify browser crypto fallback and ZIP CRC/integrity behavior.

Audit output is an AI-facing decision artifact, not a user manual. Keep only evidence-linked findings needed to choose the next patch. The audit must not become an unbounded rewrite.

## 6. Acceptance strategy: user outcomes first

Each agent requires deterministic contract tests plus end-to-end scenario tests. Mocked tests establish control-flow behavior; they do not alone establish model quality or live-provider behavior. Where live calls are unavailable, label them `NOT_RUN` and do not claim full acceptance.

Minimum scenarios:

**Conversational:**
- stable-knowledge question answered directly and proportionately;
- current-events/current-facts question uses an available freshness source or clearly states the limitation;
- multi-turn follow-up retains the relevant context;
- provider/verifier/tool failure leads to bounded recovery or a clear explanation, not generic fabricated certainty.

**Expert:**
- a multi-dimensional problem survives at least 6 user/agent turns without state loss;
- facts, assumptions, unknowns, hypotheses, alternatives, and decisions remain distinguishable;
- the user can inspect a synthesized conclusion and prioritized action plan;
- injected stage failure preserves prior work and presents a meaningful next action.

**Software Architect:**
- a representative small software request produces non-empty project files and a downloadable, integrity-checked archive;
- required build/tests are run and accurately reported;
- malformed specification is repaired within a bounded policy or produces a specific failure explanation;
- injected generation/validation/packaging failure never leaves a false-success state and preserves safe partial output where possible;
- retry/resume does not duplicate or corrupt the project state.

**Cross-cutting release rule:** no agent is accepted based only on unit tests, typecheck, build, CI green, model-call success, valid JSON, or populated panels. Acceptance requires outcome evidence and explicit status for every scenario. No live-provider claim when live tests were not run.

## 7. Roadmap and gates

### P113 — Target contract and audit plan (this patch)
Gate: three agents and user outcome contracts are explicit; C1/C7 are unambiguous; audit procedure and gates are defined. No runtime change.

### P114 — End-to-end audit and root-cause map
Run AUD-1 through AUD-6; reproduce user-reported failures; trace current source paths; build a ranked finding set by user harm, frequency, confidence, and fix leverage. Deliver one decision surface with evidence and recommendation per component. Gate: each mode has a traceable user path and at least one reproduced or explicitly `NOT_REPRODUCED` scenario; no root cause is stated without evidence.

### P115 — Conversational Agent recovery
Implement a distinct conversational orchestration/instruction/cascade contract, with minimal required stages and freshness/tool behavior. Preserve security and evidence integrity. Gate: all conversational scenarios pass; no regression in multi-turn context; representative user evaluations demonstrate relevant non-generic answers. Keep expert/project flows out of scope.

### P116 — Expert Problem-Solving Agent
Implement its stateful investigation model, iterative workflow, synthesis, and action-plan contract. Gate: six-turn scenario and injected recovery tests pass; no dead-end UI state; persisted work can be resumed.

### P117 — Software Architect Agent core
Implement requirements → plan → files → verification → packaging → delivery as a durable workflow. Make invalid-spec recovery and explicit failure terminal states first-class. Gate: real artifact is non-empty, integrity checked, accessible, and verified by the declared checks; injected failures are truthful and recoverable.

### P118 — Three-agent separation and migration
Replace four-mode routing/UI with exactly three agent choices. Migrate compatible data and existing functionality only where evidence supports it; preserve rollback. Remove old mode code only after parity/acceptance evidence and usage/data migration review. Gate: every user-facing entry maps to one of three agents; no orphaned route/state; end-to-end tests pass for all three; rollback tested.

### P119 — Cross-agent resilience and quality gates
Harden retries, timeout/cancellation/listener lifecycle, structured output, telemetry, freshness, dependency remediation, and shared primitive boundaries based on AUD findings. Add regression coverage for every confirmed defect. Gate: fault injection produces truthful terminal states; no hidden success; dependency/security findings dispositioned with evidence.

### P120 — Product outcome acceptance and closure
Run repeated representative scenarios for all three agents, record quality/completion/failure/recovery metrics, compare against explicit thresholds set before evaluation, and review remaining risks. Gate: each agent meets its own acceptance contract; all unmet/untested criteria remain visible; no claim of full success with `NOT_RUN` or `UNKNOWN` critical scenarios.

Patch IDs are a proposed sequence, not authorization to execute all patches automatically. Each remains a bounded change and follows the authorization tiers.

## 8. Metrics and evidence

Capture per-agent, per-scenario:
- task completion and user-accessible outcome rate;
- task-specific quality rubric score with example/evidence;
- false-success rate (must be zero in acceptance scenarios);
- recovery rate after injected failure;
- context/state continuity failures;
- freshness source use when freshness is required;
- artifact validity/access rate for A3;
- user clarification burden and dead-end rate;
- latency, provider cost, and retries as constraints;
- evidence completeness and reproducibility.

Thresholds must be defined before evaluation, not selected after seeing results. Keep model/provider-specific scores separate from deterministic application-contract results. Do not fabricate numeric baselines where none exist; establish baseline during P114 and set acceptance thresholds before P115–P120 evaluation.

## 9. Migration and rollback rules

- Do not remove the four existing modes in P113 or P114.
- Implement each replacement behind an explicit route/feature boundary; avoid mixing new agent orchestration with legacy mode-specific prompt conditionals.
- Migrate persisted conversations/projects only after a mapping and rollback plan exists.
- Keep user artifacts safe and accessible during migration; do not delete source data as part of a route switch.
- Remove old mode paths only after the corresponding new agent passes its acceptance gate and migration integrity is evidenced.
- Roll back routing independently from data migration where possible. A rollback must restore a usable user path, not merely a green build.

## 10. P113 non-goals and risks

**Non-goals:** runtime code changes; immediate prompt deletion; provider changes; production deployment; claims that the four modes are fixed; declaring a rewrite mandatory before audit; converting all project generation into general document generation; relaxing existing tests/security/evidence gates.

**Risks to test:** over-generalized global instructions; conflicting agent and verifier contracts; context loss; model cascade mismatch; output-schema rejection; unhandled terminal failures; UI disconnected from persisted state; artifacts created but not delivered; stale generated inventories; over-reliance on green CI; hidden provider failures; retry/cancellation listener accumulation.

## 11. Decision rule after audit

For each component, choose one of: `RETAIN`, `REPAIR`, `ISOLATE`, `REPLACE`, `RETIRE`. The choice must cite user-outcome evidence, cost/risk, migration impact, and regression proof. “Already implemented,” “has tests,” and “green CI” are not sufficient reasons to retain a component. “Rewrite from scratch” is not sufficient justification to replace one.

## 12. P113 completion checklist

- [x] Owner-approved direction recorded: exactly three agents.
- [x] User outcome contracts defined for all three.
- [x] End-to-end audit path and evidence labels defined.
- [x] User outcome acceptance scenarios defined.
- [x] Roadmap and gates defined through outcome-based closure.
- [x] C1/C7 clarified: AI-facing normative artifacts are permitted; external-reader documentation is not the intended repository output.
- [ ] Runtime audit executed (P114).
- [ ] Any runtime defect fixed (P115+).
- [ ] Three-agent runtime behavior verified (P118+).
