# P36 — Patch Report

## Implemented

- Parser `changeSetParse.ts`: parses a ChangeSet from fenced JSON or a structured object.
- `WorkspaceChangeSetCard`: diff, violations, CI/lock confirmation, **Apply / Reject / Rollback**.
- The Workspace version does **not** change until Apply succeeds; validation does not write blobs.
- Rollback creates a **new** version with the target manifest; history is not rewritten.
- The app passes the proposed ChangeSet from `data.reply` when a JSON ChangeSet is found in the response.
- Documentation: §15 in `BiForge_TZ_P26.md` — parallel specifications and the rule that “a later green CI run closes earlier gates.”
- `test:p36`; product version 36.

## Verification

- CI must run: `test:p36`, `test:p35`, `test:p34`, `test:p26b`, typecheck, build, check.

## Limitations

- Export zip/diff — P37.
- Server-side versioning for Project Mode UX is tracked separately.
- The model must return a ChangeSet as JSON; free-form prose without JSON does not trigger the card.
