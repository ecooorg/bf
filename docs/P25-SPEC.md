# P25 — Final acceptance package and BiForge v2.0 (G4)

**Status:** draft prepared in advance; version bump is explicitly deferred until G4 is accepted by the Navigator.

## Goal

Prepare the final acceptance/reporting patch without claiming that production operations, owner acceptance tests, or G4 are complete. P25 may update the product version to `2.0` only after the G4 decision is recorded and the required evidence is present.

## Scope

- Reconcile `docs/NEXT.md`, `docs/CURRENT_STATE.md`, `docs/REPO_MAP.md`, `CHANGELOG.md`, and `docs/P25-REPORT.md` with recorded evidence.
- Preserve evidence-first gate evaluation: `NOT_RUN`, `PARTIAL`, `BLOCKED`, and `REAL_ONLY` do not satisfy a gate.
- Keep the existing product version at 24 until G4 is accepted.
- Record the final pilot measurements (cost, human time, executor runs, model calls, Test Integrity, CI and human decision) without secrets.

## Must not do

- Do not bump `package.json`, README or deployment version to 2.0 before G4.
- Do not merge PRs, deploy, create secrets, grant GitHub App write rights, change billing, or accept protected acceptance tests.
- Do not mark a step `[x]` without its date, commit SHA and CI/run link as required by `docs/NEXT.md` rule 2.

## PASS criteria

- `npm run check` and `npm run build` pass in CI.
- `docs/P25-REPORT.md` lists evidence for RM-F1…RM-F6 and all unresolved items honestly.
- The owner has explicitly accepted G4; only then may a separate version-release patch set the version to `2.0`.
