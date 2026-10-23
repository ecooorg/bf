# Architecture guardrails

Commands (flat scripts under `scripts/`):

| Command | Effect |
|---------|--------|
| `npm run architecture:map` | Regenerate `docs/generated-module-map.json` |
| `npm run architecture:check` | Cycles + layer boundaries vs ratchet |
| `npm run architecture:impact` | Change impact for listed files |
| `npm run verify:change` | Map + inventories + boundaries + docs links |
| `npm run docs:generate` | Route / env / migration inventories + module map |
| `npm run docs:check` | Inventories present + markdown link check |

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

## Historical

Transformation-era phase reports live in `archive/` (flat filenames). Not required for day-to-day AI work.
