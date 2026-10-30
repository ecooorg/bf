# Data, Schemas, and Artifacts

## Data and schemas

- Treat the JSON schema files in `docs/schema-*.json` as machine-consumed contracts. Validate schema changes with the repository's schema validators and impact-plan workflow.
- Preserve schema versioning, compatibility, migration planning, evidence provenance, and explicit approval decisions. A schema change is not complete merely because the JSON parses.
- Generated inventories/graphs are outputs of scripts. Regenerate them through `npm run docs:generate` and validate through `npm run docs:check`; do not hand-edit generated outputs unless the generator itself is being changed.
- `package.json` fields `version` and `patch` are the only version identity source.

## Project artifacts and ZIPs

The Architect's principal user value is a useful, downloadable software artifact. Delivery evidence should record the operation/build identity, final status, files included, validator outcomes, ZIP integrity (including CRC/entry checks where implemented), and whether the archive can be downloaded and used. Do not report a successful artifact if generation failed or the archive is missing/corrupt.

## Delivery states

- `SUCCESS`: required stages and validators passed; the complete artifact is available and verified under the delivery contract.
- `PARTIAL`: a useful partial result exists but one or more required stages/validators did not pass. Explain the limitations and apply the explicit PARTIAL download policy.
- `FAILED`: no result satisfying the minimum delivery contract was produced; explain the failure and recovery path.

These definitions are the product-facing meaning. A test/workflow may have its own execution status, but that must not be confused with artifact status.

## Machine-readable assets retained

`schema-common.json`, `schema-intent-policy-contract.json`, `schema-change-impact-plan.json`, `schema-verification-plan.json`, `schema-evidence-record.json`, `schema-artifact-manifest.json`, `schema-handoff-report.json`, `schema-approval-decision.json`, `verification-manifest.json`, architecture rules/violations, and generated route/env/migration/module/check/capability inventories remain machine assets, not prose source-of-truth documents.
