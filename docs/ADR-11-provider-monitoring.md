# ADR-11 — Provider monitoring (sources, thresholds, channels, run location)

- **Status:** Accepted for P15a (BX-27.a, Appendix G S1–S2).
- **Context:** Free and limited provider tiers change without notice (risk R-21). The product already has `model_health`, `usage_ledger`, and `verify:connections`. Monitoring must notice drift and quota pressure early without spending tokens or mutating the Router.
- **Decision:**
  1. **Sources.** Own connections only in P15a: `verify:connections` semantics, registry `lastVerifiedAt`, `usage_ledger` / `model_health` aggregates. No market scraping (that is P15b).
  2. **Thresholds.** Stale verification >90 days → warn. Daily quota ≥80% → warn; ≥100% → critical. Rule N-1: fewer than two active providers with headroom >20% → warn. Missing registry model in live list → critical `DRIFT`.
  3. **Channels.** Primary: structured JSON report + optional rows in `provider_snapshots` / `monitor_alerts`. GitHub Actions weekly schedule + `workflow_dispatch`. Opening Issues is allowed later with `issues: write`; not required for PASS of P15a.
  4. **Run location.** Default: GitHub Actions (no product process dependency). After P12, a Railway worker job is permitted; isolation rule remains: monitor failure → `NOT_RUN`, never a product error.
  5. **Secrets.** Only variable *names* and `present: true|false`. Redaction helpers (`server/redact.ts`) applied to all monitor output. Values live in Railway Variables / GitHub Secrets.
  6. **Activation.** Monitoring never sets a model to `active`. New or recovered models stay `disabled` until a human runs the admission path (E.2 / R5).
- **Consequences:** Migration `014_provider_snapshots`; CLI `npm run monitor:connections`; workflow `monitor-connections.yml`; pure evaluators in `server/providerMonitor.ts` are unit-tested without network.
- **Revisit when:** P15b (market watch), or when moving the schedule onto the Railway worker, or when wiring Issue creation.
