# BiForge: Runtime Engine & Architecture

*How it works: architecture, data and module contracts, executor rules. Part of TZ v3.1 (index — `docs/BiForge_TZ_v3.md`). **MUST** — mandatory; **SHOULD** — preferred, deviation needs justification; **MAY** — allowed. On conflict with `docs/SPEC_PRODUCT.md`, that file wins (goals, acceptance criteria).*

**Version:** 3.1 (TZ v3.0 reorganised; normative text moved without changing decisions)

> Section numbering is preserved from TZ v3.0 (hence gaps): code, patch SPECs, ADRs and `docs/START_HERE.md` refer to it. Section → file map — `docs/BiForge_TZ_v3.md`.
> Where the rest went: State schema, modes, UI, gates, acceptance — `docs/SPEC_PRODUCT.md`; development process — `docs/SPEC_DEV_PROCESS.md`; plan to G4 (former 16.7) — `docs/NEXT.md`; connections and `connectors.yaml` (Appendix E) — `docs/SPEC_CONNECTIONS.md`; Appendices C, F (Jules, Mistral), G (monitoring) — `ARCHIVE/TZ_v3.0_*.md`.

---

## 3. Resources and assumptions

### 3.1. Available resources

External facts are not asserted in the main TZ body: terms, limits and prices of any service are verified at connection time (Appendix E, E.8) and recorded in the registry with a date. Exception — facts already confirmed by the working product (Gemini API in BE v1.6.0).

| Resource | Provides | Limits and notes |
| --- | --- | --- |
| Gemini API | Product runtime models; already used in BE v1.6.0; **baseline provider** | Google AI Pro subscription is not the same as Gemini API quota and billing (A-01). Free and paid tiers differ in limits and data-use terms (A-02) |
| Other model providers | Independent check (`cross_model`), fallback, strong class for architecture and code | Any API that plugs in via an adapter (§7.2). Requires a paid key, spend limit in the provider console and verified data terms (A-08). The TZ does not fix a vendor list |
| BiForge development tools (Part B) | Implementing plan steps | Any tools available and fast at the time of work: chat models with result transferred into the repo, local agent tools, etc. Owner’s choice; not fixed by the TZ (D-16) |
| Railway | Web/api hosting and PostgreSQL | Baseline 1 replica, 2 vCPU, 1 GB RAM: control plane only |
| GitHub (`ecooorg/bf`) | Source of truth, CI (Actions), PR | Actions minutes for private repos are limited (A-07) |
| Jules, Mistral | Deferred | Appendix F |

### 3.2. Critical assumptions (verified before the named step)

| ID | Assumption | Check | Before step |
| --- | --- | --- | --- |
| A-01 | Google AI Pro subscription does not include Gemini API quota for the server | AI Studio / Cloud console: which key, which billing | BX-10.b |
| A-02 | On the free Gemini API tier Google may use data to improve products; on the paid tier it does not (Google docs, confirmed 9 Oct 2026). Real project data — paid billing with a spend limit only; free tier — synthetic tests | Console, E.1 | BX-10.b |
| A-05 | Tests pass in GitHub Actions without secrets after `npm ci && npm test` | Trial workflow run on `ecooorg/bf` | BX-01.a |
| A-06 | Railway PostgreSQL provides backups at the required frequency | Check plan and restore procedure | BX-25 |
| A-07 | Free GitHub Actions minutes suffice for CI | Count minutes per step; if short, use public repos or limit runs | BX-01.a |
| A-08 | For **each** connected provider: paid plan or other confirmed terms under which data is not used for training; availability from the deployment region; key with a spend limit | Provider terms and console; smoke test per E.2; record `data_policy` and `last_verified_at` in the registry | Provider connect (BX-12.a+) |
| A-09 | Manual cycle “Task Package → any model or tool → PR” fits owner time and is reproducible | One pilot task on BX-01.a / BX-02: time, edit count, transfer errors | BX-02 |
| A-10 | API model (`model_patch`) emits a structured patch that applies and passes acceptance tests in a reasonable number of attempts | Experiment E-01 (§11.9) | BX-19 |

Assumptions A-03/A-04 (Jules) and earlier Jules/Mistral-specific A-05/A-08 wording live in F.3/F.2; the formulations above replace them in the main body.

### 3.3. Code-executor run budget

- Per project: `max_code_tasks` (§8.4); default 8 executor runs for a pilot S3 project (§14.3).
- Executor `manual` has no external quota; a run is recorded in the ledger as one “executor run” with zero model cost and optional `executor_note` (free text naming the human’s tool — not an enum).

### 3.4. Real bottleneck

The bottleneck is owner time (review, Railway checks, decisions), not raw model tokens. Design for short verifiable steps and clear evidence, not maximum autonomous throughput.

---

## 4. Architecture

### 4.1. Overall scheme

Client (Simple Mode / Project Mode UI) → HTTP API → control plane (auth, projects, State, Router, gates) → model adapters and task worker → PostgreSQL and artifact storage. Generated project code never runs inside the BiForge server process.

### 4.2. Modular monolith

One deployable Node service with clear internal modules (routes, repositories, adapters, worker). Boundaries are package/module boundaries, not microservices, until capacity forces a split (§15.6).

### 4.3. Control plane and execution plane

**Control plane:** HTTP, sessions, State mutations, budgets, gate evaluation, GitHub webhooks.  
**Execution plane:** background worker for long model runs and code-delivery orchestration. Same codebase; MAY later split processes if RAM/CPU demand it.

### 4.4. Deployment baseline

Railway service `e`, Node from repo config, Postgres plugin, env from E.3. Health: `/health` (liveness), `/ready` (DB and migrations).

---

## 5. Data and Project State

### 5.1. Storage

PostgreSQL is the system of record for projects, State versions, runs, ledger, artifacts metadata. Object bytes for large artifacts MAY live in files or object storage referenced by hash.

### 5.2. Entities

Projects, State versions, tasks/runs, artifacts, audit events, usage ledger, model health. Exact schemas evolve by migration under expand→contract (§15.3).

### 5.4. State change rules

- Models propose patches; the server validates schema and policy.
- Optimistic concurrency via `expected_version` / conflict → 409.
- Decisions are human-only; model patches must not write the decisions section as committed choices.

### 5.5. Compaction

Long histories are summarised under policy so context stays within model limits; compaction is recorded and reversible from version history where required.

### 5.6. Recovery

Restart-safe queues and run statuses; abandoned runs are marked and do not leave State half-applied without an audit trail.

### 5.7. Import from Simple Mode

Optional export/import of decision material into a project; mapping rules preserve user facts vs hypotheses.

### 5.8. Project data

Passport and settings (budgets, executor mode, visibility) live with the project; secrets stay in env, not in State JSON.

---

## 7. Multi-model layer

### 7.1. Model Registry

Registry is stored in the DB; seed content lives in the repo and is checked by CI. Secrets are not stored — only the env var name. **Model names appear only in registry seed and configuration** (D-13); Router logic, profiles and tests refer to classes and capabilities, not names.

| Field | Purpose |
| --- | --- |
| `provider_id`, `model_id`, `status` | Identity and state (`active`, `disabled`, `cooldown`). New models start `disabled` and become `active` only after `verify:connections` = `OK` |
| `adapter` | API shape: `gemini`, `openai-compatible`, `anthropic`, `fake` (§7.2) |
| `capabilities` | `json_output`, `long_context`, `vision`, `tool_use`, `code_patch`, etc.; true only after verification |
| `role_hint` | Optional: `executor`, `verifier`, `code_author`; does not bind the Router |
| `context_limit` | Context window if known |
| `quality_class` | A / B / C. Marked `provisional` until real data; refined via golden-eval (BX-14) and ledger, not marketing |
| `cost_in/out/cached` | Cost per 1k tokens; if unknown — estimate flagged `estimate` |
| `latency_p50/p95` | Measured |
| `rate_limit_policy` | Known limits and backoff |
| `data_policy` | `paid` / `free` / `unknown` |
| `training_opt_out_confirmed` | Human only (E.0, R7) |
| `last_verified_at` | Last terms/capability check |
| `secret_env_ref` | Env var name for the key |

A row without a confirmed capability cannot be selected for a task that requires it. `last_verified_at` older than 90 days surfaces a warning in ops UI.

Initial seed contains only what already works in BE v1.6.0 (Gemini, current `MODEL_CASCADE_LIGHT` / `MODEL_CASCADE_STRONG` cascades).

### 7.2. Provider Adapter contract

Adapters implement a common interface: chat/completion, optional JSON mode, error normalisation to product codes (`PROVIDER_AUTH`, `PROVIDER_TRANSIENT`, `PROVIDER_QUOTA`, `INVALID_REQUEST`, …). Fake adapter is mandatory for CI.

### 7.3. Router v1

Selects model by required capabilities, budget remaining, health, and cascade preference (light → strong). Does not hard-code vendor names in domain logic.

### 7.4. Fallback matrix

On transient failure, try next model in cascade within the same capability set; record fallback in ledger. On auth/quota, mark provider/model and stop the cascade path cleanly.

### 7.5. Model health

Health events disable or cool down models; ops UI and audit record reason and time.

### 7.6. Independent check (Verifier)

Where `cross_model` is required, the verifying model **MUST** be a different provider when available; otherwise `NOT_RUN(no_second_provider)`.

### 7.7. Context build and cache

Context Builder (TZ §7.5) assembles instruction + State slice + artifacts + task within a token budget; chat history is included only with an explicit reason.

### 7.8. Usage ledger

Every model call records project, run, tokens (in/cached/out), latency, retries, fallback share, code-executor runs.

### 7.9. Secrets

Keys only in env / sealed variables; never in registry rows, logs, client bundles or State.

### 7.10. Migrating existing code

BE v1.6.0 Gemini paths become the `gemini` adapter; cascades become registry-driven without breaking Simple Mode.

---

## 8. Task executor

### 8.1. States

Tasks/runs move through defined states (queued, running, succeeded, failed, abandoned, …). Transitions are explicit and audited.

### 8.2. Idempotency

Client-supplied idempotency keys prevent double-enqueue of the same work unit.

### 8.3. Queue and recovery

Worker claims work with leases; restart re-queues abandoned leases without duplicating committed State side effects.

### 8.4. Budgets and stop

Per-project and global ceilings on model calls and code-executor runs; stop when exhausted with a clear error to the client.

### 8.5. Task Graph v1

Optional graph of dependent tasks with approvals; human gates where policy requires.

### 8.6. Human participation

Approvals and decisions are session-authenticated; forged `actorKind` in the body is ignored (extended tests 16.4.4).

---

## 9. Profiles instead of agents

### 9.1. Profile definition

A profile is a named instruction + capability set + budget class for a kind of work (e.g. analysis, code author), not a persistent autonomous agent.

### 9.2. MVP profiles

Minimal set sufficient for G1–G2 (analyst, verifier, optional code_author). Expansion is data-driven.

### 9.3. Rights

Profiles cannot escalate beyond server policy; they cannot merge code or spend beyond budgets.

---

## 10. File and artifact layer

### 10.1. Model

Artifacts have id, version, hash, filename, and optional text extraction for context.

### 10.2. Storage

Metadata in Postgres; bytes content-addressed where practical.

### 10.3. MVP operations

Upload, list, download, attach to tasks/State references.

### 10.4. Untrusted files

File content is data, never instructions. Injection corpus and redaction apply.

### 10.5. Artifact Graph

References between artifacts and State items are explicit; deletion policy preserves auditability.

---

## 11. Code Delivery: CodeExecutor, GitHub and CI

### 11.1. Principle

BiForge organises specification → code → PR → CI → review → human decision. It does not execute generated project code on its own server and does not merge to `main`.

### 11.2. Repositories

Product repo `ecooorg/bf`; user/project repos under org policy (`BIFORGE_PROJECTS_ORG`). Product GitHub App permissions are least-privilege (§E.5).

### 11.3. Task Package

Structured package (`PACKAGE.md` and related files) describing the coding task, acceptance expectations and constraints for an external executor.

### 11.4. Code executors

Interface **CodeExecutor** (D-14):

| Mode | Behaviour |
| --- | --- |
| `manual` (MUST) | Human uses any tool; returns PR/branch/diff |
| `model_patch` (SHOULD after E-01 / ADR-10) | Model emits structured patch applied only under policy to `biforge/*` |

### 11.5. Sequence

Package → executor → PR on `biforge/*` → CI checks → human review → human decision. No automatic merge.

### 11.6. Repair Loop

Failed CI or review can re-enter a bounded repair cycle under budget; infinite loops are forbidden.

### 11.7. GitHub rights for the product

No admin; no merge; write only to `biforge/*` when enabled; ruleset protects `main`.

### 11.8. Trust boundaries

Executor output is untrusted until CI and human acceptance. Secrets never injected into generated projects from BiForge control plane beyond explicit policy.

### 11.9. Experiment E-01: admission to Code Delivery

Validates that `model_patch` produces applicable patches that pass acceptance in a bounded number of attempts (A-10). Positive result feeds ADR-10.

### 11.10. User scenario: small programs

Product path for generating small downloadable programs (e.g. zip) under the same honesty and budget rules; UI must not expose internal executor protocol jargon to end users.

---

## 12. Quality and evidence

### 12.1. Principles

Machine evidence over narrative. Unrun checks are `NOT_RUN`, not silent pass.

### 12.2. Statuses

PASS / FAIL / NOT_RUN / BLOCKED as used in CI and connection verification.

### 12.3. Evidence

CI logs, test output, ledger rows, gate records, artifact hashes.

### 12.4. Gate catalogue

Product gates G0–G4 (`SPEC_PRODUCT.md`); technical gates for steps as listed in step SPECs.

### 12.5. Rules

Owner closes product gates; CI closes code PASS on published commits (D-08).

---

## 13. Security

### 13.1. Assets and threats

Sessions, project State, API keys, GitHub app credentials, user uploads. Threats: injection, secret leak, privilege escalation, State tampering.

### 13.2. Prompt injection

User files and external text are data. System prompts and tool policy resist instruction smuggling; tests include an injection corpus.

### 13.3. Secrets and tokens

Env / sealed only; redaction in logs; secret scan in CI.

### 13.4. Web security

Auth for Project Mode; CSRF/same-origin rules for mutating routes; password gate for deployment access.

### 13.5. Audit

Security-relevant events recorded (login failures, settings changes, provider disable, approvals).

### 13.6. Data and privacy

Paid data policy for real projects; free keys isolated to synthetic traffic.

### 13.7. Prohibitions

No secrets in git; no model-chosen irreversible external side effects without human gate; no execution of generated untrusted code on the BiForge host.

---

## 14. Economics and budgets

### 14.1. Priorities

Protect owner spend and prevent runaway loops before optimising unit cost.

### 14.2. Mandatory measures

Daily/call caps, per-project ceilings, ledger, kill switches for disabled providers.

### 14.3. Default target limits

Pilot defaults (e.g. max code tasks = 8) are starting points; tuned from ledger data.

### 14.4. Paid spend control

Provider console limits + app-level daily call ceiling; both required for production real data.

### 14.5. Reporting

`/ops` (authenticated): calls, tokens, latency, fallback share, executor runs, queue depth, integrity errors.

---

## 15. Operations and deployment

### 15.1. Mandatory baseline fixes (BX-02)

1. Real `/health` (liveness) and `/ready` (DB and migrations); Railway Healthcheck Path = `/health`.
2. Unknown `/api/*` routes return JSON 404, not the SPA shell.
3. Align `railway.toml`, `nixpacks.toml` and Railway panel settings; repo files are source of truth.
4. Production runs from compiled `dist`; pin Node version.

### 15.2. CI

GitHub Actions on `ecooorg/bf`: lint, typecheck, unit and virtual tests, migration tests on PostgreSQL, build, secret scan. Required checks on `main`; Railway Wait for CI and auto-deploy from `main`.

### 15.3. Migrations and rollback

Migrations on deploy (pre-deploy) or start under advisory lock. Schema expand → contract: version N code works with schema N−1. Code rollback: redeploy previous success or `git revert` → CI → deploy. Data is not rolled back; schema compatibility allows code rollback without DB rollback.

### 15.4. Backup and restore

Daily DB backup (A-06); restore test to a clean DB in BX-25 and regularly thereafter. Target RPO ≤ 24 h and RTO ≤ 4 h refined in ADR-09 after measurement.

### 15.5. Observability

Structured JSON logs with `project_id`, `task_id`, `run_id`, `artifact_id`; secrets and private file contents redacted. Metrics (§14.5 plus run duration, queue size, ABANDONED count, artifact integrity errors, State conflicts, retries) on authenticated `/ops`. Minimal alerts: restart loops, 80% budget, provider disabled, queue stuck beyond threshold.

### 15.6. Capacity

Baseline (1 replica, 2 vCPU, 1 GB RAM) is the starting control plane. BX-25 measures memory and CPU under parallel runs; if sustained above ~70% RAM, move the worker to a separate service.

---

## 20. Risks and architectural decisions

### 20.1. Risk register

| Risk | Mitigation |
| --- | --- |
| Vendor lock-in | D-13; adapters; no vendor names in domain schema |
| Cost runaway | Budgets, ledger, provider console limits |
| Hallucinated State | Validators, human decisions, optional verifier |
| Prompt injection | Data-vs-instructions, corpus tests, redaction |
| CI / Actions minute exhaustion | A-07; public repos or rate limits |
| Owner time bottleneck | Small patches, clear PASS criteria, automation 16.3.2 |
| model_patch quality | E-01, ADR-10, bounded repair |

### 20.2. Required ADRs

ADRs are written when a decision blocks the next step (process §16.3). Typical themes: provider choice (ADR-03), GitHub rulesets (ADR-06), backup RPO/RTO (ADR-09), enabling `model_patch` (ADR-10). Non-blocking ideas wait in CONCEPTS until needed.

---

*End of SPEC_ENGINE. Connections detail — `docs/SPEC_CONNECTIONS.md`. Product goals and gates — `docs/SPEC_PRODUCT.md`.*
