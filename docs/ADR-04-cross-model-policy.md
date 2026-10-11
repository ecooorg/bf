# ADR-04 — Cross-model verification policy (DRAFT)

**Status:** Draft. The decision belongs to the owner; this file records the frame, not the decision.

## Context
TZ 7.6: verification levels are `none` → `deterministic` → `cross_model` → `human`. `cross_model` needs a verifier from a different provider than the executor. With one provider connected the check is `NOT_RUN(no_second_provider)` and a human decides.

## Rule
- Enabling `cross_model` does **not** depend on the golden-eval result. The golden-eval (P10, BX-14) has 18 tasks; that is too few for a statistical decision. Its report is a **hypothesis only**.
- The owner decides which artifacts get `cross_model` (candidates in TZ 7.6: specification, architecture, ADR, security-relevant changes), and only where mechanical checks are not enough.
- The effect is observed on real data: share of findings accepted by a human, share rejected, verification cost per artifact. The policy may be revised when data accumulates.

## Decision
**Not taken.** Owner fills in: artifacts covered: `____`; date: `____`.

## Consequences
Until the owner decides, no automatic `cross_model` step is enabled by any code.
