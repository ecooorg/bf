# P40 — Mandatory patch delivery contract

**Goal.** Ensure any model/session delivers a verified ZIP of the actual changed/new repository files, suitable for manual application through GitHub, or explicitly reports `DELIVERY BLOCKED`.

**Base.** Owner archive `bf-main (21).zip`, read 2026-10-15; repository state reports product v40 after P39.

**Defaults chosen.** This is a process-only patch: product behavior and `APP_VERSION` remain unchanged. P40 names the process patch, not a product release. The default output of the canonical packer becomes `bf-P40.zip` when invoked with `--patch P40`; an explicit `--out` remains supported.

**May change.** `AGENTS.md`, `docs/PATCH_PROMPT.md`, `docs/START_HERE.md`, `docs/STATUS.md`, `docs/NEXT.md`, `docs/PATCH_JOURNAL.md`, `CHANGELOG.md`, `scripts/patch-pack.mjs`, and the existing P13a acceptance test.

**Must not change.** Product behavior, product version, CI workflow, permissions, deployment behavior, and `tests/acceptance/**`.

**PASS criteria.**
- The primary artifact is explicitly documented as `bf-PNN.zip`; `.patch`/`.diff` cannot substitute.
- If no verified ZIP can be produced, the final status must be `DELIVERY BLOCKED`; artifact validity is distinct from test/CI status.
- The canonical packer defaults to `bf-PNN.zip` and verifies archive contents by read-back before reporting success.
- Regression test covers the documentation contract and packer implementation.
- `node scripts/check-version.mjs`, `node scripts/check-docs.mjs`, and `npm run test:p13a` pass where dependencies allow.

**Not done / postponed.** No GitHub automation, repository settings, workflow changes, product release, or UI1 implementation.
