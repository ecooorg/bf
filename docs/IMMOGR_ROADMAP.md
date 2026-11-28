# ImmoGR — Roadmap

## Objective
Build a complete, reliable search engine for rental properties and private-owner prospects in the selected Graubünden localities. The engine must be technically capable of discovering, retrieving, parsing, deduplicating and evaluating information from the configured source inventory.

## WP0 / Phase 1 — Complete the search engine
- Implement a unified discovery and retrieval pipeline.
- Support generic HTML retrieval, structured data, JavaScript-rendered pages where technically appropriate, and source-specific adapters where they add measurable value.
- Preserve page snapshots or bounded evidence extracts, response metadata and provenance.
- Normalize locality, property type, rooms, area, price and period, availability, advertiser class and contact route.
- Deduplicate results across sources and keep source lineage.
- Provide diagnostics for each stage, provider, request and parser.
- Keep transport security, SSRF prevention, secret handling, timeouts, response-size limits and bounded concurrency.

## WP1 / Phase 2 — Short technical and usefulness test of every source
- Run the same small test set against every registered source.
- Determine whether each source responds, what page formats it returns, and whether it contains useful property information.
- Measure concrete listing yield, locality coverage, completeness of key fields, freshness, duplicate rate and extraction quality.
- Separate transport failures, empty inventories, irrelevant pages and successful useful extraction.
- Produce a comparable source scorecard based on observed usefulness and technical reliability.

## Phase 3 — Select useful sources
- Compare measured source yield and unique contribution.
- Retain the sources that provide useful information for the target search.
- Deprioritize sources that repeatedly return irrelevant or duplicate material.
- Confirm the selected source set before expanding test volume or operating frequency.

## Phase 4 — Formal source relationships
- After the useful source set is established, assess formal interaction options for those sources.
- Consider APIs, feeds, subscriptions, contracts and other arrangements only for sources that demonstrate practical value.
- Record the resulting decisions separately from the engine's technical capability and source-quality measurements.

## Quality gates
- Every extracted fact must retain its source URL and supporting evidence.
- Search results remain distinguishable from verified listings until the evidence and qualification stages pass.
- Source failures must be observable and must not silently disable unrelated sources.
- The engine must pass deterministic tests and a real-page evaluation set before production use.
