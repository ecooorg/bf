# ADR-10 — CodeExecutor composition after E-01

## Status: Accepted (2026-10-13)

## Context
BiForge_TZ_v3.md §11.9 requires a three-pair experiment comparing `manual` with `model_patch` on the same small real tasks, using prewritten acceptance tests. The decision threshold is defined by the TZ and must be based on measured results, not synthetic tests.

## Evidence
E-01 was executed on 13 October 2026 via the PA-04 lab runner on `ecooorg/biforge-e01-lab` (six `workflow_dispatch` runs, `GITHUB_TOKEN` only). Results are recorded in:

- ARCHIVE E01-NOTES (off-repo)
- ARCHIVE E01-RESULTS (off-repo)

| Metric | Value |
|--------|-------|
| model_patch green (≤ 2 fixes) | 3 of 3 |
| max fixes (model) | 0 |
| sum humanMinutes (model) | 0.75 |
| sum humanMinutes (manual) | 0.75 |
| TZ §11.9 rule | **PASS** |

Owner decision (chat, 13 October 2026): `ok ADR-10`.

## Decision
**Accepted.** The product may enable `CODE_EXECUTOR=model_patch`.

- Default remains `manual` until the owner explicitly sets the Railway / environment variable (or equivalent) to `model_patch` (RM-C3).
- BX-21.b (P19x) implementation already present and gated; enablement is now authorized by this ADR.
- No change to Simple Mode. No automatic enablement on deploy.

## Decision rule applied
TZ §11.9 without modification: `model_patch` ≥ 2 of 3 green CI within ≤ 2 fixes each, and sum(humanMinutes model) ≤ sum(manual). Condition met.

## Consequences
- RM-B5 (E-01) and RM-B6 (ADR-10 decision) closed.
- Stage C (P19x enablement path) is open on owner command.
- G2 evidence package can proceed once remaining Stage B owner steps are recorded.
- Rollback: set `CODE_EXECUTOR=manual` (or unset) at any time; no data migration required.
