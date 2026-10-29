# Archive Delivery Canon — Single Path for Program ZIPs

**Status:** normative plan (P118.5 line). Binding for implementation patches that follow.  
**Authority:** AGENTS.md → this document → TECHNICAL_SPECIFICATION §7 / ROADMAP Phase 5 extension.  
**Product rule:** A Complex Software Architect (A3) success is only proven when the user can download a non-empty ZIP that opens and contains the expected implementation files.

---

## 1. Problem statement (locked)

Today five loosely related mechanisms exist:

| ID | Mechanism | Role today | Fate under this canon |
|----|-----------|------------|------------------------|
| A | Staged App Builder (`appBuilder/*` + adapter) | Flag-gated Architect engine | **Canonical** path for “build program → download ZIP” |
| B | Legacy `runAppBuilderPipeline` (scaffold + optional slice) | Default when flag off | **Internal fallback only**; never user-visible SUCCESS for A3 |
| C | Code-task / model_patch download | External hand-off ZIP | **Separate product action** (manual coding), not Architect |
| D | PACKAGE.md Delivery tab | Brief for external tools | **Separate product action**; never labeled “download program” |
| E | Client JSON / workspace export | Backup of decisions / local workspace | **Unchanged**; not a server program archive |

The defect is not primarily JSZip or browser download. The defect is **no single end-to-end contract** from user goal to a verified, downloadable program archive. Scaffold-only ZIPs and PACKAGE.md have been treated as success substitutes.

---

## 2. Single canonical path (target)

```
User goal (Architect / Project build UI)
  → POST /api/projects/:projectId/code/build
       engine = staged only for A3
  → 202 { jobId, statusUrl }
  → poll GET .../code/build/:jobId
  → terminal status:
       SUCCESS  → downloadUrl required, non-null
       PARTIAL  → downloadUrl optional; UI shows gaps; not “program ready”
       FAILED / CANCELLED → no downloadUrl as success
  → GET downloadUrl
       → 200 application/zip
       → body length > 0
       → JSZip opens; expected paths present; at least one non-empty source file
  → UI: single button “Download program” → downloadViaFetch(downloadUrl)
```

**Only this path may claim Architect / program-build success.**

### 2.1 What is explicitly out of the canonical path

- Legacy pipeline producing scaffold ZIP as a silent default for the same UI button.
- Returning PACKAGE.md when the user asked for a program archive.
- Diagnostic ZIP (`biforge-diagnostics.zip`) as a substitute for the program.
- Client-side `exportZip` / `programFiles` IndexedDB as server Architect output.
- model_patch code-task download unless the user explicitly chose “manual / external coding”.

### 2.2 Allowed residual paths (not deleted, not primary)

| Path | Allowed use | Must not |
|------|--------------|----------|
| Legacy pipeline (B) | Ops/debug, explicit `engine=legacy` or env kill-switch when staged cannot start | Set `outcome=SUCCESS` for A3; be the default UI build |
| Code-task ZIP (C) | Manual hand-off workflow | Share the same button label as Architect download |
| PACKAGE.md (D) | Delivery tab for external tools | Be returned from Architect build SUCCESS |
| Client export (E) | User backup of decisions/workspace | Be stored as `app_build` artifact |

---

## 3. Implementation patch sequence

Patches are bounded. Each has its own evidence. Do not merge all into one mega-diff.

### P118.5.0 — Documentation lock (this package)

**Goal:** Make the canon the next-step authority; stop further marker-only patches from claiming P118 exit without download proof.

**Changes:** This file; ROADMAP; AI-NATIVE-RENOVATION-TASK; AI-NATIVE-RENOVATION-ROADMAP; NEXT_PATCH; CHANGELOG entry; TECHNICAL_SPECIFICATION §7 note.

**Acceptance:** Docs updated; no runtime change.

---

### P118.5.1 — API and engine default: staged is the only A3 build

**Goal:** User-facing build always enters staged engine when Architect/program build is requested.

**Concrete changes:**

1. `POST .../code/build` for Architect / program build:
   - Prefer staged when `DATABASE_URL` + model adapters available.
   - If staged cannot start → **hard error** with truthful code (`STAGED_UNAVAILABLE`), not silent legacy SUCCESS.
2. Legacy pipeline callable only with explicit internal flag, e.g. `engine=legacy` **and** env `ALLOW_LEGACY_APP_BUILDER=true` (default false in production).
3. Response shape for staged (already mostly present) becomes mandatory:
   - 202 + `jobId` + `statusUrl`
   - final publicJob always includes `outcome`, `downloadUrl` iff artifact saved.
4. Remove or gate any branch that returns 201 with scaffold ZIP as “done” for the same client entry point.

**Files (expected):** `server/projectRoutes.ts`, `server/appBuilderAdapter.ts`, env example, OPERATIONS.md note.

**Tests:**

- Unit/route: without `ALLOW_LEGACY_APP_BUILDER`, build does not call `runAppBuilderPipeline`.
- Staged start returns 202 + jobId.
- publicJob SUCCESS without artifactId fails the test (invariant).

**Acceptance:** Default build path never produces legacy-only SUCCESS for A3.

**Stop:** If production cannot run staged (no DB) → ask Navigator; do not re-enable silent legacy as success.

---

### P118.5.2 — Artifact + download invariants

**Goal:** SUCCESS implies a stored, re-readable ZIP; download endpoint is the only success delivery.

**Concrete changes:**

1. After `packZip`, staged adapter **must** `putArtifact` before marking job `done` with `outcome=SUCCESS`.
2. If pack or save fails → `outcome=FAILED`, `error.code` in (`archive_missing`, `artifact_save_failed`), no downloadUrl.
3. `GET .../artifacts/:id/download`:
   - remains the single download URL embedded in publicJob;
   - keep CRC/open checks;
   - empty body → 422, never 200.
4. Forbid attaching PACKAGE.md or diagnostics path as `downloadUrl` on Architect jobs.

**Files:** `appBuilder/core-engine.ts`, `server/appBuilderAdapter.ts`, `server/artifactRepository.ts`, `server/projectRoutes.ts`.

**Tests:**

- Engine: SUCCESS ⇒ archive non-empty (already partially present) + adapter save mocked.
- Download: 200 + zip magic + entry list.
- Negative: FAILED job has no downloadUrl.

**Acceptance:** No SUCCESS row/job without resolvable artifact bytes.

---

### P118.5.3 — UI: one button, one URL

**Goal:** User cannot confuse PACKAGE.md / diagnostics with the program archive.

**Concrete changes:**

1. Architect / Project build completion panel:
   - Primary: **Download program** → only `job.downloadUrl` via `downloadViaFetch`.
   - Disabled with explicit reason when outcome ≠ SUCCESS or downloadUrl missing.
2. Delivery tab PACKAGE.md stays under a distinct label (“Download task package”), never “Download program”.
3. On PARTIAL: show missing units / failureReason; optional “Download partial archive” only if artifact exists and is labeled partial.
4. Remove any UI path that triggers legacy build without showing engine name in diagnostics.

**Files:** `src/projectBuildJob.ts`, Project Mode / build UI components (`ProjectDelivery.tsx` only if it currently mixes labels; prefer Architect build panel), `downloadFile.ts` reuse.

**Tests:** Component or integration test: SUCCESS + downloadUrl → fetch called with that URL; SUCCESS without downloadUrl → button disabled + error text.

**Acceptance:** Manual QA script: one click downloads a ZIP that opens locally.

---

### P118.5.4 — E2E acceptance gate (replaces “hope”)

**Goal:** P118 exit cannot pass without download proof.

**Concrete changes:**

1. Extend `p118-architect-live` (or add `p118-archive-delivery-live`):
   - run build on staged;
   - wait terminal;
   - require SUCCESS;
   - GET downloadUrl with session cookie;
   - assert status 200, content-type zip, size ≥ threshold;
   - open with JSZip; assert required paths (e.g. `index.html` for static_site) and non-empty content.
2. Local test with fake model port that returns fixed markers → full chain without live Gemini when possible.
3. Document in AI-USER-VALUE-REPORT: PASS only with this evidence.

**Files:** `scripts/p118-architect-live.mjs`, tests under `tests/`, workflow yml if needed.

**Acceptance:** One recorded live (or CI-with-fake) run with ZIP bytes and entry list in evidence.

**P118 exit gate (updated):**  
Marker/spec repair alone is **not** enough. Exit requires P118.5.1–P118.5.4 evidence for the commit under test.

---

### P118.5.5 — Decommission noise (after 5.4 green)

**Goal:** Reduce five mechanisms to “one primary + explicit residuals”.

**Concrete changes:**

1. Legacy pipeline: keep code but behind `ALLOW_LEGACY_APP_BUILDER`; add log line when used; no UI entry.
2. Do not delete code-task download or PACKAGE.md (still valid for manual workflow).
3. Optionally move dead client helpers only if unused after UI pass (measure references first).
4. Update TECHNICAL_SPECIFICATION §7 and architecture-guardrails: single A3 delivery path.

**Acceptance:** `docs:integrity` + architecture notes; grep shows UI “Download program” has single code path.

---

## 4. Non-goals

- Rewriting all of Project Mode UX (P119).
- Deleting artifact registry or diagnostics ZIP.
- Forcing full `strict: true`.
- Expanding beyond static_site profile in the same patches.
- Claiming P119/P120 work.

---

## 5. Evidence rules

- `PASS` for archive delivery requires download bytes, not only `outcome` field in JSON.
- Scaffold-only ZIP under legacy must be reported as `NOT` Architect SUCCESS.
- Green unit tests for markers without E2E download remain insufficient for P118 close.

---

## 6. Order relative to current programme

```
P118.3.3 (markers)     — applied / in tree
P118.4 (docs order)    — applied
gates CI fix           — applied as needed
P118.5.0 (this canon)  — documentation lock          ← now
P118.5.1 → 5.4         — implementation + E2E
Navigator: P118 exit?
P119                   — three-agent UI migration
```

Do **not** dispatch “P118 exit live” solely to re-test markers. Next live after 5.1–5.3 must target **downloadable ZIP proof**.
