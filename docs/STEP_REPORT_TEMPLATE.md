# BX-XX — Step Report

> **Document:** STEP_REPORT_TEMPLATE · **Aligned with:** TZv3.0 (`docs/BiForge_TZ_v3.md`), sections 16.3 and 16.4 · **Date:** 9 October 2026
>
> **How to use.** For steps marked ★ and for gate steps, save the filled report as `docs/PNN-REPORT.md` and update `docs/CURRENT_STATE.md`. For all other steps the PR description is the report; use the same headings and omit the file. Replace `BX-XX` with the step ID (for example `BX-03.a`).

## Status
`PASS` / `FAIL` / `BLOCKED`

## Summary
- **Step:** BX-XX (★ yes/no)
- **Goal:**
- **Gate / phase:** (for example G0 / M0)
- **Development tool and model:**
- **Second-pass model (★ steps):**
- **Base branch:**
- **Base commit (`baseCommit` from SPEC):**
- **Result branch:**
- **Result commit:**
- **Pull Request:**

## Changes
| File | Change | Reason |
|---|---|---|
| `path/to/file` | Brief description | Acceptance criterion addressed |

## Acceptance criteria
Take the criteria from the PASS column of the step in TZv3.0, section 16.4, and from the step SPEC.

| Criterion | Evidence | Status |
|---|---|---|
| Criterion from the specification | CI check, test, diff, or other evidence | PASS / FAIL / BLOCKED / NOT_RUN / REAL_ONLY |

## Tests and checks
| Exact command/check | Result | Notes |
|---|---|---|
| `npm ci && npm run check` | PASS / FAIL / BLOCKED / NOT_RUN / REAL_ONLY | Actual output or reason |

Statuses: `PASS`, `FAIL`, `BLOCKED` (cannot be verified: no access, quota, or infrastructure), `NOT_RUN`, `REAL_ONLY` (provable only on a real provider or environment), `WAIVED` (set by the owner only, with a reason).

## Step checklist (TZv3.0, section 16.6)
- [ ] Changes stay within the SPEC boundaries; no unrelated edits
- [ ] Expectation tests (`tests/acceptance/**`) are not weakened or deleted
- [ ] No secrets in code, logs, reports, or the PR description
- [ ] Simple Mode behavior unchanged (`check` is green)
- [ ] Migrations are compatible one version back
- [ ] New dependencies are justified
- [ ] Error handling and budgets are not bypassed
- [ ] No vendor or model names in domain schemas, table names, field names, or logic (D-13)
- [ ] Connection changes are made together with `connectors.yaml` and `docs/CONNECTIONS.md`
- [ ] This report matches the facts

## Known issues and limitations
- List unresolved issues, pre-existing failures, unavailable checks, deviations from the SPEC, and assumptions.
- Write `None identified` only if that is accurate.

## Security and operational impact
- Secrets or permissions changed: Yes/No, with safe details.
- Production/deployment impact: Yes/No.
- Data migrations or destructive actions: Yes/No.
- ADR written or affected (ADR-XX): Yes/No.

## Artifacts
- Report:
- Patch/diff:
- Test output:
- Other relevant artifacts:

## Recommendation
- Suggested next step (BX-XX):
- Prerequisites or decisions needed from the owner:

## Evidence note
Do not claim a check passed unless it was executed and passed. A report does not replace review of the actual diff. A model's statement that tests passed is not evidence; `PASS` for code comes from CI.
