# P54 — Project interface for gates and manual Code Delivery

**Goal.** Everything the server already does for «specification → code → PR → CI → review → decision» becomes usable from the Project page: create a hand-off task, get and approve the Task Package, report the result (PR or branch), see the gates, run the reviewer, record the human decision, request a repair, cancel. All with GitHub **read-only** (P53).

**Base.** `bf-v48` with P52 and P53. Runs before MANUAL1.

## Problem

The API exists since P17–P22 (gates, `manual` executor, reviewer, decision, repair loop) but `src/ProjectMode.tsx` calls none of it except `/code/build`. A person cannot see a gate, cannot return a PR, cannot accept or reject a result. The only path from the page is «Create program» → ZIP, and it is disabled unless the project uses the automatic executor. There is also no server route that creates a hand-off task without a plan or the automatic executor.

## Design

### Server (additive, human session only, actor never read from the body)

1. **`POST /api/projects/:projectId/code/manual`.** Body (strict): `goal` (1–4000), `constraints?`, `acceptance_criteria?`, `allowed_paths?` (≤100), `idempotency_key?`. Requires a confirmed passport (`409 PASSPORT_NOT_CONFIRMED`) and passport executor `manual` (`409 EXECUTOR_MISMATCH`). Creates a Task (`profile: code_author`, same shape as `/code/build`), builds the package with `buildTaskPackageFromBrief`, calls `startCodeTask` (executor `manual` → `WAITING_HUMAN`). Returns `201 { taskId, codeTask }`. Same idempotency key → same task, `200`.
2. **`GET /api/projects/:projectId/code`.** Lists the project's code tasks newest first with the task title (new `listProjectCodeTasks` in `server/codeTaskService.ts`).
3. **`expectedBranch`** added to the code task object (`taskBranchName(task_id)`), so the page can say exactly which branch the PR must come from. Additive field.
4. Gates, approve/waive, result, refresh, cancel, review, decide, repair, package export: **no change** of contract.

### Interface

New component `src/ProjectDelivery.tsx`, pure helpers in `src/projectDeliveryModel.ts`. `ProjectMode.tsx` only adds the tab **Delivery** (after Plan) and mounts the component with `projectId`, the `api` helper, `busy`, `capabilities` and an `onChanged` callback. The `api` helper keeps `Error.message` and now also sets `error.code` from the payload.

**List.** Code tasks of the project (title, status in plain words, updated). Button **New hand-off task** (disabled with a reason when passport is unconfirmed or executor is not Manual; hint «Set «How code is written» to Manual only»). Plan tasks link here from the Plan tab when they have a code task.

**Task view = one screen with a step strip** driven by `nextDeliveryAction(codeTask, gates, caps)`:

| Step | Shown when | Controls |
| --- | --- | --- |
| 1 Package | always | goal and acceptance criteria; hash (12 chars); **Download PACKAGE.md** (`GET …/package`, saved in the browser); **Approve package** (`POST …/approve`) |
| 2 Hand-off | package approved, `WAITING_HUMAN` | plain instructions: take the package to any tool; the result must come from branch `expectedBranch`; copy buttons for the branch name |
| 3 Result | `WAITING_HUMAN` or `BLOCKED` | choose **Pull request number** or **Branch** (both need GitHub read; if off → explanation, not a dead button) → `POST …/result`. **Diff** and **Commit package** appear **only** when `capabilities.githubWrite` is on |
| 4 Refresh | delivered | **Refresh from GitHub** (`POST …/refresh`); shows «changed / no change» |
| 5 Checks | a commit exists | gates panel (below) |
| 6 Review | `DELIVERED` | **Run review** with optional notes (`POST …/review`) → findings list by severity |
| 7 Decision | reviewed | **Accept / Ask for repair / Reject** with reason (`POST …/decide`); confirmation dialog; accept copy: «You merge in GitHub yourself. BiForge never merges.» |
| 8 Repair | decision `repair` or failed checks | **Request repair** (`POST …/repair`): trigger, «flaky» toggle, log excerpt; shows next action or the stop reason (max attempts, identical diff, identical error, no progress, budget) |
| — | any open state | **Cancel** with a mandatory reason (`POST …/cancel`) |

**Gates panel (`GET …/tasks/:taskId/gates`).** Eight rows, plain names: requirements → «Requirements approved», spec → «Specification approved», build → «Build», test → «Tests», test_integrity → «Tests untouched», security → «Security checks», review → «Review approved», release_candidate → «Ready for your release decision». Statuses: PASS «Passed», FAIL «Failed», BLOCKED «Blocked», NOT_RUN «Not run», REAL_ONLY «Needs a check in a real environment», WAIVED «Waived by you» with the reason. Each row shows its reasons from the server. Short commit id (7 chars) with a copy button.
- **Approve / Reject** buttons only on `requirements`, `spec`, `review` (`POST …/gates/:gate/approve`, status PASS or FAIL).
- **Waive** on any other non-passing gate: reason is mandatory, bound to the shown commit (`POST …/gates/:gate/waive`), confirmation dialog stating that the waiver is recorded.
- `build`, `test`, `security`, `test_integrity`, `release_candidate` are read-only with the line «Only CI can set this» (D-08). No button ever sets PASS for them.
- No commit yet (`gates: null`) → «Checks appear after a pull request from `<expectedBranch>` is linked.»
- Release manifest summary under the panel when present.

**Honesty and tone.** `NOT_RUN` is shown as such, never as a pass; nothing auto-polls; nothing is auto-decided; no internal labels (`gates-v1`, executor ids, stage numbers). Error codes map to plain sentences in `projectDeliveryModel.ts` (`APPROVAL_REQUIRED`, `CODE_TASK_ACTIVE`, `PR_MISMATCH`, `PR_NOT_OPEN`, `BRANCH_MISMATCH`, `BRANCH_NOT_FOUND`, `GITHUB_NOT_CONFIGURED`, `DIFF_UPLOAD_DISABLED`, `CODE_TASK_CLOSED`, `HUMAN_REQUIRED`, budget codes); unknown codes fall back to the server message.

**Mobile and accessibility.** One column; controls at least 44 px high as elsewhere on the page; no table wider than the screen; status changes announced in a `role="status"` region; destructive actions behind a confirm step; the create form uses one idempotency key per opening, so a double tap does not create two tasks.

## May change

`server.ts` (three additions above), `server/codeTaskService.ts`, `src/ProjectDelivery.tsx` (new), `src/projectDeliveryModel.ts` (new), `src/ProjectMode.tsx`, `src/index.css` (only if a class is unavoidable), `tests/p54-project-delivery.test.mjs` (new), `tests/code-task-api-live.test.mjs`, `tests/ui-check.mjs` (Delivery tab on the existing viewports), `package.json` (`test:p54`, added to `check`), `docs/OWNER_OPS.md` (MANUAL1 scenario S6), `docs/REPO_MAP.md`, `docs/STATUS.md`, `docs/PATCH_JOURNAL.md`.

## Must not change

Gate Engine rules and statuses; Code Delivery state machine; human-only rules; `/code/build`; Simple and Expert; migrations (none needed); anything that writes to GitHub.

## PASS criteria

**Machine.** `npm run check` and `npm run build` pass, including `test:p54` and the live PostgreSQL contract tests.

**Owner (needs GitHub App with read rights and a repository; otherwise steps 4–6 are `NOT_RUN`).**
1. Project → description confirmed, «How code is written» = Manual only → **Delivery → New hand-off task**, describe a tiny change → the task appears as «Waiting for you»; **Download PACKAGE.md** saves a file; **Approve package** works.
2. Carry the package to any tool, open a PR from the shown branch → **Result → Pull request number** → status becomes «Delivered»; a wrong branch gives a plain explanation.
3. **Refresh from GitHub** → the Checks panel shows Build/Tests/Security from CI; requirements/spec/review can be approved by you; CI rows have no buttons.
4. **Run review** → findings listed; **Decision → Accept** → confirmation says you merge in GitHub; the task closes. Try **Ask for repair** on a second task → repair shows its next step or stop reason.
5. With GitHub write off, no «Diff» or «Commit package» control is visible.

**Read in the TZ.** `SPEC_ENGINE.md` §11.3–§11.8, §12; `SPEC_PRODUCT.md` §1.2 (UI must not leak protocol jargon); `docs/P18-SPEC.md`, `P20b-SPEC.md`, `P21-SPEC.md`, `P22-SPEC.md`.

## Tests to add or change

- `tests/p54-project-delivery.test.mjs`: (a) label maps cover **every** gate in `GATES` and **every** status in `GATE_STATUSES`; (b) `nextDeliveryAction` table over code task states × capabilities (no write control when write is off; no PASS control for CI gates); (c) error-code map covers every `CodeTaskError` code found by scanning `server/codeTaskService.ts`; (d) wiring: tab, component, each endpoint string, `error.code` in the `api` helper; (e) no import of a write endpoint outside a `githubWrite` branch.
- `tests/code-task-api-live.test.mjs`: `code/manual` happy path, idempotent repeat, `PASSPORT_NOT_CONFIRMED`, `EXECUTOR_MISMATCH`; `GET code` lists newest first; `expectedBranch` equals `biforge/<task_id>`; foreign project is `404`.
- `tests/ui-check.mjs`: Delivery tab renders on the existing viewports without horizontal scroll.

## `CHANGELOG.md`

«P54: Project page can run manual Code Delivery and shows and acts on gates: package, result, refresh, checks, review, decision, repair, cancel.»

## Not done / postponed

Any GitHub write (P53 D3); automatic polling or webhooks display; PR creation by BiForge; uploading or downloading arbitrary project artifacts, a budget editor, State version history, a `/ops` link and more plan templates (candidate next patches, not required for MANUAL1).
