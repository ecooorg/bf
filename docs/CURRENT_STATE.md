# Current state

> Updated 13 October 2026 after PA-05 and PA-03 preparation. E-01 is closed; live staging drills have not run.

## Product

- Version **24**. P19x `driveModelPatch` gated; default `manual`.
- ADR-10 **Accepted** (2026-10-13). Owner may enable `CODE_EXECUTOR=model_patch` (RM-C3).
- CI: `test:p19x` / `test:pa02` / `test:pa04` scripts present.

## E-01

- Lab: `ecooorg/biforge-e01-lab`.
- **Closed.** Six pairs recorded in `ARCHIVE/E01-NOTES.md` + `ARCHIVE/E01-RESULTS.json`.
- TZ §11.9: PASS (3/3 green first, 0 fixes, model humanMinutes 0.75 ≤ manual 0.75).
- Owner decision: `ok ADR-10` (13 October 2026).

## Gates

- ADR-10 **Accepted**. Stage C (P19x enablement) open on owner command.
- RM-B5 and RM-B6 closed. Next gate steps remain owner actions (RM-B4, RM-B7, …).

## Maximum automation

- Owner decision (13 October 2026): maximum automation is a core project priority. Prefer bounded workflows/scripts and evidence artifacts for repetitive tasks.
- Delegation tiers remain unchanged. The owner retains Tier 2/3 decisions, secrets, live permissions, merges, deployments, billing and acceptance-test approval.
- PA-03 staging workflow prepared in `.github/workflows/staging-drills.yml`; it requires a dedicated staging service/database and synthetic data. It does not restore, roll back, write to the database, or call models.
- P25 draft prepared in `docs/P25-SPEC.md`; product version stays 24 until G4 is explicitly accepted.
