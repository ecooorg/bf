# PA-02 — E-01 harness (external script for Code Delivery experiment)

**Goal.** A script **separate from the product** (TZ 11.9) that runs the three-pair E-01 experiment against an approved **test** GitHub repository: for each task, apply `model_patch` (model API → validateModelPatch → commit → wait CI, up to 2 fixes) and record a comparable `manual` row. Output is a machine-readable table consumed by `scripts/gate-eval.mjs` for the ADR-10 decision card.

**Base.** Owner archive `bf-v24.zip`, PA-01 delivered, Navigator approved the test GitHub repository and ordered «P19x + сразу PA-02».

**May change.** New: `scripts/e01-harness.mjs`, `tests/pa02-acceptance.test.mjs`, `tests/pa02-fixtures.json`, `docs/PA-02-SPEC.md`. Changed: `package.json` (scripts), `scripts/gate-eval.mjs` (consume E-01 table if present), `docs/DELEGATION.md`, `docs/CURRENT_STATE.md`, `docs/NEXT.md`, `docs/REPO_MAP.md`, `CHANGELOG.md`.

**Must not change.** `server/` product behaviour (except what P19x owns), Simple Mode, production repository settings, APP_VERSION.

**Behaviour.**
1. Input: three task directories (or a fixture JSON), each with `PACKAGE.md` / structured package fields and prewritten acceptance tests.
2. For `model_patch` branch: call model (or accept pre-supplied JSON patch via `--patch-file` for dry runs), run the same `validateModelPatch` rules as the product, commit to `biforge/<task_id>` on the **test** repo only, open PR, poll check-runs up to a bound, allow up to 2 repair rounds.
3. For `manual` branch: record owner-supplied metrics (time, tool name, CI links) or a scripted path marked `SCRIPTED_HUMAN_STEP`.
4. Emit `e01-results.json`: three pairs with fields required by TZ 11.9 and PA-01 gate-eval (apply ok, CI green first try, fixes ≤ 2, human minutes, cost, SHA, CI https link).
5. Never writes to the production BiForge repository; never merges; only `workflow_dispatch`-style or one-off runs (GitHub/Railway conditions from the Navigator).

**Defaults chosen (Tier 1).**
- Human-time "not worse" = sum of minutes over three tasks (PA-01).
- Dry-run / fixture mode is the default in CI tests; live model and live test-repo require env (`E01_TEST_REPO`, tokens) and are `REAL_ONLY` without them.
- Manual branch may be filled from a JSON side-file so the owner is not blocked on tool choice.
- Script does not raise product version.

**PASS criteria.**
- Machine: `npm run test:pa02` green (fixtures: validation reject, table shape, gate-eval consumes table, no secret echo).
- Owner (when ready): create empty test repo, set secrets for the harness only, run one dry task, then three real pairs; upload `e01-results.json` into the evidence path used by gate-eval.

**Read in the TZ.** 11.9, 11.4, D-08.

**`CHANGELOG.md`.** "PA-02: E-01 harness script (external to product) for the three-pair Code Delivery experiment."

**Not done / postponed.** Automatic registration of live model calls into the product ledger (experiment is outside the product by design); Jules/cloud-agent automation for the manual branch (optional later).
