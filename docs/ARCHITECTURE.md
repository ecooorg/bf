# Architecture and Component Boundaries

**Authority:** Product and behavior requirements are in `../TECHNICAL_SPECIFICATION.md`. This file records architectural constraints and implementation landmarks; it must not redefine user-facing behavior.

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
