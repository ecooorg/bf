# BiForge 124.32 — Diagnostic Report: red workflow and response latency

- Commit analysed: `1e1cd23` (patch 124.32), Render deploy 2026-11-03 15:40 UTC
- Inputs: source archive (`bf-main`, incl. `AGENTS.md`), `ci-diagnostics`, `carousel-*` artifacts, in-app `biforge-diagnostics`, Render deploy log
- Read: `AGENTS.md` §0–§2 (hard gates, product principle, SSOT map), plus the failing test, Render probe, `webSearch.ts`, `modelRateLimit.ts`, `keepAlive.ts`
- Evidence labels follow AGENTS G5: **OBSERVED** (in logs/code), **INFERRED** (reasoned, not proven), **NOT_RUN** (not verifiable from the archive)

## 1. Executive summary

1. **Core CI is green (1742/1742, 29 DAG checks). The red workflow is "Model Carousel — Routing, Health and Live Smoke"** (run 41672787334). It is red for two independent reasons: a test-vs-probe text mismatch (code defect) and a Render config mismatch (model order). Neither is a product regression.
2. **Latency is caused by a serial pipeline with stacked timeouts, not by a single slow component.** A normal "web" answer costs 9–26 s; a cold or degraded path costs 29–35+ s and often ends in a fallback or an error. The biggest contributors: search-planner 8 s timeout, Serper 4–8 s, `gemini-3.1-flash-lite` being slow and ordered first for light stages, 12 s per-call timeouts retried across two models before Groq, and a 4.7 s model-start spacing gate.
3. Green CI is not evidence of user value (AGENTS G5); the live logs show users repeatedly hitting 503/500 and fallbacks on 2026-11-01…03.

## 2. Why the workflow is red

### 2.1 Defect A — `unit-workflow` fails (OBSERVED)
- Test: `tests/p123-carousel-workflow.test.mjs:257` "keeps the Render probe and written Production baseline aligned".
- It requires the **literal string** `WEB_SEARCH_MAX_QUERIES` in `scripts/carousel-render-probe.mjs`. The probe checks the same setting under the runtime key `search.maxQueries`, so the literal never appears. (`WORKER_POLL_MS` passes only because it happens to appear inside an advisory message.)
- The docs (`docs/RENDER_ENV_CONTRACT.md`) do contain the literal; `carousel-ops-probe.mjs` too.
- Effect: `02-deterministic-verification` = FAIL → `summary.json` = FAIL → job red.
- **Fix (pick one):** (a) change the test to assert the probe's real keys (`search.maxQueries`, `workerPollMs`); or (b) add a mapping table in the probe (`{ env: 'WEB_SEARCH_MAX_QUERIES', key: 'search.maxQueries' }`) and drive `expect()` from it, so doc, probe and test share one source. Option (b) is more robust.
- Why Core CI missed it (INFERRED): this test file is apparently not part of the Core CI DAG. Add `test:carousel` (or this file) to the DAG so the failure is caught on the same commit.

### 2.2 Defect B — Render contract probe returns `MISMATCH` and exits 1 (OBSERVED)
- `05-render-health.json`: `models.light` expected `["gemini-3.1-flash-lite","gemini-3.5-flash-lite"]`, Render has `["gemini-3.5-flash-lite","gemini-3.1-flash-lite"]`.
- The probe ends with `if (warnings.length > 0) process.exit(1)`, so any mismatch turns the workflow red.
- **The contract is wrong, not Render.** Live smoke shows `gemini-3.5-flash-lite` at 2.6–3.0 s vs `gemini-3.1-flash-lite` at 7.1 s and a 12 s transient error. Putting 3.1 first for "light" stages (the contract's order) is the slower choice. **Fix:** change `MODEL_CASCADE_LIGHT` in `RENDER_ENV_CONTRACT.md` and the probe (`expect('models.light', …)`) to `gemini-3.5-flash-lite,gemini-3.1-flash-lite`; keep Render as is.
- Design problem: the probe mixes **static config contract** (should fail CI) with **live, transient health** (cooldown, `quotaHit`, circuit open, unhealthy source). Transient state should be a warning/annotation, not exit 1; otherwise the workflow flaps red for reasons unrelated to the commit.

### 2.3 Defect C — Live smoke `ok: false` (OBSERVED)
- 3/4 samples passed; `gemini-3.1-flash-lite` sample 1 = `PROVIDER_TRANSIENT` at 12 002 ms (hit the 12 s cap).
- Groq optional provider: `configured: true`, `status: error`, **`INVALID_REQUEST` in 374 ms**. A 400-class error is not a quota/latency problem — the request shape, model id or params sent to Groq are probably wrong (INFERRED; the smoke does not log the Groq error body). In production the same Groq fallback does succeed for `openai/gpt-oss-120b` in the `understand`/`expand` stages, so the smoke probe's payload likely differs from production. Log the redacted error body and align the smoke request with `openaiCompatAdapter`.
- Gate a single flaky sample less harshly: use ≥2 samples per model and fail on "all samples failed", warn on partial.

## 3. Why responses are still slow

### 3.1 Evidence from the 2026-11-03 production log (OBSERVED)

| Request (time UTC) | planner | search | generation | total |
|---|---|---|---|---|
| Weather (16:21) | 8 104 ms, `decision_timeout` | 5 322 ms (+ page fetch) | 4 568 ms | **26.3 s** (`prepare_search` 21.7 s) |
| Election news (16:21–16:22) | 8 002 ms, `decision_timeout` | 4 225 ms | 3.1-lite timeout at 9 665 ms → `GEMINI_UNAVAILABLE` fallback | **fallback shown** |
| Elections, Expert (16:22) | 832 ms (model ok) | 4 280 ms | 4 275 ms | 9.4 s |
| Elections, Expert (16:23) | 996 ms | 8 065 ms | 6 181 ms | 15.4 s |
| Cold start `understand` (15:41) | – | – | 12 s + 12 s timeouts, then Groq | **~29 s** |
| `expand` (15:43) | – | – | 12 s + 12 s timeouts, then Groq, then shape retry fails: "Gemini models are cooling down" | **~28 s then HTTP 500** |

Boot probe at 15:41:34: both Gemini models marked `unavailable` / `timeout` right after deploy.

### 3.2 Root causes, ordered by impact

1. **Search planner burns its full 8 s budget when Gemini is slow (OBSERVED).** `buildSearchDecision` (`server/webSearch.ts`) defaults to `timeoutMs = 8000`, then falls back to the heuristic. The user pays 8 s for a decision the heuristic (or a regex for weather/news/prices) could make in 0 ms. Weather and news were `search: true` anyway. When the planner works it takes ~0.8–1.0 s, so 8 s is a pathological tail, but it happens in 2 of 4 web requests in this window.
2. **Planner → search → generation run strictly in series (OBSERVED).** `prepare_search` is 5–22 s before the main model call even starts. Serper alone is 4–8 s per request (it includes page fetches, `WEB_SEARCH_FETCH_PAGES=true`). Total = sum of all stages.
3. **Slow model is first in the light cascade and per-call timeout is generous (OBSERVED).** `gemini-3.1-flash-lite` is 7–12 s in live smoke and times out repeatedly in production; it is the second/fallback choice for strong and the first in the written contract. Each failed attempt costs the full 12 s, and two attempts + Groq = 29–35 s before any answer (`understand`, `expand`).
4. **Failed models are retried instead of skipped (OBSERVED).** At boot the probe already knew both models were `unavailable`, yet the first user request still started a 12 s call on each. Health state (`modelHealth`, cooldown) is not consulted to short-circuit straight to Groq, or the probe result is too weak (a single timeout marks a model unavailable, but the call path ignores it).
5. **Model-start spacing gate of 4 700 ms per Flash-Lite start (OBSERVED, `modelRateLimit.ts:29`, probe advisory).** Planner, main call and verifier/lite synthesis compete for the same gate; any two Gemini calls in a request can queue 4.7 s. In App Builder the log shows `model_rate_wait` of 2–3.5 s per planner/coder call.
6. **Quality retry and verifier add work on top (OBSERVED).** `DEBUG_quality_retry` is evaluated every request; retry is skipped by latency policy, but the code path and verifier still run (`verifier: 1–3 ms` is cheap). Low impact, but keep an eye on `retryMaxElapsedMs=12000`.
7. **Upstream provider instability (OBSERVED).** 503 "high demand" and 429 "quota exceeded" on 2026-11-01…02, including the earlier **direct Gemini mode** which has no fallback (`gemini_direct_passthrough_failed` → HTTP 503 ×6 on 11-02). The current probe says `directGeminiMode=false` was matched; confirm it stays off.
8. **Render free-tier cold starts (INFERRED).** The service uses a keep-alive that simulates human traffic (11–14 min). Despite that, the 15:41 deploy shows a ~22 s gap between "Deploying" and "Running" plus first-request timeouts. Keep-alive does not help immediately after a deploy.

### 3.3 Prompt size note (OBSERVED)
Conversation prompts are 17–20 k chars (~4.3–4.9 k input tokens) with 6 sources; output 280–635 tokens → 4.3–6.2 s on 3.5-lite. Reasonable, but each extra source/page-digest adds latency linearly.

## 4. Other errors and smells found

| # | Severity | Finding | Evidence |
|---|---|---|---|
| E1 | Medium | `MaxListenersExceededWarning: 11 abort listeners added to [AbortSignal]` recurs ~every few hours. A shared deadline `AbortSignal` collects listeners from `geminiAdapter`, `openaiCompatAdapter`, `modelRateLimit`; `{ once: true }` does not remove them when a call finishes successfully. Likely a listener leak (INFERRED); remove listeners in `finally`. | `server-console` / detail log, 8 occurrences |
| E2 | Medium | `/api/expand` returns 500/503 when Gemini is cooling down; the Groq fallback succeeded but the shape-validation retry (`Missing required kind: GET_FACT_FIRST`) then failed on the cooled-down Gemini only. The retry should also be allowed to use the external fallback, and the user should get a degraded-but-valid result, not 500. | 15:44:12, 15:38, 15:42 |
| E3 | Medium | `llm_external_fallback_number_validation_softened`: Groq output was accepted despite rejected numeric tokens (`2,2,2,10`, `15`). Verify this cannot let ungrounded numbers into the answer (AGENTS: no unverified claims). | 15:42:14, 15:44:12 |
| E4 | Medium | `conversation_fallback` with `errorName: SyntaxError`, `AI_ERROR` (weather in Chur, 11-02 12:59): model JSON parse failure produced the "model unavailable" message. Parse failures should repair/retry or fall back to plain text, not masquerade as unavailability. | 2026-11-02T12:59 |
| E5 | Low | Gemini direct passthrough returned "I have no access to current weather / cannot search" (11-02 14:35) — a correct-looking but useless answer when search was not invoked (`searchInvoked:false`). Intent routing for weather must force the connector/search path before generation. | `gemini_direct_passthrough` |
| E6 | Low | Vite warns `NODE_ENV=production is not supported in the .env file`; `.env` is injected at runtime by dotenvx (57 vars). Remove `NODE_ENV` from `.env`, set it in Render. | deploy log |
| E7 | Low | `INEFFECTIVE_DYNAMIC_IMPORT` for `jszip`; `pdfjs` chunk 1.6 MB, main chunk 611 kB. Hurts first load on mobile (the diagnostics show a 601×795 viewport). | deploy log |
| E8 | Low | `npm audit`: 3 vulnerabilities (1 moderate, 2 high) at deploy. | deploy log |
| E9 | Low | `[KeepAlive] запущен…` — Russian text in a server log string. AGENTS requires English-only repo artifacts (user-language output is a separate contract). | deploy log / `server/keepAlive.ts` |
| E10 | Low | `recent-operations`: last build `BUILD_FINISHED … WARN` with no error text; App Builder logged `dom_wiring_repair` in 7 of 8 builds (OBSERVED counts). Repeated repair suggests the generator frequently emits broken DOM wiring; investigate the root prompt/scaffold. | event counters |
| E11 | Low | Log noise: `DEBUG_quality_retry` and a full `modelPrompt` are written at info level into `conversation_response_pipeline` records (prompt text in diagnostics conflicts with the README claim "no prompts exported"). Confirm redaction. | detail log |

## 5. Recommendations (ordered by value / effort)

### P0 — turn the workflow green (small, safe, one patch)
1. Fix the test/probe literal mismatch (§2.1) using a shared env→runtime-key table.
2. Fix the contract/probe `models.light` order to `gemini-3.5-flash-lite,gemini-3.1-flash-lite` (§2.2); update `RENDER_ENV_CONTRACT.md` accordingly.
3. Split the probe: config-contract mismatches → exit 1; live health (cooldown, quotaHit, circuit, source health) → warning annotations, exit 0.
4. Live smoke: pass if ≥1 sample per model succeeds; capture and log redacted Groq error body; align smoke request with production adapter.
5. Add the carousel workflow test to the Core CI DAG (G3: automate in CI).
6. Per AGENTS G1/G5: ship only changed files in the patch ZIP, list `unzip -l` in chat, mark the Navigator steps `FOR_NAVIGATOR` (green Actions run is the pass criterion).

### P1 — cut latency (largest user-visible gain)
1. **Planner:** lower the planner timeout to ~2.5–3 s (it normally answers in ~1 s) and add a deterministic pre-classifier for obvious live-data intents (weather, news, prices, scores, "now/today/current") that skips the planner entirely. Expected saving: up to 8 s on the worst path.
2. **Parallelise:** start the search as soon as the heuristic says `search=true`; run the planner only to refine the query in parallel, or run Serper and the Gemini Search grounding concurrently and take the first good one.
3. **Stage budgets:** give search ≤ 6 s total (Serper snippets first; fetch pages only when snippets are insufficient or in Research mode) and do not let search starve the generation deadline (`remainingDeadlineMs` was 8.3 s and 9.7 s after search → the 3.1 call got a 9.7 s cap and timed out).
4. **Use model health to skip:** if a model is `unavailable`/in cooldown, do not start a 12 s call on it; go straight to the next healthy model or Groq. Make a single timeout in the boot probe insufficient to mark a model unavailable for user traffic, or re-probe on the first user request in the background.
5. **Cascade order and timeouts:** keep 3.5-flash-lite first for all stages; give the second attempt a shorter timeout (e.g. 6–8 s) or race the external fallback after the first timeout instead of after the second (hedged request). Target worst-case ≤ 15 s instead of 29–35 s.
6. **Spacing gate:** 4 700 ms per start is a quota guard that costs user time. With 10 key slots (`poolSlotsConfigured: 10`) enforce spacing per key/project rather than globally, or reduce it for interactive stages and keep it for background App Builder work. Verify separate-project quotas first (as the doc warns).
7. **Stream** the answer (or at least send an immediate "searching…" progress event) so perceived latency drops even when total time stays ~10 s.
8. **Cache** weather/news search results for 2–5 min keyed by (place, topic); weather connector results for the same place are very cacheable.
9. **Cold start:** use a paid/always-on Render instance, or run a post-deploy warm-up (health + one tiny model call) before traffic; ensure keep-alive resumes immediately after boot.

### P2 — robustness
1. Fix the abort-listener leak (E1) with `try/finally` removal or a single combined signal per request.
2. Let shape-retry and parse-retry use the external fallback; never return HTTP 500 where a degraded answer is possible (E2, E4).
3. Tighten Groq numeric validation or mark softened answers visibly as "unverified" (E3).
4. Force search/connector for live-data intents before generation (E5).
5. Reduce frontend payload (code-split `pdfjs`, fix `jszip` import) and clean `.env` (E6–E8).
6. Keep an eye on App Builder DOM-wiring repairs (E10) — fix at the template level.

## 6. Verification plan (automatable, per AGENTS G3)
- Unit: probe/doc/test share one env→key table; probe exit code stays 0 for transient-health-only warnings.
- Unit: planner timeout and pre-classifier (weather/news → no planner call); model-health short-circuit; hedged fallback timing with the fake provider.
- Carousel workflow after patch: expect `unit-workflow` 12/12, probe `MATCH`, live smoke ≥ 1 OK per model.
- Latency budget check in CI with the fake provider: web answer p95 ≤ 12 s, worst case ≤ 15 s; log `conversation_timing` fields (`prepare_search`, `main_call`, `totalMs`) already exist — assert on them.
- Production check (NOT_RUN here): after deploy compare `conversation_timing.totalMs` p50/p95 over ≥ 30 requests; I could not measure this from the archive.

## 7. Limits of this analysis
- Source and logs were read, nothing was executed (NOT_RUN: build, tests, live calls). Remote HEAD and Render state are inferred from the artifacts only (AGENTS G5).
- Groq `INVALID_REQUEST` cause and the listener leak location are INFERRED, not proven.
- Latency figures come from ~14 planner samples and a handful of full requests in a bounded ring buffer; treat them as indicative.
