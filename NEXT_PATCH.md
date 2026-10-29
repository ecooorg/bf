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
