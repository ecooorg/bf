# P22 — Repair Loop

**Goal.** A delivered code run that failed CI, has a high review finding, or was sent back by a human can enter a bounded Repair Loop: classify the failure, open at most two repair packages, or stop with a diagnostic artifact and a human decision. One flaky CI restart does not open a new executor run.

**Base.** Owner archive `bf-v21.zip` (green main through P21).

**May change.** `server/repairLoop.ts` (new), `server/codeTaskService.ts`, `server.ts`, migration `013_repair_loop.sql`, tests, docs, product version `22`.

**Must not change.** Simple Mode; merge still never automated; `model_patch` remains gated; gate rules; acceptance tests under `tests/acceptance/**`.

## Behaviour

1. **Pure rules** — `classifyFailure` maps gates to `security|lint|build|test|criteria|other` and a stable error signature. `evaluateRepairStop` stops on `max_attempts` (default 2 repairs already opened), identical `diffHash`, identical error signature, failing-test count not strictly lower than the previous attempt, or budget.
2. **`POST .../code/:codeTaskId/repair`** (human, latest DELIVERED only):
   - trigger: decision `repair`, `reject` with a reason, unresolved high findings, or body `trigger` `ci|reviewer|human`;
   - `flaky: true` once → `ci_restarts=1`, action `ci_restart`, no new run;
   - otherwise stamp signature / optional `diff_hash` / `failing_tests`;
   - stop → `REPAIR_DIAGNOSIS.md` artifact, `repair_stop_reasons`, audit `code_task.repair_stopped`, action `stopped`;
   - else new `WAITING_HUMAN` code task (`repair_of` = parent) whose executor prompt includes the failure report. Merge stays human-only.
3. Repeat call while a child is open returns that child. Repeat call after stop returns `stopped`.

## PASS criteria

- Machine: `npm run test:p22`, `npm run test:p21`, docs + version checks.
- Owner: 1) DELIVERED + `{ trigger: "ci", failing_tests: 3 }` → child `WAITING_HUMAN` or stop with reasons. 2) Same task with `flaky: true` first → `ci_restart` and no extra attempt. 3) Second identical diff hash → `stopped` includes `identical_diff` and a diagnostic artifact.

## Read in the TZ

11.6, 16.4.2.a P22 / BX-23, G3 note.

## Tests

`tests/p22-acceptance.test.mjs` — stop reasons (limit, identical diff, no progress, budget, identical error), diagnostic text, classify, route present.

## Not done

- Automatic CI re-run on GitHub.
- LLM repair author (`model_patch` still gated).
- Project Mode UI.
- Counting failing tests from raw CI logs (caller supplies `failing_tests`; logs are not interpreted).
