## [127.18] - Project Mode user-value workflow (human simulator)

- New offline **human-simulator** evaluator: `scripts/project-user-value-eval.mjs`.
- Fixtures: `stub-racer` (SUCCESS on tiny package — must fail human rubric) and `rich-forest` (recognizable animals/forest — must pass).
- Workflow: `.github/workflows/project-user-value.yml` (PR/path + dispatch).
- npm script `test:project-user-value`. Scores recognition, stub size, honest SUCCESS, interaction markers — not syntax gates.
- Package patch `127.18`.

## [127.17] - Intent elaboration + multi-module plan + honest goal adequacy

- New **intent** stage before spec: model elaborates plain-language requests into expanded goal, mustHave / notSuccessIf, complexity, suggested small modules (`app_builder.intent.v1`).
- Fallback brief when the intent call fails still expands ambition (games/3D/city → ambitious).
- **expandedPlanFromBrief**: tree of many small files (js/*, css, html) instead of a 4-file stub template for standard/ambitious goals.
- **assessGoalAdequacy**: SUCCESS / `goalImplemented` require more than static validators — rejects tiny JS stubs for ambitious/standard goals; plan_fallback forces PARTIAL.
- Profile: `maxUnits` 48, `maxCallsPerJob` 60.
- Package patch `127.17`.

## [127.16a] - lint:copy: no Cyrillic in stack-static-site

- Removed Cyrillic tokens from `ensureMultiFileStaticPlan` interactive regex (lint:copy language rule).
- Interactive detection remains Latin keyword-based; single-HTML / no-JS branches still force multi-file.
- Package patch `127.16a` (letter suffix; non-product CI fix).

## [127.16] - Multi-file plan + MAX_TOKENS / missing_end recovery

- Planner prompt **v5**: interactive apps must plan multiple files (index.html + app.js [+ style.css]); forbid mega-single HTML.
- `ensureMultiFileStaticPlan`: coerce single-HTML / no-JS interactive plans to the static multi-file template.
- Coder: stronger compact-unit + required `<<<END>>>` instructions.
- On truncation / MAX_TOKENS / missing_end: explicit repair hint, then one ultra-compact retry (`unit_repair_compact`); clearer `truncated_unit:` failure reason.
- ProjectChat welcome text shortened for `lint:copy`.
- Package patch `127.16`.

## [127.15] - Project Mode chat-first surface

- Default Project UI is a **single chat**: user describes the program, gets a ZIP (or an error), then keeps chatting to refine.
- New `src/ProjectChat.tsx`: transcript + composer; auto-creates/confirms project; `code/build` then `code/continue` from the latest ZIP; download link in the assistant message.
- Multi-panel workspace (analysis, plans, files tools, wizard) moved behind **Advanced** with **Back to chat**.
- Package patch `127.15`.

## [127.14] - CI fix: lint:copy + upload Uint8Array type

- Shortened Project Mode workspace help text (lint:copy 24-word limit).
- Renamed Advanced tab label `Raw JSON` → `Project data` (forbidden internal term).
- `POST .../artifacts/upload`: pass `Uint8Array.from(Buffer)` so typecheck accepts ArrayBuffer-backed bytes.
- Package patch `127.14`.

## [127.13] - Project Mode Files-first workspace

- Default project tab is **Files** (not Results).
- Analysis ("What should we analyse?") only appears under **Advanced**.
- Primary nav: Files; Plan/Analysis/Code package/Raw JSON behind Advanced toggle.
- Next-step copy points to create/upload/improve ZIPs instead of "Run an analysis".
- Selecting a project opens the Files tab; empty-project copy matches the program-ZIP path.
- Package patch `127.13`. Continues P127.12 continue/upload without API changes.

## [127.12] - Project continue + source ZIP upload (UX)

- Wired **Improve this program** in Project Mode UI to existing `POST /api/projects/:id/code/continue` (base ZIP selector + change request).
- Added `POST /api/projects/:id/artifacts/upload` (JSON base64 ZIP) so users can store an arbitrary source archive in the project registry and continue from it.
- Files tab: upload control + clearer copy distinguishing local Workspace vs server artifacts.
- Static-site post-download instructions no longer default to Render/Railway deploy; they tell the user to open `index.html` and use Improve/Upload.
- Shorter `suggestProjectName` (drop filler words, max 28 chars).
- Category tests for continue/upload wiring; package patch `127.12`.

## [127.11] - Patch process compliance + integration-gate tests

- Advanced `package.json` / `package-lock.json` product patch metadata to `127.11` (major `version` remains `127`).
- Extended category suite `tests/project-builder-recovery.test.mjs` with contracts for `reachability`, `completeness`, `member-contracts`, orphan drop, and `runtimeVerified: false` on SUCCESS (covers P127.9–P127.10 gates under G3).
- Extended `tests/project-mode-contract.test.mjs` with package metadata assertion.
- No Simple/Expert behaviour change.

## [127.10] - Member contracts + coherent package for self-contained HTML

- Added required validator `member-contracts`: after `import { Class }` + `new Class()`, instance property/method accesses must match the class surface (`this.x =` assignments and methods). Suggests `is*`/`get*` near-misses (e.g. `paused` vs `isPaused`).
- Deterministic package cleanup: when the entry HTML is a large self-contained inline app and external CSS/JS are unreachable, those orphans are dropped before scoring (`droppedOrphanedFiles` on the report, `orphans_dropped` event).
- Bounded model repair for `member-contracts` (max 2 scripts, same non-destructive acceptance rules as DOM wiring repair).
- Scope: Project Mode `appBuilder/` only; Simple and Expert untouched.

## [127.9] - Project Mode integration gates (reachability + completeness)

- Added required static validators `reachability` and `completeness` for the `static_site` stack so SUCCESS cannot be claimed when generated files are orphaned or truncated.
- `reachability`: every non-exempt file must be reachable from an HTML entrypoint via `src`/`href` and relative ES imports; flags self-contained HTML with large inline scripts alongside unreferenced external modules.
- `completeness`: detects truncated JS/CSS/HTML (unclosed braces, mid-statement endings, missing `</html>`).
- `dom-wiring` now also scans `.mjs`/`.cjs` and inline `<script>` bodies.
- `BuildReport` gains mandatory `runtimeVerified: false` for static-only core runs and optional `orphanedFiles`.
- Planner/coder prompts tightened: simplest static architecture by default, no unrequested frameworks, entry HTML must link every deliverable asset, no truncated files (`PROMPT_VERSION` → `static_site.v5`, plan → `app_builder.plan.v4`).
- User-facing SUCCESS notes state that runtime was not executed on BiForge.
- Scope: Project Mode `appBuilder/` only; Simple and Expert untouched.

## [127.8a] - Docs layout CI fix

- Removed three non-allowlisted prose files from `docs/` (`PROJECT_CONTINUATION.md`, `PROJECT_MODE_P127_8_ACCEPTANCE.md`, `PROJECT_MODE_RELIABILITY_PLAN.md`) and redirected references to canonical documents. Fixes `docs-integrity` and `test:core` failures. No runtime change.

## [127.8] - Project Mode recovery and acceptance

- Stale build recovery now atomically leases eligible jobs with PostgreSQL row locks (`FOR UPDATE SKIP LOCKED`) and refreshes the heartbeat before a worker resumes them. This prevents multiple BiForge replicas from concurrently resuming the same stale job.
- Added focused tests for atomic lease SQL, returned job mapping, and the minimum lease age.
- Preserved Project Mode-only scope; no Simple or Expert route, prompt, or UI implementation was changed.
- Verification status: see `TECHNICAL_REPORT.md`; browser E2E and live multi-replica/database recovery remain `NOT_RUN`.

## [127.7] - Project workspace artifact inventory

- Added project-scoped inventory of all immutable artifact versions.
- Added version-specific artifact downloads and artifact inspection endpoints.
- Added Project Mode UI for historical version downloads, integrity status, and ZIP entry listings.
- Added project-mode contract coverage. Simple and Expert paths were not modified.
- Verification: pending local test/typecheck/build execution; see `TECHNICAL_REPORT.md`.

## P127.5 — Project Mode build reliability (2026-11-06)

- Normalize HTML local references against the generated project root or the referencing HTML directory; preserve path-traversal rejection.
- Reject raw TypeScript in the `static_site` stack with an actionable message because this stack does not transpile TypeScript.
- Add regression contracts for root-absolute references, nested relative references, TypeScript entry points, and unresolved local imports.
- Project Mode only; Simple and Expert behavior is out of scope. Verification status is recorded in `TECHNICAL_REPORT.md`.

## P127.4 — Grounded number check (flag-gated) (2026-11-06)

- When search is used/used_weak, quantitative claims must appear in digest/titles or reply is replaced.
- Flag `GROUNDED_NUMBER_CHECK` default off. Pure helpers + wiring Simple Direct + structured.

## P127.3a — Fact-path contract tests (instrument) (2026-11-06)

- `tests/fact-path-contracts.test.mjs`: pure contracts for quantitative detection, ungrounded gate, envelope `data.reply`.
- `server/conversationPayload.ts`: pure `extractAgentDataPayload` (shared contract surface).
- Wired into `npm run test:answer-quality`.
- No product behaviour change.

## P127.3 — Ungrounded fact gate (flag-gated product intervention) (2026-11-06)

- Hypothesis from Experiment 0 smoke: confident quantities without search grounding → high W on stats/lookup.
- `isQuantitativeFactQuestion` + broader gate; wire Simple Direct + Expert/structured behind `UNGROUNDED_FACT_GATE` (default **off**).
- `needsFreshWebInfo` includes population/GDP/rate prompts so search is more likely to run.
- Direct responses may include `sources` when search returned them.

## P127.2e — eval smoke reliability (instrument) (2026-11-06)

- Product: parse `data.reply` + sources; empty body = infra.
- Default smoke **A,B** only; C optional (`include_c` / EVAL_INCLUDE_C).
- Gemini pool: 12s gap, 60s cooldown per slot on 429; infra rate counts empty/NOT_RUN.
- Still under plan **P127.2**; not P127.3 intervention.

## P127.2d — eval product response envelope (instrument) (2026-11-06)

- Parse `{ success, data.reply }` from conversation routes (was reading top-level `reply` → empty A/B).
- Empty product body is infra error, not silent I.
- Still P127.2 Experiment 0 instrument; not plan P127.3.

## P127.2c — preflight letter-patch + Gemini 10-key pool in eval (instrument) (2026-11-06)

- workflow-preflight accepts `127.2c`-style letter suffix.
- baseline-eval rotates GEMINI_API_KEY + GEMINI_API_KEY_1..10 like server/keyPool.ts; workflow maps all ten secrets.
- Still under plan **P127.2** (Experiment 0); not P127.3 intervention.

## P127.2b — Experiment 0 smoke: auth + quota-aware Gemini (instrument, user_value: NOT_RUN) (2026-11-06)

- Still under plan step **P127.2** (Experiment 0), not P127.3 intervention.
- Instrument: harness logs in to deploy (`/api/login` + session cookie) for A/B; C/D retry on 429 with model cascade and pacing.
- Workflow passes `secrets.APP_PASSWORD` as EVAL_APP_PASSWORD; default configs A,B,C; base_url biforge.onrender.com.
- N remains imperfect on shared deploy (search cannot be forced off).
- Decision: prefer real product answers via session over inventing an auth bypass in product code.

## P127.2a — lint:copy allowlist for eval instrument (non-product) (2026-11-06)

- Allow Cyrillic in `config/eval-questions.json`, `scripts/baseline-eval.mjs`, `docs/EXPERIMENTS.md` (multilingual fixtures).
- package patch `127.2a` (letter suffix; does not advance product sequence).

## P127.2 — Experiment 0 Stage B + live harness (EXPERIMENT, user_value: NOT_RUN) (2026-11-06)

- Pre-register EXP-0 with production runtime-config snapshot (directGeminiMode=true, search on, verifier off).
- Live harness `--smoke` for A/B (EVAL_BASE_URL) and C/D (GEMINI_API_KEY).
- **Numbering rule (Navigator):** product patches = numeric (`127.n`); non-product = letter suffix (`127.na`). Prior mis-numbered CI fix treated as **P127.1a** (non-product); this delivery is product step **P127.2** per plan.
- AGENTS.md + version parsers accept optional letter suffix.

## P127.3 — Experiment 0 Stage B + live harness (EXPERIMENT, user_value: NOT_RUN) (2026-11-06)

- Pre-register EXP-0 thresholds/outcome matrix in docs/EXPERIMENTS.md before any full run.
- baseline-eval: `--smoke`/`--live` calls Gemini+Search (C/D) when GEMINI_API_KEY set; product A/B when EVAL_BASE_URL set.
- Workflow accepts base_url + configs inputs; secrets passed as env.
- Live results still NOT_RUN until Navigator dispatches smoke and pastes runtime-config.

## P127.2 — CI green for instrument (EXPERIMENT, user_value: NOT_RUN) (2026-11-06)

- governance-repo: version assert 127; docs allowlist includes EXPERIMENTS.md and BIFORGE Perestroika.md.
- Corrective for P127.1 instrument only; no product change.

## P127.1 — Measurement instrument (EXPERIMENT, user_value: NOT_RUN) (2026-11-06)

- Added `config/eval-questions.json` (12 dev questions), `scripts/baseline-eval.mjs`, `tests/eval-harness.test.mjs`, `.github/workflows/baseline-eval.yml`, `docs/EXPERIMENTS.md`.
- AGENTS.md: C127 operating rules + Navigator Directive duty-to-object amendment.
- No product behaviour change; live eval results NOT_RUN.

## P126.31 — Search query hygiene (strip meta instructions) (2026-11-06)

- **General (any topic):** expand `stripInstructionWords` with multi-word meta phrases (search again / other sites / only the number / no explanations / answer my question — EN+RU).
- **`buildSearchQuery`:** always runs the same strip so SERP never receives process-only wording as the query.
- **`contextualizeSearchText`:** if the latest user turn is meta-only, reuse the **prior** factual user task (when it had search intent) instead of searching the instruction text.
- Not domain-specific (no tree/LFI hardcoding).

## P126.30 — Pass through model reply with search (no statistic reply gate) (2026-11-05)

- **Removed** `applyUngroundedStatisticGate` from Simple Direct and Expert response paths. The HTTP reply is again the **model text** after optional web search is injected into the prompt (search status / digest blocks unchanged).
- **Kept** `isStatisticShareQuestion` → `needsFreshWebInfo` so percentage/share questions still **trigger** live search when enabled.
- Aligns with product intent: agent returns the model answer with internet search, without post-hoc replacement of the reply body.

## P126.29 — Statistic search trigger + ungrounded percentage gate (2026-11-05)

- **Search trigger:** `isStatisticShareQuestion` → `needsFreshWebInfo` so questions like «какой процент … в [месте]» expect live lookup (Simple `shouldSearchWeb` and Expert planner candidates).
- **Honesty gate:** `applyUngroundedStatisticGate` — if search is not `used`/`used_weak` and the model asserts a concrete % as data/inventory, replace with an explicit «not verified» reply (RU/EN). Wired on Simple Direct and Expert conversation responses.
- Cascades unchanged (3.5 → 3.1 still available).
- Tests: wiring + pure share-question patterns in `tests/search-retrieval.test.mjs`.

## P126.28 — Primary deploy (Render), SECURITY pointer, connectors in config/ (2026-11-05)

- **docs/OPERATIONS_AND_RELEASES.md:** Render is the primary production host; `railway.toml` / `nixpacks.toml` documented as secondary/legacy.
- **SECURITY.md:** replaced template with pointer to binding `docs/SECURITY_AND_PRIVACY.md`.
- **connectors.yaml → `config/connectors.yaml`:** path updates in `scripts/verify-connections.mjs`, answer-quality workflow path filter, comment in `githubIntegration.ts`; postgres connector label host-agnostic.
- **docs/DATA_AND_ARTIFACTS.md:** `config/` inventory note.
- Runtime connector checks unchanged aside from file path.

## P126.27 — CI: docs path refs + drop actions/cache pin (2026-11-05)

- **docs-reference-integrity:** `App.tsx` / `ProjectMode.tsx` in ARCHITECTURE and DECISIONS → `src/App.tsx` / `src/ProjectMode.tsx`.
- **governance-workflow-pins:** remove required `actions/cache` pin after P126.26 removed Playwright cache from `ci.yml` (cache is no longer used).
- Fixes CI FAIL trio: docs-integrity, test:core pins, workflow-action-pins.

## P126.26 — CI preflight: drop retired test:ui-smoke (2026-11-05)

- **Root cause:** after P126.24 removed no-op `test:ui-smoke`, `workflow-preflight` failed on `.github/workflows/ci.yml` still calling that script; DAG never started (18 NOT_RUN).
- **ci.yml:** removed Playwright install/cache + UI smoke step that only invoked the retired no-op; `WORKFLOW_RERUN` is `npm run check`.
- Hosted browser UI smoke remains out of category layout until a real suite is added (AGENTS G4 / TEST_MAP).

## P126.25 — Document Drive + workspace as keep (2026-11-05)

- **AGENTS.md:** SSOT rows and binding “Client file systems” — workspace and Google Drive are **keep**; must not propose removal without superseding decision.
- **docs/ARCHITECTURE.md:** landmarks for workspace vs Drive (complementary).
- **docs/DATA_AND_ARTIFACTS.md:** client workspace vs Drive vs Architect ZIP.
- **docs/DECISIONS.md:** D-2026-11-05-01 owner clarification.
- No code or runtime behavior change.

## P126.24 — DAG honesty + single model-sources.json (2026-11-05)

- **verification-manifest.json:** dropped retired/no-op DAG checks (`test:files`, `test:pipeline`, `test:workspace`, `test:database*`, `test:web`, `test:turn`, `test:gates`, `test:integrations`, `test:compact-ci-artifacts`, `test:bx06:api`, carousel placeholder). **18 real checks** remain (check: 16, ci adds `db-migrate` + `build`).
- **package.json:** removed matching no-op `test:*` scripts and `architect:dual-compare` (20 entries).
- **config/model-sources.yaml:** deleted; sole catalog is `config/model-sources.json` (loader already used JSON only).
- **carousel-verify.mjs:** runs category suites (`providers-models`, `search-retrieval`, `providers-router-policy`) instead of missing `tests/p123-*.test.mjs`.
- **patch-pack / architectureChangeImpact / TESTING + SPEC:** callers updated off retired script names.
- **governance-repo:** asserts no no-op test scripts, manifest ids, and no model-sources.yaml.

## P126.23 — Scripts allowlist: remove per-patch and one-off tools (2026-11-05)

- **Removed** from `scripts/`: p117/p118/p119/p120 live and evidence harnesses, bounded-repair/faultInjection p108, ai-test-harness-p93-7, architect-dual-compare (+ expense goal), neon-migration-*, staging-drills, summarize-real-model-eval, intentContractLib, information-quality-eval, package-ci-artifacts (21 files).
- **Added** `scripts/scripts-integrity.mjs` allowlist gate; wired into `docs:integrity` and `scripts:integrity`.
- **AGENTS.md:** Scripts layout (binding) — no pNNN scripts; new tools need allowlist + caller in same delivery.
- **package.json:** `test:ai` and `architect:dual-compare` become retired no-ops (DAG-safe).
- **governance-repo:** asserts no patch-like script names.
- No product runtime behavior change.

## P126.22 — Docs layout: reject stray non-md/json under docs/ (2026-11-05)

- **Root cause (CI red on 126.21):** remote `docs/1.txt` tripped `docs-integrity` (`unexpected file type`).
- **docs-integrity.mjs:** layout section no longer prints PASS after a layout FAIL; still fails closed on unexpected types.
- **governance-repo.test.mjs:** asserts docs/ contains only `.md` and `.json` (catches `1.txt` and similar).
- **Navigator action:** delete `docs/1.txt` (not shipped in ZIP). No program behavior change.

## P126.21 — Docs micro-hardening after topology cleanup (2026-11-05)

- **USER_VALUE_EVALUATION:** growth rule — full detail for recent 2–3 cycles; older blocks may become short index lines without erasing OBSERVED records.
- **ARCHITECTURE / OPERATIONS:** Quick orientation bullets at the top for faster assistant orientation.
- **AGENTS.md:** VIX-CONCEPT open only on explicit Navigator request (SSOT row + docs layout bullet).
- **ROADMAP / DECISIONS:** retired-path banners so historical C12x / remediation links are not treated as current authority.
- **MODEL_REGISTRY:** aligned with current `GEMINI_ALLOWED_MODELS`, default cascades, and `config/model-sources.json` gemini-free-pool.
- **governance-repo.test.mjs:** asserts docs/ allowlist, no nested folders, no C###_/audit report markdown; AGENTS documentation-layout binding.
- No program/code behavior changes.

## P126.20 — Documentation topology cleanup (2026-11-05)

- **Canonical prose allowlist** under `docs/`: ARCHITECTURE, API_CONTRACTS, TESTING_AND_ACCEPTANCE, USER_VALUE_EVALUATION, SECURITY_AND_PRIVACY, OPERATIONS_AND_RELEASES, DATA_AND_ARTIFACTS, DECISIONS, TEST_MAP, MODEL_REGISTRY, VIX-CONCEPT.
- **Merged:** INFORMATION_QUALITY_WORKFLOW → ARCHITECTURE; RENDER_ENV_CONTRACT → OPERATIONS_AND_RELEASES; MODEL_ALLOWLIST + MODEL_SOURCES_* → MODEL_REGISTRY.
- **Retired (removed from repo):** C123–C126 cycle reports, diagnostic/audit reports, web-search analysis/remediation markdowns, USER_VALUE_EXPERT_C122, and the three MODEL_* predecessors.
- **Integrity:** `scripts/docs-integrity.mjs` enforces allowlist + no nested folders + retired absence; `docs-reference-integrity.mjs` scans only remaining canon.
- **AGENTS.md:** SSOT table + Documentation layout (binding) rule.
- No program/code behavior changes.

## P126.19 — Conversation diagnostic fidelity (2026-11-05)

- **safeDetails:** stop converting `undefined` into the string `"undefined"` in application log JSON (root cause of empty-looking search fields).
- **Simple Direct:** log `userPreview`, `productMode`, full `searchDecisionDetails` on `simple_direct_search`, and new `simple_direct_exchange` (user text + reply + search hosts/queries).
- **Delivery:** HTTP success marks `clientRendered: awaiting_client_ack`; browser POSTs `/api/diagnostics/client-render` with `requestId` after paint.
- **All Logs:** `shared/REQUEST_INDEX.md`, mode-filtered `exchanges.jsonl`, single `shared/conversations-full.md` (no triplicate identical transcripts).
- Scope: diagnostics only — no change to answer generation.

## P126.18 — CI follow-up after category test layout (2026-11-05)

- Restored test helpers required by `providers-models`: `_sources.mjs`, `_prompts.mjs`, `app-builder-golden.json`.
- Fixed maintained doc path refs in `USER_VALUE_EVALUATION.md` / `USER_VALUE_EXPERT_C122.md` to category suites (docs-reference-integrity).
- Soft-retired npm scripts still invoked by the verification DAG (`test:workspace`, `test:files`, `test:database*`, `test:live`, `test:bx06:api`, `test:ui-smoke`) so missing deleted suites no longer fail the run.
- `test:project` now uses `--import tsx` (appBuilder `.ts` imports); added `test:project-diagnostics` alias to `diagnostics-ops`.

## P126.17 — Category test layout replaces per-patch test files (2026-11-05)

- **Removed** the historical per-patch / fragmented `tests/` set (~120 files).
- **New category suites** (see `docs/TEST_MAP.md`): agents, conversation-simple-direct, search, providers-models, providers-router-policy, providers-fallback, project-mode, project-builder-recovery, diagnostics-ops, security-*, governance-*.
- **AGENTS §6** now binds: no `tests/pNNN-*` files, no `test:pNNN-*` scripts; patch id lives in `test()` titles only.
- `tests/governance-repo.test.mjs` enforces the layout in CI.
- `package.json` `test:core` runs category suites; `docs/verification-manifest.json` paths updated for critical router checks.
- Preserves behavioural suites: model router (`providers-models`), Simple Direct, search decoupling, provider fallback, appBuilder recovery, security redact/headers, workflow pins.

## P126.16 — Remove retired Architectural Test Lab (2026-11-05)

- Deleted dead test route `/architect-lab` and sources `src/ArchitectLab.tsx`, `src/ArchitectShellHeader.tsx`.
- `src/main.tsx` routes only Project Mode (`/project`, `/project-legacy`, `/architect`) or Simple/Expert App shell. Lab lazy import and ErrorBoundary branch removed.
- Removed lab-only CSS (`.architect-lab*`).
- Dropped `test:architect-lab`, lab e2e/contract tests, and their hooks from `test:core` / `test:ui`.
- Updated P119/P121 contracts to assert Lab absence while ProjectMode routing stays intact.
- Does not change Simple, Expert, or Project product behaviour.

## P126.14 — Workflow audit: current-state preflight and assistant reports (2026-11-05)

- Audit of `ci.yml`, `answer-quality-verify.yml`, `search-heuristics.yml` against the current tree. Findings: p126-12/13 were in no workflow; Answer Quality ran manual-only heuristic packs (P125.13) that currently fail (`p125-3`, `p125-4`); its Render probe always exited 2 without a URL; `|| echo` masked live-smoke failures; its PR path filter omitted current files (`simpleDirectConversation`, `keyPool`, `providerMonitor`, ...); two of three workflows produced no report.
- New `scripts/workflow-preflight.mjs` (first step of every workflow): fails on missing referenced files, npm scripts, `paths:` targets, local actions, lost exports, node/`.nvmrc` mismatch, patch/version mismatch, orphaned current-cycle tests.
- Each workflow ends with inline report steps (no new folders, the repository structure is flat): builds `ASSISTANT_SUMMARY.md` + logs, prints to the run summary, uploads an artifact; in Core CI, Answer Quality (offline, live) and Search Heuristics.
- `scripts/diagnostics-summary.mjs`: failed test names, workflow rerun commands (`WORKFLOW_RERUN`), evidence rules (NOT_RUN is not PASS).
- Workflows call npm scripts (`test:answer-quality`, `test:search-heuristics`) instead of hard-coded test lists. `test:core` now includes p126-12, p126-13, p126-14. Live smoke passes current provider secrets, reports NOT_RUN explicitly and no longer swallows failures. Render probe runs only with variable `CAROUSEL_RENDER_URL`, else NOT_RUN. `ci.yml`: concurrency, full history for gitleaks.
- Hosted-run fixes: no composite action (the patch preflight forbids nested folders); Render probe and `docs/RENDER_ENV_CONTRACT.md` expect `BIFORGE_GEMINI_DIRECT_MODE=true`.
- Tests: new `tests/p126-14-workflow-contract.test.mjs`. Regenerated `docs/generated-check-graph.json`. Patch metadata: `126.14`.

## P126.13 — Never leave the user without an answer (2026-11-05)

- Evidence: diagnostics of 2026-11-05 showed Gemini 429s on three keys, both flash-lite models parked for 5 min, search breaker open 15 min, Simple Direct without any alternative provider, Expert throwing "cooling down" before reaching Groq, and an endless manual Retry.
- Pauses: quota/rate-limit cooldowns are at most 60 s (key slot 60 s, model park 30 s, model health 429/quota 60 s, search hard breaker 60 s), because only per-minute quotas are consumed.
- Providers: Simple Direct now falls back to Groq / Cloudflare on any Gemini failure (`generateDirectWithFallback`); Expert reaches the same providers when every Gemini model is cooling down, regardless of call budget, BYOK or attachments (attachments are flagged as unseen). Serper, Groq and Gemini are all used in both modes.
- Search: Serper is skipped only below 3 s remaining (was 8 s against a 9 s deadline, so any slow planner call disabled it). The "skip search when generation is unavailable" idea was dropped: generation is now always attempted through the fallbacks.
- UI: after a request ends without an answer the client retries automatically (4 s, 8 s, 12 s) before leaving the manual Retry button.
- Tests: new `tests/p126-13-provider-fallback.test.mjs`. Patch metadata: `126.13`.

## P126.12 — Simple Direct search coverage, wait, context and system prompt (2026-11-05)

- Search trigger (`server/webSearch.ts`): added election results, winners, seat counts, match scores, currency pairs and price questions (Russian and English) to the deterministic freshness patterns used by the direct route.
- Wait (`server.ts`, `server/simpleDirectConversation.ts`): Simple now waits up to 8.5 s by default (cap 9 s, `SIMPLE_SEARCH_WAIT_MS`) for a search that has a 9 s deadline; a timeout is reported to the model as `SEARCH STATUS: TIMED_OUT` with an instruction to tell the user.
- Context: earlier user turns are passed to the search resolver only for explicit follow-ups (`searchContextForTurn`); self-contained questions are searched as written.
- System prompt: `buildSimpleDirectSystem()` adds today's date (UTC) and forbids claiming that search or internet is unavailable unless the SEARCH STATUS says so.
- Tests: new `tests/p126-12-direct-search-coverage.test.mjs`; updated two existing assertions (TIMED_OUT status, system-instruction call). Patch metadata: `126.12`.

## P126.11 — Preserve terminal AI format error status (2026-11-04)

- Fixed the conversation error boundary so explicit `502 AI_FORMAT` is not normalized to `503`; terminal format failures now return `retryable: false` consistently with `GeminiFormatError`.
- `Retry-After` is emitted only for retryable 429/503 responses; AI format failures receive a truthful format-specific message.
- Strengthened H3 to assert status, error code, terminal retryability and exactly two model calls; added source regression checks.
- Version and lockfile patch metadata: `126.11`.

## P126.10 — Stop recovery after candidate exhaustion (2026-11-04)

- Fixed the remaining pipeline latency defect at its source: conversation recovery no longer replays a model cascade after every configured candidate has failed and entered circuit-breaker cooldown.
- Marked exhausted quota, rate-limit and invalid-format outcomes as non-retryable for the current request. For transient 503/unavailable outcomes, recovery remains enabled but now honours the actual model cooldown via `retryAfterMs` rather than repeatedly polling cooling candidates.
- Bounded the pipeline fixture's conversation-recovery window to 30 seconds so its 35-second HTTP guard can observe the operational response. Updated H3/H6/H6b expectations to the current P125.16 contract (operational error, never a synthetic successful fallback) and added a regression assertion for terminal recovery outcomes.
- No model cascade, quota classification, retry policy for genuinely recoverable transient errors, or product response content was weakened.
- Version and lockfile patch metadata: `126.10`.

## P126.9 — Isolate pipeline Gemini fixtures from CI secrets and SDK backoff (2026-11-04)

- Fixed the remaining `test:pipeline` failures (H3, H6, H6b and I) at the test-harness boundary: child servers now use only the scripted bridge key, clear inherited `GEMINI_API_KEY_1..10` organisation secrets, and disable background candidate probes.
- Added `GEMINI_HTTP_RETRY_ATTEMPTS` as a bounded Gemini SDK client option (1–5). Its default is unset, preserving the production SDK retry policy; pipeline fixtures set it to `1` so HTTP 429/503 scenarios exercise BiForge's own key/model fallback without five SDK-level exponential-backoff attempts first. The fixture HTTP deadline is 35 seconds, just above the server's 30-second total model deadline, so the harness does not abort a request before the server can return its bounded fallback.
- No product response rules, model cascade order, quota policy, or test assertions were weakened. Version and lockfile patch metadata: `126.9`.

## P126.8 — Repair direct-route regression and bound pipeline server harness (2026-11-04)

- Updated the P126.1 key-pool structural regression to locate the complete environment-gated Simple Direct condition, including its Expert and distress exclusions, then verify that the route gate precedes intent planning.
- Hardened the pipeline integration harness: detect child-process exit during readiness, fail with captured startup logs, bound login/API requests, guarantee cleanup on startup failure, and emit per-stage timing so a slow or stuck integration is attributable.
- Preserved all product assertions; no test was skipped and no product timeout was increased.
- Version: `126.8`.

## P126.7 — Align search diagnostics with Simple Direct event (2026-11-04)

- Fixed stale P124.23 structural assertion: the current Simple Direct route records optional search as `simple_direct_search`, not the removed `direct_web_search` event.
- Included `simple_direct_search` in the conversation diagnostic export's SEARCH_DECISIONS section so optional-search outcomes are visible alongside legacy `web_search` records.
- Updated the regression test to assert the current event contract and diagnostic export wiring.
- The separate `test:pipeline` 300-second timeout remains unresolved; logs show 13/14 passing but do not identify the hanging operation. No timeout was hidden or relaxed.
- Version: `126.7`.

## P126.6 — lint:copy allowlist for Simple Direct search triggers (2026-11-04)

- `scripts/lint-copy.mjs`: allowlist `server/simpleDirectConversation.ts` for intentional Cyrillic in explicit-search detection (same class as `intentFlags` / `webSearch`).
- Unblocks `lint:copy`, `test:core` P60 copy-lint assertions, and the compact-ci-artifacts mini-DAG that re-ran lint:copy.
- `test:pipeline` TIMEOUT (300s, 13 pass / 1 cancelled) is recorded as pre-existing flake / environment; not addressed by product logic in this patch.
- Version: `126.6`.

## P126.5 — User-level validation ledger and enablement gate (2026-11-04)

- Delivered C126 §13 “P126.4 User-level validation” as repository patch **P126.5** (P126.4 was the typecheck/gate hotfix).
- Added `docs/C126_USER_LEVEL_VALIDATION.md`: 30-scenario comparative matrix, OBSERVED / INFERRED / NOT_RUN ledger, production/preview checklist, and binding **KEEP GATED** enablement decision.
- Added `tests/p126-5-user-level-validation.test.mjs` (wired into `test:core`): opt-in flag, ledger presence, direct-branch isolation from intent/mode/epistemic stages, Expert isolation, empty-reply rejection.
- Updated p126-1/2/3 structural string matches for the env-gated Simple Direct condition introduced in P126.4.
- `.env.example` documents the flag as opt-in pending live dual-run evidence.
- Live dual-run vs direct Gemini, preview with flag=true, and default production flip: **NOT_RUN**. No production deployment in this patch.
- Version: `126.5`.

## P126.4 — Fix Simple Direct gate, typecheck and CI/render (2026-11-04)

- Gated the P126.1 Simple Direct conversation path on `BIFORGE_GEMINI_DIRECT_MODE=true`. When the flag is unset or false (as in Core CI tests and previous non-direct deployments), the structured conversational pipeline is used again so fake-Gemini tests and existing clients receive the expected JSON shape.
- Restored the missing `normalizeSimpleDirectReply` import in `server.ts` (TS2304).
- Fixed TypeScript narrowing in `resolveOptionalSearch` so `settled.result` is only accessed after a successful non-timeout branch (TS2339).
- These three defects caused typecheck/build failure (Render red) and 503 responses from `/api/conversation` under the test env that forces `BIFORGE_GEMINI_DIRECT_MODE=false` (core/files/pipeline TAP failures).
- Version: `126.4`.

## P126.3 — Conversation reliability and outcome diagnostics (2026-11-04)

- Added request-level Simple telemetry for accepted requests, successful non-empty Gemini generations, key-slot rotations, model-cascade rotations, search failures/degradation, HTTP response completion and interrupted delivery.
- Response completion is deliberately recorded as an HTTP-write outcome, not proof of browser rendering. `clientRendered` and `userVisibleSuccess` remain `not_observed` because no client acknowledgement exists.
- Added P126.3 regression coverage for three-turn history ordering, PDF/image payload forwarding, retry preservation of pending text/files, BYOK isolation, existing key/model carousel usage, distress/SafetyBox and Expert route isolation, and successful/interrupted response lifecycle accounting.
- Existing attachment processing, conversation history compaction, retry UI and SafetyBox remain in place; no Expert/Architect implementation or user-facing UI behaviour was changed.
- Verification status and limits: see `TECHNICAL_REPORT.md`. Live providers, full CI/build, browser rendering and deployed user outcome remain `NOT_RUN`.
- Version: `126.3`.

## P126.2 — Search decoupling and runtime source-policy packaging (2026-11-04)

- Simple now detects explicit search requests and existing automatic freshness candidates without invoking the legacy conversational intent/mode pipeline.
- Optional web search runs as a bounded side operation. A successful result is passed to Gemini as untrusted evidence; failed, unavailable, disabled or timed-out search is represented honestly and never prevents the single direct Gemini generation.
- Search diagnostics record whether lookup was expected, explicit, timed out, the status/provider, source count and the fact that generation continues. No API credentials or raw URLs are added.
- `build:server` now copies `config/source-policy.json` to `dist-server/config/source-policy.json`, matching the compiled `server/sourcePolicy.js` runtime lookup path.
- Added P126.2 search-degradation and production-config-copy tests; added them to `test:core`.
- Local P126.1 + P126.2 focused tests: `PASS` 11/11 using Node 22.16.0 type stripping; changed TypeScript syntax checks and version metadata check: `PASS`. Full Core CI, typecheck, production build, live Serper/Gemini Search, hosted CI, production deployment and user-level outcome: `NOT_RUN`.
- Version: `126.2`.

## P126.1 — Simple Direct Conversation core (2026-11-04)

- Added a dedicated Simple request-shaping module with a short system instruction and natural conversation history.
- The Conversational route now returns directly after one successful Gemini text generation; it bypasses intent/mode planning, Search Planner, quality retry, response audit, and epistemic verification. Expert and distress/SafetyBox turns retain the established path.
- Direct Gemini generation now iterates the configured model order and uses the existing `GeminiKeyPool` for per-model key rotation; BYOK remains isolated and is never replaced with an organisational key.
- Preserved the existing response envelope and attachment processing. Empty Gemini output is treated as a failed generation, not a successful empty reply.
- Added P126.1 tests and included them in `test:core`.
- Live Gemini, attachment-provider integration, hosted CI and production behaviour: `NOT_RUN`.
- Version: `126.1`.

## P125.16 — Conversation recovery without technical fallback (2026-11-04)

- **User-visible defect:** when Gemini timed out or returned 503/429 after the bounded model carousel, the server returned a successful reply with the synthetic text “I saved your situation. The AI model is temporarily unavailable…”, which the UI showed as an agent message.
- **Backend:** conversation path now retries transient model failures inside the same HTTP request (fresh call budget per pass, exponential backoff 1s→30s, wall-clock recovery window default 90s, env `CONVERSATION_RECOVERY_MS`). After recovery is exhausted, returns operational 503/429 with `retryable: true` — never a synthetic agent reply.
- **Frontend:** thinking indicator shows live elapsed time: `Looking at your specific situation… 17s` / `1m 12s` (full request wall time, not a single model pass).
- **Non-goals:** durable job queue, SSE/jobId polling, and survival across server restarts remain future work.
- **Version:** patch `125.16`.

## P125.15 — Fix nationalAuthorities imports (typecheck/build) (2026-11-04)

- **CI/Render red on 125.14:** `server/nationalAuthorities.ts` used `fileURLToPath` and `fs.existsSync` without imports.
- **Fix:** import `existsSync` from `node:fs` and `fileURLToPath` from `node:url`.
- **Version:** patch `125.15`.

## P125.14 — Production search: config path + Zurich place (2026-11-04)

**Root cause (prod 125.13, OBSERVED):** Serper failed with
`ENOENT ... dist-server/config/source-policy.json` — policy path was resolved next to `dist-server/server/`, where `config/` is not copied. Connector returned no result; gemini pool exhausted; place extracted as `Цюрихе посмотри в`.

**Fixes:**
1. `sourcePolicy.ts` / `nationalAuthorities.ts`: resolve `config/*.json` via `process.cwd()` and multiple relative candidates (dev + dist-server).
2. `extractPlaceCandidate`: stop at instruction verbs (`посмотри`, `search`, `look`, …); cap place to a short token group.

**Version:** patch `125.14`.

## P125.13 — Core CI vs manual search-heuristics (2026-11-04)

Owner decision: stop gating every patch on phrase/heuristic routing asserts.

- **`npm run test:core`:** removed phrase/heuristic packs: `universal-followup-regression`, `p124-26`, `p124-28`, `p124-38`, `p125-3`, `p125-4`. Kept product kernel including `p125-1` (query fidelity + source policy).
- **`npm run test:search-heuristics`:** those packs in one command.
- **Workflow `search-heuristics.yml`:** `workflow_dispatch` only — run when debugging routing phrases.
- **Answer Quality workflow:** no longer runs p125-3/4 or p124-28/38 on PR path; points to the manual suite for phrase checks.
- **Version:** patch `125.13`.

## P125.12 — Stop the CI loop: follow-up + multilingual live routing (2026-11-04)

Root causes of remaining `test:core` failures after P125.11 (status/planner precedence fixed):

1. **isSearchFollowup** missed «почему нет результата?» / «no result» style complaints → priorLive thread assert failed even when the gate could open via short-text+priorLiveThread.
2. **LIVE_TOPIC_RE** lacked common non-English temperature forms (`température`, `temperatura`, …) → French weather sample failed the gate.
3. **extractPlaceCandidate** lacked prepositions `à`/`en`/`bei`/… → place missing for FR samples.
4. **preClassifyLiveDataIntent** live-topic guard tightened with the same multilingual temperature tokens so prior-place carry still runs for instruction turns with «температуру».

Tests: priorLive assert also accepts `isPlannerCandidate` for short live-thread complaints.

Version: patch `125.12`.

## P125.11 — CI root-cause: status silence + planner precedence (2026-11-04)

Serious analysis of repeated red Core CI after C125 search changes:

1. **formatSearchStatusBlock:** P125.3 over-emitted NOT_RUN on every non-search turn (`lookupExpected=false`), breaking P-1 (`p124-26`) and polluting prompts. Restored: silent when lookup was not expected; honest NEVER-claim-no-internet status only when lookup **was** expected but failed/skipped/disabled.
2. **buildSearchDecision live-task short-circuit:** Always taking the heuristic live-task path prevented the model planner from seeing dialogue turns (T-2 / `p124-28` failed with empty `seen`). Live-task deterministic path now runs only when **no planner client** is available; with a client, the model planner runs first; on outage/unparsable, fallback still uses `resolveLiveTaskState` / `planFromLiveTask` so entity retention is kept.
3. **Tests:** p125-3 / p125-4 status cases assert expected+skipped, not unexpected turns.
4. **Version:** patch `125.11`.

## P125.10 — Follow-up retention: related CI/assertions and live-task query (2026-11-04)

- **resolveLiveTaskState (from P125.9):** last substantive prior user turn becomes `query` for search follow-ups (not only weather/LIVE patterns).
- **planFromLiveTask:** avoid empty generic `information` when place is known.
- **Tests:** `p124-38` accepts `live_task_followup` as well as `dialogue_reference_fallback` while still requiring prior place in the query; `p125-4` adds cross-domain retention cases (Node LTS, trains, weather).
- **Version:** patch `125.10`.

## P125.9 — Live-task follow-up retains full prior user query (2026-11-04)

- **Bug:** `resolveLiveTaskState` only recovered prior query when the previous turn matched weather/LIVE_TOPIC patterns, so follow-ups like “run another search” after a Node.js LTS question produced a generic plan without “Node”/“LTS”.
- **Fix:** Carry forward the last substantive user turn (not a search-meta follow-up) as `query` / place / weather topic for any about-search follow-up.
- **CI:** Unblocks `universal-followup-regression` retained-entity assertions.
- **Version:** patch `125.9`.

## P125.8 — CI red fix: universal follow-up decisionNote (2026-11-04)

- **test:core:** `tests/universal-followup-regression.test.mjs` accepts `live_task_followup` (P125.4 live-task path) as well as legacy `contextual_followup_fallback` when the model planner is absent or fails.
- **Version:** patch `125.8`.

## P125.7 — CI red fix: typecheck, action pins (2026-11-04)

- **Typecheck / build:server:** `WebSearchResult.plan` includes `sourceCountry` and `dictated` (P125.5 fields), clearing TS2339 in `server/webSearch.ts` and `server.ts`.
- **workflow-action-pins:** `answer-quality-verify.yml` uses the same immutable action SHAs as Core CI (`checkout`, `setup-node`); removed obsolete `actions/download-artifact` from the required pin map (no remaining workflow uses it after CI inventory cleanup).
- **Version:** patch `125.7`.

## P125.6 — CI inventory: four active contours only (2026-11-04)

- **Programme:** `docs/C125_ANSWER_QUALITY_PROGRAMME.md` and `docs/C125_WP3_WORKFLOW_AUDIT.md` record the active inventory: product workflows **`ci.yml`** + **`answer-quality-verify.yml`**; platform **Dependabot** + **CodeQL** (if enabled). Retired product workflows must not be restored; rewrite fresh when needed.
- **Tree:** removed obsolete product workflows from `.github/workflows/` (see Navigator deletion list if remote still has them).
- **Tests:** inventory and handoff contracts updated for the two product workflows only; architect dual-compare workflow assertion inverted (file must stay absent).
- **Version:** patch `125.6`. No runtime product behaviour change beyond CI inventory.

## P125.5 — C125 absolute close-out (remaining gaps + workflow consolidation) (2026-11-04)

- **Item 4 complete:** `plan.sourceCountry` drives Serper `gl` bias (with place country fallback); `sortSourcesByPreferredHosts` + `authorityHostsFor` rank national-authority hosts first after merge in `fetchSerperDigestMulti` / conversation carousel path.
- **Item 8 complete:** conversation pipeline log uses **current** `lastUserText` as `userRequest`; adds plan place/country/sourceCountry/dictated, planner timing fields; diagnostics export already carries `releaseMatchesRepoPackagePatch`.
- **Authority ranking + suite:** tests for preferred-host sort; language-neutral patterns retained.
- **Workflow consolidation:** offline carousel deterministic + render contract probe absorbed into `answer-quality-verify.yml`. Superseded workflow files removed from tree (Navigator must delete on GitHub if still present — see chat deletion list).
- **Version:** patch `125.5`. WP2 O1/IANA still next cycle. Production multi-turn OBSERVED still required for owner “C125 done” (G5); this patch completes **code** scope of the programme.

## P125.4 — C125 close-out: WP3 remaining + unified answer-quality workflow (2026-11-04)

- **WP3 extension remaining items:**
  - Item 2 live-task state: `resolveLiveTaskState` / `planFromLiveTask`; search-about-search turns resolve against stored place/topic/query; wired into `buildSearchDecision` and conversation path.
  - Item 3 dictated query: `extractDictatedQuery` — quoted text after a search/build-query request becomes the plan query (`dictated: true`), not planner rewrite.
  - Item 4 sourceCountry: plan field + `extractSourceCountryConstraint`; versioned `config/national-authorities.json` (global seed, source/date per entry, no hard-coded product default country); `server/nationalAuthorities.ts` load/rank helpers.
  - Item 8 diagnostics fidelity: conversation export header `releaseMatchesRepoPackagePatch`; search decision details include place/topic/sourceCountry/dictated; planner timing section in export.
- **WP3 steps 2–4:** behaviour coverage in `tests/p125-4-answer-quality-suite.test.mjs` (language-neutral patterns × EN/DE/FR/JA × places); regex→behaviour sample for temperature intent; diagnostics export updates; full historical regex migration remains incremental.
- **Unified workflow:** `.github/workflows/answer-quality-verify.yml` — offline suite (P125 + search planner/trigger/source/weather/carousel unit) on PR/schedule; live smoke job opt-in via `workflow_dispatch` + secrets.
- **Locale:** suite always sets place/country explicitly; `WEB_SEARCH_DEFAULT_COUNTRY` remains deployment config only. User-facing languages in fixtures ≥3; provider queries remain English (WP1).
- **WP2:** left as-is (A/B/C on); O1/IANA next cycle per owner.
- **Version:** `125` / patch `125.4`. Live OBSERVED on production release equal to this patch remains required for C125 “done” (owner definition); this delivery provides code, tests and workflow only — production dialogue is Navigator after deploy (G5).
- No UI / entry / `data-testid` changes (G4 N/A).

## P125.3 — C125 WP3 search routing / grounding + workflow audit (2026-11-04)

- **WP3 scope extension (search routing and answer grounding):**
  - Item 1 (single search router): `isPlannerCandidate` / `searchPlannerGate` admit live-data topics (`LIVE_TOPIC_RE`, `needsFreshWebInfo`) and live-thread search follow-ups so the pre-classifier and planner are reachable; plain temperature questions no longer stop at `trigger_not_matched` / `not_freshness_candidate`.
  - Item 2 / follow-ups: `isSearchFollowup` expanded for "one more query", "you always have search", source complaints, dictated-query asks; prior-live-thread short continuations reach the planner.
  - Item 5 (place extraction): `extractPlaceCandidate` strips time/connector phrases ("right now", "в городе") before geocoding-style capture; pre-classifier carries place from dialogue when the current turn names none.
  - Item 6 (honest status): `formatSearchStatusBlock` always emits a NOT_RUN status when search is enabled and the turn was skipped; conversation path injects the block on skipped turns so the model never invents "no search tool".
  - Item 7 (planner timeout): planner `timeoutMs` capped at 3 s (was up to 8 s).
  - Freshness patterns extended for plain temperature / air-temperature questions (RU/EN).
- **WP3 step 1 audit:** `docs/C125_WP3_WORKFLOW_AUDIT.md` — disposition table for the seven workflows and check classes (keep / update). Steps 2–4 of the base audit remain for subsequent owner-reviewed work; user-visible routing fixes take priority (`AGENTS.md` cascade).
- **Tests:** `tests/p125-3-search-routing-grounding.test.mjs` — gate admission, place extraction, follow-up detection, status block, nine-turn dialogue replay assertions, multi-place/language samples. Wired into `test:core`.
- **Version:** product `125`, patch `125.3`. No UI, routes, agent entry points or `data-testid` changed (G4 N/A). No new environment variables. Live hosted CI and live dialogue on a deployed release: `NOT_RUN` until Navigator runs Actions / confirms release equals this patch (G5).

## P125.2 — C125 WP3 scope extension and source-policy group B (2026-11-04)

- **Documentation (`docs/C125_ANSWER_QUALITY_PROGRAMME.md`):** WP3 gains a "scope extension" section: observed failure chain of the 2026-11-04 nine-turn dialogue (release 124.40), eight work items (single search router, live-task state, dictated query, source constraint as a plan field, place extraction, honest status on every turn, planner timeout, diagnostics fidelity), tests and acceptance, and a release check. Evidence section and order section updated; WP2 text updated for group B. Scope text only; no work item is implemented here.
- **Data (`config/source-policy.json`):** group B is enabled by default like groups A and C by owner decision, without IANA reconciliation. Suffixes: `rus`, `moscow`, `tatar`, `xn--p1acf`, `xn--80adxhks`, `xn--d1acj3b`. File version 2. No code change.
- **Tests:** `tests/p125-1-query-fidelity-source-policy.test.mjs` gains one test for group B (match, subdomains, look-alikes, per-group count).
- **Records:** `docs/DECISIONS.md` D-2026-11-04-02 status line, `ROADMAP.md` status line, version `125`, patch `125.2`, lock metadata synchronised.
- No UI, routes, agent entry points or `data-testid` changed (G4 not applicable). No new environment variables. Not a next-session assignment. Validation: see `TECHNICAL_REPORT.md` P125.2; hosted CI and live answer quality `NOT_RUN`.

## P125.1 — C125 WP1 query fidelity and WP2 source policy (2026-11-04)

- **WP1 (`server/queryFidelity.ts`, `server/webSearch.ts`, `server.ts`):** owner rule from section 2 of `docs/C125_ANSWER_QUALITY_PROGRAMME.md`. Up to 20 words: one verbatim translation (one model call, none for Latin text). Longer: k = min(3, ceil(n/30)) short queries of at most 25 words, capped by `WEB_SEARCH_MAX_QUERIES`; deterministic check that names, numbers, months, negations and explicit conditions survive; on a miss the first 25 words are translated verbatim and the missing entities are added as a second query. Constants (20, 25, 3, 30, 32, 1500, 600) live in `QUERY_LIMITS`. A planner or heuristic plan that loses an entity of the user's text is replaced by the faithful build (`ensureEnglishPlan` with `sourceText`). The fixed 500-character and 300-character cuts are replaced by documented bounds (1500 and 600); planner prompts no longer say "max 12 words". A provider query is cut at 32 words. Sanitised log per search: source words, query words, query count, check result, fallback flag (`queryFidelity` in the search decision record).
- **WP2 (`config/source-policy.json`, `server/sourcePolicy.ts`, `server/webSearch.ts`):** versioned data file, validated and loaded at start-up. Group A (`.ru`, `.su`, `.xn--p1ai`, `.by`, `.xn--90ais`) and group C (`rt.com`, `sputnikglobe.com`, `sputniknews.com`, `tass.com`) are applied; group B is `enabled: false` until verified. Matching is host or subdomain in Punycode, never a look-alike suffix. Excluded results are removed from the Serper response before any digest or source is built; excluded hosts are not fetchable (page targets and every redirect hop of the direct fetch share one gate). If nothing remains the status is `no_relevant_data` with reason `source_policy_filtered` and the evidence block says so without claiming missing internet access. Diagnostics carry the dropped count per group, never the text. `BASE_SYSTEM` gets the one-sentence source rule.
- **Tests:** new `tests/p125-1-query-fidelity-source-policy.test.mjs` (14 tests, added to `test:core`). Intentional contract change: the P124.39 fixture used `ria.ru` as an unlisted host and now uses a neutral host. `scripts/lint-copy.mjs`: `server/queryFidelity.ts` joins the user-language allowlist (Cyrillic markers). Version `125`, patch `125.1`, lock metadata synchronised; `docs/generated-check-graph.json` regenerated.
- No UI, routes, agent entry points or `data-testid` changed (G4 not applicable). No new environment variables. Not a next-session assignment. Validation: see `TECHNICAL_REPORT.md` P125.1; hosted CI and live answer quality `NOT_RUN`.

## P124.40 — Documentation: C125 answer-quality programme and source-policy decision (2026-11-04)

- Documentation only; no source, test, route, UI or dependency change.
- New `docs/C125_ANSWER_QUALITY_PROGRAMME.md`: owner-approved scope of cycle C125 with three work packages (query fidelity, Russian and Belarusian source policy, workflow and diagnostics audit), evidence labels, acceptance criteria and open question O1.
- `ROADMAP.md`: C125 scope list. `docs/DECISIONS.md`: D-2026-11-04-01 (answer quality is cycle C125, C124 closes here) and D-2026-11-04-02 (no Russian or Belarusian authority-controlled domains in search evidence; owner decision, planned, not implemented).
- Not a next-session assignment and not `NEXT_PATCH.md` (`AGENTS.md` §4 and §5). G4 not applicable. Validation: see `TECHNICAL_REPORT.md` P124.40; hosted CI `NOT_RUN`.

## P124.39 — Source quality: English queries, trusted-source labels, old results, same-name places (2026-11-04)

- **Evidence (diagnostics export, dialogue of 2026-11-04):** the pre-classifier and fallback plans passed the user's own Russian wording to Serper unchanged (`planSource: heuristic`), so the SERP was Russian-language (ria.ru, lenta.ru, rg.ru, iz.ru among the hosts). Retrieval had no source-quality layer, no age check, and `placeMatched` was true for any text containing the place name (Toledo, Spain matched Toledo, Ohio).
- **Fix (`server/webSearch.ts`, `server.ts`, new `server/sourceTrust.ts`):** `ensureEnglishPlan` translates any plan whose query is not Latin before the provider is called (Latin extra queries kept, non-Latin dropped; a failed translation is reported as `untranslated`). The owner-supplied list of 20 news organisations (agencies, public broadcasters, quality press) is the trusted registry; every snippet carries `[src: host — trusted … | unlisted]` and every fetched page a `TRUST:` line. With freshness `now` results older than 30 days (SERP date, or the date in the URL path) are marked `OLD` and are neither opened nor counted as sources. The evidence block states the rule: an event or claim is confirmed only when at least two independent listed sources report it, otherwise it is unconfirmed and unlisted outlets are named as such; same-named places are never merged; OLD items are background; public or state-funded broadcasters are named as such. Planner prompts ask for the region after a comma for same-named places, and `assessUsability` requires both parts of "City, Region".
- **Tests:** new `tests/p124-39-source-quality.test.mjs` (10 tests, added to `test:core`).
- **Process note:** the working tree already held an unfinished P124.39 draft (`webSearch.ts`, `server.ts`, `server/sourceTrust.ts`) when this patch was prepared; the draft's `sourceTrust.ts` was overwritten and rebuilt against the same call sites (`classifySource`, `sourceLabel`, `independentListedSources`). Review `sourceTrust.ts` before merging.
- No UI, routes, agent entry points or `data-testid` changed (G4 not applicable). No new environment variables.
- Validation: see `TECHNICAL_REPORT.md` P124.39; hosted CI and live answer quality `NOT_RUN`.

## P124.38 — Search coverage for time-sensitive questions, dialogue references and source questions (2026-11-04)

- **Evidence (diagnostics export, dialogue of 2026-11-04):** "exit polls, what are they saying?", "eastern states", "did the election pass without incidents?" and "more detail, what happened in Toledo?" were answered without a search (`trigger_not_matched`, planner reason `not_freshness_candidate`); the model then claimed it had no real-time access or filled in unsourced details. "find this news in US news" was searched as its own bare wording and returned Spanish-Toledo results; "which sources did you use" was searched as a web query and the model invented an explanation.
- **Root causes (source):** the search planner model was reachable only for turns that matched the keyword list (`searchPlannerGate` = `shouldSearchWeb`); short follow-ups continued a live thread only with fixed phrases; `preClassifyLiveDataIntent` searched the raw wording of turns that point back at the dialogue and of meta questions; source lists of earlier replies are not kept in the dialogue, so the model had nothing to quote.
- **Fix (`server/webSearch.ts`, `server.ts`):** `searchPlannerGate` also admits plausible time-sensitive questions (`isTimeSensitiveQuestion`) and short follow-ups after a live turn (`priorLiveThread`); the planner still decides search or no search, and personal text, attachments, distress, CRISIS, DOCUMENT and explicit-only deployments stay excluded. A prior time-sensitive question now counts as a live task in `hasRecentSearchIntent`. Meta questions about the assistant's own sources (`isAssistantMetaQuestion`) are never searched and get an honest status block (`formatSourceQuestionBlock`). Turns that refer to the dialogue (`refersToDialogue`) skip the pre-classifier shortcut and, if the planner is unavailable, are searched with the prior task.
- **Tests:** new `tests/p124-38-search-trigger-coverage.test.mjs` (added to `test:core`).
- No UI, routes, agent entry points or `data-testid` changed (G4 not applicable). No new environment variables.
- Validation: see `TECHNICAL_REPORT.md` P124.38; hosted CI and live answer quality `NOT_RUN`.

## P124.37 — CI red fixes for 124.36: Architect navigation contract, self-contained search follow-ups (2026-11-04)

- **CI fix (`test:core`, `tests/p119-agent-boundaries.test.mjs`, "P121.0.49"):** the test required exactly one `window.location.href = '` in `src/App.tsx`; P124.36 intentionally added two more Architect shortcuts (chat header, More menu). The contract is now "at least one navigation, and every navigation targets `/project`", which still fails on any other target.
- **CI fix (`test:web`, `tests/web-and-epistemics.test.mjs`, "explicit search follow-ups..."):** the P124.35 prior-task branch of `contextualizeSearchText` ran before the existing "follow-up already names the place and the measurement" shortcut, so such a follow-up was searched as `<previous task> <follow-up words>` (duplicated place, leaked instruction words). The shortcut now runs first in `server/webSearch.ts`; the test gains an English, place-neutral assertion.
- No UI, routes, agent entry points or `data-testid` changed (G4 not applicable).
- Validation: see `TECHNICAL_REPORT.md` P124.37; hosted CI `NOT_RUN` from this archive.

## P124.36 — Cross-mode header and More-menu parity (2026-11-03)

- Conversational and Expert now expose decision brief and delete-dialogue actions under the same context-aware conditions; these actions are no longer hidden solely because the user is in Conversational mode.
- The chat header exposes an Architect workspace shortcut when Architect is enabled.
- Architect's top bar now includes New and History shortcuts. They route to the shared conversation workspace with explicit one-shot session flags; New creates a fresh conversation and History opens the existing history panel.
- Architect More now exposes a route to the shared conversation workspace for import/export, saved texts and AI-key management. Existing Architect diagnostics, Drive save, guide and sign-out actions remain intact.
- Added a menu parity regression suite. Targeted test: 4/4 PASS. Full typecheck, build, browser E2E, hosted CI and live UI checks are NOT_RUN in this environment.

## P124.35 — Cross-domain context recovery and evidence relevance (2026-11-03)

- Generalized follow-up resolution across unrelated information domains. Search continuation carries forward only the immediately preceding user task when that turn represents a recent/live lookup; unrelated topic changes do not inherit stale entities.
- Deterministic planner fallback now returns a self-contained contextual search plan when the search-planner model is absent or fails, while preserving personal-data exclusion.
- Retrieval usability is no longer based on the presence of a number as a universal quality signal. It checks query/topic and named-place relevance; numeric evidence is required only for queries that request numeric/time/measurement data.
- Added a cross-domain regression corpus covering software releases, travel schedules, product availability, public policy, business research, and one weather case. It checks context and evidence invariants rather than fixed answer wording or domain-specific output.
- Tests: 91/91 targeted retrieval, planner, key-pool, carousel, diagnostics and cross-domain regression checks PASS using Node 22 `--experimental-transform-types`. Documentation integrity, references, inventories, generated graphs, API route coverage, architecture boundaries and version metadata checks PASS. Normal npm CI/typecheck/build, hosted CI, live providers and deployed user outcomes remain NOT_RUN; `npm ci` timed out in this sandbox.
- No UI, routes, agent entry points or `data-testid` changed.

## P124.34 — CI red fixes for 124.33: probe import side effect, pre-classifier scope (2026-11-03)

- **CI fix (run 41688456448, `test:carousel-unit`):** `scripts/carousel-render-probe.mjs` ran the network probe at import time, so `tests/p123-carousel-workflow.test.mjs` importing `RENDER_ENV_RUNTIME_KEYS` hit `process.exit(2)` (`CAROUSEL_RENDER_URL` empty). The probe body now lives in `runProbe()` and runs only when the file is executed directly; `node scripts/carousel-render-probe.mjs` (workflow, `npm run carousel:render`) behaves as before.
- **CI fix (run 41688456448, `test:core`, `tests/p124-28-search-planner.test.mjs`):** the 124.33 `preClassifyLiveDataIntent` shortcut bypassed the planner for any text containing a bare time word (`tomorrow`, `today`, `current`), so "I am afraid of the exam tomorrow" became a web search, and for text about a private person or with personal data ("news about my friend"), which skipped the personal-data rule. The shortcut now requires a live-data topic (weather, forecast, temperature, news, score, price, exchange rate, traffic, outage) and defers to the planner for personal data, for a private person named by relation, and for bare time words. Cyrillic word boundaries in the topic pattern were also fixed (`\b` never matches next to Cyrillic).
- Tests: `tests/p124-28-search-planner.test.mjs` gains a pre-classifier regression test (live topics shortcut; feelings, bare time words, private persons, personal data and every negative fixture do not). No UI, routes or `data-testid` changed (G4 not applicable).
- Validation: see `TECHNICAL_REPORT.md` P124.34; hosted CI `NOT_RUN` from this archive.

## P124.33 — Green carousel CI, latency pre-classifier, robustness (2026-11-03)

- **P0 (carousel green):** Shared `RENDER_ENV_RUNTIME_KEYS` table drives the Render probe and the unit-workflow test (no more literal `WEB_SEARCH_MAX_QUERIES` mismatch). Contract mismatches still exit 1; live health (cooldown, quotaHit, circuit, source health) is advisory only and no longer fails the workflow. `MODEL_CASCADE_LIGHT` contract order is `gemini-3.5-flash-lite,gemini-3.1-flash-lite` (faster model first). Live smoke passes when ≥1 sample per model succeeds and logs a redacted Groq error body. Carousel unit-workflow is in the Core CI DAG (`test:carousel-unit`).
- **CI red fixes:** Zod 4 `taskPackageSchema.limits.default` and `z.record(z.string(), z.unknown())` in project routes; English-only `server/keepAlive.ts` and diagnostic report (E9 / lint:copy Cyrillic).
- **P1 (latency):** Planner default timeout 3 s (was 8 s). Deterministic `preClassifyLiveDataIntent` skips the model planner for weather/news/prices/scores/now intents. Search plan builder timeout also 3 s; weather connector budget capped at 6 s in the combined path.
- **P2 (robustness):** Abort-listener cleanup in `modelRateLimit` wait path so shared request signals do not accumulate listeners (E1).
- Validation: local typecheck and targeted unit tests; full hosted CI NOT_RUN from this archive.


## P124.32 — CI truthfulness, isolated live samples and frozen Render baseline (2026-11-03)

- Fixed two stale source-contract tests: the Gemini direct-mode test now accounts for the sanitized runtime-config field, and the planner test asserts the deadline-aware `plannerEligible` gate introduced in P124.31.
- Fixed `Model Carousel — Routing, Health and Live Smoke` shell pipelines to use `set -o pipefail`; previously `tee` could return success while the deterministic verifier had failed, making the workflow appear green incorrectly.
- Isolated each live Gemini smoke sample with a fresh key-pool state. A timeout/cooldown from one sample can no longer turn subsequent samples into misleading zero-millisecond `blocked` results; each configured model/sample is measured independently.
- Aligned ops-probe fallback values for `WEB_SEARCH_MAX_QUERIES` and `WEB_SEARCH_MAX_PAGES` with the frozen Production baseline (2 and 2).
- Expanded `docs/RENDER_ENV_CONTRACT.md` with the complete non-secret Production baseline and the rule that future patches must update docs, runtime diagnostics, and Render probes together.
- Validation: pending full CI and live provider rerun. Live Gemini latency cannot be inferred from deterministic tests.

## P124.31 — Bounded model latency and full carousel diagnostics (2026-11-03)

- Runtime now clamps `LLM_CALL_TIMEOUT_MS` to at most 12 s, `LLM_TOTAL_DEADLINE_MS` to at most 30 s, and `MAX_MODEL_CALLS` to at most 3. Stricter operator values remain respected. This makes stale permissive Render values ineffective rather than allowing 20 s × repeated calls / 70 s request budgets.
- The conversational Gemini cascade now makes one pass over the configured model candidates. It no longer repeats a full second pass over models that already timed out or failed transiently; existing model-to-model and external fallback behaviour remains available within the request budget. The 30 s deadline is now shared across the full conversational request (including the search/planner preparation phase), and the model-start queue refuses waits longer than the remaining request budget without consuming a reserved slot, and rechecks the deadline before any provider call starts.
- Restricted P124.28's LLM Search Planner to freshness candidates and explicit search follow-ups. Ordinary messages no longer pay for a planner model call before the application decides to skip search. Search diagnostics now report planner duration plus each search-provider and weather-connector latency.
- Removed the transient backoff sleep when moving to a different configured model candidate; the failing model is marked unhealthy and the next candidate/fallback is attempted immediately.
- Added structured `llm_call_start` / `llm_call_end` events and an effective latency policy event, including per-call latency, timeout status, stage, model, attempt, and remaining request budget (no prompt or secret values).
- Added public, sanitized `GET /health/runtime-config` for non-secret runtime settings and Render-vs-repository comparison. It reports effective model budgets, model cascades, search configuration, feature switches, worker poll interval, and credential-presence booleans only.
- Rebuilt `Model Carousel — Routing, Health and Live Smoke`: deterministic latency/planner/search-carousel tests, 2 samples per configured light model, optional Groq fallback probe, isolated Serper/Gemini Search/Jina and optional weather smoke, latency bands and aggregate stats, sanitized source/config probe, and public Render `/health`, `/api/health`, `/ready`, `/health/runtime-config` probe. All live provider calls remain opt-in.
- Tests added: `tests/p124-31-llm-latency-config.test.mjs`; core health test checks runtime config and asserts no secret variable names are exposed. Live provider latency and deployed Render health remain `NOT_RUN` until workflow execution.

## P124.30 — Search provider chain, circuit breaker, separate search budgets (2026-11-03)

- Work package P124.30 of `docs/WEB_SEARCH_REMEDIATION.md` section 8; patch 124.30 (`package.json`). Live evidence `NOT_RUN`.
- `server/searchCarousel.ts` (new, pure): `SEARCH_CAROUSEL` is now read. Comma list of `connector`, `serper`, `gemini`, `serp2`; unset keeps the legacy behaviour (`connector,serper,gemini` when a Serper key is set, `WEB_SEARCH_PROVIDER` still narrows it). First provider with `used`/`used_weak` wins; `no_relevant_data`, `no_grounding` and `failed` fall through; the best attempt is returned otherwise; nothing runnable gives `failed` with `all_providers_unavailable[:quota]` (never a "no internet" claim, A5).
- Circuit breaker per provider: three soft failures open it for 60 s; 401/402/403/429 or quota errors open it for 15 min; after the cooldown exactly one trial call is let through. Empty results are not faults.
- Separate search budgets: `SEARCH_DAILY_CAP_SERPER`, `SEARCH_DAILY_CAP_GEMINI`, `SEARCH_DAILY_CAP_SERP2` (UTC day, unset = unlimited; Serper is charged per sub-query). Gemini `googleSearch` is step one of the two-step flow (digest), step two is the pipeline's generation call; it no longer increments the generation counter or checks `DAILY_CALL_CAP`. BYOK calls are not charged.
- Connector (P124.29) is merged into every provider result for the first query, so its evidence counts for the usability check and survives a total provider failure.
- `server.ts`: `runConversationWebSearch` builds one plan and runs the chain; the log record carries the chain, carousel order, breaker and budget snapshots. Direct mode is untouched.
- **`serp2` has no adapter:** provider name and variable are still to be supplied by the owner (decision 5); the slot reports `not_configured`. Rates and crypto connectors are not built (marked "if approved").
- Tests: `tests/p124-30-search-carousel.test.mjs` (in `test:core`). `docs/generated-module-map.json` regenerated; `.env.example` extended. No UI, routes or `data-testid` changed (G4 not applicable).

## P124.29 — Gated weather connector and result cache (2026-11-03)

- Closes R-7 of `docs/WEB_SEARCH_REMEDIATION.md` where enabled; patch 124.29 (`package.json`). Live evidence `NOT_RUN`.
- `server/weatherConnector.ts` (new): Open-Meteo geocoding (ISO country from the plan filters candidates; same-name alternatives named), Open-Meteo forecast and MET Norway locationforecast fetched in parallel-tolerant fashion (one may fail), seven-day daily min/max, model time (`observedAt`), units converted from the plan country, discrepancy of 2 C or more named, attribution line, data labelled as model output. In-memory cache: weather and geocoding 10 minutes, failures never cached.
- `server/webSearch.ts`: `planAndSearchSerper` starts the connector in parallel with the SERP search only when `WEATHER_CONNECTOR_ENABLED=true` and the plan has a place and weather wording; `combineWeatherWithSearch` puts connector evidence first and merges it with the SERP digest (a failed SERP leaves the connector evidence; a failed connector changes nothing).
- Off by default; `WEATHER_CONNECTOR_ENABLED=true` is the deployment's declaration of non-commercial use (owner decision 4). `.env.example` now also lists `WEB_SEARCH_PLANNER` and `WEB_SEARCH_DEFAULT_COUNTRY`. `docs/generated-module-map.json` regenerated.
- Tests: `tests/p124-29-weather-connector.test.mjs` (in `test:core`). No UI, routes or `data-testid` changed (G4 not applicable).

## P124.28 — Search planner over the dialogue; key-ownership fact (2026-11-03)

- Closes T-1 and T-2 of `docs/WEB_SEARCH_REMEDIATION.md` in code; patch 124.28 (`package.json`). Live evidence `NOT_RUN`.
- `server/webSearch.ts`: `buildSearchDecision` makes one JSON call over the last turns and returns need (`search`), instruction-free `query` plus up to two extra queries, place, ISO country, topic and freshness. `parseSearchDecision` rejects malformed output; `hasPersonalData` drops any query with an e-mail, long digit run or IBAN-like code (no search). `searchPlannerGate` applies the distress / CRISIS / DOCUMENT / attachment / explicit-mode gates before the planner sees text. Every fallback to the regular expressions records `decisionNote` (`no_client`, `decision_unparsable`, `decision_timeout`, `decision_error:`). `WEB_SEARCH_PLANNER=false` disables the planner.
- `server.ts`: the pipeline asks the planner first; an explicit user request to search still forces a search; the plan goes to `planAndSearchSerper` (no second plan call) and the extra queries to `fetchSerperDigestMulti`; decision source and note enter the persistent search log.
- Documentation: owner fact added. The ten `GEMINI_API_KEY` keys belong to ten different Google projects owned by ten different scientists of one organization; the same holds for any future key carousel of another provider. Places: `docs/WEB_SEARCH_REMEDIATION.md` (K-1 row, section 5, decision 9), `docs/DECISIONS.md` D-2026-11-03-03, `docs/SECURITY_AND_PRIVACY.md`, comment in `server/geminiKeyPool.ts`.
- Tests: `tests/p124-28-search-planner.test.mjs` (in `test:core`), fixtures `tests/search-decision-sets.json`. No UI, routes or `data-testid` changed (G4 not applicable).
- CI fix (run 41632546453): `tests/files.test.mjs` and `tests/pipeline.test.mjs` count fake-Gemini calls per turn, and the planner adds one call; their test servers now set `WEB_SEARCH_PLANNER=false`. Planner behaviour stays covered by `tests/p124-28-search-planner.test.mjs`. Production default (planner on) is unchanged, so each eligible message there costs one extra Gemini call.

## P124.27 — Single Gemini key pool, verifier opt-in, pipeline as default path, locale rule (2026-11-03)

- Closes K-2, K-3, K-4, K-5 (label), E-1, A-1 of `docs/WEB_SEARCH_REMEDIATION.md`; patch 124.27. K-1 (shared Google project) stays an owner action; the pool only reacts to it.
- `server/geminiKeyPool.ts` (new): one pool for every Gemini call. Cooldown per key and model (quota 5 min, transient 30 s) and per key for auth errors (1 h); quota on three distinct keys of one model within a minute parks the model (`sharedQuotaSuspected`), so a shared quota stops burning all ten keys. `callWithKeyPool` rotates only on quota/auth/5xx and rethrows other errors unchanged; `createPooledClient` gives helper calls the same rotation plus fallback models (K-3). Pool snapshot has slot numbers only.
- `server.ts`: `generate()` rotates keys per model and reports a model failed only after its keys are used up (previously one key, model parked for 30 minutes after the first 429); the search plan and Gemini grounding use the pooled client; rotations are logged as persistent `gemini_pool_rotated` warnings. A deployment with only numbered keys (`GEMINI_API_KEY_1…`) now works too. BYOK bypasses the pool.
- Pipeline is the default: direct mode runs only with `BIFORGE_GEMINI_DIRECT_MODE=true` (was: unless `false`). Direct code is neither removed nor changed otherwise (decision 3).
- Verifier opt-in (E-1): `EPISTEMIC_VERIFIER_ENABLED=true` required; a Groq key alone no longer sends user/answer text to Groq.
- K-4: when a lite model synthesises two or more sources, the response meta carries `synthesis_on_lite_model` and an application-log event `lite_model_synthesis` is written.
- Locale rule (owner): `docs/DECISIONS.md` D-2026-11-03-02, `AGENTS.md` §1, remediation doc decision 8. Code: optional `WEB_SEARCH_DEFAULT_COUNTRY` (configuration) feeds `gl` and units only when no place is named; nothing is hard-coded to one country.
- Tests: `tests/p124-27-key-pool.test.mjs` (in `test:core`); `tests/gemini-direct-passthrough-p124-17.test.mjs` follows the new direct-mode condition. No UI, routes, `data-testid` changed (G4 not applicable). Live Gemini/Serper, hosted CI and acceptance A5 `NOT_RUN`.

## P124.26 — Query plan, country-aware locale, usability check, honest search status (2026-11-03)

- Closes R-3, R-4, R-6, P-1, P-2, P-3, T-3 (T-2 partly; planner over dialogue is P124.28) of `docs/WEB_SEARCH_REMEDIATION.md`. Patch 124.26 (`package.json`).
- `server/webSearch.ts`: `buildSearchPlan` produces an instruction-free English query plus place, ISO country and topic (one small model call; deterministic `stripInstructionWords` fallback). Every fallback records `planNote` (`no_client`, `plan_timeout`, `plan_error:…`, `plan_unparsable`, `untranslated`), so nothing degrades silently (R-3, K-5 label). `serperLocale(query, country)` sets `gl` from the plan country (default `us` when unknown); `unitsForCountry` feeds the prompt (R-4). No country, city or host lists.
- `searchWithUsability` / `assessUsability` (deterministic, no model call): a retrieved digest is `used`, `used_weak` (no number, or place only partly covered) or `no_relevant_data` (requested place absent / nothing usable); one retry with a different query (`retryQueryFor`), the better merged result wins (R-6). `planAndSearchSerper` is the shared Serper path.
- `formatSearchBlock`: the six topic-specific rules are replaced by a general evidence/provenance contract (what/when/observed vs forecast, attribution by site name, disagreement shown, missing fields named) with `SEARCH STATUS` and `PLACE SEARCHED`/units (P-2, I-16). `formatSearchStatusBlock` tells the model why no live data exists (disabled / not configured / quota / failed / no relevant data) and forbids claiming it has no internet access (P-1).
- `hasRecentSearchIntent` is the single definition used by all three `server.ts` call sites; `isSearchFollowup` gains "I am asking you to search" shapes and an instruction-only follow-up searches the previous topic (T-3, T-2).
- `server.ts`: pipeline search uses `planAndSearchSerper`; `used_weak` is injected like `used`; failed/no-data/disabled turns with an expected lookup get the status block; search-decision log records country, plan source, usability. Direct mode (non-default) keeps its own search code apart from the shared follow-up definition.
- Tests: new `tests/p124-26-query-status.test.mjs` (in `test:core`); `tests/web-and-epistemics.test.mjs` updated where it asserted the replaced weather-specific block text.
- No UI, routes, or `data-testid` changed (G4 not applicable). Live Serper/Gemini, hosted CI and acceptance A1/A2/A5 `NOT_RUN`.

## P124.25 (retrieval integrity) — Fair digest budget, snippets kept, usable page selection (2026-11-03)

- Same patch number 124.25 as the entry below (owner decision, keeps the section 8 numbering). Closes R-1, R-2, R-5 of `docs/WEB_SEARCH_REMEDIATION.md`.
- `server/webSearch.ts`: `mergeWebSearchResults` splits the 5000-character budget fairly between sub-queries (`fairDigestShares`, cut at line/sentence boundary) instead of truncating the concatenation, so later sub-queries are no longer dropped (R-1). `digestFromPageExtracts` keeps snippets/answerBox as a bounded `SEARCH SNIPPETS` block next to page bodies (R-2).
- Page selection (R-5): `pickUrlsToFetch` skips home pages (`isHomePageUrl`), skips URLs already opened by a sibling sub-query (shared `claimed` set in `fetchSerperDigestMulti`), and accepts an optional `country`; sources with a different ccTLD are dropped (`sourceCountry`; generic TLDs stay). `weather.gov`/`noaa.gov` removed from the global preferred hosts. No country or host lists added; the `country` value is supplied by the geocoder in P124.26 (until then no country filtering).
- Jina Reader: `JINA_API_KEY` is sent as a bearer header when set; `JINA_READER_BASE_URL` is honoured only if https. `JINA_API_KEY` added to `SECRET_ENV_NAMES` (`server/redact.ts`).
- Tests: `tests/p124-25-retrieval-integrity.test.mjs` (in `test:core`). No UI, routes, or prompts changed (G4 not applicable).
- Live Serper/Jina/Gemini and hosted CI `NOT_RUN`. Not done here (other patches): query/locale (P124.26), key pool (P124.27), usability check (P124.26).

## P124.25 — Emergency screen ignores benign ResizeObserver notices (2026-11-03)

- Owner screenshot (Chrome/Android, 10:40): the critical-error screen appeared for `ResizeObserver loop completed with undelivered notifications`, a harmless browser notice about a deferred layout measurement, not an application failure.
- `src/emergencyDiagnostics.ts`: new `isBenignBrowserNotice`; the `error` handler returns early for `ResizeObserver loop …` messages (neither logged nor shown). Resource errors, other window errors, and unhandled rejections behave as before.
- Tests: `tests/p124-25-emergency-benign.test.mjs` (in `test:core`). Version/patch 124.25. The retrieval-integrity work keeps its scope and takes the next free patch number.
- **G4 statement:** the emergency screen is a fallback surface; no `data-testid`, route, mounting, or completion flow changed. Real errors still replace the root with the emergency screen, so `tests/p121-emergency-screen.test.mjs` and existing e2e are unaffected. Live browser re-check `NOT_RUN` (Navigator: reload the site on the tablet; the screen must not appear on idle load).

## P124.24 — Conversation diagnostic log, configuration snapshot, restart reasons (2026-11-03)

- `server/conversationDiagnostics.ts`: `GET /api/diagnostics/session-log` (Simple/Expert header button) now returns a conversation-oriented log instead of the Project Mode log: version/patch/commit, build stamp, process and memory, boot history with `previousShutdown`, configuration snapshot, set-but-unused variable names, search decisions, conversation responses, warnings/errors, conversation HTTP. Project Mode keeps `compactSessionLog` on its own route (item 1).
- `server/diagnosticsConfig.ts`: configuration snapshot under the owner secret rule: non-secret values in full; secrets only as `set / length / 8-hex SHA-256 fingerprint`, no partial key material (item 5). Unused-variable scan by name (numbered slots such as `GEMINI_API_KEY_3` count via their base name); reported `NOT_VERIFIED` when source files are absent at runtime.
- `scripts/write-build-stamp.mjs` (run first in `npm run build`; output `build-stamp.json`, git-ignored): the log compares the build-stamp commit with the runtime commit (`MATCH`/`MISMATCH`/`UNKNOWN`/`NO_STAMP`) (item 3).
- `server/processLifecycle.ts`: heartbeat record in the OS temp directory, graceful (SIGTERM/SIGINT), crash (`uncaughtExceptionMonitor`), and exit reasons; the next boot classifies the previous stop (`graceful:*`, `crash:*`, `oom_suspected`, `killed_without_record`, `no_record`). `process_boot` now carries `previousShutdown`, uptime, RSS, heap, container memory limit, commit (item 8). Listeners are observers and do not change Node's exit behaviour.
- Tests: `tests/p124-24-diagnostics.test.mjs` (in `test:core`). Version/patch 124.24.
- **G4 statement:** no UI file changed. The header log button, its `fetch('/api/diagnostics/session-log')`, and all `data-testid`s are untouched; only the server payload differs, so existing browser e2e reach the same completion surfaces. The route stays behind global API authentication.
- Live deployment, hosted CI, and a real restart-reason observation `NOT_RUN`. The restart cause itself is not yet known; this patch only records evidence.

## P124.23 — Number gate cannot crash answers; search decisions persisted (2026-11-03)

- `src/numberValidator.ts`: `inputHasPercentValue` strips the sign and accepts digits only, so values such as `+8` no longer produce `SyntaxError: Nothing to repeat` (V-1). New `safeValidateNumbers` wraps the diagnostic gate; an exception is logged as `number_validator_error` (warn) and the answer is kept. `server.ts` uses it at both call sites.
- `server/webSearch.ts`: `mergeWebSearchResults` records `diagnostics` (characters per sub-query, characters before budget, dropped by budget); new `searchDecisionDetails` builds a secret-free record (provider, status, reason, queries, source hosts only, counts).
- `server.ts`: persistent `web_search` and `direct_web_search` application-log events (previously console-only), including gate skips (`search_disabled`, `trigger_not_matched`, `blocked_distress`, `blocked_attachments`) and exceptions; `conversation_response_pipeline` now carries `searchReason` (O-1).
- Tests: `tests/p124-23-search-integrity.test.mjs` (added to `test:core`). Version/patch 124.23.
- No UI, routes, or prompts changed (G4 not applicable). Live Serper/Gemini and hosted CI `NOT_RUN`.

## P124.22 — Web-search live-data defect: audit, decisions, and work programme (2026-11-03)

- Documentation-only patch; no runtime, UI, or test code changed. Product version 124, patch 124.22 (patch identity follows `AGENTS.md`: `.1`–`.99`, no `.0` component).
- Added `docs/WEB_SEARCH_REMEDIATION.md`: audit of why live-data questions fail (retrieval, trigger, provider/key, answer-layer, validator, observability findings), the owner-reported items with verified facts, confirmed hosting configuration (names and non-secret values only), owner decisions of 2026-11-03, recommendations, the P124.23–P124.31 work programme, manual actions, acceptance criteria, and open questions.
- `docs/DECISIONS.md`: recorded D-2026-11-03-01. `ROADMAP.md`: added the owner-approved remediation work programme with unchecked items. `docs/SECURITY_AND_PRIVACY.md`: recorded the diagnostics secret rule and planned outbound data recipients. `docs/TESTING_AND_ACCEPTANCE.md` and `docs/USER_VALUE_EVALUATION.md`: recorded live-search acceptance criteria and the evidence state.
- CI repair (same patch): `docs/biforge-web-search-analysis.md` was fully translated into English (dialogues included) because `lint:copy` rejects Cyrillic in maintained repo artifacts. It is retained as auxiliary, non-governing material for cycle C124 with an explicit status banner; `docs/WEB_SEARCH_REMEDIATION.md` and `docs/DECISIONS.md` remain authoritative.
- Verification: documentation integrity and version checks listed in `TECHNICAL_REPORT.md`; live search, hosted CI, and deployment NOT_RUN.

## P124.21 — Reliable search follow-ups and softened numeric gate (2026-11-02)

- Direct Conversational mode now runs Serper before Gemini when search is expected, translates contextualized queries to English, injects retrieved evidence into the prompt, and falls back to Gemini Google Search only when Serper did not return usable evidence.
- Explicit web-search intent carries into recognized follow-up turns (e.g. asking for other sites or a missing temperature); weather searches add focused current-temperature queries.
- Numeric provenance violations are logged but no longer reject otherwise valid model or external-fallback responses.
- Verification: offline targeted tests/typecheck NOT_RUN in this environment (dependencies absent); live search NOT_RUN.

## P124.20 — Key rotation in direct Gemini mode (2026-11-02)

- The direct Conversational call now tries up to 3 keys from the organisational pool (`GEMINI_API_KEY`, `GEMINI_API_KEY_1…10`) when a key returns quota (429), auth (401/403) or 5xx errors. A failed key is cooled down (5 min; 30 s for 5xx) via the shared `KeyPoolState`.
- Timeouts and other errors are not rotated; a request-level BYOK key is used alone. Still one successful Gemini call, no provider fallback, reply text unchanged.
- Added `classifyKeyError` (`server/keyPool.ts`); logs and meta report `keySlot`/`keyAttempts` (slot number only, never key material).
- Verification: source-level and classifier tests run locally; hosted CI and live rotation NOT_RUN.

## P124.19 — Google Search grounding restored in direct Gemini mode (2026-11-02)

- The direct Conversational path now passes `tools: [googleSearchToolForModel(model)]` to its single `generateContent` call (unless `ENABLE_WEB_SEARCH` is off), so Gemini can ground answers in live Google Search results.
- Removed the prompt rule forbidding live-data claims; the prompt now asks for Google Search on time-sensitive facts.
- Sources and queries from `groundingMetadata` are returned as `data.sources`, logged (`searchInvoked`, `searchQueries`, `sourceCount`) and reported in meta `search` (`used` / `enabled_not_used` / `disabled`). Reply text is still returned verbatim.
- Verification: source-level test updated; hosted CI and live Gemini call NOT_RUN.

## P124.18 — legacy-pipeline tests pinned to the legacy path (2026-11-02)

- Fixed the three CI failures (`tests/core.test.mjs`, `tests/files.test.mjs`, `tests/pipeline.test.mjs`): since P124.17 the Conversational endpoint defaults to direct Gemini pass-through, so tests that verify the structured pipeline (service-field scrubbing, attachment notes, conversation mode meta) received raw model text.
- These tests now spawn the server with `BIFORGE_GEMINI_DIRECT_MODE=false`. No runtime behavior changed; the direct mode remains covered by `tests/gemini-direct-passthrough-p124-17.test.mjs`.
- Verification: `test:core`, `test:files`, `test:pipeline` run locally PASS; full hosted CI NOT_RUN.

## P124.17 — Direct Gemini pass-through

- Added a controlled Conversational path that makes one direct Gemini text-generation call and returns the exact response text without application rewriting.
- Disabled web search, Serper, alternate-provider fallback, structured JSON parsing, retry, and response sanitization on this path.
- Added SHA-256 equality evidence and request-level provenance logging.
- `BIFORGE_GEMINI_DIRECT_MODE` defaults to enabled; set it to `false` only to restore the legacy pipeline.

## P124.16 — align legacy diagnostics contract test with full-content capture (2026-11-02)

- Updated the P92 diagnostics contract test: it no longer requires user prompts and conversation bodies to be omitted, which conflicts with the single-user diagnostic capture policy introduced in P124.0.15.
- The test now asserts that conversation evidence markers are present and credential-like fields remain redacted.
- No runtime behavior changed. Patch metadata advanced to `124.0.16`.
- Verification: targeted diagnostics test and full hosted CI are NOT_RUN in this assembly; rerun `npm run test:project-diagnostics` and the complete Core CI workflow.

## P124.15 — Simple and Expert diagnostic access and response-pipeline telemetry (2026-11-02)

- Added `More → Diagnostic log` to the shared Simple/Expert header, with an on-screen bounded log viewer, copy, and refresh actions.
- Added an authenticated shared diagnostic endpoint so the feature works independently of Project Mode.
- Added privacy-preserving Conversational pipeline telemetry: request correlation ID, provider/model metadata when available, model-reply and visible-reply character counts, whether sanitization changed the reply, search status/source count, retry metadata, and fallback error code. No prompt, user text, model response body, credentials, or cookies are logged.
- Extended compact session logs with recent conversation pipeline events and matching conversational HTTP requests, so unrelated download operations do not hide the relevant agent evidence.
- Added a source contract test for menu exposure and authentication ordering.
- This patch improves diagnostic access and evidence only. It does not change model instructions, response filtering, search routing, or answer-generation behavior; those require a separate evidence-led fix.

## P124.14 — patch preflight recognizes the GitHub configuration directory (2026-11-02)

- Fixed the real-repository preflight false positive for `.github/dependabot.yml`: `.github` is now an explicitly supported top-level repository directory, while nested paths remain restricted to the existing `.github/workflows/**` allowance.
- Extended the clean-patch preflight fixture to cover the Dependabot configuration and retained a negative test for unsupported nested `.github` directories.
- No application runtime behavior, API contract, workflow execution policy, or product requirement changed.
- Verification against the supplied hosted CI evidence: the only failing test was `tests/models.test.mjs` preflight rejecting `.github/dependabot.yml`; the second reported failure was the same assertion repeated in `PATCH_EVIDENCE.md`.

## P124.13 — CI regression and browser workspace crypto repair (2026-11-02)

- Updated the C124 instruction-inventory test to follow the current split agent-routing/conversational modules instead of requiring the retired `server.ts` prompt owner.
- Aligned patch-pack summary tests with the repository's English-only maintained-artifact policy and the actual `replace / add / delete` output contract.
- Corrected the Conversational ↔ Expert browser journey: direct agent switches create a fresh Decision and mount the composer immediately, so the E2E now asserts the real transition instead of waiting for the obsolete empty-state button.
- Raised the Expert unit-matrix timeout to 300 seconds, matching the main CI pipeline timeout and the observed 122-second pipeline suite runtime.
- Removed browser-path dynamic imports of `node:crypto`; workspace hashing now uses the shared Web Crypto helper and fails explicitly when Web Crypto is unavailable. This removes the browser-incompatible Node fallback and duplicate SHA-256 implementation.
- Added a regression guard against Node built-ins in browser workspace hashing/export code.
- Patch metadata advanced to `124.0.13`.
- Diagnostic evidence from commit `099f7dd42b8e7712c3970cde5a64413ca65bbb37`: primary CI had 2 failing DAG checks (`test:core`, `test:models`); browser acceptance failed the stale agent-transition assertion; Expert verification timed out the pipeline suite at 120 seconds. Existing typecheck, build, architecture, security, database-live, App Builder and other recorded suites passed. Gitleaks SARIF contained zero findings.
- Local dependency installation was attempted but timed out. Changed dependency-backed suites, full typecheck/build, browser E2E and hosted CI after this patch are NOT_RUN; see `TECHNICAL_REPORT.md`.

## P124.12 — secret redaction, immutable CI actions and documentation coverage (2026-11-02)

- Expanded diagnostic secret redaction to include Serper, Cloudflare, GitHub and dynamically resolved Gemini key slots; added provider-key shape detection and `x-byok-key` header redaction for text and nested objects.
- Added regression coverage for BYOK headers and provider-style credentials.
- Pinned all external GitHub Actions to full commit SHAs and moved the Actions runtime to Node 24-compatible releases; added weekly Dependabot updates for GitHub Actions.
- Added a generated API route index for all 84 registered routes and a staleness/coverage guard. Detailed request/response schemas remain explicitly pending where they are not yet documented.
- Documented BYOK storage/transmission, session lifetime/revocation limits and third-party data disclosures.
- Added missing deployment/tuning variables to `.env.example`; replaced fragile `server.ts` line references in the C124 instruction inventory with function/route symbols; renamed the npm package to `biforge`, moved `tsx` to devDependencies and removed the unused `autoprefixer` dependency.
- Translated maintained patch-report and information-quality handoff copy to English; added a repository-wide Cyrillic policy check with explicit user-language exceptions.
- Regenerated the environment inventory, module map and check/capability graphs; route and migration inventories remain unchanged.
- Verification: dependency-free redaction tests 4/4 PASS; security-header middleware tests 3/3 PASS; workflow pin tests 2/2 PASS; `lint:copy`, architecture check, version check and `docs:check` PASS; HTTP-level security-header and synthetic failed-BYOK-request assertions were added to the pipeline suite but are NOT_RUN locally. Full dependency-backed tests/build/typecheck are BLOCKED because `npm ci --offline` cannot retrieve uncached packages and the npm registry is unreachable from this environment. Hosted CI and live deployment checks are NOT_RUN.

## P124.11 outbound web-fetch hardening and baseline response headers

- Hardened search-result URL eligibility: reject non-HTTP(S), embedded credentials, localhost/internal/local names, and private/reserved/non-global IP literals (including IPv4-mapped IPv6).
- Added DNS resolution checks that fail closed when any resolved address is non-public. Direct page retrieval now handles redirects manually, revalidates each hop, caps redirects at four, restricts content types, and enforces a 1 MB response-body limit.
- Kept Jina Reader as the extraction proxy, but documented that selected target URLs are disclosed to Jina and that its own DNS/redirect behavior is outside BiForge's control.
- Added baseline security response headers, production-only HSTS, and disabled Express `X-Powered-By`. CSP remains unenforced pending report-only validation of the deployed UI and integrations.
- Added negative URL/IP tests and a security-header middleware contract test. Bumped patch metadata to `124.11`.

## P124.10 diagnostics classification and emergency-screen regression repair

- Repaired the emergency-screen contract test to read the configured `MAX_ENTRIES` value instead of freezing the historical value `120`; wired the test into `test:core` so it runs in the CI DAG.
- Corrected diagnostic log classification: explicit status lines take precedence, TAP failures remain `FAIL`, and a passing TAP log is `PASS` even when a test title or description contains the word `BLOCKED`.
- Added a regression test for the false-`BLOCKED` classification.
- Bumped patch metadata to `124.10`.

## P124.9 crisis-turn question safety repair

- Restored the crisis-turn contract in the Conversational path: when triage is `CRISIS` or a distress marker is detected, questions the model wrote inside its own answer text are removed (`stripQuestionSentences` in `server/reasoningState.ts`, applied in `server.ts`), while every other model-authored sentence and the support-contacts block are kept. This closes the Pipeline Stage 2 failures `G1 crisis ru`, `G1 crisis es` and `G1 crisis ru-late` seen after P124.7, when `buildVisibleReply` began preserving model-authored questions.
- Non-crisis behavior is unchanged: C124 output fidelity (model-authored questions preserved, optional follow-up additive) still applies to every other turn.
- Added focused regression tests in `tests/c124-output-fidelity.test.mjs` (crisis stripping in RU, multi-line text, no-op without questions, and a guard that only the crisis path strips).
- Bumped patch metadata to `124.9`.

## P124.8 obsolete model-prompt test cleanup

- Removed golden SHA-256 snapshots that froze complete Conversational/Expert prompt bytes; wording and prompt composition may now evolve without unrelated CI failures.
- Removed static tests that asserted retired reasoning choreography, fixed prompt wording, novelty-retry absence, obsolete quota vocabulary, and optional metadata phrasing.
- Retained runtime checks for information-mode classification, preservation of model-authored questions, additive optional follow-up behavior, URL intent, and output-path fidelity.
- Retained agent routing, isolation, schema, safety, and Architect/App Builder contracts; no product source, prompts, instructions, or runtime logic changed.
- Focused tests: 12/12 PASS under Node 22 type stripping. Full CI/DAG not run in this audit.

## P124.7 CI regression follow-up

- Restored pull-request browser acceptance for relevant frontend, server, browser-test, build-config and dependency changes while keeping full CI ownership in `ci.yml` and manual dispatch available.
- Fixed leaked `Source: USER_DATA` provenance annotations at the visible-reply boundary without rewriting model-authored prose or Markdown; scoped the fuzz assertion to user-visible reply/question fields rather than internal structured state.
- Replaced the Pipeline fuzz test's retired one-question assertion with the C124 output-fidelity contract: model-authored text and questions remain intact, and the separate optional follow-up contributes no more than one question.
- Made Stage 2 wait for each spawned test server to exit (with SIGKILL fallback) before closing the fake-provider bridge, preventing child-process activity from outliving the test module.
- Bumped patch metadata to `124.7`.

## P124.6 CI regression and test-lifecycle repair

- Replaced P52 assertions for retired Expert prompt wording with checks for the current optimized context contract.
- Replaced the Web test's exact source-comment wording assertion with behavior checks for explicit URL preservation and default URL suppression.
- Made DOCX export verification read and normalize Word text runs, so XML run boundaries and Markdown emphasis do not create false negatives.
- Awaited shutdown of the Core fake-provider server child and its HTTP listener to prevent asynchronous activity after test completion; the service-data assertion now targets internal labels rather than rejecting valid user-facing Markdown.
- Replaced grouped Pipeline/Files `process.exit(1)` failures with awaited cleanup and ordinary test errors, preserving useful failure context instead of producing secondary asynchronous-exit errors.
- Normalized successful and failed workflow status to explicit `PASS` / `FAIL` in the single assistant handoff summary.
- Verification: changed MJS syntax checks and a clean-run summary smoke test PASS. Full runtime suites NOT_RUN because dependency installation timed out and `tsx` is unavailable in the supplied environment.


## P124.5 workflow diagnostics and stale-contract test repair

- Replaced the fragmented `ASSISTANT_PASTE*.txt` / nested ZIP handoff with exactly one `ASSISTANT_SUMMARY.md` per workflow. The handoff contains run identity, overall status, per-log check inventory, TAP counts, failure excerpts, and reproduction guidance.
- Standardized companion logs as `checks.log`, `failures.log`, and `environment.log`; raw command logs use numbered, purpose-based filenames. The summary aggregates TAP output across multiple suites, expands structured DAG results into per-check status/duration/rerun commands, includes compact structured-report fields, and redacts secrets in uploaded evidence. Workflow artifacts expose the single summary and readable logs directly, without nested diagnostic ZIPs. CI history reads the new `checks.log` artifact format while retaining legacy-artifact compatibility.
- Removed the duplicate full CI DAG from manual browser acceptance; the CI workflow owns the complete verification DAG, while acceptance owns browser journeys.
- Updated the DAG dependency contract so the App Builder suite waits for its dedicated recovery probe, without imposing that unrelated probe on other suites.
- Updated stale regression assertions to the current C124 contracts: Expert stage wording, ANALYST instruction wording, Decision-mode prompt wording, preserved Markdown in generated content and conversational replies, URL-comment whitespace, and App Builder spec prompt/cache version.
- Changed test server launches from the `tsx` wrapper to `node --import tsx`, ensuring cleanup signals target the actual server process rather than leaving orphaned child processes.
- Local deterministic diagnostics/DAG tests: PASS (13/13); changed JavaScript syntax checks, workflow YAML parsing, docs integrity and version metadata: PASS. Full runtime suites/typecheck/build/browser/live checks are NOT_RUN because the supplied environment's `node_modules/tsx` directory is empty (dependency installation is unavailable in this run).

## P124.4 Architect and App Builder prompt refinement

- Removed the App Builder planner's default preference for a single `index.html`; architecture is selected to fit the requested goal while interface and import/export contracts remain enforced.
- Reframed reviewer guidance around user requirements and evidenced functional defects, distinguishing blockers from optional/style suggestions.
- Updated coder guidance so incomplete internal contracts can be completed consistently without inventing external APIs, credentials, measurements, or source results.
- Removed the 6,500-character recovery prompt clipping and the instruction to omit optional features. Recovery retains the complete task/context and requested functionality.
- Clarified App Builder specification coverage so explicitly requested capabilities are not silently omitted.
- Allowed Architect project analysis to use general domain knowledge for implications and gap detection while preserving provenance boundaries for project-specific facts.
- Bumped App Builder prompt/cache versions and added prompt/recovery regression coverage. No Architect routes, UI flow, validators, JSON schemas, or completion rules were changed.
- Hosted CI, live provider comparisons and generated-artifact browser evaluation remain NOT_RUN.

## P124.3 response-path fidelity cleanup

- Removed broad Markdown stripping from the model-authored conversation reply and generated document at the server transport boundary; preserve the original formatting/text for the client.
- Removed the obsolete fixed parenthetical filter for legacy decision-method vocabulary, which could erase ordinary domain language.
- Preserved the default policy of suppressing unsolicited source URLs, while honoring explicit user requests for links.
- Added explicit link/no-link intent flags. A current explicit instruction takes precedence over older recent-history preferences.
- Removed arbitrary output quotas from Expert `understand`, `radar`, `expand`, `attack`, `redteam`, `premortem`, `synthesis` and `review` prompts while preserving their task-specific schemas and endpoint purposes.
- Added C124 output-fidelity and Expert prompt-quality regression tests and included them in `test:core`.
- Hosted CI, browser rendering and live provider comparisons remain separate acceptance requirements.

## P124.2 Simple/Expert instruction cleanup

- Replaced the mandatory multi-step decision-analysis recipe in the shared Conversational/Expert prompt with concise task-fit guidance. The model chooses the analysis depth and structure appropriate to the actual request; it is no longer required to manufacture reframing, branches, calculations, tests or novelty in every response.
- Removed the V17 model-facing reasoning choreography from `server/reasoningState.ts`; retained deterministic state normalization, provenance safeguards and service-field handling.
- Replaced the analytical-engine `BASE_SYSTEM` with a concise model-interface contract covering the current task, supplied context, schema, evidence preservation, honesty and safety.
- Removed the universal `conversationGainAudit` gate and the second model call that rewrote decision/Expert answers solely because they did not contain a prescribed “new insight”. The narrow information-mode evasiveness repair remains; provider/JSON-format recovery remains separate.
- Simplified the Simple information prompt and shared decision guidance. Explicitly requested recommendations are allowed; no recommendation or decision framework is imposed when not requested. Empty examples now replace placeholder facts-to-check and arithmetic examples, so the model is not nudged to invent verification tasks or calculations.
- Expert now preserves factual/information classification instead of promoting every factual question to decision mode. Expert dialogue stage/context remains available as data, but no longer forces a fixed analysis sequence, minimum answer length or mandatory new branch.
- `buildVisibleReply` now preserves all questions already present in the model answer and only appends the optional follow-up field when allowed and not already present.
- Added C124 prompt-quality and output-preservation regression tests; updated prompt snapshots and planner/pipeline contracts.
- **Locally verified:** C124 prompt-quality tests 6/6; agent prompt/isolation/boundary suites 36/36; prompt snapshot suite included in those 36 tests; syntax checks and documentation checks recorded in the technical report.
- **BLOCKED / NOT_RUN:** full `test:core` cannot start because this sandbox lacks installed `zod`; full pipeline integration, TypeScript compiler/build, full DAG, hosted GitHub Actions, live provider comparisons, deployed behavior and user-outcome evaluation are NOT_RUN.

## P124.1 instruction and output-transformation inventory

- Added `docs/C124_INSTRUCTION_INVENTORY.md`, tracing production prompt sources, runtime call paths, hard-coded routing heuristics, attachment/context handling, and post-generation transformations.
- Classified each source as engineering control, integrity/validation, model-substitution behavior, hard-coded special case, or necessary model communication; recorded dependencies, risks and proposed dispositions.
- Identified duplicated model-directed decision-analysis recipes across `server/promptPacks.ts`, `server/reasoningState.ts`, `server.ts` (`BASE_SYSTEM`) and `server/expertAgent.ts` as the primary C124 cleanup candidates.
- Recorded output-integrity risks including unconditional URL stripping, first-question filtering, internal-label scrubbing, fixed output caps, attachment truncation and context selection.
- Added `tests/c124-instruction-inventory.test.mjs` and included it in `test:core` to catch stale file/line references.
- Updated the C124 mandate, roadmap, active decision, technical specification and acceptance documentation with the P124.1 inventory status.
- **No runtime prompt or answer-processing behavior changed.** Live provider comparisons, deployed behavior, multilingual trigger evaluation and user-outcome validation remain NOT_RUN.

## P124.0.2 — Cumulative C124 baseline and CI regression closure

- Consolidated the un-applied P124.0.1 documentation mandate with the latest P123.23 source baseline into one cumulative patch; product version remains 124 and patch identity advances to 124.0.2.
- Reproduced and repaired the three P123.23 `test:web` failures: replaced the obsolete grounding-prompt phrase assertion with the current evidence-preservation contract; aligned source-footer tests with the no-automatic-URL policy; and added generic current-observation weather query expansion.
- Removed the weather follow-up city allowlist and the Zurich example from the search translation prompt. Follow-up place extraction now relies on the actual preceding user text.
- Recomputed the reviewed prompt golden hashes after the P123.17 evidence-preservation prompt changes; updated all stale snapshots, not only the first failure reported by CI.
- Repaired the compact-artifact workflow contract test to accept the numbered `ASSISTANT_PASTE*.txt` upload pattern introduced by P123.20.
- Removed a stale cycle-123 assertion from the session-isolation contract test so it validates patch metadata against the active product cycle 124.
- Regenerated the stale `docs/generated-check-graph.json` and `docs/generated-capability-graph.json` after the cumulative source/documentation changes.
- **Verified locally:** prompt-route contract 5/5; web/epistemics suite 29/29; compact CI/evidence/DAG contract suite 71/71; status graph check; documentation integrity and inventories; capability graph check; version metadata; ZIP integrity.
- **NOT_RUN:** full `npm run test:core`, full `npm run test:web` wrapper, full hosted `npm run check` / CI profile, typecheck/build, live Gemini/Serper comparisons, deployed behavior, and user-outcome evaluation. The targeted deterministic suites were run with Node 22.16 experimental TypeScript type stripping because dependency installation was unavailable in this environment.
- C124 remains active. The repository-wide prompt/instruction audit is NOT_RUN; this patch only removes the evidenced weather city special-case and its example.

## P124.0.1 — C124 instruction-optimization documentation baseline

- Approved C124, “Instruction Optimization,” and advanced product version metadata to 124.
- Added `docs/C124_INSTRUCTION_OPTIMIZATION.md` defining BiForge as an engineering intermediary around external LLMs, not a competing reasoning/answer-generation system.
- Integrated the mandate into the current normative contract, roadmap control, active decisions, and testing/acceptance documentation.
- Established an audit-first approach: inventory prompt sources and output transformations, classify each item, trace dependencies, then make evidence-based KEEP/REWRITE/MOVE_TO_CODE/REMOVE decisions.
- Defined acceptance around faithful request transfer, preservation of model output, deterministic integrity tests, session isolation, and representative model-backed comparisons.
- Documentation-only patch. No repository-wide instruction audit, prompt cleanup, test execution, live model evaluation, or user-outcome validation is claimed.

## 123.23
- Updated the Expert step-prefix golden hash to the observed CI value from P123.22; no prompt text was changed by this repair.
- Corrected contextual weather follow-up normalization for Russian prefatory wording and fixed newline splitting of prior user turns.
- Aligned the compact-artifact contract test with the failure-first policy: successful-stage logs are excluded while structured results and failed logs remain retained.

## 123.22
- Restored the complete prompt snapshot matrix in the primary CI handoff.
- Reduced CI handoffs to failures, timeouts, blocked/not-run states and concise next actions; positive check output and successful-stage logs are omitted.
- Curated the diagnostic ZIP to retain authoritative reports, structured evidence, prompt diagnostics and failed-check logs only.

## 123.21 — CI regression repair

- Replaced the P123.18 hard-coded patch assertion with a cycle-123 patch-format contract.
- Restored the explicit recommendation exception and explicit-assumptions wording required by the Expert prompt contract.
- Clarified universal retrieved-evidence handling for weather observations and suppression of user-facing source URLs.
- Retained P123.20 assistant-paste splitting and workflow artifact changes.

## P123.20 — Multi-part assistant CI paste summaries

- Every workflow-generated `ASSISTANT_PASTE` part is limited to 5,000 characters.
- Long summaries are split into `ASSISTANT_PASTE.txt`, `ASSISTANT_PASTE_2.txt`, and subsequent numbered parts; no diagnostic text is silently truncated from the paste handoff.
- Canonical workflow uploads include every numbered paste part alongside the full diagnostic ZIP.
- Full logs and evidence remain in `biforge-ci-logs.zip`; paste parts prioritize failure stage, rerun commands, concise error excerpts, and source context.

## P123.19 — CI failure repair and richer failure evidence

- Fixed the Expert prompt string delimiter that caused TypeScript parsing to fail on the apostrophe in `user's`.
- Merged non-empty `used` web-search digests even when each individual digest is shorter than the page-extract threshold; short digests with source metadata are retained.
- Restored a local test scope for the P123.16/P123.17 regression cases in the grouped web-and-epistemics suite.
- Expanded CI source excerpts around reported locations and taught the evidence generator to resolve TypeScript `file.ts(line,column)` diagnostics. The complete redacted logs remain packaged in the CI diagnostics ZIP.
- Validation in this delivery environment: NOT_RUN (no dependency installation / CI rerun performed).

## P123.18 — Independent Conversational and Expert sessions

- Switching directly between Conversational and Expert now starts a fresh Decision/session; the previous session remains saved in the library.
- Returning to mode selection ends the current session and prepares a blank session for the next selected agent.
- Expert `/api/understand` now explicitly uses only the Expert brief/history and never assumes a prior Simple-mode exchange.
- Added regression coverage for mode-switch isolation and independent Expert initialization.

## P123.17 — Preserve retrieved evidence and suppress visible source links

- Cumulative delivery includes P123.16 current-weather query expansion and rejection of title-only search results.
- Removed automatic source-footer concatenation from the user-visible conversation reply; provenance remains available as response metadata.
- Reframed shared search instructions for both Conversational and Expert modes so retrieved facts and concrete values are used rather than discarded by overbroad uncertainty rules.
- Clarified Expert evidence scope: retrieved research supplied in the prompt is part of the input and may be used as source-supported evidence.
- Expanded V17 evidence-preservation instructions while retaining the prohibition on invented facts.
- Added regression assertions for source-link suppression and evidence preservation.

## P123.16 — Current-weather retrieval quality and source-link suppression

- Weather searches expand into targeted current-observation queries, including MeteoSwiss.
- SERP titles without factual snippets are excluded from the grounding digest; title-only results cannot be treated as current observations.
- Search digests below the minimum evidence threshold are not accepted as grounded results.
- Conversation responses no longer append raw source URLs to the user-visible reply; source metadata remains internal.
- Added regression coverage for weather query expansion, title-only SERP rejection and weather-specific synthesis constraints.

## P123.16 — Current-weather retrieval quality and source-link suppression

- Weather lookups now expand into targeted current-observation queries, including MeteoSwiss.
- Search results containing only page titles are no longer accepted as factual grounding; the agent must not claim a current observation from a page title.
- The shared conversation endpoint no longer appends raw source URLs to user-visible replies. Source metadata remains available internally.
- Added regression tests for weather query expansion, title-only SERP rejection and weather-specific synthesis instructions.

## P123.9 — Live Gemini smoke runner fix

- **Root cause (likely):** live job ran `node scripts/carousel-live-smoke.mjs` without `--import tsx`, so imports of `server/*.ts` failed (deterministic path already used tsx).
- Live + ops probe now: `node --import tsx …`.
- Live smoke writes `artifacts/carousel-verify/live-smoke.json` with status, rejected, attempts, errorClass (no secrets).
- Upload artifact path: full `artifacts/carousel-verify/`.
- package.json patch → `123.9`.

## P123.8 — Key-slot isolation + carousel-verify green

- **Bugfix:** `executeModelCall` key rotation shared `ctx.state.cooldownUntil` across slots; after `PROVIDER_QUOTA` on key A the model was on cooldown so key B got `blocked` / `no_suitable_model`. Each slot now uses a fresh cooldown map (disabledProviders still inherited).
- **Tests:** source-health breaker timing aligned with cooldown; ops doc assertion accepts `carousel-ops-probe`.
- package.json patch → `123.8`.

## P123.7 — Fix CI: workflow inventory + carousel-verify runner

- **test:core:** `tests/p119-agent-boundaries.test.mjs` expected workflow list now includes `carousel-verify.yml`.
- **carousel-verify:** `ops-probe` and live smoke invoked with `node --import tsx` (plain `node` cannot load `.ts` server modules).
- package.json patch → `123.7`.

## P123.6 — Carousel verification workflow (full automated check)

- **Workflow** `.github/workflows/carousel-verify.yml`:
  - deterministic job: catalog, key pool 1..10, source health, gateway rotation/lineage, ops probe, allowlist if present;
  - optional **live** job (`workflow_dispatch` + `live=true`) using `GEMINI_API_KEY` (+ optional `_1`…`_3`);
  - summary requires deterministic success; live failure only counts when the live job ran.
- **Orchestrator** `scripts/carousel-verify.mjs` → `artifacts/carousel-verify/summary.json`.
- **Live smoke** `scripts/carousel-live-smoke.mjs` — one real Gemini JSON call via `executeModelCall` + key pool.
- **Suite** `tests/p123-carousel-workflow.test.mjs` — end-to-end deterministic matrix.
- Scripts: `npm run test:carousel`, `npm run carousel:live`.
- package.json patch → `123.6`.

## P123.5 — Carousel ops + CI fixes (close C123 implementation)

- **CI fix:** `config/` added to `ALLOWED_TOP` in `scripts/patch-tools.mjs` (preflight no longer rejects `config/model-sources.*`).
- **CI fix:** `runAnalysis` no longer always uses process-global `sourceHealth` (tests were failing with `source_unhealthy` after prior failures). Production `server.ts` still passes `globalSourceHealth` explicitly.
- **Ops:** `scripts/carousel-ops-probe.mjs`, `npm run carousel:probe`, `docs/C123_OPS.md`.
- **Optional second source:** `withEnvAutoEnable` when `CAROUSEL_AUTO_ENABLE=true` and keys present; catalog still defaults OpenRouter/Groq to `enabled: false`.
- package.json patch → `123.5`.

## P123.4 — Source health + key pool max 10 (any count 1..10)

- **Key pool:** `MAX_ORG_KEY_SLOTS = 10` (was 13). Any number of configured keys from **1 to 10** is valid; solo deploy stays one key. Numbered env `GEMINI_API_KEY_1`…`_10` only; 11+ ignored.
- **New** `server/sourceHealth.ts`: per-catalog-source cooldown + consecutive-failure breaker; `globalSourceHealth`.
- **`executeModelCall`:** refuses calls when source is unhealthy; records success/failure into registry.
- Catalog JSON `max_slots: 10`; docs/C123/inventory/env.example updated.
- **Tests:** key pool variable counts; `tests/p123.4-source-health.test.mjs`.
- package.json patch → `123.4`.

## P123.3 — Multi-source catalog + free-provider inventory

- **Runtime catalog:** `config/model-sources.json` + `server/modelSourcesCatalog.ts` (`loadModelSourcesCatalog`, `enabledSources`, `runnableSources`).
- **Gemini** remains the only `enabled: true` source until Navigator sets keys + `enabled` for others (OpenRouter, Groq, Cloudflare, Mistral, NVIDIA, SambaNova, Cohere as disabled candidates in file).
- **Inventory:** `docs/MODEL_SOURCES_INVENTORY.md` — 25-row snapshot (2026-11-01) of free/API candidates with practitioner caveats (OpenRouter rotation, Groq org limits, GitHub Models **retired**, HF free credits gone, Cerebras uncertain, EU options Mistral/OVH).
- **Tests:** `tests/p123.3-model-sources-catalog.test.mjs`.
- package.json patch → `123.3`.

## P123.2 — Organisational Gemini key pool (≤13 slots)

- **New** `server/keyPool.ts`: `resolveGeminiKeySlots`, `KeyPoolState`, cooldown, `shouldRotateKeySlot` (quota / transient / auth).
- **`server/modelCarousel.ts`**: when `keySlots` + `buildGeminiAdapter` are provided, `executeModelCall` rotates keys after rotatable failures; lineage includes `keySlot` and per-attempt slot ids.
- **Wire:** `server/analysisService.ts` deps accept pool; `server.ts` builds process-wide slots from env and passes them into Project Mode `runAnalysis`.
- **Solo deploy:** only `GEMINI_API_KEY` → one slot; behaviour unchanged.
- **Tests:** `tests/p123.2-key-pool.test.mjs`.
- **`.env.example`:** documents `GEMINI_API_KEY_1`…`_13`.
- package.json patch → `123.2`.

## P123.1 — Model carousel gateway + lineage; version lock fix

- **Fix:** `package-lock.json` top-level / `packages[""].version` aligned to `123` (test:core patch metadata was failing after P123.0.1).
- **New** `server/modelCarousel.ts`: `executeModelCall`, `buildModelCallLineage`, `lineageLogFields` — wraps existing `routeCall`, attaches reproducible lineage (`sourceId`, `model`, `channel`, `keySlot`, attempts, timing). MVP source id `gemini-free-pool`; multi-key pool reserved for P123.2.
- **Wire:** `server/analysisService.ts` uses `executeModelCall` and returns `lineage` on analysis results.
- **Tests:** `tests/p123.1-model-carousel.test.mjs` (lineage shape, failover status, empty-registry blocked path).
- `package.json` patch → `123.1`.
- No change to Gemini allowlist or cascade model ids.

## P123.0.1 — C122 closed; C123 Model Carousel documentation baseline

Documentation-only delivery.

- **C122 CLOSED** as sufficiently successful (Navigator 2026-11-01): Expert reliability cycle complete for product purposes; residual UX polish deferred until carousel capacity exists.
- **C123 ACTIVE** — Model Carousel («Карусель»):
  - `docs/C123_MODEL_CAROUSEL.md` — full cycle mandate, architecture, phases P123.1–P123.5, org **13-key pool**, policy *not forbidden → permitted*.
  - `docs/MODEL_SOURCES_CATALOG.md` — catalog schema and selection algorithm.
  - `docs/MODEL_ALLOWLIST.md` — updated for C123.
  - `docs/DECISIONS.md` — ADR-C123-001.
  - `docs/USER_VALUE_EXPERT_C122.md` — §E closure record.
  - `ROADMAP.md` — current control switched to C123; C122 historical closed.
- `package.json`: `version` 123, `patch` 123.0.1.
- No runtime code changes in this patch.

## P122.9 — Fix UI smoke spawn (expert-verify e2e) + PATH harden

- Root cause of expert-verify red (diag4-2): `tests/ui-check.mjs` used `spawn('tsx', …)` → `ENOENT` on Actions; Expert e2e steps never ran.
- Fixed spawn in `tests/ui-check.mjs` and `tests/p120-architect-e2e.test.mjs` to `node --import tsx` (same as other e2e).
- expert-verify e2e job: prepend `node_modules/.bin` to PATH.
- Continues allowlist + journey work from P122.8.
- package.json patch → 122.9.

## P122.8 — Expert journey harden + Gemini free-key allowlist lock

- `tests/expert-journey-e2e.test.mjs`: narrowed, PATH-safe spawn, fewer brittle UI assertions (fix likely expert-verify e2e red).
- Gemini free-key allowlist only: `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`.
  - `server/modelAvailability.ts` `GEMINI_ALLOWED_MODELS`; probes no longer target retired flash/pro ids.
  - `server/modelRegistry.ts` empty `GEMINI_CANDIDATE_SEED`; probe list aligned.
  - Tests updated (p117 availability, cascade, web-and-epistemics); `tests/model-allowlist-contract.test.mjs` locks quoted model ids in sources.
  - `docs/MODEL_ALLOWLIST.md` for future assistants.
- package.json patch → 122.8.

## P122.7 — Expert-verify stabilisation, stage readiness UX, Layer B summary

- Coverage job no longer runs browser e2e (`tests/p122.*.test.mjs` glob pulled in journey test → `spawn tsx ENOENT`). Explicit unit list + `EXPERT_COVERAGE_ONLY=1`.
- Journey e2e renamed to `tests/expert-journey-e2e.test.mjs`; server spawn uses `node --import tsx` (PATH-safe on CI). Same spawn fix for p120 expert/conversational/transitions e2e.
- Expert UI: `StageReadinessBanner` on every method step (except triage) — shows incomplete reasons from `evaluateStageCompletion`.
- `scripts/summarize-real-model-eval.mjs` — paste-friendly Layer B summary for Navigator.
- Layer B live results (prior run): A/B 1.00, C 0.67, E 0.80 on `gemini-3.5-flash-lite` — heuristic PASS; human tablet smoke still open for C122 closure.
- package.json patch → 122.7.

## P122.6 — Fix Layer B model id + golden hash; Expert journey E2E; user-value surface

- Real-model default aligned to production cascade: `gemini-3.5-flash-lite` / `gemini-3.1-flash-lite` (not probe `gemini-3.8-flash`). expert-verify real-model job sets MODEL_CASCADE_* explicitly.
- Fixed `tests/p119-agent-prompts-routes.test.mjs` GOLDEN_STEP_PREFIX after intentional P122.5 prompt hardening (was failing test:core).
- Fixed default live model in `tests/p122.4-real-model-eval.mjs`: `gemini-2.0-flash` retired → `gemini-3.8-flash` (overridable via REAL_MODEL_ID / MODEL_CASCADE_STRONG).
- `src/ExpertStepScreens.tsx` Synthesis: quality panel (stage completion + recommendation checklist score/gaps) + `data-testid="download-final-decision"`.
- New `tests/p122.5-expert-journey-e2e.test.mjs`: Expert entry → shell → synthesis quality → download → reload persistence (mocked model).
- `expert-verify.yml` runs the new journey e2e in the browser job.
- `docs/USER_VALUE_EXPERT_C122.md`: acceptance checklist for live Layer B, browser, and tablet smoke.
- package.json patch → 122.6.

## P122.5 — Expert Layer B harness, ops contract fix, edge-case coverage

- `tests/p122.4-real-model-eval.mjs`: full Layer B live harness (scenarios A/B/C/E against Gemini when `REAL_MODEL_EVAL=1` + `GEMINI_API_KEY`); heuristic rubric; JSON artifacts under `artifacts/real-model-eval/`. Scenario D remains deterministic (Layer A).
- `tests/architect-dual-compare-contract.test.mjs`: workflow path corrected to existing `.github/workflows/architect-compare.yml` (fixes ops dual-compare false failure).
- `tests/p122.4-decision-quality.test.mjs`: edge-case suite (empty decision, incomplete stages, sparse recommendation quality, contradiction confidence).
- `server/expertAgent.ts`: stronger `EXPERT_STEP_PREFIX` — no invented numbers/dates/prices; mandatory claim labeling; lower confidence when evidence missing.
- `.github/workflows/expert-verify.yml`: real-model job uploads TAP + scenario JSON artifacts.
- package.json patch → 122.5.
- Limits: live Gemini runs still require workflow_dispatch with `real_model=true`; browser full-journey polish and comparative fluency study remain open.

## P122.4 — Decision Quality, User Experience & Final Validation

- `src/finalDecisionDocument.ts`: structured final decision document (executive summary through confidence/limitations); recommendation quality checklist; confidence calibration (no invented precision); stage completion criteria; decision-quality rubric (10 dimensions, critical failures).
- `src/decisionDocument.ts`: appends structured final sections to export; `decisionToFinalText()`.
- Synthesis UI: download structured decision document.
- Layer A tests: `tests/p122.4-decision-quality.test.mjs` — five scenarios (complex decision, changed information, questionable assumption, model failure, complete cycle) + document/rubric/stage checks — 12/12 pass.
- Layer B harness: `tests/p122.4-real-model-eval.mjs` — five scenarios documented; live runs only when `REAL_MODEL_EVAL=1` (skipped in normal CI).
- Full C122 deterministic suite: 80 pass, 1 skip (Layer B).
- Limits: live real-model scoring report NOT_RUN; browser UX polish beyond structured download NOT_RUN; hosted CI NOT_RUN.

## P122.3 — Execution Reliability & Workflow Continuity

- `server/expertContracts.ts`: endpoint registry for all Expert APIs; request validation (required fields, size); model object/shape validation; error taxonomy (`VALIDATION`, `INVALID_MODEL_JSON`, `MODEL_TIMEOUT`, …); in-process idempotency cache (TTL, bounded).
- `src/expertWorkflow.ts`: workflow state machine with invalid-transition rejection; context reconstruction from Decision (no invented history); operation tracker; progress snapshot without fake percentages; user-facing failure messages that state prior work is preserved; idempotency key helper.
- Wired `guardExpertRequest` into neutralize, radar, understand, expand, synthesis in `server.ts`.
- Client `api()` sends `x-idempotency-key`; `runApi` tracks operations and reports recoverable failures without destroying local decision state.
- Tests: `tests/p122.3-execution-reliability.test.mjs` — 25/25 pass. Regression P122.1+P122.2: 42/42 pass.
- Limits: full cancellation of in-flight Gemini calls, durable server-side Expert session store, and hosted CI — NOT_RUN / deferred.

## P122.2 — Analytical Reliability & Evidence Integrity

- Domain model (`src/decision.ts`): `HypothesisStatus` lifecycle; richer `Evidence` provenance; `Contradiction` and `CalculationRecord`; optional `contradictions`, `calculations`, `invalidated` on Decision; hypothesis status fields.
- New pure module `src/analyticalIntegrity.ts`:
  - Fact/assumption labelling; block silent promotion of assumptions to verified facts.
  - Controlled hypothesis status transitions; purge rejected hypotheses from active assumptions.
  - Evidence provenance factory and reference validation.
  - Contradiction detection (fact/assumption dual listing, preferred=opposite, support+contradict).
  - Open-unknown visibility; dependency invalidation on user changes.
  - Auditable EVPI calculation records (inputs, formula, result, limitations).
  - Alternative distinctness check; integrity summary.
- Expert UI: model-mapped claims never marked EXTERNALLY_VERIFIED; saving EVPI estimate appends `CalculationRecord`.
- Tests: `tests/p122.2-analytical-integrity.test.mjs` — 23/23 pass. P122.1 suite still 19/19.
- Limits: full Red Team / Pre-Mortem prompt rewrites and EXPAND distinctness enforcement in model prompts deferred; real-model evaluation is P122.4.

## P122.1 — State Integrity & Persistence

- Strengthened Expert decision persistence (primary store remains browser localStorage, using existing infrastructure):
  - `validateDecision()` — required fields, valid stage, array/object shapes, dangling preferred/opposite option refs, best-effort evidence reference checks.
  - Atomic-ish save with last-good backup key; failed writes leave previous committed state intact.
  - Corrupt primary recovered from backup on load; invalid records dropped without destroying valid ones.
  - Monotonic `revision` on Decision; `bumpRevision()` on every user update; `detectRevisionConflicts` / `mergeByRevision` for concurrent-tab / import safety.
  - Save status meta (`saved` / `saving` / `failed`) recorded after each persist attempt.
- Import path now runs full integrity validation and rejects invalid data without mutating existing storage.
- Export/import round-trip preserves structured fields including revision.
- Added `tests/p122.1-state-integrity.test.mjs` (19 deterministic cases; all pass under `node --experimental-strip-types --test`).
- Files: `src/storage.ts`, `src/decision.ts`, `src/exportZip.ts`, `src/App.tsx`, tests, docs.
- Known limits: still browser-local (no server-side Expert decision table); concurrent multi-device sync beyond revision merge is not claimed; full browser E2E reload/recovery NOT_RUN in this environment.

## P122.0 — C122 launch: Expert Mode reliability cycle governance and documentation integration

- Product version advanced to 122; cycle C122 (Expert Mode Reliability, Intelligence Quality & Decision Engineering) is now the active programme.
- Integrated the full C122 technical mandate into existing documentation:
  - `TECHNICAL_SPECIFICATION.md`: new CURRENT NORMATIVE CONTRACT prioritising Expert Mode, four-patch structure, scope, exclusions, Architect freeze, Conversational protection.
  - `ROADMAP.md`: new CURRENT ROADMAP CONTROL with C122 patch sequence, priority matrix, expected results, and frozen/out-of-scope statements.
  - `docs/DECISIONS.md`: D-2026-10-31-03 recording the owner-approved launch of C122 and the freeze of Architect development.
- Architect remains the selected primary implementation but is frozen for feature work during C122; Conversational Mode remains out of scope.
- No product code, API, or test behaviour changed in this patch. This delivery establishes the normative baseline for P122.1–P122.4.
- Verification: documentation consistency inspection only; typecheck/build/tests/hosted CI/live: NOT_RUN (governance-only change).

## P121.0.49 — Fix primary Architect route and align stale boundary contract

- Fixed the route regression: `/project`, `/project-legacy`, and `/architect` render the selected `ProjectMode` Architect; only `/architect-lab` renders the frozen diagnostic Lab.
- Updated the P119 route-boundary test to assert the current single-Architect decision rather than the superseded Lab-primary behavior.
- CI `test:core` and DAG rerun attempted locally; execution is blocked by absent installed dependency `tsx`. No unrelated product logic changed.

## P121.0.48 — Select one primary Architect and detect semantic DOM aliasing

- Selected legacy Architect / `ProjectMode` as the sole active development target after newer comparable reports: legacy artifact `SUCCESS` with all declared validators passing; Lab artifact `PARTIAL` with JS syntax and missing-reference failures.
- `/project`, `/project-legacy`, and `/architect` route to the selected legacy workflow. `/architect-lab` remains frozen for diagnostic comparison; no parallel Lab feature development.
- Strengthened `dom-wiring` validation to reject distinct controller properties bound to the same DOM id, a defect found by inspecting the latest selected artifact despite its previous all-green report.
- Updated DOM repair instructions to avoid mapping unrelated roles onto an existing id just to clear validator findings; added regression coverage.
- Browser/mobile user outcome, production build, full suite, hosted CI, and fresh live generation: NOT_RUN.

## P121.0.47 — Evidence-based Architect selection and visible build progress

- Promoted Architectural Test Lab to the primary `/project` entry based on the supplied comparable build reports: Lab passes syntax validation while legacy has two JS syntax-validator findings; both remain PARTIAL and neither is represented as fully successful.
- Preserved legacy Project Mode at `/project-legacy`; `/architect` and `/architect-lab` remain Lab aliases.
- Both build interfaces expose model-call counts and ready-file counts while work is in progress; Lab also displays stage and elapsed time.
- Added the selection rule to `docs/DECISIONS.md`. Supplied artifact comparison is static evidence only; browser/device user outcome and a fresh live generation remain NOT_RUN.

## P121.0.46 — Model repair must see and preserve the file

- **Observed defect (Legacy Architect build `63e74598`, Expense Tracker):** `app.js` was generated at 26,540 characters with one syntax error. The js-syntax model repair returned a 492-character placeholder (`SyntaxErrorFixerApp`, 464 bytes in the ZIP) and it was accepted because the issue count dropped 1 → 0. The build was reported `SUCCESS` / `goalImplemented: true`.
- **Root cause:** the js-syntax and dom-wiring repair prompts named the file and the errors but did not contain the file, so the model could only invent a replacement; acceptance compared validator issue counts only.
- **`appBuilder/core-engine.ts`:** both model-repair prompts now include the current source of the file as data. A repair that keeps less than half of a file of at least 400 characters is rejected with reason `destructive_shrink` (`js_syntax_repair_rejected` / `dom_wiring_repair_rejected`, with `beforeChars` / `afterChars`) and the original file is kept, so the real validator failure stays visible and the outcome stays `PARTIAL`.
- **`tests/app-builder-repair-integrity-p121.test.mjs`** (registered in `test:app-builder`, part of the `check` DAG profile): prompt carries the source (js-syntax and dom-wiring); placeholder replacement rejected with original bytes preserved and outcome not `SUCCESS`; a faithful small repair is still accepted. On the previous code 4 of the 5 tests fail.
- No UI, route, API, database, or workflow change. Deterministic js-syntax fixes and unit-level regeneration are unchanged. Hosted CI, live builds, and device checks: NOT_RUN.

## P121.0.45 — Align tests with single outer PASTE + no neon workflow

- **test:core:** `neon-initialize-workflow.test.mjs` no longer requires deleted `.github/workflows/neon-initialize.yml`; asserts scripts only and that the workflow file is absent.
- **test:compact-ci-artifacts:** outer dir expectation is `ASSISTANT_PASTE.txt` + `biforge-ci-logs.zip` (evidence remains inside the zip).

## P121.0.44 — Single outer ASSISTANT_PASTE + cumulative CI fixes

- **Artifact layout:** GitHub artifact root is only `ASSISTANT_PASTE.txt` + `biforge-ci-logs.zip`. Full logs, `PATCH_EVIDENCE` / `BIForge-PATCH-EVIDENCE`, metrics, and `ASSISTANT-BRIEF.md` live **inside** the zip (no triplicate summaries at outer root).
- **`package-ci-artifacts.mjs`:** builds the rich outer paste (status, failed stages, log tails, truncated evidence) then strips the dir to those two files.
- **Manual workflows** (`architect-compare`, `ops`): `PACK_OUTER_ARTIFACT=true` on `assistant-run-summary.mjs` packs the same outer layout.
- **Cumulative from 0.43:** four-workflow inventory test; `test:ui-smoke` + Playwright smoke on `ci` after DAG; canonical four workflows.

## P121.0.43 — Workflow inventory fix + Playwright UI smoke on ci

- **test:core:** `p119-agent-boundaries` still expected 16 legacy workflow YAMLs. Updated to the four canonical files: `acceptance.yml`, `architect-compare.yml`, `ci.yml`, `ops.yml`. Push/PR gate assertions now require UI smoke on `ci.yml`; manual workflows stay `workflow_dispatch` only.
- **`npm run test:ui-smoke`:** preflight + `tests/ui-check.mjs` (viewport/shell smoke, not full p120 suite).
- **`ci.yml`:** after successful DAG, Playwright Chromium (cached) + `test:ui-smoke`, log `artifacts/ci-checks/ui-smoke.log`.
- Re-ships the three manual canonical workflows if missing. Delete leftover `architect-dual-compare.yml` if present (chat list).

## P121.0.42 — Four canonical workflows + ASSISTANT_PASTE summary

- **`scripts/assistant-run-summary.mjs`**: after each run, writes `ASSISTANT_PASTE.txt` (chat-sized failure extract) and `ASSISTANT_SUMMARY.json` under the log dir. Navigator can paste the text file when ZIP attach is unavailable.
- **Canonical workflows (4):**
  - `ci.yml` — push/PR DAG (existing pipeline + assistant paste before package/upload)
  - `acceptance.yml` — full DAG + Playwright UI, dispatch
  - `architect-compare.yml` — Lab vs Legacy dual-compare on staging, dispatch
  - `ops.yml` — fast diagnostics / dual dry-run, dispatch
- Contract test `tests/assistant-run-summary-contract.test.mjs`.
- Obsolete workflow **deletion paths listed in chat only** (not in ZIP).

## P121.0.41 — Dual-compare fixture flat path (no scripts/fixtures/)

- Moves the dual-compare goal text to `scripts/architect-dual-expense-goal.txt` (same level as other scripts).
- Updates `architect-dual-compare.mjs` and contract test paths.
- **Delete on apply:** `scripts/fixtures/architect-dual-expense-goal.txt` and empty `scripts/fixtures/` if present (listed in chat only, not in ZIP).

## P121.0.40 — test:web English disclosure + dual-compare (cumulative)

- **CI (test:web):** After English-only product disclosures, `web-and-epistemics` still expected Russian freshness/footer strings. Updated assertions to English (`Live figures could not be confirmed…`, `Web search is disabled…`, `Sources (web search)`). `appendFreshnessDisclosure` / `formatSourcesFooter` are English-only (no language-switched chrome).
- **Includes Architect dual-compare automation** (from 0.39): script, workflow, fixture, contract test, npm scripts — so one apply covers red CI and the compare workflow.

## P121.0.39 — Architect dual-compare workflow (Lab vs Legacy automation)

- Adds `scripts/architect-dual-compare.mjs`: same goal through **Lab-shaped** API path (create with proposed passport) and **Legacy-shaped** path (create name+goal, then confirm passport), then poll build, download ZIP, classify via shared P118 helpers, write `report.md` + `report.json` with a **recommendation** (LAB / LEGACY / TIE / …).
- Fixture goal: `scripts/fixtures/architect-dual-expense-goal.txt`.
- GitHub Action `architect-dual-compare` (`workflow_dispatch`): navigator runs one workflow; secrets `STAGING_SERVICE_URL` + `STAGING_APP_PASSWORD`; artifact `architect-dual-compare-report`.
- Dry-run mode (`DUAL_DRY_RUN=true`) for contract checks without staging.
- npm: `architect:dual-compare`, `test:architect-dual-compare`.
- Aligns with product goal: navigator makes the mode-choice decision from the report; routine dual builds are automated.

## P121.0.38 — English UI + Lab contract CI fix (cumulative)

- **CI (commit 89744ae / test:core):** `p119-agent-ui-contract` expected `href="/project"` inside `ArchitectLab.tsx`. After P121.0.36 the link lives in `ArchitectShellHeader.tsx` (More → Legacy Architect). Contract now asserts the shell link and that Lab still documents `/project`.
- **English-only UI (was prepared as 0.37, applied here):** ProjectMode build-status strings; ConversationFiles export labels; decisionDocument headings; Expert display sanitizer; webSearch source footer/prompt markers. Multilingual *input* detection unchanged.
- No Lab engine/chrome changes beyond the contract alignment. Hosted CI after this patch: NOT_RUN until applied.

## P121.0.37 — English-only product UI (Cyrillic chrome removed)

- User-visible Russian remained in working modes, notably Architect/Project **build live status** (`Статус сборки`, stage lines, outcome) and export labels that switched to «Вы / Агент» when conversation text was detected as Russian.
- **ProjectMode:** build progress strings translated to English (status, stages, elapsed, files, outcome).
- **ConversationFiles:** Word/PDF/Drive export labels always English (`You` / `Agent` / `Attached`).
- **decisionDocument:** decision export headings always English (`L.en`); removed auto-switch to `L.ru`.
- **ExpertStepScreens:** display sanitizer replacement text English-only.
- **webSearch:** source footer and prompt markers English-only (`Sources (web search)`, `(according to web search)`). Detection regexes that *understand* Russian user input are unchanged (not UI chrome).
- Crisis/support phrase lists and NLP token tables intentionally keep multilingual user-input matching — not product labels.
- Hosted CI / device: NOT_RUN.

## P121.0.36 — Lab primary chrome parity + js-syntax repair

- **Chrome parity (option A):** `/architect-lab` no longer uses a custom Diagnostics-only toolbar. It mounts the same top pattern as legacy Project Mode: `ModeMenu` (Conversational / Expert / Architect), Drive, and More (User guide, system diagnostics, operations, session log, diagnostic ZIP, legacy workspace link, sign out). Shared component: `src/ArchitectShellHeader.tsx`.
- **js-syntax repair:** After static validators, `appBuilder/core-engine.ts` now repairs failing `.js` files: (1) deterministic fix for the common model typo `toString(36.substr(...))` → `toString(36).substr(...)`; (2) if still failing and budget remains, one bounded coder repair call per script (max 2), accepted only when js-syntax improves and no previously-passing required validator breaks. Addresses live PARTIAL on Expense Tracker (`Invalid or unexpected token` in `app.js`).
- Goal-length clip from 0.35 retained. Long-TЗ agent densification remains OPEN (not this patch).
- Tests: Lab contract + browser E2E updated for shell testids; contract asserts engine repair markers.
- Hosted CI / device: NOT_RUN until applied.

## P121.0.35 — Lab create: honor API goal length (fix "Invalid project data")

- Live device (tablet): Architectural Test Lab showed **Stopped with error / Invalid project data** on Create project brief while Legacy Architect completed the same Expense Tracker goal and produced a downloadable ZIP (OBSERVED screenshots + app-source).
- Root cause: shared `POST /api/projects` validates `goal` with `passportText` (max 2000). Lab sent the full textarea value without clipping; long briefs fail Zod → `projectError` maps to "Invalid project data".
- Lab now clips name (200), goal and passport text fields (2000) before create/build; maps the opaque API error to an actionable message. Create payload shape unchanged otherwise.
- No server schema change, no legacy `/project` change. Hosted CI / device re-try: NOT_RUN until applied.

## P121.0.34 — Lab shell: header and diagnostics reachable in every state

- `ArchitectLab` rendered its toolbar (`Diagnostics ▾`, BiForge, Legacy Architect) only on the authenticated main screen. The three early returns (session check, Project Mode disabled, sign-in) had no header and no diagnostics access.
- Extracted a persistent `LabHeader` rendered in loading, disabled, sign-in, and main states. Diagnostics menu stays visible when signed out or Project Mode is off; choosing an item shows an honest “Sign in to load diagnostics” message instead of a silent failure. Auth is not weakened.
- Narrow-viewport CSS (≤720px) keeps the menu inside the viewport and touch targets usable.
- Extended `tests/p122-architect-lab-e2e.test.mjs`: header/menu asserted on the main flow; new test covers sign-in and disabled states at phone width (390×844) and the sign-in hint path. Existing `architect-lab-completion` path is unchanged.
- data-testid additions: `architect-lab-header`, `architect-lab-diagnostics-panel`, `architect-lab-diagnostics-signin-hint`, `architect-lab-nav-biforge`, `architect-lab-nav-legacy`, `architect-lab-loading`, `architect-lab-disabled`, `architect-lab-disabled-panel`, `architect-lab-signin`, `architect-lab-signin-form`, `architect-lab-main`. Existing testids retained.
- No change to generation engine, validators, passport flow, or `/project`. Hosted CI and device verification: NOT_RUN.

## P121.0.33 — Release abort listeners on the shared build-job signal

- Model adapters (`geminiAdapter.ts`, `openaiCompatAdapter.ts`) and `realClock.sleep` attached an `abort` listener to the caller's signal on every call and never removed it. A staged build shares one job signal across all model calls, so listeners accumulated (production console showed `MaxListenersExceededWarning`, 11 listeners, 2026-10-30 23:14:44).
- Listeners are now removed when the call or sleep ends. A signal that is already aborted now stops the call before any provider request is sent (`PROVIDER_TRANSIENT`, the same class as in-flight cancellation) and ends a sleep immediately.
- Added four regression tests to `tests/models.test.mjs` (run by `test:models`): no listener accumulation on success and on provider error, in-flight cancellation still works, pre-aborted signal sends no request, `realClock.sleep` lifecycle.
- No UI, routing, API, database, or Neon behavior changed. Local `test:models` 150/150; the new tests fail on the previous code (3 of 4; the in-flight test guards unchanged behavior). Hosted CI and live build behavior: NOT_RUN.

## P121.0.32 — Update remaining cycle-governance Architect route assertion

- Updated `tests/p121-cycle-governance.test.mjs`, the remaining core test that still expected the Architect menu to navigate to `/project`.
- The test now verifies that Architect opens `/architect-lab` without a browser confirmation dialog and that `/project` remains a separate legacy route.
- This addresses the sole direct failure reported for commit `d45e05f4332a3d0365b013fca8387174ea4c96cb`; `workflow-dag` was downstream of `test:core`. No application runtime or generated Expense Tracker behavior changed.
- Targeted test, lint, version metadata, and documentation integrity are recorded only after execution; full Core/DAG, hosted Actions, and deployed UI are not claimed.

## P121.0.31 — Align legacy agent-boundary route contract with Architect Lab entry

- Updated the remaining P119 agent-boundary test that still required the Architect menu to navigate to `/project`.
- The contract now verifies `/architect-lab` and `/architect` mount Architectural Test Lab, `/project` remains the separate legacy ProjectMode route, and the standard Architect menu navigates to `/architect-lab`.
- This directly addresses the sole failing core test reported for commit `64aab1dc566936313a8c97cb2e476d3ba989ca3e`; the workflow-DAG failure was downstream of `test:core`.
- No application runtime, routing, generated-app, database, or Neon behavior changed. Local targeted test, full core suite, DAG, hosted CI, and deployed UI status are recorded only after execution; no hosted result is claimed here.

## P121.0.30 — Repair Lab CI contracts and diagnostics readiness check

- Reworded user-facing Lab copy to remove internal terminology while retaining the proposed/confirmed project review flow; `lint:copy` now passes without changing its allowance.
- Updated the legacy P119 route contract to assert that the standard Architect entry opens `/architect-lab` and that `/project` remains available as the fallback workspace.
- Hardened the Lab browser fixture by matching the diagnostics endpoint with optional query strings and waiting for the successful diagnostics response before asserting the loaded report.
- Made Quick Diagnostics preserve stdout/stderr channels while streaming child-process output live; its contract now verifies both streams rather than relying on a single implementation-specific output call.
- Owner evidence for commit `231e7b4034e449af66f95a7da02d5dfcc03467ff` identified these stale contracts and the diagnostics loading race. No generated Expense Tracker runtime, Neon schema, database, or build API behavior changed.
- Local targeted contracts: PASS 13/13; copy lint: PASS; syntax/version/docs checks: PASS. Full Core/DAG and browser E2E: NOT_RUN. Hosted Actions and deployed UI: NOT_RUN.

## P121.0.29 — Wait for Lab diagnostics to finish loading in browser test

- Fix the Lab browser E2E race: after opening Compact session log, wait up to 10 seconds for the textarea value to equal the mocked diagnostic fixture before asserting it.
- The test still verifies the diagnostics request result and then continues through passport confirmation, build completion, and ZIP download.
- No application runtime, routing, API, generated-app behavior, database, or Neon behavior changed. Owner evidence for commit `db1f2800463d92c12535b3aa08d4e8de422ea486` shows the diagnostics textarea was still at its initial loading value at assertion time.
- Local test syntax and version/docs checks: pending. Hosted Actions, browser E2E after applying this patch, and deployed UI: NOT_RUN.

## P121.0.28 — Reapply live Quick Diagnostics streaming workflow

- Reapply the verified Quick Diagnostics workflow and its matching contract test together, because the owner-reported commit still contains the older redirected-output command (`> log 2>&1`) rather than a `tee` pipeline.
- Dependency installation and both Chromium installation paths stream combined output through `tee` with `set -o pipefail`, preserving live Actions logs and the real command exit status.
- No application runtime, Architect routing, Lab UI, API, database, Neon, or generated-app behavior changed. Owner evidence for commit `db1f2800463d92c12535b3aa08d4e8de422ea486` shows typecheck and Lab contract passing; browser/UI was disabled; the sole failure was the dependency tee contract.
- Local targeted checks: pending. Hosted Actions after applying this patch: NOT_RUN.

## P121.0.26 — Make Quick Diagnostics live install logging explicit

- Reworked dependency and both Chromium installation steps into explicit multiline Bash blocks that stream combined stdout/stderr through `tee` while preserving the installer exit status with `pipefail`.
- Strengthened the workflow contract test to inspect the dependency step and each browser-install step independently, requiring live `tee` streaming rather than merely checking that log paths exist.
- No product runtime, API, database, Neon, or Architectural Test Lab behavior changed. Owner evidence for commit `d8f74020a215fb5b8015b3185b142842e519dc0d` showed typecheck, Lab contract, browser installation, and Lab browser/UI passing; only the Quick Diagnostics workflow contract failed.
- Local workflow contract and dependency-free metadata/docs checks: pending. Hosted Actions after applying this patch: NOT_RUN.

## P121.0.25 — Add explicit Architectural Test Lab passport confirmation

- Changed the Lab entry flow to create a proposed project passport from the submitted project name and goal, then present its scope, users, inputs/outputs, constraints, security guidance, and success criteria for review.
- Generation is now gated behind an explicit user action that persists the passport with `status: confirmed` using the project's expected state version before calling `/code/build`.
- Updated Lab browser E2E to assert that the confirmed passport is saved before the build endpoint is called, then verify completion and download. Added a focused source-contract regression check.
- No legacy Architect UI, Neon schema, migration, or production data changes.
- Local dependency-backed browser E2E, hosted Actions, and deployed user outcome after this patch: NOT_RUN.

## P121.0.24 — Align Lab download assertion and harden diagnostics contract

- Corrected the Architectural Test Lab browser test to expect the filename the UI actually assigns to downloaded Blob results: `architectural-lab-result.zip`.
- Made the Quick Diagnostics workflow contract verify the `npm ci`/Playwright commands, their dedicated log paths, and `tee` streaming independently, avoiding a brittle single-line command-shape assertion.
- No product runtime, API, database, or Neon migration behavior changed. Owner evidence for commit `85583fc938ad507dffbe7544a886133fa7de8bc9` showed CI green, the workflow contract test failing on its text matcher, and the browser test failing only at the expected download filename assertion.
- Local checks and hosted Actions after this patch: NOT_RUN until the patch is applied and the workflow is rerun.

## P121.0.23 — Restore CI and Lab browser checks

- Added the approved `neon-initialize.yml` workflow to the exact Core workflow inventory, resolving the evidenced `test:core` deep-equality failure.
- Updated the staged-build regression expectation to the actual user-facing terminal note produced by `stagedArchitectNote`, resolving the evidenced `test:project` assertion mismatch without changing product behavior.
- Hardened the Architectural Test Lab browser fixture by explicitly disabling legacy Project Mode and clearing inherited `DATABASE_URL`; strengthened its contract test. The browser fixture continues to mock its project/session/build APIs and does not connect to Neon.
- The supplied CI evidence is from commit `896046f2552458bde0da3d693c02290cf831adb1`. Local dependency-backed Core, Project, and browser runs plus hosted Actions after this patch: NOT_RUN.

## P121.0.22 — Guarded Neon schema initialization

- Added a manual GitHub Actions workflow to run the repository's existing 19 SQL migrations against `DATABASE_URL`, after explicit backup-branch and production-target confirmations.
- Added a read-only preflight that refuses an untracked, non-empty `public` schema; added post-migration verification of the migration ledger and required BiForge tables.
- No SQL schema was hand-written, no data deletion/reset is performed, and no live Neon migration was run while preparing this patch.
- Local workflow-contract tests and static checks only; hosted Actions and Neon mutation remain NOT_RUN until the owner dispatches the workflow.

# P121.0.21 — Legacy Architect staged-result render guard (2026-10-30)

- Fixed the `/project` React crash when staged App Builder responses omit the legacy `codeTask` object. The result state now treats that legacy-only field as optional, and all render-time reads are guarded.
- Removed synthetic `codeTask` placeholders from the three build-result paths; staged result fields (`status`, `note`, `downloadUrl`, `jobId`) remain the source of truth.
- Added a regression test covering a completed staged build response with no `codeTask`.
- Neon migration/data state was not changed: no live database connection or migration evidence was available, and no Neon-specific failure was established.

## P121.0.20 — Restore live workflow logs and isolate Lab browser server

- Restored live child-process output in the verification DAG for both serial and parallel checks; parallel lines are prefixed with the check ID while full logs continue to be written to per-check files.
- Quick Diagnostics now streams dependency installation, Chromium installation, typecheck, Lab contract, and browser/UI test output directly into the GitHub Actions console while retaining the single compact `ERROR_SUMMARY.txt` artifact.
- The isolated Lab browser test no longer enables legacy Project Mode during server startup; its project/session/build API calls are intercepted by the browser fixture, so the test does not require a database URL or start the legacy project worker.
- Added regression assertions for live output and isolated server configuration. Legacy Architect runtime and the three core user-facing modes are unchanged.
- Local syntax/contract checks: pending; full dependency-backed tests and hosted Actions: NOT_RUN.

## P121.0.19 — Consolidate Quick Diagnostics into one error report

- Replaced separate CI/UI summaries and uploaded per-check logs with one `ERROR_SUMMARY.txt`, containing bounded sections for dependency installation, typecheck, Architectural Test Lab contract, browser/UI, and overall status.
- Detailed command output remains only in the ephemeral Actions runner directory; the downloadable artifact contains exactly one compact text file.
- Dependency and Chromium installation failures are recorded; dependent checks are marked BLOCKED, and report generation/upload run after failures.
- Added a focused workflow contract test for the single-file artifact and required report sections; the Lab browser smoke test now captures page errors, console errors, and failed requests so UI failures enter the same report.
- Legacy Architect runtime and generation behavior unchanged. Hosted workflow execution and actual artifact size/duration: NOT_RUN.

## P121.0.18 — Fix focused CI and Architectural Test Lab browser diagnostics

- Kept emergency resource-error handling type-safe by narrowing `event.target` to `Element` and reading only supported image, script, and link resource URLs; this removes the invalid `HTMLElement` versus `window` comparison reported by TypeScript.
- Changed the Lab browser smoke server launcher to use the current Node executable with `--import tsx`, avoiding reliance on `node_modules/.bin` being present in the child process PATH.
- Added the manually triggered `quick-diagnostics.yml` workflow to the explicit workflow inventory allowlist so the Core boundary test accepts this approved diagnostic workflow.
- Scope: diagnostics, Lab browser-test harness, and workflow inventory only; legacy Architect runtime and generation behavior unchanged.
- Verification: source syntax, workflow YAML, version metadata, and docs integrity PASS; dependency-backed typecheck/Core/browser tests BLOCKED because local `npm ci` timed out; hosted Actions and Android live UI: NOT_RUN.

## P121.0.17 — On-demand quick diagnostics workflow

- Added a manually triggered GitHub Actions workflow that skips the full verification DAG and runs focused typecheck, Architectural Test Lab contract tests, and an optional isolated Lab browser smoke test.
- Uploads small `CI_ERROR_SUMMARY.txt` and `UI_ERROR_SUMMARY.txt` files plus bounded per-check logs as a single short-lived artifact, including failures rather than stopping at the first failed check.
- Browser smoke can be disabled at dispatch when only fast static diagnostics are needed; Chromium is cached between runs.
- Hosted execution and elapsed time: NOT_RUN; expected duration depends on dependency/browser cache state.

## P121.0.16 — Prioritize Architectural Test Lab development

- Recorded the owner-approved strategy: focus new development on the separate `/architect-lab` experimental fourth mode; pause routine legacy Architect repairs and use legacy defects as diagnostic/regression input.
- Clarified the boundary between the three core agents and the separate experimental mode, and documented that the Lab currently has an isolated frontend but still shares backend project/build orchestration.
- Defined the target for independent Lab instructions, workflow/state machine, generation engine, progress, timeout/cancellation, recovery, and completion behavior. Legacy promotion or retirement requires a separate owner decision and user-outcome evidence.
- Documentation/governance only; no runtime behavior changed. Local documentation/version checks: pending. Hosted CI and live Android behavior: NOT_RUN.

## P121.0.14 — Critical-screen emergency recovery

- Install global browser error and unhandled-rejection capture before React mounts.
- Wrap the application root in an ErrorBoundary; record React component stack and render a visible recovery screen with a downloadable plain-text emergency log.
- On uncaught window/resource errors or unhandled promise rejections, replace the app root with a DOM-only emergency screen so a React render failure cannot leave a blank interface.
- Persist a bounded, redacted-by-design event list in localStorage; report URL path, browser, viewport, timestamps, messages, source locations, and component stacks. No request bodies, prompts, source files, cookies, or credentials are collected.
- Checks: source-level regression test added; typecheck, production build, hosted CI, and Android runtime: NOT_RUN in this workspace.

## P121.0.13 — Browser black-screen evidence capture

- Added bounded client-side error/rejection, visibility, mount, DOM-root geometry and post-mount snapshots; events are sent to the authenticated diagnostics endpoint without page content, prompts, request bodies or credentials.
- Expanded the paste-ready session log with recent browser events and HTTP request metadata so a blank-screen state can be correlated with the completed build.
- Verification in this reconstructed workspace: source inspection only; typecheck, build, tests, hosted CI and Android live black-screen capture NOT_RUN.

## P121.0.12 — Paste-ready compact session diagnostics

- Added an authenticated plain-text endpoint and Diagnostics menu action that produces one bounded report for the latest operation, with runtime/check status, correlated operation timeline, matching application errors, provenance and explicit evidence limits.
- Added an in-dialog copy button and read-only text area for mobile browsers; no ZIP or file attachment is required.
- Report excludes prompts, generated source, request/response bodies, credentials and cookies; HTTP completion is not represented as proof of browser download completion.
- Verification: source-level regression added; runtime/build and hosted CI status pending.

## P121.0.11 — Restore docs-integrity marker in AGENTS.md

- Restored required heading text `Mandatory protocol for the beginning of every session` (docs-integrity / p121-cycle-governance) while keeping §0 hard gates.
- Local: `docs:integrity PASS`; p121-cycle-governance + p121-navigator-protocol PASS. Hosted CI NOT_RUN here.

## P121.0.10 — AGENTS.md hard gates (fail closed)

- Rewrote `AGENTS.md`: §0 hard gates G1–G5 first (ZIP purity, Navigator tablet/GitHub-only, automate-first, UI/e2e same delivery, evidence honesty); invalid excuses listed; audience labels FOR_NAVIGATOR / FOR_ASSISTANT / FOR_CI; delivery checklist; preserved obligations, SoT map, session protocol, minimalism, security.
- Updated `tests/p121-navigator-protocol.test.mjs` to assert the new gate structure.
- Verification: governance test is source-level; full suite / hosted CI NOT_RUN in authoring workspace.

## P121.0.9 — Fix Architect e2e unmount and lint:copy UserGuide

- Keep guided wizard mounted after create/build (`showGuidedStart` no longer clears on `onFinished`; selection no longer hides the done step). Restores `novice-done` visibility for P120 Architect browser e2e.
- Shorten UserGuide §6.2 copy to satisfy `lint:copy` 24-word visible-string limit (root cause of DAG `lint:copy` FAIL).
- Soften done-step helper text in ProjectNoviceWizard.
- Verification in authoring workspace: `node scripts/lint-copy.mjs` PASS. Full e2e / hosted CI NOT_RUN here.

## P121.0.8 — Navigator channel rules (tablet GitHub web), clean patch ZIP, automate-first

- Strengthened `AGENTS.md` §7: three categorical rules — (1) patch ZIP contains only new/changed repository paths, no PATCH_SUMMARY/README/helpers; (2) Navigator instructions assume Android tablet + GitHub web/Actions only, never local terminal; (3) assistants must add tests and/or GitHub workflows when checks can be automated.
- Recorded `D-2026-10-30-07` in `docs/DECISIONS.md`; Navigator verification channel in `docs/TESTING_AND_ACCEPTANCE.md`.
- Added `tests/p121-navigator-protocol.test.mjs` and wired it into `test:core`.
- Includes prior P121.0.7 one-Architect client unification files when applied as a combined delivery.
- Verification: governance test is source-level; full suite / hosted CI NOT_RUN in authoring workspace.

## P121.0.7 — One Architect flow (remove novice/professional path choice)

- Removed the user-visible dual entry for Architect: no more mandatory “Simple words” vs “Professional” path chooser.
- Guided start (former novice wizard) is the default single entry when no project is selected; full analysis/plan/delivery tools remain available after a project is selected or created.
- Updated ProjectMode, ProjectNoviceWizard labels, UserGuide, capabilities note, and P120 Architect browser e2e to match the one-flow contract (BIO-004 / D-2026-10-30-02).
- ProjectPathChooser.tsx remains in the tree but is unused by the primary flow; can be retired in a later minimalism pass.
- Verification: source inspection confirms no path chooser in ProjectMode; e2e no longer clicks path-novice. Full typecheck/build/test suite, hosted CI, and live generation remain NOT_RUN in this reconstructed workspace.

## P121.0.6 — Clarify history preservation vs. test retirement

- Clarified that repository minimalism removes obsolete active test implementations, fixtures, temporary experiment payloads, and one-off tools—not useful historical records.
- Required preservation of completed roadmap history, changelog entries, factual reports, decisions, and concise records of test/experiment outcomes.
- Distinguished concise historical evidence from old test code and raw test inputs/outputs; archive raw payloads only for concrete reproducibility or audit needs.
- Documentation/governance only; no tests or historical records were removed. Prepared against a reconstructed local tree, not the current remote checkout.
- Verification: see the current evidence note in `TECHNICAL_REPORT.md`; hosted CI and remote checkout validation are NOT_RUN.

## P121.0.5 — Repository minimalism and test lifecycle policy

- Defined a current-purpose requirement for maintained repository files and a test-retention rule tied to current product obligations, meaningful scenarios, contracts, and material regression risk.
- Added a recurring review process to classify candidates as keep, update, merge, archive outside the repository, or delete after checking references, CI usage, compatibility commitments, and unique coverage.
- Clarified that historical origin alone is not a reason to retain artifacts, while required audit evidence and meaningful regression coverage must not be discarded.
- Documentation/governance only; no runtime code or existing tests were removed. This patch was prepared against an available reconstructed archive, not the current remote checkout.
- Verification: pending local documentation and version checks; hosted CI and remote checkout validation are NOT_RUN.

## P121.0.4 — Repository language policy and recurring language-neutrality audit

- Added a normative English-only policy for maintained repository artifacts while explicitly separating repository language from end-user language support.
- Added requirements against brittle language-specific marker-word routing and defined a recurring roadmap stage for classifying, correcting, and verifying language residue.
- No runtime source behavior was changed in this documentation-only patch. Previously identified Cyrillic in runtime logic and tests remains to be audited against the actual repository; this reconstructed workspace is not the current remote checkout.
- Verification: pending local documentation integrity and version checks; hosted CI and runtime language-neutrality tests are NOT_RUN.

## P121.0.3 — CI regression repair and single-source version metadata

- Fix C121 regression test that hardcoded P121.0.1 after patch P121.0.2.
- Introduce `version:check` / `version:sync`: `package.json` is authoritative; only npm lockfile root version metadata is synchronized. Historical version records are not rewritten.
- Governance tests derive the current patch from package metadata instead of hardcoding a prior patch.

# C121 / P121.0.2 — Remove Architect launch confirmation

- Removed the browser-native “Open Architect?” confirmation when the user selects Architect. Selection now records the start mode and navigates directly to `/project`.
- Added regression coverage for direct Architect launch and updated current patch assertions. Confirmations for destructive actions are unchanged.
- Version/patch: 121 / 121.0.2.

---

# C121 / P121.0.1 — Verification cycle bootstrap and documentation integrity repair

- Introduced cycle-based identity: cycle C121, product version 121, patch P121.0.1. Synchronized `package.json` and root `package-lock.json` version metadata.
- Removed the retired `NEXT_PATCH.md` handoff and 14 superseded prose documents whose current responsibilities were consolidated into canonical documentation. Historical references in retained history remain historical.
- Changed the P120 E2E preflight from a hard-coded current-version gate into a regression-suite preflight that validates the current version/patch relationship. Updated the P120 evidence regression test to preserve the historical P120.0.7 record while asserting current C121 metadata.
- Verification: `npm run docs:check` PASS; version check PASS; P120 regression preflight PASS; focused C121/P120 acceptance tests 8/8 PASS; DAG/evidence tests 27/27 PASS. `npm ci --ignore-scripts --no-audit --no-fund` timed out, so the full DAG remains FAIL (4 PASS, 14 FAIL, 6 BLOCKED) due missing `tsx`/`jszip`; typecheck, build, browser E2E, hosted CI, deployed app, and live model/artifact quality are NOT_RUN. The Architect one-flow obligation remains open.
- No runtime product behavior change is claimed. The Architect one-flow obligation remains an open implementation gap, not a passed acceptance item.

---

# Session governance and documentation consolidation — 2026-10-30

- Added a mandatory session-start protocol and top-level obligation map to `AGENTS.md`. Each session must reconstruct and verify the actual state before selecting its own task; assistants must not inherit a pre-written next-step assignment as binding.
- Removed the persistent root `NEXT_PATCH.md` planning/handoff concept. CI-generated run reports are named `PATCH_EVIDENCE.md` and `BIForge-PATCH-EVIDENCE.md`, and workflow scripts/tests are aligned with those names.
- Updated current roadmap controls and root navigation while preserving completed roadmap phases and prior report/changelog history.
- This patch changes governance/documentation and CI diagnostic naming only. It does not implement the Architect single-flow runtime requirement or claim live user-value acceptance.
- Verification in the reconstructed tree: `npm run docs:check` PASS; modified `.mjs` files pass `node --check`; `node --test tests/dag-p107.test.mjs tests/evidence-p105.test.mjs` PASS 27/27; a temporary-directory packaging smoke check produced exactly `BIForge-PATCH-EVIDENCE.md` and `biforge-ci-logs.zip`. `tests/ci-diagnostics-chain.test.mjs` and `tests/compact-ci-artifacts-p94.test.mjs` could not run because `jszip` is not installed in this reconstructed tree. Full DAG, full suite, hosted CI, browser tests, deployment and live user scenarios: NOT_RUN.

---

# Documentation reconciliation — 2026-10-30

- Consolidated normative authority into `AGENTS.md`, `TECHNICAL_SPECIFICATION.md`, `ROADMAP.md`, and `TECHNICAL_REPORT.md`; added eight specialist docs and kept `docs/VIX-CONCEPT.md` as strategy-only context.
- Explicitly set product acceptance to real user outcomes rather than test/CI completion, and defined Architect as one user-facing agent, one flow, and one completion contract with no novice/professional mode choice.
- Preserved all existing roadmap phases and historical report/changelog entries; added current notes at the top rather than rewriting prior history.
- Replaced the documentation-integrity guard's old document topology with the new canonical set and updated operational-script references.
- Superseded prose documents are listed for deletion in the patch handoff. Machine schemas and generated inventories remain.
- Verification status: pending execution in the reconstructed archive; this entry does not claim product/runtime changes.

---

## P119.0.4 — Agent-owned prompt text, agent-named chat routes, dead legacy import removed

- Navigator decisions (2026-10-29): add agent-named routes and keep the old one; legacy `engine=legacy` host usage unknown, so only the dead import is removed.
- Prompt text: intro paragraphs, `expertDialogueParagraph`, `EXPERT_STAGES` and `EXPERT_STEP_PREFIX` moved from `server/promptPacks.ts` into `server/conversationalAgent.ts` / `server/expertAgent.ts`. `promptPacks.ts` keeps the shared method/boundary/contract blocks plus `assembleConversationPrompt`; `buildSimpleConversationPrompt` and `ProductMode` removed. Model-facing bytes unchanged: SHA-256 of 8 prompts (2 agents × 4 modes), the Expert paragraph and the step prefix were captured from the P119.0.3 implementation before the move and now locked in tests.
- Routes: new `POST /api/agent/conversational` and `POST /api/agent/expert` pin the agent (`pinConversationAgent`; the route overrides `body.productMode`). `POST /api/conversation` stays and still selects by `productMode`. One shared handler (`conversationHandler`). The client (`src/conversationRoutes.ts`, `ConversationScreens.tsx`, `App.tsx`) calls the named routes.
- `server.ts` no longer imports `runAppBuilderPipeline` / `irFromPlainAnswers` (the import was unused). The gated `engine=legacy` branch in `server/projectRoutes.ts` is unchanged.
- Tests: new `tests/p119-agent-prompts-routes.test.mjs` (in `test:core` and `test:p119-agents`); HTTP checks R1–R10 added to `tests/pipeline.test.mjs`; new helper `tests/_prompts.mjs`; `KNOWN_SHARED_PATH` tests in `tests/p119-agent-boundaries.test.mjs` updated; `core`, `conversation-turn`, `pipeline` and `p119-agent-isolation` tests now import from the agent modules.
- Generated inventories regenerated (`docs/generated-route-inventory.json`, `-module-map`, `-check-graph`, `-capability-graph`); `tests/feature-manifest.json` lists the new routes.
- Docs: `TECHNICAL_SPECIFICATION.md` §6.4 (status, route table, REQ-AGENT-001/003/004), `ROADMAP.md` Phase 6 table, `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-USER-VALUE-REPORT.md`.
- Version/patch: `119` / `119.0.4`.

## P119.0.3 — Conversational/Expert isolation (first bounded step), legacy names removed from user copy

- Added `server/agentRouting.ts`, `server/conversationalAgent.ts`, `server/expertAgent.ts`: agent selection, turn planning and prompt entry are agent-owned; `server.ts` handler delegates. Output byte-identical to the pre-split logic (verified against a reference copy). Route `POST /api/conversation`, wire key `productMode`, internal `AppMode` keys and `promptPacks.ts` text intentionally unchanged.
- User-visible copy: `UserGuide.tsx` and the Architect confirmation dialog use only Conversational / Expert / Architect.
- Tests: new `tests/p119-agent-isolation.test.mjs`; `tests/p119-agent-boundaries.test.mjs` updated; both in `test:core`; new script `test:p119-agents` includes them.
- Docs: ROADMAP Phase 6 table updated, Phase 7 gets the P120 slice plan, gates and sequence carried over from `docs/p119-p121.md`; TECHNICAL_SPECIFICATION §6.4 updated (REQ-AGENT-004); `docs/p119-p121.md` got a pointer note.
- `package.json`: `typecheck`, `lint`, `build:server` run tsc with `--stack-size=4000` — `tsc` failed intermittently with `RangeError: Maximum call stack size exceeded` (also on the unmodified P119.0.2 tree); 6/6 local runs clean afterwards; guarded by a test.
- Version/patch: `119` / `119.0.3`.

## P119.0.2 — Agent boundaries: inventory, contracts, regression tests

- Inventoried routes, internal modes, workflows and shared orchestration. Result recorded once in `TECHNICAL_SPECIFICATION.md` §6.4 (boundary map, REQ-AGENT-001..003): Conversational and Expert share `POST /api/conversation` and one prompt builder selected by `productMode`; Architect is isolated (`/project`, `/api/projects/*`, `appBuilder/`, own client modules).
- Added `tests/p119-agent-boundaries.test.mjs` (21 tests) to `test:core`; new script `test:p119-agents`. Covers route ownership, client/route/import isolation, explicit agent selection (Expert only on `productMode === 'Expert'`), Architect gating, workflow inventory (no `p119-*` workflow yet), and `KNOWN_SHARED_PATH` locks for the documented shared paths.
- `tests/p119-agent-ui-contract.test.mjs`: patch assertion relaxed to `119.*`.
- `ROADMAP.md` Phase 6: P119 slice plan reconciled (0.2 boundaries, 0.3 legacy isolation; 0.4–0.7 proposed). `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-USER-VALUE-REPORT.md`, `TECHNICAL_REPORT.md` §7.3 synchronized.
- No runtime behaviour change. Version/patch: `119` / `119.0.2`.

## P119.0.1 — Three-agent entry UI and P118 status reconciliation

- Start screen and agent menu now expose Conversational, Expert, and Architect instead of the legacy-facing Simple / Project names.
- Preserved internal mode keys during this first migration slice to avoid changing accepted conversation and Architect flows before dedicated replacement pipelines are covered.
- Corrected stale P118 status in the current task, rolling user-outcome report, renovation roadmap, and protected roadmap: P118 was accepted by Navigator on 2026-10-29 after CI 27/27 and the supplied live staged ZIP evidence.
- Explicitly retain optional P118 residuals (PARTIAL download policy and dependency audit) as open, not completed.
- Version/patch: `119` / `119.0.1`. Local runtime verification is pending in this environment.

## P118.5.6 — Bounded dom-wiring repair after check failure

- **Engine:** after static validators run, if `dom-wiring` fails and budget remains, one repair call per broken script (max 2). Prompt lists the real HTML `id`s and the exact mismatch messages. Result accepted only when (1) no previously-passing required validator starts failing and (2) `dom-wiring` issue count strictly decreases. Events: `dom_wiring_repair`, `dom_wiring_repair_accepted`, `dom_wiring_repair_rejected`.
- **Tests:** `tests/app-builder-dom-wiring-p118-5-6.test.mjs` (validator unit + repair accept/reject/budget/no-op); registered in `test:app-builder`.
- **Version:** patch `118.5.6`.
- Live on 118.5.5 was honest PARTIAL (`validators_failed: dom-wiring`) — this patch closes the gap so a single model slip can recover to SUCCESS without a full rebuild.

## P118.5.5 — Dom-wiring validator + architecture boundaries + DAG

- **False SUCCESS fix (core):** new required static validator `dom-wiring` — every `getElementById` / `querySelector('#id')` literal in JS must exist as an `id` in some HTML file. Catches the live P118 mismatch (kebab-case JS vs camelCase HTML). Added to `REQUIRED_VALIDATORS` (7th) and `runStaticValidators`.
- **Architecture boundaries:** `stagedArchitectNote` moved to client-safe `src/architectNote.ts`; `src/projectBuildJob.ts` no longer imports from `appBuilder/`. Explicit `allowedExceptions` entry for intentional `src/config.ts → package.json` (single version source). `architecture:check` now PASS.
- **CI-DAG:** `architecture:check` added to `docs/verification-manifest.json` (profiles `check` + `ci`); 26 → 27 checks.
- **Version:** patch `118.5.5`.
- **Still open (follow-up):** bounded repair after `dom-wiring` failure in the engine, full test suite for the new validator, zod/body-parser/qs audit clean, docs regeneration, live re-run after deploy. Do not start P119 until CI green + working live artifact.

## P118.5.4 — Live script staged default + audit alignment

- `scripts/p118-architect-live.mjs`: stop sending `engine: 'pipeline'` (mapped to legacy and returned `LEGACY_DISABLED` on live commit `bd0e95d`). Build requests now use the staged default so exit evidence measures the Archive Delivery Canon path.
- Documentation: refreshed `docs/AI-NATIVE-RENOVATION-TASK.md` to match applied 5.1–5.3 and this fix; audit report `docs/AUDIT-2026-10-29.md`; DOCUMENTATION-INDEX entry; ARCHIVE-DELIVERY-CANON numbering aligned with shipped patches.
- Live transcript evidence (OBSERVED): build_request HTTP 409 `LEGACY_DISABLED` when script still forced pipeline — fixed in this patch (code path only; re-run live after deploy).
- CI on `bd0e95d` was PASS (26/26) after P118.5.3 adapter test fix; this patch does not change unit-test expectations beyond live client.

# P118.5.3 — CI: align stagedEnabled adapter test with P118.5.1 default

- `tests/app-builder-adapter-p93-3.test.mjs` expected `stagedEnabled({}) === false`; staged is default-on since P118.5.1. Test updated (applied on green CI `bd0e95d`).

## P118.5.2 — Archive delivery E2E proof

- Added `tests/archive-delivery-e2e-p118-5-2.test.mjs`: fake-model multi-file static_site build → JSZip open → required paths (`index.html`, `style.css`, `app.js`, `README.md`) + `build-report.json`.
- Delivery contract checks via `publicJob` + `classifyBuild` / `zipVerified` from `scripts/p118-architect-live-lib.mjs`.
- SUCCESS without `downloadUrl` or without a verified ZIP classifies as **FALSE_SUCCESS**.
- `package.json` patch field `118.5.2`; script `test:archive-delivery` runs archive-delivery unit + E2E tests.
- Live architect workflow already enforces ZIP verification; no live-script change required in this patch.
- P118 exit still requires Navigator review of evidence (offline tests + preferred live run).

## P118.5.1 — Archive Delivery Canon (implementation)

- Staged App Builder is the **default** A3 path (`stagedEnabled` true unless `APP_BUILDER_ENGINE=legacy|off|pipeline`).
- `POST /code/build` without `engine` → staged (202 + jobId). Missing DB/adapters → `STAGED_UNAVAILABLE` (not silent legacy).
- Legacy IR pipeline only with `engine=legacy` (or alias `pipeline`) **and** `ALLOW_LEGACY_APP_BUILDER=true`.
- Staged SUCCESS without a stored artifact is forced to failed (`archive_missing` / `artifact_save_failed`).
- `publicJob.downloadUrl` only when `artifactId` is set (artifact download route only).
- UI ProjectMode no longer sends `engine: 'pipeline'` on program build.
- Tests: `tests/archive-delivery-p118-5-1.test.mjs`.
- E2E download proof follows in P118.5.2.

## P118.4 — Documentation Order (DOC-ORDER-1)

- Introduced three protected primary documents at repository root:
  - `TECHNICAL_SPECIFICATION.md` — complete engineering specification (architecture, data model, API, three agents, REQ-IDs, acceptance).
  - `ROADMAP.md` — sequential implementation plan from empty repository through P118 and forward phases P119–P121.
  - `TECHNICAL_REPORT.md` — historical reconstruction and evidence record with confidence levels.
- Updated `AGENTS.md`: new laws **D1–D4** (protection against semantic reduction and fragmentation), status, reversal table, reporting requirements.
- Updated `docs/DOCUMENTATION-INDEX.md`: protected documents listed first; binding rules restated.
- Added `scripts/docs-integrity.mjs` — machine guard for existence, required sections and REQ-ID baseline.
- No runtime behaviour change. Version stays 118; patch field becomes `118.4`.

**Verification:** `node scripts/docs-integrity.mjs` must report PASS.  
**Not evaluated:** any product live run (this is a pure documentation + guard patch).

## P118.3.3 — Code-stage file marker repair (live run on 9ff44ac)

- Live evidence (OBSERVED, commit `9ff44ac`): spec and plan passed; unit `index.html` failed with `missing_expected_file_or_truncated`. The model returned a complete file (`finishReason=STOP`, 3703 chars) under the header `<<<FILE path>>>index.html`: it copied the placeholder `path` from the prompt. The parser read `path` as the file name. Reproduced locally with the same output shape.
- Prompt (`appBuilder/core-prompts.ts`): the coder prompt now names the real header `<<<FILE index.html>>>`; no copyable placeholder. `PROMPT_VERSION` → `static_site.v2` (invalidates cached unit results).
- Parser (`appBuilder/core-markers.ts`): with an expected path it deterministically accepts three known slips and reports them in `coerced`: placeholder header, decorated header (`path=index.html`), code fence around the content. A different file name is never accepted.
- Engine (`appBuilder/core-engine.ts`): one bounded repair call per file when the expected file is missing or the reply is cut off (counts against the call budget; skipped when the budget is used or the job is cancelled). New events `unit_attempt` (found paths, issues, `finishReason`, text preview, coerced) and `unit_repair`. Failure reason is now specific: `expected_path_not_found:index.html (found: …)`.
- Adapter (`server/appBuilderAdapter.ts`): `unitId` carried in event data is no longer dropped from application-log details.
- Tests: `tests/app-builder-unit-repair-p118.test.mjs` (7 tests, mutation-checked); `test:app-builder` script updated; cache-key test no longer uses the now-current prompt version as the "other" one.
- Not evaluated: hosted CI, a live run, later units/validators (`styles.css`, `storage.js`, `app.js`, `refs`, `acceptance`) and ZIP packing/verification — the live run has never reached them.

## P118.3.2 — Single version source (package.json) and documentation audit

- Version: `package.json` is the only source. New field `"patch"` (last applied patch, e.g. `118.3.2`); `"version"` must equal its first number. `src/config.ts` derives `APP_VERSION`/`APP_PATCH` from `package.json` (the browser bundle receives only these two fields via a Vite plugin); diagnostics `release` = `patch`.
- `scripts/check-version.mjs` validates `package.json` only; it no longer reads `src/config.ts`, `server.ts` or `CHANGELOG.md`. Tests in `tests/core.test.mjs` rewritten accordingly.
- `scripts/patch-tools.mjs` `versionPreflight` (called by `patch-pack`): `package.json` must be in every patch; patch number must match `--patch`, must be higher than the base patch and not below the program version.
- `tsconfig.json`, `tsconfig.server.json`: `resolveJsonModule`. `scripts/patch-quality-report.mjs`: version context from `package.json`.
- Documentation audit: `AGENTS.md` (new "Version and patch numbering", status, evidence rule, navigation), `docs/AI-OPERATING-RULES.md`, `docs/DOCUMENTATION-INDEX.md`, `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-NATIVE-RENOVATION-ROADMAP.md` (P118 exit gate), `docs/AI-USER-VALUE-REPORT.md` (new records, title fixed), `docs/AI-ENVIRONMENT-CONTEXT.md`, `docs/OPERATIONS.md`, `NEXT_PATCH.md`.
- Verification (local): `tsc` client+server, `build`, `test:core`, `test:app-builder`, `test:compact-ci-artifacts`, full `ci` DAG. Hosted CI and live workflow NOT_RUN.
- Known limitation: sub-patches share one program version; `/health` reports `version` and `commit` only (patch is in diagnostics `release`).

## P118.3.1 — CI repair for P118.3

- CI run on 1a98a6a was red (4 DAG nodes): `version-consistency`, `typecheck`, `build`, `test:compact-ci-artifacts`.
- Root causes: (1) P118.3 bumped APP_VERSION/package.json to 119 while the release label is P118.3 — `check-version` requires the CHANGELOG major to equal APP_VERSION; version restored to 118. (2) `appBuilder/core-engine.ts`: with `strict:false` TypeScript does not narrow `{ok:true}|{ok:false}` by `!x.ok`; failure fields are now read through `'error' in x` / `'issues' in x`. (3) `test:compact-ci-artifacts` (P105 end-to-end) failed only because it runs `version-consistency`; fixed by (1).
- No behavior change in the Spec repair logic.

## P118.3 — Spec bounded repair + assistant diagnostics

- Live #3: planner returned parseable JSON that failed Spec validation; recovery did not run (only on unparseable).
- Spec stage: explicit `schemaVersion:1`, `parseJsonLenient`, `validateSpec` with issue list, one recovery call that includes previous issues, concrete `failureReason` / `error.detail`.
- Diagnostics: `spec_attempt`/`spec_repair`/`spec_failed` events with text previews; adapter logs model `responsePreview` and forwards event data into application logs.
- Tests: `tests/app-builder-spec-repair-p118.test.mjs`.
- APP_VERSION stays 118 (version = phase number; sub-patches P118.x do not bump it).


## P121.0.15 — Architectural Test Lab isolated entry

- Added a separately lazy-loaded `/architect-lab` experimental workspace with its own responsive presentation, form, progress surface, completion panel, and error boundary.
- The lab creates a separately named project and uses the authenticated project-build API and shared staged-job polling; it does not mount `ProjectMode.tsx` or the legacy result UI.
- This is an isolated UI/workflow experiment, **not yet an independent backend generation engine**. Provider orchestration, validation, and artifact persistence remain shared with the existing backend.
- Added route/mount/completion contract tests. Existing three-agent entry points remain unchanged; the lab is available only by direct route.
- Local source-contract tests and ZIP validation are reported in the delivery note; typecheck/build and live Android tests remain separate evidence.


## [127.6] - Project continuation

- Added `POST /api/projects/:projectId/code/continue` for continuing work from an existing verified ZIP artifact.
- Added bounded ZIP source extraction, project ownership checks, CRC validation, path traversal protection, and explicit rejection of binary assets not yet supported by the text-context continuation path.
- Added continuation prompt construction and regression coverage.
- Added `docs/PROJECT_CONTINUATION.md`. Simple and Expert behavior is unchanged.
