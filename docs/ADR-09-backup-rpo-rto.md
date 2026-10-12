# ADR-09 — Backup, RPO and RTO

- **Status:** Accepted for P24 (BX-25).
- **Context:** TZ §15.4–15.6, risk R-12 (memory), assumption A-06 (Railway PostgreSQL backups). G4 requires evidence of backup and restore.
- **Decision:**
  1. **Primary backup:** Railway managed daily PostgreSQL backups (service panel). Frequency ≥ daily → **RPO target ≤ 24 hours**.
  2. **Restore drill:** At least once per release train (and after BX-25), restore a dump onto a **disposable** database, run `npm run db:migrate` if needed, confirm `schema_migrations` count and `/ready`. Script: `npm run ops:backup-check -- --live`.
  3. **RTO target ≤ 4 hours:** time from “decide to restore” to `/ready` + signed-in smoke of Simple Mode. Measured manually; not automated in MVP.
  4. **Code rollback** is separate from data restore: redeploy the previous successful image/commit (`docs/OPS_ROLLBACK.md`). Expand→contract migrations keep code N compatible with schema N−1.
  5. **Capacity:** start with 1 replica, ~1 GB RAM. If process RSS stays ≥ 70% of `OPS_RSS_LIMIT_MB` (shown on `/ops`), plan to split the worker into a separate service (not implemented in P24).
- **Consequences:** `/ops` and `/api/ops` expose queue/run/provider/memory signals without secrets. Owner still configures Railway backups and runs the drill.
- **Revisit when:** multi-region, PITR, or worker split is required.
