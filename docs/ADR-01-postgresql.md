# ADR-01 — PostgreSQL access and sortable identifiers

- **Status:** Proposed for owner review; implementation started in BX-04.
- **Context:** Project Mode needs durable project/state history, append-only versions and events, audit records, and database-backed rate-limit buckets. Simple Mode must remain unchanged.
- **Decision:** Use PostgreSQL via the `pg` Pool API; no ORM. Validate input at repository boundaries with Zod. Use versioned, forward-only SQL migrations in `migrations/`. IDs use a time-prefixed random string (`timestamp-base36_random-hex`) so they sort approximately by creation time without relying on server/database UUIDv7 support. A future ADR may switch to UUIDv7/ULID if cross-service interoperability requires it.
- **Consistency:** State updates lock the current row (`FOR UPDATE`), require `expectedVersion`, and write current state, immutable version, project event and audit event in one transaction. A mismatch raises `StateVersionConflict` (`CONFLICT`) rather than overwriting.
- **Security:** SQL uses parameters; no secrets are logged. Connection strings come only from `DATABASE_URL`. `/ready` checks an actual `SELECT 1`; `/health` remains liveness-only.
- **Migration policy:** Never edit a migration after it has been applied. Corrections are a new numbered migration. `npm run db:migrate` refuses to run without `DATABASE_URL`.
- **Consequences:** PostgreSQL must be configured before Project Mode is considered ready. Connection pool and TLS behavior should be verified against the actual Railway database before production acceptance.
- **Open verification:** Registry access was unavailable in the implementation environment, so the `pg` dependency lock resolution and a clean `npm ci` must be completed in CI before merge/deploy. No live database was available here.
