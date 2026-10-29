# BiForge — Current Task and Patch Control

**Applied patch line:** P118.5.6 accepted by Navigator → P119.0.1 (three-agent entry UI) → P119.0.2 (boundary inventory, contracts, tests) → P119.0.3 (Conversational/Expert planning and prompt entry isolated; legacy names removed from user copy; CI green, Navigator confirmed) → **P119.0.4** (agent-owned prompt text; agent-named routes; dead legacy import removed).
**Phase:** P119 — migrate to Conversational / Expert / Architect. P119.0.4 moved each agent's intro prompt text into its own file (byte-identical), added `POST /api/agent/conversational` and `POST /api/agent/expert` (compatibility path `POST /api/conversation` kept) and removed the unused legacy IR import from `server.ts`. One HTTP handler and the shared method/contract blocks in `promptPacks.ts` remain until a later slice.
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
- P119.0.4 (OBSERVED in source): `POST /api/agent/conversational` and `POST /api/agent/expert` pin the agent (route beats `body.productMode`); `POST /api/conversation` still selects by `productMode`. Both agents build prompts from their own files; golden hashes prove the model-facing text did not change. `server.ts` no longer imports the legacy IR pipeline; the `engine=legacy` branch remains in `server/projectRoutes.ts` behind `ALLOW_LEGACY_APP_BUILDER=true` (default off; host setting UNKNOWN).

## Next

0. Confirm CI green on the P119.0.4 commit (new tests run inside `test:core`; HTTP route checks R1–R10 run inside `test:pipeline`; `ui-check` is NOT_RUN in the Assistant environment). The intermittent `tsc` stack overflow is mitigated (see NEXT_PATCH); its root cause is still unknown.
1. Verify P119.0.1 source-contract tests, typecheck/build, and the existing regression gates.
2. **P119.0.5 (proposed, needs Navigator inputs):** manual live smoke workflow only for what CI does not cover (each of the three agents starts and answers honestly on a deployed commit). Needs stand access/secrets from the Navigator and a decision on running it. The gated `engine=legacy` branch in `server/projectRoutes.ts` stays until the Navigator confirms `ALLOW_LEGACY_APP_BUILDER` was never set on any host (P119.0.6).
3. Later P119 slices (ROADMAP Phase 6 table): workflows only where `ci.yml`/`ui-check.yml` do not cover, removal of remaining user-visible legacy modes, Architect regression, Release Gate.
4. P120: cross-agent E2E and formal product acceptance. P121 remains optional and requires explicit authorization after P120/open decisions.

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
