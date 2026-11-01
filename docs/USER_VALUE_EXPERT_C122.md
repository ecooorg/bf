# User-value evaluation — Expert Mode (C122 / P122.5)

Automated tests prove structure, recovery, and contracts. They do **not** prove that real users receive useful decisions. Use this checklist after every live-model or staging session.

## A. Live Layer B (required before claiming analytical quality)

Trigger: Actions → expert-verify → `real_model = true` (needs `GEMINI_API_KEY`).

For each scenario A/B/C/E artifact under `artifacts/real-model-eval/`:

| Check | Pass criteria |
|-------|----------------|
| Model call succeeded | no 4xx/5xx in scenario JSON |
| Rubric score ≥ 0.6 | heuristic gate (not human judgement) |
| Human read of excerpt | alternatives real, assumptions labeled, no invented numbers, no forced choice |
| Scenario B (changed info) | invalidates only affected claims, keeps the rest |
| Scenario C | does not treat unsupported user assertion as fact |

Record: run URL, model id, scores, 3–5 sentence human verdict per scenario.

## B. Browser journey (mocked model)

`tests/p122.5-expert-journey-e2e.test.mjs` + existing p120 expert e2e cover:

- entry and method shell
- synthesis quality panel (stage status + recommendation checklist)
- structured final document download
- persistence across reload

If e2e is green, UI path is intact. Still smoke on tablet/staging with a real decision.

## C. Manual tablet smoke (Navigator)

1. Sign in → Expert → start a real personal decision (not the expense fixture).
2. Complete at least BRIEF → UNDERSTAND → EXPAND → SYNTHESIS.
3. Confirm quality panel shows incomplete/gaps honestly.
4. Download `final-decision.txt` and read it: must list facts vs assumptions, risks, unresolved questions, and state user retains control.
5. Kill the tab, reopen, confirm the decision is still there.
6. Inject a wrong assumption deliberately; confirm the product does not treat it as verified fact.

## D. Closure of C122

C122 may be marked **product-accepted** only when:

1. Deterministic suites green (including golden prompt hash after intentional hardening).
2. Layer B live run completed with human review notes (not only TAP pass).
3. Browser journey e2e green on CI.
4. At least one Navigator tablet smoke recorded in TECHNICAL_REPORT.

Until then, status remains: **technically reliable, analytical quality under live evaluation**.
