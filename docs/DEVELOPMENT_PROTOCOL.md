# BiForge Development Protocol

> **Document:** DEVELOPMENT_PROTOCOL · **Aligned with:** TZv3.0 (`docs/BiForge_TZ_v3_ru.md`), section 16 (Part B) and section 17 · **Date:** 9 October 2026

## Goal
Make each implementation step small, reviewable, reproducible, and verifiable. This protocol describes how BiForge itself is built (Part B). It does not define product functions (Part A, sections 1–15).

## Participants
| Participant | Role |
| --- | --- |
| Owner | Writes and approves the step SPEC, writes or approves expectation tests, reviews the PR, performs the merge, decides ADRs |
| Development agent | Any model or tool chosen by the owner (D-16). Implements the step per the SPEC and delivers one PR; names the tool and model in the PR description |
| Second pass | A different model, preferably of another family: reviews the diff and reports. Does not commit code |
| GitHub Actions | Automatic checks; the only source of `PASS` for code |

If the same model family both implements and reviews, their errors correlate. For steps marked ★ the human review is mandatory and is not replaced by a model review.

## Standard lifecycle (TZv3.0, section 16.3)
1. **SPEC** — the owner prepares `docs/BX-BX-XX/SPEC.md`: goal, boundaries (what may and may not change), files, PASS criteria, expectation tests. `baseCommit` is fixed. Steps without ★ may use a short form: the SPEC in the PR description or issue.
2. **EXPECTATION TESTS** — if the step needs them, they are committed before implementation and protected by the Test Integrity rule (`tests/acceptance/**`). For ★ steps the owner reads and approves them before implementation starts.
3. **ASSIGNMENT** — a short instruction to the agent with a link to the SPEC (template: TZv3.0, Appendix A).
4. **BASELINE** — the agent records branch, base commit, working-tree state, and relevant existing behavior.
5. **IMPLEMENT and TEST** — change only what the step requires; run `npm ci && npm run check`; fix defects introduced by the change.
6. **PR** — one step, one PR (sub-steps `.a`, `.b` are allowed). All required checks must be green.
7. **REVIEW** — the owner reviews against the checklist (TZv3.0, section 16.6). Guide: 30–90 minutes; for ★ steps up to 2–3 hours plus a second pass by another model.
8. **MERGE** — performed by the owner only.
9. **REPORT** — ★ and gate steps: `docs/BX-BX-XX/REPORT.md` and an update of `BIFORGE-STATE.json`. Other steps: the PR description following `STEP_REPORT_TEMPLATE.md`.
10. **HANDOFF** — the agent proceeds to the next step only on the owner's explicit command.

## Scope boundaries
- One assigned step per task unless the owner explicitly authorizes a combined task.
- Do not implement the next step opportunistically.
- If a step does not fit its size, split it; never complete part of it silently.
- If a dependency or requirement is ambiguous, report the question and a proposed default; do not make a consequential architectural choice silently.
- ADRs are written only for decisions that block the nearest step (TZv3.0, section 20.2).
- Separate unrelated cleanup into a different task.

## Phases and gates (TZv3.0, section 17)
| Gate | Steps | Entry condition (summary) |
| --- | --- | --- |
| G0 Foundation | BX-01…05 | Reproducible build, `check` fully green, migrations apply, real `/health`, documents consistent |
| G1a Vertical slice | BX-06…BX-09.b, BX-10.a/b, BX-11, BX-17.a | Criteria of section 18.0 met; Simple Mode unchanged |
| G1 Multi-model MVP | BX-12…14 | Second provider connected (or `NOT_RUN(no_second_provider)` recorded by the owner); Router with fallback; ledger |
| G2 Orchestration MVP | BX-15…18 | State machine, idempotency, restart recovery, budgets; scenario 18.1 passed; E-01 done and ADR-10 decided |
| G3 Code Delivery beta | BX-19…23 | GitHub, executor(s) per ADR-10, Gate Engine, Repair Loop; pilot task reached PR and human decision |
| G4 Pilot release | BX-24…26 | Security evidence, backup and restore, rollback drill, pilot S3 accepted |

A move to the next gate is an explicit decision of the owner based on saved evidence. A step with sub-steps is complete only when all sub-steps are complete.

## Failure handling
- If a test fails, report the failure and investigate whether the current change caused it.
- If the baseline already fails, preserve evidence and distinguish pre-existing failures from regressions (BX-01.a covers the known ones).
- If blocked by unavailable tools, network, credentials, or quotas, record the exact blocker (`BLOCKED`) and the checks that remain unverified (`NOT_RUN`).
- Never label an unexecuted check as passed.
- Every loop is bounded by attempts, budget, and a no-progress signal.

## Acceptance principle
Completion means the acceptance criteria have evidence. A successful commit, a green-looking summary, or a created PR alone is not sufficient. The PASS column of the step in TZv3.0, section 16.4 defines the criteria.
