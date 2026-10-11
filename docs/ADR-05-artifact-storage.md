# ADR-05 — Storage of artifact content

- **Status:** Accepted for the MVP (P14); revisit at the S3 trigger below.
- **Context:** TZ 10.2: metadata in PostgreSQL, content through a Storage Adapter; up to 5 MB in `bytea` or on a Railway volume.
- **Options:** (1) `bytea` in PostgreSQL; (2) Railway volume; (3) S3-compatible storage.
- **Decision:** option 1. One transaction writes content, row and manifest, so there is no half-written artifact and a restore of the database restores the content too. A volume would need its own backup and is lost with a service replacement. `storage_ref` (`pg:<row id>`) is already an adapter reference; an S3 adapter adds another prefix without changing the data model.
- **Integrity:** SHA-256 and size in the row and in the manifest; the manifest has its own checksum. A reader accepts a version only if all agree.
- **Consequences:** database size grows with artifacts (5 MB per object, 200 versions, 1000 artifacts per project: the hard ceiling is large, so the quota per project is checked in P24/BX-25).
- **Revisit when:** objects above 5 MB are needed, or the database backup becomes too large (BX-25).
