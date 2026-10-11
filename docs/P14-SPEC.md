# P14 — Full Artifact Registry (BX-17.b)

**Goal.** Any file can be stored as an artifact (unknown format = binary), every version has a manifest, and a replaced or missing object is detected on read. TZ: 10.1-10.4, 16.4 (P14), BX-17.b, ADR-05, ADR-08. Builds on P04 (BX-17.a).

**Base.** Archive `bf-p13-main.zip` (repository after P13). `baseCommit`: owner fills in.

**Defaults chosen.**
1. Storage stays in PostgreSQL (`bytea`, up to 5 MB) behind `storage_ref = pg:<row id>`; S3 is a later adapter (ADR-05).
2. Migration `008`: table `artifact_manifests` (one row per version, `manifest` jsonb, `manifest_hash` = SHA-256 of `artifact_id|version|project_id|hash|size|storage_ref`). Versions older than P14 get a manifest in the same migration (idempotent). No change to `artifacts` or to migrations 001-007.
3. A version exists only with its manifest (one transaction). Reads check size and hash against both the row and the manifest; problems: `object_missing`, `manifest_missing`, `size_mismatch`, `hash_mismatch`, `metadata_mismatch`, `manifest_tampered`. The latest version is taken from rows and manifests together, so a deleted latest object is reported, not hidden by an older version; a version number is never reused.
4. Type comes from content (magic bytes, then valid UTF-8); declared mime is kept in the manifest as `declared_mime`. Kinds: `text`, `binary`, `archive`, `executable`. Executables are stored, `security_status = flagged_executable`, never run. Unknown content = `application/octet-stream`.
5. Limits: 5 MB per object, 200 versions per artifact, 1000 artifacts per project, file name 1-255 characters without separators or control characters, diff 2000 lines per side, preview 2000 characters (text only), archive listing 1000 names.
6. Operations: `saveArtifact` (text or bytes), `readArtifact`, `readArtifactBytes`, `verifyArtifact`, `inspectArtifact`, `diffArtifactVersions`, `listArtifactVersions`, `exportProjectManifest`. Archives are listed from the ZIP directory, never unpacked; names that could escape a folder are marked `unsafe`.
7. Deletion and retention (ADR-08): a project delete removes its artifacts and manifests (cascade); content is never written to logs.
8. No routes and no screen (domain part, as P13). Existing download route and `runAnalysis` keep working unchanged.

**Extended tests (TZ 16.4.4).** Item 7 (migrations): run on an empty database and an older-version upgrade, backfill twice. Item 9 (boundaries): 5 MB and 5 MB + 1, 200/201 versions, 999/1000/1001 artifacts, file name 255/256, empty content, empty diff. Item 12 (documents): `check:docs` now requires every file in `server/` and `tests/` and every `test:*` script to appear in `docs/REPO_MAP.md`. Group A (1-5) and the other group B items do not apply: no routes, no worker path, no plans.

**May change.** `server/artifactRepository.ts`, new `server/artifactFormat.ts`, `migrations/008_artifact_manifests.sql`, `tests/p14-*.test.mjs`, `scripts/check-docs.mjs`, `package.json`, docs, `CHANGELOG.md`.
**Must not change.** Simple Mode, `server.ts`, Router, adapters, `tests/acceptance/**`, migrations 001-007, earlier tests.

**PASS.** `npm run check` (with `test:p14`), `npm run build`, `npm run test:database:live` (with `tests/p14-live-acceptance.test.mjs`). Tamper or a missing object is detected; unknown format is stored as binary.

**Not done.** HTTP routes for upload and download of binary files, UI, S3 adapter, `artifact_relations` (Artifact Graph, TZ 10.5), text extraction from PDF/Word/Excel (reuse of `server/files.ts` is a later patch), `writesArtifact` link (P13b).

**Owner check (Railway, 2 actions).** After upload `/health` `commit` matches GitHub; open an existing project and its analysis artifact: it still opens (older versions were given manifests by the migration). Nothing else changes for the user.
