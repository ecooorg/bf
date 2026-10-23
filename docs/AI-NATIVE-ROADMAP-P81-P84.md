# AI-native roadmap — P81–P84

Status: Navigator-approved direction, 2026-10-23. P81 is implemented; P82, P83 and P84 GitHub CI are reported green by the Navigator. P84 CI was reported green after the P56 check-chain fix. P84.1 documents the next roadmap in `docs/AI-NATIVE-ROADMAP-P85-P91.md`. P84 does not authorize changes to security gates, product contracts, production, GitHub write access, or formal acceptance. Apply permanent rules in `AI-OPERATING-RULES.md`. Each patch requires a separately reviewed change set and green CI before proceeding.

## North star and definitions

**Minimum sufficient context** means the smallest *verified adequate* collection of source, contract and test evidence needed to safely complete a specified change. It does **not** mean minimizing repository size or file length. Tools must distinguish proven static links, heuristic candidates, and unknown relationships. They must not imply runtime equivalence from static inspection.

Metrics (do not claim measured improvements without paired task runs):

- **Context cost:** relevant source lines and, when an explicit tokenizer/model is fixed, tokens read to complete a task. Source-line counts are a proxy, not token counts.
- **Change surface:** number of files actually modified per scenario, with reasons.
- **Dependency recall:** relevant dependencies discovered / known relevant dependencies in a curated gold set. Measure false-positive candidates separately.
- **Verification cost:** commands, wall-clock time, environment requirements and passed/failed/blocked/not-run status.

## P81 — Dependency Intelligence (current)

Scope: deterministic `context:plan` for a specified file, direct static imports and importers, explicit env/SQL/manifest evidence, suggested tests, uncertainties, and a committed **pre-P81 v80 static baseline**. Read-only output; no product runtime changes. The first version intentionally does **not** claim complete API, DB, dynamic import or runtime dependency mapping. Baseline sample measurements are one-hop file/line proxies, not real agent task costs.

Commands: `npm run context:plan -- --file server/codeTaskService.ts`; add `--json` for machine-readable output; `npm run context:baseline` for regeneration of metrics to stdout. Committed baseline: `docs/context-baseline-v80.json`. A plan is a *candidate selection aid*, not permission to skip required contracts or full CI. Validate candidate selection against manually reviewed scenarios before treating it as authoritative.

Acceptance: stable sorted output; explicit evidence and uncertainties; safe rejection of missing/unsafe targets; regression tests; no source behavior change; focused tests and available repository checks documented honestly.

## P82 — Context Locality

**Objective:** reduce task-specific reading cost, not maximize file count or enforce a line limit.

**Implementation status (P82 patch):**
- Extracted the cohesive brief-entry/conversation flow into `src/ConversationScreens.tsx`; `src/ExpertStepScreens.tsx` now owns the remaining Expert/Simple step screens. `src/App.tsx` imports each module explicitly.
- Extracted the three compatibility/retired endpoints into `server/compatibilityRoutes.ts`. Registration remains at the previous point in `server.ts`, preserving middleware and route ordering.
- Extended `context:plan` to report import and registration line references for the recognized `server.ts` route-registration pattern instead of recommending the entire server entry point as routine context. This is an evidence-backed special case, not a general proof that composition roots are irrelevant.
- Added before/after static measurements to `docs/context-locality-p82.json`. The conversation/brief scenario's one-hop proxy changed from 37 files / 7,376 lines to 15 files / 3,400 lines (53.9% fewer candidate lines). These are static proxies, not measured token use or completion time.
- Verification note at P82 handoff: local `npm ci` timed out, so typecheck/build/behavioral/UI checks were not established locally. The Navigator subsequently reported P82 GitHub CI green; this report records that external result without claiming it was rerun here.


1. **Scenarios selected:** Expert brief/conversation UI and compatibility/retired HTTP routes. The code-task workflow was not changed in P82.
2. **Boundaries inspected:** conversation state, attachment flow, UI callers, route registration order, and `ok`/`fail` response helpers.
3. **Extractions applied:** `src/ConversationScreens.tsx` and `server/compatibilityRoutes.ts`; both retain explicit imports/exports and avoid new directory levels.
4. **Compatibility preserved by construction:** component props and route paths are unchanged; route registration call stays at the original position. Runtime equivalence still awaits behavioral CI.
5. **Before/after evidence:** `docs/context-locality-p82.json`; it reports the measured static proxy and its limitations, not token savings.

**Gates:** targeted behavior tests; `architecture:check`; `check:docs`; build/typecheck; full `npm run check` and UI checks at 1200px/390px for UI changes when browser available. Record blocked checks. No automatic merge or acceptance. Stop if a split increases context cost without compensating verified benefit, changes runtime behavior, or creates untracked dependencies.

**Deliverables:** change ZIP, precise moved/renamed/deleted paths, per-scenario before/after evidence, risk and rollback, updated status and changelog.

## P83 — Contract & Verification Integrity

**Objective:** make cross-boundary assumptions explicit and tests resilient to refactoring.

1. Inventory high-impact contracts across API request/response, task-state transitions, model outputs, SQL records and generated artifacts. Identify the existing authoritative definition and consumers before creating new schemas.
2. Choose a narrow subset with measurable risk. Introduce runtime validation at untrusted boundaries; TypeScript annotations alone are insufficient. Strengthen strictness incrementally by module/boundary, not a blanket `strict: true` flip.
3. Review source-text/regex-based tests, including aggregated source scans. Replace only those with a provably equivalent or stronger behavioral, structural or contract check; preserve security invariants and existing coverage. Do not delete tests simply because refactoring makes them inconvenient.
4. Update dependency evidence and relevant context plans to reference the authoritative contracts. Where cross-layer links cannot be reliably extracted, keep explicit uncertainty warnings.

**Gates:** compatibility tests for existing APIs, persisted data and artifacts; negative tests for malformed/untrusted inputs; no weakening of auth, secret handling or approval gates; focused tests, `typecheck`, build, `architecture:check`, full `check`, and CI. Report unavailable DB/browser checks separately. Stop on contract duplication, unapproved behavior changes or loss of security coverage.

**Deliverables:** contract inventory and chosen single sources of truth, tests with documented before/after guarantees, migration/compatibility notes, changed-files ZIP, rollback, status and changelog.

### P83 implementation status (this patch)

- Chosen narrow boundary: `GET /api/projects` and `GET /api/projects/:projectId/versions` query-string pagination. `server/contracts.ts` is the authoritative runtime schema; defaults remain 100 and 50, and the accepted range remains 1–200.
- Previously each route coerced query values with `Number(...)` and relied on repository validation to reject invalid values. The routes now validate untrusted query values at the HTTP boundary and reject malformed, non-integer, zero, negative, exponent, whitespace-padded, non-string, array and over-limit values through the existing Project Mode validation error mapping. The existing 400 validation response, successful response shape and defaults are preserved.
- Added negative/default/boundary tests in the existing contracts suite and explicit context-plan evidence from `server/projectRoutes.ts` to `server/contracts.ts`, plus test hints for the contract module.
- Inventory: `docs/contracts-verification-p83.json`. Existing source-text assertions in database/security tests were reviewed as structural checks; this patch does not remove or weaken them. Broad source scans and API/DB/runtime links remain incompletely discoverable and are explicitly listed as limitations.
- The Navigator reports P83 GitHub CI green. Local typecheck/build/full-check status remains separate from that external CI report; this patch environment did not independently reproduce the full pipeline.

## P84 — AI-Native Benchmark

**Objective:** make future architectural changes measurable and falsifiable.

1. Define 4–6 representative *read-only analysis* scenarios and optional separately approved implementation tasks: Expert Mode screen, server API contract, task state/DB, env/config, generated artifact and localized defect. Freeze a curated gold set of relevant dependencies with documented human review.
2. Implement deterministic benchmark collection of context candidates, gold-set recall, false-positive rate, one-hop source-line cost, touched-file count (for actual changes only), and verification commands/status/duration. Keep measured, estimated and unavailable values distinct.
3. Compare identical scenarios on pinned v80 baseline and current revision when both trees are available; never invent historical agent token counts or timings. Token counts require a specified tokenizer and captured read traces.
4. Add a regression gate only after benchmark stability is demonstrated; avoid thresholds that reward hiding dependencies or shrinking context at the expense of recall.
5. Publish a compact machine-readable report and a human-readable explanation of limitations; keep historical reports in `archive/` if retained.

**Gates:** benchmark repeatability, gold-set fixture tests, explicit uncertainty, no repository-wide context loading as a default, no product runtime change, standard CI checks. Benchmark code must not execute generated or untrusted application code. Stop if optimization improves a proxy while reducing gold-set dependency recall.

**Deliverables:** benchmark script/fixtures, v80 vs current comparison where verifiable, methodology, results with provenance, rollback, ZIP, status and changelog.

### P84 implementation status (this patch)

- Added `tests/context-benchmark-gold-p84.json`: six read-only analysis scenarios and explicit gold dependencies. Status is `author-curated-maintainer-review-required`; this is not represented as independent human review.
- Added `scripts/contextBenchmarkLib.mjs` and `scripts/contextBenchmark.mjs`. The harness statically scans TypeScript imports and calls the P81 context planner with a supplied root. It does not execute application modules. Use `npm run benchmark:context -- --baseline-root /path/to/v80-plus-p80.1/bf-main`; optional `--output <file>` writes JSON.
- Added `docs/context-benchmark-p84.json` from the v80 + p80.1 archive and current P84 working tree. Source-tree fingerprints identify the measured trees without recording machine-specific absolute paths. `docs/context-benchmark-verification-p84.json` records local command statuses and measured wall-clock durations separately from scenario metrics.
- Initial result: six scenarios, summed candidate source-line cost 35,221 → 23,551 (−33.1%); comparable-gold recall 83.3% → 86.1% over 36 dependencies present in both trees (all-available-gold summaries are 83.3% → 83.8% because the baseline tree lacks one newer test file); aggregate false-positive candidate rate 79.4% → 59.7%. Scenario sums are not deduplicated. The generated-route-artifact scenario has 0 recall on both trees because the static planner does not infer the generated JSON-to-script relationship. Task-state/database recall remains 80%.
- The localized compatibility-route scenario falls from 9,934 to 2,314 candidate source lines and rises from 66.7% to 100% comparable-gold recall; Expert conversation UI falls from 7,376 to 3,337 lines at 100% recall. These are static source-line proxies from the same P84 planner applied to both trees, not historical measurements of an agent using the old toolchain.
- Added `npm run benchmark:context` and `npm run test:context-benchmark`; the fixture test is part of `npm run check`. The tests validate deterministic metrics and schema, not benchmark thresholds. No metric regression gate was added.
- Verification commands in the report are marked `not-run-by-benchmark` with `durationMs: null`; actual verification duration, model tokens, agent read traces and implementation touched-file counts are not measured. The lower aggregate line cost is not unconditional evidence of improvement: the artifact scenario's zero line cost is a miss, not an optimization.
- Local focused tests (6/6 planner tests, 3/3 benchmark tests), docs checks, architecture checks, version check, copy lint and benchmark-script syntax checks passed. `npm run check` was blocked at typecheck because the local dependency tree lacked `vite/client` definitions; build was not run in that local environment. The Navigator subsequently reported GitHub CI green after the P56 check-chain fix. See the verification manifest for command-level local status and duration; this does not overwrite the historical local blockers. Gold-set review and repeated stability runs are required before any future metric gate.

## Execution sequence

P81 baseline and planning → P82 measured locality changes → P83 stronger contracts and verification → P84 stable benchmark and governance. P82 and P83 must report metrics using the P81 baseline and retain evidence for P84. A green CI is necessary but not sufficient evidence of lower AI context cost.


## Next roadmap

P84.1 records the next proposed sequence, P85–P91, in `docs/AI-NATIVE-ROADMAP-P85-P91.md`: task-aware context planning, change-impact/generator lineage, verification planning, real-task AI benchmarking, task contracts, incremental refresh, and context-completeness guards. These are future scopes, not implemented features or automatic authorization. Build one patch at a time and wait for the Navigator to report green CI before starting the next.
