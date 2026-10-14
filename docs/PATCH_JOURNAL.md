# Patch journal

> Short log of delivered patches and planning transitions. Newest entry at the **top**.
> For the active mode initiative, scope and sequence are in `docs/MASTER_IMPLEMENTATION_PLAN.md`.
> Historical queue entries are not authorisation to start work.

| Date | ID | Result | Notes |
| 2026-10-14 | MP2 | completion | light information prompt branch by mode; decision/research/engineering prompts unchanged; `tests/mp2.test.mjs`; offline prompt-size baseline (live checks NOT_RUN) |
| 2026-10-14 | MP2 | core + Simple/information | promptCore.ts; expanded information detection; default information; skip gain-audit for information |
| 2026-10-14 | DOCS-MODE-PLAN-01 | Documentation package | Master plan created; MP1–MP3 and UI/QA/manual sequence recorded; no code changed |
| 2026-10-14 | — | CI fix | Restored test fixtures ARCHIVE/GOLDEN, P15-REPORT, E01*, CONCEPTS/e01-*; CHANGELOG_AGENT_BEHAVIOR; stripped dead backticks |
| --- | --- | --- | --- |
| 2026-10-14 | P26b | core done | ChangeSet/export library + tests; UI → P29 |
| 2026-10-14 | P26a | done | ZIP ingest core |
| 2026-10-14 | — | docs | P27+ schedule; OWNER_OPS; history off-repo policy |
| (open) | **P27** | — | Next agent patch: Simple workspace attach UI (`docs/P27-SPEC.md`) |

When closing a patch, add a row and write `docs/PNN-REPORT.md`.
