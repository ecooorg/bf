# API Contracts

**Authority:** Normative user-facing behavior and acceptance live in `../TECHNICAL_SPECIFICATION.md`; route ownership and input/output contracts must agree with the running source. This file is the navigation and implementation contract, not a parallel product spec.

## Contract rules

- All public/API routes must validate inputs, return documented status/error shapes, and apply the relevant authentication, CSRF, rate-limit, budget, and feature-gate policies.
- Keep model-provider credentials and direct provider requests server-side.
- User-visible agent identity is exactly Conversational, Expert, Architect. Internal legacy keys are implementation details and must not leak into the user-facing mode selector.
- Architect endpoints must implement one flow and a single completion contract. No API or client contract should require selecting novice/professional Architect modes.
- Download endpoints must enforce ownership/authorization, artifact existence, integrity, and status-specific delivery policy. A `PARTIAL` result must not be silently presented as a complete successful artifact.
- Error responses must be actionable, truthful, and distinguish invalid input, missing resources, authorization failure, provider/model failure, validation failure, and internal failure where supported.

## Source inspection

The current route inventory is generated at `generated-route-inventory.json`. Route definitions and validation are in the server route modules. `TECHNICAL_SPECIFICATION.md` §4 remains the detailed normative API section. If this navigation summary and the source/spec diverge, record the discrepancy and resolve it in the authoritative spec before relying on either behavior.

## API change acceptance

For a changed endpoint, provide: contract tests for success and failure, authorization tests where applicable, a compatibility decision for existing clients, and realistic user-flow evidence if the endpoint affects user-visible outcomes. Test stubs do not establish deployed/live behavior.
