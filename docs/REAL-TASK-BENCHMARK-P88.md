# P88 — Real-task AI benchmark pilot

## Purpose

P88 measures end-to-end human effort and evidence quality on pinned, reviewed tasks. It extends P84's static context measurements; it does not treat fewer candidate files or source lines as proof of a better outcome.

## Status and pilot dataset

`tests/p88-real-task-benchmark.json` contains four starter scenarios drawn from recurring BiForge work: Project Mode artifact delivery, copy-lint/CI repair, generated inventory lineage, and check-chain coverage. They are deliberately marked `draft`, with no pinned revision or reviewed gold dependencies. This is a starter dataset, **not** evidence that these scenarios have been run or independently reviewed. Do not report comparative wins until a maintainer pins each starting commit and reviews dependencies, invariants, acceptance criteria, and required checks.

The results schema template is `tests/p88-real-task-results-template.json`. It is a template, not a captured run. Copy it to a separate local or approved evidence file, then record one run per task/workflow. Do not commit secrets, private prompts, production data, or sensitive traces.

## Commands

Produce the initial honest report with no run observations:

```bash
npm run benchmark:real-tasks
```

Supply a reviewed task set and recorded results:

```bash
npm run benchmark:real-tasks -- --tasks tests/p88-real-task-benchmark.json --results /path/to/p88-results.json --output /path/to/p88-report.json
```

The tool is read-only. It validates schemas, summarizes only values explicitly marked `measured`, preserves unavailable/estimated/not-run values, and does not run tasks or tests. Do not write reports into `docs/generated-*` or silently replace a historical report.

## Run record requirements

Each run records task ID, workflow (`baseline` or `context-engine`), base commit SHA, prompt version, model/workflow identifier, toolchain, environment, optional start/accepted timestamps, review outcome, metrics and changed files. Baseline and context-engine pairs are only marked comparable when the task is reviewed and base revision, prompt version, model, toolchain and environment match. Even then, causal attribution requires human review and repeated observations.

Record these metrics when evidence exists:

- start-to-accepted wall-clock minutes from timestamps;
- agent turns, human interventions, manual context gathering, human review, and rework minutes;
- stage-localization, false-success, acceptance and required-check outcomes;
- dependency recall and false-positive rate against a reviewed gold set;
- changed and unrelated files;
- input/output tokens only from a named provider/tokenizer trace.

A missing value is not zero. Estimated values are not included in measured averages. Source lines are never converted to token counts. Failed, rejected, and abandoned runs must remain in the dataset to avoid survivorship bias.

## Human-simplicity gate

- **Human work removed:** repeated hand-counting and narrative comparison of task effort/evidence.
- **Guarantees added:** pinned metadata and reviewed gold sets are required for comparable pairs; unknown values remain unavailable; no success or improvement is inferred from missing data.
- **Complexity cost:** a schema, small CLI, reviewed task records and run-capture discipline.
- **Value measurement:** measured review/rework/context-gathering time, localization and false-success rates, acceptance/check pass rates, and unrelated change surface across matched tasks.
- **Net result:** currently a measurement hypothesis. Four draft scenarios alone cannot establish improvement.

## Acceptance / stop conditions

- Focused tests validate required fields, comparability, unavailable values, and no fabricated tokens or gains.
- No regression threshold or new CI quality gate is enabled in P88.
- Do not publish a comparative claim while task gold sets are draft, runs are unmatched, or outcome evidence is missing.
- Grow toward 20–30 reviewed tasks over time; do not fabricate observations to fill the set.

## Rollback

Remove `benchmark:real-tasks` and `test:real-task-benchmark` from `package.json` and the `check` chain, then remove `scripts/realTaskBenchmark.mjs`, `scripts/realTaskBenchmarkLib.mjs`, `tests/real-task-benchmark.test.mjs`, the two P88 JSON starter/template files, and this document. Revert the P88 roadmap, index, `AGENTS.md`, and changelog edits. No runtime, database, or generated artifact changes are made.
