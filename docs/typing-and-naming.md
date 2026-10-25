# Typing and semantic naming

Conventions for AI-assisted changes. Behaviour-preserving; apply gradually.

**Phase 3 track closed in p76.** Full `strict: true` remains optional follow-up.

## TypeScript policy

| Rule | Requirement |
|------|-------------|
| Trust boundaries | External JSON / DB / env enter as `unknown`, then Zod (or equivalent) parse |
| Prefer | `unknown` over `any`; `DbRow` (`Record<string, unknown>`) over `any` for SQL rows |
| Branded ids | Use `server/domainIds.ts` (`ProjectId`, `TaskId`, `CodeTaskId`, `RunId`) at new API edges |
| Single schema source | Prefer `server/contracts.ts` + domain Zod schemas; do not duplicate field lists as hand-written interfaces |
| Exhaustiveness | Discriminated unions for task/code-task/gate statuses; handle all variants or `never` default |
| Server tsconfig | Progressive flags in `tsconfig.server.json`; full `"strict": true` is a follow-up once residual errors are cleared |
| Client | Keep bundler config; enable stricter client checks in a later patch after server stabilizes |

## Verb dictionary (function names)

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

## File naming targets (not bulk-renamed in p75)

| Current | Preferred when touching the module |
|---------|--------------------------------------|
| `server/router.ts` | model request routing (keep export names stable) |
| `server/adapter.ts` | model provider adapter façade |
| `server/files.ts` | upload / attachment service |
| `src/storage.ts` | browser persistence |
| `src/decision.ts` | decision domain model |

Rename only with full reference update + tests; never rename “for style” alone.

## Comments

- Remove comments that restate the next line of code.
- Keep: security constraints, external contracts, non-obvious protocol requirements, license notices.
- Prefer expressing intent via names and types.

## p75 delivered

- `server/domainIds.ts` — branded ids + `DbRow`
- `taskService` / `codeTaskService` row mappers use `DbRow` instead of `any`
- `Db` query result rows typed as `DbRow[]`
- Shared `idSchema` from `contracts.ts` in `taskService`
- Progressive compiler flags on server (not full `strict` yet)
- This conventions document


## p76 delivered

- `taskOfProject` validates path ids via `parseProjectId` / `parseTaskId`
- `codeTaskService` uses shared `idSchema` from `contracts.ts`
- Phase 3 completion record + Phase 4/5 roadmap for next session
