# Next patches (queue)

> Updated by the AI Assistant at the end of every patch. Plan: TZ 16.4.2; process rules: TZ 16.3.2 and 16.4.4.

## P13a — done (BX-28, `docs/P13a-SPEC.md`)
- Use `npm run patch:pack` from P13b on (see `docs/START_HERE.md`, Delivery).

## P13b — rest of BX-16 (TZ 8.4–8.6, 14, 16.4.4)
- **Goal.** Routes and the `/project` screen to confirm a plan and decide approvals; worker started from `server.ts` with a real handler; `guardModelCall` in `runAnalysis`, every call in the ledger with `run_id`; `writesArtifact` tied to the artifact registry (after P14).
- **Tests.** Extended set 16.4.4, group A (items 1–5) in full; group B where it applies.
- **Owner check.** Confirm a task plan on Railway; an over-budget run is visible and waits for a decision.

## P14 — done (BX-17.b, `docs/P14-SPEC.md`)
- Next after P13a and P13b: **P15** (BX-18, end-to-end scenario, gate G2). TZ 11.9, 17, 18.1, 20.2 (ADR-10).
