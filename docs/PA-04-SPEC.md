# PA-04 — E-01 lab runner (Navigator minimum)

**Goal.** Run each E-01 pair (t1–t3 × model|manual) with one `workflow_dispatch` on the test repo `ecooorg/biforge-e01-lab`, using the default `GITHUB_TOKEN` (no PAT in chat). Collect a machine-readable run summary; the Assistant merges notes into `ARCHIVE/E01-NOTES.md` / `E01-RESULTS.json` via a patch on `bf`. Product code and Simple Mode are unchanged.

**Base.** `ecooorg/bf` after P19x/PA-02 and package.json scripts fix; lab repo exists with CI skeleton.

**May change (bf).** New: `docs/PA-04-SPEC.md`, `CONCEPTS/e01-task.yml` (copy target for lab), `CONCEPTS/e01-lab-SETUP.md`, `scripts/e01-notes-merge.mjs`, `tests/pa04-acceptance.test.mjs`, `tests/pa04-fixtures.json`. Changed: `docs/E01_LAB.md`, `docs/DELEGATION.md`, `docs/CURRENT_STATE.md`, `docs/NEXT.md`, `docs/REPO_MAP.md`, `CHANGELOG.md`, `package.json` (`test:pa04`).

**May change (lab, by Navigator upload once).** `.github/workflows/e01-task.yml` ← copy of `CONCEPTS/e01-task.yml`.

**Must not change.** `server/`, Simple Mode, `CODE_EXECUTOR` default, merge rights, production GitHub App, Railway, APP_VERSION.

**Behaviour.**
1. Lab workflow inputs: `task` ∈ {t1,t2,t3}, `side` ∈ {model,manual}.
2. Creates branch `biforge/e01-{task}-{side}`, writes package.json (single-test), ci.yml, task sources/tests as `.js`, opens PR to `main`, waits for checks (bounded), writes job summary + artifact `e01-run.json`.
3. No `schedule`. Permissions: `contents: write`, `pull-requests: write`, `actions: read`. Uses `GITHUB_TOKEN` only (same repo).
4. `scripts/e01-notes-merge.mjs` merges one or more `e01-run.json` (+ optional humanMinutes from CLI) into NOTES/RESULTS shapes for the Assistant to commit on `bf`.
5. Tier 3 unchanged: merge, ADR-10 decision, secrets creation, billing.

**Defaults chosen (Tier 1).**
- No fine-grained PAT required for lab runner (GITHUB_TOKEN on lab is enough).
- Notes still land on `bf` via Assistant patch (no write token to production by default).
- humanMinutes remain Navigator-supplied (one number per run) so TZ 11.9 stays meaningful.
- model and manual sides use the same file payloads in fixtures (lab measures process + CI; tool note for manual is `github-actions`).

**PASS criteria.**
- Machine (bf): `npm run test:pa04` green; docs check paths exist.
- Navigator (lab, once): upload `e01-task.yml` → Actions → Run workflow → t1/model → PR + green or recorded fail in summary.
- After three pairs + minutes: Assistant delivers `ARCHIVE/E01-RESULTS.json` patch; Navigator answers ADR-10 card.

**Read in the TZ.** 11.9, D-08, DELEGATION tiers.

**`CHANGELOG.md`.** "PA-04: E-01 lab workflow_dispatch runner (GITHUB_TOKEN) + notes merge helper."

**Not done / postponed.** Cross-repo auto-commit to `bf`; automatic humanMinutes; enabling product `model_patch`.
