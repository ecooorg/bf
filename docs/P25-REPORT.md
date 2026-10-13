# P25 preparation report

**Status:** PREPARED / NOT ACCEPTED. Product version remains 24. This report is a staging document; it does not claim G4 or P25 completion.

## Automation-first work

- Owner-approved priority “maximum automation” recorded in `docs/DELEGATION.md`.
- PA-03 staging evidence workflow prepared: `.github/workflows/staging-drills.yml`, `scripts/staging-drills.mjs`, `tests/pa03-acceptance.test.mjs`, `docs/PA-03-SPEC.md`.
- The workflow is manual-dispatch and staging-only. It does not mutate data, call models, restore backups, roll back deployments, merge, or deploy.

## Status boundaries

| Item | Status | Evidence / next action |
|---|---|---|
| P25 SPEC | PREPARED | `docs/P25-SPEC.md`; version bump deferred until G4 |
| RM-B4 scenario 18.1 | NOT_RUN | 12-row checklist in `ARCHIVE/P15-REPORT.md`; run only on staging with synthetic data |
| RM-E2 `/ops` | NOT_RUN live | Run `staging-drills` after owner configures staging secrets |
| RM-E4 restore | NOT_RUN | A migration-count check is not a restore; perform disposable restore on staging |
| RM-E5 rollback | NOT_RUN | Owner performs documented staging rollback and records elapsed time |
| RM-E6 capacity | PARTIAL / NOT_RUN | bounded health probe is not full capacity acceptance |
| RM-E7 security review | PARTIAL | static review recorded in `docs/THREAT_MODEL.md`; Railway logs / installed App roles unavailable |
| G2 / G3 / G4 | NOT_ACCEPTED | do not infer acceptance from this preparation patch |

## Required finalization

After upload to GitHub, use the actual commit SHA and Actions run URL to update the evidence records. Do not mark a step `[x]` until `docs/NEXT.md` rule 2 is satisfied. Version 2.0 remains blocked on the explicit G4 decision.
