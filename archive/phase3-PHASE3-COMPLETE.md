# Phase 3 complete (p76)

**Status: closed for the AI-native transformation track.**  
Baseline after green CI (p71–p75.7 fixes). Further `strict: true` enablement is optional hardening, not a blocker for Phase 4–5.

## Delivered

| Item | Location / note |
|------|-----------------|
| Typing & naming conventions | `docs/phase3/TYPING-AND-NAMING.md` |
| Branded domain ids | `server/domainIds.ts` (`ProjectId`, `TaskId`, `CodeTaskId`, `RunId`) |
| Shared `idSchema` | `server/contracts.ts` → used by `taskService`, `codeTaskService` |
| Path-param validation | `taskOfProject` in `server/projectRoutes.ts` uses `parseProjectId` / `parseTaskId` |
| Progressive server compiler flags | `tsconfig.server.json`: `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames` |
| Import-cycle break (Phase 2b) | dynamic import in `gateService` → no static cycle with `codeTaskService` |
| Verb dictionary | documented; apply on touch, no mass rename |

## Explicitly deferred (not required to open Phase 4)

1. **Full `"strict": true`** on `tsconfig.server.json` — large residual error surface; enable module-by-module after Phase 5 acceptance if desired.
2. **Mass `any` → `unknown` on SQL rows** — attempted as `DbRow` in p75; caused ~100 typecheck failures; reintroduce only with mapper helpers that keep CI green.
3. **Bulk semantic renames** of files (`router.ts`, `files.ts`, …) — only when a module is already being changed for product reasons.
4. **Client `strict`** — separate from server; schedule after server stabilizes.

## Gate (Phase 3)

- [x] Behaviour and route contracts preserved (green `npm run check` + live/API after p75.x)
- [x] No intentional API/DB schema drift
- [x] Machine-readable conventions for AI assistants
- [x] Branded ids available at trust boundaries

## How to continue typing work later (optional)

1. Enable one flag at a time: `strictNullChecks` → `noImplicitAny` → full `strict`.
2. Fix `tsc -p tsconfig.server.json` until clean before the next flag.
3. Prefer Zod parse at HTTP/DB edges over `as` casts.
4. Never reintroduce static import cycles (`architecture:check` must stay green).
