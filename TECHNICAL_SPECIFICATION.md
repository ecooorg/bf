# CURRENT NORMATIVE CONTRACT — 2026-10-31

> This block is the current binding product contract. It takes precedence over any older statement below that conflicts with it. The remainder of this file is retained as the technical and historical record; do not silently rewrite past entries to make them look current.

## Product success is user value, not test completion

BiForge succeeds when a real user can complete a meaningful task and receive a correct, useful, understandable result. Tests, CI, architecture boundaries, documentation, and evidence are necessary controls; none alone proves user value. Every feature change must name the user problem, expected user-visible result, failure/recovery behavior, and how that result will be evaluated. Report code presence, local tests, hosted CI, deployed behavior, and user-outcome evidence as distinct facts. Never label an unobserved outcome PASS.

## Three core agents and one experimental development mode

The product continues to define exactly three user-facing agents in its core agent taxonomy. The three core user-facing agents remain:

1. **Conversational** — answer real questions naturally, preserve relevant context, distinguish known facts from uncertainty, and use current information when the task requires it.
2. **Expert** — investigate complex questions, compare alternatives against stated constraints, explain trade-offs, and produce a justified decision or actionable plan.
3. **Architect** — the selected primary software-generation workflow, entered at `/project`; it is the only active Architect development target.

BiForge retains the legacy Architect workflow as the selected primary Architect implementation. Architectural Test Lab (`/architect-lab`) remains available only as a frozen diagnostic experiment; it is not the primary user-facing Architect and receives no parallel feature development. This updates the owner-approved direction recorded on 2026-10-30 based on newer comparable generation evidence supplied on 2026-10-31.

The development strategy is:

- Prioritize the legacy Architect workflow at `/project` for new product behavior, fixes, validation, and iteration.
- Repair the shared generation engine where evidence shows a defect affecting the selected Architect, including validator blind spots and unsafe automatic repairs.
- Keep Architectural Test Lab source and its route only for reproducibility/diagnostic comparison; do not build new product behavior there.
- Re-evaluate the primary selection only when the owner supplies or requests a newer comparable check.
- The selected Architect uses shared App Builder orchestration, validators, model/provider connectivity, persistence, and artifact delivery; do not claim these subsystems are independent.

## Frozen Architectural Test Lab and selected Architect completion direction

The selected legacy Architect completion contract must make task/specification, plan, execution, validation, artifact availability, and final SUCCESS/PARTIAL/FAILED outcome observable. Every potentially waiting stage must have bounded execution, heartbeat/progress evidence, timeout/cancellation behavior, and a user-visible recoverable failure; a green CI run alone is not acceptance. The frozen Lab may remain available for diagnostics, but must not receive parallel feature work. Any future change of the selected primary requires a new explicit owner decision backed by newer comparable evidence.

## Architect has one mode and one completion contract

Architect is one user-facing agent and one end-to-end workflow. Do not expose a choice between “Simple words”/beginner/novice and “Professional” modes, a mode switch, or two independently selected Architect flows. The single flow may adapt wording, progressive disclosure, and optional advanced controls to user needs, but those are presentation adaptations inside one state machine—not modes or separate workflows. All paths must converge on one completion contract: explicit task/specification, validated plan, generated artifact, applicable validators, honest SUCCESS/PARTIAL/FAILED status, and a downloadable result only when the delivery policy permits it.

## Acceptance hierarchy

- **User outcome:** the intended user task is completed with a useful result. This is the primary product criterion.
- **Behavioral acceptance:** visible workflow, outputs, errors, recovery, and downloads match this contract.
- **Technical controls:** tests, typecheck, build, security checks, and CI are supporting evidence.
- **Release evidence:** must be tied to the exact commit/build and distinguish local, hosted, and live checks.

A green test suite does not compensate for a missing, confusing, low-quality, or unusable user result. A passing UI stub does not prove live model quality or deployed behavior.

## Repository minimalism and test lifecycle

**REQ-REPO-001 — Current purpose for maintained files.** Every maintained repository file must support a current product, development, build, verification, security, operational, or documentation need. Historical origin alone is not sufficient justification for retention.

**REQ-REPO-002 — Tests protect current obligations.** Each retained test must trace to a current product requirement, meaningful user scenario, supported compatibility/data/API contract, or material regression risk not adequately covered elsewhere. Tests for completed experiments and old cycle-specific behavior must be removed or rewritten when they no longer protect a current obligation.

**REQ-REPO-003 — Safe retirement.** Before removing tests, fixtures, scripts, reports, plans, or documentation, inspect repository references, package scripts, CI/workflow usage, unique coverage, compatibility commitments, and current requirements. Preserve needed coverage with smaller current-contract tests; archive payloads externally only when they have a concrete future use. Do not retain obsolete implementations solely for historical completeness.

**REQ-REPO-004 — Separate historical record from obsolete test payload.** Preserve useful historical information: completed roadmap entries, changelog entries, factual reports, decision records, and concise evidence summaries of tests or experiments that were run. This does not require retaining the old test implementation, test-only fixtures, experimental prompts, temporary outputs, or one-off scripts after they have served their purpose and no longer protect a current requirement. When retiring such material, retain a concise historical result where relevant; do not silently erase the fact that work occurred or rewrite its recorded outcome.

**Acceptance criteria:** a repository-minimalism review records keep/update/merge/archive/delete decisions for in-scope findings; each retained test has a current rationale; duplicate coverage is consolidated where safe; removed tests do not silently drop unique required coverage; and historical records remain intact while obsolete executable/test payloads can be retired independently.

## Repository language and language-neutral behavior

**REQ-LANG-001 — English-only repository artifacts.** All maintained source code, comments, identifiers, tests, fixtures, prompt templates, developer-facing messages, scripts, and technical documentation must be written in English. File and directory names must use English/ASCII naming. Historical evidence must not be silently rewritten; any retained non-English historical content must be explicitly classified and justified.

**REQ-LANG-002 — Do not couple intent recognition to selected natural languages.** Internal routing, intent classification, and state transitions must use stable structured values or language-neutral contracts wherever feasible, not isolated keyword lists tied to particular natural languages. Natural-language text may remain an input to a model or a user-facing output where required by product behavior.

**REQ-LANG-003 — Separate repository language from product language support.** The English-only repository rule does not, by itself, restrict the languages users may enter or receive. Existing user-facing language behavior must be preserved unless the owner explicitly approves a product-language change.

**Acceptance criteria:** repository-wide scans cover text files, filenames, fixtures, snapshots, scripts, prompts, docs, and generated content; every non-English finding is classified; safe text-only residue is corrected; runtime changes include focused regression tests; test cases preserve semantic intent; excluded historical/generated content is documented; and results state exactly which checks ran. A clean text scan alone is not proof of language-neutral runtime behavior.

## Documentation authority

`AGENTS.md` defines working rules, the obligation map, the mandatory session-start protocol, and the authority hierarchy. This file defines product and technical requirements. `ROADMAP.md` owns the ordered programme plan while preserving completed phases. `TECHNICAL_REPORT.md` owns historical facts and evidence. The eight specialist documents under `docs/` cover architecture, API contracts, testing/acceptance, user-value evidence, security/privacy, operations/releases, data/artifacts, and active decisions. No old side document is an independent source of truth. There is no persistent next-patch assignment file: each session reconstructs state and selects its own task under `AGENTS.md`.

---

# BiForge Technical Specification

**Document ID:** BF-TECH-SPEC-001  
**Status:** Normative engineering specification for implementation from clean repository  
**Authority:** Derived from repository evidence through P118.3.3 (commit lineage ending at live run evidence on 9ff44ac and related patches)  
**Language:** Technical English  
**Audience:** Developers and AI assistants implementing or verifying the system  

This specification enables full re-implementation of BiForge from an empty repository to the state of programme version 118 (patch 118.3.3) and defines the contracts required for the three user-facing agents.

All requirements carry unique identifiers of the form `REQ-XXX-NNN`. Each requirement states preconditions, expected behaviour, error handling, and verifiable acceptance criteria.

---

## 1. System Overview and Architecture

### 1.1 Purpose

BiForge is an evidence-driven engineering platform that turns complex user workflows into verifiable, reproducible results. The product exposes exactly three autonomous user-facing agents:

- **A1 Conversational Agent** — natural, context-aware conversation.
- **A2 Expert Problem-Solving Agent** — multi-step problem solving with progressive reasoning, tools, and evidence.
- **A3 Complex Software Architect Agent** (App Builder) — specification-driven generation of software artefacts (currently static-site profile), producing a verified ZIP archive.

Legacy four-mode UI (Simple / Expert / Project / Project-Advanced) is transitional and must be replaced under P119.

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React + Vite)                     │
│  App.tsx · mode panels · ProjectMode · ConversationFiles · UI   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP / SSE / event streams
┌───────────────────────────────▼─────────────────────────────────┐
│                     Express Server (server.ts)                   │
│  auth · health · routes · rate limits · CSRF · session           │
├─────────────────────────────────────────────────────────────────┤
│  Agent Orchestration Layer                                       │
│  conversationMode · expert pipelines · appBuilderPipeline        │
├─────────────────────────────────────────────────────────────────┤
│  Core Services                                                   │
│  modelRegistry · modelHealth · budget · ledger · stateService    │
│  gateEngine · epistemicVerifier · documents · files · artifacts  │
├─────────────────────────────────────────────────────────────────┤
│  App Builder Core (appBuilder/)                                  │
│  core-engine · core-prompts · core-markers · core-plan           │
│  validators · pack-zip · profiles (static-site)                  │
├─────────────────────────────────────────────────────────────────┤
│  Persistence (PostgreSQL)                                        │
│  projects · states · events · jobs · budgets · artifacts · logs  │
└─────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  Model Providers                                                 │
│  Gemini (primary) · optional Groq / Cloudflare (opt-in)          │
│  adapters · rate limiting · health probes · cascade              │
└─────────────────────────────────────────────────────────────────┘
```

**Component boundaries (`docs/ARCHITECTURE.md`):**

- `appBuilder/` is a pure core: no Express, no React, no direct database. Ports defined in `core-ports.ts`.
- Server adapters (`appBuilderAdapter.ts`, `appBuilderPipeline.ts`) implement ports and surface events.
- Client never calls model providers directly.
- All durable state lives in PostgreSQL when `DATABASE_URL` is set; in-memory fallbacks exist only for non-project modes under explicit flags.

### 1.3 Repository Structure (P118)

```
.
├── AGENTS.md                          # Governance, obligation map, session-start protocol
├── CHANGELOG.md                       # Patch history (newest first)
├── package.json                       # Single version source (version + patch)
├── server.ts                          # Express entry + route mounting
├── appBuilder/                        # Pure App Builder core
│   ├── core-engine.ts
│   ├── core-types.ts
│   ├── core-ports.ts
│   ├── core-prompts.ts
│   ├── core-markers.ts
│   ├── core-plan.ts
│   ├── core-cache.ts
│   ├── pack-zip.ts
│   ├── architectOutcome.ts
│   ├── profile-default.ts
│   ├── stack-static-site.ts
│   └── validator-static-site.ts
├── server/                            # Server modules
│   ├── database.ts
│   ├── modelRegistry.ts
│   ├── geminiAdapter.ts
│   ├── appBuilderAdapter.ts
│   ├── appBuilderPipeline.ts
│   ├── conversationMode.ts
│   ├── budget.ts
│   ├── ledger.ts
│   ├── files.ts
│   ├── documents.ts
│   ├── security.ts
│   ├── healthRoutes.ts
│   ├── authRoutes.ts
│   └── … (additional services)
├── src/                               # React client
│   ├── App.tsx
│   ├── config.ts
│   ├── ProjectMode.tsx
│   ├── ConversationFiles.tsx
│   └── …
├── migrations/                        # Ordered SQL migrations
├── scripts/                           # CI, DAG, evidence, patch tools
├── tests/                             # node:test suites
├── docs/                              # AI-facing normative docs + schemas
└── …
```

**REQ-ARCH-001**  
**Precondition:** Clean clone.  
**Behaviour:** Directory layout matches the structure above; `appBuilder/` contains only pure TypeScript with no Node HTTP or React imports.  
**Error:** Import of Express or React inside `appBuilder/` fails architecture boundary check.  
**Acceptance:** `npm run architecture:check` exits 0; generated module map lists expected boundaries.

---

## 2. Technology Stack and Environment

### 2.1 Runtime and Language

- Node.js ≥ 20 (LTS; residual B3 tracks exact version pin).
- TypeScript (strict client, `strict: false` historically on server for gradual migration).
- ESM (`"type": "module"`).

### 2.2 Core Dependencies (package.json)

| Package              | Role                          | Version range observed |
|----------------------|-------------------------------|------------------------|
| express              | HTTP server                   | ^4.21.2               |
| react / react-dom    | UI                            | ^19.0.1               |
| vite                 | Client bundler                | ^8.3.0                |
| @vitejs/plugin-react | React plugin                  | ^6.1.1                |
| @google/genai        | Gemini SDK                    | ^2.4.0                |
| pg                   | PostgreSQL client             | ^8.16.3               |
| zod                  | Schema validation             | ^3.24.2               |
| jszip                | ZIP packing                   | ^3.10.2               |
| docx / pdfkit / unpdf| Document generation           | current               |
| dotenv               | Environment                   | ^17.2.3               |
| tsx                  | Dev runner                    | ^4.21.0               |

### 2.3 Environment Variables (from .env.example and OPERATIONS.md)

Required for full Project Mode / Architect:

- `DATABASE_URL` — PostgreSQL connection string.
- `APP_PASSWORD` — application password.
- `ENABLE_APP_AUTH=true`
- `SESSION_SECRET`
- `GEMINI_API_KEY` (or equivalent provider keys).
- Optional: `ENABLE_EXTERNAL_MODEL_FALLBACK`, `ENABLE_PROJECT_MODE`, rate-limit overrides, Google Drive credentials.

**REQ-ENV-001**  
**Precondition:** Production start.  
**Behaviour:** `npm start` validates presence of required variables when Project Mode is enabled and aborts with explicit message if missing.  
**Error:** Missing variable → process exit non-zero with named variable.  
**Acceptance:** Unit test of start script logic; live `/health` reports configuration readiness.

### 2.4 Build and Deployment

- Client: `vite build` → `dist/`.
- Server: `tsc -p tsconfig.server.json` → `dist-server/`.
- Railway / nixpacks deployment; `railway.toml`, `nixpacks.toml` present.
- Health endpoint `/health` returns version, commit, patch (via diagnostics), database connectivity.

---

## 3. Data Model and Persistence

### 3.1 PostgreSQL Schema (migrations 001–019)

Core tables (excerpt from 001_project_state.sql and later):

```sql
-- projects
CREATE TABLE projects (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','completed','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- project_states (current)
CREATE TABLE project_states (
  project_id text PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  state_version integer NOT NULL DEFAULT 1 CHECK (state_version >= 1),
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- project_state_versions (history)
CREATE TABLE project_state_versions (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  state_version integer NOT NULL,
  state jsonb NOT NULL,
  actor text NOT NULL CHECK (actor IN ('human','agent','tool','system')),
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, state_version)
);

-- project_events, audit_events, rate_limits, …
```

Additional migrations introduce:

- 002 artefacts ledger
- 005 tasks / runs
- 006 jobs
- 007 budgets, plans, approvals
- 008 artefact manifests
- 010–013 code tasks, decisions, repair loop
- 014 provider snapshots
- 015–016 project diagnostics
- 017 app_build_jobs
- 018 model_request_slots (pacing)
- 019 application diagnostic logs

**REQ-DB-001**  
**Precondition:** `DATABASE_URL` set.  
**Behaviour:** `npm run db:migrate` applies migrations in order; idempotent.  
**Error:** Migration failure aborts start.  
**Acceptance:** `tests/database.test.mjs` passes; schema inventory matches `docs/generated-migration-inventory.json`.

**REQ-DB-002**  
**Precondition:** Project state write.  
**Behaviour:** State updates are versioned; concurrent updates detected via `state_version`.  
**Error:** Version conflict → 409 or explicit conflict response.  
**Acceptance:** Concurrent write test returns conflict.

Indexes exist on `(project_id, created_at DESC)` for events and versions.

Integrity: foreign keys with ON DELETE CASCADE / SET NULL as appropriate; CHECKs on status and actor enumerations.

---

## 4. API Contracts

### 4.1 Authentication and Session

- Password-based auth (`APP_PASSWORD`).
- Session cookie with `SESSION_SECRET`.
- CSRF protection on mutating routes.
- Authorization tiers: Tier 3 for production deploy, secrets, GitHub write (Navigator only).

**REQ-API-001**  
**Precondition:** Unauthenticated request to protected route.  
**Behaviour:** 401 / redirect to login.  
**Error:** Explicit error body with code.  
**Acceptance:** Security test suite passes.

### 4.2 Health and Diagnostics

- `GET /health` — version, commit, database status, model readiness.
- Diagnostics endpoints for recent operations, log export, Drive sync (P92, frozen for production verification).

### 4.3 Conversation / Agent Routes

Routes under `/api/` (exact inventory in `docs/generated-route-inventory.json`):

- Chat / conversation endpoints supporting SSE or event streams for progressive output.
- Project / App Builder job submission, status polling, artefact download.
- Cancellation endpoints.

Request/response schemas use Zod where practical. Errors follow consistent envelope:

```json
{
  "ok": false,
  "error": {
    "code": "string",
    "message": "string",
    "detail": {}
  }
}
```

**REQ-API-002**  
**Precondition:** Valid authenticated request to start Architect job.  
**Behaviour:** Job queued; status machine advances; events emitted.  
**Error:** Invalid spec → terminal FAILED with issues list; budget exhausted → BLOCKED.  
**Acceptance:** `tests/app-builder-*.test.mjs` and live workflow evidence.

### 4.4 Model Interaction Contracts

- Adapters implement a common interface (generate, stream, structured).
- Cascade: primary Gemini models ordered by quality/cost; probes for optional models; opt-in external providers.
- Rate limiting via PostgreSQL slots (migration 018) and in-process pacing.
- Budget units tracked in ledger; daily/request quotas enforced.

**REQ-MODEL-001**  
**Precondition:** Model call.  
**Behaviour:** Request paced; response validated; failure triggers bounded recovery or cascade step.  
**Error:** Provider error → logged with preview; cascade advances or terminal failure with truthful reason.  
**Acceptance:** Model tests + live probe evidence.

---

## 5. State Machines, Queues, and Execution

### 5.1 Shared State Vocabulary

`QUEUED` → `RUNNING` → (`WAITING_FOR_USER` | `RETRYING`) → terminal (`SUCCESS` | `PARTIAL` | `FAILED` | `CANCELLED` | `TIMED_OUT` | `BLOCKED`).

Transitions validated; terminal states cannot silently become success.

### 5.2 App Builder (Architect) Pipeline

Stages observed in P118:

1. Spec generation / validation (JSON, schemaVersion:1).
2. Plan generation.
3. Unit generation (files: index.html, styles.css, storage.js, app.js, …).
4. Validators (refs, acceptance).
5. ZIP packing + integrity.
6. Outcome recording.

Bounded repair:

- Spec stage: one recovery call with previous issues.
- Code stage (P118.3.3): one repair call per missing/truncated file; marker coercion for known slips.

Idempotency: job IDs; cache keys include prompt version (`PROMPT_VERSION`).

**REQ-SM-001**  
**Precondition:** Architect job started.  
**Behaviour:** Pipeline advances only on successful stage validation; events `spec_attempt`, `spec_repair`, `unit_attempt`, `unit_repair` emitted.  
**Error:** Exhausted budget or cancellation → terminal with specific reason.  
**Acceptance:** Engine unit tests + live run evidence recording exact stage of failure.

### 5.3 Job and Task Tables

Jobs and code_tasks persist status, attempts, artefacts, decisions. Repair loop (migration 013) supports bounded iterations.

---

## 6. Three User Agents — Architecture and Contracts

### 6.1 A1 Conversational Agent (P116 accepted)

- Natural multi-turn dialogue.
- Shared Simple/Expert conversation orchestration historically; target is dedicated pipeline.
- Context window management, memory of recent turns.
- Tools: limited (web search opt-in, document tools).
- Output: streaming text, optional structured side-effects.
- Acceptance: 80 % live PASS residual B3 (Node LTS).

**REQ-A1-001**  
**Precondition:** User message in conversation mode.  
**Behaviour:** Response generated under cascade; context preserved; no silent truncation without indication.  
**Error:** Provider failure → truthful message + recovery option.  
**Acceptance:** P116 live evidence + regression tests.

### 6.2 A2 Expert Problem-Solving Agent (P117 foundations)

- Progressive multi-step reasoning.
- Explicit intermediate artefacts / decision documents.
- Model cascade with quality preference.
- Tool eligibility policy distinct from Conversational.
- Output contract: structured progress + final answer with evidence.

**REQ-A2-001**  
**Precondition:** Expert task submitted.  
**Behaviour:** State machine progresses with visible steps; final answer contains verifiable claims or explicit uncertainty.  
**Error:** Stagnation after N turns → user-visible BLOCKED / PARTIAL.  
**Acceptance:** P117.x tests + future E2E suite.

### 6.3 A3 Complex Software Architect Agent (P118 in progress)

- Input: high-level product description.
- Output: verified ZIP of generated static site (current profile) containing expected files, passing validators.
- Internal: Spec → Plan → Units → Validators → Pack.
- Prompt versioning, marker parser with coercion, bounded repair.
- Events and diagnostics for every stage.
- Integrity: SHA / size checks on ZIP contents.

**REQ-A3-001**  
**Precondition:** Architect job with valid brief.  
**Behaviour:** Spec and plan succeed; each expected file appears under correct marker; ZIP downloads and contains all required paths.  
**Error:** Marker mismatch → repair attempt then specific `expected_path_not_found:…`; budget exhausted → FAILED with diagnostics.  
**Acceptance:** `tests/app-builder-unit-repair-p118.test.mjs` (7 tests), live workflow `p118-architect-live` records SUCCESS with downloadable artefact.

Prompts live in `appBuilder/core-prompts.ts`; markers in `core-markers.ts`; engine in `core-engine.ts`.

### 6.4 Agent boundary map and contracts (P119.0.2, OBSERVED in source; regression-locked)

Status (updated P119.0.4): the three agents are separate **entry points and UI names**. Conversational and Expert now own their **turn planning and prompt entry** (`server/conversationalAgent.ts`, `server/expertAgent.ts`, selected only by `server/agentRouting.ts`), and each owns its intro prompt text (P119.0.4) and its own named route (`POST /api/agent/conversational`, `POST /api/agent/expert`); they still share **one HTTP handler** (behind three entrances, including the compatibility path `POST /api/conversation`) and the method/boundary/contract text blocks in `promptPacks.ts`; they are **not yet** fully separate pipelines. Architect is a separate route family, client surface and engine. Locked by `tests/p119-agent-boundaries.test.mjs` and `tests/p119-agent-isolation.test.mjs` (in `test:core`).

| Aspect | A1 Conversational | A2 Expert | A3 Architect |
|---|---|---|---|
| User-facing name | Conversational | Expert | Architect |
| Internal key (`AppMode`) | `Simple` | `Expert` | `Project` |
| Entry | `/` chat shell, start card / agent menu | `/` chat shell, start card / agent menu | `/project` (full navigation; `main.tsx` lazy-loads `ProjectMode`) |
| Client modules | `ConversationScreens.tsx` | `ExpertStepScreens.tsx`, `ExpertNav.tsx`, `expertContext.ts`, `expertHistory.ts` | `ProjectMode.tsx`, `ProjectDelivery.tsx`, `ProjectNoviceWizard.tsx`, `ProjectPathChooser.tsx`, `projectBuildJob.ts`, `projectAppBuilder.ts` |
| Server routes | `POST /api/agent/conversational` (compatibility: `POST /api/conversation`) | `POST /api/agent/expert` (compatibility: `POST /api/conversation` + `productMode: "Expert"`) and step routes `/api/neutralize`, `/radar`, `/understand`, `/knowledge-map`, `/expand`, `/redteam-pair`, `/redteam`, `/premortem`, `/experiment-draft`, `/forecast-wording`, `/synthesis`, `/review`, `/revise-document` | `/api/projects/*` (`server/projectRoutes.ts`), incl. `POST …/code/build`, `GET …/code/build/:jobId`, `GET …/artifacts/:artifactId/download` |
| Orchestration / prompt | `conversationalAgent.ts` (plan, prompt entry and intro text; shared method/contract blocks from `promptPacks.ts`) | `expertAgent.ts` (information→decision promotion, stage/method-state paragraph, intro text, step prefix; shared method/contract blocks from `promptPacks.ts`); step prompts per route | `appBuilder/` staged engine (Spec → Plan → Units → Validators → Pack) |
| State | browser-local conversation state | browser-local Expert `Decision` (stage `EXPERT_STAGES`) | server persistence: projects, jobs, artifacts (PostgreSQL) |
| Availability | always | always | only when `ENABLE_PROJECT_MODE=true` (else 404 `PROJECT_MODE_DISABLED`; menu entry disabled) |
| Output contract | streaming/answer text, honest limits | structured stage output + final answer with explicit uncertainty | verified program ZIP or truthful non-success (§7.1) |
| Pipeline isolation | planning, prompt entry, intro text and named route **isolated**; HTTP handler and method/contract blocks **shared with A2** (debt) | planning, prompt entry, intro text and named route **isolated**; HTTP handler and method/contract blocks **shared with A1** (debt) | **isolated** |

Shared, non-agent infrastructure (allowed to stay shared): auth/session, provider adapters and router, model registry/availability, rate limiting, `/api/attach`, `/api/export-document`, health/ops routes, UI shell, telemetry.

**REQ-AGENT-001 — Agent selection is explicit.**  
**Precondition:** a request reaches a chat route: `POST /api/agent/conversational`, `POST /api/agent/expert`, or the compatibility path `POST /api/conversation`.  
**Behaviour:** on `POST /api/agent/conversational` and `POST /api/agent/expert` the route pins the agent and overrides any `body.productMode` (`pinConversationAgent` in `server/agentRouting.ts`; the rest of the body is untouched). On the compatibility path `POST /api/conversation` (kept for older clients and open tabs; the current client no longer calls it) the request is Expert if and only if `body.productMode === 'Expert'` (decided only in `server/agentRouting.ts`); any other value (absent, unknown, malformed) is Conversational. The client adds `productMode` / `expertStage` / `expertContext` only for Expert (`expertConversationFields`), so Conversational request bodies are unchanged. Expert never receives the light Conversational "information" contract (information-detected turns are promoted to `decision`). Method state sent as `expertContext` is quoted as data, never as instructions; unknown stages become `UNKNOWN`.  
**Error:** none silent — an unknown value falls to Conversational by definition, never to Expert or Architect.  
**Acceptance:** `tests/p119-agent-boundaries.test.mjs` and `tests/p119-agent-isolation.test.mjs` (selection, planner equality versus the pre-split logic; mutation-checked), `tests/p119-agent-prompts-routes.test.mjs` (golden prompt hashes, route table, pinning, client route choice) and the HTTP checks R1–R10 in `tests/pipeline.test.mjs` (route pins the agent; legacy and named routes produce the same prompt bytes).

**REQ-AGENT-002 — Architect boundary.**  
**Precondition:** Architect is requested.  
**Behaviour:** Architect is reachable only by navigating to `/project`; the chat shell never hosts it and clears a leftover `Project` mode. Architect client modules call only `/api/projects/*` (plus shared auth/session) and do not import Conversational/Expert modules or call `/api/conversation` or Expert step routes. The chat handler and Expert/Conversational client modules do not reference Architect routes or machinery (`runAppBuilderPipeline`, `code/build`, artifact storage, project/plan/task services). `appBuilder/` and `server/projectRoutes.ts` do not import chat prompt modules (`promptPacks`, `conversationMode`, `intentFlags`, `epistemicVerifier`). When Project Mode is disabled, Architect routes answer 404 `PROJECT_MODE_DISABLED` and the UI entry is disabled.  
**Error:** a boundary violation fails `test:core` in CI.  
**Acceptance:** `tests/p119-agent-boundaries.test.mjs`.

**REQ-AGENT-004 — Agent modules are isolated (P119.0.3).**  
**Behaviour:** `conversationalAgent.ts` and `expertAgent.ts` do not import each other, `agentRouting.ts`, `server.ts` or Architect modules; `server.ts` neither builds conversation prompts nor Expert paragraphs. Their output is byte-identical to the pre-split logic for every request body and detected mode. User-visible text (in-app guide, Architect confirmation) names only Conversational, Expert and Architect. **(P119.0.4)** The intro prompt text of each agent, `expertDialogueParagraph`, `EXPERT_STAGES` and `EXPERT_STEP_PREFIX` live in that agent's own file; `promptPacks.ts` keeps only the method, boundary and contract blocks both dialogue agents share plus `assembleConversationPrompt`. Prompt bytes are locked by golden SHA-256 hashes captured from the pre-move implementation.  
**Acceptance:** `tests/p119-agent-isolation.test.mjs`, `tests/p119-agent-prompts-routes.test.mjs`.

**REQ-AGENT-003 — Known shared paths are explicit.**  
**Behaviour:** the shared A1/A2 HTTP handler (one handler behind `/api/agent/conversational`, `/api/agent/expert` and the compatibility path `/api/conversation`), the method/boundary/contract text blocks in `promptPacks.ts` (`assembleConversationPrompt`, called from each agent module), the internal keys `Simple` / `Expert` / `Project`, and the legacy IR pipeline (`runAppBuilderPipeline`; since P119.0.4 no longer imported by `server.ts`, reachable only through `engine=legacy` with `ALLOW_LEGACY_APP_BUILDER=true` in `server/projectRoutes.ts`, default off; whether any deployment sets that flag is UNKNOWN) are documented debt locked by `KNOWN_SHARED_PATH` tests. Later slices split or remove them; the same patch must update the matching test. No document may claim separate pipelines for A1/A2 before that.  
**Acceptance:** `KNOWN_SHARED_PATH` tests; docs-integrity on protected files.

**Workflow inventory (P119.0.2, OBSERVED).** Push/PR: `ci.yml` (DAG profile `ci`, runs `test:core` and `test:app-builder`) and `ui-check.yml` (`npm run test:ui`). Manual (`workflow_dispatch`): `p118-architect-live` (Architect live ZIP evidence; never drives chat routes), `p117-3-live-retest` (Conversational live), `staging-drills`, `evidence`, `verify-groq`; scheduled: `monitor-connections`. No `p119-*` workflow exists; P119.0.5 must reuse `ci.yml` coverage and add only what is not already covered.

---

## 7. Code Generation, Validation, Packaging

- Marker format: `<<<FILE path>>>` content `<<<END>>>`.
- Coercion rules (P118.3.3): placeholder header, decorated header, code-fence wrapping accepted when expected path matches; other paths rejected.
- Validators: static-site profile checks presence, basic structure, references.
- Packing: `pack-zip.ts` produces ZIP; integrity verification required before SUCCESS.
- Cache: results keyed by prompt version + inputs.

**REQ-GEN-001**  
**Precondition:** Unit generation reply received.  
**Behaviour:** Parser extracts files; coercion applied only for expected path; repair scheduled if missing.  
**Error:** Unparseable or wrong path → precise failure reason.  
**Acceptance:** Mutation-checked unit tests.

---



### 7.1 Program archive delivery (canonical — P118.5)

Architect (A3) program delivery uses **exactly one** success path. Normative detail: `docs/DATA_AND_ARTIFACTS.md` and `docs/OPERATIONS_AND_RELEASES.md`.

1. Staged App Builder engine is the only engine that may claim A3 program SUCCESS (P118.5.1 makes this the API default).
2. Job reaches `outcome=SUCCESS` only if a non-empty ZIP was packed **and** stored as an artifact (`artifactId` set).
3. Client receives `downloadUrl` → `GET /api/projects/:projectId/artifacts/:artifactId/download`.
4. User download uses `downloadViaFetch`; HTTP 200 with empty body is failure, not success.
5. Offline E2E (P118.5.2) must open the ZIP and assert expected implementation paths with non-empty content; live staged path must not force legacy (P118.5.4 client).

**Forbidden as A3 SUCCESS (residuals only):**

| Mechanism | Allowed residual use | Must not |
|-----------|----------------------|----------|
| Legacy `runAppBuilderPipeline` scaffold ZIP | Explicit `ALLOW_LEGACY_APP_BUILDER` / internal only | Default UI build or silent SUCCESS |
| Code-task / model_patch download | Manual external coding hand-off | Same button as “Download program” |
| PACKAGE.md Delivery tab | Task brief for external tools | Substitute for program archive |
| Client JSON / workspace export | User backup of decisions/workspace | Server Architect artifact |
| Diagnostics ZIP | Ops / failure diagnosis | Product “program ready” |

**REQ-GEN-002**  
**Precondition:** Architect job reaches terminal SUCCESS.  
**Behaviour:** `downloadUrl` is present; GET returns `application/zip` with length > 0; archive opens; required profile files exist and are non-empty.  
**Error:** Missing artifact, empty body, or failed open → job must not remain SUCCESS; UI must not offer a working download as success.  
**Acceptance:** P118.5.2 offline E2E on the evaluated commit; P118 exit prefers live staged run after P118.5.4 client fix (not `engine=pipeline`).


## 8. User Interface and Backend Interaction

- React 19 + Tailwind (via Vite plugin).
- Mode selection (transitional four modes → three agents under P119).
- Streaming responses, progress banners, file download UI.
- Offline indicator, autosave, Drive export/sync (optional).
- Copy linting (`lint:copy`) for product-facing strings.
- UserGuide component for in-app help.

**REQ-UI-001**  
**Precondition:** Job in RUNNING.  
**Behaviour:** UI shows current stage / progress; on SUCCESS offers download; on FAILED shows truthful reason and next action.  
**Error:** Network loss → OfflineIndicator + recovery.  
**Acceptance:** Playwright / manual QA checklists; copy lint passes.

---

## 9. Security, Logging, Diagnostics, CI/CD

### 9.1 Security

- Password + session + CSRF.
- Gitleaks configuration.
- No secrets in client bundle.
- Rate limits, budget enforcement.
- Architecture boundary checks prevent leakage of server code into client.

### 9.2 Logging and Diagnostics

- Application diagnostic logs (migration 019).
- Event stream with previews (redacted).
- CI produces two-artefact assistant handoff + five-cycle history.
- Evidence Records (schema-evidence-record.json) and verification DAG.

### 9.3 CI/CD

- GitHub Actions / local DAG (`scripts/run-dag.mjs`).
- Profiles: check, full CI.
- Nodes: version-consistency, typecheck, build, architecture checks, multiple test suites, evidence collection, schema validation.
- Fail-closed evidence gate.
- Patch packing tools enforce version rules.

**REQ-CI-001**  
**Precondition:** Patch applied.  
**Behaviour:** `npm run check` / full CI DAG completes; independent nodes always finish; dependents BLOCKED with named reason.  
**Error:** Any FAIL aborts promotion.  
**Acceptance:** Green CI on exact commit; evidence artefacts present.

### 9.4 Recovery

- Bounded repair loops.
- Job cancellation.
- Database migrations reversible in principle (manual).
- Backup/restore scripts.

---

## 10. Testing Requirements and Acceptance Criteria

### 10.1 Test Suites

- `test:core`, `test:models`, `test:security`, `test:files`, `test:database`, `test:app-builder`, `test:ai`, `test:compact-ci-artifacts`, architecture and schema tests.
- Golden evaluation harness.
- P119 agent contracts: `tests/p119-agent-ui-contract.test.mjs`, `tests/p119-agent-boundaries.test.mjs`, `tests/p119-agent-isolation.test.mjs` (in `test:core`; also `npm run test:p119-agents`).
- Live workflows: `p118-architect-live` (and predecessors).

### 10.2 Acceptance per Component

Each REQ above carries its acceptance. Global product acceptance (current normative contract at the top of this file; rolling observations in `docs/USER_VALUE_EVALUATION.md`):

- A feature succeeds only when a representative user completes the intended task and receives useful, truthful, accessible output.
- Green CI and internal component success are necessary but insufficient.
- `PASS` / `FAIL` / `BLOCKED` / `TIMEOUT` / `PARTIAL` / `NOT_RUN` / `UNKNOWN` / `NOT_REPRODUCED` are distinct; NOT_RUN never equals PASS.

**REQ-TEST-001**  
**Precondition:** Any code change.  
**Behaviour:** Relevant test suite(s) executed; evidence recorded for the exact commit.  
**Error:** Red CI → no promotion.  
**Acceptance:** Hosted CI green on the commit under evaluation; live run evidence attached when required by exit gate.

---

## 11. Versioning and Patch Discipline

- `package.json` is the sole version source.
- `"version"` = major programme number (118).
- `"patch"` = full applied patch (118.3.3).
- Every patch includes `package.json`; version never decreases.
- `src/config.ts` derives APP_VERSION / APP_PATCH via Vite plugin.
- `scripts/check-version.mjs` enforces consistency.

**REQ-VER-001**  
**Precondition:** Patch preparation.  
**Behaviour:** Version fields updated; check-version passes.  
**Error:** Mismatch aborts CI.  
**Acceptance:** Version-consistency node green.

---

## 12. Open Constraints and Future Gates

- Live client (`scripts/p118-architect-live.mjs`) must not send `engine=pipeline`; staged is default (P118.5.4).

- P118 exit gate: offline archive-delivery PASS (P118.5.2) plus preferred **live staged** run after P118.5.4 (no `LEGACY_DISABLED` from forced pipeline); see `docs/OPERATIONS_AND_RELEASES.md` and `docs/DATA_AND_ARTIFACTS.md`. Marker/spec repair alone is insufficient.
- P118.5.1–P118.5.5: staged-only default, artifact invariants, UI single download button, E2E, residual decommission
- P118 exit gate (historical wording): live Architect run produces verified ZIP; hosted CI green; Navigator acceptance.
- P119: UI migration to exactly three agents; removal of legacy mode paths.
- P120: Cross-agent E2E.
- P121: Universal Model Resilience Layer (planning only).
- Production verification of P92 diagnostics remains frozen.
- External model fallbacks remain opt-in.

This specification is the single source of truth for re-implementation. Subsequent patches update it in place under the Navigator charter.
