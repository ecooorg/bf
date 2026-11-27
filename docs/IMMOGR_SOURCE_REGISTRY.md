> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Source Registry and Research

**Registry status:** preliminary research; all candidates remain research_required until access and page-quality checks are complete. The JSON inventory is config/immogr/sources.json.

## Source admission protocol
For every source, record: operator and business model; private-owner eligibility; direct detail-page structure; whether content is first-party or syndicated; commune coverage; price and period quality; contact route and advertiser attribution; terms of use; robots.txt; permitted API/feed; rate limits; technical accessibility; at least five real listing pages and their outcomes. No automated access is permitted until this review has an explicit PASS or documented written permission.

## Initial research findings
| Source | Potential value | Known concern / initial disposition |
|---|---|---|
| HappyHoliday | Its Graubünden landing page advertises 91 accommodations “directly from private landlords”. High-priority research candidate for owner prospects. | Claim does not prove permission to crawl. Inspect terms, robots, detail pages, ownership signals, and contact routes first. |
| Ferienhausmiete | Holiday-property catalogue; historical research suggests regional inventory. | Access terms and current detail-page behavior not yet reviewed. No old adapter reuse. |
| Flatfox | Swiss-wide rental marketplace with direct tenant/advertiser workflows. | Mixed private, agency, and tenant replacement posts; source-specific attribution and access review required. |
| Tutti / Anibis | Classified marketplaces where private ads may exist. | Mixed categories and advertiser types; listing-level proof and access rules required. |
| Homegate | Advertise page describes a private-person path for finding a new tenant. | A private advertiser path is promising, but automated access rights and listing-specific attribution remain unverified. |
| Newhome | Regional Swiss property marketplace. | Platform rules require publisher consent from the property owner; that is not an automated scraping licence. |
| Womilo | Terms describe both private owners and real-estate companies publishing listings. | Some listings are imported from partners; attribution and permitted automated access must be resolved. |
| Comparis | Broad portal and aggregator reach. | Terms prohibit automated extraction/crawling and use of third-party listing content without rights. Excluded unless written permission or a permitted API is obtained. |
| Housenet | Rental portal. | Terms say listings are supplied by agencies and prohibit automated collection without written consent. Excluded for current goal unless permission changes. |
| immobilier.ch | Regional professional property inventory. | Secondary/low priority because it is oriented to professional agencies rather than private owners. |
| USI Housing Desk | Reviewed housing noticeboard. | Requires SWITCH edu-ID; no account automation or access-control bypass. Not a crawler target. |
| Home.ch | Portal distribution linked to Homegate ad placement. | Treat as a distribution/duplicate surface, not an independent source, until proven otherwise. |

## Evidence references
- HappyHoliday Graubünden catalogue: https://happyholiday.ch/area/graubuenden/ — page states direct private landlords; observed in web research 2026-11-27.
- Comparis real-estate portal terms: https://www.comparis.ch/immobilien/immobilienportale/allgemeine-geschaeftsbedingungen — prohibits crawling/scraping and reuse without rights.
- Housenet terms: https://housenet.ch/en/terms-of-use — agency-supplied listings and no automated collection without written consent.
- Womilo terms: https://www.womilo.ch/en/agb — private and professional publishers; partner imports are possible.
- Homegate private advertising: https://www.home.ch/en/submit-ad — describes a private-person new-tenant ad offer.
- Newhome publisher guidelines: https://blog.newhome.ch/assets/lbwp-cdn/newhome-blog/files/1610715785/2012015_newhome_richtlinien_en.pdf — verify the current official policy before relying on it.
- USI rental databases: https://www.desk.usi.ch/en/node/1755 — notes its authenticated housing noticeboard and third-party portals.

## Research status
No source has yet passed the five-real-page pilot, terms review, and access review. Do not call any source “supported”, “approved”, or “scrapeable” until those checks are recorded. A search-provider result is not a substitute for source permission or page-level evidence.


## Terms and access review — 2026-11-27

The following official terms were checked during WP1 research. Public visibility and the presence of private-owner ads do not grant permission to automate collection or reuse.

| Source | Official terms / evidence | WP1 disposition |
|---|---|---|
| Homegate / SMG | https://www.homegate.ch/c/en/about-us/legal-issues/gbc — section 7 prohibits systematically selecting marketplace content, including scraping, copying, republication, and linking it with other data. | Excluded pending written permission or a contractually authorized feed/API. |
| Flatfox | https://flatfox.ch/c/en/gtc/ — section 4.2 restricts additional use and reuse/exploitation of listing advertisements to the advertiser and Flatfox unless separately agreed. | Excluded pending written permission or a documented authorized data feed. |
| Tutti | https://www.tutti.help/hc/de/articles/115003331547-Nutzungsbedingungen — user terms prohibit automated scripts for collecting information from or otherwise interacting with the platform. | Excluded pending written permission or an authorized API/feed. |
| Anibis | https://www.anibis.help/hc/de/articles/14609777649170-Nutzungsbedingungen — user terms prohibit automated scripts for collecting information from or otherwise interacting with the platform. | Excluded pending written permission or an authorized API/feed. |
| Womilo | https://www.womilo.ch/en/agb — section 12 expressly prohibits automated scraping without Womilo's consent. The platform supports both private and company listings, and some listings are partner-imported. | Excluded pending written consent; high-value owner-signal research candidate only. |
| HappyHoliday.ch | https://happyholiday.ch/allgemeine-geschaftsbedingungen/ — operator is Gruppenhaussuche.ch AG; providers publish their own holiday properties. The reviewed AGB do not grant an automated collection licence. | Research-only; clarify permission and inspect robots/access rules before any automation. |
| Ferienhausmiete | https://www.ferienhausmiete.de/pdfs/documents/agb?lang=1 — operator terms identify it as a holiday-home intermediary. Automated access/reuse permission has not been established. | Research-only; no crawler until current access terms are reviewed and permission is confirmed. |
| Newhome | https://blog.newhome.ch/assets/lbwp-cdn/newhome-blog/files/1610715785/2012015_newhome_richtlinien_en.pdf — publisher guidelines require the relevant publisher/owner relationship; this does not establish a general third-party scraping licence. | Permission required; do not automate based on public visibility. |
| Comparis | https://www.comparis.ch/immobilien/immobilienportale/allgemeine-geschaeftsbedingungen — reviewed terms prohibit crawling/scraping and reuse without rights. | Excluded pending written permission or an approved API. |
| Housenet | https://housenet.ch/en/terms-of-use — terms prohibit automated collection without written consent; inventory is agency-supplied. | Excluded pending written consent. |
| Anibis / Tutti | The terms above also prohibit automated scripts for collecting information or interacting with the platform. | Do not build or run automated page acquisition for these domains. |

### Practical consequence

At this review point, **no candidate source is approved for automated listing-page acquisition**. This is an intentional compliance stop, not an engine failure. Continue research, identify official APIs/partner feeds, and request written permission where valuable. Search-engine snippets may help identify candidate URLs, but must never become admitted listing cards. Do not silently reinterpret a source's prohibition as permission to use browser automation or a third-party proxy.


## Authorized API and partner-feed candidates

Automated access should preferentially use a documented API or a contractual partner feed rather than scraping consumer portals. These are leads for commercial/partner due diligence, not active sources.

| Candidate | Official information | Potential fit | Constraints / decision |
|---|---|---|---|
| Lookmove API Listing Feed | https://data.lookmove.ch/manage.py/real-estate-data-solutions and https://data.lookmove.ch/manage.py/terms | Potentially the fastest way to query broad Swiss rental inventory from a licensed feed. The provider says its data is continuously collected from at least 135 portal and agency sources and offers an API Listing Feed. | Advertised from CHF 500/month with a minimum six-month commitment. Terms authorize internal use but prohibit redistribution/sub-licensing and use on behalf of third parties. Ask whether a personal private-use ImmoGR integration, listing detail URLs, private-owner classification, and contact fields are included. No purchase is approved. |
| discover.swiss | https://discover.swiss/sites/default/files/documents/2025-08/2025%20Platform%20Guidelines%20discover.swiss__0.pdf | Contractual API products and information feeds from tourism providers could help with seasonal/holiday property discovery. | Requires a developer/service-user contract; content may be rights-protected and requires rights-holder consent or source attribution. It is a tourism platform, not yet proven to contain residential rental listings or owner contacts. |
| STnet OpenBooking e-Marketplace | https://www.stnet.ch/de/export-ferienwohnungen/ | Official Swiss tourism holiday-home marketplace; current prices and availability are presented on myswitzerland.com. | Its IT-partner route requires at least 100 exclusive Swiss holiday-home objects, Swiss business domicile, Switzerland Tourism membership, daily updates, and an integration contract. This is not a feasible third-party crawler route for ImmoGR at present. |
| e-domizil | https://trade.switzerlandtravelcentre.ch/en/for-holiday-apartments/ | Private accommodation can be listed; destination and agency reservation systems can be connected by interface. | The published material describes provider distribution and destination/agency integration, not an open consumer data feed. Ask about downstream licensed data access and owner-contact attribution. |

### Commercial-use guardrail
No paid subscription, six-month commitment, partner agreement, or API key purchase is authorized by this repository change. Obtain the provider's written confirmation of permitted personal use, integration, display, contact data, retention, and export before implementation.


## Continuous source intelligence — owner-approved policy (2026-11-27)

The registry is a living inventory, not a fixed allowlist of familiar portals. ImmoGR must continuously discover and assess new Swiss and regionally relevant sources, including aggregators, first-hand marketplaces, private classifieds, cooperative directories, holiday-rental platforms, tourism providers, and licensed data feeds.

### Candidate assessment from current public research

| Candidate | What current public evidence says | Initial decision |
|---|---|---|
| Flatradar (flatradar.ch) | Advertises a Swiss AI rental search, scanning every 15 minutes, 10,000+ listings and Flatfox/Weegee among named sources. The landing page currently exposed zero listing counters to this research session. Its own automated scanning claim is not a licence for ImmoGR to crawl either Flatradar or its underlying portals. | `research_required`; test public search and detail-page click-through manually; identify actual source URLs, operator terms, robots, current live inventory and duplicate ratio. Do not automate until access rights are clear. Do not confuse it with flatradar.app, a different service/domain. |
| aptari (aptari.ai) | Public no-login feed claims Homegate, ImmoScout24, Flatfox and about 800 cooperative websites. It is a high-value discovery map, not an original listing source. Its terms §6 prohibit automated bulk requests outside intended functions. | `discovery_only`; use ordinary human browsing for research only. No automated bulk acquisition, API probing or copying of its feed without written permission/official API. Follow source links to original cooperative/provider pages and assess each original site independently. |
| Lookmove (lookmove.ch) | Public portal says it collects 150+ sources and lists rentals and sales; separate API Listing Feed is marketed as a licensed product. The current English GTU (last updated 2019) allows only limited personal consultation and says other use requires prior written consent; it also restricts downloading/copying/reuse of site/database content. | Website: `excluded_pending_written_permission` for automated acquisition. API: `permission_required`; investigate contract, price, internal/personal use, contact fields, original URLs, source lineage and retention rights. Do not treat portal access and paid API rights as interchangeable. |
| Flatli (flatli.ch) | Public site claims nationwide rental aggregation, six-hour sweeps, 23,562 listings, and a free private-landlord posting route. | `research_required`; promising aggregator/discovery lead. Verify legal operator, terms, robots, source lineage, whether detail pages are first-party, private-owner attribution, and at least five real examples before any automation. |
| UrbanHome (urbanhome.net) | Current Swiss portal comparison identifies it as a first-hand marketplace; UrbanHome help says private owners can list free and tenants can post replacement-tenant offers. | `research_required`; high-priority direct-marketplace pilot for Direct Rental and private-owner signals. Check current terms/robots and real listing pages first. |
| Apartments Zurich (apartmentszurich.ch) | Its About page says private landlords and replacement tenants can post free; public browsing and detailed listing fields are described. | `research_required`; high-priority private-owner candidate. Verify current terms, robots, operator, listing URLs, and page-level advertiser/contact evidence. |
| RealAdvisor (realadvisor.ch) | Public rental search says it combines major portals and direct agency/landlord listings, merges duplicates, and displays publisher/contact routes. | `research_required`; discovery and cross-check candidate, not automatically a primary source. Check terms, API/feed and source-level provenance before acquisition. |
| Homematch (homematch.ch) | Current portal guide describes a cross-Switzerland personal feed, direct messages to agencies/private landlords and suggestions beyond search area. | `research_required`; discovery candidate; establish whether listings link to originals and whether a permitted integration exists. |
| WGzimmer.ch / students.ch / Nachmieter.ch | Current portal survey identifies niche room, student and replacement-tenant inventory. | `research_required`; lower priority for whole-apartment owner goals, but useful for replacement-tenant leads and market coverage. Review each operator's rules separately. |
| Cooperatives (individual official websites) | aptari describes a directory of 1,348 cooperatives and says it reads hundreds of cooperative websites; this is a discovery lead, not a permission grant. | Create a separate per-domain registry record. Review each cooperative website's own terms/robots and access rules; never inherit aptari's access status. |

### Monitoring protocol

Every source record must track: canonical domain and operator; source class; original/aggregated lineage; owner-signal potential; result categories served; current status; terms URL/version/hash/review date; robots and sitemap review date; documented API/feed and licence scope; last successful human pilot; sample count and page-quality metrics; last health check; last inventory-change check; next review due; decision owner and reason.

Statuses:
- `active`: authorized acquisition method documented and pilot passed.
- `discovery_only`: can point to candidates/original sources but cannot supply copied listing data to ImmoGR.
- `research_required`: insufficient evidence to decide; no automated acquisition.
- `permission_required`: operator permission, API licence, or contract needed.
- `excluded_pending_written_permission`: current terms prohibit the intended automated collection/reuse.
- `degraded`: formerly active source has access, quality, freshness, or schema regression; pause acquisition until reviewed.
- `retired`: no longer useful, unavailable, or owner-directed removal.

Review cadence after a source is admitted: automated health/availability and schema checks only through the authorized channel; weekly inventory/yield and duplicate review; monthly source discovery and competitor scan; immediate re-review when terms, robots, operator, endpoints, or access responses change. Research-only candidates receive a monthly status refresh, not automated page crawling. Do not create a recurring job until the authorized channel and cadence are documented.

Source decisions are evidence-based: retain high-yield original sources; keep aggregators only where they reveal unique original URLs or improve discovery; add sources that demonstrably contribute new eligible pages; downgrade sources with stale, duplicate, agency-only, or poor commune coverage; retire sources that are persistently unavailable or legally/contractually unusable. Track source contribution by unique verified owner leads and Direct Rentals, not raw listing count.

**Current outcome:** no new candidate in this section is approved for automated acquisition. Flatradar, aptari, Lookmove, Flatli, UrbanHome, Apartments Zurich, RealAdvisor and Homematch are added to the research programme; only aptari is presently classified discovery-only because its terms expressly restrict automated bulk requests. No paid API, subscription, contract, or outreach has been initiated.


## Additional manual research — 2026-11-27

| Candidate | Current evidence | Disposition |
|---|---|---|
| Graubünden Tourism / regional destination listings | Arosa's public provider page for **Chalet Willi** says the chalet remains owned by the Willi family, offers furnished apartments by the week, and publishes a property-level contact route. The page is managed by Arosa Tourismus. This is a strong manual private-owner signal, but it is a seasonal weekly rental, not a long-term rental offer; no long-term willingness or monthly price is established. | 'research_required'. Manual gold-set candidate for Private Owner Prospect classification only. Do not classify as Direct Rental. No automated page acquisition until the operator's terms/robots and rights are confirmed. |
| Apartments Switzerland | Its current terms say listings can be posted by owners, agencies and tenants or aggregated from public sources. They permit linking to pages and short quotations with a backlink, but prohibit crawling at a rate that harms the service and republishing the content as a dataset. | 'discovery_only'. May be a URL discovery/manual review lead; original source and advertiser must be followed and verified. No copied listing dataset or automated detail-page acquisition. |
| Alpine Market Public Data API v1 | The read-only API is licensed for evaluation and non-commercial use, has a documented rate limit, and exposes property facts/comparables. It explicitly excludes owner and transaction-party identity and does not provide a general rental-listing search endpoint in the public reference. The portal's terms separately prohibit automated scraping. | 'permission_required' for API integration. Potential property-fact enrichment only; not a source for private-owner identity/contact or primary Direct Rental discovery. Use the documented API only if its licence is confirmed; never scrape the portal. |

### First manually reviewed owner-signal example

**Chalet Willi, Arosa (Graubünden Tourism):** the source page states that the property is still owned by the Willi family and describes weekly holiday-apartment rentals. The page includes a property-level contact route, while identifying Arosa Tourismus as the page's content manager. Classification for the research gold set: 'private_owner_prospect_candidate'; 'owner_signal=explicit_family_ownership'; 'rental_mode=weekly_holiday'; 'long_term_availability=unknown'; 'direct_rental_eligible=false'. This is a manual research example only, not an admitted ImmoGR listing and not permission to crawl the source.
