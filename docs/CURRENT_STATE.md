# Current state

> Updated 12 October 2026 after the owner verified the P22 deploy. Evidence: `docs/P22-REPORT.md`.

## Product

- **Simple Mode** (`/`): opened on production; product version **22**.
- **Project Mode**: code through P22. Database migration `013_repair_loop` applied on production. **G3 is not accepted** until the owner records E-01.

## Production evidence (2026-10-12)

| Check | Result |
| --- | --- |
| GitHub `ecooorg/bf` `main` | `da38c1419d51` (`da38c14`), green check, message `Add files via upload` |
| Railway production | Active, deployment successful via GitHub. Public host `e-production-5cc8.up.railway.app` |
| Boot log | `013_repair_loop: applied`. `BiForge v22 (da38c1419d51) on :8080 (production)` |
| `GET /health` | `status ok`, `version 22`, `commit da38c1419d51` |
| `GET /ready` | `status ready`, `version 22`, `commit da38c1419d51` |

## Done

| Patch | Result |
| --- | --- |
| P20 | brief_writer, package approval, integrity baseline |
| P20b | PASS requires RC when task has code head |
| P21 | reviewer findings + human decision accept/repair/reject |
| **P22** | Repair Loop deployed. Machine criteria PASS. Live `POST .../repair` not run. |

## Open

- E-01 / ADR-10; P19x; PI after the owner accepts G3.

## Next

**E-01** (owner) or the next patch the owner names. See `docs/NEXT.md`.
