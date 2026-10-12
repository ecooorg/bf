# Next patches (queue)

> Updated 12 October 2026 after P24 and the model-pool fix. Step-by-step plan to G4: TZ section 16.7 (`docs/BiForge_TZ_v3.md`).

## Done recently

P20–P24; PI-01…PI-03; P15a; model pool update (deprecated Gemini aliases removed, per-model quota no longer aborts a request).

## Queue

| Order | ID | Scope | Who |
| --- | --- | --- | --- |
| **1** | **Stage A** (TZ 16.7.3) | Railway Variables, paid Gemini key (A-01, A-02), `/health`, one Simple Mode request | Owner |
| **2** | **Stage B** (TZ 16.7.4) | G1a notes, second provider smoke, fallback smoke, end-to-end scenario 18.1, **E-01**, final ADR-10, G2 decision | Owner (agent prepares checklists) |
| **3** | **P19x** | Only if E-01 meets the TZ 11.9 threshold: `code_author` -> validate -> commit/PR | Agent, on owner command |
| **4** | **Stage D** (TZ 16.7.6) | Live GitHub check, ADR-06 decision, pilot task to PR, three live Repair Loop calls, G3 decision | Owner |
| **5** | **Stage E** (TZ 16.7.7), parallel with 2-4 | Audit rows, `/ops`, Railway backup, restore drill, rollback drill, capacity | Owner |
| **6** | **P25** | BX-26 pilot S3, version BiForge v2.0, G4 report | Owner + agent |
| - | P15b, TP-HALLUC | Explicit owner command only | - |

Only P19x (conditional) and P25 are code patches. Next agent work only on owner command.
