# P118.5.0 — Archive Delivery Canon (documentation lock)

**Applied order:** after P118.4 / gates CI fix. Program version stays 118; set `"patch": "118.5.0"` when applying runtime follow-ups (this package is docs-only: keep patch at current or bump to `118.5.0` if you version doc locks).

**Why:** Program ZIP creation and user download never had a single end-to-end path. Five mechanisms (staged builder, legacy scaffold pipeline, code-task ZIP, PACKAGE.md, client export) competed. Marker/spec patches cannot close P118 without download proof.

**What this package does (documentation only):**

- Adds `docs/ARCHIVE-DELIVERY-CANON.md` — normative single-path plan and patch sequence P118.5.1–P118.5.5.
- Updates `ROADMAP.md`, `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-NATIVE-RENOVATION-ROADMAP.md`, `docs/DOCUMENTATION-INDEX.md`.
- Updates P118 exit gate: requires archive download evidence, not only spec/plan/markers.

**Not changed:** TypeScript/runtime (implementation starts at P118.5.1).

**Next action (implementation order):**

1. Apply this documentation package.
2. Implement **P118.5.1** (staged-only A3 API default; legacy behind explicit flag).
3. **P118.5.2** (artifact + download invariants).
4. **P118.5.3** (UI one button → downloadUrl).
5. **P118.5.4** (E2E live/CI: SUCCESS → GET ZIP → open → expected files).
6. Only then Navigator P118 exit decision.
7. **P118.5.5** decommission noise after 5.4 green.

Do not run “P118 exit” live solely to re-check markers.

Charter conflicts: none
