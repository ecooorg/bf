# Documentation Index

Start with repository-level `AGENTS.md`. Read only documents relevant to the task.

## Active documents

* `../AGENTS.md` — entry, authorization, status
* `AI-OPERATING-RULES.md` — permanent AI operating rules
* `AI-TRANSFORMATION-SPEC.md` — transformation contract (accepted; reference)
* `DOCUMENTATION-BASELINE.md` — baseline observations
* `OPERATIONS.md` — deploy, rollback, backup
* `AI-NATIVE-ROADMAP-P81-P84.md` — P81–P84 objectives, implementation notes, gates and measurements
* `AI-NATIVE-ROADMAP-P85-P91.md` — VIX-integrated, human-simplicity-focused next steps for AI-assisted development; per-patch plans, acceptance gates, stop conditions and bootstrap prompt
* `VIX-CONCEPT.md` — preserved long-term VIX target architecture; conceptual reference only, not a commitment to implement every component in the near-term roadmap
* `context-locality-p82.json` — P82 before/after task-local context evidence and verification limits
* `contracts-verification-p83.json` — P83 selected API contract inventory, negative-test guarantees and verification limits
* `context-benchmark-p84.json` — P84 deterministic scenario metrics, v80 + p80.1 comparison and recall gaps
* `context-benchmark-verification-p84.json` — captured local verification statuses, measured command durations and CI/build blockers
* `architecture-guardrails.md` — map, boundaries, inventories commands
* `architecture-boundary-rules.json` / `architecture-known-violations.json` — ratchet config
* `typing-and-naming.md` — TypeScript and naming conventions

## Generated (do not hand-edit)

* `generated-route-inventory.json`
* `generated-env-inventory.json`
* `generated-migration-inventory.json`
* `generated-module-map.json`
* `context-baseline-v80.json` — frozen static pre-P81 baseline (not a generated-current inventory)

Regenerate: `npm run docs:generate`.

## Archive

Historical phase-era files (flat names) under `../archive/` — audit CSVs, acceptance record, old roadmaps. Not required for routine changes.
