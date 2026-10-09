# BiForge Development Protocol

## Goal
Make each implementation step small, reviewable, reproducible, and verifiable.

## Standard lifecycle
1. **SPEC** — read the assigned BF step and acceptance criteria in `docs/specs/BIFORGE_TECHNICAL_SPEC.md`.
2. **BASELINE** — record branch, base commit, working-tree state, and relevant existing behavior.
3. **PLAN** — outline the smallest implementation and tests; identify risks and dependencies.
4. **IMPLEMENT** — change only what the assigned step requires.
5. **TEST** — run relevant checks and record exact commands and results.
6. **FIX** — correct defects introduced by the change and rerun affected checks.
7. **REPORT** — prepare `STEP_REPORT.md` with evidence, limitations, and Git references.
8. **PUBLISH** — use a feature branch and PR when supported; never merge without authorization.
9. **REVIEW/ACCEPT** — a human or explicitly authorized reviewer checks scope, diff, evidence, and risks.
10. **HANDOFF** — proceed to the next BF step only after explicit acceptance.

## Scope boundaries
- One assigned BF step per task unless the user explicitly authorizes a combined task.
- Do not implement the next step opportunistically.
- If a dependency or requirement is ambiguous, report the question and a proposed default; do not make a consequential architectural choice silently.
- Separate unrelated cleanup into a different task.

## Failure handling
- If a test fails, report the failure and investigate whether the current change caused it.
- If the baseline already fails, preserve evidence and distinguish pre-existing failures from regressions.
- If blocked by unavailable tools, network, credentials, or quotas, record the exact blocker and the checks that remain unverified.
- Never label an unexecuted check as passed.

## Acceptance principle
Completion means the acceptance criteria have evidence. A successful commit, a green-looking summary, or a created PR alone is not sufficient.
