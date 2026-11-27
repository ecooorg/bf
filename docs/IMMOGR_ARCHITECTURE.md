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
2. **Page acquisition:** fetch the final URL, status, headers, content type, redirects, robots/terms decision, and rate-limit state. Respect source access policy and SSRF protections.
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
- No source is activated until its terms, robots policy, access method, and real-page sample have been reviewed.

## Live activation gate
The WP1 status endpoint is informational only. A real search endpoint and scheduler must not be enabled until source research, page acquisition, evidence model, independent tests, and the first real-page acceptance gate are complete. The initial release is manual-only; scheduling is a later owner-approved decision.
