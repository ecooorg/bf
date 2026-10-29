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

**Component boundaries (architecture-guardrails.md):**

- `appBuilder/` is a pure core: no Express, no React, no direct database. Ports defined in `core-ports.ts`.
- Server adapters (`appBuilderAdapter.ts`, `appBuilderPipeline.ts`) implement ports and surface events.
- Client never calls model providers directly.
- All durable state lives in PostgreSQL when `DATABASE_URL` is set; in-memory fallbacks exist only for non-project modes under explicit flags.

### 1.3 Repository Structure (P118)

```
.
├── AGENTS.md                          # Navigator charter (immutable)
├── CHANGELOG.md                       # Patch history (newest first)
├── NEXT_PATCH.md                      # Immediate next action surface
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

Architect (A3) program delivery uses **exactly one** success path. Normative detail: `docs/ARCHIVE-DELIVERY-CANON.md`.

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
- Live workflows: `p118-architect-live` (and predecessors).

### 10.2 Acceptance per Component

Each REQ above carries its acceptance. Global product acceptance (from AI-USER-VALUE-SPEC):

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

- P118 exit gate: offline archive-delivery PASS (P118.5.2) plus preferred **live staged** run after P118.5.4 (no `LEGACY_DISABLED` from forced pipeline); see `docs/ARCHIVE-DELIVERY-CANON.md`. Marker/spec repair alone is insufficient.
- P118.5.1–P118.5.5: staged-only default, artifact invariants, UI single download button, E2E, residual decommission
- P118 exit gate (historical wording): live Architect run produces verified ZIP; hosted CI green; Navigator acceptance.
- P119: UI migration to exactly three agents; removal of legacy mode paths.
- P120: Cross-agent E2E.
- P121: Universal Model Resilience Layer (planning only).
- Production verification of P92 diagnostics remains frozen.
- External model fallbacks remain opt-in.

This specification is the single source of truth for re-implementation. Subsequent patches update it in place under the Navigator charter.
