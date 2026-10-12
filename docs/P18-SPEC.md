# P18 — CodeExecutor and the `manual` executor (BX-21.a)

**Goal.** A human can start a code run for a task with a Task Package, take `PACKAGE.md` to any tool and return the result as a PR, a branch or a unified diff; every result passes the checks of TZ 11.4 before it counts as delivered. Nothing runs code or calls a model (D-03); merge stays with the human.

**Base.** `bf-main-p17.zip` (uploaded 2026-10-12).

**May change.** New: `server/codeExecutor.ts`, `server/codeTaskService.ts`, `migrations/010_code_tasks.sql`, tests, this SPEC. Changed: `server/githubIntegration.ts` (reads and the two writes below), `server/gateService.ts` (one call), Project Mode routes in `server.ts`, `package.json` scripts, `connectors.yaml`, `.env.example`, documents.

**Must not change.** Simple Mode, existing tables and routes, the task state machine (a code run does not move a Task), the Gate Engine rules and routes, `tests/acceptance/**`, CI workflows, the model layer.

**Rules implemented (TZ 11.3, 11.4, 11.7).**
- `CodeExecutor` (`id`, `start`, `poll`) with states WAITING_HUMAN, RUNNING, DELIVERED, FAILED, BLOCKED; `manual` implements it over a store. Table `code_tasks` (executor, status, branch, head_sha, pr_url, executor_note, counts; no vendor names).
- Task Package: schema (AGENTS.md, SPEC, ACCEPTANCE, EXECUTOR_PROMPT, `allowed_paths`, acceptance tests, context files, limits); `PACKAGE.md` is built deterministically, refused when it holds secret-looking text (rule ids only are reported) or exceeds 1 MB, stored as an artifact (registry copy with manifest) and handed over by an export route; never committed.
- Limits: at most 10 files and 400 changed lines; a package may lower them, not raise them.
- Validation of a diff (and of a PR or branch, as far as the GitHub file list shows): safe paths (no `..`, absolute, backslash); inside `allowed_paths`; protected paths refused unconditionally (`tests/acceptance/**`, `.github/**`, `.biforge/**`, `.git/**`, `AGENTS.md` at any depth, dependency lock files, CI configuration; case-insensitive); text only (no binary, no exec bit or mode change, no symlink or submodule, no rename or copy). Violations are returned as codes with paths, never as file content.
- Diff upload: parsed and validated first (pure), then originals are read from the task branch (or the base branch), hunks are applied strictly (exact context), and the result is written with the Git Data API as one commit on `biforge/<task_id>` (never force, never `main`, no workflows), then a PR is opened. The run is claimed (`RUNNING`) so two parallel uploads cannot both write.
- A refused result sets the run to `BLOCKED(validation_failed | apply_failed | github_error)` with the violation codes; the human may submit again. A stuck run is ended by a human cancel (reason required).
- The PR is found by the head branch `biforge/<task_id>`: through the signed `pull_request` webhook (P17 path calls the sync), or `refresh` (polling), or by the number the human submits.

**Defaults chosen** (no P18 SPEC or acceptance tests were supplied; change here if the owner wants otherwise).
- Executor: the project passport decides; `manual` only. `model_patch` (passport or `CODE_EXECUTOR=model_patch`) answers `EXECUTOR_UNAVAILABLE` until P19.
- Who approves the package: a human who submits it through the session-only `start` route. There is no separate approval record and no model-written package yet (P20). A package with `sensitivity = high` is refused (`APPROVAL_REQUIRED`) because the approval of TZ 13.6 does not exist yet.
- Writes to GitHub are off unless `GITHUB_DIFF_UPLOAD=true` (TZ 11.7: writes only for diff upload or `model_patch`). With the switch on, the installation token is checked against the write manifest for reads as well (otherwise a write-capable App could not read). Without the switch, behaviour is as in P16/P17.
- PR lookup is by branch `biforge/<task_id>` only, not by `task_id` in the PR description: the Gate Engine (P17) links CI evidence by that branch, so a PR from any other branch would have no gates.
- For a PR or branch the product cannot see file modes or binary content; a modified or added file without a text patch in the GitHub answer is a violation (`binary_or_unreadable`). A renamed file is checked as a deletion plus a creation. GitHub lists at most 300 files in a comparison; that many is `diff_truncated`.
- Budget: `max_code_tasks` is checked at start (project scope: tasks with code runs; task scope: runs of the task). Over the limit is `BUDGET_EXCEEDED`; no approval request is created and nothing is raised automatically. The passport `executorRuns` field is not consulted (P13 does not use it either).
- A delivered code run does not change the Task state or gate results; a pull request opened after the commit that fails leaves a delivered branch without PR number (found later by webhook or `refresh`).
- `executor_note` (free text of the human, 500 characters) and the cancel reason are stored and never interpreted. No UI (as in P17); routes are used from the console.
- Routes (human session only, same origin, strict bodies, no actor field is read from a request): `GET .../tasks/:taskId/code`, `POST .../code/start`, `GET .../code/:id`, `GET .../code/:id/package`, `POST .../code/:id/result` (`kind` = `pr` | `branch` | `diff`), `POST .../code/:id/refresh`, `POST .../code/:id/cancel`. The `/code` routes accept bodies up to 1200 kB, and only after the session check.

**TZ 16.4.4 applicability.** 1 yes (routes: forged actor field rejected 400, no session 401, model actor 403 at service level). 2 not applicable: no model call. 3 yes (parallel starts, parallel diff uploads). 4 not applicable: state lives in PostgreSQL, no worker; a run stuck in `RUNNING` is ended by cancel. 5 not applicable. 6 partly: seeded fuzz of the diff parser (`FUZZ_SEED`, seed printed). 7 yes (migration applied twice). 8 not applicable. 9 yes (10/11 files, 400/401 lines). 10 yes (notes and reasons stay data). 11 not applicable: no screen. 12 yes (`check:docs`). 13 not applicable.

**PASS criteria.**
- Machine: `npm run test:p18`, `npm run test:github`, `npm run test:gate`, `tests/code-task-live.test.mjs` and `tests/code-task-api-live.test.mjs` on PostgreSQL, `npm run check`, `npm run build`.
- Owner on Railway (REAL_ONLY until the GitHub App exists): 1) in the browser console of the signed-in `/project` page call `POST .../tasks/<task>/code/start` with a package and read `.../package`: PACKAGE.md appears. 2) Do the work with any tool, open a PR from `biforge/<task>`, then `POST .../code/<id>/refresh` (or `result` with `{"kind":"pr","pr_number":N}`): status `DELIVERED`. 3) Return a PR that touches `tests/acceptance/**`: status `BLOCKED` with `path_protected`.

**Read in the TZ.** 11.3-11.5, 11.7, 11.8, 12 (Test Integrity), 16.3-16.4.4.

**Not done / open.**
- No UI; `model_patch` is P19; the package author (`brief_writer`) and the approval of a package are P20.
- **Open question for P20:** committing the Task Package to `biforge/<task_id>` (TZ 11.3) puts `tests/acceptance/**` into the PR diff, and the P17 rule makes any change under that path FAIL for `test_integrity`. P18 therefore does not commit the package (`commitTaskPackage` stays unused). How the acceptance tests reach the repository without failing the gate (for example Test Integrity compared against the package commit) needs a rule decision.
- The real GitHub App has not been exercised (REAL_ONLY); an App with write permission is required for diff upload.
