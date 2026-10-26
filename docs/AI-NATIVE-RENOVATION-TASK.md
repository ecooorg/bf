# AI-NATIVE-RENOVATION — Task: Phase 2 closure and Phase 3 foundation (P109+)

**Task IDs:** ANR-P109 (this patch); prior ANR-P104 … ANR-P108.3-HF1 delivered and closed.
**Status:** Phase 2 formally accepted and closed by Navigator Tier-3 decisions of 2026-10-26. P109 records the acceptance audit, freezes P92, excludes authorization topics from the critical path, reconciles documentation status, and publishes the forward plan for Phase 3. Hosted CI green; two-artifact CI handoff contract operational.
**Authority:** Navigator Charter in `AGENTS.md`. Normative references: `AI-OPERATING-RULES.md`, `AI-NATIVE-RENOVATION-MANDATE.md`, `AI-NATIVE-RENOVATION-ROADMAP.md`, `AI-NATIVE-GLOBAL-AUDIT-2026-10.md`.
**Reading rule for a fresh session:** read sections 1–2 and the current-patch section (P109). Forward plan is in section 5.

| Patch | Phase | Outcome |
|---|---|---|
| P104 | 0 | Clean documentation set; superseded documents deleted; tests/CI no longer read documentation prose (closed) |
| P105 | 1a | Evidence records, fail-closed assessment, structured handoff (closed) |
| P106 | 1b | Legacy tools retired; CI evidence gate; check graph; Phase 1 gate (closed) |
| P107 | 2a | Verification DAG: independent checks always finish; blocked checks carry reasons (closed) |
| P108 | 2b | Fault injection and bounded repair (closed) |
| P108.1–P108.3-HF1 | 2b ops | Always-on diagnostics, five-cycle history, two-artifact handoff `BIForge-NEXT-PATCH.md` + `biforge-ci-logs.zip` (closed) |
| **P109** | **2 closure / 3 prep** | **Phase 2 formal acceptance, audit report, P92 freeze, status reconciliation, forward plan** |

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

## 3. Navigator decisions recorded in P109 (2026-10-26)

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
