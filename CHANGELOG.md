## P131.9a — locality pre-filter + 410 demotion + G6 push integrity (2026-11-26)
- **Problem:** last live run 0 kept (82 locality prefilter, 19 outside_target, UrbanHome 410s); connector truncation took live.ts offline.
- **Change:** `liveFilters.ts` (titleHint locality gate, tourist skip, 410 weight/block); entity-safe plainText; G6 in OPERATIONS.
- **Scope:** ImmoFinder source-first path only; hard gates unchanged.

## P131.9 production yield/diagnostics correction
- Correct preview kept flags after no-contact-route rejection; add authoritative accepted-level/provider availability counters; base CI threshold on persisted kept counts; poll completed diagnostics by runId.

## P131.9 live acceptance deploy identity
- Wait for the exact pushed commit to appear in production `/health` before starting the bounded live search.

## P131.9 — manual automation trigger
- Allow explicit `manualRun:true` for the existing secret-authenticated run endpoint to bypass only the schedule-due check; normal secret requests remain schedule ticks.

## P131.9 live trigger correction
- Distinguish explicit secret-authenticated manual automation from schedule ticks so CI can start a real production search while the scheduler remains disabled.

## P131.9 follow-up — CI contract migration
- Update the workflow contract test to validate the new CI-gated production live-acceptance job instead of the retired issue-comment workflow.

## P131.9 — live acceptance in Core CI
- Bound production live search to Core CI behind an explicit commit marker; report sanitized counts and provider-call evidence only.

## P131.9 owner-name chrome filter
- Stop contact-page UI labels (e.g. Kontaktformular) from being appended to extracted owner names on Flatfox detail pages.

## P131.9 half-room parser
- Accept Swiss `3 ½ Zimmer` with whitespace before the half-mark in the production room regex.

## P131.9 source-first CI alignment
- Align category tests to the C131 source-first runner; retire automated legacy-search payload restoration.

## P131.8w — ImmoFinder audit and CI reconciliation
- Reconciled module, architecture, API, test and user-value status; patch/lock/repair stamps aligned.

## P131.8v — Bounded discovery and owner-evidence assist
- Rotating Serper discovery for Flatfox/Anibis/Tutti; Gemini LIGHT for borderline L1 with contact route; budget ceiling ~$0.024/run.

## P131.8u — Actionable evidence gate and pilot revalidation
- Require actionable contact route; hide pilot rows pending fresh fetch; Flatfox direct adapter; Anibis/Tutti paused after 403.

## P131.8t — Flatfox source expansion
- Flatfox direct rental search for Graubünden with price/room/advertiser extraction.

## P131.8s — Production quality correction
- Token locality matching; Swiss half-room parsing; agency/seeker/placeholder-phone gates; HappyHoliday meta descriptions.

## P131.8r — Full-canton source expansion
- 100 official communes + aliases; Anibis/Tutti adapters; classifier postcode and room fixes.

## P131.8q — Source-first production path
- Direct HappyHoliday/Ferienhausmiete indexes → bounded detail fetch → C131 gates; Serper/LLM/Jina disabled for search.

## P131.8p — Classifier and contact gates
- Deterministic rooms/locality/agency/for_sale gates; contact-route required for keep.

## P131.8o — Diagnostics and preview reporting
- Per-run diagnostics JSON; rejection taxonomy; preview of examined pages.

## P131.8n — UrbanHome / swiss-classified adapter
- Shared classified adapter for UrbanHome and related portals.

## P131.8m — HappyHoliday / Ferienhausmiete adapters
- Direct index scrape and detail extract for Graubünden holiday rentals.

## P131.7a — Closed reject taxonomy and source-yield audit
- qualityAudit on every run report; R7 codes closed. RELIABILITY.

## Session governance and documentation consolidation
- AGENTS.md, ROADMAP, TECHNICAL_REPORT, CHANGELOG remain single source of truth; append-only history.
