# Operations and Releases

## Environment and deployment

The repository's historical operational notes identify `https://biforge.onrender.com/` as the public Render service and describe it as the owner's live shared test environment. Reconfirm deployment facts before operational work; do not assume a separate staging service exists. The owner manually applies patch ZIPs to the repository unless a later authorized workflow establishes another process. Do not assume direct GitHub or Render access.

Keep authentication enabled. Use GitHub Actions secrets or the host's secret manager for credentials; never copy secret values into files or logs. A public service remains public even when used by one person.

## Release evidence

A release record must bind the exact commit/build to: version/patch, hosted CI conclusion, deployed `/health` identity where available, live workflow result, artifact/download checks, and unresolved items. Separate source presence, local tests, hosted CI, deployed behavior, and user outcomes. `NOT_RUN` is not PASS.

## Artifact delivery policy

- Do not offer a download as complete SUCCESS until required generation stages and validators have passed and the archive has been created and verified.
- For PARTIAL or FAILED outcomes, state what is incomplete and why. Do not imply the result is complete. Download availability for PARTIAL must follow an explicit, tested policy; never make it accidental or provider-dependent.
- Verify artifact ownership, operation/build identity, ZIP integrity, expected files, and relevant validators. Missing/corrupt archives must produce a truthful error, not a success-shaped response.
- Refusal controls and negative cases (unconfirmed prerequisites, missing artifact, unauthorized access) are part of release evidence.

## Operational safety

Production deployment, database mutation, destructive restore/rollback, and other live changes require explicit owner authorization. Treat the public service as shared/live, not disposable. Before rollback, distinguish application rollback from database schema/data rollback.

## Backup and restore

Operational scripts are the executable source for the checks they perform. Historical targets in earlier operations material were RPO ≤ 24 hours and RTO ≤ 4 hours; these are targets, not verified guarantees. A restore drill is NOT_RUN until performed against a disposable/approved environment and the result recorded.

## Procedures

Use the existing package scripts and `.github/workflows/` definitions as the current executable procedures. Inspect the current scripts before following historical command text. Keep evidence and logs downloadable where possible, with secrets redacted.
