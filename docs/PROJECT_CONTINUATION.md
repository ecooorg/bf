# Project Mode — Existing Project Continuation (P127.6)

## Purpose

P127.6 adds a project-scoped continuation entry point for the staged App Builder. A continuation is based on a verified ZIP artifact already stored in the same BiForge project. It is not a greenfield build.

## API

`POST /api/projects/:projectId/code/continue`

Request body (strict):

```json
{
  "goal": "Add a pause button while preserving the current game",
  "artifact_id": "app_zip_...",
  "version": 2
}
```

`version` is optional and defaults to the latest verified artifact version. The artifact must be a ZIP belonging to the requested project. The route requires the staged engine, database, and configured model adapters. It returns HTTP 202 with a build job ID and status URL.

## Source handling and safety

- Artifact bytes are read through the artifact repository, which verifies content hashes and manifest integrity.
- The ZIP is CRC-checked before its contents are used.
- Absolute paths, parent traversal segments, and backslash paths are rejected.
- Only UTF-8 text files are currently accepted; binary assets fail explicitly with `CONTINUATION_BINARY_UNSUPPORTED` rather than being silently corrupted or dropped.
- At most 80 files and 80,000 characters of text are admitted into the model context. Larger source archives fail explicitly with `CONTINUATION_LIMIT`; they are never silently truncated.
- The continuation prompt identifies the source artifact and version, includes the existing files, and instructs the builder to preserve unrelated behavior and make the smallest coherent changes.
- The staged builder persists the composed task text with the job, so the existing job recovery mechanism can resume the continuation.
- New build output is saved as a new artifact; the base artifact remains immutable.

## Current limitation

This patch supplies text-only source files as bounded context to the staged builder. Projects containing binary assets are rejected for continuation in this initial implementation; preserving binary assets requires the workspace/artifact integration planned for P127.7. It does not yet provide a full repository-aware patch/diff engine or a user interface for selecting prior versions. Those are follow-up work: P127.7 (artifact workspace) and P127.8 (recovery, navigation, acceptance).

## Acceptance checks

- A source ZIP from another project is rejected.
- A non-ZIP or missing artifact is rejected.
- Corrupt ZIPs and unsafe paths are rejected.
- Source context contains the selected artifact ID, version, and file contents.
- A continuation starts a new staged job without overwriting the source artifact.
- Simple and Expert routes, prompts, and UI remain unchanged.
