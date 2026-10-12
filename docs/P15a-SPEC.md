# P15a — Provider connection and quota monitoring (BX-27.a, Appendix G S1–S2)

**Goal.** Add scheduled, read-only monitoring of connected providers and quota headroom so drift and exhaustion are visible before product work fails. Monitoring never changes the Router, registry, or budgets; it only records snapshots and emits human-readable alerts.

**Base.** Owner archive `bf-vPI-03final.zip` (product version `PI-03final`). PI-01 / PI-02 / PI-03final are complete on the instruction track.

**May change.** Monitoring module, migration `014_provider_snapshots`, CLI `scripts/monitor-connections.mjs`, GitHub Actions workflow, ADR-11, tests `test:p15a`, docs (CURRENT_STATE, NEXT, CHANGELOG, CONNECTIONS note), product version → `15a`, secret-redaction helper (shared foundation for BX-24).

**Must not change.** Simple Mode behaviour and JSON schema; Router selection logic; registry activation path (models stay `disabled` until a human activates them); `tests/acceptance/**`; existing PASS tests.

## Behaviour

### S1 — Own connections
- Weekly (and on `workflow_dispatch`) run of a monitor that reuses `verify:connections` semantics.
- Persist a `provider_snapshots` row per provider: model list (ids only), rate-limit header summary, status.
- Registry model missing from the live list → `DRIFT` + one alert key (no duplicate on repeat run while open).
- `lastVerifiedAt` older than 90 days → warning in the same report.
- Missing key → `NOT_RUN`, process does not crash.

### S2 — Health and quota headroom
- From `usage_ledger` / `model_health`: share of daily limit used, 429/error counts over 7 days.
- Warning at ≥80% of daily quota; critical at ≥100%.
- Rule N-1: fewer than two independent active providers with headroom >20% → warning «one provider left».

### Isolation
- Monitor failure or absence of keys does not alter Router behaviour (unit test).
- No LLM in the monitoring path; no secret values in output, logs, or issue bodies.

## PASS criteria

- Machine: `npm run test:p15a`, `test:pi01`, `test:pi02`, `test:pi03`, `check-version`, `check:docs`, relevant security/redact tests.
- Owner: workflow file present; dry-run monitor exits 0 without keys (`NOT_RUN`); with keys, snapshot rows appear after migrate.

## Files

| Path | Action |
| --- | --- |
| `migrations/014_provider_snapshots.sql` | new |
| `server/providerMonitor.ts` | new |
| `server/redact.ts` | new (foundation) |
| `scripts/monitor-connections.mjs` | new |
| `.github/workflows/monitor-connections.yml` | new |
| `docs/ADR-11-provider-monitoring.md` | new |
| `docs/P15a-SPEC.md` | this file |
| `tests/p15a-acceptance.test.mjs` | new |
| `tests/redact.test.mjs` | new |
| `package.json`, `src/config.ts`, README, DEPLOY, CHANGELOGs, CURRENT_STATE, NEXT | version + queue |

## Not done / postponed

- P15b (S3–S4 market watch, candidates pipeline).
- Opening GitHub Issues from the workflow (needs `issues: write`; document only; optional follow-up).
- Moving the schedule from Actions to the Railway worker (allowed after P12 per G.2; not required here).

**Read in the TZ.** Appendix G (G.0–G.8), §7.1 lastVerifiedAt, §14.4, BX-27.a, ADR-08.
