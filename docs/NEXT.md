# Next patches (queue)

> Updated after P20 + owner decision on the Instructions track (2026-10-12).

## P20 — done

- brief_writer, package approval, Test Integrity package baseline, optional package commit (writes gated).

## Queue (Project Mode — TZv3 BX / PNN)

| Order | ID | Scope |
| --- | --- | --- |
| **1** | **P20b** | Task PASS ↔ Gate Engine; optional approval routes for requirements/spec/review |
| **2** | **E-01** | Owner experiment → ADR-10 |
| **3** | **P19x** | Only if ADR-10 enables model_patch |
| **4** | **P21** | PR → human decision (pilot) |
| **5** | **P22** | Repair Loop → **G3** |
| **6** | **P15a** | Quota monitoring (or later) |
| **7+** | P23–P25 | Security, ops, G4 |

Next agent work on this track: **P20b** only, unless the owner names another ID.

## Instructions track (Simple Mode behaviour) — after G3

Owner decision 2026-10-12: do **not** interleave with P20b–P22 and do **not** defer everything until after P25.

Source materials (non-binding until a PI patch adopts them): `CONCEPTS/TZ_BiForge_Instructions_Uncertainty.md` (TZ-INSTRUCTIONS-01), `CONCEPTS/BiForge_Agent_Instructions_v2_Target.md`, snapshot `CONCEPTS/BiForge_Agent_Instructions_v1_Extracted.md`. Analytical background: `CONCEPTS/BiForge_analytical_note_recommendations.md`.

| When | ID | Scope |
| --- | --- | --- |
| **After G3 (P22 closed)** | **PI-01** | Uncertainty contract in the Simple Mode prompt (TZ-INSTRUCTIONS P1); regression tests for the dialogue path; no Project Mode scope |
| After PI-01 stable | **PI-02** | Post-processing / intent flags as in TZ-INSTRUCTIONS P2 |
| Optional later | **PI-03** | Thin mode paragraph (TZ-INSTRUCTIONS P3) |
| **After G4 / real need only** | **TP-HALLUC** | Multi-model cross-check (`CONCEPTS/TP_BiForge_Hallucination_CrossCheck.md`) — shelf until hallucinations hurt in production |

Rules:

- PI patches are a **separate queue**: do not mix into a BX/PNN patch without an explicit owner command.
- Do not open CONCEPTS instruction files unless the owner assigns **PI-** or **TP-HALLUC** work.
- Product version continues to follow the main patch number when PI ships as its own numbered delivery (owner chooses P-number or PI-label at assignment time).
