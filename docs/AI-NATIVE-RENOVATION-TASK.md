# BiForge — Current Task and Patch Control

**Applied patch line:** P118.5.6 accepted by Navigator → P119.0.1–P119.0.7 (P119 formally closed) → P120.0.1–P120.0.5 (Navigator reports CI green) → P120.0.6 (commit-bound acceptance/evidence workflows; PASS on evidence commit `d411b982186276708d31173f62b574aed19ebd63`) → **P120.0.7** (final acceptance candidate; formal programme closure awaits explicit Navigator decision).
**Phase:** P120 — cross-agent E2E and formal acceptance. The Navigator supplied PASS for both P120 Acceptance Evidence and P120 Commit-Bound Evidence on commit `d411b982186276708d31173f62b574aed19ebd63`; dependencies, verification DAG, Playwright install, UI suite and acceptance workflow conclusion all succeeded with no reported problems. P120.0.7 records this technical result, but formal programme closure remains `PENDING_NAVIGATOR_DECISION`. P118 optional residuals remain explicitly open; P121 is unauthorized without a separate explicit approval.
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

# P120.0.7 — Final acceptance candidate and closure decision (current)

**Technical evidence:** Navigator supplied P120 Acceptance Evidence and P120 Commit-Bound Evidence, both PASS for commit `d411b982186276708d31173f62b574aed19ebd63`. Required checks (dependencies, verification DAG, Playwright installation and P120 UI suite) and acceptance workflow conclusion all succeeded; no problems were reported.

**Applied:** Added the final acceptance candidate record at `docs/p120-acceptance-record.json`, advanced package patch metadata to `120.0.7`, and updated the preflight and evidence-workflow contract test. Product runtime unchanged.

**Current status:** Technical P120 gate PASS. Formal programme closure remains pending an explicit Navigator decision. Optional P118 residuals (PARTIAL download policy and dependency audit for `zod`, `body-parser`, `qs`) remain open and are not claimed resolved. P121 is not authorized.

**Next:** Run CI on the P120.0.7 commit, then ask the Navigator to confirm or decline formal P120 closure with those optional residuals left open.

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

- P120.0.1–P120.0.5 are green per Navigator. P120.0.6 acceptance/evidence workflows have Navigator-supplied PASS evidence for commit `d411b982186276708d31173f62b574aed19ebd63`; formal P120 closure remains pending an explicit Navigator decision.
- `engine=legacy` remains disabled by default; any removal is a separate patch and must preserve the confirmed host-configuration decision.
- Optional P118 dependency audit and PARTIAL-download policy remain open residuals; they are not claimed as resolved.
