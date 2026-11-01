# Information Quality Workflow — Simple, Expert and Architect

## Purpose

A build passing syntax checks is not evidence that its information is correct. This workflow evaluates the delivered answer and the path that produced it. Run the same scenario set against all three modes; compare modes on identical inputs, with the same evidence snapshot and a clean conversation state.

## 1. Test layers

### A. Deterministic contract tests (every commit)
- Search continuity: follow-up turns such as “in Celsius?” retain the prior city/topic; unrelated complete queries are not polluted by history.
- Provenance: a source footer contains only sources from the current lookup; no source list survives a skipped/failed lookup.
- Grounding: every current/live numeric claim is traceable to the current evidence packet or explicitly marked as an estimate/general knowledge.
- Evidence boundaries: distinguish source text, user assertions, assumptions, inference and unknowns.
- No silent substitution: failed or malformed providers produce unavailable/null values, never plausible fabricated defaults.
- Mode contract: Simple answers the immediate question; Expert maintains analytical continuity and updates only affected conclusions; Architect emits a coherent, executable artifact and honest validation status.
- Regression safety: malformed/truncated provider output, empty search results, stale cache, timeout, cancellation and partial build must never be represented as verified success.

### B. Scenario suite (nightly and before release)

Run at least these scenario families in each mode:

| Family | Required cases | What must be checked |
|---|---|---|
| Current facts | weather, exchange rate, current release, policy rate | correct place/entity, timestamp, source freshness, units, no stale numbers |
| Follow-up continuity | “what about Celsius?”, “and tomorrow?”, correction of city | referents retained; corrected facts replace only affected claims |
| Source conflict | official source vs aggregator; two conflicting dates/values | conflict surfaced; source authority and recency explained |
| Thin evidence | titles only, empty snippets, page fetch failure | answer calibrated; no fabricated detail; second focused lookup where useful |
| User-provided evidence | attachment plus question; contradictory attachment | attachment treated as data; key claims tied to relevant passages |
| Quantitative reasoning | conversion, averages, ranges, date arithmetic | reproducible calculation; input values and assumptions explicit |
| Ambiguous intent | short query, ambiguous entity, underspecified decision | answer what is safely inferable; ask one decisive question only if needed |
| Error recovery | provider timeout, malformed JSON, model retry, stale cache | graceful fallback; no false claim of verification; retry improves rather than repeats |
| Long dialogue | 6+ turns, new evidence, changed goal | no reset, no contradiction with retained valid findings |
| Adversarial input | prompt injection in attachment/web page, malicious code comments | external content never overrides system or mode contract |

### C. Human blind review (release candidate)

Two reviewers score anonymized outputs without knowing the mode. Resolve disagreements by citing the evidence packet, not preference. For factual scenarios, a reviewer must independently verify the reference answer from the captured primary sources.

## 2. Mode-specific acceptance

### Simple
- Direct answer appears in the first 1–2 sentences.
- Response length matches task complexity; no forced decision framework.
- Every current factual claim is supported by the current lookup or clearly labelled as approximate.
- Follow-up search includes the inherited entity/topic when the latest message is elliptical.
- Source links are from this turn and relevant to the answer.
- If evidence is insufficient, give the best bounded answer and state the decisive missing fact without inventing an explanation.

### Expert
- Direct factual questions remain direct; decision requests receive structured analysis.
- Facts, user assertions, assumptions, hypotheses and unknowns are distinguishable.
- New turns explicitly state which previous conclusions change and which remain valid.
- Competing hypotheses have discriminating evidence/tests, not merely a longer list of possibilities.
- Recommendations do not seize the user's decision unless explicitly requested.
- Research claims identify what was actually verified and what remains inference.

### Architect
- Plan declares file map, module system, interfaces, data schema and acceptance criteria before code generation.
- Every local import resolves; every named/default import exists; no mixed classic/module loading.
- Every user action is traced UI → handler → service → result rendering.
- Provider failures are visible and excluded from aggregates; no fabricated measurements or success placeholders.
- Static checks are labelled static. Runtime behavior is only marked verified after executing the artifact in an isolated browser/runtime with deterministic mocked network responses.
- A partial build is not a successful build, and failed behavioral acceptance cannot be overridden by keyword checks.

## 3. Scoring rubric (0–4 each)

1. **Factual correctness** — 0 materially false; 2 mostly correct with meaningful gaps; 4 all material claims correct.
2. **Evidence/provenance** — 0 invented or stale sources; 2 partial traceability; 4 every material current claim traceable.
3. **Relevance/completeness** — 0 misses task; 2 answers core but misses important needs; 4 fully answers requested scope without padding.
4. **Calibration** — 0 false certainty; 2 caveats incomplete; 4 uncertainty precisely matched to evidence.
5. **Reasoning integrity** — 0 invalid inference/calculation; 2 plausible but under-explained; 4 sound, reproducible reasoning.
6. **Continuity** — 0 loses/corrupts context; 2 partial update; 4 preserves valid state and updates affected claims.
7. **Usability** — 0 not actionable/readable; 2 usable with friction; 4 clear and appropriately concise.

Maximum: 28. Hard gates override score:
- Any fabricated citation, fabricated live measurement, or silent fabricated fallback = FAIL.
- Wrong city/entity in a live lookup = FAIL.
- Material contradiction with the evidence packet = FAIL.
- Architect artifact that does not load or core user path fails = FAIL.
- Claiming runtime tests ran when only static checks ran = FAIL.

Release target: average ≥24/28, no dimension average <3.3, zero hard-gate failures, and no scenario family below 21/28. Report per-mode median, worst-case, hard-gate count and confidence interval; do not compare modes using different prompts, evidence, or budgets.

## 4. Evidence packet and reproducibility

For each scenario, preserve:
- scenario ID, exact user-turn sequence, mode and mode configuration;
- frozen source URLs, retrieval timestamp, extracted snippets/page text and content hashes;
- expected key claims, acceptable ranges/units, unacceptable claims and reference rationale;
- raw model response, normalized response, sources shown to user, retry decision and validator findings;
- build artifact hash and runtime console/network trace for Architect.

Never include API keys, private user data or unredacted attachment contents in shared evaluation artifacts.

## 5. Execution workflow

1. Run deterministic unit tests and typecheck.
2. Run each scenario in Simple, Expert and Architect from a clean state with the same evidence packet.
3. Run follow-up sequences without resetting state.
4. Run source/provenance and numeric-claim audit.
5. For Architect, parse modules, link imports/exports, launch in isolated browser with mocked APIs, execute every declared acceptance path and capture console/network failures.
6. Run blind human scoring; adjudicate every hard-gate failure.
7. Compare against the previous release by scenario, not only aggregate score. Any regression in a hard gate blocks release.
8. Publish a report containing pass/fail by mode, scores by dimension, source freshness, stale-source count, unsupported-claim count, continuity regressions, runtime failures and known limitations.

## 6. Executable evaluator

The deterministic runner `scripts/information-quality-eval.mjs` enforces current-turn source provenance, current-fact disclosure, expected/forbidden claim checks, Architect static/runtime/module gates, seven manual 0–4 scores and hard-failure flags. It deliberately does not pretend to establish factual truth from text matching: factual correctness still requires reference evidence and blind review.

Input may be a JSON array or JSONL. Each record includes:
- `scenarioId`, `mode` (`simple|expert|architect`), `reply`;
- optional `mustInclude`, `mustNotInclude`;
- `currentFactExpected`, `searchStatus`, `replyMarksUnverified`;
- `currentSources` and `shownSources` (each item has `url` or `id`);
- Architect fields `artifactOutcome`, `staticChecksPassed`, `runtimeChecksPassed`, `importContractsPassed`, `noFabricatedFallbacks`;
- `scores` with all seven rubric dimensions as integers 0–4;
- hard-gate booleans from section 3.

Example invocation:

```bash
node scripts/information-quality-eval.mjs --input ./evaluation/results.jsonl --out ./evaluation/report.json
```

The command exits non-zero if any scenario fails. Human reviewers should fill scores only after verifying the evidence packet. Do not manufacture scores to make a release pass.

## 7. Commands

The repository already provides granular suites. Minimum pre-release sequence:

```bash
npm run typecheck
npm run test:web
npm run test:turn
npm run test:app-builder
npm run test:ui
npm run gate:eval
```

The commands above are necessary but not sufficient for information quality: the frozen scenario suite and blind review in sections 2–5 are mandatory. Do not interpret a green CI badge as a factual-accuracy result.
