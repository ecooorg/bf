# P37 — Report

## Implemented
- A single Attach button; ZIP/TAR archives are unpacked, while other files are added as entries.
- Drag-and-drop / Add file from the composer feeds into the same Workspace.
- Status displays the file count and the hint “describe what you want done.”
- Version 37.

## Verification
- CI: typecheck, test:p34–p36, check.
- Manual: upload a ZIP and inspect the internal file tree; acknowledge privacy and verify that the agent can see the files.
