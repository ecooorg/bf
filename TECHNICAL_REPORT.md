## P130.18b — CI corrective follow-up
- **OBSERVED:** Core CI `45469253660` exposed two test-contract mismatches; 175/177 core tests passed.
- **CHANGE:** Assert planned queries independent of order and require the checkpoint immediately after a successful batch; no runtime behavior changed.
- **NOT_RUN:** hosted verification after correction pending.
## P130.18a — Durable query checkpoints
- **OBSERVED:** P130.17d recovers PostgreSQL run leases but restarts the query plan from its beginning after process replacement.
- **CHANGE:** Persist completed-query keys, discovery page budget, cumulative counters and delivery acknowledgements; retry only incomplete queries and fail closed on lease loss.
- **NOT_RUN:** hosted recovery during an actual deploy and live listing yield pending.
## P130.18 — Hosted verification
- **OBSERVED:** Core CI `45468379261` passed on `7c245d5`; Render deploy `dep-dc2u4sijnfac73d5mogg` is live. Migration `029` is applied and the durable worker started; no worker poll errors were observed.
- **NOT_RUN:** a live search using `/resolve` and Playwright fallback, recovery of an actively running search during deploy, and user-visible listing outcome.
## P130.18 — Search evidence retrieval
- **OBSERVED:** baseline run `7c91fdb1` had 162/190 Google `/goto` links and direct fetches with HTTP 403 or zero extracted text.
- **CHANGE:** Added zero-credit Serper URL resolution and bounded Playwright detail-page rendering; monthly rent, rooms, date, status and advertiser-contact gates remain fail-closed.
- **NOT_RUN:** hosted build/CI, live fetch yield and user-visible listing outcome pending.
## P130.17d — Durable ImmoFinder execution
- **OBSERVED:** production run `7c91fdb1` stopped at query 19/68 when Render replaced its process; manual stop overwrote progress counters.
- **CHANGE:** PostgreSQL queue/leases, boot recovery, persisted cancellation and graceful worker drain; patch `130.17d`.
- **NOT_RUN:** hosted CI, recovery-after-deploy acceptance, live listing yield and user outcome pending.
## P130.17c — CI follow-up
- **OBSERVED:** Core CI `45454081551` failed `lint:copy` and 11 `test:core` assertions; Render deploy is live.
- **CHANGE:** Aligned fixtures with direct-page evidence, derived repair-rule stamp from package patch, and reject explicit already-rented notices.
- **NOT_RUN:** local checks; hosted verification pending.
## P130.17b — Render TypeScript follow-up
- **OBSERVED:** deploy `dep-dc2sv6k9v7es73bl625g` passed Vite but failed server type-check at `trust.reason`.
- **CHANGE:** Narrow rejection via `'reason' in trust`; patch metadata is `130.17b`.
- **NOT_RUN:** local build/tests; awaiting hosted verification.
## P130.17a — Render build repair
- **OBSERVED:** Render deploy `dep-dc2smm8m7kps73dbjuv0` failed on TypeScript syntax errors in `server/immofinderTrustEngine.ts`.
- **CHANGE:** Restored valid query templates and portal-host matching; patch metadata is `130.17a`.
- **NOT_RUN:** local build/tests; hosted verification pending.
## P130.17 — ImmoFinder trust engine
- **CHANGE:** Direct-main commits `31439cb`–`38e1fed` repair admission regexes, remove LLM extraction, add generated rental queries, and require page-confirmed rent, date, rooms, status and advertiser contact.
- **NOT_RUN:** hosted CI, local build/tests, live Serper yield, deployment and user-visible outcome.
## P130.11 — Single Recheck feed (2026-11-24)

- **CHANGE:** UI exposes one **Recheck feed** button. `POST /api/immofinder/recheck-list` still runs page refresh + `listing_unavailable` hide, then chains `recheckStored()` (local filters / price fix) before the job is marked finished.
- **NOT_RUN:** production click-through after deploy; delist patterns for every portal beyond existing `isListingUnavailable`.

## P130.5a — Core CI repair (2026-11-22)

- **OBSERVED:** run 44992823490 at 7cc8716: 8 failing tests in `test:app-builder`, `test:project`, `test:project-diagnostics`; all explained by the two causes above. The ImmoFinder health run was red only because it reads CI on main; its live GitHub App probe was OK and the latest run was archived.
- **LESSON:** `diagnostics-ops.test.mjs` runs in both `test:core` (tsx) and `test:project-diagnostics` (plain Node), so it must not import `.ts` modules.
- **NOT_RUN:** hosted CI after this patch.

## P130.5 — GitHub App probe and health snapshot (2026-11-22)

- **OBSERVED:** production logs: `github_app_contents_write_token_http_422 … not granted to this installation` ×20 at 130.4a; the code requests exactly `contents: write`. The poller had not completed a scheduled run for about five hours, and every poll run collected Render logs, which caused HTTP 429 from Render.
- **CHANGE:** live probe endpoint, health check and snapshot commit, poller cadence and log collection reduced.
- **NOT_RUN:** hosted CI, deployment, and a probe against the real installation; the cause of the 422 after the owner's permission change is not yet known and the probe is meant to show it.

## P130.4a — Health check first-run fixes (2026-11-21)

- **OBSERVED:** first run (Actions run 44948368394) hit Render HTTP 429 and pagination limit at a 1440-minute window; `/health` returned commit `0c1a239`; archive held `98c97e27` while a newer run existed.
- **CHANGE:** short-commit comparison, truthful collector failure, 180-minute window.
- **NOT_RUN:** rerun after merge; whether run `a4d2bb59` really had zero candidates is unverified.

## P130.4 — ImmoFinder health check (2026-11-21)

- **CHANGE:** Added a read-only daily GitHub + Render health check that names the failing GitHub publisher and status from Render logs; it reports, it does not repair.
- **NOT_RUN:** live execution against production, hosted CI, and the 403/422 fix itself (needs the GitHub App `Contents: write` approval).
- **KNOWN:** the baseline `package.json` said 130.2 while P130.3 code and report already existed; this patch continues as 130.4.

## P130.3 — ImmoFinder GitHub 403 publisher repair (2026-11-21)

- **OBSERVED:** The server diagnostics and encrypted snapshot publishers shared IMMOFINDER_GITHUB_TOKEN; both reached the GitHub Contents API read step and failed on PUT with HTTP 403. The GitHub Actions diagnostics poller archives successfully with its separate workflow token. The main branch API reports protected: false, and the repository rulesets endpoint returns an empty list, so branch protection/rulesets do not explain the denial.
- **ROOT-CAUSE BOUNDARY:** Runtime token permissions cannot be inspected from repository metadata or Actions logs. The evidence isolates the failure to the server credential's write authorization (or an installation/token access restriction), not to branch protection. The prior publisher discarded GitHub's response body, preventing the exact denial reason from being recorded.
- **CHANGE:** Server publishers now prefer a GitHub App installation token, minted for the exact configured repository and limited to contents:write. The App credential path is repository-identity checked; the legacy fine-grained token remains a compatibility fallback only when the App configuration is incomplete. Both publishers record a sanitized GitHub error message and request ID on API failures without logging tokens or listing data.
- **SECURITY:** Snapshot contents remain AES-256-GCM encrypted. The new write token is short-lived and repository-scoped; it is not persisted. No search portal, query, ranking, or acceptance rule was changed.
- **TEST:** Added a regression test covering token minting, repository scoping, successful diagnostics and encrypted snapshot PUTs, and safe 403 error detail.
- **PRODUCTION FOLLOW-UP (2026-11-21):** The first completed production run after deployment reached the GitHub App token endpoint but the repository-scoped `contents:write` token request returned HTTP 422 (`github_app_contents_write_token_http_422`). This is distinct from the earlier Contents API PUT 403 and indicates GitHub rejected the requested permission scope; the most likely remaining prerequisite is granting the App `Contents: write` and approving that permission for the existing installation. This PR adds sanitized GitHub response-message/request-ID capture; those details will become available after this PR is merged and the updated server is deployed.
- **VERIFICATION:** CI passed on the PR branch. Production success remains unverified until the App permission is updated and a completed run records both diagnostics and encrypted snapshot publishers as committed.
## P130.2 — Diagnostics collector auto-trigger

- **CHANGE:** run the diagnostics poll workflow on pushes to `main` that modify the poll workflow or platform-log collector, in addition to the five-minute schedule and manual dispatch. The path filter prevents report-archive commits from recursively triggering collection.
- **VERIFY:** workflow trigger contract added; live hosted execution after the change is not inferred from the contract.

## P130.1 — Render/GitHub platform-log collection and resilient rate-limit handling

- **CHANGE:** collect Render service logs through the Render Logs API with timestamp pagination; optionally collect a Render Postgres resource. Download logs for up to eight recent completed GitHub Actions runs.
- **SECURITY / RETENTION:** redact configured secrets, bearer credentials, common token formats, private-key blocks and database URL passwords. Upload the bundle as a 30-day Actions artifact; raw platform logs are not committed to the repository.
- **FAILURE HANDLING:** Render API requests retry up to four attempts for HTTP 429 and 5xx. Honor `Retry-After` as seconds or HTTP-date and `X-RateLimit-Reset`; otherwise use bounded exponential backoff. Emit structured `api_retry` warnings. A partial bundle is retained when either Render or GitHub logs are available; collection fails only when neither provider yields usable output.
- **CONFIGURATION:** `RENDER_API_KEY` is a GitHub Actions secret; `RENDER_OWNER_ID` and `RENDER_SERVICE_ID` are Actions variables; optional `RENDER_POSTGRES_ID` identifies a Render Postgres resource.
- **VERIFY:** regression contracts cover collection, pagination, redaction, retry headers, partial-provider output, artifact retention and archive-path preflight. Live provider access is environment-dependent and is not established by these contracts.

## P130.0 — Durable diagnostics handoff and polling

- **ROOT CAUSES:** server trace capture was not installed at startup; scheduled runs did not publish diagnostics; the direct publisher could skip when optional Render GitHub token/repository settings were absent.
- **CHANGE:** install structured log capture at server startup; persist completed manual and scheduled run reports in PostgreSQL; expose a read-only latest-report endpoint protected by the existing timing-safe run secret; retain the latest 100 reports.
- **WORKFLOW:** add a five-minute GitHub Actions poller that reads the authenticated endpoint, archives each new report under `data/immofinder/diagnostics/`, and uploads a run-specific artifact using the workflow token. No separate Render GitHub token is required.
- **POLL SAFETY:** diagnostics polling bypasses repair bootstrap and other mutating request middleware. Already archived run IDs are skipped to avoid duplicate archive commits.
- **VERIFY:** regression contracts cover durable storage, authenticated polling, manual/scheduled parity and workflow wiring. End-to-end Render-to-GitHub delivery requires a deployed app and a completed run.

## P130.x — Diagnostics archive push-race recovery (PR #33)

- **OBSERVED:** the diagnostics poll workflow could successfully fetch a report and build its archive, then lose publication when another actor updated `main`; the single `git push` failed with `[rejected] (fetch first)`.
- **CHANGE:** before each publication attempt, fetch and hard-reset to the latest `origin/main`, rebuild the diagnostics archive from the saved response envelope, stage only the diagnostics archive, and commit on top of current `main`. Retry publication up to five times with increasing 2-second-step delays. Exit successfully if that run is already archived; never force-push.
- **VERIFY:** PR #33 merged. The workflow logic is present on `main`; successful future publication is verified only by a subsequent scheduled/manual run.

## P130.x — Render API throttling and partial log bundles (PR #31)

- **CHANGE:** platform-log collection retries Render HTTP 429 and 5xx responses with bounded backoff and server-provided retry timing. Render and GitHub are treated as independent evidence providers: one provider's failure no longer discards a usable bundle from the other.
- **VERIFY:** PR #31 merged; regression assertions cover retryable statuses, both rate-limit headers, retry logging and partial-output exit behavior. A fresh live Render throttling event is not required by, and is not claimed by, these tests.

## P130.x — Automatic portal expansion toward ten verified listings (PR #32)

- **CHANGE:** preserve the full configured Swiss portal query pool separately from the user's selected portal subset. In carousel mode, if the selected subset produces fewer than ten kept/verified listings, and page/time budget remains, run the unselected configured portal queries as a fallback. The fallback stops once ten kept listings are reached, restores the original selected query set and offset afterward, and emits start/completion/target-reached diagnostics. Saved source toggles are not modified.
- **VERIFY:** PR #32 merged; regression contracts cover the selected/full query pools, the ten-listing threshold, remaining page budget and early stop. Actual yield of ten listings depends on live inventory and is not guaranteed.

## P129.53.10 — Bound migration startup and improve discovery coverage

- **CHANGE:** bound PostgreSQL migration-lock acquisition and apply statement, lock and query timeouts with phase-specific logs. Make the per-query detail-page cap configurable (default four, bounded one to six) to examine more SERP candidates without unbounded work. Replace opaque browser `Failed to fetch` errors with a clear ImmoFinder connectivity message.
- **VERIFY:** regression coverage added for migration wait bounds, candidate coverage and API network errors; production database lock behavior remains deployment-dependent.

## P129.53.9 — Atomic run locking and zero-hit portal observability

- **CHANGE:** serialize run starts across application instances with a PostgreSQL advisory transaction lock. Set the active-run lock lifetime to 50 minutes, beyond the 45-minute server deadline and aligned with the 50-minute UI indicator. Include portal query attempts and raw SERP hit counts even for portals returning zero results.
- **VERIFY:** regression coverage added for the atomic lock contract and per-portal query/hit counters.

## P129.53.8 — Safe redirects and bounded page downloads

- **SECURITY:** validate each direct fetch target and every redirect hop against the public-address guard; block redirects to loopback/private addresses. Fetch `robots.txt` without automatic redirects so redirects cannot bypass target validation.
- **PERFORMANCE:** stream only the configured response prefix and cancel oversized response bodies rather than downloading the entire page before slicing.
- **VERIFY:** regression coverage added for private targets, unsafe redirects and streaming byte limits.

## P129.53.7 — Publication-date semantics and slug-preserving redirects

- **CHANGE:** do not interpret `dateModified`, `article:modified_time`, `og:updated_time`, “Aktualisiert am”, availability dates or arbitrary page dates as the listing's publication date. Accept same-host canonical redirects when a distinctive non-numeric listing slug survives (including language-prefix changes); continue rejecting changed slugs or hosts.
- **CACHE:** bump the rule version so prior redirect rejections are reconsidered.
- **VERIFY:** tests cover publication-vs-modification dates and same-listing slug redirects.

## P129.53.6 — Remove inert controls and align run-state UX

- **CHANGE:** remove obsolete freshness/fallback controls; discovery intentionally runs without Google date filters and persisted legacy values are ignored. Clarify that the generic search source is private-owner web search, not a Facebook crawler. Extend the UI run indicator to 50 minutes, aligned with server execution limits.
- **VERIFY:** regression coverage added for legacy settings, truthful source labels and timeout alignment.

## P129.53.5 — Attribute SERP results to portal sources

- **CHANGE:** attribute Google `site:` search results to their configured portal IDs rather than the generic `search` source, making per-portal candidate/fetch/reject/keep counters meaningful. Exempt `search` and `portal-*` discovery sources from the catalogue early-stop threshold so selected commune coverage is not cut short by poor early results.
- **VERIFY:** regression coverage includes an eight-commune portal-query case.

## P129.53.4 — Preserve portal allowlists through final sanitation

- **CHANGE:** pass `ctxFromConfig(cfg)` into final record sanitation for dry-run and live discovery. This prevents valid non-standard Swiss portal detail URLs from being rejected because the final gate lacked configured portal hosts.
- **CACHE:** bump the repair/search rule version to reconsider candidates previously marked `list_or_search_page`.
- **VERIFY:** end-to-end regression test covers saving a valid Flatfox detail URL without a numeric ID or long SEO slug.

## P129.53.3 — Restore valid listings through shared URL and evidence gates

- **CHANGE:** fix the empty URL-regex alternative that classified every URL as a search/list page. Share one allowlist-aware detail-URL rule across discovery, write-time validation and stored-row rechecks; allow previously auto-hidden cards to recover when they pass the current gate. Permit verified long-term listings with unknown price; prefer gross/warm rent when both net and gross amounts appear. Treat Google SERP dates as diagnostics, not publication dates, and exclude HTML-head metadata from page-body evidence.
- **UX:** clarify that portal toggles select Google `site:` search targets rather than independent crawlers, and explain unknown-price behavior.
- **VERIFY:** Core CI coverage is recorded in the changelog; live discovery against production Serper and database remains a separate verification.

## P129.53 — Seen-cache purge and CI metadata repair

- **OBSERVED:** P129.52 package-lock root package patch is `129.51` while package.json/top-level lock patch are `129.52`; the project-mode contract asserts equality. Production seen-cache purge requested by owner.
- **CHANGE:** migration 027 truncates only `immofinder_seen`; package/lock metadata synchronized to 129.53; seen-rule version bumped.
- **VERIFY:** pending local checks below; production migration and post-deploy row count NOT_RUN.

## P129.52 — ImmoFinder incremental discovery and page-fetch recovery

- **OBSERVED:** 129.51 run logged only Zizers/Igis, no completion summary before process restart; 129.51 CI had five distinct ImmoFinder contract failures. Earlier recheck logs show widespread portal HTTP 403.
- **CHANGE:** flush candidates after each query; enforce at least four selected communes; no Google date cutoff for direct portal inventory; optional `finalUrl` compatibility with same-listing redirect validation; 30-character detail-text floor; verified Jina fallback; invalidate old-version `immofinder_seen` decisions; clear deleted listing URLs from `immofinder_seen`; retry transient `detail_page_*` / `not_single_listing` seen entries after six hours; candidate-level diagnostics.
- **VERIFY:** P0 **21/21**; quality **33/33**; five previously failing search-contract tests **5/5**; TypeScript transpile/syntax **7 files PASS**; version + docs integrity checks PASS. `npm ci` timed out, so full `tsc --noEmit`, production build, full agent-contract suite and hosted CI remain NOT_RUN; live portal yield NOT_RUN.

## P129.51 — ImmoFinder verified-page search admission

- **OBSERVED:** supplied run: 68 queries / 11 candidates / 2 fetched / 7 snippet-only; 2 snippet-only records were counted kept, and aggregate new disagreed with per-source new.
- **CHANGE:** broadened portal/private queries; month freshness; require matching fetched final URL + >=120 chars; reject hard write-gate failures before upsert; align counters. Delete behavior unchanged.
- **VERIFY:** `immofinder-p0` + `immofinder-quality`: **48 PASS**; Node TS syntax checks, config JSON, version check and docs integrity PASS. Full typecheck BLOCKED (missing `vite/client`); server typecheck BLOCKED (missing `@types/node`); `npm ci` timed out. Hosted CI and live Serper/portal/DB verification NOT_RUN.

## P129.50 — ImmoFinder GitHub snapshot and short-stay quality gates

- **OBSERVED:** Hosted CI run `44884418425` failed `typecheck` and `build:server` on `server/immofinderPipeline.ts:468`: `known` was out of scope; CI reported 16 PASS / 2 FAIL. `npm ci` timed out in this environment.
- **CHANGE:** Carried `knownAutoHidden` with each fetched page; after every completed manual/scheduled run, publish all DB rows (visible + hidden, contacts, addresses, URLs, evidence) to `data/immofinder/listings.snapshot.enc` via GitHub Contents API, encrypted with AES-256-GCM and a key derived from stable `SESSION_SECRET`. Short-stay/seasonal sources are discoverable again; cards require explicit amount+period, a fetched detail page, a concrete URL and a verified direct phone/e-mail. Added evidence-quoted `street_address` persistence and shared-card display.
- **VERIFY:** `immofinder-quality`: 33 PASS; `immofinder-p0`: 13 PASS; `agents-contract` excluding two dependency-blocked cases: 27 PASS / 2 SKIP; snapshot encryption round-trip + mocked GitHub commit PASS; Node TS syntax checks PASS; docs/version metadata PASS.
- **BLOCKED / NOT_RUN:** Full `agents-contract` has dependency-blocked cases (`express`, `jszip`); full TypeScript typecheck blocked by missing `vite/client` and `@types/node`; full production build and hosted CI rerun NOT_RUN. Production GitHub write, database migration on live PostgreSQL, live seasonal discovery and delivery to screen/Telegram/e-mail/Drive NOT_RUN.

## P129.49 — ImmoFinder primary-page verification

- **OBSERVED:** Supplied snapshot: 30 visible / 86 total; replay of the new audit hides 30/30 (29 lack direct-page evidence; one lacks final-URL provenance); web checks found 404s, a wrong-target redirect and a price conflict.
- **CHANGE:** Require fetched detail-page evidence, matching final URL and one unambiguous source-page price; persist URL provenance; version-salt audit ids; re-fetch and restore only auto-hidden cards that later pass.
- **VERIFY:** ImmoFinder quality + P0 suites: 46 PASS after baseline 42 PASS; typecheck **BLOCKED** (`vite/client` types absent); full build/hosted CI/live DB: **NOT_RUN**. Broader agents-contract run: 67 PASS / 2 dependency-blocked (`express`, `jszip`).

## P129.48 — ImmoFinder search defaults and CI contract

- **OBSERVED:** CI run `44876820408` had 17 PASS / 1 FAIL (nine env names missing); snapshot had 86 cards / 67 visible, and offline audit simulation yields 37 safe hide ops (27 missing-price, 10 suspect/non-monthly).
- **CHANGE:** Expanded 13-portal discovery and reset defaults; strict monthly-price audit hides weak saved cards, persists evidence-backed price repairs and republishes changed lists to configured channels.
- **VERIFY:** docs integrity, env coverage, version metadata and TS syntax PASS; `immofinder-quality` 29 PASS, `immofinder-p0` 13 PASS, `agents-contract` 21 PASS / 2 BLOCKED (partial dependencies).
- **NOT_RUN:** `npm ci` timed out; full typecheck/build and hosted rerun remain NOT_RUN; live search yield and screen / Telegram / e-mail / Drive delivery remain NOT_RUN.

## P129.47 — ImmoFinder assistant repair loop

- **CHANGE:** Full DB snapshot + repair queue in All Logs; authenticated preview/apply; idempotent repair ledger and bundled repair-file auto-apply; first-request audit, write-time gate and post-repair Drive/e-mail/Telegram refresh. **VERIFY:** six TypeScript transpile syntax checks and test-file syntax `PASS`; `npm ci` timed out. **NOT_RUN:** typecheck, suites, build, live DB and user-surface verification.

## P129.46 — ImmoFinder field collage (URL ≠ description)

- **OBSERVED:** export cards mixed Homegate/FB URLs with text/prices/contacts from other objects; moving24/rentumo/umzug pages kept. **CHANGE:** upsert by URL; host in canonical_key; service host reject; collage gate. **NOT_RUN:** live re-search; existing DB rows may still be mixed until recheck/hide.

## P129.45a — CI lock patch sync

- **FAIL:** run #44848885031 test:core `P127.11` expected lock.patch 129.45, had 129.44. **CHANGE:** package-lock patch fields + version:sync writes patch. **VERIFY:** local version check OK; hosted rerun NOT_RUN.

## P129.45 — ImmoFinder cards: verified fields only

- **OBSERVED:** Drive export and UI still showed “Source text (search snippet)” blocks and duplicated/garbage about lines. **CHANGE:** `immoEvidenceBlock` empty for exports; UI no longer renders evidence; about cleaned/dropped when unreliable. **NOT_RUN:** live re-export after deploy.

## P129.44 — ImmoFinder spend control and lean defaults

- **OBSERVED:** supplied logs show ~30 queries + up to 35 contact searches per hourly run, 21 new listings in ~11h, 125/145 recheck fetches HTTP 403. **CHANGE:** lean saved-and-reset defaults, real Serper call counters, no-rooms snippet skips the model, recheck contact search off. **NOT_RUN:** live spend and yield after deploy.

## P129.43a — CI TypeScript fix and install reliability

- **EVIDENCE:** run #44729762057 failed with 11 TypeScript annotations; two discovery geo checks passed 2 args to a 3-arg helper. **CHANGE:** fix both calls and false-positive truthiness; add regression test, npm retries/cache, 15m install timeout and stage timings. **VERIFY:** npm ci timed out locally; typecheck, suites and hosted rerun NOT_RUN.

## P129.38 — CI/Render: formatHideLog import + discovery rank test

- **FAIL:** typecheck/build `Cannot find name 'formatHideLog'` (used in deny path, missing from pipeline import). P128.3 expected FB before owner host after ranking change.
- **CHANGE:** import `formatHideLog` in `immofinderPipeline.ts`; agents-contract expects owner microsite before Facebook snippet-only.
- **BUGFIX.**

## P129.37 — Product precision gate + quality diagnostics

- **GOAL:** Fewer collage/junk cards; product-quality logs.
- **CHANGE:** Stronger credibility gate — unavailable (DE/EN), for_sale even with rent fragment, weak Facebook `photo.php`, rooms/municipality conflicts, expanded platform contacts (betterhomes, be-homes, einwohnerkontrolle, …). Evidence footer chrome strip (Flatfox About us / Imprint). Discovery ranks Homegate/Tutti/Flatfox above FB snippet-only. Soft-seen expanded for credibility rejects.
- **LOGS:** `immofinder_hide` one line per reject; `immofinder_product_quality_summary` with `credibility_denies`, `evidence_kind`, `credible_kept`. FUNNEL prints `credible_kept`.
- **USER_VALUE.**

## P129.36 — No duplicate Source text in exports

- **OBSERVED:** Doc/Sheet repeated the same snippet as about under “Source text”.
- **CHANGE:** `immoEvidenceIsRedundant` — omit Source text when near-duplicate of about; keep Source capture only if screenshot URL exists. Screen UI same rule.
- **USER_VALUE.**

## P129.35 — KeepAlive hard cadence

- **OBSERVED:** Sequential KeepAlive waited on hung `/api/health` during long runs; Render free tier could sleep past ~15 min idle.
- **CHANGE:** Independent schedule 11–13 min; 15s request / 25s visit budget; fast retry on failure. First ping 20–60s after boot.
- **BUGFIX.**

## P129.34 — Email content new vs all

- **OBSERVED:** UI setting emailContent all/new ignored on schedule path; manual path still required “fresh” to notify.
- **CHANGE:** Both deliverWave paths honor `delivery.emailContent`. `all` emails every visible listing (up to 60) even if wave had zero new. Telegram remains wave-new; Drive still full list.
- **BUGFIX.**

## P129.33 — Holiday gate vs monthly rent

- **FAIL:** agents-contract kept=0 — `/ferienwohnung/` paths treated as tourism despite “pro Monat” / Nettomiete.
- **CHANGE:** `isHolidayOrTourismListing` — monthly rent without night price is not tourism; pure Ferienhaus/nightly/tourism hosts still rejected.
- **BUGFIX.**

## P129.32 — Evidence-first import + about length contract

- **FAIL:** Pipeline body called `buildEvidenceText` / `credibilityRejectReason` without imports → TS2304, Render red. P129.7 about length ≤220 vs 360 excerpt.
- **CHANGE:** Full imports; contract allows about ≤360. Cumulative with evidence export surfaces.
- **BUGFIX CI/Render.**

## P129.31 — Source evidence under each listing in Drive

- **CHANGE:** Card model exposes evidenceText/kind/screenshotUrl. Sheet, Doc, email/Telegram append Source text (and capture URL when present). Screen shows non-redundant excerpt.
- **NOTE:** Later 129.36 stops emitting duplicate text; screenshots still optional/not captured.
- **USER_VALUE.**

## P129.30 — Evidence-first credibility (architecture → code)

- **CHANGE:** English architecture section “ImmoFinder search result quality”. Runtime: `buildEvidenceText`, `credibilityRejectReason`, `priceFromEvidence`, platform-contact strip; pipeline stores `raw.evidence_text` / `evidence_kind`; prefer evidence for price/description; recheck applies same gate; card about prefers evidence.
- **PRODUCT:** Prefer few coherent cards over many partial ones.
- **USER_VALUE.**

## P129.29 — Architecture quality contract (English)

- **CHANGE:** Docs-only section on evidence-first, consistency gate, metrics (`credible_kept`), anti-collage fields, non-priorities. Russian draft not applied (project English-only docs).
- **DOCS.**

## P129.28 / 129.28a — Card Delete + CI Latin UI

- **CHANGE:** Red Delete hard-removes listing from DB; remove Copy German letter / Status NEW blocks. 129.28a: English “Delete” (lint:copy forbids Cyrillic); contract no longer expects Status in email text.
- **USER_VALUE / BUGFIX.**

## P129.27 / 129.27a — Serper dates into listed_at

- **CHANGE:** Map Serper organic `date` into SearchHit; coerce relative/absolute into `parseListedAt` / declared date path. 129.27a typecheck for hitDate on page type.
- **USER_VALUE.**

## P129.26 — Why publish dates never stuck

- **OBSERVED:** Export of 106 cards shows only 6 with `published …`. Display path works when `raw.listed_at` exists.
- **ROOT CAUSE:** (1) `upsert` update branch did not touch `raw`, so a second fetch that found a date never saved it. (2) `listed_at_quote` from LLM was requested in SCHEMA but never read into Extract / parseListedAt.
- **CHANGE:** merge raw on update; wire listed_at_quote; SYSTEM prompt for date phrases.
- **LIMIT:** Facebook/snippet-only and 403 portals still often have no date in HTML — those cards stay without published until the source exposes one.

## P129.25 — Unavailable filter + CI green for date line

- **OBSERVED:** CI red on agents-contract (expected "Found:" after 129.24) and package-lock still on 129.23a; many cards for offline portal pages.
- **CHANGE:** `isListingUnavailable`; pipeline deny + refresh hide; no-cache fetch; contract tests + lock patch 129.25.
- **NOT_RUN:** live fetch of all 124 production URLs from this sandbox (no DB access); Facebook remains mostly unfetched.
- **SCOPE:** immofinderCore/Pipeline/Refresh/Store/Fetcher, agents-contract, immofinder-quality tests, package.json/lock, CHANGELOG, TECHNICAL_REPORT.

## P129.24 — Source publication date only; richer date extraction

- **OBSERVED:** Cards and exports still showed only search ("found") time; `raw.listed_at` was rarely filled. Recheck of ~119 rows: ~76% pages not fetched (Facebook/robots/blocks), only a handful of dates added.
- **CHANGE:** UI/export date line = publication only; `pageMeta` + `parseListedAt` cover more portals/languages; wider text window; tests for labelled dates and card rendering.
- **NOT_RUN:** Full npm install + typecheck + test:core in this archive (no node_modules); live Recheck list after deploy.
- **SCOPE:** src/immoCard.ts, src/ImmoFinder.tsx, server/immofinder{Core,Delivery,Pipeline,Refresh}.ts, tests/immofinder-quality.test.mjs, CHANGELOG.md, package.json.

## P129.23a — Recheck CI repair and rule-compliant patch

- **OBSERVED:** CI run `44494067893` failed on missing `dateDiagSnippet` and `parseListedAtDetailed` exports.
- **CHANGE:** Add exports; merge contracts into category suite; complete experiment/history/version/graph records.
- **NOT_RUN:** Full CI, live recheck quality, deployment.

## P129.23 — Show menu + publication date

- **OBSERVED:** Show menu had 6 items incl. status filters; cards carried only the search ("found") date although `raw.listed_at` was already parsed.
- **CHANGE:** menu = current/hidden/all (default current); `published` added to the shared card model, email text and Sheet/Doc; page-declared date (meta/JSON-LD) preferred in `parseListedAt`.
- **NOT_RUN:** live Drive/email delivery and real portal pages; rows saved before 129.23 show a date only if `raw.listed_at` exists.
- **SCOPE:** src/immoCard.ts, src/ImmoFinder.tsx, server/immofinder{Core,Delivery,Pipeline,Routes}.ts, tests/agents-contract.test.mjs, docs/API_CONTRACTS.md, CHANGELOG.md, package.json/lock.

## P129.7 — Drive export = screen card

- **OBSERVED:** Sheet/Doc used another price/contact/link/sort logic, plain text, and Doc carried letters.
- **CHANGE:** one pure card model (`src/immoCard.ts`) feeds screen, Sheet and Doc; rich Sheets/Docs formatting; letters removed from Doc; screen letter reader removed. Plain-text fallback if formatting is rejected.
- **NOT_RUN:** live Google Sheets/Docs API call (fake fetch only).
- **SCOPE:** src/immoCard.ts, src/ImmoFinder.tsx, server/immofinderDelivery.ts, tests/agents-contract.test.mjs, tsconfig.server.json, docs/architecture-boundary-rules.json, CHANGELOG.md, package.json/lock.

## P129.0 — C129 Quality Search (carousel)

- **PHASE:** End of “build the searcher”; start of quality optimisation.
- **CHANGE:** `wave=carousel`, settings profile carousel (default), N communes/tick via existing `communesForRun`+`cycle`, skip catalogues on carousel ticks, documentation for successors.
- **SCOPE:** immofinder Pipeline/Routes/Settings, ImmoFinder UI, docs/EXPERIMENTS.md (C129 section), EXPERIMENTS, CHANGELOG, package 129.0.

## P128.21.4 — lint:copy + listing card layout

- **OBSERVED:** CI FAIL only on lint:copy (Stage 1 help >24 words). Tests 912/918 pass, 0 failed.
- **CHANGE:** Short Stage-1 help. formatListingCard for UI/Drive/Docs/email: place·price·rooms·contact → text → direct link.
- **SCOPE:** src/ImmoFinder.tsx, server/immofinderDelivery.ts, CHANGELOG.md, TECHNICAL_REPORT.md.

## P128.21.3 — Search early-stop + SERP ranking

- **OBSERVED:** Stage-1 5m25s: kept new=0; source_early_stop on search after 12 consecutive non-keeps; 20 outside communes rejected.
- **CHANGE:** consecutiveStopFor(search)=48; pickItems sort in-zone title/URL first.
- **SCOPE:** server/immofinderDiscovery.ts, server/immofinderPipeline.ts, CHANGELOG.md, TECHNICAL_REPORT.md.

## P128.21.2 — CI red: lock patch + empty-source test

- **OBSERVED:** P127.11 expected lock.patch 128.21 got 128.20; P128.1 expected source_no_candidates got discovery_skipped (search-first order).
- **CHANGE:** package-lock patch fields; P128.1 discovery.enabled=false + errors.some(source_no_candidates).
- **SCOPE:** package-lock.json, tests/agents-contract.test.mjs, CHANGELOG.md, TECHNICAL_REPORT.md.

## P128.21.1 — Test fix + search-first priority

- **OBSERVED:** CI red: P128.2 index_pages 1≠2 (city-first), P128.3 search_queries 2≠1 (full mode re-ran same queries), P128.4 progress label.
- **CHANGE:** discoveryQueryOffset; progress `Searching:`; priority order = search then phase-1; test expects 1 index page.
- **NOT_RUN:** Live Stage-1 yield after deploy.
- **SCOPE:** server/immofinderPipeline.ts, tests/agents-contract.test.mjs, package.json, CHANGELOG.md, TECHNICAL_REPORT.md.

## P128.21 — Priority stages, early geo, contact quality (EXP-IMMO-2)

- **OBSERVED:** Same class of waste as P128.20 logs: geo rejects after LLM, search starved, fake contacts in PDF.
- **CHANGE:** `wave` = priority|extended|full; Stage-1 UI/API; early placeFromTitleOrSnippet + post-fetch geo before LLM; consecutive-bad source stop; sourceStats; isPlausibleSwissPhone/Email; priority wave includes capped search slice.
- **NOT_RUN:** Live Stage-1 vs full kept ratio after deploy.
- **SCOPE:** server/immofinder{Core,Pipeline,Routes}.ts, src/ImmoFinder.tsx, tests/immofinder-quality.test.mjs, docs/EXPERIMENTS.md, CHANGELOG.md, TECHNICAL_REPORT.md.

## P128.20 — Dual-wave ImmoFinder search (priority 10 min + extended) (EXPERIMENT)

- **OBSERVED:** 128.19 run used full 30 min on Scuol/Engadin happyholiday links and graubuenden/traum marketing pages; search barely started; 38/75 preview rejects were out-of-zone after LLM.
- **CHANGE:** Wave A (priorityWaveMs 10 min) only high-yield catalogues with city-first indexes; placeFromUrl prefilter; onWaveComplete early delivery. Wave B: Serper discovery + phase≥2. Dropped graubuenden/traum/appa from config.
- **NOT_RUN:** Live Render dual delivery (Drive/email twice) after deploy.
- **SCOPE:** server/immofinder{Core,Pipeline,Routes,Settings}.ts, config/immofinder.json, package.json, package-lock.json, CHANGELOG.md, TECHNICAL_REPORT.md.

## P128.19 — ImmoFinder search recall (catalogues, aliases, filters) (EXPERIMENT)

- **OBSERVED:** After the first run, catalogues always re-hit the same first maxDetailPages links (slice before seen); soft rejects stayed blocked for 7 days; phase-2 sources never ran; St. Peter / Seewis aliases and rooms/price/seeker detectors dropped real private holiday offers.
- **CHANGE:** Wide candidate pool then skip-seen up to maxDetailPages; soft-reject TTL 1 day; phase 2 after phase 1; municipality aliases; rooms/price/seeker/list fixes; monthly cap only on explicit monthly; FUNNEL progress line; defaults favour recall for night/week holiday pricing.
- **NOT_RUN:** Live Render run after deploy; measured kept/candidates vs 128.18 on the same communes.
- **SCOPE:** server/immofinder{Core,Pipeline,Store,Settings}.ts, config/immofinder.json, package.json, package-lock.json, CHANGELOG.md, TECHNICAL_REPORT.md.

## P128.18 — Cron passes global auth gate (EXPERIMENT)

- **OBSERVED:** Actions tick got HTTP 401 at 05:24:42Z; app log shows the request but no `immofinder_run_request`; global `/api` gate in server.ts runs before the route's secret check.
- **CHANGE:** `isImmoCronCall` exempts only POST `/api/immofinder/run` with the secret header; contract + HTTP tests added.
- **NOT_RUN:** Live tick on Render after deploy.

## P128.17 — Schedule tick diagnostics (EXPERIMENT)

- **CHANGE:** Structured logs for cron auth and isDue decisions; schedule-status endpoint; stricter cron workflow exit codes.
- **NOT_RUN:** Next hourly GitHub Actions tick after secrets fix.
- **NOTE:** If app logs show no `immofinder_run_request` at :07 UTC, the request never reached Render (Actions secrets/URL).

## P128.16 — Stronger contact enrichment queries (EXPERIMENT)

- **CHANGE:** buildSecondaryQueries expanded; scoreCandidateUrl ranking; extractContactsEnhanced keyword windows; more queries/candidates per listing.
- **NOT_RUN:** Live hit-rate on the current 14 contactless saved rows after redeploy.
- **COST:** Up to ~5 Serper queries × listings in a batch (still capped by enrich budget).

## P128.15 — Enrich-existing progress UI (EXPERIMENT)

- **CHANGE:** In-process enrichJobStatus + GET enrich-status; ImmoFinder banner polls while running.
- **NOT_RUN:** Multi-instance Render (status is process-local).
- **LIMIT:** Progress resets on server restart mid-job.

## P128.13 — Enrich every listing missing phone and email (EXPERIMENT)

- **CHANGE:** Dropped `contact_status <> found` gate; whitespace-only phone/email treated as empty; batch enrich budget scales with queued rows.
- **NOT_RUN:** Live hit rate after re-running Find contacts for saved on the current DB.
- **RISK:** More Serper calls per batch (up to ~3 × number of contactless cards).

## P128.12 — Enrich contacts on existing Immofinder listings (EXPERIMENT)

- **CHANGE:** Batch enrichment endpoint for saved rows without direct contact; cooperative with Serper budget from config.contactEnrichment.
- **NOT_RUN:** Hit rate on the current 24 saved holiday-owner rows; Drive refresh after enrichment-only pass (Drive still updates only on full search completion).
- **LIMIT:** Runs async after HTTP 202; UI shows a short message and refreshes list after 15s — long batches may need a manual refresh.

## P128.11 — ImmoFinder stop search (EXPERIMENT)

- **CHANGE:** In-process cancel flag per run id; stop endpoint; pipeline cooperative cancel; UI Stop button.
- **NOT_RUN:** Stop mid-LLM-call (cancels on next item boundary), multi-instance cancel across replicas.
- **LIMIT:** Cancel flags are process-local; a different server instance will not see the flag (single Render instance is the usual case).

## P128.10 — ImmoFinder quality gates and background runs (EXPERIMENT)

- **CHANGE:** Configurable quality gates (monthly rent cap, listing age, seeker filter, optional contact/price required); no LLM translation; 30-minute run deadline with AI back-off retries; settings UI for quality fields.
- **NOT_RUN:** Live precision of price/date parsing on real Graubünden pages, long 30-minute production runs under load, owner response rate after filters.
- **RISK:** Strict `requirePrice` / `requireContact` can zero the result set on portals that hide both; defaults keep them off except monthly-only and seeker rejection.

## P128.9 — ImmoFinder public-source contact enrichment (EXPERIMENT)

- **PROBLEM:** Most kept listings (Facebook groups, Booking/Airbnb-class hosts, portal pages) have no direct phone/email; the pipeline correctly left them as `platform_only` but did not try further public sources.
- **CHANGE:** Post-keep enrichment only: secondary Serper queries and optional reverse-image on public photos; evidence copied from public pages only; `contact_status` upgraded only when evidence exists; listings without contacts remain stored. Config `contactEnrichment` (enabled by default). Count `enriched` in run results.
- **NOT_RUN:** Live enrichment on production Serper quota, reverse-image provider integration, precision of secondary-search contacts against labelled data, cost impact over several days.
- **RISK / LIMIT:** Extra Serper spend bounded by `maxExtraSearchesPerRun` (25). Reverse image does nothing until a provider is wired into `PipelineDeps.reverseImageSearch`. No authenticated or paywalled sources.

## P128.8 — ImmoFinder types and cleanup (EXPERIMENT)

- **OBSERVED (owner export, 40 objects, run 16.11 12:31 on 128.7):** about 20 of 40 were search pages, wanted ads, hotels or similar; only 2 had a contact (both from owner directories: Ferienhausmiete, Surselva); all 40 letters opened with "Ihre Ferienwohnung"; a list page from home.ch and a WG room passed the 128.7 filters; one commune was taken from the snippet instead of the URL.
- **OBSERVED (page fetch):** ferienhausmiete.de object pages are `/<id>.htm`; the Graubünden page lists about 12 of 41 objects, the rest sit under region pages `r<id>`; the filter "Langzeitmiete möglich" exists on the site.
- **NOT_RUN:** live crawl of the region pages, precision after cleanup, letters for direct offers in real use.

## P128.7 — ImmoFinder quality and layout (EXPERIMENT)

- **OBSERVED (logs 2026-11-16 07:14 UTC and owner export of 24 rows):** about 12 of 24 rows were not an owner's offer (search pages, a seeker's post, hotels/guesthouse, portal list pages); only 2 rows had a contact; polling produced about 320 of 540 log lines; `button:disabled` global rule made blue buttons unreadable. Warnings not caused by this module: pg SSL-mode notice on every boot, MaxListenersExceededWarning (4 times since 2026-11-14), diagnostics overall WARN only because no artifacts exist.
- **NOT_RUN:** live Sheet formatting, precision after the new filters, phone rendering.

## P128.6 — ImmoFinder header, Drive, email mode (EXPERIMENT)

- **OBSERVED:** owner screenshot of run 16.11.2026 03:07: Drive HTTP 403 "Service Accounts do not have storage quota" for the native Sheet upload of 128.2; email sent; 21 listings.
- **CHANGE:** see CHANGELOG 128.6.
- **NOT_RUN:** live Drive update (needs the two files, folder sharing and the Sheets/Docs APIs), header on the phone, email with the "all" mode.

## P128.5 — ImmoFinder settings (EXPERIMENT)

- **CHANGE:** server-side schedule decision (`isDue`, Swiss time), per-channel delivery, scope applied per run, AI-call cap; settings UI.
- **NOT_RUN:** Resend email delivery, schedule firing from the hourly workflow, settings screen on the phone, Telegram/Drive tests from the buttons.
- **KNOWN:** the default is manual-only, so the former 3-hourly automatic run stops until the owner picks a schedule.

## P128.4 — ImmoFinder live progress (EXPERIMENT)

- **OBSERVED:** owner screenshots showed a frozen "Running…" line with zeros until the run ended, and no obvious start control.
- **CHANGE:** progress events from the pipeline are stored in `immofinder_runs.progress` and rendered live.
- **NOT_RUN:** browser rendering on the phone, real run timing, polling load on Render.

## P128.3 — ImmoFinder discovery via search (EXPERIMENT)

- **CHANGE:** `server/immofinderDiscovery.ts`, discovery stage in the pipeline, config `discovery`, UI counts, tests.
- **NOT_RUN:** live Serper queries, real Facebook/Airbnb snippets, precision of owner-page extraction, cost per day (estimate: 20 searches + <= 40 model calls per run).
- **RISK:** search snippets are short, so rooms/municipality are often unknown and rejected; generic pages (portals, blogs) cost model calls until the seen-cache learns them.

## P128.2 — ImmoFinder source quality (EXPERIMENT)

- **OBSERVED (owner run 2026-11-15):** 89 pages fetched, 1 listing matched; 60 rejected as not a single listing, 18-19 as agency, 9-10 outside the whitelist; Drive upload HTTP 403; est. cost $0.178 per run; happyholiday page read via fetch: `von privat` title, platform footer with its own phone/address, "Andere Häuser" block, no owner contact.
- **CHANGE:** see CHANGELOG 128.2.
- **NOT_RUN:** live fetch of city pages and ferienhausmiete.de, Drive native upload, precision against labelled data.

## P128.1 — ImmoFinder GR Phase 1 (EXPERIMENT)

- **OBSERVED:** Core CI on 128.1a failed only because P127.11 asserted major 127; local run of the CI DAG reproduced it.
- **CHANGE:** Pipeline, API, UI, Drive/Telegram, cron added; contacts accepted only from fetched text, model facts only with verbatim quote.
- **NOT_RUN:** Live fetch of any source (parsers are generic and unverified on real markup), live Gemini, Drive, Telegram, browser e2e, user value.
- **KNOWN:** Run executes in-process with a 30-minute single-flight guard, not through the job queue.

## P128.1a — ImmoFinder GR documentation and preparation (MAINTENANCE)

- **OBSERVED:** Base 127.44 archive has no ImmoFinder code, route, table or UI; Drive client is browser-side only, no Telegram code.
- **CHANGE:** Module design, schema, API, safeguards and EXP-IMMO-1 recorded; whitelist/stop-list config added.
- **NOT_RUN:** Install, typecheck, CI, live fetch, any user-value check.

## P127.44 — Pin CodeQL workflow actions (BUGFIX)

- **OBSERVED:** workflow-action-pins FAIL on codeql.yml @v4/@v3; CodeQL dynamic jobs still 504 on bundle download.
- **CHANGE:** Full SHA pins matching repo governance; continue-on-error retained.
- **NOT_RUN:** Live CodeQL after CDN recovery.

## P127.43 — Procedural template quality step (BEHAVIOUR)

- **OBSERVED:** Games could run with touch but look empty or unreadable; risk of jumping to image/3D assets too early.
- **CHANGE:** Template view/forbidden lines require procedural readable scenes; prompts ban binary assets and CDN by default.
- **NOT_RUN:** Live rebuild of side-flight after deploy.

## P127.42 — CodeQL CDN 504 resilience (RELIABILITY)

- **OBSERVED:** CodeQL job Unable to download and extract CodeQL CLI: HTTP 504 on codeql-bundle-v2.27.4.
- **CHANGE:** Advanced workflow with continue-on-error; analyze only if init succeeds.
- **NOT_RUN:** Live CodeQL after GitHub CDN recovers; disable Default setup in repo Settings if both run.

## P127.41 — CI green for P127.40 intent (BUGFIX)

- **OBSERVED:** CI failed on lint:copy (Cyrillic in intent-brief) and tests expecting intent v1 / targetModules>=8.
- **CHANGE:** Unicode escapes for non-Latin genre cues; tests aligned to compact mobile templates.
- **NOT_RUN:** None beyond CI.

## P127.40 — Genre templates and mobile-first defaults (BEHAVIOUR)

- **OBSERVED:** Brief city/flight requests became unstable pseudo-3D; keyboard-oriented controls; PARTIAL packages.
- **CHANGE:** selectGenreTemplate + contractFromTemplate; intent v2; mobile-only default device; coder/shared wiring aligned (static_site.v10).
- **NOT_RUN:** Live rebuild of city flight after deploy.

## P127.39 — No instant game-over for action games (BEHAVIOUR)

- **OBSERVED:** Skyline Aviator opened, Start Flight, then CRASHED with score 0 / distance 0mm; CLIMB/DIVE present but no playable segment.
- **CHANGE:** Prompt + shared contracts require free-space spawn, collision grace after start, no game-over on start frame (static_site.v9).
- **NOT_RUN:** Live rebuild of Skyline after deploy.

## P127.38 — Uniform dense history (MAINTENANCE)

- **OBSERVED:** Prior compression dropped or unevenly shortened history; entry sizes still varied.
- **CHANGE:** Full history retained from main; each CHANGELOG/REPORT section normalized to 1–5 sentences; AGENTS density rule aligned.
- **NOT_RUN:** None required beyond doc review.

## P127.37 — History density binding (MAINTENANCE)

- **OBSERVED:** Patch notes were sometimes missing and sometimes page-length.
- **CHANGE:** AGENTS.md History density — append-only; new entries 1–5 sentences; bulk compression only with explicit Navigator approval.
- **NOT_RUN:** Automated line-cap CI check.

## P127.36 — Brief collapse crash + mobile control contracts (BUGFIX)

- **OBSERVED:** Confirm caused ErrorBoundary (planLocked undeclared); brief stayed expanded; tractor drawn off-canvas; racers keyboard-only on phone.
- **CHANGE:** Declare planLocked; one-line collapse; UI chrome reduced; prompts require touch controls and in-bounds canvas draws (v8).
- **NOT_RUN:** Phone smoke on newly generated tractor/racer after deploy.

## P127.34 — Compact plan, human brief, shared contracts (FEATURE, EXP-PROJECT-9)

- **OBSERVED:** chess build used ~12 modules; Board/Rules/Render/Input disagreed on piece and coordinate shapes; outcome PARTIAL, program non-functional despite mostly green static validators.
- **CHANGE:** see CHANGELOG and EXP-PROJECT-9. Planner/intent budgets prefer ~3 files; `ensureMultiFileStaticPlan` no longer expands standard goals to 8+ modules; `Plan.shared` + coder SHARED CONTRACTS; `humanBrief` + `manifest.json` in package; event `human_brief_ready`.
- **LOCAL:** recovery tests updated for compact coercion and new P127.34 cases; full `npm test` / deploy NOT_RUN in this sandbox (no full node_modules of the product tree).
- **NOT_RUN:** in this sandbox (no full node_modules of the product tree).
- **KNOWN:** vocabulary mismatches inside a single large `app.js` can still occur; runtime browser check still depends on host Playwright; UI may not yet surface `human_brief_ready` until a small follow-up.

## P127.33 — Name contracts between files (BEHAVIOUR, EXP-PROJECT-8)

- **OBSERVED:** three jobs ended `SUCCESS`, `goalImplemented=true`, 12/12 validators ok, `runtimeVerified=false`. (1) Board program A: 64 squares and no pieces; the engine names piece types `p`, `r` while the renderer's table is keyed `pawn`, `rook`; engine move validation is a stub ("placeholder").
- **CHANGE:** see CHANGELOG.
- **LOCAL:** `project-builder-recovery` 50/50 (3 new red before the change, green after); `tsc` findings on the touched files identical to the unmodified files (4, none in new code).
- **NOT_RUN:** live build on the deployed commit; whether the model's repair of a flagged name succeeds; full `test:core` / `typecheck`; Chromium installation on Render; user value.
- **KNOWN:** (1) vocabulary mismatches inside data (piece type names) and a click handler reading another dataset key than the renderer wrote are found by no static check; the second is found only when Chromium runs. (2) The P127.32 browser check is not operating on the deployed instance (no browser).

## P127.32 — Page opened in a sandboxed browser (BEHAVIOUR, EXP-PROJECT-7)

- **OBSERVED:** the P127.31 fix worked as intended (`plan_references_repaired`, no `plan_fallback`, `goal_adequacy_passed`, 10 modules). The build ended PARTIAL (`validators_failed: refs`: a leftover classic CDN `<script>` for the 3D library next to the pinned import map).
- **CHANGE:** see CHANGELOG. Authorisation: Navigator "да. запускай".
- **LOCAL:** `project-builder-recovery` 47/47 (5 new; the engine tests use a fake port, one test opens real pages in Chromium: clean page, thrown error mapped to its file, and a page that connects to a loopback listener makes 0 connections (checked by mutation: the test fails when the host is allowed); it is…
- **NOT_RUN:** live build with `PROJECT_RUNTIME_CHECK=true` (the deployed image has no Chromium installed by its configuration; `playwright` is a devDependency and `nixpacks.toml` was not changed); the real 3D library over the network; whether the model's repair of the observed defect succeeds; full `npm run… The feature is off by…
- **KNOWN:** (1) the classic 3D-library `<script>` left beside the import map (the `refs` failure above) is still not removed by the three normalisation; removing it without the runtime check would have turned this build green. (2) `status:graph --check` and `capability:graph --check` report stale generated files on the unmodifi…

## P127.31 — Usable model plan kept (BUGFIX)

- **OBSERVED:** `plan_validate_failed` with 16 issues, then `plan_fallback`, `goal_adequacy_failed`, outcome PARTIAL (`goalImplemented=false`, `runtimeVerified=false`). The model plan used ids `index`, `board`, `game`, ... and file names in `dependsOn` / `order`, and made `game` and `input` depend on each other.
- **CHANGE:** `repairPlanReferences` (see CHANGELOG).
- **LOCAL:** `project-builder-recovery` 42/42 (3 new tests red on the old code, green on the new), `governance-repo`, `agents-contract`, `project-mode-contract`, `project-standalone`, `project-resume-lease`, `project-user-value-eval`, `diagnostics-ops` all pass; `tsc` on `core-plan.ts` and `core-engine.ts`…
- **NOT_RUN:** here).

## P127.30 — Standalone index.html (FEATURE + BUGFIX)

- **OBSERVED:** the delivered chess package showed an unstyled page, modal dialogs open, no board. Cause: sibling `style.css` / `main.js` are not reachable from `content://` and external `<script type="module" src>` is blocked on `file://`.
- **CHANGE:** deterministic single-file `index.html` + `source/`.
- **NOT_RUN:** real Chromium on `file://` / Android `content://`, live measurement.

## P127.29 — Empty first screen and duplicate setup (BUGFIX)

- **OBSERVED:** chess ZIP (job 5f89cf2e): outcome SUCCESS, all 12 static checks green, no console errors; headless Chromium shows 0 pieces on load and 32 after New Game. `scene.js` constructor calls `initDOM`, `initBoardRenderer`, `loadSettings`, `updateUI` but never `renderBoard`; `main.js` then calls…
- **CHANGE:** LOG).
- **NOT_RUN:** `.

## P127.28 — Mixed three.js imports (BUGFIX)

- **OBSERVED:** logs 2026-11-07 11:01: tractor-racing ZIP (job 5da5ba63) — syntax valid, exports/imports between local files consistent, but nine modules import three.js from five different specifiers/versions and `index.html` has no import map.
- **CHANGE:** LOG).
- **NOT_RUN:** `; whether the game then runs correctly is unverified.

## P127.27 — Generated games did not run (BUGFIX)

- **OBSERVED:** logs 2026-11-07 (commit 14d1825): the racing game ZIP had 19 files named `audio_js`, `car_js`, … (no extension, `orphanedFiles` in the report); the maze game had `TILE_TYPES.PATH` and `COLORS.WALL` used but not defined, `'S'`/`'E'` compared with numeric tiles, and `game.init()` called twice.
- **CHANGE:** LOG).
- **NOT_RUN:** `; browser run of generated games `NOT_RUN`.

## P127.26 — DOM-first generation (EXPERIMENT)

- **OBSERVED:** live run bfc8eb6: `dom-wiring` failed in 3/20 builds (memory-r1, calc-r1, memory-r2) and in 3/6 of the Navigator's own builds (script asked for ids the HTML did not have; repair rejected as `no_improvement`).
- **CHANGE:** HTML first; scripts and styles receive its real ids.
- **NOT_RUN:** live run, user value; the risk that HTML written without the scripts' exports loads them wrongly (`refs`, `reachability`, `module-contracts`) is unmeasured.

## P127.25 — Artifact before terminal state; per-file progress (BUGFIX)

- **OBSERVED:** live report (commit bfc8eb6): 7/7 SUCCESS builds had no `downloadUrl` when polled (`hasDownloadUrl=false`); the engine saved `done` before the adapter stored the ZIP.
- **NOT_RUN:** deployed behaviour, user value, browser e2e (none exists for the project chat; contract test checks `data-testid`s only).

## P127.24 — Live gate fix (BUGFIX)

- **OBSERVED:** workflow_run job for head 45938c3 ended after the gate step; no later steps ran (diff of HEAD~1..HEAD matched nothing).
- **NOT_RUN:** .

## P127.23 — Cross-file diagnostics and repair (EXPERIMENT)

- **OBSERVED:** live runs 69e46f6 / 24173ab / d88b819: 0/5, 1/5, 0/5. Remaining failures are cross-file contract defects (missing exports, `player.reset` not defined on the class, wrong arity, `onTick` misuse); `module-contracts` had no repair, `member-contracts` only handled `const x = new Foo()`.
- **NOT_RUN:** .

## P127.22 — Revert P127.21 (EXPERIMENT outcome)

- **OBSERVED:** PRODUCT_PASS 0/5 (bar >=3/5), SUCCESS-vs-human mismatches 1/5 (bar <=1/5). Failures now: `module-contracts` back in 1 build (missing export), runtime API mismatches between files (`onTick`/`player.reset` not a function), `null.value` DOM reads, `completeness`, `reachability`.
- **NOT_RUN:** .

## P127.21 — Style the real page (EXPERIMENT)

- **OBSERVED:** vs baseline 69e46f6: `module-contracts` failures 5/5 → 0/5; SUCCESS 0/5 → 3/5; PRODUCT_PASS 0/5 → 1/5. Two of three SUCCESS builds failed the human check (study timer: black disc, no time shown, settings panel always open — screenshot confirms CSS written for classes the HTML does not have; arcade: blank playfield).
- **NOT_RUN:** .

## P127.20 — Interface-aware generation (EXPERIMENT)

- **OBSERVED:** product pass 0/5. All 5 builds ended PARTIAL with `validators_failed: module-contracts` (importer names a symbol the sibling file does not export; page throws at load); one also referenced a missing media file (`refs`); one produced no downloadable package (cause UNKNOWN, job facts now recorded).
- **CHANGE:** see CHANGELOG. Not a repair step: a module generated before a sibling it imports can still mismatch.
- **NOT_RUN:** . Not labelled USER_VALUE until the live comparison exists.
- **KNOWN:** , job facts now recorded). The screenshot judge did not run (HTTP 404 on its model id).

## P127.19 — Live Project Mode user-value run (MEASUREMENT)

- **OBSERVED:** the P127.18 workflow scored two hand-made fixtures and could not detect regressions of the live product.
- **CHANGE:** live runner + prompt set + manual workflow job (see CHANGELOG).
- **NOT_RUN:** here (needs deploy, secrets, Chromium).

## P127.18e — Resume keeps intent complexity (BUGFIX)

- **OBSERVED:** `project-builder-recovery` tests 1–2 failed (`partial` vs `complete`). Cause: resumed job inferred complexity from an unmodified saved spec → `stub_size`/`stub_modules` adequacy failure.
- **CHANGE:** persist spec after brief application.
- **NOT_RUN:** .

## P127.17b — Flat package paths (2026-11-06)

- **OBSERVED:** Project policy forbids nested folders in packages; P127.17 used `js/*.js` paths.
- **CHANGE:** Flat filenames only; isSafePath length === 1; patch `127.17b`.

## P127.17a — CI fix for 127.17 (lint:copy + duplicate export) (2026-11-06)

- **OBSERVED:** CI failed `lint:copy` (Cyrillic in intent-brief), `critical-*` / build:server on duplicate `templatePlan` export in `appBuilder/index.ts`.
- **CHANGE:** Latin-only complexity regex; single templatePlan export; patch `127.17a`.

## P127.18 — Project user-value human-simulator workflow (2026-11-06)

- **CHANGE:** Offline rubric over fixed fixtures; workflow upload of report. Live model path deferred (exit 2 if `--live`).
- **NOT_RUN:** ).

## P127.17 — Intent brief + small-file tree + goal adequacy (2026-11-06)

- **CHANGE:** 1. Intent stage elaborates user `taskText` into mustHave / notSuccessIf / module hints before plan/code.
- **NOT_RUN:** in this environment.

## P127.16a — lint:copy Cyrillic in stack-static-site (2026-11-06)

- **OBSERVED:** CI 127.16 failed only `lint:copy`: Cyrillic in `appBuilder/stack-static-site.ts` interactive regex.
- **CHANGE:** Latin-only keyword list; patch `127.16a`.
- **NOT_RUN:** here; expected PASS after apply.

## P127.16 — Multi-file plan + MAX_TOKENS/missing_end (2026-11-06)

- **OBSERVED:** Job `aa2464d9…` FAILED: planner emitted one `index.html` unit; coder hit `finishReason: MAX_TOKENS` twice; `missing_end_for:index.html`; no ZIP. CI on 127.15: only `lint:copy` failed (ProjectChat welcome >24 words).
- **CHANGE:** 1. Plan prompt v5 + `ensureMultiFileStaticPlan` after plan accept.
- **NOT_RUN:** in sandbox; expected in CI. Live model Tetris rebuild.

## P127.15 — Project Mode chat-first surface (2026-11-06)

- **OBSERVED:** Users still faced multi-panel Project UI (lists, analysis, plan, files, wizard). Requested product shape is chat-only: one message box, archive or continued dialogue.
- **CHANGE:** 1. `ProjectChat` — message list, sticky composer, Send; first message creates project + confirms passport + build; later messages continue from latest ZIP artifact; assistant replies include Download link and short usage text. 2. `ProjectMode` default `viewMode: 'chat'`; guided start off by default; full prior works…
- **NOT_RUN:** here; CI expected. Tablet chat smoke.

## P127.14 — CI fix for 127.12/127.13 (lint:copy + typecheck) (2026-11-06)

- **OBSERVED:** After P127.13, DAG failed `lint:copy` (workspace sentence >24 words; visible term "raw JSON"), `typecheck`/`build:server` (`Uint8Array<ArrayBufferLike>` not assignable on upload `data`).
- **CHANGE:** Short workspace string; tab label `Project data`; `Uint8Array.from(bytes)` for upload payload; patch `127.14`.
- **NOT_RUN:** `lint:copy` / `typecheck` / `build`. Expected green on those checks after apply.

## P127.13 — Project Mode Files-first workspace (2026-11-06)

- **OBSERVED:** After P127.12, Continue/Upload existed but the default surface still pushed analysis/plan tabs and "Run an analysis" as the next step, so tablet users still saw an engineer console.
- **CHANGE:** 1. Default `activeTab` = `journal` (Files); project selection resets to Files.
- **NOT_RUN:** in sandbox; expected in CI `test:project` / `test:core`. Tablet UI smoke.

## P127.12 — Project continue + source ZIP upload (2026-11-06)

- **OBSERVED:** Continuation API (`POST .../code/continue`) existed but `ProjectMode.tsx` never called it. Users could download ZIPs but not iterate.
- **CHANGE:** 1. UI: continue panel (base ZIP + change text + Improve), upload ZIP (Files tab and continue panel), loadExtras after build/continue.
- **NOT_RUN:** in this sandbox (no full install). Expected under `test:project` / `test:core` in CI.

## P127.11 — Patch process compliance and integration-gate tests (2026-11-06)

- **OBSERVED:** P127.9 and P127.10 ZIPs omitted `package.json` / `package-lock.json` patch bumps required by AGENTS §7 delivery checklist item 1, because the working extract initially lacked those files. G3 also requires CI-runnable category tests for new validators; those were.
- **CHANGE:** 1. `package.json` and `package-lock.json`: `patch` → `127.11` (root lock `patch` and `packages[""].patch` aligned). 2. `tests/project-builder-recovery.test.mjs`: contracts for required validators list, reachability on self-contained HTML, orphan drop, member-contracts (`paused` vs `isPaused`), completeness truncatio…
- **NOT_RUN:** / not delivered in 127.9–127.10.

## P127.10 — Member contracts and coherent self-contained packages (2026-11-06)

- **OBSERVED:** Multi-file packages could pass import-level `module-contracts` while consumers called non-existent instance members (`game.paused` vs class field `isPaused`). Separately, self-contained HTML apps were shipped together with unreachable modular files, confusing downloaders.
- **CHANGE:** 1. Required validator `member-contracts` (TypeScript AST): maps exported class methods and `this.*` assignments; checks instance member access after `new ClassName()`.
- **NOT_RUN:** (full test harness not in working archive). - Browser runtime smoke.

## P127.9 — Project Mode integration gates (2026-11-06)

- **OBSERVED:** Live sample builds (Touch Tetris / 3D Tetris) were marked SUCCESS while packages contained unreachable modular files beside a self-contained `index.html`, broken cross-file contracts (`paused` vs `isPaused`), and historically truncated sources. Required validators (`module-contracts`, `refs`, `dom-wiring`, `acceptan…
- **CHANGE:** 1. New required validators `reachability` and `completeness` in `validator-static-site.ts`; included in `REQUIRED_VALIDATORS` and `runStaticValidators`.
- **NOT_RUN:** (full repo test harness not present in the working archive). - Browser runtime smoke still.

## P127.8a — Docs layout CI fix (2026-11-06)

- **OBSERVED:** CI run 42254676945 (commit 81ae5a9) failed `docs-integrity` and `test:core` (`docs layout: only allowlisted prose...`) because `docs/PROJECT_CONTINUATION.md`, `docs/PROJECT_MODE_P127_8_ACCEPTANCE.md` and `docs/PROJECT_MODE_RELIABILITY_PLAN.md` are not on the docs allowlist (AGENTS.md §6). All other 16 DAG checks pas…
- **CHANGE:** Retired the three files; references in `TECHNICAL_SPECIFICATION.md`, `ROADMAP.md` and this report now point to canonical files. Their content was merged: requirements, isolation rules and continuation contract into `TECHNICAL_SPECIFICATION.md` (Project Mode recovery programme; P127.6), and the acceptance checklist i…
- **NOT_RUN:** .

## P127.7 — Project workspace artifact inventory (2026-11-06)

- **CHANGE:** Added `GET /api/projects/:projectId/artifact-versions` for every immutable artifact version; added project-scoped per-artifact version listing and inspection endpoints; downloads now accept a validated `version` query parameter. Project Mode Files view now shows historical versions, offers version-specific downloads…

## P127.5 — Project Mode build reliability (2026-11-06)

- **OBSERVED:** Supplied diagnostics recorded `PARTIAL` with `validators_failed: refs, size`; the supplied game references `/src/main.ts` while `static_site` has no TypeScript compilation step. Source inspection found leading-slash references were not normalized to project-root paths.
- **CHANGE:** `validateRefs` now resolves `/...` from the generated project root and relative references from the HTML file directory, while retaining traversal and missing-file rejection. It reports TypeScript references as unsupported by `static_site`. `validateModuleContracts` also reports raw `.ts`/`.tsx` source as non-execut…
- **NOT_RUN:** Tests, typecheck, build, CI, browser execution, and live model repair. The supplied archive contains no `node_modules`; no claim of PASS is made.

## P127.4 — Evidence (2026-11-06)

- **OBSERVED:** E01/A wrong number with search used.
- **CHANGE:** applyGroundedNumberCheck + evidence from digest/titles.
- **NOT_RUN:** live smoke with flag on.

## P127.3a — Evidence (2026-11-06)

- **OBSERVED:** 14/14 fact-path contracts pass.

## P127.3 — Evidence (2026-11-06)

- **OBSERVED:** eval smoke A/B infra 4%; machine W ~50% on 12; empty/wrong figures when search not grounded.
- **CHANGE:** honesty gate + broader quantitative trigger; enable with UNGROUNDED_FACT_GATE=true on Render.
- **NOT_RUN:** paired before/after with flag on.

## P127.2e — Evidence (2026-11-06)

- **OBSERVED:** A/B empty due to envelope; C 429×10 from Actions IP.
- **NOT_RUN:** .

## P127.2d — Evidence (2026-11-06)

- **OBSERVED:** geminiKeySlots=10, hasAppPassword=true; A/B path=product but empty answers (envelope bug); C all 429 across pool; infra gate FAIL 33%+.
- **NOT_RUN:** .

## P127.2c — Evidence (2026-11-06)

- **OBSERVED:** preflight accepts letter patch; harness resolves up to 10 Gemini slots; workflow env wired.
- **NOT_RUN:** .

## P127.2b — Evidence (2026-11-06)

- **OBSERVED:** login session path; request body uses brief.decision + history; Gemini retry chain; workflow secrets wiring.
- **NOT_RUN:** until live labels.

## P127.2a — Evidence (2026-11-06)

- **OBSERVED:** lint:copy OK after language allowlist; version 127.2a accepted by gates.
- **NOT_RUN:** .

## P127.2 — Evidence (2026-11-06)

- **OBSERVED:** runtime-config ingested; EXPERIMENTS thresholds locked; letter-suffix patch rule in AGENTS + check-version; package patch 127.2.
- **NOT_RUN:** .

## P127.1 — Evidence (2026-11-06)

- **OBSERVED:** eval-questions schema + pure harness functions (schema, numeric match, abstention, intervals, blinding); suite in test:core; workflow_dispatch baseline-eval.yml; C127 block in AGENTS.md; EXPERIMENTS ledger with NOT_RUN results.
- **NOT_RUN:** .

## P126.31 — Evidence (2026-11-06)

- **OBSERVED:** patterns strip meta process phrases; factual percent question retains topic words; `contextualizeSearchText` reuses prior task on meta-only turns.
- **NOT_RUN:** Hosted live SERP after deploy.

## P126.30 — Evidence (2026-11-05)

- **OBSERVED:** `server.ts` no longer calls `applyUngroundedStatisticGate`; Simple `ok(..., reply: direct.reply)`; Expert `reply: visibleReply`. Search trigger for share/percentage questions remains in `webSearch.ts`.
- **NOT_RUN:** Hosted live retest after deploy.

## P126.29 — Evidence (2026-11-05)

- **OBSERVED:** pure regex accepts Graubünden larch %-question; gate helpers and server wiring present. Full `tsx` suite NOT_RUN here (no node_modules in assistant env).
- **NOT_RUN:** here (no node_modules in assistant env).

## P126.28 — Evidence (2026-11-05)

- **OBSERVED:** `config/connectors.yaml` present; root `connectors.yaml` removed; verify-connections path updated; SECURITY.md is pointer-only.
- **NOT_RUN:** Hosted `verify:connections` / live Render (no behavior change intended beyond path).

## P126.27 — Evidence (2026-11-05)

- **OBSERVED:** docs-reference-integrity missing `App.tsx`/`ProjectMode.tsx`; pins test required `actions/cache` absent from workflows after UI-smoke removal.
- **NOT_RUN:** Hosted CI after apply.

## P126.26 — Evidence (2026-11-05)

- **OBSERVED:** `FAIL ci.yml: references missing npm script test:ui-smoke` (twice); all DAG checks NOT_RUN.
- **NOT_RUN:** .

## P126.25 — Evidence (2026-11-05)

- **OBSERVED:** Decision and SSOT text present in AGENTS / ARCHITECTURE / DATA_AND_ARTIFACTS / DECISIONS.
- **NOT_RUN:** N/A (no runtime change).

## P126.24 — Evidence (2026-11-05)

- **OBSERVED:** `validateManifest` empty errors; check profile 16 ids; ci 18 ids; governance-repo 11/11 PASS including DAG and model-sources asserts; `config/model-sources.yaml` absent.
- **NOT_RUN:** Hosted CI full DAG after apply.

## P126.23 — Evidence (2026-11-05)

- **OBSERVED:** 51 files remain under `scripts/`; `scripts:integrity` PASS; governance scripts layout assertion added; removed tools were not on CI critical path except dual-compare/ai harness npm entries (now no-op).
- **CHANGE:** LOG P126.23.
- **NOT_RUN:** Hosted CI after apply.

## P126.22 — Evidence (2026-11-05)

- **OBSERVED:** TAP 504/504; DAG 29 PASS / 1 FAIL (`docs-integrity`); test:core 58/58 PASS including docs layout suite.
- **NOT_RUN:** Hosted CI after this patch + deletion of `docs/1.txt`.

## P126.21 — Evidence (2026-11-05)

- **OBSERVED:** docs-integrity markers still present; governance-repo includes docs layout suite; allowlist files present.
- **NOT_RUN:** Hosted CI after apply of P126.20 + this patch.

## P126.20 — Evidence (2026-11-05)

- **OBSERVED:** `docs:integrity` PASS; `docs-reference-integrity` PASS; docs/ contains 11 prose + 18 JSON; no nested folders.
- **CHANGE:** LOG / prior TECHNICAL_REPORT entries; retired markdown files are not restored.
- **NOT_RUN:** Hosted CI after apply; live Render probe (ops contract text only moved).

## P126.19 — Evidence (2026-11-05)

- **OBSERVED:** static instrumentation present (`simple_direct_exchange`, `client-render`, `REQUEST_INDEX`, safeDetails guard).
- **NOT_RUN:** live All Logs download after deploy; browser ack on production.

## P126.18 — Evidence (2026-11-05)

- **OBSERVED:** docs-reference-integrity PASS; governance-repo 6/6 PASS.
- **NOT_RUN:** full hosted DAG re-run after this patch.

## P126.17 — Evidence (2026-11-05)

- **OBSERVED:** `node --test` on governance/agents/diagnostics category files → 14/14 PASS in sandbox. Layout gate rejects `pNNN-*.test.mjs`.
- **NOT_RUN:** full `test:core` (includes providers-models needing deps), typecheck, hosted DAG, browser e2e. Apply after P126.15 + P126.16 product patches (labels, All Logs, lab removal) so agents/diagnostics contracts match source.

## P126.16 — Evidence (2026-11-05)

- **OBSERVED:** static absence of Lab sources; `main.tsx` has no `ArchitectLab` / `architect-lab` route.
- **NOT_RUN:** full test:core, typecheck, browser e2e (sandbox limits).

## P126.14 — Evidence (2026-11-05)

- **OBSERVED:** `test:answer-quality` 79/79; `carousel-verify` exit 0; `p126-12` 5/5, `p126-13` 5/5, `p126-14` pass; workflow-action-pins, assistant-run-summary, diagnostics-summary, status-graph, dag, p119-agent-boundaries pass; `docs:check` OK; YAML parses; preflight PASS and detects a stale fixture.
- **CHANGE:** LOG P126.14.
- **NOT_RUN:** hosted rerun after this fix, `npm run test:core` in full, `check`/DAG, typecheck/build, UI e2e, live smoke, render probe (no URL). Lockfile root `patch` strings still read 126.11 (check-version gate passes).

## P126.13 — Evidence (2026-11-05)

- **OBSERVED:** `p126-13` 5/5; `p126-1/2/3/5`, `p126-12`, `p124-26/27/28/30/31/38`, `web-and-epistemics`, `p125-16` pass. `gemini-direct-passthrough-p124-17` test 1 fails identically on the 126.12 base in this sandbox.
- **CHANGE:** LOG P126.13. Owner decision (2026-11-05): quotas exist on all keys and only per-minute quotas are consumed, so no pause above one minute; all providers in all modes; the user must always get an answer.
- **NOT_RUN:** `tsx` runs, `test:pipeline`, typecheck/build (client edit in `ConversationScreens.tsx` is unbuilt), browser e2e for the new auto-retry, hosted CI, live Groq/Cloudflare fallback calls.

## P126.12 — Evidence (2026-11-05)

- **OBSERVED:** new `p126-12` suite 5/5; `p124-28`, `p124-38`, `web-and-epistemics`, `universal-followup-regression`, `p124-26`, `p126-1`, `p126-2`, `p126-3`, `p126-5` all pass.
- **CHANGE:** LOG P126.12. Item 5 (source-policy packaging) was already fixed in 126.11 and is unchanged; fail-fast startup on a missing file is not part of this patch.
- **NOT_RUN:** `tsx`-based runs, full DAG, typecheck/build, hosted CI, live search against Serper/Gemini, live comparison of direct mode with the legacy chain (still NOT_RUN per C126 KEEP GATED).

## P126.11 — Preserve terminal AI format error contract (2026-11-04)

- **NOT_RUN:** full DAG, typecheck/build and hosted GitHub Actions.
- **BLOCKED:** `npm run test:pipeline` could not start because this sandbox has no installed `tsx` package (`ERR_MODULE_NOT_FOUND`).

## P126.10 — Evidence (2026-11-04)

- **OBSERVED:** source edits; JavaScript syntax checks, targeted static regression checks, package/lock metadata consistency and ZIP path review.
- **NOT_RUN:** full `test:pipeline`, full DAG, typecheck/build and hosted GitHub Actions. The sandbox does not contain the repository runtime dependencies (`tsx` and `@google/genai`), so the integration fix remains pending hosted CI confirmation.

## P126.9 — Evidence (2026-11-04)

- **OBSERVED:** source edits; syntax checks and repository metadata checks run as listed in the delivery message.
- **NOT_RUN:** full `test:pipeline`, complete DAG, typecheck/build and hosted GitHub Actions in this sandbox because the project dependencies (`tsx` and `@google/genai`) are not installed. The hosted P126.8 failure is explained by fixture environment contamination and SDK retry backoff; P126.9 still requires CI confirmation.

## P126.8 — Evidence (2026-11-04)

- **OBSERVED:** source edits; package/lock metadata set to `126` / `126.8`.
- **NOT_RUN:** npm test commands, typecheck, build and hosted Actions. Dependency installation could not complete in this sandbox, so this patch is not represented as CI-verified.

## P126.7 — Evidence (2026-11-04)

- **OBSERVED:** source and test changes; version metadata `126` / `126.7`.
- **NOT_RUN:** test execution, typecheck, build, hosted Actions and live diagnostics export in this reconstructed sandbox (dependencies are not present). The independent `test:pipeline` timeout (300s, 13/14 passed) remains unresolved; supplied logs do not identify the hanging operation, so no product-code change or timeout relaxat…

## P126.6 — Evidence (2026-11-04)

- **OBSERVED:** source change to allowlist.
- **NOT_RUN:** full hosted re-run of Core CI after this patch; pipeline hang root-cause isolation.

## P126.5 — Evidence (2026-11-04)

- **OBSERVED:** Simple Direct remains behind `BIFORGE_GEMINI_DIRECT_MODE === 'true'` (`server.ts`). - Architectural isolation of the direct branch from `detectUserIntentFlags`, mode selection, epistemic verifier, and search planner (source + p126-5 test). - Empty Gemini text rejected (unit). - Validation ledger…
- **NOT_RUN:** Live dual-run of the 30 scenarios against direct Gemini vs BiForge Simple. - Preview/production traffic with the flag enabled. - Aggregate non-empty / usefulness / latency comparison scores. - Owner decision to flip the default.

## P126.4 — Evidence (2026-11-04)

- **NOT_RUN:** ` in this sandbox (no full `node_modules` / provider keys).

## P126.3 — Conversation reliability and outcome diagnostics (2026-11-04)

- **NOT_RUN:** ` because `node_modules` is absent. Existing P123 carousel tests were attempted but are blocked under Node strip-only mode by unsupported TypeScript parameter properties; the repository's normal `tsx` runner is unavailable without dependencies.

## P126.2 — Search decoupling (2026-11-04)

- **NOT_RUN:** ` because `node_modules` is absent. Live Serper/Gemini Search, live Gemini answer delivery and production deploy `NOT_RUN`.

## P126.1 — Evidence (2026-11-04)

- **NOT_RUN:** ` because dependencies/`node_modules` are absent from this sandbox. Live Gemini, BYOK, key/model rotation against provider APIs, PDF/image upload, Expert/Architect user-level regression, hosted CI and production deployment `NOT_RUN`.

## P125.16 — Evidence (2026-11-04)

- **NOT_RUN:** ` in this environment (no provider keys in sandbox).

## P125.15 — Evidence (2026-11-04)

- Hosted typecheck/build and Render deploy failed TS2304 on nationalAuthorities.
- Imports restored.
- No behaviour change beyond compile.

## P125.14 — Evidence (2026-11-04)

- Prod log web_search event: status failed, reason ENOENT source-policy.json under dist-server; place "Цюрихе посмотри в"; chain connector skipped, serper failed, gemini quota.
- Deploy 5e96a8c / 125.13.
- Fixed path resolution and place boundary.

## P125.13 — Evidence (2026-11-04)

- CI policy change only: no runtime product behaviour change.
- Phrase-level routing tests remain in-repo and runnable via `npm run test:search-heuristics` / manual Actions workflow.

## P125.12 — Evidence (2026-11-04)

- Hosted 125.11: p124-26/28 class fixed; remaining failures isolated to p125-3 routing fixtures (result-complaint follow-up, FR place/temp).
- Fixed without loosening Core product contracts.

## P125.11 — Evidence (2026-11-04)

- Hosted 125.10 failures: p124-26 P-1 status silent contract; p124-28 T-2 planner dialogue visibility.
- Both were product-regressions from aggressive C125 short-circuits, not flaky CI.
- Fixed in code paths above.

## P125.10 — Evidence (2026-11-04)

- Sweep for the same class of failure as CI 125.8 (follow-up plan missing prior entities / rigid decisionNote).
- Code + related tests updated in one patch.

## P125.9 — Evidence (2026-11-04)

- Hosted CI 125.8 still failed test:core on retained tokens (“software releases” / Node LTS).
- Root cause in live-task state recovery, not the decisionNote assertion.
- Fixed in resolveLiveTaskState.

## P125.8 — Evidence (2026-11-04)

- Hosted CI 125.7: typecheck/build/pins green; sole product failure was universal-followup regression expecting old decisionNote.
- Behaviour unchanged (search still true, entities retained); assertion updated.

## P125.7 — Evidence (2026-11-04)

- **NOT_RUN:** in assistant sandbox without tsc install; hosted CI is authority.

## P125.6 — Evidence (2026-11-04)

- Micro-patch: C125 programme and WP3 audit align with owner decision — only Core CI, Answer Quality, Dependabot, and CodeQL remain meaningful; other product workflows retired as stale/harmful if left runnable.

## P125.5 — Evidence (2026-11-04)

- **NOT_RUN:** ` until release patch equals 125.5 and Navigator confirms user multi-turn outcome.

## P125.4 — Evidence (2026-11-04)

- **OBSERVED:** .
- **NOT_RUN:** ` if npm install is incomplete in the assistant environment. Hosted CI after apply is the offline evidence channel.

## P125.3 — Evidence (2026-11-04)

- **OBSERVED:** failure chain of the 2026-11-04 nine-turn dialogue is addressed at the gate/place/status layer in pure functions; live dialogue on a running release equal to 125.3 remains `NOT_RUN` (G5).
- **NOT_RUN:** ` until Navigator Actions on the applied commit.

## P125.2 — Evidence (2026-11-04)

- **OBSERVED:** a nine-turn dialogue about one city's current temperature; four turns ran no search, one used a mis-parsed place, one lost the place, one planner call timed out at 8003 ms, one turn answered through the model planner and the weather connector. The running release was 124.40, so patch 125.1 was not live when the dial…
- **NOT_RUN:** `.
- **KNOWN:** the zone filter removes harmless pages hosted in these zones; mirrors and aggregators remain uncovered (unchanged from P125.1).
- **IMPLEMENTED:** group B enabled in `config/source-policy.json` (zones `rus`, `moscow`, `tatar`, `xn--p1acf`, `xn--80adxhks`, `xn--d1acj3b`).

## P125.1 — Evidence (2026-11-04)

- **CHANGE:** D CONTRACT:** the P124.39 test fixture no longer uses `ria.ru` as an unlisted host.
- **NOT_RUN:** `.
- **KNOWN:** the Jina Reader proxy follows redirects itself, so only the direct-fetch fallback checks every hop; mirrors, archives, translation proxies, social platforms and aggregators are not covered; the zone filter also drops harmless pages hosted in those zones; the Cyrillic-name match is a… Open question O1 (bypass on expl…
- **IMPLEMENTED:** query-size rule and entity check (`server/queryFidelity.ts`), faithful plan rebuild, documented bounds instead of 500/300-character cuts; source-policy data file and filter (`config/source-policy.json`, `server/sourcePolicy.ts`) applied to the Serper response, fetch targets and redirect hops of…

## P124.40 — Evidence (2026-11-04)

- **NOT_RUN:** `.

## P124.39 — Evidence (2026-11-04)

- **OBSERVED:** search turns on `pre_classifier_live_data` used Russian queries (`planSource: heuristic`) and returned Russian-language hosts; the single turn on a model plan used English queries and hosts such as reuters, apnews, politico. Search result text is not exported, so which page first carried the Toledo claim is `NOT_VER…
- **NOT_RUN:** hosted GitHub Actions, live Serper/Gemini, real conversations, user-level answer quality.
- **IMPLEMENTED:** English-only provider queries for every plan; trusted-source registry and labels; OLD marking and exclusion for freshness `now`; corroboration and same-name rules in the evidence contract; region-qualified place matching.

## P124.38 — Evidence (2026-11-04)

- **OBSERVED:** 4 of 9 time-sensitive turns ran no search; 2 searches used the raw wording of the turn as query; 1 meta question about sources was sent to the search provider; one turn hit Gemini key-pool quota and fell back to Groq; two turns hit the 12 s model timeout. Search result text is not in the export, so whether individua…
- **NOT_RUN:** hosted GitHub Actions, live Gemini/Serper, real conversations, user-level answer quality.
- **IMPLEMENTED:** wider planner gate, live-thread follow-ups, meta-question guard with honest status block, dialogue-reference handling in the pre-classifier and in the planner-outage fallback.

## P124.37 — Evidence (2026-11-04)

- **OBSERVED:** DAG 28 PASS, 2 FAIL (`test:core`, `test:web`); one failing test in each.
- **NOT_RUN:** hosted GitHub Actions for this patch, browser E2E, live providers, user-level answer quality.

## P124.36 — Cross-mode header and More-menu parity (2026-11-03)

- **NOT_RUN:** TypeScript check, production build, existing browser E2E, hosted GitHub Actions, deployed UI and user-level validation. The sandbox has no installed `node_modules`; source-contract tests do not prove browser behavior.
- **IMPLEMENTED:** Conversational and Expert share the same context-aware decision brief and delete-dialogue menu actions. Architect is reachable from the chat header when enabled.

## P124.35 — Cross-domain context recovery and evidence relevance (2026-11-03)

- **NOT_RUN:** hosted GitHub Actions, live search providers, real LLM planner/fallback calls, deployed conversation scenarios, and user-level answer quality. No claim of live internet or factual answer quality is made.
- **IMPLEMENTED:** `server/webSearch.ts` now resolves recognizable follow-ups against only the immediately preceding user task. It preserves prior task/entities for continuation requests, does not carry context across an intervening unrelated user turn, and returns a deterministic contextual plan when the search planner is unavailable…
- **BLOCKED:** `npm ci --ignore-scripts --no-audit --no-fund` timed out twice. The global TypeScript check is blocked by the missing `vite/client` type package.

## P124.34 — Evidence (2026-11-03)

- **OBSERVED:** Core CI FAIL; `test:core` 204/206 (two tests in `tests/p124-28-search-planner.test.mjs`), `test:carousel-unit` 11/12 (suite file exit 2); 28 of 30 DAG checks PASS.
- **NOT_RUN:** hosted GitHub Actions, live Render probe, live Gemini/Groq/Serper timings.

## P124.33 — Evidence (2026-11-03)

- **OBSERVED:** carousel workflow red for probe/test mismatch and models.light order; Core CI failed on lint:copy, typecheck, package limits.
- **NOT_RUN:** full `npm ci` + hosted GitHub Actions + live Render probe + live Gemini/Groq timings from this sandbox. Deploy and green Actions are the Navigator pass criterion.

## P124.32 — CI and live-diagnostic corrections (2026-11-03)

- **IMPLEMENTED:** corrected the two stale test assertions reported by Core CI: P124.27 direct-mode source-count test now includes the additional sanitized runtime-config occurrence; P124.28 planner test now verifies the deadline-aware split gate (`plannerEnabled`, `plannerEligible`).

## P124.31 — Bounded model latency and carousel diagnostics (2026-11-03)

- **NOT_RUN:** dependency install (`npm ci` did not complete in this environment), TypeScript typecheck, full tests, hosted GitHub Actions, real Gemini/Groq/Serper/Jina/weather timings, and live Render endpoint probe. The archive is a reconstructed local source snapshot; remote HEAD and hosted CI are not inferred.
- **IMPLEMENTED:** Node syntax checks for changed scripts, workflow YAML parse, docs integrity/reference/environment checks, generated route/env inventory checks, and version metadata all pass. `server/llmLatencyConfig.ts` centralizes hard runtime ceilings (12 s per call, 30 s total request, 3 model calls);…

## P124.30 — Search provider chain (2026-11-03)

- **NOT_RUN:** live Serper / Gemini `googleSearch` through the chain, acceptance A5 against real 429s, hosted CI, remaining test suites.

## P124.29 — R-7 weather connector and cache (2026-11-03)

- **NOT_RUN:** live Open-Meteo / MET Norway (response shapes follow the providers' documented JSON from memory, `NOT_VERIFIED` against the live APIs), terms of use re-reading, accuracy against station data, hosted CI, full `test:core`. - Known limits: MET Norway daily values come from hourly temperatures only…

## P124.28 — T-1, T-2 and key-ownership fact (2026-11-03)

- **NOT_RUN:** live Gemini/Serper, planner accuracy (target >= 90% positive, <= 5% false triggers, acceptance A7), hosted CI, full `test:core`.

## P124.27 — K-2, K-3, K-4, K-5, E-1, A-1 and locale rule (2026-11-03)

- **NOT_RUN:** live Gemini (real 429 behaviour, real quota sharing), hosted CI, acceptance A5.

## P124.26 — R-3, R-4, R-6, P-1, P-2, P-3, T-3 (2026-11-03)

- **NOT_RUN:** live Serper/Gemini, hosted CI, acceptance A1, A2, A5.

## P124.25 (retrieval integrity) — R-1, R-2, R-5 (2026-11-03)

- **NOT_RUN:** live Serper/Jina/Gemini, hosted CI, the Zurich acceptance scenario (A1).

## P124.25 — Benign ResizeObserver notice no longer stops the UI (2026-11-03)

- **OBSERVED:** emergency screen with a single `WINDOW_ERROR`, message `ResizeObserver loop completed with undelivered notifications`, from the production bundle.
- **NOT_RUN:** browser re-check, hosted CI.

## P124.24 — Diagnostics separation, snapshot, restart evidence (2026-11-03)

- **OBSERVED:** the Simple/Expert header button now reaches a conversation log; Project Mode's route is unchanged. Secrets are exported only as set/length/fingerprint; the unit test asserts no key fragment appears.
- **NOT_RUN:** `conversationSessionLog()` against a live database, `npm run build` with the stamp step, typecheck, hosted CI, deployment. The temp-directory lifecycle file survives process restarts but not a new container; `no_record` then means "fresh filesystem", not "first ever start".

## P124.23 — V-1 fix and persistent search-decision logging (2026-11-03)

- **OBSERVED:** the V-1 cause (`[-+]?+8%` built from a signed value) is removed; the validator is wrapped so it cannot fail a response; search decisions, gate skips, and reasons are written to application logs with hosts only (no URLs, no digest text).
- **NOT_RUN:** full `test:core`/typecheck (no `tsx`/dependencies in the authoring sandbox), live Serper/Gemini, hosted CI, deployment.

## P124.22 — Web-search live-data defect audit recorded (2026-11-03)

- **OBSERVED:** run 41600406096 failed 6 tests, all from `lint:copy` reporting Cyrillic in `docs/biforge-web-search-analysis.md`.
- **NOT_RUN:** `.

## P124.21 — Search follow-up and numeric-gate repair (2026-11-02)

- **OBSERVED:** in source: direct mode performs Serper lookup for search-triggered turns, translates contextualized queries, injects search evidence, and uses Gemini grounding only if Serper has no usable result; recognized explicit-search follow-ups inherit search intent. Numeric validation now logs unsupported tokens without reje…
- **NOT_RUN:** local tests/typecheck (dependencies absent), live Serper/Gemini behavior, hosted CI.

## P124.20 — Key rotation in direct mode (2026-11-02)

- **OBSERVED:** in source: direct Gemini helper rotates up to 3 pool keys on quota/auth/5xx.
- **NOT_RUN:** live quota-exhaustion scenario, hosted CI.

## P124.19 — Search grounding in direct mode (2026-11-02)

- **OBSERVED:** in source: the direct Conversational call includes the Gemini `googleSearch` tool and returns grounding sources.
- **NOT_RUN:** live Gemini call, hosted CI. Search success on the hosted service is unverified.

## P124.17 — Direct Gemini pass-through (2026-11-02)

- **NOT_RUN:** .

## CURRENT EVIDENCE NOTE — P124.16 diagnostics contract test repair (2026-11-02)

- **NOT_RUN:** in this assembly. The required first rerun is `npm run test:project-diagnostics`, followed by the complete Core CI workflow.

## CURRENT EVIDENCE NOTE — P124.15 full-content diagnostics (2026-11-02)

- **NOT_RUN:** at assembly. Typecheck, production build, and hosted CI are.

## CURRENT EVIDENCE NOTE — P124.14 preflight false-positive repair (2026-11-02)

- **NOT_RUN:** in this delivery environment. The targeted test depends on repository dependencies (including `jszip`/`tsx`); no PASS is claimed for the new commit. ### Boundary This patch addresses the evidenced preflight false positive only.

## P124.13 — red-CI diagnosis and regression repair

- **NOT_RUN:** after the edits. - Hosted GitHub Actions for P124.13 and live user/provider scenarios are NOT_RUN. ### Status The four CI/E2E causes evidenced by the supplied logs have targeted source/test/workflow corrections. The browser workspace Node-crypto warning also has a source-level correction.

## P124.12 — security redaction, immutable CI and documentation maintenance

- **NOT_RUN:** . This is not a release acceptance claim.
- **BLOCKED:** by unavailable npm registry/cache; hosted CI and live behavior NOT_RUN. This is not a release acceptance claim.

## CURRENT EVIDENCE NOTE — P124.11 outbound web-fetch hardening and response headers (2026-11-02)

- **NOT_RUN:** supplied green archive has no installed `node_modules`; dependency installation is unavailable in this environment. - Static review confirms direct fetch redirect mode is `manual`, every hop is revalidated, and response bodies are streamed under a byte cap. DNS rebinding between validation and the runtime fetch rema…
- **BLOCKED:** npm registry DNS/network unavailable (`EAI_AGAIN registry.npmjs.org`); vulnerability state is not established. - Runtime tests, TypeScript typecheck, build, browser E2E, full DAG and hosted Actions —.

## CURRENT EVIDENCE NOTE — P124.10 diagnostics classification and emergency-screen test repair (2026-11-02)

- **NOT_RUN:** ; the supplied archive has no installed `node_modules`. ### Boundary This patch repairs the two audited regression risks. It does not claim a full CI pass or live user-value validation.
- **BLOCKED:** `; TAP failures take precedence, and passing TAP totals classify as `PASS`. - Added a regression case where `BLOCKED` appears in a passing test title. ### Verification - `node --test tests/p121-emergency-screen.test.mjs` —.

## CURRENT EVIDENCE NOTE — P124.9 crisis-turn question safety repair (2026-11-02)

- **NOT_RUN:** . ### Boundary This is a safety-behavior repair verified against a scripted fake provider. It is not evidence of real-model crisis-response quality or user value; live crisis scenarios remain `NOT_RUN`.

## CURRENT EVIDENCE NOTE — P124.8 obsolete model-prompt test cleanup (2026-11-02)

- **NOT_RUN:** . ### Boundary This is a test-maintenance patch only. It removes obsolete prompt-text expectations; it does not modify model instructions or assert that every possible static text test in the repository is obsolete.

## CURRENT EVIDENCE NOTE — P124.7 CI regression follow-up (2026-11-02)

- **NOT_RUN:** in this environment because the supplied dependency tree has no usable `tsx` installation. Hosted CI must establish the end-to-end result. ### Acceptance boundary The patch addresses both failures evidenced in the supplied run.

## CURRENT EVIDENCE NOTE — P124.6 CI regression and test-lifecycle repair (2026-11-02)

- **NOT_RUN:** `npm ci --ignore-scripts --no-audit --no-fund` timed out; `tsx` remains unavailable. No runtime PASS is claimed. ### Acceptance boundary This patch corrects the reported test contracts and lifecycle defects, but hosted CI must be rerun to establish the end-to-end result.
- **KNOWN:** ` workflow status while retaining the raw CI status. ### Verification evidence - `node --check` on changed `.mjs` files —.

## CURRENT EVIDENCE NOTE — P124.5 workflow diagnostics and regression repair (2026-11-02)

- **NOT_RUN:** supplied `node_modules` is incomplete (`tsx` package directory is empty); no claim of runtime PASS is made. ### Acceptance boundary The deterministic tests verify diagnostic formatting, workflow references, DAG prerequisites and source-contract changes. They do not establish live provider answer quality, deployed be…

## CURRENT EVIDENCE NOTE — P124.4 Architect and App Builder prompt refinement (2026-11-01)

- **NOT_RUN:** . ### Acceptance boundary These changes reduce prescriptive prompt behavior and prevent recovery from silently dropping prompt context or requested features. They do not prove improved generated-app quality, runtime correctness, or user outcomes.
- **BLOCKED:** at 71/72 subtests: the existing `compact-ci-artifacts-p94.test.mjs` file cannot load because `jszip` is not installed; the new C124.4 suite and all other loaded subtests passed. - `node --experimental-strip-types --test tests/app-builder-engine-p93-2a.test.mjs` —.

## CURRENT EVIDENCE NOTE — P124.3 response-path fidelity cleanup (2026-11-01)

- **NOT_RUN:** . ### Acceptance boundary These changes prevent specific deterministic transformations from deleting or hiding answer content. They do not establish that external models returned correct facts or that every Markdown construct renders optimally in the browser.
- **BLOCKED:** before the first test file because package `tsx` is not installed in this environment (`ERR_MODULE_NOT_FOUND`). - Direct execution of `tests/core.test.mjs` and `tests/pipeline.test.mjs` with Node type stripping —.

## CURRENT EVIDENCE NOTE — P124.2 instruction cleanup (2026-11-01)

- **NOT_RUN:** in this environment. - Live Gemini/Groq comparisons, raw-provider-to-visible-output comparison, deployed behavior and user-outcome evaluation —.
- **BLOCKED:** by missing package `zod` imported from `server/statePipeline.ts` (`ERR_MODULE_NOT_FOUND`). - Full `test:pipeline`, TypeScript typecheck/build, full `test:core`, full DAG and hosted GitHub Actions —.

## P124.1 static instruction inventory

- **NOT_RUN:** . This patch is an audit/documentation and inventory-integrity-test change; no production prompt or answer-processing code was modified. ### Source findings - Identified three overlapping decision-analysis instruction owners: `server/promptPacks.ts` (`DECISION_METHOD`), `server/reasoningState.ts`…
- **BLOCKED:** before test execution in this sandbox: local `node_modules/tsx` is a `0.0.0-test-shim` and cannot load `.ts`; retrying the core test with Node's experimental type stripping then stopped at missing package `zod` (`ERR_MODULE_NOT_FOUND`). The new inventory test itself passed independently.

## P124.0.2 — Cumulative C124 baseline and CI regression closure

- **NOT_RUN:** . ### CI failures reproduced and addressed - `test:core`: the P123.17 evidence-preservation prompt changes made six dialogue golden hashes stale. The complete current prompt set was recomputed from the reconstructed P123.23 source using Node's TypeScript type stripping; all affected Conversational/Expert decision, r…
- **BLOCKED:** before test execution by missing dependency `zod` (`ERR_MODULE_NOT_FOUND` in `tests/core.test.mjs`). The full `npm run test:web` wrapper passed using the temporary type-stripping compatibility setup.

## P124.0.1 — C124 documentation baseline

- **NOT_RUN:** ; this patch does not claim that existing prompts or transformations have been audited or cleaned. - Added the C124 normative mandate: BiForge is an engineering intermediary; external LLMs perform substantive reasoning and answer composition. - Defined audit scope across static/dynamic prompt…

## P123.23 — CI regression follow-up

- **NOT_RUN:** . Evidence addressed: - `test:core` reported a stale `GOLDEN_STEP_PREFIX` expectation versus observed current digest `30fdcd…`.

## P123.22 — CI evidence and logging compaction

- **NOT_RUN:** in this environment. Restored the prompt snapshot matrix from the earlier diagnostics implementation.

## P123.19 — CI failure repair evidence (2026-11-01)

- **OBSERVED:** Legacy generated Expense Tracker report `2c0ae028-1ec8-4f06-951b-fd4d382f5751` is `SUCCESS`, `goalImplemented=true`, and all seven declared validators pass (6 model calls, 42,403 ms). Architectural Test Lab report `385c4835-9aa8-407f-9f52-281021126974` is `PARTIAL`, `goalImplemented=false`, with `js-syntax` (`import…
- **CHANGE:** LOG.md and this evidence note added. package.json version/patch updated.
- **NOT_RUN:** . Hosted CI: NOT_RUN.

## P121.0.33 — Abort listener lifecycle on the shared build-job signal

- **NOT_RUN:** . Diagnostics reading note: the HTTP 409/404 entries listed as the last failed operations match the negative controls in `scripts/p118-architect-live.mjs` (unconfirmed passport build, missing artifact download) by source and timing; the live-run log was not inspected.

## P121.0.32 — Repair final stale Architect entry assertion

- Owner-provided CI evidence for commit `d45e05f4332a3d0365b013fca8387174ea4c96cb` records 27 passing checks and one failing core test: `tests/p121-cycle-governance.test.mjs` still expected `window.location.href = '/project'`.
- The current `src/App.tsx` sends the standard Architect entry to `/architect-lab`; `/project` remains the separate legacy ProjectMode route.
- Updated this test to assert the current entry route, absence of the browser confirmation prompt, and preservation of the legacy route. `workflow-dag` was downstream of the core test failure.
- No runtime, routing, generated-app, database, or Neon code changed.

## P121.0.31 — Repair remaining P119 route-boundary assertion

- **NOT_RUN:** until performed.

## P121.0.30 — CI contract alignment and Lab diagnostics fixture synchronization

- **NOT_RUN:** . No generated application runtime or Neon/database behavior changed.

## P121.0.29 — Stabilize Lab diagnostics browser assertion

- **NOT_RUN:** .

## P121.0.28 — Reapply live Quick Diagnostics streaming workflow

- **NOT_RUN:** . # Technical Report.

## P121.0.27 — Primary Architect entry and Lab diagnostics

- **NOT_RUN:** because `node_modules` is absent. Full hosted CI, deployed UI, and actual diagnostics endpoint behavior remain unverified until the user applies and tests this patch. - Owner-provided Quick Diagnostics report for commit `d8f74020a215fb5b8015b3185b142842e519dc0d` shows `TYPECHECK`, `ARCHITECTURAL TEST LAB CONTRACT`, …

## User evidence

- Neon SQL connection succeeded against database `neondb` on the `production` branch. `public_table_count` returned `0`; catalog queries showed no user relations.
- The owner confirmed the Neon endpoint host matches GitHub Actions `DATABASE_URL` (secret value not exposed here).
- This establishes an accessible apparently uninitialized database endpoint, not that historical application data is absent from every Neon branch or external store.

## Change

- Added manual workflow `.github/workflows/neon-initialize.yml`.
- It requires typed confirmation that a Neon backup branch was created and that the target is `biforge-production`.
- Workflow runs read-only preflight, existing `npm run db:migrate` (19 repository migrations), then read-only checks for migration ledger and required tables.
- Preflight refuses a non-empty `public` schema without a migration ledger.
- Workflow has concurrency serialization and performs no DROP/TRUNCATE/DELETE.

## Verification

- **NOT_RUN:** . - Do not report Neon initialized until the workflow finishes green and the app successfully creates/reads a project. --- # CURRENT EVIDENCE NOTE — P121.0.21 legacy Architect result-shape crash guard, 2026-10-30 - Source evidence: `publicJob()` in `server/appBuilderAdapter.ts` returns… Removed fabricated `codeTask`…
- **BLOCKED:** . Report generation and artifact upload use `always()` so failures still produce the single report. - Local checks: workflow contract tests 2/2 PASS; Node syntax checks PASS; YAML parse PASS; version metadata check PASS; synthetic dependency-failure run produced one report with dependent checks…

## Owner-approved direction

- New development is prioritized on the experimental fourth mode, Architectural Test Lab (`/architect-lab`).
- Routine repair of the legacy Architect is paused; its failures and diagnostic logs are retained as inputs for Lab-specific regression prevention and recovery design.
- The legacy route remains available and unchanged unless separately authorized.

## Verified implementation boundary from the available source tree

- **NOT_RUN:** in this workspace. # P121.0.15 — Architectural Test Lab (source implementation) - Status: IMPLEMENTED (experimental frontend route); independent backend engine: OPEN. - Added lazy `/architect-lab` route. The route does not mount legacy `ProjectMode.tsx`; it owns its form, progress state, completion panel, and ErrorB…
- **IMPLEMENTED:** (experimental frontend route); independent backend engine: OPEN. - Added lazy `/architect-lab` route. The route does not mount legacy `ProjectMode.tsx`; it owns its form, progress state, completion panel, and ErrorBoundary. - Reuses authenticated `/api/projects` and `/code/build` APIs plus shared job polling, provid…

## Evidence and limits

- **NOT_RUN:** . Production build: NOT_RUN.

## P121.0.13 — Browser black-screen diagnostics (2026-10-30)

- **NOT_RUN:** . The patch does not claim the black screen is fixed.

## Failure

- `docs-integrity` / `test:core`: `AGENTS.md missing required text: Mandatory protocol for the beginning of every session` after P121.0.10 rewrite renamed the section to "Session protocol".

## Fix

- Section §4 title restored to the required contract string; hard gates §0 unchanged.

## Checks (local)

- **NOT_RUN:** # CURRENT EVIDENCE NOTE — P121.0.10 AGENTS hard gates, 2026-10-30 > Additive. Prior notes retained.

## Checks

- **NOT_RUN:** here. --- # CURRENT EVIDENCE NOTE — P121.0.9 e2e and lint:copy fixes, 2026-10-30 > Additive. Prior notes retained.

## Failures addressed (from CI evidence)

- 1. lint:copy — UserGuide §6.2 one long paragraph exceeded 24 words; split into short paragraphs.
- Local `node scripts/lint-copy.mjs` → OK.
- 2. p120-architect-e2e — `novice-done` never appeared because `onFinished` set `showGuidedStart=false` and `loadProjects(id)` set `selected`, unmounting the wizard (`!selected && showGuidedStart`).
- Original P58 behavior kept the novice path mounted after finish.
- Fixed: render wizard while `showGuidedStart`; `onFinished` only refreshes/selects project; dismiss via Back.

## Boundary

- Does not by itself close BIO-004 live user-value.
- P121.0.7 UI unification still requires Actions/browser evidence after apply. --- > Additive top-level record.
- Prior notes below are historical and retained.

## Scope and provenance

- Implemented against the reconstructed archive `bf-121-0-6.zip` (patch 121.0.6).
- This is not a live remote checkout; hosted CI and deployment were not run.

## Checks run

- **NOT_RUN:** (incomplete dependency install in this workspace).

## Remaining gaps

- Live end-to-end Architect generation with real models and download validation still NOT_VERIFIED. `ProjectPathChooser.tsx` file still present (unused); language residue (e.g.
- Cyrillic in build-progress messages) not addressed in this patch.
- User-value evaluation of the unified flow against real tasks remains OPEN.

## Changes

- Distinguished historical records (completed roadmap entries, changelog, factual reports, decisions, and concise test/experiment outcome summaries) from obsolete active test implementations and temporary payloads.
- Clarified that completed tests may be retired without deleting the factual record that they ran or the conclusions supported by their evidence.
- Required reference, CI, compatibility, and unique-coverage checks before retiring executable tests or fixtures.
- No tests, source files, fixtures, or historical records were removed.

## Verification boundary

- **NOT_RUN:** . This patch does not claim that a full repository retirement audit is complete. --- # CURRENT EVIDENCE NOTE — Repository minimalism and test lifecycle policy, 2026-10-30.

## Decision and follow-up scope

- Established English as the sole language for maintained repository artifacts.
- Explicitly separated repository language from end-user input/output language support.
- Added a recurring roadmap stage to scan, classify, correct, and verify language residue, including runtime heuristics and test fixtures.
- No runtime heuristics or test prompts were changed because their behavior and intent cannot be safely inferred from a static scan alone.

## Initial observations before repair

- `node scripts/docs-integrity.mjs`: FAIL — `NEXT_PATCH.md` plus 14 retired prose documents were still present despite the canonical governance and docs-integrity check requiring their removal. `node scripts/docsCheckInventories.mjs`: PASS. `node scripts/statusGraph.mjs --check`: PASS. `node…
- Several failures were caused by missing `tsx` after `npm ci --ignore-scripts --no-audit --no-fund` timed out.
- The docs-integrity failure was independent and reproducible.

## C121/P121.0.1 repair scope

- Set package version/patch to `121` / `121.0.1` and synchronized the root lockfile metadata.
- Generalized the P120 E2E preflight so it checks current version/patch consistency while retaining P120 browser tests as regression coverage.
- Updated the P120 acceptance-evidence test to distinguish the historical P120.0.7 acceptance record from current C121 package metadata.
- Removed the retired handoff and obsolete side-document files listed in the patch delivery summary.

## Post-repair verification results

- **BLOCKED:** . The failing runtime-dependent checks could not import `tsx`; `test:compact-ci-artifacts` could not import `jszip`. `npm ci --ignore-scripts --no-audit --no-fund` timed out, leaving dependencies incomplete. - `node scripts/schemaValidate.mjs` without the required `--type` argument — invocation…

## Evidence boundary

- **NOT_RUN:** / NOT_VERIFIED. The P120 Architect browser test uses a mocked project/build API and explicitly exercises `path-novice`; it does not establish live model generation quality or compliance with the current one-flow Architect requirement.

## Changes represented by this record

- `AGENTS.md` now contains the canonical obligation map and mandatory start-of-session protocol.
- Each session must independently reconstruct current state and choose its own task; no pre-written task is carried forward as binding. `NEXT_PATCH.md` is retired as a root planning/handoff file.
- CI-generated run evidence is renamed to `PATCH_EVIDENCE.md` / `BIForge-PATCH-EVIDENCE.md` so a diagnostic artifact cannot be mistaken for a future-work assignment.
- The roadmap keeps its completed phase history, but the current control section says the next task must be re-evaluated each session.
- Historical mentions of retired task files are not current instructions.

## Checks actually run in this reconstructed tree

- `npm run docs:check` — PASS, including canonical documentation integrity, generated inventories, check graph, and capability graph. `node --check` — PASS for modified JavaScript module files. `node --test tests/dag-p107.test.mjs tests/evidence-p105.test.mjs` — PASS, 27/27.
- Manual temporary-directory smoke test of `scripts/package-ci-artifacts.mjs` — PASS; output contained exactly `BIForge-PATCH-EVIDENCE.md` and `biforge-ci-logs.zip`. `tests/ci-diagnostics-chain.test.mjs` and `tests/compact-ci-artifacts-p94.test.mjs` — unable to start because `jszip` is not…

## Findings

- The documentation inventory had multiple competing sources for user-agent contracts, roadmap/task state, operating rules, user-value evidence, deployment context, archive delivery, and architectural guardrails.
- The older normative text allowed or described simplified/professional Architect interaction profiles in places, while the current product requirement is one Architect agent with no visible mode choice or independent flow.
- The previous documentation-integrity script enforced old document names and headings, so it would keep the obsolete document topology alive.
- This patch defines a single hierarchy, consolidates specialist documents, updates active references and documentation checks, and lists superseded prose files for deletion.

## Evidence boundaries

- **CHANGE:** LOG.md entries, AI-USER-VALUE-REPORT.md, task documents, live-run notes and test artefacts.

## 1. Early Foundation Snapshots (bf-01 … bf-09 / v14-main)

- **CHANGE:** LOG_AGENT_BEHAVIOR.md and README describe agent behaviour and Railway deployment.

## 2. Project Mode and Persistence Expansion (bf-16 … bf-26)

- **CHANGE:** LOG.md / CHANGELOG_AGENT_BEHAVIOR.md - ARCHIVE/ directory with P08–P17 SPEC and REPORT documents.

## 3. AI-Native Renovation Foundations (P106–P112, visible in later snapshots)

- **BLOCKED:** semantics; CI two-artefact handoff; architecture checks.

## 4. Conversational Agent Recovery (P116)

- First observed: Documented as accepted 2026-10-28 in AGENTS.md and roadmap of bf-118.
- Problem addressed: Simple/Expert conversation modes producing generic or stalled answers.
- Specified behaviour: Useful multi-turn conversation comparable to a capable general-purpose chat; truthful failure signalling.
- Components: conversationMode.ts, cascade foundations, prompt adjustments, residual Node LTS version reporting.
- Actually implemented: Recovered conversation path with 80 % live PASS; residual B3 (Node LTS number) left open.

## 5. Expert Foundations and Cascade (P117.x)

- **CHANGE:** LOG, roadmap.

## 6. Complex Software Architect Agent (P118 line)

- **CHANGE:** LOG and task document.
- **NOT_RUN:** .
- **BLOCKED:** (CSRF, fixed); later runs HONEST_NON_PASS with diagnostics.

## 7. Cross-Cutting Observations

- **OBSERVED:** in source): Conversational and Expert planning and prompt entry moved to `server/conversationalAgent.ts` / `server/expertAgent.ts` selected by `server/agentRouting.ts`; route, wire key and prompt pack text remain shared; user copy uses the three approved names. - P119.0.1–0.2 (post-archive tip,… Architect is a separ…
- **NOT_RUN:** . - Evidence rule in AGENTS.md is strict: green CI of an earlier commit does not speak for a later one; NOT_RUN is never PASS. ### 7.2 Documentation discipline - Transition from many competing SPECs/REPORTs (ARCHIVE/) to single rolling files (task, roadmap, report, operating rules) is complete… Architect is a separa…

## 8. Summary of Confidence by Programme Phase

- | Phase | Code presence | Local tests | Hosted CI | Live product outcome | Overall confidence | |--------------------|---------------|-------------|-----------|----------------------|--------------------| | Foundations P106–P109 | High | High | High (at closure) | N/A | High | | P116…

## 9. Remaining Open Items at Archive Tip (P118.3.3)

- 1.
- Hosted CI green confirmation for the 118.3.3 commit.
- 2.
- Deploy + `/health` commit match.
- 3.

## P127.6 — Existing project continuation

- P127.6 introduces a safe initial continuation workflow.
- The API validates ownership and integrity of a source ZIP, checks CRC and archive paths, caps context at 80 files / 80,000 characters, and starts a new staged job with the selected source version included as context.
- It does not overwrite the source artifact.
- This is a context-based continuation, not yet a full AST-aware patch engine.

## P127.8 — Project Mode recovery and acceptance

- **TESTED:** / BLOCKED / NOT_RUN.
- **IMPLEMENTED:** `server/appBuilderAdapter.ts`: added `claimResumable`, which uses a single PostgreSQL CTE/update with `FOR UPDATE SKIP LOCKED` to atomically lease stale jobs across replicas. The lease refreshes heartbeat/update timestamps before `executeJob` is scheduled.
- **BLOCKED:** / NOT_RUN.
