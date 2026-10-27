# AI-NATIVE-RENOVATION — Active task (P114)

**Task IDs:** P114 current; P113 accepted target contract; P112, P111, P110 closed as foundation patches.  
**Status:** source/log audit delivered. Live end-to-end reproduction of all four reported workflows is NOT_RUN / NOT_REPRODUCED; this is not product acceptance.  
**Authority:** `AGENTS.md` Navigator Charter. Canonical target: `docs/AI-USER-VALUE-ARCHITECTURE-P113.md`; audit: `docs/AI-USER-VALUE-AUDIT-P114.md`.  
**Fresh-session rule:** read sections 1–2 and current P114 section here, then the P113 target contract and P114 audit. Never infer product acceptance from hosted CI status.

| Patch | Outcome | Status |
|---|---|---|
| P104–P106 | Documentation consolidation, schemas, evidence, CI gate | closed |
| P107–P108.3-HF1 | Verification DAG, bounded repair, diagnostics/handoff | closed |
| P109 | Phase 2 closure and audit | closed |
| P110 | Intent/Policy Contract | closed foundation |
| P111 | Capability/impact graph | closed foundation |
| P112 | Context selection and impact planning | closed foundation |
| P113 | User-outcome contract and three-agent target | accepted; specification only |
| **P114** | **User-outcome source/log audit and root-cause map** | **current; audit/control artifacts only** |

## Current patch — P114: User-outcome audit and root-cause map

**Goal.** Trace the four current user workflows and shared runtime from user action through final visible answer/artifact. Distinguish observed facts from user-reported symptoms and unproven causal hypotheses. Rank work by user harm, confidence and expected leverage.

**Delivered:**
- `docs/AI-USER-VALUE-AUDIT-P114.md` with source/log evidence and ranked findings;
- confirmed one production App Builder failure (`invalid_spec`, zero files, ~73 seconds);
- confirmed web search is opt-in and logged requests sometimes skip it;
- traced Simple and Expert to shared conversation prompt/orchestration;
- traced Expert's staged, client-side state design and Project's novice/professional paths and build-engine branches;
- recorded verifier, cancellation, crypto/ZIP, dependency and prompt/latency risks with appropriately limited claims;
- recorded the Navigator's stop rule for patches that improve internal structure without demonstrated user-outcome improvement.

**Limitations:** the supplied archives do not provide an authenticated interactive production session, all original prompts, or credentials for live-provider execution. Therefore the four reported user failures are NOT_REPRODUCED end-to-end in P114. Findings explicitly label what is observed versus hypothesized. No runtime defect has been fixed by this patch.

**Out of scope:** runtime/prompt/provider changes, production actions, mode migration, claiming any mode is repaired, or treating CI green as product acceptance.

**Gate status:** source/log audit delivered; live acceptance remains NOT_RUN. Next patch is P115 Conversational Agent recovery, with explicit user-quality scenarios and controlled comparisons. P116/P117 follow only as bounded patches with user-outcome gates.

**Verification:** audit document/source references and patch/version metadata checked locally. Runtime tests, browser E2E, live-provider tests, full CI and hosted CI: NOT_RUN for P114. Navigator reports the preceding CI green; that does not establish P114 verification.

**Rollback:** revert P114 audit/task/roadmap/index/charter status/changelog/handoff and version metadata as one unit. No runtime state or user data changed.

## 1. Navigator directive

The directive is the **Navigator Charter** at the top of `AGENTS.md` (laws C1–C11, reversal table, conflict rule). It overrides this file.

## 2. Rules for every patch

1. **Baseline.** Record the CI result of the previous patch using the status vocabulary. Navigator confirmed green for the P108.3-HF1 tree.
2. **Bounded.** One patch, one outcome. Stop at its gate; Tier 2/3 items need an explicit Navigator decision. Silence is not consent.
3. **Delivery.** ZIP with changed/new files, separate list of deletions/moves, manifest, exact commands with outcomes, rollback note.
4. **CHANGELOG.** New entry with patch ID, changes, verification, limitations. Code/docs patches that change version keep the `## P<N>` top-entry format that `check-version` requires.
5. **`AGENTS.md`** only for significant changes of how the product or development works.
6. **No weakening.** Tests, gates, security controls and acceptance criteria are never relaxed to get green.
7. **Honest status.** `UNKNOWN`, `NOT_RUN`, `BLOCKED`, `TIMEOUT`, `PARTIAL` are never `PASS`. Implemented ≠ verified in production.

## 3. P112 — Context selection and impact planning (closed foundation)

**Goal.** Bounded context packs and schema-valid Change/Impact Plans from seed paths via the capability graph; unknown/stale context stays explicit.

**Delivered**

* `scripts/contextSelectLib.mjs` — load graph, seed resolution, depth-limited selection, `buildImpactPlan` / `planFromPaths`.
* `scripts/contextSelect.mjs` — CLI (`npm run context:select`); `--json`, `--plan-out`, `--max-depth`; stdin paths.
* Plans validate against `schema-change-impact-plan.json`; missing graph → BLOCKED; unknown seeds/nodes → PARTIAL + risks.
* Tests: `tests/context-select-p112.test.mjs` (6).

**Out of scope.** Full workflow binding of plans into every patch handoff (optional later); verification-plan ↔ intent criticality (P113).

**Gate.** Tests pass; CLI produces schema-valid plan for a real module seed; fail-closed on missing graph.

**Rollback.** Remove lib/CLI/tests; revert npm scripts and version.

## 3b. P111 — Capability / impact graph v1 (closed)

**Goal.** One directed graph linking intent → modules/contracts → state/side-effects → checks → evidence, with unknown and stale context explicit.

**Delivered**

* `scripts/capabilityGraphLib.mjs` + `scripts/capabilityGenerateGraph.mjs`.
* Output `docs/generated-capability-graph.json` (421 nodes / 859 edges on current tree).
* Node statuses: `known` | `unknown` | `stale` (never promoted).
* Wired into `docs:generate` / `docs:check`; tests in `tests/capability-graph-p111.test.mjs`.
* Optional `--intent path` to attach Intent/Policy Contract instances (impacts, invariants).

**Out of scope.** Context packager and impact-plan instances (P112). Runtime behaviour unchanged.

**Gate.** Generator runs; `--check` passes; tests pass; unknown/stale counts reported in summary.

**Rollback.** Remove generator/lib/tests/output; revert `docs:generate` chain and version.

## 3a. P110 — Intent/Policy Contract foundation (closed)

**Goal.** Make approved intent machine-readable and prevent silent promotion of assumptions into policy.

**Delivered**

* `scripts/intentContractLib.mjs`: `buildContract`, `semanticProblems`, `blocksApprovedPolicyClaim`, `gateContract`, `validateFileWithSchema`.
* Semantic rule: items of kind `requirement` / `constraint` / `invariant` must have `source=explicit`. `assumed` or `inferred` on those kinds is a hard problem.
* Policy claim rule: contract `status` in {UNKNOWN, PARTIAL, NOT_RUN} or any `criticality=critical` item with `source` in {unknown, assumed} blocks an approved-policy / release-style claim.
* `tests/intent-contract-p110.test.mjs` (7 tests) covering the above and a full example contract for this patch that validates against `docs/schema-intent-policy-contract.json`.
* `npm run test:intent-contract`; also included in `test:compact-ci-artifacts` together with P108 fault-injection tests.
* Diagnostics: `vite.config.ts` no longer uses `__dirname` (uses `import.meta.url` + `fileURLToPath`), removing the Vite configLoader unsupported-feature warning from every CI build log.

**Out of scope.** Capability graph, context selection, binding contracts into the main change workflow (P111+). No runtime behaviour change.

**Gate.** Tests pass; example instance is schema-valid; semantic gate rejects promotion cases; version 110 consistent.

**Rollback.** Remove the new lib/tests and revert `vite.config.ts` / version / docs entries.

## 4. Navigator decisions recorded in P109 (2026-10-26)


| Decision | Result | Effect |
|---|---|---|
| 1. Phase 2 formal acceptance | Yes | Phase 2 closed; does not block further work |
| 2. P108.3 / CI-artifact contract | Confirmed | Green-run (and prior red-run evidence) accepted; operational gate closed |
| 3. P92 production diagnostics | Freeze until full AI-native renovation completes | Subsequent patches unblocked independently of P92 |
| 4. Scope of P109 | Acceptance audit + status reconciliation + detailed forward plan + minor accumulated clean-ups | Single bounded patch |
| 5. Authorization topics (prod deploy, GitHub write, secrets, billing, privileged execution) | Exclude from critical path; raise only later when needed to improve programme function or strengthen AI-native behaviour, and only after a separate Navigator decision | Not blockers |

Unlocking checklist (all approved):

1. Check existing evidence / tests / CI results without re-running confirmed items — done in audit below.
2. Close missing P108.3 contract checks — contract present in `ci.yml` and `package-ci-artifacts.mjs`; tests cover the two-file shape.
3. Phase 2 audit report with results and remaining risks — this section.
4. Formal Phase 2 acceptance treated as closed — recorded.

## 4. Phase 2 acceptance audit (P109)

### Evidence reviewed (existing; not re-executed)

- **Verification DAG (P107):** `docs/verification-manifest.json`, `scripts/run-dag.mjs`, `scripts/dagLib.mjs`, `tests/dag-p107.test.mjs`. Independent checks finish; dependents receive `BLOCKED` with named prerequisite; cycles and invalid limits rejected at validation.
- **Fault injection (P108):** `scripts/faultInjectionLibP108.mjs`, `tests/fault-injection-p108.test.mjs`. Required modes (timeout, cancellation, missing-log, partial-artifact, runner-interruption, handoff-generator-failure, corrupted-record) produce non-`PASS` status and consistent handoff. Contradictory or absent handoffs rejected.
- **Bounded repair (P108):** `scripts/boundedRepairLibP108.mjs`, `scripts/bounded-repair-p108.mjs`. Attempt plans are bounded and deduplicated; diff guard rejects protected paths (e.g. `.github/workflows/ci.yml`) and lowered limits; attempt records are append-only JSON with provenance. Opt-in only; default CI behaviour unchanged.
- **Evidence & handoff (P105–P106 + P108.2/3):** Evidence Records, fail-closed assessment (`UNVERIFIED` on missing/malformed/contradictory evidence), `ci-evidence-gate.mjs`, always-on packaging, five-cycle history collector, two-artifact outer contract (`BIForge-NEXT-PATCH.md` + `biforge-ci-logs.zip`) enforced in `package-ci-artifacts.mjs` and `ci.yml` upload step (`if-no-files-found: error`). Compact handoff printed to Actions console.
- **CI status:** Navigator reports green. Version consistency, DAG profile `ci`, secret scan, evidence gate, and packaging steps are part of the green run.

### Gate evaluation

| Criterion | Result | Notes |
|---|---|---|
| Independent checks complete despite unrelated failure | PASS (by design + tests) | DAG continues non-dependent work |
| Dependent checks blocked correctly | PASS | Named prerequisite in status |
| Injected faults recover or report honestly | PASS | Non-PASS + consistent handoff enforced by tests |
| Repair cannot weaken verified conditions | PASS | Protected-path and lowered-limit guards; opt-in |
| CI artifact contract (two named files, redaction, history) | PASS (green confirmed) | Red-run packaging previously exercised in HF1 path |
| Fail-closed evidence semantics | PASS | `UNKNOWN`/`NOT_RUN`/`BLOCKED`/… never promoted to `PASS` |

### Remaining risks (accepted; non-blocking)

- P108-vs-P106 wall-clock comparison still `NOT_RUN` (P106 duration unavailable). Ceiling used for next-patch budgeting remains the +15 % rule from the last measured green run.
- Red-run artifact shape is covered by tests and prior HF1 evidence; continuous red-run drills are operational, not a Phase-2 gate.
- P92 production diagnostics remain incomplete (`WARN` / `NOT RUN`). Explicitly frozen; does not block Phase 3.
- Large-file context cost (`server.ts`, `projectRoutes.ts`, `codeTaskService.ts`) is a known C4 candidate; measurement and any split are deferred until after Phase-3 foundation and explicit ND-4 gain evidence.
- Generated inventories and architecture maps must be refreshed after material source changes (`npm run docs:generate`).

### Conclusion

Phase 2 gate is met. Formal acceptance is recorded. Programme advances to Phase 3 foundation work. No further Tier-3 decision is required for ordinary Phase-3 patches that stay inside the existing authorization envelope.

## 5. Forward plan (Phase 3 foundation and beyond)

Phase 3 goal (from roadmap): make approved intent the authoritative control plane for implementation and verification.

### Near-term patch sequence (indicative; each remains one bounded patch)

| ID | Focus | Primary deliverables | Gate / notes |
|---|---|---|---|
| **P110** | Intent/Policy Contract foundation | Machine-readable Intent/Policy Contract instances and validation against `schema-intent-policy-contract.json`; provenance and assumption labelling; first end-to-end use in a narrow change path | Contract cannot silently promote assumptions to approved policy; critical `UNKNOWN` remains blocking |
| **P111** | Capability / impact graph (v1) | Generated graph linking intent → modules/contracts → state/side-effects → invariants → checks → evidence; replace or subsume overlapping static inventories where C4 gain is measurable | Traceability for representative changes; stale/unknown context explicit |
| **P112** | Context selection & impact planning | Context packager that uses the graph; impact plan schema instances; integration with existing handoff | Smaller context than today’s full-tree reads for the same tasks |
| **P113+** | Verification plan binding & release eligibility | Bind verification plans to intent criticality; explicit release/rollback eligibility from evidence | Critical invariant failures or `UNKNOWN` block release eligibility |

Later (only after Phase-3 gate and explicit measurement):

- Narrow VIX vertical slice (transactional or ETL/dataflow domain) — Phase 4.
- Controlled adaptation / safe evolution — Phase 5.
- Optional C4 clean-ups (large-file splits, stable rule IDs) only with measured context-cost reduction.
- P92 unfreeze and production verification — only after the full renovation programme (or a later explicit Navigator decision).

### Standing constraints for all subsequent patches

- One bounded patch at a time; stop at the stated gate.
- Authorization topics (production deploy, GitHub write, secrets, billing, privileged execution of generated code) stay off the critical path until a separate Navigator decision.
- P92 remains frozen; do not schedule production-diagnostics work inside Phase-3 patches.
- Preserve fail-closed evidence semantics and the two-artifact CI handoff.
- Keep documentation English; repository audience is AI assistants (Charter C1, C7).
- Prefer flat `docs/` and `scripts/` trees; no new directory levels without approval.

## 6. Work performed in this patch (P109)

- Recorded Navigator decisions and Phase-2 formal acceptance.
- Updated `AGENTS.md` current-status section (phase, P92 freeze, authorization posture).
- Updated `docs/AI-NATIVE-RENOVATION-ROADMAP.md` (Phase 2 closed, current phase Phase 3 foundation).
- Replaced this task document with the acceptance audit, decision log, and forward plan.
- Bumped product version to 109 (`src/config.ts`, `package.json`).
- Appended CHANGELOG entry.
- Minor status consistency clean-up only; no behavioural change to runtime, DAG, repair, or CI packaging.

**Out of scope / not changed:** application source behaviour, migrations, App Builder runtime, P92 production paths, authorization defaults, generated inventories (refresh on next material code change).

**Verification (local, this patch):** version-consistency check, syntax of edited Markdown, Charter conflict scan. Full `npm run check` / hosted CI remain the post-apply evidence; baseline was already green.

**Rollback:** revert the version bump and the four documentation files; no runtime impact.

## 7. Not authorized by this task

Production deployment, GitHub writes, credential or permission changes, execution of generated code on the host, unfreezing P92, Phase-4/5 VIX implementation, or any waiver of security/evidence gates. Candidate later work remains subject to the forward-plan gates and separate Tier-3 decisions where required.
