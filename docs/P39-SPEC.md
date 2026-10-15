# P39 — File-work ingestion hardening

**Goal.** Make archive ingestion deterministic when a TAR archive contains repeated paths, preventing a later entry from silently replacing the first accepted file.

**Base.** Owner archive `bf-main (21).zip`, read 2026-10-15; status identifies P38 Export as the current baseline.

**Defaults chosen.** For exact duplicate TAR paths, first entry wins and each later occurrence is skipped with `duplicate_path`. Case-only collisions retain the existing `duplicate_case` behavior. This is the smallest security/stability improvement supported by the current file-work surface; no extraction or ChangeSet rules are changed.

**May change.** `src/workspace/ingest.ts`, `src/workspace/types.ts`, ingestion tests, version and patch documentation.

**Must not change.** Extractors, ChangeSet apply rules, export behavior, privacy gate, server execution policy, `tests/acceptance/**`.

**Files.** Ingestion duplicate handling and regression coverage; release metadata and status/report.

**PASS criteria.**
- `npm run test:p26a` and `npm run check` pass.
- A TAR archive with two regular entries of the same path imports the first content and reports the later entry as skipped.
- Existing ZIP ingestion behavior remains unchanged.

**Read in the TZ.** `docs/BiForge_TZ_v3.md` file-work/security requirements as applicable; existing P26a ingestion contract.

**Tests to add or change.** `tests/workspace-ingest.test.mjs`: duplicate TAR path first-wins regression.

**`CHANGELOG.md`.** P39 archive-ingestion hardening; no model or execution policy changes.

**Not done / postponed.** Raw duplicate ZIP central-directory entries cannot be reliably distinguished through the current JSZip object-keyed interface; this patch does not claim to solve that parser limitation. UI1 and MANUAL1 remain separate owner-gated work.

