# Architecture and Component Boundaries

**Authority:** Product and behavior requirements are in `../TECHNICAL_SPECIFICATION.md`. This file records architectural constraints and implementation landmarks; it must not redefine user-facing behavior.

## Target shape

- Client: React + Vite; server: Express; model calls remain server-side.
- Agent orchestration: Conversational and Expert currently have known shared paths; Architect/App Builder is a separate route family and engine. Do not claim full isolation unless current source and tests prove it.
- App Builder core (`appBuilder/`) should remain a pure core with ports; Express/database/client concerns belong in adapters.
- Durable project state is PostgreSQL-backed when configured; any fallback must be explicit and consistent with the applicable mode and security contract.

## Architect user-flow invariant

Architect is one user-facing agent and one state machine. Any beginner-friendly wording or advanced controls are adaptive presentation within that same flow, not a choice between modes. All paths must converge on the same task/specification, plan validation, artifact generation, validation, status, and delivery contract.

## Architectural Test Lab — independent development track

`/architect-lab` is the experimental fourth user-facing mode, separate from the three core agents and from the legacy Architect route. The Lab owns its instructions, UI, state machine, progress/error/recovery handling, and completion contract. Do not mount `ProjectMode` or route Lab interactions through legacy UI state.

The current Lab is an isolated frontend surface, not yet an independent generation engine: it still reuses authenticated project/build APIs and shared backend orchestration, polling, validators, and artifact storage. Keep that limitation explicit in reports and acceptance claims. The target is a separately owned Lab workflow/engine with explicit, tested interfaces to shared infrastructure (auth, model/provider connectivity, persistence, and artifact delivery where appropriate).

Legacy Architect is retained during the experiment as a diagnostic reference. Do not make routine legacy repairs or copy its workflow implementation into the Lab. Translate observed legacy failures into Lab-specific prevention and recovery requirements, especially bounded model-call stages, observable lifecycle transitions, timeout/cancellation, progress/heartbeat, idempotent recovery, and a persistent completion/error surface. Changes to the legacy route's status require an explicit owner decision and user-outcome evidence.

## Guardrails

- Client never calls model providers directly.
- Server routes validate input and enforce auth, CSRF, rate limits, budgets, and delivery gates as applicable.
- App Builder core must not import Express, React, or direct database clients.
- Use generated inventories/architecture checks instead of hand-maintaining duplicated maps.
- The machine-readable boundary rules and known-violation files are retained under `docs/`; treat generated inventories as outputs of their declared scripts.

## Source maps

See `docs/generated-module-map.json`, `docs/generated-route-inventory.json`, `docs/architecture-boundary-rules.json`, and `docs/architecture-known-violations.json`. Regenerate through the corresponding `npm run docs:generate` / architecture scripts; do not manually fabricate generated output.

## Historical architecture notes

Older architecture discussions and audit findings were consolidated during the 2026-10-30 documentation inventory. Their historical claims are not current guarantees unless confirmed by current source, tests, or a new evidence record.
