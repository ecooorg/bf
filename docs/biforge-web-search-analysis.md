# BiForge — Analysis of the "Web Search Does Not Return Current Data" Defect

> **Status of this document: auxiliary working material for cycle C124. It is NOT a governing document.**
> It is an English translation of the original analytical report, kept for traceability of the P124.22 audit. Some of its positions have since been changed or improved and are recorded in higher-level documents. Where this file disagrees with them, the higher-level documents win (`AGENTS.md` §2):
> - `docs/WEB_SEARCH_REMEDIATION.md` — audit register, owner decisions, work programme, and acceptance criteria for this defect;
> - `docs/DECISIONS.md` (D-2026-11-03-01 and successors) — active decisions;
> - `TECHNICAL_SPECIFICATION.md`, `ROADMAP.md`, `TECHNICAL_REPORT.md` — normative requirements, plan, and factual status.
>
> Nothing below is a requirement, a next-session assignment, or an authorization to change code, security posture, billing, or production state. Code sketches are illustrative only and were never run against live services. Original Russian user messages, log excerpts, and regular-expression phrase lists are translated into English throughout; the product's user-language support is unchanged.

**Analysis date:** 2026-11-03
**Version:** BiForge v124, patch 124.21 (archive `bf-124-21-green.zip`)
**Document type:** analytical report with recommendations. The repository code was not changed and no patch ZIP is delivered.

---

## 0. Summary

**Search is neither disabled nor blocked.** Serper answers HTTP 200, pages download, a digest is built, and it reaches the model prompt (`web_search: used`). The defect lies elsewhere: **at every link of the chain "decide to search → build a query → get results → assemble a digest → answer", useful information is lost or corrupted**, and when search is not triggered at all, the user is told "I have no access to the internet". That is untrue about the system.

In the screenshot case the model answered **honestly and correctly**: the digest it received contained no weather data for Zurich (Switzerland). It had a MeteoSwiss home page without data, a forecast for **Lake Zurich, Illinois**, and a list of links about Savannah (Georgia) and Zurich, Montana. The problem is in the data, not in the wording of the prompts.

### Key figures

| Metric | Value | Source |
|---|---|---|
| Weather queries whose answer contained a concrete temperature | **3 of 21** (≈14%) | log, `conversation_response_pipeline` |
| Of those, temperature first given in °F (because of `gl=us`) | 2 of 3 | log |
| Pipeline responses: search `used` / `skipped` / `failed` | 8 / 10 / 9 (27 total) | log |
| "Fresh-data" questions that trigger search | **9 of 26** (35%) | reproduced on real code |
| Sub-query content that reached the model in the screenshot case | Q1 — 100%, Q2 — ≈50%, **Q3 and Q4 — 0%** | reproduced |
| Gemini keys that simultaneously returned `429 RESOURCE_EXHAUSTED` | **10 of 10** | log 2026-11-02 15:57–16:24Z |
| Responses that failed because of a `SyntaxError` in the number validator | at least 2 (11:39Z and 12:59Z) | log |

### Answers to your hypotheses

| Hypothesis | Verdict |
|---|---|
| The problem is in server settings | **No, not the root cause.** `ENABLE_WEB_SEARCH=true`, a Serper key is present, and outbound network works. There are side settings worth checking (section 6). |
| Rigid instructions in the prompts | **Not the root cause.** But the absence of a search status in the prompt makes the model invent "I have no internet" (P-1). |
| Google key rotation | **Does not and cannot help** search quality. It works only in direct mode, while production uses the pipeline, which has no rotation. In addition, all 10 keys hit the shared quota at the same time (K-1…K-5). |
| External search providers | In practice there is **one** provider (Serper). "Provider" is a static switch, not a fallback chain. If Serper returns junk, there is nowhere to switch. |

---

## 1. What Was Analysed, and Limits

**Materials from the archive:**
- `Screenshot.jpg` — a dialogue about the weather in Zurich (2 turns).
- `biforge-deploy-9db8a51-2026-11-02-1956.log.txt` — Render deploy log.
- `biforge-diagnostics.zip` — application diagnostics export: `application-detail.jsonl` (896 records, 2026-11-01 15:03Z — 2026-11-03 05:40Z), `server-console.log`, `assistant-context.json`, and others.
- `bf-124-21-green.zip` — sources, `AGENTS.md`, specification, roadmap, changelog, technical report, docs.
- `Diagnostic log.docx` — Project Mode diagnostics; unrelated to search and not used in the analysis.

**Evidence labels** (following principle G5 of `AGENTS.md`):
- `OBSERVED-LOG` — visible in logs.
- `OBSERVED-SRC` — visible in the sources.
- `REPRODUCED` — run by me on real functions from the sources (`node --experimental-strip-types`) with inputs from logs or synthetic data.
- `INFERRED` — conclusion from indirect data.
- `NOT_RUN` — not checked.

**Limits:**
1. My environment has no outbound network: live calls to Serper, Jina, Gemini, and Open-Meteo are **NOT_RUN**.
2. The version in the diagnostics (commit `7ad970d`, run 2026-11-03 05:29Z) differs from the commit in the attached deploy log (`9db8a51`, 2026-11-02 18:57Z). It is **not proven** that the sources in the archive exactly match the deployed code (NOT_VERIFIED). However, behaviour in the 05:37Z logs is consistent with the 124.21 code.
3. Informational (`info`) console lines are not stored in the database (O-1). Therefore there are no `web_search` statuses or refusal reasons (`reason`) for 2 November. Some conclusions about the period 15:57–17:06Z are `INFERRED`.
4. I cannot see environment variable values. The diagnostics show only boolean flags. The rest is inferred from behaviour.

---

## 2. How Search Works (Map)

```
User message
  │
  ├─ detectUserIntentFlags()        regexes: "find", "on the internet", "google"…  → userAskedSearch
  ├─ needsFreshWebInfo()            ~10 regular expressions (RU/EN)                → "fresh information needed"
  ▼
shouldSearchWeb()   (refuses on distress / CRISIS / DOCUMENT / attachments)
  │
  ▼
contextualizeSearchText()           only for 3–4 hard-coded follow-up types
  ▼
toEnglishSearchQuery()              1 Gemini call (flash-lite, ONE key) turns the WHOLE message into a query
  ▼
expandSearchQueries()               for weather: base + 3 suffixes → 4 queries
  ▼
fetchSerperDigestMulti()            Serper google.serper.dev, hl=en, gl=us (hard-coded)
  │   per query:  up to 2 pages → Jina Reader (r.jina.ai) → fallback direct fetch
  │   per query:  digest = page texts  (snippets are discarded if there is at least one page)
  ▼
mergeWebSearchResults()             concatenation and truncation to 5000 characters
  ▼
formatSearchBlock()                 "WEB SEARCH RESULTS…" block at the end of the prompt
  ▼
generate()  (Gemini flash-lite, one key) → JSON → Groq verifier (+≈1.9 s) → answer
```

**Two response modes** (flag `BIFORGE_GEMINI_DIRECT_MODE`):

| Mode | What it does | Key rotation | Search fallback |
|---|---|---|---|
| **direct** (P124.17–124.21) | One direct Gemini call, answer "as is" | yes, up to 3 keys | Serper → Gemini googleSearch |
| **pipeline** (legacy) | JSON schema, retries, verifier, sanitizer | **no** (one `GEMINI_API_KEY`) | **none**: Serper only |

In the 2 November logs, direct mode ran 14:35–16:24Z; from 16:34Z and throughout 3 November it was the pipeline (the events `conversation_response_pipeline`, `epistemic_verifier`, and `DEBUG_quality_retry` exist only there). `INFERRED` (high confidence): the server environment has `BIFORGE_GEMINI_DIRECT_MODE=false`.

> **Important consequence.** Patches 124.19–124.21 ("Google Search in direct", "key rotation", "Serper → Gemini fallback", "follow-up") fix the **direct path**. If production runs on the pipeline, these improvements **have no effect**.

---

## 3. Timeline, 1–3 November (all times UTC)

| Time | Event | What is visible |
|---|---|---|
| 2 Nov 11:39–11:39 | Response failed: `SyntaxError: /(?<![\p{L}_])[-+]?+6%/u: Nothing to repeat` | V-1 |
| 12:20–12:21 | Weather in Zurich: search `used`, Swiss sources (MeteoSwiss, BBC, AccuWeather) | answer "44 °F (≈7 °C)" — unit comes from `gl=us` |
| 12:57 | Weather in Chur: `used` | "+8 °C" — **success** |
| 12:58 | "and in Tschiertschen?" — search `skipped` | answer "from general knowledge" without data (T-1) |
| 12:59 | "find the exact weather for the village centre, 1300 m" — `used`, but sources are **Chesterfield VA, Crater Lake** | topic lost (T-2) |
| 12:59:37–41 | Next turn: `SyntaxError`, both models + Groq rejected → `AI_ERROR` | V-1 |
| 14:35–14:36, 14:55 | **Direct mode**: 7 answers "I have no access to the internet" (`searchInvoked:false`) | search intentionally disabled (P124.17) |
| 14:37–14:40 | Pipeline: search `skipped` with `search_expected:true`; the model convinces the user that search is not connected | `skipped` reason not logged |
| 15:57–16:24 | Direct: 6 × HTTP 503. **All 10 keys (slots 0–9) returned 429** `RESOURCE_EXHAUSTED` | K-1 |
| 15:57–17:06 | Pipeline: 9 responses, search `failed`, answer "I have no internet connection" | reason not logged; see K-1, O-1 |
| 17:44–17:45 | `GEMINI_UNAVAILABLE`: 503 "high demand" → model cooldown | K-4 |
| 18:38 | Search `used`, Swiss sources, but MeteoSwiss pages are a "site skeleton without figures" | R-5 |
| 18:38:21 | Follow-up "I absolutely need the temperature" — `skipped` | T-2 |
| 19:12 | `used`: "47 °F ≈ 8 °C" — **success** | °F units (R-4) |
| 19:12:54 | "how much does diesel fuel cost in California" — `skipped`; the model said "$5–6/gallon" **from memory** | T-1: numbers without a source for a "live" question |
| 19:55–19:56 | Gemini overloaded → answer given by `groq/openai/gpt-oss-120b` without search; the next request hits cooldown | K-4 |
| **3 Nov 05:37** | **Screenshot case, turn 1**: `used`, junk results | section 4 |
| **05:38** | **Screenshot case, turn 2**: query "Perform internet search" | section 4 |

In addition: the logs contain **138 `process_boot` records** over ~37 hours (a restart on average every ≈16 minutes). The cause is not established (a deploy for every patch, free-tier spin-down on Render, etc.). Consequence: all in-memory state (model/key cooldowns, rate-limit slots, the `DAILY_CALL_CAP` counter) is regularly reset.

---

## 4. Analysis of the Screenshot Case

### Turn 1. "What is the weather in Zurich right now? Find exact data on the internet. Compare information from various weather sites. Additionally, make a forecast for the week."

`OBSERVED-LOG` + `REPRODUCED`:

1. The trigger fired (`intent_flag search_expected:true`).
2. The LLM translation turned **the whole message** into a query:
   `Current weather forecast Zurich hourly weekly comparison weather sites`
   The words *comparison*, *weather sites*, *hourly weekly* are instructions to the assistant, not search terms. **There is no country.**
3. `expandSearchQueries` made 4 queries out of it (checked on the real function):
   ```
   1. Current weather forecast Zurich hourly weekly comparison weather sites
   2. … comparison weather sites current observations temperature conditions observation time
   3. … comparison weather sites current temperature degrees Celsius weather station
   4. … comparison weather sites temperature now AccuWeather Weather.com
   ```
   This is one noisy query with three suffixes: 4 Serper credits for nearly identical results.
4. Serper with `hl=en, gl=us` returned a mixture: **Savannah (GA)**, **Zurich, Montana**, **Lake Zurich IL**, a Zurich→Savannah time converter, MeteoSwiss (home page), AccuWeather "Switzerland" (generic page).
5. MeteoSwiss (home page) and **weather.gov Lake Zurich IL** were selected for download (both are on the "preferred hosts" list).
6. MeteoSwiss is a single-page JS application. Jina returned only "Quick links (Access keys)…" (~600 characters) with the warning *"shadow DOM currently hidden"*. The second copy of the same page (direct fetch) was navigation text without figures.
7. The digest was truncated to 5000 characters: **MeteoSwiss + Lake Zurich IL + the start of the second MeteoSwiss copy fit.** Sub-queries 3 and 4 — 0%, Serper snippets — 0% (discarded because pages were downloaded).
8. The model received data about Illinois and an empty home page, and honestly wrote: "the results contain no data for Zurich, Switzerland".
9. The Groq verifier returned `INVALID_OUTPUT`, spending 1.9 s of 9.5 s.

### Turn 2. "I am asking you to run an internet search."

1. `contextualizeSearchText()` did not recognise this as a follow-up (reproduced: it returns the phrase as is).
2. The LLM translation produced the query **`Perform internet search`**.
3. Serper returned Wikipedia "Search engine", Fullcast, HowStuffWorks. `status:'used'`, `sources:6` — a **false success**.
4. The model answered: "the search results contain general technical articles". Correct again, but useless.

**Outcome:** the user twice received "search happened, no data". Nowhere in the system is there a check of "is the result relevant to the question", and therefore there is neither a retry nor a fallback source.

---

## 5. Problems Found

Severity: **P0** — directly breaks the scenario, **P1** — significantly worsens it, **P2** — should be fixed.

### A. Data retrieval quality

#### R-1 (P0). The digest is truncated so that the last sub-queries never reach the model
`mergeWebSearchResults` concatenates the sub-query digests and takes the first 5000 characters, while the digest of a single sub-query can already be up to 5000.
`REPRODUCED` (4 sub-queries of 4400 characters each): the result is Q1: 1099 occurrences, Q2: 564, **Q3: 0, Q4: 0**.
Sub-queries 2–4 are exactly the ones aimed at "current observations"/"temperature now", so the content they exist for is discarded. Serper credits and download time are wasted.
**File:** `server/webSearch.ts`, `mergeWebSearchResults`.

#### R-2 (P0). Snippets and answerBox are discarded as soon as at least one page is downloaded
`digestFromPageExtracts(pages, snippetFallback)` returns `snippetFallback` only if there are no pages at all.
`REPRODUCED`: the snippet "Zurich: 8°C, light rain" disappears after one placeholder page is added.
Google/Serper snippets for weather are often **the only place with a number**, while an SPA page contains only navigation.
**File:** `server/webSearch.ts`, `digestFromPageExtracts`, `fetchSerperDigest`.

#### R-3 (P0). The search query is formed by an LLM translation of the whole message and is not cleaned of instructions
- The user's meta-words ("compare", "from various sites", "make a forecast for the week") end up in the query.
- The country is neither added nor clarified (`Zurich` — there are Zurichs in the USA). In 124.0.2 the Zurich example and the city list were removed from the translation prompt (correct per C124), but no replacement (geocoding/clarification) appeared.
- The weather expansion glues suffixes onto an already long query. For Google this is 15–20 words — a poor query.
- If Gemini is unavailable (quota), `toEnglishSearchQuery` silently returns the **Russian** text, which `hl=en, gl=us` handles poorly.
**Files:** `server.ts` (`runConversationWebSearch`, direct path), `server/webSearch.ts` (`toEnglishSearchQuery`, `expandSearchQueries`).

#### R-4 (P0). Hard-coded locale `hl=en, gl=us`
`serperLocale()` always returns `{hl:'en', gl:'us'}` (`OBSERVED-SRC`, comment: "international results").
Consequences in the logs: sources about Savannah, Lake Zurich (Illinois), Zurich (Montana), and temperature **first in °F** for a European city (12:20 and 19:12).
For queries with a place this systematically distorts the result. The country should be derived from the query rather than fixed to the USA.

#### R-5 (P0). Page selection for download, and the downloader itself
1. `PREFERRED_HOST_RE` contains `meteoswiss`, `weather.gov`, `noaa.gov`, `wikipedia`… — **with no tie to the country of the query**. For Zurich the **weather.gov** (USA) page is downloaded first. `REPRODUCED`: `pickUrlsToFetch` → `['MeteoSwiss: Homepage', 'Lake Zurich IL']`.
2. Home pages (`/`) of JS applications contain no data but get the highest priority and push out snippets (R-2).
3. There is no URL deduplication between sub-queries: MeteoSwiss was downloaded twice (the digest has two formats — Jina and direct HTML→text).
4. Jina Reader without a key: limits and instability (the same page arrived once via Jina and another time via the fallback). For SPAs Jina needs shadow-DOM mode / a selector wait; without it, it returns a skeleton.
5. Direct fetch does not execute JavaScript; for weather SPAs this is useless.

#### R-6 (P0). No check that results are usable → "false success"
The `used` status is set as soon as a non-empty digest exists. Then:
- there is no check that the text contains **the place from the question**, a **number/date**, or the required type of data;
- there is no retry with a different query, a different provider, or a structured API;
- in `research` mode no refinement loop works: `informationSoftFail` is called only for `conversationMode === 'information'` (`OBSERVED-SRC`); there is no repeated call for `research`;
- the model is not given an assessment of result quality — it must guess on its own that the data is irrelevant.

#### R-7 (P1). The user requirement "compare sites" is architecturally unreachable
It needs several independent sources with figures. Currently the source is one Google result list, from which 2 pages per sub-query are read. Source names are hidden in the answer (the "no URLs" policy, P123.17), so even when data exists, the answer will not show **whose** figures they are.

### B. The "search or not" decision and dialogue context

#### T-1 (P0). The search trigger is a set of regular expressions with low coverage
`REPRODUCED` on 26 realistic questions: search fires on **9 of 26**. It does not fire, for example, for:
`what is happening in the world right now`, `how much does bitcoin cost now`, `bitcoin price`, `what is the franc to euro rate now`, `who won yesterday Real Madrid`, `who won the game last night`, `is the Louvre open today`, `will it rain tomorrow in Bern`, `air temperature now in Zurich`, `is Cloudflare working today`, `what happened with Binance`.
The criteria depend on word order (`what is the temperature now` — yes, `air temperature now` — no). This is exactly the class of "what is happening right now" questions the user complains about. The log shows a real consequence: "diesel fuel in California" answered without search and with numbers from memory.
`docs/C124_INSTRUCTION_INVENTORY.md` (I-15) itself calls these lists "brittle".

#### T-2 (P0). A follow-up loses the topic
`REPRODUCED` (previous turn — a question about the weather in Zurich):

| Message | What goes to search | Result |
|---|---|---|
| "I am asking you to run an internet search." | `Perform internet search` | Wikipedia about search engines |
| "please check" | the same | — |
| "And for tomorrow?" | "And for tomorrow?" | — |
| "Are you sure? Check via the internet" | the same | — |
| "and in Celsius?" | `weather in Zurich temperature in Celsius` | works (the only hard-coded case) |

In the log: "find the exact weather for the village centre, 1300 m" → search for **Chesterfield, VA / Crater Lake**.
All follow-up cases are encoded by separate regular expressions (`contextualizeSearchText`, `isSearchFollowup`), and the list cannot be made complete.

#### T-3 (P1). `recentSearchIntent` in `server.ts` does not match `isSearchFollowup`
In `server.ts`, the definition of "an explicit search request happened recently" is its own short list of 4 phrases (`find on the internet|search on the internet|search the web|look up online|google search`). The phrases "Run a search", "find exact data on the internet", "do an internet search" do not count. Two independent definitions of one concept diverge.

### C. LLM providers, keys, quotas

#### K-1 (P0). All 10 Gemini keys exhausted at once
`OBSERVED-LOG`: 2026-11-02 15:57–16:24Z, `gemini_direct_key_rotated` events for slots 0…9, `errorClass: PROVIDER_QUOTA`, text `You exceeded your current quota… RESOURCE_EXHAUSTED`. The user received 6 × HTTP 503.
Gemini API quotas are counted **per Google Cloud project, not per key**. If all 10 keys were created in one project (or in several free projects with a shared daily quota/model limit), rotation achieves nothing. `INFERRED`, high confidence: the keys share a quota.
Note: creating many projects/accounts to bypass limits may conflict with Google's terms. Check the current terms before extending the pool this way.

#### K-2 (P0). Key rotation works only in direct mode
`OBSERVED-SRC`: `geminiKeyPoolState` is used only in `generateGeminiPassThrough`. The `generate()` function (pipeline), query translation, Gemini grounding, and the verifier use a **single** `GEMINI_API_KEY`. In the pipeline, after 429/503 a model is "parked" for 30 minutes (`MODEL_COOLDOWN_QUOTA_MS = 30 * 60 * 1000`), and the application answers "Gemini models are cooling down" (17:44, 19:56Z) — even though 9 other keys exist.

#### K-3 (P1). Direct mode uses one model and at most 3 keys per request
`modelsFor('strong')[0]` — there is no switch to the second cascade model; `MAX_DIRECT_KEY_ATTEMPTS = 3`. When the first model's quota is exhausted, the request fails even though `gemini-3.1-flash-lite` is available.

#### K-4 (P1). The "strong" model is a lite one
In the logs: `lightFallback: true`, `configuredModels: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']`. The `strong` and `light` classes in production are the same lite models. For synthesis and comparison of several sources (let alone search planning) this is a weak spot; there is no escalation.

#### K-5 (P1). Search query translation degrades silently
On any error (including 429), `toEnglishSearchQuery` returns the original Russian text — with no log label and no effect on status. Simultaneously with K-1, result quality drops further.

In addition: `DAILY_CALL_CAP` defaults to 200 Gemini calls per day per process (an in-memory counter, `globalDayCount`). It applies to Gemini search as well and, when exhausted, returns `skipped: daily_cap`. A possible cause of some `skipped` results — not confirmed; the reason is not logged (O-1).

### D. Answer layer and instructions

#### P-1 (P1). The model says "I have no internet" because it was not told the search status
On `skipped`/`failed`, nothing like "search was unavailable / did not run: reason" is added to the prompt. The HONESTY block instils "do not claim you searched". Result (14:37–14:40, 16:34–17:06): *"I do not have access to the internet… I am not connected to the network"*, and the user has to argue with the model about how its architecture works. This is a **false statement about the product**, caused by the absence of data rather than by a bad prompt.

#### P-2 (P1). The instruction block for search data is overloaded with topic-specific recipes
`formatSearchBlock` contains rules about rate tables, "LTS versions", "current weather", and a ban on URLs. In `docs/C124_INSTRUCTION_INVENTORY.md` (I-16) this block is already marked "overfit", and it was decided there to rewrite it as a general "evidence/provenance" contract. In the screenshot case this alone did not interfere (there was no data), but the requirement "do not name sources" makes the request "compare sites" and user verification impossible.

#### P-3 (P2). `research` mode targets "search" but gets no result-quality check mode
See R-6. The phrase in the system prompt "Never make the lack of live search the whole answer" cannot replace code that checks the results.

#### A-1 (P1). Architectural instability within 1 day
`CHANGELOG.md`: P124.17 (direct, search **disabled intentionally**, on by default for everyone) → P124.18 (tests pinned to legacy) → P124.19 (Gemini grounding in direct) → P124.20 (key rotation) → P124.21 (Serper in direct, follow-up, validator softening) — all on 2 November. Production switched between modes, and fixes were made in a mode that was then not in use (section 2).

### E. Latent defect in the number validator (not fixed in 124.21)

#### V-1 (P0). `SyntaxError` on any answer containing "+N"
`src/numberValidator.ts`, `inputHasPercentValue`:
```ts
const n = value.replace(',', '.');
const re = new RegExp(`(?<![\\p{L}_])[-+]?${n.replace('.', '[.,]')}%`, 'u');
```
If `value` = `+8` (the sign is part of the number), the regular expression receives `[-+]?+8%` → **`SyntaxError: Nothing to repeat`**.
`REPRODUCED` on 124.21 code: `validateNumbers('Temperature +8 °C, humidity 6%', 'weather digest 6% 8')` throws. A typical weather answer ("+8 °C") is exactly like this.
Patch 124.21 "softened" the **result** of validation (`bad.length`), but the exception is thrown **earlier**, inside the `try` of `generate()`; it is treated as a model error (`llm_error`), the second model is tried, then the fallback provider, then `AI_ERROR` for the user. Real failures: 11:39Z (`+6`) and 12:59Z (`+9`).
This is the most "awkward" spot: the bug triggers exactly when search **worked** and the model wrote a temperature.

### F. Observability and process

#### E-1 (P2). The Groq verifier always returns `INVALID_OUTPUT`
Both requests on 3 November. It runs **sequentially** (`await`), adds ≈1.9 s (≈20% of total time, `verifier:1931 of totalMs:9468`) and contributes nothing. Probable cause (`INFERRED`): `gpt-oss-120b` is a reasoning model, and the `maxOutputTokens: 800` limit is consumed by reasoning; the answer is cut off (`finish_reason: length` → `INVALID_OUTPUT`). One more remark: the verifier sends the **user text and the answer** to Groq whenever `GROQ_API_KEY` is set, regardless of `ENABLE_EXTERNAL_MODEL_FALLBACK` (the documentation describes external fallback as opt-in because of data concerns).
Separately: `llm_external_fallback_failed … INVALID_REQUEST` (Groq, 1 Nov 18:25Z).

#### O-1 (P1). No persistent trace of search decisions
`console.info` is not stored in the database (`warn/error` are). Therefore for 2 November there is no `web_search status/provider/reason`, no queries, and no per-sub-query character counts. The reasons for 10 `skipped` and 9 `failed` cannot be established from the export. The `conversation_response_pipeline` event contains `searchStatus` but not `reason`.

#### O-2 (P0 for the process). The target scenario has never been checked live
- `TECHNICAL_REPORT.md`, `CHANGELOG.md`, `ROADMAP.md` in all weather patches (P123.16, P123.17, P124.0.2, P124.21) contain `NOT_RUN: live Serper/Gemini`.
- In `ROADMAP.md`, the item "Validate live Simple and Expert weather answers against timestamped MeteoSwiss observations" has been unchecked since P123.16.
- `docs/TESTING_AND_ACCEPTANCE.md`: "Live acceptance (required)" — was not performed.
- Tests (`tests/web-and-epistemics.test.mjs` and others) check pure functions and strings but not R-1, R-2, or V-1. CI does not call live search.
This contradicts the principle of `AGENTS.md` §1 ("success = a real user received a correct result") and the `BIO-002` obligation.

#### O-3 (P2). Documentation and code diverge
- `TECHNICAL_SPECIFICATION.md` (line 526): "web search opt-in". Code: search is **on by default** (`isWebSearchEnabled`).
- Comment in `server.ts`: "up to 13 organisational Gemini keys"; code and logs: maximum 10 (`MAX_ORG_KEY_SLOTS = 10`).
- The `ENABLE_WEB_SEARCH` property in `connectors.yaml` is described as optional for `gemini`, but Serper is absent from the external connections inventory.

---

## 6. Checking the Hypotheses from the Task Statement

### 6.1 "Perhaps the problem is in server settings"
What the diagnostics show (`OBSERVED`): `ENABLE_WEB_SEARCH=true`, `WEB_SEARCH_PROVIDER` not set (auto → serper), `hasSerperKey=true`, `hasGeminiKey=true`, `NODE_ENV=production`, Node 22.12. Serper returns 200, Jina and direct requests work, pages download — **the network and the Serper key are fine**.

What needs additional checking (`INFERRED/NOT_VERIFIED`, I cannot see the values):

| Parameter | Suspicion |
|---|---|
| `BIFORGE_GEMINI_DIRECT_MODE` | By behaviour = `false`. Set it explicitly and account for it in the repair (section 2). |
| `GROQ_API_KEY` | Enables the verifier (E-1) and sending text to Groq. |
| `ENABLE_EXTERNAL_MODEL_FALLBACK` | Per the 19:56Z log, `true` (Groq produced the answer). |
| `SERPER_API_KEY` | Check remaining credits and 400/403 errors in the Serper dashboard for 2 Nov 15:57–17:06Z (a possible cause of `failed`). |
| `GEMINI_API_KEY`, `GEMINI_API_KEY_1…10` | Check **how many projects** the keys were created in (K-1). |
| `DAILY_CALL_CAP` | Defaults to 200 per process (K-5). |
| `WEB_SEARCH_*` | `WEB_SEARCH_MAX_QUERIES`, `WEB_SEARCH_FETCH_PAGES`, `WEB_SEARCH_MAX_PAGES` — see section 7.2 (Wave 0). |
| `.env` file with 53 variables | In the deploy log: `injected env (53) from .env`; Vite warns that `.env` contains `NODE_ENV=production`. Make sure `.env` is not in the repository (secrets). |
| Render | Frequent restarts (138 in 37 h) — find the cause. |

### 6.2 "Perhaps the problem is in rigid instructions"
The prompt does not forbid using search results and did not interfere in turn 1: there was no data. The influence of instructions is indirect — P-1 (false "no internet") and P-2 (hiding sources). Rewriting prompts **as the main cure is not needed**: while the digest has no data, no wording will create it.

### 6.3 "Google key rotation"
It works in one of the two modes and only for generating the answer. It has nothing to do with obtaining data from the internet. For it to have an effect, the keys must come from **different projects**, and rotation must cover the pipeline, query translation, and query planning (K-1, K-2, K-5).

### 6.4 "External search providers"
`webSearchProvider()` returns `serper` or `gemini` — **one** of them, by environment variables. The fallback "Serper → Gemini googleSearch" exists only in direct mode (124.21) and only if Serper did not return `used`. If Serper returned irrelevant results with status `used`, there is no fallback path (R-6).

---

## 7. Recommendations

### 7.1 All solution paths (comparison)

| # | Path | What it solves | Pros | Cons / risks | Complexity |
|---|---|---|---|---|---|
| **A** | Fix the current Serper pipeline (R-1…R-6, T-1, T-2, V-1, P-1) | The main cause | Fastest; no new dependencies; also fixes other topics (rates, news) | Still depends on Serper/Jina quality; weather from HTML pages is fragile | M |
| **B** | **Structured-data connectors** for typical "live" questions: weather, exchange rates, crypto, time | Exact numbers and timestamps, comparison of several sources | Independent of SERP/parsing; cheap and fast; solves "compare sites" | Per-topic code (consistent with C124 as deterministic code, not a prompt); API licences | M |
| **C** | Gemini `googleSearch` as a **fallback** (and for some topics the primary) provider | Fallback when Serper returns junk | Implementation already exists (`fetchWebSearchDigest`) | Gemini quota/billing (K-1); in the pipeline a call with `tools` cannot be combined with `responseMimeType: application/json` — a two-step call is needed (text with grounding → JSON) | M |
| **D** | A second SERP provider (Brave Search API, Tavily, Exa, Perplexity Sonar API, SerpAPI, self-hosted SearXNG, etc.) in a chain with a circuit breaker | Resilience to failures/quotas of a single provider | Independence from Serper | New keys/credits/privacy; **prices and terms must be checked at implementation time** | S–M per provider |
| **E** | An LLM search planner (JSON: is search needed, 1–3 short queries, entity and country, freshness) instead of regexes; optionally a full tool-use loop | T-1, T-2, R-3, R-4 in general form | Universal, no word or city lists (in the spirit of C124) | +1 LLM call (~1–2 s), privacy protection needed (section 7.5) | M |
| **F** | Quotas and keys: billing on a single project with a budget limit; one key pool for **all** Gemini calls; search cache (10-minute TTL for weather) | K-1…K-5 | Eliminates "all keys 429"; saves credits | The billing decision belongs to the owner (AGENTS.md §8) | S–M |
| **G** | Honest UX when there is no data: an explicit status ("search returned no data for Zurich, reason…"), links to official pages, an offer to retry | P-1 | The user is not misled | Adds no data | S |
| **H** | Live acceptance test in CI and on a schedule | O-2 | Regression protection; matches G5 | Secrets in Actions; credit consumption | S–M |

**Recommended combination:** **A + G + F** (immediately), then **E + B (weather) + C**, then **H**. D — depending on observation (if Serper remains unstable).

### 7.2 Plan by waves

> Executor labels as in `AGENTS.md`: `FOR_OWNER` (owner decision: money/production), `FOR_NAVIGATOR` (GitHub web UI / Actions / hosting dashboards in a browser only, no shell), `FOR_ASSISTANT` (code and tests), `FOR_CI`.

#### Wave 0 — diagnostics and quick measures (no code)

1. `FOR_OWNER` + `FOR_NAVIGATOR`: **Serper dashboard** → remaining credits, errors for 2 Nov 15:57–17:06Z. If credits ran out, that explains `failed`.
2. `FOR_OWNER` + `FOR_NAVIGATOR`: **Google AI Studio / Cloud Console** → which projects keys 0…9 belong to; quotas of `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite`. If there is one project — enable billing on it with a spending limit (owner decision) and stop treating the "pool of 10 keys" as a reserve.
3. `FOR_NAVIGATOR`: **Render → Environment**. Explicitly set `BIFORGE_GEMINI_DIRECT_MODE=false` until Wave 1 is complete (direct disables search by design of P124.17 and contains none of the R/T fixes).
4. `FOR_NAVIGATOR`: **experiment (NOT_RUN)** — `WEB_SEARCH_FETCH_PAGES=false`. Then the digest is built from Serper snippets/answerBox and contains no SPA skeletons (partly bypasses R-2 and R-5). Expected effect: temperature figures appear more often in weather queries; downside — page texts for rates and versions are lost. Repeat the weather query 3 times and record the result in `docs/USER_VALUE_EVALUATION.md`.
5. `FOR_NAVIGATOR`: temporarily `WEB_SEARCH_MAX_QUERIES=2`, so as not to spend credits on obviously empty sub-queries (until R-1).
6. `FOR_OWNER`: decide whether the Groq verifier is needed. Until E-1 is fixed it only slows answers and forwards texts to a third party.

#### Wave 1 — patch "Search retrieval integrity" (`FOR_ASSISTANT`, P0)

| # | What to do | Closes |
|---|---|---|
| 1.1 | Fix `inputHasPercentValue` (code below) **and** wrap `validateNumbers` in `try/catch` (the validator is diagnostic; it must not be able to crash an answer) | V-1 |
| 1.2 | `mergeWebSearchResults`: **equal shares** per sub-query + global URL deduplication (code below) | R-1 |
| 1.3 | `fetchSerperDigest`: snippets/answerBox/knowledgeGraph **always** at the start of the digest, pages as a supplement (code below) | R-2 |
| 1.4 | `pickUrlsToFetch`: remove home pages (`/`) and pages of a foreign country; do not use `weather.gov`/`noaa.gov` as globally "preferred"; URL deduplication **across** sub-queries | R-5 |
| 1.5 | Query: do not pass instructions ("find", "compare", "forecast for the week") to search; one short query plus, if needed, one refining query with a **country/region**; do not fix `gl/hl` and units to US | R-3, R-4 |
| 1.6 | Track the country: if a place is ambiguous (`Zurich`), determine a candidate with a geocoder (section 7.3) and add the country; if still equally ambiguous — ask the user one question instead of picking a variant | R-3 |
| 1.7 | **Usability check**: after the digest is assembled — a deterministic check (the place token from the query is present; there is a number with a unit/date; no obviously foreign place names such as "Illinois", "Montana"). If the check fails — one retry with a different query/provider/structured connector; status — a new `used_weak`/`no_relevant_data` | R-6 |
| 1.8 | **Search status in the prompt**: `SEARCH STATUS: attempted, no relevant data (reason class)` / `not attempted` / `provider unavailable`. Forbid the wording "I have no access to the internet" when search exists; a template for an honest answer with an offer to retry | P-1 |
| 1.9 | Logs: `recordApplicationLog` for `web_search`/`direct_web_search` with `provider`, `reason`, `queries`, `sourcesHosts`, `digestCharsPerQuery`, `droppedByBudget`, `gate` | O-1 |
| 1.10 | Tests (`tests/`, G3): V-1 ("+8 °C"), R-1 (shares), R-2 (snippet preserved), R-5 (foreign country / home page), the 26-question trigger set (positive and negative), the follow-up set | O-2 |

#### Wave 2 — "Planner + connectors + provider chain" (`FOR_ASSISTANT`, P0/P1)

| # | What to do | Closes |
|---|---|---|
| 2.1 | **Search planner** (path E): one cheap JSON call over the last 3–4 turns: `{needSearch, reason, queries[≤3], entity:{place,countryCode}, topic, freshness, language}`. Regexes remain as a quick safety net and as a **prohibition** (distress/personal decision, section 7.5) | T-1, T-2, T-3, R-3 |
| 2.2 | **Weather connector** (path B): geocoding → weather API → structured block with `observedAt`, units, 7-day forecast; for "compare sites" — 2–3 independent sources/models | R-7, the user's goal |
| 2.3 | **Provider chain** (path C/D): `connector → Serper → Gemini googleSearch → (optional) second SERP`; circuit breaker and a separate budget for "search" vs "generation" | A-1, R-6 |
| 2.4 | One Gemini key pool for **all** calls (`generate()`, translation, planner, grounding, direct); cooldown per "key + model" pair rather than "model for 30 minutes"; switch to the second cascade model | K-2, K-3, K-5 |
| 2.5 | Escalation: for `research` with several sources — a model above lite if available; otherwise an explicit note of the limitation | K-4 |
| 2.6 | Cache of search/connector results (weather 10 min, rates 1–2 min) — saves credits and quotas | F |
| 2.7 | Verifier: either fix it (`maxOutputTokens` ≥ 2000, low `reasoning_effort`, JSON mode, no `await` on the critical path) or disable it; do not send text to Groq without explicit opt-in | E-1 |

#### Wave 3 — evidence (`FOR_CI` + `FOR_NAVIGATOR`)

1. Workflow `live-search-acceptance.yml` (`workflow_dispatch` + weekly cron), secrets in Actions; **20 canonical "live" questions** (weather in 5 cities in different countries, exchange rate, "what's new", events of the day) against a deployed URL.
2. Deterministic checks: the answer contains the place from the question; contains a number with a unit; timestamp ≤ 3 h; no foreign place names; for weather — deviation from an independent oracle (a structured API) of no more than ±3 °C.
3. Results go to `docs/USER_VALUE_EVALUATION.md` with labels `OBSERVED / INFERRED / NOT_RUN`; the `ROADMAP.md` checkbox is ticked only after a green run (G5).
4. Update `TECHNICAL_SPECIFICATION.md` (search is on by default, not opt-in) — only with owner approval (AGENTS.md §3); fix the comment about "13 keys".

### 7.3 Code sketches

> Verified locally where stated. Everything else is a sketch, **NOT_RUN** on live services. Any patch is delivered under the G1 rules (changed files only) with tests and a `CHANGELOG.md` entry.

#### V-1. Regular-expression fix (verified: `+8 °C` no longer throws)
`src/numberValidator.ts`:
```ts
function inputHasPercentValue(input: string, value: string): boolean {
  const n = value.replace(',', '.').replace(/^[-+]/, '');
  if (!/^\d+(?:\.\d+)?$/.test(n)) return false;   // only digits reach the RegExp
  const re = new RegExp(`(?<![\\p{L}_])[-+]?${n.replace('.', '[.,]')}%`, 'u');
  return re.test(input);
}
```
Plus, in `server.ts` around the `validateNumbers(...)` call — a `try/catch` with logging and an empty `bad`, so that a diagnostic check cannot crash an answer.

Verification result:
```
'Temperature +8 °C, humidity 6%'  → ['+8']      (before: SyntaxError)
'Weather: +6 and -3 degrees'      → ['+6','-3']
'Growth 6% per year'              → []
```

#### R-1. Fair division of the digest budget (verified on synthetic data: 498/498/498/498 characters per sub-query)
```ts
export function mergeFairShare(parts: Part[], maxChars = 6000, sep = '\n\n====\n\n') {
  const live = parts.filter(p => p.digest.trim());
  if (!live.length) return { digest: '', sources: [], queries: [] };
  const per = Math.floor((maxChars - sep.length * (live.length - 1)) / live.length);
  const digest = live.map(p => p.digest.trim().slice(0, per)).join(sep);
  const seen = new Set<string>(); const sources: Source[] = [];
  for (const p of live) for (const s of p.sources) if (!seen.has(s.url)) { seen.add(s.url); sources.push(s); }
  return { digest, sources, queries: [...new Set(live.flatMap(p => p.queries))] };
}
```
Better still, also reduce sub-queries to one for ambiguous topics (fewer credits and fewer duplicates).

#### R-2. Snippets are always preserved (verified)
```ts
export function composeDigest(snippetDigest: string, pageBlocks: string[], max = 6000) {
  const head = snippetDigest.trim().slice(0, 1800);
  const rest = pageBlocks.join('\n\n---\n\n');
  return (head + (rest ? '\n\n---\n\n' + rest : '')).slice(0, max);
}
```

#### R-5. Page filter: no home pages and no foreign country (verified)
```ts
const isHomepage = (u: string) => { try { const p = new URL(u); return (p.pathname === '/' || p.pathname === '') && !p.search; } catch { return false; } };
const GEO_HOST: Record<string, RegExp> = {
  CH: /meteoswiss\.admin\.ch|meteoschweiz|srf\.ch/i,
  US: /weather\.gov|noaa\.gov/i,
  DE: /dwd\.de/i,
  GB: /metoffice\.gov\.uk/i,
};
export function usable(url: string, cc?: string) {
  if (isHomepage(url)) return false;
  for (const [k, re] of Object.entries(GEO_HOST)) if (re.test(url) && cc && k !== cc) return false;
  return true;
}
// usable('https://forecast.weather.gov/zipcity.php?inputstring=Lake_Zurich','CH')  → false
// usable('https://www.meteoswiss.admin.ch/','CH')                                  → false
// usable('https://www.meteoswiss.admin.ch/weather/….html','CH')                    → true
```
The `GEO_HOST` list is only an illustration; it is better to determine a source's country from the top-level domain and the geodata of the Serper result rather than maintain it by hand (so as not to bring back the "city allowlist" removed in P124.0.2).

#### R-3/T-1/T-2. Search planner (prompt and schema sketch)
```text
SYSTEM: You plan web lookups for a chat assistant. Output JSON only.
INPUT: last 4 chat turns (user and assistant), today's date.
OUTPUT: {
  "needSearch": boolean,          // true if the latest user message needs facts that change over time
  "reason": "short",
  "queries": ["<=3 short English queries, no instructions like 'find' or 'compare'"],
  "entity": {"place": "...", "countryCode": "CH|null"},
  "topic": "weather|fx|crypto|news|sports|version|other",
  "freshness": "now|day|week|any",
  "resolvedFollowup": "full standalone question this message refers to"
}
RULES: If the latest message only asks to 'search'/'check' with no topic, take the topic from the previous user turn.
Never put private/personal details, names or health information into queries. If the message is a personal decision
or emotional, set needSearch=false.
```
The same JSON provides `countryCode` for `gl`, `place` for the geocoder, and `topic` for connector selection.

#### Weather connector (sketch, NOT_RUN — network unavailable; check parameters against the Open-Meteo documentation before implementing)
```ts
async function openMeteoWeather(place: string, countryCode?: string) {
  const g: any = await (await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=5&language=en&format=json`)).json();
  const hit = (g.results ?? []).find((r: any) => !countryCode || r.country_code === countryCode) ?? g.results?.[0];
  if (!hit) return null;
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.search = new URLSearchParams({
    latitude: String(hit.latitude), longitude: String(hit.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
    timezone: 'auto', forecast_days: '7',
  }).toString();
  const f: any = await (await fetch(u)).json();
  return {
    place: `${hit.name}, ${hit.admin1 ?? ''} ${hit.country}`.replace(/\s+/g, ' ').trim(),
    observedAt: f.current?.time, units: { temp: '°C', wind: 'km/h', precip: 'mm' },
    current: f.current, daily: f.daily, source: 'Open-Meteo',
  };
}
```
Remarks:
- Open-Meteo `current` is a **model analysis**, not a reading from a specific station; the answer must call it that. For "compare sites", add an independent source (for example MET Norway Locationforecast with the mandatory `User-Agent`, or Open-Meteo weather models with different `models`) and show the values side by side with the discrepancy.
- According to project descriptions, the free Open-Meteo API without a key is intended for non-commercial use, the data is licensed CC BY 4.0 (attribution required); commercial use needs a paid plan. **Check the terms at open-meteo.com before enabling in production.**
- Likewise for exchange rates (ECB, Frankfurter) and crypto (CoinGecko) — separate thin connectors behind the same interface.

#### P-1. Search status in the prompt
```ts
function searchStatusBlock(s: { status: string; reason?: string; expected: boolean }) {
  if (s.status === 'used') return '';
  const line = !s.expected ? 'Web search was not needed for this message.'
    : s.status === 'skipped' ? 'Web search was NOT run for this message (reason: ' + (s.reason ?? 'unknown') + ').'
    : 'Web search was attempted but returned no usable data (reason: ' + (s.reason ?? 'unknown') + ').';
  return `SEARCH STATUS: ${line} The application does have web search; say what happened in one sentence and offer to retry. ` +
         `Do not say you have no internet access.`;
}
```

#### K-2. A single Gemini call with the pool (scheme)
```ts
async function geminiCall(fn: (client: GoogleGenAI, key: KeySlot) => Promise<T>) {
  for (const slot of pool.available()) {
    try { return await fn(new GoogleGenAI({ apiKey: slot.key }), slot); }
    catch (e) { const c = classifyKeyError(e); if (!shouldRotateKeySlot(c)) throw e; pool.markCooldown(slot.slot, Date.now(), c === 'PROVIDER_TRANSIENT' ? 30_000 : undefined); }
  }
  throw new GeminiUnavailableError('All key slots are cooling down');
}
```
Use it everywhere: `generate()`, `toEnglishSearchQuery`, the planner, grounding. The switch to the next **model** happens inside each slot before moving to the next key.

### 7.4 Acceptance criteria (user-level, G5: claim PASS only after a real run)

| # | Scenario | Criterion |
|---|---|---|
| A1 | "What is the weather in Zurich right now? Find exact data on the internet. Compare information from various weather sites. Additionally, make a forecast for the week." | Answer: Zurich (Switzerland), temperature in °C with an observation time ≤ 3 h, a 7-day forecast, ≥ 2 independent sources named, no mentions of the USA |
| A2 | Next: "I am asking you to run an internet search." | A repeated search on the Zurich topic; not "Perform internet search" |
| A3 | "Will it rain tomorrow in Bern?", "how much does bitcoin cost now" | Search/connector runs; the answer contains a number and a time |
| A4 | An answer with "+8 °C" | No `SyntaxError`, no `AI_ERROR` |
| A5 | All Gemini slots respond 429 | An answer via a fallback provider **or** an honest "temporarily unavailable (quota)", **without** "I have no internet" |
| A6 | A personal decision ("lately I have been tired…") | Search does not run, the text does not go to external providers |
| A7 | A set of 26 "live" questions | Trigger ≥ 90%; on a negative set (personal/general questions) false positives ≤ 5% |
| A8 | Log | For each request the provider, `reason`, queries, per-sub-query character counts, and the usability-check decision are visible |

### 7.5 Privacy and security (to consider in Wave 2)
- The planner and connectors **widen** the outbound data flow. Currently caution is implemented by conservative regexes (`needsFreshWebInfo` deliberately does not fire on personal phrasings). When moving to an LLM planner, keep the **hard prohibition on distress/CRISIS/DOCUMENT/attachments** (as in `shouldSearchWeb`) and add to the planner prompt a ban on personal data in queries.
- In `docs/SECURITY_AND_PRIVACY.md`, list the new data recipients (geocoder, weather/rates APIs).
- Groq verifier: do not send text without explicit consent (E-1).
- Add `SERPER_API_KEY` and new keys to `SECRET_ENV_NAMES` (`server/redact.ts`) — a remark from the audit `BiForge-AUDIT-REPORT-P124-9.md`.

### 7.6 What not to do
1. **Do not treat it with prompts** ("search harder"): with no data in the digest, this does not work.
2. **Do not bring back a list of cities/hosts** (C124 removed it): use a geocoder and country detection.
3. **Do not increase timeouts / number of queries / pages** — it worsens R-1 and burns credits.
4. **Do not add keys to the same project** (K-1).
5. **Do not enable direct mode "as a solution"**: by the design of P124.17 it has no search, and the 124.19–124.21 fixes are not used in production.
6. **Do not mark PASS on mock tests** (G5): the target scenario is a real answer to a user (BIO-002, BIO-006).

---

## 8. Open Questions (require data outside the archive)

1. Actual env values on Render (especially `BIFORGE_GEMINI_DIRECT_MODE`, `ENABLE_EXTERNAL_MODEL_FALLBACK`, `WEB_SEARCH_*`, `GROQ_API_KEY`).
2. The cause of the 9 `failed` statuses and of some `skipped` (15:57–17:06Z and 14:37–14:40Z): remaining Serper credits, `reason`, the provider at that time.
3. How many Google projects the 10 keys were created in; which quotas applied.
4. Whether `bf-124-21-green.zip` corresponds to the deployed commit `7ad970d`.
5. The cause of the 138 process restarts.
6. Jina Reader behaviour for JS pages in shadow-DOM mode from a Render container (NOT_RUN).
7. Terms of use of the chosen external APIs (Open-Meteo, Serper, Brave/Tavily, etc.) at implementation time.

---

## Appendix A. Digest Composition in the Screenshot Case (Turn 1)

| Block | Source | Content | Value |
|---|---|---|---|
| 1 | MeteoSwiss (home page, Jina) | "Quick links (Access keys)…", *shadow DOM* warning | no data |
| 2 | forecast.weather.gov (Lake Zurich, **IL**) | current conditions at Wheeling airport (Chicago), 61 °F | wrong place |
| 3 | MeteoSwiss (home page, direct fetch) | menu, "Weather map", "Indian summer…" | no data |
| — | AccuWeather "Switzerland Current Weather" | not downloaded | — |
| — | wtoc.com (Savannah), timeanddate (Zurich, MT), savvytime | not downloaded | — |
| — | Sub-queries 3–4 and Serper snippets | cut off by the 5000-character budget | lost |

## Appendix B. Reproduction (Real Functions from the Sources)

**Query expansion** (R-3): see the list of 4 queries in section 4.

**Digest budget** (R-1): 4 sub-queries × 4400 characters → total 5000 → Q1: 1099, Q2: 564, Q3: 0, Q4: 0.

**Search trigger** (T-1), 9 of 26:

| Fires | Does not fire |
|---|---|
| what is the news today; latest news about Tesla; what is the dollar rate; dollar rate today; what is the weather in Zurich; weather forecast for the week in Geneva; who is the president of France now; what is new in Node.js; which Python version is current | what is happening in the world right now; what is happening in Ukraine now; how much does bitcoin cost now; bitcoin price; what is the franc to euro rate now; who won yesterday Real Madrid; what is the score in the Barcelona match; who won the game last night; is the Louvre open today; will it rain tomorrow in Bern; air temperature now in Zurich; is there traffic in Zurich; is Cloudflare working today; what happened with Binance; what time is it now in Tokyo; when will the iPhone 18 come out; tell me about the earthquake in Turkey today |

**Follow-up** (T-2): see the table in section 5.

**Validator** (V-1): `validateNumbers('Temperature +8 °C, humidity 6%', 'weather digest 6% 8')` → `SyntaxError: Invalid regular expression: /(?<![\p{L}_])[-+]?+8%/u: Nothing to repeat`.

## Appendix C. What Exactly the Logs Record About Keys and Quotas

```
2026-11-02T15:57:06Z gemini_direct_key_rotated keySlot=0 PROVIDER_QUOTA attempt 1/3
                      … keySlot=1, 2 (attempt 2/3, 3/3) → HTTP 503 to the user
15:57:11               keySlot=3, 4, 5
15:58:11               keySlot=6, 7, 8
15:58:23               keySlot=9
16:20:48 / 16:24:48    keySlot=0…2 and 3…5 PROVIDER_QUOTA again
provider message:      429 RESOURCE_EXHAUSTED "You exceeded your current quota…"
```

## Appendix D. Conformance with `AGENTS.md`
- The report is analytical; no patch ZIP was created (G1 not applicable).
- For `FOR_NAVIGATOR` steps, only actions in web interfaces (Render/Serper/Google dashboards) are given, with no shell or `npm` (G2). Changes to production and billing are marked `FOR_OWNER` (§8).
- Every code item is accompanied by tests in `tests/` and/or `.github/workflows/` (G3).
- UI/routes were not changed; if the planner/connectors touch the Conversational/Expert interface, a G4 check will be required.
- All check statuses are stated honestly (`OBSERVED`, `REPRODUCED`, `INFERRED`, `NOT_RUN`) (G5).
