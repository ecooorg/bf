# P10 — Golden-eval: quality and cost report (fake adapters), ADR-04 draft

**Goal.** A reproducible golden-eval (TZ BX-14): 18 bilingual tasks (RU/EN), some with injected defects for the Verifier; a runner that scores models deterministically; a quality-and-cost report as a Markdown artifact; provisional `quality_class` suggestions; ADR-04 as a draft. TZ: 7.6, 7.1 (`quality_class`), 16.4 (P10), 16.4.3 (BX-14). Builds on P09 (units, shadow cost).

**Base.** Repository archive after P09. `baseCommit`: `____` (owner fills at the start of implementation).

**Decisions of the owner (already given).** Run on **fake adapters** only; tasks written by the agent, RU and EN; report is a Markdown artifact in `docs/`; ADR-04 is a draft: the decision on `cross_model` belongs to the owner, the report is only a hypothesis.

**Delivered with this kit (not to be rewritten in the implementation patch).** `evals/golden/tasks.json` (18 tasks), `docs/ADR-04-cross-model-policy.md`, `docs/P10-SPEC.md`, `tests/p10-acceptance.test.mjs` (protected, Test Integrity).

**May change.** New `server/goldenEval.ts`, `scripts/golden-eval.mjs`; `package.json` (scripts `eval:golden`, `test:p10`; `test:p10` added to `check`); `docs/GOLDEN-EVAL-REPORT.md` (generated); `docs/CURRENT_STATE.md`, `docs/REPO_MAP.md` (new paths), `CHANGELOG.md`.

**Must not change.** Simple Mode and `server.ts`; Router, registry (seed `quality_class` stays as is: suggestions are in the report only), adapters, ledger, database and migrations (no database in P10); all earlier tests and `tests/p08-acceptance.test.mjs`, `tests/p09-*.test.mjs`, `tests/p10-acceptance.test.mjs`.

## 1. Task set (`evals/golden/tasks.json`)
`{version:1, tasks:[…]}`, 18 tasks, unique ids, 9 `ru` and 9 `en`.
- `analysis` (10): `{id, kind, lang, title, task, context, mustMention[], minOps, reference}`. Model returns `{summary, patch:{ops:[…]}}` (the S1 output shape). Pass = valid shape, `ops.length ≥ minOps`, every `mustMention` string occurs (case-insensitive) in `summary` plus the JSON of `ops`. `reference` is a passing answer used by the strong fake.
- `verify` (8): `{id, kind, lang, title, criteria[], artifact, defects[{id, line, severity, note}]}`. `artifact` is text; lines are numbered from 1. 6 tasks have 1–2 injected defects, 2 are clean controls (`defects: []`). Model returns `{findings:[{severity:'low'|'medium'|'high', line:int, text}]}`.

## 2. `server/goldenEval.ts` (exports)
- `goldenTaskSchema`, `loadGoldenTasks(file?)` (default `evals/golden/tasks.json`; throws on an invalid file, wrong count (not 15–20), duplicate ids, or a defect line outside the artifact).
- `analysisOutputSchema`, `verifyOutputSchema`.
- `scoreAnalysis(task, output)` → `{pass, invalid, missing[]}`.
- `scoreVerify(task, output)` → `{pass, invalid, tp, fn, fp, missed[]}`. A finding is a true positive when its `line` equals a defect line (each defect counted once); other findings are false positives (on clean tasks every finding is). `pass` = `fn = 0 and fp = 0`. Invalid output: `pass false`, all defects counted as `fn`.
- `buildEvalPrompt(task)` → string. Analysis: task, context, instruction to answer with one JSON object. Verify: criteria and the artifact **with numbered lines** (`N: text`), no hint about defects.
- `createGoldenFakeAdapter(providerId, profile, tasks)` with `profile` `'strong'` (answers from `reference` / from the defects, all tasks pass) or `'weak'` (deterministic failures: analysis tasks with index divisible by 3 return empty ops; verify tasks with an even index return one `low` finding at line 1). It finds the task by `request.metadata.taskId`.
- `runGoldenEval({tasks, models:[{entry, adapter}], mode:'fake'|'live', date})` → `{mode, date, tasks:n, models:[…]}`. Each model: `{model:'provider/id', provider, analysis:{passed,total}, verify:{tp,fn,fp,passed,total,recall,precision,f1}, units, costUsd (null without registry pricing), avgLatencyMs, errors, tasks:[{id,kind,pass,errorClass?,units}]}`. Units per call by `unitsFor` (ADR-07); cost by `shadowCostUsd`. An adapter error response is recorded (`errorClass`), counted in `errors`, the task fails; the run does not throw. No clock, no randomness: same input gives the same output.
- `suggestQualityClass(m)` → `{class, provisional:true, score}`; `score` = mean of the analysis pass rate and verify `f1`; `A` ≥ 0.85, `B` ≥ 0.6, else `C`. `provisional` is always `true`.
- `renderReport(run)` → Markdown (section 3).

## 3. Report (`docs/GOLDEN-EVAL-REPORT.md`)
Title `# Golden-eval report`; header lines `Mode: fake|live`, `Date: YYYY-MM-DD`, `Tasks: N`. Sections: `## Summary` (one row per model: analysis passed/total, verify recall, precision, f1, false positives, units, cost, average latency, errors, suggested class marked `provisional`), `## Per-task results` (every task id × every model), `## Cross-model check` (with ≥2 providers: which pairs could act as executor/verifier, as a hypothesis; with one provider the line `NOT_RUN(no_second_provider)`), `## Limits` (states that the report is a **hypothesis**, 18 tasks are too few for a statistical conclusion, fake mode measures the harness and not any real model, and that enabling `cross_model` is the owner's decision under ADR-04).

## 4. CLI
`npm run eval:golden` = `tsx scripts/golden-eval.mjs --fake`. Options: `--date YYYY-MM-DD` (default: today, UTC), `--out <path>` (default `docs/GOLDEN-EVAL-REPORT.md`). Two fake models (`fake-strong/model-a` with pricing, `fake-weak/model-b`). Without `--fake` the script prints that live mode is not part of P10 and exits with code 2. Same arguments give a byte-identical file.

## 5. PASS criteria
- Machine: `npm ci`, `npm run check` (with `test:p10`), `npm run build`. No database needed.
- Owner: open `docs/GOLDEN-EVAL-REPORT.md` (the TZ check for P10 is "read the report"); confirm ADR-04 reads as a draft; fill in or leave ADR-04 "Decision" as is.

## 6. Not done / postponed
Live run on real providers (needs keys and network; separate step); applying suggested classes to the registry (owner decision after a live run); writing eval results to the database; cross-model pairing in Router; the `cross_model` decision itself (owner, ADR-04); latency ordering in Router (uses P10 evidence later).

**`CHANGELOG.md`.** `P10: BX-14. Golden-eval: 18 RU/EN tasks (10 analysis, 8 verify with injected defects and clean controls), deterministic scoring, runner on fake adapters, Markdown report docs/GOLDEN-EVAL-REPORT.md (quality, units, shadow cost, provisional quality_class suggestions), ADR-04 draft (cross_model decision belongs to the owner; report is a hypothesis). Simple Mode and Router untouched.`
