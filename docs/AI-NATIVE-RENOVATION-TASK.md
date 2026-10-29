# BiForge — Current Task and Patch Control

**Applied patch line:** P118.5.6 accepted by Navigator → P119.0.1 (three-agent entry UI) → **P119.0.2** (agent boundary inventory, contracts, regression tests; no runtime change).
**Phase:** P119 — migrate to Conversational / Expert / Architect. P119.0.1 changed product-facing names; P119.0.2 recorded and locked the boundaries (TECHNICAL_SPECIFICATION §6.4). Pipeline separation of Conversational/Expert and legacy-path removal are P119.0.3.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task, top of `NEXT_PATCH.md`, `docs/ARCHIVE-DELIVERY-CANON.md`, protected root docs.

## Single source for “what now”

This file + **top** entry of `NEXT_PATCH.md`. Do not read phase status from `AGENTS.md`.

## State (OBSERVED)

- Navigator explicitly accepted P118 on 2026-10-29.
- CI handoff for commit `75418945e5d3138bf208704c7f19ab8ea17369fa`, patch `118.5.6`: **PASS 27/27**, no failed, timed-out, blocked, skipped, or policy-skipped checks; evidence marked complete.
- `p118-architect-live` evidence: staged build `SUCCESS`; seven validators passed; three expected source files present; downloaded ZIP returned HTTP 200 and `zipOk: true`; operation/build identifiers match; refusal controls for unconfirmed passport and missing artifact returned truthful failures.
- Remaining P118 residuals (download policy for PARTIAL; dependency audit for `zod` / `body-parser` / `qs`) are optional follow-ups, not blockers to the accepted P118 exit. They are not claimed as audited or resolved.
- P119.0.1: start screen and agent menu now expose Conversational, Expert, Architect; stable internal keys (`Simple`, `Expert`, `Project`) are retained as implementation details during migration.

- P119.0.2 (OBSERVED in source): Conversational and Expert share `POST /api/conversation`, one handler and one prompt builder, selected only by `productMode === 'Expert'`; Expert also owns 13 step routes. Architect is isolated (`/project`, `/api/projects/*`, `appBuilder/`, own client modules). Workflows: `ci.yml` + `ui-check.yml` gate push/PR; live workflows are manual; no `p119-*` workflow exists. Locked by `tests/p119-agent-boundaries.test.mjs`.

## Next

0. Confirm CI green on the P119.0.2 commit (new tests run inside `test:core`).
1. Verify P119.0.1 source-contract tests, typecheck/build, and the existing regression gates.
2. **P119.0.3 (next):** split the shared Conversational/Expert handler and prompt builder into agent-owned paths behind the unchanged request contract; update the `KNOWN_SHARED_PATH` tests in the same patch.
3. Later P119 slices (ROADMAP Phase 6 table): workflows only where `ci.yml`/`ui-check.yml` do not cover, removal of remaining user-visible legacy modes, Architect regression, Release Gate.
4. P120: cross-agent E2E and formal product acceptance. P121 remains optional and requires explicit authorization after P120/open decisions.

## Not authorized / constraints

- Do not claim that the three agents already have fully separate pipelines: this slice updates the entry UI only.
- Do not expose legacy `Simple` or `Project` labels as user-facing agent names.
- Do not treat the optional P118 dependency audit or PARTIAL-download policy as completed.
- Do not start P120 or P121 as part of this patch.
- P119.0.2 changed no runtime behaviour; do not describe the agents as separate pipelines until P119.0.3 lands.

## Residual

- Dedicated Conversational/Expert orchestration separation and legacy-path isolation remain P119 work.
- Cross-agent live acceptance remains P120.
- Optional dependency audit and PARTIAL download policy remain open residuals.
