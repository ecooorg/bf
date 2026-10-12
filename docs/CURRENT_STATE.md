# Current state

> Updated 2026-10-12 (plan reorder + GitHub App confirmation).

## Product

- **Simple Mode** (`/`): works; product version **19** (`APP_VERSION` = patch number).
- **Project Mode** (`/project`, opt-in, PostgreSQL): built through P19 from `docs/BiForge_TZ_v3.md`.

## Done (code)

| Patch | Result |
| --- | --- |
| P01–P14, P13a, P13b | Foundation through full Artifact Registry, process automation, plan UI/worker wiring |
| P15 | Partial: structure for G2; **E-01 not run**, ADR-10 **interim** |
| P16 | GitHub integration (library); **App now live** (see below) |
| P17 | Gate Engine + CI evidence via webhook |
| P18 | CodeExecutor `manual`, PACKAGE.md, PR/branch/diff intake |
| P19 | `model_patch` schema/validation/executor stub; gated by `CODE_EXECUTOR=model_patch`; ARCHIVE/CONCEPTS; pack-simple |

## Confirmed by owner (2026-10-12)

- GitHub App **biforge-control** (App ID 5276629, installation present).
- Repository permissions: Metadata, Contents, Checks, Pull requests — **read-only**.
- Railway variables: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_REPOSITORY_OWNER`, `GITHUB_REPOSITORY_NAME`.
- Webhook deliveries for `check_run` return **202** to `https://<railway>/api/webhooks/github`.
- Stage “GitHub connected for BiForge” treated as **confirmed** for planning (full CLI `verify:connections` optional when shell is available).

## Open / debt

- E-01 evidence and **final ADR-10** (`model_patch` stays off by default).
- P18: Task Package not committed to task branch (Test Integrity conflict) → **P20**.
- P17: Task PASS not tied to gates; no requirements/spec/review approval routes → **P20b**.
- P19: no production model→PR loop until P19x after E-01.
- ADR-06 still proposed (repo visibility/org).
- Write permissions / `GITHUB_DIFF_UPLOAD` not enabled (correct for now).

## Next

Operational order: **TZ 16.4.2.a** and `docs/NEXT.md`. First code patch: **P20**.
