# BiForge — Current Task and Patch Control

**Applied patch line:** P118.5.6 accepted by Navigator → **P119.0.1** (three-agent entry UI + status/documentation alignment).
**Phase:** P119 — migrate user-facing entry points to Conversational / Expert / Architect. This first slice changes the product-facing names and descriptions while preserving proven internal route keys; dedicated pipeline separation and legacy-path removal remain later P119 slices.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task, top of `NEXT_PATCH.md`, `docs/ARCHIVE-DELIVERY-CANON.md`, protected root docs.

## Single source for “what now”

This file + **top** entry of `NEXT_PATCH.md`. Do not read phase status from `AGENTS.md`.

## State (OBSERVED)

- Navigator explicitly accepted P118 on 2026-10-29.
- CI handoff for commit `75418945e5d3138bf208704c7f19ab8ea17369fa`, patch `118.5.6`: **PASS 27/27**, no failed, timed-out, blocked, skipped, or policy-skipped checks; evidence marked complete.
- `p118-architect-live` evidence: staged build `SUCCESS`; seven validators passed; three expected source files present; downloaded ZIP returned HTTP 200 and `zipOk: true`; operation/build identifiers match; refusal controls for unconfirmed passport and missing artifact returned truthful failures.
- Remaining P118 residuals (download policy for PARTIAL; dependency audit for `zod` / `body-parser` / `qs`) are optional follow-ups, not blockers to the accepted P118 exit. They are not claimed as audited or resolved.
- P119.0.1: start screen and agent menu now expose Conversational, Expert, Architect; stable internal keys (`Simple`, `Expert`, `Project`) are retained as implementation details during migration.

## Next

1. Verify P119.0.1 source-contract tests, typecheck/build, and the existing regression gates.
2. Next bounded slice: inventory current conversation and project orchestration boundaries; add agent-specific route/UI contracts without changing accepted outcomes.
3. Later P119 slice: isolate/remove legacy selectors and shared paths only after replacement behavior has regression coverage.
4. P120: cross-agent E2E and formal product acceptance. P121 remains optional and requires explicit authorization after P120/open decisions.

## Not authorized / constraints

- Do not claim that the three agents already have fully separate pipelines: this slice updates the entry UI only.
- Do not expose legacy `Simple` or `Project` labels as user-facing agent names.
- Do not treat the optional P118 dependency audit or PARTIAL-download policy as completed.
- Do not start P120 or P121 as part of this patch.

## Residual

- Dedicated Conversational/Expert orchestration separation and legacy-path isolation remain P119 work.
- Cross-agent live acceptance remains P120.
- Optional dependency audit and PARTIAL download policy remain open residuals.
