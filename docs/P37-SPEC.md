# P37 — Unified Workspace attach

**Base.** Green P35/P36. Goal: one intuitive attach path.

**May change.** WorkspacePanel attach UI/handlers; status copy; version/docs.

**Must not change.** Extractors, ChangeSet apply contract, privacy-ack requirement, server auth.

## Behaviour

- One primary **Attach** control (multi-file picker).
- Exactly one `.zip`/`.tar`/`.tar.gz`/`.tgz` → `ingestArchive` (unpack to tree).
- Only non-archive files (or a folder selection) → `ingestFiles`.
- Mix of archive + loose files → clear error (do not store opaque zip alongside files).
- `be:attach-files` (composer / drag-drop) uses the same handler.
- Optional **Folder** button when the browser supports directory pick.

## Acceptance

- Manual: Attach project zip → tree shows inner files, not a single `.zip` entry.
- Manual: Attach two text files → both in tree; after privacy ack, agent context includes them.
- typecheck / existing workspace tests still pass.
