# ImmoGR — listing analysis architecture

Status: implementation baseline, 2026-11-27.

## Product objective
ImmoGR must return individual, reviewable property cards rather than search-result URLs. Discovery is only the entry point. The unit of work is one distinct rental listing, with its own canonical detail URL, facts, evidence, qualification decision and review state.

## Pipeline
1. Discovery — search providers find candidate URLs. Search snippets and result titles are discovery hints only.
2. Page representation — obtain a user-selected local copy, or (in a later gated mode) retrieve a page only through a source-specific authorized method. Do not bypass logins, paywalls, CAPTCHAs or access controls.
3. Deterministic extraction — inspect canonical links, metadata, JSON-LD, visible text and same-domain link inventory before model interpretation.
4. AI listing extraction — classify a page as listing detail, catalog, non-listing or unknown; split catalogs into zero or more individual listings; emit typed facts and short source quotations.
5. Evidence validation — accept a fact only when its quote is present in supplied page text. Accept a listing URL only when it is the page URL or an observed same-source link. Exact-match locality against the owner-defined 45-locality catalogue.
6. Qualification — apply Direct Rental and Private Owner Prospect rules independently. Unknown remains unknown; missing evidence means needs-review, not a guess.
7. Deduplication and persistence — canonicalize detail URLs, compare stable listing facts and retain evidence history. A candidate is not admitted until the review gate passes.
8. Owner review — show card, evidence, missing fields and reason codes. Owner edits and saves the final notebook record.

## Current implementation
- Discovery remains URL-only and never reads a remote page.
- The manual notebook imports user-selected local HTML, text, PDF and office/data files in the browser.
- The new local-page AI endpoint accepts extracted text and a bounded same-domain link inventory supplied by the authenticated owner UI. It does not fetch the URL or upload the original file.
- Gemini returns structured JSON. Server-side validation removes unsupported facts, rejects invented URLs, checks evidence quotes against submitted text and exact-matches locality labels.
- UI renders per-listing AI cards with qualification state, confidence, evidence quotations and a one-click transfer into the existing owner-reviewed save form. Nothing is saved automatically.
- No phone numbers, email addresses or personal names are extracted into cards.

## Qualification rules
### Direct Rental
A card can be labelled qualified_candidate only when detail-page URL, title, target locality, CHF rent, monthly period and current availability all have source quotations, and rent is at most CHF 2,000/month. Weekly, nightly and seasonal rates are never converted. Missing facts mean needs_review; explicit price/period mismatch or rent over the ceiling is rejected.
### Private Owner Prospect
A card can be labelled qualified_candidate only when target locality, detail URL, private-owner status, direct contact route and explicit three-year rental horizon have source evidence. Owner willingness is never inferred. A holiday listing without a three-year statement remains needs_review.

## Remote page-reading strategy (not activated)
Gemini URL Context is the first remote-reader candidate because it reads specific URLs and can be combined with Google Search. Its documented GenerateContent configuration uses tools: [{ urlContext: {} }]; the documented request limit is 20 URLs. It does not follow nested links, may rely on an index cache when used alone, and cannot read login-protected or paywalled pages. For freshness-sensitive listings, URL Context must be tested against current page state and is not an availability guarantee.
Playwright is a fallback for permitted public pages that require JavaScript rendering. It is not a default crawler. Use only for sources with reviewed acquisition method, host allowlist, terms/robots approval and bounded request budget. No login bypass or anti-bot circumvention.
Structured page data (JSON-LD, Open Graph, embedded JSON) should be parsed deterministically before AI interpretation. Search alerts or official feeds can be separate discovery inputs when their terms allow them.

## Evaluation before broad activation
Create a manually labelled corpus with individual detail pages, multi-listing catalogues, dynamic pages, seasonal listings, private-owner examples, stale/removed pages and irrelevant pages. Measure listing-level precision/recall, price/currency/period accuracy, locality accuracy, owner-class precision, detail-URL correctness, evidence validity, duplicate rate, page-read success and latency.
Do not activate a source merely because its homepage is reachable. The source registry must separately record terms review, robots decision, approved method, exact host allowlist, authorization reference, rate budget and review date. Explicit scripted-access prohibitions remain excluded.

## Current limits and next gates
- This slice is a local-copy proof of concept, not a live remote listing crawler.
- AI cards are suggestions and are not persisted as immogr_listings; the owner explicitly transfers a candidate to the existing notebook form and saves it.
- Next: immutable source-page snapshots, listing/evidence persistence, canonical deduplication and status history.
- Remote URL Context stays disabled until source-specific authorization is recorded and tested.
- Playwright and automated portal notifications are later options, not prerequisites for validating extraction quality.
