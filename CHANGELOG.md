## [129.39] - UI: remove offer-type tabs; Serper 400 diagnostics

- Remove Direct offers / Holiday owners (and All) chips; toolbar is Hidden / Recheck filters / Recheck list.
- Serper: sanitize/truncate query; include response body snippet on HTTP 400; longer failure text in UI log.
- Full search kept=0 was driven by Serper HTTP 400 on all discovery queries + happyholiday catalogue correctly rejected as tourism.
- USER_VALUE / BUGFIX.

## [129.38] - CI: formatHideLog import; discovery order test; TECHNICAL_REPORT 129.27–129.38

- Import `formatHideLog` in pipeline (typecheck/build/Render).
- P128.3 expects owner microsite before Facebook after portal-first ranking.
- TECHNICAL_REPORT.md: session work from P129.27 through P129.38 (after last required P129.26).
- BUGFIX + DOCS.

## [129.37] - Product precision gate + quality diagnostics

- Hide unavailable (DE/EN Flatfox), for_sale even with rent collage, weak Facebook photo.php, stricter rooms/municipality conflicts.
- Broader platform/junk contacts (betterhomes, be-homes, einwohnerkontrolle, *.ai business…).
- Evidence: strip portal footer chrome (Flatfox About us / Imprint / ©) before store/export.
- Discovery: rank Homegate/Tutti/Flatfox ahead of Facebook snippet-only; bury photo.php.
- Soft-seen expanded so credibility rejects can be re-tried on later runs.
- Logs: `immofinder_hide` one line per reject; `immofinder_product_quality_summary` with credibility_denies, evidence_kind, credible_kept.
- USER_VALUE.

## [129.36] - No duplicate Source text in cards / Drive exports

- `immoEvidenceBlock` omits source text when it is the same (or near-duplicate) of the card about line.
- Real `evidence_screenshot_url` still appears as Source capture.
- Screen UI uses the same redundancy check.
- USER_VALUE; stops filling Doc/Sheet with repeated snippet text.

## [129.32] - Fix missing evidence-first imports in pipeline

- `immofinderPipeline.ts` now imports `buildEvidenceText`, `credibilityRejectReason`, `priceFromEvidence`, `isPlatformOrJunkContact`, `EvidenceKind` (runtime/TS break from 129.30 body without imports).
- Includes 129.31 evidence export surfaces (card model, Drive Doc/Sheet, screen).
- BUGFIX CI/Render.
- Contract P129.7 allows longer about (evidence excerpt up to 360).

## [129.30] - ImmoFinder evidence-first credibility gate

- Architecture: English section **ImmoFinder search result quality** (evidence-first product contract).
- `buildEvidenceText`, `credibilityRejectReason`, `priceFromEvidence`, platform-contact strip in `immofinderCore.ts`.
- Pipeline: store `raw.evidence_text` / `evidence_kind`; reject seeker/sale/holiday/rooms/municipality conflicts before keep; prefer evidence for price and description.
- Recheck filters apply the same credibility gate; card `about` prefers evidence excerpt.
- USER_VALUE; fewer collage cards, more honest drops.

## [129.28a] - CI: English Delete label; no Status in email text contract

- lint:copy forbids Cyrillic in src — button/confirm use English "Delete".
- Contract no longer expects Status: CONTACTED in formatListingsText (status UI removed).
- BUGFIX CI only.

## [129.28] - Delete button on cards; remove letter and status UI

- Red **Удалить** on each card (right, opposite Open post/listing) hard-deletes the row from `immofinder_listings`.
- Removed **Copy German letter** and **Status** control from the card footer.
- Sheet/Doc no longer show Status; contracts updated.
- USER_VALUE + BUGFIX layout.

## [129.26] - Persist listing publish date on update; use LLM date quote

- Root cause: upsert on existing canonical_key never wrote `raw.listed_at` (only touch URLs/contacts), so dates found on a later pass were discarded.
- Root cause: LLM schema asked for `listed_at_quote` but extract() ignored it.
- Fix: merge `raw` (listed_at, price) on upsert update; pass listed_at_quote into parseListedAt; prompt explicitly for publication date phrases.
- BUGFIX; existing rows still need Recheck list or a new search pass to fill dates.

## [129.25] - Hide unavailable listings; CI for published-only dates

- Detect portal offline phrases ("nicht verfügbar" / "no longer available") at ingest and on Recheck list; hide with reason `listing_unavailable`.
- Recheck persists hide via `updateListingContacts`; fetch uses Cache-Control no-cache.
- Contract tests expect publication date only (no search "Found" line); package-lock patch synced to 129.25.
- BUGFIX; live recheck quality still depends on portals returning HTML (Facebook often blocked).

## [129.24] - Source publish date on cards; stronger date parse

- Cards, Sheet/Doc, email/Telegram show only the source publication date (`published dd.mm.yyyy`); search/discovery time is no longer rendered.
- Stronger `pageMeta` / `parseListedAt`: more meta/JSON-LD keys, Facebook utime, labelled DE/FR/IT/EN dates, relative phrases; date text window 12k chars.
- Recheck uses the same parser so a later Recheck list can fill missing `raw.listed_at`.
- BUGFIX + USER_VALUE; live portal recheck quality NOT_RUN until deploy + Recheck list.

## [129.23a] - Recheck CI repair and diagnostics integration

- Export detailed publication-date parsing and privacy-filtered date snippets; add recheck contracts to the existing agents category suite.
- Integrate recheck list, completeness diagnostics, graph and experiment/history records.
- BUGFIX; live listing quality NOT_RUN.

## [129.23] - Show menu current/hidden/all; publication date on cards

- Show menu on the ImmoFinder screen has three items: **current** (default, hidden rows excluded), **hidden**, **all** (`GET /api/immofinder/listings?scope=all`); status filters removed from the menu.
- Cards (screen, Drive Sheet/Doc, email/Telegram) show "published dd.mm.yyyy" before "found" when the page states it; `pageMeta` reads meta/JSON-LD `datePublished`/`datePosted` first, text dates stay as fallback.
- USER_VALUE; live Drive/email/portal run NOT_RUN.

## [129.22] - Recheck 500 fix (price in raw); lint:copy

- recheckStored no longer SELECTs missing rent_monthly_chf/pricing_unit columns; updates `raw.price` instead.
- Recheck API returns the real error detail on failure.
- Shortened hidden-list copy for lint:copy (≤24 words).

## [129.21] - Recheck status + Hidden in Show filter; CI P128.8

- Recheck list shows live status (Rechecking… / Done: checked N, hid M, price fixed K).
- Show dropdown includes **hidden (N)**; can open hidden cards; link from "N hidden as not suitable".
- P128.8 accepts `/api/immofinder/recheck` in UI contract.

## [129.20] - Recheck list; safer price years; hide junk on recheck

- Single **Recheck list** button replaces Find contacts / Clean up / Delete all & reset.
- `POST /api/immofinder/recheck` re-applies current filters on saved rows (list/seeker/geo/agency/rooms) and re-parses prices from stored text without external LLM/search.
- parsePrice: do not treat calendar years 2020–2035 next to ab/per/verfügbar as rent; prefer full amounts (1'300 over 300).
- LIST_URL_MORE: preise.html, /liste, booking hotel, gruppenhaus, _join_.

## [129.17] - Carousel commune names in step title

- ProgressEvent.communes carried through saveProgress into the live UI.
- Step title becomes `Step 2 of 3 · Searching the web by commune: Praden, Tschiertschen` for the active carousel slice (not only in the log lines).

## [129.16] - Group chips, carousel commune title, stronger price parse

- Typecheck: `municipalityGroups` on Settings client type S.
- Group checkboxes rewrite `communes` and dim chips outside the selected group(s).
- Carousel live title lists the communes in this tick (`Carousel: Flims, Trin — …`).
- parsePrice: bare `1510.-`, spaced thousands, Fr-first, JSON-LD price, Miete-without-CHF; wider context; month assumption in long-term band near rent words.

## [129.15] - Groups, per-source toggles, two search buttons, finish-all

- CI: checkDrive again reports `missing in the folder: … ImmoFinder drafts` when Doc is absent (P128.6).
- Municipality groups: two fixed sets of 22 (Group 1 Rhine/Chur, Group 2 Prättigau/Surselva/south); Settings checkboxes control which groups run.
- Sources: individual checkboxes for web search + each of 13 Swiss portals; applySettings filters portalQueries by host.
- UI: only Carousel and Full search buttons; both discovery modes run finishAll (no query-count cap); full uses full run deadline.
- runMaxDurationMs 45 min; Serper pacing unchanged.

## [129.14] - Drive status "exported" when Sheet+Doc both OK

- exportDrive: clean dual write returns status `exported` (not `exported (sheet: updated; doc: updated)`); notes only for missing file or plain-text fallback (P128.6).

## [129.13] - Carousel: no query-count budget; Serper time pacing

- Carousel runs every private + portal template for its commune slice (finishAll); no maxQueries=12 cap.
- Wave deadline for carousel = full runMaxDurationMs (not 10 min priority cap).
- Serper paced by serperMinIntervalMs (default 1.5s) and serperMaxPerMinute (default 40); back-off on 400/429.
- Discovery templates interleaved (private/portal) so site: portals are not always after a long private queue.
- Priority/full Stage 1 still uses query slices; extended continues via discoveryQueryOffset.

## [129.12] - Drive: update Sheet even if Doc is missing

- exportDrive no longer fails closed when only one of Sheet/Doc is in the folder: writes the file that exists and reports the missing one in status.
- checkDrive returns partial when only Sheet or only Doc is found.
- Does not create files (service accounts still cannot create in personal My Drive).

## [129.11] - P128.3 FB snippet needs monthly price under requirePrice

- agents-contract P128.3: Facebook marketplace fixture snippet includes CHF monthly rent so requirePrice (config.quality) keeps it alongside the owner page (kept=2).

## [129.10] - CI green + Serper HTTP 400

- Serper: clamp `num` to 1..10 (API returns 400 above 10); skip empty queries; resultsPerQuery back to 10.
- discovery buildQueries: default families only from non-empty query lists (portalQueries empty → no site: noise in tests).
- Settings: if only `search: false` is sent, swiss-portals stays off (discovery disabled).
- Restore phase-3 catalogue sources (ferienhausmiete / happyholiday) for contracts; UI still only search + swiss-portals.
- DEFAULT_QUALITY.requirePrice false; product still requirePrice via config.quality + settings default true.
- agents-contract fixtures: monthly CHF on keep pages; package-lock patch synced to 129.10.

## [129.9] - Swiss portals (private + price only) + Sources cleanup

- Sources: Homegate, ImmoScout24, Flatfox, Newhome, Tutti, Anibis, Petitesannonces, Immobilier, Acheter-Louer, Immostreet, Home, iCasa, Urbanhome via site: discovery (portalQueries).
- Quality: requirePrice + rejectNonMonthly default on; looksLikeAgencyListing drops AG/GmbH/Makler unless "von privat".
- Settings Sources panel: only "Web search (Facebook & private)" and "Swiss portals …"; removed Ferienhausmiete / HappyHoliday / Other catalogue.
- Holiday catalogues removed from active config.sources (discovery-only pipeline).
- Portal hosts are fetched (not snippet-only) so monthly rent and contact can be extracted.
- Cumulative with 129.8: curly-quote price parse, Nachmieter = offer, higher search early-stop.

## [129.8] - Quality search: price parse, Nachmieter, discovery

- parsePrice: normalize curly quotes (1’570) and thin spaces; detect month from inkl. NK / per month / wider context window.
- isSeekerPost: "Nachmieter gesucht" is an offer in CH (successor tenant), not a seeker reject.
- discovery: more long-term private / Facebook / Anibis-Tutti / Nachmieter queries; resultsPerQuery 15; broader skipHosts (booking, cozycozy, realadvisor, airbnb, …).
- stopAgencies: Booking, Airbnb, Vrbo, Cozycozy, HomeToGo, Fewo-Direkt.
- search consecutive early-stop 48 → 64; allCommunes prefers long-term templates.
- contactEnrichment budget slightly higher (35 searches / 10 reverse-image).

## [129.7] - Drive Sheet/Doc match the screen; no letters in exports

- Sheet and Doc now show the same card as the app (src/immoCard.ts): headline, text, link + list warning, found time, Open button, Photo 1-3, status, dark colours; same rows in the same order as the screen.
- Doc no longer contains letter drafts; screen no longer has "Read the German letter" (Copy German letter stays).

## [129.6] - Conservative junk rejects only

- Hard-drop non-specific Facebook (_join_, group root); keep /posts/ and marketplace.
- Reject realadvisor average/list URLs and «mittlere Mietpreis» titles.
- Reject clear foreign DE region markers (Sauerland/Eslohe) and rooms >= 12 (group houses).
- Does not tighten price/unit/contact rules that feed good long-term FB hits.

## [129.5] - Internal schedule off under node:test

- Skip in-process ImmoFinder hourly timer when NODE_TEST_CONTEXT / NODE_ENV=test / IMMOFINDER_DISABLE_INTERNAL_SCHEDULE=1 (fixes agents-contract 60s timeout).

## [129.4] - Built-in hourly ImmoFinder schedule

- Default schedule: every 1 hour (not manual). In-process tick every ~10 min starts carousel when due — no external cron required.
- External X-Immofinder-Secret cron remains optional.

## [129.3] - Price period always explicit on cards

- formatPriceLine / UI: CHF amount + per night|week|month|season; never show night rate as bare monthly.
- Quote without period word gets `(per …)` or `(period unclear)`.

## [129.2] - Price quote on cards + regex + diagnostics

- C: parsePrice accepts `2850.- CHF` and `ab CHF 1'790`.
- F: formatPriceLine / UI show raw price quote when monthly CHF missing.
- A: `immofinder_price_diag` console log when price missing or price_* reject (snippet around CHF/Miete).

## [129.1] - CI patch format + reject seeker/aggregator junk

- package.patch format `129.1` (P127.11 regex). Stronger seeker detection (Suche/Wer hat/zu mieten); Nestoria-style list URLs rejected; skipHosts nestoria/immowelt.

## [129.0.1] - CI: P128.3 wave pin + docs allowlist

- P128.3 runPipeline uses wave=priority so search_queries stays 1 under commune rotation (full mode allCommunes was double-counting).
- Removed docs/C129_QUALITY_SEARCH.md (not on prose allowlist); C129 ops notes live in docs/EXPERIMENTS.md.

## [129.0] - C129 Quality Search — commune carousel

- Phase shift: searcher construction closed; quality programme opens (carousel profile, 2 communes/tick, Serper+LLM extract, catalogues skipped on carousel).
- Settings `profile` carousel|burst, `carouselCommunesPerRun`; UI + main-screen Carousel tick; docs/C129_QUALITY_SEARCH.md + EXP-IMMO-3.
- Version 129 / patch 129.0.

## [128.21.4] - Listing cards + lint:copy CI

- CI red was lint:copy only (ImmoFinder Stage-1 help >24 words); shortened. Cards (UI, Drive sheet, Docs, email/Telegram): first line place · price · rooms · contacts; then short object text; then direct object link (flags list/group URLs).
- Scope: src/ImmoFinder.tsx, server/immofinderDelivery.ts, CHANGELOG.md, TECHNICAL_REPORT.md.

## [128.21.3] - Search early-stop too aggressive; rank in-zone SERP first

- Search consecutive non-keep stop raised 12→48 (catalogues stay ~14). pickItems ranks whitelist-commune hits before unknown/outside so good private ads are not cut by an early bad streak. Addresses Stage-1 run with 0 new and source_early_stop on web search.
- Scope: server/immofinderDiscovery.ts, server/immofinderPipeline.ts, CHANGELOG.md, TECHNICAL_REPORT.md.

## [128.21.2] - CI: package-lock patch + P128.1 empty-source contract

- package-lock.json patch 128.20→128.21 (P127.11). P128.1 disables discovery in the empty-catalogue fixture so source_no_candidates is asserted without discovery_skipped ordering noise.
- Scope: package-lock.json, tests/agents-contract.test.mjs, CHANGELOG.md, TECHNICAL_REPORT.md.

## [128.21.1] - Fix ImmoFinder tests + search-first priority (EXP-IMMO-2)

- Fix full-mode double-run of the same discovery queries (search_queries inflated); restore progress text `Searching:`. Priority wave runs web search first (highest in-zone private yield), then phase-1 catalogues. agents-contract P128.2 expects 1 city index page under city-first. package patch 128.21.
- Scope: server/immofinderPipeline.ts, tests/agents-contract.test.mjs, package.json, CHANGELOG.md, TECHNICAL_REPORT.md.

## [128.21] - ImmoFinder priority stages, early geo, contact quality (EXP-IMMO-2)

- Wave modes: priority | extended | full (API `wave`, UI Stage 1 / Stage 2 / Full). Priority (~10 min) runs phase-1 catalogues then a capped web-search slice so valuable private hits arrive early; extended continues search + phase≥2. Per-source stats + consecutive-bad early-stop. Early geo: URL + title/snippet + post-fetch text before LLM. Plausible Swiss phone/email filters drop placeholders (+41000000000, random locals).
- Scope: server/immofinderCore.ts, server/immofinderPipeline.ts, server/immofinderRoutes.ts, src/ImmoFinder.tsx, tests/immofinder-quality.test.mjs, docs/EXPERIMENTS.md, CHANGELOG.md, TECHNICAL_REPORT.md. Patch 128.21.

## [128.20] - ImmoFinder dual-wave search: priority 10 min then extended (EXP-IMMO-1)

- Priority wave (~10 min): ferienhausmiete + happyholiday commune pages only; early URL geo-filter skips out-of-zone places before fetch/LLM; mid-wave delivery to Drive/email/Telegram. Extended wave: web search + low-priority sources with remaining time up to 30 min, second delivery. Removed graubuenden/traum/appa catalogues that burned budget on non-listings.
- Scope: server/immofinder{Core,Pipeline,Routes,Settings}.ts, config/immofinder.json, package.json, package-lock.json, CHANGELOG.md, TECHNICAL_REPORT.md. Patch 128.20.

## [128.19] - ImmoFinder search recall: catalogues beyond first N, aliases, filters (EXP-IMMO-1)

- Catalogues no longer slice to maxDetailPages before the seen check, so later runs reach links beyond the first 60/80. Soft quality rejects recheck after 1 day (hard rejects keep full TTL). Phase-2 sources run after phase 1. Municipality aliases (St. Peter, Seewis, …), rooms ("3 1/2", "Zimmer: 3"), seeker/list/price detectors tightened; monthly rent cap applies only to explicit monthly prices. Final FUNNEL progress line.
- Scope: server/immofinderCore.ts, server/immofinderPipeline.ts, server/immofinderStore.ts, server/immofinderSettings.ts, config/immofinder.json, package.json, package-lock.json, CHANGELOG.md, TECHNICAL_REPORT.md. Patch 128.19.

## [128.18] - EXPERIMENT: Immofinder cron passes the global /api auth gate (EXP-IMMO-1)

- Scheduled `POST /api/immofinder/run` got 401 from the global session gate in server.ts before its secret was checked, so no scheduled search ever started. The gate now lets exactly that call (POST, that path, `X-Immofinder-Secret` present) through; the secret is still verified by the ImmoFinder middleware.
- Scope: server.ts, server/immofinderRoutes.ts, tests/agents-contract.test.mjs, package.json, package-lock.json. Patch 128.18.

## [128.17] - EXPERIMENT: Immofinder schedule/cron diagnostic logs (EXP-IMMO-1)

- Log every `POST /api/immofinder/run`: `immofinder_run_request` (schedule vs session, secret present/configured), `immofinder_schedule_tick` (mode, dailyAt, due, skipped, lastRealRunAt), accept/reject codes. New `GET /api/immofinder/schedule-status` for live due diagnosis. Cron workflow fails on unexpected HTTP so misconfigured secrets surface in Actions.
- Scope: server/immofinderRoutes.ts, .github/workflows/immofinder-cron.yml, package.json, package-lock.json. Patch 128.17.

## [128.16] - EXPERIMENT: Stronger Immofinder contact search queries (EXP-IMMO-1)

- Stronger public contact enrichment: Swiss directory queries (`site:local.ch`, `site:search.ch`), more CH contact keywords, portal exclusions, up to 5 Serper queries per listing, candidate URLs ranked (directories / .ch / Impressum first), deeper extraction near Kontakt/Telefon windows, richer notes (`q:…`, `candidates_N`).
- Scope: server/immofinderContactEnrichment.ts, package.json, package-lock.json. Patch 128.16.

## [128.15] - EXPERIMENT: Contact search progress on screen (EXP-IMMO-1)

- UI shows a live **Contact search in progress…** panel (checked/queued, found, current listing) while **Find contacts for saved** runs; polls `GET /api/immofinder/enrich-status` every 2s; final message when done. Button disabled during the job.
- Scope: server/immofinderRoutes.ts, src/ImmoFinder.tsx, package.json, package-lock.json. Patch 128.15.

## [128.13] - EXPERIMENT: Always enrich listings without phone/email (EXP-IMMO-1)

- Contact search selection is based only on missing direct phone **and** missing email (trim empty). `contact_status` no longer blocks enrichment. Applies to live pipeline keeps and to **Find contacts for saved** (all visible cards without phone/email, higher Serper budget for the batch pass).
- Scope: server/immofinder{Store,Pipeline,Routes}.ts, package.json, package-lock.json. Patch 128.13.

## [128.12] - EXPERIMENT: Re-enrich contacts on saved listings (EXP-IMMO-1)

- New action **Find contacts for saved**: `POST /api/immofinder/enrich-existing` runs public-source contact enrichment on up to 40 already saved listings that still lack phone and email (does not delete anything). UI button next to Clean up list.
- Scope: server/immofinder{Routes,Store}.ts, src/ImmoFinder.tsx, package.json, package-lock.json. Patch 128.12.

## [128.11] - EXPERIMENT: ImmoFinder stop search button (EXP-IMMO-1)

- Stop search: `POST /api/immofinder/stop` cancels the active run; pipeline checks `shouldCancel` between items and returns early. UI shows **Stop search** while a run is in progress (header + main). Results already saved stay kept.
- Scope: server/immofinder{Routes,Store,Pipeline}.ts, src/ImmoFinder.tsx, package.json, package-lock.json. Patch 128.11.

## [128.10] - EXPERIMENT: ImmoFinder quality gates, no translation, long background runs (EXP-IMMO-1)

- Quality filters (saved in settings): max monthly rent CHF (default 2000), max listing age days (default 180), reject night/week/season prices, optional require price, reject seeker posts, optional require direct contact. Parsed price/date stored on the listing when found.
- Russian translation removed from the model schema, UI, Telegram, email and Drive text. Listing text stays in the original language (usually German); UI copy stays English.
- One search cycle is server-side, fire-and-forget (HTTP 202), wall-clock up to 30 minutes; AI extraction retries with 2/3/5/10 minute back-off when the model fails, while time remains. Closing the browser does not stop the run; schedule mode already runs via cron + secret.
- Scope: server/immofinder{Core,Pipeline,Settings,Delivery}.ts, src/ImmoFinder{,Settings}.tsx, config/immofinder.json, package.json, package-lock.json. Patch 128.10.

## [128.9] - EXPERIMENT: ImmoFinder public-source contact enrichment (EXP-IMMO-1)

- After a listing is already kept, if it still has no direct phone/email, an optional enrichment stage runs secondary Serper queries (property name + commune + verified owner name) and, when a reverse-image provider is supplied, public reverse-image lookups on listing photos. Candidate public pages are fetched with the existing polite fetcher; contacts are taken only from page text / tel: / mailto: (never invented).
- Listings without contacts are still stored and remain visible; enrichment failure never drops a listing. Feature is on by default via `config/immofinder.json` → `contactEnrichment.enabled: true` (budget: 25 extra searches and 8 reverse-image calls per run).
- New module `server/immofinderContactEnrichment.ts`; small hooks in Core (config type), Pipeline (post-keep enrichment + `counts.enriched`), config. No new environment variables; reuses `SERPER_API_KEY`. Reverse image is best-effort and skipped when no provider is passed.
- Scope: server/immofinderContactEnrichment.ts (new), server/immofinder{Core,Pipeline}.ts, config/immofinder.json. Patch 128.9.

## [128.8] - EXPERIMENT: ImmoFinder listing types, cleanup, more owner-directory pages (EXP-IMMO-1)

- Two result types (owner decision 2026-11-16): holiday owners (cold approach for a long-term lease) and direct long-term offers by private persons (reply to the ad). Tabs in the list; each type has its own German letter; Facebook posts get "Open post" and the advice to message the poster in Messenger.
- New rejects: sale ads, shared rooms (WG), developer projects with several flats, more search-page URL patterns (home.ch, immoscout filters). Commune named in the URL or title overrides one guessed from a snippet (ü/ö/ä spellings included).
- Cleanup: saved results that current filters would reject are hidden (not deleted); automatic at the start of every search and by the button "Clean up list" (`POST /api/immofinder/cleanup`).
- Ferienhausmiete: object pages are matched by `/<id>.htm` and seven region pages are crawled (Flims-Laax, Surselva, Chur, Lenzerheide, Thusis, Savognin, Klosters). Pages that mention long-term rental get the chip "long-term mentioned".
- Sign-in link on 401. Migration 024.
- Scope: migration 024, config, server/immofinder{Core,Pipeline,Store,Routes,Delivery}.ts, src/ImmoFinder.tsx, tests/agents-contract. Patch 128.8.

## [128.7] - EXPERIMENT: ImmoFinder sheet layout, header menu, contrast, result quality (EXP-IMMO-1)

- Sheet: one column, one cell per object (name, commune, rooms, status, found date, contact, link, photos, RU and DE description); no letter drafts (they stay in the Doc "ImmoFinder drafts"); wrapped text, wide column, bold header.
- ImmoFinder header has a More menu with "All Logs" (same item as Project mode), so logs can be downloaded without leaving the module.
- Buttons: new `.immo-btn` style (white on dark blue, forced over the global `button:disabled` rule that made the text unreadable) for New search, Save settings, Open listing.
- Result quality, from the owner's 24-row export: search/list pages (immoscout, homegate, airbnb, cozycozy, homematch), wanted ads ("Suche ..."), hotels and guesthouses are rejected before saving (reasons `list_or_search_page`, `wanted_ad`, `hotel_or_guesthouse`); a kept result whose link is a group or generic page gets the chip "link opens a search or group page".
- Log noise: UI polling used 60% of the log lines; while a search runs only the small status call is polled (every 2.5 s), the list reloads once at the end, and successful polling requests are not logged.
- Scope: server/immofinder{Core,Pipeline,Delivery}.ts, server/projectDiagnostics.ts, src/ImmoFinder{,Settings}.tsx, tests/agents-contract. Patch 128.7.

## [128.6] - EXPERIMENT: ImmoFinder header menu, Drive fix, email content mode, found date (EXP-IMMO-1)

- ImmoFinder now has the standard top bar (commit badge, mode menu, "New search"); the mode menu shows "ImmoFinder" and leads to Simple, Expert, Project or the agent selection.
- Drive: Google rejects every file creation by a service account (HTTP 403 "Service Accounts do not have storage quota", also for native Sheets/Docs). The export now only refreshes a Google Sheet "ImmoFinder listings" and a Google Doc "ImmoFinder drafts" that the owner creates once in the folder (Sheets and Docs APIs). Folder ID: Settings field, then `IMMOFINDER_DRIVE_FOLDER_ID`, then `config/immofinder.json` default. "Check Drive" button and the service account address shown in Settings.
- Email: choice "only new results" or "all results so far (newest first)". Every result in email, Telegram, Sheet, Doc and the app shows the date and time found (Swiss time).
- Scope: server/immofinder{Delivery,Routes,Settings}.ts, src/ImmoFinder{,Settings}.tsx, src/ModeMenu.tsx, config, tests/agents-contract. Patch 128.6.

## [128.5] - EXPERIMENT: ImmoFinder settings in the app (EXP-IMMO-1)

- Settings panel on the ImmoFinder page: automatic search (manual only / every 3, 6, 12 hours / daily at a chosen Swiss time), delivery channels (Telegram, email, Google Drive, any combination; test buttons; "message me when nothing new"), search scope (minimum rooms, sources on/off, communes), AI cost guard (pages analysed per search).
- Settings are stored in Postgres (migration 023). GitHub Actions now ticks hourly; the server decides from the saved settings whether a search is due (default: manual only).
- Email through the Resend HTTP API (`RESEND_API_KEY`, optional `IMMOFINDER_EMAIL_FROM`).
- Routes: `GET/PUT /api/immofinder/settings`, `POST /api/immofinder/settings/test`.
- Scope: migration 023, server/immofinder{Settings,Store,Delivery,Routes,Pipeline}.ts, src/ImmoFinderSettings.tsx, workflow, tests/agents-contract. Patch 128.5.

## [128.4] - EXPERIMENT: ImmoFinder live progress and clearer screen (EXP-IMMO-1)

- The server stores live progress of a running search (migration 022): step, current page or query, counters and the last 14 log lines; the screen polls it every 2 seconds.
- Screen: one big "New search" button; while running a live panel with spinner, step "1 of 3 / 2 of 3 / 3 of 3", elapsed time, progress bar, counters and a scrolling log of what is being read, rejected or matched; after a run a plain-language summary instead of raw counters; listing cards with chips, "Open listing", "Copy German letter".
- A search started elsewhere (cron or another tab) is shown as running when the page is opened.
- Scope: migration 022, server/immofinder{Pipeline,Store,Routes}.ts, src/ImmoFinder.tsx, tests/agents-contract. Patch 128.4.

## [128.3] - EXPERIMENT: ImmoFinder web-search discovery per commune (EXP-IMMO-1)

- New stage after catalogue sources: Serper (Google, CH/de) queries per whitelist commune, 5 communes per run in rotation (all 44 covered in ~9 runs), 4 query templates incl. private-owner wording and Facebook.
- Hits from any site are examined with the same pipeline (fetched owner/personal pages, verified quotes, filters). Facebook, Instagram, Airbnb, Booking, Vrbo, Homegate, ImmoScout24, Comparis, Anibis, Tutti, Tripadvisor are never fetched: only the search snippet is used (`snippet_only`). A page that cannot be fetched (robots, 403) falls back to its snippet.
- Agency hosts and generic sites are skipped; per-run page cap 40; run summary shows queries and snippet-only count; cost estimate includes searches.
- Cumulative patch: contains all files of 128.1a, 128.1, 128.2 and 128.3 relative to base 127.44.

## [128.2] - EXPERIMENT: ImmoFinder source quality, Drive fix, run transparency (EXP-IMMO-1)

- HappyHoliday: one index page per whitelist commune, only Graubünden object URLs, footer and "other listings" text cut, "von privat" title kept as a private-owner signal.
- An LLM "agency" flag now counts only when its quote names a business form; platform address text no longer rejects listings.
- New cache `immofinder_seen` (migration 021): rejected pages are not sent to the model again for 7 days (cost control).
- Drive export writes a native Google Sheet and Doc (service accounts have no quota for ordinary files; 403 in 128.1).
- UI lists every page examined in the last run with its decision and reason. New source ferienhausmiete.de; traum-ferienwohnungen.ch moved to phase 2.
- Scope: config, migration, server/immofinder*.ts, src/ImmoFinder.tsx, tests/agents-contract. Patch 128.2.

## [128.1] - EXPERIMENT: ImmoFinder GR Phase 1 backend, UI and scheduler (EXP-IMMO-1)

- Add flat `server/immofinder*.ts` (polite fetch, filters, verified extraction, dedupe, universal German draft), migration 020, `/api/immofinder/*`, home button + `/immofinder` workspace, Drive/Telegram delivery, 3-hourly cron workflow.
- Fix CI regression from 128.1a: P127.11 test no longer hard-codes major 127.
- Scope: server, src, migrations, config, workflow, tests/agents-contract. Patch 128.1.

## [128.1a] - MAINTENANCE: ImmoFinder GR module — documentation and preparation

- Owner-approved ImmoFinder GR (private short-term-rental owners in Graubünden → long-term lease drafts) is specified; cycle C128 starts.
- Add spec/roadmap/architecture/API/data/security/decision/experiment entries and `config/immofinder.json` (whitelist, stop-list, sources); no runtime code.
- Scope: docs, config, version metadata. Patch 128.1a.

## [127.44] - BUGFIX: pin CodeQL workflow actions to full commit SHAs

- Core CI failed governance-workflow-pins: codeql.yml used mutable actions/checkout@v4 and codeql-action@v3.
- Pin checkout and codeql-action init/analyze to full SHAs; keep continue-on-error for CDN 504.
- CodeQL "(dynamic)" jobs are Default setup — still subject to GitHub 504; disable Default if only Advanced is wanted.
- Scope: .github/workflows/codeql.yml. Patch 127.44.

## [127.43] - BEHAVIOUR: procedural visual quality in genre templates (step 1)

- Strengthen standard templates: large high-contrast player/obstacles, phone HUD, canvas/CSS only (no image/audio files yet).
- Coder prompt + action Plan.shared: procedural look rules; forbid CDN/binary assets by default (static_site.v11).
- Fixed genre Unicode matchers for non-Latin short requests.
- Scope: appBuilder/intent-brief.ts, core-prompts.ts, stack-static-site.ts, core-cache.ts. Patch 127.43.

## [127.42] - RELIABILITY: CodeQL workflow tolerates bundle CDN 504

- CodeQL init failed with HTTP 504 downloading codeql-bundle (GitHub tool CDN), not product code.
- Add advanced `.github/workflows/codeql.yml`: continue-on-error on job/init/analyze; weekly schedule; pin action v3; skip analyze when init fails.
- Scope: `.github/workflows/codeql.yml`. Patch 127.42.

## [127.41] - BUGFIX: CI after genre-template intent (tests + lint:copy)

- lint:copy: removed raw Cyrillic from intent-brief genre matchers (unicode escapes).
- Tests: ambitious brief expects compact targetModules (3–5) and intent prompt v2; human-brief assert matches see/control sections.
- Scope: appBuilder/intent-brief.ts, tests/project-builder-recovery.test.mjs, tests/project-mode-contract.test.mjs. Patch 127.41.

## [127.40] - BEHAVIOUR: genre templates + mobile-first intent contract

- Short requests are filled with a standard genre template (view, touch controls, consequences) instead of inventing heavy 3D.
- Default device is phone/tablet: touch only; no keyboard, mouse, or desktop assumptions unless the user asks.
- Intent prompt v2; complexity demoted from ambitious unless heavy tech is explicit; human brief shows see/control/happen blocks.
- Scope: appBuilder/intent-brief.ts, core-prompts.ts, stack-static-site.ts, core-cache.ts. Patch 127.40.

## [127.39] - BEHAVIOUR: action games must not game-over on the first frame

- Observed Skyline Aviator: Start Flight → immediate CRASHED with score 0 and distance 0 (spawn/collision on frame 1).
- Coder prompt + action Plan.shared: safe spawn, ~1s collision grace after start, never game-over on the start frame (static_site.v9).
- Scope: appBuilder/core-prompts.ts, core-cache.ts, stack-static-site.ts. Patch 127.39.

## [127.38] - MAINTENANCE: uniform dense history (all entries kept)

- Navigator rejected delete-style compression; every past patch entry is retained at the same density.
- CHANGELOG and TECHNICAL_REPORT rebuilt so each patch is 1–5 sentences; AGENTS History density updated to that standard.
- Scope: CHANGELOG.md, TECHNICAL_REPORT.md, AGENTS.md. Patch 127.38.

## [127.37] - MAINTENANCE: history density rules in AGENTS.md

- Assistants wrote patch history inconsistently (skip vs multi-page).
- AGENTS §5 History density: append-only; new entries 1–5 sentences; bulk rewrite only with explicit Navigator approval.
- Scope: AGENTS.md. Patch 127.37.

## [127.36] - BUGFIX: Project chat crash + brief collapse; mobile game controls

- planLocked was used without useState, causing ErrorBoundary on the brief card; Confirm did not collapse the plan on deploy 127.35.
- Optimistic one-line collapse; workspace header removed; New stays in Project Mode; create/list only in Advanced.
- Prompts require touch/on-screen controls and in-canvas draw coordinates (static_site.v8) after tractor/racer failures.
- Scope: ProjectChat, ProjectMode, appBuilder prompts/standalone. Patch 127.36.

## [127.35] - BEHAVIOUR: offline bootstrap + Project UI focus

- Generated chess opened as local content:// / file:// but board was empty: app.js exported initGame without calling it; CSS used .square.white/.black while JS set .light/.dark (name-contracts PARTIAL).
- Project chat still showed create-project form and project list under the composer.
- Header New left Project Mode for Simple conversation.
- Change (P127.35): standalone.ts auto-invokes common entry exports (initGame/init/main/...) after module load so offline index.html paints on open.
- Coder prompt + compact shared contracts require offline local page, matching CSS class names, and self-start of app.js.

## [127.34] - FEATURE: compact project builds with human brief card + machine manifest

- Multi-unit generation for games produced incompatible data shapes; no user gate before code generation.
- Change (P127.34): Compact 3-file plans + `Plan.shared`.
- Preview API `POST .../code/build/preview`; UI card in Project Mode and Project Chat (`Prepare plan` → confirm → build with `approvedBrief`/`userNotes`). `manifest.json` in ZIP; coder SHARED CONTRACTS.
- `appBuilder/*`, `server/appBuilderAdapter.ts`, `server/projectRoutes.ts`, `src/ProjectMode.tsx`, `src/ProjectChat.tsx`, `src/projectBuildJob.ts`, tests, docs.
- Package patch `127.34`.

## [127.33] - BEHAVIOUR: names two files must agree on (validator `name-contracts`)

- `appBuilder/validator-static-site.ts`: new `validateNameContracts`, required for SUCCESS.
- (a) A CSS rule that needs a second class (`.a.b`) where `b` appears in no script or markup (whole word, or prefix of a composed name such as `state-` + n) is reported on the script that uses the other class most.
- (b) A script or stylesheet that names a local picture, sound or font file that is not in the package is reported once per file (a package holds text files only).
- Issues start with `name:`. `appBuilder/core-engine.ts`: `name-contracts` joins the bounded cross-file repair; stylesheets can be repair targets; one sentence added to the repair prompt for `name:` lines.
- Observed (three builds, commit 9387144, all SUCCESS with 12/12 validators ok, all unusable): stylesheet styled `.square.light`/`.dark` while the script set `white`/`black` (invisible board); stylesheet showed a slide only with `.slide.active`, never set (blank slides) and six picture files that…

## [127.32] - BEHAVIOUR: Project Mode opens the built page in a sandboxed browser and repairs what throws

- `appBuilder/core-ports.ts`, `index.ts`: optional `RuntimePort` (`check(files)` returns `ran` and issues; `ran: false` means "not checked"). `appBuilder/core-engine.ts`: when the host supplies the port and every script parses, the page is opened once; an uncaught error becomes a `runtime-smoke`…
- It joins the existing bounded cross-file repair (max 3 rounds x 3 files, trials are re-opened, accepted only if nothing that passed breaks and the issue count drops).
- An error that stays keeps the build PARTIAL (`validators_failed: runtime-smoke`). `runtimeVerified` is true only when the page was opened and nothing threw.
- No port, or `ran: false`, leaves the report exactly as before.
- One sentence added to the cross-file repair prompt for `runtime:` issues. `server/appBuilderRuntimeCheck.ts` (new): headless Chromium through Playwright, loaded lazily.

## [127.31] - BUGFIX: a usable model plan is no longer thrown away because of how its references are named

- `appBuilder/core-plan.ts`: new `repairPlanReferences` (pure). `dependsOn` and `order` entries are resolved by unit id, file path or file stem; entries that name no unit and self-references are dropped; a dependency cycle is broken at its least-connected unit; `order` is rebuilt.
- Units, paths and contracts are never added, removed or renamed, so plans with no units, unsafe or duplicate paths, duplicate ids, too many units or a wrong schema version are still rejected.
- The empty dependency loop in `validatePlan` is removed. `appBuilder/core-engine.ts`: applied to the model plan before `validatePlan`; event `plan_references_repaired` when anything changed.
- Observed (job 71621f10, commit c39688e): the planner's plan had unit ids without extension but `dependsOn`/`order` with file names and a two-script cycle; `validatePlan` returned 16 issues, the generic template replaced the plan, the entry script was written before three of its modules, and the…
- Tests: `project-builder-recovery` (replay of that graph with neutral names, still-rejected plans, build without template fallback).

## [127.30a] - Test fixture moved to one flat file

- `tests/fixture-standalone-chess.json` replaces the nested `tests/fixtures/standalone-chess/` folder (nested folders are not allowed); `project-standalone.test.mjs` reads it.
- Delete the old folder.
- Package patch `127.30a`.

## [127.30] - FEATURE: every delivered program runs by simply opening index.html (no server)

- `appBuilder/standalone.ts` (new): the delivered `index.html` is one self-contained file: local stylesheets inlined, local classic scripts inlined, all local ES modules compiled into one inline script (CommonJS registry, deterministic, no model call).
- Bare/URL imports (three.js via import map) stay real ES imports of one inline module script, which file:// allows.
- Unbundlable code (import.meta, top-level await, syntax errors) falls back to the original page with a warning in `report.standalone`.
- ZIP layout: root `index.html` = standalone; editable sources under `source/`. `server/projectContinuation.ts` reads `source/` and ignores the generated root file. `validator-static-site.ts`: `completeness` asks the TypeScript parser (error at end of file) instead of counting characters; an…
- Live runner opens the package via `file://` (what a person does) instead of an HTTP server.

## [127.29] - BUGFIX: generated programs that load but show an empty first screen or run setup twice

- `validator-static-site.ts`: `member-contracts` flags `x.initFoo()` / `setup*` / `bind*` / `create*` calls made after `new X()` when the constructor of X already calls `this.initFoo()` (observed in two builds: `game.init()` from `main.js`; `scene.initDOM()` + `scene.initBoardRenderer()`…
- Findings enter the existing bounded cross-file repair. `core-prompts.ts`: coder prompt carries a startup contract (constructor draws the initial state at once; no duplicate setup calls).
- a chess ZIP reported SUCCESS and loaded without errors, but showed an empty board (0 pieces) until New Game was pressed (32 pieces afterwards); reproduced in headless Chromium. `runtimeVerified` stays false: nothing in the build runs the program.
- Tests: `project-builder-recovery`.
- Package patch `127.29`.

## [127.28] - BUGFIX: generated 3D games failed to start because of mixed three.js imports

- `stack-static-site.ts`: `normalizeThreeSetup` rewrites every three.js import (any CDN URL or version, including URLs with no module build) to bare `'three'` / `'three/addons/…'` and adds one pinned import map (three@0.160.0, jsdelivr) before the first script of the entry HTML.
- Idempotent; projects without three.js are untouched. `core-engine.ts`: applied before validation and once more on the final package (repairs may reintroduce mixed imports); event `three_normalized`.
- a tractor-racing ZIP imported three.js from five different sources (bare `'three'` with no import map, cdnjs r128 `three.module.js` and `three.min.js`, jsdelivr 0.158 and 0.160); one failing import stops the whole module graph.
- Test: `project-builder-recovery`.
- Package patch `127.28`.

## [127.27] - BUGFIX: generated games did not run (extension-less file names, mismatched constants); less clutter in Project replies

- `core-plan.ts`: `repairPackagePath` turns module ids used as paths (`audio_js`) into file names (`audio.js`).
- Applied to model plans (`core-engine.ts`), intent-brief module paths and spec features (`intent-brief.ts`) and `expandedPlanFromBrief` (`stack-static-site.ts`).
- a 24-module build shipped 19 files without `.js`, none imported by `main.js`. `validator-static-site.ts`: `member-contracts` also checks `NAME.key` on imported `export const NAME = {...}` objects (observed: `TILE_TYPES.PATH` / `COLORS.WALL` not defined in `constants.js`); findings enter the…
- The ZIP download stays.
- Tests: `project-builder-recovery` (path repair, constant keys), `project-mode-contract` (no banner or instructions).

## [127.26a] - MAINTENANCE: Project Mode user-value workflow is manual-only

- `project-user-value.yml`: removed the `workflow_run`, `pull_request` and `push` triggers; only `workflow_dispatch` remains (Navigator request).
- Test updated.
- Package patch `127.26a`.

## [127.26] - EXPERIMENT: entry HTML first, scripts and styles written against its real ids

- `stack-static-site.ts`: `domFirstPlan` (applied to every plan, also model-made ones): the HTML depends on no script or style; every script and style depends on it.
- Superseded HTML dependency lines in `expandedPlanFromBrief` removed. `core-prompts.ts`: `domBlock` (real ids and classes of the generated HTML, authoritative) for scripts and styles; `htmlPlanBlock` (planned files, load all with `type="module"`, ids on controlled elements, no inline handlers)…
- Tests: `project-builder-recovery` (order, prompts, integration; the recovery test no longer assumes `index` is the third unit).
- Requires P127.25.
- Package patch `127.26`.

## [127.25] - BUGFIX: terminal build state visible before the ZIP existed; per-file progress and downloads

- `core-engine.ts`: the archive is packed and stored before the terminal state is saved, and `running` is saved when a unit starts.
- A client that sees done/failed now always finds the ZIP. `appBuilderAdapter.ts`: adapter stores the archive only as a retry; `publicJob` returns `files` (ready / working / pending / failed); `readBuildFile` serves one finished file (from the stored ZIP, else the unit result; only paths of the…
- UI: `BuildFilesPanel` in the project chat: green = ready (per-file Download), red = in progress, grey = waiting; "Download all as ZIP" when the archive exists.
- Tests: `project-builder-recovery`, `project-mode-contract`.
- Package patch `127.25`.

## [127.24] - BUGFIX: live workflow gate looked at one commit only

- `project-user-value.yml`: the gate diffs against the commit of the newest `project-user-value-live` artifact (last measured commit) instead of `HEAD~1`; no earlier measurement means run.
- Job gets `actions: read`, full checkout depth.
- a push whose Project Mode files were not in the last commit skipped the whole live run.
- Package patch `127.24`.

## [127.23] - EXPERIMENT: cross-file type diagnostics + bounded repair; zero-input live workflow

- `validator-static-site.ts`: `type-contracts` (TypeScript checkJs on generated JS; only mismatches declared in other project files: missing exports, unknown members of project classes, wrong call arity).
- Counted as required. `core-engine.ts`: bounded cross-file repair (module/type/member contracts), max 2 rounds x 2 files, accepted only if nothing that passed breaks and the issue count drops.
- Previously module-contracts had no repair. `core-prompts.ts`: later units see real export signatures (parameters, class members), not only names.
- Live workflow: fixed URL, no inputs, runs after Core CI on main when Project Mode code changed, waits for the deployed commit itself, 10 prompts x 2 runs, per-scenario summary. `baseline-eval.yml` URL default.
- Tests updated/added.

## [127.22] - Revert P127.21 (EXP-PROJECT-3 failed its pre-registered bar)

- `stack-static-site.ts`, `core-prompts.ts`, `project-builder-recovery.test.mjs` restored to the P127.20 state (HTML again after CSS; no DOM contract in prompts).
- Package patch `127.22`.

## [127.21] - EXPERIMENT: style the real page (CSS after HTML, DOM contract in prompts)

- `stack-static-site.ts`: HTML no longer waits for CSS; CSS depends on the HTML unit. `core-prompts.ts`: `domContract`; `interfaceBlock` now also lists the actual ids/classes of generated HTML.
- Test added.
- Package patch `127.21`.

## [127.20] - EXPERIMENT: generate against actual module interfaces; live runner fixes

- `core-prompts.ts`: `exportedNames` / `interfaceBlock`; `core-engine.ts` appends the real exports of already generated scripts to every later unit's prompt. `stack-static-site.ts`: entry script (`main`/`app`/`index`) depends on all other scripts so it is generated last.…
- Tests added to `project-builder-recovery.test.mjs`.
- Package patch `127.20`.

## [127.19] - Live Project Mode user-value run (real deploy, real browser)

- `scripts/project-user-value-live.mjs`: login → create project → real staged build → poll → download ZIP → open in headless Chromium (render, runtime errors, 404s, reaction to clicks/keys/taps) → optional screenshot judge (Gemini, `GEMINI_API_KEY`).
- Reports PRODUCT outcomes and INFRA failures separately; records deployed commit vs `GITHUB_SHA`; flags SUCCESS-but-failed-human-check mismatches. `config/project-user-value-prompts.json`: neutral prompt set (draft, authorship stated; Navigator review required).
- Workflow `project-user-value.yml`: new manual-dispatch `live-project-mode` job (not per patch); offline job relabelled as rubric self-test.
- Package patch `127.19`.

## [127.18e] - BUGFIX: persist brief-applied spec so resume keeps complexity

- `core-engine.ts`: `state.spec` now stores the spec after `applyBriefToSpec` (was saved before it, so resumed jobs lost `complexity:`/`targetModules:` and re-scored as ambitious → `goal_not_adequate`). `project-mode-contract.test.mjs`: patch id derived from `package.json`, not hard-coded.
- Package patch `127.18e`.

## [127.17b] - Flat package paths only (no nested folders)

- Intent suggested modules and expanded plans use top-level files only (`main.js`, `scene.js`, …).
- Model-suggested paths sanitized to basename. `isSafePath`: reject any `/` nested path.
- Package patch `127.17b`.

## [127.17a] - CI fix: intent-brief language + duplicate templatePlan export

- Removed Cyrillic tokens from `intent-brief.ts` complexity regex (lint:copy). `appBuilder/index.ts`: drop duplicate `templatePlan` re-export (esbuild/tsc).
- Package patch `127.17a`.

## [127.18] - Project Mode user-value workflow (human simulator)

- New offline human-simulator evaluator: `scripts/project-user-value-eval.mjs`.
- Fixtures: `stub-racer` (SUCCESS on tiny package — must fail human rubric) and `rich-forest` (recognizable animals/forest — must pass).
- Workflow: `.github/workflows/project-user-value.yml` (PR/path + dispatch). npm script `test:project-user-value`.
- Scores recognition, stub size, honest SUCCESS, interaction markers — not syntax gates.
- Package patch `127.18`.

## [127.17] - Intent elaboration + multi-module plan + honest goal adequacy

- New intent stage before spec: model elaborates plain-language requests into expanded goal, mustHave / notSuccessIf, complexity, suggested small modules (`app_builder.intent.v1`).
- Fallback brief when the intent call fails still expands ambition (games/3D/city → ambitious). expandedPlanFromBrief: tree of many small files (js/*, css, html) instead of a 4-file stub template for standard/ambitious goals. assessGoalAdequacy: SUCCESS / `goalImplemented` require more than static…
- Profile: `maxUnits` 48, `maxCallsPerJob` 60.
- Package patch `127.17`.

## [127.16a] - lint:copy: no Cyrillic in stack-static-site

- Removed Cyrillic tokens from `ensureMultiFileStaticPlan` interactive regex (lint:copy language rule).
- Interactive detection remains Latin keyword-based; single-HTML / no-JS branches still force multi-file.
- Package patch `127.16a` (letter suffix; non-product CI fix).

## [127.16] - Multi-file plan + MAX_TOKENS / missing_end recovery

- Planner prompt v5: interactive apps must plan multiple files (index.html + app.js [+ style.css]); forbid mega-single HTML. `ensureMultiFileStaticPlan`: coerce single-HTML / no-JS interactive plans to the static multi-file template.
- Coder: stronger compact-unit + required `<<<END>>>` instructions.
- On truncation / MAX_TOKENS / missing_end: explicit repair hint, then one ultra-compact retry (`unit_repair_compact`); clearer `truncated_unit:` failure reason.
- ProjectChat welcome text shortened for `lint:copy`.
- Package patch `127.16`.

## [127.15] - Project Mode chat-first surface

- Default Project UI is a single chat: user describes the program, gets a ZIP (or an error), then keeps chatting to refine.
- New `src/ProjectChat.tsx`: transcript + composer; auto-creates/confirms project; `code/build` then `code/continue` from the latest ZIP; download link in the assistant message.
- Multi-panel workspace (analysis, plans, files tools, wizard) moved behind Advanced with Back to chat.
- Package patch `127.15`.

## [127.14] - CI fix: lint:copy + upload Uint8Array type

- Shortened Project Mode workspace help text (lint:copy 24-word limit).
- Renamed Advanced tab label `Raw JSON` → `Project data` (forbidden internal term). `POST .../artifacts/upload`: pass `Uint8Array.from(Buffer)` so typecheck accepts ArrayBuffer-backed bytes.
- Package patch `127.14`.

## [127.13] - Project Mode Files-first workspace

- Default project tab is Files (not Results).
- Analysis ("What should we analyse?") only appears under Advanced.
- Primary nav: Files; Plan/Analysis/Code package/Raw JSON behind Advanced toggle.
- Next-step copy points to create/upload/improve ZIPs instead of "Run an analysis".
- Selecting a project opens the Files tab; empty-project copy matches the program-ZIP path.

## [127.12] - Project continue + source ZIP upload (UX)

- Wired Improve this program in Project Mode UI to existing `POST /api/projects/:id/code/continue` (base ZIP selector + change request).
- Added `POST /api/projects/:id/artifacts/upload` (JSON base64 ZIP) so users can store an arbitrary source archive in the project registry and continue from it.
- Files tab: upload control + clearer copy distinguishing local Workspace vs server artifacts.
- Static-site post-download instructions no longer default to Render/Railway deploy; they tell the user to open `index.html` and use Improve/Upload.
- Shorter `suggestProjectName` (drop filler words, max 28 chars).

## [127.11] - Patch process compliance + integration-gate tests

- Advanced `package.json` / `package-lock.json` product patch metadata to `127.11` (major `version` remains `127`).
- Extended category suite `tests/project-builder-recovery.test.mjs` with contracts for `reachability`, `completeness`, `member-contracts`, orphan drop, and `runtimeVerified: false` on SUCCESS (covers P127.9–P127.10 gates under G3).
- Extended `tests/project-mode-contract.test.mjs` with package metadata assertion.
- No Simple/Expert behaviour change.

## [127.10] - Member contracts + coherent package for self-contained HTML

- Added required validator `member-contracts`: after `import { Class }` + `new Class()`, instance property/method accesses must match the class surface (`this.x =` assignments and methods).
- Suggests `is*`/`get*` near-misses (e.g. `paused` vs `isPaused`).
- Deterministic package cleanup: when the entry HTML is a large self-contained inline app and external CSS/JS are unreachable, those orphans are dropped before scoring (`droppedOrphanedFiles` on the report, `orphans_dropped` event).
- Bounded model repair for `member-contracts` (max 2 scripts, same non-destructive acceptance rules as DOM wiring repair).
- Project Mode `appBuilder/` only; Simple and Expert untouched.

## [127.9] - Project Mode integration gates (reachability + completeness)

- Added required static validators `reachability` and `completeness` for the `static_site` stack so SUCCESS cannot be claimed when generated files are orphaned or truncated. `reachability`: every non-exempt file must be reachable from an HTML entrypoint via `src`/`href` and relative ES imports;…
- Planner/coder prompts tightened: simplest static architecture by default, no unrequested frameworks, entry HTML must link every deliverable asset, no truncated files (`PROMPT_VERSION` → `static_site.v5`, plan → `app_builder.plan.v4`).
- User-facing SUCCESS notes state that runtime was not executed on BiForge.
- Project Mode `appBuilder/` only; Simple and Expert untouched.

## [127.8a] - Docs layout CI fix

- Removed three non-allowlisted prose files from `docs/` (`PROJECT_CONTINUATION.md`, `PROJECT_MODE_P127_8_ACCEPTANCE.md`, `PROJECT_MODE_RELIABILITY_PLAN.md`) and redirected references to canonical documents.
- Fixes `docs-integrity` and `test:core` failures.
- No runtime change.

## [127.8] - Project Mode recovery and acceptance

- Stale build recovery now atomically leases eligible jobs with PostgreSQL row locks (`FOR UPDATE SKIP LOCKED`) and refreshes the heartbeat before a worker resumes them.
- This prevents multiple BiForge replicas from concurrently resuming the same stale job.
- Added focused tests for atomic lease SQL, returned job mapping, and the minimum lease age.
- Preserved Project Mode-only scope; no Simple or Expert route, prompt, or UI implementation was changed.
- Verification status: see `TECHNICAL_REPORT.md`; browser E2E and live multi-replica/database recovery remain `NOT_RUN`.

## [127.7] - Project workspace artifact inventory

- Added project-scoped inventory of all immutable artifact versions.
- Added version-specific artifact downloads and artifact inspection endpoints.
- Added Project Mode UI for historical version downloads, integrity status, and ZIP entry listings.
- Added project-mode contract coverage.
- Simple and Expert paths were not modified.

## [127.6] - Project continuation

- Added `POST /api/projects/:projectId/code/continue` for continuing work from an existing verified ZIP artifact.
- Added bounded ZIP source extraction, project ownership checks, CRC validation, path traversal protection, and explicit rejection of binary assets not yet supported by the text-context continuation path.
- Added continuation prompt construction and regression coverage.
- Added `docs/PROJECT_CONTINUATION.md`.
- Simple and Expert behavior is unchanged.

## [historical] - Session governance and documentation consolidation

- Retained marker for docs-integrity: Session governance and documentation consolidation.
