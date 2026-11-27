> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Source Registry and Research

**Registry status:** research inventory for all 29 candidates. The JSON inventory is config/immogr/sources.json. Its `status` field governs automated acquisition only; manual research has a separate per-source state. No candidate is excluded from the Owner-approved manual research programme solely because automated access is restricted.

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

## Owner decision — all-source manual research (2026-11-27)

The Owner has directed ImmoGR to test **all 29 registered sources**, independent of whether automated collection is permitted or commercially available. This supersedes any interpretation of `excluded_pending_written_permission`, `permission_required`, `discovery_only`, or `research_required` as a ban on evaluating a source through ordinary, user-initiated manual browsing.

### Two independent eligibility axes

- **Manual research:** the Owner or authorized user opens the source in an ordinary browser, inspects a page, and explicitly records selected observations in ImmoGR. This is a user action, not an unattended crawler.
- **Automated acquisition:** a server process, script, browser automation, proxy, API client or scheduled job obtains source content. Existing source `status` and permission gates continue to apply to this axis only.

This Owner decision establishes the product workflow; it is not a legal opinion or a waiver of third-party terms, privacy duties, copyright, account restrictions or other applicable requirements. Manual review must use normal user-facing access. Do not bypass login, paywalls, CAPTCHA, technical blocks, rate limits or explicit restrictions. If a source's terms also prohibit the intended manual use or data retention, record the issue and ask the Owner before proceeding with that source.

### Manual review workflow

1. The ImmoGR source list displays every registered candidate and its automation status.
2. Each source has a **“Manual review”** action. It opens the original site/page in a user-controlled browser context; it does not fetch the page through ImmoGR's server.
3. The user inspects the page and explicitly chooses **Save to ImmoGR**.
4. A structured capture form records the canonical URL, source, selected locality, page/listing type, observed price and period, owner/advertiser signals, contact route type, freshness, access outcome, short supporting evidence/notes, reviewer and timestamp.
5. The saved observation is marked `human_observed` / `manual_review`; it is not represented as a server-fetched page or an admitted listing.
6. The user can mark the page irrelevant, stale, inaccessible, duplicate, agency/intermediary, promising private-owner prospect, or possible Direct Rental.

A simple embedded web viewer may be explored, but ordinary sites can block framing through CSP or X-Frame-Options and cross-origin pages cannot be read by the ImmoGR app. Prefer opening the original page in a new tab/window plus an adjacent capture panel. Do not build a server-side proxy or browser automation merely to make embedding work.

### Evidence and storage boundaries

- Preserve source URL, observed-at timestamp, reviewer identity, capture method and field-level evidence.
- Store concise fact notes or limited supporting quotations only where appropriate; do not copy whole pages or retain unnecessary personal data.
- Do not store passwords, session cookies, authentication tokens or other credentials.
- Do not infer owner identity from a platform contact. Keep owner, advertiser, agency, management company and contact route distinct.
- Manual observations can support source-value research and human review; they do not automatically satisfy the fetched-page evidence gate for an admitted Direct Rental.
- Persist manual observations in an ImmoGR-only table such as `immogr_manual_reviews`; do not mislabel them as `immogr_source_pages` fetched by a server adapter.

### All-source WP2 measurement

All 29 entries in `config/immogr/sources.json` must receive an initial manual access outcome, including sources with no relevant inventory. For each source, record:
- manual access outcome and date;
- count of inspected real property pages;
- count of target-locality matches;
- count with explicit private-owner signal;
- count with a direct owner contact route;
- count with explicit monthly rent and period;
- count potentially relevant to a three-year rental;
- stale, duplicate, agency-only, aggregator-only and irrelevant counts;
- research time and next action.

Target at least five representative real property/detail pages per source where live relevant inventory exists. If fewer than five exist, record the actual sample size and reason; never manufacture a sample. Use the initial review to rank unique owner-lead yield and practical research cost.

### Status interpretation

`status` in the JSON registry remains the automated-acquisition decision. Add/maintain `manualReview.status` independently (for example `not_started`, `in_progress`, `reviewed`, `blocked_by_source`, `no_relevant_inventory`). A source may be `excluded_pending_written_permission` for automation and `reviewed` for manual research at the same time.

## WP2 desk research — initial findings (2026-11-27)

These are desk-research observations from current public pages, not completed user-led manual page pilots. The per-source `manualReview.status` remains `not_started` until the Owner/user performs and records the manual review in ImmoGR.

| Source | Current public evidence | WP2 implication |
|---|---|---|
| Homegate | Current SMG GTC §7 says content may not be used outside its marketplaces; systematic extraction, copying, reproduction or linking content with other data is prohibited. | Potential rental inventory. The terms are recorded as source context; the Owner's local personal-notebook workflow remains available, while automated acquisition stays excluded pending its own authorization. |
| Flatfox | Current GTC §4.2 restricts additional use and re-use/exploitation of platform advertisements to the advertiser and Flatfox unless separately agreed. | Potential private-owner and tenant-replacement inventory; verify each advertiser and listing value during manual research. Automation remains separately restricted. |
| Comparis | Current real-estate portal terms prohibit using third-party content outside the portal without express rights-holder consent, including copying and feeding it into other databases. The portal says private persons can publish rental properties. | High discovery value; inspect original listings and advertiser identity manually. Do not infer permission for automated acquisition or third-party republication. |
| Ferienhausmiete | Current AGB permit users to search and contact holiday-home providers, but restrict using platform-derived data/content to build another database or for commercial data exploitation; the platform's own search functions are required. | Relevant seasonal owner prospects; verify property and direct owner signals. Automation and third-party republication remain separate questions. |
| Housenet | Current terms (updated 17 Oct 2026) say listings are supplied by real-estate agencies; personal search/contact is allowed, while copying or automatically collecting listing data without written consent is prohibited. | Low fit for private owners; useful as a control case, not a primary owner source. Automation remains separately restricted. |
| immobilier.ch | Current terms define advertisers as professional real-estate agencies and state that listings come from advertisers; reuse/reproduction of portal content for commercial purposes requires prior written consent. | Low priority for direct private owners; useful mainly for agency/market comparison. Automation remains separately restricted. |
| Homematch | Current Graubünden apartment search showed 135 results. The portal supports private landlord listings and tenant replacement listings, but the live result set also contains agency/management advertisers. Its terms prohibit republishing platform content without permission. | High-priority manual sample candidate; verify each advertiser and follow source lineage. Owner-controlled local notes remain in scope. |
| RealAdvisor | Current Graubünden apartment search showed 457 results. RealAdvisor says it aggregates major portals plus direct agency/landlord listings and merges duplicates while linking to publisher portals. The observed sample contains many agency listings. | High-value discovery/cross-check source, but trace every candidate to the first-party publisher and deduplicate against it. |
| UrbanHome | Current help/AGB material confirms private rental listings and free tenant-replacement listings. | High-priority direct-marketplace pilot; inspect current Graubünden inventory and actual advertiser identity. |
| Newhome | Current publisher guidelines require owner consent for publication and identify provider contact details; private-person listing workflows exist. | Potential direct-owner source; inspect private-person listings and actual advertiser details. Automated collection remains a separate approval gate. |
| aptari | Current FAQ says its feed aggregates Homegate, ImmoScout24, Flatfox and many Swiss housing-cooperative websites; users apply on the original portal/site. | Discovery map only; trace to each original publisher and assess that publisher independently. |
| WGzimmer.ch | Current terms say private persons and flatshares may publish free; commercial providers, including furnished-flat landlords, need written agreement. Inventory is mainly rooms/flatshares. | Lower priority for whole apartments/houses; possible niche lead source. |
| Nachmieter.ch | Current terms reserve further use/re-use of platform listings to the advertiser and Nachmieter.ch. Listings are replacement-tenant offers, not necessarily direct owner offers. | Supplementary source; distinguish tenant advertiser from landlord and property owner during manual review. |
| STnet OpenBooking | Current participation conditions require an IT partner to supply at least 100 exclusive Swiss holiday-home objects, have a Swiss business domicile and Switzerland Tourism membership, refresh availability/prices at least daily, and pay integration costs. | Not a feasible direct ImmoGR feed route at current scale; retain as a future partnership reference only. |
| Lookmove portal | Current terms allow visitors to browse listings and contact advertisers; a separate data service has separate account/contract terms and advertises internal-use access. | Separate consumer portal from paid data feed. Do not infer API rights from portal access or vice versa. |
| Graubünden Tourism | Current Arosa pages provide several specific family-owned chalet examples and property-level contacts. Chalet Willi explicitly says it remains owned by the Willi family and is rented weekly. | Strong Private Owner Prospect research pool. Weekly availability is not a long-term offer; inspect each page and do not infer willingness or monthly price. |

### Private notebook and source-term interpretation

The Owner has explicitly approved ImmoGR as a single-user personal notebook and may save pages or screenshots through ordinary browser functions, keep local copies, and process them manually or with local automation. Do not add a separate per-source database-capture permission state or disable private notes because a source restricts automated scripts or third-party republication. Public terms remain documented as source context and continue to govern decisions about remote automated acquisition, licensed feeds, and any future third-party publication. No remote crawler, server-side proxy, credential capture, or technical access-control bypass is authorized by the private notebook decision.

### Official pages checked

- Homegate GTC: https://www.homegate.ch/c/en/about-us/legal-issues/gbc
- Flatfox GTC: https://flatfox.ch/c/en/gtc/
- Comparis real-estate portal terms: https://www.comparis.ch/immobilien/immobilienportale/allgemeine-geschaeftsbedingungen/
- Ferienhausmiete AGB: https://www.ferienhausmiete.de/agb.php
- Housenet terms: https://housenet.ch/en/terms-of-use
- immobilier.ch terms: https://www.immobilier.ch/fr/conditions-generales-d-utilisation-du-portail-et-de-l-application-immobilier-ch
- Homematch Graubünden results: https://homematch.ch/en/rent/apartment/canton-graubuenden
- Homematch terms: https://homematch.ch/de/terms
- RealAdvisor Graubünden results: https://realadvisor.ch/en/rent/canton-grisons/apartment
- RealAdvisor rental source explanation: https://realadvisor.ch/en/property-for-rent
- UrbanHome help: https://ch.urbanhome.net/hilfe
- Newhome publisher guidelines: https://blog.newhome.ch/assets/lbwp-cdn/newhome-blog/files/1610715785/2012015_newhome_richtlinien_en.pdf
- aptari FAQ: https://aptari.ai/faq/en
- WGzimmer terms: https://wg27.wgzimmer.ch/en/wgzimmer/agb.html
- Nachmieter terms: https://www.nachmieter.ch/terms-of-use.html
- STnet OpenBooking participation: https://www.stnet.ch/de/export-ferienwohnungen/
- Lookmove terms: https://www.lookmove.ch/en/terms
- Graubünden Tourism Chalet Willi: https://www.graubuenden.ch/en/lodging/chalet-willi-1og

Additional checks from the same WP2 desk-research pass:

| Source | Current public evidence | WP2 implication |
|---|---|---|
| Tutti | Current terms expressly prohibit automated scripts to collect information from or otherwise interact with the platform. Its rules also state that listing text from other ads is copyright-protected and may not be copied. | Manual user browsing and local personal notes remain in scope; the terms are retained as source context. Automated scripts and third-party republication are not enabled. |
| Anibis | Current terms contain the same automated-script prohibition; listing texts are copyright-protected and may not be copied. | No automated scripts. The Owner may still inspect and keep local personal research copies; do not bypass technical controls. |
| HappyHoliday | Current AGB identify the operator as Gruppenhaussuche.ch AG and describe direct contracts between providers and guests. Providers grant the platform rights to photos and information they publish; no third-party ImmoGR acquisition licence is stated. | Promising private holiday-provider inventory; verify individual owner signals and direct contact routes during manual research. |
| Lookmove data service | Current data-service terms describe internal use for professional or personal purposes via the service; separate consumer portal terms permit visitors to browse listings and contact advertisers. | Investigate the paid data service on its own contract. Consumer browsing and the private local notebook are distinct from any automated API/feed integration. |
| aptari | Current public FAQ confirms its feed contains Homegate, ImmoScout24, Flatfox and many cooperative websites, with applications normally completed on the original portal/site. | Useful for discovering source URLs and cooperative websites; each original publisher is a separate source and rights review. |


## Owner clarification — private personal notebook scope (2026-11-27)

ImmoGR is a private, single-user notebook for the Owner's own housing search. The Owner may save pages and screenshots locally, keep those copies, and process them manually or with local automation. This local workflow is not remote crawling and does not publish or supply records to third parties. There is no separate per-source database-capture status: manual research availability is independent of automated acquisition status. Record public source terms accurately as context for automation and future licensed integrations, but do not use them to block the Owner's personal notebook notes. Preserve the original URL for attribution and follow-up. Do not capture credentials or bypass authentication, paywalls, CAPTCHAs, rate limits or technical access controls.


## Owner clarification — private notebook and local copies (2026-11-27)

The Owner may save pages/screenshots locally and process those copies manually or with local automation. ImmoGR's browser-side local import accepts HTML/HTM/TXT/MD/PDF/DOCX/XLSX/PPTX/CSV/TSV/JSON up to 5 MB, extracts text locally, and requires the Owner to review and explicitly save notes. The original file is not uploaded. Remote crawling, proxying and technical access-control bypass remain separate and are not authorized by this local workflow.


## Limited research-probe policy

Each source record now has a `probePolicy` independent of its normal acquisition `status`:

- `prohibited`: current source review records an explicit restriction on scripted/bulk/crawling access; local batch runner skips it.
- `not_reviewed`: no source-specific limited-probe permission is recorded; local batch runner sends no requests.
- `authorized_for_limited_probe`: may be set only after current terms/operator permission and the intended research scope are reviewed. The record must contain `authorizationReference`, `reviewedAt`, `termsReviewedAt`, `robotsReviewedAt`, exact `allowedHosts`, and `maxRequests` of 2 or 3.

The batch plan file contains only source IDs and page URLs. It cannot grant itself authorization. The current registry has 7 sources marked prohibited and 22 not reviewed; none is currently authorized. See `docs/IMMOGR_PROBE_READINESS.md`.
