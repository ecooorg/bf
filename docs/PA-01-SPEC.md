# PA-01 — Evidence Bot and gate evaluator

**Goal.** Evidence for steps of `docs/NEXT.md` that need no human judgement is collected by one manually triggered workflow, and the decision rules of TZ 11.9 and 17 are applied by code, producing decision cards (`docs/DECISION_CARD_TEMPLATE.md`). Process tooling: no product change.

**Base.** Owner archive `bf-v24.zip` (13 October 2026), CI green on `main`; the owner uploaded `CONCEPTS/DELEGATION_PROPOSAL.md`, `CONCEPTS/DECISION_CARD_TEMPLATE.md`, `CONCEPTS/PA-01-SPEC_DRAFT.md` (superseded by this patch).

**May change.** New: `scripts/gate-eval.mjs`, `scripts/evidence-collect.mjs`, `.github/workflows/evidence.yml`, `tests/pa01-acceptance.test.mjs`, `tests/pa01-fixtures.json`, `docs/PA-01-SPEC.md`, `docs/DELEGATION.md`, `docs/DECISION_CARD_TEMPLATE.md`. Changed: `package.json` (scripts), `AGENTS.md` (new section 12, policy approved by the Navigator), `docs/START_HERE.md`, `docs/NEXT.md`, `docs/CURRENT_STATE.md`, `docs/REPO_MAP.md`, `CHANGELOG.md`.

**Must not change.** `server/`, `src/`, Simple Mode, existing workflows, `tests/acceptance/**`, repository settings, `APP_VERSION` (precedent: PI-01…PI-03).

**Behaviour.**
1. `gate-eval.mjs` reads evidence JSON and prints decision cards for ADR-10 (E-01 rule of TZ 11.9) and G1a, G1, G2, G3, G4. A step is satisfied only with `PASS` plus a record; `PARTIAL`, `NOT_RUN`, `BLOCKED`, `REAL_ONLY` never accept a gate; a `FAIL` rejects.
2. `evidence-collect.mjs` runs read-only checks: `/health` commit equals the expected `main` commit and `/ready` (RM-A3, RM-A4); optional one Simple Mode answer when `APP_PASSWORD` is set (RM-A3); `verify:connections` for connectors whose secrets are present (RM-A4, RM-B2, RM-D1). It emits `PASS` only where the checks cover the whole PASS criterion; otherwise `PARTIAL`.
3. `evidence.yml`: `workflow_dispatch` only, `permissions: contents: read`, secrets by name, result in the job summary and an artifact. It never commits, pushes or changes settings.

**Defaults chosen (change if you disagree).**
- Evidence is delivered as an artifact and job summary; recording it in the repository goes through the normal patch upload. Commit-back from the workflow is not enabled (needs `contents: write`; policy decision).
- E-01 "not worse in human time" = summed minutes over three tasks, not the median. `model_patch` succeeded but slower gives `NEEDS_HUMAN`, not an automatic branch.
- A success of one E-01 pair is: patch applies, final CI green, at most 2 fixes. Every row needs a SHA and an https CI link, otherwise `INSUFFICIENT_EVIDENCE`.
- Gate requirements: G1a = RM-B1; G1 = RM-B2, RM-B3; G2 = RM-B4, RM-B5, RM-B6; G3 = RM-D1…D5 (plus RM-C2, RM-C3 after a POSITIVE E-01); G4 = RM-E1…E7 and RM-F1…F6. Stage A is not a gate requirement.
- `OWNER_ATTESTED` closes only `RM-A2` and `RM-B1`. The existing owner statements on scenario 18.1 and E-01 in `ARCHIVE/P15-REPORT.md` stay `NOT_RUN` until data is recorded.
- Variable `SERVICE_URL` is a repository variable, not a secret. `APP_PASSWORD` (optional) is a new repository secret; without it the answer smoke is `NOT_RUN`.
- Smoke login and `/api/conversation` shapes are copied from `scripts/acceptance-s2-05.mjs`; they are unverified against the live service (`REAL_ONLY` until the first run).

**PASS criteria.**
- Machine: `npm run check` and `npm run build` green in CI; `npm run test:pa01` proves the E-01 outcomes, the gate rules, secret scrubbing, collector behaviour on fake responses and workflow safety.
- Navigator (GitHub, 3 actions):
  1. Settings → Secrets and variables → Actions → Variables: add `SERVICE_URL` (the Railway service URL). Optional secret `APP_PASSWORD`.
  2. Actions → `evidence` → Run workflow → the job summary shows `RM-A3` / `RM-A4` rows.
  3. Same summary → card G2 lists missing rows as `NOT_RUN` and says `COLLECT_MORE`.

**Read in the TZ.** 11.9, 17, 18.1, 16.3.

**`CHANGELOG.md`.** "PA-01: evidence workflow and gate evaluator (process tooling, no product change)."

**Not done / postponed.** PA-02 (E-01 harness; needs a test GitHub repository, not yet approved). PA-03 (staging drills: rollback, restore, capacity, alerts, scenario 18.1 with `SCRIPTED_HUMAN_STEP` marks; staging allowed). Commit-back of evidence. Reading Railway logs for quota lines.
