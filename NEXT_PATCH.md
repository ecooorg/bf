# P120.0.2 — Expert E2E (current)

**Applied:** Added authenticated Expert browser E2E with deterministic 503 provider failure, retry, successful answer and follow-up history checks. Added to `test:ui`; product code unchanged. P120.0.1 CI green per Navigator.

**Verification:** JavaScript syntax and ZIP integrity PASS locally. Browser test and full CI NOT_RUN locally. Next P120.0.3: Architect E2E ZIP integrity. Do not start P121.

Charter conflicts: none

---

# P120.0.1 — Conversational E2E (current)

**Applied:** Added `tests/p120-conversational-e2e.test.mjs` for a two-turn browser journey through the real local app server: authenticate, choose Conversational, start a conversation, submit a request, receive a deterministic fixture reply, submit a follow-up, and verify history continuity. The test intercepts only `/api/agent/conversational`; it does not claim live provider coverage. `npm run test:ui` includes this scenario, and `npm run test:p120-conversational` runs it alone. Version/patch is `120` / `120.0.1`.

**Verification:** `node --check tests/p120-conversational-e2e.test.mjs` PASS. Browser E2E, `npm run test:ui`, full CI, and live model checks NOT_RUN in this environment because dependencies/Chromium are unavailable.

**Next:** P120.0.2 — Expert E2E scenarios and error paths, per `docs/p119-p121.md`. Keep live provider acceptance separate from deterministic local UI coverage. P119 is accepted by Navigator; do not start P121.

Charter conflicts: none

---

# History (previous NEXT_PATCH entries — do not edit)

# P119.0.7 — Commit-bound Release Gate (current)

**Navigator decisions:** P118 formally accepted; `ALLOW_LEGACY_APP_BUILDER` is not used. CI is green; the P119 Architect ZIP regression was previously red on a false deployment-mismatch comparison and the preflight hotfix was supplied. P119.0.7 now consolidates the release gate; this patch itself is not accepted until hosted execution evidence is reviewed.

**Applied:**
- Added manual `.github/workflows/p119-release-gate.yml` to run the complete CI DAG, Playwright UI checks, live Conversational and Expert responses, UI and agent-entry smoke, and Architect build/validators/verified ZIP download.
- Added `scripts/p119-release-evidence.mjs`, which writes `p119-live/release-gate.json` bound to full `GITHUB_SHA` and Actions run identity. Any skipped or failed required check makes the gate FAIL.
- `package.json` patch is `119.0.7`; full `CHANGELOG.md` and current task/roadmap handoff updated.
- Legacy remains disabled by default; no runtime or prompt behavior changed.

**Verification status:** JavaScript syntax and archive integrity are checked locally. Full hosted CI, Playwright UI, and live release-gate workflow are NOT_RUN in the Assistant environment. Evidence from the workflow is still raw evidence; only Navigator can formally accept P119.

**Next:** dispatch `P119 Release Gate` on the deployed commit. If any check fails or is skipped, repair that check and rerun. If all pass, present the commit-bound artifact to Navigator for the explicit P119 close decision. Do not begin P120 before that decision.

Charter conflicts: none

---

# History (previous NEXT_PATCH entries — do not edit)

# P119.0.6 — Architect regression workflow (current)

**Applied:** Manual `p119-regression` reuses P118 Architect task-to-ZIP runner and its validators/refusal controls. A strict `/health` commit preflight prevents evidence from being attributed to an unverified deployment. Advanced project JSON is a diagnostic panel, not a fourth agent; keep it gated. `engine=legacy` remains explicitly gated and default-disabled because host usage is UNKNOWN.

**Verification:** JavaScript syntax and boundary tests to be checked locally; live regression NOT_RUN without staging. CI for this commit UNKNOWN until GitHub runs.

**Next:** Navigator deploys the matching commit, runs `p119-regression`, reports results and confirms whether `ALLOW_LEGACY_APP_BUILDER=true` is configured on any host. Do not remove legacy branch until confirmed safe. P119.0.7 release gate follows successful regression and Navigator approval.

Charter conflicts: none

---

# P119.0.5 — Manual live agent smoke (current)

**Applied:** Two manual-only workflows (`p119-agent-contracts`, `p119-ui-smoke`) run `scripts/p119-live-smoke.mjs` against an HTTPS staging service. They require `STAGING_SERVICE_URL`, `STAGING_APP_PASSWORD`, and a `/health` deployed commit matching the workflow checkout SHA (7-character prefix). No automatic CI duplication; no changes to runtime agents. Evidence JSON and job summaries contain no prompts, responses or credentials.

**Coverage boundary:** Conversational and Expert real response checks; Architect authenticated availability and project-list route; served UI HTML and agent entry endpoints. NOT a browser interaction test and NOT Architect build/ZIP regression (P119.0.6). Full P119 release acceptance remains P119.0.7.

**Verification:** JS syntax PASS; live smoke NOT_RUN (staging secrets/deployment not available in Assistant environment). CI status for this commit UNKNOWN until GitHub runs.

**Next:** Navigator confirms staging secrets exist in GitHub Actions and that the exact patch commit is deployed, then manually dispatches both workflows. P119.0.6 follows only after results and Navigator decision about Advanced tab; retain gated `engine=legacy` until host usage confirmed.

Charter conflicts: none

---

# History (previous NEXT_PATCH entries — do not edit)

# P119.0.4 — Agent-owned prompt text, agent-named chat routes, dead legacy import removed (current)

**Navigator decisions (2026-10-29):** (1) add agent-named routes, keep `POST /api/conversation`; (2) `ALLOW_LEGACY_APP_BUILDER` host usage unknown → remove only the dead import, keep the gated branch.

**Applied:**
- Agent prompt text now lives in `server/conversationalAgent.ts` and `server/expertAgent.ts` (intro paragraphs; Expert also owns `expertDialogueParagraph`, `EXPERT_STAGES`, `EXPERT_STEP_PREFIX`). `server/promptPacks.ts` = shared method/boundary/contract blocks + `assembleConversationPrompt(intros, …)`. `server.ts` imports `EXPERT_STEP_PREFIX` from `expertAgent.ts`.
- Byte identity: golden SHA-256 values (captured from the P119.0.3 code before the move) in `tests/p119-agent-prompts-routes.test.mjs`. If a golden test fails, the prompt text changed — that is a regression, not a hash to refresh.
- Routes: `server/agentRouting.ts` exports `CONVERSATION_ROUTES` and `pinConversationAgent`; `server.ts` registers the three paths as string literals on purpose (the generated route inventory reads literals; a test ties them to `CONVERSATION_ROUTES`). Client: `src/conversationRoutes.ts` (`chatRoute`, `isChatRoute`); `App.tsx` uses `isChatRoute` where it used to compare with `/api/conversation` (decision-file attachment rule unchanged).
- `server.ts`: unused import of `runAppBuilderPipeline` / `irFromPlainAnswers` removed. `server/projectRoutes.ts` untouched.
- Test helper `tests/_prompts.mjs` (`buildAgentPrompt`) for tests that need a prompt by legacy `productMode`.
- Regenerated: `docs/generated-route-inventory.json`, `generated-module-map.json`, `generated-check-graph.json`, `generated-capability-graph.json` (env/migration inventories differed only by timestamp and were not shipped).
- Patch `119.0.4`.

**Verification (Assistant environment, Node 22.22.2):** `npm run check` PASS 23/23 (includes `test:core`, `test:pipeline` with R1–R10, `typecheck`, `architecture:check`); `npm run test:p119-agents` 40/40; `npm run build` PASS; `node scripts/docs-integrity.mjs` PASS; `npm run docs:check` OK. NOT_RUN: `npm run test:ui` (Playwright Chromium not installed, download blocked), DAG profile `ci` (needs `DATABASE_URL`), live scenarios, hosted CI on the commit.

**Still shared on purpose:** one HTTP handler (`conversationHandler`), method/contract blocks in `promptPacks.ts`, wire key `productMode` (still sent by the client for Expert; harmless, the route wins), internal `AppMode` keys, Expert step route names, the gated `engine=legacy` branch in `server/projectRoutes.ts`. The legacy compatibility path `/api/conversation` is still used by `scripts/evidence-collect.mjs`, `scripts/p117-3-live-retest.mjs` and many tests; retire it only after P120 and a Navigator decision.

**Open (Navigator):** was `ALLOW_LEGACY_APP_BUILDER=true` ever set on any host? If never → a later slice may delete `engine=legacy`, `runAppBuilderPipeline` and its tests. UNKNOWN until answered.

**Next:** P119.0.5 — a manual live-smoke workflow only for what CI does not cover; needs stand access/secrets from the Navigator before starting (ask first, with a recommendation). Do not start P120/P121.

Charter conflicts: none

---

# History (previous NEXT_PATCH entries — do not delete)

# P119.0.3 — Conversational/Expert isolation (first bounded step) + legacy names removed from user copy (current)

**Applied:**
- New `server/agentRouting.ts` (only place that selects the agent: Expert iff `body.productMode === 'Expert'`), `server/conversationalAgent.ts`, `server/expertAgent.ts` (turn planning + prompt entry each). `server.ts` handler now calls `planConversationTurn` / `buildConversationTurnPrompt`; it no longer builds prompts or Expert paragraphs. Prompts and plans are byte-identical to the pre-split logic (tested against a reference copy of the old code).
- User-visible legacy names removed: in-app guide (`src/UserGuide.tsx`: "Simple chat", "Simple mode", "Project mode/workspace", "Expert method") and the Architect confirmation dialog in `src/App.tsx` now say Conversational / Expert / Architect. "Simple words" (Architect beginner path name) is intentionally kept.
- New `tests/p119-agent-isolation.test.mjs` (in `test:core`; `npm run test:p119-agents`). `tests/p119-agent-boundaries.test.mjs` updated: selection/Expert-promotion checks point at the new modules; `KNOWN_SHARED_PATH` now describes what is still shared.
- Compared with `docs/p119-p121.md`: P119 table, P120 slice plan (0.1–0.7, conditional 0.8), gates and transition rules carried into `ROADMAP.md` Phase 6/7; the file got a pointer note.
- Patch `119.0.3`.

**Still shared on purpose (compatibility, not claimed as separated):** HTTP route `POST /api/conversation` and handler, wire key `productMode`, internal `AppMode` keys (`Simple`/`Expert`/`Project`), `promptPacks.ts` text, Expert step routes' names, legacy IR pipeline import in `server.ts` (gated by `engine=legacy` + `ALLOW_LEGACY_APP_BUILDER=true`).

**Verify:** CI green on this commit (DAG `ci`, `ui-check`). Locally `npm run test:p119-agents`.

**Finding and mitigation (Tier 1, disclosed):** `tsc --noEmit` failed intermittently (~1 of 2 runs here, also on the unmodified P119.0.2 tree) with `RangeError: Maximum call stack size exceeded`; hosted CI could hit it at random. Root cause not isolated (no long operator chains found; likely deep JSX/conditional nesting near the default Node stack). Mitigation: `typecheck`, `lint` and `build:server` now run `node --stack-size=4000 node_modules/typescript/bin/tsc …` (below the 8192 KB OS stack limit); 6/6 consecutive local runs clean. Guarded by a test. Underlying nesting is still UNKNOWN.

**Next:** P119.0.4 (proposed, needs Navigator yes): split agent-specific prompt packs out of `promptPacks.ts`, decide on route aliases, remove the legacy IR pipeline import if no deployment uses it. Then P119.0.5 workflows only for CI gaps. Do not start P120/P121.

Charter conflicts: none

---

# History (previous NEXT_PATCH entries — do not delete)

# P119.0.2 — Agent boundaries: inventory, contracts, regression tests (current)

**Applied (no runtime behaviour change):**
- Inventory of routes, internal modes, workflows and shared orchestration → `TECHNICAL_SPECIFICATION.md` §6.4 (boundary map) with REQ-AGENT-001..003.
- Finding (OBSERVED): Conversational and Expert still share `POST /api/conversation`, one handler and one prompt builder, selected only by `body.productMode === 'Expert'`. Expert additionally owns 13 step routes. Architect is already isolated (`/project`, `/api/projects/*`, `appBuilder/`, own client modules).
- New `tests/p119-agent-boundaries.test.mjs` (21 tests; in `test:core`, also `npm run test:p119-agents`): route ownership, client↔route isolation, import isolation, explicit agent selection, Architect gating, workflow inventory, `KNOWN_SHARED_PATH` debt locks. Mutation-checked: each deliberate boundary break fails a test.
- `tests/p119-agent-ui-contract.test.mjs`: patch assertion relaxed from the exact `119.0.1` to `119.*` so later P119 slices do not need to edit it.
- ROADMAP P119 slice plan reconciled (see ROADMAP Phase 6 table); it supersedes the numbering in `docs/p119-p121.md` (Navigator-authored plan: 0.2 inventory, 0.3 contracts, 0.5 removal). Per the Navigator's latest plan: 0.2 = boundaries (this patch), 0.3 = legacy isolation.
- Patch `119.0.2` (`package-lock.json` carries only the major `119`; unchanged by design).

**Verify:**
1. CI green on this commit (DAG `ci`, `ui-check`), including `test:core` with the new file.
2. Locally: `npm run test:p119-agents`.

**Next bounded slice — P119.0.3 (legacy isolation):** split the shared A1/A2 handler/prompt path into agent-owned modules behind the existing request contract; update the `KNOWN_SHARED_PATH` tests in the same patch; remove user-facing legacy remnants only after compatibility is confirmed. Do not add `p119-*` workflows before P119.0.4 and do not start P120/P121.

**Residual (open, not claimed):** PARTIAL-download policy; `zod` / `body-parser` / `qs` audit; live scenarios for all three agents (P119 gate / P120).

Charter conflicts: none

---

# History (previous NEXT_PATCH entries — do not delete)

# P119.0.1 — Three-agent entry UI + status reconciliation (current)

**Applied:**
- User-facing start cards and in-app selector expose exactly Conversational, Expert, Architect.
- Internal route keys (`Simple`, `Expert`, `Project`) intentionally remain for this first bounded slice; no claim of fully separate agent pipelines or completed legacy removal.
- Corrected stale P118.5.4 / live NOT_RUN documentation to reflect Navigator acceptance on 2026-10-29, CI 27/27 on commit `75418945e5d3138bf208704c7f19ab8ea17369fa`, and supplied live staged ZIP evidence.
- Optional residuals (PARTIAL-download policy; `zod` / `body-parser` / `qs` audit) remain open.
- Patch `119.0.1`; lockfile root version aligned to package version.

**Verify:**
1. `npm ci` (Node 22.12+), then `npm run test:core` (includes `tests/p119-agent-ui-contract.test.mjs`).
2. `npm run typecheck` and `npm run build`.
3. `npm run check` and `npm run test:ui` where Playwright Chromium is available.
4. Review the UI start screen and agent menu; only Conversational, Expert, Architect should be visible. Confirm Architect still opens `/project`, and Conversational/Expert still switch within the chat shell.

**Next bounded P119 slice:** inventory orchestration and route boundaries; introduce explicit per-agent entry contracts and regression tests before deleting/isolating legacy internals. Do not combine this with P120 E2E or P121 resilience work.

**Verification status in this workspace:** not run yet; dependency directory is absent. P118 archive evidence is historical evidence for P118, not verification of this P119 patch.

Charter conflicts: none

---

# History (previous NEXT_PATCH entries — do not delete)

# P118.5.6 — Bounded dom-wiring repair (current)

**Applied:**
- Engine bounded repair after `dom-wiring` failure (max 2 scripts, strict accept rule).
- Tests for validator + repair paths; `test:app-builder` includes them.
- Patch `118.5.6`.

**Verify after deploy:**
1. CI green (27 checks + new tests).
2. Live `p118-architect-live`: prefer SUCCESS with matching ids, or honest PARTIAL if repair cannot improve.
3. No FALSE_SUCCESS (dom-wiring remains required).

**P118 exit / P119:** Navigator only after CI green on 118.5.6 **and** live run that is either deliveryProven SUCCESS or truthful non-PASS without `INCONSISTENT` download-on-fail if still present.

**Residual (optional):** download policy when outcome is PARTIAL (`failed_but_download_offered`); dependency audit (zod/body-parser/qs).

Charter conflicts: none

---

# History (previous NEXT_PATCH entries — do not delete)

# P118.5.5 — Dom-wiring + architecture boundaries (partial, applied in tree)

**Applied in this tree:**
- New required validator `dom-wiring` (catches live ID mismatch that produced FALSE_SUCCESS).
- Architecture boundary fixes (`src/architectNote.ts`, exception for package.json); `architecture:check` PASS.
- `architecture:check` added to verification-manifest (27 checks).
- Version/patch `118` / `118.5.5`.

**Not yet in this patch (continue next session):**
1. Bounded unit repair in `core-engine.ts` after `dom-wiring` failure (one model call per broken script, real HTML ids in prompt; accept only if prior validators stay green and issue count drops).
2. Tests for `dom-wiring` + repair (register in `test:app-builder`).
3. Dependency audit clean (`body-parser`, `qs`, careful `zod` 4).
4. `docs:generate` / guardrails / AI-NATIVE-RENOVATION-TASK touch-ups.
5. Full local `npm run check` and live re-run after deploy.

**Verify after apply + deploy:**
1. CI green (27/27 including architecture:check).
2. Offline: validators reject the known live mismatch; correct apps still PASS.
3. Live `p118-architect-live`: either honest non-PASS / repair path, or SUCCESS with a working page (IDs match).

**P118 exit / P119 start:** only after CI green on 118.5.5 **and** a live run that produces a working downloadable app (not FALSE_SUCCESS).

Charter conflicts: none

---

# History (previous NEXT_PATCH entries — do not delete)


**Applied:** Live architect client no longer forces legacy pipeline; task/canon/index updated; full audit report added under `docs/AUDIT-2026-10-29.md`.

**Verify after deploy:**
1. CI green on this commit (DAG check).
2. Re-run `p118-architect-live` — must not report `LEGACY_DISABLED`; prefer staged 202 + poll (SUCCESS with ZIP or honest non-PASS).

**P118 exit:** Navigator decision after (1) CI PASS, (2) offline `test:archive-delivery` PASS, (3) live run that exercises **staged** path (deliveryProven or truthful HONEST_NON_PASS with diagnostics).

**Next:** Navigator P118 exit yes/no → only then P119.

Charter conflicts: none

---

# History (previous NEXT_PATCH entries — do not delete)

# P118.5.2 — Archive delivery E2E proof (current)

**Applied:** Offline E2E proves SUCCESS → openable program ZIP with required files; SUCCESS without verified download is FALSE_SUCCESS.

**Verify:** `npm run test:archive-delivery` (or `node --import tsx --test tests/archive-delivery-e2e-p118-5-2.test.mjs`).

**P118 exit:** Ask Navigator only when (1) P118.5.1 is on the evaluated commit, (2) `test:archive-delivery` PASS, (3) prefer one live `p118-architect-live` with `deliveryProven: true` (or HONEST_NON_PASS with stage diagnostics if models still fail generation).

**Next after Navigator accepts P118:** P119 (three-agent UI) or residual cleanup only if still needed.

Charter conflicts: none

---

# History (previous NEXT_PATCH entries — do not delete)

# P118.5.1 — Archive Delivery Canon (implementation)

**Applied:** staged default for A3 build; legacy residual gated; SUCCESS requires stored ZIP artifact; UI stops forcing legacy pipeline.

**Next:** **P118.5.2** — E2E proof (SUCCESS → GET downloadUrl → open ZIP → expected files) + residual cleanup labels if needed.

Do not close P118 until 5.2 evidence exists.

Charter conflicts: none

# P118.4 — Documentation Order (DOC-ORDER-1)

**Applied order:** after P118.3.3. Program version stays 118; set `"patch": "118.4"` in `package.json`.

**Why:** Documentation had fragmented into many competing SPEC/REPORT files and risked semantic erosion under context-budget pressure. This patch establishes three protected primary documents and machine-enforceable rules that prevent future fragmentation and content loss.

**What changed (documentation only, no runtime behaviour):**

- Added root-level protected files:
  - `TECHNICAL_SPECIFICATION.md` — full engineering specification
  - `ROADMAP.md` — sequential implementation plan + forward phases
  - `TECHNICAL_REPORT.md` — historical reconstruction and evidence
- Updated `AGENTS.md`: new laws D1–D4, status, reversal table, reporting requirements.
- Updated `docs/DOCUMENTATION-INDEX.md`: protected documents listed first; binding rules restated.
- Added `scripts/docs-integrity.mjs` (guard for existence, required sections, REQ-ID count).
- `NEXT_PATCH.md` (this file) records the change.

**Not changed:** any TypeScript, React, server logic, migrations, tests, or model behaviour.

**Verification after manual apply:**

```bash
# 1. Files present
test -f TECHNICAL_SPECIFICATION.md && test -f ROADMAP.md && test -f TECHNICAL_REPORT.md

# 2. Integrity guard (after adding the script and optional npm script)
node scripts/docs-integrity.mjs

# 3. Version (manual)
# edit package.json: "patch": "118.4"  (version stays "118")
```

**Next action after this patch is applied and accepted:**

1. Confirm docs:integrity PASS.
2. Resume P118 exit gate: deploy → confirm `/health` commit → dispatch `p118-architect-live` once → record result in `docs/AI-USER-VALUE-REPORT.md` and summarise in `TECHNICAL_REPORT.md`.
3. Only after Navigator acceptance of P118 proceed to P119.

Charter conflicts: none
