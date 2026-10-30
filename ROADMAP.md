# BiForge Implementation Roadmap

**Document ID:** BF-ROADMAP-001  
**Status:** Authoritative implementation sequence for delivering and proving user value in the running product  
**Authority:** Derived from CHANGELOG.md, AI-NATIVE-RENOVATION-ROADMAP.md, AI-NATIVE-RENOVATION-TASK.md, AGENTS.md and observed snapshots  
**Current status (2026-10-30):** P119 and the P120 technical verification workflow have been reported green. That proves the listed checks ran successfully on their stated commits; it does not establish final product-value acceptance. The current source still exposes two Architect submodes, contrary to the target contract. This roadmap supersedes prior forward plans that treated E2E completion as programme completion. The programme ends only when the three agents deliver their specified user outcomes with reproducible evidence.

Phases 0–5 below are retained as historical implementation context, not as active work directions. Phases 6–9 define the current product-value work and its acceptance gates.

The plan follows the engineering loop:

**Specification → Implementation Plan → Verification Evidence → Navigator Acceptance → Next Stage.**

An AI assistant taking any stage must:

1. Read AGENTS.md, AI-OPERATING-RULES.md, the current task section and this roadmap entry.
2. Perform only the listed code/config/doc changes.
3. Execute the verification commands.
4. Produce evidence artefacts.
5. Stop and present a yes/no question to the Navigator when any stop condition is met.

---

## Phase 0 — Empty Repository Bootstrap

**Goal:** Establish a minimal, buildable TypeScript + React + Express skeleton that can later host the three agents.

**Preconditions:** Empty git repository; Node ≥ 20 available.

**Concrete changes:**

- Create `package.json` with `"type": "module"`, scripts for `dev`, `build`, `start`, `typecheck`.
- Add `tsconfig.json`, `tsconfig.server.json`, `vite.config.ts`, `index.html`.
- Add minimal `server.ts` (Express listening on process.env.PORT || 3000) and `src/App.tsx` (hello world).
- Add `.gitignore`, `.env.example`, `README.md` (AI-facing only).
- Pin initial dependencies: express, react, react-dom, vite, @vitejs/plugin-react, typescript, tsx, dotenv.

**Dependencies:** None.

**Step-by-step algorithm:**

1. `npm init -y`; set module type.
2. Install runtime and dev dependencies.
3. Write minimal source files.
4. Confirm `npx tsc --noEmit` and `npm run build` succeed.

**Repository results:** Buildable project; `/` serves the React app; `/health` returns `{ok:true}`.

**Verification commands:**

```bash
npm run typecheck
npm run build
node dist-server/server.js &  # or tsx server.ts
curl -s localhost:3000/health
```

**Expected:** Exit codes 0; health JSON present.

**Acceptance criteria:** Clean start from empty directory produces running server and client.

**Security / regression:** No secrets committed; `.env.example` only.

**Evidence required:** Build logs, health response.

**Stop conditions:** Any dependency that requires credentials or external network beyond npm must be deferred; ask Navigator.

---

## Phase 1 — Core Infrastructure (historical foundation corresponding to early bf-* snapshots through P106–P109)

**Goal:** Introduce PostgreSQL, authentication, model registry, budget/ledger, basic routing, security primitives and the verification DAG.

**Preconditions:** Phase 0 complete.

**Concrete changes (reconstructed from migrations 001–019 and server modules):**

- Add `pg`, implement `server/database.ts` and ordered migrations.
- Implement session auth, CSRF, rate limiting (`server/security.ts`, `authRoutes.ts`).
- Implement `modelRegistry.ts`, `geminiAdapter.ts`, `budget.ts`, `ledger.ts`.
- Add health routes, basic conversation endpoint skeleton.
- Introduce schemas (`docs/schema-*.json`), `scripts/schemaValidate.mjs`, evidence records.
- Introduce `scripts/run-dag.mjs` and verification-manifest.
- Architecture boundary rules and generators.

**Dependencies:** Phase 0.

**Step-by-step (high level, historical order approximate):**

1. Migrations 001–009 for projects, states, events, jobs, budgets, gates.
2. Core server modules and route mounting in `server.ts`.
3. Client panels for early modes.
4. Test suites for core, security, database.
5. CI DAG with independent nodes always finishing.

**Repository results:** Database migrates; authenticated requests possible; model calls paced; DAG runs.

**Verification:**

```bash
npm run db:migrate
npm run test:core
npm run test:security
npm run test:database
npm run check
```

**Acceptance:** All listed tests green; schema validation passes.

**Stop:** Production credentials or GitHub write required → ask Navigator (Tier 3).

---

## Phase 2 — AI-Native Foundations (P106–P112 historical)

**Goal:** Evidence integrity, fail-closed assessment, structured handoff, capability graph, context selection, intent-policy contracts.

**Preconditions:** Phase 1 complete; Navigator acceptance of Phase 2 closure (recorded for P109).

**Concrete changes:**

- Evidence Record schema and collection scripts.
- Fault injection and bounded-repair guards.
- Always-on redacted CI diagnostics + two-artefact handoff.
- Capability graph generation and checks.
- Intent-policy contract tests.
- Context selection tooling.

**Verification:** `test:compact-ci-artifacts`, architecture checks, schema tests.

**Acceptance:** Phase 2 exit gate (P109) evidence reviewed by Navigator.

**Stop:** Any weakening of evidence integrity → forbidden; stop and ask.

---

## Phase 3 — Conversational Agent Recovery (P116 historical, accepted 2026-10-28)

**Goal:** Restore useful Conversational Agent behaviour to ≥80 % live PASS.

**Preconditions:** Phase 2 closed.

**Concrete changes (from CHANGELOG and task docs):**

- Dedicated conversation orchestration adjustments.
- Cascade foundations (Gemini primary order).
- Residual fixes for Node LTS version reporting (B3 left open).
- Live evidence collection.

**Verification:** Live conversation scenarios; `test:p117-3` related conversation tests; report entry.

**Acceptance:** Navigator recorded acceptance with residual B3.

**Evidence:** Live 80 % PASS recorded in AI-USER-VALUE-REPORT.md.

---

## Phase 4 — Expert Agent Foundations (P117.x historical, closed for conversation recovery)

**Goal:** Implement Expert Problem-Solving Agent cascade foundations and progressive reasoning paths.

**Preconditions:** P116 accepted.

**Concrete changes:**

- Expert-specific prompt/instruction composition.
- Cascade and tool eligibility distinct from Conversational.
- Model availability probes.
- Partial E2E; full Expert E2E left for later slices.

**Verification:** `test:models`, model-availability tests, conversation recovery tests.

**Acceptance:** P117.3 closed; full Expert E2E remains open.

**Stop:** If live Expert scenarios regress Conversational → stop.

---

## Phase 5 — Complex Software Architect Agent (P118 — accepted 2026-10-29)

**Goal:** Deliver a working Architect pipeline that can produce a verified ZIP from a brief, with bounded repair at Spec and Unit stages.

**Preconditions:** P117 foundations present; App Builder core contracts already introduced in earlier P93 line.

**Sub-stages (historical order):**

### 5.1 P118 / P118.2 — Completion contract and live workflow

- Define exit gate.
- Implement / harden live workflow `p118-architect-live`.
- CSRF runner fix, evidence enrichment.

### 5.2 P118.3 — Spec bounded repair + diagnostics

- Explicit `schemaVersion:1`, `parseJsonLenient`, `validateSpec` with issue list.
- One recovery call that includes previous issues.
- Events `spec_attempt` / `spec_repair` / `spec_failed` with previews.
- Tests: `tests/app-builder-spec-repair-p118.test.mjs`.

### 5.3 P118.3.1 — CI repair

- Fix type narrowing under `strict:false`.
- Restore version label consistency (APP_VERSION stays 118).

### 5.4 P118.3.2 — Single version source + documentation audit

- `package.json` sole source of `version` and `patch`.
- `src/config.ts` derives values via Vite plugin.
- `scripts/check-version.mjs` and patch-tools updated.
- Documentation consolidation (AGENTS.md, task, roadmap, report, operating rules).

### 5.5 P118.3.3 — Code-stage file marker repair (current tip)

- Coder prompt names real header `<<<FILE index.html>>>`; `PROMPT_VERSION` → `static_site.v2`.
- Parser accepts three known slips for expected path and records `coerced`.
- One bounded repair call per file (budget counted).
- Events `unit_attempt` / `unit_repair`.
- Precise failure reason `expected_path_not_found:…`.
- Tests: `tests/app-builder-unit-repair-p118.test.mjs` (7 tests, mutation-checked).

**Concrete file changes for 5.5 (from CHANGELOG):**

- `appBuilder/core-prompts.ts`
- `appBuilder/core-markers.ts`
- `appBuilder/core-engine.ts`
- `server/appBuilderAdapter.ts`
- Test files and `test:app-builder` script.

**Verification commands (local):**

```bash
npm run typecheck
npm run build
npm run test:core
npm run test:app-builder
npm run test:compact-ci-artifacts
npm run check   # full DAG
```

**Expected:** All independent nodes PASS; database-dependent nodes BLOCKED only if no Postgres.

**Live verification (required for exit):**

1. Deploy commit.
2. Confirm `/health` commit matches.
3. Dispatch `p118-architect-live` once.
4. Record result (SUCCESS with ZIP or HONEST_NON_PASS with stage and diagnostics).

**Acceptance criteria for P118 close:**

- Hosted CI green on the commit.
- Live Architect run reaches ZIP packing and verification successfully, or the remaining defects are diagnosed with stage-specific evidence and accepted as residual by Navigator.
- All P118 exit-gate items in AI-NATIVE-RENOVATION-ROADMAP.md satisfied.
- Navigator explicit acceptance.

**Stop conditions:**

- Live run fails at a new stage not covered by current diagnostics → stop, enrich diagnostics, ask Navigator.
- Budget or provider changes required → Tier 3, ask.
- Any temptation to weaken evidence integrity or invent success → forbidden, stop.

**Evidence required:** Local DAG logs, hosted CI link/run ID, live workflow transcript with event previews, downloadable ZIP if SUCCESS, entry at top of AI-USER-VALUE-REPORT.md.

---



## Phase 5B — Archive Delivery Canon (P118.5) — required before P118 exit

**Goal:** One real path from user goal to a downloadable program ZIP. Eliminate competing success paths.

**Authority:** `docs/ARCHIVE-DELIVERY-CANON.md` (normative detail).

**Why before P118 exit:** Marker/spec repairs do not prove the user received a program. Historical failure mode is fragmented delivery (staged vs legacy vs PACKAGE.md vs code-task vs client export).

### Sub-stages

| Patch | Goal | Preconditions | Acceptance |
|-------|------|---------------|------------|
| P118.5.0 | Doc lock | Current tree | Canon + roadmaps/task updated |
| P118.5.1 | Staged-only A3 API default; legacy explicit flag only | 5.0 | Default build never silent-legacy SUCCESS |
| P118.5.2 | Artifact + download invariants | 5.1 | SUCCESS ⇒ stored ZIP; empty download impossible as 200 success |
| P118.5.3 | UI one button → downloadUrl | 5.2 | Manual/scripted click downloads openable ZIP |
| P118.5.4 | E2E gate | 5.3 | Evidence: GET ZIP, JSZip open, expected paths |
| P118.5.5 | Decommission noise | 5.4 green + Navigator | Residuals flagged; UI not ambiguous |

**Canonical path (only A3 SUCCESS path):**

`POST code/build (staged) → poll job → SUCCESS + downloadUrl → GET artifact download → ZIP with implementation files`

**Residuals allowed:** legacy behind `ALLOW_LEGACY_APP_BUILDER`; code-task ZIP; PACKAGE.md; client JSON export — none may claim Architect program SUCCESS.

**Stop conditions:** Production cannot run staged → ask Navigator; do not redefine scaffold ZIP as success.

**P118 exit gate (historical, satisfied):** P118.5.6 CI 27/27 + live staged build with verified ZIP and truthful refusal controls + Navigator acceptance on 2026-10-29.


## Phase 6 — Product contract reconciliation (P120.0.8 documentation patch)

**Goal:** make every current normative document describe the same product: three agents, one Architect workflow, and acceptance by useful user outcomes rather than test completion.

**Known facts:**
- The user-outcome specification already defines Conversational, Expert and Architect and says green CI alone is insufficient.
- The checked source still contains `ProjectPathChooser`, `ProjectNoviceWizard`, `builderPath`, and a separate professional workspace branch.
- P120 E2E and acceptance workflows provide valuable technical evidence, but Architect E2E uses deterministic API fixtures for the generated project; it does not prove live generation quality.
- The Navigator reported P120 acceptance evidence as PASS for commit `d411b982186276708d31173f62b574aed19ebd63`. This is evidence for that commit's listed checks, not for this documentation patch or for the missing product contract.

**Deliverable:** aligned specification, roadmap, current task, and rolling evidence report. The patch does not change runtime behavior and must not claim to have implemented the unified Architect.

**Acceptance:** all normative docs agree on the target; abandoned alternative Architect paths are not presented as a target; every product requirement has an outcome-based acceptance criterion; mocked checks are clearly distinguished from live product evidence.

## Phase 7 — Implement the single Architect workflow (next product patch: P120.0.9)

**Goal:** replace the two existing Architect submodes with one coherent user-facing workflow that takes a software goal to a real deliverable or a truthful, actionable failure.

**Scope:**
1. Remove the `ProjectPathChooser` as a user-facing mode selector.
2. Remove `builderPath` as a selector between independent novice/professional workflows.
3. Implement one workflow/state machine for goal capture, requirement confirmation, planning, file generation, validation/build, bounded repair, packaging, delivery, and recovery.
4. Reuse existing components only where they serve this single workflow; redesign or delete components that exist solely to preserve the old split.
5. Preserve needed professional capabilities as tools/actions within the same workflow, not as a second mode.
6. Add regression coverage asserting that the user cannot enter a second Architect mode and that all steps use one completion contract.
7. Do not modify unrelated agent internals or provider architecture unless a demonstrated dependency makes it necessary.

**User-value gate:** on the deployed application, start from a natural-language software goal and reach either (a) a real generated project whose requirements, files, applicable build/tests, ZIP integrity and download are verified, or (b) a truthful stage-specific failure with recovery instructions. The acceptance run must use real generation; mocked API tests remain supplementary.

**Required evidence:** commit-bound CI; browser test for absence of chooser; a redacted transcript of a real Architect task; actual artifact and integrity evidence if successful; exact failed stage and next action if not. Report `PASS`, `PARTIAL`, `FAIL`, `BLOCKED`, `TIMEOUT`, or `NOT_RUN` without upgrading uncertainty to success.

## Phase 8 — Measure and close Conversational and Expert user outcomes

**Goal:** establish a current baseline for the two dialogue agents and fix demonstrated failures rather than expanding internal infrastructure by default.

**Representative Conversational tasks:** direct stable-knowledge answer; current-events question requiring fresh sources; follow-up that depends on prior context; material ambiguity; search/provider unavailable; recovery after verifier/tool error.

**Representative Expert tasks:** multi-turn investigation; separation of facts, hypotheses and unknowns; materially different options; evidence-linked trade-offs; synthesis and prioritized plan; continuation/recovery after a failed step.

**Method:** capture the exact user input, deployed commit, relevant configuration/model path where available, actual visible response, evidence/source quality, context continuity, latency, cost signals where available, and human/task-based rubric outcome. Mocked scenarios may validate UI and error handling but do not substitute for real response quality.

**Acceptance:** each agent's contract in `docs/AI-USER-VALUE-SPEC.md` is assessed against representative scenarios; every failing or partial case has a concrete corrective action or an explicit accepted limitation. Do not claim 100% reliability or exhaustive research.

## Phase 9 — Final user-value release gate

The project is complete for this programme only when all of the following are true:

1. **Conversational:** representative tasks produce relevant, correct, appropriately fresh answers; context and uncertainty are handled honestly; failures have useful next actions.
2. **Expert:** representative complex problems progress through investigation, alternatives, synthesis and an actionable plan without dead ends or loss of working state.
3. **Architect:** one user-facing mode and one workflow produce a real validated downloadable software artifact, or a truthful actionable failure. There is no novice/professional chooser or separate completion contract.
4. **Cross-agent:** navigation and shared infrastructure do not leak one agent's behavior into another; relevant state and artifacts remain accessible.
5. **Evidence:** results are tied to the exact deployed commit and clearly label mock, source-level, CI, live-provider and live-product evidence.
6. **Safety and honesty:** no false success, no claim that unrun checks passed, no hidden partial result, and no weakening of security or evidence controls to pass a gate.
7. **Limitations:** unresolved gaps, unsupported tasks and known constraints are listed with impact and disposition.

A green CI run is required where applicable, but never sufficient by itself. Formal closure requires the user-outcome evidence above and the Navigator's explicit acceptance.

## Global Rules for Every Stage

1. One bounded patch at a time.
2. `package.json` updated in every patch; version never decreases.
3. Evidence is commit-specific.
4. `UNKNOWN`, `NOT_RUN`, `BLOCKED`, `TIMEOUT`, `PARTIAL` are never treated as `PASS`.
5. Never ask Navigator to read code; present consequences + yes/no question.
6. Charter conflicts must be reported; never silently reinterpret.
7. Security, evidence integrity and product function bind above all other considerations.

This roadmap is the sole authoritative implementation sequence. Update it in place only when the target user outcomes or their accepted status change. Do not resurrect superseded patch branches or speculative provider-expansion plans as active work.
