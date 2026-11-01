## P123.23 regression checks
- `npm run test:core` — verify prompt golden hash and agent route contracts.
- `npm run test:web` — verify Russian/English contextual follow-up resolution; inspect full log for any failures beyond the reported stack location.
- `npm run test:compact-ci-artifacts` — verify failed logs retained and successful-stage logs omitted.
- `node scripts/run-dag.mjs --profile check` — run after the targeted suites pass.

## P123.22 CI logging policy
The primary `ASSISTANT_PASTE` handoff is failure-first: report failed stages, timeouts, blocked/not-run checks, concise failure tails, and next actions. Do not enumerate successful checks. The diagnostic ZIP retains reports, structured result/metrics/history files, prompt snapshot diagnostics, and logs belonging to failed or timed-out checks; successful-stage logs and incidental files are omitted. Validate both failure and green runs in GitHub Actions.

## P123.21 targeted regression checks

- `npm run test:core` — covers the cycle-123 patch metadata contract.
- `npm run test:pipeline` — covers Expert prompt recommendation/assumption wording.
- `npm run test:web` — covers retrieved-evidence and source-URL prompt contract.
- `npm run test:compact-ci-artifacts` — required; P123.20 failure details were not included in the supplied handoff, so inspect its full log before making further changes.
- `node scripts/run-dag.mjs --profile check` — final repository DAG check.

Hosted CI and these commands have not been run in the patch-generation environment.

## CI failure evidence payload (P123.19)

For every failed DAG stage, retain the complete redacted stage log in `biforge-ci-logs.zip`. The generated `PATCH_EVIDENCE.md` must include the failing stage, rerun command, assertion/error excerpt, and a source excerpt around the detected source location. Source-location parsing supports both JavaScript stack locations (`file.ts:line:column`) and TypeScript diagnostics (`file.ts(line,column)`). The archive also includes the complete available CI log files, DAG results, metrics, and history; missing evidence must remain explicitly unknown.


## P123.18 — Independent Conversational and Expert sessions

- Switching Conversational → Expert must create a blank Expert Decision; no prior Simple brief, transcript, attachments, or method state may appear in Expert context.
- Switching Expert → Conversational must create a blank Conversational Decision; no Expert transcript or method state may appear in Conversational context.
- The prior Decision must remain available in the library/history.
- The first `/api/understand` request must contain only the new Expert brief/history and must not instruct the model to reconstruct a Simple conversation.
- Existing mode-selection and Expert completion UI surfaces must remain reachable.
- Automated static regression coverage does not replace browser e2e or live user acceptance.
## P123.17 — Retrieved evidence and source-link acceptance

- Deterministic: `tests/web-and-epistemics.test.mjs` asserts that the compatibility source-footer formatter emits no user-visible URLs and that shared/Expert/V17 prompts explicitly preserve retrieved facts and values.
- Live acceptance (required): ask the same current-weather question in Conversational and Expert; confirm the reply contains concrete retrieved values when supplied by the provider, distinguishes observation from forecast, and contains no appended source list/URLs. Repeat with a non-weather current-information query.
- Failure behavior: when retrieval contains no concrete evidence, the agent must say exactly what could not be verified; it must not invent a value or present page titles as evidence.
- CI and live provider checks remain separate; source-contract tests do not prove live model quality.

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


## P123.16 — Weather retrieval acceptance
- Automated tests cover weather query expansion, rejection of title-only search digests, and weather-specific prompt constraints.
- Manual hosted acceptance remains required: compare Simple and Expert answers with a timestamped MeteoSwiss observation.
- User-facing replies must not append a raw `Sources (web search)` URL footer.
- If no numeric current observation is retrieved, the agent must state that limitation rather than invent a temperature.


## P123.16 — Weather retrieval acceptance
- Automated tests cover weather query expansion, rejection of title-only search digests, and weather-specific synthesis constraints.
- Hosted acceptance must compare Simple and Expert answers with timestamped MeteoSwiss observations.
- User-facing replies must not append a raw `Sources (web search)` URL footer.
- If no numeric current observation is retrieved, the agent must state that limitation rather than invent a temperature.


## Assistant paste artifact size contract

Every workflow must publish `ASSISTANT_PASTE.txt` and, when required, consecutively numbered `ASSISTANT_PASTE_2.txt`, `ASSISTANT_PASTE_3.txt`, etc. Each file must contain no more than 5,000 characters. The complete set must preserve the generated summary without truncation; complete logs and evidence remain available in `biforge-ci-logs.zip`.
