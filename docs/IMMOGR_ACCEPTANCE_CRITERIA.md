> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Acceptance Criteria

## WP1 foundation acceptance
- ImmoFinder is inactive: no UI entry, no active API, no scheduled workflow, no CI live-run job, no background worker startup, no database writes.
- Historical code and data are preserved read-only.
- ImmoGR has independent UI, API, code, configuration, data, and test namespaces with no imports or database dependencies on ImmoFinder.
- Live discovery may return only unverified URLs; listing qualification and automated source-page acquisition remain disabled.
- All maintained Markdown documentation declares the retirement and new authority.
- Initial source registry identifies permission/access status and does not activate unverified sources.

Initial sample: 30 real pages, manually labeled before evaluation.

## First real-page acceptance
- At least 30 real public pages are manually labeled across: valid direct rental, private holiday listing, agency listing, management company, portal search page, aggregator, inaccessible/blocked page, stale listing, wrong commune, ambiguous price period, and misleading contact placement.
- The system's output is compared with labels. Precision and recall are both reported; no self-generated labels.
- All mandatory facts on every admitted result have evidence.
- No result is admitted from snippets or index pages.
- At least three consecutive full runs complete without data corruption, duplicate promotion, or uncontrolled provider spend.
- The user reviews actual unique results and confirms practical usefulness before the search is described as accepted.

## Direct Rental admission
Concrete long-term residential listing, target commune, normalized monthly rent ≤ CHF 2,000, private advertiser/owner evidence, direct contact route, current page, and complete mandatory provenance.

## Private Owner Prospect admission
Concrete seasonal/holiday property, target commune, private-owner evidence, direct public contact route, source freshness, and an explicitly separate long-term suitability estimate. Do not claim willingness to rent long-term without owner confirmation.

## Production release
Deploy only after WP1 and the real-page acceptance gate pass. First release is manual-only. Exact GitHub main commit, CI conclusion, Render deployed commit, health check, and real search-run evidence must agree. If production does not match the repository commit, stop and reconcile before further work.

## WP2 — all-source manual research acceptance

- All 29 entries in `config/immogr/sources.json` appear in the ImmoGR source research interface.
- Every source has a “Ручной просмотр” action independent of its automated-acquisition status.
- Clicking the action opens the original source in a user-controlled browser context; no server-side fetch or crawler is triggered.
- A user can explicitly save a structured manual observation with source, canonical URL, locality, observed-at time, reviewer, access outcome and evidence notes.
- Manual observations persist only in ImmoGR tables and remain distinguishable from server-fetched pages and admitted listings.
- All 29 sources receive an initial manual access outcome. Sources with relevant inventory are sampled up to at least five real pages; smaller or zero-yield samples carry an explicit reason.
- No authentication/paywall/CAPTCHA/rate-limit/technical restriction is bypassed; no full-page bulk copying or unnecessary personal data is stored.
- A source may pass manual research while remaining blocked for automated acquisition.
- WP2 produces a source-by-source yield and effort matrix and an Owner-reviewed recommendation before any paid API/feed commitment.

The manual-review UX may use an external tab plus an in-app capture panel. An iframe/webview is not an acceptance requirement because third-party framing and cross-origin policies may prevent it.
