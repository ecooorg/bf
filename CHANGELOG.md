## P119.0.7 — Commit-bound Release Gate

- Added manual `.github/workflows/p119-release-gate.yml`: runs the full CI verification DAG with PostgreSQL, Playwright UI checks, live Conversational/Expert checks, live UI/agent-entry checks, and the Architect build/validator/verified-ZIP regression.
- Added `scripts/p119-release-evidence.mjs`: records the full checkout SHA, workflow run identity, and each required check outcome; fails closed unless every required check succeeded. Evidence explicitly remains pending Navigator formal acceptance.
- Reuses the existing live smoke and Architect regression scripts; does not alter agent prompts, routing, legacy behavior, or product runtime. `ALLOW_LEGACY_APP_BUILDER` remains unused and legacy remains disabled by default.
- Version/patch: `119` / `119.0.7`. Hosted execution and live evidence are NOT_RUN until the manual workflow is dispatched.

## P119.0.6 — Architect live ZIP regression and legacy decision boundary

- Added manual `p119-regression` workflow: fail-closed deployed commit preflight followed by the existing P118 live Architect build, validators, ZIP inspection/download and refusal controls. Artifacts stored under `p119-regression/`; no automatic CI duplication.
- Advanced raw JSON remains a gated project diagnostic view, not a fourth agent. Legacy `engine=legacy` remains disabled by default and gated until host configuration is confirmed; removing it without deployment evidence risks regression.
- Workflow inventory tests updated; patch metadata advanced to 119.0.6. Live staging execution NOT_RUN locally.

## P119.0.5 — Manual deployed-commit agent smoke workflows

- Added manual `p119-agent-contracts` and `p119-ui-smoke` workflows, using a shared live-smoke runner. Both require staging secrets, authenticated session and `/health` commit equality with the checked-out SHA; they fail closed on missing configuration or mismatched deployment.
- Contracts smoke checks real Conversational and Expert replies plus Architect session/API availability; UI smoke checks the served HTML and live agent entry endpoints. Neither claims Architect build-to-ZIP or browser interaction (reserved for P119.0.6/0.7). No duplicated CI or Playwright menu tests.
- Evidence artifacts contain status/verdict only, not response text, passwords or cookies. Live execution NOT_RUN pending staging secrets and matching deployed commit.
- Version/patch: `119` / `119.0.5`.

## P119.0.4 — Agent-owned prompt text, agent-named chat routes, dead legacy import removed

- Navigator decisions (2026-10-29): add agent-named routes and keep the old one; legacy `engine=legacy` host usage unknown, so only the dead import is removed.
- Prompt text: intro paragraphs, `expertDialogueParagraph`, `EXPERT_STAGES` and `EXPERT_STEP_PREFIX` moved from `server/promptPacks.ts` into `server/conversationalAgent.ts` / `server/expertAgent.ts`. `promptPacks.ts` keeps the shared method/boundary/contract blocks plus `assembleConversationPrompt`; `buildSimpleConversationPrompt` and `ProductMode` removed. Model-facing bytes unchanged: SHA-256 of 8 prompts (2 agents × 4 modes), the Expert paragraph and the step prefix were captured from the P119.0.3 implementation before the move and now locked in tests.
- Routes: new `POST /api/agent/conversational` and `POST /api/agent/expert` pin the agent (`pinConversationAgent`; the route overrides `body.productMode`). `POST /api/conversation` stays and still selects by `productMode`. One shared handler (`conversationHandler`). The client (`src/conversationRoutes.ts`, `ConversationScreens.tsx`, `App.tsx`) calls the named routes.
- `server.ts` no longer imports `runAppBuilderPipeline` / `irFromPlainAnswers` (the import was unused). The gated `engine=legacy` branch in `server/projectRoutes.ts` is unchanged.
- Tests: new `tests/p119-agent-prompts-routes.test.mjs` (in `test:core` and `test:p119-agents`); HTTP checks R1–R10 added to `tests/pipeline.test.mjs`; new helper `tests/_prompts.mjs`; `KNOWN_SHARED_PATH` tests in `tests/p119-agent-boundaries.test.mjs` updated; `core`, `conversation-turn`, `pipeline` and `p119-agent-isolation` tests now import from the agent modules.
- Generated inventories regenerated (`docs/generated-route-inventory.json`, `-module-map`, `-check-graph`, `-capability-graph`); `tests/feature-manifest.json` lists the new routes.
- Docs: `TECHNICAL_SPECIFICATION.md` §6.4 (status, route table, REQ-AGENT-001/003/004), `ROADMAP.md` Phase 6 table, `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-USER-VALUE-REPORT.md`.
- Version/patch: `119` / `119.0.4`.

## P119.0.3 — Conversational/Expert isolation (first bounded step), legacy names removed from user copy

- Added `server/agentRouting.ts`, `server/conversationalAgent.ts`, `server/expertAgent.ts`: agent selection, turn planning and prompt entry are agent-owned; `server.ts` handler delegates. Output byte-identical to the pre-split logic (verified against a reference copy). Route `POST /api/conversation`, wire key `productMode`, internal `AppMode` keys and `promptPacks.ts` text intentionally unchanged.
- User-visible copy: `UserGuide.tsx` and the Architect confirmation dialog use only Conversational / Expert / Architect.
- Tests: new `tests/p119-agent-isolation.test.mjs`; `tests/p119-agent-boundaries.test.mjs` updated; both in `test:core`; new script `test:p119-agents` includes them.
- Docs: ROADMAP Phase 6 table updated, Phase 7 gets the P120 slice plan, gates and sequence carried over from `docs/p119-p121.md`; TECHNICAL_SPECIFICATION §6.4 updated (REQ-AGENT-004); `docs/p119-p121.md` got a pointer note.
- `package.json`: `typecheck`, `lint`, `build:server` run tsc with `--stack-size=4000` — `tsc` failed intermittently with `RangeError: Maximum call stack size exceeded` (also on the unmodified P119.0.2 tree); 6/6 local runs clean afterwards; guarded by a test.
- Version/patch: `119` / `119.0.3`.

## P119.0.2 — Agent boundaries: inventory, contracts, regression tests

- Inventoried routes, internal modes, workflows and shared orchestration. Result recorded once in `TECHNICAL_SPECIFICATION.md` §6.4 (boundary map, REQ-AGENT-001..003): Conversational and Expert share `POST /api/conversation` and one prompt builder selected by `productMode`; Architect is isolated (`/project`, `/api/projects/*`, `appBuilder/`, own client modules).
- Added `tests/p119-agent-boundaries.test.mjs` (21 tests) to `test:core`; new script `test:p119-agents`. Covers route ownership, client/route/import isolation, explicit agent selection (Expert only on `productMode === 'Expert'`), Architect gating, workflow inventory (no `p119-*` workflow yet), and `KNOWN_SHARED_PATH` locks for the documented shared paths.
- `tests/p119-agent-ui-contract.test.mjs`: patch assertion relaxed to `119.*`.
- `ROADMAP.md` Phase 6: P119 slice plan reconciled (0.2 boundaries, 0.3 legacy isolation; 0.4–0.7 proposed). `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-USER-VALUE-REPORT.md`, `TECHNICAL_REPORT.md` §7.3 synchronized.
- No runtime behaviour change. Version/patch: `119` / `119.0.2`.

## P119.0.1 — Three-agent entry UI and P118 status reconciliation

- Start screen and agent menu now expose Conversational, Expert, and Architect instead of the legacy-facing Simple / Project names.
- Preserved internal mode keys during this first migration slice to avoid changing accepted conversation and Architect flows before dedicated replacement pipelines are covered.
- Corrected stale P118 status in the current task, rolling user-outcome report, renovation roadmap, and protected roadmap: P118 was accepted by Navigator on 2026-10-29 after CI 27/27 and the supplied live staged ZIP evidence.
- Explicitly retain optional P118 residuals (PARTIAL download policy and dependency audit) as open, not completed.
- Version/patch: `119` / `119.0.1`. Local runtime verification is pending in this environment.

## P118.5.6 — Bounded dom-wiring repair after check failure

- **Engine:** after static validators run, if `dom-wiring` fails and budget remains, one repair call per broken script (max 2). Prompt lists the real HTML `id`s and the exact mismatch messages. Result accepted only when (1) no previously-passing required validator starts failing and (2) `dom-wiring` issue count strictly decreases. Events: `dom_wiring_repair`, `dom_wiring_repair_accepted`, `dom_wiring_repair_rejected`.
- **Tests:** `tests/app-builder-dom-wiring-p118-5-6.test.mjs` (validator unit + repair accept/reject/budget/no-op); registered in `test:app-builder`.
- **Version:** patch `118.5.6`.
- Live on 118.5.5 was honest PARTIAL (`validators_failed: dom-wiring`) — this patch closes the gap so a single model slip can recover to SUCCESS without a full rebuild.

## P118.5.5 — Dom-wiring validator + architecture boundaries + DAG

- **False SUCCESS fix (core):** new required static validator `dom-wiring` — every `getElementById` / `querySelector('#id')` literal in JS must exist as an `id` in some HTML file. Catches the live P118 mismatch (kebab-case JS vs camelCase HTML). Added to `REQUIRED_VALIDATORS` (7th) and `runStaticValidators`.
- **Architecture boundaries:** `stagedArchitectNote` moved to client-safe `src/architectNote.ts`; `src/projectBuildJob.ts` no longer imports from `appBuilder/`. Explicit `allowedExceptions` entry for intentional `src/config.ts → package.json` (single version source). `architecture:check` now PASS.
- **CI-DAG:** `architecture:check` added to `docs/verification-manifest.json` (profiles `check` + `ci`); 26 → 27 checks.
- **Version:** patch `118.5.5`.
- **Still open (follow-up):** bounded repair after `dom-wiring` failure in the engine, full test suite for the new validator, zod/body-parser/qs audit clean, docs regeneration, live re-run after deploy. Do not start P119 until CI green + working live artifact.

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

