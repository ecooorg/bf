# P21 — PR → human decision (pilot)

**Goal.** After a code task is DELIVERED, the product can run a structured `reviewer` pass (diff + CI/gate evidence → findings), then a human records a decision: accept, repair, or reject. Review gate evidence and audit follow from that path. Pilot closes the BX-22.b slice toward G3.

**Base.** Owner archive `bf-v20b.zip` (green main through P20b).

**May change.** `server/reviewer.ts` (new), `server/codeTaskService.ts`, `server.ts` routes, migration `012_code_task_decision.sql`, tests, docs, product version `21`.

**Must not change.** Simple Mode; merge still never automated; `model_patch` remains gated (E-01 / ADR-10); gate evaluation rules for individual gates; Repair Loop (P22).

## Behaviour

1. **reviewer (pure)** — `buildReviewFindings({ gates, commitSha, filesChanged, linesChanged, delivery, violations })` produces a schema-shaped findings list with severity `high|medium|low|info`. FAIL gates and test_integrity FAIL → high; BLOCKED / required NOT_RUN → medium. No model call required for the pilot (structure only; optional LLM fill later).
2. **Run review** — `POST .../code/:codeTaskId/review` (human session): requires status DELIVERED; loads current task gates; stores findings JSON on the code task (`review_findings`) and an audit event `code_task.reviewed`.
3. **Human decision** — `POST .../code/:codeTaskId/decide` with `{ decision: 'accept'|'repair'|'reject', reason?: string }`:
   - only on DELIVERED, once (idempotent read of existing decision);
   - `accept`: if unresolved high findings exist, requires non-empty `reason` (explicit override); records review gate approval PASS at head SHA when present; sets `decision=accept`;
   - `reject`: records review gate approval FAIL when head present; sets `decision=reject`;
   - `repair`: sets `decision=repair` (Repair Loop is P22; this only records the human intent);
   - all decisions write audit `code_task.decision`.
4. **Map** — code task API includes `decision`, `decisionReason`, `decisionAt`, `reviewFindings`.

## PASS criteria

- Machine: `npm run test:p21`, `npm run test:gate`, `npm run test:p20b`, typecheck/docs/version as in `check`.
- Owner:
  1. DELIVERED code task → `POST .../review` → findings with `hasUnresolvedHigh` reflecting gates.
  2. `POST .../decide` `{ decision: "accept", reason: "..." }` → `decision=accept`, review evidence when head exists.
  3. Second decide → conflict / unchanged existing decision.

## Read in the TZ

11.5 steps 7–9, 11.6 (trigger only), 12.4 Review, 16.4.2.a P21 / BX-22.b.

## Tests to add or change

- `tests/p21-acceptance.test.mjs` — pure reviewer rules; source contains routes and decision fields; docs present.

## Not done / postponed

- LLM-backed reviewer text (profile still structure-first).
- Repair Loop execution (P22 / BX-23).
- Full Project Mode UI for findings and decide buttons.
- Automatic PASS of the parent task.
