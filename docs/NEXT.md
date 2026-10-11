# Next patches (queue)

> Updated by the AI Assistant at the end of every patch. Plan: TZ 16.4.2; process rules: TZ 16.3.2 and 16.4.4.

## P13a — done (BX-28, `docs/P13a-SPEC.md`)
- Use `npm run patch:pack` from P13b on (see `docs/START_HERE.md`, Delivery).

## Build rules for every patch (from the P13b hang)
- The archive is built first; a red or hanging check never stops the delivery. Status `PARTIAL` is allowed, `PASS` only when everything is green; CI gives the real result.
- Limits: 300 s per step, 1800 s in total, 2 attempts for a red step, no retry after a timeout. The same failure after the second attempt goes to the report as a known failure with its log; do not make a third fix in the same session.
- Run by hand only with a limit (`timeout 300 <command>`). Never wait for a command without output for more than 5 minutes.
- Code that starts a loop, a timer or a server (the worker in `server.ts`) must end on SIGTERM within 10 s (hard exit) and must not keep the process alive without a reason.
- Cut a risky patch into two parts (TZ 16.4 rule 4): P13b.1 routes, screen, `guardModelCall` in `runAnalysis`, `run_id` in the ledger; P13b.2 the worker in `server.ts` and the tests of group A items 3-4.

## P13b — rest of BX-16 (TZ 8.4–8.6, 14, 16.4.4)
- **Goal.** Routes and the `/project` screen to confirm a plan and decide approvals; worker started from `server.ts` with a real handler; `guardModelCall` in `runAnalysis`, every call in the ledger with `run_id`; `writesArtifact` tied to the artifact registry (after P14).
- **Tests.** Extended set 16.4.4, group A (items 1–5) in full; group B where it applies.
- **Owner check.** Confirm a task plan on Railway; an over-budget run is visible and waits for a decision.

## P14 — done (BX-17.b, `docs/P14-SPEC.md`)
- Next after P13a and P13b: **P15** (BX-18, end-to-end scenario, gate G2). TZ 11.9, 17, 18.1, 20.2 (ADR-10).
