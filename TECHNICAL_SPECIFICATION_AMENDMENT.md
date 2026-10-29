# Amendment to TECHNICAL_SPECIFICATION.md — §7 / delivery (P118.5.0)

Insert or replace the code-generation packaging success rule with:

### Program archive delivery (canonical)

Architect (A3) program delivery uses **exactly one** success path:

1. Staged App Builder engine (`APP_BUILDER_ENGINE=staged` path / P118.5.1 default for A3).
2. Job reaches `outcome=SUCCESS` only if non-empty ZIP was packed and stored as an artifact.
3. Client receives `downloadUrl` pointing at `GET /api/projects/:projectId/artifacts/:artifactId/download`.
4. User download uses `downloadViaFetch`; empty body is failure.

**Non-success substitutes (forbidden as A3 SUCCESS):**

- Legacy scaffold pipeline ZIP without staged SUCCESS.
- PACKAGE.md hand-off.
- Diagnostics ZIP.
- Client-side decision/workspace export.

Full normative plan: `docs/ARCHIVE-DELIVERY-CANON.md`.

REQ-GEN-002 (add): SUCCESS implies downloadable artifact bytes verifiable by E2E acceptance (P118.5.4).

