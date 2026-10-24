# Final Technical Specification: BiForge App Builder Core (`appBuilder`)

This document is an execution-ready specification for a separate implementation session. It defines files, module boundaries, patch order, and acceptance criteria. It supersedes the draft “Step-by-Step Program Builder Specification.”

## 1. Purpose, decisions, and principles

Build a core that creates programs from small, verifiable steps and behaves consistently for a school student using a free API key and a professional using a paid subscription. Only the capability profile differs; core code must not branch on “free” or “paid”. Version 1 targets small static websites (including the Tetris golden task), while data formats and module boundaries should allow growth without persisted-data redesign.

**Accepted decisions (do not reopen without owner approval):**

1. The core lives in the repository-root `appBuilder/` directory. It is flat: no subdirectories. Files use role prefixes, including `stack-<id>.ts` and `validator-<id>.ts` in the root only.
2. Core code must not import from `server/` or `src/`. Model calls, storage, diagnostics, and time are supplied through ports implemented by a thin server adapter.
3. Work is represented by `Unit` nodes in a dependency graph. In v1, file units are processed sequentially; the data model permits later decomposition and parallel independent units.
4. Capabilities come from a model registry through `Profile` fields, not hard-coded provider tiers. Core code must not contain “free”/“paid” branches.
5. Unit context is limited to its own task and neighbouring interfaces, not neighbouring source code; prompt size must not grow with the whole project.
6. Unit results are cached by a hash of inputs, prompt version, and model identity to support recovery and inexpensive rebuilds.
7. Every persisted or exchanged contract carries `schemaVersion`; unknown versions must be rejected explicitly.
8. Rollout is incremental. `APP_BUILDER_ENGINE=staged` is opt-in; the legacy one-shot path remains the default until acceptance.
9. Generated code is checked statically and is never executed on the server.

**Out of scope:** automatic GitHub publication or deployment, provider replacement, rewriting Simple/Expert modes, parallel execution, multiple stacks, and model-based review in the first version. Interfaces/data fields may prepare for later work, but do not implement it here.

## 2. Baseline and repository constraints

**Baseline:** cumulative P92.7 or newer, with P93.1 core contracts already applied in the current baseline archive. Repository stack: Node 22, Express, TypeScript/tsx, PostgreSQL, JSZip, deployment to Render. Application version is `93`; the newest `## P<N>…` heading in `CHANGELOG.md` is authoritative and checked by `scripts/check-version.mjs`.

**Existing components:**

- Project Mode's legacy App Builder pipeline: IR → scaffold → optional model “slice” → ZIP (`server/appBuilder*.ts`, `server/appBuilderPipeline.ts`, `server/projectRoutes.ts`). Keep it as fallback.
- Model router `routeCall`, with health/quota decisions and reasons/attempts/rejections.
- Artifact and diagnostics tables, including `project_diagnostic_events` and `project_diagnostic_artifacts`, plus `recordDiagnostic`.
- CI scripts/workflow: `.github/workflows/ci.yml`, `scripts/run-independent-checks.mjs`, `scripts/ci-summary.mjs`, and `scripts/check-version.mjs`.
- Patch packaging via `scripts/pack-simple.mjs` and `scripts/patch-tools.mjs`, including `ALLOWED_TOP`, flat-layout preflight, and secret scanning.

**Known issue motivating this work:** a one-shot Gemini generation on a free key can hit HTTP 429 or truncate its response, leaving the Tetris task unbuilt. P93.0 separately fixed non-ASCII `Content-Disposition` filenames by using an ASCII `filename=` and UTF-8 `filename*=`.

**Repository rules:**

- Keep `appBuilder/` flat. Permit only one nested path level in generated project files (e.g. `assets/logo.svg`); reject deeper paths. The archive path validator and preflight must agree.
- `appBuilder` is already in `scripts/patch-tools.mjs` `ALLOWED_TOP`; `tsconfig.server.json` includes the core.
- Architecture rules define the `appBuilder` layer and permit `server → appBuilder`, `test → appBuilder`, and `script → appBuilder`; never permit `appBuilder → server` or `appBuilder → src`.
- Keep documentation inventories and `check-docs` green. Do not weaken or remove existing tests.

## 3. `appBuilder/` file layout and boundaries

The directory is flat, TypeScript ESM, with side-effect-free functions where practical.

| File / prefix | Responsibility |
|---|---|
| `core-types.ts` | Shared contracts and `schemaVersion`: Unit, Plan, Profile, Spec, Report, JobState |
| `core-ports.ts` | `ModelPort`, `StorePort`, `EventPort`, `ClockPort` interfaces |
| `core-plan.ts` | Dependency graph, topological ordering, cycle and path validation |
| `core-engine.ts` | Main stage loop, scheduling, call budget, resume-ready contracts |
| `core-cache.ts` | Content hash; cache key includes unit input, prompt version, and model ID |
| `core-markers.ts` | Parse `<<<FILE path>>> … <<<END>>>`; detect truncation and unsafe paths |
| `core-prompts.ts` | Versioned prompts; the initial code prompt version is the constant `static_site.v1` |
| `profile-*.ts` | Conservative capability profile and role/model profile mapping |
| `stack-<id>.ts` | Stack implementation; first stack is `static_site` |
| `validator-<id>.ts` | Static validators for HTML, JS syntax, references, size, and secrets |
| `pack-zip.ts` | ZIP assembly and embedded `build-report.json` |
| `index.ts` | Sole public entry point |

Ports:

- `ModelPort.complete({role, system, prompt, maxOutputTokens, signal})` returns `{text, finishReason, usage, modelId}` or a typed error: `rate_limited` (with optional `retryAfterMs`), `truncated`, `unavailable`, `timeout`, or `bad_request`.
- `StorePort`: `saveJob`, `loadJob`, `listResumable`, `putUnitResult`, `getUnitResult(cacheKey)`, `putArtifact`.
- `EventPort.emit({jobId, unitId?, type, level, data})`.
- `ClockPort.now()` and `sleep(ms, signal)` enable deterministic tests.

The `server/appBuilderAdapter.ts` adapter connects these ports to `routeCall`, the database, artifact storage, and `recordDiagnostic`. Core code must know nothing about Render, Gemini, Express, or PostgreSQL. Any core import from `server/` or `src/` is an architecture violation.

## 4. Data contracts

All contract objects use `schemaVersion: 1`. Readers reject unknown versions with a clear error.

- **Spec:** `{schemaVersion, title, goal, language, stack, features[], nonGoals[], acceptance[]}`. Acceptance criteria support both human-readable checks and machine-checkable predicates such as `has_file:path`, `html_has:path:selector-or-token`, and `js_contains:path:token`. Unsupported predicates must be reported as unsupported, not silently passed.
- **Unit:** `{id, kind: 'file'|'check'|'assemble', path?, purpose, dependsOn[], exports[], contract, maxOutputTokens, status: 'pending'|'running'|'done'|'failed'|'skipped', attempts, cacheKey?, resultRef?}`. `contract` describes the file interface (functions, DOM IDs, etc.) and is what neighbouring units receive.
- **Plan:** `{schemaVersion, specHash, units[], order[]}`. `order` is topological. A valid plan has no cycles, all dependencies exist, paths are unique/safe (no `..`, absolute paths, control characters, or more than one nested level), and unit count does not exceed `profile.maxUnits`.
- **Profile:** `{schemaVersion, id, maxOutputTokens, requestsPerMinute, tokensPerMinute, maxParallel, maxCallsPerJob, contextTokens, supportsLongOutput, maxUnits}`. The adapter derives role profiles from the model registry; core has only `conservativeProfile()` defaults.
- **JobState:** mirrors `app_build_jobs`: `id uuid`, `project_id`, `user_id`, `status` (`queued|running|done|failed|cancelled`), `stage`, `spec jsonb`, `plan jsonb`, `calls_used int`, `calls_budget int`, `error jsonb`, `report jsonb`, `artifact_id`, `schema_version int`, `created_at`, `updated_at`, `heartbeat_at`. Unit results live in `app_build_unit_results(job_id, unit_id, cache_key, content text, content_hash, created_at)`. The adapter owns JSONB/SQL-column mapping; core sees only camelCase `JobState`.
- **build-report.json:** `{schemaVersion, jobId, status: 'complete'|'partial'|'failed', goalImplemented, files[{path, bytes, sha256, unitId}], units[{id, status, attempts, modelId, cacheHit}], validators[{name, ok, issues[]}], callsUsed, durationMs, failureReason?}`. `goalImplemented=true` only when all file units are done and every required validator has run and passed. A required validator that is `NOT RUN` means `goalImplemented=false`.

## 5. Engine, stages, cache, and recovery

One `runBuild(input, ports, options)` pass uses these stages:

1. **preflight** — validate task length/language, choose stack, build role profiles and call budget. No model call.
2. **spec** — ask for a general `Spec` as JSON; retry once only for invalid JSON/schema.
3. **plan** — request one unit per file and a dependency graph. If planning fails, P93.2b's stack may supply a template plan (`index.html`, `style.css`, `app.js`, `README.md`).
4. **code** — generate file units in topological order. Each prompt includes a compact Spec, dependency contracts only, and the current unit contract. Output uses `<<<FILE path>>>` … `<<<END>>>`, not JSON. Missing `<<<END>>>` is truncation; retry with a compression instruction or split the unit in a later patch.
5. **check** — run static stack validators; never execute generated code.
6. **cross-check** — deterministically verify that HTML script/style references and acceptance predicates match generated files.
7. **assemble** — create ZIP and `build-report.json`.

Cache keys must include a stable prompt version constant (initial code prompt: `static_site.v1`) so a prompt change invalidates stale results. Identical inputs, prompt version, and configured model ID should yield the same key; the adapter supplies the selected model identity in engine options. Cache hits must not consume model calls.

**Rate limits and retry policy:** budget is at most 25 model generation calls per job by default, with at most 2 generation attempts per unit. A `bad_request` is not retried. `rate_limited`, `timeout`, `unavailable`, and truncation follow bounded retry rules and the unit/job budgets. Waiting after 429 does **not** count as a generation attempt or call, but it **does** count toward the wall-clock duration of the job. Use `ClockPort` for waits; tests must not sleep in real time.

A partial ZIP must state what is missing. “Continue” reuses completed units and must not charge again for cached completed work. `goalImplemented` is a factual result, not a model assertion.

## 6. ZIP and static-site security

ZIP output contains generated files plus `build-report.json`. File paths are normalized and rejected if absolute, traversal-based, contain control characters, or exceed one nested level (for example, `assets/x.png` is allowed; `assets/img/x.png` is not). Enforce file-count and total-size limits. Generated source is never executed on the server: no `eval`, subprocess, or network access to run it.

## 7. First stack: `static_site` (P93.2b)

Only one stack is in scope for P93. The default template plan contains `index.html`, `style.css`, `app.js`, and `README.md`; a plan may add JavaScript/CSS files up to eight files total. A one-level nested path is allowed for assets. No build tools, external dependencies, or CDN: the project should open by double-clicking `index.html`.

Required validators: `html-structure` (HTML/body structure and closed tags), `js-syntax` (parse source without executing it), `refs` (all `src`/`href` references resolve to planned files), `size` (non-empty, not truncated, total ≤ 2 MB), and `secrets` (no strings resembling credentials). Optional `goal-keywords` checks expected acceptance features such as `canvas` and `keydown` for a game. Machine-checkable predicates in `acceptance[]` must be deterministic and report each result explicitly.

## 8. Repository integration

| File | Required change |
|---|---|
| `scripts/patch-tools.mjs` | `appBuilder` in `ALLOWED_TOP` (already done in P93.0); flat core layout. Preflight accepts `appBuilder/core-types.ts`, rejects `appBuilder/x/y.ts`. |
| `tsconfig.server.json` | Include `appBuilder/*.ts` and compile the core in the server type-check. |
| `docs/architecture-boundary-rules.json` | `appBuilder` layer; permit server/test/script → appBuilder, prohibit reverse imports from appBuilder. |
| Documentation inventories and `check-docs` | Register active docs and maintain documentation baseline/index. |
| `server/migrations/017_app_build_jobs.sql` | Idempotent `app_build_jobs`, `app_build_unit_results`, indexes for status/project ID. |
| `server/appBuilderAdapter.ts` | Implement ports over model routing, database, artifacts, diagnostics, and job recovery. |
| `server/projectRoutes.ts` | With `APP_BUILDER_ENGINE=staged`, start the new engine instead of the legacy slice for eligible tasks; default/unset remains legacy. Start returns HTTP 202 and `{jobId}`; `GET …/code/build/:jobId` reports status/stage/units/error/archive; `POST …/code/build/:jobId/cancel` cancels. |
| `server/projectDiagnostics.ts` | Diagnostic events: `BUILD_JOB_STARTED`, `BUILD_STAGE`, `BUILD_UNIT_DONE`, `BUILD_UNIT_FAILED`, `BUILD_FINISHED`; include `build-report.json` in diagnostic ZIP. |
| Download routes | Keep ASCII `filename=` plus UTF-8 `filename*=` (P93.0). |
| `src/ProjectMode.tsx`, `src/ProjectNoviceWizard.tsx` | Progress polling every 3 s, stage and unit list, wait-for-limit messaging, Download/Drive actions, honest `partial`/`failed` display. |
| `CHANGELOG.md`, `package.json`, `src/config.ts` | Add a topmost `P93.x` changelog entry and keep application version `93` consistent. |

The legacy path is not removed or changed. The staged flag stays off until golden-task acceptance and explicit deployment approval; removing the legacy path requires a separate owner-approved patch.

Minimum event types for UI integration: `stage_changed`, `unit_started`, `unit_done`, `unit_failed`, `job_done`.

## 9. Tests and acceptance

Tests belong in `tests/app-builder-*.test.mjs`, run via a dedicated `test:app-builder` script and the independent-check chain.

1. **Contracts:** reject cycles, missing dependencies, unsafe paths, unknown `schemaVersion`; accept one-level nested paths and reject deeper paths.
2. **Markers:** normal output, missing `<<<END>>>`, multiple files, leading/trailing garbage, unsafe path.
3. **Engine with fake ModelPort:** successful pass, invalid JSON retry, truncation, 429 with fake-clock wait, unavailable/timeout reason, exhausted budget → partial/failed report.
4. **Cache:** identical inputs avoid another model call; changing `promptVersion` invalidates the key.
5. **Recovery (live PostgreSQL, P93.3):** interrupt on unit three, restart adapter, resume without regenerating completed units.
6. **Validators (P93.2b):** good and bad files, missing references, JS syntax error, secret-like text, acceptance predicates.
7. **Security:** zip-slip, size/file limits, and proof generated code is not executed.
8. **Download (P93.3):** Unicode filename returns 200 and valid `Content-Disposition`.
9. **Regression (P93.3):** with flag unset/false, legacy API behavior is unchanged and legacy pipeline does not touch `app_build_*` tables.
10. **Architecture:** fixture confirms imports from `server/` inside `appBuilder/` are rejected.

Golden benchmark (`tests/app-builder-golden.json`): Tetris, to-do list, calculator, three-page business card site. Each task defines expected files, required acceptance predicates/keywords, and a call ceiling. The Tetris ZIP with fake model is an acceptance gate for P93.2a + P93.2b together, not P93.2a alone.

Whole-core acceptance requires all relevant tests and independent checks green; `check-version`, `check-docs`, architecture boundaries, and TypeScript must pass. On the fake model, Tetris must produce non-empty `index.html` and `app.js`, with `goalImplemented=true` only after required validators pass. Failures must be honestly reported as `partial`/`failed` with reasons in the report and diagnostics.

## 10. Patch sequence

Each patch is a cumulative ZIP produced with `scripts/pack-simple.mjs`, with a new topmost `CHANGELOG.md` entry. Apply one patch at a time; proceed only after CI is green for the previous patch.

| Patch | Scope | Acceptance |
|---|---|---|
| **P93.0** | Safe Unicode download filename; preflight allows flat `appBuilder/` files | Unicode download returns 200; preflight accepts `appBuilder/*.ts` |
| **P93.1** | Contracts, units, profiles, ports, plan validation, markers, TypeScript/architecture/docs integration | Tests 1, 2, 10 for the original contract scope pass; core makes no model calls |
| **P93.2a** | Generic engine, fake `ModelPort` tests, versioned prompts, cache keys, ZIP packer, build report | Fake-model engine, report/ZIP, cache-key and marker tests pass; no provider adapter, routes, DB, static-site stack, or stack validators |
| **P93.2b** | `static_site` stack, static validators, cross-check and machine-checkable acceptance predicates | Validator and golden tests pass; Tetris golden task passes with fake model when combined with P93.2a |
| **P93.3** | Persistence/recovery, adapter, routes, diagnostics, feature flag | Live recovery tests pass; unset/false flag preserves legacy behavior and does not access `app_build_*` tables |
| **P93.4** | Progress UI and diagnostic result integration | Manual Render verification with a free key: Tetris ZIP, download, and Drive flow |
| **P93.5** | Model review, additional stacks one at a time, profile-based parallelism | Separate specification, only after P93.4 acceptance |

P93.1 is the contract foundation. P93.2a and P93.2b deliberately separate the generic execution machinery from the first stack and its validators. P93.3–P93.5 remain out of P93.2a scope.

## 11. Execution protocol and defaults

1. Read `AGENTS.md` and the newest `CHANGELOG.md` entry. Confirm the baseline is P92.7 or newer with P93.1 contracts; ask if it is not.
2. Follow the patch order in §10, one patch at a time, with cumulative ZIP and a topmost changelog entry.
3. Before delivery, run `check-version`, TypeScript, `check-docs`, architecture checks, focused App Builder tests, and the full independent-check chain where the environment permits. Report checks as passed, failed, blocked, or not run.
4. Never weaken/remove tests or present a fake provider as a real model integration.
5. Owner response should be concise and in Russian.

Defaults unless the owner changes them:

- At most 25 model generation calls per job; at most 2 generation attempts per unit.
- Partial results are downloadable with an explicit list of missing work; “Continue” reuses completed units without additional generation calls for those units.
- First stack: `static_site` only.
- `APP_BUILDER_ENGINE` is off by default.
- Core has no provider/server dependencies; JSZip is an existing project dependency used for archive assembly.

**Gemini free-tier rate limits and model cascade:** values previously noted for Gemini 3.x models and `MODEL_CASCADE_LIGHT` / `MODEL_CASCADE_STRONG` are provisional operational notes, not core constants. Verify them against current provider limits and observed tests before using them in deployment configuration.
