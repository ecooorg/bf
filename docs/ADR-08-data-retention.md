# ADR-08 — Retention and deletion of data

- **Status:** Accepted for the MVP (P14).
- **Context:** TZ 6 (deletion of a project) and 10: the user must be able to delete a project; logs must not hold content.
- **Decision:**
  - Deleting a project removes its State, tasks, artifacts and manifests (cascade). The audit keeps only the fact of deletion, without content.
  - Artifact versions are never overwritten or deleted one by one; the number of versions is limited (200). Pruning old versions is a human decision and is not implemented.
  - Logs, ledger and errors never contain artifact content, only identifiers, sizes and hashes.
  - `usage_ledger` and `route_decisions` rows carry no project content; their retention (time-based clean-up) is decided in BX-25 together with backup.
  - Provider data policy stays as in A-02 and A-08: no real user data to a provider with unconfirmed terms.
- **Consequences:** deletion is simple and testable (`tests/p14-live-acceptance.test.mjs`); time-based clean-up is postponed.
- **Revisit when:** backup and restore are designed (BX-25) or storage grows.
