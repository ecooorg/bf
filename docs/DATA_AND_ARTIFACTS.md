## Property-search data boundary (2026-11-27)
Legacy immofinder_* tables, migrations, encrypted snapshots, and data/immofinder/ diagnostics are preserved read-only; ImmoGR MUST NOT read or write them. New records and evidence belong only to the immogr_* schema and data/immogr/ namespace.

> **Property-search status — owner decision 2026-11-27:** ImmoFinder is permanently retired and must not be run, developed, or used. Any ImmoFinder material below is historical archive only: it is not a current requirement, roadmap, technical instruction, or source of decisions. ImmoGR is the sole active property-search project; its current authority is the docs/IMMOGR_*.md document set.

# Data, Schemas, and Artifacts

## Data and schemas

- Treat the JSON schema files in `docs/schema-*.json` as machine-consumed contracts. Validate schema changes with the repository's schema validators and impact-plan workflow.
- Preserve schema versioning, compatibility, migration planning, evidence provenance, and explicit approval decisions. A schema change is not complete merely because the JSON parses.
- Generated inventories/graphs are outputs of scripts. Regenerate them through `npm run docs:generate` and validate through `npm run docs:check`; do not hand-edit generated outputs unless the generator itself is being changed.
- `package.json` fields `version` and `patch` are the only version identity source.

## Project artifacts and ZIPs

Project Mode's artifact workspace is backed by `artifacts` and `artifact_manifests`; the manifest is the inventory authority for immutable artifact versions. `GET /api/projects/:projectId/artifact-versions` lists every registered version in the selected project. Artifact inspection returns manifest integrity status and, for ZIPs, the entry listing. Downloads may specify `?version=N`; omitting the version selects the latest. Every read must verify project ownership and artifact integrity before returning content. Never infer an artifact from a temporary URL or UI state.


The Architect's principal user value is a useful, downloadable software artifact. Delivery evidence should record the operation/build identity, final status, files included, validator outcomes, ZIP integrity (including CRC/entry checks where implemented), and whether the archive can be downloaded and used. Do not report a successful artifact if generation failed or the archive is missing/corrupt.

## Delivery states

- `SUCCESS`: required stages and validators passed; the complete artifact is available and verified under the delivery contract.
- `PARTIAL`: a useful partial result exists but one or more required stages/validators did not pass. Explain the limitations and apply the explicit PARTIAL download policy.
- `FAILED`: no result satisfying the minimum delivery contract was produced; explain the failure and recovery path.

These definitions are the product-facing meaning. A test/workflow may have its own execution status, but that must not be confused with artifact status.

## Client workspace and Google Drive

- **Workspace (browser, keep):** user project/files held locally (IndexedDB) for agent context and ChangeSet workflows. Artifacts here are client-side; they are not a substitute for Architect server-built ZIP delivery.
- **Google Drive (keep):** backup and cloud save of user files. Operational and product feature; secrets and OAuth remain outside repo artifacts.
- Server Architect delivery ZIPs and validators remain under “Project artifacts and ZIPs” above; do not conflate them with workspace export or Drive backup.


## Machine-readable assets retained

`schema-common.json`, `schema-intent-policy-contract.json`, `schema-change-impact-plan.json`, `schema-verification-plan.json`, `schema-evidence-record.json`, `schema-artifact-manifest.json`, `schema-handoff-report.json`, `schema-approval-decision.json`, `verification-manifest.json`, architecture rules/violations, and generated route/env/migration/module/check/capability inventories remain machine assets, not prose source-of-truth documents.

## Repository config files

Checked-in, non-secret configuration under `config/`:

- `model-sources.json` — model catalog (sole format; no parallel yaml).
- `source-policy.json` / `national-authorities.json` — search/source policy data.
- `config/connectors.yaml` — inventory of external connections for `verify:connections` (JSON body with `#` line comments; **no secrets**).

Do not put API keys or tokens in these files.

## ImmoFinder data (planned, P128; no migration in 128.1a)

`immofinder_listings`: id uuid, canonical_key unique, source_urls jsonb, source_ids jsonb, municipality, property_name, rooms_text, rooms_estimated, description_de, description_ru, owner_name, direct_phone, direct_email, personal_website, contact_evidence jsonb (value, quote, url), osint_notes, contact_status (`found`|`not_found`|`platform_only`), contact_advice, draft_message_de, photo_urls jsonb, listing_url, status (`NEW`|`CONTACTED`|`REPLIED`|`REJECTED`), first_seen_at, last_seen_at, updated_at, raw jsonb. `immofinder_runs`: id, started_at, finished_at, trigger, sources jsonb, counts jsonb, errors jsonb, est_cost, dry_run. Later `immofinder_events` for status/contact history. Drive export: folder `ImmoFinder GR` with `listings.csv`, `listings.json`, `drafts/` text files per listing; personal data is not published.

Implemented in `migrations/020_immofinder.sql` (128.1): adds `title_ru`, `rooms_basis`, `contact_advice`, `private_signals` to the planned listing columns; `immofinder_runs` also keeps `delivery` (Drive/Telegram status). Drive files: `listings.csv`, `listings.json`, `drafts.txt` in folder `ImmoFinder GR`.

`migrations/021_immofinder_seen.sql` (128.2): `immofinder_seen(url pk, source_id, decision, reason, checked_at)` caches rejected pages for `limits.recheckAfterDays`. Drive export in 128.2: Google Sheet "ImmoFinder listings" and Doc "ImmoFinder drafts" replace the CSV/JSON/TXT files of 128.1.

`migrations/022_immofinder_progress.sql` (128.4): `immofinder_runs.progress` jsonb. `migrations/023_immofinder_settings.sql` (128.5): `immofinder_settings(id 'main', data jsonb, updated_at)` holding schedule, delivery and search-scope settings; the email address is stored there, secrets never.

`migrations/024_immofinder_types.sql` (128.8): `immofinder_listings.listing_type`, `hidden`, `hide_reason`. Hidden rows are excluded from the app list, email, Telegram, Sheet and Doc.


## ImmoFinder GitHub snapshot

After each completed manual or scheduled search, the complete `immofinder_listings` table (including hidden rows, phones, e-mails, owner names, source URLs, contact evidence and raw page evidence) is encrypted with AES-256-GCM and committed to `data/immofinder/listings.snapshot.enc` via the GitHub Contents API. The repository is public, so plaintext database data MUST NOT be committed. The key is derived from the stable runtime `SESSION_SECRET`; the runtime fine-grained token (`IMMOFINDER_GITHUB_TOKEN`) and repository (`IMMOFINDER_GITHUB_REPOSITORY`) are deployment configuration, not repository data. A missing token/repository skips the backup but does not fail the search.
