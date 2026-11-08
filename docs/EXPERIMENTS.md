# EXPERIMENTS — measurement ledger (C127)

## EXP-PROJECT-8 — Names that two files must agree on (P127.33, BEHAVIOUR)

| Field | Value |
|---|---|
| **Problem and evidence** | Navigator session 2026-11-07, commit 9387144 (127.32), three builds, all `SUCCESS` with 12 of 12 validators ok and `runtimeVerified=false`, all unusable when opened (delivered `index.html` opened in headless Chromium, screenshots). (1) The stylesheet only styles `.square.light`/`.square.dark` and `.square.selected`, the script gives squares the classes `white`/`black`/`highlight`: the board is transparent and invisible. (2) The stylesheet shows a slide only as `.slide.active`, no script ever sets `active`: every slide has opacity 0. (3) Scripts name six picture files (`img/…jpg`); a package holds text files only, so none exist (`ERR_FILE_NOT_FOUND`). A fourth defect in the same builds (a click handler reads `dataset.row` while the renderer wrote `dataset.pos`) throws on the first tap and is found only by the browser check. A fifth (the piece type names `p` in the engine and `pawn` in the renderer: board, no pieces) is silent and found by no check below. |
| **Hypothesis** | Two mechanical checks on names shared between files, reported as one validator `name-contracts` and sent into the existing bounded cross-file repair: (a) a CSS rule that needs a second class (`.a.b`) where `b` appears in no script or markup (as a whole word, or as the prefix of a composed name), (b) a script or stylesheet that names a local picture, sound or font file that is not in the package. They catch (1), (2), (3) in the replayed builds and are not triggered by the same files after the defect is removed. |
| **Baseline** | Replay of the three delivered packages: `name-contracts` does not exist; 0 of 3 flagged. Live: 3 of 3 builds SUCCESS and unusable in this log window (n=3). |
| **Metric / acceptance** | Tests: each defect above flagged with the defect in place and not flagged after it is removed; dynamic prefix names, single-class rules, data/external URLs and files present in the package are not flagged; an integration build repairs a missing-asset reference through the cross-file repair. Replay: the three delivered packages give >= 3 issues in total and the two non-defective neutral fixtures give 0. Live (same prompt set, runtime check enabled): builds that finish `SUCCESS` and open with something visible >= 60%, versus 0 of 3 now; false `PARTIAL` (working program held back by this validator) observed in <= 1 of 10 builds. |
| **Scope** | `appBuilder/validator-static-site.ts`, `appBuilder/core-engine.ts` (CROSS list, CSS targets, one prompt sentence), `tests/project-builder-recovery.test.mjs`, patch records. No scenario words in code or tests (neutral names only). Deletion: none; the validator is added to `REQUIRED_VALIDATORS`. |
| **Rollback criterion** | Any program that worked before is held back by a flagged name that is in fact set dynamically (false `PARTIAL`), or live visible-and-`SUCCESS` rate is not above 0 of 3: revert P127.33. One corrective patch allowed, then stop or revert. |
| **Result** | Unit tests and replay: see TECHNICAL_REPORT. Live: NOT_RUN. User value: NOT_RUN. |

## EXP-PROJECT-7 — Open the built page in a sandboxed browser and repair what throws (P127.32, BEHAVIOUR)

| Field | Value |
|---|---|
| **Owner authorisation** | Navigator, session 2026-11-07: "да. запускай" in reply to the request to run generated code in Project Mode (AGENTS.md: running generated code needs explicit owner authorisation). Scope of the authorisation: a sandboxed headless browser opening the built page. Not given: any change of the deployment image or hosting configuration. |
| **Problem and evidence** | Job after P127.31 (commit a3932a4, 3D board program, outcome PARTIAL `validators_failed: refs`). Opening the delivered page in headless Chromium with a stub of the 3D library logged `Initialization failed: TypeError: scene.add is not a function` at `setupLights`, 0 frames rendered, status text visible, canvas empty (matches the user's screenshot). The cause is a cross-file shape mismatch (a factory returns an object, the caller uses it as the scene) that none of 12 static validators can see (type-contracts: ok, no issues). Earlier builds in the same log window (mazes, race, board) also ended without any run; `runtimeVerified` is false in every report. |
| **Hypothesis** | Opening the page once and feeding the thrown error (message plus the first stack frames, mapped to project files) into the existing bounded cross-file repair lets the model fix errors that only appear at run time, and an error that stays is reported instead of a green static result. |
| **Baseline** | Offline replay on the delivered sources: 1 uncaught initialisation error, 0 frames. Live: runtime errors found by the build = 0 of 6 builds (nothing ran); n too small for a rate. |
| **Metric / acceptance** | Tests: a fake runtime port with an error drives one repair and the report ends with `runtimeVerified=true` only when the second run is clean; an unavailable or absent port leaves every report exactly as before (`runtimeVerified=false`, no new validator); request policy of the runner blocks every host except two script CDNs; a real headless run of the delivered sources reproduces the error. Live (same prompt set as `project-user-value`, deployed with the browser installed): pages opened without an uncaught error >= 50% of builds that finished, measured against the 0 recorded by the independent runner at 127.31. |
| **Scope** | `appBuilder/core-ports.ts`, `appBuilder/core-engine.ts`, `appBuilder/index.ts`, `server/appBuilderRuntimeCheck.ts` (new), `server/appBuilderAdapter.ts`, `tests/project-builder-recovery.test.mjs`, generated inventories, patch records. No prompt rewrite beyond one sentence in the cross-file repair prompt. No scenario words in code or tests. |
| **Safety** | Off unless `PROJECT_RUNTIME_CHECK=true` and a Chromium for Playwright exists on the host; otherwise the build behaves exactly as before. Fresh browser context per check, one check at a time, hard time limit, service workers and downloads blocked, the page is served from memory on a reserved never-resolving origin, only two script CDN hosts may be reached, everything else is aborted. `--no-sandbox` only with `RUNTIME_CHECK_NO_SANDBOX=true`. |
| **Rollback criterion** | Any build that was complete before is reported failed because of an environment error (browser missing, GPU absent, CDN unreachable) instead of "not run"; or live clean-open rate is not above the 127.31 value: unset `PROJECT_RUNTIME_CHECK` (no redeploy needed) and revert P127.32. One corrective patch allowed, then stop or revert. |
| **Result** | Local tests and one real browser run: see TECHNICAL_REPORT. Live: NOT_RUN. User value: NOT_RUN. |

## EXP-PROJECT-6 — Keep a usable model plan (P127.31, BUGFIX)

| Field | Value |
|---|---|
| **Problem and evidence** | Navigator session 2026-11-07, commit c39688e, job 71621f10: the planner returned a usable plan (9 files) whose unit ids have no extension (`index`, `board`) while `dependsOn` and `order` name files (`style.css`, `game.js`). `validatePlan` rejected it (16 issues: `missing_dep`, `unknown_unit_in_order`, plus a two-unit cycle between the entry script and the input script), the template fallback replaced it, the entry script was generated before three of the modules it must use and became a stub, and the build ended PARTIAL (`plan_fallback`). The delivered page showed an empty board strip and no pieces (screenshot). |
| **Hypothesis** | Dependencies are generation-order hints. Resolving a reference by unit id, file path or file stem, dropping hints that name nothing and breaking a dependency cycle at its least-connected unit keeps a model plan that is sound in substance, so the entry script is generated after the modules it imports and the generic fallback is used only for plans that are really unusable (no units, unsafe or duplicate paths, too many units). |
| **Baseline** | Replay of the logged plan shape (neutral names, same graph): `validatePlan` ok=false, 16 issues; build outcome PARTIAL with `plan_fallback`. Live: this log window had 6 builds, 1 hit `plan_validate_failed` (1/6); n is too small for a rate. |
| **Metric / acceptance** | Unit tests: the replayed plan validates, keeps its own units and contracts, the entry unit runs after every unit it depends on; unusable plans (empty, unsafe path, duplicate path, too many units) are still rejected. Live (next automatic run, same prompt set): `plan_fallback` events <= 1/20 builds. |
| **Scope** | `appBuilder/core-plan.ts`, `appBuilder/core-engine.ts`, `tests/project-builder-recovery.test.mjs`, patch records. No change to prompts, validators, the fallback plans or any model call. No scenario words in code or tests; no regex on user language. Deletion: the empty dependency loop in `validatePlan`. |
| **Rollback criterion** | Any rejected-plan case above is accepted, or live `plan_fallback` is not lower than the 2026-11-07 window: revert P127.31. One corrective patch allowed, then stop or revert. |
| **Result** | Unit tests: red before, green after (see TECHNICAL_REPORT). Live: NOT_RUN. User value: NOT_RUN. |

## EXP-PROJECT-DOM — Entry HTML first (P127.26, EXPERIMENT)

| Field | Value |
|---|---|
| **Problem and evidence** | Live run bfc8eb6: `dom-wiring` failed in 3/20 builds; Navigator session 2026-11-07: 3/6 builds (ids such as `current`, `btn-nitro`, `hud-*` absent from the HTML); repair rejected `no_improvement`. |
| **Hypothesis** | Generating the HTML first and giving scripts and styles its real ids removes most dom-wiring failures. |
| **Baseline** | commit bfc8eb6, 20 live runs: dom-wiring failures 3/20; reachability 4/20; refs 0/20; module-contracts 1/20; PRODUCT_PASS 1/20. |
| **Metric / acceptance** | Same live set on the deployed commit: dom-wiring failures <= 1/20 AND reachability + refs + module-contracts failures not above 5/20 combined AND PRODUCT_PASS >= 1/20. |
| **Scope** | `appBuilder/stack-static-site.ts`, `core-prompts.ts`, `core-engine.ts`, tests. No scenario words in code; no new language-specific regex. Deletion: HTML dependency lines in `expandedPlanFromBrief`. |
| **Rollback criterion** | Acceptance not met: revert P127.26. One corrective patch allowed (for example HTML told which scripts are modules), then stop or revert. |
| **Result** | NOT_RUN (needs the deployed commit and the live workflow). |

## EXP-PROJECT-RACE — Archive stored before terminal state (P127.25, BUGFIX)

| Field | Value |
|---|---|
| **Problem and evidence** | Live run on bfc8eb6: 7/7 SUCCESS builds polled without `downloadUrl` (`hasDownloadUrl=false`). Code: `core-engine.ts` saved `done`, the adapter stored the ZIP afterwards; the client stops polling on the first terminal status. |
| **Hypothesis** | Storing the ZIP before the terminal save removes the window. |
| **Metric / acceptance** | Unit test: first terminal save carries `artifactId` (complete and partial). Live: SUCCESS builds with `hasDownloadUrl=true` = 100% on the next live run. |
| **Scope** | `appBuilder/core-engine.ts`, `server/appBuilderAdapter.ts`, `server/projectRoutes.ts`, chat UI (`BuildFilesPanel`), tests. UI requested by the Navigator in the same patch. |
| **Rollback criterion** | New failures in resume or cancel tests, or SUCCESS builds without download in the live run. |
| **Result** | Unit tests: red before, green after. Live: NOT_RUN. |

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
| **Result** | Live run, commit 24173ab (deployed==repo): module-contracts failures 0/5 (bar <=2: MET); SUCCESS builds 3/5 (was 0/5); PRODUCT_PASS 1/5 (bar >=2: NOT MET); 2 SUCCESS-vs-human mismatches (timer, arcade). n=5, single run. |
| **Decision** | Keep: the targeted defect is gone and a full revert would restore 5/5 broken builds. The pass bar was not met, so no USER_VALUE label; follow-up EXP-PROJECT-3 (the one corrective). |

## EXP-PROJECT-3 — Style the real page (P127.21)

| Field | Value |
|---|---|
| **Date** | 2026-11-07 |
| **Patch** | P127.21 — EXPERIMENT (corrective to EXP-PROJECT-2; last one allowed before stop or revert) |
| **Problem and evidence** | Live run 24173ab: SUCCESS builds fail the human check; timer screenshot shows CSS/HTML class mismatch (stylesheet generated before the page). |
| **Hypothesis** | Generating HTML before CSS and passing real ids/classes to later units fixes mis-styled pages. |
| **Baseline** | Same 5 prompts, 24173ab: PRODUCT_PASS 1/5, SUCCESS-vs-human mismatches 2/5. |
| **Metric / acceptance** | Same 5 prompts on the deployed new commit: PRODUCT_PASS >= 3/5 AND mismatches <= 1/5. |
| **Rollback criterion** | If not met: revert P127.21; no further corrective on this hypothesis. |
| **Result** | Live run d88b819 (deployed==repo): PRODUCT_PASS 0/5 (bar >=3: NOT MET); mismatches 1/5 (bar <=1: met); module-contracts reappeared in 1 build. n=5, single run. |
| **Decision** | REVERTED in P127.22 per rollback criterion. No further corrective on this hypothesis. |

## EXP-PROJECT-5 — Standalone index.html (P127.30)

| Field | Value |
|---|---|
| **Date** | 2026-11-07 |
| **Patch** | P127.30 — FEATURE (delivery) |
| **Problem and evidence** | User screenshot: opening the delivered package from the Android file manager (`content://`) shows an unstyled, non-running page; external module scripts and sibling files are not available there. All earlier live measurements opened packages over HTTP and could not detect this. |
| **Hypothesis** | One self-contained index.html (CSS + all scripts inline, sources in `source/`) makes the page render and run when opened directly. |
| **Baseline** | Inferred, not measured: every multi-file package with `type=module` scripts renders nothing useful on `file://`/`content://` (0 of N). The live runner now opens `file://`, so the next automatic run is the first real measurement. |
| **Metric / acceptance** | Live run (10 prompts x 2): `file://` open renders content (RENDERS) in >= 90% of packages that have a downloadable package, and no `Unexpected token 'export'` / module-load errors. Logic correctness is measured separately (PRODUCT_PASS). |
| **Rollback criterion** | If the standalone build changes behaviour of a previously working package (a package that passes under HTTP fails standalone), the bundler falls back to `unchanged` automatically; if > 10% fall back, investigate before keeping. |
| **Result** | NOT_RUN (offline evidence: real chess package renders 64 squares / 32 pieces from the single file in jsdom) |
| **Decision** | PENDING automatic live run |

## EXP-PROJECT-4 — Cross-file diagnostics and bounded repair (P127.23)

| Field | Value |
|---|---|
| **Date** | 2026-11-07 |
| **Patch** | P127.23 — EXPERIMENT |
| **Problem and evidence** | Live runs 69e46f6, 24173ab, d88b819: PRODUCT_PASS 0/5, 1/5, 0/5; dominant failures are cross-file contract defects with no repair path (module-contracts) or partial coverage (member-contracts). |
| **Hypothesis** | Detecting cross-file mismatches with the TypeScript checker and repairing the offending file against the real interfaces (bounded: 2 rounds x 2 files, strict-improvement acceptance) converts a material share of PARTIAL builds into working packages and removes false SUCCESS. |
| **Baseline** | Same prompts: PRODUCT_PASS 1/5 (24173ab, best) and 0/5 (d88b819); 10-prompt x 2-run baseline does not exist yet — the first run of the new suite on this commit is the new baseline for later patches. |
| **Metric / acceptance** | Product pass rate over 10 prompts x 2 runs on the new commit >= 30% (3+ of 10 distinct scenarios passing in at least one run) AND SUCCESS-vs-human mismatches <= 2 of 20. Infra failures excluded and reported. |
| **Rollback criterion** | If PRODUCT_PASS rate < 15% (< 3 of 20 runs) the repair step is reverted; the validator may stay as a reporting-only check. |
| **Scope** | `validator-static-site.ts`, `core-engine.ts` (repair step), `core-prompts.ts`, tests, live workflow automation. |
| **Result** | NOT_RUN |
| **Decision** | PENDING automatic live run after deploy |

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
