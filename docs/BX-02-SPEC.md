# BX-02 — Operational fixes and manual-cycle pilot

## Scope
- Add unauthenticated liveness endpoint `/health` for Railway.
- Add `/ready` separate from liveness; report not-ready until PostgreSQL and migrations are implemented in BX-04.
- Keep unknown `/api/*` routes as JSON 404 responses.
- Keep production startup serving the compiled `dist` directory.
- Align Node version and deployment config with the repository source of truth.

## Acceptance
- `/health` returns HTTP 200 JSON without authentication.
- `/ready` returns HTTP 503 JSON until database readiness checks exist.
- Unknown `/api/*` route returns JSON 404.
- Node runtime is pinned to Node 22; Railway/Nixpacks use repository build/start commands.

## Status
PARTIAL: code and config updated; live Railway dashboard and manual Task Package pilot require owner action.
