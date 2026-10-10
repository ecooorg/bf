# BiForge Resource Economy Principles

> **Document:** RESOURCE_ECONOMY · **Aligned with:** TZv3.0 (`docs/BiForge_TZ_v3.md`), principles in section 2, decision D-09, section 14 · **Date:** 9 October 2026

## Objective
Achieve the maximum useful result with the minimum necessary consumption of tokens, time, compute, network, storage, and external API calls, without compromising correctness, safety, or required quality.

## Priority (D-09)
Verified quality of the result comes before cost, under hard budgets. Savings come from determinism, caching, and routing, not from skipping checks. Economy is not an excuse to skip necessary tests, security checks, or independent review of high-risk changes. Optimize the total cost of achieving a verified result, not merely the number of model calls.

## Rules
- Prefer deterministic local tools for deterministic tasks; use an AI model when reasoning or generation adds real value (TZv3.0, principle 2.5).
- One model call is better than two unless the second measurably improves quality (principle 2.6). Independent verification is switched on by policy (criticality, absence of mechanical checks), not on every request (principle 2.7).
- Send only the context relevant to the current task: the assigned SPEC section, current project state, relevant artifacts, and concise prior reports.
- Avoid repeatedly sending full conversation history when a compact state or artifact reference is sufficient.
- Reuse valid outputs and caches when safe; invalidate them when their inputs or assumptions change.
- Route tasks to the least expensive suitable model; use stronger models for genuinely difficult, high-risk, or review-critical work. Models are chosen through the registry, not hard-coded (D-13).
- Batch independent low-risk operations when this reduces overhead, but do not combine plan steps (`BX-XX`) in a way that obscures acceptance or rollback.
- Avoid duplicate file copies; prefer stable artifact identifiers, hashes, manifests, and version references where supported.
- Respect provider quotas, rate limits, timeouts, and retry guidance. Every loop is bounded by a number of attempts, a budget, and a no-progress signal (principle 2.10); no uncontrolled retry loops.
- Measure resource use where telemetry is available (the usage ledger); do not fabricate measurements.

## Budgets and limits
Default targets are starting values and are refined by measurements (BX-14, BX-26); see TZv3.0, section 14.3:

| Area | Limit |
| --- | --- |
| Run | 4 model calls |
| Task | 12 calls, 2 repair attempts |
| Reference end-to-end scenario (section 18.1) | at most 12 model calls |
| Small S3 project | at most 60 model calls and 8 code-executor runs, repairs included |
| Paid provider, monthly spending limit | Set in the provider console (MUST) and duplicated in the project passport |

- Exceeding a budget gives `BLOCKED(budget)` and a request to the human; it is never silently retried.
- For each paid provider a spending limit or alert is configured on the provider side, and a daily call cap in the application. 80% of the budget is a warning; 100% stops new calls (section 14.4).
- Development tools used for BiForge itself (Part B) are outside the product budget; the product's API usage is under budget (R-15).

## Where the human's time goes
The real bottleneck is the owner's time for review and for writing or approving expectation tests, then API cost during golden-eval and experiment E-01 (section 3.4). Small steps, the light process for steps without ★, and the review checklist protect that time; the review itself is never dropped.
