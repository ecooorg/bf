# P127.8 — Project Mode recovery and acceptance

## Automated acceptance

- [ ] `npm run test:project` passes, including stale-job lease and app-builder checkpoint recovery tests.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes (client and server).
- [ ] `npm run docs:check` passes.
- [ ] `npm run test:core` passes, including Simple direct-conversation and Expert/provider regression suites.

## Live database recovery

1. Start a staged Project Mode build and wait until at least one unit result is persisted.
2. Stop the worker process without cancelling the job.
3. Start two application replicas against the same PostgreSQL database.
4. Confirm exactly one replica claims and resumes the stale job; the other skips the locked/fresh heartbeat row.
5. Confirm completed units are reused from `app_build_unit_results`, only unfinished units are generated, and the final ZIP is stored and downloadable.
6. Confirm cancelled and completed jobs are not resumed.

## Browser acceptance — Project Mode

1. Create a new project and confirm its project passport.
2. Generate a 3D Tetris project (canvas/WebGL or equivalent browser-rendered 3D scene) and wait for validation and packaging.
3. Confirm the UI reports the actual build state; no success state or download link is shown without a stored artifact.
4. Open the artifact inventory, inspect the ZIP, and download the latest version and one older immutable version.
5. Refresh the browser and navigate between Results, Plan, Delivery, Files/Journal, and Advanced Data. Confirm the selected project and current section remain coherent and no dead-end navigation occurs.
6. Open the downloaded ZIP locally and verify its contents and integrity. Launch the project locally; confirm the 3D scene renders and core Tetris controls work.
7. Continue the project with a small change, confirm a new immutable version is created, and confirm the previous version remains downloadable.
8. Attempt a cross-project artifact download and an invalid version number; both must be rejected without disclosing another project's bytes.

## Regression boundary — Simple and Expert

- Run the full `test:core` suite and compare the Simple and Expert route/UI smoke checks with the release baseline.
- Verify Simple text conversation, attachments, retry, model selection, and response envelope.
- Verify Expert route, model/provider policy, structured response behavior, and safety flow.
- Confirm Project Mode feature flags and authentication do not alter Simple/Expert navigation or rendering.

## Evidence classification

A local unit/contract test is not evidence of a live PostgreSQL race test, browser rendering, or deployed user outcome. Record each item as `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN` with environment, commit, and log evidence. Do not mark the patch fully accepted until all applicable automated and live checks above have evidence.
