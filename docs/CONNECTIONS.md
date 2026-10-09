# BiForge connections

This guide is the human-readable companion to [`connectors.yaml`](../connectors.yaml). Secret values must exist only in the deployment environment, never in this file or Git.

## Gemini API
- Environment variables: `GEMINI_API_KEY`, optional `GEMINI_BASE_URL`.
- Used by the existing Simple Mode for model inference.
- Secret-free CI uses fake providers; it does not prove production credentials or billing.
- Real connectivity and data-policy settings must be confirmed by the owner before sending real project data.

## PostgreSQL / Railway
- `DATABASE_URL` is reserved for Project Mode persistence.
- Database repositories and migration readiness are not implemented yet; planned for BX-04.
- Until BX-04, `/ready` correctly returns `503 database_not_configured`; `/health` is the Railway liveness endpoint.

## Verification status
Connection status is environment-dependent unless an automated deterministic verification is explicitly implemented. Never mark a provider `OK` based only on the presence of an environment-variable name.

The machine-readable manifest is the source for connection identifiers and environment-variable names. Update this file and `connectors.yaml` together when a connection changes.
