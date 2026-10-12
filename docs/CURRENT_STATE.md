# Current state

> Updated at end of P22.

## Product

- **Simple Mode** (`/`): works; product version **22**.
- **Project Mode**: through P22 (Repair Loop). Gate **G3** code path is in the API; owner still records E-01 before treating G3 as accepted.

## Done

| Patch | Result |
| --- | --- |
| P20 | brief_writer, package approval, integrity baseline |
| P20b | PASS requires RC when task has code head |
| P21 | reviewer findings + human decision accept/repair/reject |
| **P22** | Repair Loop: classify, ≤2 repairs, stop + diagnostic |

## Open

- E-01 / ADR-10; P19x; PI after the owner accepts G3.

## Next

**E-01** (owner) or the next patch the owner names. See `docs/NEXT.md`.
