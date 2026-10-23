# Documentation Index

Start with the repository-level `AGENTS.md`. Read only the current documents relevant to the task and inspect the implementation when behavior must be verified.

## Current authoritative documents

* `../AGENTS.md` — repository instructions, authorization boundaries and delegation policy.
* `AI-OPERATING-RULES.md` — permanent AI operating and security rules.
* `AI-TRANSFORMATION-SPEC.md` — transformation scope, phases and acceptance gates.
* `DOCUMENTATION-BASELINE.md` — baseline observations and verification limitations.
* `OPERATIONS.md` — current operational procedures, deployment boundaries, rollback, backup and restore.

## Phase 0 audit (p71)

* `phase0/BiForge-v70-Phase0-Audit.md` — main forensic report, risks and Phase 0 gate.
* `phase0/module-inventory.csv` — module paths, line counts, kind.
* `phase0/dependency-graph.json` — cycles, fan-in, sample edges.
* `phase0/literal-route-inventory.csv` — HTTP registrations from server entrypoints.
* `phase0/environment-variable-inventory.csv` — `process.env` usage vs `.env.example`.
* `phase0/migration-inventory.csv` — SQL migration summary.
* `phase0/test-inventory.csv` — test file sizes and approximate test blocks.

## Phase 1 guardrails (p72)

* `phase1/PHASE1-GUARDRAILS.md` — commands, ratchet policy, status codes.
* `phase1/boundary-rules.json` — allowed layer edges and exceptions.
* `phase1/known-violations.json` — ratchet baseline for existing cycles.
* `phase1/generated/` — module-map and last check/impact/verify reports.

## Phase 3 typing and naming (p75–p76)

* `phase3/TYPING-AND-NAMING.md` — TypeScript policy, verb dictionary, rename targets.
* `phase3/PHASE3-COMPLETE.md` — Phase 3 closed; deferred strict work listed.
* `../server/domainIds.ts` — branded `ProjectId` / `TaskId` / `CodeTaskId` / `RunId`.

## Phase 4–5 roadmap (next session)

* `phase4-5-ROADMAP.md` — instructions for **p77** (generators) and **p78** (acceptance). Copy-paste session prompts included.


## Implementation evidence

* Source code is the evidence for implemented runtime behavior.
* Tests are evidence for the specific behavior they assert.
* Database migrations are evidence for the schema changes they define.
* CI results are evidence only for the checks actually executed in that run.

Documentation does not prove that a feature works in production. Report contradictions between specifications, code, tests and observed behavior rather than silently resolving them.

## Historical material

The former numbered documentation set (`01`–`18`) is historical reference material retained outside the active repository documentation.

Do not use those files as current requirements. If a historical detail is needed, retrieve it from the owner's local archive, verify it against the current implementation and obtain approval when it changes product scope, security or external behavior.

## Conflicts and missing requirements

If current documents conflict, identify the relevant sources and request a decision when the conflict affects product behavior, security, data handling or scope.

Do not invent product requirements. Record unresolved decisions in the active specification or change proposal before implementation.
