# Testing and Acceptance

## Acceptance hierarchy

1. **User outcome:** realistic user task completed with useful, correct, understandable output.
2. **Behavioral contract:** UI transitions, errors, retries/recovery, status, and artifact delivery match `../TECHNICAL_SPECIFICATION.md`.
3. **Technical checks:** targeted tests, full tests, typecheck, build, security checks, architecture checks.
4. **Release evidence:** exact commit/build, hosted CI, deployed health, live workflows, and artifact evidence.

A green test suite is necessary evidence but not sufficient evidence of user value. Keep test evidence and outcome evidence separate.

## Required truth labels

Use `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, and `SKIPPED_BY_POLICY` consistently with the scripts/schemas in this repository. Never convert `NOT_RUN` or `BLOCKED` into PASS. Distinguish local checks from hosted CI and deployed/live checks. Bind evidence to the exact commit/build.

## Useful commands

- `npm run typecheck` — TypeScript check.
- `npm run build` — client and server build.
- `npm test` — repository test suite as defined by `package.json`.
- `npm run test:app-builder` — App Builder / artifact behavior tests.
- `npm run test:ui` — UI check (requires its browser prerequisites).
- `npm run docs:check` — generated documentation inventory consistency.
- `node scripts/docs-integrity.mjs` — canonical documentation structure and contract guard.
- `npm run architecture:check` — architecture guardrails, if configured in this checkout.

Check actual package scripts before running; command names can evolve only through a documented patch.

## Architect acceptance scenario

Use a realistic software request from initial entry to download. The user must not choose between Architect modes. Verify the single flow captures the goal, clarifies missing constraints, produces/validates a plan, generates files, runs validators, presents an honest SUCCESS/PARTIAL/FAILED state, and offers a downloadable ZIP only under the delivery policy. Inspect the downloaded archive and try to use the result. Record task input, commit/build, provider/model where safely observable, validators, output files, ZIP integrity, user-visible explanation, and any manual follow-up. Stubbed browser tests may prove wiring only; they do not replace this scenario.

## Patch reporting

Report exact commands run and outcomes. For a docs-only patch, product E2E, live generation, hosted CI, and deployment remain NOT_RUN unless actually executed.
