# Next patches (queue)

> Updated by the AI Assistant at the end of every patch. Plan: TZ 16.4.2; process rules: TZ 16.3.2 and 16.4.4.

## P13a — done (BX-28, `docs/P13a-SPEC.md`)
- Use `npm run patch:pack` from P13b on (see `docs/START_HERE.md`, Delivery).

## P13b — implementation added in cumulative patch (BX-16)
- Project Mode plan/approval/task APIs and UI are wired; worker startup is integrated into `server.ts`; per-call budget guard and Run-linked ledger are wired; output uses Artifact Registry.
- See `docs/P15-REPORT.md` for implementation scope and verification status.
- Required before marking BX-16 PASS: run `npm ci`, `npm run test:p15`, full `npm run check`, `npm run build`, and live PostgreSQL/worker acceptance. If any required check is `NOT_RUN` or `BLOCKED`, status remains `PARTIAL`.


## P14 — done (BX-17.b, `docs/P14-SPEC.md`)

## P15 — implementation scaffold added; G2 and E-01 remain open
- Run the full TZ 18.1 E2E on a disposable PostgreSQL database with configured provider and preserve evidence (12-call cap).
- Run E-01 per TZ 11.9: three real task pairs, `manual` vs `model_patch`, with acceptance tests prewritten. Update `docs/P15-REPORT.md` and `docs/ADR-10-code-executor.md` only from observed evidence. Until then, `model_patch` remains disabled and BX-18.b is NOT_RUN. 
