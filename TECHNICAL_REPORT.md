# BiForge Technical Report

**Document ID:** BF-TECH-REPORT-001  
**Status:** Current user-outcome audit plus historical implementation reconstruction  
**Current audit date:** 2026-10-30  
**Authority:** Current source tree and available patch/evidence records; owner-supplied CI outcomes are identified as owner-supplied  
**Principle:** Product value is established by useful, truthful user-visible outcomes. Source presence, green CI, deterministic browser fixtures, and live production behavior are distinct evidence classes.

## Current product-value assessment (authoritative current section)

This section supersedes any older forward-looking recommendation elsewhere in the historical record where the two conflict. Sections 1–6 below preserve observations from earlier archive tips; they are not a description of today's complete implementation unless explicitly rechecked in this section.

### Current target product

BiForge has exactly three user-facing agents:

- **Conversational:** answers the user's actual question, preserves relevant context, uses current evidence when freshness matters, and states uncertainty or tool failure honestly.
- **Expert:** investigates complex problems, distinguishes facts from hypotheses, compares meaningful alternatives, synthesizes a reasoned recommendation, and leaves an actionable plan.
- **Architect:** uses one user-facing mode and one workflow to turn a software goal into a real project, validate it, and provide an accessible verified ZIP—or give a truthful stage-specific failure and recovery action.

A simplified explanation or advanced control may exist inside Architect's one workflow. Separate novice/professional paths, a mode chooser, and different completion contracts are not part of the target product.

### Current evidence matrix

| Area | Current evidence available | What that evidence proves | What it does not prove | Status |
|---|---|---|---|---|
| Conversational | Historical P117.3 live retest recorded 12 PASS, 3 PARTIAL, 0 FAIL across 15 scored cases (80% PASS); P120 two-turn browser test uses a deterministic fixture | Earlier response baseline existed; browser flow and context wiring can be exercised | Current deployed answer quality, freshness, and tool-recovery quality | **PARTIAL — retest current deployment** |
| Expert | P120 browser test covers deterministic provider failure, retry, answer, and follow-up; owner reports CI green | Tested retry/UI path works for the tested fixture on the reported commit | Full multi-turn investigation quality, alternatives, synthesis, plan quality, or current live-provider behavior | **PARTIAL — real task evaluation required** |
| Architect artifact delivery | Historical P118 live evidence recorded SUCCESS, seven validators, three expected files, HTTP 200 ZIP, `zipOk: true`; P120 browser E2E downloads and inspects a deterministic fixture ZIP | A staged live run previously produced a verified ZIP; browser download/validation path can be exercised with a fixture | Arbitrary task quality, current deployed generation, generated program build/runtime, or a unified single-mode workflow | **PARTIAL — target workflow not implemented** |
| Architect mode contract | Checked source contains `ProjectPathChooser`, “Simple words” and “Professional” cards, `builderPath`, and separate novice/professional branches | Two selectable Architect paths remain in the inspected tree | Whether a newer remote branch has removed them; no remote tree was independently inspected | **FAIL in inspected tree** |
| P120 CI/evidence | Navigator supplied both P120 evidence reports as PASS for `d411b982186276708d31173f62b574aed19ebd63`; required listed checks reported success | Those named technical checks passed for that exact commit according to supplied evidence | Product-level value, current documentation patch checks, or real generation quality not covered by those checks | **PASS for supplied technical gate only** |

### Audit findings and decisions

1. **The primary programme-completion criterion was misapplied.** P120 primarily strengthened deterministic E2E, CI and commit-bound evidence. Those are necessary engineering controls, not proof that users consistently receive the intended value.
2. **Architect's target contract is not implemented in the inspected tree.** The source has a mode chooser and distinct novice/professional branches. Removing only the visible cards is insufficient; the target requires one workflow state machine and one completion contract.
3. **The existing Architect browser E2E is narrower than a real product test.** Its API/build result is fixture-driven. It proves browser delivery of the fixture archive and validator behavior, not model-generated software quality.
4. **Conversational and Expert remain incompletely evaluated as user outcomes.** Existing test evidence covers selected UI and retry behavior; it does not replace a current live-task quality evaluation against their contracts.
5. **Documentation drift contributed to the miss.** Older records explicitly retained simplified/professional interaction profiles, while the normative product target requires one Architect mode. Those older statements are now historical only and must not direct implementation.
6. **The current work order is therefore:** (a) align all normative documents; (b) implement one Architect workflow; (c) evaluate real Conversational and Expert tasks; (d) close the programme only against the final user-value gate in `ROADMAP.md`.

### Limits of this audit

- The code inspection used `/mnt/data/work120/bf-main`, reconstructed from available archives, with the P120.0.7 handoff files overlaid. It is not a direct inspection of the current remote branch or deployed app.
- The PASS evidence for P120 was supplied by the Navigator and is not independently re-run here.
- No live model/provider call, deployed UI session, real user-generated artifact, or full CI run was performed as part of this documentation audit.
- Therefore this patch makes no claim that the target Architect has already been implemented or that the three agents pass the final product-value gate.

---

## 1. Early Foundation Snapshots (bf-01 … bf-09 / v14-main)

**First observed:** Lowest-numbered directories in the archive (bf-01, bf-1-0/v14-main, bf-1-6, bf-06, bf-09).

**Problem addressed:** Establish a working TypeScript + React + Express application with basic conversation capability, document handling and early project concepts.

**Specified behaviour:** Minimal runnable product; early CHANGELOG_AGENT_BEHAVIOR.md and README describe agent behaviour and Railway deployment.

**Components / files:**

- `server.ts` (monolithic in early versions)
- `src/App.tsx`, early CSS
- `package.json`, Vite/React scaffolding
- Early `server/documents.ts`, `reasoningState.ts`, `security.ts`
- Scripts for acceptance and prompt measurement

**Actually implemented:** Functional client-server chat surface; basic security; document generation primitives; early state tracking.

**Tests / checks:** Early acceptance scripts (`acceptance-s2-05.mjs` etc.), regression fixtures.

**Results:** Local runs possible; Railway deployment notes present.

**Defects:** Fragmented documentation; multiple competing sources of truth later consolidated.

**Open questions:** Exact commit dates unavailable (ZIP timestamps are archive creation); behavioural completeness of earliest agents not fully reconstructible from remaining artefacts.

**Confidence:** Medium for structure; low for precise behavioural contracts. Artefacts: package.json, early CHANGELOG_AGENT_BEHAVIOR.md, README, server modules.

---

## 2. Project Mode and Persistence Expansion (bf-16 … bf-26)

**First observed:** bf-16, bf-17, bf-20, bf-24, bf-26.

**Problem addressed:** Durable project state, richer orchestration, Drive integration, expanded agent behaviour logging.

**Specified behaviour:** Project state machines, file handling, history panels, offline indicators, Drive sync/merge/export.

**Components:**

- Expanded `src/ProjectMode.tsx`, `ConversationFiles.tsx`, `driveClient.ts`, `driveSync.ts`, `driveMerge.ts`, `driveExport.ts`
- `server/database.ts`, early migrations
- `AGENTS.md` (early form), larger CHANGELOG.md / CHANGELOG_AGENT_BEHAVIOR.md
- ARCHIVE/ directory with P08–P17 SPEC and REPORT documents

**Actually implemented:** PostgreSQL-backed project state; client-side Drive integration; richer UI panels; acceptance of multiple early patches (P08–P17 lineage visible in ARCHIVE).

**Tests:** Expanding test directories; golden-eval notes.

**Results:** Local and some hosted checks; Drive QA checklists present.

**Defects:** Competing documentation (later removed); production diagnostics incomplete (later frozen as P92).

**Open questions:** Which exact P-numbers map to which bf-NN snapshot; live Drive behaviour in production not fully evidenced.

**Confidence:** Medium-high for code presence; medium for live outcomes. Artefacts: ARCHIVE/*.md, expanded src/, migrations beginnings.

---

## 3. AI-Native Renovation Foundations (P106–P112, visible in later snapshots)

**First observed clearly:** bf-93, bf-104, bf-112 and documentation in bf-118.

**Problem addressed:** Lack of machine-verifiable evidence, weak fail-closed behaviour, missing capability/intent contracts, high context cost for AI sessions.

**Specified behaviour (from schemas and task docs):**

- Evidence Records, verification DAG, independent checks always complete.
- Bounded repair with protected paths and limits.
- Intent-policy contracts, capability graph, context selection.
- Schema validation, architecture boundary enforcement.

**Components:**

- `docs/schema-*.json` (common, evidence-record, handoff, intent-policy, verification-plan, …)
- `scripts/schemaValidate.mjs`, `run-dag.mjs`, architecture generators
- `docs/verification-manifest.json`, generated inventories
- Fault-injection and repair test suites

**Actually implemented:** Full set of schemas and validators; DAG runner with BLOCKED semantics; CI two-artefact handoff; architecture checks.

**Tests:** `test:compact-ci-artifacts`, schema-validate, dag, intent-contract, capability-graph, context-select, fault-injection tests.

**Results:** Phase 1 (P106) and Phase 2 (P109) closed with Navigator acceptance recorded in AGENTS.md. CI green for those commits.

**Defects:** Hosted CI status is commit-specific; later patches can re-break.

**Open questions:** Exact production runtime of evidence collection under load.

**Confidence:** High. Artefacts: schemas, scripts, AGENTS.md status section, test files, generated JSON inventories.

---

## 4. Conversational Agent Recovery (P116)

**First observed:** Documented as accepted 2026-10-28 in AGENTS.md and roadmap of bf-118.

**Problem addressed:** Simple/Expert conversation modes producing generic or stalled answers.

**Specified behaviour:** Useful multi-turn conversation comparable to a capable general-purpose chat; truthful failure signalling.

**Components:** conversationMode.ts, cascade foundations, prompt adjustments, residual Node LTS version reporting.

**Actually implemented:** Recovered conversation path with 80 % live PASS; residual B3 (Node LTS number) left open.

**Tests / checks:** Live scenarios; related unit tests later stabilised under P117.3.

**Results:** Navigator acceptance recorded; residual documented.

**Defects:** B3 remains; full isolation of Conversational from Expert shared orchestration deferred to P119.

**Open questions:** Exact live transcript set used for the 80 % figure not present in the archive.

**Confidence:** High for acceptance decision; medium for quantitative live metrics. Artefacts: AGENTS.md, AI-USER-VALUE-REPORT.md references, roadmap.

---

## 5. Expert Foundations and Cascade (P117.x)

**First observed:** P117 line closed for conversation recovery (P117.3) in bf-118 documentation.

**Problem addressed:** Need for progressive multi-step reasoning distinct from pure conversation; model availability and cascade.

**Specified behaviour:** Expert owns its cascade, tools, state machine and output contract; probes for optional models; opt-in external providers.

**Components:** modelAvailability, modelHealth, cascade ordering (gemini-3.5-flash-lite → gemini-3.1-flash-lite primary), probe logic, conversation recovery tests.

**Actually implemented:** Cascade foundations and availability probes; full Expert E2E left open.

**Tests:** `tests/model-availability-p117.test.mjs`, `tests/p117-3-conversation.test.mjs`, model cascade tests.

**Results:** P117.3 closed; conversation recovery stable.

**Defects:** Full Expert end-to-end scenarios still open under later slices.

**Open questions:** Live quality of Expert progressive reasoning under real user load.

**Confidence:** High for code and unit tests; medium for product-level Expert outcomes. Artefacts: test files, CHANGELOG, roadmap.

---

## 6. Complex Software Architect Agent (P118 line)

### 6.1 P118 / P118.2 — Contract and live workflow

**First observed:** bf-118 CHANGELOG and task document.

**Problem addressed:** Architect path previously failed with `invalid_spec`, zero files, single model call.

**Specified behaviour:** Completion contract; live workflow `p118-architect-live`; evidence enrichment; CSRF runner fix.

**Components:** appBuilder core, appBuilderAdapter, pipeline, live test harness.

**Actually implemented:** Contract and workflow harness; early live runs still HONEST_NON_PASS on old engine.

**Tests:** `tests/p118-architect-live.test.mjs`, architect-outcome tests.

**Results:** Live runs #1 BLOCKED (CSRF, fixed); later runs HONEST_NON_PASS with diagnostics.

**Defects:** Old engine still in some deployed commits; ZIP stage never reached live.

**Open questions:** Exact model responses of the earliest failing runs.

**Confidence:** High. Artefacts: CHANGELOG entries, task document, test files.

### 6.2 P118.3 — Spec bounded repair

**First observed:** CHANGELOG P118.3 on bf-118.

**Problem addressed:** Planner returned parseable JSON that failed Spec validation; recovery ran only on unparseable input.

**Specified behaviour:** Explicit schemaVersion, lenient parse, validateSpec with issue list, one recovery call carrying previous issues, concrete failureReason / error.detail, diagnostic events with previews.

**Components:** `appBuilder/core-engine.ts`, adapter logging, new test `tests/app-builder-spec-repair-p118.test.mjs`.

**Actually implemented:** As specified; APP_VERSION remains 118.

**Tests:** Spec-repair suite.

**Results:** Local tests green; commit `1a98a6a` red in hosted CI (version + type errors).

**Defects:** CI red (repaired in next sub-patch).

**Confidence:** High. Artefacts: CHANGELOG, test file, engine source.

### 6.3 P118.3.1 — CI repair

**Problem addressed:** Red CI on version-consistency, typecheck, build, compact-ci-artifacts.

**Specified / implemented:** Restore version to 118; fix TypeScript narrowing under `strict:false` by reading failure fields via `'error' in x` / `'issues' in x`. No Spec-repair behaviour change.

**Results:** Local DAG 23 PASS / 3 BLOCKED (DB). Hosted CI of the repair itself not recorded in the examined artefacts.

**Confidence:** High for local; medium for hosted. Artefacts: CHANGELOG.

### 6.4 P118.3.2 — Single version source + documentation audit

**Problem addressed:** Multiple version sources; documentation sprawl.

**Specified / implemented:** `package.json` sole source (`version` + `patch`); Vite plugin injects into client; check-version and patch-tools updated; AGENTS.md, operating rules, task, roadmap, report, environment context audited and consolidated.

**Results:** Local verification green; no product behaviour change.

**Confidence:** High. Artefacts: package.json, CHANGELOG, AGENTS.md, docs/*.

### 6.5 P118.3.3 — Code-stage file marker repair (current tip of archive)

**First observed:** Top of CHANGELOG.md and NEXT_PATCH.md in bf-118.

**Problem addressed:** Live run on `9ff44ac` passed Spec and Plan; unit `index.html` failed because the model emitted `<<<FILE path>>>index.html` (copied placeholder). Parser treated `path` as the filename.

**Specified behaviour:**

- Prompt names the real header; PROMPT_VERSION → `static_site.v2` (cache invalidation).
- Parser deterministically accepts three known slips for the expected path and records them in `coerced`.
- One bounded repair call per file (budget counted; skipped on cancel or exhausted budget).
- New events `unit_attempt` / `unit_repair`.
- Precise failure reason.
- Adapter no longer drops `unitId` from log details.

**Components:** `appBuilder/core-prompts.ts`, `core-markers.ts`, `core-engine.ts`, `server/appBuilderAdapter.ts`, new test suite (7 tests, mutation-checked).

**Actually implemented:** As described in CHANGELOG.

**Tests:** `tests/app-builder-unit-repair-p118.test.mjs`; `test:app-builder` updated.

**Results:** Local tests written and (per CHANGELOG) mutation-checked. Live evaluation of the repair, remaining units, validators and ZIP packing **NOT_RUN / NOT_EVALUATED**.

**Defects remaining:** ZIP packing and full live SUCCESS never observed in the archive; hosted CI of 118.3.3 itself not recorded here.

**Open questions:** Whether the three coercion rules cover all future model slips; whether one repair call is sufficient under real model variance; production ZIP integrity under load.

**Confidence:** High for the implemented repair and unit tests; low for end-to-end live Architect SUCCESS. Artefacts: CHANGELOG P118.3.3, NEXT_PATCH.md, core-*.ts sources, test file.

---

## 7. Cross-Cutting Observations

### 7.1 Source code vs CI vs live

- Many patches show green local DAG while hosted CI or live workflows lag or remain NOT_RUN.
- Evidence rule in AGENTS.md is strict: green CI of an earlier commit does not speak for a later one; NOT_RUN is never PASS.

### 7.2 Documentation discipline

- Transition from many competing SPECs/REPORTs (ARCHIVE/) to single rolling files (task, roadmap, report, operating rules) is complete in bf-118.
- Charter (AGENTS.md) is treated as immutable except by explicit Navigator instruction.

### 7.3 Three-agent target (historical archive view; superseded as current status by the audit at the top)

- The target contract is explicitly restated at the top of this report and in `docs/AI-USER-VALUE-SPEC.md`.
- The earlier archive view predates later P119/P120 work and must not be used as the current status.
- The checked P120-era source exposes three top-level agent names, but Architect still has two selectable submodes. That is a current target-contract violation, not an acceptable transitional target.
- P120 deterministic UI/E2E coverage and supplied CI evidence do not prove current live response quality or model-generated software quality. See the current evidence matrix above.

### 7.4 Security and Tier 3

- Production deployment, secrets, GitHub write remain Navigator-gated.
- No evidence of Tier 3 actions being performed autonomously in the examined history.

---

## 8. Summary of Confidence by Historical Archive Phase (not current product acceptance)

| Phase              | Code presence | Local tests | Hosted CI | Live product outcome | Overall confidence |
|--------------------|---------------|-------------|-----------|----------------------|--------------------|
| Foundations P106–P109 | High         | High        | High (at closure) | N/A                 | High              |
| P116 Conversational | High         | High        | Medium    | High (accepted)     | High              |
| P117 Expert        | High         | High        | Medium    | Medium (foundations)| Medium-High       |
| P118 Architect     | High         | High (unit) | Partial   | Low at the P118.3.3 archive tip | Medium |
| Later P119/P120 work | Not represented in this archive tip | N/A | N/A | N/A | This historical table does not assess current product value |

---

## 9. Remaining Open Items at Historical Archive Tip (P118.3.3; superseded by current audit for present-day status)

1. Hosted CI green confirmation for the 118.3.3 commit.
2. Deploy + `/health` commit match.
3. Single live `p118-architect-live` dispatch after the marker repair.
4. Recording of the live result (stage reached, diagnostics, presence/absence of ZIP).
5. Navigator decision on P118 exit gate.
6. Residual B3 (Node LTS) still open.
7. P92 production diagnostics verification still frozen.

This historical subsection is reconstructed solely from artefacts present in the old archive. Its statements about what was not yet run are true only for that archive tip. Current evidence and open product-value gaps are stated in the authoritative audit at the top of this file.
