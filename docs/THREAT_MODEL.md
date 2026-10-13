# BiForge threat model (BX-24 / P23)

> Status: **Accepted for MVP** (agent evidence 2026-10-12; review refreshed 2026-10-13). Aligns with TZv3.0 §13 and `docs/SECURITY_POLICY.md`.

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
| Code executor validation and bounded branch writes | `server/codeExecutor.ts`, `server/codeTaskService.ts`, `tests/p19x-acceptance.test.mjs`; writes gated and never merge |
| Staging automation safety | `docs/PA-03-SPEC.md`, `scripts/staging-drills.mjs`, `.github/workflows/staging-drills.yml`; manual dispatch, staging hostname check, GET-only load probe, synthetic data, no restore/rollback or DB writes |
| GitHub App rights boundary | `docs/ADR-06-github-repositories.md`, `docs/RIGHTS_REVIEW.md`; read-only by default, merge forbidden, write requires a separate owner decision |

## 4. Dated review — 13 October 2026 (RM-E7)

- **Injection corpus / CI:** repository contains `tests/fixtures/injection/**`, `tests/injection-corpus.test.mjs`, and the P23 acceptance coverage. The static tests are part of `npm run check`; this patch did not run the live CI workflow, so CI evidence remains dependent on the GitHub Actions run.
- **GitHub App vs SPEC_ENGINE §11.7:** the approved policy is read-only by default; no admin, secrets, workflow, or merge permission; any optional write requires a separate owner decision and stays constrained to `biforge/*`. No live App installation or role listing was available in this archive, so actual installed permissions are **NOT_RUN**.
- **Railway logs:** not accessible from this patch environment. Live log inspection for prompt-injection exposure / secret redaction is **NOT_RUN**.
- **Conclusion:** **PARTIAL**. Static controls and policy were reviewed; real Railway logs and installed GitHub App roles require owner-side evidence. This is not a claim of a completed live security audit.

## 5. Residual risks (accepted for MVP)

- `CODE_EXECUTOR=model_patch` remains off unless the owner explicitly enables it; ADR-10 permits the choice but does not automatically switch the environment.
- Full network penetration test is out of scope.
- Monitor does not open GitHub Issues yet (P15a).
- Live secret-scan of production logs is operational and remains NOT_RUN until an owner supplies a non-secret evidence record.
- Staging workflow does not restore backups, roll back deployments, mutate database state, or exercise the full Project Mode scenario automatically.

## 6. Non-goals

Product must not merge, deploy, or execute untrusted code on Railway (§13.7). Monitoring is read-only. Maximum automation prioritizes safe repetitive work but does not override owner-reserved decisions.
