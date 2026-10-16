# P35 — Patch Report

## Implemented

- Added `src/workspace/extract.ts`: a unified FileContentExtractor for PDF (`unpdf`), DOCX/XLSX/PPTX (`jszip` + XML), CSV/TSV, JSON and plain text.
- Classification: ZIP files with a `.docx`, `.xlsx`, or `.pptx` extension are assigned class `office`.
- `readWorkspaceFile` and `buildWorkspaceBlock` use the extractor; blocks are marked as DATA (D-07).
- WorkspacePanel attachments and previews are built from extracted text; undecodable formats display accurate metadata.
- Secrets are still excluded from context unless explicitly approved.
- Original blobs are not modified.
- Test: `tests/workspace-p35.test.mjs` (`npm run test:p35`); product version 35.

## Verification

- Run locally in the patch environment: extractor unit fixtures (CSV, JSON, text, image metadata, minimal DOCX/XLSX, secret block, end-to-end ingest → read).
- CI must run: `npm run test:p35`, `npm run test:p34`, `npm run test:p27`, `npm run typecheck`, `npm run build`, `npm run check`.

## Limitations

- Images: metadata only (vision is a separate optional path when using a multimodal provider).
- Scanned PDFs without a text layer: metadata plus a note; do not falsely claim they were “analysed.”
- PPTX is supported by the extractor but is not required in UI fixtures.
- ChangeSet, export, and server-side versioning are covered by P36–P38.

## Navigator actions

1. After CI passes: Simple Mode → upload a text-based PDF → acknowledge privacy → ask about its contents.
2. Repeat with DOCX and XLSX/CSV.
3. Upload an image: neither the UI nor the agent response should claim that its contents were decoded.
4. Verify that Workspace text is not sent in a request without privacy acknowledgement.
