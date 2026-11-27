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

## D-IMMOGR-010 — All-source user-initiated manual research (2026-11-27)

The Owner approves testing all 29 registered sources regardless of automated-collection restrictions. Automation status and manual-research status are independent. The UI will expose a “Manual review” action for every source. The user opens the original source in an ordinary browser and explicitly submits selected, structured observations to ImmoGR. Manual observations are stored with source URL, provenance, reviewer, timestamp and evidence notes; they are not misrepresented as server-fetched pages or automatically admitted listings. No remote unattended crawler, server-side proxy, access-control bypass or automated outreach is authorized by this decision. The Owner may save pages/screenshots locally and use local tools or automation to process those user-selected copies for the private notebook; this does not authorize remote site crawling or access-control circumvention. Licensed API/feed purchases and agreements still require separate explicit approval.


## D-IMMOGR-011 — Personal private-use scope of manual research (2026-11-27)

The Owner clarifies that ImmoGR is a private personal notebook for the Owner's own housing search, not a public portal, commercial aggregator, resale product, or data service for third parties. Manually observed facts are entered by the Owner for personal comparison, follow-up and contact with the original advertiser. They are not published, redistributed, sold, sublicensed, or made available to other users.

Interpret the Owner-approved manual workflow in this scope. Do not automatically equate the Owner's private notes with republication, commercial exploitation, or third-party reuse. At the same time, do not assume that private purpose overrides every source's express terms: distinguish (a) restrictions on automated scripts/access, (b) restrictions on copying or reproducing listing content, and (c) restrictions that expressly cover personal/local storage or private database use. Record the exact wording and scope before deciding whether a particular manual capture action is restricted.

The default capture form focuses on useful structured facts and owner-authored notes. This is a convenience, not a restriction on the Owner's approved local workflow. D-IMMOGR-012 explicitly permits the Owner to keep and process local page and screenshot copies, manually or with local automation, for private use. Preserve the source URL for attribution and follow-up. Do not bypass authentication, paywalls, CAPTCHAs, rate limits or technical access controls.


## D-IMMOGR-012 — Local copies and private notebook processing (2026-11-27)

The Owner confirms ImmoGR is a single-owner personal notebook. The Owner may save a page or screenshot through ordinary user-facing browser functions, keep local copies, and process those local files manually or with local automation as desired. ImmoGR may support user-selected local file import and client-side extraction before the Owner explicitly saves selected notes. Local file processing is distinct from ImmoGR remotely fetching or crawling a source. Do not add redundant legal-status entities or block private notebook notes solely because a source restricts automated collection or third-party republication. Remote crawling, server-side proxying, access-control bypass and automated outreach remain outside this approval.
