# BiForge — Current Task and Patch Control

**Applied patch line:** P118.5.6 accepted by Navigator → P119.0.1 (three-agent entry UI) → P119.0.2 (boundary inventory, contracts, tests) → P119.0.3 (Conversational/Expert planning and prompt entry isolated; legacy names removed from user copy; CI green, Navigator confirmed) → P119.0.4 (agent-owned prompts/routes) → P119.0.5 (live agent smoke workflows) → P119.0.6 (Architect ZIP regression) → **P119.0.7** (commit-bound Release Gate; accepted by Navigator) → P120.0.1 (Conversational E2E; CI green per Navigator) → P120.0.2 (Expert error/retry browser E2E; CI green per Navigator) → P120.0.3 (Architect build-to-ZIP browser E2E; CI green per Navigator) → P120.0.4 (Conversational ↔ Expert transition and context-preservation E2E; CI green per Navigator) → P120.0.5 (E2E suite stabilization preflight; CI green per Navigator) → **P120.0.6** (commit-bound acceptance and evidence workflows; awaiting hosted verification).
**Phase:** P120 — cross-agent E2E and formal acceptance. P119 was explicitly closed by the Navigator after P119.0.7 Release Gate PASS on commit `d755db1a9944446c9b062eccb8294cd06c0327b8`. P120.0.1–P120.0.5 are green per Navigator. P120.0.5 adds a dependency-free preflight; P120.0.6 adds manual full-DAG/UI acceptance plus a second workflow that verifies the source evidence against the exact commit and run identity. Hosted verification of P120.0.6 is pending.
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

# P120.0.6 — Commit-bound acceptance and evidence workflows (current)

**Applied:** Added manual `P120 Acceptance` to run the CI verification DAG, evidence script regression tests, Playwright Chromium installation and all P120 UI/E2E tests. The workflow writes an artifact even when checks fail or are skipped. `P120 Evidence` triggers on completion and verifies the source report against the exact SHA, run ID/attempt, workflow conclusion and required outcomes before producing a second report.

**Verification:** Local evidence-script tests and syntax checks are run in the patch workspace. Hosted Actions and browser suite remain NOT_RUN until the workflow is dispatched. P120.0.1–P120.0.5 are green per Navigator.

**Next:** Dispatch `P120 Acceptance` on the intended commit, then review both evidence artifacts. If the evidence workflow is PASS and commit/run identity match, proceed to P120.0.7 formal acceptance and closing documentation. P121 remains unauthorized until P120 is formally closed.

---

# P120.0.4 — Cross-agent transition E2E (history)

**Applied:** Added `tests/p120-agent-transitions-e2e.test.mjs` for Conversational → Expert → Conversational switching, preserving the original goal and prior assistant turn in the active chat, avoiding duplicate requests, and respecting the disabled Architect feature state. Responses are deterministic mocks. Added `test:p120-transitions` and included it in `test:ui`; product runtime unchanged.

**Verification:** Navigator reports CI green. Browser E2E/build are not independently run in this environment.

---

# P120.0.1 — Conversational E2E (history)

**Applied:** Added `tests/p120-conversational-e2e.test.mjs` for a two-turn browser journey through the real local app server: authenticate, choose Conversational, start a conversation, submit a request, receive a deterministic fixture reply, submit a follow-up, and verify history continuity. The test intercepts only `/api/agent/conversational`; it does not claim live provider coverage. `npm run test:ui` includes this scenario, and `npm run test:p120-conversational` runs it alone. Version/patch was `120` / `120.0.1`.

**Verification:** JavaScript syntax PASS; browser E2E and hosted CI are green per Navigator. Live model checks are not part of this deterministic UI test.

Charter conflicts: none

---

# History (previous NEXT_PATCH entries — do not edit)


## Not authorized / constraints

- Do not claim that the three agents already have fully separate pipelines: this slice updates the entry UI only.
- Do not expose legacy `Simple` or `Project` labels as user-facing agent names.
- Do not treat the optional P118 dependency audit or PARTIAL-download policy as completed.
- Do not start P121 without explicit Navigator authorization after P120 acceptance.
- P119.0.3/P119.0.4 changed structure and route names only (byte-identical prompts); do not describe Conversational and Expert as fully separate pipelines while they share one HTTP handler and the method/contract blocks in `promptPacks.ts`.

## Residual

- P120.0.1–P120.0.5 are green per Navigator. P120.0.6 acceptance/evidence workflows remain unverified until dispatched; P120 formal acceptance remains in progress.
- `engine=legacy` remains disabled by default; any removal is a separate patch and must preserve the confirmed host-configuration decision.
- Optional P118 dependency audit and PARTIAL-download policy remain open residuals; they are not claimed as resolved.
