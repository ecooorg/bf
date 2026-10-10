# Changelog

Format: newest first. Behavior changes must update tests and this file in the same step (TZ 16.3).

## Unreleased
- Patch A: `/health`, `/ready`, `/api/health` return `commit` (RAILWAY_GIT_COMMIT_SHA).
- Patch B: TZ updated (language rule 6.1.1, step rules in 16.3, BX-07 narrowed); CHANGELOG.md added.
- BX-07.a: `updateProjectState` requires a non-empty `sourceRef`; `project.created` event records `source_ref`; live test checks provenance on versions and events.
- BX-07.b: live test that Project State and history survive a service restart and the version counter continues.
- BX-07.c (part 1): `/project` UI (src/ProjectMode.tsx) is English; test text updated. Simple Mode (src/ui.ts, src/App.tsx) is still Russian — next part.
