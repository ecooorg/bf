# EXPERIMENTS — measurement ledger (C127)

## EXP-PROJECT-2 — Interface-aware unit generation (P127.20)

| Field | Value |
|---|---|
| **Date** | 2026-11-07 |
| **Patch** | P127.20 — EXPERIMENT (answer path: Project Mode code units) |
| **Problem and evidence** | Live run (EXP-PROJECT-LIVE-1, commit 69e46f6): 0/5 PRODUCT_PASS; 5/5 builds PARTIAL with `module-contracts` (e.g. importer expects an export a sibling file does not provide; page throws at load). |
| **Hypothesis** | Passing each unit the actual exports of already generated scripts, and generating the entry script after all others, removes most cross-file import mismatches. |
| **Baseline** | Same 5 prompts, commit 69e46f6: PRODUCT_PASS 0/5, module-contracts failures 5/5, judge NOT_RUN (404). |
| **Metric / acceptance** | Re-run the same 5 prompts on the deployed new commit: module-contracts failures <= 2/5 AND PRODUCT_PASS >= 2/5. |
| **Scope** | `appBuilder/core-prompts.ts`, `core-engine.ts` (context only), `stack-static-site.ts` (entry dependencies), tests. No new regex on user language; no scenario words in code. |
| **Rollback criterion** | If acceptance is not met, revert P127.20. One corrective patch is allowed (e.g. targeted module-contract repair), then stop or revert (C127 rule 3). |
| **Result** | NOT_RUN |
| **Decision** | PENDING live re-measure |

## EXP-PROJECT-LIVE-1 — Live Project Mode baseline (P127.19)

| Field | Value |
|---|---|
| **Date** | 2026-11-07 |
| **Patch** | P127.19 — measurement instrument only; no answer-path change |
| **Type** | EXPERIMENT |
| **Problem and evidence** | P127.6–P127.18 changed Project Mode with no live before/after measurement (see TECHNICAL_REPORT: live rebuild NOT_RUN). The P127.18 workflow scores fixed fixtures. |
| **Hypothesis** | A live run (real build, real browser, screenshot judge) separates working packages from false SUCCESS and exposes infra failures separately. |
| **Baseline** | Run the workflow once on the current deploy (all scenarios), then repeat on a deploy of the pre-P127.17 commit for comparison. Record both here. |
| **Metric / acceptance** | Per scenario: PRODUCT_PASS / PRODUCT_FAIL / INFRA_FAIL; product pass rate; SUCCESS-vs-human mismatches. Thresholds are set only after the baseline (UV_MIN_PASS_RATE). |
| **Scope** | `scripts/project-user-value-live.mjs`, `config/project-user-value-prompts.json`, workflow job, test. |
| **Result** | NOT_RUN |
| **Decision** | PENDING baseline; prompt set needs independent review (C127 rule 7). |

## EXP-PROJECT-1 — Project build reliability (P127.5)

| Field | Value |
|---|---|
| **Date** | 2026-11-06 |
| **Patch** | P127.5 — Project Mode only |
| **Type** | RELIABILITY |
| **Problem and evidence** | Supplied diagnostics show a Project Mode build ending `PARTIAL` after `refs` and `size` failures with no subsequent repair run. The supplied generated game uses a TypeScript entry point in the `static_site` stack and has unresolved local module naming. Source inspection also shows that `validateRefs` treats a leading slash as a literal generated path and that existing model repair is specialized to JS syntax and DOM wiring. |
| **Hypothesis** | Correct project-root path resolution and an explicit static-site TypeScript execution contract will eliminate misleading reference failures and produce actionable failures for unsupported entry points; targeted tests will prevent regressions. |
| **Baseline** | Source snapshot `bf.zip` / repository version 127, patch 127.4. Existing validators: refs strips `./` only; JS parsing covers `.js`/`.mjs`; repair is specialized. No dependencies were installed in the supplied environment; baseline test run `NOT_RUN`. |
| **Metric / acceptance** | Root-absolute and nested relative references resolve; missing/traversal references fail; uncompiled TS fails with an actionable issue; module mismatch remains a failure; targeted tests and typecheck pass. |
| **Scope** | `appBuilder/validator-static-site.ts`, `tests/project-builder-recovery.test.mjs`, project-mode documentation and patch records. No Simple/Expert behavior changes. |
| **Result** | Implementation added; verification pending in this environment. |
| **Decision** | Continue only if targeted tests and typecheck pass; otherwise correct or revert this patch. |

## Experiment 0 — Instrument validation & architecture baseline

| Field | Value |
|-------|-------|
| **ID** | EXP-0 |
| **Date** | 2026-11-06 |
| **Patch** | P127.2b (Experiment 0 smoke: login + quota-aware C; still Stage A/B of P127.2) |
| **Type** | EXPERIMENT |
| **User problem and evidence** | No measured oracle for factual answer quality (Perestroika §1–§2). |
| **Hypothesis** | Versioned question set + multi-config harness yields comparable W/G/A rates for Simple (A), Expert (B), Gemini+Search (C), strongest (D), negative control (N). |
| **Baseline** | Set `dev-1`. Production runtime snapshot below. Full numbers NOT_RUN until smoke + labels. |
| **Metric and acceptance thresholds (locked before full run)** | Materiality §7.4: ΔG ≥15 pp **or** ΔW ≥10 pp on dev **and** direction in ≥2 category groups. Else INCONCLUSIVE. §7.6: (1) N worse than A on lookup; (2) scorer unit tests green; (3) double-label subset. |
| **Scope** | Instrument only. Fact path frozen. |
| **Result** | NOT_RUN (awaiting smoke dispatch + labels) |
| **Decision** | PENDING O1–O6 |

### Production runtime snapshot (Navigator, 2026-11-06)

Source: `https://biforge.onrender.com/health/runtime-config` · commit `3451600` · version 127

| Area | Effective |
|------|-----------|
| Search | enabled=true, planner=true, carousel=[connector,serper,gemini], country=CH, timeout=15s, maxQueries=2 |
| Features | directGeminiMode=**true**, epistemicVerifier=**false**, weather=true, projectMode=true, appAuth=true |
| Models light/strong | gemini-3.5-flash-lite → gemini-3.1-flash-lite |
| Credentials | gemini=true (10 slots), serper=true, jina=true, groq=true |
| Caps | dailyCallCap=1000, rateLimitPerHour=200 |

**Implication for configs:** A ≈ production Simple with Direct mode ON and search ON. N (ENABLE_WEB_SEARCH=false) cannot be forced on the shared deploy without a dedicated flag/env; smoke will mark N isolation limits.

### Question set

- Version: `dev-1` · 12 questions · hash at run time from `config/eval-questions.json`
- Holdout: owner/other session only

### Configurations

| ID | Description | Smoke need |
|----|-------------|------------|
| A | BiForge Simple (deploy) | EVAL_BASE_URL=https://biforge.onrender.com |
| B | BiForge Expert | same |
| C | Gemini one-call + googleSearch, primary | GEMINI_API_KEY |
| D | Strongest model + search | GEMINI_API_KEY |
| N | No web search control | imperfect on shared deploy |

### Outcome matrix (pre-registered)

| Outcome | Condition | Next |
|---------|-----------|------|
| O1 | A/B materially worse than C | Ablate one layer |
| O2 | D ≫ C ≈ A | Model/quota |
| O3 | N not worse on lookup | Instrument or search gate |
| O4 | BiForge ≥ C | Keep; taxonomy fix |
| O5 | Simple vs Expert gap | Align weaker |
| O6 | Instrument invalid | Repair; no product change |

### Results

| Run | Commit | Set hash | Config | n | W | G | Notes |
|-----|--------|----------|--------|---|---|---|-------|
| smoke | — | — | — | — | NOT_RUN | NOT_RUN | Dispatch pending |
| full | — | — | — | — | NOT_RUN | NOT_RUN | After smoke §7.6 |

### Stage status

| Stage | Status |
|-------|--------|
| A Smoke | READY — needs APP_PASSWORD in GH secrets; dispatch A,B,C |
| B Pre-register | DONE |
| C–F | blocked on A |


### Auth for A/B (P127.2b)

Production has `appAuth=true`. Smoke logs in via `POST /api/login` using GitHub secret `APP_PASSWORD` (mapped to `EVAL_APP_PASSWORD`). Cookie `be_session` is attached to product calls. C/D use `GEMINI_API_KEY` only; 429 retries with model fallback (`3.5` → `3.1` flash-lite) and 6s pacing.


### Smoke ops (P127.2e)

- Default configs **A,B** via deploy + `APP_PASSWORD` (product envelope `data.reply`).
- **C** not required for §7.6 smoke gate from Actions (shared IP → 429 even with 10 independent keys). Set `include_c=true` only when quota/IP allow; prefer C off-Actions.
- Gemini pool: serialize, 12s gap, 60s slot cooldown on 429 (aligned with `keyPool`).


## P127.3 — Ungrounded quantitative honesty gate

| Field | Value |
|-------|-------|
| **Type** | EXPERIMENT / targeted intervention |
| **Hypothesis** | On statistic/lookup turns, Simple/Expert often assert specific figures when search did not ground the turn → high machine W on dev-12. |
| **Change** | Expand quantitative-question detection; `applyUngroundedStatisticGate` replaces confident quantities when search status is not `used`/`used_weak`. Wired on Simple Direct + structured path behind **`UNGROUNDED_FACT_GATE=true` (default off)**. Also `needsFreshWebInfo` treats population/GDP/rate questions as needing lookup. |
| **Metric** | Smoke A/B on same 12: infra still &lt;25%; paired W-rate on statistic/lookup subset not worse; fewer confident bare numbers when search not_run. |
| **Rollback** | Unset / `false` the env flag. |
| **Result** | NOT_RUN live after deploy with flag on |


### P127.3a — Fact-path contracts

Deterministic offline tests for quantitative triggers, ungrounded gate, HTTP data.reply. In Answer Quality suite. No product change.


## P127.4 — Grounded number check

| Field | Value |
|-------|-------|
| **Hypothesis** | Search can be `used` while the model still asserts a number absent from digest/titles (E01/A class). |
| **Change** | `applyGroundedNumberCheck` after optional P127.3 gate; evidence = digest + source titles. Flag **`GROUNDED_NUMBER_CHECK=true`** (default off). |
| **Metric** | Smoke A/B: wrong ungrounded figures on lookup should drop; chat unchanged. |
| **Rollback** | Unset / false the flag. |
| **Result** | NOT_RUN until flag-on deploy + smoke |
