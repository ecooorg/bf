# Architecture and Component Boundaries

**Authority:** Product and behavior requirements are in `../TECHNICAL_SPECIFICATION.md`. This file records architectural constraints and implementation landmarks; it must not redefine user-facing behavior.

## Quick orientation

- Three user-facing agents only: Conversational (Simple), Expert, Architect — one Architect flow, no mode switch.
- Client never calls model providers; server owns auth, budgets, search, and generation.
- App Builder core (`appBuilder/`) is ports-only; Express/DB/React stay in adapters.
- Search continuity and evidence grounding rules live under Information quality workflow below; model ids under `docs/MODEL_REGISTRY.md`.
- Generated inventories under `docs/generated-*.json` are authoritative maps; do not hand-maintain duplicates.

## Target shape

- Client: React + Vite; server: Express; model calls remain server-side.
- Agent orchestration: Conversational and Expert currently have known shared paths; Architect/App Builder is a separate route family and engine. Do not claim full isolation unless current source and tests prove it.
- App Builder core (`appBuilder/`) should remain a pure core with ports; Express/database/client concerns belong in adapters.
- Durable project state is PostgreSQL-backed when configured; any fallback must be explicit and consistent with the applicable mode and security contract.

## Architect user-flow invariant

Architect is one user-facing agent and one state machine. Any beginner-friendly wording or advanced controls are adaptive presentation within that same flow, not a choice between modes. All paths must converge on the same task/specification, plan validation, artifact generation, validation, status, and delivery contract.

## Selected Architect and frozen Architectural Test Lab

`/project` and `/architect` mount the selected legacy `ProjectMode` workflow. New product work and reliability fixes target this one Architect implementation. `/architect-lab` remains available as a frozen diagnostic experiment only; do not develop it in parallel or present it as the primary Architect.

The Lab frontend remains a separate surface but is not an independent generation engine: it reuses authenticated project/build APIs and shared backend orchestration, polling, validators, and artifact storage. Its latest supplied build report was `PARTIAL`, with JavaScript syntax and file-reference failures. The selected legacy artifact reported `SUCCESS` with all declared validators passing, although source inspection found semantic DOM aliasing that the old validator missed. The shared validator now checks this failure class. Browser/mobile user outcome is still NOT_RUN.

## Conversational retrieval boundary

- The search planner receives a bounded recent dialogue window, while the provider query is made self-contained from the latest user task. A recognizable follow-up may inherit only the immediately preceding user task; an intervening unrelated user turn breaks carry-over.
- Planner-model failure does not erase a recognized lookup task: deterministic fallback preserves its query and named entities, subject to the same personal-data exclusion.
- Search-provider routing and LLM generation routing are separate concerns. Search-provider fallback is handled by the provider carousel; cross-provider generation fallback remains explicitly opt-in because provider data-handling terms and user content may differ.
- Retrieval usability is query/topic/entity relevance, not a universal number-presence test. Numeric evidence is required only when the requested answer is numeric or time/measurement based. This check is a retrieval-quality gate, not a full claim-by-claim fact verifier.

## Information quality workflow (summary)

A build or answer that passes syntax checks is not evidence that its information is correct. The same scenario families should be evaluable across Simple, Expert, and Architect modes with identical inputs and a clean conversation state.

**Deterministic contract layers (every commit):** search continuity on elliptical follow-ups; provenance limited to the current lookup; grounding of live numeric claims to the current evidence packet or explicit estimate/general-knowledge labels; distinguishable evidence boundaries (source text, user assertions, assumptions, inference, unknowns); no silent substitution of fabricated defaults for failed providers; mode contract (Simple answers the immediate question; Expert maintains analytical continuity; Architect emits a coherent artifact and honest validation status); regression safety on malformed/empty/stale/timeout/partial outcomes.

**Scenario families (nightly / pre-release):** current facts, follow-up continuity, source conflict, thin evidence, user-provided evidence, quantitative reasoning, ambiguous intent, error recovery, long dialogue, adversarial input.

**Mode acceptance highlights:**

- Simple: direct answer in the first 1–2 sentences; length matches complexity; current claims supported or labelled; sources from this turn.
- Expert: facts / assertions / assumptions / hypotheses / unknowns distinguishable; new turns state which prior conclusions change; recommendations do not seize the user’s decision unless requested.
- Architect: plan declares file map, interfaces, schema and acceptance before generation; imports resolve; user actions trace UI → handler → service → result; provider failures visible and excluded from aggregates; honest SUCCESS / PARTIAL / FAILED.

Detailed acceptance criteria and human blind-review process remain under `docs/TESTING_AND_ACCEPTANCE.md` and `docs/USER_VALUE_EVALUATION.md`.

## Model routing landmarks

- Gemini free-key allowlist and catalog summary: `docs/MODEL_REGISTRY.md`.
- Runtime catalog: `config/model-sources.json`.
- Cascades and health probes are code-owned; documentation must not invent additional default model ids.

## Guardrails

- Client never calls model providers directly.
- Server routes validate input and enforce auth, CSRF, rate limits, budgets, and delivery gates as applicable.
- App Builder core must not import Express, React, or direct database clients.
- Use generated inventories/architecture checks instead of hand-maintaining duplicated maps.
- The machine-readable boundary rules and known-violation files are retained under `docs/`; treat generated inventories as outputs of their declared scripts.

## Source maps

See `docs/generated-module-map.json`, `docs/generated-route-inventory.json`, `docs/architecture-boundary-rules.json`, and `docs/architecture-known-violations.json`. Regenerate through the corresponding `npm run docs:generate` / architecture scripts; do not manually fabricate generated output.

## Historical architecture notes

Older architecture discussions and audit findings were consolidated during documentation inventory work. Their historical claims are not current guarantees unless confirmed by current source, tests, or a new evidence record.
