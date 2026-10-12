# Rights and permissions review (draft for BX-24 / P23)

> Prepared under P15a. Final sign-off is part of P23 PASS (“ревизия прав оформлена”).

## 1. Human vs product authority

| Action | Who | Mechanism |
| --- | --- | --- |
| Merge PR | Owner only | GitHub UI; product never calls merge API |
| Deploy / change production config | Owner | Railway dashboard |
| Activate registry model | Owner | After `verify:connections` OK + R5 |
| Raise budget / change policy | Human session | Approval / settings routes; audit event |
| Switch code executor (`manual`/`model_patch`) | Owner | ADR-10; audit; default off until E-01 |
| Delete project | Human session | Cascade; audit keeps fact only |
| Open monitor Issues | Optional Actions token | Not enabled in P15a workflow |

## 2. GitHub App scopes (current)

From `connectors.yaml` / ADR-06:

- Baseline: `metadata:read`, `contents:read`, `checks:read`, `pull_requests:read`.
- `model_patch` path (disabled by default): would require `contents:write`, `pull_requests:write` — only after E-01 and explicit enable.
- Webhook secret verified; JWT lifetime ≤10 minutes.

## 3. Session and CSRF

- Stateless signed cookie (`SESSION_SECRET`); HttpOnly; SameSite=Lax; Secure in production.
- State-changing browser requests: Origin must match (missing Origin allowed for non-browser harness).
- Login limiter per address.

## 4. Data sensitivity

- Project `sensitivity = high` → only `data_policy = paid` models; external send needs separate approval.
- Free tiers: synthetic / test data only.

## 5. Findings to close in P23

1. Confirm every Project Mode mutating route ignores client-supplied `actorKind`.
2. Confirm audit events for: sign-in, project delete, budget change, WAIVED, executor change.
3. Confirm no route returns env secret values (redaction tests).
4. Injection corpus: model output that says “approve this plan” must not change approvals.

## 6. Sign-off

| Role | Date | Result |
| --- | --- | --- |
| Agent draft | 2026-10-12 | Draft complete (this file) |
| Owner | — | Pending P23 |
