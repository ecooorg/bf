# BiForge Implementation Roadmap

**Document ID:** BF-ROADMAP-001  
**Status:** Authoritative sequential plan from empty repository to P118 and onward  
**Authority:** Derived from CHANGELOG.md, AI-NATIVE-RENOVATION-ROADMAP.md, AI-NATIVE-RENOVATION-TASK.md, AGENTS.md and observed snapshots  
**Distinction:** P118 history records the implementation sequence; the Navigator accepted P118 on 2026-10-29 based on CI 27/27 for P118.5.6 and the supplied live Architect artifact evidence. P119 is now in progress. P120–P121 remain forward phases.

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


## Phase 6 — Migrate to Three Agents (P119 — in progress)

**Goal:** UI and routing expose exactly three approved agents; legacy four-mode paths removed or explicitly isolated; no regression of accepted scenarios.

**Preconditions:** satisfied — Navigator accepted P118 on 2026-10-29.

**Concrete changes:** P119.0.1 starts the migration by exposing the approved names Conversational, Expert, and Architect in the start screen and agent menu. Internal legacy keys are retained temporarily to avoid breaking existing behavior; later P119 slices must isolate or remove them behind regression coverage.

- Replace mode selector with three agent entry points.
- Isolate or delete legacy Project Mode shared state machines that collapse behaviour.
- Ensure each agent owns its orchestration, prompts, cascade, tools and output contract.
- Update client components (App.tsx, ProjectMode → agent-specific panels).
- Update acceptance suites.

**P119 slice plan (reconciled in P119.0.2; this table is the authoritative numbering — it supersedes the older numbering in `docs/p119-p121.md`):**

| Patch | Content | Status |
|---|---|---|
| P119.0.1 | Three agent names in start screen and menu; P118 status reconciliation | Delivered; CI green (Navigator confirmed) |
| P119.0.2 | Inventory of routes, workflows and shared orchestration; boundary map and per-agent contracts (TECHNICAL_SPECIFICATION §6.4, REQ-AGENT-001..003); regression tests `tests/p119-agent-boundaries.test.mjs`; documentation sync; no runtime behaviour change | Delivered; CI green (Navigator confirmed) |
| P119.0.3 | Legacy isolation (first bounded step): agent selection, turn planning and prompt entry for Conversational and Expert moved into `server/agentRouting.ts`, `conversationalAgent.ts`, `expertAgent.ts` with byte-identical prompts; user-visible legacy names (Simple chat, Project mode/workspace, Expert method) removed from the in-app guide and the Architect confirmation dialog; tests `tests/p119-agent-isolation.test.mjs`. The HTTP route `POST /api/conversation`, wire key `productMode`, internal `AppMode` keys and `promptPacks.ts` text remain shared (compatibility) | Delivered; CI green (Navigator confirmed) |
| P119.0.4 | Agent-owned prompt text: intro paragraphs, `expertDialogueParagraph`, `EXPERT_STAGES`, `EXPERT_STEP_PREFIX` moved from `promptPacks.ts` into `conversationalAgent.ts` / `expertAgent.ts` (golden-hash byte identity); agent-named routes `POST /api/agent/conversational` and `POST /api/agent/expert` added (route pins the agent; client uses them), `POST /api/conversation` kept for compatibility; dead legacy IR import removed from `server.ts` (the gated `engine=legacy` branch in `server/projectRoutes.ts` stays: deployment use UNKNOWN). Navigator decisions recorded 2026-10-29. Tests `tests/p119-agent-prompts-routes.test.mjs`, HTTP checks R1–R10 in `tests/pipeline.test.mjs` | Delivered in this slice; CI result pending Navigator report |
| P119.0.5 | Workflows `p119-agent-contracts` and `p119-ui-smoke` **only for gaps** that `ci.yml` (DAG `ci`, includes the P119 contract tests via `test:core`) and `ui-check.yml` (Playwright agent-menu check) do not already cover — e.g. a manual live smoke that each of the three agents starts and answers truthfully against a deployed commit. Do not duplicate CI | Proposed; Navigator to confirm |
| P119.0.6 | Remove remaining user-visible legacy modes (raw "Advanced" project data tab if judged a fourth mode); Architect regression: build, validators, ZIP download (workflow `p119-regression`, reusing `p118-architect-live`) | Proposed; Navigator to confirm |
| P119.0.7 | P119 Release Gate: full CI + `test:ui` + live scenarios for all three agents; evidence bound to the commit; Navigator decision | Proposed; Navigator to confirm |

**Gate P119:** required checks green; three agents work; no user-visible legacy modes; no regression of accepted P116/P117/P118 behaviour. **Transition:** P120 starts only after the Navigator's explicit decision on P119.

**Per-patch rule (from the Navigator's plan):** every patch carries code/doc changes, tests, `CHANGELOG.md`, `NEXT_PATCH.md` and the related documents; the next patch starts only after the required checks of the previous one pass.

**Dependencies:** P118 closed.

**Step-by-step algorithm:**

1. Inventory all mode flags and shared conversation paths.
2. Introduce agent-specific route and UI surfaces.
3. Migrate Conversational and Expert to dedicated pipelines if still shared.
4. Wire Architect as third agent.
5. Remove or feature-flag legacy selectors.
6. Run full regression + new three-agent scenarios.
7. Update documentation and report.

**Verification:** Full CI + live scenarios for all three agents.

**Acceptance:** Representative user can start each agent and receive truthful outcomes; no fourth mode visible.

**Stop:** Any regression of P116/P117 accepted behaviour → stop and ask.

---

## Phase 7 — Cross-Agent E2E and Stabilisation (P120 — forward)

**Goal:** Representative scenarios for all three agents pass; failures are truthful; artefacts accessible; limitations explicit.

**Preconditions:** P119 complete.

**Concrete changes:** Expand acceptance suite, harden recovery paths, surface residual limitations in UI and report.

**Verification:** Cross-agent live runs + CI.

**Acceptance:** Navigator formal acceptance of product-level outcomes.

**P120 slice plan (carried over from the Navigator's plan in `docs/p119-p121.md`):**

| Patch | Content | Result |
|---|---|---|
| P120.0.1 | E2E Conversational | Full user scenario verified |
| P120.0.2 | E2E Expert | Expert scenarios and error paths verified |
| P120.0.3 | E2E Architect | Build, validators, download and ZIP integrity verified |
| P120.0.4 | Cross-agent E2E: switching between agents and context preservation | Agents verified together |
| P120.0.5 | Stabilisation; fix regressions found | Stable integration suite |
| P120.0.6 | Workflows `p120-acceptance` and `p120-evidence` | Final CI and one evidence report |
| P120.0.7 | Final acceptance and closing documentation | Formal completion of the programme |
| P120.0.8 (conditional) | P118 residuals: download policy for `PARTIAL` (`failed_but_download_offered`) and dependency audit (`zod`, `body-parser`, `qs`); included only if the inventory confirms they still need closing before release | Optional |

**Gate P120:** required E2E pass; no false `SUCCESS`; results bound to the verified commit; acceptance criteria met. After P120 the programme is closed; P121 is optional, not an obligatory end.

**Sequence:** P119.0.1 → P119.0.2–0.7 → Navigator decision on P119 → P120.0.1–0.4 → P120.0.5–0.7 → programme closed → P121 (optional, only after an explicit Navigator yes and closed open decisions).

---

## Phase 8 — Universal Model Resilience Layer (P121 — planned only)

**Goal:** Improve outcomes when models/providers are unavailable or return low-quality answers (registry, health monitor, task-aware router, response validator, recovery engine).

**Preconditions:** P116–P120 line accepted or explicitly re-sequenced by Navigator.

**Open decisions (must be resolved before start):** budgets, probe frequency, cross-provider data transfer, selective critique, telemetry retention, local inference feasibility, exact endpoint validation.

**Stop:** Do not begin implementation until Navigator authorises and open decisions are closed.

---

## Global Rules for Every Stage

1. One bounded patch at a time.
2. `package.json` updated in every patch; version never decreases.
3. Evidence is commit-specific.
4. `UNKNOWN`, `NOT_RUN`, `BLOCKED`, `TIMEOUT`, `PARTIAL` are never treated as `PASS`.
5. Never ask Navigator to read code; present consequences + yes/no question.
6. Charter conflicts must be reported; never silently reinterpret.
7. Security, evidence integrity and product function bind above all other considerations.

This roadmap is the sole authoritative sequence. Update it in place when the Navigator accepts a phase transition.
