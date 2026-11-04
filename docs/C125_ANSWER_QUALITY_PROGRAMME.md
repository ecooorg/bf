# C125 — Answer-quality programme (owner-approved scope, 2026-11-04)

This is the approved scope of cycle C125, not a next-session assignment. Each session still re-derives its task from current gaps (`AGENTS.md` §4); there is no `NEXT_PATCH.md`. Decisions: `docs/DECISIONS.md` D-2026-11-04-01 and D-2026-11-04-02. Plan entry: `ROADMAP.md`.

**Cycle rule.** Improving the quality of model answers is a separate cycle from model-carousel, key-pool, ops and CI-diagnostics work. C124 closes with patch 124.40 (this documentation patch). C125 starts at version `125`, patch `125.1` (`AGENTS.md` §2 cycle rules; sync lock metadata).

## 1. Evidence behind the programme

Labels: OBSERVED (diagnostics export of 2026-11-04, release 124.36, one Expert dialogue about the US midterms), INFERRED (source inspection), NOT_VERIFIED.

- OBSERVED: four time-sensitive turns ran no search; pre-classifier and fallback plans sent the user's own Russian wording to the search provider (`planSource: heuristic`); results came from Russian-language hosts, among them state-controlled outlets; a question about sources was searched as a web query. Fixed in P124.38 (search coverage) and P124.39 (English provider queries, trusted-source labels, old-result marking, same-name places).
- INFERRED: search queries are translated and shortened (`toEnglishSearchQuery` "max 14 words", planner "max 12 words", inputs cut to 500 characters, planner dialogue turns cut to 300 characters). The main conversation model receives the user's text in the original language.
- INFERRED: recurring red CI came largely from source-text regex contracts that break on intentional changes (for example the P124.36 navigation count), and the diagnostics export has no search-result text, so a failed dialogue cannot be fully diagnosed from it.
- OBSERVED (WP3 evidence, diagnostics export and render log of 2026-11-04 07:40-07:46 UTC, running release 124.40, commit fb99ded; a nine-turn Conversational dialogue about the current air temperature in a named city): the first turn ran no search; one turn used a mis-parsed place; one turn lost the place from the dialogue; four turns about the search itself ran no search and the model said it had no search tool; one planner call timed out after 8003 ms; only the turn answered through the model planner produced the place, the country code and the weather-connector result. Details in section 4, "WP3 scope extension".
- NOT_VERIFIED: patch 125.1 was not the running release when that dialogue was recorded; its effect on live answers is unknown.
- NOT_VERIFIED: which retrieved page first carried the unconfirmed "Toledo" claim; whether the main model prefers Russian-language sources when search is off.

## 2. Work package WP1 — Query fidelity (search path)

Problem: shortening can drop key entities, numbers, negations and constraints.

**Query-size rule (owner, 2026-11-04).** A fixed compression ratio does not work: 100 words cannot be squeezed into 20 without loss. The limit is defined as follows:

- If the query has at most 20 words, translate it verbatim, without compression.
- If it has more than 20 words, send not one compressed query but several short queries. The number of queries is k = min(3, ⌈n/30⌉), where n is the word count of the source text. Each query has at most 25 words. Google truncates a query at roughly 32 words anyway, so one long query is pointless.
- Criterion instead of a ratio: every name, number, date, place, negation and explicit condition of the source text must appear in at least one of the queries. If the check fails, translate the first 25 words verbatim and add the missing entities as a second query.
- Examples: 100 words become 3 queries of 25 words each; 45 words become 2 queries; 25 words become 1 query; 20 words go through verbatim.
- The limits are configurable: 20, 25 and 3 are constants in one place. The number of queries is capped by the existing `WEB_SEARCH_MAX_QUERIES` limit.

Details:

- Queries up to 20 words (owner threshold, one named constant): translate faithfully and verbatim; no summarising; keep the existing instruction-word filter only.
- Longer queries: compress, but every named entity, number, date, place, negation and explicit constraint must survive.
- Deterministic check after translation or compression: entities and numbers found in the source text must appear in the English query; on a miss fall back to the verbatim translation.
- Remove or raise the fixed 500- and 300-character cuts where they discard part of a short query; keep a documented upper bound.
- Log, sanitised, per search: source length, query length, check result, whether the fallback was used.
- Tests: fixtures with names, numbers, negations ("not Toledo, Spain"), regions, and inputs of 5, 20, 21 and 60 words.
- Acceptance: no entity or number lost in the fixtures; the short path adds no model call beyond the translation.

## 3. Work package WP2 — Source policy for Russia and Belarus (owner decision)

Owner decision (2026-11-04): exclude every domain controlled by the authorities of Russia and Belarus from search evidence. The user is Ukrainian and lives in Switzerland and wants no Russian or Belarusian state sources.

Facts checked on 2026-11-04 from public pages (secondary sources; confirm against the IANA root zone database and the EU legal text in the first WP2 session):
- `.ru`, `.xn--p1ai` (the Cyrillic Russian zone, delegated 2010) are run by the Coordination Center for TLD RU.
- `.su` is a legacy Soviet code run by the Russian Institute for Public Networks (RIPN); ICANN has announced a phase-out planned by 2030.
- `.by` is the Belarus country code; `.xn--90ais` (the Cyrillic Belarus zone, introduced 2014) is the Belarus Cyrillic code with registry site cctld.by.
- EU broadcasting bans (Regulation (EU) 833/2014, Annex XV) cover at least RT English, RT UK, Sputnik, Rossiya 24, TV Centre International, NTV/NTV Mir, Rossiya 1, REN TV and Pervyi Kanal; the full list has "more than a dozen" entries and must be read from EUR-Lex.

Exclusion groups (data, not code; see rules below):
- Group A, mandatory: `.ru`, `.su`, `.xn--p1ai`, `.by`, `.xn--90ais` and every subdomain.
- Group B, applied by default (owner decision, 2026-11-04, P125.2): every other top-level domain whose IANA sponsoring organisation or registry operator is a Russian or Belarusian entity. The group is enabled even though the list has not been reconciled with the IANA root zone database; the reconciliation stays `OPEN` and `NOT_VERIFIED`. Applied entries (best available knowledge, Punycode forms computed from the zone names): `rus`, `moscow`, `tatar`, `xn--p1acf`, `xn--80adxhks`, `xn--d1acj3b`. Cyrillic-script zones for "site", "online" and "org" were considered and are not applied because their registry operators are believed to be non-Russian; confirm against IANA. Any further entry found during the reconciliation is added to the data file, never to code.
- Group C, hosts outside those zones that Russian or Belarusian authorities own or control: start from the EU Annex XV list and add state-owned agencies and outlets from named primary or reputable registers. Applied by default, reconciliation with EUR-Lex still `OPEN`: `rt.com`, `sputnikglobe.com`, `sputniknews.com`, `tass.com`. Each entry records its source and retrieval date.

Implementation rules:
- No country, host or zone is hard-coded in code or prompts (`AGENTS.md` §1 locale rule). The lists are a versioned data file validated by a test, loaded at start-up. A new environment variable is allowed only with `.env.example`, `docs/RENDER_ENV_CONTRACT.md` and runtime-config probe updates in the same patch.
- Normalise every URL host to lower-case Punycode (the WHATWG URL parser does this) and match the host or any subdomain, never a look-alike suffix.
- Apply the filter to provider result links before the digest is built, to page-fetch targets and to every redirect hop; keep excluded items out of sources, digest and page fetches.
- Diagnostics record the number of results dropped per group, never the dropped text.
- If filtering leaves no evidence, the status is `no_relevant_data` with reason `source_policy_filtered`, and the reply says so plainly; it never claims missing internet access.
- Add one short conversation-prompt rule: answer in the user's language; do not cite or rely on state-controlled outlets of Russia and Belarus; prefer international and regional sources. Without search the main model cannot be forced; measure it with replay tests and report the result honestly.
- Known limits to state in the report: mirrors, archives, translation proxies, social platforms and aggregators that republish excluded content are not covered unless listed; the zone filter also removes harmless pages hosted in those zones.
- Open question O1 for the owner: whether an explicit user request or a task about an official Russian or Belarusian statement may bypass the filter. Default until decided: no bypass.
- Tests: results from every group never reach the digest; look-alike hosts and non-listed hosts pass; Unicode and Punycode forms match; redirect to an excluded host is dropped.
- Acceptance: replay of the 2026-11-04 election dialogue (diagnostics export as fixture) shows no excluded host in the evidence.

## 4. Work package WP3 — Workflow, test and diagnostics audit

Problem: seven workflows (`acceptance`, `architect-compare`, `carousel-verify`, `ci`, `expert-verify`, `information-quality`, `ops` under `.github/workflows`) and the 30 verification-DAG checks are partly stale or silent, and the same classes of failure recur.

- Step 1, audit only. For each workflow and each DAG check record purpose, last real signal, whether it ever caught a user-visible defect, and a disposition keep / update / merge / archive / delete (`AGENTS.md` §6). Deliver the table and stop for review. Do not start steps 2–4 before the owner has seen it.
- Step 2: replace source-text regex contracts with behaviour tests where the behaviour can run offline; keep regex contracts only for security and routing invariants.
- Step 3: add a replayable answer-quality suite built from real dialogues (the 2026-11-04 export is the first fixture). Checks per turn: search ran when needed; provider query was English and kept its entities; source hosts and tiers; old results marked; excluded hosts absent; the reply does not claim missing real-time access; unconfirmed claims are labelled.
- Step 4: extend the diagnostics export so an assistant can see what happened: search decision and reason, query language and queries sent, sanitised source titles, hosts, tiers and dates, digest length and hash, per-group filter counts, model and key-pool errors, timeouts and the fallback path of each turn.
- Every red CI names the failing contract in one line and carries the evidence needed to fix it.
- Acceptance: audit table delivered; red CI on intentional changes drops; a failed dialogue can be diagnosed from the export alone. Passing tests are not proof of user value (`AGENTS.md` G5); live checks stay `NOT_RUN` until run.

### WP3 scope extension — search routing and answer grounding (owner-approved 2026-11-04)

Evidence labels as in section 1. Source: the diagnostics export and render log of 2026-11-04 (release 124.40) and a replay of the dialogue through the gate functions in the 125.1 archive (INFERRED from source, reproduced locally; live `NOT_RUN`).

**Observed failure chain (one dialogue, nine turns, same question the user had to repeat):**

- Turn 1, a plain question about the current temperature in a named city: no search (`trigger_not_matched`). The deterministic pre-classifier recognises the text, but it runs only inside the planner, and the planner gate (`searchPlannerGate`) never lets this text reach it. The reply claimed no access to real-time data.
- Turn 2, an explicit request to search: the pre-classifier took the first preposition-led fragment as the place, so the place became a phrase containing the words for "current moment" and "in the city of" plus the city name. The weather connector found nothing after 7.9 s (`no_connector_result`), and extra provider queries mixed English with those source-language words, which pulled in Russian-language weather aggregators.
- Turn 5, "do the search and give me a reliable temperature from a reliable source": the pre-classifier matched the topic word, read only the current message, and searched a generic query with no place. The place named three turns earlier was lost.
- Turns 3, 4, 6 and 8, complaints and instructions about the search itself (why these sites, build the query like this, run exactly this query): no search (`not_freshness_candidate`). The model received no status block and answered that it had no search tool. A query dictated in quotes by the user was ignored.
- Turn 7, "you always have search, just make one more query": the planner call timed out after 8003 ms (the same model normally answers in about 1.5 s), the fallback searched the user's own meta wording (a query about the status of a live search tool), and the phrase "one more query" is not in the follow-up list (only "search" is).
- Turn 9: the model planner saw the dialogue, returned the place, the country code and a weather plan; the connector answered in 3.8 s from Open-Meteo and MET Norway with the national service among the sources. This path works; the other paths bypass it.
- The prompt tells the model not to claim it searched, but nowhere tells it that web search exists, and a skipped turn carries no status block (only questions about sources do). That is why the model invented "no search tool" on skipped turns.

**Work items.** Each item names the failure it removes. Suggested grouping for the first patch is items 1, 2, 5 and 6 (largest effect, smallest change); items 3 and 4 may follow. This is a grouping suggestion, not a next-session assignment (`AGENTS.md` §4, §5). Every item keeps the locale rule: no country, city, host, language-specific default or unit hard-coded in code or prompts; source-country and authority lists are data files.

1. Single search router. For every turn that shows a live-data topic, an instruction or complaint about the search, or a short continuation of a live thread, the planner model (which sees the dialogue) decides. The deterministic pre-classifier remains only as a latency shortcut and may not discard dialogue context: when the current text names no place and the dialogue does, the place comes from the dialogue. The pre-classifier must be reachable from the planner gate. Removes turns 1, 5 and 7.
2. Live-task state. Keep the last resolved plan of the dialogue (place, country, topic, freshness, query). Any turn about the search itself (again, other source, why these sites, run a query) is resolved against that plan, never searched by its own wording. Removes turns 3, 4, 6, 7 and 8.
3. Dictated query. When the user dictates a query (text in quotation marks after a request to search or to build a query), that text is the search query, translated under the WP1 rule and never rewritten or dropped. Removes turns 6 and 8.
4. Source constraint as a plan field. A user constraint such as "from sources of country X" becomes a plan field (`sourceCountry`) that sets the provider country parameter and ranks matching national authorities first. The list of national authorities is a versioned data file with source and retrieval date per entry, like the source policy; it is not code. For weather, the connector result is primary and the web results only corroborate; the answer states the value, the observation or forecast time and the service name.
5. Place extraction. Replace the first-preposition regex: use the planner's place and country; the deterministic fallback strips time phrases ("now", "right now", "today", "at the moment") and connecting words before geocoding, retries the geocoder with the trailing capitalised words, and never passes non-Latin leftover words to a provider query. A geocoding miss is logged with a reason code and returns quickly instead of waiting for the full connector timeout. Removes turn 2.
6. Honest status on every turn. Whenever web search is enabled, the prompt carries a short block: search is available; whether it ran this turn; the reason code; the rule never to state that there is no internet or search access. If the user's message asks for a search and none ran, the turn is forced into the search path rather than answered without it. Removes the invented "no search tool" replies.
7. Planner timeout. Cap the planner at 2.5-3 s (configurable, one constant) with a deterministic fallback that uses item 2 and the dialogue, not the raw wording of the turn. A slow planner call must not cost 8 s or search a meta phrase.
8. Diagnostics fidelity (extends step 4). The per-turn record carries the current user message (the export currently repeats the first message of the dialogue in `userRequest`), the gate decision and reason, the planner decision source, the resolved place and country, the connector outcome and reason, and real values instead of the string "undefined". The running release is written next to every record, and the export header states whether the running release equals the repository `package.json` patch.

**Tests and acceptance (WP3 extension).**

- Replay test: the nine-turn dialogue becomes a fixture, run through the pure gate, planner-fallback, place-extraction and context functions with the planner model stubbed. Per turn it asserts: search ran or not as intended; resolved place and country; provider queries are English and contain the place; no query contains source-language leftovers; the status block is present on skipped turns. The fixture is repeated with at least three other places and two other languages so the suite does not assume one country (`AGENTS.md` §1).
- Unit tests: place extraction with time phrases; quoted dictated query; instruction-only turns resolved against the stored plan; planner timeout fallback; the connector miss path returns within a small bound.
- Acceptance: in the replay no turn of that dialogue ends with a claim of missing search access; every turn that asks for the temperature carries the place of the dialogue; the answer to the last turn is reproducible from the first or second request without repeating the instruction. Live behaviour on the deployed service stays `NOT_RUN` until the same dialogue is run on the running release and the release is confirmed to equal the patch under test (`AGENTS.md` G5).
- Release check: before any live conclusion, confirm the running release in the diagnostics export equals the patch under test. Evidence recorded against a different release is labelled with that release and is not used to judge the patch.

## 5. Order and non-goals

Order: WP2 and WP1 can proceed first because they change what reaches the model; WP3 step 1 may run in parallel because it only reports. The WP3 scope extension (search routing and answer grounding) changes what reaches the model and may run alongside WP2 and WP1 work; it is user-visible and takes priority over audit work in the cascade (`AGENTS.md` §4, P2 before P4). Non-goals: model-carousel, key-pool and provider-routing changes; UI changes (if any entry or completion surface changes, `AGENTS.md` G4 applies); changing the trusted-source list of P124.39 without owner approval.
