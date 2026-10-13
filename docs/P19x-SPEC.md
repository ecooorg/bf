# P19x — model_patch driver (complete BX-21.b wiring)

**Goal.** Wire the full `model_patch` path: after a code task is started with executor `model_patch`, the service calls `code_author` via Router using the currently confirmed `json_output` capability (the Gemini adapter does not claim a separately verified native `code_patch` capability), validates the structured patch with `validateModelPatch`, commits to `biforge/<task_id>` and opens a PR. Enablement remains gated by `CODE_EXECUTOR=model_patch` and ADR-10 (E-01). Default stays `manual`.

**Base.** Owner archive `bf-v24.zip` (13 October 2026), PA-01 delivered, CI green on `main`. Navigator command: «старт P19x + сразу PA-02».

**May change.** `server/codeTaskService.ts` (driveModelPatch, CodeTaskDeps.modelCaller, start path for model_patch), `server/codeExecutor.ts` (exports used by drive; no behaviour change to validateModelPatch), `tests/p19x-acceptance.test.mjs` (new), `docs/P19x-SPEC.md`, `docs/DELEGATION.md` (test repo approved), `docs/CURRENT_STATE.md`, `docs/NEXT.md`, `docs/REPO_MAP.md`, `docs/START_HERE.md`, `CHANGELOG.md`, `package.json` (test script only).

**Must not change.** Simple Mode, manual executor behaviour when `CODE_EXECUTOR` is not `model_patch`, Gate Engine, merge, `tests/acceptance/**`, APP_VERSION (process completion of P19; same precedent as PA-01 / PI-*).

**Behaviour.**
1. `validateModelPatch` rejects schema-invalid, protected paths (`tests/acceptance/**`, `.github/**`, `AGENTS.md`, lockfiles, CI config), path escape, oversized sets, binary/unsafe paths (already implemented; now covered by acceptance tests).
2. `driveModelPatch(projectId, taskId, codeTaskId, deps)` claims `RUNNING`, builds a prompt from the stored package, calls the production Router-backed `deps.modelCaller` using confirmed `json_output` capability, parses JSON, validates, converts to branch changes, commits and opens PR, settles `DELIVERED` or `BLOCKED`/`FAILED`.
3. When `startCodeTask` selects `model_patch` and creates a new run, it invokes `driveModelPatch` after the row exists (no separate human submit). Failures surface as `BLOCKED`/`FAILED` with violations; they never write outside `biforge/*`.
4. `CODE_EXECUTOR` default remains unset/`manual`. Setting `CODE_EXECUTOR=model_patch` without E-01 / ADR-10 acceptance is a Tier 3 owner action.

**Defaults chosen (Tier 1).**
- Product version not bumped (PA-01 precedent).
- `modelCaller` is injectable for tests; production caller is wired in `server.ts`; it fails clearly when Gemini is not configured or the Router has no suitable JSON-output model.
- E-01 human-time comparison stays sum of three tasks (PA-01 default).
- Test GitHub repository for PA-02 is **approved** (Navigator, 13 October 2026).

**PASS criteria.**
- Machine: `npm run test:p19x` green; existing `npm run test:p18` / code-executor tests still green where runnable; `check-docs` / `check-version` pass.
- Protected path / escape / size / schema-invalid patches are rejected without GitHub writes.
- Happy path with fake `modelCaller` + fake GitHub reaches `DELIVERED` with branch `biforge/<task_id>` and a PR URL.
- With `CODE_EXECUTOR` unset, requesting `model_patch` still throws `EXECUTOR_UNAVAILABLE`.

**Read in the TZ.** 11.4, 11.5, 11.7, 11.9, ADR-10.

**Tests to add.** `tests/p19x-acceptance.test.mjs` — validateModelPatch matrix; drive with fakes (success, validation block, model error).

**`CHANGELOG.md`.** "P19x: model_patch driver (code_author → validate → biforge branch → PR); still gated by CODE_EXECUTOR and ADR-10."

**Not done / postponed.** The owner must still configure `CODE_EXECUTOR=model_patch` and the project passport explicitly. No native `code_patch` capability is claimed for Gemini. Automatic repair based on runtime failures and hosted preview require an isolated runner and remain out of scope; the server never executes generated code.

## Product-facing program creation (added 13 October 2026)

- `POST /api/projects/:projectId/code/build` accepts a natural-language goal and creates a durable code task. It requires a confirmed passport with `executor=model_patch` and `CODE_EXECUTOR=model_patch`; otherwise it returns `EXECUTOR_UNAVAILABLE` without silently enabling the executor.
- The model prompt confines files to `generated-projects/<task_id>/**`, limits the package to 10 files / 400 changed lines, and requests a standalone browser `index.html` for games and small web utilities when practical.
- A validated source ZIP is saved as an artifact before GitHub delivery. `GET /api/projects/:projectId/tasks/:taskId/code/:codeTaskId/download` returns it. If GitHub writes are disabled or GitHub delivery fails, the source artifact may still be available, but the code task is reported as blocked; it is not falsely marked as CI-passed.
- The server never executes generated code. This patch does not implement a sandboxed runtime, preview hosting, or autonomous repair after runtime failures.
