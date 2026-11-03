## P124.35 — Universal conversational retrieval regression corpus

- `tests/universal-followup-regression.test.mjs` is a cross-domain contract suite. Its examples span software releases, travel schedules, product availability, public policy, business research and weather; weather is one case, not the suite's organizing domain.
- Assertions protect invariants: a follow-up retains the immediately preceding live-information task and named entities; an intervening unrelated user turn prevents stale-context carry-over; planner absence/quota failure does not erase context; personal data is not searched; non-numeric but query-relevant evidence can be usable; irrelevant long digests are rejected.
- Do not assert exact model prose, canned factual answers, specific provider choices, or a fixed topic mix as product truth. Add unrelated domains when new regression classes are found. Tests should constrain correctness properties, not train the implementation to one example.
- `test:core` includes this suite and is already part of the Core CI verification DAG. Local deterministic PASS does not establish live provider quality, hosted CI status or deployed user outcomes.

## Live-search acceptance (planned; NOT_RUN) — P124.22

Criteria A1–A8 in `docs/WEB_SEARCH_REMEDIATION.md` define user-level acceptance for live-data answers (place and country correct, units, observation time, named independent sources, follow-up topic carry-over, no false "no internet" claim, quota-exhaustion behaviour, privacy no-search rules, searchable logs). Mock and unit tests prove only mocks. `PASS` for these criteria requires a real run against a deployed instance; until then they are `NOT_RUN`. A scheduled live workflow is part of P124.31.

## P124.4 Architect and App Builder prompt regression

- `tests/c124-architect-appbuilder-prompt.test.mjs` verifies that planner architecture follows the user goal rather than a fixed single-file bias, reviewer feedback distinguishes functional defects from optional style, coder instructions preserve requested features and do not invent external interfaces/data, recovery keeps the complete prompt context, prompt/cache versions are advanced, and Architect project analysis distinguishes general knowledge from project-specific facts.
- `tests/app-builder-engine-p93-2a.test.mjs` checks prompt-version format without pinning a stale historical version literal.
- These are deterministic source-contract checks. They do not prove generated applications run correctly or that live models produce better artifacts. Hosted Actions, typecheck/build, browser artifact validation and live provider comparisons remain separate acceptance evidence.

## P124.3 response-path fidelity checks

- `node --experimental-strip-types --test tests/c124-output-fidelity.test.mjs` — automatic source links remain suppressed unless explicitly requested; model answer content is preserved; Expert stage prompts do not pad results to arbitrary counts or lengths.
- `npm run test:core` — includes the new C124 output-fidelity suite alongside the inventory and prompt-quality tests.
- Inspect browser rendering of Markdown/code/document outputs after server-side Markdown stripping is removed.
- Compare raw provider responses with visible Simple and Expert replies using identical prompts; this requires live provider access and is not covered by deterministic tests.

## P124.3 acceptance boundary

A PASS from the deterministic output-fidelity tests proves only the tested transformation rules. It does not prove provider accuracy, browser rendering quality, or improved user outcomes. Hosted GitHub Actions and live model-backed evaluation must be reported separately.

## P123.23 regression checks
- `npm run test:core` — verify prompt golden hash and agent route contracts.
- `npm run test:web` — verify Russian/English contextual follow-up resolution; inspect full log for any failures beyond the reported stack location.
- `npm run test:compact-ci-artifacts` — verify failed logs retained and successful-stage logs omitted.
- `node scripts/run-dag.mjs --profile check` — run after the targeted suites pass.

## P123.22 CI logging policy (historical; superseded by P124.5)

P124.5 replaces the former multi-part paste and nested ZIP policy below with one `ASSISTANT_SUMMARY.md` plus three consistent readable logs; see “Unified workflow diagnostics handoff”. The following describes the superseded P123.22 implementation only.

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

## P124.1 inventory integrity

- `node --test tests/c124-instruction-inventory.test.mjs` validates that each source/line reference in `docs/C124_INSTRUCTION_INVENTORY.md` points to an existing file and an in-range line span.
- This is a documentation-integrity check only. It does not establish that the listed prompt is invoked in every runtime configuration or that a live model follows it.
- Re-run the test whenever prompt ownership, file paths or line ranges change.

## P124.2 Simple/Expert prompt-quality regression

- `tests/c124-prompt-quality.test.mjs` verifies that Simple decision prompts do not include the removed reasoning ritual, Expert factual requests remain in information mode, Expert stage/context is treated as data rather than a mandatory method, model-authored questions are preserved, novelty-only retry is absent, and analytical metadata is optional.
- `tests/p119-agent-prompts-routes.test.mjs`, `tests/p119-agent-isolation.test.mjs`, and `tests/p119-agent-boundaries.test.mjs` verify prompt snapshots, route ownership, mode classification and agent boundaries.
- These tests establish source/prompt contracts only. They do not prove live model answer quality. Hosted CI, typecheck/build, live provider comparisons and deployed user outcomes remain separate evidence requirements.

## C124 instruction-optimization acceptance

C124 changes must be evaluated as an end-to-end information-preservation boundary, not merely as prompt-text cleanup.

- Inventory prompt sources and every runtime output transformation before broad edits; record dependencies and proposed disposition.
- Use deterministic fixtures to compare model input/output with the content BiForge finally delivers. Assert preservation of numbers, units, dates, caveats, uncertainty, links, multilingual text, and paragraph order.
- Assert no unsolicited facts, canned conclusions, arbitrary entity/location insertion, or unrequested rewrite is introduced by BiForge.
- Verify request/context/attachment transfer, tool-result preservation, session isolation, retry/error behavior, and affected agent workflows.
- Use model-backed comparisons across unrelated domains where available. Compare raw provider output with final BiForge output; do not use a single canned answer as the oracle for open-ended questions.
- Report source inspection, deterministic tests, full CI, live model calls, deployed behavior, and user outcomes separately. Mocks and snapshots do not establish live answer quality. Mark unavailable checks `NOT_RUN`.
- Do not update prompt snapshots or remove an instruction solely to make CI green; establish that the resulting behavior matches the approved C124 contract first.

Normative mandate and full acceptance gates: `C124_INSTRUCTION_OPTIMIZATION.md`.

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


## Unified workflow diagnostics handoff

Every diagnostic workflow publishes exactly one assistant handoff file: `ASSISTANT_SUMMARY.md`. It must be self-contained and include workflow/run/commit identity, overall status, every discovered check with PASS/FAIL/BLOCKED/NOT_RUN status, TAP counts, failure excerpts with source locations when available, and focused reproduction guidance. Do not split the handoff into numbered parts and do not require a nested ZIP to understand the result.

Every workflow uses the same companion log names: `checks.log` (per-log/per-suite results), `failures.log` (error excerpts and context), and `environment.log` (run and runtime metadata). Preserve raw test output in plainly named logs such as `01-dependencies.log`, `02-verification-dag.log`, and `03-ui-smoke.log`. Upload the one handoff and the readable logs as a single workflow artifact. The assistant should normally need only `ASSISTANT_SUMMARY.md`; companion/raw logs are for deeper investigation.
