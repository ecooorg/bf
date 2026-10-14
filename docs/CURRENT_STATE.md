# Current state

> **Read after `docs/START_HERE.md`.** Updated **14 October 2026**.
> Product version label: **24** (bump only when a product patch SPEC says so).
> Living queue: `docs/NEXT.md`. Map: `docs/REPO_MAP.md`. **Links:** `docs/OWNER_OPS.md`. **Off-repo history list:** `docs/HISTORY_OFFREPO.md`. **Journal:** `docs/PATCH_JOURNAL.md`.

---

## Next agent patch

| Field | Value |
| --- | --- |
| **ID** | **P27** |
| **SPEC** | `docs/P27-SPEC.md` |
| **One line** | Simple Mode: attach zip/folder → ingest → project card + privacy ack + read-only file panel shell |
| **Owner says** | «следующий патч» or «делай P27» |
| **Do not include** | Expert Mode, ChangeSet card, server/Project Mode workspace, model_patch enablement |

When P27 is closed (report + CI green), the owner (or the agent if the owner said so) sets this block to **P28**. The agent does **not** invent scope beyond the SPEC of the current ID.

---

## Snapshot

| | |
| --- | --- |
| **CI** | Green after P26b (`test:p26a`, `test:p26a2`, `test:p26b`) |
| **Code executor** | ADR-10 Accepted. Railway Variables (14 Oct 2026) show `CODE_EXECUTOR=model_patch`. Mark RM-C3 closed in NEXT only after an accepted PR is recorded. Links: `docs/OWNER_OPS.md` |
| **Closed agent code** | Through P24; PI/PA as before; **P26a**; **P26b core** (library + tests). Historical labels P26a.2 / P26b-UI are **superseded by P27+** |
| **Owner path to G4** | `RM-*` stages in `docs/NEXT.md` (not agent “next patch”) |

### Done (do not re-implement)

- E-01 closed; ADR-10 Accepted; RM-B5; RM-B6.
- P26a — zip ingest core (`docs/P26a-REPORT.md`).
- P26b — ChangeSet/export **library** (`docs/P26b-REPORT.md`); no chat UI yet.
- P19x implementation in repo, still off.

### Agent patch plan (from P27)

| ID | Scope (half free-session) | Depends on |
| --- | --- | --- |
| **P27** | Simple: archive/folder attach, ingest UX, privacy ack, project card, basic file tree shell | P26a/a.2 helpers, P26b not required |
| **P28** | Expert parity for attach + WORKSPACE in conversation + needFiles/needSearch + AC-04 | P27 |
| **P29** | ChangeSet card (Apply/Reject/diff) + export actions in UI | P27–P28, P26b library |
| **P30** | Project Mode: migration + PgStore only | Owner command; ADR-12 |
| **P31** | Project Mode: HTTP routes for workspace | P30 |
| **P32** | Project Mode: WorkspacePanel UI + import from code/build ZIP | P31 |
| **P33** | Workspace polish / parity tests / P26d-style acceptance hooks in code | P32 |
| **P34** | Product pilot patch (former P25 / RM-F7) | Owner F1–F6 |
| **P35+** | Only on new owner SPEC | — |

### Gates (owner)

G1a/G1/G2/G3/G4 still open except ADR-10. Details: `docs/NEXT.md` stages A–F.

### After G4

Forbidden without explicit command: P15b, TP-HALLUC, §19 deferred, web search in Simple.
