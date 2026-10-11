# P17 — Gate Engine and CI evidence (BX-20)

**Goal.** PASS of a gate exists only as a function of registered evidence bound to the current commit SHA; CI results arrive through the signed GitHub webhook; a change of the commit invalidates earlier evidence; changing protected tests is FAIL.

**Base.** `bf-main-p16.zip` (with the CI fix for `connectors.yaml` / `docs/CONNECTIONS.md` already applied).

**May change.** New files `server/gateEngine.ts`, `server/gateService.ts`, `migrations/009_gate_evidence.sql`; the webhook route and two read/waive routes in `server.ts`; `server/githubIntegration.ts` (P16 completion); tests, scripts entries in `package.json`, documents.

**Must not change.** Simple Mode, existing tables and routes, the task state machine (`/validate` keeps working as before), `tests/acceptance/**`, CI workflows, executor selection.

**Rules (TZ 12).**
- Gates: requirements, spec, build, test, test_integrity, security, review, release_candidate. Sources: CI check run (build, test, security), PR diff (test_integrity), human approval (requirements, spec, review), engine (release_candidate). A model statement is not a source and is rejected.
- Status of a gate at a commit: latest evidence per check; any FAIL, then BLOCKED, NOT_RUN, REAL_ONLY prevents PASS; no evidence is NOT_RUN. WAIVED only by a human waiver with reason, bound to the commit, written to `audit_events`.
- Release Candidate is derived: PASS only if every other gate is PASS or WAIVED; its manifest lists commit, rules version, gate statuses, tools, decisions and risks.
- A different head SHA (`pull_request` or `check_run` event) invalidates evidence of earlier commits (`invalidated_at`, `invalidated_reason`); rows are never deleted.
- Test Integrity: any add, change, rename or removal under `tests/acceptance/**` is FAIL; an unreadable diff is BLOCKED; unsafe paths count as protected.
- Webhook payloads are untrusted data: typed fields only, free text is not stored or interpreted, logs are not read. Redelivery is idempotent (`UNIQUE (task_id, source, source_ref)`).

**Defaults chosen** (no P17 SPEC or acceptance tests were supplied; change here if the owner wants otherwise).
- Task link: the head branch must be `biforge/<task_id>` and the task must exist; other events are acknowledged and ignored.
- Repository filter: if `GITHUB_REPOSITORY_OWNER` and `GITHUB_REPOSITORY_NAME` are set, events from another repository are ignored.
- Check name to gate map (first match wins): security (`secret|security|audit|codeql|dependabot`), test (`test|acceptance|unit|integration|check`), build (`build|compile|lint|typecheck`); other checks create no evidence. The map is code (`DEFAULT_CHECK_MAP`), not configuration.
- Conclusions: success PASS; failure FAIL; timed_out, cancelled, action_required, startup_failure, stale BLOCKED; neutral, skipped or not completed NOT_RUN.
- Owner approval of a protected-test change is expressed as a human WAIVED on `test_integrity`.
- Routes: `GET /api/projects/:projectId/tasks/:taskId/gates`, `POST .../gates/:gate/waive` (body `commit_sha`, `reason`; actor is always `human`). No UI.
- The gate result does not change Task state; wiring PASS of a Task to the Gate Engine is left to the code-delivery patches (P18+). Evidence rows are not stored as artifacts (log links only).

**PASS criteria.** `npm run test:gate`, `npm run test:github`, `tests/gate-live.test.mjs` on PostgreSQL, `npm run check`, `npm run build`; owner: send a signed `check_run` for a `biforge/<task_id>` branch and read the gates route.

**Not done.** Real GitHub App not exercised (REAL_ONLY); no Repair Loop, no reviewer, no UI; `review`, `requirements` and `spec` evidence has a service function (`recordApproval`) but no route yet.
