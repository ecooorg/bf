## P125.8 — Evidence (2026-11-04)

Hosted CI 125.7: typecheck/build/pins green; sole product failure was universal-followup regression expecting old decisionNote. Behaviour unchanged (search still true, entities retained); assertion updated.

---

## P125.7 — Evidence (2026-11-04)

Hosted CI on 125.6 failed: typecheck/build (missing plan fields) and workflow-action-pins (unpinned AQ actions + required download-artifact pin with no user). Fixed in this patch. Local: `workflow-action-pins` PASS; full typecheck NOT_RUN in assistant sandbox without tsc install; hosted CI is authority.

---

## P125.6 — Evidence (2026-11-04)

Micro-patch: C125 programme and WP3 audit align with owner decision — only Core CI, Answer Quality, Dependabot, and CodeQL remain meaningful; other product workflows retired as stale/harmful if left runnable.

---

## P125.5 — Evidence (2026-11-04)

Product `125`, patch `125.5`. Closes residual C125 implementation gaps from P125.4 review: sourceCountry ranking in search path, diagnostics current-turn `userRequest`, workflow consolidation.

**Deletions (Navigator):** `.github/workflows/carousel-verify.yml`, `.github/workflows/information-quality.yml` — offline coverage folded into `answer-quality-verify.yml`. Scripts `scripts/carousel-*.mjs` and unit tests retained.

**Live production:** still `NOT_RUN` until release patch equals 125.5 and Navigator confirms user multi-turn outcome.

---

## P125.4 — Evidence (2026-11-04)

Product `125`, patch `125.4`. Scope: remaining WP3 (items 2, 3, 4, 8; steps 2–4 as behaviour suite + diagnostics + unified workflow).

**Code:** `server/webSearch.ts` (live-task, dictated query, sourceCountry on plan), `server/nationalAuthorities.ts`, `config/national-authorities.json`, `server/conversationDiagnostics.ts`, `server.ts` (priorLiveTaskState wire).

**Tests:** `tests/p125-4-answer-quality-suite.test.mjs`. Workflow: `.github/workflows/answer-quality-verify.yml`.

**Local sandbox test run:** may be `NOT_RUN` if npm install is incomplete in the assistant environment. Hosted CI after apply is the offline evidence channel.

**Live / production:** owner definition of C125 complete requires the multi-turn temperature-style scenario (and analogues in other languages/places) to succeed on a **deployed release whose patch equals 125.4**. That remains `NOT_RUN` until Navigator deploys and runs the dialogue (G5). Unified workflow live job is opt-in and does not replace production OBSERVED.

**WP2 O1 / IANA:** out of cycle per owner.

---

## P125.3 — Evidence (2026-11-04)

Product version `125`, patch `125.3`. Scope: WP3 scope extension implementation (search routing and answer grounding items 1, 2, 5, 6, 7) plus WP3 step-1 workflow audit table.

**Code:** `server/webSearch.ts` (gate, freshness patterns, place extraction, follow-up, status block), `server.ts` (status injection on skipped turns, planner timeout cap).

**Tests:** `tests/p125-3-search-routing-grounding.test.mjs` (offline pure). Local run: see session validation. Hosted CI: `NOT_RUN` until Navigator Actions on the applied commit.

**Docs:** `docs/C125_WP3_WORKFLOW_AUDIT.md` (step-1 audit table).

**Not in this patch:** dictated-query as sole query (item 3), sourceCountry plan field (item 4), full diagnostics export fidelity (item 8 / step 4), full regex→behaviour migration (step 2), full answer-quality replay suite with model (step 3 beyond pure gate assertions). Those remain gaps for later C125 work after owner review of the audit table.

**User-value:** OBSERVED failure chain of the 2026-11-04 nine-turn dialogue is addressed at the gate/place/status layer in pure functions; live dialogue on a running release equal to 125.3 remains `NOT_RUN` (G5).

---

## P125.2 — Evidence (2026-11-04)

Product version `125`, patch `125.2`. Scope: WP3 scope extension (documentation) and group B of the source policy (data).

- **OBSERVED (diagnostics export and render log of 2026-11-04, running release 124.40, commit fb99ded):** a nine-turn dialogue about one city's current temperature; four turns ran no search, one used a mis-parsed place, one lost the place, one planner call timed out at 8003 ms, one turn answered through the model planner and the weather connector. The running release was 124.40, so patch 125.1 was not live when the dialogue was recorded.
- **INFERRED / REPRODUCED (source, local replay of the gate functions on the 125.1 archive):** the pre-classifier is unreachable for the first turn because the planner gate rejects it; the place regex takes the first preposition-led fragment; the follow-up list lacks "one more query". The weather connector and the model planner path work.
- **RECORDED (documentation):** eight work items, tests and acceptance in `docs/C125_ANSWER_QUALITY_PROGRAMME.md` section 4. Status of every item: `OPEN`.
- **IMPLEMENTED (data):** group B enabled in `config/source-policy.json` (zones `rus`, `moscow`, `tatar`, `xn--p1acf`, `xn--80adxhks`, `xn--d1acj3b`). **NOT_VERIFIED:** the list against the IANA root zone database (not reachable in this session); the Punycode forms were computed from the zone names, not read from IANA. Cyrillic zones for "site", "online" and "org" were not applied (believed non-Russian operators, unconfirmed). The host list of group C is likewise not reconciled with EUR-Lex.
- **KNOWN LIMITS:** the zone filter removes harmless pages hosted in these zones; mirrors and aggregators remain uncovered (unchanged from P125.1).
- **TESTS:** see the validation lines below once run in this session; hosted CI, live Serper/Gemini and real conversations `NOT_RUN`.

## P125.1 — Evidence (2026-11-04)

Product version `125`, patch `125.1`. Scope: C125 WP1 and WP2.

- **IMPLEMENTED (source):** query-size rule and entity check (`server/queryFidelity.ts`), faithful plan rebuild, documented bounds instead of 500/300-character cuts; source-policy data file and filter (`config/source-policy.json`, `server/sourcePolicy.ts`) applied to the Serper response, fetch targets and redirect hops of the direct fetch; `source_policy_filtered` status; per-group counts in diagnostics; prompt rule.
- **TESTS PASS (local, Node 22):** `npm run test:core` (includes 14 new P125.1 tests), `npm run test:web`, `tsc --noEmit -p tsconfig.server.json`, `npm run lint:copy`, `npm run version:check`. Hosted CI `NOT_RUN`.
- **OPEN / NOT_VERIFIED:** group B zones (`.rus`, `.moscow`, `.tatar`, Cyrillic zones) are disabled until checked against the IANA root zone database; the zone lists and the host candidates (`rt.com`, `sputnikglobe.com`, `sputniknews.com`, `tass.com`) were not confirmed against IANA or EUR-Lex (not reachable in this session); the full EU Annex XV list is not loaded. The 2026-11-04 diagnostics export is not in the archive, so the replay test uses a synthetic host mix: the acceptance replay on the real export is `NOT_RUN`. Live search quality and measurement of the main model's source preference without search are `NOT_RUN`.
- **KNOWN LIMITS:** the Jina Reader proxy follows redirects itself, so only the direct-fetch fallback checks every hop; mirrors, archives, translation proxies, social platforms and aggregators are not covered; the zone filter also drops harmless pages hosted in those zones; the Cyrillic-name match is a consonant-skeleton heuristic, a false miss only triggers the safe fallback. Open question O1 (bypass on explicit request): default no bypass.
- **CHANGED CONTRACT:** the P124.39 test fixture no longer uses `ria.ru` as an unlisted host.

## P124.40 — Evidence (2026-11-04)

Product version `124`, patch `124.40`. Documentation only.

- **RECORDED:** C125 scope (three work packages) and two owner decisions; all status `OPEN`.
- **CHECKED (public secondary sources, 2026-11-04):** `.xn--p1ai` (Cyrillic Russian zone) run by the Coordination Center for TLD RU; `.su` run by RIPN with an announced ICANN phase-out by 2030; `.xn--90ais` (Cyrillic Belarus zone), registry cctld.by; EU ban list names include RT English, RT UK, Sputnik, Rossiya 24, TV Centre International, NTV/NTV Mir, Rossiya 1, REN TV, Pervyi Kanal.
- **NOT_VERIFIED:** the IANA root zone database (not reachable in this session), the full EU Annex XV list, operators of `.rus`, `.moscow`, `.tatar` and the other Cyrillic zones, and the candidate state-host list. The programme document marks these as to be verified.
- **TESTS PASS (local, Node 22):** `npm run lint:copy`, `npm run docs:check`, `npm run version:check`, `npm run test:core`, and the `check` verification DAG (26/26 PASS). Hosted CI `NOT_RUN`.

## P124.39 — Evidence (2026-11-04)

Product version `124`, patch `124.39`.

- **OBSERVED (diagnostics export, release 124.36):** search turns on `pre_classifier_live_data` used Russian queries (`planSource: heuristic`) and returned Russian-language hosts; the single turn on a model plan used English queries and hosts such as reuters, apnews, politico. Search result text is not exported, so which page first carried the Toledo claim is `NOT_VERIFIED`.
- **IMPLEMENTED (source):** English-only provider queries for every plan; trusted-source registry and labels; OLD marking and exclusion for freshness `now`; corroboration and same-name rules in the evidence contract; region-qualified place matching.
- **LIMITS:** the registry is a finite owner-supplied list; an unlisted outlet is "not proof on its own", not "false". A state-affiliated outlet outside the list is not separately flagged. Date detection needs a SERP date or a date in the URL path; undated results are not marked.
- **TESTS PASS (local, Node 22):** new suite 10/10; `npm run test:core`, `npm run test:web`, `npm run typecheck`, `npm run version:check`, `npm run docs:check` and the `check` verification DAG: `check` verification DAG 26/26 PASS; additionally `test:pipeline`, `test:turn`, `test:gates`, `test:security`, `test:project`, `test:models`, `test:capability-graph` PASS.
- **NOT_RUN:** hosted GitHub Actions, live Serper/Gemini, real conversations, user-level answer quality.

## P124.38 — Evidence (2026-11-04)

Product version `124`, patch `124.38`.

- **OBSERVED (diagnostics export `biforge-diagnostics`, app 124 / release 124.36, one Expert dialogue about the US midterms):** 4 of 9 time-sensitive turns ran no search; 2 searches used the raw wording of the turn as query; 1 meta question about sources was sent to the search provider; one turn hit Gemini key-pool quota and fell back to Groq; two turns hit the 12 s model timeout. Search result text is not in the export, so whether individual claims in the answers were supported by retrieved pages is `NOT_VERIFIED`.
- **ROOT CAUSES (source inspection):** keyword-only gate in front of the planner; fixed-phrase follow-up detection; pre-classifier on raw wording; no stored source list for earlier replies.
- **IMPLEMENTED (source):** wider planner gate, live-thread follow-ups, meta-question guard with honest status block, dialogue-reference handling in the pre-classifier and in the planner-outage fallback.
- **OPEN:** persisting the source hosts of each answer with the dialogue (needs a client and state-schema decision and owner approval against P123.17); quota and timeout handling; planner on every question turn behind a flag.
- **TESTS PASS (local, Node 22):** new suite 6/6; `npm run test:core`, `npm run test:web`, `npm run typecheck`, `npm run version:check`, `npm run lint:copy` and the `check` verification DAG: `check` DAG 26/26 PASS; additionally `test:pipeline`, `test:turn`, `test:gates`, `test:security`, `test:project` PASS.
- **NOT_RUN:** hosted GitHub Actions, live Gemini/Serper, real conversations, user-level answer quality.

## P124.37 — Evidence (2026-11-04)

Product version `124`, patch `124.37`.

- **OBSERVED (hosted run for patch 124.36, log `0_check-and-build`):** DAG 28 PASS, 2 FAIL (`test:core`, `test:web`); one failing test in each.
- **ROOT CAUSES (source inspection plus local reproduction):** (1) stale source-contract assertion after P124.36 added two more `/project` navigations in `src/App.tsx`; (2) branch order in `contextualizeSearchText` made the self-contained-follow-up shortcut unreachable after P124.35.
- **FIXED (source):** `tests/p119-agent-boundaries.test.mjs` (contract = every navigation targets `/project`); `server/webSearch.ts` (shortcut moved before the prior-task branch); `tests/web-and-epistemics.test.mjs` (extra assertion).
- **TESTS PASS (local, Node 22):** `npm run test:core`, `npm run test:web`, `npm run typecheck`, `npm run version:check`, `npm run lint:copy`.
- **NOT_RUN:** hosted GitHub Actions for this patch, browser E2E, live providers, user-level answer quality.
- **SCOPE:** no UI/route/entry changes.

## P124.36 — Cross-mode header and More-menu parity (2026-11-03)

- **IMPLEMENTED (source):** Conversational and Expert share the same context-aware decision brief and delete-dialogue menu actions. Architect is reachable from the chat header when enabled.
- **IMPLEMENTED (source):** Architect header adds New and History navigation into the conversation shell. One-shot session flags are consumed by the chat shell; New creates a fresh conversation and History opens the existing history panel. Architect More links to the shared conversation workspace for import/export, saved texts and AI-key management; Architect diagnostics, Drive save, guide and sign-out remain available.
- **TESTS PASS (local):** `node --test tests/p124-36-unified-mode-menus.test.mjs` — 4/4.
- **NOT_RUN:** TypeScript check, production build, existing browser E2E, hosted GitHub Actions, deployed UI and user-level validation. The sandbox has no installed `node_modules`; source-contract tests do not prove browser behavior.
- **G4 UI impact:** visible steps changed: (1) Architect header New → chat shell creates new conversation; (2) Architect header History → chat shell opens History; (3) Architect More → conversation workspace; (4) chat header Architect workspace → `/project`; (5) Conversational/Expert More → Brief/Delete for the active dialogue. New `data-testid`s: `architect-new-conversation`, `architect-conversation-history`, `architect-conversation-tools`. Existing Architect completion surface and its test IDs were not modified; whether browser E2E still reaches completion is **NOT_RUN** because browser E2E was not run.

## P124.35 — Cross-domain context recovery and evidence relevance (2026-11-03)

- **IMPLEMENTED (source):** `server/webSearch.ts` now resolves recognizable follow-ups against only the immediately preceding user task. It preserves prior task/entities for continuation requests, does not carry context across an intervening unrelated user turn, and returns a deterministic contextual plan when the search planner is unavailable or throws. Personal-data exclusion is applied to deterministic fallback queries.
- **IMPLEMENTED (source):** retrieval usability checks digest/source relevance against the resolved query/topic and place. Numeric evidence is not a universal requirement; it is required only when the query expresses a numeric, time, price, rate, measurement, or similar request.
- **TESTS PASS (local, Node 22 `--experimental-transform-types`):** 91/91 across the P124.23–P124.31 retrieval/planner/key-pool/carousel/latency suites plus `tests/universal-followup-regression.test.mjs`. The native transform-types mode supports the TypeScript parameter properties used by the key-pool and carousel modules.
- **DOCS / ARCHITECTURE PASS:** docs integrity, reference integrity, environment example coverage, documentation inventories, generated check graph, generated capability graph, API route index (86/86), architecture boundaries (0 cycles / 0 violations), and version metadata (`124.35`).
- **BLOCKED:** `npm ci --ignore-scripts --no-audit --no-fund` timed out twice. The global TypeScript check is blocked by the missing `vite/client` type package. Normal `npm run typecheck`, `npm run build`, and complete `npm run test:core` were not run.
- **NOT_RUN:** hosted GitHub Actions, live search providers, real LLM planner/fallback calls, deployed conversation scenarios, and user-level answer quality. No claim of live internet or factual answer quality is made.
- **SCOPE:** universal Conversational retrieval behavior; no UI/route/agent-entry changes. Regression fixtures are cross-domain and weather is one ordinary case.

## P124.34 — Evidence (2026-11-03)

Product version `124`, patch `124.34`.

- **OBSERVED (run 41688456448, patch 124.33, commit a32c606):** Core CI FAIL; `test:core` 204/206 (two tests in `tests/p124-28-search-planner.test.mjs`), `test:carousel-unit` 11/12 (suite file exit 2); 28 of 30 DAG checks PASS.
- **ROOT CAUSES (source inspection plus local reproduction):** (1) carousel probe executed its network probe on import and called `process.exit(2)`; (2) the 124.33 pre-classifier matched bare time words and ignored the personal-data rule.
- **FIXED (source):** probe wrapped in `runProbe()` behind a direct-invocation guard; pre-classifier restricted to live-data topics with personal-data and private-person deferral; regression test added.
- **NOT_RUN:** hosted GitHub Actions, live Render probe, live Gemini/Groq/Serper timings.

## P124.33 — Evidence (2026-11-03)

Product version `124`, patch `124.33`.

- **FIXED (source):** Core CI blockers from 124.32 diagnostics — Zod 4 schema defaults and `z.record` arity; Cyrillic lint in diagnostic report and KeepAlive; carousel unit-workflow/probe env-key alignment; `MODEL_CASCADE_LIGHT` order; probe exit policy split (contract vs live health); live-smoke per-model partial-pass; planner 3 s + live-data pre-classifier; abort-listener cleanup in model rate-limit wait.
- **OBSERVED in prior logs (124.32):** carousel workflow red for probe/test mismatch and models.light order; Core CI failed on lint:copy, typecheck, package limits.
- **NOT_RUN:** full `npm ci` + hosted GitHub Actions + live Render probe + live Gemini/Groq timings from this sandbox. Deploy and green Actions are the Navigator pass criterion.
- **Expected effect (INFERRED):** Core CI green; carousel deterministic layer green; weather/news paths skip the 8 s planner on the common case; fewer MaxListenersExceededWarning events.


## P124.32 — CI and live-diagnostic corrections (2026-11-03)

- **IMPLEMENTED:** corrected the two stale test assertions reported by Core CI: P124.27 direct-mode source-count test now includes the additional sanitized runtime-config occurrence; P124.28 planner test now verifies the deadline-aware split gate (`plannerEnabled`, `plannerEligible`).
- **IMPLEMENTED:** all workflow shell steps that pipe commands through `tee` now enable `set -o pipefail`, so failing tests/typechecks/live probes cannot be masked by a successful `tee` process.
- **IMPLEMENTED:** live Gemini smoke samples use isolated key-pool health state, preventing a previous timed-out sample from contaminating later model/sample results with false instant `blocked` statuses.
- **IMPLEMENTED:** Render Production baseline is fully enumerated in `docs/RENDER_ENV_CONTRACT.md`; ops-probe fallback values for query/page counts now match the canonical baseline.
- **NOT_YET_VERIFIED:** hosted CI, TypeScript check, full deterministic suite, and live provider smoke must be rerun on GitHub Actions. This local reconstruction does not contain a complete installable `tsx` dependency tree, so no green CI claim is made here.
- **Live evidence requiring follow-up:** the supplied Gemini live run had 0/4 successful samples; the first `gemini-3.5-flash-lite` call timed out at 12,004 ms and the shared key-pool state then blocked the remaining samples. P124.32 removes that diagnostic contamination; it does not itself fix provider-side Gemini latency. Rerun the live workflow to obtain independent timings.

## P124.31 — Bounded model latency and carousel diagnostics (2026-11-03)

- **IMPLEMENTED; static verification PASS:** Node syntax checks for changed scripts, workflow YAML parse, docs integrity/reference/environment checks, generated route/env inventory checks, and version metadata all pass. `server/llmLatencyConfig.ts` centralizes hard runtime ceilings (12 s per call, 30 s total request, 3 model calls); stricter Render values are honoured and permissive values are clamped. `server.ts` removes the second full Gemini candidate pass after transient failures, applies one 30 s deadline across search preparation and generation, bounds model-queue reservations by the remaining deadline without consuming a slot when the wait would exceed it, and emits per-call start/end diagnostics. `server/webSearch.ts` no longer invokes the LLM Search Planner for ordinary non-freshness conversation turns; it remains active for likely-current-info requests and explicit search follow-ups.
- **IMPLEMENTED:** `GET /health/runtime-config` exposes only sanitized non-secret settings for deployment comparison, including effective model-start spacing and App Builder/hosting/rate-limit settings. Search chain events include planner and per-provider/connector timings. The Render snapshot includes in-memory model/source health counters and cooldowns. It excludes secret values and secret variable names.
- **IMPLEMENTED:** `carousel-verify.yml` now captures deterministic latency/planner/search-carousel tests, repeated per-model live Gemini timings, optional Groq fallback, isolated Serper/Gemini Search/Jina and weather-connector probes, safe credential/source/model health, and Render public endpoint/config diagnostics. Live provider calls remain manually opt-in.
- **NOT_RUN:** dependency install (`npm ci` did not complete in this environment), TypeScript typecheck, full tests, hosted GitHub Actions, real Gemini/Groq/Serper/Jina/weather timings, and live Render endpoint probe. The archive is a reconstructed local source snapshot; remote HEAD and hosted CI are not inferred.
- **Expected effect (INFERRED):** ordinary messages avoid the unnecessary planner call; requests that previously repeated the entire Gemini cascade after transient failures now stop after one candidate pass; search preparation + generation share a 30 s request deadline; configured 20 s / 70 s / 4-call values are clamped to 12 s / 30 s / 3. Real p50/p95 improvement must be measured with the rebuilt workflow.

## P124.30 — Search provider chain (2026-11-03)

Product version `124`, patch `124.30`.

- **REPRODUCED (local, unit, injected providers):** `tests/p124-30-search-carousel.test.mjs` — carousel parsing and defaults; failure classes; breaker open / half-open single trial / reopen; per-provider daily budgets; first usable provider wins; Serper 429 falls through to Gemini and the next request skips Serper; budget-exhausted chain ends in an honest quota failure; connector evidence merged and kept when providers fail; the search function does not touch the generation cap. `typecheck`, `version:check`, `test:core`, `test:pipeline`, `test:files`, `test:web`, `test:turn`, `test:models`: exit 0 locally.
- **NOT_RUN:** live Serper / Gemini `googleSearch` through the chain, acceptance A5 against real 429s, hosted CI, remaining test suites.
- **OPEN:** second SERP adapter (`serp2` slot is `not_configured` until the owner names the provider); rates and crypto connectors (not approved); breaker and budget state are per process and reset on restart. A `SEARCH_CAROUSEL` value already set in production is now honoured; its content was not seen.

## P124.29 — R-7 weather connector and cache (2026-11-03)

Product version `124`, patch `124.29`.

- **REPRODUCED (local, unit, injected fetch):** `tests/p124-29-weather-connector.test.mjs` — switch off by default; geocoder candidate filtered by plan country; both providers, model time, unit conversion, discrepancy naming, attribution; 10-minute cache hit/expiry and no cached failures; one or both providers failing; merge with the SERP result. Typecheck, `architecture:check`, `lint:copy`, `docs:integrity`, `test:files`, `test:pipeline` pass locally.
- **NOT_RUN:** live Open-Meteo / MET Norway (response shapes follow the providers' documented JSON from memory, `NOT_VERIFIED` against the live APIs), terms of use re-reading, accuracy against station data, hosted CI, full `test:core`.
- Known limits: MET Norway daily values come from hourly temperatures only (no precipitation); partial first and last days; in-memory cache is per process and lost on restart.

## P124.28 — T-1, T-2 and key-ownership fact (2026-11-03)

Product version `124`, patch `124.28`.

- **REPRODUCED (local, unit):** `tests/p124-28-search-planner.test.mjs` — planner decision drives the search; the last turns reach the planner; malformed output, personal data and every failure are handled with a recorded note; hard gates precede the planner; the server hands the plan on. Typecheck of `tsconfig.server.json`: clean. Related suites (p124-23/25/26/27, web-and-epistemics): 80/80 pass.
- **Measured:** heuristic fallback alone on the 26 + 26 fixtures: 5/26 positive, 0/26 false triggers. The wiring test uses a scripted model and is **not** a measurement of planner quality.
- **NOT_RUN:** live Gemini/Serper, planner accuracy (target >= 90% positive, <= 5% false triggers, acceptance A7), hosted CI, full `test:core`. **Owner fact (not verified by Claude):** the ten Gemini keys are ten projects of ten scientists of one organization; this refutes the K-1 one-project inference, and the cause of the 2026-11-02 simultaneous 429 stays `NOT_VERIFIED`.
- Known limits: the planner adds one model call (to one of the ten projects) per eligible message; a planner outage falls back to the regular expressions.

## P124.27 — K-2, K-3, K-4, K-5, E-1, A-1 and locale rule (2026-11-03)

Product version `124`, patch `124.27`.

- **REPRODUCED (local, unit, injected errors):** rotation over keys on 429/5xx/auth, per key-and-model cooldown, shared-quota parking after three distinct keys, fallback model for helper calls, BYOK bypass, no key material in the snapshot, verifier off by default, direct mode only on explicit `true`. `tsc` and `test:core` pass.
- **NOT_RUN:** live Gemini (real 429 behaviour, real quota sharing), hosted CI, acceptance A5. **INFERRED:** that the ten keys share one project (K-1); the pool treats 3 distinct-key quota hits within 60 s as that signal, a threshold chosen without live data. Known limit: the main `generate()` model queue and the pool both park models, by different rules (30 min global vs 5 min pool).

## P124.26 — R-3, R-4, R-6, P-1, P-2, P-3, T-3 (2026-11-03)

Product version `124`, patch `124.26`.

- **REPRODUCED (local, unit):** `tests/p124-26-query-status.test.mjs` — instruction words leave the query; planner failures are recorded, not silent; `gl` follows the plan country; weak results retry once and end as `used_weak` / `no_relevant_data`; the status block forbids "no internet" claims; follow-up definition is single. `tsc` and `test:core` pass.
- **NOT_RUN:** live Serper/Gemini, hosted CI, acceptance A1, A2, A5. **INFERRED:** planner country accuracy and retry benefit on real pages are not measured. Known limit: the usability check is lexical (place token and a digit); it cannot judge that a number is the right quantity.

## P124.25 (retrieval integrity) — R-1, R-2, R-5 (2026-11-03)

Product version `124`, patch `124.25` (unchanged by owner decision).

- **REPRODUCED (local, unit):** `tests/p124-25-retrieval-integrity.test.mjs` — four 4400-character sub-queries now all appear in the digest (R-1); snippets survive when pages are downloaded (R-2); home pages, already-claimed URLs and different-ccTLD sources are not fetched; `JINA_API_KEY` becomes a bearer header. Related suites (`web-and-epistemics`, `p124-23`, `p124-24`, `redact-secrets`) and `tsc` pass.
- **NOT_RUN:** live Serper/Jina/Gemini, hosted CI, the Zurich acceptance scenario (A1). **INFERRED:** quality of the real digest improves; not measured. Country filtering is inactive until P124.26 supplies the country.

## P124.25 — Benign ResizeObserver notice no longer stops the UI (2026-11-03)

Product version `124`, patch `124.25`.

- **OBSERVED (owner screenshot):** emergency screen with a single `WINDOW_ERROR`, message `ResizeObserver loop completed with undelivered notifications`, from the production bundle. **OBSERVED-SRC:** the `error` handler treated every non-resource window error as critical.
- **REPRODUCED (local):** `tests/p124-25-emergency-benign.test.mjs` and `tests/p121-emergency-screen.test.mjs` pass. **NOT_RUN:** browser re-check, hosted CI. **INFERRED:** the notice comes from a layout observer in the bundle; whether it recurs in a loop is not established.

## P124.24 — Diagnostics separation, snapshot, restart evidence (2026-11-03)

Product version `124`, patch `124.24`.

- **OBSERVED-SRC:** the Simple/Expert header button now reaches a conversation log; Project Mode's route is unchanged. Secrets are exported only as set/length/fingerprint; the unit test asserts no key fragment appears. Restart evidence (previous-shutdown reason, uptime, memory, container limit) is written at boot.
- **REPRODUCED (local, Node strip-types):** `tests/p124-24-diagnostics.test.mjs` 7/7 pass (snapshot rule, unused-name scan, shutdown classification, lifecycle round trip, memory limit, build stamp, wiring).
- **NOT_RUN:** `conversationSessionLog()` against a live database, `npm run build` with the stamp step, typecheck, hosted CI, deployment. The temp-directory lifecycle file survives process restarts but not a new container; `no_record` then means "fresh filesystem", not "first ever start".
- **Open:** cause of the ~138 starts is still unknown (needs real `previousShutdown` data after deploy). Remaining findings per `docs/WEB_SEARCH_REMEDIATION.md`.

## P124.23 — V-1 fix and persistent search-decision logging (2026-11-03)

Product version `124`, patch `124.23`.

- **OBSERVED-SRC:** the V-1 cause (`[-+]?+8%` built from a signed value) is removed; the validator is wrapped so it cannot fail a response; search decisions, gate skips, and reasons are written to application logs with hosts only (no URLs, no digest text).
- **REPRODUCED (local, Node strip-types):** `tests/p124-23-search-integrity.test.mjs` 6/6 pass, including `+8 °C` no longer throwing. `lint:copy`, `docs:integrity`, `version:check` re-run; see chat for results.
- **NOT_RUN:** full `test:core`/typecheck (no `tsx`/dependencies in the authoring sandbox), live Serper/Gemini, hosted CI, deployment.
- **Open:** R-1…R-6, T-1…T-3, K-1…K-5, P-1, P-2, E-1 remain open per `docs/WEB_SEARCH_REMEDIATION.md`.

## P124.22 — Web-search live-data defect audit recorded (2026-11-03)

Product version `124`, patch `124.22`. Documentation-only.

- **OBSERVED-LOG (CI):** run 41600406096 failed 6 tests, all from `lint:copy` reporting Cyrillic in `docs/biforge-web-search-analysis.md`. **Fix applied:** the file is now English (banner marks it auxiliary and non-governing). `npm run lint:copy` and `docs:integrity` re-run locally: see chat; hosted CI `NOT_RUN`.

- **OBSERVED-LOG / OBSERVED-SRC / REPRODUCED:** search is enabled and reaches the model, but the digest loses sub-queries to a fixed character budget, drops snippets once any page is fetched, favours wrong-country pages, fixes `hl=en, gl=us`, and never checks usability before marking `used`; the number validator throws on values such as `+8`; the search trigger fires for 9 of 26 realistic live questions; all ten Gemini key slots returned quota errors in one window; production runs the pipeline, not direct mode. Full register: `docs/WEB_SEARCH_REMEDIATION.md`.
- **OBSERVED-SRC:** five environment variables set on the host (`SEARCH_CAROUSEL`, `SERPER_ENABLED`, `BIFORGE_ENABLE_WEB_SEARCH`, `JINA_API_KEY`, `JINA_READER_BASE_URL`) are not read by any source file. The Simple-mode diagnostic button exports a Project-Mode-oriented log.
- **INFERRED:** the ten Gemini keys share project-level quota; the process restarts (138 starts in about 37 hours) come from a mix of deploys, host sleep, and possibly crashes; the commit difference between diagnostics (`7ad970d`) and the supplied deploy log (`9db8a51`) reflects a later deploy.
- **NOT_VERIFIED:** that the source archive equals the deployed commit.
- **NOT_RUN:** live Serper, Jina, Gemini, Open-Meteo calls; hosted CI; deployment; real-user weather scenario. No user-value claim is made by this patch.
- **Checks run for this patch:** see the delivery message (docs integrity, reference integrity, version metadata, cycle-governance test).

## P124.21 — Search follow-up and numeric-gate repair (2026-11-02)

Product version `124`, patch `124.21`. OBSERVED in source: direct mode performs Serper lookup for search-triggered turns, translates contextualized queries, injects search evidence, and uses Gemini grounding only if Serper has no usable result; recognized explicit-search follow-ups inherit search intent. Numeric validation now logs unsupported tokens without rejecting a valid response. NOT_RUN: local tests/typecheck (dependencies absent), live Serper/Gemini behavior, hosted CI.

## P124.20 — Key rotation in direct mode (2026-11-02)

Product version `124`, patch `124.20`. OBSERVED in source: direct Gemini helper rotates up to 3 pool keys on quota/auth/5xx. NOT_RUN: live quota-exhaustion scenario, hosted CI.

## P124.19 — Search grounding in direct mode (2026-11-02)

Product version `124`, patch `124.19`. OBSERVED in source: the direct Conversational call includes the Gemini `googleSearch` tool and returns grounding sources. NOT_RUN: live Gemini call, hosted CI. Search success on the hosted service is unverified.

## P124.17 — Direct Gemini pass-through (2026-11-02)

Implemented a default-on direct Gemini path for the Conversational endpoints. It sends a plain-text request to one selected Gemini model and returns `response.text` unchanged as `data.reply`. The path does not call Serper or any other search provider, does not use external model fallback, does not request JSON output, and does not run retry, URL stripping, internal-label scrubbing, response shaping, or the epistemic verifier. The application log records provider/model, raw and visible text, matching SHA-256 hashes, and `outputModified=false`.

This is an isolation test. It does not provide current weather or other live facts because search is deliberately disabled. A successful source-level test does not establish a live Gemini call; hosted deployment and user-level verification remain NOT_RUN.

## CURRENT EVIDENCE NOTE — P124.16 diagnostics contract test repair (2026-11-02)

**Patch identity:** product version `124`, patch `124.16`.

### Finding

Hosted CI for P124.15 failed only in `tests/project-diagnostics-p92.test.mjs`: its P92 assertion still required the compact session log to omit request/response bodies and prompts. That assertion contradicted the single-user full-conversation capture policy introduced in P124.0.15. The implementation was not changed.

### Repair

The stale assertion and test name were replaced with contract checks for retained conversation evidence markers and continued credential redaction. The test also verifies that the model system instruction, assembled prompt, raw output, cleaned reply, and final visible reply are instrumented.

### Verification

Targeted test, typecheck, build, and hosted CI rerun are **NOT_RUN** in this assembly. The required first rerun is `npm run test:project-diagnostics`, followed by the complete Core CI workflow.

## CURRENT EVIDENCE NOTE — P124.15 full-content diagnostics (2026-11-02)

**Patch identity:** product version `124`, patch `124.15`. **Baseline:** reconstructed P124.14 source tree with the original P124.15 menu patch applied.

### User problem and change

Simple and Expert expose `More → Diagnostic log`. The log now captures the full conversation evidence needed to identify answer loss: user request and recent history, normalized history passed to the model, assembled model prompt, raw structured model output, cleaned reply/question, final visible reply, search query and returned sources, provider/model metadata, response metadata, and fallback request context. Conversation event details are emitted without short metadata truncation and the compact export cap is raised to 240 KB.

Credentials, cookies, API keys, and authentication tokens remain redacted. Conversation content is intentionally included because this is a single-user test deployment. This patch changes diagnostic capture only, not agent instructions or response generation.

### Verification

Targeted syntax and contract checks are **NOT_RUN** at assembly. Typecheck, production build, and hosted CI are **NOT_RUN**. Live Simple/Expert verification remains required.

## CURRENT EVIDENCE NOTE — P124.14 preflight false-positive repair (2026-11-02)

**Patch identity:** product version `124`, patch `124.14`. **Baseline:** supplied `bf-124-12.zip` with P124.0.13 overlay applied; hosted evidence commit `82e1f55a13ca73a95a3af12520b8da721d09ba31`.

### Finding

- The hosted Core CI report records 1,554/1,556 TAP tests passing and one failing DAG check, `test:models`. The sole assertion failure is `the real repository passes the preflight (no false positives)` at `tests/models.test.mjs:1036`.
- `preflight()` rejected `.github/dependabot.yml` because `.github` was missing from `ALLOWED_TOP`, even though `.github/workflows/**` was already an explicit supported repository path and Dependabot configuration is a valid GitHub repository file. `PATCH_EVIDENCE.md` repeats the same failure excerpt; it is not a separate defect.
- Added `.github` to the supported top-level directory list. Existing depth rules still allow `.github/workflows/**` at depth three and reject unsupported nested `.github` directories. Added positive and negative regression assertions.

### Verification

- Source-level review confirms the failing path is now accepted and unsupported nested `.github` paths remain rejected.
- Hosted report baseline: `test:core` 120/120 PASS, `test:pipeline` 22/22 PASS, `typecheck` PASS, `build` PASS, security 24/24 PASS, database live 68/68 PASS; only `test:models` failed (149/150).
- Local dependency-backed execution, full DAG, and a new hosted Actions run: **NOT_RUN** in this delivery environment. The targeted test depends on repository dependencies (including `jszip`/`tsx`); no PASS is claimed for the new commit.

### Boundary

This patch addresses the evidenced preflight false positive only. It does not establish that the new hosted commit is green or close unrelated audit items.

---

## P124.13 — red-CI diagnosis and regression repair

### Input evidence

- Diagnostic bundle: `bf124.zip`; source snapshot `bf-124-12.zip`.
- CI commit: `099f7dd42b8e7712c3970cde5a64413ca65bbb37`.
- Core CI: 27/29 DAG checks passed; `test:core` and `test:models` failed.
- End-to-End Acceptance: 3/4 checks passed; the Conversational/Expert transition test timed out waiting for the empty-state `Start conversation` button after a mode switch.
- Expert verification: the `tests/pipeline.test.mjs` matrix job exceeded its 120-second test timeout. The main CI pipeline suite had passed in 122.278 seconds with a 300-second timeout.
- Recorded typecheck, production build, architecture, database live, security, App Builder and other test suites passed. Gitleaks SARIF contained zero findings.

### Changes

1. `tests/c124-instruction-inventory.test.mjs`: replaced the stale required `server.ts` inventory reference with the current `server/agentRouting.ts` and `server/conversationalAgent.ts` source owners. The line-range validation remains intact.
2. `tests/models.test.mjs`: changed stale Russian expected strings to the actual English `replace / add / delete` summary contract, consistent with the repository language policy.
3. `tests/p120-agent-transitions-e2e.test.mjs`: after switching back to Conversational, assert that the fresh session composer is mounted directly and that the empty-state button is absent; continue testing that old session context does not leak.
4. `.github/workflows/expert-verify.yml`: increased the unit matrix timeout from 120 to 300 seconds, matching the primary pipeline configuration and measured suite runtime.
5. `src/workspace/hash.ts` and `src/workspace/exportZip.ts`: removed the browser-incompatible `node:crypto` fallback and duplicate SHA-256 implementation. Workspace export now uses the shared Web Crypto helper; environments without Web Crypto fail with an explicit error rather than attempting to load a Node built-in in the browser.
6. `tests/workspace.test.mjs`: added a regression guard against `node:crypto` imports in browser workspace hashing/export.
7. `package.json` and `package-lock.json`: patch metadata advanced to `124.13`.

### Verification

- CI-provided pre-change evidence: `typecheck` PASS; `build` PASS (with Vite warnings about Node crypto externalization and large chunks); architecture PASS; `test:security` 24/24 PASS; `test:database:live` 68/68 PASS; `test:app-builder` 94/94 PASS; `test:pipeline` 22/22 PASS in 122.278 seconds; Gitleaks 0 findings.
- Local `npm ci --no-audit --no-fund` was attempted and timed out after 300 seconds; the environment did not complete dependency installation.
- Dependency-backed reruns of `test:core`, `test:models`, `test:workspace`, typecheck, build and Playwright E2E are therefore NOT_RUN after the edits.
- Hosted GitHub Actions for P124.13 and live user/provider scenarios are NOT_RUN.

### Status

The four CI/E2E causes evidenced by the supplied logs have targeted source/test/workflow corrections. The browser workspace Node-crypto warning also has a source-level correction. This is not a claim of green CI: final acceptance requires the published commit's GitHub Actions results. The dependency installation timeout prevents local end-to-end verification in this environment.

## P124.12 — security redaction, immutable CI and documentation maintenance

**Status:** targeted dependency-free checks PASS; full suite BLOCKED by unavailable npm registry/cache; hosted CI and live behavior NOT_RUN. This is not a release acceptance claim.

**Baseline:** supplied `bf-124-9-green.zip` with P124.10 and P124.11 overlays applied in sequence. Patch identity follows `AGENTS.md`: `package.json` version `124`, patch `124.12`.

**Implemented:**
- Secret redaction inventory now includes Serper, Cloudflare API token, GitHub token and Gemini slots derived from `resolveGeminiKeySlots`; string redaction catches common Google/GitHub/OpenAI credential formats and `x-byok-key` header values. Recursive object redaction treats `x-byok-key` as sensitive.
- CI external actions are pinned to full commit SHAs: checkout v7.0.1, setup-node v7.1.0, cache v6.1.0, upload-artifact v7.0.2, download-artifact v8.0.2, gitleaks-action v3.0.0. These actions use Node 24 and require self-hosted runners at 2.327.1 or newer; GitHub-hosted runners satisfy this requirement. Dependabot checks GitHub Actions weekly.
- API contract documentation now generates an index from all 84 source-discovered routes; stale or missing generated rows fail `docs:check`. Auth/Project-Mode/request/response/error schemas remain explicitly pending where not source-verified.
- Security documentation now describes browser-local BYOK storage, the `x-byok-key` request header, seven-day stateless session cookies, logout/revocation limits and third-party data disclosures.
- `.env.example` includes previously undocumented tuning/platform variables. `docs/C124_INSTRUCTION_INVENTORY.md` now uses function/route symbols instead of fragile `server.ts` line numbers. Package metadata is `biforge`; `tsx` is dev-only; unused `autoprefixer` was removed.
- Maintained patch/handoff prose is English. `lint:copy` now enforces the repo language policy outside an explicit allowlist of bilingual modules, user-language evidence and fixtures.
- Environment inventory, module map, check graph and capability graph were regenerated; route and migration inventories were verified unchanged, and the API route index was generated from the existing route inventory.

**Checks actually run:**
- `node --experimental-strip-types --test tests/redact-secrets.test.mjs`: PASS 4/4.
- `node --experimental-strip-types --test tests/security-headers.test.mjs`: PASS 3/3 (middleware contract); `tests/pipeline.test.mjs` also now asserts headers over real `/`, `/health` and `/api/health` responses and submits a malformed request with a synthetic BYOK header to check it is not echoed; that HTTP integration suite is NOT_RUN locally.
- `node --test tests/workflow-action-pins.test.mjs`: PASS 2/2.
- `node --test tests/p121-emergency-screen.test.mjs tests/diagnostics-summary-contract.test.mjs`: PASS 3/3 (P124.10 regression checks).
- `node scripts/api-contract-coverage.mjs`: PASS 84/84 indexed (index coverage only; detailed schemas remain pending).
- `npm run lint:copy`: PASS.
- `npm run architecture:check`: PASS (0 new cycles, 0 boundary violations).
- `npm run version:check`: PASS (`124`, patch `124.0.12`).
- `npm run docs:generate`: PASS; inventories 84 routes / 68 env vars / 19 migrations; module map 175 modules / 438 edges / 0 cycles; check graph 29 checks / 169 modules; capability graph 474 nodes / 978 edges.
- `npm run docs:check`: PASS, including docs integrity, repository-path integrity in five maintained docs, environment-example coverage (68/68), inventories, status graph, capability graph and API route index.
- `npm ci --offline --ignore-scripts --no-audit --no-fund`: BLOCKED (`ENOTCACHED`, zod tarball not present locally). `npm audit --omit=dev --audit-level=high`: BLOCKED (`EAI_AGAIN` resolving registry.npmjs.org). No dependencies were installed.

**Not verified:** full `npm test` (stops because `tsx` is not installed); all dependency-backed test DAG profiles (missing `tsx`/`jszip`), TypeScript typecheck (missing `typescript`), production build (missing `vite`), browser E2E, hosted GitHub Actions, dependency vulnerability status (`npm audit`), live SSRF/DNS-rebinding behavior, production HTTP headers, and user-level scenarios. The check DAG was attempted twice. The last run exceeded the 60-second execution window while the dependency-backed checks were failing module resolution; version, docs-integrity, copy lint and architecture checks passed before timeout. A prior completed run recorded 4 PASS, 14 dependency-related FAIL and 6 BLOCKED; the independent workflow-pin check added afterward passes standalone. `test:compact-ci-artifacts` ran 76 tests: 75 passed and one could not load `jszip`. The new workflow pins and Dependabot config have only static contract tests; actual action execution awaits hosted CI.

**Remaining audit items:** dependency remediation/audit remains BLOCKED pending registry access; detailed request/response contracts for the 84 routes are still incomplete; session revocation and legacy-path removal require owner/security design approval; broad TypeScript `any` debt and server monolith refactoring remain open; full live and browser acceptance has not been performed. No normative product/security posture was changed.

---

## CURRENT EVIDENCE NOTE — P124.11 outbound web-fetch hardening and response headers (2026-11-02)

**Patch identity:** product version `124`, patch `124.11`. **Scope:** audit recommendations R-02 and R-03 (partial; CSP deferred pending UI validation).

### Implemented changes

- Web page URL validation rejects non-HTTP(S) schemes, URL credentials, localhost/internal/local hostnames, private/reserved/non-global IP literals, and IPv4-mapped private IPv6 addresses.
- Hostnames are resolved before outbound requests and all returned addresses must be public. Direct retrieval uses manual redirects with per-hop validation, a four-hop ceiling, content-type allowlisting, and a 1 MB streaming response cap.
- Jina Reader remains an optional extraction proxy. Documentation now states that target URLs are disclosed to Jina and that its internal DNS resolution/redirect behavior cannot be controlled by this process.
- Added `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, production-only HSTS, and disabled Express `X-Powered-By`.
- Added tests for private/loopback/link-local/internal URL rejection, public/private IP classification, and production-vs-development header behavior.

### Verification

- `node scripts/version-metadata.mjs` — **PASS** (`124`, patch `124.11`).
- `npm audit --omit=dev --audit-level=high` — **BLOCKED**: npm registry DNS/network unavailable (`EAI_AGAIN registry.npmjs.org`); vulnerability state is not established.
- Runtime tests, TypeScript typecheck, build, browser E2E, full DAG and hosted Actions — **NOT_RUN**: supplied green archive has no installed `node_modules`; dependency installation is unavailable in this environment.
- Static review confirms direct fetch redirect mode is `manual`, every hop is revalidated, and response bodies are streamed under a byte cap. DNS rebinding between validation and the runtime fetch remains a residual risk because the global Fetch API does not pin the validated address in this implementation. Jina Reader's own fetch behavior is outside local enforcement.

### Boundary

This patch reduces the SSRF attack surface and adds baseline browser security headers; it is not a penetration-test result. CSP enforcement is intentionally deferred because it can break script/style loading or UI completion surfaces and requires report-only plus browser E2E evidence under `AGENTS.md` G4. Hosted CI and live deployment behavior remain **NOT_RUN**.

## CURRENT EVIDENCE NOTE — P124.10 diagnostics classification and emergency-screen test repair (2026-11-02)

**Patch identity:** product version `124`, patch `124.10`. **Scope:** audit recommendations R-04 and R-05 (`DEF-02`, `DEF-03`).

### Implemented changes

- The emergency-screen test now extracts and validates the positive `MAX_ENTRIES` value from `src/emergencyDiagnostics.ts` rather than asserting the obsolete literal `120`.
- Added the emergency-screen test to `test:core`, making the contract part of the existing CI DAG.
- Diagnostic per-log classification now uses explicit status lines rather than arbitrary occurrences of `BLOCKED`; TAP failures take precedence, and passing TAP totals classify as `PASS`.
- Added a regression case where `BLOCKED` appears in a passing test title.

### Verification

- `node --test tests/p121-emergency-screen.test.mjs` — **PASS, 1/1**.
- `node --test tests/diagnostics-summary-contract.test.mjs` — **PASS, 2/2**.
- `node --check` for both changed test files and `scripts/diagnostics-summary.mjs` — **PASS**.
- `node scripts/version-metadata.mjs` — **PASS** (`124`, patch `124.10`).
- Full `test:core` / CI DAG, typecheck, build, browser e2e, hosted Actions and live-provider checks — **NOT_RUN**; the supplied archive has no installed `node_modules`.

### Boundary

This patch repairs the two audited regression risks. It does not claim a full CI pass or live user-value validation.

## CURRENT EVIDENCE NOTE — P124.9 crisis-turn question safety repair (2026-11-02)

**Patch identity:** product version `124`, patch `124.9`. **Base evidence:** hosted CI run `41412782921` at commit `bb4980a262c16835773b2d65215a818c6a3dcc84` (DAG: 27 PASS, 1 FAIL). **Scope:** repair the only evidenced failure, `test:pipeline` Stage 2 checks `G1 crisis ru`, `G1 crisis es`, `G1 crisis ru-late` (`s200 q=1 contacts=true`).

### Finding

- Cause (source-verified): since P124.7/C124, `buildVisibleReply` preserves questions already written in the model answer. On a crisis turn the scripted model reply contained one question, so the visible reply carried one `?` although the crisis contract requires none. Support contacts were present; only the question rule was violated.
- Fix: `stripQuestionSentences` removes interrogative sentences from the model answer on crisis turns only (`crisisNow`); all other text, the optional follow-up rules, and the support block are unchanged.

### Verification

- `node --experimental-strip-types --test tests/c124-output-fidelity.test.mjs tests/c124-prompt-quality.test.mjs` — **PASS, 10/10** (local, Node 22).
- `npm run typecheck` — **PASS** (local).
- `node --import tsx --test tests/pipeline.test.mjs` — **PASS** (22 pass, 0 fail; local, scripted fake provider).
- Full DAG, `test:core`, build, browser e2e, live-provider checks and hosted Actions on the new commit — **NOT_RUN**.

### Boundary

This is a safety-behavior repair verified against a scripted fake provider. It is not evidence of real-model crisis-response quality or user value; live crisis scenarios remain `NOT_RUN`.

## CURRENT EVIDENCE NOTE — P124.8 obsolete model-prompt test cleanup (2026-11-02)

**Patch identity:** product version `124`, patch `124.8`. **Scope:** remove test-only source-text locks for model-facing instructions that no longer represent required product behavior. No product source, prompts, instructions, or runtime logic changed.

### Removed checks

- Removed the P119 golden-hash test that froze full Conversational/Expert prompt bytes across all modes and stage-prefix text.
- Removed C124 static prompt assertions for retired universal reasoning choreography, fixed phrasing, old novelty-retry machinery, and quota-related Expert prompt text.
- Removed the static assertion block that checked for absence of old Expert output quotas and required exact JSON-example text.
- Retained behavioral checks for information-mode planning, model-authored question preservation, additive optional follow-up, URL intent, and visible output-path handling.
- Retained agent ownership/routing, API/schema, security, state, and Architect/App Builder requirements; no product behavior was weakened.

### Verification

- `node --experimental-strip-types --test tests/c124-prompt-quality.test.mjs tests/c124-output-fidelity.test.mjs tests/p119-agent-prompts-routes.test.mjs` — **PASS, 12/12**.
- Changed test files passed `node --check` — **PASS**.
- Full `test:core`, complete DAG, typecheck, build, browser E2E, and hosted Actions — **NOT_RUN**.

### Boundary

This is a test-maintenance patch only. It removes obsolete prompt-text expectations; it does not modify model instructions or assert that every possible static text test in the repository is obsolete.

## CURRENT EVIDENCE NOTE — P124.7 CI regression follow-up (2026-11-02)

**Patch identity:** product version `124`, patch `124.7`. **Base evidence:** hosted CI run `41405376413` at commit `8f0d2d4a2fcd5c311647a33d9fccc1601fd10311`. **Scope:** resolve the two remaining DAG failures without weakening output-fidelity or workflow-ownership contracts.

### Findings from the supplied report

- The Core failure is a real workflow configuration gap: `tests/p119-agent-boundaries.test.mjs` at the reported commit requires browser acceptance on relevant pull requests, while `acceptance.yml` only exposed manual dispatch.
- The Pipeline Stage 2 fuzz failures combine two distinct contracts. The old `questions <= 1` expectation conflicts with C124's explicit preservation of model-authored questions. `Source: USER_DATA` is a genuine user-visible provenance leak; scanning the entire structured response also conflates internal state metadata with user-visible text, so the assertion must target the reply and separate question fields.
- Stage 2 spawned server children were killed without awaiting process exit. A fixed sleep did not establish process teardown and allowed asynchronous activity to outlive the grouped test module.
- The previous report shows Files, Web and compact CI artifact checks now pass; this patch does not alter those areas.

### Implemented changes

- Added focused `pull_request.paths` triggers to browser acceptance for UI, server, browser-journey, build-configuration and dependency changes; manual dispatch remains available and the full verification DAG remains owned by `ci.yml`.
- Extended the visible-reply safety net to remove `Source: USER_DATA` annotations while preserving ordinary user-facing prose, formatting and authored questions. Scoped the Pipeline fuzz label check to visible reply/question fields, not internal structured state.
- Updated the Pipeline mutation test to assert byte-preservation of model-authored replies and permit at most one separate optional follow-up; removed the obsolete one-question total assertion.
- Stage 2 now awaits child-server exit and escalates to SIGKILL after a bounded grace period before continuing cleanup.
- Bumped patch metadata to `124.7`.

### Verification evidence

- Focused `reasoningState.ts` checks under Node 22 type stripping — **PASS** (provenance labels removed; authored Spanish questions preserved).
- `node --check` for changed MJS tests — **PASS**.
- Acceptance workflow YAML and trigger contract — **PASS**.
- `node scripts/version-metadata.mjs` — **PASS** (`124`, patch `124.7`).
- Full `test:core`, `test:pipeline`, complete DAG, typecheck, build and browser E2E — **NOT_RUN** in this environment because the supplied dependency tree has no usable `tsx` installation. Hosted CI must establish the end-to-end result.

### Acceptance boundary

The patch addresses both failures evidenced in the supplied run. It does not claim that the full CI workflow is green until the hosted workflow is rerun. The next handoff remains the single `ASSISTANT_SUMMARY.md`.

## CURRENT EVIDENCE NOTE — P124.6 CI regression and test-lifecycle repair (2026-11-02)

**Patch identity:** product version `124`, patch `124.6`. **Scope:** address the supplied Core CI report's P52 stale assertion, test-process cleanup, DOCX XML assertion, Web behavior contract, grouped test exit handling, and success-status rendering in the single assistant handoff.

### Implemented changes

- P52 tests now validate the optimized Expert stage/context behavior rather than removed instruction phrases.
- URL handling is tested through `stripUserFacingUrls` behavior: explicit requested links are preserved; unsolicited URLs are suppressed.
- DOCX verification extracts Word text runs and normalizes run boundaries and Markdown emphasis before checking Russian content.
- Core fake-server teardown waits for child-process exit and closes the fake HTTP server; valid Markdown is no longer misclassified as leaked service metadata.
- Grouped Files and Pipeline suites await server teardown and report the originating error rather than using `process.exit(1)` as an exception surrogate.
- Diagnostic summary emits explicit `PASS`, `FAIL`, or `UNKNOWN` workflow status while retaining the raw CI status.

### Verification evidence

- `node --check` on changed `.mjs` files — **PASS**.
- Clean-run diagnostics summary smoke test (`CI_STATUS=success`) — **PASS**, summary contains `Workflow status: PASS` and writes the expected single assistant handoff plus readable technical logs.
- `node scripts/version-metadata.mjs --write` — **PASS** (`124`, patch `124.6`).
- Full Core, Files, Pipeline, Web, compact-artifact, typecheck, build, browser and live-provider checks — **NOT_RUN**: `npm ci --ignore-scripts --no-audit --no-fund` timed out; `tsx` remains unavailable. No runtime PASS is claimed.

### Acceptance boundary

This patch corrects the reported test contracts and lifecycle defects, but hosted CI must be rerun to establish the end-to-end result. The next handoff remains `ASSISTANT_SUMMARY.md`; the other logs are diagnostic companions and are not required for initial assistant analysis.


## CURRENT EVIDENCE NOTE — P124.5 workflow diagnostics and regression repair (2026-11-02)

**Patch identity:** product version `124`, patch `124.5`. **Scope:** repair stale test contracts after C124 prompt/output optimization; standardize workflow diagnostics and remove duplicate acceptance DAG execution.

### Implemented changes

- Updated tests to assert current Expert stage/context labels, ANALYST structured-analysis wording, Decision-mode prompt label, current App Builder specification prompt and cache version, and whitespace-tolerant source comment contracts.
- Updated Markdown assertions to match the documented P124.3 output-fidelity contract: BiForge preserves model-authored Markdown in chat and structured document content; tests no longer demand the retired stripping behavior.
- Changed test server child processes to invoke Node with the `tsx` loader directly, so termination signals reach the actual server process.
- Added `scripts/diagnostics-summary.mjs`: every migrated workflow emits one self-contained `ASSISTANT_SUMMARY.md` plus `checks.log`, `failures.log`, and `environment.log`. Raw logs are named by order and purpose. No split assistant paste files or nested log ZIPs are produced by the migrated workflows.
- Kept the full CI verification DAG in `ci.yml`; manual end-to-end acceptance now runs browser journeys only and performs its own build. Added the App Builder recovery probe as a prerequisite of the App Builder suite only. CI history can read the new `checks.log` artifact while retaining compatibility with previous artifacts.

### Verification evidence

- `node --test tests/diagnostics-summary-contract.test.mjs tests/assistant-run-summary-contract.test.mjs tests/dag-p107.test.mjs` — **PASS, 13/13**.
- `node --check` on all changed JS/MJS tests and the diagnostics generator — **PASS**.
- YAML parse of all seven workflow files — **PASS**.
- `node scripts/version-metadata.mjs` — **PASS** (`124`, patch `124.5`).
- `node scripts/docs-integrity.mjs` — **PASS**.
- Full `test:core`, `test:files`, `test:pipeline`, `test:web`, `test:app-builder`, typecheck, build, browser e2e, PostgreSQL live and provider-backed checks — **NOT_RUN**: supplied `node_modules` is incomplete (`tsx` package directory is empty); no claim of runtime PASS is made.

### Acceptance boundary

The deterministic tests verify diagnostic formatting, workflow references, DAG prerequisites and source-contract changes. They do not establish live provider answer quality, deployed behavior, browser user outcomes or hosted GitHub Actions results. The next CI run should attach only `ASSISTANT_SUMMARY.md` when requesting assistant diagnosis; the additional three named logs and raw test logs are available for deeper inspection.

## CURRENT EVIDENCE NOTE — P124.4 Architect and App Builder prompt refinement (2026-11-01)

**Patch identity:** product version `124`, patch `124.4`. **Scope:** Architect project-analysis framing and App Builder planner/coder/reviewer prompts, recovery preservation, and prompt-cache versioning. No routing, UI, API schema, validator, or completion-contract changes.

### Implemented changes

- Planner no longer prefers a single-file `index.html` by default. It selects the simplest architecture that fits the requested functionality and retains multi-file interface/import-export consistency requirements.
- Reviewer now separates defects from optional improvements and must not demand unrequested features or treat style preferences as blockers. Static inspection is explicitly distinguished from runtime execution.
- Coder guidance permits completing missing internal interfaces consistently while prohibiting invented external APIs, credentials, measurements, or source results. Requested features must not be omitted merely to shorten a file.
- Provider-retry recovery now retains the complete original prompt/context instead of clipping it to 6,500 characters, and no longer tells the model to omit optional features.
- Spec framing explicitly asks the planner to capture every user-requested capability and avoid unrelated additions.
- Architect project analysis may use general domain knowledge to explain implications and identify gaps, while project-specific facts still require provenance and decisions remain human-owned.
- App Builder prompt versions/cache namespace were advanced to `static_site.v4`; planner/spec/reviewer versions were advanced to v3.
- Added static regression tests for prompt contracts, cache versioning, and recovery-context preservation. Updated the App Builder cache-version test to avoid a stale hard-coded v2 expectation.

### Verification

- `node --test tests/c124-architect-appbuilder-prompt.test.mjs` — **PASS, 7/7**.
- `node --experimental-strip-types --test tests/c124-instruction-inventory.test.mjs tests/c124-architect-appbuilder-prompt.test.mjs` — **PASS, 9/9**.
- `node --experimental-strip-types --test tests/c124-prompt-quality.test.mjs` — **PASS, 6/6**.
- Runtime smoke of `promptFor('planner'|'coder'|'reviewer')` — **PASS**; returned the expected prompt versions and file marker.
- Changed TypeScript/JavaScript syntax checks — **PASS**.
- `npm run docs:check` — **PASS** (documentation integrity, inventories, check graph and capability graph).
- `npm run version:check` — **PASS** (`124`, patch `124.4`).
- `npm run test:compact-ci-artifacts` — **BLOCKED** at 71/72 subtests: the existing `compact-ci-artifacts-p94.test.mjs` file cannot load because `jszip` is not installed; the new C124.4 suite and all other loaded subtests passed.
- `node --experimental-strip-types --test tests/app-builder-engine-p93-2a.test.mjs` — **BLOCKED** before test execution for the same missing `jszip` dependency.
- Full `test:app-builder`, `test:core`, full CI DAG, TypeScript build/typecheck, hosted GitHub Actions, generated-app browser tests, live provider comparisons and user outcomes — **NOT_RUN**.

### Acceptance boundary

These changes reduce prescriptive prompt behavior and prevent recovery from silently dropping prompt context or requested features. They do not prove improved generated-app quality, runtime correctness, or user outcomes. Hosted CI and model-backed evaluation remain separate.

## CURRENT EVIDENCE NOTE — P124.3 response-path fidelity cleanup (2026-11-01)

**Patch identity:** product version `124`, patch `124.3`. **Scope:** Conversational/Expert visible-reply transport, explicit link-intent handling, and C124 regression tests.

### Implemented changes

- The server no longer applies `stripMarkdown` to the model-authored main reply or document payload before returning it to the client.
- Removed the obsolete hard-coded parenthetical filter for legacy decision-method vocabulary.
- Kept unsolicited source-URL suppression as the default, but explicit user requests for links preserve model-provided URLs.
- Added explicit link/no-link intent flags with latest-message precedence over older recent-history preferences.
- Simplified Expert staged prompts (`understand`, `radar`, `expand`, `attack`, `redteam`, `premortem`, `synthesis`, `review`) by removing arbitrary minimum counts, mandatory option categories, fixed word/paragraph quotas, the synthesis retry that enforced them, and forced review questions; retained task schemas and workflow purpose.
- Added `tests/c124-output-fidelity.test.mjs` and wired it into `test:core`.

### Verification

- `node --experimental-strip-types --test tests/c124-instruction-inventory.test.mjs tests/c124-prompt-quality.test.mjs tests/c124-output-fidelity.test.mjs tests/p119-agent-prompts-routes.test.mjs tests/p119-agent-isolation.test.mjs tests/p119-agent-boundaries.test.mjs tests/p12318-agent-session-isolation.test.mjs` — **PASS, 54/54**.
- `npm run docs:check` — **PASS** (documentation integrity, inventories, check graph and capability graph).
- `npm run version:check` — **PASS** (`124`, patch `124.3`).
- Node syntax checks for `server.ts`, `server/intentFlags.ts`, `server/reasoningState.ts` and `tests/c124-output-fidelity.test.mjs` — **PASS**.
- `npm run test:core` — **BLOCKED** before the first test file because package `tsx` is not installed in this environment (`ERR_MODULE_NOT_FOUND`).
- Direct execution of `tests/core.test.mjs` and `tests/pipeline.test.mjs` with Node type stripping — **BLOCKED** before test execution because package `zod` is not installed (`ERR_MODULE_NOT_FOUND`).
- Hosted GitHub Actions, full CI DAG, TypeScript typecheck/build, browser rendering and live provider comparisons — **NOT_RUN**.

### Acceptance boundary

These changes prevent specific deterministic transformations from deleting or hiding answer content. They do not establish that external models returned correct facts or that every Markdown construct renders optimally in the browser.

## CURRENT EVIDENCE NOTE — P124.2 instruction cleanup (2026-11-01)

**Patch identity:** product version `124`, patch `124.2`. **Scope:** Simple/Conversational and Expert dialogue prompt paths plus final visible-reply composition. This is a targeted implementation slice of C124, not a claim that every Expert staged endpoint, Architect/App Builder prompt, or output transformation has been audited and cleaned.

### Implemented changes

- Replaced the long mandatory decision method with concise task-fit guidance. Factual requests are answered factually; decision analysis, alternative generation, calculations and tests are used only when they materially fit the request.
- Removed `V17_LAYER_PROMPT` from the active system and deleted its model-facing reasoning choreography. Deterministic state normalization/merge and internal-field scrubbing remain.
- Replaced `BASE_SYSTEM`'s second analytical-engine persona with a concise task/schema/evidence/safety interface contract.
- Removed the novelty gate that retried a valid decision answer unless it contained a reframing, hidden assumption, branch, test, calculation or other prescribed “gain”. A narrow information-mode evasiveness repair remains, and technical/provider/JSON recovery paths are unchanged.
- Expert no longer upgrades factual requests to decision mode. Its UI stage and method state are supplied as context data rather than mandatory reasoning instructions. Explicitly requested recommendations are permitted in both dialogue agents. Placeholder facts-to-check and arithmetic examples were removed from the output schemas; these fields are empty unless materially relevant.
- `buildVisibleReply` no longer deletes questions from the model's answer. The separate optional follow-up is appended additively when allowed.

### Local verification

- `node --experimental-strip-types --test tests/c124-instruction-inventory.test.mjs tests/c124-prompt-quality.test.mjs tests/p119-agent-prompts-routes.test.mjs tests/p119-agent-isolation.test.mjs tests/p119-agent-boundaries.test.mjs` — **PASS, 44/44**.
- Prompt snapshot hashes were recomputed from the changed prompt builders and are checked by the passing agent prompt suite. `npm run docs:check` — PASS; `node scripts/version-metadata.mjs` — PASS; Node syntax checks for changed TypeScript and test modules — PASS.
- `node --experimental-strip-types --test tests/core.test.mjs` and `node --experimental-strip-types --test tests/pipeline.test.mjs` — **BLOCKED before test execution** by missing package `zod` imported from `server/statePipeline.ts` (`ERR_MODULE_NOT_FOUND`).
- Full `test:pipeline`, TypeScript typecheck/build, full `test:core`, full DAG and hosted GitHub Actions — **NOT_RUN** in this environment.
- Live Gemini/Groq comparisons, raw-provider-to-visible-output comparison, deployed behavior and user-outcome evaluation — **NOT_RUN**.

### Remaining boundaries

- Unconditional user-facing URL stripping remains unchanged to preserve the approved no-automatic-source-link policy; explicit user-requested link behavior still needs a separate focused policy/test.
- Expert staged endpoint prompts (`neutralize`, `radar`, `understand`, `expand`, `redteam`, `premortem`, `synthesis`, `review`, etc.), Architect and App Builder prompts were not rewritten in this patch because their schemas may be product/UI contracts. They remain in the C124 inventory for a separate dependency-aware review.
- Passing deterministic prompt/agent tests does not prove improved live answer quality. Hosted CI and model-backed comparison are still required.

## P124.1 static instruction inventory

**Status:** STATIC_SOURCE_INVENTORY_COMPLETE; runtime/model-backed behavior NOT_RUN. This patch is an audit/documentation and inventory-integrity-test change; no production prompt or answer-processing code was modified.

### Source findings

- Identified three overlapping decision-analysis instruction owners: `server/promptPacks.ts` (`DECISION_METHOD`), `server/reasoningState.ts` (`V17_LAYER_PROMPT`) and `server.ts` (`BASE_SYSTEM`). `server/expertAgent.ts` adds a further Expert-specific step prefix and structured analysis recipe.
- Enumerated the separate Expert endpoint prompts (`neutralize`, `radar`, `understand`, `knowledge-map`, `expand`, `attack`, `redteam`, `premortem`, `experiment-draft`, `forecast-wording`, `synthesis`, `review` and document editing), plus the deterministic gain-audit retry that can force a second answer to manufacture “novelty”.
- Catalogued the Conversational/Expert shared prompt assembler, information-mode prompt, mode routing heuristics, web-search system and evidence block, Architect project-analyst instruction, optional epistemic verifier, App Builder planner/reviewer/coder prompts, code-author prompts, downstream executor package instructions and untrusted-data wrappers.
- Traced response/context transformations that may discard or alter information: URL stripping, question filtering, label/Markdown scrubbing, state merging/caps, context token selection, attachment truncation, document sanitization and fixed response-array limits.
- The full inventory, classifications, call paths, dependencies, risks and proposed dispositions are in `docs/C124_INSTRUCTION_INVENTORY.md`.

### Local checks

- `node --test tests/c124-instruction-inventory.test.mjs` — PASS, 2/2.
- `npm run docs:generate` — PASS; generated route inventory (84), env inventory (68), migration inventory (19), module map (174 modules / 437 edges / 0 cycles), check graph (28 checks / 160 modules) and capability graph (468 nodes / 954 edges).
- `node scripts/docs-integrity.mjs` — PASS.
- `node scripts/docsCheckInventories.mjs` — PASS.
- `node scripts/statusGraph.mjs --check` — PASS.
- `node scripts/capabilityGenerateGraph.mjs --check` — PASS.
- `node scripts/version-metadata.mjs` — PASS (`version: 124`, `patch: 124.0.3`).
- `npm run docs:check` — PASS (combined documentation integrity, generated inventory, check graph and capability graph checks).
- `npm run test:core` — BLOCKED before test execution in this sandbox: local `node_modules/tsx` is a `0.0.0-test-shim` and cannot load `.ts`; retrying the core test with Node's experimental type stripping then stopped at missing package `zod` (`ERR_MODULE_NOT_FOUND`). The new inventory test itself passed independently. This environment failure is not reported as a product-test PASS.

### Evidence limits

- Live Gemini/Groq/Cloudflare comparisons: NOT_RUN.
- Deployed behavior and user-outcome evaluation: NOT_RUN.
- Full CI / GitHub Actions: NOT_RUN in this patch-generation environment.
- The inventory is a static source and call-path audit; it does not claim every optional/legacy runtime configuration was exercised.

## P124.0.2 — Cumulative C124 baseline and CI regression closure

**Status:** Targeted deterministic regression fixes and the un-applied P124.0.1 documentation mandate are consolidated. C124 remains active. Full instruction inventory, full CI, live model evaluation, deployment checks, and user-outcome validation are NOT_RUN.

### CI failures reproduced and addressed

- `test:core`: the P123.17 evidence-preservation prompt changes made six dialogue golden hashes stale. The complete current prompt set was recomputed from the reconstructed P123.23 source using Node's TypeScript type stripping; all affected Conversational/Expert decision, research, and engineering hashes were updated. The unchanged information prompts, Expert step prefix, and dialogue paragraphs remain locked to their matching hashes. The snapshot test now describes the current reviewed golden contract rather than claiming byte identity with the pre-change implementation.
- `test:web` (25/28): all three failing tests were reproduced locally. One asserted obsolete prompt wording (`add nothing that is not below`) instead of the current evidence-preservation invariant. One expected source URLs to be appended to replies, contrary to P123.17's intentional suppression policy. One expected a fixed MeteoSwiss/city expansion that did not exist. Tests now assert the current contracts; weather search adds a generic current-observation query without inserting a location or provider.
- Weather special case: removed the hard-coded city fallback list from `contextualizeSearchText` and removed the Zurich translation-prompt example. Elliptical weather follow-ups reuse only a place parsed from the preceding user text. Added generic-place follow-up coverage.
- `test:compact-ci-artifacts` (70/71): reproduced the failure. The workflow correctly uploads `ASSISTANT_PASTE*.txt` so numbered continuation parts are retained, while the test expected only the unsuffixed filename. Updated the assertion to enforce the current wildcard upload contract; all 71 tests pass.
- `workflow-dag`: `docs/generated-check-graph.json` was stale. Regenerated the graph from the current verification manifest and source paths; `node scripts/statusGraph.mjs --check` passes. The capability graph was also stale after the C124 documentation inventory changed; regenerated `docs/generated-capability-graph.json` and verified it.

### Local verification evidence

- `node --experimental-strip-types --test tests/p119-agent-prompts-routes.test.mjs` — PASS, 5/5.
- `node --experimental-strip-types --test --test-timeout=60000 tests/web-and-epistemics.test.mjs` — PASS, 29/29.
- `npm run test:compact-ci-artifacts` — PASS, 71/71.
- `node --test tests/p12318-agent-session-isolation.test.mjs tests/p119-agent-ui-contract.test.mjs` — PASS, 7/7; updated the stale cycle-123 package assertion for product version 124.
- `node --test tests/information-quality-eval.test.mjs` — PASS, 3/3.
- `NODE_OPTIONS=--experimental-strip-types node --test tests/p119-agent-boundaries.test.mjs tests/p119-agent-isolation.test.mjs tests/p119-agent-prompts-routes.test.mjs` — PASS, 36/36.
- `node scripts/statusGraph.mjs --check` — PASS.
- `node scripts/capabilityGenerateGraph.mjs --check` — PASS.
- `node scripts/docs-integrity.mjs` — PASS.
- `node scripts/docsCheckInventories.mjs` — PASS.
- `node scripts/version-metadata.mjs` — PASS after package/lock synchronization.
- `node --check` on modified JavaScript test files — PASS.
- ZIP integrity check — PASS.

The TypeScript-importing targeted tests used Node 22.16 experimental TypeScript type stripping because `npm ci` did not complete in this environment. The full `npm run test:core` was attempted but BLOCKED before test execution by missing dependency `zod` (`ERR_MODULE_NOT_FOUND` in `tests/core.test.mjs`). The full `npm run test:web` wrapper passed using the temporary type-stripping compatibility setup. The browser transition E2E test was NOT_RUN because Playwright is unavailable. This is not a claim that the full CI DAG, TypeScript compiler, build, hosted GitHub Actions, or live provider calls passed. Those remain NOT_RUN and must be verified by the next hosted Actions run.

### C124 scope boundary

The cumulative patch includes the P124.0.1 documentation mandate, C124 decision record, acceptance criteria, and product-version transition. The only instruction/special-case cleanup performed is the removal of the weather city allowlist and Zurich example. The complete prompt and response-transformation audit remains NOT_RUN; no other prompt pack was removed or rewritten in this patch.

## P124.0.1 — C124 documentation baseline

**Status:** Documentation mandate integrated. Repository-wide instruction inventory and implementation are NOT_RUN; this patch does not claim that existing prompts or transformations have been audited or cleaned.

- Added the C124 normative mandate: BiForge is an engineering intermediary; external LLMs perform substantive reasoning and answer composition.
- Defined audit scope across static/dynamic prompt sources, agent/mode instructions, tool/search instructions, and every response-processing transformation.
- Added categories A–E and required inventory fields so removals are dependency-aware rather than based on prompt length or intuition.
- Defined preservation requirements for model-provided facts, numbers, units, dates, caveats, uncertainty, links, and multilingual content; prohibited fabricated additions and silent loss.
- Added deterministic source-to-output, pipeline/session, and representative model-backed acceptance criteria.
- **Changed:** documentation and package/lock version metadata only.
- **NOT_RUN:** prompt inventory, source-wide audit, instruction removal, deterministic tests, full CI, live provider comparisons, deployed checks, and user-outcome evaluation.

## P123.23 — CI regression follow-up
Status: targeted fixes prepared from P123.22 handoff evidence; hosted Actions and full test suites NOT_RUN.

Evidence addressed:
- `test:core` reported a stale `GOLDEN_STEP_PREFIX` expectation versus observed current digest `30fdcd…`. The prompt source was not changed in this patch; the golden is synchronized to the CI-observed digest.
- `test:web` exposed a Russian weather follow-up regression at `contextualizeSearchText`. Normalization now removes the leading conversational preamble `интересует` before recognizing the Celsius follow-up, and prior-turn splitting uses actual newline boundaries. The supplied handoff did not include all three failing assertion bodies, so only the stack-identified contextualization path is addressed; remaining web failures must be read from the full log.
- The compact-artifact contract test expected a successful-stage log inside the ZIP, contradicting P123.22's failure-first archive policy. The test now asserts that successful-stage logs are omitted. Structured `results.json` and failed logs remain part of the archive contract.

No product prompt or routing behavior was changed. Validation in this delivery environment: NOT_RUN (dependencies unavailable); ZIP integrity only.

## P123.22 — CI evidence and logging compaction
Status: implementation prepared; hosted Actions and full test suites NOT_RUN in this environment.

Restored the prompt snapshot matrix from the earlier diagnostics implementation. The main handoff now prioritizes failure signatures and omits lists of successful checks and successful-stage log tails. The inner ZIP is curated to authoritative reports, results/metrics/history, prompt diagnostics, and logs attached to FAIL/TIMEOUT rows. This reduces incidental files and duplicated evidence while preserving the evidence needed to investigate failures.

Known limitation: workflow-step logs without a recognizable failure signature and without a corresponding FAIL/TIMEOUT row are intentionally omitted from the compact archive. Confirm this policy against real hosted Actions failure output, especially cancellation and infrastructure failures.

# P123.21 evidence note

Status: targeted source/test corrections prepared from P123.20 CI evidence. The P123.20 run proves three concrete contract failures: stale patch assertion (expected 123.18 while package metadata is 123.20), Expert prompt wording assertion, and weather search-block wording assertion. P123.20 also reports test:compact-ci-artifacts failure, but the supplied handoff contains no failing test name, assertion, or source excerpt for that stage; it is intentionally not guessed or claimed fixed. Typecheck, complete test suites, build, and hosted Actions remain NOT_RUN for this patch.

# CURRENT EVIDENCE NOTE — P123.20 multi-part assistant paste artifacts, 2026-11-01

- Change: both assistant summary generation and CI artifact packaging split chat handoffs into numbered UTF-8 text files, each at most 5,000 JavaScript characters.
- Outer artifact retains every `ASSISTANT_PASTE*.txt` part plus `biforge-ci-logs.zip`; full diagnostics remain in the ZIP.
- Canonical workflows upload all numbered parts using a wildcard path.
- Local syntax/contract checks: pending in this delivery; hosted Actions: NOT_RUN.

## P123.19 — CI failure repair evidence (2026-11-01)

- Observed CI evidence for P123.18: `server/expertAgent.ts(13,...)` TypeScript parse errors caused server transforms to fail; P50 merge test rejected two non-empty short digests; P123.16/P123.17 grouped tests referenced block-scoped `test`, `assert`, and `mod` outside their scope.
- Changes: template literal for the Expert prefix; accept non-empty used digests during merge; wrap the P123.16/P123.17 tests in a scope with their own imports; expand source excerpts and parse TypeScript parenthesized locations in CI evidence.
- Not established by the supplied excerpt: whether every remaining project/database/API/build failure was only a cascade. CI must rerun to determine that.
- Local validation: NOT_RUN. Hosted CI: NOT_RUN. Live Gemini/user outcome: NOT_RUN.

# CURRENT EVIDENCE NOTE — P123.18, 2026-11-01

- **Changed:** Conversational↔Expert mode transitions create a new blank Decision while retaining the prior Decision in the saved library. Expert initialization prompt now prohibits importing Simple-mode history and uses only Expert-session input.
- **Source evidence:** prior implementation explicitly sent the shared `modelSuggestions.conversation` to `/api/understand` and described Expert as unpacking the same Simple conversation. This delivery removes that intended coupling at the session transition and prompt contract.
- **UI impact:** mode selection/menu transition and first Expert `UNDERSTAND` initialization. Existing completion surface is unchanged; existing `data-testid` entry points remain `start-mode-expert`, `expert-open-dialogue`, and mode-menu selectors.
- **NOT_RUN:** full test suite, TypeScript build, browser e2e, hosted CI, live Gemini comparisons. No claim of user-value acceptance is made.

# CURRENT EVIDENCE NOTE — P123.17, 2026-11-01

- **Changed:** Cumulative P123.16 + P123.17 delivery. Weather-oriented query expansion and title-only SERP rejection are retained. User-visible source footer is disabled while source metadata remains internal. Shared grounding instructions now apply to Conversational and Expert; Expert/V17 prompts explicitly preserve supported retrieved values and distinguish them from unsupported claims.
- **Observed in source:** `server.ts` no longer concatenates `formatSourcesFooter` to `reply`; `formatSourcesFooter` is compatibility-safe and returns an empty string. Prompt text now states that retrieved evidence is part of model input.
- **NOT_RUN:** full `test:core`, typecheck/build, hosted CI, live Gemini/Serper calls, deployed Simple/Expert weather comparison. No claim is made that model output quality is restored until live tests confirm it.
- **Risk/limitation:** these prompt changes prevent BiForge instructions from requiring omission of retrieved evidence, but cannot guarantee provider retrieval quality or model factual accuracy.

# CURRENT EVIDENCE NOTE — P123.16 weather retrieval correction

- **Changed:** current-weather query expansion; strict rejection of title-only SERP digests; weather-specific synthesis constraints; removal of the visible source footer from conversation responses.
- **Design:** the retrieval layer supplies evidence to the configured answer model, which synthesizes it. A model is not assumed to know live weather without retrieved observations.
- **NOT_RUN:** hosted CI, live Serper/MeteoSwiss retrieval, real-model Simple/Expert comparison. No live weather correctness claim is made.

# CURRENT EVIDENCE NOTE — P123.16 weather retrieval correction

- **Changed:** current-weather query expansion; strict rejection of title-only Serper digests; weather-specific synthesis constraints; removal of the visible source footer from conversation responses.
- **Intent:** provide actual retrieved observations to the answer model rather than a list of weather pages. The model synthesizes retrieved evidence; it is not assumed to know live weather independently.
- **NOT_RUN:** hosted CI, live Serper/MeteoSwiss retrieval, real-model Simple/Expert comparison. No live weather correctness claim is made.

# CURRENT EVIDENCE NOTE — P123.6 carousel-verify workflow, 2026-11-01

- Automated coverage: deterministic catalog/pool/health/gateway + optional live smoke.
- Does not replace Expert user-value judgement; does machine-check carousel mechanics as far as free-tier allows.

# CURRENT EVIDENCE NOTE — P123.5 ops + CI fixes, 2026-11-01

- **test:models** red: preflight forbidden top-level `config/` → ALLOWED_TOP includes `config`.
- **test:database:live** red: `MODEL_UNAVAILABLE (source_unhealthy)` from global health bleed into analysis tests → sourceHealth only via AnalysisDeps.
- **C123:** gateway, key pool ≤10, catalog, source health, ops probe documented.

# CURRENT EVIDENCE NOTE — P123.4 Source health + max 10 keys, 2026-11-01

- Pool cap reduced to **10 keys per vendor**; tests assert intermediate sizes 1,2,3,7,10 all work.
- Source-level breaker/cooldown in process memory; next ops patch can persist if needed.

# CURRENT EVIDENCE NOTE — P123.3 Catalog + inventory, 2026-11-01

- **Research basis:** freellm.today / gravity.fast / byoklist / KDnuggets (Oct–Nov 2026), Reddit AgentZero/LocalLLM/openrouter threads — not vendor marketing alone.
- **Runtime:** only sources with `enabled: true` and non-empty key env are runnable; default = Gemini pool.
- **Next:** P123.4 health/cooldown per catalog source; enable OpenRouter/Groq when org keys land.

# CURRENT EVIDENCE NOTE — P123.2 Key pool, 2026-11-01

- **Changed:** key pool module; carousel rotation; analysisService + server Project Mode wiring; unit tests.
- **NOT_RUN:** live multi-key traffic on Render (requires configuring GEMINI_API_KEY_n secrets).
- **Next:** P123.3 multi-source catalog.

# CURRENT EVIDENCE NOTE — P123.1 Carousel gateway + lineage, 2026-11-01

- **CI fail on 123.0.1 base:** `test:core` — `lock.version` still `122` while `package.json` was `123`. Fixed in package-lock.json.
- **Changed:** `server/modelCarousel.ts` gateway; analysisService wiring; unit tests; patch 123.1.
- **Behaviour:** Single-key Gemini routing still via `routeCall`; lineage always attached when using `executeModelCall`.
- **NOT_RUN:** multi-key pool, second provider, hosted CI after this patch.

# CURRENT EVIDENCE NOTE — P123.0.1 Documentation; C122 closed / C123 open, 2026-11-01

- **Navigator:** CI and expert-verify green; C122 closed as sufficiently successful; C123 Model Carousel started.
- **This patch:** documentation and version metadata only (`123` / `123.0.1`). No application behaviour change.
- **C122 evidence retained:** Layer B live scores on gemini-3.5-flash-lite; allowlist; e2e spawn fixes; stage readiness.
- **C123 design inputs locked:** API-first carousel, catalog-as-data, lineage, up to 13 organisational key sets, browser channel deferred, no mandatory external legal gate.
- **Next implementation:** P123.1 gateway + lineage.

# CURRENT EVIDENCE NOTE — P122.9 UI smoke spawn fix, 2026-11-01

- **diag4-2:** summary shows e2e=failure; UI smoke log: `Error: spawn tsx ENOENT` in tests/ui-check.mjs. static/unit/coverage/flake success.
- **Fix:** PATH-safe server spawn in ui-check (+ architect e2e); e2e job PATH includes node_modules/.bin.
- **NOT_RUN:** hosted expert-verify after this patch.

# CURRENT EVIDENCE NOTE — P122.8 allowlist + journey harden, 2026-11-01

- **diag4:** unit/coverage/Layer B green (A0.83 B1.0 C0.67 E0.80). expert-verify still reported red — e2e logs absent from diagnostic zip; journey e2e narrowed to reduce false failures.
- **Changed:** free-key model allowlist hard-lock; retired model ids removed from probes/seeds/tests; journey e2e simplified.
- **NOT_RUN:** hosted expert-verify after this patch.

# CURRENT EVIDENCE NOTE — P122.7 Expert-verify fix + stage readiness, 2026-11-01

- **Root cause of expert-verify red:** coverage job matched `tests/p122.5-expert-journey-e2e.test.mjs` via `tests/p122.*.test.mjs` and crashed with `spawn tsx ENOENT` (uncaughtException). CI main DAG remained green.
- **Changed:** coverage file list explicit; journey e2e renamed + PATH-safe server spawn; stage readiness banner; Layer B summarizer script; p120 e2e spawn hardening.
- **Layer B (prior hosted run):** 8/8 pass; scores A=1.00 B=1.00 C=0.67 E=0.80; model gemini-3.5-flash-lite. Human product judgement still required per docs/USER_VALUE_EXPERT_C122.md.
- **NOT_RUN:** re-hosted expert-verify after this patch; tablet smoke.

# CURRENT EVIDENCE NOTE — P122.6 Expert journey + Layer B fixes, 2026-11-01

- **Changed:** GOLDEN_STEP_PREFIX updated for hardened EXPERT_STEP_PREFIX; real-model default model id fixed; Synthesis quality panel + download testid; Expert full-journey browser e2e; user-value checklist doc.
- **Deterministic:** p119 prompt golden 5/5 pass locally after hash update; p122.4 decision-quality still green.
- **NOT_RUN here:** hosted expert-verify with real_model=true against gemini-3.8-flash; hosted journey e2e; Navigator tablet smoke.
- **Acceptance:** test:core failure from P122.5 is addressed. Layer B must be re-run with the new model id. C122 product closure still requires human review of live answers per docs/USER_VALUE_EXPERT_C122.md.

# CURRENT EVIDENCE NOTE — P122.5 Expert Layer B + stability, 2026-11-01

- **Changed:** Live real-model evaluation harness (A/B/C/E), dual-compare contract path fix, Expert step-prefix hardening, additional P122.4 edge-case tests, expert-verify artifact collection.
- **Deterministic results:** architect dual-compare contract now points at the real workflow file; new edge-case tests added to decision-quality suite.
- **NOT_RUN (this environment):** live `REAL_MODEL_EVAL=1` against production Gemini (requires GitHub secret + workflow_dispatch). Hosted expert-verify with real_model=true: NOT_RUN until Navigator triggers it.
- **Acceptance:** Layer B is no longer a placeholder; it is executable. User-value judgement of live answers remains manual after the run.

# CURRENT EVIDENCE NOTE — P122.4 Decision Quality & Final Validation, 2026-10-31

- **Changed:** Final decision document builder, recommendation quality evaluation, confidence calibration, stage completion gates, quality rubric, Synthesis download, Layer A scenario tests, Layer B real-model harness (opt-in).
- **Deterministic results:** p122.4 12/12 pass; full C122 unit suites 80 pass + 1 skip (real-model).
- **NOT_RUN:** REAL_MODEL_EVAL live runs, hosted CI, browser E2E of full Expert journey, comparative before/after model fluency study.
- **Acceptance vs P122.4 / global C122:** Deterministic evidence for final document structure, fact/assumption separation, invalidation on change, failure recovery messaging, recommendation checklist, rubric. Real-model analytical quality remains explicitly opt-in and unfinished until Layer B is executed with credentials.

# CURRENT EVIDENCE NOTE — P122.3 Execution Reliability & Workflow Continuity, 2026-10-31

- **Changed:** Expert contracts, request/model validation, idempotency, workflow state machine, context reconstruction, client operation tracking and safer failure messaging. Deterministic tests 25/25; prior C122 suites 42/42.
- **NOT_RUN:** live provider failure injection, browser interruption E2E, hosted CI, full endpoint-by-endpoint contract docs beyond code registry.
- **Acceptance vs P122.3 criteria:** Documented contracts (code registry), input validation, model shape validation, recoverable failures with preserved state, safe retries via idempotency keys, partial progress via workflow states, context reconstruction — demonstrated in unit tests. Live long-session and provider chaos evidence remains open.

# CURRENT EVIDENCE NOTE — P122.2 Analytical Reliability & Evidence Integrity, 2026-10-31

- **Changed:** analytical integrity helpers and domain extensions for claims, evidence provenance, hypothesis lifecycle, contradictions, invalidation, EVPI audit trail. Deterministic tests 23/23 pass; P122.1 regression 19/19 pass.
- **NOT_RUN:** real-model EXPAND/Red Team quality, browser E2E, hosted CI, full synthesis integration of contradictions into final document (P122.4).
- **Acceptance vs P122.2 criteria:** Fact/assumption separation, evidence refs, hypothesis lifecycle, contradiction detection, numerical auditability, invalidation markers demonstrated in unit tests. Critical analysis affecting subsequent decisions and real-model proof remain for later patches.

# CURRENT EVIDENCE NOTE — P122.1 State Integrity & Persistence, 2026-10-31

- **Changed:** Expert decision persistence layer (`src/storage.ts`) now validates structure and references, maintains a last-good backup, recovers from corrupt primary, records save status, and uses monotonic `revision` for conflict detection/merge. Updates bump revision. Import rejects invalid data. `Decision` gains optional `revision`. Unit suite `tests/p122.1-state-integrity.test.mjs`: 19/19 pass.
- **Observed (local):** create/save/reload, failed-save preserves prior state, corrupt primary recovery, invalid item isolation, revision conflicts, export/import round-trip, save meta.
- **NOT_RUN:** Browser page-reload UX, multi-tab live conflict UI, Google Drive path, hosted CI, real long-session interruption, server-side Expert persistence (not introduced — existing localStorage infrastructure strengthened).
- **Acceptance vs P122.1 criteria:** Durable local persistence + recovery + integrity validation + export/import safety demonstrated in deterministic tests. Multi-device durability and full E2E recovery remain open for later evidence.

# CURRENT EVIDENCE NOTE — P122.0 C122 governance launch, 2026-10-31

- **Changed:** Product version set to 122. CURRENT NORMATIVE CONTRACT in TECHNICAL_SPECIFICATION.md rewritten for C122 (Expert primary, Architect frozen, Conversational out of scope, four-patch plan). ROADMAP.md CURRENT ROADMAP CONTROL updated with C122 sequence and priorities. docs/DECISIONS.md records D-2026-10-31-03. CHANGELOG.md and this evidence note added. package.json version/patch updated.
- **Scope of this delivery:** Documentation and governance only. No Expert code, persistence, API, or test changes. Establishes the normative baseline required before P122.1 implementation.
- **NOT_RUN:** typecheck, unit/integration/e2e tests, hosted CI, live Expert sessions, real-model evaluation. Governance change does not alter runtime behaviour.
- **Next required work:** P122.1 — State Integrity & Persistence (inspect actual Expert persistence implementation, then implement durable session state, recovery, versioning, export/import integrity).

# CURRENT EVIDENCE NOTE — P121.0.48 single Architect selection + semantic DOM validation, 2026-10-31

- **OBSERVED (new owner-supplied artifacts):** Legacy generated Expense Tracker report `2c0ae028-1ec8-4f06-951b-fd4d382f5751` is `SUCCESS`, `goalImplemented=true`, and all seven declared validators pass (6 model calls, 42,403 ms). Architectural Test Lab report `385c4835-9aa8-407f-9f52-281021126974` is `PARTIAL`, `goalImplemented=false`, with `js-syntax` (`import` outside module) and `refs` (`style.css` missing; generated file is `styles.css`) failing (10 calls, 52,815 ms).
- **OBSERVED (source inspection of the selected legacy artifact):** DOM repair had mapped distinct properties (`emptyState` / `expenseList`, `categoryTotalsContainer` / `categoryTotalsList`, `diagStatus` / `diagTime`) onto the same existing ids, allowing the old validator to pass while semantic wiring remained suspect.
- **Changed:** `/project`, `/project-legacy`, and `/architect` now use `ProjectMode`; `/architect-lab` is retained as a frozen diagnostic route. The shared DOM validator detects duplicate explicit `this.*` property-to-id bindings; repair instructions forbid aliasing unrelated UI roles to clear checks. Added a regression test and updated current decision/spec/roadmap/evidence.
- **Decision:** Legacy Architect is the single active development target, superseding the earlier Lab selection. This is a development-direction decision based on the latest comparable evidence, not a claim that browser/mobile usability has been proven.
- **NOT_RUN:** Browser execution of the supplied generated app, Android/mobile checks, live generation after this patch, production build, full test suite, hosted CI. Supplied diagnostic system checks PASS but do not prove generated-app behavior.

# CURRENT EVIDENCE NOTE — P121.0.47 architect selection + progress, 2026-10-31

- **OBSERVED (supplied build reports):** Architectural Test Lab (`1dbb04aa-5e51-48a4-9d26-55296db1f816`) is PARTIAL; HTML structure, JS syntax, references, size, secrets, and acceptance pass, while DOM wiring reports 7 missing HTML IDs. Legacy generated app (`6b22df2a-9008-4ee5-8bf5-1a90212979e1`) is PARTIAL; its JS validator reports 2 `import`-outside-module findings and DOM wiring reports 3 missing IDs. These validator reports are not proof of actual browser behavior; both apps remain imperfect.
- **Decision:** Lab is the provisional primary because the legacy report has JS syntax-validator failures in addition to wiring failures. Legacy remains available at `/project-legacy`.
- **Changed:** primary entry routing; build progress label in both Architect UIs; active decision and changelog.
- **NOT_RUN:** fresh model generation, browser E2E, Android/mobile behavior, hosted CI, deployed user outcome. Local checks are recorded separately in chat.

# CURRENT EVIDENCE NOTE — P121.0.46 model repair integrity, 2026-10-31

- **OBSERVED (owner diagnostics + both generated archives, release 121.0.45):** Legacy build `63e74598` shipped `app.js` of 464 bytes (a placeholder) with `outcome=SUCCESS`. Logs show the original `app.js` at 26,540 characters, `js_syntax_repair` (issue `Unexpected token '('`), a repair reply of 492 characters in 865 ms, `js_syntax_repair_accepted` (1 → 0), `job_done SUCCESS`. Source inspection: the repair prompts in `appBuilder/core-engine.ts` did not include the file, and acceptance compared only issue counts. The same acceptance rule exists in the dom-wiring repair (P118.5.6).
- **OBSERVED (jsdom, outside the repo):** both generated `index.html` files are self-contained (inline CSS and JS, no `<link>` / `<script src>`). Adding an expense produced one list row and a `$12.50` total with no script errors in both; the Lab result rejected a non-numeric amount with its validation message. So the shipped `styles.css` / `app.js` of the Legacy ZIP were unreferenced files and the placeholder did not break the app by luck of the model inlining everything. jsdom is not a mobile browser; device behavior NOT_RUN.
- **OBSERVED (Lab build `6dc4fc12`, PARTIAL):** `unit-2` (`style.css`) failed 3 seconds after `unit-1` finished with `rate_limited: router:blocked; no_suitable_model; … cooldown` for both models after a transient provider error; no wait or retry occurred, although the planner path in the same build waited 58.5 s and succeeded. The 31 KB `index.html` that was delivered works (above). Not changed by this patch.
- **Changed:** repair prompts carry the file; replacements that discard most of a file are rejected (`destructive_shrink`). Limit: the guard is a size heuristic (50% of a file of at least 400 characters); it does not prove a same-size replacement preserves behavior. The shared `call()` recovery path still truncates a retried prompt to 6,500 characters; a truncated repair prompt can only produce a shorter file, which the guard rejects (fail closed).
- **Local evidence (reconstructed tree, `npm ci`, Node 22.22):** new test file 5/5 (4 fail on the previous code); `test:app-builder` 93/93; `test:core` 95/95; `test:project` 63/63; `test:pipeline` 22/22; `typecheck`, `lint:copy`, `architecture:check`, `docs-integrity`, `check-version` PASS. Not run: full DAG, `test:models`, `test:security`, `test:files`, `test:workspace`, `test:database`, `test:integrations`, `test:gates`, `test:web`, `test:turn`, `test:ui*`, `build`, live/DB checks. Hosted CI and a live Architect build after this patch: NOT_RUN.
- **Pre-existing, untouched:** `docs/generated-check-graph.json` does not match a fresh `status:graph` output on the 121.0.45 tree (`docs:check` fails locally); `docs:check` is not part of the CI `check` profile, so the 28/28 run did not exercise it.

---

# CURRENT EVIDENCE NOTE — P121.0.45 neon + compact packaging tests, 2026-10-31

- ASSISTANT_PASTE from run 41188491629 / d23344fa: test:core ENOENT neon-initialize.yml; test:compact-ci-artifacts expected outer BIForge-PATCH-EVIDENCE.md after single-PASTE layout. Tests updated to match canonical four workflows and outer PASTE+zip contract.

---

# CURRENT EVIDENCE NOTE — P121.0.44 single ASSISTANT_PASTE outer artifact, 2026-10-31

- Owner: ASSISTANT_PASTE, BIForge-PATCH-EVIDENCE, and PATCH_EVIDENCE duplicated; wants one chat summary at archive root and all logs nested. Implemented in package-ci-artifacts outer cleanup and PACK_OUTER_ARTIFACT for non-DAG workflows. Includes prior 0.43 inventory + UI smoke fixes (unapplied). Hosted CI: NOT_RUN.

---

# CURRENT EVIDENCE NOTE — P121.0.43 inventory + UI smoke, 2026-10-31

- ASSISTANT_PASTE from run 41187334506 / sha cfcdb1d: `test:core` FAIL — workflow inventory deepEqual expected old P119 file list; actual included `acceptance.yml` / `architect-compare.yml`. Second failure in same file was the ui-check.yml push gate assertion (34 pass / 2 fail).
- Fix: canonical four-workflow inventory + move short Playwright smoke onto `ci` after DAG. Hosted re-run: NOT_RUN.

---

# CURRENT EVIDENCE NOTE — P121.0.42 workflow consolidation + ASSISTANT_PASTE, 2026-10-31

- Owner: reduce ~17 workflows to a few; every run must yield a paste-friendly summary for the assistant when attachments are blocked. Delivered four canonical workflows and a shared summary generator that scans logs for not-ok/FAIL/AssertionError tails.
- Local: synthetic fail log → ASSISTANT_PASTE.txt contains STATUS and failure snippet. Hosted CI after apply: NOT_RUN.

---

# CURRENT EVIDENCE NOTE — P121.0.41 flat fixture path, 2026-10-31

- Owner rejected new nested `scripts/fixtures/` as forbidden project layout complexity. Corrective delivery flattens the dual-compare goal file under `scripts/` and documents deletion of the nested path for Navigator.

---

# CURRENT EVIDENCE NOTE — P121.0.40 web test + dual-compare cumulative, 2026-10-31

- CI run 41184514766 / commit 06863dac: `test:web` FAIL — P116 expected `/не удалось подтвердить веб-поиском/` while runtime returned English disclosure from prior English-UI change. Tests and disclosure helpers aligned to English-only product chrome.
- Cumulative ZIP also ships architect dual-compare workflow for navigator automation. Live dual-compare staging run: NOT_RUN.

---

# CURRENT EVIDENCE NOTE — P121.0.39 Architect dual-compare, 2026-10-31

- Owner requested an automated workflow to compare both Architect modes so the navigator only takes key decisions. Implemented dual API-path compare (not browser UI) against staging, reusing P118 classify/zip helpers.
- Local: dry-run produces report.md/json; contract test covers presence + dry-run. Live staging compare: NOT_RUN until workflow_dispatch with secrets.

---

# CURRENT EVIDENCE NOTE — P121.0.38 English UI + p119 contract, 2026-10-31

- CI evidence (run 41183878999, commit 89744ae): `test:core` FAIL — `assert.match(lab, /href="\/project"/)` after Lab chrome moved the anchor into `ArchitectShellHeader.tsx`. Assertion updated to shell + Lab footer path mention.
- Bundles unapplied English-UI copy fixes so owner can apply one ZIP. Local syntax of the updated contract test: checked. Full `test:core` / DAG on this environment: NOT_RUN.

---

# CURRENT EVIDENCE NOTE — P121.0.37 English-only UI, 2026-10-31

- Owner report: Russian labels still appear in working modes. Source scan of `src/` found user-visible Cyrillic concentrated in `ProjectMode.tsx` build-status block, `ConversationFiles.tsx` export role labels, `decisionDocument.ts` `L.ru` headings, one Expert display string, and web-search footers/prompt markers in `server/webSearch.ts`.
- Change is UI/copy only for those surfaces; does not alter model language policy for *replies* (models may still answer in the user’s language when appropriate). Product chrome and status banners are English.
- Side patch while P121.0.36 is under owner test; no Lab chrome/engine changes in this ZIP.

---

# CURRENT EVIDENCE NOTE — P121.0.36 Lab chrome parity + js-syntax repair, 2026-10-31

- Owner chose option A (Lab primary) conditional on quality; repeatedly required **identical top menu** across modes (no Lab-only stubs). OBSERVED: Lab used a custom toolbar; Conversational/Expert/Project use ModeMenu + Drive + More.
- Live Lab build job `592b832c…` PARTIAL: `js-syntax` fail on `app.js` line with `Math.random().toString(36.substr(2, 9))` (OBSERVED artifact). Engine had dom-wiring repair only; no js-syntax post-check repair.
- Delivered: shared `ArchitectShellHeader` on Lab; engine js-syntax deterministic + bounded model repair. Local: deterministic fix verified on the failed `app.js` (`node --check` PASS after fix). Full build/E2E/hosted CI: NOT_RUN.

---

# CURRENT EVIDENCE NOTE — P121.0.35 Lab create validation, 2026-10-31

- Device screenshots (08:39): Lab at `/architect-lab` (P121.0.34) after Create project brief → stage "Stopped with error", alert "Invalid project data". Same session Legacy `/project` built Expense Tracker SUCCESS and offered source ZIP (08:42). Diagnostics overall PASS; lastFailedOperation still historical HTTP_409, not this create failure.
- Server mapping (OBSERVED source): ZodError on create → HTTP 400 "Invalid project data". `createProjectRequestSchema.goal` is max 2000 chars. Lab client did not clip.
- Fix in Lab client only. Product decision (Lab vs legacy as primary Architect entry) left open for owner; this patch only removes the create blocker.

---

# CURRENT EVIDENCE NOTE — P121.0.34 Lab shell always reachable, 2026-10-31

- Source (OBSERVED): `ArchitectLab.tsx` early returns for session check, Project Mode disabled, and sign-in rendered bare `<main>` with no header and no diagnostics menu. Owner report of “no menu, no diagnostics access” is consistent with landing on one of those states (or a clipped toolbar); menu existence on the main authenticated screen was never in dispute.
- Change: persistent `LabHeader` in every Lab state; diagnostics menu visible when signed out / disabled and surfaces “Sign in to load diagnostics” without calling authenticated endpoints. CSS adjusted for ≤720px so the menu stays in viewport. E2E extended for header presence, sign-in/disabled states, and phone viewport.
- Local checks this session: source edit only; full production build + Playwright E2E and hosted CI: NOT_RUN (sandbox has no full node_modules tree from the shipped zip). Device outcome: NOT_RUN until owner confirms on tablet.
- Obligations touched: BIO-001 (agents reachable from Lab), BIO-004/BIO-005 (Lab recovery surface). Generation engine, passport, validators, and `/project` unchanged.

---

## P121.0.33 — Abort listener lifecycle on the shared build-job signal
Source evidence: `server/appBuilderAdapter.ts` creates one `AbortController` per build job and passes its signal to every model call and clock sleep. `geminiAdapter.ts`, `openaiCompatAdapter.ts`, and `realClock.sleep` added an `abort` listener per call without removing it, and ignored a signal that was already aborted. Owner-exported diagnostics (commit `7849786`, release 121.0.32) contain `MaxListenersExceededWarning` (11 abort listeners) at 2026-10-30 23:14:44. That this leak produced the warning is INFERRED; the mechanism was reproduced locally (12 calls left 12 listeners per path, 0 after the fix). Fix: unlink in `finally`/on timer, and return `PROVIDER_TRANSIENT` without a provider request when the signal is already aborted. Local evidence: `test:models` 150/150 PASS with four new tests; those tests fail on the previous code (3 of 4). Dependencies were partly unavailable locally (`zod`, `jszip`, `tsx` linked temporarily), so typecheck, build, full Core/DAG, browser E2E, hosted CI, and live builds are NOT_RUN.
Diagnostics reading note: the HTTP 409/404 entries listed as the last failed operations match the negative controls in `scripts/p118-architect-live.mjs` (unconfirmed passport build, missing artifact download) by source and timing; the live-run log was not inspected. Open and untouched: Quick Diagnostics workflow contract failure on `7849786` (`run-dag.mjs` streaming assertion; main CI was green on the same commit), generated Expense Tracker add-expense defect (no artifact in evidence), independent Lab backend engine.

## P121.0.32 — Repair final stale Architect entry assertion
Owner-provided CI evidence for commit `d45e05f4332a3d0365b013fca8387174ea4c96cb` records 27 passing checks and one failing core test: `tests/p121-cycle-governance.test.mjs` still expected `window.location.href = '/project'`. The current `src/App.tsx` sends the standard Architect entry to `/architect-lab`; `/project` remains the separate legacy ProjectMode route. Updated this test to assert the current entry route, absence of the browser confirmation prompt, and preservation of the legacy route. `workflow-dag` was downstream of the core test failure. No runtime, routing, generated-app, database, or Neon code changed.

## P121.0.31 — Repair remaining P119 route-boundary assertion

Owner-provided CI evidence for commit `64aab1dc566936313a8c97cb2e476d3ba989ca3e` shows 27 checks passing and one `test:core` failure: `tests/p119-agent-boundaries.test.mjs` still asserted that `App.tsx` navigates to `/project`. The actual intended routing established in P121.0.27/P121.0.30 sends the standard Architect menu to `/architect-lab`, while `/project` remains a separately mounted legacy `ProjectMode` route. Updated this one stale test to assert both current routes and lazy-loaded components. `workflow-dag` was downstream of the core test failure. No runtime code changed. Local test execution and hosted CI after this patch: NOT_RUN until performed.

## P121.0.30 — CI contract alignment and Lab diagnostics fixture synchronization
Owner-provided CI evidence for commit `231e7b4034e449af66f95a7da02d5dfcc03467ff` records three direct failing checks and one downstream DAG failure. `lint:copy` rejected seven visible uses of the internal term “passport”; visible Lab copy now uses “project brief”/“scope” while internal API state remains unchanged. `tests/p119-agent-ui-contract.test.mjs` still asserted the pre-switch `/project` entry route; it now asserts `/architect-lab` and separately protects `/project` as the legacy fallback. The compact artifact test failure was downstream of the copy lint failure because its fixture DAG included `lint:copy`. The Quick Diagnostics contract expected live `spawn` streaming while the tested source excerpt showed buffered `spawnSync`; the collector now uses explicit `spawn` stream handlers and preserves stdout/stderr channels. The Lab browser fixture now matches the session-log endpoint with optional query strings and waits for the successful response before asserting the textarea contents. Local targeted contracts 13/13 PASS, copy lint PASS, syntax/version/docs checks PASS. Full Core/DAG, dependency-backed browser E2E, hosted Actions, and deployed UI remain NOT_RUN. No generated application runtime or Neon/database behavior changed.

## P121.0.29 — Stabilize Lab diagnostics browser assertion
Owner-provided browser E2E output for commit `db1f2800463d92c12535b3aa08d4e8de422ea486` shows the test opened Compact session log but immediately read the textarea while it still contained `Loading diagnostics…`, rather than the intercepted fixture. The browser test now waits for the textarea to contain the exact fixture text (10-second timeout) before asserting and continuing the existing Lab completion/download flow. This is a test synchronization fix only; no runtime behavior is changed and it does not establish that the real diagnostics endpoint has been validated. Local syntax/version/docs checks: pending; hosted Actions and deployed UI: NOT_RUN.

## P121.0.28 — Reapply live Quick Diagnostics streaming workflow
Owner-provided report for commit `db1f2800463d92c12535b3aa08d4e8de422ea486` shows TYPECHECK and ARCHITECTURAL TEST LAB CONTRACT passing, browser/UI explicitly disabled, and only QUICK DIAGNOSTICS WORKFLOW CONTRACT failing because the dependency output did not match the required `tee` streaming contract. The report's captured workflow excerpt contains the older redirected command (`npx playwright install chromium > ... 2>&1`), proving that the earlier streaming workflow was not present in the tested commit. This patch deliberately re-applies the workflow and matching contract test as a pair. Dependency and Chromium install commands stream combined output to runner-temp logs with `set -o pipefail`. No product code or generated Expense Tracker behavior changes. Local contract/version/docs checks: pending; hosted Actions and deployed behavior after this patch: NOT_RUN.

# Technical Report

## P121.0.27 — Primary Architect entry and Lab diagnostics
User-confirmed Lab generation, ZIP export, and app launch, followed by a generated Expense Tracker add-expense interaction that reset without creating a visible row. This patch makes the existing Architectural Test Lab the destination of the standard Architect selection and `/architect` route, keeps `/project` available as a legacy comparison/rollback route, and adds a Lab top-menu for existing system/operations/session-log/export diagnostics endpoints. This does not fix or claim to fix the generated Expense Tracker persistence defect; it provides direct diagnostic access to investigate it. Automated source contract checks cover routing and diagnostics affordances; the Lab browser E2E fixture now opens the diagnostics menu, reads a mocked compact session log, then continues through passport confirmation, completion, and ZIP download. Local targeted contracts (Lab + Quick Diagnostics): PASS 9/9; test syntax, version metadata, and docs integrity: PASS. Dependency-backed TypeScript build and browser E2E: NOT_RUN because `node_modules` is absent. Full hosted CI, deployed UI, and actual diagnostics endpoint behavior remain unverified until the user applies and tests this patch.


- Owner-provided Quick Diagnostics report for commit `d8f74020a215fb5b8015b3185b142842e519dc0d` shows `TYPECHECK`, `ARCHITECTURAL TEST LAB CONTRACT`, `BROWSER INSTALL`, and `ARCHITECTURAL TEST LAB BROWSER / UI` passing. The only failing section is the workflow contract assertion that dependency installation output must stream through `tee`.
- Made dependency and Chromium installation shell blocks explicit multiline Bash with `set -o pipefail` and combined stdout/stderr piped through `tee` to the existing runner-temp logs. Updated the contract test to isolate the dependency step and independently inspect every browser installation step.
- No product UI/runtime, API, database, Neon, or Lab generation flow changed.
- Local targeted contract, version metadata, and docs integrity checks: pending. Hosted GitHub Actions and deployed user outcome after this patch: NOT_RUN.

---

# CURRENT EVIDENCE NOTE — P121.0.25 Architectural Test Lab passport gate, 2026-10-30

- Owner-reported live Lab attempt reached `/architect-lab`, but `/api/projects/:id/code/build` rejected the new project with `PASSPORT_NOT_CONFIRMED` / “Confirm the project passport before creating software.” Source inspection confirms the Lab previously created a project and immediately called the build endpoint without persisting a confirmed passport. The shared API requires a confirmed passport.
- Implemented a two-step Lab flow: create project with a proposed passport derived from the entered goal; render a review panel; on explicit confirmation, persist the complete passport with `status: confirmed` and `expected_version`; only then submit the build request. No automatic confirmation and no API guard bypass.
- Affected user-visible steps/test IDs: `architect-lab-build-form` and `architect-lab-build` (create proposed passport), `architect-lab-passport` (review), `architect-lab-confirm-passport` (explicit confirmation and build), `architect-lab-completion` (persistent result surface), `architect-lab-download` (ZIP download). The existing browser E2E is updated to exercise the new confirmation step and still proceeds to the completion surface and download in its mocked fixture.
- Local syntax and dependency-free contract checks: pending. Dependency-backed browser E2E, full CI, hosted Actions, and live model/provider build: NOT_RUN. A mocked browser E2E cannot establish real generated artifact quality.
- No Neon database changes, schema changes, migration execution, or legacy Architect UI changes.

---

# CURRENT EVIDENCE NOTE — P121.0.24 Lab UI and Quick Diagnostics test repair, 2026-10-30

- Owner-provided run for commit `85583fc938ad507dffbe7544a886133fa7de8bc9` reports CI green, while Quick Diagnostics workflow contract and Architectural Test Lab browser/UI checks fail. The browser assertion expected `architectural-lab.zip`; `src/ArchitectLab.tsx` creates the download anchor with the explicit filename `architectural-lab-result.zip`. This is a test expectation mismatch, not evidence of a runtime download failure.
- The workflow contract test used one brittle regex to match the entire `npm ci ... | tee ...` line. It is replaced by separate assertions for the install command, log path, and tee streaming for both dependency and browser installation.
- Scope is limited to two tests plus patch metadata and this report/changelog. No product UI/runtime, API, database, Neon schema, or existing migrations changed.
- Affected UI path: `/architect-lab` form → mocked successful completion → download button → browser download event. The assertion now checks the filename assigned by the actual UI code. End-to-end browser execution after this patch: NOT_RUN; hosted Actions and Android deployed UI: NOT_RUN.
- Local static/contract checks: pending.

---

# CURRENT EVIDENCE NOTE — P121.0.23 CI regression repair, 2026-10-30

- Owner-provided CI evidence for commit `896046f2552458bde0da3d693c02290cf831adb1` showed `test:core` failing because the approved `neon-initialize.yml` workflow was absent from the exact workflow inventory allowlist; `test:project` failing because its test expected a stale note string; and the Lab browser test failing at server startup because legacy Project Mode was enabled without `DATABASE_URL`. The workflow DAG failure was downstream of these failed stages.
- Changes: added `neon-initialize.yml` to the exact workflow inventory; aligned the staged-build test with the actual `stagedArchitectNote` success message; explicitly disabled `ENABLE_PROJECT_MODE` and blanked inherited `DATABASE_URL` in the mocked Lab browser server environment. Added/updated static regression assertions. No product runtime or Neon schema behavior changed.
- Affected UI test flow: `/architect-lab` fixture boot → build form → mocked completion surface (`data-testid=architect-lab-completion`) → mocked ZIP download (`data-testid=architect-lab-download`). The fixture uses mocked project/session/build APIs and is not intended to test live Neon.
- Local syntax/static contract checks: pending. Dependency-backed Core/Project/browser tests, hosted CI, and deployed Android UI: NOT_RUN.

---

# CURRENT EVIDENCE NOTE — P121.0.22 guarded Neon initialization, 2026-10-30

## User evidence

- Neon SQL connection succeeded against database `neondb` on the `production` branch.
- `public_table_count` returned `0`; catalog queries showed no user relations. The owner confirmed the Neon endpoint host matches GitHub Actions `DATABASE_URL` (secret value not exposed here).
- This establishes an accessible apparently uninitialized database endpoint, not that historical application data is absent from every Neon branch or external store.

## Change

- Added manual workflow `.github/workflows/neon-initialize.yml`. It requires typed confirmation that a Neon backup branch was created and that the target is `biforge-production`.
- Workflow runs read-only preflight, existing `npm run db:migrate` (19 repository migrations), then read-only checks for migration ledger and required tables.
- Preflight refuses a non-empty `public` schema without a migration ledger. Workflow has concurrency serialization and performs no DROP/TRUNCATE/DELETE.

## Verification

- Workflow contract tests: 3/3 PASS locally.
- Version metadata and docs integrity: PASS locally.
- Live Neon migration, hosted Actions, and application CRUD after migration: NOT_RUN.
- Do not report Neon initialized until the workflow finishes green and the app successfully creates/reads a project.

---

# CURRENT EVIDENCE NOTE — P121.0.21 legacy Architect result-shape crash guard, 2026-10-30

- Source evidence: `publicJob()` in `server/appBuilderAdapter.ts` returns staged-build fields (`jobId`, `status`, `stage`, `units`, `report`, `downloadUrl`) and does not return the legacy `codeTask` object. `src/ProjectMode.tsx` stored that response directly in one guided-build path, then dereferenced `programResult.codeTask.statusReason` during render.
- Change: made `codeTask` optional in the legacy result state and guarded `statusReason`, `prUrl`, and `id` reads. Removed fabricated `codeTask` placeholders from guided-start, create-project, and standard build result paths. Added a regression test for a completed staged result without `codeTask`.
- User-visible flow affected: `/project` build result panel (heading, optional pull-request link, ZIP download, Drive save). Existing browser E2E completion surface is not structurally changed; whether it reaches completion after this change is NOT_RUN locally.
- Neon: no live connection was attempted; migration application, schema state, and Render-to-Neon data transfer remain NOT_VERIFIED. No database migration or data mutation was included.
- Local syntax, focused test, typecheck, production build, hosted Actions, and deployed Android reproduction: NOT_RUN pending available dependencies/runtime.

# CURRENT EVIDENCE NOTE — P121.0.20 live workflow output and isolated Lab test startup, 2026-10-30

- The verification DAG previously forwarded child output only when concurrency was exactly 1; parallel checks were written to files but not streamed into the Actions console. Child output is now always streamed, with check-ID prefixes in parallel mode.
- Quick Diagnostics previously redirected dependency/browser installation output to temporary files and used `spawnSync`, hiding check output until each process completed. It now uses `tee` for install phases and streams spawned check output while retaining bounded failure evidence for the one-file report.
- The P122 browser test previously set `ENABLE_PROJECT_MODE=true` with an empty database URL, causing `server.ts` to abort before the browser scenario. The fixture mocks project/session/build requests, so the test server now keeps legacy Project Mode disabled.
- Regression assertions added for streaming and the isolated server environment. Source syntax and static checks: pending. Typecheck, full browser test, hosted Actions, and Android UI: NOT_RUN in this reconstructed workspace.

---

# CURRENT EVIDENCE NOTE — P121.0.19 single-file Quick Diagnostics, 2026-10-30

- Quick Diagnostics now produces exactly one downloadable file: `ERROR_SUMMARY.txt`, with bounded sections for dependency installation, typecheck, Architectural Test Lab contract, browser/UI, and overall status.
- Raw command output stays in the ephemeral Actions runner temp directory and is not uploaded. No separate CI/UI summary or per-check log files are included in the artifact. The Lab browser smoke test captures page errors, console errors, and failed requests and fails with those details so they are included in the same report.
- Dependency or Chromium installation failures are captured; dependent checks are marked BLOCKED. Report generation and artifact upload use `always()` so failures still produce the single report.
- Local checks: workflow contract tests 2/2 PASS; Node syntax checks PASS; YAML parse PASS; version metadata check PASS; synthetic dependency-failure run produced one report with dependent checks marked BLOCKED. Full typecheck/Core/browser execution BLOCKED because this reconstructed workspace has no installed TypeScript/tsx/Playwright binaries. Hosted Actions execution, artifact contents/size, and Android live UI: NOT_RUN.

# CURRENT EVIDENCE NOTE — P121.0.18 focused CI/UI diagnostic fixes, 2026-10-30

- Addressed the P121.0.17 evidence: TypeScript's invalid `HTMLElement`/`window` comparison is replaced by an `Element` runtime narrowing; the Architectural Test Lab browser test starts its server through `process.execPath --import tsx`; Core's exact workflow inventory now explicitly permits `quick-diagnostics.yml`.
- These changes target the recorded `typecheck`, `spawn tsx ENOENT`, and workflow-inventory failures. The `workflow-dag` failure is expected to clear only if it was downstream of the recorded Core/typecheck failures; hosted rerun is required to establish that.
- Local checks: `node --check` for both edited test files PASS; Quick Diagnostics workflow YAML parse PASS; `node scripts/version-metadata.mjs` PASS; `node scripts/docs-integrity.mjs` PASS. The exact TypeScript/Core/browser tests could not run because dependency installation (`npm ci --ignore-scripts --prefer-offline --no-audit --no-fund`) timed out and left `tsx` unavailable in this workspace; the attempted `node --import tsx` run was therefore BLOCKED by `ERR_MODULE_NOT_FOUND`.
- Full DAG, hosted CI, and Android live UI: NOT_RUN. The CI evidence must be rerun on the resulting commit to confirm all three reported failures are resolved.

# CURRENT EVIDENCE NOTE — P121.0.17 on-demand quick diagnostics, 2026-10-30

- Added `.github/workflows/quick-diagnostics.yml`, manually started from Actions. It deliberately bypasses the full CI verification DAG.
- Checks: TypeScript typecheck, Architectural Test Lab contract tests, and (by default) the isolated Lab Playwright flow including build/completion/download.
- Output artifact: `biforge-quick-diagnostics`, containing copy-friendly `CI_ERROR_SUMMARY.txt` and `UI_ERROR_SUMMARY.txt` plus bounded individual check logs.
- The workflow runs checks independently and uploads evidence even when a check fails. Browser run can be disabled at dispatch; Chromium cache reduces repeat setup time.
- Workflow syntax/runtime, actual duration, hosted Actions result, and Android live UI behavior: NOT_RUN in this workspace. This workflow is diagnostic, not a replacement for full CI or proof of user value.

# CURRENT EVIDENCE NOTE — P121.0.16 Architectural Test Lab development direction, 2026-10-30

## Owner-approved direction

New development is prioritized on the experimental fourth mode, Architectural Test Lab (`/architect-lab`). Routine repair of the legacy Architect is paused; its failures and diagnostic logs are retained as inputs for Lab-specific regression prevention and recovery design. The legacy route remains available and unchanged unless separately authorized.

## Verified implementation boundary from the available source tree

- Lab frontend route, form, progress, completion/download surface, and error boundary are separate from legacy `ProjectMode` (source contract and existing P122 tests are present in the tree).
- Lab still reuses authenticated project/build APIs and shared backend orchestration, polling, validators, and artifact storage.
- Independent Lab backend engine: OPEN. No claim is made that the new engine has been implemented or that live user outcomes have been verified.
- This documentation patch does not alter runtime behavior. Hosted CI and deployed Android behavior: NOT_RUN in this workspace.

# P121.0.15 — Architectural Test Lab (source implementation)

- Status: IMPLEMENTED (experimental frontend route); independent backend engine: OPEN.
- Added lazy `/architect-lab` route. The route does not mount legacy `ProjectMode.tsx`; it owns its form, progress state, completion panel, and ErrorBoundary.
- Reuses authenticated `/api/projects` and `/code/build` APIs plus shared job polling, provider orchestration, validators, and artifact storage. This deliberately reuses proven backend services and does not claim a new generation engine.
- Affected user-visible steps: direct navigation to `/architect-lab`; session check/login; project description; create/build; progress; completion/outcome; ZIP download; return to `/`. Test IDs: `architect-lab-build-form`, `architect-lab-build`, `architect-lab-completion`, `architect-lab-download`.
- Added a dedicated Playwright browser scenario for the lab route, completion surface, and ZIP download; it is wired into `test:ui`. Existing three-agent browser E2E scenarios remain unchanged. Local browser E2E execution, hosted CI, and live Android behavior: NOT_RUN.
- Legacy Architect remains enabled and unchanged. No promotion/deactivation decision is made by this experimental patch.

# CURRENT EVIDENCE NOTE — P121.0.14 emergency screen capture, 2026-10-30

## Change

Global `error` / `unhandledrejection` capture is installed before React mount. The application root is protected by an ErrorBoundary that records React component stacks. Both paths provide a visible emergency screen and download of `biforge-emergency.log`; events are retained in a bounded localStorage ring for reload recovery. Resource-load errors are recorded with element/source metadata.

## Evidence and limits

- Source-level implementation and regression assertions added.
- Typecheck: NOT_RUN. Production build: NOT_RUN. Hosted CI: NOT_RUN. Android/browser runtime: NOT_RUN.
- This captures uncaught browser errors, unhandled rejections, resource errors, and React render errors. It cannot guarantee recovery from browser process termination, device power loss, out-of-memory kill, or errors occurring before the bootstrap module executes.
- User outcome: NOT_VERIFIED until tested on the deployed BiForge build with a reproduced failure.

---

# CURRENT EVIDENCE NOTE — P121.0.12 compact paste-ready session log, 2026-10-30

## P121.0.13 — Browser black-screen diagnostics (2026-10-30)

- Runtime additions: bounded privacy-safe browser events (`window.error`, `unhandledrejection`, visibility, mount, DOM mutations, page hide), root element dimensions/style/child/text-length snapshots, and authenticated server ingestion. The paste-ready report includes recent browser events and HTTP request metadata alongside build operation evidence.
- Security boundary: no DOM text, prompts, generated source, request/response bodies, cookies, or credentials are transmitted; only text length and structural root metrics are recorded.
- Evidence status: source changes inspected; typecheck/build/tests/hosted CI/deployed Android reproduction NOT_RUN. The patch does not claim the black screen is fixed.

## Change

Added `GET /api/projects/diagnostics/session-log` and a Diagnostics action that displays a bounded plain-text report with a copy button. It correlates recent operation events and application logs to the latest non-diagnostic operation, includes runtime/system-check provenance, and explicitly states missing evidence and browser-download observability limits. Sensitive/user-content fields are excluded.

## Evidence and limits

- Source inspection: implementation and UI wiring present.
- Automated regression: added to `tests/project-diagnostics-p92.test.mjs`; execution NOT_RUN (dependencies/runtime not provisioned in this reconstructed workspace).
- Typecheck, production build, hosted CI, and live Android copy/paste: NOT_RUN.
- The latest-operation correlation can only include records retained by the existing bounded diagnostic stores.

---

# CURRENT EVIDENCE NOTE — P121.0.11 docs-integrity AGENTS marker, 2026-10-30

> Additive.

## Failure

`docs-integrity` / `test:core`: `AGENTS.md missing required text: Mandatory protocol for the beginning of every session` after P121.0.10 rewrite renamed the section to "Session protocol".

## Fix

Section §4 title restored to the required contract string; hard gates §0 unchanged.

## Checks (local)

- `node scripts/docs-integrity.mjs` → PASS
- `p121-cycle-governance` + `p121-navigator-protocol` → PASS
- Hosted CI: NOT_RUN

---

# CURRENT EVIDENCE NOTE — P121.0.10 AGENTS hard gates, 2026-10-30

> Additive. Prior notes retained.

## Change

`AGENTS.md` restructured so delivery and Navigator rules are **fail-closed hard gates at the top**, not late narrative. Explicit bans on combined re-ship, helper files in ZIP, shell steps for Navigator, and shipping UI flow changes without e2e/completion surface in the same delivery.

## Checks

- Source structure of AGENTS.md reviewed against session failure modes.
- `p121-navigator-protocol.test.mjs` updated for G1–G5 headings.
- Hosted CI / full test:core: NOT_RUN here.

---

# CURRENT EVIDENCE NOTE — P121.0.9 e2e and lint:copy fixes, 2026-10-30

> Additive. Prior notes retained.

## Failures addressed (from CI evidence)

1. **lint:copy** — UserGuide §6.2 one long paragraph exceeded 24 words; split into short paragraphs. Local `node scripts/lint-copy.mjs` → OK.
2. **p120-architect-e2e** — `novice-done` never appeared because `onFinished` set `showGuidedStart=false` and `loadProjects(id)` set `selected`, unmounting the wizard (`!selected && showGuidedStart`). Original P58 behavior kept the novice path mounted after finish. Fixed: render wizard while `showGuidedStart`; `onFinished` only refreshes/selects project; dismiss via Back.

## Checks

- lint:copy: PASS (local)
- Architect browser e2e / full DAG / hosted CI: NOT_RUN in this workspace; expect CI re-run after apply

---

# CURRENT EVIDENCE NOTE — P121.0.8 Navigator protocol rules, 2026-10-30

> Additive record. Historical notes below retained.

## Change

Binding assistant protocol in `AGENTS.md` §7 and decision D-2026-10-30-07:
1. Patch ZIP purity for Navigator delivery.
2. Navigator = Android tablet, GitHub web UI / Actions / mobile browser only.
3. Automate tests and workflows instead of terminal runbooks for the Navigator.

Governance regression: `tests/p121-navigator-protocol.test.mjs` in `test:core`.

## Checks

- Source inspection of AGENTS/DECISIONS/TESTING: rules present.
- Hosted CI and full `test:core` execution: NOT_RUN in this workspace.

## Boundary

Does not by itself close BIO-004 live user-value. P121.0.7 UI unification still requires Actions/browser evidence after apply.

---

# CURRENT EVIDENCE NOTE — P121.0.7 One Architect flow, 2026-10-30

> Additive top-level record. Prior notes below are historical and retained.

## Scope and provenance

Implemented against the reconstructed archive `bf-121-0-6.zip` (patch 121.0.6). This is not a live remote checkout; hosted CI and deployment were not run.

## Change

- **BIO-004 / one Architect experience:** `ProjectMode.tsx` no longer renders `ProjectPathChooser` or branches on `builderPath === 'novice' | 'professional'`. Default entry is the guided wizard (`ProjectNoviceWizard`); dismissing it shows the project list and optional name/goal create form with a “Guided start” return control. After a project is selected, existing workspace tools remain unchanged.
- Client strings and `UserGuide` / capability notes updated to stop advertising two paths.
- `tests/p120-architect-e2e.test.mjs` waits for `project-novice-wizard` instead of clicking `path-novice`.

## Checks run

- Static inspection: no remaining `builderPath` / `ProjectPathChooser` usage in `ProjectMode.tsx`.
- Full `npm test` / typecheck / browser e2e / hosted CI: **NOT_RUN** (incomplete dependency install in this workspace).

## Remaining gaps

- Live end-to-end Architect generation with real models and download validation still NOT_VERIFIED.
- `ProjectPathChooser.tsx` file still present (unused); language residue (e.g. Cyrillic in build-progress messages) not addressed in this patch.
- User-value evaluation of the unified flow against real tasks remains OPEN.

---

# CURRENT EVIDENCE NOTE — Historical record preservation clarification, 2026-10-30

## Scope and provenance

Documentation-only clarification prepared against the reconstructed local tree assembled from available archives. The current remote repository was not available for comparison.

## Changes

- Distinguished historical records (completed roadmap entries, changelog, factual reports, decisions, and concise test/experiment outcome summaries) from obsolete active test implementations and temporary payloads.
- Clarified that completed tests may be retired without deleting the factual record that they ran or the conclusions supported by their evidence.
- Required reference, CI, compatibility, and unique-coverage checks before retiring executable tests or fixtures.
- No tests, source files, fixtures, or historical records were removed.

## Verification boundary

Documentation and version checks are run locally where possible and their exact results are reported in the delivery message. Hosted CI, remote checkout comparison, and live product checks are NOT_RUN. This patch does not claim that a full repository retirement audit is complete.

---

# CURRENT EVIDENCE NOTE — Repository minimalism and test lifecycle policy, 2026-10-30

## Scope and provenance

Documentation-only governance update prepared in the locally reconstructed project tree assembled from available archives. The current remote repository was not available for comparison.

## Changes

- Added a requirement that every maintained file serve a current purpose.
- Defined test retention around current requirements, user scenarios, supported contracts, and material regression risks rather than age or historical origin.
- Added safe-retirement checks for references, CI/workflows, compatibility commitments, and unique coverage.
- Defined recurring classification outcomes: keep, update, merge, archive outside the repository, or delete.
- No source files, tests, fixtures, or historical records were removed by this patch.

## Verification boundary

Local checks are to be recorded after execution. Hosted CI, remote repository comparison, and live product checks are NOT_RUN. This note does not claim that a repository-wide retirement audit has been completed.

---

# CURRENT EVIDENCE NOTE — Repository language policy, 2026-10-30

## Scope and provenance

This record describes a documentation-only policy patch created against a reconstructed local tree assembled from available historical archives. It is not evidence about the current remote checkout.

## Decision and follow-up scope

- Established English as the sole language for maintained repository artifacts.
- Explicitly separated repository language from end-user input/output language support.
- Added a recurring roadmap stage to scan, classify, correct, and verify language residue, including runtime heuristics and test fixtures.
- No runtime heuristics or test prompts were changed because their behavior and intent cannot be safely inferred from a static scan alone.

## Verification boundary

Documentation integrity and version metadata checks are to be run against this reconstructed tree. Hosted CI, remote checkout comparison, runtime behavior tests, and live model tests are NOT_RUN.

---

# CURRENT EVIDENCE NOTE — C121 verification cycle bootstrap, 2026-10-30

## Scope and provenance

The cycle was checked against a local reconstruction assembled from the available `bf-119-0-4.zip` archive and the available P119/P120/documentation patches. The directory has no `.git` metadata; remote HEAD, hosted CI, deployed application, and live behavior cannot be independently verified here.

## Initial observations before repair

- `node scripts/docs-integrity.mjs`: FAIL — `NEXT_PATCH.md` plus 14 retired prose documents were still present despite the canonical governance and docs-integrity check requiring their removal.
- `node scripts/docsCheckInventories.mjs`: PASS.
- `node scripts/statusGraph.mjs --check`: PASS.
- `node scripts/capabilityGenerateGraph.mjs --check`: PASS (449 nodes, 906 edges).
- `node scripts/p120-e2e-preflight.mjs`: PASS against historical P120.0.7 before the cycle bump; its hard-coded version check would prevent moving to v121.
- `node scripts/run-dag.mjs --profile check`: FAIL; only 3 checks passed, 15 failed, 6 blocked. Several failures were caused by missing `tsx` after `npm ci --ignore-scripts --no-audit --no-fund` timed out. The docs-integrity failure was independent and reproducible.

## C121/P121.0.1 repair scope

- Set package version/patch to `121` / `121.0.1` and synchronized the root lockfile metadata.
- Generalized the P120 E2E preflight so it checks current version/patch consistency while retaining P120 browser tests as regression coverage.
- Updated the P120 acceptance-evidence test to distinguish the historical P120.0.7 acceptance record from current C121 package metadata.
- Removed the retired handoff and obsolete side-document files listed in the patch delivery summary.

## Post-repair verification results

- `node scripts/check-version.mjs` — PASS (`121` / `121.0.1`).
- `npm run docs:check` — PASS after regenerating the check/capability graphs; canonical docs, inventories, status graph, and capability graph are current.
- `node scripts/p120-e2e-preflight.mjs` — PASS; four historical P120 browser scenarios remain wired as regression coverage under C121. This is a preflight only, not a browser run.
- `node --test tests/p121-cycle-governance.test.mjs tests/p120-acceptance-evidence.test.mjs` — PASS, 8/8.
- `node --test tests/dag-p107.test.mjs tests/evidence-p105.test.mjs` — PASS, 27/27.
- `node --test tests/p119-agent-boundaries.test.mjs` — 19 PASS, 2 FAIL because the missing `tsx` package prevents loading TypeScript modules; the failures are environment/dependency blockers, not evidence of a product regression.
- `npm run check` — FAIL in this environment: 4 PASS, 14 FAIL, 6 BLOCKED. The failing runtime-dependent checks could not import `tsx`; `test:compact-ci-artifacts` could not import `jszip`. `npm ci --ignore-scripts --no-audit --no-fund` timed out, leaving dependencies incomplete.
- `node scripts/schemaValidate.mjs` without the required `--type` argument — invocation error, not a schema validation result; schema validation is NOT_VERIFIED by that command.

## Evidence boundary

Typecheck, build, full core/model/security/application tests, browser E2E, hosted CI, deployment, and live user-value scenarios remain NOT_RUN / NOT_VERIFIED. The P120 Architect browser test uses a mocked project/build API and explicitly exercises `path-novice`; it does not establish live model generation quality or compliance with the current one-flow Architect requirement. Source inspection confirms `ProjectPathChooser` still presents separate “Simple words” and “Professional” choices and `ProjectMode.tsx` renders separate branches. Therefore `BIO-004` is OPEN, not PASS. This patch repairs cycle identity and documentation governance; it does not change runtime product behavior.

---

# CURRENT EVIDENCE NOTE — Session governance and documentation consolidation, 2026-10-30

> Additive record. The previous evidence notes and all older implementation history below are retained. This patch updates governance and CI report naming; it does not claim any runtime product function has changed.

## Scope and provenance

This patch was built against a reconstructed tree extracted from `bf-119-0-4.zip`, with the previously prepared, not-yet-applied documentation consolidation patch overlaid. Other P119/P120 patch archives are present in the workspace but were not applied to runtime source in this working tree. This is not a verified remote checkout: remote HEAD, hosted CI, deployment, and live product behavior were not independently inspected. The exact checks actually run for this patch are listed below and must not be inferred beyond that list.

## Changes represented by this record

- `AGENTS.md` now contains the canonical obligation map and mandatory start-of-session protocol. Each session must independently reconstruct current state and choose its own task; no pre-written task is carried forward as binding.
- `NEXT_PATCH.md` is retired as a root planning/handoff file. CI-generated run evidence is renamed to `PATCH_EVIDENCE.md` / `BIForge-PATCH-EVIDENCE.md` so a diagnostic artifact cannot be mistaken for a future-work assignment.
- The roadmap keeps its completed phase history, but the current control section says the next task must be re-evaluated each session. Historical mentions of retired task files are not current instructions.
- Active workflow, report scripts, and related tests are updated to the new CI evidence artifact name. Product runtime behavior is not changed by this documentation/governance patch.

## Checks actually run in this reconstructed tree

- `npm run docs:check` — PASS, including canonical documentation integrity, generated inventories, check graph, and capability graph.
- `node --check` — PASS for modified JavaScript module files.
- `node --test tests/dag-p107.test.mjs tests/evidence-p105.test.mjs` — PASS, 27/27.
- Manual temporary-directory smoke test of `scripts/package-ci-artifacts.mjs` — PASS; output contained exactly `BIForge-PATCH-EVIDENCE.md` and `biforge-ci-logs.zip`.
- `tests/ci-diagnostics-chain.test.mjs` and `tests/compact-ci-artifacts-p94.test.mjs` — unable to start because `jszip` is not installed in this reconstructed tree; not counted as PASS.

## Evidence boundary

This record describes governance/documentation and CI report naming. It is not evidence that Architect has been converted to one flow or that any user-facing feature is complete. Full DAG, full test suite, browser tests, hosted CI, deployment, and live user scenarios remain `NOT_RUN`. The tree was reconstructed from an archive and patches; remote HEAD was not verified.

---

# CURRENT EVIDENCE NOTE — Documentation inventory, 2026-10-30

> This note is a new top-level record. The historical sections below are retained as written. Historical statements are evidence of what was reported at that time, not current runtime guarantees. New facts are added above older records; do not rewrite prior evidence to match the present.

## Scope and provenance

This documentation reconciliation was performed against a reconstructed working tree assembled from `/mnt/data/bf-119-0-4.zip` and the available P119/P120 patch archives through `BiForge_P120_0_8_User_Value_Documentation_Reconciliation.zip`. This is not a live checkout of the remote repository, so remote HEAD and remote CI state were not independently verified.

## Findings

- The documentation inventory had multiple competing sources for user-agent contracts, roadmap/task state, operating rules, user-value evidence, deployment context, archive delivery, and architectural guardrails.
- The older normative text allowed or described simplified/professional Architect interaction profiles in places, while the current product requirement is one Architect agent with no visible mode choice or independent flow.
- The previous documentation-integrity script enforced old document names and headings, so it would keep the obsolete document topology alive.
- This patch defines a single hierarchy, consolidates specialist documents, updates active references and documentation checks, and lists superseded prose files for deletion.

## Evidence boundaries

This is a documentation-only patch. No claim is made that the Architect UI/runtime has already been converted to one flow. No full test suite, browser E2E, live generation, deployment, or hosted CI was run as part of this inventory. Checks run for this patch are listed in the handoff message and must not be inferred beyond what was actually executed.

---

# BiForge Technical Report

**Document ID:** BF-TECH-REPORT-001  
**Status:** Historical reconstruction from available repository snapshots and documentation  
**Authority:** Evidence from analis.zip snapshots (bf-01 … bf-118), CHANGELOG.md entries, AI-USER-VALUE-REPORT.md, task documents, live-run notes and test artefacts  
**Principle:** Distinguish source-code presence, CI success, local test results and confirmed production/live behaviour. Do not equate any of them.

This report recovers the implementation history. For each material change it records:

- First appearance in a snapshot / version label
- Problem addressed
- Specified behaviour
- Affected components / files
- What was actually implemented
- Documented tests and checks
- Recorded results
- Defects found and fixed
- Open questions
- Confidence level and supporting artefacts

---

## 1. Early Foundation Snapshots (bf-01 … bf-09 / v14-main)

**First observed:** Lowest-numbered directories in the archive (bf-01, bf-1-0/v14-main, bf-1-6, bf-06, bf-09).

**Problem addressed:** Establish a working TypeScript + React + Express application with basic conversation capability, document handling and early project concepts.

**Specified behaviour:** Minimal runnable product; early CHANGELOG_AGENT_BEHAVIOR.md and README describe agent behaviour and Railway deployment.

**Components / files:**

- `server.ts` (monolithic in early versions)
- `src/App.tsx`, early CSS
- `package.json`, Vite/React scaffolding
- Early `server/documents.ts`, `reasoningState.ts`, `security.ts`
- Scripts for acceptance and prompt measurement

**Actually implemented:** Functional client-server chat surface; basic security; document generation primitives; early state tracking.

**Tests / checks:** Early acceptance scripts (`acceptance-s2-05.mjs` etc.), regression fixtures.

**Results:** Local runs possible; Railway deployment notes present.

**Defects:** Fragmented documentation; multiple competing sources of truth later consolidated.

**Open questions:** Exact commit dates unavailable (ZIP timestamps are archive creation); behavioural completeness of earliest agents not fully reconstructible from remaining artefacts.

**Confidence:** Medium for structure; low for precise behavioural contracts. Artefacts: package.json, early CHANGELOG_AGENT_BEHAVIOR.md, README, server modules.

---

## 2. Project Mode and Persistence Expansion (bf-16 … bf-26)

**First observed:** bf-16, bf-17, bf-20, bf-24, bf-26.

**Problem addressed:** Durable project state, richer orchestration, Drive integration, expanded agent behaviour logging.

**Specified behaviour:** Project state machines, file handling, history panels, offline indicators, Drive sync/merge/export.

**Components:**

- Expanded `src/ProjectMode.tsx`, `ConversationFiles.tsx`, `driveClient.ts`, `driveSync.ts`, `driveMerge.ts`, `driveExport.ts`
- `server/database.ts`, early migrations
- `AGENTS.md` (early form), larger CHANGELOG.md / CHANGELOG_AGENT_BEHAVIOR.md
- ARCHIVE/ directory with P08–P17 SPEC and REPORT documents

**Actually implemented:** PostgreSQL-backed project state; client-side Drive integration; richer UI panels; acceptance of multiple early patches (P08–P17 lineage visible in ARCHIVE).

**Tests:** Expanding test directories; golden-eval notes.

**Results:** Local and some hosted checks; Drive QA checklists present.

**Defects:** Competing documentation (later removed); production diagnostics incomplete (later frozen as P92).

**Open questions:** Which exact P-numbers map to which bf-NN snapshot; live Drive behaviour in production not fully evidenced.

**Confidence:** Medium-high for code presence; medium for live outcomes. Artefacts: ARCHIVE/*.md, expanded src/, migrations beginnings.

---

## 3. AI-Native Renovation Foundations (P106–P112, visible in later snapshots)

**First observed clearly:** bf-93, bf-104, bf-112 and documentation in bf-118.

**Problem addressed:** Lack of machine-verifiable evidence, weak fail-closed behaviour, missing capability/intent contracts, high context cost for AI sessions.

**Specified behaviour (from schemas and task docs):**

- Evidence Records, verification DAG, independent checks always complete.
- Bounded repair with protected paths and limits.
- Intent-policy contracts, capability graph, context selection.
- Schema validation, architecture boundary enforcement.

**Components:**

- `docs/schema-*.json` (common, evidence-record, handoff, intent-policy, verification-plan, …)
- `scripts/schemaValidate.mjs`, `run-dag.mjs`, architecture generators
- `docs/verification-manifest.json`, generated inventories
- Fault-injection and repair test suites

**Actually implemented:** Full set of schemas and validators; DAG runner with BLOCKED semantics; CI two-artefact handoff; architecture checks.

**Tests:** `test:compact-ci-artifacts`, schema-validate, dag, intent-contract, capability-graph, context-select, fault-injection tests.

**Results:** Phase 1 (P106) and Phase 2 (P109) closed with Navigator acceptance recorded in AGENTS.md. CI green for those commits.

**Defects:** Hosted CI status is commit-specific; later patches can re-break.

**Open questions:** Exact production runtime of evidence collection under load.

**Confidence:** High. Artefacts: schemas, scripts, AGENTS.md status section, test files, generated JSON inventories.

---

## 4. Conversational Agent Recovery (P116)

**First observed:** Documented as accepted 2026-10-28 in AGENTS.md and roadmap of bf-118.

**Problem addressed:** Simple/Expert conversation modes producing generic or stalled answers.

**Specified behaviour:** Useful multi-turn conversation comparable to a capable general-purpose chat; truthful failure signalling.

**Components:** conversationMode.ts, cascade foundations, prompt adjustments, residual Node LTS version reporting.

**Actually implemented:** Recovered conversation path with 80 % live PASS; residual B3 (Node LTS number) left open.

**Tests / checks:** Live scenarios; related unit tests later stabilised under P117.3.

**Results:** Navigator acceptance recorded; residual documented.

**Defects:** B3 remains; full isolation of Conversational from Expert shared orchestration deferred to P119.

**Open questions:** Exact live transcript set used for the 80 % figure not present in the archive.

**Confidence:** High for acceptance decision; medium for quantitative live metrics. Artefacts: AGENTS.md, AI-USER-VALUE-REPORT.md references, roadmap.

---

## 5. Expert Foundations and Cascade (P117.x)

**First observed:** P117 line closed for conversation recovery (P117.3) in bf-118 documentation.

**Problem addressed:** Need for progressive multi-step reasoning distinct from pure conversation; model availability and cascade.

**Specified behaviour:** Expert owns its cascade, tools, state machine and output contract; probes for optional models; opt-in external providers.

**Components:** modelAvailability, modelHealth, cascade ordering (gemini-3.5-flash-lite → gemini-3.1-flash-lite primary), probe logic, conversation recovery tests.

**Actually implemented:** Cascade foundations and availability probes; full Expert E2E left open.

**Tests:** `tests/model-availability-p117.test.mjs`, `tests/p117-3-conversation.test.mjs`, model cascade tests.

**Results:** P117.3 closed; conversation recovery stable.

**Defects:** Full Expert end-to-end scenarios still open under later slices.

**Open questions:** Live quality of Expert progressive reasoning under real user load.

**Confidence:** High for code and unit tests; medium for product-level Expert outcomes. Artefacts: test files, CHANGELOG, roadmap.

---

## 6. Complex Software Architect Agent (P118 line)

### 6.1 P118 / P118.2 — Contract and live workflow

**First observed:** bf-118 CHANGELOG and task document.

**Problem addressed:** Architect path previously failed with `invalid_spec`, zero files, single model call.

**Specified behaviour:** Completion contract; live workflow `p118-architect-live`; evidence enrichment; CSRF runner fix.

**Components:** appBuilder core, appBuilderAdapter, pipeline, live test harness.

**Actually implemented:** Contract and workflow harness; early live runs still HONEST_NON_PASS on old engine.

**Tests:** `tests/p118-architect-live.test.mjs`, architect-outcome tests.

**Results:** Live runs #1 BLOCKED (CSRF, fixed); later runs HONEST_NON_PASS with diagnostics.

**Defects:** Old engine still in some deployed commits; ZIP stage never reached live.

**Open questions:** Exact model responses of the earliest failing runs.

**Confidence:** High. Artefacts: CHANGELOG entries, task document, test files.

### 6.2 P118.3 — Spec bounded repair

**First observed:** CHANGELOG P118.3 on bf-118.

**Problem addressed:** Planner returned parseable JSON that failed Spec validation; recovery ran only on unparseable input.

**Specified behaviour:** Explicit schemaVersion, lenient parse, validateSpec with issue list, one recovery call carrying previous issues, concrete failureReason / error.detail, diagnostic events with previews.

**Components:** `appBuilder/core-engine.ts`, adapter logging, new test `tests/app-builder-spec-repair-p118.test.mjs`.

**Actually implemented:** As specified; APP_VERSION remains 118.

**Tests:** Spec-repair suite.

**Results:** Local tests green; commit `1a98a6a` red in hosted CI (version + type errors).

**Defects:** CI red (repaired in next sub-patch).

**Confidence:** High. Artefacts: CHANGELOG, test file, engine source.

### 6.3 P118.3.1 — CI repair

**Problem addressed:** Red CI on version-consistency, typecheck, build, compact-ci-artifacts.

**Specified / implemented:** Restore version to 118; fix TypeScript narrowing under `strict:false` by reading failure fields via `'error' in x` / `'issues' in x`. No Spec-repair behaviour change.

**Results:** Local DAG 23 PASS / 3 BLOCKED (DB). Hosted CI of the repair itself not recorded in the examined artefacts.

**Confidence:** High for local; medium for hosted. Artefacts: CHANGELOG.

### 6.4 P118.3.2 — Single version source + documentation audit

**Problem addressed:** Multiple version sources; documentation sprawl.

**Specified / implemented:** `package.json` sole source (`version` + `patch`); Vite plugin injects into client; check-version and patch-tools updated; AGENTS.md, operating rules, task, roadmap, report, environment context audited and consolidated.

**Results:** Local verification green; no product behaviour change.

**Confidence:** High. Artefacts: package.json, CHANGELOG, AGENTS.md, docs/*.

### 6.5 P118.3.3 — Code-stage file marker repair (current tip of archive)

**First observed:** Top of CHANGELOG.md and NEXT_PATCH.md in bf-118.

**Problem addressed:** Live run on `9ff44ac` passed Spec and Plan; unit `index.html` failed because the model emitted `<<<FILE path>>>index.html` (copied placeholder). Parser treated `path` as the filename.

**Specified behaviour:**

- Prompt names the real header; PROMPT_VERSION → `static_site.v2` (cache invalidation).
- Parser deterministically accepts three known slips for the expected path and records them in `coerced`.
- One bounded repair call per file (budget counted; skipped on cancel or exhausted budget).
- New events `unit_attempt` / `unit_repair`.
- Precise failure reason.
- Adapter no longer drops `unitId` from log details.

**Components:** `appBuilder/core-prompts.ts`, `core-markers.ts`, `core-engine.ts`, `server/appBuilderAdapter.ts`, new test suite (7 tests, mutation-checked).

**Actually implemented:** As described in CHANGELOG.

**Tests:** `tests/app-builder-unit-repair-p118.test.mjs`; `test:app-builder` updated.

**Results:** Local tests written and (per CHANGELOG) mutation-checked. Live evaluation of the repair, remaining units, validators and ZIP packing **NOT_RUN / NOT_EVALUATED**.

**Defects remaining:** ZIP packing and full live SUCCESS never observed in the archive; hosted CI of 118.3.3 itself not recorded here.

**Open questions:** Whether the three coercion rules cover all future model slips; whether one repair call is sufficient under real model variance; production ZIP integrity under load.

**Confidence:** High for the implemented repair and unit tests; low for end-to-end live Architect SUCCESS. Artefacts: CHANGELOG P118.3.3, NEXT_PATCH.md, core-*.ts sources, test file.

---

## 7. Cross-Cutting Observations

### 7.1 Source code vs CI vs live

- Many patches show green local DAG while hosted CI or live workflows lag or remain NOT_RUN.
- Evidence rule in AGENTS.md is strict: green CI of an earlier commit does not speak for a later one; NOT_RUN is never PASS.

### 7.2 Documentation discipline

- Transition from many competing SPECs/REPORTs (ARCHIVE/) to single rolling files (task, roadmap, report, operating rules) is complete in bf-118.
- Charter (AGENTS.md) is treated as immutable except by explicit Navigator instruction.

### 7.3 Three-agent target

- Contract fully specified in AI-USER-VALUE-SPEC.md.
- Implementation reaches Conversational (accepted), Expert foundations, Architect pipeline with repair but without confirmed live ZIP SUCCESS.
- UI still transitional (four modes) until P119.
- P119.0.3 (OBSERVED in source): Conversational and Expert planning and prompt entry moved to `server/conversationalAgent.ts` / `server/expertAgent.ts` selected by `server/agentRouting.ts`; route, wire key and prompt pack text remain shared; user copy uses the three approved names.
- P119.0.1–0.2 (post-archive tip, OBSERVED in source): UI names are Conversational / Expert / Architect. Architect is a separate route family, client surface and engine; Conversational and Expert still share `POST /api/conversation` and one prompt builder selected by `productMode`. Boundaries are documented in TECHNICAL_SPECIFICATION §6.4 and locked by `tests/p119-agent-boundaries.test.mjs`. Local and CI results for these tests are recorded in `docs/AI-USER-VALUE-REPORT.md`.

### 7.4 Security and Tier 3

- Production deployment, secrets, GitHub write remain Navigator-gated.
- No evidence of Tier 3 actions being performed autonomously in the examined history.

---

## 8. Summary of Confidence by Programme Phase

| Phase              | Code presence | Local tests | Hosted CI | Live product outcome | Overall confidence |
|--------------------|---------------|-------------|-----------|----------------------|--------------------|
| Foundations P106–P109 | High         | High        | High (at closure) | N/A                 | High              |
| P116 Conversational | High         | High        | Medium    | High (accepted)     | High              |
| P117 Expert        | High         | High        | Medium    | Medium (foundations)| Medium-High       |
| P118 Architect     | High         | High (unit) | Partial   | Low (no verified ZIP)| Medium            |
| P119–P121          | N/A (plan)   | N/A         | N/A       | N/A                 | N/A               |

---

## 9. Remaining Open Items at Archive Tip (P118.3.3)

1. Hosted CI green confirmation for the 118.3.3 commit.
2. Deploy + `/health` commit match.
3. Single live `p118-architect-live` dispatch after the marker repair.
4. Recording of the live result (stage reached, diagnostics, presence/absence of ZIP).
5. Navigator decision on P118 exit gate.
6. Residual B3 (Node LTS) still open.
7. P92 production diagnostics verification still frozen.

This report is reconstructed solely from artefacts present in the analysed archive. Claims of live SUCCESS beyond the documented acceptance of P116 are not supported by the available evidence.
