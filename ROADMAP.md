# BiForge Implementation Roadmap

**Document ID:** BF-ROADMAP-001  
**Status:** Authoritative sequential plan from empty repository to P118 and onward  
**Authority:** Derived from CHANGELOG.md, AI-NATIVE-RENOVATION-ROADMAP.md, AI-NATIVE-RENOVATION-TASK.md, AGENTS.md and observed snapshots  
**Distinction:** Stages up to and including P118.3.3 reconstruct the historical state present in the analysed repository snapshots. Stages P119–P121 are forward plans required by the current programme contracts; they are not claimed as already implemented.

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

## Phase 5 — Complex Software Architect Agent (P118 historical, in progress at 118.3.3)

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

## Phase 6 — Migrate to Three Agents (P119 — forward plan)

**Goal:** UI and routing expose exactly three approved agents; legacy four-mode paths removed or explicitly isolated; no regression of accepted scenarios.

**Preconditions:** P118 exit gate passed and Navigator acceptance recorded.

**Concrete changes (planned, not historical):**

- Replace mode selector with three agent entry points.
- Isolate or delete legacy Project Mode shared state machines that collapse behaviour.
- Ensure each agent owns its orchestration, prompts, cascade, tools and output contract.
- Update client components (App.tsx, ProjectMode → agent-specific panels).
- Update acceptance suites.

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
