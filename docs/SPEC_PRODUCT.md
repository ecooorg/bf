# BiForge: Product Specification

*What we build and how we know we built it. Part of TZ v3.1 (index — `docs/BiForge_TZ_v3.md`). Technical contracts — `docs/SPEC_ENGINE.md`, development process — `docs/SPEC_DEV_PROCESS.md`, remaining plan — `docs/NEXT.md`.*

**Version:** 3.1 (TZ v3.0 reorganised; decisions and requirements unchanged) · **Basis:** TZ v3.0, approved by owner 10 October 2026 · **Language:** English is the canonical engineering language of the repository

> Section numbering is preserved from TZ v3.0 (hence gaps): code, patch SPECs, ADRs and `docs/START_HERE.md` refer to it. Section → file map — `docs/BiForge_TZ_v3.md`.

## In brief: what BiForge is

BiForge runs a project as a managed process, not as a chat transcript. A project has **Project State**: goal, facts, unknowns, hypotheses, decisions, risks, requirements. The model proposes State changes; the system validates them against schema and policy; **only a human makes decisions**.

The product has five parts:

1. **Simple Mode** — the former BiForge v1.6.0 conversation product; behaviour is versioned separately from Project Mode.
2. **Project Mode** — server workspace (PostgreSQL): projects, State, history, artifacts, tasks.
3. **Multi-model layer** — model registry, adapters, Router, cost ledger. Baseline provider — Gemini API; others connect via the registry without vendor lock-in in the domain model.
4. **Task executor** — queue, budgets, retries, recovery after restart.
5. **Code Delivery** — path “specification → code → PR → CI → review → human decision”. Code is written by an external executor (a human with any tool, or a model via API); the product does not execute code itself and never merges to `main`.

**What the human gets.** Not a one-click finished product, but a verifiable package: approved specification, architectural decision, repository with Pull Request, tests, CI report, reviewer notes, cost journal. A human always accepts the result.

**What BiForge does not do in v3:** does not run generated code on its own server, does not merge or deploy, does not operate without a human, does not change State outside the validator.

**How we accept.** Gates G0 → G1a → G1 → G2 → G3 → G4 (section 17); each closes by owner decision on recorded evidence. Only the system marks **PASS** on machine evidence (CI, tests); an unrun check is honestly `NOT_RUN`.

---

## Key decisions

*(former 0.1; IDs D-01…D-17 are used across all documents)*

| ID | Decision | Rationale |
| --- | --- | --- |
| D-01 | One strong executor path for code delivery, not a swarm of autonomous agents | Controllability and reviewability |
| D-02 | Project State is the source of truth for Project Mode; chat is not | Recoverability and audit |
| D-03 | Only a human confirms decisions that change commitments | Safety and ownership |
| D-04 | Models propose; validators and policy accept or reject | No silent State drift |
| D-05 | Budgets and stop rules are first-class | Cost and runaway control |
| D-06 | Artifacts are versioned; downloads are explicit | Reproducibility |
| D-07 | Gates G0–G4 with recorded evidence | Staged acceptance |
| D-08 | Only CI on a published commit grants code PASS | No self-certification |
| D-09 | Secrets never in repo, logs or client bundles | Security baseline |
| D-10 | Simple Mode remains usable without Project Mode | Product continuity |
| D-11 | Fake providers in automated tests | Reproducible CI without live keys |
| D-12 | Historical BF-xx labels frozen; not reused | Traceability |
| D-13 | **Vendor neutrality.** Model and vendor names live only in registry seed, config and env. They do not enter the domain model, table/field names, budget variables or core logic. Vendor explorations not accepted into MVP stay in Appendix F | Jules lesson: binding schema/budget to one vendor makes replacement expensive |
| D-14 | Code generation is behind a **CodeExecutor** interface (§11.4). In MVP: `manual` (MUST) and `model_patch` (SHOULD after experiment E-01). Other executors plug the same interface | Code executor must be replaceable without changing State, Task, Gate Engine |
| D-15 | **Vertical slice before horizontal layers.** First working path “project → State → model call → artifact → human decision” is assembled by gate G1a, before full Router, queue and Code Delivery | Earlier real feedback; less interface drift |
| D-16 | Part B is not tied to a development tool. Any model or tool the owner can use quickly may be the development agent; the contract is `AGENTS.md`, step SPEC and CI | Practice: chat models often outperform specialised cloud agents over API |
| D-17 | **Canonical engineering language of the repository is English.** Owner may keep Russian archives offline; in-repo specs, ADRs and process docs are maintained in English | Single source of truth; avoids dual-language drift |

### 0.2. Goal

Build a working multi-model system that runs a project as a managed process (goal, facts, unknowns, decisions, risks), executes tasks via routed models with independent checking, stores results as versioned artifacts, and for software projects organises the path “specification → code → PR → CI → review” with verifiable criteria and human participation.

### 0.3. Non-goals of v3.0

- Autonomous “software factory” without a human, automatic merge and production deploy of generated projects.
- Own code-execution sandbox.
- Parallel teams of a dozen agents.
- Multi-user access with roles and tenants.
- Self-learning Router, Template Engine, trainable Project Memory.
- Code-quality guarantees beyond what tests and CI prove.
- Binding the product or development process to a specific model vendor or agent service.

## 1. What is being built

### 1.1. Product composition

Simple Mode, Project Mode, multi-model layer, task executor and Code Delivery as summarised above. Interfaces between them are versioned; Project Mode must not break Simple Mode contracts unless a SPEC explicitly changes them.

### 1.2. Modes and UI (summary)

- **Simple Mode:** open-ended conversation, decision support, documents; client-held decision library where applicable. The user may continue the dialogue indefinitely.
- **Project Mode:** `/project` workspace; server State; tabs and operational UI evolve per UI SPECs without leaking internal protocol labels to end users.
- **Expert Mode:** a **structured decision method** (stages such as understand → expand → attack → test → decide → synthesis → learn). Stages must not choose or rank options for the user.
  - **Required (UI1):** the method must **not** block further dialogue. On every Expert stage and after the final stage, the user can send **clarifications, corrections, and new information**; the agent incorporates them and may revise analysis without forcing an irreversible end of the thread.
  - Stage navigation (next / skip / enough to decide) remains available; free conversation is **additive**, not a replacement for the method.
  - Shared conversation state with Simple where the product already uses one history is preferred so switching modes does not erase context without an explicit user action.

### 1.3. State (product view)

State holds facts, unknowns, hypotheses, risks, requirements, decisions. Models emit patches; the server validates. Decisions are human-only. Full field schemas and ops — `SPEC_ENGINE.md` and `statePipeline`.

## 17. Acceptance gates (summary)

| Gate | Intent |
| --- | --- |
| G0 | Baseline: repo, CI, deploy path alive |
| G1a | Vertical slice: project → model → artifact → human decision |
| G1 | Stable Project Mode core (State, ledger, basic executor) |
| G2 | Multi-model routing and budgets under control |
| G3 | Code Delivery path proven (E-01 / executor policy) |
| G4 | Product acceptance for the v3 scope |

Each gate closes only on recorded evidence; owner decision is required. Machine PASS is never inferred from narrative alone.

## Deferred items

Items explicitly deferred from v3 (multi-tenant, self-learning router, in-product code sandbox, etc.) stay deferred until a new TZ revision or ADR opens them.

---

*Normative detail for architecture, data, security and operations remains in `docs/SPEC_ENGINE.md`. Process remains in `docs/SPEC_DEV_PROCESS.md`.*
