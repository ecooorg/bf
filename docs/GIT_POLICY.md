# BiForge Git and Pull Request Policy

> **Document:** GIT_POLICY · **Aligned with:** TZv3.0 (`docs/BiForge_TZ_v3.md`), sections 11.2, 11.5, 16.2–16.3 · **Date:** 9 October 2026

> Reference document; binding rules are in `docs/START_HERE.md` and `AGENTS.md`. **This policy describes the future flow with branches and Pull Requests. It does not apply while the owner uploads patches to `main` by hand** (see `docs/START_HERE.md`); it takes effect when direct Git access appears.

## Branching
- Keep `main` as the protected integration branch of `ecooorg/bf`: required checks enabled, no direct pushes.
- Use one feature branch per step (`BX-XX` or sub-step `BX-XX.a`) or independently reviewed task.
- Recommended branch name: `bx/BX-XX-short-description`.
- The `biforge/*` namespace is reserved for task branches of the product's Code Delivery (`biforge/<task_id>`, TZv3.0, sections 11.3 and 11.7). Do not use it for development of BiForge itself.
- Do not work directly on `main`.

## Commits
- Make commits small and logically coherent.
- Expectation tests for a step are committed before the implementation. Their paths (`tests/acceptance/**`) are protected by the Test Integrity rule.
- Do not rewrite shared history or force-push without explicit authorization.
- Do not commit generated secrets, credentials, local environment files, or unrelated user changes.
- Reference the step (`BX-XX`) in the commit or PR description.

## Pull Requests
- Target `main` unless the owner specifies another base.
- One step, one PR (sub-steps may be separate PRs).
- The description states: step ID, tool and model used by the development agent, purpose and scope, what was deliberately not done, test results, risks, and known limitations. For steps without ★ the description is also the step report (`STEP_REPORT_TEMPLATE.md`).
- All required checks must be green before review.
- Review the actual diff in **Files changed**; task messages alone do not prove repository changes.
- The owner reviews against the checklist in TZv3.0, section 16.6.
- **Merge is performed by the owner only.** The development agent and the product never merge (TZv3.0, sections 11.5 and 13.7).
- If a PR has no changed files, do not treat it as an implementation PR.

## Required traceability
Record, when available:
- step identifier (`BX-XX`; the frozen identifiers `BF-01`…`BF-44` are not reused);
- `baseCommit` SHA;
- feature branch;
- result commit SHA;
- PR URL;
- development tool and model; second-pass model for ★ steps;
- test commands and outcomes.

## Recovery
If the base branch changes during the task, inspect the difference and rebase or restart only when safe. Do not discard changes or resolve consequential conflicts silently. After a rebase the `baseCommit` in the SPEC is updated with the owner's approval.
