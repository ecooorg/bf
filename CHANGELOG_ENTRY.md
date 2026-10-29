## P118.4 — Documentation Order (DOC-ORDER-1)

- Introduced three protected primary documents at repository root:
  - `TECHNICAL_SPECIFICATION.md` — complete engineering specification (architecture, data model, API, three agents, REQ-IDs, acceptance).
  - `ROADMAP.md` — sequential implementation plan from empty repository through P118 and forward phases P119–P121.
  - `TECHNICAL_REPORT.md` — historical reconstruction and evidence record with confidence levels.
- Updated `AGENTS.md`: new laws **D1–D4** (protection against semantic reduction and fragmentation), status, reversal table, reporting requirements.
- Updated `docs/DOCUMENTATION-INDEX.md`: protected documents listed first; binding rules restated.
- Added `scripts/docs-integrity.mjs` — machine guard for existence, required sections and REQ-ID baseline.
- No runtime behaviour change. Version stays 118; patch field becomes `118.4`.

**Verification:** `node scripts/docs-integrity.mjs` must report PASS.  
**Not evaluated:** any product live run (this is a pure documentation + guard patch).
