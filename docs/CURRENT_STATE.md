# Current state

> Updated at end of P20 (2026-10-12).

## Product

- **Simple Mode** (`/`): works; product version **20**.
- **Project Mode** (`/project`, opt-in, PostgreSQL): through P20 (Task Package brief, approval, integrity baseline).

## Done (code)

| Patch | Result |
| --- | --- |
| P01–P19 | As before (GitHub App live, `model_patch` gated, ARCHIVE/CONCEPTS). |
| **P20** | `brief_writer` (`server/briefWriter.ts` + `POST .../code/brief`); `approveCodePackage` / `commitApprovedPackage`; Test Integrity **package baseline**; migration 011. |

## Open

- P20b: Task PASS ↔ gates.
- E-01 / final ADR-10 (`model_patch` still off by default).
- GitHub write / `GITHUB_DIFF_UPLOAD` still off until owner enables (package commit REAL_ONLY without writes).
- P21+.

## Next

See `docs/NEXT.md` — next code patch **P20b** unless owner names another.
