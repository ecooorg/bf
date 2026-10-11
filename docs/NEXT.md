# Next patches (queue)

> Updated by the AI Assistant at the end of every patch. Plan: TZ 16.4.2; process rules: TZ 16.3.2 and 16.4.4.

## P13a — done (BX-28, `docs/P13a-SPEC.md`)
- Use `npm run patch:pack` from P13b on (see `docs/START_HERE.md`, Delivery).

## P13b — implementation added in cumulative patch (BX-16)
- Project Mode plan/approval/task APIs and UI are wired; worker startup is integrated into `server.ts`; per-call budget guard and Run-linked ledger are wired; output uses Artifact Registry.
- See `docs/P15-REPORT.md` for implementation scope and verification status.
- Required before marking BX-16 PASS: run `npm ci`, `npm run test:p15`, full `npm run check`, `npm run build`, and live PostgreSQL/worker acceptance. If any required check is `NOT_RUN` or `BLOCKED`, status remains `PARTIAL`.


## P14 — done (BX-17.b, `docs/P14-SPEC.md`)

## P15 — implemented; owner confirmed manual checks (2026-10-11); G2 and E-01 evidence and ADR-10 still open
- Run the full TZ 18.1 E2E on a disposable PostgreSQL database with configured provider and preserve evidence (12-call cap).
- Run E-01 per TZ 11.9: three real task pairs, `manual` vs `model_patch`, with acceptance tests prewritten. Update `docs/P15-REPORT.md` and `docs/ADR-10-code-executor.md` only from observed evidence. Until then, `model_patch` remains disabled and BX-18.b is NOT_RUN. 


## Open checks (2026-10-11)
- Owner: logs of the previous deployment (no `signal SIGTERM`, no `SSL error`); G2 and E-01 data into `docs/P15-REPORT.md`; final ADR-10 after E-01.
- Automated or with keys: `verify-groq` workflow, live golden-eval, scripted 18.1 scenario, real provider failures.
- Next in the plan: P15a (monitoring of connections and quotas), then P16 (GitHub integration). Not started: the owner gives the command.


## P16 — GitHub integration (BX-19), completed together with P17
- Added GitHub App connection verification and signed webhook ingress; no repo creation, PR writes, event-to-evidence processing, or executor activation.
- `docs/ADR-06-github-repositories.md` remains proposed until the owner decides visibility/organization and Actions limits.
- Required checks: `npm ci`, `npm run test:github`, `npm run check`, `npm run build`, and live PostgreSQL integration. Real GitHub verification is `REAL_ONLY` until configured credentials are available.


## P17 — Gate Engine and CI evidence (BX-20, `docs/P17-SPEC.md`), implementation patch
- Evidence from signed GitHub webhooks, Test Integrity, invalidation on a new commit, human waiver, Release Candidate manifest; migration 009; two Project Mode routes. No UI.
- Owner checks (REAL_ONLY): create and install the GitHub App (TZ E.5), `npm run verify:connections -- --only github`, send a signed `check_run` for a `biforge/<task_id>` branch and read `GET /api/projects/:projectId/tasks/:taskId/gates`.
- Next patches: P15a, then P18 (Task Package and `manual` executor; will use `commitTaskPackage`). Wiring Task PASS to gate results and an approvals route for `requirements` / `spec` / `review` evidence are open items.
