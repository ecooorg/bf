# BX-03 — characterization tests and server/client decomposition

## BX-03.a ★ — Server

**Goal:** lock down the observable server HTTP contract before decomposition, then move cohesive route groups out of `server.ts` without changing responses.

### Scope
- Preserve the existing virtual server tests using fake Gemini; do not call real providers.
- Preserve the health/readiness/authentication/unknown-route contracts covered by `tests/infra.test.mjs` and `tests/server.test.mjs`.
- Extract health-related route registration into `server/healthRoutes.ts`; `server.ts` supplies configuration and the authentication predicate.
- Keep all AI decision logic, request/response shapes, and model retry behavior unchanged in this substep.
- Do not weaken, skip, or rewrite existing assertions to obtain a green result.

### Acceptance
- `npm run check` passes, or failures are reported accurately with logs.
- Virtual characterization tests pass before and after extraction.
- Health contract: public `/health`; `/ready` returns `503` until BX-04 wires a database; `/api/health` exposes only status/version when unauthenticated and diagnostics when authenticated.
- Unknown `/api/*` remains JSON `404` for authenticated requests; auth middleware behavior remains unchanged.
- New server modules remain directly under the existing `server/` directory; no per-step directories.
- Import boundaries are reviewed; no new dependency from route modules back to `server.ts`.

## BX-03.b ★ — Client

Deferred until BX-03.a is accepted. First capture `npm run test:ui` and the owner's manual checklist; only then decompose `src/App.tsx`. This file does not claim BX-03.b complete.
