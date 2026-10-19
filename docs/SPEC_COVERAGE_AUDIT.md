# Spec coverage audit — v55 against all specifications

> Date: 2026-10-18 · Base: v55 (after P55) · Author: P56 · Status: **current**; re-run after every release.

## 1. Scope and method

Compared the code of v55 with the normative documents: `docs/BiForge_TZ_v3.md`, `docs/SPEC_PRODUCT.md`, `docs/SPEC_ENGINE.md`, `docs/SPEC_CONNECTIONS.md`, `docs/SPEC_DEV_PROCESS.md`, `docs/MASTER_IMPLEMENTATION_PLAN.md`, `docs/BiForge_TZ_P26.md`, the ADRs, and the «Not done / postponed» sections of every P-specification.

- **Read in full:** the documents above.
- **Checked mechanically for all 119 documents:** files, API routes, npm scripts and environment variables that a document promises, against the repository.
- **Not done:** no live run against Google, GitHub or Railway; no model-quality judgement. Those belong to MANUAL1.

## 2. Verdict

The three modes work as specified at the level of code and automatic tests. What is left is (a) a small set of **functional gaps** (section 4), (b) **process gaps** in the test suite, most of them closed by P56 (section 5), and (c) **stale documents**, closed by P56 (section 6). Nothing found blocks starting MANUAL1.

## 3. Implemented

| Area | Specified in | State |
| --- | --- | --- |
| Three modes, start cards, one Mode control, no automatic switching | TZ §1, UI1, P51 | Done |
| Simple: plain answers, task type picked inside, decision method only on request, soft-fail retry | MASTER MP2, MP3 | Done |
| Expert: all stages, open dialogue after every stage and after Learn, mode and stage sent to the server | MASTER UI1 (b), P52 | Done |
| Uncertainty and verifier, optional web search | P48, P50 | Done (verifier optional, search off by default) |
| Workspace: attach, unpack (browser), classify, context, ChangeSet with confirm, export, persistence | TZ_P26, P27–P39 | Done in the browser |
| Project core: State with versions and validator, human-only decisions, proposals, plans, approvals, queue and leases, budgets, usage ledger, artifacts, audit events | SPEC_ENGINE §4–§10, §13 | Done |
| Code delivery: gates (CI-only PASS), `manual` and `model_patch` executors, reviewer, decision, repair loop, ZIP programs, Delivery tab | SPEC_ENGINE §11–§12, P17–P22, P43, P53, P54 | Done, GitHub read-only (ADR-06 Amendment 1) |
| Operations: `/health`, `/ready`, `/ops`, migrations 001–014, backup verification, secret scan, redaction, injection corpus | SPEC_ENGINE §14–§15, SECURITY_POLICY | Done (`/ops` partly, see F-02) |
| Connections: manifest, `verify:connections`, monitor and golden-eval workflows | SPEC_CONNECTIONS | Done |
| Google Drive in every mode with visible results | P55 | Done |

## 4. Functional gaps (open)

| ID | Gap | Source | Needs |
| --- | --- | --- | --- |
| F-01 | **Project files.** ADR-12 (accepted) requires server-side unpacking for Project Mode; `server/workspace/ingestWorker.ts` does not exist. Project analysis receives at most about 2,600 characters of attached files. Project artifacts cannot be uploaded or downloaded (only listed and read). | ADR-12, TZ_P26 parity table, SPEC_ENGINE §10.3 | Owner decision: implement or amend the ADR. Then a patch |
| F-02 | **`/ops` metrics.** Shown: queue, abandoned tasks, runs and average duration, disabled providers, migrations, memory. Missing: calls, tokens, latency, fallback share, executor runs, integrity errors, State conflicts, retries. The usage ledger already holds most of it. | SPEC_ENGINE §14.5, §15.5 | Patch (P57), no decision needed |
| F-03 | **Import from Simple Mode into a project** (optional). The schema allows `origin: simple_import`; no route and no button. | SPEC_ENGINE §5.7 | Owner decision |
| F-04 | **Model registry** lives in code, not in the database; `BIFORGE_PROJECTS_ORG` of the connections spec is not used anywhere. | SPEC_ENGINE §7.1, SPEC_CONNECTIONS E.3 | Owner decision (deviation or implement) |
| F-05 | **Postponed by decision:** GitHub write, PR and repository creation (ADR-06 Amendment 1); time-based ledger cleanup (ADR-08); multi-provider cascade (P49); OCR of scanned PDFs, audio, video. | ADR-06, ADR-08, P49, P35 | Reopen after MANUAL1 |
| F-06 | **Project page:** no budget editor, no State version history, no link to `/ops`; one plan template; the worker runs analysis tasks only. | P54 «Not done» | Candidates after MANUAL1 |

## 5. Test and process gaps

| ID | Finding | State |
| --- | --- | --- |
| T-01 | 13 test files were not run by any npm script, so CI never ran them (including `tests/driveMirror.test.mjs`). | **Closed in P56**: wired into `check` (`test:legacy`, `test:pa03`, `test:stage2`); `tests/p56-feature-guard.test.mjs` now fails on any orphan test file. |
| T-02 | `tests/bx06-contract.test.mjs` asserted messages and structure that moved after BX-06 and failed. | **Closed in P56**: the same four contracts asserted against the current code. |
| T-03 | `tests/infra.test.mjs` failed whenever `DATABASE_URL` was set in the environment. | **Closed in P56**: the test starts its server without a database. |
| T-04 | QA1 is a set of static source checks. The behavioural scenarios of MASTER (Graubünden dialogue, «you are being evasive», facts versus hypotheses) cannot be proved offline. | Open: MANUAL1 |
| T-05 | Gates G0–G4 are not recorded as closed anywhere; `docs/RIGHTS_REVIEW.md` has no owner signature and the real GitHub App rights are NOT_RUN. | Open: owner |
| T-06 | iOS/Safari live acceptance of Workspace is NOT_RUN. | Open: owner |

Correction to the earlier summary: `tests/acceptance/` is absent **by design** (`AGENTS.md`: it is created when expectation tests are introduced), not a defect. `stage2` passes 204/204 and exits 0; it takes about two minutes, which P56 adds to the CI run.

## 6. Documents

**Fixed in P56:** `STATUS` (date, row order, next steps, open questions), the status line of `MASTER_IMPLEMENTATION_PLAN`, `PLAN-EXPERT-OPEN` (implemented), the patch table of `BiForge_TZ_P26`, `ADR-12` (implementation status note; decision unchanged), `USER_GUIDE` and the in-app guide (Drive folders, Project buttons), `PA-03-SPEC` (`test:pa03` exists again).

**Open:** ADR-03 (provider choice) has no file; some historical documents link to reports that are no longer in the repository (for example `P17-SPEC`, `BX-06-REPORT`); they are history, not requirements.

## 7. Recommended order

1. Deploy v55 with P56, run the Smoke and **MANUAL1**, including scenarios 6 (Project delivery) and 7 (Drive).
2. **P57:** `/ops` metrics from the ledger (F-02).
3. **Owner decisions:** F-01 (ADR-12), F-03, F-04, T-05.
4. After MANUAL1: F-05 and F-06 in the order the manual results suggest.

## 8. Protection against regressions

From P56 on, `tests/feature-manifest.json` lists the public surface (API routes, modules, key screens and controls, the check chain) and `tests/p56-feature-guard.test.mjs` fails when any of it disappears. New features need no edit; an intentional removal must edit the manifest and be explained in `docs/PATCH_JOURNAL.md`.
