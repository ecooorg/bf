## 2026-11-27 — ImmoGR evidence validation hardening (P131.22)
- Require a listing-detail URL for qualified private-owner prospects.
- Remove personal phone numbers, email addresses and person-addressed contact lines from evidence quotations.
- Validate field values against the content of their own evidence quotations.

## 2026-11-27 — ImmoGR evidence-backed AI listing analysis (P131.21)
- Added Gemini analysis for user-selected local page copies; one source page can produce multiple individual listing cards.
- Validated populated facts against exact source quotations and detail URLs against observed same-domain links.
- Added conservative Direct Rental / Private Owner Prospect qualification, reason codes, confidence and owner-reviewed transfer into the notebook.
- Kept remote page retrieval disabled; URL Context and Playwright remain gated on source-specific access authorization.

## 2026-11-27 — ImmoGR candidate and local research cards (P131.20)
- Added category-aware discovery cards, local-copy research previews and saved evidence-labelled research cards; discovery leads remain unverified and unadmitted.
- Persisted the Direct Rental / Private Owner Prospect distinction for owner-captured records; fixed the UI to submit the selected search category.

## 2026-11-27 — ImmoGR Gemini key isolation and search diagnostics (P131.19)
- Removed model-wide quota parking: each Gemini key now cools down independently per model, so a 429 from one Google project cannot suppress other project keys.
- Restricted ImmoGR discovery candidates to the selected source domains and deduplicated normalized listing URLs before returning them.
- Added a per-candidate decision journal with title, sanitized URL, host, scope decision and duplicate reason.
- Aligned migration health diagnostics with the active runner by excluding archived ImmoFinder migrations from pending checks.

## 2026-11-27 — Load dotenv before production migrations (P131.18a)
- Fixed startup ordering: load the environment file before checking DATABASE_URL, apply migrations before starting the server, and stop on migration failure.

## 2026-11-27 — ImmoGR local structured fact suggestions (P131.15)
- Added client-side JSON-LD extraction for local HTML pages; title, type, price, currency, explicit rental period, locality and availability are editable suggestions, never auto-verified.
- Switching source resets capture fields to prevent cross-listing contamination. No remote page fetch is introduced.

## 2026-11-27 — Complete ImmoGR source navigation (P131.14)
- Added verified homepage links for the remaining three registered sources; all 29 sources now have direct homepage navigation.
- Tightened the ImmoGR foundation test to require a valid HTTPS homepage for every source.

## 2026-11-27 — ImmoGR WP2 personal notebook improvements (P131.13)
- Fixed CI copy-lint and ImmoGR manual-import assertions; full verification DAG passed (18/18 stages, zero failures/timeouts).
- Added official homepage navigation for 26 registered sources and browser-local import for HTML/HTM/TXT/MD/PDF/DOCX/XLSX/PPTX/CSV/TSV/JSON (5 MB limit).
- Aligned owner decisions, data model, source registry, acceptance criteria and product documentation with the private local-copy workflow; no separate database-capture gate.

## 2026-11-27 — ImmoGR WP2 manual research activation (P131.12)
- Activated the WP2 manual-research UI/API stage and made its locality selector independent of discovery filters.

## 2026-11-27 — ImmoGR notebook privacy hardening (P131.12)
- Added authenticated-only notebook APIs, saved-note history, and local file extraction; remote crawling remains disabled.

## 2026-11-27 — ImmoGR personal research notebook (P131.12)
- Added all-source manual review UI, local HTML/HTM/TXT import, validated personal-note persistence, and additive migration 034.

## 2026-11-27 — ImmoGR locality scope correction
- Replaced municipality targeting with the owner's exact 44 localities, split into two independently selectable groups; added API validation and additive locality persistence.

## 2026-11-27 — ImmoFinder retired; ImmoGR WP1 started
- Retired ImmoFinder UI/API/workflows and removed legacy live-acceptance automation; preserved historical source and data read-only.
- Established isolated ImmoGR product entry, API status, configuration/data namespace, specifications, source research, and acceptance gates.

---

> **Property-search status — owner decision 2026-11-27:** ImmoFinder is permanently retired and must not be run, developed, or used. Any ImmoFinder material below is historical archive only: it is not a current requirement, roadmap, technical instruction, or source of decisions. ImmoGR is the sole active property-search project; its current authority is the docs/IMMOGR_*.md document set.

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

## 2026-11-27 — ImmoGR WP2 owner decisions and manual research mode
- Approved all-29-source user-initiated manual research independent of automation eligibility; documented “Ручной просмотр”, structured capture, provenance and no-bypass boundaries.
- Added owner-approved rule-conflict escalation to AGENTS.md and expanded WP2 acceptance, data and architecture contracts.
