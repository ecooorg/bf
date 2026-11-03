## D-2026-11-03-04 — Universal, cross-domain retrieval and regression criteria

**Owner direction (2026-11-03):** BiForge is a universal agent, not a domain-specialized agent. Search-context recovery and retrieval validation must be domain-neutral. Weather may appear as one regression example but must not dominate the test corpus or dictate architecture.

**Implementation rules:**
1. A recognizable follow-up may inherit context only from the immediately preceding user task when that task represents live/current information or an explicit lookup. An intervening unrelated user turn breaks the carry-over.
2. A deterministic planner fallback must preserve the resolved task and named entities when the planner model is unavailable, without bypassing privacy rules.
3. Retrieved evidence is assessed against the resolved query/topic and named entities. Numeric evidence is required only when the task asks for numeric, temporal, price/rate, measurement or comparable values.
4. Regression tests assert general invariants across unrelated domains, not fixed model wording or a single domain's answers.

**Effect:** P124.35 implements the first slice and records deterministic evidence. Live provider quality and deployed user outcomes remain `NOT_RUN` until verified.

---

# Active Decisions

## D-2026-11-03-03  Gemini keys are ten separate projects of ten scientists

**Fact and rule (owner, 2026-11-03).** The ten `GEMINI_API_KEY` keys belong to ten different Google projects owned by ten different scientists of one organization. The same holds for any key carousel built later for another provider: each key there is a separate project of a different scientist, not several keys of one project.

**Effect:** supersedes the K-1 inference of one shared quota (`docs/WEB_SEARCH_REMEDIATION.md` sections 3, 5, 6); key-pool code makes no shared-quota assumption; usage and privacy consequences are in `docs/SECURITY_AND_PRIVACY.md`.

---

## D-2026-11-03-02 — Locale rule: Switzerland now, never country-bound

**Locale rule (owner, 2026-11-03).** At present the developers and users are in Switzerland and metric units are used (°C, km, kg, CHF unless stated otherwise). The product MUST NOT be tied to Switzerland or to the United States: no country, city, host, currency or unit is hard-coded as a default in code or prompts. The deployment's home country is configuration (`WEB_SEARCH_DEFAULT_COUNTRY`, ISO alpha-2, e.g. `CH`), used only when a request names no place; a place named by the user always wins (country from the search plan / source domain), and units follow the place's country (`unitsForCountry`). Tests and examples must not assume one country.

**Effect:** `AGENTS.md` §1 carries the rule; `docs/WEB_SEARCH_REMEDIATION.md` section 6 decision 8; P124.27 adds `WEB_SEARCH_DEFAULT_COUNTRY` and removes the implicit `us` bias where a deployment default is set (`us` remains only the neutral last resort when nothing is configured).

---

## D-2026-11-03-01 — C124: web-search live-data remediation programme

**Decision (owner-directed, 2026-11-03):**
1. The audit and work programme in `docs/WEB_SEARCH_REMEDIATION.md` are accepted as the owner-approved scope for fixing live-data answers (`BIO-002`). Sessions still reconstruct state and re-evaluate (`AGENTS.md` §4); this decision is not a next-session assignment file.
2. Pipeline is the single production Conversational path. Direct mode is neither removed nor default; its key rotation and Serper-then-Gemini fallback move into the pipeline.
3. A unified Gemini key pool precedes an LLM search planner; deterministic heuristics remain as fallback.
4. Diagnostics export non-secret configuration in full and secrets only as set/length/short fingerprint.
5. No static foreign-place or host lists; country comes from geocoding, source domain, and search-provider country parameters.
6. The Groq verifier becomes opt-in. Weather connectors (Open-Meteo, MET Norway) are non-commercial only, disabled by default, attributed, and labelled as model data. A second SERP provider is configured through `SEARCH_CAROUSEL`; the key lives only in the hosting environment.
7. `TECHNICAL_SPECIFICATION.md` (search opt-in vs default) changes only after separate owner approval.
8. Patch identity: documentation patch P124.22; code packages P124.23–P124.31 (no `.0` patch component).

**Effect:** `ROADMAP.md` carries the work programme; each patch records evidence labels honestly; live acceptance stays `NOT_RUN` until executed.

---

## D-2026-11-01-01 — C124: BiForge as an engineering intermediary, not a substitute LLM

**Decision (owner-directed):**
1. C124 is approved as the active development cycle, titled Instruction Optimization; product version advances to 124.
2. External LLMs provide substantive understanding, reasoning, and answer composition. BiForge provides engineering mediation: request/context transfer, model/tool routing, session integrity, execution/recovery, deterministic validation, and faithful result delivery.
3. Audit every instruction source and output transformation before broad cleanup. Classify each item by engineering control, integrity validation, model-substitution behavior, hard-coded special case, or necessary model communication.
4. Remove or redesign unnecessary fixed reasoning recipes, canned substantive answers, brittle phrase/entity lists, and transformations that replace or degrade model output.
5. Retain concise task framing, relevant context, safety constraints, tool instructions, and structured output contracts where they serve a demonstrable purpose.
6. Preserve model-provided facts and qualifications; do not fabricate or silently discard information. Distinguish unverified model output from verified facts rather than deleting it solely because BiForge cannot verify it.
7. Prefer deterministic code and tests for mechanical controls. Do not use prompt prose as a substitute for enforceable engineering logic.
8. Require source-to-output integrity tests and representative model-backed evaluation; report mocks, local tests, hosted CI, live model evidence, and user outcomes separately.
9. This decision does not authorize unrelated product, provider, security, or workflow changes. Normative user-outcome changes require separate owner approval.

**Normative detail:** `docs/C124_INSTRUCTION_OPTIMIZATION.md`; current contract in `TECHNICAL_SPECIFICATION.md`; plan in `ROADMAP.md`.

**Effect:** P124.0.1 establishes the documentation mandate. P124.0.2 consolidates the baseline and repairs CI regressions. P124.1 completes the static source inventory. P124.2 removes duplicated model-directed reasoning choreography and novelty-only retries from Simple/Expert dialogue, restores factual-mode routing for Expert, and preserves model-written questions. P124.3 extends cleanup to Expert staged prompts and visible-output fidelity. P124.4 refines Architect project analysis and App Builder prompt/recovery behavior while retaining schemas, validation and completion contracts. Hosted CI and live/model-backed evaluation remain separate and NOT_RUN until evidenced.

---

## D-2026-10-31-03 — Launch C122: Expert Mode Reliability, Intelligence Quality & Decision Engineering

**Decision (owner-directed via BiForge-Cycle-C122 technical specification):**
1. Development cycle C122 is approved and becomes the active programme. Product version advances to 122.
2. Primary target is Expert Mode. The four patches are P122.1 (State Integrity & Persistence), P122.2 (Analytical Reliability & Evidence Integrity), P122.3 (Execution Reliability & Workflow Continuity), P122.4 (Decision Quality, User Experience & Final Validation).
3. Architect development is frozen for the duration of C122. The selected legacy Architect remains operational; no feature work, prompt changes, or parallel Lab development.
4. Conversational Mode is out of scope for C122. Shared components may be touched only when strictly necessary for Expert reliability and with demonstrated backward compatibility.
5. Existing architecture is preserved unless a demonstrated defect requires change. Refactoring is incremental, evidence-based, and minimal.
6. Every C122 patch must eliminate a demonstrated defect, improve a measurable Expert capability, improve reliability/integrity of expert data or conclusions, improve the user's ability to complete a decision process, or provide evidence that an existing capability works under realistic conditions.
7. Documentation integration: C122 mandate content is distributed into TECHNICAL_SPECIFICATION.md (normative contract and requirements), ROADMAP.md (control section and sequence), this file (decision record), TESTING_AND_ACCEPTANCE.md, USER_VALUE_EVALUATION.md, CHANGELOG.md, and TECHNICAL_REPORT.md as applicable. No new top-level documentation files.
8. Delivery remains minimal-diff ZIPs of only changed/added repository files; AGENTS.md Hard Gates apply.
9. C122 is not complete after four technical patches if real analytical results remain mediocre. Both deterministic tests and real-model evaluation scenarios are required.

**Rationale:** Expert Mode is a functional analytical prototype whose reliability, persistence, evidence integrity, and decision quality require systematic strengthening before it can be trusted as a decision-support system. Architect has been selected and is operationally sufficient for the current stage; further Architect work is deferred to a later product-wide optimization phase.

**Authority:** Owner-supplied BiForge-Cycle-C122 technical specification (approved). Supersedes prior P121 Architect-primary direction for the duration of C122.

**Effect:** All subsequent C122 work must follow the four-patch sequence and the acceptance criteria defined in the cycle mandate. Architect and Conversational boundaries must be protected.

## D-2026-10-31-02 — Select legacy Architect as the single active implementation

**Decision (owner-directed, supersedes D-2026-10-30-08):**
1. The legacy Architect / ProjectMode is the primary Architect at `/project`; `/architect` is an alias to the same workflow.
2. Architectural Test Lab (`/architect-lab`) is frozen for diagnostic reproducibility. Do not develop or repair it in parallel with the selected primary.
3. Compare generated artifacts and reliability evidence, not model names or completion claims alone. Prefer a valid, usable artifact; weigh syntax/runtime validity, reference/DOM wiring, acceptance checks, completeness, and recovery behavior.
4. Shared engine fixes that improve the selected primary are in scope, especially validators and repair logic that can incorrectly report SUCCESS.
5. Re-evaluate only when newer comparable evidence is available; preserve previous decisions and evidence.

**Evidence (2026-10-31 supplied build reports):** the legacy Expense Tracker reports `SUCCESS`, `goalImplemented=true`, and all seven declared validators passing (6 model calls, 42.4 s). The Lab reports `PARTIAL`, `goalImplemented=false`, with JavaScript syntax and file-reference failures (10 calls, 52.8 s). Diagnostics corroborate a prior Lab failure due to provider cooldown. Static inspection of the legacy artifact found a validator blind spot: multiple distinct controller properties were repaired to reuse the same DOM id. This patch adds detection for that defect class. Browser/mobile user outcome remains NOT_RUN; selection is final as the development direction, not a claim that every generated artifact is proven correct.

**Note:** During C122 this decision remains in force for the identity of the selected Architect, but further development of that Architect is frozen (see D-2026-10-31-03).

## D-2026-10-30-07 — Navigator protocol: Patch ZIP purity, tablet-only channel, automate first

**Decision (owner-directed):**
1. Patch ZIP purity: a delivery ZIP contains only repository files that are new or content-changed in that delivery, each at its exact repository-relative path. No PATCH_SUMMARY, README, apply guides, manifests, scripts, reports, logs, or other helpers. Apply notes, deletion lists, and verification limits go in chat only.
2. Navigator channel: every `FOR_NAVIGATOR` procedure assumes an Android tablet with the GitHub web UI, Actions, workflow logs, and an optional mobile browser. It never requires a local terminal, `npm`, or `node`.
3. Automate when possible: checks that can run in CI are added to `tests/` and/or `.github/workflows/` so the Navigator relies on Actions rather than manual technical steps.

**Effect:** Binding rules live in `AGENTS.md` (G1–G3) and `docs/TESTING_AND_ACCEPTANCE.md` (Navigator verification channel). Regression: `tests/p121-navigator-protocol.test.mjs` in `test:core`.

## D-2026-10-30-03 — Product acceptance is user outcome; evidence is labeled

**Decision (owner-directed):**
1. User outcomes are the primary product criterion. Tests, CI, deployment, and architecture checks are supporting evidence and are reported separately from user outcomes (`BIO-006`).
2. Evidence is labeled as OBSERVED, INFERRED, or NOT_RUN and tied to a commit. Absent evidence is unknown and is never reported as passing (`docs/USER_VALUE_EVALUATION.md`).

## D-2026-10-30-02 — Architect is one agent, one flow, one completion contract

**Decision (owner-directed):**
1. Architect is one user-facing agent with one state machine, one user flow, and one completion contract (`BIO-004`, `REQ-AGENT-002`).
2. There is no novice/professional mode choice. Beginner-friendly wording and advanced controls are adaptive presentation inside the same flow, not a mode switch.
3. All paths converge on the same task/specification, plan validation, artifact generation, validation, status, and delivery contract.

**Effect:** Implemented in the client by P121.0.7 (guided start is the single entry; the path chooser is unused). The C122 Architect freeze does not relax this decision.

## D-2026-10-30-01 — Canonical documentation topology and session governance

**Decision (owner-directed):**
1. Normative authority is consolidated into `AGENTS.md`, `TECHNICAL_SPECIFICATION.md`, `ROADMAP.md`, and `TECHNICAL_REPORT.md`, with specialist documents under `docs/`. `docs/VIX-CONCEPT.md` is strategy-only context.
2. There is no persistent `NEXT_PATCH.md` or other next-patch assignment file. CI evidence may suggest a fix but never assigns the next session's task.
3. Superseded prose documents are deleted once their current rules are consolidated. History in `CHANGELOG.md` and `TECHNICAL_REPORT.md` is preserved, not rewritten.
4. `scripts/docs-integrity.mjs` enforces this topology and the markers above.

**Provenance note:** The original texts of D-2026-10-30-01 through -03 were dropped from this file during the C122 rewrite (P122.x), which broke `docs:integrity`. They were restored in P122.4 from the content recorded in `AGENTS.md`, `CHANGELOG.md`, `TECHNICAL_REPORT.md`, and `scripts/docs-integrity.mjs`. If the original wording is needed verbatim, take it from the repository history of this file.


## ADR-C123-001 — Model carousel and organisational key pool (2026-11-01)

**Status:** Accepted

**Context:** Continuous agent work is limited by single free-tier API quotas. Research archive c125 proposed discovery, browser channels, and legal gates. Navigator closed C122 and started C123.

**Decision:**

1. Build an API-first **model carousel** (catalog + failover + lineage) shared by all agents.
2. Project rule: *what is not forbidden is permitted* — no mandatory external legal gate before implementation.
3. Organisation may configure **up to 10 legitimate API key sets** per provider as a key pool.
4. Browser automation is optional and deferred; not MVP.
5. Gemini model ids remain restricted to the free-key allowlist until catalog validation supersedes it.

**Consequences:** Implementation starts at P123.1; solo `GEMINI_API_KEY` remains supported; multi-key is opt-in via env.
