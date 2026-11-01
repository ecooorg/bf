# C124 — Instruction Optimization

**Status:** Approved cycle mandate; audit and implementation are not yet evidenced by this documentation patch.  
**Product version:** 124  
**Documentation baseline:** P124.0.1

## 1. Purpose

BiForge is an engineering intermediary between the user and external large language models (LLMs). External models provide substantive language understanding, domain knowledge, reasoning, and substantive answer composition. BiForge must reliably expose those capabilities to the user; it must not attempt to recreate them through a large collection of hard-coded prompt recipes, canned answers, or special-case substitutions.

The purpose of C124 is to audit and optimize the complete instruction and response-processing system while preserving necessary product, safety, and engineering behavior.

## 2. Normative architecture principle

**BiForge is not a competing reasoning model. It is the reliable engineering layer around the models.**

BiForge owns:
- request intake and faithful conveyance of user intent;
- model and tool routing, provider configuration, and API execution;
- context construction and session isolation;
- attachment and tool-result transport;
- retries, timeouts, cancellation, and error recovery;
- data integrity, schema/format validation, and deterministic checks;
- provenance/status metadata where available;
- faithful rendering and delivery of model output.

External LLMs own substantive interpretation, analysis, domain reasoning, and answer composition, subject to the user's request and applicable safety requirements.

This boundary does not prohibit concise task framing, relevant context, tool-use instructions, safety constraints, or structured output contracts. Such instructions are retained when they serve a demonstrable communication or engineering purpose.

## 3. Audit scope

Inspect all actual instruction sources and all transformations that can change model input or output, including:

- system and developer prompt packs;
- agent-specific and mode-specific prompts;
- dynamically assembled prompt fragments;
- routing and tool-use instructions;
- search/grounding instructions;
- response synthesis, filtering, normalization, summarization, and formatting;
- hard-coded lists, examples, phrase triggers, topic-specific substitutions, and fallback templates;
- tests, snapshots, and documentation that encode prompt behavior.

Search the whole repository. The initial file list is not exhaustive; trace runtime imports and call paths to find dynamic and duplicated sources.

## 4. Classification and disposition

Every instruction or transformation must be inventoried and assigned one category:

| Category | Meaning | Default disposition |
|---|---|---|
| A — Engineering control | Routing, transport, context boundaries, retries, schemas, safety enforcement, session integrity | Keep; implement deterministic controls in code where practical |
| B — Integrity/validation | Checks for truncation, corruption, missing fields, contradictions between operation results, or output contract violations | Keep or strengthen with explicit evidence |
| C — Model-substitution behavior | Fixed reasoning recipes, agent-authored substantive conclusions, canned analyses, mandatory generic reasoning sequences | Remove or redesign so the model performs the intellectual task |
| D — Hard-coded special cases | Unnecessary city/topic/entity lists, phrase triggers, canned substitutions, answer fragments, brittle examples | Remove or replace with context-driven generic handling |
| E — Necessary model communication | Concise task framing, relevant context, tool instructions, safety constraints, response schema, user-requested format | Keep only the minimum necessary and verify its effect |

For each item record: source file and exact location; runtime call path; current purpose; category; dependencies; observed effect; risk; proposed disposition; regression evidence. Do not classify by length alone.

## 5. Required behavior and invariants

### 5.1 Faithful request transfer

Preserve the user's intent, constraints, language, relevant history, and attachments. Do not add inferred details as if supplied by the user. Do not inject a location, entity, or topic from a canned list when it is absent from the current request/context.

### 5.2 Faithful result preservation

Preserve useful model-provided facts, numbers, units, dates, intervals, qualifications, uncertainty, assumptions, and relevant links. Do not discard information merely because BiForge cannot independently verify it. Represent its provenance/status accurately where the UI supports it.

Do not silently rewrite, shorten, replace, or supplement substantive model output unless the user requested that transformation or an objective safety, privacy, integrity, or output-contract requirement demands it. Any such transformation must be traceable and testable.

### 5.3 No fabricated content

BiForge must not invent substantive facts, claim to have verified information it has not checked, or fill missing model output with plausible-sounding content. If the model or tool fails, report the actual failure or limitation.

### 5.4 Deterministic engineering over prompt prose

Where a behavior is mechanically testable (session isolation, schema validation, retry policy, truncation detection, encoding, routing), prefer explicit program logic and tests over instructions asking a model to enforce it. Prompt instructions cannot substitute for security controls or deterministic validation.

### 5.5 Model communication remains necessary

Do not blindly delete all prompts. Keep the information a model needs to understand the user's task, relevant context, available tools, required constraints, and requested output format. Remove unnecessary prescriptions for how the model must think when they do not protect a product contract or materially improve results.

## 6. Prohibited optimization shortcuts

- Replacing old prompt templates with a new, larger library of generic phrases.
- Deleting prompt fragments solely to reduce token count.
- Updating golden snapshots without checking whether the changed behavior is correct.
- Treating compilation or unit-test success as proof of answer quality.
- Assuming an external model always retrieves current facts or is always correct.
- Removing provenance, safety, privacy, or tool constraints under the label of simplification.
- Rewriting user-facing output by default to fit a fixed BiForge answer style.

## 7. Audit deliverable

Before broad prompt cleanup, produce a complete instruction inventory with:

1. file and line/range;
2. runtime owner/call path;
3. exact instruction or transformation (with secrets and user data excluded);
4. category A–E;
5. purpose and dependency;
6. observed or inferred behavioral effect, clearly labeled;
7. risk of keeping/removing;
8. proposed action: KEEP, REWRITE, MOVE_TO_CODE, REMOVE, or NEEDS_OWNER_DECISION;
9. test/evaluation needed.

The inventory is an audit artifact for review, not an extra permanent source of normative rules. Store it only where the patch's documentation/data policy permits.

## 8. Validation and acceptance

### Deterministic regression tests

Use controlled model-response fixtures to verify that BiForge preserves:
- complete text and paragraph order;
- numbers, units, dates, time ranges, and named entities;
- caveats, uncertainty, assumptions, and negative findings;
- useful links and provenance when required;
- multilingual content and formatting;
- explicit model failure states without fabricated fallback answers.

Test that BiForge does not append unsolicited facts, canned conclusions, arbitrary locations, or unnecessary source links. Test that any permitted transformation is explicit, bounded, and traceable.

### Pipeline and session tests

Verify request/context fidelity, attachment transfer, tool-result preservation, no cross-session contamination, independent Simple/Expert sessions, and correct retry/error behavior. Include Architect paths where shared components are affected.

### Model-backed evaluation

Use representative tasks across unrelated domains and languages. Where possible, capture the external model's raw response and the final BiForge response for direct comparison. Evaluate semantic preservation, completeness, unsupported additions, omitted facts, and whether requested transformations were honored. Do not hard-code one expected answer for open-ended questions.

### Evidence labels

Report source inspection, deterministic tests, full CI, live provider calls, deployed behavior, and user outcomes separately. Use the repository's truth labels. Mark unavailable live comparisons `NOT_RUN`; never infer them from mocks or snapshots.

### Acceptance gates

C124 is accepted only when:
1. all discovered instruction sources and output transformations are inventoried;
2. each item has a documented disposition and dependency analysis;
3. model-substitution patterns and unnecessary special cases are removed or justified;
4. necessary model communication, safety, and product constraints remain intact;
5. model output is not silently degraded by BiForge processing;
6. deterministic tests cover integrity and session boundaries;
7. representative model-backed comparisons show no unexplained loss or invention;
8. existing product workflows remain operational;
9. unresolved risks and NOT_RUN checks are explicitly documented.

## 9. Change boundaries

C124 does not authorize changing provider vendors, credentials, pricing, security posture, user-facing agent count/roles, or unrelated workflows. It does not authorize removing a product capability merely because its implementation uses prompts. Such changes require evidence and, where they alter a normative product outcome, explicit owner approval.

Every implementation patch must follow `AGENTS.md`, update the canonical changelog/report/roadmap records, include only changed repository files in its ZIP, and report exactly which checks ran.

## 10. P124.0.2 implementation note

P124.0.2 consolidates the P124.0.1 documentation mandate and closes the known P123.23 CI regressions. It removes the fixed city-name fallback from weather follow-up contextualization and removes the Zurich example from the search translation prompt. Weather query expansion now requests current observations generically and preserves only the place supplied by the user's context. This is a narrow, evidence-based first cleanup slice, not completion of the repository-wide audit. All other prompt sources and response transformations remain to be inventoried under P124.1.
