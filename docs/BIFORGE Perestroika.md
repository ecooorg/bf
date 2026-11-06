# BiForge C127 “Perestroika” — Consolidated Diagnostic Report and Execution Plan

**Prepared:** 2026-11-06 · **Audience:** the AI Assistant (executor) and the Navigator (owner) · **Baseline:** release 126.31, commit `4cfd0bf` **Inputs:** R126-AI-1 (external audit), R126-AI-2 (process audit), AI-1-AI-2 (cross-review), and the repository archive `bf-126-31-green.zip`, which I inspected directly. The logs, the CI artifacts and the 44-page dialogue PDF were **not** in the archive I received; everything about them below is quoted from the reports and marked as such.

---

## 0. How to use this document

- Sections 1–7 are the diagnosis and the design of the measuring instrument. Sections 8–13 are the work plan, rules, exit criteria and risks. Section 14 is a ready-to-paste task brief for P127.1. Section 15 lists what the assistant must verify before writing code.
- Where this document and `AGENTS.md` conflict, the conflict is listed explicitly (§4, §10) and the Navigator’s approval of this plan is the instrument that resolves it. Nothing here authorises a change to product behaviour before Experiment 0 has been run.
- Plain rule for every reader: **a statement about answer quality needs a measured number. Everything else is labelled INFERRED or NOT\_RUN.**

---

## 1. Bottom line

1. **The deadlock is a measurement deadlock, not a code-quality deadlock.** In 100+ iterations nothing ever measured whether answers to factual questions got better. What was measurable (green CI, allowlists, docs structure) was optimised instead. Of the last 12 patches (126.20–126.31), only three touched what the user sees (126.29 forced search plus a gate, 126.30 removed the gate, 126.31 cleaned the query). Nine were structure/CI work, two of which repaired CI broken by earlier cleanups.
2. **Do not rewrite BiForge and do not keep patching.** Keep the infrastructure (auth, DB, migrations, deploy, Drive, workspace, Project Mode, weather connector). Treat the *fact path* (search decision → query → retrieval → answer) as a hypothesis under test, not as an asset to defend or a thing to rewrite in advance.
3. **First move is an instrument, not a fix:** a small, versioned question set with human-verified references, a harness that runs BiForge Simple, BiForge Expert, and the same Gemini model called directly with native Google Search grounding, and a report the owner can read on a tablet. Many ablations need **no code change** because the pipeline already has env switches (§7.1).
4. **The decision after Experiment 0 is pre-registered with six equally legitimate outcomes** (§8), including “the architecture is fine, fix one component” and “the model tier is the bottleneck”. A new `factAnswer.ts` is one possible outcome, not the plan.
5. **Process changes that actually bite** (§10): no answer-path patch without a written hypothesis and metric; one hypothesis, one patch, at most one corrective patch, then revert or stop; a complexity budget; a held-out question set the coding assistant never sees; and an explicit duty for the assistant to object in writing before executing a task that contradicts the data.
6. **Preferred end state if the data says the layers do not help:** delete orchestration, do not add new orchestration. Net lines of fact-path code must go down, not up.

---

## 2. Evidence base and verification status

I re-checked the reports’ claims against the archive. Status legend: **VERIFIED** (seen in code/files), **NOT REPRODUCED** (I could not confirm it in this archive), **REPORTED** (comes from logs/PDF I did not have).

| # | Claim | Status |
| --- | --- | --- |
| 1 | `tests/search-retrieval.test.mjs` has 7 tests, imports no server code, reads sources as text; line 15 contains `… \|\| true` and cannot fail | **VERIFIED** |
| 2 | One test duplicates a regex inside the test file instead of calling the real function (“Mirror core patterns … without importing TS”) | **VERIFIED** (line \~76) |
| 3 | `server.ts` 2,775 lines; `server/webSearch.ts` 2,094 lines, 88 functions, 63 patch-number references | **VERIFIED** |
| 4 | “17 test files” | Correction: **14 test suites** (+3 helper/fixture files). `providers-models.test.mjs` has 117 tests |
| 5 | “82 of 117 test titles carry patch numbers” | **NOT REPRODUCED** (0 matches in this archive; treat as unverified) |
| 6 | The long chain (planner, translation, Serper/grounding, digest, verifier, quality retry) runs for every factual question | **PARTLY WRONG as stated.** Several stages are conditional: the epistemic verifier needs `EPISTEMIC_VERIFIER_ENABLED=true`; “Simple Direct” needs `BIFORGE_GEMINI_DIRECT_MODE=true` (default off); the planner defaults on. **What actually runs in production is unknown until `/health/runtime-config` is read** |
| 7 | Gemini native `googleSearch` exists but is not the main path | **VERIFIED and sharper:** in `webSearch.ts` it is used only as a *digest helper* (system prompt “compact factual digest”, temperature 0.2). Nowhere does one call both search and answer. The experiment “native grounding as the answering call” has never been run |
| 8 | Both model cascades are identical: `MODEL_CASCADE_LIGHT` = `MODEL_CASCADE_STRONG` = `gemini-3.5-flash-lite, gemini-3.1-flash-lite` | **VERIFIED** (`.env.example`). Expert therefore has no stronger model than Simple |
| 9 | `scripts/golden-eval.mjs` is a quality harness | **VERIFIED as fake-only** (`--fake`; “live mode is not part of P10”). It tests plumbing, not answers |
| 10 | Weather connector (Open-Meteo) removed LLM guessing for temperatures | REPORTED (`USER_VALUE_EVALUATION`: 3 of 21 before). Code exists (`weatherConnector.ts`, 260 lines) |
| 11 | Key rotation hits one shared quota (`sharedQuotaSuspected`); Serper skipped by `request_deadline` after 7 s of planning; the Serper query was `by maximum quantity and me the percentage of larches` | REPORTED (Render logs) |
| 12 | CI “Answer Quality” workflow is green with TAP 0/0 and DAG 0 checks in the live summary | REPORTED (CI artifacts) |
| 13 | `.env.example` points to `docs/C126_USER_LEVEL_VALIDATION.md`, which no longer exists | **VERIFIED** (dangling reference; trivial) |

**Net effect on the diagnosis:** the core of both reports stands. Two refinements matter for the plan: (a) the baseline must be pinned to the *effective* production configuration, not to the repository defaults; (b) “BiForge vs native grounding” is a new experiment, not a re-run.

---

## 3. Root causes (merged and ranked)

| # | Cause | Evidence | What in this plan counters it |
| --- | --- | --- | --- |
| 1 | **No oracle.** No set of questions with known-good answers; every hypothesis is equally plausible | No live eval in repo; each patch reports `NOT_RUN: live search` | Question set + harness (§7), P127.1 |
| 2 | **Goodhart.** The measurable things (CI, allowlists, docs, no `pNNN`) became the target | 9 of 12 patches off-target; 126.22 could have been one file deletion | Patch classification, ≤20% structure quota (§10) |
| 3 | **No hypothesis memory.** Each session starts blank and sees one log slice | Roadmap “re-evaluated each session”; no ledger of failed experiments | `docs/EXPERIMENTS.md` as an append-only ledger |
| 4 | **The Navigator Directive forbids objection.** “MUST NOT … reinterpret the Navigator’s explicit task” turns model agreeableness into policy | `AGENTS.md` §0 | Duty-to-object clause (§10) |
| 5 | **Open feedback loop.** Assistant has no keys or prod access; owner relays logs from a tablet | Navigator channel rules G2/G3 | Workflow that runs the eval in CI and publishes a readable summary |
| 6 | **One run of a stochastic system judged a patch.** Reported spread of 5 points between identical runs (17–18% vs 12–14%) | Reports | Repeats, intervals, paired comparison (§7.4) |
| 7 | **Additive bias.** Adding a branch is cheap, deleting is scary | `webSearch.ts` 2,094 lines of regex-heavy logic | Complexity budget; deletion as a first-class outcome |
| 8 | **Documentation as a feeling of control.** \~556 KB of docs, 294-line `AGENTS.md` with 42 MUSTs, many about delivery format rather than value | Reports | Short C127 rule block on top; shrink only on evidence |
| 9 | **Product sprawl.** Simple, Expert, Architect/Project, App Builder, Drive, workspace — “value” is undefined | Reports | One primary outcome for C127; other modes explicitly *not claimed* |
| 10 | **Nobody can state what runs in production.** Flags change the pipeline (direct mode, planner, verifier, provider, carousel) | Code review | Baseline snapshot from `/health/runtime-config` in every report |
| 11 | **The whole stack is one model tier.** “Strong” = “light” = flash-lite | `.env.example` | Ceiling configuration (D) in the experiment |
| 12 | **Infrastructure noise masquerades as answer quality.** Shared free quota, time-budget starvation, silent fallback to another provider | Reported logs | Infra failures labelled separately; fallback answers tagged by path |

A caution both reports share: not every patch in the 126.x series was useless. The accurate claim is narrower and stronger — **improvement was never measured, so nobody can say.**

---

## 4. Reconciling the three documents (decision log)

The cross-review was written by one of the parties to the dispute, so I treated it as an argument, not a verdict. Where it corrected R1, I checked the correction on its merits.

| Topic | R1 (external audit) | R2 (process audit) | Cross-review | **Resolution here** |
| --- | --- | --- | --- | --- |
| Rewrite vs process reset | Zero out the fact path, build v2 beside it | Process reset only; no rewrite yet | Measure first; don’t pre-decide a rewrite | **Measure first.** Rewrite is one of six outcomes (§8) |
| Content of P127.1 | Eval harness + Experiment 0 | Governance contract, baseline card, change cards | Measurement-centred but minimal | **Measurement tooling + a short rule block.** No governance framework |
| New process files (`C127_CONTRACT.md`, `C127_BASELINE.md`, `patches/P127.x/CHANGE.md`) | — | Proposed | — | **Rejected as files.** They violate `AGENTS.md` §6 (no new cycle/audit docs under `docs/`, no nested folders) and add a competing document set. Content goes into an `AGENTS.md` block and `docs/EXPERIMENTS.md` (new allowlisted file) |
| Experiment size | 20 q × 5 runs × 4 configs = 400 | 8 scenarios, 3–5 repeats | 10–12 q × 1 run first, then scale | **Staged:** smoke (12 q × 1) validates the instrument; then \~30 dev + 10 holdout × 3 repeats where variance matters |
| Headline metric | W-rate ≤ 5%; consistency | Outcome pass/fail | Consistency ≠ correctness; 5% not provable on small n | **Hierarchy:** W-rate, G-rate, abstention quality, then latency/cost; consistency is diagnostic only; 5% is a target, not a gate until n ≥ \~60 (§7.4) |
| `factAnswer.ts` | Planned P127.3 | Only after diagnosis | Don’t pre-commit | **Conditional** on outcome O1 |
| Delete old path | Planned P127.5 | Don’t delete before diagnosis | Only after proof; delete code rather than write more | **Only after ablation shows no contribution**; in a separate, revertible patch |
| Shrink `AGENTS.md` to 60–80 lines | Yes | Reduce role, keep hard constraints | Not now | **Add a ≤25-line C127 block now; shrink later, on evidence** |
| Freeze scope | `webSearch.ts` + `search-*` tests | Almost everything | — | **Freeze the answer path** (list in §6) with four explicit exceptions |
| Iteration cap | Three failed patches → stop | Two attempts → revert | — | **Layered:** per hypothesis ≤2 attempts then revert; per area, three failed hypotheses → stop pending Navigator |
| Holdout set | Yes (owner/secrets) | Not covered | Add dev/validation/holdout | **Adopt:** owner-held holdout in a repository secret |
| Benchmarks | Factual only | Factual + others | A/B/C separate | **Only A (factual) in C127.** B (conversation) and C (Architect) are later; no claims about them |
| LLM judge | Calibrated judge | Helper only | — | **Advisory** until agreement with human labels is measured |
| Direct Gemini API as truth | Baseline | — | API ≠ Gemini app | **A control, not gold.** Label it so in every report |
| Test cleanup timing | Small patch after Exp. 0 | Don’t rewrite now | Classify first | **Classify now, change in P127.5** (one atomic patch) |

---

## 5. Operating model for C127

**Loop:** *Baseline → Diagnose → Minimal intervention → Evaluate → Adopt, revert, or expand.* Every box produces a recorded number.

Principles:

1. **Outcome over activity.** The only value that counts is “a user asked a factual question and got a correct, supported answer, or an honest ‘I could not verify this’, with a clarifying question where the question is ambiguous”.
2. **Measure before and after, on the same inputs.** One factor changed at a time.
3. **Diagnose before delete, delete before add.** Ablate layers using existing switches; prefer removal.
4. **Reverting is a successful result.** “No change” is a legitimate finding.
5. **Independence.** The session that writes code does not write or label the holdout, and its own proposal is never evidence that a change is needed.
6. **Honest classification.** Each patch is exactly one of USER\_VALUE, BUGFIX, RELIABILITY, SECURITY, MAINTENANCE, EXPERIMENT. MAINTENANCE and EXPERIMENT may never be reported as user value.
7. **Small, reversible, flag-gated.** Behaviour changes ship behind a flag that defaults off until accepted.

---

## 6. Scope

| Area | C127 status | Notes |
| --- | --- | --- |
| `server/webSearch.ts`, `searchCarousel.ts`, `queryFidelity.ts`, `sourcePolicy.ts`, `sourceTrust.ts`, `epistemicVerifier.ts`; the conversation/search wiring inside `server.ts`; prompts; model cascade and temperature | **FROZEN** until the Experiment 0 decision | ≈2,800 lines in the six modules (webSearch 2,094 + carousel 175 + fidelity 188 + policy 106 + trust 95 + verifier 155) plus wiring in `server.ts` |
| `tests/search-*.test.mjs` | **Frozen for edits**, classified in P127.1, rewritten in P127.5 | The misleading test is a documented known defect, not a blocker |
| Auth, sessions, DB, migrations, deploy, Drive client, browser workspace, `appBuilder/`, Project Mode, weather connector | **KEEP, do not touch** | Owner decisions D-2026-11-05-01; no “cleanup for order” |
| Docs/scripts/CI structure | **No new cleanup** | Only additions required by this plan, made atomically (§9) |
| Dependency updates | Frozen | Except security |
| `server.ts` / `webSearch.ts` splitting | Not a standalone initiative | Only together with a measured change of the fact path |

**Allowed even during the freeze:** (1) security/privacy fixes; (2) build or deploy breakage; (3) a reproducible P0 defect with a recorded failing case; (4) **additive** changes strictly needed for measurement (new scripts, flags that default off).

---

## 7. The instrument (measurement design)

### 7.1 Configurations

Every report starts with a **runtime snapshot**: the deployed `/health/runtime-config` (public endpoint, already exists) plus the effective environment of the harness server. The baseline is “production as configured”, not “repository defaults”.

| ID | Configuration | Purpose |
| --- | --- | --- |
| **A** | BiForge Simple as deployed | The product as the owner sees it |
| **B** | BiForge Expert as deployed (route `/api/agent/expert`) | Same for Expert |
| **C** | Gemini API, **one call**, `googleSearch` tool, no BiForge prompts, **same model as A’s primary** | Isolates architecture from model |
| **D** | Same as C with the strongest model available to the project | Ceiling; separates “model tier” from “architecture” |
| **N** | A with `ENABLE_WEB_SEARCH=false` | **Negative control:** a system that cannot look anything up must lose on lookup questions, or the scorer is broken |

**Zero-code ablations (run only if A vs C shows a material gap, on the failing subset):** the pipeline already exposes switches. Start from A and change one:

- `BIFORGE_GEMINI_DIRECT_MODE=true` (single generation, bounded optional search)
- `WEB_SEARCH_PLANNER=false` (regex trigger only, no LLM planner)
- `WEB_SEARCH_PROVIDER=gemini` vs `serper` (grounding digest vs snippets)
- `SEARCH_CAROUSEL` order (connector / serper / gemini)
- `EPISTEMIC_VERIFIER_ENABLED` and `QUALITY_RETRY_MAX_ELAPSED_MS`

The assistant must **verify each switch is actually read in code** (not just present in `.env.example`) before relying on it (§15). Translation-off has no switch and needs a code change; treat it as a later experiment.

The direct Gemini API is a **control, not gold**: model version, system instructions, index and post-processing of the consumer Gemini app can differ. Reports must say so.

### 7.2 Question set

- **Phases:** P127.1 ships 12 dev questions (harness validation). Before the full run, grow to **\~30 dev + \~10 holdout**.
- **Dev set** lives in the repo (`config/eval-questions.json`), versioned, with a content hash written into every report. **Changing it after seeing results bumps the version and starts a new baseline.**
- **Holdout** lives in a repository secret (`EVAL_HOLDOUT_JSON`, ≤48 KB), authored by the owner or a *different* AI session than the coder. The workflow reads it only if present and publishes **aggregate numbers only** in the public summary; per-question detail goes to a private artifact the owner does not forward.
- **Excluded:** the larch / Switzerland / Graubünden question is “burned” (it is a test in the repo). Keep it as a separately reported **canary**, never in scoring.
- **Locale rule:** the set must not be tied to one country: ≥3 languages (RU, EN and at least one more), ≥3 countries, mixed units.

| Category | Share | Notes |
| --- | --- | --- |
| Share / statistic from an official source | \~20% | One named territory and metric each; reference from the primary source |
| Current data | \~15% | **Exclude weather** (deterministic connector); keep one weather question as a connector-routing sentinel |
| Factual lookups (dates, names, versions) | \~13% |  |
| Ambiguous (territory, metric, period unspecified) | \~17% | Reference lists **acceptable behaviours**: state the interpretation, or ask one clarifying question |
| Multi-turn: follow-up, “search more”, topic switch | \~17% | 2–3 turns |
| Plain conversation (search must not trigger) | \~10% | Detects over-triggering and wasted latency |
| Explicit search request with meta-phrases (“only the number”, “search many sites”) | \~7% | Tests intent preservation |

**Reference rules.** Each scored question has `reference` = primary-source URL + retrieval date + “as of” date, collected by a person or by a session with live web access, **never from model memory**. If no reference could be found: `reference: null` → the question is **run but not scored for correctness** (behaviour only). Volatile facts carry `volatile: true` and are judged by criteria (source class, freshness), not by a fixed value. References are re-verified every 90 days.

### 7.3 Labels and rubric

Primary label per answer: **G** (correct and supported, or correct with an honest caveat), **A** (honest abstention or clarifying question where one is acceptable), **W** (confidently wrong, or a specific claim not supported by the shown sources), **N** (not assessable: no reference, or ambiguous without a defined acceptable behaviour), **I** (infrastructure failure: quota, timeout, provider error — reported as availability, never counted as W or G).

Secondary fields per answer: grounded (claims traceable to shown sources), task completed (did the user get what they asked), abstention appropriate, clarification necessary and well-formed, extra turns the user would need (user effort), latency, number of LLM calls, provider path (primary / fallback).

**Labelling protocol.** The owner labels **blind**: the summary shows each question once with the answers in random order (X1…X4) and their sources, without configuration names; the mapping is revealed only in the report file. Target effort: ≤40 minutes for 30 questions, answerable as one line per question in chat (“Q07: X1=G X2=W X3=G X4=A”). Machine pre-labels (numeric match against reference; language-neutral abstention detection) are shown as *provisional*. An LLM judge, if used, must run on a different provider than the answerer and is **advisory until agreement with human labels is measured** (report Cohen’s κ; if κ < 0.6 it stays advisory).

### 7.4 Metrics and statistics

Decision order: **(1) W-rate, (2) G-rate, (3) quality of abstention/clarification on ambiguous items, (4) latency p50/p95 and LLM calls per answer, (5) consistency across repeats** (diagnostic only — five identical wrong numbers are perfectly consistent).

Small-sample honesty (95% one-sided upper bound on the true error rate when **zero** errors are observed):

| Independent questions | 12 | 20 | 30 | 40 | 60 |
| --- | --- | --- | --- | --- | --- |
| Upper bound | 22% | 14% | 9.5% | 7.2% | 4.9% |

Consequences: repeats of one question are not independent questions; “W ≤ 5%” **cannot be demonstrated** with fewer than \~60 independent questions, so it stays a *target*; reports always print the count and an interval (Wilson or Clopper–Pearson); configurations are compared **paired** on the same questions, reporting the questions where they disagree.

**Materiality thresholds (default; the Navigator may change them *before* the run, never after).** A difference counts as material only if G-rate differs by ≥15 points or W-rate by ≥10 points on the dev set **and** the direction holds in at least two of three category groups. Otherwise the verdict is INCONCLUSIVE and the next step is more data, not a patch.

### 7.5 Run protocol

- Sequential per configuration with pacing at least `MODEL_MIN_INTERVAL_MS`; one warm-up call; identical time budgets and default temperature for direct calls.
- **Quota and timeouts:** record as `I`, wait out the cool-down and retry once (not counted as a repeat). Answers produced by a **fallback provider** are tagged `path=fallback` and reported separately — a different system answered.
- **Repeats:** r = 1 for the smoke run; r = 3 for statistic, current-data and ambiguous categories in the full run; r = 1 for plain conversation. Expected volume ≈300–350 calls.
- **Known confound:** CI may hold fewer Gemini key slots than production (reports: 1 vs 5) and the keys may share one quota project. Record slot count and quota errors in every report.
- Secrets are never printed; the harness uses the existing redaction helpers.

### 7.6 Is the instrument itself valid?

Building an evaluator is not evidence that it evaluates correctly. Before any conclusion about BiForge:

1. **Negative control N** must score below A on lookup categories.
2. **Scorer unit tests** (behavioural, importing the real scorer): numeric matching with units and rounding, abstention detection on multilingual fixtures, interval maths, schema rejection of malformed questions.
3. **Double labelling** of a subset (owner vs advisory judge) with agreement reported.
4. **Drift guard:** report carries commit SHA, question-set hash, runtime snapshot, model IDs.
5. If checks 1–3 fail, the next patch repairs the instrument (one corrective patch allowed), and no product conclusion is drawn.

### 7.7 Diagnosis fields (so a failure points at a stage)

For A and B the harness must capture, per run: request id, search decision (expected / triggered / explicit), **the query actually sent**, provider, number and hosts of sources, search status and reason, model ID and key slot, provider path, per-stage latency, LLM call count, final answer. Failures are then tagged from this taxonomy: *intent lost* · *query corrupted* · *search not triggered* · *search timeout/quota* · *sources irrelevant or non-authoritative* · *number not extracted* · *ambiguity unhandled* · *fallback lost evidence* · *model hallucination* · *post-processing overwrote a good answer*.

---

## 8. Decision matrix after Experiment 0 (pre-registered)

The outcome is chosen from the data using the thresholds of §7.4, not from preference. **All six outcomes have equal standing.** More than one can be true; take the one with the largest measured effect first, one at a time.

| Outcome | Pattern (paired, material) | Interpretation | Next step |
| --- | --- | --- | --- |
| **O1 — Thin path wins** | C (and D) clearly beat A and B on G-rate or W-rate, same model | The BiForge layers hurt or add nothing for factual answers | P127.3a: flag-gated thin native-grounded path; later, ablation-driven deletion |
| **O2 — Model tier is the bottleneck** | C ≈ A, but D ≫ C | Flash-lite tier limits quality, not the wiring | P127.3b: model/tier/quota decision, configuration only, no code |
| **O3 — Ambiguity and abstention** | All configs weak on ambiguous and statistic questions, fine elsewhere | Questions underspecified (territory, metric, period); answers neither state an interpretation nor ask | P127.3c: minimal answer contract (state interpretation or ask one question) |
| **O4 — BiForge is at least as good** | A/B ≥ C on both W-rate and G-rate | Architecture earns its keep | P127.3e: keep; one targeted fix per top failure class from the §7.7 taxonomy |
| **O5 — Infrastructure dominates** | ≥25% of A/B runs are `I` or `path=fallback`, or A fails mostly by timeout/quota where C does not | Quality is a lottery of quota, deadline and fallback | P127.3d: RELIABILITY patch (deadline budget that never starves search, independent quota projects, fallback that keeps evidence) |
| **O6 — Instrument invalid or inconclusive** | §7.6 check fails, or differences below thresholds | We do not yet know | Repair the instrument or add data; no product change |

If two outcomes tie, choose the cheaper and more reversible one. Rewriting is never the default.

---

## 9. Work plan

Sequence: **Phase 0 (owner decisions) → P127.1 instrument → P127.2 Experiment 0 → P127.3 one intervention → P127.4 convergence and deletion → P127.5 test debt → P127.6 close the loop.** Patch numbering follows `AGENTS.md`: version `127`, patches `127.1`–`127.99`; do not insert a `.0`.

### Phase 0 — Navigator decisions (no code; about 20 minutes)

Each has a default that applies if the Navigator does not answer.

| ID | Decision | Default |
| --- | --- | --- |
| D1 | Primary C127 outcome = factual answers: correct and supported, or honest “could not verify” | Yes |
| D2 | Approve the `AGENTS.md` amendments of §10 (C127 block, duty to object, Navigator Directive wording). Required: `AGENTS.md` is binding | Yes |
| D3 | Approve `docs/EXPERIMENTS.md` in the docs allowlist and one new test category row (`tests/eval-harness.test.mjs`) in `docs/TEST_MAP.md` | Yes |
| D4 | Holdout: who authors \~10 questions (owner, or a separate AI session with web access) and stores them in secret `EVAL_HOLDOUT_JSON` | Owner |
| D5 | Secrets exist in the repository: Gemini key(s), Serper, Groq; and a small budget for the ceiling model in configuration D | Confirm |
| D6 | Materiality thresholds of §7.4 (change only now) | Defaults |
| D7 | Labelling time per full run (about 40 min) | Accept |

Also in Phase 0: open `<deployed URL>/health/runtime-config` in the tablet browser and paste the JSON into the chat. It is public, contains no secrets, and shows which flags are on in production.

### P127.1 — Build the instrument (type: EXPERIMENT; user value: NOT\_RUN)

**Goal:** a repeatable, readable way to measure answer quality. **No change to product behaviour.**

| File | Action | Notes |
| --- | --- | --- |
| `config/eval-questions.json` | New | 12 dev questions, schema in Appendix A; references found by a live-web session, else `reference: null` |
| `scripts/baseline-eval.mjs` | New | One file, under about 600 lines; **exports pure functions** (schema check, scoring, intervals, blinding) so tests can import them; modes: `--dry-run`, `--smoke`, full, `--score <labels.json>` (offline, no keys) |
| `tests/eval-harness.test.mjs` | New category suite | Behavioural only (Appendix B list). Add it to the existing `test:core` chain once, per `TEST_MAP` rules. Needs D3 |
| `docs/TEST_MAP.md` | One row | `eval-harness` |
| `.github/workflows/baseline-eval.yml` | New | `workflow_dispatch` only; inputs: smoke, set (dev or dev+holdout), configs, repeats; action refs pinned to the **same SHAs and release comments as `ci.yml`**; `permissions: contents: read`; Node from `.nvmrc`; secrets passed as env, never echoed; uploads `eval-report.json` and `eval-summary.md` (plus a private holdout artifact) |
| `docs/EXPERIMENTS.md` | New | Ledger: Experiment 0 protocol, pre-registered thresholds, outcome matrix, results table with `NOT_RUN`; add to the `docs-integrity` prose allowlist in the same delivery |
| `scripts/scripts-integrity.mjs` | Allowlist entry | Plus an npm script `eval:baseline` and the workflow as caller |
| `AGENTS.md` | C127 block (≤25 lines) + Navigator Directive amendment | Text in §10. No other edits, no shrinking |
| `docs/DECISIONS.md` | One decision | C127 freeze, holdout rule, duty to object, supersedes the cancelled P126.32 proposal |
| `package.json`, lockfile root | `version` 127, `patch` 127.1 | Use `npm run version:sync` / `version:check` |
| `CHANGELOG.md`, `TECHNICAL_REPORT.md` | One short entry each | Patch type, `user_value: NOT_RUN`; no per-step micro entries |

**Explicitly not touched:** `server/`, `server.ts`, `src/`, `appBuilder/`, `migrations/`, prompts, model cascade, existing search tests, other workflows, dependencies, `docs/` structure other than the two files above.

**Harness behaviour.**

1. Load and validate the question file; compute its hash; refuse malformed items.
2. For A, B, N: start a local server per configuration with the right env (`ENABLE_APP_AUTH=false`, flags per §7.1) and call the real Simple/Expert routes (request shape is taken from `server.ts` and `src/` — §15). If a local server cannot run without a database, call the handler directly as `conversation-simple-direct.test.mjs` does.
3. For C and D: one `generateContent` call per question with the `googleSearch` tool through the already-installed `@google/genai`; model IDs read from `config/model-sources.json`/env, never hard-coded in the harness; D = strongest model available at run time.
4. Multi-turn questions replay the history in order.
5. Capture §7.7 telemetry; tag infra failures and fallback path; pace requests.
6. Emit the runtime snapshot, `eval-report.json` (machine) and `eval-summary.md` (blinded view, provisional machine labels, latency table, interval maths).

**Acceptance (assistant-verifiable):**

- [ ] `git diff --stat` shows **zero** changes under `server/`, `server.ts`, `src/`, `appBuilder/`, `migrations/`.
- [ ] `npm run check` (DAG), `docs:integrity`, `scripts:integrity`, `version:check` and the workflow-pins test are green; the new suite runs inside the existing chain.
- [ ] `--dry-run` with the fake provider runs end to end and writes both report files; live results are stamped `NOT_RUN`.
- [ ] Scorer, interval, blinding and schema tests pass and demonstrably **fail** when the scorer is deliberately broken (mutation check done once by hand and noted).
- [ ] Report names the commit, question-set hash, model IDs, slot count.
- [ ] Chat message states what ran and what is `NOT_RUN` (rule G5), lists `unzip -l`, and contains `FOR_NAVIGATOR` steps with no shell.

### P127.2 — Experiment 0: run and read (type: EXPERIMENT)

| Stage | Who | What | Exit |
| --- | --- | --- | --- |
| **A. Smoke** | Navigator dispatches `smoke=true`: 12 dev questions × 1 run × A, B, C, N | Validates the instrument, not the product | §7.6 checks 1–3 pass; infra failures below 25%; labels derivable. If not: one corrective instrument patch, then stop and report |
| **B. Pre-register** | Assistant commits to `docs/EXPERIMENTS.md` | Thresholds, configs, set version and hash, decision matrix. **Committed before the full run** | Commit exists |
| **C. Full run** | Navigator dispatches full run: \~30 dev + holdout, r = 3 where §7.5 says so, configs A, B, C, D, N | About 300–350 calls | Report artifacts attached |
| **D. Label** | Navigator, blind, one line per question | ≤40 min | Labels uploaded to the assistant session |
| **E. Score and decide** | Assistant, offline with `--score` | Intervals, paired differences, error taxonomy, outcome O1–O6 | Decision record in `docs/EXPERIMENTS.md`; Navigator confirms |
| **F. Ablate (conditional)** | Only if A vs C is material | Zero-code env ablations on the failing subset, one switch at a time | Contribution of each layer recorded |

Questions for stage C are written by a **different session or the owner**, not the coding assistant, and are frozen before the run. The coding assistant never sees the holdout.

### P127.3 — One intervention, chosen by §8

Precondition: a written hypothesis entry in `docs/EXPERIMENTS.md` (template in §10) with metric and thresholds **before** any code. Rules: flag-gated, default off; one hypothesis; at most one corrective patch; accepted only on dev **and** a single holdout run.

**3a — Thin native-grounded fact path (only if O1).** Contract: *for a question needing a verifiable external fact the agent answers only from retrieved sources and shows them; if sources are missing or do not answer the question it says so; if the question is ambiguous (territory, metric, period) it states its interpretation or asks one clarifying question; Simple and Expert use the same path.* Design guardrails:

- New module `server/factAnswer.ts`, about 300–600 lines, behind `FACT_PATH=v2`; **imports nothing from `webSearch.ts`**.
- Order: deterministic connectors first (weather precedence kept), then one model call with the `googleSearch` tool; the model decides whether to search — **no regex or language-specific trigger**; sources come from grounding metadata.
- Fallback keeps the tool or says plainly that evidence could not be obtained; never silently answers from memory.
- Quota independence verified, not assumed (§8 O5).
- Acceptance on the same set: paired W-rate not worse than the best direct baseline; G-rate not lower than A; p95 latency ≤1.5× A; LLM calls per answer ≤ A; canary reported. Rollback is turning the flag off.

**3b** (O2): change tier/quota in configuration; re-run dev; record cost per answer. **3c** (O3): minimal contract wording plus a clarifying-question path; evaluate on the ambiguous category and check no regression elsewhere. **3d** (O5): deadline budget (search can never be starved by planning), separate quota projects, evidence-preserving fallback; classified RELIABILITY and measured by infra-failure rate. **3e** (O4): one fix per top failure class; stop after two attempts per class.

### P127.4 — Convergence and deletion (only after an accepted P127.3)

1. Flip the default only on the Navigator’s decision, with the before/after table attached.
2. Parity test: the same question gets the same search decision and evidence path in Simple and Expert.
3. **Deletion is a separate, revertible patch.** Remove a legacy layer only if the ablation showed no measured contribution; list each removed module with its measured contribution. Target for the fact path: **lines of code ≤ one third** of today’s ≈2,800 (plus wiring in `server.ts`); if the target is missed, say so.

### P127.5 — Test debt, one atomic patch

Classify each test in the search/answer suites as **keep / convert / delete** (report the table first). Then: replace source-reading and regex-copy tests with behavioural tests (import the function, call it, assert the output; recorded network fixtures for determinism); remove the `|| true` assertion; stop encoding patch numbers in test titles (the rule says to avoid `pNNN`); rename the “Answer Quality” workflow so its name matches what it proves, or point it at the real eval. Scripts, manifest, workflows and docs change **together** (the 126.24 → 126.26 cascade is the cautionary tale).

### P127.6 — Close the loop

- A small script turns owner-flagged bad answers from All Logs exchange events (`simple_direct_exchange` already stores user text, reply and search summary) into candidate dev questions; they enter the dev set only through a versioned change.
- One weekly metrics line (G / A / W, latency) replaces the patch list at the top of `TECHNICAL_REPORT.md`.
- Decide on `AGENTS.md` shrinking **using evidence** about which rules the assistants skipped or tripped on.
- Decide the future of `eval:golden` (fake-only plumbing check): merge into the new harness or retire, but do not keep three evaluators.
- Schedule Benchmark B (conversation behaviour) and C (Architect: a handful of typical builds judged by “runs and does what was asked”) as separate mini-experiments. **C127 makes no claims about them.**

### Indicative effort

| Patch | Assistant effort | Navigator effort | Calendar |
| --- | --- | --- | --- |
| Phase 0 | — | \~20 min | day 0 |
| P127.1 | 1 session | apply ZIP, wait for green (\~10 min) | day 1 |
| P127.2 | 1–2 sessions | dispatch twice, label \~40 min, authorise holdout | days 2–4 |
| P127.3 | 1–2 sessions | one decision, one dispatch | days 5–8 |
| P127.4–P127.6 | 3 sessions | decisions only | following 1–2 weeks |

---

## 10. Process rules (the part that changes behaviour)

### 10.1 Text of the C127 block for `AGENTS.md` (≤25 lines, placed after §0, nothing else shrunk or deleted)

**C127 OPERATING RULES (Navigator-approved; apply to every session in cycle C127)**

1. **Outcome first.** A patch that changes answer behaviour starts with a `docs/EXPERIMENTS.md` entry written *before* the code: problem and evidence, hypothesis, metric, baseline run, acceptance thresholds, files in scope, rollback criterion.
2. **Measure after.** Run the dev set before and after and record both. An answer-path patch whose user value is `NOT_RUN` may not be labelled USER\_VALUE.
3. **One hypothesis, one primary patch, at most one corrective patch; then revert or stop.** Three failed hypotheses in one area stop that area until the Navigator decides.
4. **Complexity budget.** Add a branch, regex or layer only together with a deletion or a measured gain. No new language-specific regex in the answer path.
5. **Structure work** (docs, scripts, CI, file layout) is at most 20% of the patches in a cycle.
6. **No example fitting.** Words or entities from specific eval or user questions must not appear in code, prompts or tests. Bad answers become eval data.
7. **Independence.** The session that writes code neither authors nor labels the holdout set. The assistant’s own proposal is not evidence that a change is needed.
8. **Honest classification.** Every patch is exactly one of USER\_VALUE, BUGFIX, RELIABILITY, SECURITY, MAINTENANCE, EXPERIMENT. Infrastructure failures are reported separately from answer quality.
9. **Reverting and “no change” are valid results.**
10. **Session start in C127:** read §0–§1, this block, `docs/EXPERIMENTS.md` and the latest eval summary. The long §4 reading is optional unless the task needs it.

**Amendment to the Navigator Directive (replaces its last sentence):** *The Assistant executes the Navigator’s explicit task. Before executing, it MUST state in writing, in at most five lines, if the task conflicts with §1, the C127 rules or measured data, and propose an alternative. If the Navigator then repeats the instruction, it stands. The Assistant MUST NOT replace the task with its own priorities.*

**Compatibility notes with existing `AGENTS.md` rules:**

- §4 step 20 and §5 forbid prescribing the next session’s task. This plan is a Navigator-issued cycle directive; `docs/EXPERIMENTS.md` records hypotheses and results, **not assignments**. Do not create `NEXT_PATCH.md` or any equivalent.
- §6 forbids new cycle/audit documents and nested folders under `docs/`: hence no `C127_*.md` and no `patches/` folder.
- G1 (ZIP purity), G2 (tablet-only Navigator), G3 (automate in CI), G5 (no invented PASS) all still apply to every C127 patch.

### 10.2 Entry template for `docs/EXPERIMENTS.md`

**ID / date / patch** · **Type** (one of the six) · **User problem and evidence** (run id or log request id) · **Hypothesis** (one sentence, falsifiable) · **Baseline** (run id, commit, set hash) · **Metric and acceptance thresholds** (written now, not later) · **Scope** (files allowed) · **Regression risks** · **Result** (before/after table with counts and intervals) · **Decision:** ACCEPT / REJECT / REVERT / INCONCLUSIVE, with reason.

### 10.3 What an answer-path patch report in chat must contain

Patch type and user-value status; hypothesis and baseline id; what was run and what is `NOT_RUN`; before/after numbers on the dev set; the line “removed N lines, added M lines” for the fact path; deletion list (not in the ZIP); `unzip -l`; `FOR_NAVIGATOR` steps without shell.

---

## 11. Exit criteria for C127

**Gating (all required):**

1. **E1** — The instrument is validated (§7.6) and versioned (set hash, commit, model IDs).
2. **E2** — The Experiment 0 decision is recorded with outcome label O1–O6, counts, intervals, paired differences and the error taxonomy.
3. **E3** — One intervention is **accepted or rejected strictly by its pre-registered thresholds**. Acceptance means: on dev and one holdout run, paired W-rate no worse than baseline, plus a material gain in W-rate or G-rate **or** equal quality with a measured simplification; p95 latency ≤1.5× baseline. Otherwise REJECT and revert.
4. **E4** — Fact-path code is not larger than at baseline; if a thin path is adopted, removal of the legacy path is scheduled with measured contributions.
5. **E5** — The rules of §10 are in force and the ledger is populated.

**Reported but not gating:** W-rate ≤ 5% (a target; demonstrable only with \~60 independent questions), Simple/Expert parity, consistency.

**Not claimed by C127:** Project/Architect quality, general conversation quality, parity with the Gemini app, anything outside the question categories actually measured.

If E3 ends in REJECT, C127 still closes successfully: the baseline stays, the ledger records why, and the project has a measured reason instead of an impression.

---

## 12. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Scorer bug gives false confidence | Negative control N, behavioural scorer tests, double labelling, mutation check |
| Overfitting to the dev set | Versioned set, hash in every report, owner-held holdout, no example fitting |
| Sunk-cost bias in either direction (defending the code or wanting a rewrite) | Pre-registration; six equal outcomes; deletion preferred to addition |
| Quota/contention noise | Pacing, `I` label, slot count logged, separate projects for the ceiling run |
| Direct API differs from the Gemini app | Labelled as a control in every report |
| Small n | Intervals, materiality thresholds, paired comparison, INCONCLUSIVE is allowed |
| Wrong or stale references | Primary sources with dates; two-source check for scored statistics; owner spot-checks half; 90-day refresh |
| CI cascade (the 126.24 → 126.26 pattern) | Change scripts, manifest, workflows and docs atomically; run DAG, `docs:integrity`, `scripts:integrity` and `version:check` before shipping |
| Scope creep by the assistant (new governance files, cleanups) | Freeze list, ZIP purity, structure quota, duty to object |
| Secret leakage | No echo of env, existing redaction, gitleaks stays on, holdout in a private artifact |
| Holdout leakage | Aggregate-only public summary; the owner does not forward the private artifact |
| Model or tier changes at the vendor | Model IDs logged; re-baseline on change |
| Owner fatigue | Blind one-line labels, ≤40 min, provisional machine labels |

---

## 13. Navigator checklist (`FOR_NAVIGATOR`, tablet, no shell)

1. **Phase 0:** reply with D1–D7 (or “defaults”). Open `<deployed URL>/health/runtime-config` and paste the JSON into the chat. *Pass:* the assistant confirms which flags are on.
2. **After P127.1:** on GitHub, replace the listed paths from the ZIP, commit, open **Actions** and wait for Core CI. *Pass:* green check.
3. **Settings → Secrets and variables → Actions:** confirm the Gemini, Serper and Groq secrets exist; after the holdout is written, add `EVAL_HOLDOUT_JSON`. *Pass:* names visible in the list (values never shown).
4. **Smoke:** Actions → *Baseline Eval* → **Run workflow** with `smoke = true`. Download `eval-summary.md` and send it to the assistant. *Pass:* the summary lists answers for all configurations; do not send the private holdout artifact.
5. **Full run** (after the assistant confirms the pre-registration commit): run the workflow again, label blind in one line per question, send `eval-report.json` and your labels.
6. **Decision:** read the assistant’s outcome (O1–O6) and approve or decline P127.3.

---

## 14. Ready-to-paste task brief for P127.1

> **P127.1 (cycle C127 “Perestroika”) — measurement only. Type: EXPERIMENT. User value: NOT\_RUN.** Read `AGENTS.md` §0–§1 and this plan, §7, §9 and §15. Complete the §15 pre-flight first and report its findings in five lines before writing code. **Do not change** `server/`, `server.ts`, `src/`, `appBuilder/`, `migrations/`, prompts, model cascade, existing search tests, other workflows, or dependencies. **Add:** `config/eval-questions.json` (12 dev questions across the §7.2 categories, ≥3 languages, ≥3 countries, none from the burned question; every `reference` has a primary-source URL, retrieval date and as-of date found by live search, otherwise `null`); `scripts/baseline-eval.mjs` (modes `--dry-run`, `--smoke`, full, `--score`; configurations A, B, C, D, N per §7.1; telemetry per §7.7; blinded summary; intervals); `tests/eval-harness.test.mjs` (Appendix B) added once to the existing `test:core` chain and one row in `docs/TEST_MAP.md`; `.github/workflows/baseline-eval.yml` (dispatch only, pins identical to `ci.yml`); `docs/EXPERIMENTS.md` (Experiment 0 protocol, thresholds, outcome matrix, results `NOT_RUN`) with its allowlist entry; the `scripts-integrity` allowlist entry and an `eval:baseline` npm script. **Edit:** `AGENTS.md` (C127 block and Navigator Directive amendment exactly as in §10.1), `docs/DECISIONS.md` (one decision), `package.json` and lock metadata to 127 / 127.1 via `version:sync`, and one short entry each in `CHANGELOG.md` and `TECHNICAL_REPORT.md`. **Do not** run or claim any live result. **Do not** author or look at holdout questions. Put no helper files in the ZIP. **Before replying:** run the DAG, `docs:integrity`, `scripts:integrity`, `version:check`, the new suite and the dry run; show `git diff --stat` proving zero changes in the frozen paths; list `unzip -l`; state what ran and what is `NOT_RUN`; give `FOR_NAVIGATOR` steps with no shell.

---

## 15. Pre-flight the assistant must complete before coding

These are things I could not or did not fully verify.

1. **Exact Simple/Expert request and response shapes.** Observed: the handler is `conversationHandler` in `server.ts` (around line 1336); the body carries `brief.decision`, `history`, `state`, `intent` and `productMode`; Expert uses `/api/agent/expert`; the Direct path returns a `reply` field. The response shape of the structured (non-direct) path was not verified. Read `docs/API_CONTRACTS.md`, `src/ConversationScreens.tsx`, `src/conversationRoutes.ts`, `src/expertContext.ts`.
2. **Each env switch is really read and means what the name suggests:** `BIFORGE_GEMINI_DIRECT_MODE`, `WEB_SEARCH_PLANNER`, `WEB_SEARCH_PROVIDER`, `ENABLE_WEB_SEARCH`, `SEARCH_CAROUSEL`, `EPISTEMIC_VERIFIER_ENABLED`, `QUALITY_RETRY_MAX_ELAPSED_MS`. They are present in code; semantics and precedence are unchecked.
3. **Whether a local server starts in CI without a database** (the `start` script migrates only when `DATABASE_URL` is set); otherwise use direct handler calls as the existing Simple Direct test does.
4. **`@google/genai` support for the `googleSearch` tool** in the installed version and the shape of grounding metadata (read `extractGrounding` in `webSearch.ts`; do not import from the frozen module).
5. **Integrity machinery:** how `governance-repo`, `docs-integrity`, `scripts-integrity`, `verification-manifest.json` and `run-dag` treat the new data file, the new test suite and the new docs file. Update every registry in the same delivery.
6. **Telemetry capture** for §7.7 from the local server: application-log events (`conversation_requests`, `simple_direct_search`, `conversation_model_success`, `simple_direct_exchange`) and `/api/diagnostics/all-logs`; choose a capture method that does not touch product code.
7. **Models:** read the allowed IDs in `config/model-sources.json`; pick D at run time; never hard-code IDs in the harness.
8. **Claims marked NOT REPRODUCED in §2** must not be quoted until confirmed.
9. **Production flags:** use the pasted `/health/runtime-config` to set the effective baseline for A and B.

---

## Appendix A — Question record (fields of `config/eval-questions.json`)

| Field | Meaning |
| --- | --- |
| `id` | Stable unique id (e.g. `S01`, `A03`); never reused |
| `category` | statistic, current, lookup, ambiguous, multiturn, chat, explicit\_meta |
| `lang` | Language code of the user turns |
| `turns` | Ordered user turns (and prior assistant turns if replaying a dialogue) |
| `expect.search` | `required`, `forbidden` or `either` |
| `reference` | Object with `value`, `unit`, `territory`, `metric`, `sourceUrl`, `retrievedOn`, `asOf`; or `null` |
| `volatile` | True for values that change; judged by criteria, not a fixed value |
| `acceptableBehaviours` | For ambiguous items: answer with stated interpretation, clarifying question, abstain with reason |
| `mustNotAssert` | Claims that make the answer W if present |
| `notes` | Author’s remarks; never used by the scorer |

Validation rejects: duplicate ids; a scored question without `sourceUrl` and dates; `volatile` with a fixed value; an ambiguous question without `acceptableBehaviours`; any text matching the burned-question terms.

## Appendix B — Required behavioural tests (`tests/eval-harness.test.mjs`)

- Numeric equivalence: decimal comma versus point, percent versus fraction, unit conversion, rounding tolerance.
- Abstention and clarification detection on multilingual fixtures (RU, EN, one more); no dependence on one language’s phrases.
- W detection: a specific figure with no shown source is W; the same figure with a matching source is G.
- Interval maths against known values (for example 0 of 20 gives an upper bound of about 13.9%).
- Blinding: deterministic with a seed; the mapping always recovers the configuration.
- Schema validation rejects each malformed case in Appendix A.
- Negative-control fixture: a no-search answer set scores below a with-search set on lookup items.
- The report carries commit, set hash, model IDs, slot count and runtime snapshot.
- Mutation check done once by hand: deliberately break the scorer and see the suite fail.

## Appendix C — Fields of `eval-report.json`

Run id, commit SHA, version/patch, question-set version and hash, runtime snapshot (deployed and harness), configuration table, per-run records (question id, configuration, repeat index, provider path, model ID, key slot, search decision and reason, query sent, source hosts and count, per-stage latency, LLM calls, answer text, provisional label, final label, infra tag, taxonomy tag), aggregates (counts, rates, intervals, paired disagreements, latency p50/p95), canary result, holdout aggregate, and an explicit `NOT_RUN` list.

## Appendix D — Experiment 0 record (skeleton for `docs/EXPERIMENTS.md`)

**Hypotheses** — H1: native grounding in one call matches or beats A/B at equal model. H2: the model tier is the bottleneck. H3: ambiguity handling is the main failure on statistics. H4: infrastructure noise explains most A/B failures. **Pre-registered thresholds:** §7.4. **Configurations:** §7.1. **Set:** version and hash. **Outcome table:** O1–O6 with the observed pattern. **Results:** `NOT_RUN` until the Navigator dispatches the workflow. **Decision:** empty until labelled. **Next:** exactly one entry from §8.

---

*End of document. The one sentence to remember: nothing about answer quality is true until it is a number that both the assistant and the Navigator can see.*
