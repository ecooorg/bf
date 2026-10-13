# Next work: the road from P24 to BiForge v2.0 (G4)

> Updated 13 October 2026 after PA-05 (E-01 closed, ADR-10 Accepted). P24 and the model-pool fix remain the product base. This is the **only** file that changes step by step; the specification files (`docs/SPEC_PRODUCT.md`, `docs/SPEC_ENGINE.md`, `docs/SPEC_DEV_PROCESS.md`) stay stable. It replaces the former TZ section 16.7 (original text: `ARCHIVE/TZ_v3.0_SECTION_16_7.md`). Step set, order and PASS criteria are unchanged; only the form is flat. The AI Assistant updates this file at the end of every patch (step marks `[x]` only with a record in the repository).

**Done recently:** P20–P24; PI-01…PI-03; P15a; model pool update; PA-01…PA-05 (E-01 + ADR-10 Accepted).

**Code patches left: one product gate.** **P19x** implementation is in the repository (gated; enablement authorized by ADR-10 Accepted — RM-C3 on owner command). **P25** (step RM-F7) remains. Everything else is owner actions and documents. Next agent work only on owner command.

## P26 workspace track (owner-commanded, separate from the P25 → G4 checklist)

- [x] **P26a** ZIP ingest core — see `docs/P26a-REPORT.md` (owner reports CI green for base `bf-v26a.zip`).
- [ ] **P26a.2** Finish tar/folder/IndexedDB/context helpers and wire them into Simple + Expert UI; pass AC-04 with fake Gemini. Current implementation slice is `PARTIAL`; see `docs/P26a.2-REPORT.md`.
- [ ] **P26b** ChangeSet and export — do not start until P26a.2 gate is closed and the owner commands it.

## Rules

1. **Strict order:** A -> B -> (C only if the branch after RM-B6 allows it) -> D -> F. Stage E runs in parallel with B-D and must be closed before RM-F4.
2. **A step is closed only when its result is recorded in the repository** (report, ADR or check log: date, commit SHA, CI link). "Done" without a record is `NOT_RUN`.
3. **No secrets** in reports, chat or repository; variable names only.
4. **Data.** Until the paid Gemini tier (RM-A2) and the second provider's data terms (RM-B2) are confirmed, only synthetic data goes into Project Mode.
5. **Rollback.** Every stage ends in a working state. A step that breaks Simple Mode is rolled back per `docs/OPS_ROLLBACK.md`, the reason goes into the report.
6. Reports are written to the files named in the steps (`ARCHIVE/P15-REPORT.md`, `docs/ADR-10-code-executor.md`, `docs/P25-REPORT.md`, `docs/THREAT_MODEL.md`).

**Legend:** **O** owner, **A** agent, **O+A** together. Ids `RM-*` are used so they are not confused with assumptions `A-01…A-10` (`docs/SPEC_ENGINE.md` 3.2), experiment `E-01` and Appendix E sections.

## Stage A. Environment (before any gate check)

- [ ] **RM-A1 · Align Railway Variables with the recommended values** · O
  - Inputs: Railway Variables; "Reference 1" below; remove old model lists and anything that overrides code defaults.
  - PASS: no variables with the old lists (`gemini-3.7-flash`, `gemini-3.5-flash`); the service is active after restart.
- [ ] **RM-A2 · Confirm the paid Gemini tier** · O
  - Inputs: AI Studio / Cloud console: the project of `GEMINI_API_KEY`, billing, spending limit (assumptions A-01, A-02).
  - PASS: a dated record (tier, date) in `docs/CONNECTIONS.md`; the free tier is allowed for synthetic data only.
- [ ] **RM-A3 · Check the live service** · O
  - Inputs: `GET /health`, `GET /ready`; one Simple Mode request.
  - PASS: `commit` in `/health` equals the latest `main` commit; a model answer arrives; no `GEMINI_QUOTA` in logs (a transient failure shows `llm_retry`, one model's quota exhaustion shows `llm_quota` and an answer from the next model).
- [ ] **RM-A4 · One `verify:connections` run** · O
  - Inputs: `npm run verify:connections` for Gemini, PostgreSQL, Groq (where a shell exists).
  - PASS: `OK`, or a recorded `NOT_RUN` with the reason.

## Stage B. Close G1a, G1, G2

- [ ] **RM-B1 · Owner notes on the real S1 analysis** · O (closes G1a)
  - Inputs: a real analysis in Project Mode (criterion 18.0.9): project, date, what worked, what did not.
  - PASS: section "Owner notes" in the G1a report.
- [ ] **RM-B2 · Confirm the second provider** · O+A (closes G1)
  - Inputs: `verify:connections -- --only groq`; one real smoke per E.2; `data_policy` and `last_verified_at` in the registry (Groq Free: synthetic data only, A-08).
  - PASS: `OK` and a registry record, or `REAL_ONLY` with the reason.
- [ ] **RM-B3 · Real fallback smoke** · O
  - Inputs: a test environment whose first cascade model is deliberately non-existent.
  - PASS: the request is served by the next model; `ARCHIVE/P15-REPORT.md` records the model, time and the `route_decisions` row.
- [ ] **RM-B4 · End-to-end scenario 18.1 on Railway** · O (agent prepares the checklist)
  - Inputs: `docs/SPEC_PRODUCT.md` 18.1 (12 points); for each point record result, SHA and a log fragment without secrets.
  - PASS: a 12-row table in `ARCHIVE/P15-REPORT.md`, every row `PASS` or `NOT_RUN` with a reason; at most 12 model calls.
- [x] **RM-B5 · Experiment E-01** · O
  - Inputs: `docs/SPEC_ENGINE.md` 11.9; three small tasks (up to 10 files, ~400 lines, acceptance tests written beforehand), each done by `manual` and `model_patch`.
  - PASS: a table of three pairs: patch applies; CI green on the first attempt; number of fixes (up to 2); human time; cost; SHA; CI links.
  - **Closed 13 Oct 2026 (PA-05):** six pairs in `ARCHIVE/E01-NOTES.md` + `ARCHIVE/E01-RESULTS.json`. 3/3 model green first, 0 fixes, model humanMinutes 0.75 ≤ manual 0.75. TZ §11.9 PASS.
- [x] **RM-B6 · ADR-10 decision (branch)** · O+A
  - Inputs: the RM-B5 table and the rule in 11.9.
  - PASS: `docs/ADR-10-code-executor.md` with status `ACCEPTED` and a link to the table. The outcome selects the path below.
  - **Closed 13 Oct 2026 (PA-05):** ADR-10 status **Accepted**. Owner decision `ok ADR-10`. Stage C path selected (positive branch).
- [ ] **RM-B7 · G2 decision** · O
  - Inputs: RM-B4 and RM-B6 with data in the repository; `docs/SPEC_PRODUCT.md` section 17.
  - PASS: a dated record "G2 accepted" or "G2 not accepted, reason" (if not accepted: scope review, review point 2).

**Branch after RM-B6**

| E-01 outcome | What to do |
| --- | --- |
| Positive (`model_patch` brought at least 2 of 3 tasks to green CI within 2 fixes and is not worse than `manual` in human time) | Do stage C |
| Negative (`model_patch` clearly worse) | Skip stage C; Code Delivery stays `manual` (`CODE_EXECUTOR=manual`); record in ADR-10; go to stage D |
| Both ways failed | S3 narrows to specification and package preparation; the owner reviews G3 before continuing |

## Stage C. P19x (only after a positive RM-B6)

- [ ] **RM-C1 · P19x SPEC** · A
  - Inputs: `docs/PATCH_TEMPLATE.md`; `docs/SPEC_ENGINE.md` 11.4 (`code_author` -> validation -> commit to `biforge/<task_id>` -> PR).
  - PASS: SPEC approved by the owner.
  - Agent note (13 Oct 2026): draft SPEC at `docs/P19x-SPEC.md` in this patch; awaits owner approval.
- [ ] **RM-C2 · Implementation and tests** · A
  - Inputs: a protected path, a path outside the root, an oversized patch and a write outside `biforge/*` must all be rejected; the run limit holds.
  - PASS: `npm run check` green; the "Code executor" tests of `docs/SPEC_PRODUCT.md` 18.3 pass.
  - Agent note (13 Oct 2026): `driveModelPatch` + `tests/p19x-acceptance.test.mjs` added; full `npm run check` / CI not run in agent environment (no node_modules/network).
- [ ] **RM-C3 · Enable `model_patch` and accept one patch** · O
  - Inputs: `CODE_EXECUTOR=model_patch`, `GITHUB_DIFF_UPLOAD=true`; GitHub App write rights are granted at that moment, not earlier.
  - PASS: one accepted PR; a record in the report.

## Stage D. G3 (Code Delivery beta)

- [ ] **RM-D1 · GitHub connection** · O
  - Inputs: `npm run verify:connections -- --only github`; a signed webhook.
  - PASS: `OK`, webhook answers 202; a record in `docs/CONNECTIONS.md`.
- [ ] **RM-D2 · ADR-06 decision and GitHub App rights review** · O
  - Inputs: ADR-06 (`Proposed`); minimum rights, merge forbidden.
  - PASS: ADR-06 `ACCEPTED`, or another recorded decision.
- [ ] **RM-D3 · Pilot task through "package -> PR -> decision"** · O+A
  - Inputs: Task Package -> human approval -> external tool (or `model_patch`) -> PR -> CI evidence in the Gate Engine.
  - PASS: the task reached a PR; evidence is bound to the head commit; the decision is recorded; a human merged.
- [ ] **RM-D4 · Three live Repair Loop runs** · O
  - Inputs: scenarios `trigger ci`, `flaky`, identical diff from `docs/P22-SPEC.md`.
  - PASS: stops by the matching rules; a diagnostic report is saved.
- [ ] **RM-D5 · Test Integrity on a live PR** · O
  - Inputs: a PR that edits a file under `tests/acceptance/**`.
  - PASS: Gate FAIL recorded in the evidence.
- [ ] **RM-D6 · G3 decision** · O
  - Inputs: RM-D3…RM-D5.
  - PASS: a record "G3 accepted" or the reason for refusal.

## Stage E. Operations and security on the real environment (parallel with B-D, before RM-F4)

- [ ] **RM-E1 · Live audit check** · O
  - Inputs: login, failed login, deleting a test project, a settings change.
  - PASS: audit log fragments in the report; no secrets in the records.
- [ ] **RM-E2 · `/ops` and alerts** · O
  - Inputs: the `/ops` page (queue, runs, providers, memory); an artificial alert condition.
  - PASS: the alert fires; screenshot or record without secrets.
- [ ] **RM-E3 · Daily Railway PostgreSQL backup** · O
  - Inputs: backup settings (assumption A-06).
  - PASS: frequency and retention recorded in ADR-09.
- [ ] **RM-E4 · Backup restore** · O
  - Inputs: a clean disposable database; `npm run ops:backup-check -- --live`.
  - PASS: restore succeeds; migrations 001-014 applied; data readable.
- [ ] **RM-E5 · Rollback drill** · O
  - Inputs: `docs/OPS_ROLLBACK.md`; roll back to the previous commit and return.
  - PASS: rollback done by the procedure; time recorded.
- [ ] **RM-E6 · Capacity measurement** · O
  - Inputs: baseline 1 replica, 2 vCPU, 1 GB RAM; pilot load.
  - PASS: memory and queue numbers in the report; above the threshold (guide: 70% RAM) a decision about the baseline.
- [ ] **RM-E7 · Security review** · O+A
  - Inputs: injection corpus in CI; Railway logs; GitHub App roles against `docs/SPEC_ENGINE.md` 11.7.
  - PASS: a dated review record in `docs/THREAT_MODEL.md`.

## Stage F. P25: acceptance and G4

- [ ] **RM-F1 · Choose the pilot tool** · O
  - Inputs: a small real tool (up to 1,000 lines, one language).
  - PASS: goal, boundaries and the readiness criterion recorded in the project passport.
- [ ] **RM-F2 · Acceptance tests before implementation** · O
  - Inputs: tests under `tests/acceptance/**` of the pilot repository.
  - PASS: approved and placed under Test Integrity protection.
- [ ] **RM-F3 · Project in Project Mode: passport, analysis, plan, approvals** · O
  - Inputs: Project Mode on Railway.
  - PASS: passport and State saved; decisions made by a human.
- [ ] **RM-F4 · Path to an accepted PR** · O+A
  - Inputs: package -> executor -> PR -> CI -> gates -> human decision; targets: at most 8 executor runs and 60 model calls.
  - PASS: PR accepted by a human; Test Integrity `PASS`; CI green.
- [ ] **RM-F5 · Repair cycle or Repair Loop stop** · O
  - Inputs: an artificially injected failure.
  - PASS: a Repair Loop diagnostic report.
- [ ] **RM-F6 · Measurements** · O+A
  - Inputs: ledger, audit log, owner time.
  - PASS: a "Cost and time" report section; no secrets were passed to the executor; the audit is complete.
- [ ] **RM-F7 · Patch P25 (code and documents)** · A
  - Inputs: product version "BiForge v2.0" (`package.json`, `check-version`, `CHANGELOG.md`, `README.md`, `DEPLOY_RAILWAY.md`); the G4 report; update `docs/CURRENT_STATE.md`, this file and the specification status.
  - PASS: `npm run check` and CI green; `docs/P25-REPORT.md` per the starred-step template.
- [ ] **RM-F8 · G4 decision** · O
  - Inputs: RM-E4, RM-E5, RM-F4…RM-F6.
  - PASS: a dated record "G4 accepted" (the project moves to maintenance), or the list of missing evidence.

## Process automation (owner-approved 13 October 2026)

Policy: `docs/DELEGATION.md`. **PA-01** (`docs/PA-01-SPEC.md`): the manual workflow `evidence` collects read-only evidence (RM-A3, RM-A4, RM-B2, RM-D1 parts) and `npm run gate:eval` renders decision cards for ADR-10, G1a, G1, G2, G3, G4. A run in GitHub Actions provides the record link; copy it into the report, then the step may be ticked. `PARTIAL` is not `PASS`. Planned, each only on an explicit command: **PA-02** (E-01 harness; needs an approved test repository), **PA-03** (staging drills for RM-E2, E4, E5, E6 and scenario 18.1; staging is allowed).

## Project Mode software creation (implementation patch prepared; CI pending)

- Added an explicit **Create a small program** flow; ordinary text analysis remains separate.
- The flow is gated by the confirmed project passport executor and `CODE_EXECUTOR=model_patch`; the default remains `manual`.
- The Router-backed code author returns a validated source ZIP under the project artifacts. GitHub delivery remains optional/gated; merge remains human-only.
- Owner priority: maximum automation within safety, evidence and delegation boundaries. See `docs/DELEGATION.md`, `docs/PROGRAM-CREATION-SPEC.md` and `docs/SPEC_ENGINE.md` §11.10.
- **Agent note:** docs/version checks pass. Full typecheck/tests/CI are not confirmed because dependency installation timed out in this environment. Do not close this step until CI evidence is recorded under the normal rule 2.

## Decision points

| Decision | Who | Basis |
| --- | --- | --- |
| Accept G2 | O | RM-B4 and RM-B6 with data in the repository |
| Enable `model_patch` | O | The E-01 table and the rule in 11.9 |
| Accept ADR-06 and grant GitHub App write rights | O | RM-D1, RM-D2; write rights only when needed (`GITHUB_DIFF_UPLOAD`) |
| Accept G3 | O | RM-D3…RM-D5 |
| Accept G4 | O | RM-E4, RM-E5, RM-F4…RM-F6 |

## What can go wrong

1. E-01 shows code cannot be produced either way: S3 narrows, G3 is reviewed (`docs/SPEC_PRODUCT.md` section 17, review point 2).
2. Gemini quota is exhausted: other pool models serve requests; if the quota is per project, move to the paid tier (RM-A2) or a BYOK key.
3. Scenario 18.1 does not fit in 12 calls: find the cause in the ledger; do not raise the limit without a report entry.
4. CI is red in stage C or F: fix with a separate reserve patch (`docs/SPEC_DEV_PROCESS.md`, patch rule 5).

## After G4 (only on explicit owner command)

| Work | Condition |
| --- | --- |
| P15b: market watch for models | Explicit command; candidates enter the registry only disabled |
| TP-HALLUC: hallucination cross-check | After G4 or on a real problem; source `CONCEPTS/TP_BiForge_Hallucination_CrossCheck.md` |
| Items of `docs/SPEC_PRODUCT.md` section 19 ("Deferred") | A separate ADR and evidence for each |
| Model pool control | Monthly and on a `DRIFT` notice: compare with the provider's documentation; update `MODEL_CASCADE_*` and the registry in `server/modelRegistry.ts` |
| Web search in Simple Mode | Only by owner decision, a separate patch with a SPEC |

## Reference 1. Recommended Railway Variables (for RM-A1)

| Variable | Value | Note |
| --- | --- | --- |
| `MODEL_CASCADE_LIGHT`, `MODEL_CASCADE_STRONG` | leave unset (code default) or `gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite` | `gemini-3.7-flash` and `gemini-3.5-flash` are deprecated aliases with a shared quota (checked 12 October 2026) |
| `LLM_CALL_TIMEOUT_MS` | `25000` | One hung call must not take most of the total time |
| `LLM_TOTAL_DEADLINE_MS` | `70000` (default) | |
| `MAX_MODEL_CALLS` | `4` (default) | |
| `DAILY_CALL_CAP` | `1000` during the pilot | Counts every attempt, failed ones included; tune to the budget |
| `RATE_LIMIT_PER_HOUR` | `60` | |
| `TRUST_PROXY_HOPS` | `1` | Production default |
| `MAX_BODY_BYTES` | leave unset (262144) | |
| `GROQ_PLAN` | `free` or `paid` | Not read by the server; a documentation marker |
