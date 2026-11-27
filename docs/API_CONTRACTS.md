## Property-search API status (2026-11-27)
All /api/immofinder/* endpoints are retired and return HTTP 410. No ImmoFinder cron/diagnostic secret bypass remains. ImmoGR uses the separate /api/immogr/* namespace; its current API design is in IMMOGR_ARCHITECTURE.md.

> **Property-search status — owner decision 2026-11-27:** ImmoFinder is permanently retired and must not be run, developed, or used. Any ImmoFinder material below is historical archive only: it is not a current requirement, roadmap, technical instruction, or source of decisions. ImmoGR is the sole active property-search project; its current authority is the docs/IMMOGR_*.md document set.


### C131 secret-authorized manual automation
- `POST /api/immofinder/run` with `X-Immofinder-Secret` is treated as a schedule tick by default. Automation that explicitly requests a manual production run must send `{ "wave": "full", "manualRun": true }`; the same configured secret is required. This bypasses only the schedule-due check, not run concurrency, PostgreSQL queueing, R1–R14 admission gates, or owner-review requirements. `manualRun` does not enable the scheduler.

# API Contracts

**Authority:** Normative user-facing behavior and acceptance live in `../TECHNICAL_SPECIFICATION.md`; route ownership and input/output contracts must agree with the running source. This file is the navigation and implementation contract, not a parallel product spec.

## Contract rules

- All public/API routes must validate inputs, return documented status/error shapes, and apply the relevant authentication, CSRF, rate-limit, budget, and feature-gate policies.
- Keep model-provider credentials and direct provider requests server-side.
- User-visible agent identity is exactly Conversational, Expert, Architect. Internal legacy keys are implementation details and must not leak into the user-facing mode selector.
- Architect endpoints must implement one flow and a single completion contract. No API or client contract should require selecting novice/professional Architect modes.
- Download endpoints must enforce ownership/authorization, artifact existence, integrity, and status-specific delivery policy. A `PARTIAL` result must not be silently presented as a complete successful artifact.
- Error responses must be actionable, truthful, and distinguish invalid input, missing resources, authorization failure, provider/model failure, validation failure, and internal failure where supported.

## Source inspection

The current route inventory is generated at `generated-route-inventory.json`. Route definitions and validation are in the server route modules. `TECHNICAL_SPECIFICATION.md` §4 remains the detailed normative API section. If this navigation summary and the source/spec diverge, record the discrepancy and resolve it in the authoritative spec before relying on either behavior.

## API change acceptance

For a changed endpoint, provide: contract tests for success and failure, authorization tests where applicable, a compatibility decision for existing clients, and realistic user-flow evidence if the endpoint affects user-visible outcomes. Test stubs do not establish deployed/live behavior.


## Compact session diagnostics (P121.12)

`GET /api/projects/diagnostics/session-log` is available behind the existing Project Mode authentication and rate-limit boundary. It returns `text/plain; charset=utf-8`, selecting the latest retained non-diagnostic operation and correlating its retained operation events and application logs. The bounded report includes runtime identity, system-check results, event chronology, error metadata, log provenance, and explicit limits. It excludes prompts, generated source, request/response bodies, credentials, and cookies. Missing or expired evidence is labelled rather than inferred. The endpoint does not create or download an archive.


## Sanitized runtime configuration diagnostics (P124.31)

`GET /health/runtime-config` is a public, read-only operational endpoint. It returns the running version/commit and a sanitized allowlist of non-secret effective settings used by the model router, search chain, feature switches, worker polling and credential-presence booleans. It MUST NOT return credential values, prompts, user data, database URLs, session material, or raw environment dumps. This endpoint exists so the Model Carousel workflow can compare the deployed Render runtime with the repository's documented contract.

## Generated route index (source inventory, not a complete API schema)

The table below is generated from `docs/generated-route-inventory.json`. It prevents routes from disappearing from the documentation map, but it does **not** claim that every endpoint has a fully specified request/response schema, auth matrix, or error catalogue. Until each row receives a detailed contract, use the implementation source and `TECHNICAL_SPECIFICATION.md` §4 as the authoritative behavior; do not infer a missing contract from this index.

<!-- BEGIN GENERATED ROUTE INDEX -->
| Method | Path | Registration source | Contract detail status |
|---|---|---|---|
| `GET` | `*` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/agent/conversational` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/agent/expert` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/analyze-full` | `server/compatibilityRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/attach` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/conversation` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/diagnostics/all-logs` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/diagnostics/client-render` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/diagnostics/session-log` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/evpi` | `server/compatibilityRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/expand` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/experiment-draft` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/export-document` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/forecast-wording` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/health` | `server/healthRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/immofinder/cleanup` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/immofinder/enrich-existing` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/immofinder/enrich-status` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/immofinder/export-snapshot` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/immofinder/listings` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `DELETE` | `/api/immofinder/listings/:id` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `PATCH` | `/api/immofinder/listings/:id` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/immofinder/recheck` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/immofinder/recheck-list` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/immofinder/recheck-list-status` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/immofinder/repair/apply` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/immofinder/repair/audit` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/immofinder/repair/preview` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/immofinder/reset` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/immofinder/run` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/immofinder/runs/latest` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/immofinder/schedule-status` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/immofinder/settings` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `PUT` | `/api/immofinder/settings` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/immofinder/settings/reset` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/immofinder/settings/test` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/immofinder/stop` | `server/immofinderRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/knowledge-map` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/login` | `server/authRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/logout` | `server/authRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/neutralize` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/ops` | `server/opsRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/premortem` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `DELETE` | `/api/projects/:projectId` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/analyze` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/approvals` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/approvals/:approvalId/decision` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/artifact-versions` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/artifacts` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/artifacts/:artifactId` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/artifacts/:artifactId/download` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/artifacts/:artifactId/inspect` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/artifacts/:artifactId/versions` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/artifacts/upload` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/budgets/:scope/:scopeId` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `PUT` | `/api/projects/:projectId/budgets/:scope/:scopeId` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/code` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/code/build` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/code/build/:jobId` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/code/build/:jobId/cancel` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/code/build/:jobId/file` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/code/build/preview` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/code/continue` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/code/manual` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/decisions` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/items/review` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/ledger` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/plans` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/plans` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/plans/:planId/tasks` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/settings` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `PUT` | `/api/projects/:projectId/settings` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `PUT` | `/api/projects/:projectId/state` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/tasks` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/tasks/:taskId` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/tasks/:taskId/code` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/approve` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/cancel` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/commit-package` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/decide` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/download` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/package` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/refresh` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/repair` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/result` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/review` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/code/brief` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/code/start` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/tasks/:taskId/gates` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/gates/:gate/approve` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/gates/:gate/waive` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/queue` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/tasks/:taskId/validate` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/versions` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/diagnostics/client-events` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/diagnostics/export` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/diagnostics/operations` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/diagnostics/session-log` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/diagnostics/system` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/radar` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/radar-legacy` | `server/compatibilityRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/redteam` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/redteam-pair` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/review` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/revise-document` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/session` | `server/authRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/synthesis` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/understand` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/webhooks/github` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/health` | `server/healthRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/health/runtime-config` | `server/healthRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/ops` | `server/opsRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/ready` | `server/healthRoutes.ts` | Source inventory only; detailed request/response schema pending |
<!-- END GENERATED ROUTE INDEX -->

## ImmoFinder current runtime (C131, inspected 2026-11-26)

- **Search execution:** `POST /api/immofinder/run` validates a session + same-origin request or a timing-safe `X-Immofinder-Secret` (configured `IMMOFINDER_RUN_SECRET`, at least 16 characters), requires PostgreSQL, queues a durable run and returns `202 {success, runId, dryRun, wave}`; an active run returns `409 RUN_IN_PROGRESS`, missing DB returns `503 DATABASE_UNAVAILABLE`. Product waves are `full` and `carousel`; legacy `priority`/`extended` values are mapped for compatibility. Test mode requires the secret and `dryRun=true`.
- **Diagnostics:** `GET /api/immofinder/diagnostics/latest` and `GET /api/immofinder/github/probe` are read-only secret-protected polling routes; they do not start the repair bootstrap. Run diagnostics are stored in PostgreSQL, with a bounded latest-100 history; GitHub runtime writes are disabled.
- **Session boundary:** ordinary module routes use the application session gate; mutating requests require same-origin. The run secret bypass is limited to the explicitly recognized automation calls. Do not expose provider credentials or the run secret in settings/diagnostics.
- **Runtime/data:** the route uses `server/immofinder/live.ts` for source-first search and the PostgreSQL-backed worker/lease for execution. PostgreSQL is the source of truth; Drive, Telegram and email are server-side delivery adapters, not automatic letter-sending. Current schedule/delivery settings are documented as off pending owner acceptance.
- The generated route index is an inventory, not a full schema. Detailed payload/error contracts for listings, settings, recheck, repair, export and enrichment endpoints remain source-inspected / schema-pending; do not infer fields from the historical P128 examples below.


## ImmoFinder route history (P128 baseline; superseded by the C131 runtime section above)

Historical P128 planning notes retained for traceability; current implementation and auth boundary are described in the C131 section above.

- `GET /api/immofinder/listings?status=&municipality=` → cards (German fields, Russian translation fields, contact status, source URLs, photo URLs); `scope=hidden` returns only hidden rows, `scope=all` current and hidden together (default: current only). Publication date of the ad, when the page states it, is `raw.listed_at`.
- `PATCH /api/immofinder/listings/:id` → manual `status` change only.
- `POST /api/immofinder/run` → enqueue a run (`dryRun` optional); accepts app session or `X-Immofinder-Secret` for cron; returns run id.
- `GET /api/immofinder/runs/latest` → counts, filtered-by-reason, errors, estimated cost, Drive link.

Implemented in 128.1: all four routes above. Cron may call `POST /api/immofinder/run` with header `X-Immofinder-Secret` (timing-safe compare with `IMMOFINDER_RUN_SECRET`, min 16 chars); session calls need same-origin. Responses: 202 `{runId}`, 409 `RUN_IN_PROGRESS`, 401, 403 `CSRF_ORIGIN`, 503 `DATABASE_UNAVAILABLE`.

Settings (128.5), same auth and same-origin rules: `GET /api/immofinder/settings` → `{settings, channels:{telegram,email,drive}, communes, timezone}` (booleans only, no secrets); `PUT /api/immofinder/settings` → validated and saved settings (invalid fields fall back to defaults); `POST /api/immofinder/settings/test` body `{channel:'telegram'|'email'}` → `{result}`. A cron call to `POST /api/immofinder/run` returns 200 `{skipped:'manual_only'|'not_due'}` when no search is due.

128.6: `GET /api/immofinder/settings` also returns `channels.driveAccount` (service account address, not a secret); `POST /api/immofinder/settings/test` accepts `channel:'drive'` (read-only readiness check). Settings gain `delivery.emailContent` (`new`|`all`) and `delivery.driveFolderId` (URL or ID, stored as ID).

128.8: `POST /api/immofinder/cleanup` → `{hidden:n}` (hides saved rows that fail the current filters); `GET /api/immofinder/listings` also returns `hidden` (count) and each listing has `listing_type` (`holiday_owner`|`long_term_offer`).
