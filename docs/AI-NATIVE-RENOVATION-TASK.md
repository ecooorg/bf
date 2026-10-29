# BiForge — Current Task and Patch Control

**Applied patch line:** P118.5.6 accepted by Navigator → P119.0.1 (three-agent entry UI) → P119.0.2 (boundary inventory, contracts, tests) → P119.0.3 (Conversational/Expert planning and prompt entry isolated; legacy names removed from user copy; CI green, Navigator confirmed) → P119.0.4 (agent-owned prompts/routes) → P119.0.5 (live agent smoke workflows) → P119.0.6 (Architect ZIP regression) → **P119.0.7** (commit-bound Release Gate; hosted execution pending).
**Phase:** P119 — release gate. P119.0.7 adds a manual gate for full CI DAG, UI tests, live Conversational/Expert responses, UI/agent-entry smoke, and Architect build/validator/verified-ZIP regression. Evidence is bound to the full checkout commit and Actions run. Formal P119 acceptance remains pending Navigator decision.
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
- P119.0.4 (OBSERVED in source): `POST /api/agent/conversational` and `POST /api/agent/expert` pin the agent (route beats `body.productMode`); `POST /api/conversation` still selects by `productMode`. Both agents build prompts from their own files; golden hashes prove the model-facing text did not change. `server.ts` no longer imports the legacy IR pipeline; the `engine=legacy` branch remains in `server/projectRoutes.ts` behind `ALLOW_LEGACY_APP_BUILDER=true`; Navigator confirmed this setting is not used, so legacy remains disabled by default pending a separately scoped removal patch.

## Current P119.0.7 gate state

- Release gate workflow and evidence writer are implemented.
- Hosted workflow execution, Playwright UI, and live checks: NOT_RUN until dispatched.
- `ALLOW_LEGACY_APP_BUILDER` is not used; keep legacy disabled by default.
- P120 remains blocked until the Navigator explicitly accepts or re-sequences P119.

## Next

1. Dispatch the manual `P119 Release Gate` workflow on the deployed commit.
2. Require full CI DAG, `test:ui`, Conversational/Expert live checks, UI/agent-entry checks, and Architect verified-ZIP regression all PASS and bound to the same full commit SHA.
3. Submit raw evidence for the Navigator's explicit P119 acceptance decision. Do not start P120 before that decision.

## Not authorized / constraints

- Do not claim that the three agents already have fully separate pipelines: this slice updates the entry UI only.
- Do not expose legacy `Simple` or `Project` labels as user-facing agent names.
- Do not treat the optional P118 dependency audit or PARTIAL-download policy as completed.
- Do not start P120 or P121 as part of this patch.
- P119.0.3/P119.0.4 changed structure and route names only (byte-identical prompts); do not describe Conversational and Expert as fully separate pipelines while they share one HTTP handler and the method/contract blocks in `promptPacks.ts`.

## Residual

- Dedicated Conversational/Expert orchestration separation and legacy-path isolation remain P119 work.
- Cross-agent live acceptance remains P120.
- Optional dependency audit and PARTIAL download policy remain open residuals.
