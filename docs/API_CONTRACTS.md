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
| `GET` | `/api/diagnostics/session-log` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/evpi` | `server/compatibilityRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/expand` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/experiment-draft` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/export-document` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/forecast-wording` | `server.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/health` | `server/healthRoutes.ts` | Source inventory only; detailed request/response schema pending |
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
| `GET` | `/api/projects/:projectId/artifacts` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/artifacts/:artifactId` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/artifacts/:artifactId/download` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/artifact-versions` | `server/projectRoutes.ts` | All immutable artifact versions scoped to the selected project |
| `GET` | `/api/projects/:projectId/artifacts/:artifactId/versions` | `server/projectRoutes.ts` | Version history for one project-owned artifact |
| `GET` | `/api/projects/:projectId/artifacts/:artifactId/inspect?version=N` | `server/projectRoutes.ts` | Integrity status, manifest preview, and ZIP entry listing for a selected version |
| `GET` | `/api/projects/:projectId/artifacts/:artifactId/download?version=N` | `server/projectRoutes.ts` | Downloads selected immutable version; omitted version means latest |
| `GET` | `/api/projects/:projectId/budgets/:scope/:scopeId` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `PUT` | `/api/projects/:projectId/budgets/:scope/:scopeId` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/code` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/code/build` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `GET` | `/api/projects/:projectId/code/build/:jobId` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
| `POST` | `/api/projects/:projectId/code/build/:jobId/cancel` | `server/projectRoutes.ts` | Source inventory only; detailed request/response schema pending |
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
