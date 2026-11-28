> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Owner Decisions

## D-IMMOGR-001 — Clean replacement, not ImmoFinder repair (2026-11-27)
ImmoFinder is permanently stopped and archived. ImmoGR is a new product with independent source code, engine, configuration, data, search processes, UI, API, and tests. Prior work may be studied only to extract abstract lessons; no legacy code or business logic may be imported, copied, or depended upon.

## D-IMMOGR-002 — Two distinct result categories (2026-11-27)
Direct Rental and Private Owner Prospect have separate mandatory facts, price semantics, and acceptance gates. A seasonal property with unknown long-term price is not a Direct Rental. A prospect score is not a rental offer.

## D-IMMOGR-003 — Preserve legacy archive; no cross-read (2026-11-27)
Keep ImmoFinder source, migrations, tables, snapshots, and diagnostics as historical evidence. ImmoGR must not read or mutate them. No legacy data migration is approved.

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

ImmoGR is a private, single-owner notebook for the Owner's own housing search and decision-making. The Owner may retain local pages and screenshots and process them manually or with local automation. These records are not published, sold, sublicensed or provided to third parties. D-IMMOGR-012 is the controlling clarification for local-copy processing. Do not create a separate per-source database-capture permission status or block the Owner's personal notebook notes on that basis. Automated remote collection and licensed feeds remain separately governed by source-specific access review and explicit approval.

## D-IMMOGR-012 — Local copies and private notebook processing (2026-11-27)

The Owner confirms ImmoGR is a single-owner personal notebook. The Owner may save a page or screenshot through ordinary user-facing browser functions, keep local copies, and process those local files manually or with local automation as desired. ImmoGR may support user-selected local file import and client-side extraction before the Owner explicitly saves selected notes. Local file processing is distinct from ImmoGR remotely fetching or crawling a source. Do not add redundant legal-status entities or block private notebook notes solely because a source restricts automated collection or third-party republication. Remote crawling, server-side proxying, access-control bypass and automated outreach remain outside this approval.

## D-IMMOGR-013 — Owner-selected discovery source scope (2026-11-27)

The Owner selects one or more of the 29 registered sources in ImmoGR search settings. Discovery requests and returned candidate URLs are restricted to those selected source domains. This selection controls discovery scope only; it does not override source-specific terms, robots rules, limited-probe authorization, or automated acquisition eligibility. The source registry remains the authority for those access decisions.

## D-IMMOGR-014 — Keep official locality names; add postcodes only (2026-11-27)

The Owner confirms that the existing official names for the 44 target localities are sufficient. Do not expand the locality catalogue with spelling aliases, historical names or language variants. A later additive enrichment may add verified official postal codes to the existing locality records without changing names, IDs, group assignments or search geography.

## D-IMMOGR-015 — Chur as a standalone search target (2026-11-27)

Chur is an explicit fourth locality selection, separate from group 1, group 2, and both groups. It is not added to either 22-locality group. The existing 44 owner-defined localities and their group membership remain unchanged; Chur is stored as a standalone locality with target_group 0 and is returned only when groupMode=chur.

## D-IMMOGR-016 — Temporary broad-discovery experiment (2026-11-27)

The Owner explicitly supersedes D-IMMOGR-013 for the bounded discovery experiment only. The 29 selected sources are search hints, not a returned-domain allowlist; candidate URLs from other public domains may be shown. The Owner may select any combination of the exact 45 registered localities (44 owner-defined targets plus standalone Chur). The complete discovery response is capped at 100 unique candidate URLs. This changes search-engine URL discovery only: no listing page is fetched, parsed, crawled, persisted as a listing, or treated as verified. Source-specific terms, robots, probe authorization and automated-acquisition gates remain unchanged. After the experiment, review yield, domain distribution, locality relevance, duplicates, latency and provider usage before deciding whether to retain broad discovery or restore source-domain filtering.

## D-IMMOGR-017 — Separate discovery and local research cards (2026-11-27)

Discovery results are rendered as unverified candidate cards and never treated as listings. User-selected local copies may be previewed and saved as human-observed research cards, with an explicit Direct Rental or Private Owner Prospect category. Saved research cards are not admitted listings; automated remote acquisition and qualification remain disabled until their independent gates pass.

## D-IMMOGR-018 — Evidence-backed listing extraction from local page copies (2026-11-27)

The Owner wants individual property cards rather than search-result URLs. The first implementation is user-triggered AI analysis of a page copy selected and imported locally. Gemini may split a catalogue into multiple listing candidates, but the server validates every fact against a quotation in submitted text, permits only the original page URL or observed same-source links, and exact-matches localities. Direct Rental and Private Owner Prospect use independent evidence gates. AI suggestions are not saved or admitted automatically. Remote URL Context and browser acquisition remain disabled until source-specific terms, robots, approved method and host scope are documented.
