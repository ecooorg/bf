# Repository map

> Compiled from the actual archive contents (10 October 2026). Start with `docs/START_HERE.md`. The structure is flat: root and first-level directories only (exception: `.github/workflows/`).

## Root

| Path | What it is / when to touch |
| --- | --- |
| `server.ts` | Server monolith (Express): routes, auth, model calls, Simple Mode API, Project Mode API. Touch for server behaviour; new logic goes to `server/*.ts` where possible |
| `server/` | Server modules (see below) |
| `src/` | Client (see below) |
| `migrations/` | SQL migrations for PostgreSQL, applied by `scripts/migrate.mjs`. Add a new numbered file; never edit an applied one |
| `scripts/` | Utility scripts (see below) |
| `tests/` | Tests (see below) |
| `public/` | Icons for the browser and PWA manifest |
| `docs/` | Specification, policies, step specs and reports |
| `.github/workflows/ci.yml` | CI on every push: migrations on clean PostgreSQL, `npm run check`, live PostgreSQL tests, Project Mode API tests, build, secret scan. Change only if the SPEC says so |
| `.github/workflows/ui-check.yml` | Browser layout check (`npm run test:ui`) |
| `package.json`, `package-lock.json` | Dependencies and npm scripts. Do not add dependencies without a reason in the SPEC |
| `tsconfig.json`, `tsconfig.server.json` | TypeScript settings for client and server build |
| `vite.config.ts`, `index.html` | Client build settings and HTML entry |
| `railway.toml`, `nixpacks.toml` | Railway build and start configuration |
| `connectors.yaml` | Inventory of external connections (no secrets). Change together with `docs/CONNECTIONS.md` |
| `.env.example` | Names and defaults of environment variables (no real values) |
| `.gitleaks.toml`, `.gitignore`, `.nvmrc` | Secret scan settings, ignored files, Node version |
| `AGENTS.md` | Rules for development models. Change only as a separate policy change |
| `README.md` | Short description, run and check commands. Version in its first line is checked by `scripts/check-version.mjs` |
| `DEPLOY_RAILWAY.md` | Railway deployment and environment variables. First line version is checked |
| `CHANGELOG.md` | Project changelog (from BX-07). Update with every behaviour change |
| `CHANGELOG_AGENT_BEHAVIOR.md` | History of the Simple Mode agent behaviour (1.x). A section for the current version is required by the version check |
| `QA_DRIVE_CHECKLIST.md` | Manual Google Drive check (real Google) |

## `server/`

| File | What it is |
| --- | --- |
| `server/contracts.ts` | Shared identifier contract (URL/DB-safe ids) |
| `server/adapter.ts` | Provider adapter contract, normalized response, provider error classes, fallback matrix (not wired yet) |
| `server/geminiAdapter.ts` | Gemini adapter: one call, normalized response, error classification (not wired) |
| `server/fakeProvider.ts` | Fake provider with scenarios for all error classes |
| `server/router.ts` | Router-min: candidate selection and fallback by the matrix (not wired) |
| `server/modelRegistry.ts` | Model registry schema and seed (model names live only here); not wired yet |
| `server/database.ts` | Lazy PostgreSQL pool; importing the server never opens a connection |
| `server/projectRepository.ts` | Project Mode storage: projects, State versions, events (zod contracts) |
| `server/healthRoutes.ts` | `/health`, `/ready`, `/api/health` (includes `commit`) |
| `server/security.ts` | Session signing, cookies, login limiter, same-origin check |
| `server/files.ts` | Reading uploaded files (PDF, Word, Excel, etc.), attachment limits |
| `server/documents.ts` | Building Word and PDF documents |
| `server/reasoningState.ts` | Reading and sanitizing the decision state sent to the model |
| `server/pg.d.ts` | Type declaration for `pg` |
| `server/NotoSans-Regular.ttf` | Font for PDF output |

## `src/`

| File | What it is |
| --- | --- |
| `src/main.tsx`, `src/index.css` | Client entry and styles |
| `src/App.tsx` | Simple Mode client (the main screen) |
| `src/ProjectMode.tsx` | The `/project` page (Project Mode) |
| `src/config.ts` | `APP_VERSION` (single source of the service version), `SCHEMA_VERSION`, feature flags |
| `src/en.ts`, `src/ui.ts`, `src/errors.ts` | Interface strings and error messages (English only) |
| `src/decision.ts`, `src/triage.ts`, `src/evpi.ts`, `src/brier.ts`, `src/numberValidator.ts` | Method domain logic: model, applicability check, EVPI, Brier score, number validation |
| `src/storage.ts`, `src/autosave.ts` | Local storage and autosave rules |
| `src/driveClient.ts`, `src/driveSync.ts`, `src/driveMerge.ts`, `src/driveExport.ts`, `src/useDrive.ts` | Google Drive: transport, sync core, merge rules, save as Google Doc, React hook |
| `src/attachments.ts`, `src/ConversationFiles.tsx`, `src/programFiles.ts` | Files in the conversation |
| `src/libraryExport.ts`, `src/exportZip.ts`, `src/exportName.ts`, `src/sha256Export.ts`, `src/icsBuilder.ts`, `src/decisionDocument.ts` | Exports: library, JSON, file names, hash, calendar file, decision document |
| `src/HistoryPanel.tsx`, `src/AutoGrow.tsx`, `src/OfflineIndicator.tsx`, `src/usePWAInstall.ts` | Small UI parts |
| `src/support.ts` | Crisis support contacts and distress markers (also used by the server) |
| `src/demo-coffee.ts` | Demo example |

## `scripts/`

| File | What it is |
| --- | --- |
| `scripts/check-docs.mjs` | Document check: local Markdown links and backticked paths in the main documents |
| `scripts/check-version.mjs` | One version everywhere (`src/config.ts`, `package.json`, README, DEPLOY, changelog) |
| `scripts/lint-copy.mjs` | Forbidden wording scan |
| `scripts/migrate.mjs` | Applies `migrations/` to `DATABASE_URL` |
| `scripts/qa.mjs` | Runs checks independently and writes a report (see `docs/DEVELOPMENT.md`; it is not what `npm run check` runs) |
| `scripts/measure-prompt.mjs`, `scripts/cases.mjs`, `scripts/acceptance-s2-05.mjs`, `scripts/acceptance-s2-06.mjs` | Prompt size measurement and blind quality comparison on a live model (owner's key; not in CI) |

## npm scripts

| Command | What it does |
| --- | --- |
| `npm run check` | Chain: version check, `check:docs`, `test:version`, `lint:copy`, `typecheck`, then unit tests (`merge`, `security`, `core`, `reasoning`, `export`, `sync`, `files`, `drivedocs`), `test:database`, `test:contracts`, `test:model-layer`, `test:conformance`, `test:bx06`, `test:library`, `test:package-c`, `test:virtual` |
| `npm run build` | Client (`vite build`) then server (`build:server` into `dist-server/`) |
| `npm run dev` / `npm start` | Development server / production start (runs migrations if `DATABASE_URL` is set; Project Mode needs its variables) |
| `npm run lint`, `npm run typecheck` | `tsc --noEmit` |
| `npm run lint:copy` | Forbidden wording scan |
| `npm run check:docs` | Document check |
| `npm run test:version` | Test that the version check catches stale labels |
| `npm run test:virtual` | `tests/run.sh`: real `server.ts` against a fake Gemini |
| `npm run test:ui` | Browser layout check (Playwright; not in `check`) |
| `npm run db:migrate` | Apply migrations |
| `npm run test:database:live` | Live PostgreSQL contract tests (CI only without a local database) |
| `npm run test:bx06:api` | Project Mode API tests on PostgreSQL |
| `npm run test:merge`, `test:security`, `test:core`, `test:reasoning`, `test:export`, `test:sync`, `test:files`, `test:drivedocs`, `test:library`, `test:package-c`, `test:database`, `test:contracts`, `test:bx06` | Single test groups included in `check` |
| `npm run clean` | Removes `dist/` |

## Tests in `tests/`

"PostgreSQL" = needs `DATABASE_URL`; in CI it is provided by the service container.

| File | What it checks | PostgreSQL |
| --- | --- | --- |
| `tests/core.mjs` | Core method logic, no network | no |
| `tests/reasoning.test.mjs` | State reading, size cap, hypotheses never in facts | no |
| `tests/security.test.mjs` | Sessions, cookies, login limiter, same-origin | no |
| `tests/files.test.mjs` | Attachments and documents (unit) | no |
| `tests/driveMerge.test.mjs`, `tests/driveSync.test.mjs`, `tests/driveDocs.test.mjs` | Drive merge rules, sync core, save as Google Doc (fake Drive) | no |
| `tests/export-name.test.mjs`, `tests/libraryExport.test.mjs` | Export file names; library export and import | no |
| `tests/version-check.test.mjs` | Version check catches stale labels | no |
| `tests/package-c.test.mjs` | Static checks of repository files (read the file for details) | no |
| `tests/conformance.test.mjs` | Adapter conformance (fake and Gemini) and Router-min scenarios | no |
| `tests/model-layer.test.mjs` | Adapter contract, error classes, registry seed | no |
| `tests/contracts.test.mjs`, `tests/database-contract.test.mjs` | Identifier contract; database contract without a live database | no |
| `tests/server.test.mjs`, `tests/infra.test.mjs`, `tests/v17.test.mjs`, `tests/regression.test.mjs`, `tests/perf.test.mjs`, `tests/virtual-files.test.mjs`, `tests/expert-files.test.mjs`, `tests/stage2.test.mjs` | Real `server.ts` against a fake Gemini (run by `tests/run.sh`) | no |
| `tests/regression.json` | Data for `tests/regression.test.mjs` | no |
| `tests/bx06-runtime.test.mjs` | Project Mode runtime (part of `tests/run.sh`) | yes |
| `tests/bx06.test.mjs`, `tests/bx06-contract.test.mjs` | Project Mode contracts | yes (mentions `DATABASE_URL`; read the file to see which part is skipped without it) |
| `tests/bx06-api.test.mjs` | Project Mode API security and 409 conflicts | yes |
| `tests/database-live.test.mjs` | Live PostgreSQL contract, restart recovery, provenance | yes |
| `tests/ui-check.mjs` | Browser layout at 360–1024 px | no (needs Playwright) |
| `tests/run.sh` | Runs the virtual test list | see above |

## Environment variables

Checked against `process.env.*` in `server.ts`, `server/`, `src/`, `scripts/`, `vite.config.ts`. "Required" = required in production Simple Mode; Project Mode requirements are in the last rows.

| Name | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes (or user's own key per request) | Gemini API key |
| `ENABLE_APP_AUTH` | yes (`true`) | Password sign-in on |
| `APP_PASSWORD` | yes | Sign-in password; empty in production = open site (loud warning) |
| `SESSION_SECRET` | yes with sign-in | Random 16+ characters; signs the session cookie |
| `NODE_ENV` | set by the platform | `production` enables secure cookies, default proxy hops 1, dist health check |
| `PORT` | set by the platform | HTTP port (default 3000) |
| `TRUST_PROXY_HOPS` | no | Trusted proxy hops (Railway: 1) |
| `VITE_GOOGLE_CLIENT_ID` | no | Google OAuth client for Drive; read at build time |
| `MODEL_CASCADE_LIGHT`, `MODEL_CASCADE_STRONG` | no | Model lists tried in order |
| `GEMINI_BASE_URL` | no | Alternative Gemini endpoint (tests use it for a fake) |
| `RATE_LIMIT_PER_HOUR`, `DAILY_CALL_CAP` | no | Request limits (defaults 60 and 200) |
| `MAX_MODEL_CALLS` | no | Model responses per request (default 4) |
| `LLM_CALL_TIMEOUT_MS`, `LLM_TOTAL_DEADLINE_MS` | no | Model call timeouts (defaults 25000 and 70000) |
| `LOGIN_MAX_FAILS`, `LOGIN_WINDOW_MIN` | no | Failed sign-in limit (defaults 10 per 15 minutes) |
| `MAX_BODY_BYTES` | no | Request body limit (default 262144) |
| `MAX_UPLOAD_BYTES`, `MAX_ATTACH_TEXT_CHARS` | no | Attachment size and text limits |
| `EXPERT_ATTACH_TOTAL_CHARS` | no | Attached text limit for expert requests (default 20000) |
| `RAILWAY_GIT_COMMIT_SHA`, `GIT_COMMIT` | set by Railway / optional | Commit shown by `/health` as `commit` (first 12 characters); `unknown` if neither is set |
| `SKIP_DIST_HEALTHCHECK` | no (`true` only in tests) | Skips the `dist/` presence check in production health |
| `DISABLE_HMR` | no | Disables hot reload in development |
| `DATABASE_URL` | Project Mode | PostgreSQL connection string; when set, start runs migrations |
| `PG_POOL_MAX`, `PGSSLMODE` | no | Pool size; SSL mode (`disable` in CI) |
| `ENABLE_PROJECT_MODE` | no (`false`) | Enables `/project`; then `APP_PASSWORD`, `ENABLE_APP_AUTH`, `SESSION_SECRET`, `DATABASE_URL` are all required |
| `PROJECT_RATE_LIMIT_PER_MINUTE` | no | Project API per-IP limit (default 60) |
| `ONLY`, `CI` | tests only | `ONLY` selects scenarios in `tests/stage2.test.mjs`; `CI` is set by `scripts/qa.mjs` |

`LLM_ROUND_PAUSE_MS` is mentioned in `DEPLOY_RAILWAY.md` and set by some tests, but no server code reads it (checked by search); do not rely on it.
