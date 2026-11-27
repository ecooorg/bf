> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Acceptance Criteria

## WP1 foundation acceptance
- ImmoFinder is inactive: no UI entry, no active API, no scheduled workflow, no CI live-run job, no background worker startup, no database writes.
- Historical code and data are preserved read-only.
- ImmoGR has independent UI, API, code, configuration, data, and test namespaces with no imports or database dependencies on ImmoFinder.
- Live discovery may return only unverified URLs; listing qualification and automated source-page acquisition remain disabled.
- All maintained Markdown documentation declares the retirement and new authority.
- Initial source registry identifies permission/access status and does not activate unverified sources.

Initial sample: 30 real pages, manually labeled before evaluation.

## First real-page acceptance
- At least 30 real public pages are manually labeled across: valid direct rental, private holiday listing, agency listing, management company, portal search page, aggregator, inaccessible/blocked page, stale listing, wrong commune, ambiguous price period, and misleading contact placement.
- The system's output is compared with labels. Precision and recall are both reported; no self-generated labels.
- All mandatory facts on every admitted result have evidence.
- No result is admitted from snippets or index pages.
- At least three consecutive full runs complete without data corruption, duplicate promotion, or uncontrolled provider spend.
- The user reviews actual unique results and confirms practical usefulness before the search is described as accepted.

## Direct Rental admission
Concrete long-term residential listing, target commune, normalized monthly rent ≤ CHF 2,000, private advertiser/owner evidence, direct contact route, current page, and complete mandatory provenance.

## Private Owner Prospect admission
Concrete seasonal/holiday property, target commune, private-owner evidence, direct public contact route, source freshness, and an explicitly separate long-term suitability estimate. Do not claim willingness to rent long-term without owner confirmation.

## Production release
Deploy only after WP1 and the real-page acceptance gate pass. First release is manual-only. Exact GitHub main commit, CI conclusion, Render deployed commit, health check, and real search-run evidence must agree. If production does not match the repository commit, stop and reconcile before further work.

## WP2 — all-source manual research acceptance

- All 29 entries in `config/immogr/sources.json` appear in the ImmoGR source research interface.
- Every source has a “Manual review” action independent of its automated-acquisition status.
- Clicking the action opens the original source in a user-controlled browser context; no server-side fetch or crawler is triggered.
- The Owner can save personal research observations with source, canonical URL, locality, timestamp, reviewer, access outcome and selected facts/notes.
- Source terms are retained as source context; they do not create a separate database-capture gate for the Owner's private local notebook. Automated acquisition remains independently controlled.
- Manual observations persist only in ImmoGR tables and remain distinguishable from server-fetched pages and admitted listings.
- All 29 sources receive an initial manual access outcome. Sources with relevant inventory are sampled up to at least five real pages; smaller or zero-yield samples carry an explicit reason.
- No technical access controls are bypassed. The Owner may keep local page/screenshot copies; only explicitly selected research notes are persisted by the app, without credentials or unnecessary third-party personal data.
- A source may pass manual research while remaining blocked for automated acquisition.
- WP2 produces a source-by-source yield and effort matrix and an Owner-reviewed recommendation before any paid API/feed commitment.

The manual-review UX may use an external tab plus an in-app capture panel. An iframe/webview is not an acceptance requirement because third-party framing and cross-origin policies may prevent it.


## Personal manual notebook acceptance (Owner-approved 2026-11-27)
- Every registered source is available for user-initiated manual research regardless of automated acquisition status.
- The user can open the original source homepage where available, open an original listing URL, and save structured observations with source, locality and timestamp provenance.
- The user can import local HTML/HTM/TXT/MD/PDF/DOCX/XLSX/PPTX/CSV/TSV/JSON files up to 5 MB; extraction occurs in the browser, the file is not uploaded, and extracted text remains editable before explicit save.
- Local personal processing is not conflated with remote crawling; no proxy, credential capture, access-control bypass or automatic outreach is introduced.
- Personal notes are not automatically promoted to verified Direct Rentals or Private Owner Prospects.
- The source registry and manual-review read/write endpoints require authenticated application access and fail closed when authentication is disabled.
## WP3 authorized acquisition foundation acceptance
- Automated acquisition fails closed unless a source has explicit `authorized_api` or `authorized_feed` status, matching authorization mode, dated authorization reference, explicit terms and robots approval, and an exact HTTPS host allowlist.
- Non-HTTPS URLs, embedded URL credentials, unapproved hosts, missing/invalid authorization evidence and research-only/manual-only sources are rejected.
- Acquired-page representation keeps metadata, JSON-LD, primary listing, related listing, navigation, footer and other blocks separate.
- A source adapter cannot run before the authorization gate passes; manual notebook capture and search-provider snippets never count as acquisition authorization.
- Before any network transport is enabled, tests must cover DNS/IP SSRF protection, redirect revalidation, robots decisions, per-host rate limits, response size/time limits, content-type checks, cancellation and audit logging.
- At least one real source must have written or contractually documented permission and an owner-approved API/feed scope before its adapter can be activated.

## WP3 bounded research-probe acceptance

- A source can be probed by the local ImmoGR agent only with a source-specific documented permission for limited research-purpose automated requests and a positive robots/access review.
- The probe gate rejects sources with explicit scripted-probe prohibitions, missing permission evidence, unapproved hosts/methods, non-HTTPS URLs, pagination, and plans exceeding the source's two- or three-request ceiling.
- Probes are owner-triggered, single-host, GET/HEAD-only diagnostics. They do not enable scheduled collection, listing harvesting, automatic retries, or dataset persistence.
- Any API key or personal credential is read only from the Owner's local secret store; never commit or log it.
- Record probe availability/schema/quality outcomes separately from full acquisition authorization. Passing a probe does not authorize regular acquisition.
- No probe is performed by ChatGPT on behalf of the local agent; source tests are run from the Owner's environment using their own accounts and keys.


### Local page inspector

- [ ] Owner can import one local HTML/HTM snapshot and inspect title, readable text, metadata, JSON-LD, links and image URLs.
- [ ] Inspection does not execute scripts or automatically load remote images; only HTTP(S) URLs without embedded credentials are shown.
- [ ] Owner can save the original snapshot and extracted JSON locally, then edit extracted notes before explicit ImmoGR save.
- [ ] No arbitrary remote fetch, page traversal, crawler, or server-side proxy is enabled by this UI slice.

\n### Owner-local page fetcher\n\n- [ ] Local CLI accepts only an owner-supplied source-specific probe authorization record and one or two explicit HTTPS page URLs.\n- [ ] The robots.txt check counts toward the hard two-or-three-request ceiling; disallowed paths stop before the page request.\n- [ ] The runner rejects private/reserved DNS answers, non-standard HTTPS ports, URL credentials, redirects, non-HTML responses, oversized responses and timeouts.\n- [ ] The runner performs no retries, pagination, crawling, cookie/session capture or remote persistence; snapshots and a minimal report stay in a git-ignored local directory.\n- [ ] No source is pre-authorized; each source requires current, source-specific evidence before a plan can run.\n

## Android tablet local page viewer and owner-selected discovery sources

- [ ] The ImmoGR page viewer adapts to Android tablet portrait and landscape layouts, with readable listing text, responsive photo previews, source links and touch-friendly controls.
- [ ] Photo previews remain unloaded until the Owner explicitly requests them; scripts from imported pages are never executed.
- [ ] Search settings allow the Owner to select one or more registered source domains; the API validates source IDs and filters grounded result URLs to the selected domains only.
- [ ] Source selection is a discovery scope preference. It does not change source access policy or grant automated fetching permission.
- [ ] Local probe CLI reads limited-probe authorization only from the ImmoGR source registry and cannot self-authorize through a local JSON plan.
- [ ] Batch research runner produces a status row for all 29 sources, skips prohibited/unreviewed sources without sending requests, and runs only sources with documented limited-probe authorization.
