> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document defines technical and product-quality acceptance only.

# ImmoGR — Acceptance Criteria

## Foundation
- ImmoGR has independent UI, API, code, configuration, data and tests.
- The source inventory contains technical identifiers, names, categories and canonical homepages; no source permission status is required to register or test a source.
- Adding a new source requires technical metadata and an adapter or generic retrieval path, not a source-specific authorization record.

## Search engine
- Search accepts the selected locality scope and searches the configured source inventory.
- Retrieval records requested/final URL, HTTP status, content type, response size, timing and content fingerprint.
- The engine supports ordinary HTML and structured data, with a generic parser fallback and source-specific adapters where useful.
- Search results are deduplicated and linked to source provenance.
- Retrieval failures are recorded as technical outcomes and do not silently suppress unrelated sources.

## Source usefulness test
- Every registered source can be run through the same short technical test.
- The report records request outcome, page type, number of concrete property candidates, locality coverage, price/rooms/area fields, owner/contact signals, freshness and parsing quality.
- Sources are compared by useful unique information, not by permission or authorization status.
- The report separates transport failures, empty results, irrelevant content and successful useful extraction.

## Technical safeguards
- Validate URL schemes and reject embedded credentials.
- Resolve hostnames and reject private, loopback, link-local, reserved and non-global IP addresses to prevent SSRF.
- Revalidate redirect destinations, apply timeouts and response-size limits, and bound concurrency and resource use.
- Keep application authentication, secret handling, logging redaction and database integrity controls.
- Do not implement mechanisms to defeat authentication, CAPTCHA, paywalls or other technical access controls.

## Direct Rental admission
- Concrete long-term residential listing, target locality, normalized monthly rent ≤ CHF 2,000, private advertiser/owner evidence, actionable contact route, current page and complete mandatory provenance.

## Private Owner Prospect admission
- Concrete seasonal/holiday property, target locality, private-owner evidence, direct public contact route, source freshness and an explicitly separate long-term suitability estimate.
- Do not claim willingness to rent long-term without owner confirmation.

## Production quality
- At least 30 real pages are labeled independently before quality evaluation.
- Precision and recall are reported separately.
- Every admitted fact carries page-level evidence.
- At least three consecutive full runs complete without data corruption, duplicate promotion or uncontrolled provider spend.
- Practical usefulness is confirmed from actual unique results before the search is described as accepted.
