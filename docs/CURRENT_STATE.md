# Current state

> Updated 12 October 2026 after PI-02 patch archive. Base: owner archive `bf-vPI-01.zip`.

## Product

- **Simple Mode** (`/`): product version **PI-02** (instruction track). Intent flags and post-processing (PI-02) on top of the uncertainty contract (PI-01).
- **Project Mode**: code through P22. Database migration `013_repair_loop` applied on production. **G3 is not accepted** until the owner records E-01.

## Production evidence (2026-10-12, pre-PI)

| Check | Result |
| --- | --- |
| GitHub `ecooorg/bf` `main` | `da38c1419d51` (`da38c14`), green check, message `Add files via upload` |
| Railway production | Active (version 22 at last owner check; PI-01/PI-02 not yet deployed) |
| Boot log (last checked) | `013_repair_loop: applied`. `BiForge v22 …` |

## Done

| Patch | Result |
| --- | --- |
| P20–P22 | As before |
| **PI-01** | Uncertainty contract in Simple Mode prompt. Spec: `docs/PI-01-SPEC.md`. |
| **PI-02** | Intent flags + post-processing (`askAllowed`, soft quality-audit, retry text, `search_expected`). Spec: `docs/PI-02-SPEC.md`. Not yet deployed. |

## Open

- E-01 / ADR-10; P19x; PI-03 optional after PI-02 is checked on production.

## Next

**E-01** (owner) or the next patch the owner names. See `docs/NEXT.md`.
