> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Product Specification

**Status:** WP1 foundation · **Owner-approved:** 2026-11-27 · **Product:** independent replacement for retired ImmoFinder.

## Purpose
ImmoGR discovers useful housing opportunities and private-owner prospects in the target communes of Graubünden. It is an evidence-first product, not a broad web scraper and not a continuation of ImmoFinder.

## Result categories

### Direct Rental
A specific apartment or house offered for long-term rental. Admission requires a target commune, a real listing detail page, an explicit monthly rent normalized to CHF, monthly rent no higher than CHF 2,000, evidence that the advertiser is a private owner (not an agency or intermediary), and a usable direct contact route. Every displayed fact must have page-level evidence. Unknown price, period, advertiser identity, or location means the record is not an admitted Direct Rental.

### Private Owner Prospect
A specific seasonal or holiday apartment/house in a target commune. Admission requires evidence of the actual property, private-owner status, and a direct public contact route. The property's suitability for a long-term rental of three years or more is a scored prospect hypothesis, not a fact or offer. CHF 2,000 is a negotiation reference only; it must never be shown as the object's published rent unless the page explicitly states it.

## Internal discovery stage
Live discovery may return current search-engine URLs as unverified leads for manual review. This is an intermediate queue, not a third admitted result category. Titles and snippets are not listing evidence; no candidate becomes a Direct Rental or Private Owner Prospect until the specific page is lawfully acquired and all mandatory facts are evidenced.

## Non-goals
- Reusing or repairing ImmoFinder.
- Treating search snippets, portal index pages, aggregators, or generic category pages as listings.
- Guessing owners, contacts, prices, rent periods, addresses, or willingness to rent long-term.
- Sending messages, emails, or applications automatically.
- Circumventing robots, access restrictions, authentication, paywalls, rate limits, or source terms.

## Product principles
1. One candidate equals one concrete property and one canonical detail URL.
2. Discovery and evidence acquisition are separate stages.
3. Each fact has source URL, exact supporting quote or structured-data path, extraction method, and timestamp.
4. Owner identity and contact attribution are separate facts; a platform contact is not proof of private ownership.
5. Conflicts remain visible and lower confidence; the system never silently chooses a convenient value.
6. No record is promoted because a model says it is likely. Hard admission gates remain deterministic and inspectable.
7. The interface distinguishes verified facts, inferences, unknowns, and human-reviewed decisions.

## Geography
Use one canonical, versioned list of the 44 target communes, with official IDs, current names, aliases, historic names, language variants, and postcode mappings. The list must be sourced from authoritative public records before live search; do not infer it from old ImmoFinder configuration.

## User outcomes
The user can review concrete rental opportunities and credible private-owner prospects, understand why each result passed, inspect original evidence, and decide independently whether to contact the owner.
