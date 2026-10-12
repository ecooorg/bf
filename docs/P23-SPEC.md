# P23 — Security evidence (BX-24)

**Goal.** Close BX-24 machine criteria: formal threat model, injection corpus with side-effect assertions, secret-redaction coverage, rights review, audit completeness. Critical security tests green in CI.

**Base.** Owner archive after P15a (`bf-P15a.zip` on `bf-vPI-03final`). Product version becomes `23`.

**May change.** Security modules and tests, audit helpers, project delete + login-failure audit, docs (THREAT_MODEL, RIGHTS_REVIEW, SECURITY_POLICY note, CURRENT_STATE, NEXT, CHANGELOGs), version.

**Must not change.** Simple Mode prompts/JSON schema; Router selection; `tests/acceptance/**`; monitoring behaviour of P15a except shared redaction.

## Behaviour

1. **Threat model** — `docs/THREAT_MODEL.md` finalized for MVP (assets, entry points, controls, residual risks).
2. **Injection corpus** — fixtures under `tests/fixtures/injection/**`; tests prove untrusted text does not drive `decideApproval` / budget raise / human-only actions when `actorKind ≠ human`.
3. **Redaction** — known secret values never appear in monitor/verify output helpers; API error sanitizer uses redact; unit tests.
4. **Rights review** — `docs/RIGHTS_REVIEW.md` agent sign-off; mutating Project Mode routes keep `actorKind: 'human'` server-side only.
5. **Audit** — catalog of required event types (§13.5); login success/failure; project create/delete; budget.set; approval.decided; gate.waived; settings change; code_task.started. Missing delete API added with audit.

## PASS

- Machine: `test:p23`, `test:security`, `test:redact`, `test:injection`, `test:p15a`, `check-version`, `check:docs`.
- Owner: read THREAT_MODEL + RIGHTS_REVIEW; optional live login audit row when Project Mode + DB.

## Not done

- Full penetration test; enabling `model_patch`; opening monitor Issues; owner formal signature in RIGHTS_REVIEW (agent side complete).
