## Prompt snapshot evidence (P123.13)

- Agent prompt snapshots remain strict SHA-256 equality checks over the complete generated prompt bytes. Never weaken or skip an assertion to obtain a green CI run.
- When CI reports a mismatch, update only the evidenced mode/hash after checking the current prompt source and intended behavior. Record the run, commit, expected hash, actual hash, and whether semantic source review was performed in `TECHNICAL_REPORT.md` and `CHANGELOG.md`.
- A CI-provided actual hash is sufficient to identify the byte-level mismatch, but not sufficient by itself to claim that the prompt's semantic change is correct. If the source diff is unavailable, mark semantic review `NOT_VERIFIED`.
- Re-run `npm run test:core` and `node scripts/run-dag.mjs --profile check`; hosted CI remains `NOT_RUN` until the resulting commit has completed Actions.

# Testing and Acceptance

## Current Architect selection regression coverage (P121.0.48)

- `tests/app-builder-dom-wiring-p118-5-6.test.mjs` also guards against distinct `this.*` controller properties being silently mapped to one DOM id during repair. This protects against a validator-green artifact with collapsed UI roles.
- Route contract tests assert that `/project`, `/project-legacy`, and `/architect` use the selected `ProjectMode`, while `/architect-lab` remains a frozen diagnostic route.
- These source/contract checks do not prove a generated app works in a real browser; generated-artifact browser/mobile outcome remains separately required.

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


## Navigator verification channel

The Navigator has no local terminal. Automated checks must be visible in **GitHub Actions**. Prefer new or updated workflow files and tests that CI already runs (`test:core`, release gates, UI smoke) over checklists that require `npm` on a computer. Manual Navigator work is limited to reading files, committing uploaded replacements, opening Actions runs, reading logs, and optional mobile-browser UI smoke against a deployed or preview URL.

Assistant/CI machines may still use the commands in “Useful commands”; those commands are **not** Navigator steps.

## Architect acceptance scenario

Use a realistic software request from initial entry to download. The user must not choose between Architect modes. Verify the single flow captures the goal, clarifies missing constraints, produces/validates a plan, generates files, runs validators, presents an honest SUCCESS/PARTIAL/FAILED state, and offers a downloadable ZIP only under the delivery policy. Inspect the downloaded archive and try to use the result. Record task input, commit/build, provider/model where safely observable, validators, output files, ZIP integrity, user-visible explanation, and any manual follow-up. Stubbed browser tests may prove wiring only; they do not replace this scenario.

## Patch reporting

Report exact commands run and outcomes. For a docs-only patch, product E2E, live generation, hosted CI, and deployment remain NOT_RUN unless actually executed.

## Prompt snapshot and cache-version contract

- Agent prompt golden hashes are reviewed snapshots of the current prompt output, not permanent assertions that prompt bytes must remain identical to a historical pre-refactor implementation. When an intentional prompt change is accepted, update only the affected golden hash and record why; keep all other mode/agent snapshots unchanged.
- App Builder coder prompt changes must increment `PROMPT_VERSION` so cached generations cannot be reused across materially different instructions. Tests must compare the exported version against the active version and verify cache-key sensitivity; do not leave tests pinned to an obsolete version string.
- A snapshot/version assertion failure is not repaired by weakening or removing the assertion. Recompute the actual prompt hash or inspect the exported version, review the source change, then update the narrow expected value.


### Prompt snapshot maintenance (P123.12)

Prompt golden hashes are intentional review gates, not values to update mechanically after a failure. When a snapshot fails:

1. Compare the current prompt builder and its source instructions with the last reviewed behavior.
2. Confirm that the wording change is intentional and consistent with the normative product contract.
3. Record the user-visible behavior change and rationale in the patch evidence and changelog.
4. Update only the affected golden hash; retain strict equality assertions for all other snapshots.
5. Run `npm run test:core` and `node scripts/run-dag.mjs --profile check`; report unavailable dependencies or unrun hosted checks as `BLOCKED` / `NOT_RUN`.

Never update a golden hash solely to make CI green, and never weaken or remove the snapshot assertion to bypass a mismatch.
