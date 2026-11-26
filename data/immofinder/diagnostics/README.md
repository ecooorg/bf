# ImmoFinder post-run diagnostics

After every finished search the worker writes:

- `latest.json` — last completed run (redacted pack for assistants)
- `runs/<runId>.json` — same pack per run

Also stored in Postgres (`GET /api/immofinder/diagnostics/latest`) and, when GitHub write is configured, committed here with `[skip render]`.

See `server/immofinderPostRunBundle.ts` and `docs/OPERATIONS_AND_RELEASES.md` § post-run diagnostic bundle.

Production live acceptance is opt-in via commit message tag `[immofinder-live]` (Core CI job `immofinder-live-acceptance` against `https://bf-3tqo.onrender.com`).
