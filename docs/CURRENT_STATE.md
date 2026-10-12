# Current state

> Updated 12 October 2026 after P15a. Base: owner archive `bf-vPI-03final.zip`.

## Product

- **Simple Mode** (`/`): instruction track **complete** — **PI-01** (uncertainty contract), **PI-02** (intent flags + post-processing), **PI-03final** (mode paragraph: decision / research / engineering / information). Product version label is now **15a** (monitoring patch on top of the closed PI track).
- **Project Mode**: code through P22. Database migrations through `013_repair_loop` on production; **014_provider_snapshots** ships with P15a. **G3 is not accepted** until the owner records E-01.

## Production evidence (last checked 2026-10-12)

| Check | Result |
| --- | --- |
| GitHub `ecooorg/bf` `main` | `da38c1419d51` (pre-PI upload baseline); PI and P15a delivered as patch archives |
| Railway production | Active (version 22 at last owner check; PI-01…03 and P15a not necessarily deployed yet) |
| Boot log (last checked) | `013_repair_loop: applied`. `BiForge v22 …` |

## Done

| Patch | Result |
| --- | --- |
| P20–P22 | As before (Repair Loop; G3 open pending E-01) |
| **PI-01** | Uncertainty contract in Simple Mode prompt. Spec: `docs/PI-01-SPEC.md`. |
| **PI-02** | Intent flags + post-processing. Spec: `docs/PI-02-SPEC.md`. |
| **PI-03 / PI-03final** | Mode paragraph + information mode + server date + stronger cascade. Spec: `docs/PI-03-SPEC.md`. **Track closed.** |
| **P15a** | BX-27.a S1–S2: provider snapshots, monitor CLI, weekly Actions workflow, ADR-11, pure evaluators, redaction helper, threat-model / rights-review drafts, injection corpus fixtures. Spec: `docs/P15a-SPEC.md`. |

## Open

- E-01 / final ADR-10; P19x (if enabled); P23 (BX-24 security evidence); P24; P25 / G4; P15b optional.

## Next

**P23** (owner command) or **E-01** (owner). See `docs/NEXT.md`.
