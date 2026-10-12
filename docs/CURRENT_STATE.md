# Current state

> Updated 12 October 2026 after P23. Base: owner archives through `bf-P15a.zip` / `bf-vPI-03final.zip`.

## Product

- **Simple Mode** (`/`): instruction track **complete** (PI-01 / PI-02 / PI-03final).
- **Project Mode**: code through **P23** (security evidence). Migrations through `014_provider_snapshots`. **G3 is not accepted** until the owner records E-01.
- **Product version:** **23**.

## Production evidence (last checked 2026-10-12)

| Check | Result |
| --- | --- |
| GitHub `ecooorg/bf` `main` | Pre-PI baseline `da38c14`; later patches delivered as archives |
| Railway | Active (last owner check: v22 / migration 013); PI and P15a/P23 may not be deployed yet |

## Done

| Patch | Result |
| --- | --- |
| P20–P22 | Repair Loop path; G3 open pending E-01 |
| PI-01…PI-03final | Simple Mode instruction track closed |
| P15a | Provider monitoring S1–S2, ADR-11 |
| **P23** | BX-24 security evidence: threat model, injection corpus tests, redaction, rights review, audit catalog + login-fail / project-delete / settings audits. Spec: `docs/P23-SPEC.md`. |

## Open

- E-01 / final ADR-10; P19x (if enabled); P24 (ops); P25 / G4; P15b optional.

## Next

**P24** or **E-01** (owner). See `docs/NEXT.md`.
