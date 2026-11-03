# Web-Search Live-Data Remediation (C124) — Audit, Recommendations, Work Programme

**Introduced by:** P124.22 (documentation-only patch, 2026-11-03).
**Status:** audit complete; remediation code NOT started. Everything below is factual status or owner-approved scope, not a binding next-session assignment (`AGENTS.md` §4–§5, `ROADMAP.md`).
**Obligations:** `BIO-002` (current information when required), `BIO-006` (user outcomes primary), `BIO-008` (history preserved).
**Evidence labels:** `OBSERVED-LOG`, `OBSERVED-SRC`, `REPRODUCED`, `INFERRED`, `NOT_RUN`, `NOT_VERIFIED`. Live Serper, Jina, Gemini, and Open-Meteo calls have **never** been run for this defect (`NOT_RUN`).

## 1. Problem statement

For questions about what is happening "right now" (weather, rates, news, events) the Conversational agent frequently answers without real data, or tells the user it has no internet access. Web search is not disabled: Serper answers HTTP 200, pages download, and a digest reaches the model. The chain "decide to search → build query → retrieve → assemble digest → answer" loses or corrupts useful information at nearly every step, and when search is not triggered the model makes a false claim about the product.

Reference case (screenshot, 2026-11-03 05:37Z): "current weather in Zurich, compare several sites, forecast for a week". The digest contained a MeteoSwiss home page without data, a forecast for Lake Zurich (Illinois), and links about unrelated places. The model correctly reported that it had no Zurich data. The defect is in the data, not in the wording of the answer.

## 2. Evidence base and limits

Auxiliary source (non-governing): `docs/biforge-web-search-analysis.md` is the English translation of the original analysis report. It is traceability material only; where it differs from this document or from `docs/DECISIONS.md`, this document and the higher-level documents win.

Inputs: the P124.21 source archive, the application diagnostics export (896 detailed records, 2026-11-01 15:03Z to 2026-11-03 05:40Z), the Render deploy log for commit `9db8a51`, the owner-supplied Render environment listing (secret values masked), a screenshot, and a compact session log.

Limits:
1. No outbound network in the audit environment: all live calls `NOT_RUN`.
2. Diagnostics report commit `7ad970d` (process start 2026-11-03 05:29Z); the supplied deploy log is for `9db8a51` (2026-11-02 18:57Z), about ten hours earlier. This is consistent with a later deploy whose log was not saved, but it is `NOT_VERIFIED` that the source archive equals the deployed commit.
3. Console `info` lines are not persisted (O-1), so web-search status and `reason` values for 2026-11-02 are unavailable; conclusions about 15:57–17:06Z are `INFERRED`.
4. Environment variable values are not exposed by diagnostics (only booleans); the owner-supplied listing closed part of this gap (section 5).

## 3. Findings register

Priority: P0 breaks the scenario, P1 materially degrades it, P2 should be fixed. "Patch" is the work package that closes it (section 8).

### Retrieval
| ID | Pri | Finding (evidence) | Patch |
|---|---|---|---|
| R-1 | P0 | `mergeWebSearchResults` concatenates sub-query digests then cuts at 5000 chars; later sub-queries are dropped (`REPRODUCED`: 4 sub-queries of 4400 chars give 1099 / 564 / 0 / 0). | P124.25 |
| R-2 | P0 | Snippets and answerBox are discarded as soon as one page is downloaded (`digestFromPageExtracts` returns the snippet fallback only when no pages exist). | P124.25 |
| R-3 | P0 | Query is an LLM translation of the whole message; instruction words ("compare", "forecast for a week") leak in; no country; silent fallback to the untranslated text when Gemini fails. | P124.26 |
| R-4 | P0 | `serperLocale()` fixes `hl=en, gl=us`; wrong-country sources and Fahrenheit for a European city. | P124.26 |
| R-5 | P0 | `PREFERRED_HOST_RE` favours `weather.gov`/`noaa.gov` globally; home pages of JS apps rank first and carry no data; no URL dedup across sub-queries; Jina is called without a key; direct fetch does not execute JavaScript. | P124.25 |
| R-6 | P0 | Status `used` is set for any non-empty digest; no place/number/date check, no retry, no quality signal to the model; `research` mode has no refinement path. | P124.26 |
| R-7 | P1 | "Compare sites" is architecturally unreachable (one SERP, two pages per sub-query, source names hidden by the no-URL policy). | P124.29 |

### Trigger and dialogue context
| ID | Pri | Finding | Patch |
|---|---|---|---|
| T-1 | P0 | Trigger is a set of regular expressions; 9 of 26 realistic "live" questions fire (`REPRODUCED`). Misses include price of bitcoin now, who won yesterday, will it rain tomorrow in Bern, temperature now in Zurich. Observed consequence: diesel price in California answered from memory. | P124.28 |
| T-2 | P0 | Follow-ups lose the topic ("I am asking you to search" becomes `Perform internet search`). Each follow-up shape is a separate regular expression. | P124.26, P124.28 |
| T-3 | P1 | `recentSearchIntent` in `server.ts` and `isSearchFollowup` define the same concept differently. | P124.26 |

### Providers, keys, quotas
| ID | Pri | Finding | Patch |
|---|---|---|---|
| K-1 | P0 | All 10 Gemini key slots returned 429 `RESOURCE_EXHAUSTED` in the same window (2026-11-02 15:57–16:24Z); quotas are per project, so the keys likely share one quota (`INFERRED`). | owner action, section 9 |
| K-2 | P0 | Key rotation exists only in direct mode; `generate()`, query translation, grounding, and the verifier use one key; models are parked for 30 minutes after 429/503. | P124.27 |
| K-3 | P1 | Direct mode uses one model and at most 3 keys per request. | P124.27 |
| K-4 | P1 | "Strong" class equals the lite models in production (`MODEL_CASCADE_STRONG` lists lite models); no escalation for multi-source synthesis. | P124.27 |
| K-5 | P1 | Query translation silently degrades on any error, without a log label. | P124.27 |

### Answer layer
| ID | Pri | Finding | Patch |
|---|---|---|---|
| P-1 | P1 | When search is skipped or failed the prompt carries no status, so the model asserts "I have no internet access" (false statement about the product). | P124.26 |
| P-2 | P1 | The search-evidence instruction block is overfitted to topics (rates, LTS versions, weather) and forbids naming sources (blocks verification and "compare sites"). `docs/C124_INSTRUCTION_INVENTORY.md` I-16 already calls for a general evidence/provenance contract. | P124.26 |
| P-3 | P2 | `research` mode gets no quality check of the retrieved evidence. | P124.26 |
| A-1 | P1 | Five patches in one day (P124.17–P124.21) switched between direct and pipeline; fixes landed in the path production does not use. | P124.27 (single path) |

### Validator, observability, process
| ID | Pri | Finding | Patch |
|---|---|---|---|
| V-1 | P0 | `inputHasPercentValue` builds `[-+]?+8%` for a value such as `+8` and throws `SyntaxError: Nothing to repeat`; thrown inside `generate()` it becomes `llm_error`, then `AI_ERROR` for the user (observed 2026-11-02 11:39Z and 12:59Z). Triggers precisely when search worked and the model wrote a temperature. | P124.23 |
| E-1 | P2 | Groq verifier returns `INVALID_OUTPUT` on every call, adds about 1.9 s serially, and sends user and answer text to a third party whenever the Groq key is set. | P124.27 |
| O-1 | P1 | No persistent trace of search decisions (`info` console lines not stored; `reason` missing). | P124.23 |
| O-2 | P0 (process) | The target scenario has never been verified live; every weather-related patch records `NOT_RUN: live Serper/Gemini`; the roadmap item "validate live weather answers against MeteoSwiss" is open since P123.16. | P124.31 |
| O-3 | P2 | Documentation vs code: the specification says web search is opt-in, code enables it by default; a comment says 13 organisational keys, code allows 10; Serper is absent from the external-connections inventory. | P124.31 (specification change needs owner approval) |

## 4. Owner-reported items (2026-11-03) and resolution

| # | Owner item | Verified fact | Resolution |
|---|---|---|---|
| 1 | The compact diagnostic log exported from the Simple-mode screen contains Project Mode diagnostics. | Confirmed (`OBSERVED-SRC`): the Simple-mode header button calls the shared session-log endpoint whose content is built by `compactSessionLog()` for Project Mode (export operations, artifacts, `/project` browser events). | P124.24: separate conversation-oriented log for Simple and Expert; Project log stays in Project Mode. |
| 2 | Consider alternative search resources. | Single effective provider (Serper). Owner has a key for a second SERP provider (provider name still to be supplied). | P124.30: provider chain, second SERP behind configuration. |
| 3 | Commit in diagnostics differs from commit in deploy log. | Different deploys, about ten hours apart (section 2, limit 2). Not shown to be a defect; not shown to be none. | P124.24: build-stamp compared with the runtime commit in diagnostics. |
| 4 | `info` console lines are not saved to the database. | Confirmed (`OBSERVED-SRC`): console capture persists only `warn` and `error`. | P124.23: persist search decisions and key events as application log records. |
| 5 | Diagnostics must expose all data. | Only boolean flags are exported today. | P124.24 with the secret-handling rule in section 6, decision 2. |
| 6 | Direct vs pipeline: do it the best way. | Production runs pipeline (`BIFORGE_GEMINI_DIRECT_MODE=false` confirmed). P124.19–P124.21 fixes sit in the direct path. | Decision 3, section 6; P124.27. |
| 7 | Use the configuration of the single success (Chur, 12:57Z) for repair. | Success is consistent with a digest that contained a number; `info` status is missing for that day. | Reconstruction from detailed logs attempted in P124.23 evidence; incomplete by nature (O-1). |
| 8 | Find and fix the cause of 138 process starts in about 37 hours. | Gaps: 24 under one minute, 54 under five minutes, 43 under 30 minutes, 14 under four hours, 2 longer; 108 starts report version 124 and 30 report 123. Cause is not recorded anywhere. | P124.24: record previous-shutdown reason (signal, uncaught error, memory), then fix on evidence. |
| 9 | Treat sections 5 and 6 of the analysis likewise. | Mapped in section 3. | All patches. |

## 5. Confirmed environment facts (owner listing, 2026-11-03; names and non-secret values only)

- `BIFORGE_GEMINI_DIRECT_MODE=false`, `ENABLE_WEB_SEARCH=true`, `ENABLE_EXTERNAL_MODEL_FALLBACK=true`, `DAILY_CALL_CAP=1000`, `NODE_ENV=production`.
- Web search: `WEB_SEARCH_FETCH_PAGES=true`, `WEB_SEARCH_MAX_QUERIES=5`, `WEB_SEARCH_MAX_PAGES=4`, `WEB_SEARCH_TIMEOUT_MS=15000`.
- Models: `MODEL_CASCADE_STRONG` lists `gemini-3.5-flash-lite` then `gemini-3.1-flash-lite`; `MODEL_CASCADE_LIGHT` the same two in the reverse order. `MAX_MODEL_CALLS=4`, `LLM_CALL_TIMEOUT_MS=20000`, `LLM_TOTAL_DEADLINE_MS=70000`.
- Ten Gemini key variables are present (`GEMINI_API_KEY`, `GEMINI_API_KEY_1` … `GEMINI_API_KEY_9`); Groq, Serper, and Jina keys are present.
- **Set but not read by any source file** (`OBSERVED-SRC`, no occurrence in `server.ts`, `server/`, `src/`): `SEARCH_CAROUSEL`, `SERPER_ENABLED`, `BIFORGE_ENABLE_WEB_SEARCH`, `JINA_API_KEY`, `JINA_READER_BASE_URL`. Jina Reader is currently called without a key and without a configurable base URL.
- The environment listing contains secrets; it must stay outside the repository (`AGENTS.md` §8). Share only masked values.

## 6. Owner decisions (2026-11-03)

1. Recommendations 1–8 of the objections list are accepted: key pool before planner; no secrets in diagnostics; pipeline is the single production path; country from geocoder and ccTLD instead of lists; verifier opt-in; weather connector behind an interface; provider chain through `SEARCH_CAROUSEL`; specification change only with approval.
2. **Diagnostics secret rule.** Non-secret configuration is exported in full. Secrets are exported only as "set / length / short SHA-256 fingerprint"; no secret value, no database password, no private key, no partial key material.
3. **Direct mode.** Not removed now, not default. Key rotation and Serper-then-Gemini fallback move into the pipeline. Removal of dead direct code is a later, separate decision.
4. **Weather connectors (Open-Meteo, MET Norway).** Not for commercial use. They may be used only where the deployment is non-commercial and only if acceptance evidence shows a benefit. Implementation therefore sits behind an explicit enable switch that is off by default, shows attribution, and labels data as model output rather than station observations.
5. **Second SERP.** The owner has a key. Provider name and variable name are still to be supplied; the key is configured only in the hosting environment, never committed.
6. **Source archive.** No new archive required; deliveries contain only new and changed files at exact repository paths.
7. **Patch identity.** `AGENTS.md` fixes patch values at `.1`–`.99` and forbids a `.0` component, and the current patch is 124.21. The documentation patch is therefore **P124.22**, and the code work packages are P124.23–P124.31.

## 7. Recommendations (condensed from the analysis, section 7) and adopted changes

Paths considered: A repair the Serper chain; B structured-data connectors; C Gemini `googleSearch` as reserve; D second SERP provider; E LLM search planner; F quota and key hygiene with cache; G honest status UX; H live acceptance in CI. Adopted combination: **A + G + F first, then key pool, E, B (gated), C, D, and H.**

Adopted adjustments to the original plan:
- Key pool (2.4) moves before the planner (2.1); deterministic heuristics remain a fallback when the model is unavailable.
- No static foreign-toponym or host lists. Use geocoder country, ccTLD of the source, and Serper country/language parameters.
- For an ambiguous place, use the geocoder's best candidate, name it in the answer, and ask only when candidates are comparable.
- Verifier: disabled by default; explicit opt-in; no third-party transfer without opt-in.
- `SEARCH_CAROUSEL` becomes the real provider-chain configuration.

Do not: fix this with prompt wording alone; reintroduce city or host lists; raise timeouts, query count, or page count; add keys to the same Google project; enable direct mode as a remedy; claim PASS from mocked tests (`G5`).

## 8. Work programme (owner-approved scope; each patch sized for one session)

Every patch: tests under `tests/`, `CHANGELOG.md` entry, top note in `TECHNICAL_REPORT.md`, `package.json` patch increment, ZIP with only new/changed files (`G1`). Live checks stay `NOT_RUN` until executed.

- **P124.23 — Never crash, record everything.** Fix `inputHasPercentValue`; guard `validateNumbers` with try/catch (diagnostic only); persist search decisions (`web_search`, `direct_web_search`) with provider, reason, queries, source hosts, characters per sub-query, budget drops. Closes V-1, O-1.
- **P124.24 — Diagnostics and restarts.** Separate Simple/Expert diagnostic log; configuration snapshot (rule in section 6); list of variables set but unused; build-stamp vs runtime commit; `process_boot` with previous-shutdown reason, uptime, memory. UI touch limited to the header log button; `G4` statement (testids, e2e) required in the delivery. Closes items 1, 3, 5, 8.
- **P124.25 — Retrieval integrity.** Fair digest budget and URL dedup (R-1); snippets/answerBox always kept (R-2); drop home pages and wrong-country sources, no global `weather.gov` preference, use `JINA_API_KEY` if set (R-5).
- **P124.26 — Query, locale, usability, honest status.** Instruction-free queries, country-aware `gl/hl` and units (R-3, R-4); deterministic usability check with `used_weak` / `no_relevant_data` and one retry (R-6); `SEARCH STATUS` in the prompt and a ban on "no internet access" claims (P-1); one follow-up definition (T-3); evidence/provenance contract replacing the overfitted block (P-2, P-3).
- **P124.27 — Single key pool and verifier.** One Gemini key pool for `generate()`, query translation, grounding; cooldown per key and model; second-model fallback (K-2, K-3, K-5); verifier opt-in (E-1); explicit note when a lite model handles multi-source synthesis (K-4); pipeline as the only default path.
- **P124.28 — Search planner.** JSON planner over the last turns (need, queries, place and country, topic, freshness); keep distress/CRISIS/DOCUMENT/attachment blocks and a no-personal-data rule; heuristics as fallback; 26-question positive set (target ≥ 90%) and a negative set (≤ 5% false triggers). Closes T-1, T-2.
- **P124.29 — Weather connector (gated) and cache.** Geocoding, Open-Meteo and MET Norway behind the switch from decision 4; seven-day forecast, `observedAt`, units, discrepancy between sources; result cache (weather 10 min). Closes R-7 where enabled.
- **P124.30 — Provider chain.** `SEARCH_CAROUSEL`: connector, Serper, Gemini `googleSearch` (two-step in the pipeline), second SERP; circuit breaker; separate budgets for search and generation; rates and crypto connectors if approved.
- **P124.31 — Evidence.** Live-search acceptance workflow (`workflow_dispatch` plus weekly schedule, secrets in Actions, 20 canonical questions, deterministic checks); results in `docs/USER_VALUE_EVALUATION.md`; specification and key-count comment corrections after owner approval.

## 9. Manual actions (no code)

`FOR_OWNER` / `FOR_NAVIGATOR`, browser panels only:
1. Serper dashboard: remaining credits and errors for 2026-11-02 15:57–17:06Z.
2. Google AI Studio / Cloud Console: which projects own the ten Gemini keys; model quotas; billing with a spending cap on a single project is an owner decision.
3. Render environment: keep `BIFORGE_GEMINI_DIRECT_MODE=false`; optionally try `WEB_SEARCH_MAX_QUERIES=2` and a trial `WEB_SEARCH_FETCH_PAGES=false`, repeat one weather question three times, and record the outcome.
4. Decide whether the Groq verifier stays on until P124.27.
5. Establish why the process restarts (hosting plan sleep policy, deploy cadence, memory) using the restart reason added in P124.24.

## 10. User-level acceptance criteria (`PASS` only after a real run)

| # | Scenario | Criterion |
|---|---|---|
| A1 | "Current weather in Zurich, compare several weather sites, weekly forecast" | Zurich (Switzerland); °C; observation time within 3 h; 7-day forecast; at least two independent named sources; no US places |
| A2 | Follow-up: "I am asking you to search" | Search repeats for the Zurich topic, not for the literal instruction |
| A3 | "Will it rain tomorrow in Bern?", "price of bitcoin now" | Search or connector runs; number and timestamp in the answer |
| A4 | Answer containing "+8 °C" | No `SyntaxError`, no `AI_ERROR` |
| A5 | All Gemini slots return 429 | Answer through a reserve provider or an honest "temporarily unavailable (quota)"; never "I have no internet" |
| A6 | Personal or distress message | No search; text not sent to external providers |
| A7 | 26 live questions plus negative set | Trigger ≥ 90%; false triggers ≤ 5% |
| A8 | Logs | Each search shows provider, reason, queries, characters per sub-query, usability decision |

## 11. Privacy and security requirements for the remediation

- A planner or connector widens outbound data flow. Keep the hard no-search rules (distress, CRISIS, DOCUMENT, attachments) and forbid personal details in generated queries.
- List new recipients (geocoder, weather and rates APIs, second SERP provider) in `docs/SECURITY_AND_PRIVACY.md` when each is implemented.
- Add every new key variable name to `SECRET_ENV_NAMES` in `server/redact.ts`.
- No secrets in the repository, in diagnostics, or in documentation.

## 12. Open questions (need data outside the repository)

1. Second SERP provider name and variable name.
2. Whether the source archive equals the deployed commit `7ad970d`.
3. Serper credit history and error codes for 2026-11-02.
4. Number of Google projects behind the ten Gemini keys.
5. Cause of the process restarts.
6. Jina Reader behaviour for JavaScript pages from the hosting container.
7. Terms of use of every external API at implementation time.
