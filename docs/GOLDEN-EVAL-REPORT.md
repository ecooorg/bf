# Golden-eval report

Mode: fake
Date: 2026-10-11
Tasks: 18

## Summary

| Model | Analysis passed | Verify passed | Recall | Precision | F1 | False positives | Units | Shadow cost, USD | Avg latency, ms | Errors | Suggested class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fake-strong/model-a | 10/10 | 8/8 | 100% | 100% | 100% | 0 | 18 | 0.00097125 | 40 | 0 | A (provisional) |
| fake-weak/model-b | 6/10 | 4/8 | 50% | 50% | 50% | 4 | 18 | n/a | 80 | 0 | C (provisional) |

## Per-task results

| Task | Kind | fake-strong/model-a | fake-weak/model-b |
| --- | --- | --- | --- |
| A01 | analysis | pass | FAIL |
| A02 | analysis | pass | pass |
| A03 | analysis | pass | pass |
| A04 | analysis | pass | FAIL |
| A05 | analysis | pass | pass |
| A06 | analysis | pass | pass |
| A07 | analysis | pass | FAIL |
| A08 | analysis | pass | pass |
| A09 | analysis | pass | pass |
| A10 | analysis | pass | FAIL |
| V01 | verify | pass | FAIL |
| V02 | verify | pass | pass |
| V03 | verify | pass | FAIL |
| V04 | verify | pass | pass |
| V05 | verify | pass | FAIL |
| V06 | verify | pass | pass |
| V07 | verify | pass | FAIL |
| V08 | verify | pass | pass |

## Cross-model check

Possible executor/verifier pairs from different providers (hypothesis only; verify F1 of the verifier):

- executor fake-strong/model-a → verifier fake-weak/model-b (verify F1 50%)
- executor fake-weak/model-b → verifier fake-strong/model-a (verify F1 100%)

## Limits

- This report is a **hypothesis**, not a decision. 18 tasks are too few for a statistical conclusion (TZ 7.6).
- Mode `fake`: the run measures the harness (tasks, scoring, report), not any real model. Suggested classes are not applied anywhere.
- Suggested `quality_class` values stay `provisional`; the owner decides what goes into the registry.
- Enabling `cross_model` is the owner's decision under ADR-04 and does not depend on this report.
