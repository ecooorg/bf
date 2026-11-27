> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Active Roadmap

**Only active property-search roadmap.** ImmoFinder is retired; its old roadmap and reports are archive-only.

## WP0 — Decommission and documentation reset
- Add binding retirement and replacement decision to AGENTS and every maintained Markdown document.
- Preserve legacy source/data as read-only; disable old UI, API, workers, schedules, diagnostics and live CI automation.
- Establish ImmoGR as the only active product and current documentation authority.

## WP1 — Knowledge extraction, product definition, source research, isolated foundation
- Review early and late ImmoFinder history and extract abstract successful/failed patterns.
- Define result categories, evidence model, owner classification, source permission protocol, and quality gates.
- Maintain a living source inventory with monthly discovery and status review; assess retain/add/downgrade/retire decisions by unique verified yield.
- Pilot Flatradar, aptari, Lookmove, Flatli, UrbanHome, Apartments Zurich, RealAdvisor, Homematch and niche sources under their individual access rules; no source activated without terms/access review and a five-page pilot.
- Establish independent UI/API/config/data/test namespaces and verify no legacy imports or database reads.
- Provide live Gemini-grounded URL discovery as a manual-review lead queue; never treat search snippets as listings.
- [x] Add independent evidence-first PostgreSQL foundation (`immogr_*`) with commune FK, source pages, listing, owner, contact, evidence, run, event and review records; add CI isolation tests.
- Deploy the foundation and verify exact main/production commit identity; live search remains disabled.

## WP2 — Source intelligence, manual research and real-page validation (IMPLEMENTATION COMPLETE; OWNER VALIDATION OPEN)
**Owner decision 2026-11-27:** test every registered source for actual research value, regardless of whether automated acquisition is permitted. An automation restriction changes the acquisition mode; it does not remove a source from manual research.

- [x] Replace municipality targeting with the exact owner-defined 44-locality catalogue (22 group 1, 22 group 2); expose independent group toggles and seed `immogr_localities`.
- [ ] Enrich all 44 localities with spelling variants, historical names, language variants and postcode evidence; never infer adjacent localities from municipal membership. This requires authoritative place/postcode evidence; formatting normalization alone is not an alias catalogue.
- [ ] Inventory and manually test **all 29 registered source candidates**. No source is skipped solely because automated scraping, scripts, reuse or API access is restricted. All 29 are present in the UI, but their actual manual-review states remain `not_started`; do not mark this complete until page visits are recorded.
- [ ] For every source, record operator, business model, first-party/aggregator status, actual source lineage, coverage of the 44 localities, private-owner signals, page types, price semantics, contact routes, freshness, duplicate behavior, manual access outcome, and applicable terms/access constraints. Desk research is not a substitute for user-operated page review.
- [ ] Perform an initial human-operated access check for every source. For sources with relevant live inventory, inspect at least five representative property/detail pages where available; record zero-yield, unavailable, blocked, login-only, irrelevant or stale outcomes instead of inventing samples.
- [ ] Distinguish **manual research eligibility** from **automated acquisition eligibility**. Existing `status` values in `config/immogr/sources.json` continue to govern automation only; every source has a separate manual-research state.
- [x] Add a user-initiated manual research panel for all 29 sources, original-page opening, structured personal-note capture, and browser-side local HTML/HTM/TXT/MD/PDF/DOCX/XLSX/PPTX/CSV/TSV/JSON import (up to 5 MB; source file is not uploaded).
- [x] Additive migration 034 and API persist manual observations with source ID, canonical URL, locality, review timestamp, reviewer action, observed facts, notes, access outcome and provenance. Manual observations remain distinct from server-fetched pages.
- [ ] Keep the original source URL and attribution. The Owner may keep and process local page/screenshot copies for the private notebook as approved in D-IMMOGR-012. Do not bypass authentication, paywalls, CAPTCHAs, rate limits or technical access controls.
- [ ] Score source value by unique, relevant, evidence-backed private-owner leads and eligible Direct Rentals—not raw URL or listing counts. Track owner attribution, target-locality coverage, rent/period quality, direct contact, freshness, duplicates and research effort.
- [ ] Research licensed API/feed candidates (including Lookmove API, discover.swiss, STnet OpenBooking and e-domizil) in parallel, but do not purchase, sign or commit spend without explicit Owner approval.
- [ ] After the initial all-source review, recommend retain / prioritize / discovery-only / pause / exclude separately for manual research and automated acquisition. Any automated source activation still requires a documented permitted method and its own approval gate.

**WP2 deliverables:** completed 29-source manual research matrix; representative page sample and zero-yield records; 44-locality alias evidence; manual-review UX/data contract; source-value ranking; and an Owner decision on which sources merit licensed access or later automation.

## WP3 — Authorized acquisition and page representation
- Implement source-specific automated acquisition only for sources with a documented permitted API/feed or explicit written authorization.
- Keep user-initiated manual review/capture independent from automated page fetching.
- Safe URL validation, robots/terms gates, redirects, rate limits, caching, structured metadata, JSON-LD, page segmentation and final-URL matching.
- Record acquisition failures without inventing a listing.

## WP4 — Evidence extraction and owner intelligence
- Write clean source adapters and typed extraction contracts.
- Preserve fact-level quotes, structured-data paths, extraction methods, conflicts, timestamps and confidence.
- Classify advertiser/owner entity; keep unknown distinct from private owner.

## WP5 — Qualification, deduplication, persistence and review
- Separate Direct Rental and Private Owner Prospect admission.
- Implement independent immogr_* schema, provenance, deduplication, human review, and retention controls.

## WP6 — Real-page evaluation and manual live pilot
- Label at least 30 real pages independently; measure precision and recall.
- Run three consecutive full runs; inspect provider usage, failure rates, duplicates and source yield.
- Obtain owner review of actual unique results and practical usefulness.

## WP7 — Production release and later scheduling decision
- Release manual search only after all acceptance gates pass.
- Consider scheduling only after observed stable value and explicit owner approval.
- Never relax quality gates merely to increase result count.


**Owner clarification 2026-11-27:** manual research is a private personal-notebook workflow. The Owner may save pages/screenshots locally and process those copies manually or with local automation. WP2's capture UX must support user-selected local HTML/HTM/TXT import with browser-side extraction and explicit save; this does not enable remote crawling or proxying.


**WP2 implementation update 2026-11-27:** the first manual-notebook slice is implemented in UI/API and migration 034. The 29-source page-by-page research, five-page samples, scanned-image OCR, and real database/browser verification remain open.


**WP2 local-import extension (branch implementation):** source homepage links are surfaced for verified registry entries; browser-side extraction reuses the shared workspace extractor for PDF and Office/structured text formats. Scanned-image OCR remains an explicit follow-up.


**WP2 structured local import:** HTML JSON-LD suggestions are parsed client-side into editable candidate fields; the Owner must verify them before save. No source page is fetched by ImmoGR.

**WP2 structured-import refinement (2026-11-27):** local JSON-LD extraction now recognizes German, French and Italian rental-period labels, preserves schema.org availability values as unverified suggestions, and normalizes locality spelling/diacritics only for exact label matching. It deliberately does not infer geographic aliases such as “St.” → “Sankt”; those require owner-reviewed locality evidence.


### WP2 / WP3 transition — 2026-11-27

The WP2 software deliverables are in place: exact 44-locality selector, 29-source registry/UI, authenticated personal notebook, additive persistence contract, local document import and local structured-data suggestions. WP2 is **not operationally accepted**: all 29 source records still show `manualReview.status=not_started`, no five-page source samples have been entered, and locality aliases/postcodes have not yet been verified against authoritative evidence. Those are real research activities, not tasks that can be truthfully completed by changing code or relabelling records.

WP3 has started with a fail-closed authorization and page-representation contract. It intentionally activates no source: the current registry contains no source with a complete documented API/feed authorization, terms/robots approval and exact host allowlist. This permits implementation to proceed without silently treating manual browsing, public visibility, or the private notebook as remote acquisition permission.
