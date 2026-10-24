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
* `PROJECT-MODE-DIAGNOSTICS-ROADMAP.md` — proposed staged observability, artifact-integrity checks, diagnostic export and P85–P91 integration; documentation only, not implemented runtime behavior
* `VIX-CONCEPT.md` — preserved long-term VIX target architecture; conceptual reference only, not a commitment to implement every component in the near-term roadmap
* `USER-GUIDE.md` — detailed beginner-friendly English instructions for Simple, Expert and Project modes, including files, exports, approvals, safety, troubleshooting, and a hands-on Lab Escape game project
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

- `docs/TASK-CONTEXT-P85.md` — P85 task-context CLI, limitations, and human-effort gate.
* `CHANGE-IMPACT-P86.md` — P86 change-impact graph, generator lineage, evidence semantics, limitations, and rollback.
* `VERIFICATION-PLANNER-P87.md` — P87 read-only verification plan, risk-based counterexamples, test-chain guard, command usage, limitations, and rollback.

* `REAL-TASK-BENCHMARK-P88.md` — P88 pilot task dataset, run-capture schema, measured-vs-unavailable semantics and benchmark CLI.
