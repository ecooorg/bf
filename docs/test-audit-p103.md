# Test audit P103

Hard filter of the test suite: tests that checked wording, file presence, historical documents, source text or the shape of the test setup itself were removed. Tests of behaviour were kept. A `P##` in a test name was **not** a reason to delete it.

Removed: 87 tests in 15 whole files and 63 tests inside 12 kept files (150 in total; counted by `test(` calls, `workspace` and `files` were not touched).

## Rules

1. DELETE: asserts only on text of source, docs, AGENTS.md, CHANGELOG, workflows or `.env.example`, with no behaviour exercised.
2. DELETE: frozen history (what an old migration contained, that a doc exists, that a version string is recorded).
3. DELETE: tests about the test setup (every file is run by some npm script, nothing was dropped from `check`).
4. DELETE: automated tests of the P82–P91 context tooling (the tools stay, as removal candidates).
5. KEEP: runtime behaviour, security gates, data contracts, router/model logic, database, files, integrations, App Builder.
6. KEEP one behaviour test per CI/patch tool.

## Whole files removed

- `tests/critical-first-handoff-p95.test.mjs` (2)
- `tests/critical-first-p97.test.mjs` (3)
- `tests/assistant-handoff-p96.test.mjs` (4)
- `tests/patch-quality-report-p93-8.test.mjs` (2)
- `tests/p93-7-diagnostic-logging.test.mjs` (4)
- `tests/app-builder-goal.test.mjs` (3)
- `tests/context-benchmark.test.mjs` (3)
- `tests/task-context.test.mjs` (4)
- `tests/impact-lineage.test.mjs` (9)
- `tests/verification-planner.test.mjs` (7)
- `tests/real-task-benchmark.test.mjs` (9)
- `tests/intent-contract.test.mjs` (14)
- `tests/context-refresh-profile.test.mjs` (6)
- `tests/context-completeness-guard.test.mjs` (11)
- `tests/architecture-context.test.mjs` (6)

## Tests removed inside kept files

### core (14)
- UI1 start screen offers all three explicit modes
- unavailable Project is disabled and not silently substituted
- mode selection is explicit and session-persisted
- folder picker menu behavior is wired in the UI
- Change mode control returns to start screen
- P51: one Mode control on every screen; the old duplicate items are gone from More
- P52 server wiring: only the explicit field enables Expert; information is never light in Expert
- P52 client wiring: both /api/conversation sends carry the Expert fields; Simple chat does not
- QA1 Simple: intentFlags and soft-fail helpers are present and wired
- QA1 Expert: EXPERT_STEP_PREFIX keeps depth and open dialogue
- QA1 Project: ANALYST_INSTRUCTION demands operational structure
- QA1 Core: honesty about facts and search is present
- QA1 UI: start screen offers Simple / Expert / Project and disables unavailable Project
- QA1 contracts: triage and support markers remain wired

### project-mode (17)
- Project Mode is opt-in and requires credentials plus PostgreSQL at startup
- Project Mode mutating routes require same-origin Origin and persistent rate limiting
- Project Mode routes are gated and its UI is a separate switchable page
- Simple Mode still uses its existing decision state and local storage path
- BX-06 Project Mode is opt-in and fails closed without required security settings
- BX-06 Project Mode uses persistent PostgreSQL rate limits and returns 429
- BX-06 Simple Mode and Project Mode have separate UI entry points
- docs and migration for P20 exist
- brief_writer source exports buildTaskPackageFromBrief and validates goal
- approval and commit helpers are present
- P20b docs and sources exist
- GATES_BLOCKED is a task error code
- P21 docs and sources exist
- P22 docs and sources exist
- P53 scope decision is carried by code comments and .env.example
- P54 server: manual task route, project list and expectedBranch
- P70: copy lint carries no recorded debt

### pipeline (2)
- P55 More is a closed dropdown at every width
- P55 every upload path reaches Drive: Attach files, conversation files, exports, agent documents

### web-and-epistemics (6)
- P48 uncertainty contract is single-copy in promptPacks (not duplicated in core)
- P48 server wires epistemic without hard-fail path
- P48 soft-fail / information path remains present
- P48 docs and version surfaces
- P50 server wiring: gated by the flag, never throws out of the handler, response is additive
- P50 .env.example and connection manifest mention the new variables

### conversation-turn (2)
- server guards the retry and does not duplicate the latest message in the model input (Token Economy)
- P57: server wires the latency policy without removing the quality retry

### models (8)
- deliverables: golden-eval script, npm scripts, check includes test:p10
- migration 005 and npm scripts
- migration 006, SKIP LOCKED claim, npm scripts
- the CI workflow writes the summary after every run and adds no new secret
- patch packer produces a verified bf-<id>.zip and reads the archive back
- migration 008: adds a manifest table only, backfills older versions idempotently, same formula as the code
- P13b routes expose plans, approvals, queueing and explicit evidence-backed validation
- worker starts only in authenticated, configured Project Mode and writes run-linked evidence

### database (2)
- BX-04 migration includes only the initial project/state/audit/rate-limit tables
- State repository validates inputs, checks expected version, and records immutable history transactionally

### gates (3)
- Workflow evidence.yml is read-only, manual and writes nothing
- Delegation policy is in force in AGENTS.md, tiers are written down, tier 3 is not delegable
- PA-03 workflow is manual, read-only at repository level, and does not deploy or write commits

### security (3)
- approve/exfil imperatives are present as plain text (documentation of intent)
- current AI operating rules preserve GitHub and secret safety policies
- P43 AGENTS.md state records the model_patch executor

### regression (3)
- P56 every test file is run by some npm script (no silent orphans)
- P56 every test script is part of the check chain or a separate CI step
- P56 nothing was dropped from the check chain

### ci-diagnostics-chain (1)
- CI workflow: every log is written into the uploaded directory, upload runs always and fails when empty

### project-diagnostics-p92 (2)
- diagnostic endpoints are inside project auth boundary
- all three More actions exist

## Follow-up candidates (not removed in P103)

- Scripts and docs of the P82–P91 context tooling: `scripts/context*`, `contextBenchmarkLib`, `realTaskBenchmark`, `intentContract`, `verificationPlanner`, `architectureImpactLineage*`, `docs/*-P8*.md`, `docs/*-P9*.md`, `docs/context-*.json`. Each doc already lists how to remove its tool.
- `scripts/ai-test-harness-p93-7.mjs` and `npm run test:ai`.
- `workspace.test.mjs` and `files.test.mjs` (already grouped files) were not audited per test.
- `uncertain.test.mjs` was not created: doubtful tests were kept in place instead of being parked.
