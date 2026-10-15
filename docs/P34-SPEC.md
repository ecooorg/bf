# P34 — Universal Workspace MVP

**Base.** Owner-provided `bf-main (15).zip` (14 October 2026).

**May change.** Workspace import UI, shared agent-request attachment handling, Project analysis input, persistence contract, tests, patch/version/changelog documentation.

**Must not change.** Existing agent behavior without workspace consent, server authorization boundaries, execution/merge/deployment permissions, existing state/approval workflows.

**Defaults chosen.** Accept arbitrary files for preservation; only decoded text is supplied as content, other formats are represented by metadata; cap context rather than adding new dependencies or external parsers.

## Goal
Make Workspace import available in the shared application surface so files can be attached to agent requests from Simple, Expert, and Project flows, and from the empty/new-project screen and Project Mode analysis.

## Scope
- Import individual files, multiple files, folders, ZIP, TAR, and TAR.GZ using the existing safe ingest pipeline.
- Persist content-addressed blobs in the local IndexedDB workspace.
- Do not include any workspace content in model requests until the user explicitly acknowledges the privacy notice.
- After acknowledgement, attach bounded readable text and safe metadata (maximum 40 files / 60,000 characters / 8,000 characters per file) to existing request `attachments`.
- Exclude entries flagged as secrets. Mark undecoded binary/specialized files as metadata only; do not claim that their raw binary contents were analyzed.
- Preserve original bytes and hashes; do not execute uploaded content.

## Files
- `src/WorkspacePanel.tsx`, `src/App.tsx`, `src/ProjectMode.tsx`
- `src/workspace/persistIngest.ts`, `tests/workspace-p27.test.mjs`, `tests/workspace-p34.test.mjs`, `package.json`, `src/config.ts`
- Version, changelog, current-state, next-work, and repository-map documentation.

## Acceptance
- `npm run test:p34` passes for individual-file ingest, persistence, reading and byte integrity.
- `npm run test:p27` passes, including SHA-keyed blob persistence.
- `npm run typecheck`, `npm run build`, and full `npm run check` pass in CI.
- Manual test: upload files in Simple, Expert, and Project Mode; verify no workspace attachments are sent before consent, and bounded attachments are present after consent.
- Manual test: image/PDF/office files remain preserved and are labeled as not decoded unless a format-specific decoder exists.

**Changelog entry.** Add P34 to `CHANGELOG.md` and `CHANGELOG_AGENT_BEHAVIOR.md`.

## Known limitations
- P34 does not add OCR, office/PDF extraction, image vision transport, or audio/video transcription. Such files are accepted and preserved, but only metadata is supplied for formats not decoded by the current text reader.
- Project Mode server-side versioning and shared storage remain separate work. Project analysis receives a bounded workspace excerpt in its existing task field; uploaded raw binary bytes are not sent to the model.
