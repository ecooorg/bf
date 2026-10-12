# P20b — Task PASS tied to Gate Engine

**Goal.** A task cannot move to PASS when it has a tracked code head unless Release Candidate is PASS or WAIVED. Humans can record approval evidence for requirements / spec / review.

**Base.** bf-v20 (P20 green).

**May change.** `server/gateEngine.ts`, `server/taskService.ts`, `server/taskMachine.ts`, `server.ts`, tests, docs, product version `20b`.

**Must not change.** Simple Mode; gate evaluation rules for individual gates; analysis tasks without a code head still PASS on validation evidence only.

## Behaviour

1. `gatesAllowTaskPass(gates)` — null/undefined → ok; else RC PASS|WAIVED required.
2. `transitionTask` to PASS loads `getTaskGates`; on block throws `GATES_BLOCKED` with blockers.
3. `POST .../gates/:gate/approve` for `requirements` | `spec` | `review` → `recordApproval` at current head.

## PASS criteria

- Machine: `npm run test:p20b`, `npm run test:gate`, typecheck, check:docs.
- Owner: task with no PR head still validates PASS as before; task with head and failing gates cannot PASS until fixed or waived.

## Not done

- Full UI for gates; automatic PASS; P21 decision flow.
