# BiForge threat model (foundation for BX-24 / P23)

> Prepared under P15a so P23 can complete evidence and the injection corpus CI gate. Aligns with TZv3.0 §13 and `docs/SECURITY_POLICY.md`.

## 1. Assets

| Asset | Why it matters | Where it lives |
| --- | --- | --- |
| Provider API keys | Direct spend and data exposure | Railway Variables / GitHub Secrets only |
| GitHub App credentials | Repo read (and future write) | Railway Variables; minimal scopes |
| Session secret / app password | Auth to Project Mode | Railway Variables |
| Project State & artifacts | User work product | PostgreSQL; sensitivity normal\|high |
| Audit trail | Accountability | `audit_events` (append-only intent) |
| Model registry & budgets | Control plane | Code + DB; human activation only |

## 2. Adversaries and entry points

1. **Prompt injection via uploaded files, PR text, CI logs, web content** — content is data, never instructions (§13.2).
2. **Stolen or leaked secrets** — mis-logged values, client bundle, chat, archive.
3. **Forged actorKind / CSRF** — client claims to be human; cross-site state-changing requests.
4. **Budget / approval bypass** — model or tool tries to raise limits or self-approve.
5. **Registry / Router manipulation** — activation of unverified models; monitor must not auto-activate (ADR-11).
6. **Supply chain** — dependency or Actions compromise (out of product code; CI secret scan + pin Actions).

## 3. Controls already in place (pre-P23)

- Session HMAC, SameSite cookies, Origin check (`server/security.ts`).
- Login rate limiter.
- `actorKind` from server session only (Project Mode routes).
- Secrets never in Git; gitleaks in CI.
- `verify:connections` and monitor print `present` only; `server/redact.ts`.
- Side effects only through typed tools + domain validators.
- `audit_events` table (migration 001) written on project create/state/plan/gate/code-task paths.

## 4. Residual gaps for P23 (BX-24)

| Gap | Planned evidence |
| --- | --- |
| Formal injection corpus in CI | `tests/fixtures/injection/**` + runner |
| Systematic secret-redaction tests across log/API paths | Expand `tests/redact.test.mjs` + route tests |
| Rights / permission review document signed off | `docs/RIGHTS_REVIEW.md` (draft below) |
| Audit coverage matrix (login, budget change, executor switch, WAIVED) | Complete event types + tests |
| Threat-model review recorded | This file + P23 REPORT |

## 5. Non-goals

- Product must not merge, deploy, or execute untrusted code on Railway (§13.7).
- Monitoring (P15a) is read-only and cannot change registry status.
- Full penetration test is outside MVP; critical automated tests are the gate.
