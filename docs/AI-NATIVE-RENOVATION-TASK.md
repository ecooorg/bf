# BiForge — Current Task and Patch Control

**Current patch:** P118.3 — Spec-stage bounded repair + assistant diagnostics.
**Status:** product change delivered; tests added; hosted CI / live re-run NOT_RUN until apply+deploy.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task, the canonical roadmap, and the user-outcome specification.
**Current specification:** `docs/AI-USER-VALUE-SPEC.md` section A3.
**APP_VERSION:** 119.

## Closed

- P116 accepted with residual B3. P117.3 closed.
- P118.2 / P118.2.1 / P118.2.2: live workflow, CSRF fix, runner evidence enrichment. Live runs #2/#3 = HONEST_NON_PASS (`invalid_spec`, callsUsed=1, no recovery).

## This slice (P118.3)

1. Spec stage: `parseJsonLenient`, `validateSpec` with concrete issues, coerce `schemaVersion "1"`→1, one recovery call that lists previous issues (A3 bounded repair).
2. Diagnostics: events `spec_attempt`/`spec_repair`/`spec_failed`/`spec_accepted`/`spec_coerced`/`plan_attempt`/`plan_validate_failed` with text previews; adapter logs model responsePreview and forwards event data into application logs; `error.detail.issues`.
3. Tests: `tests/app-builder-spec-repair-p118.test.mjs`.
4. Version 119.

## Next

- Apply → green CI → deploy 119 → dispatch P118 architect live.
- Use new diagnostics to confirm repair path or remaining model/provider issues.
