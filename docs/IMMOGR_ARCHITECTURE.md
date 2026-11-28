> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Architecture

## Strict isolation
ImmoGR is a clean implementation. Its business logic, adapters, configuration, persistence, runs, diagnostics, and tests are independent. It must not import or query any ImmoFinder source, module, test fixture, setting, cache, or table. Shared infrastructure is limited to BiForge's generic auth, Express host, PostgreSQL connection pool, logging, and provider transport.

## Namespaces
- UI: src/ImmoGR.tsx, domain contracts in src/immogr/, route /immogr.
- Server: server/immogr/, API /api/immogr/*.
- Config: config/immogr/.
- Data and research: data/immogr/.
- Tests: existing approved category suites, with new ImmoGR-specific assertions and real-page fixtures in a dedicated ImmoGR test directory only when the test map is updated.
- Database: new immogr_* tables and migrations only; never immofinder_*.

## Pipeline boundaries
1. **Discovery:** identify candidate URLs from search providers. The initial live endpoint uses Gemini Google Search grounding and returns URL leads only; it does not fetch or persist source pages. A snippet is only a URL-discovery hint.
2. **Page acquisition:** fetch the final URL and capture status, headers, content type, redirects, timing, and response metadata. Apply transport-security and resource limits.
3. **Page representation:** retain separate blocks for page metadata, JSON-LD/structured data, the primary listing, related listings, navigation, footer, and unrelated content.
4. **Source adapters:** source-specific parsers are written from scratch. They normalize the source's listing shape without coupling domain rules to page layout.
5. **Evidence-first extraction:** deterministic extraction first. Every fact carries a quote or structured-data path, URL, page block, method, and timestamp. Conflicting facts are preserved.
6. **Interpretation:** an LLM may classify ambiguous page blocks, explain conflicting evidence, and propose unresolved facts. It cannot invent a fact, create a quote, or override hard gates.
7. **Owner intelligence:** classify private owner, agency, management company, tour operator, intermediary, or unknown. Attribute the contact to a named entity only when page evidence supports the relationship.
8. **Qualification:** separate Direct Rental and Private Owner Prospect gates. No generic combined score may hide a failed mandatory condition.
9. **Deduplication:** combine canonical URL, source IDs, address/coordinates when public and verified, normalized property name, image hashes where lawful, and owner/contact evidence.
10. **Review and card output:** display verified facts, inferred prospect score, conflicts, unknowns, source freshness, and reviewer status separately.

## Reliability and provider policy
- Search-provider failure must not block direct eligible source feeds or manual source checks.
- Provider budgets are explicit per run; stop before exceeding them.
- Cache only permitted public-page metadata and evidence needed for deduplication/review.
- Use bounded concurrency, per-host delays, retries for transient errors only, and observable run cancellation.
- Sources are represented by technical metadata and evaluated through the same acquisition and quality pipeline.

## Search pipeline
The authenticated search endpoint runs a complete bounded pipeline: source-scoped URL discovery, public-page retrieval, redirect and DNS target validation, HTML/JSON-LD parsing, evidence-backed listing interpretation, deterministic qualification, deduplication and persistence. Each run records provider diagnostics, page outcomes, content fingerprints and listing evidence. The UI displays extracted facts and quotes for review; candidate qualification is not a claim of current availability.

The first implementation is intentionally bounded to a small number of pages per run and low concurrency. Increase volume only after real-page tests establish extraction quality and service stability. A scheduler is a later stage.

### Legacy runtime and migration quarantine

ImmoFinder server modules and the legacy `src/immoCard.ts` helper are excluded from the production server build. Historical migrations 020–030 remain in the repository but are excluded before the active migration runner reads migration contents or checks their versions. The existing legacy schema and rows are preserved unchanged.

## Manual research observations
Manual observations remain available as a separate owner-reviewed workflow. They preserve the source URL, locality, capture time and reviewer provenance, and remain distinct from automated page retrieval records.

### Private local-copy processing (Owner-approved 2026-11-27)

The Owner may save pages or screenshots through ordinary browser functions and process those local copies manually or with local automation. ImmoGR's local import supports user-selected HTML/HTM/TXT/MD/PDF/DOCX/XLSX/PPTX/CSV/TSV/JSON files up to 5 MB: text extraction runs in the browser, the original file is not uploaded, and the Owner reviews/edits the extracted notes before explicit database save. This local workflow processes only files explicitly selected by the Owner. The saved record retains source URL, locality, capture time and structured facts/notes. Verified source homepage links are shown for registry entries where available.

The source registry and personal review endpoints require application authentication; they fail closed when app authentication is disabled. Saved personal research is not exposed through public routes.

### Local structured metadata suggestions

When a user imports local HTML/HTM, ImmoGR reads embedded `application/ld+json` in the browser and suggests only explicit title, property type, price, currency, price period, locality and availability fields. Suggestions are editable and remain user-unverified until reviewed; missing or ambiguous values stay unknown. Malformed JSON-LD is ignored. The original file remains on the user's device.
## Local page inspector
The browser-based inspector remains available for owner-selected local snapshots and uses the same evidence-first domain model. Remote retrieval is handled by the server-side search pipeline described above.
