## [127.43] - BEHAVIOUR: procedural visual quality in genre templates (step 1)

- Strengthen standard templates: large high-contrast player/obstacles, phone HUD, canvas/CSS only (no image/audio files yet).
- Coder prompt + action Plan.shared: procedural look rules; forbid CDN/binary assets by default (static_site.v11).
- Fixed genre Unicode matchers for non-Latin short requests.
- Scope: appBuilder/intent-brief.ts, core-prompts.ts, stack-static-site.ts, core-cache.ts. Patch 127.43.

## [127.42] - RELIABILITY: CodeQL workflow tolerates bundle CDN 504

- CodeQL init failed with HTTP 504 downloading codeql-bundle (GitHub tool CDN), not product code.
- Add advanced `.github/workflows/codeql.yml`: continue-on-error on job/init/analyze; weekly schedule; pin action v3; skip analyze when init fails.
- Scope: `.github/workflows/codeql.yml`. Patch 127.42.

## [127.41] - BUGFIX: CI after genre-template intent (tests + lint:copy)

- lint:copy: removed raw Cyrillic from intent-brief genre matchers (unicode escapes).
- Tests: ambitious brief expects compact targetModules (3–5) and intent prompt v2; human-brief assert matches see/control sections.
- Scope: appBuilder/intent-brief.ts, tests/project-builder-recovery.test.mjs, tests/project-mode-contract.test.mjs. Patch 127.41.

## [127.40] - BEHAVIOUR: genre templates + mobile-first intent contract

- Short requests are filled with a standard genre template (view, touch controls, consequences) instead of inventing heavy 3D.
- Default device is phone/tablet: touch only; no keyboard, mouse, or desktop assumptions unless the user asks.
- Intent prompt v2; complexity demoted from ambitious unless heavy tech is explicit; human brief shows see/control/happen blocks.
- Scope: appBuilder/intent-brief.ts, core-prompts.ts, stack-static-site.ts, core-cache.ts. Patch 127.40.

## [127.39] - BEHAVIOUR: action games must not game-over on the first frame

- Observed Skyline Aviator: Start Flight → immediate CRASHED with score 0 and distance 0 (spawn/collision on frame 1).
- Coder prompt + action Plan.shared: safe spawn, ~1s collision grace after start, never game-over on the start frame (static_site.v9).
- Scope: appBuilder/core-prompts.ts, core-cache.ts, stack-static-site.ts. Patch 127.39.

## [127.38] - MAINTENANCE: uniform dense history (all entries kept)

- Navigator rejected delete-style compression; every past patch entry is retained at the same density.
- CHANGELOG and TECHNICAL_REPORT rebuilt so each patch is 1–5 sentences; AGENTS History density updated to that standard.
- Scope: CHANGELOG.md, TECHNICAL_REPORT.md, AGENTS.md. Patch 127.38.

## [127.37] - MAINTENANCE: history density rules in AGENTS.md

- Assistants wrote patch history inconsistently (skip vs multi-page).
- AGENTS §5 History density: append-only; new entries 1–5 sentences; bulk rewrite only with explicit Navigator approval.
- Scope: AGENTS.md. Patch 127.37.

## [127.36] - BUGFIX: Project chat crash + brief collapse; mobile game controls

- planLocked was used without useState, causing ErrorBoundary on the brief card; Confirm did not collapse the plan on deploy 127.35.
- Optimistic one-line collapse; workspace header removed; New stays in Project Mode; create/list only in Advanced.
- Prompts require touch/on-screen controls and in-canvas draw coordinates (static_site.v8) after tractor/racer failures.
- Scope: ProjectChat, ProjectMode, appBuilder prompts/standalone. Patch 127.36.

## [127.35] - BEHAVIOUR: offline bootstrap + Project UI focus

- Generated chess opened as local content:// / file:// but board was empty: app.js exported initGame without calling it; CSS used .square.white/.black while JS set .light/.dark (name-contracts PARTIAL).
- Project chat still showed create-project form and project list under the composer.
- Header New left Project Mode for Simple conversation.
- Change (P127.35): standalone.ts auto-invokes common entry exports (initGame/init/main/...) after module load so offline index.html paints on open.
- Coder prompt + compact shared contracts require offline local page, matching CSS class names, and self-start of app.js.

## [127.34] - FEATURE: compact project builds with human brief card + machine manifest

- Multi-unit generation for games produced incompatible data shapes; no user gate before code generation.
- Change (P127.34): Compact 3-file plans + `Plan.shared`.
- Preview API `POST .../code/build/preview`; UI card in Project Mode and Project Chat (`Prepare plan` → confirm → build with `approvedBrief`/`userNotes`). `manifest.json` in ZIP; coder SHARED CONTRACTS.
- `appBuilder/*`, `server/appBuilderAdapter.ts`, `server/projectRoutes.ts`, `src/ProjectMode.tsx`, `src/ProjectChat.tsx`, `src/projectBuildJob.ts`, tests, docs.
- Package patch `127.34`.

## [127.33] - BEHAVIOUR: names two files must agree on (validator `name-contracts`)

- `appBuilder/validator-static-site.ts`: new `validateNameContracts`, required for SUCCESS.
- (a) A CSS rule that needs a second class (`.a.b`) where `b` appears in no script or markup (whole word, or prefix of a composed name such as `state-` + n) is reported on the script that uses the other class most.
- (b) A script or stylesheet that names a local picture, sound or font file that is not in the package is reported once per file (a package holds text files only).
- Issues start with `name:`. `appBuilder/core-engine.ts`: `name-contracts` joins the bounded cross-file repair; stylesheets can be repair targets; one sentence added to the repair prompt for `name:` lines.
- Observed (three builds, commit 9387144, all SUCCESS with 12/12 validators ok, all unusable): stylesheet styled `.square.light`/`.dark` while the script set `white`/`black` (invisible board); stylesheet showed a slide only with `.slide.active`, never set (blank slides) and six picture files that…

## [127.32] - BEHAVIOUR: Project Mode opens the built page in a sandboxed browser and repairs what throws

- `appBuilder/core-ports.ts`, `index.ts`: optional `RuntimePort` (`check(files)` returns `ran` and issues; `ran: false` means "not checked"). `appBuilder/core-engine.ts`: when the host supplies the port and every script parses, the page is opened once; an uncaught error becomes a `runtime-smoke`…
- It joins the existing bounded cross-file repair (max 3 rounds x 3 files, trials are re-opened, accepted only if nothing that passed breaks and the issue count drops).
- An error that stays keeps the build PARTIAL (`validators_failed: runtime-smoke`). `runtimeVerified` is true only when the page was opened and nothing threw.
- No port, or `ran: false`, leaves the report exactly as before.
- One sentence added to the cross-file repair prompt for `runtime:` issues. `server/appBuilderRuntimeCheck.ts` (new): headless Chromium through Playwright, loaded lazily.

## [127.31] - BUGFIX: a usable model plan is no longer thrown away because of how its references are named

- `appBuilder/core-plan.ts`: new `repairPlanReferences` (pure). `dependsOn` and `order` entries are resolved by unit id, file path or file stem; entries that name no unit and self-references are dropped; a dependency cycle is broken at its least-connected unit; `order` is rebuilt.
- Units, paths and contracts are never added, removed or renamed, so plans with no units, unsafe or duplicate paths, duplicate ids, too many units or a wrong schema version are still rejected.
- The empty dependency loop in `validatePlan` is removed. `appBuilder/core-engine.ts`: applied to the model plan before `validatePlan`; event `plan_references_repaired` when anything changed.
- Observed (job 71621f10, commit c39688e): the planner's plan had unit ids without extension but `dependsOn`/`order` with file names and a two-script cycle; `validatePlan` returned 16 issues, the generic template replaced the plan, the entry script was written before three of its modules, and the…
- Tests: `project-builder-recovery` (replay of that graph with neutral names, still-rejected plans, build without template fallback).

## [127.30a] - Test fixture moved to one flat file

- `tests/fixture-standalone-chess.json` replaces the nested `tests/fixtures/standalone-chess/` folder (nested folders are not allowed); `project-standalone.test.mjs` reads it.
- Delete the old folder.
- Package patch `127.30a`.

## [127.30] - FEATURE: every delivered program runs by simply opening index.html (no server)

- `appBuilder/standalone.ts` (new): the delivered `index.html` is one self-contained file: local stylesheets inlined, local classic scripts inlined, all local ES modules compiled into one inline script (CommonJS registry, deterministic, no model call).
- Bare/URL imports (three.js via import map) stay real ES imports of one inline module script, which file:// allows.
- Unbundlable code (import.meta, top-level await, syntax errors) falls back to the original page with a warning in `report.standalone`.
- ZIP layout: root `index.html` = standalone; editable sources under `source/`. `server/projectContinuation.ts` reads `source/` and ignores the generated root file. `validator-static-site.ts`: `completeness` asks the TypeScript parser (error at end of file) instead of counting characters; an…
- Live runner opens the package via `file://` (what a person does) instead of an HTTP server.

## [127.29] - BUGFIX: generated programs that load but show an empty first screen or run setup twice

- `validator-static-site.ts`: `member-contracts` flags `x.initFoo()` / `setup*` / `bind*` / `create*` calls made after `new X()` when the constructor of X already calls `this.initFoo()` (observed in two builds: `game.init()` from `main.js`; `scene.initDOM()` + `scene.initBoardRenderer()`…
- Findings enter the existing bounded cross-file repair. `core-prompts.ts`: coder prompt carries a startup contract (constructor draws the initial state at once; no duplicate setup calls).
- a chess ZIP reported SUCCESS and loaded without errors, but showed an empty board (0 pieces) until New Game was pressed (32 pieces afterwards); reproduced in headless Chromium. `runtimeVerified` stays false: nothing in the build runs the program.
- Tests: `project-builder-recovery`.
- Package patch `127.29`.

## [127.28] - BUGFIX: generated 3D games failed to start because of mixed three.js imports

- `stack-static-site.ts`: `normalizeThreeSetup` rewrites every three.js import (any CDN URL or version, including URLs with no module build) to bare `'three'` / `'three/addons/…'` and adds one pinned import map (three@0.160.0, jsdelivr) before the first script of the entry HTML.
- Idempotent; projects without three.js are untouched. `core-engine.ts`: applied before validation and once more on the final package (repairs may reintroduce mixed imports); event `three_normalized`.
- a tractor-racing ZIP imported three.js from five different sources (bare `'three'` with no import map, cdnjs r128 `three.module.js` and `three.min.js`, jsdelivr 0.158 and 0.160); one failing import stops the whole module graph.
- Test: `project-builder-recovery`.
- Package patch `127.28`.

## [127.27] - BUGFIX: generated games did not run (extension-less file names, mismatched constants); less clutter in Project replies

- `core-plan.ts`: `repairPackagePath` turns module ids used as paths (`audio_js`) into file names (`audio.js`).
- Applied to model plans (`core-engine.ts`), intent-brief module paths and spec features (`intent-brief.ts`) and `expandedPlanFromBrief` (`stack-static-site.ts`).
- a 24-module build shipped 19 files without `.js`, none imported by `main.js`. `validator-static-site.ts`: `member-contracts` also checks `NAME.key` on imported `export const NAME = {...}` objects (observed: `TILE_TYPES.PATH` / `COLORS.WALL` not defined in `constants.js`); findings enter the…
- The ZIP download stays.
- Tests: `project-builder-recovery` (path repair, constant keys), `project-mode-contract` (no banner or instructions).

## [127.26a] - MAINTENANCE: Project Mode user-value workflow is manual-only

- `project-user-value.yml`: removed the `workflow_run`, `pull_request` and `push` triggers; only `workflow_dispatch` remains (Navigator request).
- Test updated.
- Package patch `127.26a`.

## [127.26] - EXPERIMENT: entry HTML first, scripts and styles written against its real ids

- `stack-static-site.ts`: `domFirstPlan` (applied to every plan, also model-made ones): the HTML depends on no script or style; every script and style depends on it.
- Superseded HTML dependency lines in `expandedPlanFromBrief` removed. `core-prompts.ts`: `domBlock` (real ids and classes of the generated HTML, authoritative) for scripts and styles; `htmlPlanBlock` (planned files, load all with `type="module"`, ids on controlled elements, no inline handlers)…
- Tests: `project-builder-recovery` (order, prompts, integration; the recovery test no longer assumes `index` is the third unit).
- Requires P127.25.
- Package patch `127.26`.

## [127.25] - BUGFIX: terminal build state visible before the ZIP existed; per-file progress and downloads

- `core-engine.ts`: the archive is packed and stored before the terminal state is saved, and `running` is saved when a unit starts.
- A client that sees done/failed now always finds the ZIP. `appBuilderAdapter.ts`: adapter stores the archive only as a retry; `publicJob` returns `files` (ready / working / pending / failed); `readBuildFile` serves one finished file (from the stored ZIP, else the unit result; only paths of the…
- UI: `BuildFilesPanel` in the project chat: green = ready (per-file Download), red = in progress, grey = waiting; "Download all as ZIP" when the archive exists.
- Tests: `project-builder-recovery`, `project-mode-contract`.
- Package patch `127.25`.

## [127.24] - BUGFIX: live workflow gate looked at one commit only

- `project-user-value.yml`: the gate diffs against the commit of the newest `project-user-value-live` artifact (last measured commit) instead of `HEAD~1`; no earlier measurement means run.
- Job gets `actions: read`, full checkout depth.
- a push whose Project Mode files were not in the last commit skipped the whole live run.
- Package patch `127.24`.

## [127.23] - EXPERIMENT: cross-file type diagnostics + bounded repair; zero-input live workflow

- `validator-static-site.ts`: `type-contracts` (TypeScript checkJs on generated JS; only mismatches declared in other project files: missing exports, unknown members of project classes, wrong call arity).
- Counted as required. `core-engine.ts`: bounded cross-file repair (module/type/member contracts), max 2 rounds x 2 files, accepted only if nothing that passed breaks and the issue count drops.
- Previously module-contracts had no repair. `core-prompts.ts`: later units see real export signatures (parameters, class members), not only names.
- Live workflow: fixed URL, no inputs, runs after Core CI on main when Project Mode code changed, waits for the deployed commit itself, 10 prompts x 2 runs, per-scenario summary. `baseline-eval.yml` URL default.
- Tests updated/added.

## [127.22] - Revert P127.21 (EXP-PROJECT-3 failed its pre-registered bar)

- `stack-static-site.ts`, `core-prompts.ts`, `project-builder-recovery.test.mjs` restored to the P127.20 state (HTML again after CSS; no DOM contract in prompts).
- Package patch `127.22`.

## [127.21] - EXPERIMENT: style the real page (CSS after HTML, DOM contract in prompts)

- `stack-static-site.ts`: HTML no longer waits for CSS; CSS depends on the HTML unit. `core-prompts.ts`: `domContract`; `interfaceBlock` now also lists the actual ids/classes of generated HTML.
- Test added.
- Package patch `127.21`.

## [127.20] - EXPERIMENT: generate against actual module interfaces; live runner fixes

- `core-prompts.ts`: `exportedNames` / `interfaceBlock`; `core-engine.ts` appends the real exports of already generated scripts to every later unit's prompt. `stack-static-site.ts`: entry script (`main`/`app`/`index`) depends on all other scripts so it is generated last.…
- Tests added to `project-builder-recovery.test.mjs`.
- Package patch `127.20`.

## [127.19] - Live Project Mode user-value run (real deploy, real browser)

- `scripts/project-user-value-live.mjs`: login → create project → real staged build → poll → download ZIP → open in headless Chromium (render, runtime errors, 404s, reaction to clicks/keys/taps) → optional screenshot judge (Gemini, `GEMINI_API_KEY`).
- Reports PRODUCT outcomes and INFRA failures separately; records deployed commit vs `GITHUB_SHA`; flags SUCCESS-but-failed-human-check mismatches. `config/project-user-value-prompts.json`: neutral prompt set (draft, authorship stated; Navigator review required).
- Workflow `project-user-value.yml`: new manual-dispatch `live-project-mode` job (not per patch); offline job relabelled as rubric self-test.
- Package patch `127.19`.

## [127.18e] - BUGFIX: persist brief-applied spec so resume keeps complexity

- `core-engine.ts`: `state.spec` now stores the spec after `applyBriefToSpec` (was saved before it, so resumed jobs lost `complexity:`/`targetModules:` and re-scored as ambitious → `goal_not_adequate`). `project-mode-contract.test.mjs`: patch id derived from `package.json`, not hard-coded.
- Package patch `127.18e`.

## [127.17b] - Flat package paths only (no nested folders)

- Intent suggested modules and expanded plans use top-level files only (`main.js`, `scene.js`, …).
- Model-suggested paths sanitized to basename. `isSafePath`: reject any `/` nested path.
- Package patch `127.17b`.

## [127.17a] - CI fix: intent-brief language + duplicate templatePlan export

- Removed Cyrillic tokens from `intent-brief.ts` complexity regex (lint:copy). `appBuilder/index.ts`: drop duplicate `templatePlan` re-export (esbuild/tsc).
- Package patch `127.17a`.

## [127.18] - Project Mode user-value workflow (human simulator)

- New offline human-simulator evaluator: `scripts/project-user-value-eval.mjs`.
- Fixtures: `stub-racer` (SUCCESS on tiny package — must fail human rubric) and `rich-forest` (recognizable animals/forest — must pass).
- Workflow: `.github/workflows/project-user-value.yml` (PR/path + dispatch). npm script `test:project-user-value`.
- Scores recognition, stub size, honest SUCCESS, interaction markers — not syntax gates.
- Package patch `127.18`.

## [127.17] - Intent elaboration + multi-module plan + honest goal adequacy

- New intent stage before spec: model elaborates plain-language requests into expanded goal, mustHave / notSuccessIf, complexity, suggested small modules (`app_builder.intent.v1`).
- Fallback brief when the intent call fails still expands ambition (games/3D/city → ambitious). expandedPlanFromBrief: tree of many small files (js/*, css, html) instead of a 4-file stub template for standard/ambitious goals. assessGoalAdequacy: SUCCESS / `goalImplemented` require more than static…
- Profile: `maxUnits` 48, `maxCallsPerJob` 60.
- Package patch `127.17`.

## [127.16a] - lint:copy: no Cyrillic in stack-static-site

- Removed Cyrillic tokens from `ensureMultiFileStaticPlan` interactive regex (lint:copy language rule).
- Interactive detection remains Latin keyword-based; single-HTML / no-JS branches still force multi-file.
- Package patch `127.16a` (letter suffix; non-product CI fix).

## [127.16] - Multi-file plan + MAX_TOKENS / missing_end recovery

- Planner prompt v5: interactive apps must plan multiple files (index.html + app.js [+ style.css]); forbid mega-single HTML. `ensureMultiFileStaticPlan`: coerce single-HTML / no-JS interactive plans to the static multi-file template.
- Coder: stronger compact-unit + required `<<<END>>>` instructions.
- On truncation / MAX_TOKENS / missing_end: explicit repair hint, then one ultra-compact retry (`unit_repair_compact`); clearer `truncated_unit:` failure reason.
- ProjectChat welcome text shortened for `lint:copy`.
- Package patch `127.16`.

## [127.15] - Project Mode chat-first surface

- Default Project UI is a single chat: user describes the program, gets a ZIP (or an error), then keeps chatting to refine.
- New `src/ProjectChat.tsx`: transcript + composer; auto-creates/confirms project; `code/build` then `code/continue` from the latest ZIP; download link in the assistant message.
- Multi-panel workspace (analysis, plans, files tools, wizard) moved behind Advanced with Back to chat.
- Package patch `127.15`.

## [127.14] - CI fix: lint:copy + upload Uint8Array type

- Shortened Project Mode workspace help text (lint:copy 24-word limit).
- Renamed Advanced tab label `Raw JSON` → `Project data` (forbidden internal term). `POST .../artifacts/upload`: pass `Uint8Array.from(Buffer)` so typecheck accepts ArrayBuffer-backed bytes.
- Package patch `127.14`.

## [127.13] - Project Mode Files-first workspace

- Default project tab is Files (not Results).
- Analysis ("What should we analyse?") only appears under Advanced.
- Primary nav: Files; Plan/Analysis/Code package/Raw JSON behind Advanced toggle.
- Next-step copy points to create/upload/improve ZIPs instead of "Run an analysis".
- Selecting a project opens the Files tab; empty-project copy matches the program-ZIP path.

## [127.12] - Project continue + source ZIP upload (UX)

- Wired Improve this program in Project Mode UI to existing `POST /api/projects/:id/code/continue` (base ZIP selector + change request).
- Added `POST /api/projects/:id/artifacts/upload` (JSON base64 ZIP) so users can store an arbitrary source archive in the project registry and continue from it.
- Files tab: upload control + clearer copy distinguishing local Workspace vs server artifacts.
- Static-site post-download instructions no longer default to Render/Railway deploy; they tell the user to open `index.html` and use Improve/Upload.
- Shorter `suggestProjectName` (drop filler words, max 28 chars).

## [127.11] - Patch process compliance + integration-gate tests

- Advanced `package.json` / `package-lock.json` product patch metadata to `127.11` (major `version` remains `127`).
- Extended category suite `tests/project-builder-recovery.test.mjs` with contracts for `reachability`, `completeness`, `member-contracts`, orphan drop, and `runtimeVerified: false` on SUCCESS (covers P127.9–P127.10 gates under G3).
- Extended `tests/project-mode-contract.test.mjs` with package metadata assertion.
- No Simple/Expert behaviour change.

## [127.10] - Member contracts + coherent package for self-contained HTML

- Added required validator `member-contracts`: after `import { Class }` + `new Class()`, instance property/method accesses must match the class surface (`this.x =` assignments and methods).
- Suggests `is*`/`get*` near-misses (e.g. `paused` vs `isPaused`).
- Deterministic package cleanup: when the entry HTML is a large self-contained inline app and external CSS/JS are unreachable, those orphans are dropped before scoring (`droppedOrphanedFiles` on the report, `orphans_dropped` event).
- Bounded model repair for `member-contracts` (max 2 scripts, same non-destructive acceptance rules as DOM wiring repair).
- Project Mode `appBuilder/` only; Simple and Expert untouched.

## [127.9] - Project Mode integration gates (reachability + completeness)

- Added required static validators `reachability` and `completeness` for the `static_site` stack so SUCCESS cannot be claimed when generated files are orphaned or truncated. `reachability`: every non-exempt file must be reachable from an HTML entrypoint via `src`/`href` and relative ES imports;…
- Planner/coder prompts tightened: simplest static architecture by default, no unrequested frameworks, entry HTML must link every deliverable asset, no truncated files (`PROMPT_VERSION` → `static_site.v5`, plan → `app_builder.plan.v4`).
- User-facing SUCCESS notes state that runtime was not executed on BiForge.
- Project Mode `appBuilder/` only; Simple and Expert untouched.

## [127.8a] - Docs layout CI fix

- Removed three non-allowlisted prose files from `docs/` (`PROJECT_CONTINUATION.md`, `PROJECT_MODE_P127_8_ACCEPTANCE.md`, `PROJECT_MODE_RELIABILITY_PLAN.md`) and redirected references to canonical documents.
- Fixes `docs-integrity` and `test:core` failures.
- No runtime change.

## [127.8] - Project Mode recovery and acceptance

- Stale build recovery now atomically leases eligible jobs with PostgreSQL row locks (`FOR UPDATE SKIP LOCKED`) and refreshes the heartbeat before a worker resumes them.
- This prevents multiple BiForge replicas from concurrently resuming the same stale job.
- Added focused tests for atomic lease SQL, returned job mapping, and the minimum lease age.
- Preserved Project Mode-only scope; no Simple or Expert route, prompt, or UI implementation was changed.
- Verification status: see `TECHNICAL_REPORT.md`; browser E2E and live multi-replica/database recovery remain `NOT_RUN`.

## [127.7] - Project workspace artifact inventory

- Added project-scoped inventory of all immutable artifact versions.
- Added version-specific artifact downloads and artifact inspection endpoints.
- Added Project Mode UI for historical version downloads, integrity status, and ZIP entry listings.
- Added project-mode contract coverage.
- Simple and Expert paths were not modified.

## [127.6] - Project continuation

- Added `POST /api/projects/:projectId/code/continue` for continuing work from an existing verified ZIP artifact.
- Added bounded ZIP source extraction, project ownership checks, CRC validation, path traversal protection, and explicit rejection of binary assets not yet supported by the text-context continuation path.
- Added continuation prompt construction and regression coverage.
- Added `docs/PROJECT_CONTINUATION.md`.
- Simple and Expert behavior is unchanged.

## [historical] - Session governance and documentation consolidation

- Retained marker for docs-integrity: Session governance and documentation consolidation.
