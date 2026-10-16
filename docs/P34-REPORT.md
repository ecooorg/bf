# P34 — Patch Report

## Implemented
- Added support for uploading one or more individual files; archive and folder imports remain supported.
- The shared Workspace panel is available in Simple, Expert, and Project Mode.
- After the user explicitly consents, a bounded text context and safe metadata are included in agent requests. In Project Mode, the context is bounded and appended to the analysis task within the existing API limit.
- Files marked with the `secret` flag are excluded from context. Undecoded binary and specialized formats are retained, but only their metadata is passed to the agent.
- Fixed ingest-result persistence: the store now accepts blobs keyed by SHA-256, matching the importer’s actual output while retaining backward compatibility with path keys.
- Added `test:p34`; the P27 test now uses the actual SHA-256 contract.

## Verification
- **NOT RUN:** dependency installation (`npm ci --ignore-scripts --no-audit --no-fund`) exceeded the environment time limit and did not complete.
- CI must run: `npm run test:p27`, `npm run test:p34`, `npm run typecheck`, `npm run build`, `npm run check`.
- Manual verification required: upload and consent in Simple, Expert, and Project; Workspace context must not be sent before consent.

## Limitations
- P34 does not add PDF/Office extraction, OCR, image-byte forwarding to a vision model, or audio/video transcription.
- Server-side Workspace versioning and shared Project Mode storage remain separate work.

## Navigator actions in Railway
1. After CI passes, open Simple Mode, upload a text file, acknowledge the privacy notice, and ask the agent to analyze it; verify the response against the file contents.
2. Repeat in Expert and Project Mode; verify that file text is not included in a request without consent.
3. Upload a PDF, image, or binary file and verify that it is retained and the UI clearly states when its contents have not been decoded.
