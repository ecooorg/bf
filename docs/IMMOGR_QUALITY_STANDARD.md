> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Quality and Evidence Standard

## Non-negotiable evidence rules
- Every admitted listing has a fetched, specific detail page and a canonical URL match.
- Every mandatory fact is supported by an exact page quote or structured-data path.
- A snippet, search title, related-listing card, menu, footer, or page-level boilerplate cannot be used as listing evidence. Discovery leads are not listings and are never admitted or persisted as such.
- Contact ownership is explicit: platform contact, advertiser contact, property manager, and owner contact are distinct.
- Conflicting values are retained and marked unresolved; do not silently select one.
- LLM output is a hypothesis until independently checked against page evidence.
- No invented facts, no contact guessing, no false claim of private ownership.

Evidence coverage is mandatory for every required fact on every admitted result.

## Target metrics
Measured on a sufficiently large, independently labeled real-page set, not on hand-written fixtures alone:
| Metric | Initial target |
|---|---:|
| Specific listing-page identification precision | ≥98% |
| Target commune accuracy | ≥98% |
| Price and rental-period accuracy | ≥98% |
| Private-owner classification precision | ≥95% |
| Invented contact details | 0 |
| Snippet-only admitted records | 0 |
| Mandatory-fact evidence coverage | 100% |
| Duplicate admitted records in the reviewed set | 0 |

Report precision and recall separately, with confidence intervals and sample sizes. Do not claim targets met from fewer than 30 real pages; 30 pages is only the initial WP1 acceptance sample, not a statistically sufficient benchmark.

## Owner classification
Classes: private owner, agency, management company, tour operator, intermediary, unknown. A personal name or phone number is not sufficient proof of private ownership. Company legal names, UID/imprint data, agency branding, platform syndication, and contact-page ownership are relevant evidence. Unknown must remain unknown rather than defaulting to private.

## Prospect score
The long-term suitability score is an explicitly labeled estimate based on property type, size, seasonal availability signals, local use, direct-owner evidence, and contact route. It must not imply a confirmed three-year lease offer or owner willingness.

## Human review
The UI must expose the evidence behind every mandatory fact, show unresolved conflicts, and record approve/reject/correct actions. Corrections become labeled evaluation data only after review; the system's own generated output is not a gold label.
