> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Acceptance Criteria

## WP1 foundation acceptance
- ImmoFinder is inactive: no UI entry, no active API, no scheduled workflow, no CI live-run job, no background worker startup, no database writes.
- Historical code and data are preserved read-only.
- ImmoGR has independent UI, API, code, configuration, data, and test namespaces with no imports or database dependencies on ImmoFinder.
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
