# P35 — Universal File Analysis

**Base.** Owner-approved `docs/BiForge_TZ_P26.md` (15 Oct 2026) + green CI after P34.

**May change.** `src/workspace/extract.ts` (new), classify office detection, context read path, WorkspacePanel attachment/preview, tests, version/changelog/docs.

**Must not change.** ChangeSet apply, export integrity paths, server auth, execution/merge/deploy, privacy-ack gate, injection corpus expectations.

**Defaults chosen.** No new npm dependencies: PDF via existing `unpdf`, Office via existing `jszip` + pure XML (same approach as `server/files.ts`). Context caps unchanged (40 files / 60 000 / 8 000). Vision deferred to optional provider path (metadata only for images in P35). LLM not called at ingest.

## Goal

Give the agent real extracted content from PDF, DOCX, XLSX/CSV, JSON/YAML/XML, source and plain text across Simple, Expert and Project workspace flows — not only file names and undecoded metadata.

## Scope

- Shared `FileContentExtractor` (`src/workspace/extract.ts`) on the storage host.
- Classify `.docx` / `.xlsx` / `.pptx` (zip magic) as `office`.
- `readWorkspaceFile` / `buildWorkspaceBlock` / WorkspacePanel attachments use extract + DATA markers (D-07).
- Secrets still excluded without explicit approval.
- Original blobs never mutated.
- `test:p35` covers classify, CSV/JSON/text, image metadata, DOCX/XLSX fixtures, e2e ingest→read, secret block.

## Out of scope

- ChangeSet apply / rollback (P36).
- Export packages (P37).
- Server-side Workspace versioning UX.
- OCR; mandatory vision; new heavy deps (`mammoth`, SheetJS).

## Acceptance

- `npm run test:p35` green.
- `npm run test:p34`, `test:p27` still green.
- `npm run typecheck`, `npm run build`, full `npm run check` green in CI.
- Manual: upload PDF/DOCX/XLSX/CSV in Simple after privacy ack; agent context contains extracted text or honest “not decoded” note.

**Changelog entry.** Add P35 to `CHANGELOG.md` and bump product version to 35.
