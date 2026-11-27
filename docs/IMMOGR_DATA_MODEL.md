> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Data Model

## Principles
- PostgreSQL is the transactional source of truth when configured.
- Every property-search table is prefixed immogr_; no table or query may reference immofinder_*.
- Preserve source observations and evidence append-only where practical; update derived summaries without deleting provenance.
- Store only necessary public contact data, protect it with application authorization, and define retention before production collection.
- Never commit raw personal data, contact values, owner names, exact private addresses, or unredacted page text.

## Proposed tables
| Table | Purpose |
|---|---|
| immogr_communes | Historical administrative reference only; not the ImmoGR search geography. |
| immogr_localities | Exact owner-selected Graubünden localities keyed by stable locality ID and assigned to group 1 or 2. |
| immogr_sources | Source registry, source context, automated-acquisition state, manual-research state, activation state, rate policy, source adapter version. |
| immogr_source_pages | Fetched page observations: requested/final URL, HTTP status, content type, fetch time, content fingerprint, access decision, parser version. |
| immogr_listings | Canonical property record, result category, locality ID, property type, normalized price/period, owner class, quality state. |
| immogr_owners | Evidence-backed owner or advertiser identity and entity class; unknown remains valid. |
| immogr_contacts | Direct contact route and entity attribution, source URL, verification status, retention metadata. |
| immogr_evidence | Field-level quote/JSON-LD path, page block, method, timestamp, confidence, and conflict group. |
| immogr_runs | Search-run configuration snapshot, stages, budgets, counters, provider usage, errors, and completion state. |
| immogr_events | Append-only run/listing state transitions and operator actions. |
| immogr_reviews | Human review decisions, correction labels, reviewer notes, and timestamps. |

The active search scope is exactly 44 owner-selected localities in `config/immogr/localities.csv`: 22 important (group 1) and 22 secondary (group 2). The UI supports group 1, group 2, or both. All unlisted localities are out of scope. Municipalities are not a proxy for localities: one municipality may contain several advertised localities. Listings therefore use `locality_id`; the historical `commune_id` field remains only for schema compatibility and must not broaden search scope.

## Keys and deduplication
Use a stable canonical listing key built from canonical detail URL and verified property identity. Additional match signals may include normalized address, coordinates, property name, image fingerprints, owner identity, and source cross-links. Never merge solely on a common owner name, postcode, or similar title. Keep duplicate candidates linked to the canonical record with provenance.

## Migration policy
Migrations are new and additive. Do not migrate or read legacy ImmoFinder rows. Before production, specify deletion/retention, backup, access control, encryption, and contact-data minimization in the schema and operations docs.

## Manual research observations (Owner-approved 2026-11-27)

Add a dedicated `immogr_manual_reviews` table (additive migration) rather than treating user-entered observations as fetched source pages.

Suggested fields:
- `id`, `source_id`, `canonical_url`, optional `locality_id`;
- `capture_method` fixed to `manual_user_review`;
- `reviewer_id`, `reviewed_at`, `manual_access_outcome`;
- structured observed fields for page type, property type, price amount/currency/period, rental mode, owner/advertiser class and signal, contact-route type, freshness and relevance;
- concise reviewer notes and links to `immogr_evidence` records;
- `created_at`, `updated_at`, and review-state history.

The Owner may retain local full-page or screenshot copies outside the server and process them manually or with local automation. The browser import reads user-selected files locally; only the Owner's explicitly submitted structured facts and notes are persisted. Never store passwords, session cookies or credentials. Keep source URL and provenance; preserve unknowns as unknown. A manual observation is a research artifact, not an automatically admitted listing and not a substitute for a fetched-page evidence record.


### Owner-approved local personal notebook clarification (2026-11-27)

The Owner may keep local page or screenshot copies and process them with local tools or automation. The ImmoGR browser import currently reads selected HTML/HTM/TXT/MD/PDF/DOCX/XLSX/PPTX/CSV/TSV/JSON files locally (maximum 5 MB), extracts text into an editable notes field, and does not upload the source file itself. Only the Owner-approved structured fields and edited notes are persisted. This is private notebook data, not a public listing feed. Remote crawling and server-side proxying remain separate and are not enabled by this workflow.
