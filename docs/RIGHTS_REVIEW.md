# Rights and permissions review (BX-24 / P23)

> **Agent sign-off:** 2026-10-12 (P23). Owner formal acknowledgement optional for G4.

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

Baseline: `metadata:read`, `contents:read`, `checks:read`, `pull_requests:read`.  
Write scopes only if `model_patch` / diff upload enabled (off by default).

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
| Owner | — | Optional acknowledgement |
