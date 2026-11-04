# C126 — User-level validation (P126.5)

**TZ reference:** C126 §12.D and §13 P126.4 (delivered as repository patch **P126.5**).  
**Status date:** 2026-11-04.  
**Enablement decision:** **KEEP GATED** — `BIFORGE_GEMINI_DIRECT_MODE` remains opt-in (`true` required). Full default enablement is deferred until live comparative evidence exists.

## 1. Purpose

Validate that Simple Mode as Direct Gemini Conversation:

1. Delivers non-empty useful replies when Gemini can answer.
2. Does not block on search, planner, or internal quality stages.
3. Preserves history, attachments, Retry, Safety, Expert/Architect isolation.
4. Does not claim superiority over direct Gemini without measured comparison.

This document is the evidence ledger. Labels follow AGENTS.md G5:

| Label | Meaning |
| --- | --- |
| **OBSERVED** | Inspected in this delivery (source / structural test / hosted build). |
| **INFERRED** | Reasonable conclusion from OBSERVED facts; not independent measurement. |
| **NOT_RUN** | Requires live providers, production/preview, or human comparison not executed here. |

## 2. Structural acceptance (code path)

| Criterion | Status | Evidence |
| --- | --- | --- |
| Simple Direct handler exists and returns model text without rewrite | OBSERVED | `server/simpleDirectConversation.ts`, `tests/p126-1` |
| Path gated by `BIFORGE_GEMINI_DIRECT_MODE === 'true'` | OBSERVED | `server.ts` gate; CI tests force `false` and keep structured pipeline |
| No intent / mode / epistemic / search-planner in direct branch | OBSERVED | Architectural tests p126-1..3, p126-5 |
| Search fail-open; generation continues | OBSERVED | `resolveOptionalSearch`, p126-2 |
| Key + model carousel reused (no second carousel) | OBSERVED | `generateGeminiPassThrough` |
| Expert / Architect routes unchanged | OBSERVED | route pins + isolation tests |
| SafetyBox / distress outside direct branch | OBSERVED | gate `!distressMarkerDetected` |
| Typecheck / production build (hosted) | OBSERVED | Render green after P126.4 |
| Hosted Core CI full TAP after P126.5 | NOT_RUN | Queue / runner dependent |

## 3. Comparative scenario matrix (30)

Live dual-run (direct Gemini API vs BiForge Simple with `BIFORGE_GEMINI_DIRECT_MODE=true`) is **NOT_RUN** in this sandbox (no provider keys, no production access, no browser session on deploy).

| # | Category | Scenario (prompt intent) | Live dual-run | Notes |
| --- | --- | --- | --- | --- |
| 1 | Simple Q | What is a hash table? | NOT_RUN | |
| 2 | Simple Q | Convert 37°C to °F | NOT_RUN | |
| 3 | Simple Q | One-sentence summary of photosynthesis | NOT_RUN | |
| 4 | Simple Q | Difference between TCP and UDP | NOT_RUN | |
| 5 | Simple Q | Name three primary colours | NOT_RUN | |
| 6 | Complex | Trade-offs of microservices vs monolith for a 5-person team | NOT_RUN | |
| 7 | Complex | Explain Bayesian updating with a medical test example | NOT_RUN | |
| 8 | Complex | Design a weekly meal plan under a budget constraint | NOT_RUN | |
| 9 | Complex | Compare two pricing strategies for a SaaS trial | NOT_RUN | |
| 10 | Complex | Risks of fine-tuning a small LLM on proprietary data | NOT_RUN | |
| 11 | Practical | Steps to rotate Postgres credentials safely | NOT_RUN | |
| 12 | Practical | How to write a polite decline email for a meeting | NOT_RUN | |
| 13 | Practical | Checklist before publishing an npm package | NOT_RUN | |
| 14 | Practical | Diagnose slow Node.js API (first hypotheses) | NOT_RUN | |
| 15 | Practical | Packing list for a 3-day hiking trip | NOT_RUN | |
| 16 | Estimate | Rough monthly cost of a small Kubernetes cluster | NOT_RUN | |
| 17 | Estimate | Order-of-magnitude tokens for a 20-page PDF summary | NOT_RUN | |
| 18 | Estimate | Time to drive 400 km average road | NOT_RUN | |
| 19 | Multi-turn | Turn 1: prefer lower cost. Turn 2: then choose A vs B. Turn 3: risk before choosing A | NOT_RUN | History compaction |
| 20 | Multi-turn | Clarify ambiguous “it” referring to prior assistant entity | NOT_RUN | |
| 21 | Multi-turn | User corrects a prior fact; assistant should adapt | NOT_RUN | |
| 22 | Freshness | Explicit “search the web for …” current event | NOT_RUN | Search fail-open |
| 23 | Freshness | Weather-like query where connector may apply | NOT_RUN | |
| 24 | Freshness | “What changed in Node 22?” without explicit search verb | NOT_RUN | Auto-search policy |
| 25 | Document | Question against attached short text file | NOT_RUN | |
| 26 | Document | Question against attached PDF bytes | NOT_RUN | |
| 27 | Document | Question against attached image (describe / extract) | NOT_RUN | |
| 28 | Failure | All keys exhausted / model cooldown → technical error + Retry | NOT_RUN | |
| 29 | Failure | Empty model text → not presented as success | NOT_RUN | Structural unit OBSERVED |
| 30 | Safety | Distress marker → SafetyBox path, not direct rewrite | NOT_RUN | Structural OBSERVED |

**Scoring dimensions (when live):** non-empty rate, relevance, context retention, latency, technical refusal count. Do not declare BiForge superior without completed dual-run totals.

## 4. Production / preview check

| Check | Status |
| --- | --- |
| Render build after P126.4 (typecheck + server build) | OBSERVED green (Navigator report) |
| Runtime with `BIFORGE_GEMINI_DIRECT_MODE=true` on preview | NOT_RUN |
| Runtime default (`false` / unset) structured path | INFERRED healthy from CI design |
| Owner-authorised production default flip | NOT_RUN — requires explicit owner decision after live matrix |

## 5. Enablement decision (binding for this patch)

1. **Default remains off** unless `BIFORGE_GEMINI_DIRECT_MODE=true`.
2. CI and existing fake-Gemini suites continue to set the flag to `false`.
3. Owner may enable on preview/production by setting the env var after reviewing live dual-run results against the matrix above.
4. This patch does **not** perform production deployment and does **not** claim user-outcome PASS.

## 6. How to complete validation later (owner / assistant with keys)

1. Set `BIFORGE_GEMINI_DIRECT_MODE=true` on a preview service.
2. Run the same 30 prompts against (a) Google AI Studio / Gemini API and (b) BiForge Simple.
3. Fill a copy of the matrix with OBSERVED rows and aggregate rates.
4. Only then consider flipping the default or removing the gate in a subsequent patch.

