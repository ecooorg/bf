# Universal BiForge patch execution instructions

**Repository:** the attached BiForge archive (current green `main` / owner archive).  
**Patch:** `PNN` — number and scope set by the owner; step rules — `docs/SPEC_DEV_PROCESS.md` (§16.3–16.4); operational order and remaining steps — `docs/NEXT.md`; TZ index — `docs/BiForge_TZ_v3.md`.  
**Priorities:** correctness > compatibility > test coverage > minimal diff > token economy.

Replace `PNN` / `NN` with the patch number (e.g. P20 → archive `bf-P20.zip`, version `"20"`).

---

## 1. Context analysis

Before editing files, read **in this order**:

1. `docs/START_HERE.md`
2. `AGENTS.md`
3. `docs/CURRENT_STATE.md`
4. `docs/NEXT.md` (queue; do not start another patch without the owner’s instruction)
5. `docs/SPEC_DEV_PROCESS.md` (§16.3–16.4) and the TZ sections for this patch via the map in `docs/START_HERE.md` (section → file map — `docs/BiForge_TZ_v3.md`); step catalogue `BX-XX` and patch history — `ARCHIVE/TZ_v3.0_PATCH_HISTORY.md`
6. This patch’s SPEC if it exists (`docs/PNN-SPEC.md`); otherwise create it from `docs/PATCH_TEMPLATE.md`
7. Only the needed sources, tests, migrations, `connectors.yaml` / `docs/CONNECTIONS.md`

Align number and scope with `CURRENT_STATE` and `NEXT`. Do not expand scope. Do not change Simple Mode unless the SPEC requires it. Do not touch `tests/acceptance/**` without explicit SPEC permission (Test Integrity).

Conflicts between rules and the assignment: resolve within the patch when the rules are mandatory; a blocking conflict — one question list to the owner and stop.

---

## 2. Implementation

1. Fully meet the patch requirements and acceptance criteria (SPEC + TZ for inbound BX steps).
2. Create/update SPEC, tests, migrations, documentation using repository templates.
3. Update `CHANGELOG.md`, `docs/CURRENT_STATE.md`, `docs/NEXT.md` per project rules.
4. **Product version:** single source — `APP_VERSION` in `src/config.ts`. Value = patch number as a string (`P20` → `"20"`). Keep in sync:
   - `package.json` → `"version"`
   - first line of `README.md` and `DEPLOY_RAILWAY.md` (`vNN`)
   - section `## vNN` at the top of `CHANGELOG_AGENT_BEHAVIOR.md`  
   Code imports `APP_VERSION`; do not scatter hard-coded current version. Check: `node scripts/check-version.mjs`.
5. When historical SPECs/reports leave the “active” set, move them to `ARCHIVE/`; future drafts go to `CONCEPTS/`. Place new documents in the right directory immediately. Update links. Active documents (`docs/BiForge_TZ_v3.md`, ADRs in force, `START_HERE`, etc.) stay in place.
6. Prefer a minimal diff. No drive-by refactors.

---

## 3. Verification before hand-off

1. Run `npm run check` and `npm run build` when the environment allows; report what passed and what was not run.
2. Confirm version consistency (`check-version`).
3. Confirm CI-required checks would pass on the changed surface.
4. For behaviour changes: tests and changelog updated in the same patch.

---

## 4. Delivery

1. One patch — one reviewable result (see §16.4).
2. PR (or owner upload) with clear file list: replace / add / delete.
3. File deletions are performed by the owner when applying the archive.
4. Do not put a manifest file inside the patch unless the SPEC asks for it; list changes in the chat or PR body.

---

## 5. Stop rules

Stop and ask the owner when: scope is ambiguous; a mandatory rule conflicts with the SPEC; production secrets would be required; Test Integrity would be violated; or the change needs a new ADR and none exists.
