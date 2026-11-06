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

