# AI-native roadmap — P81–P84

Status: Navigator-approved direction, 2026-10-23. P81 implemented in this patch; P82–P84 are approved objectives, **not** pre-authorized changes to security gates, product contracts, production, GitHub write access, or formal acceptance. Apply permanent rules in `AI-OPERATING-RULES.md`. Each patch requires a separately reviewed change set and green CI before proceeding.

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

1. Select 2–3 representative tasks using P81 context plans and baseline: one Expert Mode UI task (`src/ExpertStepScreens.tsx`), one server route task (`server.ts` / `server/projectRoutes.ts`), and optionally one code-task workflow task. Record the task, known dependencies, required contracts, touched files and baseline one-hop lines **before** editing.
2. Inspect actual state ownership, effects, shared invariants and module consumers. Identify boundaries by independent change responsibility. Do not split cohesive code just to meet a line threshold.
3. Apply small, independently reversible extractions. Prefer explicit exports and unidirectional dependencies; do not hide cycles with dynamic imports merely to satisfy the static cycle checker.
4. Preserve public API, UI behavior, authentication, authorization, error handling and persistence. Avoid introducing new abstractions, duplicated contracts or deep folder nesting.
5. Compare before/after task-specific context candidates, changed-file counts and known dependency coverage. Report regressions as well as gains.

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

## P84 — AI-Native Benchmark

**Objective:** make future architectural changes measurable and falsifiable.

1. Define 4–6 representative *read-only analysis* scenarios and optional separately approved implementation tasks: Expert Mode screen, server API contract, task state/DB, env/config, generated artifact and localized defect. Freeze a curated gold set of relevant dependencies with documented human review.
2. Implement deterministic benchmark collection of context candidates, gold-set recall, false-positive rate, one-hop source-line cost, touched-file count (for actual changes only), and verification commands/status/duration. Keep measured, estimated and unavailable values distinct.
3. Compare identical scenarios on pinned v80 baseline and current revision when both trees are available; never invent historical agent token counts or timings. Token counts require a specified tokenizer and captured read traces.
4. Add a regression gate only after benchmark stability is demonstrated; avoid thresholds that reward hiding dependencies or shrinking context at the expense of recall.
5. Publish a compact machine-readable report and a human-readable explanation of limitations; keep historical reports in `archive/` if retained.

**Gates:** benchmark repeatability, gold-set fixture tests, explicit uncertainty, no repository-wide context loading as a default, no product runtime change, standard CI checks. Benchmark code must not execute generated or untrusted application code. Stop if optimization improves a proxy while reducing gold-set dependency recall.

**Deliverables:** benchmark script/fixtures, v80 vs current comparison where verifiable, methodology, results with provenance, rollback, ZIP, status and changelog.

## Execution sequence

P81 baseline and planning → P82 measured locality changes → P83 stronger contracts and verification → P84 stable benchmark and governance. P82 and P83 must report metrics using the P81 baseline and retain evidence for P84. A green CI is necessary but not sufficient evidence of lower AI context cost.
