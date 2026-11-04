# C125 — Answer-quality programme (owner-approved scope, 2026-11-04)

This is the approved scope of cycle C125, not a next-session assignment. Each session still re-derives its task from current gaps (`AGENTS.md` §4); there is no `NEXT_PATCH.md`. Decisions: `docs/DECISIONS.md` D-2026-11-04-01 and D-2026-11-04-02. Plan entry: `ROADMAP.md`.

**Cycle rule.** Improving the quality of model answers is a separate cycle from model-carousel, key-pool, ops and CI-diagnostics work. C124 closes with patch 124.40 (this documentation patch). C125 starts at version `125`, patch `125.1` (`AGENTS.md` §2 cycle rules; sync lock metadata).

## 1. Evidence behind the programme

Labels: OBSERVED (diagnostics export of 2026-11-04, release 124.36, one Expert dialogue about the US midterms), INFERRED (source inspection), NOT_VERIFIED.

- OBSERVED: four time-sensitive turns ran no search; pre-classifier and fallback plans sent the user's own Russian wording to the search provider (`planSource: heuristic`); results came from Russian-language hosts, among them state-controlled outlets; a question about sources was searched as a web query. Fixed in P124.38 (search coverage) and P124.39 (English provider queries, trusted-source labels, old-result marking, same-name places).
- INFERRED: search queries are translated and shortened (`toEnglishSearchQuery` "max 14 words", planner "max 12 words", inputs cut to 500 characters, planner dialogue turns cut to 300 characters). The main conversation model receives the user's text in the original language.
- INFERRED: recurring red CI came largely from source-text regex contracts that break on intentional changes (for example the P124.36 navigation count), and the diagnostics export has no search-result text, so a failed dialogue cannot be fully diagnosed from it.
- NOT_VERIFIED: which retrieved page first carried the unconfirmed "Toledo" claim; whether the main model prefers Russian-language sources when search is off.

## 2. Work package WP1 — Query fidelity (search path)

Problem: shortening can drop key entities, numbers, negations and constraints.

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
- Group B, verify then apply: every other top-level domain whose IANA sponsoring organisation or registry operator is a Russian or Belarusian entity. Candidates to check, not yet verified: `.rus`, `.moscow`, `.tatar` and the Cyrillic-script zones for "Moscow", "children", "site", "online" and "org". Take the exact Punycode forms from the IANA database, not from this document.
- Group C, hosts outside those zones that Russian or Belarusian authorities own or control: start from the EU Annex XV list and add state-owned agencies and outlets from named primary or reputable registers. Candidates to verify: `rt.com`, `sputnikglobe.com`, `sputniknews.com`, `tass.com`. Each entry records its source and retrieval date.

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

## 5. Order and non-goals

Order: WP2 and WP1 can proceed first because they change what reaches the model; WP3 step 1 may run in parallel because it only reports. Non-goals: model-carousel, key-pool and provider-routing changes; UI changes (if any entry or completion surface changes, `AGENTS.md` G4 applies); changing the trusted-source list of P124.39 without owner approval.
