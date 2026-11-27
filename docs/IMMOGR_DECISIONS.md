> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Owner Decisions

## D-IMMOGR-001 — Clean replacement, not ImmoFinder repair (2026-11-27)
ImmoFinder is permanently stopped and archived. ImmoGR is a new product with independent source code, engine, configuration, data, search processes, UI, API, and tests. Prior work may be studied only to extract abstract lessons; no legacy code or business logic may be imported, copied, or depended upon.

## D-IMMOGR-002 — Two distinct result categories (2026-11-27)
Direct Rental and Private Owner Prospect have separate mandatory facts, price semantics, and acceptance gates. A seasonal property with unknown long-term price is not a Direct Rental. A prospect score is not a rental offer.

## D-IMMOGR-003 — Preserve legacy archive; no cross-read (2026-11-27)
Keep ImmoFinder source, migrations, tables, snapshots, and diagnostics as historical evidence. ImmoGR must not read or mutate them. No legacy data migration is approved.

## D-IMMOGR-004 — Evidence-first and source-permission-first (2026-11-27)
No source is automatically crawled until terms, robots, access controls, rate limits, and at least five real detail pages have been reviewed. Search snippets are discovery-only. No automatic outreach is permitted.


## D-IMMOGR-005 — Permission-first source activation (2026-11-27)

A source with terms that prohibit scraping, automated scripts, reuse, or external data linking is excluded until written permission or a documented authorized API/feed is obtained. Publicly visible listings and search-engine indexing do not grant a collection licence. A source with unclear terms remains research-only, not active. At WP1 terms review, no source is approved for automated detail-page acquisition.


## D-IMMOGR-006 — Prefer licensed feeds; no unapproved spend (2026-11-27)

Prefer documented APIs and contractual partner feeds over scraping. Commercial access must be reviewed for personal/internal use, contact attribution, display, retention, and redistribution rights. No paid subscription or multi-month commitment may be started without explicit owner approval of the price and contract terms.


## D-IMMOGR-007 — Continuous source intelligence (2026-11-27)

The source registry is a continuously monitored inventory, not a fixed portal allowlist. ImmoGR must discover new Swiss and regional sources, evaluate their unique contribution, and periodically retain, add, downgrade, or retire them based on verified unique owner leads and eligible rentals. Every source has its own terms, robots, API/feed, lineage, health, yield, and review record. A platform's permission never transfers to its upstream sources, and an aggregator's own crawling claims never grant ImmoGR permission. Research-only means no automated acquisition. No recurring monitor is scheduled until each monitored channel is authorized.

## D-IMMOGR-008 — Candidate-specific status, no implied permission (2026-11-27)

Flatradar.ch, aptari.ai, Lookmove, Flatli, UrbanHome, Apartments Zurich, RealAdvisor, Homematch, WGzimmer.ch, students.ch and Nachmieter.ch are added to the research inventory. aptari is discovery-only because its terms prohibit automated bulk requests outside intended functions. Lookmove's consumer site is excluded from automated acquisition pending written permission; its API is a separate licensed-feed inquiry. The remaining candidates are research-required until their own current terms, robots, page pilots, and access methods are reviewed. No API, subscription, contract, or paid commitment is approved by this research update.


## D-IMMOGR-007 — Quarantine legacy runtime and migrations (2026-11-27)

ImmoFinder server modules and the legacy `src/immoCard.ts` helper are excluded from the production server build. Historical migrations 020–030 remain in Git but are excluded before the active migration runner reads migration contents or checks their versions. Existing legacy schema and rows remain preserved unchanged.


## D-IMMOGR-008 — Manual owner signals are not long-term offers (2026-11-27)

A tourism-provider page can be a valuable Private Owner Prospect when it explicitly identifies private/family ownership and provides a property-level contact route. Weekly holiday availability does not prove long-term availability. The Chalet Willi/Arosa page is a manual research example only: it is not a Direct Rental and is not an admitted listing. Source-page automation remains subject to the source operator's terms and permission.

## D-IMMOGR-009 — Locality-based target geography (2026-11-27)

The search geography is the exact 44-place list supplied by the owner: 22 important group-1 localities and 22 secondary group-2 localities. Settings may enable group 1, group 2, or both. Every other locality is out of scope. Municipalities are administrative containers and must never be treated as interchangeable with advertised localities or used to broaden a search. Search input, validation, matching, and listing records use the locality name/ID. The prior 100-municipality catalogue and 44-municipality rating workflow are retired.
