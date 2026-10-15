# P38 — Workspace export (full / changed / diff)

**Base.** Green CI v38 (UX1). Library `exportWorkspace` already from P26b.

**May change.** WorkspacePanel export UI; tests; version/docs.

**Must not change.** Extractors, ChangeSet apply rules, privacy gate, server execution policy.

## Behaviour

- **Download all (.zip)** — current version, original blob bytes, deterministic zip.
- **Changes only** — zip of paths that differ from previous version + `BIFORGE-CHANGES.md` (enabled when head ≥ 2).
- **Text diff** — unified diff vs previous version (enabled when head ≥ 2).

## Acceptance

- `npm run test:p38` (and existing `test:p26b` export tests) green.
- typecheck / check green.
- Manual: workspace with files → Download all; after Apply ChangeSet → Changes only / Text diff.
