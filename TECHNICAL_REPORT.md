## P131.9 live acceptance deployment gate
- **OBSERVED:** A generic production health HTTP 200 can come from the previous Render revision while the new commit is still deploying; it is not sufficient release identity evidence.
- **CHANGE PLANNED:** Gate the live job on `/health.commit == GITHUB_SHA[0:7]` before posting `manualRun:true`.
- **NOT_RUN:** post-fix CI, exact-commit health match, production search, provider calls and leads.

## P131.9 live trigger correction implemented
- **CHANGE:** Secret-authenticated automation may request `manualRun:true` to run as manual; secret calls without this flag remain schedule ticks. The CI live job now sends the flag and still requires 202 + runId. Scheduler remains `manual`.
- **NOT_RUN:** post-fix CI/live job, provider calls, accepted L1/L2 records and owner review.

## P131.9 live trigger — schedule/manual auth mismatch
- **OBSERVED:** Core CI #45867166358: Verification DAG SUCCESS. Production `/health` HTTP 200. The CI live job POST received HTTP 200 `{success:true, skipped:manual_only}`; Render logs show the secret-auth request was classified as `trigger=schedule` and skipped because schedule mode is manual. No runId, no search execution, no provider spend.
- **CHANGE PLANNED:** Distinguish secret-authorized manual automation (`manualRun:true`) from schedule ticks; update the CI request and route contract tests.
- **NOT_RUN:** actual production search, provider availability/calls, quality leads and owner review.

## P131.9 follow-up — 962a00b CI evidence
- **OBSERVED:** Core CI #45865962339 on d5abb14 SUCCESS. Core CI #45866668380 on 962a00b failed one test-only contract: it still read the deleted `.github/workflows/immofinder-test-search.yml`. The conditional live job was correctly skipped because its `needs: check-and-build` dependency failed.
- **CHANGE:** Update the contract test to assert the new `ci.yml` live-acceptance job, explicit commit marker, production service URL, run secret and removal of the old workflow.
- **NOT_RUN:** live production run via the new CI job.

## P131.9 — Technical CI green, live acceptance pending
- **OBSERVED:** Core CI #45865962339 on d5abb14 SUCCESS. Render deploy `dep-dc46hmq9lscs73dukgn0` LIVE. The issue-comment live-run workflow did not execute from the connector-created comment and has zero-job push failures.
- **CHANGE PLANNED:** Replace it with a bounded live acceptance job in Core CI, gated by an explicit commit marker and dependent on Core CI success. Report only sanitized listing evidence, result counts and actual provider-call counters.
- **NOT_RUN:** post-change live run, >=3 unique L1/L2 leads, owner review and actual billing spend.

## P131.9 follow-up — 4bb7de3 CI evidence
- **OBSERVED:** Core CI #45865555998 passed all checks except the Flatfox owner-name assertion: parser returned `Herr Max Muster Kontaktformular` instead of `Herr Max Muster`. The Swiss `3 ½ Zimmer` parser regression passed. Production build for 4bb7de3 succeeded; deployment is rolling out.
- **CHANGE:** Add a negative stop-token boundary for contact-page chrome in owner-name extraction; retain exact page-grounded name extraction.
- **NOT_RUN:** CI on this correction and live production search.

## P131.9 follow-up — 316b476 CI evidence
- **OBSERVED:** Core CI #45865131559 passed all checks except one `test:core` assertion: Flatfox's fetched detail had one candidate and one successful detail fetch, but classifier returned `rooms_unknown` for the Swiss half-room form `3 ½ Zimmer`. Other live adapter tests (HappyHoliday, Anibis SERP-only, dry-run, Gemini) passed.
- **CHANGE:** Extend the production room regex to accept whitespace before `½`; add an explicit classifier regression test. Remove the conditional from the workflow's push no-op so it always has a successful non-production job.
- **NOT_RUN:** CI on this correction and live production search.

## P131.9 follow-up — 6afd6a0 CI evidence
- **OBSERVED:** Core CI #45864768627: docs-integrity passed; test:core failed on two undefined test imports, one test's missing fetched binding and a default source-toggle assertion. The Anibis SERP-only test passed. Render build for 6afd6a0 succeeded; deploy is in progress.
- **CHANGE:** Add explicit test imports and local diagnostics, correct the dry-run binding and default source-count expectation; make the production-run workflow's push event a successful no-op.
- **NOT_RUN:** CI on this correction and live production source search.

## P131.9 follow-up — bcfb7f9 CI and production deployment
- **OBSERVED:** Render deploy `dep-dc46a58ae00c73d9km40` is LIVE; build and server TypeScript compilation succeeded, 30 DB migrations were already applied. Core CI #45863548736: 16/18 checks PASS; docs-integrity and test:core FAIL. Exact failures are recorded in the run log; do not report CI green.
- **CHANGE:** restore canonical docs sections, correct canonical URL fixtures and SERP-only Anibis test, detect natural-language seeker intent, and expose provider-call counts for live diagnostics.
- **NOT_RUN:** CI on the follow-up commit and live production search.

## P131.9 — C131 source-first CI and recovery retirement
- **OBSERVED:** #45862026277 on d8aa670: 15 ImmoFinder failures; 17 other DAG stages passed. Render `bf` is auto-deploy-on-push from `main`.
- **CHANGE:** align current category tests to the production source-first path; remove automated legacy-search payload restoration and backup artifacts.
- **NOT_RUN:** post-change CI, live source workflow, production health identity, provider spend and >=3 owner-reviewed leads.

## P131.8w — ImmoFinder audit and CI reconciliation
- **OBSERVED:** Core CI run 45857907223 failed at 5875c9a on a stale Davos assertion and lock patch mismatch; both are corrected on main @ d8298f1.
- **CHANGE:** Reconciled module, architecture, API, test and user-value status; patch/lock/repair stamps aligned to 131.8w.
- **NOT_RUN:** hosted CI on d8298f1 and this commit; P131.8v deployment, provider spend, post-change yield and owner review.

## P131.8v — Bounded discovery and owner-evidence assist
- Live runner adds rotating Serper discovery for Flatfox, Anibis and Tutti. Six communes are selected per run from the persisted full 121-locality scope; at most 18 queries/run with a minimum 3s interval. Only detail URLs passing the portal allowlist and configured detail pattern are fetched.
- Production minimum rooms is hard-clamped to 3 at run time. Anibis/Tutti are included in the active runtime source set. Existing strict page-level classifier, owner/contact gate, robots/SSRF controls and 48-detail/240s caps remain.
- Gemini LIGHT review is limited to 3 borderline L1 candidates/run, only when an actionable contact route already exists. An L2 promotion requires an exact quote present in the fetched page and a deterministic private-owner phrase check.
- Estimated maximum per-run provider cost: $0.018 Serper + $0.006 Gemini = $0.024. This is a configured estimate, not an observed charge. Schedule and notifications remain off.
- **Deployment/live result:** PENDING. **Yield acceptance:** OPEN until at least 3 unique L1/L2 listings are reviewed. **Hosted Core CI:** NOT_CONFIRMED; no workflow status is available through the current connector.

## P131.8u — Actionable evidence gate and pilot revalidation
- Earlier live runs exposed weak rows: 14 cards were visible but included title/navigation-only HappyHoliday shells, placeholder phone numbers and wrong locality/room counts. These are not counted as quality leads.
- P131.8u hides all exploratory rows pending fresh fetch, clears their seen-cache, and only allows recovery when the new detail passes classifier and write-time hard gates. The new pipeline also requires an actionable direct or platform contact route.
- Added named-host extraction, platform enquiry/contact-details recognition, parsed price/currency storage and UI display; fixed "Schlafzimmer" being parsed as total rooms; added Flatfox direct rental adapter.
- Active sources: HappyHoliday, Ferienhausmiete, Flatfox. Anibis/Tutti and all unsupported legacy/paid sources disabled. Serper/LLM/Jina calls remain 0; local browser fallback capped at 3 pages/run.
- Render `KEEP_ALIVE=false` confirmed in production logs; schedule manual and delivery off.
- **P131.8u live revalidation:** PENDING after deploy. **Hosted Core CI:** NOT_CONFIRMED; GitHub status connector returns no check statuses. Do not mark WP5 acceptance complete yet.

## P131.8t — Flatfox source expansion
- Added Flatfox direct rental index/detail adapter, price/rooms/advertiser parsing and host allowlist. Active direct sources are now HappyHoliday, Ferienhausmiete and Flatfox; Anibis/Tutti paused after 403.
- Manual-only, no delivery, no Serper/LLM/Jina. Local Chromium cap 3 renders/run on allowlisted hosts only.
- **Flatfox live pilot:** NOT_RUN at report time. **Second full-canton revalidation run:** pending. **Hosted Core CI:** NOT_CONFIRMED; connector reports no check statuses.

## P131.8s — Production quality correction
- **P131.8r live run:** 87 candidates, 24 detail fetches, 16 rows written hidden by write-time quality rules; 0 visible verified leads. HappyHoliday 12/12 classifier-kept but hidden by quality repair (holiday/locality/room reasons); Ferienhausmiete 4/4 classifier-kept but hidden (three false seeker flags, one agency/list page). Anibis and Tutti both HTTP 403; no detail fetches. Estimated paid-provider cost: $0.00.
- Reviewed records exposed locality substring errors (Solavers/Avers, Haus Katrin/Trin, Tga Davos Nord/Savognin), Swiss half-room parsing and a placeholder phone number. No bad rows were presented as visible leads.
- P131.8s fixes token-aware locality in both classifiers and write-time gates, prioritizes description locality, parses 2 1/2 and 4 1/2 rooms, requires substantive page detail, rejects agency listings and placeholder numbers, and removes the generic seeker-nav false positive.
- HappyHoliday/Flatfox short pages can use at most 3 local Chromium renders per run; only those two hosts are allowlisted. Fresh defaults and migration enable only HappyHoliday/Ferienhausmiete/Flatfox; Serper, LLM, Jina, recurring schedules and all notifications remain disabled. Anibis/Tutti paused after 403.
- **Second live run:** NOT_RUN at report time. **Hosted Core CI:** NOT_CONFIRMED; GitHub status connector returned no check statuses. Render build/TypeScript succeeded for P131.8r.

## P131.8r — Full-canton source expansion
- Configured all 100 official Graubünden municipalities (14.09.2026 list) plus 19 locality aliases. Saved production settings are migrated once to full scope, 2+ rooms, all configured sources enabled, manual schedule and delivery disabled.
- Direct-only live adapters: HappyHoliday, Ferienhausmiete, Anibis and Tutti. Caps: 6 index pages/source, 12 detail pages/source, 48 details/run, 240 seconds. 1.5s per-host delay and robots/SSRF guards retained.
- Fixed locality matching for Swiss postcode commas, hyphenated Zimmer labels and broad false agency matches. Paid search/LLM/Jina/browser fallback remains off.
- Production deployment, real source fetchability, accepted lead yield, hosted CI: NOT_RUN at report time.

## P131.8q — Source-first production path (EXPERIMENT)
- Added bounded live runner in `server/immofinder/live.ts`; production route now uses it. Only direct HappyHoliday/Ferienhausmiete source adapters; no Serper, LLM, Jina or browser fallback. Strict fetched-page evidence, locality/rooms/agency/seeker gates; max 12 detail fetches and 180s/run; recent results cached and blocked sources stopped early.
- Runtime GitHub commits disabled; DB/Render logs remain. Diagnostics/health Actions manual-only; health commits use `[skip render] [skip ci]`. Idle worker polling reduced to 15s. Production deployment and CI/user-value: NOT_RUN at report time.

## P131.8p — Preflight immutability
- **OBSERVED in source:** Preflight patched `immofinderRepair.ts` and invoked a test-restoration script. Both mutations removed; regression guard added. Hosted CI: NOT_RUN.

## P131.8o — Single roadmap
- **CHANGE:** `docs/ROADMAP_C131.md` retired from the allowlists; `ROADMAP.md` is the only roadmap.
- **NOT_RUN:** hosted CI after the manual deletion.

## P131.8n — Roadmap consolidation
- **CHANGE:** C131 log and ordered quality plan recorded in `ROADMAP.md`; version metadata 131.8n.
- **NOT_RUN:** hosted CI for 131.8j–131.8n; Render commit identity; live yield (last short tests: 0 kept).

## P131.8m — SERP pipelining
- **OBSERVED:** run `d470cbb4`: 12/17 queries, 0 kept; resolve latency fixed 15-23 s per goto query; P131.8l parallel resolve not confirmed as cause of the gain.
- **CHANGE:** next Serper call prefetched during candidate processing.
- **NOT_RUN:** live re-measure; hosted CI.

## P131.8l — Parallel Serper resolve
- **OBSERVED:** run `b8e86208` (c78fa4e): resolve ≈93 s of 142.6 s, 8/17 queries, 0 kept; HappyHoliday 82/82 geo skips, no early stop.
- **CHANGE:** per-row parallel `/resolve`.
- **NOT_RUN:** live re-measure; hosted CI.

## P131.8k — Early-stop streak excludes prefetch geo skips
- **OBSERVED:** HappyHoliday 738 candidates / 20 fetched / 0 kept over 4 runs; early stop after 14 skips.
- **CHANGE:** URL/title geo skips no longer count toward `consecutiveBad`.
- **NOT_RUN:** live yield change; hosted CI.

## C131 state snapshot (docs only)
- **OBSERVED:** WP0 done; WP1-WP4 partial; WP5-WP7 not started; new engine under `server/immofinder/` exists but legacy is live.
- **CHANGE:** roadmap status and open-work list recorded in `docs/ROADMAP_C131.md`.
- **NOT_RUN:** hosted CI and production deploy identity on main @ 0413898.

## CURRENT EVIDENCE NOTE
Evidence is run-scoped and labelled OBSERVED / INFERRED / NOT_RUN. Hosted CI, live search yield and owner review are reported separately from local unit results.

## Evidence boundary
This report records implementation and verification state only. It does not assign the next session task and does not claim user value from green unit tests alone.

## P131.8g — Source-first HappyHoliday pilot
- **OBSERVED:** index `happyholiday.ch/area/graubuenden/` → 25 unique detail URLs; 6 fetched; new engine kept 4 (2× L2 private+direct Lenzerheide, 2× L1). Seeker false-positive from «suchen/Suche» chrome fixed.
- **CHANGE:** tighter SEEKER_RE; `scripts/immofinder-source-pilot.mjs`; patch 131.8g.
- **NOT_RUN:** hosted Core CI green on this head; production deploy; Serper-backed discovery.

## P131.8d — Preflight exception for server/immofinder/
- **OBSERVED:** test:models flagged WP3 paths as nested folders.
- **CHANGE:** allow server/immofinder and sources; delete empty placeholder.
