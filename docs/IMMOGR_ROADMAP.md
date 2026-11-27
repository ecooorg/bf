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

## WP2 — Source eligibility and real-page research
- [x] Replace municipality targeting with the exact owner-defined 44-locality catalogue (22 group 1, 22 group 2); expose independent group toggles and seed `immogr_localities`.
- [x] Owner supplied the complete search geography: exactly 22 group-1 and 22 group-2 localities. No further municipality ratings or 44-item selection are required.
- [ ] Enrich the 44 selected localities with spelling variants, historical names and postcode evidence; never infer adjacent localities from municipal membership.
- Collect at least five representative real pages per source candidate only through permitted manual review or an authorized access method; label page types, owner signals, price semantics, contact routes, and access outcomes.
- Obtain written permissions or official partner/API access before automated acquisition; currently no consumer portal has passed this gate.
- Evaluate Lookmove API, discover.swiss, STnet OpenBooking, and e-domizil as licensed-feed candidates; do not purchase or sign without explicit owner approval.
- Pilot Graubünden Tourism pages for explicit owner/contact signals; use Apartments Switzerland only as a discovery/manual-review lead; assess Alpine Market API strictly as property-fact enrichment.
- Approve, pause, or exclude sources with documented evidence.

## WP3 — Page acquisition and page representation
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
