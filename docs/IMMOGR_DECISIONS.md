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
