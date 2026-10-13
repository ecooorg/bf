# ADR-09 — Backup, RPO and RTO

- **Status:** Accepted for P24 (BX-25); daily backup with 7-day retention is a target, not a verified live configuration.
- **Context:** TZ §15.4–15.6, risk R-12 (memory), assumption A-06 (Railway PostgreSQL backups). G4 requires evidence of backup and restore.
- **Decision / target:**
  1. **Primary backup:** Railway managed PostgreSQL backups, target frequency daily and target retention 7 days. The actual plan, availability, frequency and retention must be checked in the Railway service panel by the owner; no live fact is claimed by this ADR.
  2. **RPO target ≤ 24 hours:** follows from daily backup only after daily backup is confirmed active.
  3. **Restore drill:** at least once per release train and after BX-25, restore a backup to a **disposable** database, run `npm run db:migrate` if needed, confirm `schema_migrations` count and `/ready`. `npm run ops:backup-check -- --live` checks migration inventory only; it does not perform a restore.
  4. **RTO target ≤ 4 hours:** time from “decide to restore” to `/ready` plus signed-in Simple Mode smoke. Must be measured; not currently automated end-to-end.
  5. **Code rollback** is separate from data restore: redeploy the previous successful image/commit (`docs/OPS_ROLLBACK.md`). Expand→contract migrations keep code N compatible with schema N−1.
  6. **Capacity:** start with 1 replica, about 1 GB RAM. If process RSS stays ≥ 70% of `OPS_RSS_LIMIT_MB` (shown on `/ops`), plan to split the worker into a separate service (not implemented in P24).
- **Consequences:** `/ops` and `/api/ops` expose queue/run/provider/memory signals without secrets. Owner must configure Railway backups and run a restore drill on staging/disposable infrastructure before these targets may be called facts.
- **Revisit when:** actual Railway plan is confirmed, multi-region/PITR is required, or worker split is justified by measured capacity.
