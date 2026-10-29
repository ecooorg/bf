#
## P118.5.4 — Live script staged default + audit alignment

- `scripts/p118-architect-live.mjs`: stop sending `engine: 'pipeline'` (mapped to legacy and returned `LEGACY_DISABLED` on live commit `bd0e95d`). Build requests now use the staged default so exit evidence measures the Archive Delivery Canon path.
- Documentation: refreshed `docs/AI-NATIVE-RENOVATION-TASK.md` to match applied 5.1–5.3 and this fix; audit report `docs/AUDIT-2026-10-29.md`; DOCUMENTATION-INDEX entry; ARCHIVE-DELIVERY-CANON numbering aligned with shipped patches.
- Live transcript evidence (OBSERVED): build_request HTTP 409 `LEGACY_DISABLED` when script still forced pipeline — fixed in this patch (code path only; re-run live after deploy).
- CI on `bd0e95d` was PASS (26/26) after P118.5.3 adapter test fix; this patch does not change unit-test expectations beyond live client.

# P118.5.3 — CI: align stagedEnabled adapter test with P118.5.1 default

- `tests/app-builder-adapter-p93-3.test.mjs` expected `stagedEnabled({}) === false`; staged is default-on since P118.5.1. Test updated (applied on green CI `bd0e95d`).

## P118.5.2 — Archive delivery E2E proof

- Added `tests/archive-delivery-e2e-p118-5-2.test.mjs`: fake-model multi-file static_site build → JSZip open → required paths (`index.html`, `style.css`, `app.js`, `README.md`) + `build-report.json`.
- Delivery contract checks via `publicJob` + `classifyBuild` / `zipVerified` from `scripts/p118-architect-live-lib.mjs`.
- SUCCESS without `downloadUrl` or without a verified ZIP classifies as **FALSE_SUCCESS**.
- `package.json` patch field `118.5.2`; script `test:archive-delivery` runs archive-delivery unit + E2E tests.
- Live architect workflow already enforces ZIP verification; no live-script change required in this patch.
- P118 exit still requires Navigator review of evidence (offline tests + preferred live run).

## P118.5.1 — Archive Delivery Canon (implementation)

- Staged App Builder is the **default** A3 path (`stagedEnabled` true unless `APP_BUILDER_ENGINE=legacy|off|pipeline`).
- `POST /code/build` without `engine` → staged (202 + jobId). Missing DB/adapters → `STAGED_UNAVAILABLE` (not silent legacy).
- Legacy IR pipeline only with `engine=legacy` (or alias `pipeline`) **and** `ALLOW_LEGACY_APP_BUILDER=true`.
- Staged SUCCESS without a stored artifact is forced to failed (`archive_missing` / `artifact_save_failed`).
- `publicJob.downloadUrl` only when `artifactId` is set (artifact download route only).
- UI ProjectMode no longer sends `engine: 'pipeline'` on program build.
- Tests: `tests/archive-delivery-p118-5-1.test.mjs`.
- E2E download proof follows in P118.5.2.

## P118.4 — Documentation Order (DOC-ORDER-1)

- Introduced three protected primary documents at repository root:
  - `TECHNICAL_SPECIFICATION.md` — complete engineering specification (architecture, data model, API, three agents, REQ-IDs, acceptance).
  - `ROADMAP.md` — sequential implementation plan from empty repository through P118 and forward phases P119–P121.
  - `TECHNICAL_REPORT.md` — historical reconstruction and evidence record with confidence levels.
- Updated `AGENTS.md`: new laws **D1–D4** (protection against semantic reduction and fragmentation), status, reversal table, reporting requirements.
- Updated `docs/DOCUMENTATION-INDEX.md`: protected documents listed first; binding rules restated.
- Added `scripts/docs-integrity.mjs` — machine guard for existence, required sections and REQ-ID baseline.
- No runtime behaviour change. Version stays 118; patch field becomes `118.4`.

**Verification:** `node scripts/docs-integrity.mjs` must report PASS.  
**Not evaluated:** any product live run (this is a pure documentation + guard patch).

## P118.3.3 — Code-stage file marker repair (live run on 9ff44ac)

- Live evidence (OBSERVED, commit `9ff44ac`): spec and plan passed; unit `index.html` failed with `missing_expected_file_or_truncated`. The model returned a complete file (`finishReason=STOP`, 3703 chars) under the header `<<<FILE path>>>index.html`: it copied the placeholder `path` from the prompt. The parser read `path` as the file name. Reproduced locally with the same output shape.
- Prompt (`appBuilder/core-prompts.ts`): the coder prompt now names the real header `<<<FILE index.html>>>`; no copyable placeholder. `PROMPT_VERSION` → `static_site.v2` (invalidates cached unit results).
- Parser (`appBuilder/core-markers.ts`): with an expected path it deterministically accepts three known slips and reports them in `coerced`: placeholder header, decorated header (`path=index.html`), code fence around the content. A different file name is never accepted.
- Engine (`appBuilder/core-engine.ts`): one bounded repair call per file when the expected file is missing or the reply is cut off (counts against the call budget; skipped when the budget is used or the job is cancelled). New events `unit_attempt` (found paths, issues, `finishReason`, text preview, coerced) and `unit_repair`. Failure reason is now specific: `expected_path_not_found:index.html (found: …)`.
- Adapter (`server/appBuilderAdapter.ts`): `unitId` carried in event data is no longer dropped from application-log details.
- Tests: `tests/app-builder-unit-repair-p118.test.mjs` (7 tests, mutation-checked); `test:app-builder` script updated; cache-key test no longer uses the now-current prompt version as the "other" one.
- Not evaluated: hosted CI, a live run, later units/validators (`styles.css`, `storage.js`, `app.js`, `refs`, `acceptance`) and ZIP packing/verification — the live run has never reached them.

## P118.3.2 — Single version source (package.json) and documentation audit

- Version: `package.json` is the only source. New field `"patch"` (last applied patch, e.g. `118.3.2`); `"version"` must equal its first number. `src/config.ts` derives `APP_VERSION`/`APP_PATCH` from `package.json` (the browser bundle receives only these two fields via a Vite plugin); diagnostics `release` = `patch`.
- `scripts/check-version.mjs` validates `package.json` only; it no longer reads `src/config.ts`, `server.ts` or `CHANGELOG.md`. Tests in `tests/core.test.mjs` rewritten accordingly.
- `scripts/patch-tools.mjs` `versionPreflight` (called by `patch-pack`): `package.json` must be in every patch; patch number must match `--patch`, must be higher than the base patch and not below the program version.
- `tsconfig.json`, `tsconfig.server.json`: `resolveJsonModule`. `scripts/patch-quality-report.mjs`: version context from `package.json`.
- Documentation audit: `AGENTS.md` (new "Version and patch numbering", status, evidence rule, navigation), `docs/AI-OPERATING-RULES.md`, `docs/DOCUMENTATION-INDEX.md`, `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-NATIVE-RENOVATION-ROADMAP.md` (P118 exit gate), `docs/AI-USER-VALUE-REPORT.md` (new records, title fixed), `docs/AI-ENVIRONMENT-CONTEXT.md`, `docs/OPERATIONS.md`, `NEXT_PATCH.md`.
- Verification (local): `tsc` client+server, `build`, `test:core`, `test:app-builder`, `test:compact-ci-artifacts`, full `ci` DAG. Hosted CI and live workflow NOT_RUN.
- Known limitation: sub-patches share one program version; `/health` reports `version` and `commit` only (patch is in diagnostics `release`).

## P118.3.1 — CI repair for P118.3

- CI run on 1a98a6a was red (4 DAG nodes): `version-consistency`, `typecheck`, `build`, `test:compact-ci-artifacts`.
- Root causes: (1) P118.3 bumped APP_VERSION/package.json to 119 while the release label is P118.3 — `check-version` requires the CHANGELOG major to equal APP_VERSION; version restored to 118. (2) `appBuilder/core-engine.ts`: with `strict:false` TypeScript does not narrow `{ok:true}|{ok:false}` by `!x.ok`; failure fields are now read through `'error' in x` / `'issues' in x`. (3) `test:compact-ci-artifacts` (P105 end-to-end) failed only because it runs `version-consistency`; fixed by (1).
- No behavior change in the Spec repair logic.

## P118.3 — Spec bounded repair + assistant diagnostics

- Live #3: planner returned parseable JSON that failed Spec validation; recovery did not run (only on unparseable).
- Spec stage: explicit `schemaVersion:1`, `parseJsonLenient`, `validateSpec` with issue list, one recovery call that includes previous issues, concrete `failureReason` / `error.detail`.
- Diagnostics: `spec_attempt`/`spec_repair`/`spec_failed` events with text previews; adapter logs model `responsePreview` and forwards event data into application logs.
- Tests: `tests/app-builder-spec-repair-p118.test.mjs`.
- APP_VERSION stays 118 (version = phase number; sub-patches P118.x do not bump it).

