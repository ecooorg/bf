# BiForge — Current Task and Patch Control

**Applied patch line:** P118.3.3 → docs P118.4 → gates cleanup; **next authority:** P118.5 Archive Delivery Canon.
**Phase:** P118 Complex Software Architect Agent — NOT closed.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task, `docs/ARCHIVE-DELIVERY-CANON.md`, `docs/AI-NATIVE-RENOVATION-ROADMAP.md`, protected root docs.

## State

- Spec/plan/marker repairs exist; live Architect runs have **not** produced a verified user-downloadable program ZIP.
- Root cause of “archives never really worked”: multiple parallel delivery mechanisms and no single E2E contract (see `docs/ARCHIVE-DELIVERY-CANON.md`).
- P118 exit is **blocked** until P118.5.1–P118.5.4 evidence exists for one commit: SUCCESS → downloadUrl → ZIP bytes → expected files.

## Next (mandatory order)

1. **P118.5.0** — this documentation lock (no runtime).
2. **P118.5.1** — staged-only default for A3 build; legacy not silent success.
3. **P118.5.2** — artifact save + download invariants.
4. **P118.5.3** — UI: one “Download program” → downloadUrl only.
5. **P118.5.4** — E2E acceptance (live or fake-model CI) with ZIP proof.
6. Navigator accepts P118 exit or orders another 5.x fix.
7. **P118.5.5** — decommission / flag residuals (after exit evidence).

## Not authorized

- P119 UI migration before P118 exit with archive proof.
- Treating PACKAGE.md, diagnostics ZIP, or scaffold-only legacy ZIP as Architect SUCCESS.
- Marker-only patches as P118 completion.

## Residual

- B3 Node LTS number (P116).
- P92 diagnostics production verification frozen.

