# Documentation Index

Start with the repository-level `AGENTS.md`. Read only the current documents relevant to the task and inspect the implementation when behavior must be verified.

## Current authoritative documents

* `../AGENTS.md` — repository instructions, authorization boundaries and delegation policy.
* `AI-OPERATING-RULES.md` — permanent AI operating and security rules.
* `AI-TRANSFORMATION-SPEC.md` — transformation scope, phases and acceptance gates.
* `DOCUMENTATION-BASELINE.md` — baseline observations and verification limitations.
* `OPERATIONS.md` — current operational procedures, deployment boundaries, rollback, backup and restore.

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
