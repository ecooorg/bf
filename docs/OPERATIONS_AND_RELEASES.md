# Operations and releases

## ImmoFinder post-run diagnostic bundle (P131.9c)

After **every** finished search (manual or scheduled) the durable worker builds a redacted pack via `server/immofinderPostRunBundle.ts` and:

1. **Postgres** — `immofinder_run_diagnostics` (API: `GET /api/immofinder/diagnostics/latest`)
2. **Local disk** — `data/immofinder/diagnostics/latest.json` and `data/immofinder/diagnostics/runs/<runId>.json` (ephemeral on Render free tier)
3. **GitHub** — same paths on the configured `IMMOFINDER_GITHUB_REPOSITORY` branch when token/app is set (commit message includes `[skip render]`)

The pack includes: counts/filters/sourceStats/preview, assistantHints, settings+config summary (no secrets), DB snapshot, runtime (commit, KeepAlive flags), application-log slice for the runId, console tail, and quality/completeness when listings exist.

Assistants should always start from `data/immofinder/diagnostics/latest.json` after a user reports a bad/zero search.

## G6 connector push rules

Large files pushed via the GitHub connector can be truncated. Always verify SHA and byte size after write. Prefer modular extraction for files over ~20KB. Never commit placeholder content (`SEE_ARTIFACT`, `PLACEHOLDER`).

## KeepAlive (Render free tier)

Set `KEEP_ALIVE=true` (or unset) and `RENDER_EXTERNAL_URL`. If `KEEP_ALIVE=false`, the instance sleeps after ~15 minutes idle and the first request pays a cold-start tax.

## Durable worker poll

The ImmoFinder worker claims queued runs on an interval. Slow starts are usually claim delay + Serper, not UI freezes.
