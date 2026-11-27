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


### Legacy runtime and migration quarantine

ImmoFinder server modules and the legacy `src/immoCard.ts` helper are excluded from the production server build. Historical migrations 020–030 remain in the repository but are excluded before the active migration runner reads migration contents or checks their versions. The existing legacy schema and rows are preserved unchanged.

## User-initiated manual research path (Owner-approved 2026-11-27)

Manual source research is a first-class path separate from automated page acquisition:

1. Render every source-registry entry in the ImmoGR source/research UI, regardless of its automated-acquisition status.
2. The “Manual review” action opens the original URL in a user-controlled browser tab/window. The app does not fetch the page server-side as a side effect of the click.
3. The user explicitly submits a structured capture form. The API validates the source ID, URL, locality ID, allowed observation fields and authenticated reviewer.
4. Persist the observation in `immogr_manual_reviews`, with `capture_method=manual_user_review`, canonical URL, observed timestamp, reviewer, access outcome and field-level evidence notes.
5. Keep manual observations separate from `immogr_source_pages` records produced by authorized server acquisition. Manual capture alone does not satisfy the fetched-page admission gate for an automated Direct Rental.
6. Never use a server-side proxy, hidden browser automation, credential/cookie capture, or bypass of authentication, paywalls, CAPTCHAs, rate limits or technical restrictions to simulate manual viewing.

A framed in-app viewer is optional and must not be assumed to work: source CSP/X-Frame-Options and browser cross-origin isolation commonly prevent embedding or reading arbitrary third-party pages. The safe baseline is an external tab plus an in-app capture panel.


### Private local-copy processing (Owner-approved 2026-11-27)

The Owner may save pages or screenshots through ordinary browser functions and process those local copies manually or with local automation. ImmoGR's local import supports user-selected HTML/HTM/TXT/MD/PDF/DOCX/XLSX/PPTX/CSV/TSV/JSON files up to 5 MB: text extraction runs in the browser, the original file is not uploaded, and the Owner reviews/edits the extracted notes before explicit database save. This local workflow does not fetch the remote source, use a proxy, or grant remote crawling permission. The saved record retains source URL, locality, capture time and structured facts/notes. Verified source homepage links are shown for registry entries where available.


The source registry and personal review endpoints require application authentication; they fail closed when app authentication is disabled. Saved personal research is not exposed through public routes.


### Local structured metadata suggestions

When a user imports local HTML/HTM, ImmoGR reads embedded `application/ld+json` in the browser and suggests only explicit title, property type, price, currency, price period, locality and availability fields. Suggestions are editable and remain user-unverified until reviewed; missing or ambiguous values stay unknown. Malformed JSON-LD is ignored. The original file remains on the user's device.
## WP3 authorized acquisition contract (initial implementation)

`server/immogr/acquisition-contract.ts` defines the fail-closed policy boundary and typed page representation. Automated acquisition is eligible only when a source explicitly has `status=authorized_api` or `status=authorized_feed`, a matching authorization mode, a dated authorization reference, explicit terms and robots approval, and an exact HTTPS host allowlist. URL credentials and non-HTTPS URLs are rejected. Public visibility, a manual-review state, local owner-held copies, or a discovery result cannot satisfy this gate.

The contract defines page blocks for metadata, JSON-LD, primary listing, related listing, navigation, footer and other content, plus a source-adapter interface. It does not yet perform network requests or enable any source. A transport implementation must additionally enforce DNS/IP SSRF checks, redirect revalidation, robots policy, per-host rate limits, bounded response size/time, content-type validation, cancellation and auditable fetch outcomes before it can be activated.

## Bounded local-agent research probes (Owner-approved 2026-11-27)

A technical probe is automated access even when it is only two or three requests and is initiated by the Owner's own local ImmoGR agent. It is distinct from manual browsing and from recurring acquisition. The local agent may run a probe only when a source-specific record explicitly documents that limited research-purpose requests are permitted, robots/access rules allow them, the exact host and GET/HEAD methods are allowlisted, and the plan contains no more than two or three requests to one host. Explicit scripted-access prohibitions always win. A probe is not a licence for pagination, listing harvesting, background retries, recurring schedules, or data ingestion at scale.

The policy contract is implemented in `server/immogr/probe-policy.ts`. Credentials/API keys, if required by an approved API, must remain in the Owner's local secret store and must never be written to the repository or probe log. Probe outcomes should record only availability, status/content type, response shape/schema signals, latency and a minimal quality assessment. Do not persist listing datasets from this diagnostic path. The current PR adds the policy gate and tests; it does not run probes from ChatGPT or claim that any source has already been tested. A local-agent runner and source-by-source reviewed permissions remain follow-up work.


## Local page inspector (WP3 first UI slice)

The manual research form can inspect a user-selected local HTML/HTM snapshot in-browser. It extracts readable body text, page title, canonical/source URL, ordinary HTTP(S) links, image/source URLs (including lazy `data-src` and the first `srcset` candidate), basic meta tags, and JSON-LD blocks. It never executes page scripts, embeds the page, or automatically loads remote images. Unsafe schemes and credential-bearing URLs are omitted. The inspector displays text and URL lists, and offers explicit downloads of the original local HTML snapshot and a JSON extraction report. The extracted notes remain editable in the manual research form and are saved to ImmoGR only when the Owner submits that form. This is not a remote URL fetcher: browser CORS prevents arbitrary cross-origin reads, so a later local-agent transport must deliver a bounded HTML response to this same parser and must independently enforce host/redirect/IP/size/time controls.

\n## Owner-local HTML probe runner\n\n`scripts/immogr-local-page-fetch.mjs` is an opt-in local CLI bridge for one source-specific, owner-triggered diagnostic plan. Invoke it with `node --import tsx scripts/immogr-local-page-fetch.mjs <local-plan.json>`. The local JSON plan supplies the source ID, dated explicit probe authorization and one or two HTTPS page URLs; the runner adds a robots.txt check so the total is two or three HTTP requests. It uses no cookies or credentials, never follows redirects or retries, permits only standard-port HTTPS, resolves and rejects private/reserved IP addresses, pins the checked public address for the request, applies 10-second timeouts and bounded response sizes, and checks robots path rules before each page request. It saves HTML snapshots and a minimal status/hash report only to a git-ignored local output directory. No source is pre-authorized by this implementation: a source-specific permission record must be supplied by the Owner after reviewing current rules.\n