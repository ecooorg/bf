# P36 — Workspace ChangeSet (human Apply / Reject / Rollback)

**Base.** Green CI for P35 + `docs/BiForge_TZ_P26.md` §8.1 / §12 / §15.

**May change.** ChangeSet parse helper, WorkspaceChangeSetCard UI, WorkspacePanel / App wiring for proposed sets, tests, version/docs.

**Must not change.** Extractors (P35), privacy-ack gate, secrets policy, server execution policy, export packages (P37), GitHub writes.

**Defaults chosen.** Reuse existing `validateWorkspaceChangeSet` / `applyWorkspaceChangeSet` / `rollbackWorkspace`. Agent proposals arrive as JSON (fenced or structured); nothing is written until Apply.

## Goal

Agent may propose file create/modify/delete/rename; the user sees a diff card and must **Apply** before any new workspace version is committed. Reject leaves the workspace unchanged. Rollback creates a new version restoring a prior snapshot.

## Scope

- `src/workspace/changeSetParse.ts` — parse/normalise agent ChangeSet.
- `src/WorkspaceChangeSetCard.tsx` — diff, violations, CI/lock confirm, Apply / Reject / Rollback.
- WorkspacePanel + App: surface proposed ChangeSet from assistant reply when present.
- `test:p36` — parse, validate-without-write, apply, rollback, stale sha blocked.

## Acceptance

- `npm run test:p36` green; prior workspace tests still green.
- typecheck / build / check green in CI.
- Manual: after privacy ack, inject a ChangeSet JSON in agent reply → card appears → Apply bumps version; Reject does not; Rollback restores prior content as a new version.

**Changelog.** P36 / product version 36.
