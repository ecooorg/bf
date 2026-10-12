# BiForge threat model (BX-24 / P23)

> Status: **Accepted for MVP** (agent evidence 2026-10-12). Aligns with TZv3.0 §13 and `docs/SECURITY_POLICY.md`.

## 1. Assets

| Asset | Why it matters | Where it lives |
| --- | --- | --- |
| Provider API keys | Spend and data exposure | Railway Variables / GitHub Secrets only |
| GitHub App credentials | Repo access | Railway Variables; minimal scopes |
| Session secret / app password | Auth to Project Mode | Railway Variables |
| Project State & artifacts | User work product | PostgreSQL; sensitivity normal\|high |
| Audit trail | Accountability | `audit_events` (append-only intent) |
| Model registry & budgets | Control plane | Code + DB; human activation only |

## 2. Adversaries and entry points

1. **Prompt injection** via uploaded files, PR text, CI logs, plan-node prose — content is data, never instructions (§13.2).
2. **Stolen or leaked secrets** — mis-logged values, client bundle, chat, archives.
3. **Forged actorKind / CSRF** — client claims to be human; cross-site state-changing requests.
4. **Budget / approval bypass** — model or tool tries to raise limits or self-approve.
5. **Registry / Router manipulation** — activation of unverified models; monitor must not auto-activate (ADR-11).
6. **Supply chain** — dependency or Actions compromise (CI secret scan + pinned Actions).

## 3. Controls

| Control | Evidence |
| --- | --- |
| Session HMAC, SameSite, Origin CSRF | `server/security.ts`, `tests/security.test.mjs` |
| Login rate limit | In-memory + DB when Project Mode |
| `actorKind` only from server (literal `human` after session) | Project Mode routes; `tests/p23-acceptance.test.mjs` |
| Secrets never in Git; gitleaks CI | `.gitleaks.toml`, CI workflow |
| Redaction helpers | `server/redact.ts`, `tests/redact.test.mjs` |
| Untrusted data labeling + injection corpus | `server/untrustedData.ts`, `tests/fixtures/injection/**`, `tests/injection-corpus.test.mjs`, `tests/p23-acceptance.test.mjs` |
| Side effects only via typed tools + validators | Domain services (`requireHuman`) |
| Audit events | `server/auditCatalog.ts`; writers on login, project, budget, approval, waiver, settings, code task |

## 4. Residual risks (accepted for MVP)

- Owner must still complete E-01 before enabling `model_patch`.
- Full network penetration test is out of scope.
- Monitor does not open GitHub Issues yet (P15a).
- Live secret-scan of production logs is operational, not automated here.

## 5. Non-goals

Product must not merge, deploy, or execute untrusted code on Railway (§13.7). Monitoring is read-only.
