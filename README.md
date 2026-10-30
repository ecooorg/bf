# BiForge

BiForge helps users converse, solve expert problems, and turn software goals into validated downloadable artifacts. Product success is judged by real user outcomes; tests and CI are supporting evidence, not substitutes.

## Canonical project documents

- `AGENTS.md` — mandatory governance, obligation map, session-start protocol, change permissions, and evidence rules.
- `TECHNICAL_SPECIFICATION.md` — normative product behavior, technical requirements, and acceptance criteria.
- `ROADMAP.md` — ordered programme plan, dependencies, completed phases, and current priorities. Every session re-evaluates the next task from the actual repository state.
- `TECHNICAL_REPORT.md` — factual implementation state, known gaps, verification results, and evidence provenance.
- `CHANGELOG.md` — patch history, newest first.

Specialist details live in `docs/ARCHITECTURE.md`, `docs/API_CONTRACTS.md`, `docs/TESTING_AND_ACCEPTANCE.md`, `docs/USER_VALUE_EVALUATION.md`, `docs/SECURITY_AND_PRIVACY.md`, `docs/OPERATIONS_AND_RELEASES.md`, `docs/DATA_AND_ARTIFACTS.md`, and `docs/DECISIONS.md`. `docs/VIX-CONCEPT.md` is long-horizon strategic context, not authorization for immediate work. Machine schemas and generated inventories are data for tools, not competing prose sources of truth.

## Starting work

Every new assistant session must follow the complete session-start protocol in `AGENTS.md`: reconstruct current state, verify relevant claims, trace mandatory obligations, identify gaps, and only then define a task for the current session. There is no persistent next-patch assignment file. CI-generated `PATCH_EVIDENCE.md` reports describe one workflow run and do not prescribe future work.
