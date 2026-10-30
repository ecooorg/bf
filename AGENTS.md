# AGENTS.md — Repository Governance, Obligation Map, and Session Protocol

This file defines mandatory working rules for every AI assistant and contributor. Follow it at the beginning of every session and whenever scope, status, or authority is unclear. Do not invent an alternate hierarchy or change a document’s role for convenience.

## 1. Product principle

BiForge succeeds when a real user completes a meaningful task and receives a correct, useful, understandable result. Tests, CI, architecture, documentation, and evidence are controls that support product value; none is a substitute for it. A green test suite does not prove that the deployed product works or that its output is useful.

## 2. Single-source-of-truth map

| Topic | Sole authority | Boundaries |
|---|---|---|
| Assistant rules, session-start protocol, obligation map, change permissions | `AGENTS.md` | Does not replace product requirements or claim implementation status. |
| Normative product outcomes, agent behavior, technical requirements, acceptance criteria | `TECHNICAL_SPECIFICATION.md` | Changes to mandatory user outcomes or normative contracts require explicit owner approval. |
| Ordered programme plan, dependencies, completed and future phases | `ROADMAP.md` | Preserve completed phases and history. Each new session re-evaluates what to do next; the roadmap is not an instruction to blindly execute a stale next task. |
| Factual implementation state, known gaps, verification results and provenance | `TECHNICAL_REPORT.md` | Report only what evidence supports; append new records at the top. |
| Patch history | `CHANGELOG.md` | Add new entries at the top; do not rewrite prior entries. |
| Architecture | `docs/ARCHITECTURE.md` | Supporting detail; must agree with the normative spec and source. |
| API behavior | `docs/API_CONTRACTS.md` | Supporting detail; verify against actual routes and tests. |
| Test strategy and acceptance evidence | `docs/TESTING_AND_ACCEPTANCE.md` | Tests are evidence, not the product outcome itself. |
| Observed user-value evidence | `docs/USER_VALUE_EVALUATION.md` | Preserve historical records; distinguish OBSERVED, INFERRED, and NOT_RUN. |
| Security and privacy | `docs/SECURITY_AND_PRIVACY.md` | Binding safety/security constraints. |
| Operations and releases | `docs/OPERATIONS_AND_RELEASES.md` | Live/destructive actions require authorization. |
| Data, schemas, artifacts | `docs/DATA_AND_ARTIFACTS.md` | Respect schemas, generators, and delivery contract. |
| Current cross-cutting decisions | `docs/DECISIONS.md` | Supersede decisions explicitly; do not silently erase history. |
| Language policy and language-neutral behavior | `TECHNICAL_SPECIFICATION.md` and `docs/DECISIONS.md` | English-only repository artifacts; user-input language support is a separate product contract. |
| Long-horizon strategy | `docs/VIX-CONCEPT.md` | Context only; not implementation authorization. |
| Version and patch identity | `package.json` (`version`, `patch`) | No duplicate version authority. |

### Cycle, product version, and patch identity

A development cycle is named `C<major>` and uses product version `<major>`. Every patch in that cycle uses the same major prefix: `P<major>.<minor>.<fix>`; `package.json` must carry `"version": "<major>"` and `"patch": "<major>.<minor>.<fix>"`. The first patch in a new cycle starts at `.0.1`; each subsequent patch in that cycle increments the final component (`.0.2`, `.0.3`, …). Do not create a different sub-series unless the owner explicitly approves it. Keep `package-lock.json` root version metadata synchronized. Existing historical patch names remain historical; do not rename old evidence. A roadmap feature label must not be confused with a patch-series identifier. The current cycle/patch is taken from `package.json`, never from a stale task note or generated report.

### Version metadata automation (mandatory)

`package.json` is the only editable authority for the **current** product version (`version`) and patch identity (`patch`). `package-lock.json` stores npm root version metadata and must agree, but is not a second authority. After changing the version, run `npm run version:sync` to synchronize only the root version fields in the lockfile; run `npm run version:check` before delivery. The C121 governance test invokes this check in CI. Never embed the current patch number as a fixed expected string in tests; derive it from `package.json` and assert the required format/invariants. Never automatically replace version numbers in historical documentation, prior evidence, release notes, schema versions, dependency versions, or generated files. Use npm's normal lockfile tooling for dependency changes; this synchronization script is limited to root version metadata.

If sources conflict, the authority in this table wins. Historical statements in roadmap, report, changelog, and evaluation records describe the state or plan at the time; they are not current instructions if superseded by the current normative sections above them.

`PATCH_EVIDENCE.md` / `BIForge-PATCH-EVIDENCE.md` are generated CI diagnostic reports for a particular run only. They are not planning documents, not persistent session handoffs, and not sources of product requirements. The repository must not contain a root `NEXT_PATCH.md` or any equivalent pre-written assignment for the next session.

## 3. Obligation map — outcomes that must never be silently lost

This is the top-level obligation map. Detailed, testable normative requirements and their stable `REQ-*` identifiers live in `TECHNICAL_SPECIFICATION.md`; this map does not duplicate their detailed acceptance criteria.

| Obligation ID | Mandatory obligation | Canonical detail | Evidence needed before claiming completion |
|---|---|---|---|
| `BIO-001` | Exactly three user-facing agents: Conversational, Expert, Architect. | `TECHNICAL_SPECIFICATION.md` §§6.1–6.4; `REQ-AGENT-001` | Actual user-facing entry points and representative scenarios. |
| `BIO-002` | Conversational answers the user’s real question, preserves relevant context, and uses current information when required. | `TECHNICAL_SPECIFICATION.md` §6.1 | Realistic conversation scenarios; current-information claims checked when applicable. |
| `BIO-003` | Expert investigates complex questions, compares alternatives against constraints, explains trade-offs, and provides a justified decision or actionable plan. | `TECHNICAL_SPECIFICATION.md` §6.2 | Multi-turn realistic problem-solving scenario and evaluation of its final answer. |
| `BIO-004` | Architect is one agent, one state machine, one user flow, and one completion contract; no novice/professional mode choice or switch. | Current normative contract; `TECHNICAL_SPECIFICATION.md` §§6.3–6.4; `REQ-AGENT-002`; `docs/DECISIONS.md` | UI/state/API inspection plus an end-to-end user scenario; stubs alone are insufficient. |
| `BIO-005` | Architect produces a useful, validated downloadable artifact when successful and truthful SUCCESS/PARTIAL/FAILED outcomes otherwise. | `TECHNICAL_SPECIFICATION.md` §§7.1, 10.2; `REQ-GEN-001`, `REQ-GEN-002`, `REQ-UI-001`; `docs/DATA_AND_ARTIFACTS.md` | Inspect the real artifact, validators, download path, status semantics, and failure/recovery behavior. |
| `BIO-006` | User outcomes are the primary acceptance target; code presence, unit tests, CI, deployment health, and user value are reported separately. | Current normative acceptance hierarchy; `REQ-TEST-001`; `docs/TESTING_AND_ACCEPTANCE.md` | Evidence tied to the exact commit/build and clearly labeled by evidence type. |
| `BIO-007` | Every mandatory requirement remains traceable through plan, implementation status, acceptance criteria, and evidence; no requirement is silently dropped. | Normative requirements in `TECHNICAL_SPECIFICATION.md`; stages/dependencies in `ROADMAP.md` | Session audit finds no unexplained orphan requirement, stage, or missing acceptance/evidence link. |
| `BIO-008` | Completed stages and historical evidence are preserved; new status is added without rewriting the past. | `ROADMAP.md`, `TECHNICAL_REPORT.md`, `CHANGELOG.md`, `docs/USER_VALUE_EVALUATION.md` | Diff confirms old historical records remain; new records are additive. |
| `BIO-009` | Every session independently reconstructs project state and chooses its own justified task; no prior assistant can bind the next session to an unverified plan. | This protocol in `AGENTS.md`; priorities and dependencies in `ROADMAP.md` | Session task is explicitly derived from current findings and current obligation gaps. |

If a session discovers an obligation that is absent from the normative specification, do not silently add or discard it. Determine whether it is already implied by an approved requirement; otherwise present the proposed change to the owner for approval. Once approved, add it to the normative spec with a stable identifier and connect it to the roadmap and acceptance evidence.

## 4. Mandatory protocol for the beginning of every session

**Do not start by executing an assignment left by the previous assistant. Start by understanding the current repository and then formulate a task for this session.** A prior task description or summary is a clue, not an authority.

### Phase A — Establish the actual working state

1. Read this file completely.
2. Read the current normative contract at the top of `TECHNICAL_SPECIFICATION.md`.
3. Read the current control section at the top of `ROADMAP.md`, then inspect relevant completed and active phases without deleting history.
4. Read the current evidence note at the top of `TECHNICAL_REPORT.md`, the latest `CHANGELOG.md` entry, and relevant sections of `docs/USER_VALUE_EVALUATION.md`.
5. Read relevant specialist documents, schemas, tests, workflows, and implementation code. Use repository search to find active references to any document or contract being changed.
6. Inspect actual repository state (`git status`, current commit/log where available, changed files, dependency/install state). If Git metadata, remote state, hosted CI results, deployment access, or previous evidence is unavailable, state that limitation; do not infer it.

### Phase B — Reconstruct obligations and evidence

7. Identify the mandatory requirements relevant to the area of work and keep their stable IDs. For each, distinguish: `IMPLEMENTED`, `PARTIAL`, `OPEN`, `BLOCKED`, or `NOT_VERIFIED`.
8. Trace each relevant requirement to its roadmap stage/dependencies, implementation, tests, and required real-user evidence. Look for orphaned obligations, plan items with no user outcome, untested acceptance criteria, and claims that rely only on mocks or green CI.
9. Re-check important claims from prior sessions against available source and evidence. Reuse verified evidence; do not accept a previous assistant’s conclusion merely because it is documented. Do not repeat expensive or live checks without need or authorization.
10. Preserve uncertainty explicitly. A missing result is `NOT_RUN`/`NOT_VERIFIED`, never PASS. Separate local checks, hosted CI, deployed/live behavior, and user-outcome evidence.

### Mandatory descending priority cascade

When choosing independent development work, apply this order (highest first):

| Priority | Category | Selection rule |
|---|---|---|
| **P0** | Critical defects | Restore a broken product, primary agent, essential user outcome, data integrity, or security. |
| **P1** | Mandatory functionality | Complete missing, unfinished, or nonfunctional approved product features. |
| **P2** | Major functional defects | Correct materially wrong, unreliable, or incomplete behavior of existing features. |
| **P3** | Real user-value validation | Verify actual tasks, model behavior, outputs, and generated artifacts beyond mocked tests. |
| **P4** | Additional tests and reliability | Improve regression coverage, CI, diagnostics, and resilience beyond checks required for the current change. |
| **P5** | Usability and interface | Improve UX, clarity, accessibility, and remove unnecessary interactions. |
| **P6** | Technical refinement | Refactor, optimize, tidy documentation, and reduce nonblocking technical debt. |

Apply the cascade strictly: do not choose lower-priority polishing, documentation, or test-only work while actionable higher-priority product defects or required features remain. Within the same level, prefer greater user impact, severity, breadth, and dependency-unblocking value. A lower-level prerequisite may be done first **only** when demonstrably necessary to deliver a higher-priority obligation; state that dependency and keep the scope minimal. If higher-priority work is blocked, record why and select the highest available unblocked task without marking the blocked work complete. Mandatory tests, security checks, and acceptance evidence accompany **every** change regardless of priority; P4 concerns *additional standalone* test/reliability initiatives, not permission to skip verification. A green CI never substitutes for a working feature or a real user outcome. These priority labels are task-severity levels, **not** BiForge patch identifiers (`P121.0.3`, etc.).

### Phase C — Choose and define this session’s task

11. Decide the most important next work using the mandatory descending priority cascade above, actual findings, mandatory obligations, dependencies, user impact, risk, and cost of delay. `ROADMAP.md` informs this decision but is not a substitute for re-evaluation. Do not select work merely because it is easy, test-focused, or mentioned by the previous assistant.
12. Prefer work that closes a concrete user-outcome gap or unblocks such work. If prerequisite engineering is necessary, state which approved user requirement it enables and how completion will be demonstrated.
13. Before editing, formulate a session task for the current work (it may be a temporary plan in the response or working notes; do not create or commit a permanent next-session assignment). It must state:
    - observed problem and evidence/provenance;
    - linked obligation and requirement IDs;
    - expected observable user outcome;
    - scope and explicit non-goals;
    - dependencies and risks;
    - acceptance criteria and realistic evaluation scenario;
    - technical checks and separate live/user-value evidence required;
    - what will remain incomplete if this task succeeds.
14. If the best task requires changing product goals, mandatory requirements, security posture, public data behavior, production state, or another owner-controlled decision, stop and ask for explicit approval before making that change. You may propose the change but must not smuggle it in as implementation detail.

### Phase D — Implement, verify, and leave the repository ready for a fresh analysis

15. Implement only the approved/current-session scope. If new evidence materially changes priorities, pause, explain the change, and re-scope rather than silently drifting.
16. Run relevant checks that are actually available. Record exact commands and results. Do not claim tests, browser checks, live generation, deployment, or hosted CI that were not run.
17. Evaluate the user-visible result against the accepted criteria. When live evaluation is unavailable, mark it NOT_RUN and do not promote technical success into user-value success.
18. Update `ROADMAP.md` with additive status changes while retaining completed phases and their original history. Add a factual record at the top of `TECHNICAL_REPORT.md`, a patch entry at the top of `CHANGELOG.md`, and user-outcome evidence only when such evidence was actually collected.
19. Update specifications or decisions only when a requirement/decision is approved to change. Do not rewrite normative meaning to make the implementation or current tests look compliant. Keep one active authority per topic and repair active references/tests/scripts when documents are retired.
20. Do **not** choose or prescribe the next session’s task. Leave a truthful status of completed work, checks, unresolved obligations, blockers, and evidence gaps. The next session must repeat this protocol and independently select its task.

## 5. Change control and history

- No assistant may silently change the purpose or authority of a canonical document. Proposed changes to this governance protocol or normative product contract require explicit owner approval.
- Do not create a replacement “next step”, “next patch”, or handoff document to be followed blindly by the next session. A concise factual report of current state is appropriate; a directive about what the next session must do is not.
- Preserve completed roadmap stages and prior evidence. Add current status at the top or in the relevant current section; do not delete completed stages or rewrite historical records for tidiness. This preservation rule applies to historical records and factual summaries, not to obsolete executable test code, fixtures, or temporary artifacts.
- When a document is retired, transfer its still-current rules and requirements to their canonical owners, repair active code/test/workflow references, and then remove the obsolete document. Historical mentions can remain if clearly historical and not treated as instructions.
- Make the smallest change that closes an identified user-value gap or improves correctness, safety, or evidence integrity. If the repository state is insufficient to choose responsibly, explain the uncertainty and ask for the missing input.

## 6. Repository minimalism and test lifecycle

- Every maintained repository file must serve a current development, build, verification, security, operational, or product-documentation purpose. Historical existence is not a reason to retain it.
- Every test must protect a current requirement, a meaningful user scenario, a supported data/API contract, or a material regression risk that is not adequately covered elsewhere. A test does not earn permanent retention merely because it once found a bug or belongs to an old cycle.
- At each relevant audit, classify stale tests, fixtures, experimental prompts, one-off diagnostics, superseded plans, unused code, and duplicate coverage as **keep, update, merge, archive outside the repository, or delete**. Treat historical records separately from the test implementations and temporary data that produced them.
- Before deleting, check current references, package scripts, CI/workflow usage, unique coverage, compatibility obligations, and whether the behavior remains required. Remove redundant tests only after confirming that their meaningful coverage is preserved or no longer required.
- Keep a regression test when it protects an important behavior or plausible recurrence that is not otherwise covered; prefer a small test of the current contract over preserving an entire historical experiment.
- Preserve useful historical information in its designated historical record (for example, completed roadmap entries, changelog entries, factual reports, decisions, and concise test outcome summaries). Do not delete or rewrite that record merely because the underlying test or experiment has ended.
- Remove obsolete test implementations, test-only fixtures, one-off scripts, and temporary experiment payloads when they no longer protect a current requirement and have no active dependency. Keep only a concise record that the test/experiment ran and what its evidence established when that fact matters; the full old inputs and implementation need not remain in the active repository.
- Move a payload outside the repository only when it has a concrete future use, reproducibility requirement, or audit obligation. Do not archive everything by default. Git history is available for repository changes but is not a substitute for required product-data backups.
- Keep canonical current documentation concise and actionable. Preserve historical evidence only where it is needed for auditability or an explicit obligation; clearly separate it from current instructions. Do not delete binding requirements or user-value evidence merely to reduce file count.

## 7. Language policy and language-neutral implementation

- Repository-maintained code, comments, identifiers, tests, fixtures, prompts, technical documentation, scripts, and developer-facing messages use English only. Historical records may be translated only when doing so preserves their evidentiary meaning; do not rewrite history silently.
- Do not implement language detection or intent recognition by depending on a small list of natural-language marker words in one or two languages when a language-neutral structured contract, explicit schema, or model-based classification can meet the requirement.
- The repository language policy does not itself define which languages end users may submit or receive. Preserve existing supported input/output behavior unless the owner explicitly changes the product language contract.
- Any language cleanup must classify findings as (a) documentation/comment residue, (b) test data, (c) runtime behavior, or (d) generated/historical content. Translate tests to semantically equivalent English cases where appropriate, and replace brittle runtime heuristics only with behaviorally equivalent logic plus regression tests. Do not claim multilingual support or language neutrality without representative behavioral evidence.
- Treat repository-wide language cleanup as a recurring cross-cutting stage in the roadmap. Re-scan after substantive changes and report residuals, exclusions, and verification limits.

## 8. Security, authorization, and evidence integrity

- Never commit credentials, tokens, cookies, private keys, or secret environment values.
- Keep authentication enabled unless the owner explicitly authorizes a security change. A public URL is not private even if intended for one user.
- Production deployment, repository writes, billing actions, destructive data operations, and execution of generated code require explicit owner authorization.
- Do not disable safety gates or weaken acceptance checks merely to turn CI green.
- Mocked/stubbed tests prove only the mocked contract. Source inspection proves only source structure. Hosted CI proves only the checks actually run on its commit. A real user outcome requires appropriate user-level evidence.

## 7. Patch delivery and reporting

**Strict patch-archive rule (mandatory):** a delivered patch ZIP contains only complete repository files that are new or changed, stored at their exact repository-relative paths. No auxiliary files are allowed in the ZIP: no README or application instructions, manifests, checksums, patch/apply scripts, reports, summaries, test logs, screenshots, or other delivery helpers. All instructions for applying the patch, deleting paths, and interpreting verification results must be written in the chat, never added to the archive. Do not include unchanged repository files. If a patch requires deleting repository files, list those paths in chat; do not add deletion lists or placeholder files to the ZIP. Before delivery, inspect the ZIP listing and verify every entry is an intended repository file that must be added or replaced.

When a patch is requested, deliver complete replacement files in a ZIP and list deleted paths in the chat. State exactly which checks ran and their outcomes. For documentation-only changes, run documentation integrity checks and relevant focused tests. Mark product tests, browser tests, live runs, and hosted CI as `NOT_RUN` when not performed. Never infer remote repository state from a reconstructed local archive.

When a patch is requested, deliver complete replacement files in a ZIP and list deleted paths in the chat. State exactly which checks ran and their outcomes. For documentation-only changes, run documentation integrity checks and relevant focused tests. Mark product tests, browser tests, live runs, and hosted CI as `NOT_RUN` when not performed. Never infer remote repository state from a reconstructed local archive.
