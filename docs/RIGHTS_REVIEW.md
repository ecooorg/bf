# Rights and permissions review (BX-24 / P23)

> **Agent review refreshed:** 2026-10-13 (PA-03 preparation / ADR-06). Actual installed GitHub App permissions are NOT_RUN until verified by the owner.

## 1. Human vs product authority

| Action | Who | Mechanism |
| --- | --- | --- |
| Merge PR | Owner only | GitHub UI; product never calls merge API |
| Deploy / change production config | Owner | Railway dashboard |
| Activate registry model | Owner | After `verify:connections` OK + R5 |
| Raise budget / change policy | Human session | Routes set `actorKind: 'human'`; `requireHuman`; audit |
| Switch code executor | Owner / human state path | ADR-10; default `manual`; `model_patch` off until E-01 |
| Delete project | Human session | `DELETE /api/projects/:id` → audit `project.deleted` |
| Approve / reject / WAIVE | Human session | `requireHuman` / waiver actor ≠ agent\|model |

## 2. GitHub App scopes

Baseline: read-only metadata, contents, checks, and pull requests as required. No administration, secrets, workflows, or merge permission.  
Any write scope requires a separate owner decision and must be constrained to the approved test repository / `biforge/*` branches; no write to `main`. Actual installed permissions were not inspectable from this archive and remain NOT_RUN.

## 3. Session and CSRF

Signed cookie; HttpOnly; SameSite=Lax; Secure in production.  
Project Mode mutating methods require same-origin Origin.

## 4. actorKind

No Project Mode route reads `actorKind` from the request body. Server assigns `'human'` after session authentication. Domain services reject non-human kinds with `HUMAN_REQUIRED` (403 path).

## 5. Audit coverage (catalog)

See `server/auditCatalog.ts`. Includes login success/failure, project create/delete, approvals, budget.set, gate.waived, settings.changed, code_task.started, state patches.

## 6. Sign-off

| Role | Date | Result |
| --- | --- | --- |
| Agent | 2026-10-12 | PASS for machine criteria of BX-24 |
| Owner | — | Pending live App-permission verification; ADR-06 decision recorded 2026-10-13 |
