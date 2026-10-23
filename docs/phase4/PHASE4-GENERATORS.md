# Phase 4 — Documentation generators (p77)

## Purpose

Keep human-written AI entry docs short. Inventories of **routes**, **env vars**, and **migrations** are generated from source so they cannot silently drift.

## Commands

```bash
npm run docs:generate   # route + env + migration inventories + module-map
npm run docs:check      # inventories present/sane + markdown link check (check:docs)
npm run verify:change   # includes inventory generate + check
```

## Outputs

| File | Content |
|------|---------|
| `docs/phase1/generated/route-inventory.json` | Express `app.<method>('path')` from `server.ts` and `server/*Routes.ts` |
| `docs/phase1/generated/env-inventory.json` | `process.env.NAME` in app sources (excludes `tests/`, `scripts/`) |
| `docs/phase1/generated/migration-inventory.json` | `migrations/*.sql` list |
| `docs/phase1/generated/module-map.json` | Existing architecture map (Phase 1) |

## Rules

- Generators are **read-only** with respect to product code; they only write under `docs/phase1/generated/`.
- Do not treat inventories as product requirements — they are facts extracted from the tree.
- After adding routes, env vars, or migrations, run `npm run docs:generate` and commit the JSON if the project tracks generated files.
- Phase 0 human audit under `docs/phase0/` is **not** deleted or replaced.

## Scripts

- `scripts/docs/generate-inventories.mjs`
- `scripts/docs/check-inventories.mjs`
