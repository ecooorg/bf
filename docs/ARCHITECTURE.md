## ImmoFinder admission boundary (C131)
- R1–R14 in `TECHNICAL_SPECIFICATION.md` are authoritative: L1 requires a fetched, URL-matched residential detail page, configured-locality evidence, ≥3 page-confirmed rooms and the approved exclusion checks.
- Price, publication date, direct phone/email and photos are optional for L1; snippets are discovery-only. L2/L3 owner reachability and letters have separate evidence gates. Never reinstate superseded P129–P130 mandatory monthly-price/date/direct-contact rules.

## ImmoFinder durable run execution
- The immofinder_runs table is the PostgreSQL queue authority; workers claim one row with SKIP LOCKED and an expiring lease renewed by heartbeat.
- The run row snapshots settings, wave and cycle. Progress stores completed query keys, cumulative counts/source stats, delivery acknowledgements and cancellation state.
- A query is checkpointed only after its candidates are processed; after process replacement, completed queries are skipped and incomplete/failed queries are retried. Listing writes remain idempotent by URL/canonical key.
- SIGTERM stops new claims, requests a bounded drain, and releases the active lease for recovery; manual cancellation is persisted in PostgreSQL and retains final counters.

# Architecture and Component Boundaries

**Authority:** Product and behavior requirements are in `../TECHNICAL_SPECIFICATION.md`. This file records architectural constraints and implementation landmarks; it must not redefine user-facing behavior.

## Quick orientation

- Three user-facing agents only: Conversational (Simple), Expert, Architect — one Architect flow, no mode switch.
- Client never calls model providers; server owns auth, budgets, search, and generation.
- App Builder core (`appBuilder/`) is ports-only; Express/DB/React stay in adapters.
- Search continuity and evidence grounding rules live under Information quality workflow below; model ids under `docs/MODEL_REGISTRY.md`.
- Generated inventories under `docs/generated-*.json` are authoritative maps; do not hand-maintain duplicates.

## Target shape

- Client: React + Vite; server: Express; model calls remain server-side.
- Agent orchestration: Conversational and Expert currently have known shared paths; Architect/App Builder is a separate route family and engine. Do not claim full isolation unless current source and tests prove it.
- App Builder core (`appBuilder/`) should remain a pure core with ports; Express/database/client concerns belong in adapters.
- Durable project state is PostgreSQL-backed when configured; any fallback must be explicit and consistent with the applicable mode and security contract.

## Architect user-flow invariant

Architect is one user-facing agent and one state machine. Any beginner-friendly wording or advanced controls are adaptive presentation within that same flow, not a choice between modes. All paths must converge on the same task/specification, plan validation, artifact generation, validation, status, and delivery contract.

## Selected Architect and frozen Architectural Test Lab

`/project` and `/architect` mount the selected legacy `ProjectMode` workflow. New product work and reliability fixes target this one Architect implementation. `/architect-lab` remains available as a frozen diagnostic experiment only; do not develop it in parallel or present it as the primary Architect.

The Lab frontend remains a separate surface but is not an independent generation engine: it reuses authenticated project/build APIs and shared backend orchestration, polling, validators, and artifact storage. Its latest supplied build report was `PARTIAL`, with JavaScript syntax and file-reference failures. The selected legacy artifact reported `SUCCESS` with all declared validators passing, although source inspection found semantic DOM aliasing that the old validator missed. The shared validator now checks this failure class. Browser/mobile user outcome is still NOT_RUN.

## Conversational retrieval boundary

- The search planner receives a bounded recent dialogue window, while the provider query is made self-contained from the latest user task. A recognizable follow-up may inherit only the immediately preceding user task; an intervening unrelated user turn breaks carry-over.
- Planner-model failure does not erase a recognized lookup task: deterministic fallback preserves its query and named entities, subject to the same personal-data exclusion.
- Search-provider routing and LLM generation routing are separate concerns. Search-provider fallback is handled by the provider carousel; cross-provider generation fallback remains explicitly opt-in because provider data-handling terms and user content may differ.
- Retrieval usability is query/topic/entity relevance, not a universal number-presence test. Numeric evidence is required only when the requested answer is numeric or time/measurement based. This check is a retrieval-quality gate, not a full claim-by-claim fact verifier.

## Information quality workflow (summary)

A build or answer that passes syntax checks is not evidence that its information is correct. The same scenario families should be evaluable across Simple, Expert, and Architect modes with identical inputs and a clean conversation state.

**Deterministic contract layers (every commit):** search continuity on elliptical follow-ups; provenance limited to the current lookup; grounding of live numeric claims to the current evidence packet or explicit estimate/general-knowledge labels; distinguishable evidence boundaries (source text, user assertions, assumptions, inference, unknowns); no silent substitution of fabricated defaults for failed providers; mode contract (Simple answers the immediate question; Expert maintains analytical continuity; Architect emits a coherent artifact and honest validation status); regression safety on malformed/empty/stale/timeout/partial outcomes.

**Scenario families (nightly / pre-release):** current facts, follow-up continuity, source conflict, thin evidence, user-provided evidence, quantitative reasoning, ambiguous intent, error recovery, long dialogue, adversarial input.

**Mode acceptance highlights:**

- Simple: direct answer in the first 1–2 sentences; length matches complexity; current claims supported or labelled; sources from this turn.
- Expert: facts / assertions / assumptions / hypotheses / unknowns distinguishable; new turns state which prior conclusions change; recommendations do not seize the user’s decision unless requested.
- Architect: plan declares file map, interfaces, schema and acceptance before generation; imports resolve; user actions trace UI → handler → service → result; provider failures visible and excluded from aggregates; honest SUCCESS / PARTIAL / FAILED.

Detailed acceptance criteria and human blind-review process remain under `docs/TESTING_AND_ACCEPTANCE.md` and `docs/USER_VALUE_EVALUATION.md`.

## Model routing landmarks

- Gemini free-key allowlist and catalog summary: `docs/MODEL_REGISTRY.md`.
- Runtime catalog: `config/model-sources.json`.
- Cascades and health probes are code-owned; documentation must not invent additional default model ids.


## Client file systems (keep)

Two complementary client-side mechanisms; both are **in-force product features**:

1. **Workspace (`src/workspace/`, `WorkspacePanel`)** — local browser workspace.
   - Ingest zip / folder / files; store in IndexedDB; optional memory store for tests.
   - Privacy-gated text attachments fed into Simple, Expert, and Project agent requests.
   - Parse agent-proposed ChangeSets; validate / apply / rollback; export full, changed, or diff.
   - Mounted from `src/App.tsx` (Simple/Expert) and `src/ProjectMode.tsx`. Not the same as server `codeExecutor` ChangeSet validation for Architect code tasks.

2. **Google Drive (`src/driveClient.ts`, `driveSync`, `driveMirror`, `driveMerge`, `driveExport`, `useDrive`)** — backup and cloud persistence of user files.
   - Owner-intended backup/save path; keep and maintain when touching related UI or auth.
   - Does not replace local workspace ingest/attachments; workspace does not replace Drive backup.

Do not treat either tree as retired, experimental noise, or a candidate for removal in routine cleanup sessions.

## Guardrails

- Client never calls model providers directly.
- Server routes validate input and enforce auth, CSRF, rate limits, budgets, and delivery gates as applicable.
- App Builder core must not import Express, React, or direct database clients.
- Use generated inventories/architecture checks instead of hand-maintaining duplicated maps.
- The machine-readable boundary rules and known-violation files are retained under `docs/`; treat generated inventories as outputs of their declared scripts.

## Source maps

See `docs/generated-module-map.json`, `docs/generated-route-inventory.json`, `docs/architecture-boundary-rules.json`, and `docs/architecture-known-violations.json`. Regenerate through the corresponding `npm run docs:generate` / architecture scripts; do not manually fabricate generated output.

## Historical architecture notes

Older architecture discussions and audit findings were consolidated during documentation inventory work. Their historical claims are not current guarantees unless confirmed by current source, tests, or a new evidence record.

## ImmoFinder GR module (P128, planned)

Separate workspace, not an agent. `server/immofinder/` (sources, normalise, dedupe, filters, scoring, osint, draft, verify, export) with routes `/api/immofinder/*`; one pipeline for UI "Run now" and scheduled runs through the existing job queue/worker. Reuses Gemini adapter and key pool, auth and budgets; web search uses the configured provider (Serper in the carousel when keyed). Static data (communes, stop-list, sources) lives in `config/immofinder.json` and must be copied to `dist-server/config` by the build step when the loader lands. Frontend: `ImmoFinder` button on the home screen and an `ImmoFinder*` workspace component. Server-side Drive export and Telegram are new server integrations: existing `src/drive*` is browser-side and unusable in a cron run. Status: design only; nothing implemented in 128.1a.

### ImmoFinder status (P128.1)

Implemented: flat files `server/immofinder{Core,Fetcher,Pipeline,Store,Delivery,Routes}.ts` (the repo keeps `server/` flat), `src/ImmoFinder.tsx` (route `/immofinder`, home card `start-immofinder`), `.github/workflows/immofinder-cron.yml`. The run is an in-process async job guarded by `immofinder_runs` (one open run, 30-minute expiry) instead of the job queue. Source parsing is generic (same-site object links, page text, Gemini extraction verified against the text); unverified on live markup.

ImmoFinder discovery (128.3): `server/immofinderDiscovery.ts` builds per-commune queries (rotation by finished real runs), picks hits (host policy) and feeds them to the same extraction/filter/persist function as catalogue sources. Product quality contract: see **ImmoFinder search result quality** below.

## C131 ImmoFinder search constitution and implementation status

R1–R14 in `TECHNICAL_SPECIFICATION.md` remain the sole product-policy authority. The production search route imports `runPipeline` from `server/immofinder/live.ts`; the target directory now contains access, classification, pure pipeline, owner, run, taxonomy and source-adapter modules. `server/immofinderRoutes.ts` still owns authenticated routes, the PostgreSQL worker/lease, settings, delivery, repair, refresh and diagnostics; the new runner reuses shared source discovery, polite-fetch and page-parsing helpers only; the legacy pipeline is not a production fallback. Therefore the production search cut-over is implemented, but WP5 legacy dependency retirement and snapshot/restore cleanup are only PARTIAL. WP1/WP2 evidence, WP3 gold replay, WP4 owner review and WP6 live acceptance remain open; WP7 is not triggered. CI and deterministic tests are technical evidence only, never proof of user value.

## Historical: ImmoFinder search result quality (superseded by C131)

**Status:** Historical P129–P130 contract; its “current long-term rental listings” objective and mandatory price/contact/date admission rules are superseded by the owner-approved C131 R1–R14 constitution in `TECHNICAL_SPECIFICATION.md`. Do not use this section as current policy.

### Historical body (superseded by C131; kept for history)

**Status:** historical P129–P130 contract. Does not redefine TECHNICAL_SPECIFICATION; records what *counts as value* for ImmoFinder users and which implementation directions are allowed. Written after P128–P129 operations showed that green subsystems (parsers, CI, individual fields) still produced feeds users could not trust without heavy manual cleanup.

### User goal (source of truth)

The user needs **current long-term rental listings** (GR / configured communes) that are **believable and actionable** (open, call, write).

Success is not “many cards” or “fields populated”, but:

1. `current` only contains objects that exist as **one listing** in the source.
2. What the card shows is **consistent** with that source (place, rooms, price, contact are not a collage of unrelated signals).
3. If the agent cannot reliably parse the page, it still delivers the **listing as evidence** (verbatim excerpt and/or screenshot later), not a reconstructed pretty card from search scraps.

Acceptance from the user side: share of cards that do not need Delete for junk or false glue. Metrics such as `kept`, CI green, or “date can parse” are secondary.

### Anti-pattern already observed

The pipeline was optimized **per component**: publish date, unavailable hide, contacts, UI contracts. In aggregate this produced **field collage** (title from one signal, municipality from URL, rooms from the model, phone from page chrome). After all component fixes, a sample of “new” cards still had near-zero value: mismatched title/body, wrong prices/contacts, missing dates, seeker/sale/holiday mixed with real rentals.

**Conclusion:** component correctness ≠ feed value. Further isolated parser patches without changing the publish contract repeat the same failure mode.

### Access limits (not fixed by better analysis)

- **Facebook** (large share of candidates): without login/API often 403 or empty shell; Serper snippet-only is not the ad page.
- Some portals block bots; recheck runs show a majority of URLs unreachable.
- Where there is **no HTML**, LLM/regex cannot create trust. Honest policy: `evidence: snippet|link_only` or do not emit a full card.

Where HTML **is** available, the bottleneck is **parse + publish policy** — the area this contract targets.

### Target model: evidence-first

| Required | Secondary |
|----------|-----------|
| Stable `listing_url` | Structured fields (price, rooms, phone, date) |
| **Evidence**: verbatim page/snippet excerpt (screenshot optional later) | Only when confirmed against evidence |
| Explicit `evidence_kind`: `page_text` / `snippet` / `link_only` | Otherwise do not present fields as fact |

Rules:

1. Do not treat a free paraphrase as the only body text when an excerpt exists — prefer **verbatim evidence**.
2. Structured fields only when grounded in evidence (substring / quote verify), not “the model said so”.
3. On field conflict (rooms title vs body, municipality vs evidence) — **do not average**: drop/hide with `hide_reason` or show evidence without false confidence.
4. Strip platform/junk contacts (`support@` portals, `+4100…` placeholders) rather than showing them as owners.

### Consistency gate (before `kept` / before `current`)

Logical barrier (implemented in pipeline + recheck filters):

- Offer to rent, not seeker demand; not pure sale; not pure holiday/night tourism when the product is long-term rent;
- Single object, not a list/search page;
- Municipality consistent with whitelist and evidence text;
- Rooms/price not in hard conflict with evidence;
- Otherwise: no keep into `current`, or immediate hide with machine `hide_reason`.

**Prefer a few credible cards over dozens of partial ones.**

### Metrics that matter

| Metric | Why |
|--------|-----|
| Credible keeps / fewer user Deletes | Real value |
| Share of cards with stored `evidence_text` | Proof coverage |
| Fields verified against evidence | Honesty of structure |

Do not treat rising `kept` with rising manual Delete as success.

### Implementation landmarks (P129.30+)

- `buildEvidenceText`, `credibilityRejectReason`, `priceFromEvidence`, `isPlatformOrJunkContact` in `server/immofinderCore.ts`
- Pipeline stores `raw.evidence_text` / `raw.evidence_kind` and runs the credibility gate before keep
- Recheck filters apply the same gate on stored rows
- Card `about` prefers `raw.evidence_text` when present
- Screenshots: optional via `raw.evidence_screenshot_url` when a capture exists; excerpt is the mandatory proof channel
- Drive Doc/Sheet and email/Telegram plain text append **Source text** / **Source capture** under each listing when evidence is stored (P129.31)

### Explicit non-priorities

- Another `parseListedAt` pass without evidence-first
- Filling every field at any cost (including chrome emails)
- Facebook API for third-party groups as the default plan


