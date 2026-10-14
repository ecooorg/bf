# E-01 Notes (PA-04 lab runs → PA-05 close)

> Updated 13 October 2026 after six `workflow_dispatch` runs on `ecooorg/biforge-e01-lab`.
> Owner confirmed: CI green first attempt, fixes = 0, human time ≈ 15 s per pair.
> Decision: `ok ADR-10` (13 October 2026).

## Pair table

| Pair | Side | SHA | Branch | PR / CI | humanMinutes | fixes | ciGreenFirst |
|------|------|-----|--------|---------|--------------|-------|--------------|
| e01-t1 | model_patch | 40a6b31 | biforge/e01-t1-model | [PR #1](https://github.com/ecooorg/biforge-e01-lab/pull/1) | 0.25 | 0 | yes |
| e01-t1 | manual | 511b4b4 | biforge/e01-t1-manual | — (branch only) | 0.25 | 0 | yes |
| e01-t2 | model_patch | b5f08c3 | biforge/e01-t2-model | — (branch only) | 0.25 | 0 | yes |
| e01-t2 | manual | 0e97135 | biforge/e01-t2-manual | — (branch only) | 0.25 | 0 | yes |
| e01-t3 | model_patch | 002fb9a | biforge/e01-t3-model | — (branch only) | 0.25 | 0 | yes |
| e01-t3 | manual | 03f4683 | biforge/e01-t3-manual | — (branch only) | 0.25 | 0 | yes |

## Summary

- **Tool:** github-actions (PA-04 lab runner, `GITHUB_TOKEN` only)
- **All six workflow jobs:** Success
- **model_patch green with ≤ 2 fixes:** 3 of 3
- **Sum humanMinutes model:** 0.75
- **Sum humanMinutes manual:** 0.75
- **TZ §11.9 rule:** PASS (3/3 green, 0 fixes, model time ≤ manual time)
- **Note:** only t1-model created a PR; remaining runs recorded branch + SHA. CI status confirmed green first by owner.

## Decision

Owner: `ok ADR-10` (13 October 2026).  
ADR-10 status → **Accepted**. Product may enable `CODE_EXECUTOR=model_patch` (RM-C3) after the corresponding enablement step.
