> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Legacy Knowledge Extraction

**Purpose:** preserve reusable engineering lessons from ImmoFinder history without reusing its implementation. This document is a research record, not a permission to copy legacy code.

## Early implementation patterns worth retaining as concepts
- **Pure domain core:** the first recorded core commit separated deterministic parsing/matching from I/O. It used whole-word commune matching, Swiss room notation parsing, exact quote verification, canonical keys, and bounded same-host detail-link discovery. See historical commit https://github.com/ecooorg/bf/commit/dbe60b6400ea1a328ca20543ffd8c997d8961253.
- **Evidence verification:** a fact proposed by a model was accepted only when its supporting quote appeared in fetched page text. This concept should be strengthened into field-level evidence records and structured-data paths.
- **Contact enrichment after admission:** a later design explicitly kept a valid property when enrichment failed or no contact was found. The concept of separating property qualification from contact enrichment is useful; ImmoGR will use its own rules and schema. Historical reference: https://github.com/ecooorg/bf/commit/b2369a4d5e64911f07418d63db7f1a2722eee7b3.
- **Source-specific detail URLs:** early tests distinguished a real property detail URL from a search/index page. ImmoGR must make this a formal, independently tested page-type stage.

## Observed failure patterns from the retired implementation
- Search-provider credits/availability were an infrastructure bottleneck; the system could plan many queries while every request failed. ImmoGR must isolate provider failure from direct source acquisition and enforce an explicit budget before calls.
- Search results, category pages, redirects, and generic portal pages were repeatedly mistaken for useful candidates. ImmoGR must require a concrete fetched detail page and page-level evidence.
- Some adapter extraction results were discarded downstream and the page was reinterpreted as unstructured text. ImmoGR must preserve typed adapter output end-to-end.
- Whole-page parsing mixed listing content with navigation, footer, related listings, and contact-page chrome. ImmoGR must segment page blocks before extraction.
- Contact routes and named contacts were sometimes attributed to an agency/platform rather than the property's owner. Contact attribution must be modeled separately from the contact value.
- Price period and owner type were not consistently treated as hard category-specific gates. ImmoGR separates the two result categories and normalizes price periods.
- Large legacy test suites used synthetic simplified pages and lacked an independent real-page gold set. ImmoGR acceptance uses manually labeled real pages and reports precision and recall separately.

## Evidence limits
The owner reports that earlier ImmoFinder architectures produced better outcomes than the final version. The historical code shows materially different designs, but the repository evidence reviewed so far does not provide a comparable, independently labeled result set proving which version was best. Recover historical live outputs and source context before treating that observation as a measured fact.

## No legacy code reuse
These are concepts only. Do not import, copy, adapt, or port ImmoFinder source, adapters, tests, config, migrations, prompt fragments, or runtime dependencies into ImmoGR. Reimplement required concepts independently and validate them against new real-page fixtures.
