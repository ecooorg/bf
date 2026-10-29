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
