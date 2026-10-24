# P87 — Verification Planner

## Purpose

`verification:plan` proposes the cheapest useful first checks for a task while keeping the repository's full check chain, build, and hosted required CI as separate mandatory gates. It offers risk-specific counterexamples that could disprove the intended behavior. It is a planning aid, not evidence that a change passed.

## Usage

```sh
npm run verification:plan -- --task "Fix Project Mode ZIP download" server/projectRoutes.ts
npm run verification:plan -- --task "Update route inventory generator" --file scripts/docsGenerateInventories.mjs --json
npm run test:verification-plan
```

You may pass multiple changed paths positionally or with repeated `--file`/`--changed` options. `CHANGED_FILES` is used only when no task or path was supplied.

## What the planner does

- Maps recognized changed files/task descriptions to explicit risk areas.
- Suggests only npm scripts that exist in `package.json`.
- Groups suggestions into `fast`, `targeted`, and `full` tiers.
- Always preserves `npm run check`, `npm run build`, and the hosted GitHub Actions required workflow as completion gates.
- Gives negative/boundary scenarios for artifact integrity and delivery, persistence, API/authentication, security/configuration, UI/copy, generated inventories, and test/CI wiring.
- Checks the P56 invariant that test/lint/typecheck/verify scripts are included in `npm run check` or the explicit separate-CI-step allowlist.
- Returns `PARTIAL`/`UNKNOWN` for unrecognized files rather than pretending test ownership is known.

## Guarantees and limitations

- The planner does **not** run any command, spawn a shell, call a model, access the network, or modify files.
- Every suggested command is marked `SUGGESTED_NOT_RUN`; full gates are marked `REQUIRED_NOT_RUN` or `NOT_RUN` until actually run elsewhere.
- A fast/targeted plan never replaces the full check chain, build, or hosted required CI.
- File/task rules are explicit deterministic heuristics, not a proof of dependency or test coverage. Dynamic dispatch, unrecognized files, untracked CI steps and behavior-specific acceptance criteria can remain unknown.
- It does not claim that a counterexample is already implemented as a test. It suggests a scenario for the implementer to add or verify.
- High-risk artifact, database and security changes are marked high risk and retain targeted plus full gates.

## Human-simplicity gate

- **Human work removed:** reduces repeated manual selection of first-pass checks and reminds the author of likely negative cases.
- **Guarantees added:** command names are validated; test-chain omissions are detected; full gates remain explicit; unknown mappings remain visible.
- **Complexity cost:** one rule-based planner, one CLI and focused tests; mappings need maintenance when script names or code ownership change.
- **Value measurement:** compare suggested commands with maintainer-selected checks on reviewed tasks; record missed required checks, irrelevant suggestions, diagnosis time and rework. No time savings are claimed before a reviewed benchmark.

## Verification status

The patch author ran the focused P87 planner tests and relevant P85/P86 tests when available. The full repository `npm run check`, build and hosted CI must be run after applying the patch; this document does not assert that those gates passed.

## Rollback

Remove `scripts/verificationPlanner.mjs`, `scripts/verificationPlannerLib.mjs`, `tests/verification-planner.test.mjs`, and this document; remove the two P87 package scripts and `npm run test:verification-plan` from the `check` chain; revert the P87 roadmap, index, `AGENTS.md`, and changelog entries. No migration or generated-file regeneration is required.
