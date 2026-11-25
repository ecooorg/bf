## P131.5h implementation status — 2026-11-25
- Corrects the P131.5g smoke-run trigger: explicit test/dry-run query flags are accepted only through run-secret middleware; bounded mode exercises phase-1 direct sources plus capped discovery in Full mode.
- First production-connected workflow attempt was NOT_RUN (HTTP 200 `skipped:not_due`); post-fix run is pending.
- WP2 remains partial; WP5 and WP6 remain open; WP7 remains conditional.

## P131.5g implementation status — 2026-11-25
- Settings disclosure is changed to an explicit accessible React button/panel; regression contract added.
- Agent-operated test search is a secret-gated, forced dry-run with hard limits (3 sources, 1 commune, 3 result pages, 2 detail pages/source, 90 seconds); no listing/cache writes.
- WP2: bounded diagnostics harness proposed; configured-fetcher scorecard remains pending.
- WP6: last manual Full run completed but only one L1-only, over-budget seasonal listing surfaced; no L2/L3-qualified result.
- WP7: conditional; not triggered until WP6 has a measured recall gap against an approved independent benchmark.

## P131.5f implementation status — 2026-11-25
- Corrected the P131.5e CI version-stamp mismatch by aligning `REPAIR_RULES_VERSION` with package patch `131.5f`.
- Core CI failure evidence was a stale `131.5d.5` repair stamp; no product-search logic changed.
- Hosted verification on this exact head and all live WP2/WP5/WP6 evidence remain NOT_RUN.

## P131.5e implementation status — 2026-11-25
- Main-push repair now preserves the current core; stale P130.16 payload restoration requires explicit `FORCE_IMMOFINDER_CORE_RESTORE=1`.
- Added a regression contract assertion and advanced patch metadata to `131.5e`.
- Hosted CI, encrypted snapshot restore drill, configured-fetcher pilot, WP6 Full runs and conditional WP7 remain NOT_RUN.

## P131.5d implementation status — 2026-11-25
- Health snapshot deduplication now includes check details, so a changed deployed-commit gap produces a new snapshot even when the overall WARN/FAIL state is unchanged.
- Latest observed production health (14:47 UTC): Render version `130`, commit `2ee99cb`, 488 commits behind main; deploy remains unverified.
- Hosted CI pending; WP2 fetcher pilot, WP5 restore/legacy retirement, WP6 deployed Full runs and conditional WP7 remain open/NOT_RUN.

## P131.5c implementation status — 2026-11-25
- P131.5 `INFRA_FAIL` reporting and P131.5b post-release health trigger are in `main`; Core CI passed 18/18 and Answer Quality passed.
- Latest health snapshot remains 08:25 UTC (production version 130 / commit `2ee99cb`, 369 commits behind main); the post-release probe awaits the next main push.
- WP2 fetcher pilot, WP5 restore/legacy retirement, WP6 full runs and conditional WP7 remain open/NOT_RUN.

## P131.5b implementation status — 2026-11-25
- ImmoFinder code/config/patch pushes to `main` trigger the existing read-only Render/GitHub health check; no deploy action or DB mutation is performed.
- The probe will record deployed commit identity, runtime health and latest-run status after release.
- Hosted CI pending; configured-fetcher pilot, WP5 restore, WP6 full runs and conditional WP7 remain open/NOT_RUN.

## P131.5 implementation status — 2026-11-25
- All-Serper-failure runs with zero candidates/pages are classified `INFRA_FAIL`, persisted in run counts and shown as an infrastructure status rather than a quality result.
- Core CI `45636126675` passed 18/18 DAG checks and Answer Quality `45636126454` passed; successful empty searches remain `COMPLETED`.
- Production deploy identity, configured-fetcher pilot, WP5 restore/legacy retirement, WP6 full runs and conditional WP7 remain open/NOT_RUN.

## P131.5 implementation status — 2026-11-25
- All-Serper-failure runs with zero candidates/pages are now classified `INFRA_FAIL`, persisted in run counts and shown as an infrastructure status rather than a quality result.
- Successful empty searches remain `COMPLETED`; search budgets and L1 admission rules are unchanged.
- Latest health snapshot (08:25 UTC) reports production version `130`, commit `2ee99cb`, 369 commits behind main. Hosted CI pending; configured-fetcher pilot, WP5 restore, WP6 full runs and conditional WP7 remain open/NOT_RUN.

## P131.4 implementation status — 2026-11-25
- Retained fetched HTML per candidate and bound platform contact-form verification to the identity-matched page; added L3 positive/negative regressions.
- Corrected Core CI typecheck failures from the initial P131.3 merge; PR-head Core CI `45633920254` passed 18/18 DAG checks and Answer Quality `45633920285` passed.
- WP2 configured-fetcher pilot remains NOT_RUN; latest carousel run `c9912bcf` had 20 Serper HTTP 400 credit failures and did not exercise direct sources. WP5 encrypted snapshot commit `a1ce09e` exists (14:21 UTC), but restore integrity/legacy-consumer retirement are unverified. WP6 has no accepted full run; deployed runtime is stale. WP7 was assessed and not triggered without a WP6 recall gap.

## P131.3a implementation status — 2026-11-25
- Replaced synthetic Gold-label scorer with no-label invariant replay; no precision/recall claims.
- L3 drafts require page-grounded owner/contact/listing evidence; platform route requires a structured message form.
- Hosted CI pending; live source pilot and production acceptance remain NOT_RUN.

## P131.3 implementation status — 2026-11-25
- L3 drafts now require exact private-owner evidence and a page-evidenced direct/platform contact route; unsupported applicant claims are removed.
- Hosted CI pending; live letter review and production search remain NOT_RUN.

## P131.2 implementation status — 2026-11-25
- Page-grounded locality is a final TrustEngine requirement; URL/query hints are discovery-only.
- Contact enrichment is explicit opt-in and disabled by default with zero budget.
- Hosted CI pending; configured-fetcher pilot and WP6 live runs NOT_RUN.

# C131 owner amendment — 2026-11-25 (D-2026-11-25-03)

The Navigator has confirmed that no 60-record owner-labelled Gold Set or further owner labels will be supplied. This is not a project blocker. WP1 uses existing run/event diagnostics, sanitized public-page evidence in the repository and deterministic provider-free invariant tests. No labels are fabricated and no precision/recall claims are made without independent labels. WP3/WP4 may proceed after this no-label baseline and the existing WP2 public scorecard; configured-fetcher pilot measurements remain required before source-tier promotion. WP6 live runs remain distinct from CI. WP7 is conditional on an observed live recall gap.

## C131 — ImmoFinder reset: one objective, one engine, one measurable rule set (WP0–WP1 DONE; WP2 PARTIAL; WP3–WP4 IN PROGRESS; WP5–WP7 OPEN)

- Status: programme recorded from the owner-requested audit of P128–P130 (`audit_immofinder.docx`, owner upload, 2026-11-25) plus assistant proposals marked **[A]**. Nothing below is implemented or verified; every live outcome is `NOT_RUN`. Owner approval of WP0 is required before normative text (`TECHNICAL_SPECIFICATION.md` P128, `docs/DECISIONS.md`, `config/immofinder.json` `quality`) is changed. Cycle identity: version `131`, first product patch `131.1`; this record is non-product and does not change `package.json`.
- Working rules: the C127 operating rules (`AGENTS.md` §0) are adopted for C131 unless the owner decides otherwise: `docs/EXPERIMENTS.md` entry before answer-path code; measure before and after; one hypothesis per primary patch; complexity budget; no example fitting; the holdout is labelled by the owner, not by the coding session.

### 1. Why a reset (evidence from the audit; not re-verified here)

- **Objective drift.** P128 = find private owners of furnished/tourist/short-term homes (>=3 rooms, 44 localities) and offer a lease of >=3 years; second type per P128.007 = private long-term direct offers. P129–P130 turned this into "current long-term listings with monthly price, date and direct contact". `quality` in `config/immofinder.json` still sets `requirePrice`, `rejectNonMonthly`, `requireContact`, which contradicts P128 (price is not an exclusion criterion; `platform_only` is allowed).
- **Vanity metric.** Run `072836e3` (2026-11-22): 152 Serper queries, 93 candidates, 72 pages, 70 LLM calls, USD 0.304, `credible_kept` = 6. Audit review of the 6 records: none acceptable (three snippet-only, one parking space, one wrong locality, one agency listing).
- **Starvation.** P130.17 fail-closed gate was never audited live; the P130.18 run had 162 of 190 results as Google `/goto` redirects, 8 processed, 0 admitted. P129.44: 125 of 145 refetches returned HTTP 403.
- **Layering.** 17 ImmoFinder server modules, about 434 KB by file size at commit `1fa089a` (Core 76, Pipeline 76, Routes 58, Repair 45, Store 30, Delivery 27, Contact enrichment 21, Fetcher 17, Refresh 14, others under 13 each), plus 26 apparent patch-transport leftovers in `server/` (`*.b64.*`, `*.zlib.b64.*`, `immofinderStore.ts.part*`). Reference tracing is part of WP1 and is `NOT_RUN`.
- **What worked and is retained.** Owner catalogs (Ferienhausmiete, Surselva) were the only sources that yielded owner contacts (P128.8); save-without-contact with `platform_only` (P128.9); broad candidate pool before page caps, geography before LLM, priority/extended waves (P128.19–P128.21); evidence-first (P129.30); spend limits (P129.44); durable queue/lease (P130.17d); polite fetcher; encrypted snapshot; Drive/Telegram delivery.
- **What is retired.** Mandatory price, mandatory direct contact, mandatory publication date as admission conditions; `kept`/`credible_kept` as success measures; snippet-built cards; unbounded fallbacks; unmeasured source additions; criteria changed without replay on historical examples.

### 2. Search constitution (target rules; normative only after WP0 owner approval)

- **R1 Objective.** Two result types only: `tourist_owner` (private owner of a furnished/tourist/seasonal/short-term home; three-year lease proposal) and `direct_offer` (private long-term offer; different letter). Everything else is a typed reject.
- **R2 Required vs optional.** Required for storage (level L1): a concrete detail page was fetched; final URL equals the record URL; locality is in the 44 with page evidence (address/title); residential apartment or house; >=3 rooms confirmed by page text; not a seeker post, sale, parking space, commercial unit or shared room; not a stop-list agency or company-operated; not expired when a date is visible. Optional and never a reject reason: price in any period, publication date, direct contact, phone, photos. Changing this list needs an owner decision in `docs/DECISIONS.md` plus a gold-set replay.
- **R3 Levels, not a single gate.** L0 candidate (URL or snippet only; never shown, never counted) → L1 verified listing → L2 owner reachable (private owner evidenced + contact route: `direct`, `platform_message` with instruction, or `none`) → L3 letter ready. UI and delivery show L1+ with the level. A separate `manual_check` queue (snippet-only hosts, unparseable pages) is not counted as results.
- **R4 Evidence per field.** Every stored field = {value, verbatim quote, source URL, fetch time}. One record = one URL. No merging across pages or sources; a contradiction leaves the field unset with a flag, never an average. Portal service contacts are never owner contacts.
- **R5 Snippet is never evidence.** A search snippet may only decide whether to fetch.
- **R6 Cheap gates first, fixed order.** Geography (URL/title/snippet) → host/type → dedupe → fetch → deterministic extraction → classification → optional bounded LLM → owner/contact routine. Each stage has a spend cap and exits with a reason code.
- **R7 Closed reject taxonomy.** Every reject carries one code (for example `not_detail_page`, `agency`, `outside_target`, `rooms_below_min`, `rooms_unknown`, `not_residential`, `seeker`, `expired`, `fetch_blocked`, `duplicate`). Counts per code appear in every run report, and a fixed-size random sample of rejects is exposed per run for false-reject audit.
- **R8 Honest metrics.** Success counters are `verified_L1`, `owner_reachable_L2`, `letter_ready_L3`, `owner_confirmed_good`. Infrastructure failures (blocked fetch, unresolved redirect, provider error) are reported separately from quality (C127 rule 8); a run whose fetch-failure rate exceeds a configured threshold is `INFRA_FAIL`, not "0 found".
- **R9 Source admission.** A source enters only with an adapter, at least 5 saved fixture pages, a measured pilot (fetchability, verified leads, cost) and a scorecard entry. A source with zero L1 over a configured number of runs is demoted automatically. No source-list expansion without per-source measurement.
- **R10 Owner discovery first.** Prefer sources that expose the owner (owner catalogs/profiles, municipality and tourism-organisation pages). One owner with several objects yields several records under one owner key (normalised phone/email or name+locality).
- **R11 Budget.** Per-run caps for search queries, page fetches, LLM calls and rendered browser pages; no unbounded fallback; repeated contact search off by default; cost per L1 and per L2 reported every run.
- **R12 Letters.** Prepared only for L2 records and only from verified fields; German; template by result type; never sent automatically; the anti-fabrication verifier is retained.
- **R13 Change control.** Any change to R2, thresholds or source tiers: EXPERIMENTS entry first, offline gold replay before and after, no drop in gold recall, one hypothesis per patch, three failed hypotheses in one area stop that area (C127 rules 1–3). No strings taken from specific eval or user examples in code, prompts or tests (C127 rule 6).
- **R14 One engine.** No parallel legacy path, no per-source ad-hoc patches outside adapters, no new regex without a deletion or a measured gain.

### 3. Target architecture [A]

New directory `server/immofinder/` (target: at most 8 modules and at most 50% of the current ~434 KB, delivery/store/snapshot included). Pure stage functions with typed input/output; every classification is reproducible offline from a saved page snapshot at zero provider cost.

- `sources/` — one adapter per source: `discover()` returns detail URLs; `extract(page)` returns typed fields with quotes, using structured data first (JSON-LD, OpenGraph, microdata, embedded page JSON) and source-specific selectors second. An adapter-less host yields only L0/`manual_check` until WP7(a) proves otherwise. Serper is a discovery channel for detail URLs, not a source of facts.
- `access` — robots, per-host delay, timeouts, redirect resolution, snapshot store; bounded browser rendering only for hosts marked `js_required` in the scorecard; hosts with persistent 403 are marked `blocked` and not retried.
- `classify` — R2 gates → level + reject code (pure function of snapshot + config).
- `owner` — private-vs-agency evidence (owner-catalog membership, "von privat" markers, stop-list, company-form markers), contact routes, owner key, bounded secondary search.
- `run` — planner, budgets, delta detection by index-page URL-set hash (an unchanged index costs no fetch, search or LLM call), reuse of the durable queue/lease from P130.17d.
- `store` / `deliver` / `snapshot` — existing behaviour kept behind unchanged interfaces.
- `letter` — two templates, verifier.

### 4. Work packages

Order: WP0 → (WP1 ‖ WP2) → WP3 → WP4 → WP5 → WP6; WP7 only on evidence. No engine code before the available-evidence WP1 baseline and WP2 public scorecard are recorded (C127 rule 1); owner-labelled Gold data is explicitly not part of this programme. Patch numbers are assigned per `AGENTS.md` §2 when shipped. New checks go into existing category suites from `docs/TEST_MAP.md`; no per-patch test files.

| WP | Class | Content | Exit evidence |
|---|---|---|---|
| WP0 | MAINTENANCE (owner decision) | Record decision superseding the P130.17 gate and the "current long-term offers" wording in the ImmoFinder quality section of `docs/ARCHITECTURE.md`; replace the P128 criteria text in `TECHNICAL_SPECIFICATION.md` with the constitution of section 2; re-define `quality` in `config/immofinder.json`. | Owner yes/no on R1–R14 and open questions below; docs integrity check; hosted CI `NOT_RUN` until run. |
| WP1 | EXPERIMENT | EXPERIMENTS entry; existing run/event diagnostic inventory (`072836e3`, `85549585` and retained runs); inventory of the ten sanitized Tutti/Homegate page-evidence records; provider-free invariant replay over retained fixtures (no owner labels, no precision/recall claim); reference trace of the 17 modules and 26 transport leftovers. No in-UI labelling workflow or owner-labelled holdout. | Operational baseline and invariant results recorded; harness green in CI without provider keys; deletion candidates listed with reference evidence. |
| WP2 | EXPERIMENT (measurement only) | Per-source scorecard for the 3 configured catalogs and 13 portals plus candidates [A]: owner-profile pages, municipality and tourism-organisation holiday-home listings. Per source: fetchability (HTTP status, robots, JS), detail-page structure, owner/contact exposure, private/agency marking, coverage of the 44 localities, request cost. Bounded request budget; no answer-path code. | Scorecard in `docs/EXPERIMENTS.md`; owner picks tier-1 (at most 5 sources) and sets the volume target (N L2 leads per run) from observed catalog size; decision whether Serper stays as detail-URL discovery. |
| WP3 | USER_VALUE | Engine of section 3 for tier-1 sources: adapters, `access`, `classify`, `run`; deterministic extraction; reject taxonomy; run report with R8 counters. | No-label invariant replay meets section 5 invariants; typecheck/build/CI results recorded as such. No precision/recall claim. |
| WP4 | USER_VALUE | `owner` routine, contact routes, platform-contact instructions, two letter templates, verifier. | L2/L3 pass saved-page invariants; live owner review of at least 10 generated letters remains a WP6/user-value task. |
| WP5 | MAINTENANCE | Switch run entry and routes to the new engine; delete the old Core, Pipeline, TrustEngine, Repair, RepairStore, Refresh and contact-enrichment code not reused, plus the transport leftovers, after reference check; remove obsolete config keys (`quality.requirePrice`, `requireContact`, `rejectNonMonthly`, host hacks in `skipHosts`) and obsolete tests. Pre-C131 records become `legacy_unverified`: hidden from UI and delivery, kept in the database, re-verified by URL with the new engine; snapshot taken first. | One pipeline path; byte budget met; no `.b64`/`.part*` files; Drive/Telegram contracts unchanged. |
| WP6 | USER_VALUE (live) | At least 3 consecutive live runs; owner reviews all L1+ records (or at least 30). | Section 5 live thresholds; `INFRA_FAIL` runs reported separately. |
| WP7 | EXPERIMENT (conditional) | Only if WP6 shows a recall gap, one at a time, each with hypothesis and rollback: (a) LLM extraction restricted to spans whose quotes are verified as substrings of the fetched text, for adapter-less hosts; (b) bounded browser rendering for `js_required` hosts; (c) additional source tiers. | Per-experiment record; revert on failure. |

### 5. Acceptance (proposed thresholds; owner confirms in WP0)

- Offline invariant replay: zero fields sourced from multiple URLs; zero snippet-only L1+; zero L1 locality admitted from URL/snippet alone. Precision, recall and false-positive percentages are NOT_MEASURED without independent labels.
- Live (WP6): the same precision on owner-reviewed records; at least N L2 leads per run with N set after WP2; at most 40 Serper queries per run (baseline 152 on 2026-11-22); cost per L1 and per L2 reported; `INFRA_FAIL` runs not counted as quality results.
- Size and structure: engine plus delivery at most 50% of the 434 KB baseline; single pipeline path.
- Green CI or gold replay is not user value; user value stays `NOT_RUN` until the owner has reviewed live records (`AGENTS.md` G5).

### 6. Guardrails, limits, open questions

- Non-goals: automatic sending of letters; changes to the Drive/Telegram contracts; changes to the 44 localities or the stop-list without an owner decision; touching the client workspace or the Drive client (`AGENTS.md` §2); scraping social networks; ignoring robots.txt. Historical P128–P130 records stay untouched.
- Known limits of the audit: not every one of the 100+ iterations was verified against raw events; early run logs are incomplete; user labels of past records are mostly missing; per-module reference tracing and source behaviour (JS, 403, structured data) are untested until WP1 and WP2.
- Open questions for the owner [A]: (1) confirm the R2 required set, in particular "rooms >=3 confirmed by page text" and whether `rooms_unknown` goes to `manual_check`; (2) keep `direct_offer` at the same priority as `tourist_owner`; (3) who labels the gold set and the expected volume (at least 60 records); (4) volume and cost targets after WP2; (5) are platforms on the stop-list (Airbnb, Booking and similar) permanently out of scope, although private tourist owners also list there.
