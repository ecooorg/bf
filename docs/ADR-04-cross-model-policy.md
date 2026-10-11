# ADR-04 — Cross-model verification policy (DRAFT)

**Status:** Draft frame; the owner decided the scope on 2026-10-11 (see Decision). The golden-eval report remains a hypothesis only.

## Context
TZ 7.6: verification levels are `none` → `deterministic` → `cross_model` → `human`. `cross_model` needs a verifier from a different provider than the executor. With one provider connected the check is `NOT_RUN(no_second_provider)` and a human decides.

## Rule
- Enabling `cross_model` does **not** depend on the golden-eval result. The golden-eval (P10, BX-14) has 18 tasks; that is too few for a statistical decision. Its report is a **hypothesis only**.
- The owner decides which artifacts get `cross_model` (candidates in TZ 7.6: specification, architecture, ADR, security-relevant changes), and only where mechanical checks are not enough.
- The effect is observed on real data: share of findings accepted by a human, share rejected, verification cost per artifact. The policy may be revised when data accumulates.

## Decision
**Taken by the owner on 2026-10-11 (recommendation accepted in chat).**
- Artifacts covered: specification, architecture, ADR (the candidates of TZ 7.6).
- Only data without sensitive information goes to the verifier: the second provider, Groq, is on a free plan (open or synthetic data only).
- The result of the check is advisory; a human decides.
- Nothing is turned on by this decision: no code runs `cross_model` automatically yet. Review when real data exist (share of findings accepted and rejected, cost per artifact).
- The `quality_class` values A and C in `docs/GOLDEN-EVAL-REPORT.md` were computed on fake adapters (`fake-strong`, `fake-weak`). They are not applied to the model registry.

## Consequences
No automatic `cross_model` step is enabled by any code until a later patch implements it under this policy.
