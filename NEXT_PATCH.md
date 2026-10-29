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
