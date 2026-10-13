# PA-01 — Evidence Bot and gate evaluator (SPEC DRAFT)

> Status: **DRAFT**, waits for the Navigator's command. Will move to `docs/PA-01-SPEC.md` when the patch starts. Follows `docs/PATCH_TEMPLATE.md`.

**Goal.** Evidence for steps of `docs/NEXT.md` that need no human judgement is collected by one manually triggered workflow, and the decision rules of TZ 11.9 and 17 are applied by code, producing decision cards (`CONCEPTS/DECISION_CARD_TEMPLATE.md`).

**Base.** Owner archive `bf-v24.zip` (13 October 2026), CI green on `main`.

**May change.** New: `scripts/gate-eval.mjs`, `scripts/evidence-collect.mjs`, `.github/workflows/evidence.yml`, `tests/pa01-acceptance.test.mjs`, `tests/pa01-fixtures.json`, `docs/PA-01-SPEC.md`. Changed: `package.json` (scripts `evidence:collect`, `gate:eval`, `test:pa01`, added to `check`), `docs/REPO_MAP.md`, `docs/NEXT.md` (links only), `CHANGELOG.md`, `docs/CURRENT_STATE.md`, `connectors.yaml` and `docs/CONNECTIONS.md` if a new secret name is introduced.

**Must not change.** Product code in `server/` and `src/`; Simple Mode; existing workflows; `tests/acceptance/**`; repository settings. No `APP_VERSION` bump (precedent: PI-01…PI-03 did not bump).

**Behaviour.**
1. `gate-eval.mjs` reads evidence rows (JSON) and prints a decision card. Rules:
   - **ADR-10 / E-01** (TZ 11.9): input is three pairs `{task, executor, applies, ci_first_green, fixes, human_minutes, cost, sha, ci_url}`. POSITIVE: `model_patch` reached green CI within 2 fixes in at least 2 of 3 tasks and its summed human time is not above `manual`. NEGATIVE: `model_patch` reached fewer than 2 and `manual` reached at least 2. BOTH_FAILED: both fewer than 2. Anything else: `NEEDS_HUMAN`. A missing row: `INSUFFICIENT_EVIDENCE`.
   - **G2 / G3 / G4** (TZ 17): each condition maps to step ids of `docs/NEXT.md`; the card is `ACCEPT` only if every mapped step is `PASS` (or `OWNER_ATTESTED` where the SPEC allows) with a record path; `NOT_RUN`, `BLOCKED`, `REAL_ONLY` give `COLLECT_MORE`.
2. `evidence-collect.mjs` (checks that need no human): service `/health` commit equals the latest `main` commit (A3); `verify:connections` for configured connectors (A4, B2, D1); output is JSON with status per check, never secret values.
3. `evidence.yml`: `workflow_dispatch` only, `permissions: contents: read`, secrets by name only, the result is a job summary and an artifact. It does not commit, does not push, does not change settings.

**Defaults chosen (change if you disagree).**
- Evidence is delivered as an artifact and job summary; recording it into the repository goes through the normal patch upload. Commit-back from the workflow is not enabled (it needs `contents: write` and a policy decision).
- "Not worse in human time" is the sum over three tasks, not the median.
- The workflow targets the existing service URL only for read-only checks (`/health`, `/ready`). Destructive drills (rollback, restore) and the scenario 18.1 run belong to PA-02/PA-03 and a staging environment.
- A new secret is not required for A3 if `SERVICE_URL` is a variable, not a secret. `GEMINI_API_KEY` and `GROQ_API_KEY` already exist in the workflows.

**PASS criteria.**
- Machine: `npm run check` and `npm run build` green in CI; `tests/pa01-acceptance.test.mjs` proves the three E-01 outcomes, `NEEDS_HUMAN`, `INSUFFICIENT_EVIDENCE`, and that G-cards never say `ACCEPT` with a `NOT_RUN` row; the evidence JSON contains no value of any variable named `*KEY*`, `*SECRET*`, `*PASSWORD*`.
- Navigator (Railway/GitHub):
  1. GitHub → Actions → `evidence` → Run workflow → job summary shows `/health` commit equal to `main`.
  2. Same run → connector checks show `OK` or `NOT_RUN(reason)`.
  3. Open the generated card for G2 → it lists every missing row as `NOT_RUN`.

**Read in the TZ.** 11.9, 17, 18.1, 16.3.

**Tests to add.** `tests/pa01-acceptance.test.mjs` (rules, no-secret check, workflow permissions are `contents: read`).

**`CHANGELOG.md`.** "PA-01: evidence workflow and gate evaluator (process tooling, no product change)."

**Not done / postponed.** PA-02 (E-01 harness: scripted `model_patch` arm, test repository, CI wait loop). PA-03 (staging environment and drills: rollback, restore, capacity, alerts, scenario 18.1 with `scripted_human_step` marks). Commit-back of evidence. Any change to `AGENTS.md` (separate policy patch for `CONCEPTS/DELEGATION_PROPOSAL.md`).

**Open decisions for the Navigator (tier 2).**
1. Approve `CONCEPTS/DELEGATION_PROPOSAL.md` as policy (needs a separate `AGENTS.md` change patch).
2. Start PA-01 now, or P19x preparation first.
3. Allow a staging environment on Railway for PA-03 (cost and variables) and a test GitHub repository for PA-02.
