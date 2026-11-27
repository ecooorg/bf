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
