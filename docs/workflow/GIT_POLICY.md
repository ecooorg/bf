# BiForge Git and Pull Request Policy

## Branching
- Keep `main` as the protected integration branch.
- Use one feature branch per BF step or independently reviewed task.
- Recommended branch name: `bf/BF-XX-short-description`.
- Do not work directly on `main`.

## Commits
- Make commits small and logically coherent.
- Do not rewrite shared history or force-push without explicit authorization.
- Do not commit generated secrets, credentials, local environment files, or unrelated user changes.
- Reference the BF step in the commit or PR description.

## Pull Requests
- Target `main` unless the user specifies another base.
- Include purpose, scope, tests, risks, and known limitations.
- Review the actual diff in **Files changed**; task messages alone do not prove repository changes.
- Do not merge without explicit authorization.
- If a PR has no changed files, do not treat it as an implementation PR.

## Required traceability
Record, when available:
- BF step/task identifier;
- base commit SHA;
- feature branch;
- result commit SHA;
- PR URL;
- test commands and outcomes.

## Recovery
If the base branch changes during the task, inspect the difference and rebase or restart only when safe. Do not discard changes or resolve consequential conflicts silently.
