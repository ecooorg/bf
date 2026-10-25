# Architecture guardrails

Commands (flat scripts under `scripts/`):

| Command | Effect |
|---------|--------|
| `npm run architecture:map` | Regenerate `docs/generated-module-map.json` |
| `npm run architecture:check` | Cycles + layer boundaries vs ratchet |
| `npm run architecture:impact` | Change impact for listed files |
| `npm run context:plan -- --file <path>` | Read-only, deterministic context candidates and uncertainty report (`--json` supported) |
| `npm run context:baseline` | Print reproducible static baseline metrics; do not overwrite frozen v80 baseline |
| `npm run verify:change` | Map + inventories + boundaries + typecheck |
| `npm run docs:generate` | Route / env / migration inventories + module map |
| `npm run docs:check` | Inventories present and well-formed |

## Ratchet

- Known import cycles: `docs/architecture-known-violations.json`
- Boundary rules: `docs/architecture-boundary-rules.json`
- New cycles or boundary violations fail `architecture:check` until fixed or explicitly ratcheted.

## Generated inventories (do not hand-edit)

- `docs/generated-route-inventory.json`
- `docs/generated-env-inventory.json`
- `docs/generated-migration-inventory.json`
- `docs/generated-module-map.json`

Regenerate with `npm run docs:generate`.

## App Builder core (`appBuilder/`) — invariants

Staged engine is opt-in (`APP_BUILDER_ENGINE=staged`); the legacy one-shot Project Mode pipeline (`server/appBuilder*.ts`) stays the default and the fallback. Behaviour must not regress without approval.

- `appBuilder/` is flat (role-prefixed files: `core-*`, `profile-*`, `stack-<id>`, `validator-<id>`, `pack-zip`). It must never import from `server/` or `src/`; allowed directions are `server → appBuilder`, `test → appBuilder`, `script → appBuilder` only. Model calls, storage, events and time come in through ports (`ModelPort`, `StorePort`, `EventPort`, `ClockPort`) implemented by `server/appBuilderAdapter.ts`.
- Work is a graph of `Unit` nodes (one per file), processed in dependency order, sequentially in v1. A unit prompt carries only a compact spec, dependency contracts and its own contract, never neighbouring source.
- Capabilities come from `Profile` fields supplied by the model registry. Core code has no free/paid branches.
- Every persisted or exchanged contract carries `schemaVersion`; unknown versions are rejected.
- Unit cache key = hash(unit input, prompt version constant such as `static_site.v1`, model identity). Cache hits spend no model call; "continue" reuses completed units; a partial ZIP states what is missing. `goalImplemented` is a computed fact, never a model claim.
- Stages: preflight → spec → plan → code (`<<<FILE path>>>` … `<<<END>>>` markers; missing `<<<END>>>` = truncation) → static check → deterministic cross-check → assemble (ZIP + `build-report.json`).
- Generated code is never executed on the server. Output paths are normalised; absolute, traversal, control-character paths and more than one nested level are rejected; file-count and total size (≤ 2 MB) are limited. First stack `static_site`: `index.html`, `style.css`, `app.js`, `README.md`, up to eight files, no external dependencies or CDN; validators `html-structure`, `js-syntax`, `refs`, `size`, `secrets`.
- Model request starts are paced by `server/modelRateLimit.ts` (shared via migration 018 `model_request_slots` when present). The architecture ratchet defines the `appBuilder` layer; `tsconfig.server.json` includes it.
