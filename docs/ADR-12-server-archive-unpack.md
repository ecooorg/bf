# ADR-12: Server-side archive unpacking in Project Mode

**Status:** Accepted  
**Date:** 2026-10-13  
**Owner decision:** 13 October 2026

## Context

`docs/SPEC_ENGINE.md` §10.4 and `docs/SPEC_PRODUCT.md` § “Out of scope” prohibited unpacking archives on the server in MVP, relying on refusal to mitigate path traversal and archive bombs. P26 introduces a shared Workspace engine that must unpack zip/tar in Project Mode (server `worker_thread`) while Simple/Expert Mode unpack in the browser (Web Worker). The same ingest code and limits apply in both hosts.

## Decision

Replace the blanket MVP ban with controlled unpacking **only in Project Mode**, subject to:

- Path normalisation and rejection of traversal (absolute paths, `..` segments, Windows drives, UNC, control/RTL characters).
- Actual-byte counters (not header sizes alone) for total unpacked size, entry count, and compression ratio.
- Isolation in `worker_thread` with time and memory limits; global semaphore of 1–2 concurrent server ingests.
- No execution of extracted bytes; content treated as untrusted data for the model.

What remains forbidden: executing extracted files, forwarding secrets to executors, writing to `main`.

## Consequences

- Documents updated: `SPEC_ENGINE.md` §10.4, `SPEC_PRODUCT.md` (out-of-scope list), `SECURITY_POLICY.md`, `THREAT_MODEL.md`, `REPO_MAP.md`, `CURRENT_STATE.md`.
- Implementation lives in `src/workspace/ingest.ts` (shared) and `server/workspace/ingestWorker.ts` (Project Mode host).
- Simple/Expert Mode never unpack on the server; they use the browser Worker only.
- Acceptance: AC-01, AC-02, AC-12 (P26).

## Related

- P26 TZ (updated), FW-04 … FW-11, NF-01
- ADR-10 (code executor remains separate; Workspace ChangeSet does not enable `CODE_EXECUTOR`)
