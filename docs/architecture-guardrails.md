# Architecture guardrails

Commands (flat scripts under `scripts/`):

| Command | Effect |
|---------|--------|
| `npm run architecture:map` | Regenerate `docs/generated-module-map.json` |
| `npm run architecture:check` | Cycles + layer boundaries vs ratchet |
| `npm run architecture:impact` | Change impact for listed files |
| `npm run verify:change` | Map + inventories + boundaries + typecheck |
| `npm run docs:generate` | Route / env / migration inventories + module map + check graph |
| `npm run status:graph` | Regenerate `docs/generated-check-graph.json` (check → test file → source modules) |
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


## Typing and semantic naming

Conventions for AI-assisted changes. Behaviour-preserving; apply gradually.

**Phase 3 track closed in p76.** Full `strict: true` remains optional follow-up.

### TypeScript policy

| Rule | Requirement |
|------|-------------|
| Trust boundaries | External JSON / DB / env enter as `unknown`, then Zod (or equivalent) parse |
| Prefer | `unknown` over `any`; `DbRow` (`Record<string, unknown>`) over `any` for SQL rows |
| Branded ids | Use `server/domainIds.ts` (`ProjectId`, `TaskId`, `CodeTaskId`, `RunId`) at new API edges |
| Single schema source | Prefer `server/contracts.ts` + domain Zod schemas; do not duplicate field lists as hand-written interfaces |
| Exhaustiveness | Discriminated unions for task/code-task/gate statuses; handle all variants or `never` default |
| Server tsconfig | Progressive flags in `tsconfig.server.json`; full `"strict": true` is a follow-up once residual errors are cleared |
| Client | Keep bundler config; enable stricter client checks in a later patch after server stabilizes |

### Verb dictionary (function names)

| Verb | Meaning | Side effects |
|------|---------|--------------|
| `get` | Return already-available in-memory / cached value | None |
| `load` | Fetch from DB, disk, or network | I/O |
| `create` | Create a new entity | Persist / allocate |
| `validate` | Check and return validation result | None (pure) |
| `parse` | Convert external representation → structured data | None (pure) |
| `normalize` | Canonical form of data | None (pure) |
| `calculate` | Pure computation | None |
| `build` | Assemble object from inputs | None (pure) |
| `save` | Persist | I/O |
| `execute` | Perform action with side effects | Yes |
| `transition` | Move entity to another allowed state | Persist |
| `delete` | Remove entity | Persist |
| `resolve` | Choose result by explicit rules | Prefer pure |

Do not mix pure verbs with hidden I/O (e.g. `validateAndSave`).

### File naming targets (not bulk-renamed)

| Current | Preferred when touching the module |
|---------|--------------------------------------|
| `server/router.ts` | model request routing (keep export names stable) |
| `server/adapter.ts` | model provider adapter façade |
| `server/files.ts` | upload / attachment service |
| `src/storage.ts` | browser persistence |
| `src/decision.ts` | decision domain model |

Rename only with full reference update + tests; never rename “for style” alone.

### Comments

- Remove comments that restate the next line of code.
- Keep: security constraints, external contracts, non-obvious protocol requirements, license notices.
- Prefer expressing intent via names and types.

(Content formerly in `docs/typing-and-naming.md`; that file is removed.)
