# Next patches (queue)

> Updated 2026-10-12. Canonical composition of patches: TZ 16.4.2. **Execution order:** TZ 16.4.2.a and this file (they win on order).

## Confirmed (owner, 2026-10-12)

- GitHub App `biforge-control`: installed, read permissions (Metadata, Contents, Checks, Pull requests), Railway `GITHUB_*` set, webhook `check_run` → **202**.
- Product version scheme: `APP_VERSION` = patch number (currently 19).
- Code through P19 in `main` (CI green). E-01 / final ADR-10 still open (`model_patch` gated off).

## Queue (do in this order)

| Order | ID | Scope | Owner check |
| --- | --- | --- | --- |
| **1** | **P20** | `brief_writer`, human package approval, **Test Integrity rule for package commit** on `biforge/<task_id>` (resolves P18 open question). No requirement to build a full UI. | Approve one package; package files land on the task branch without false `test_integrity` FAIL |
| **2** | **P20b** | Wire Task PASS to Gate Engine results; optional routes for requirements/spec/review approvals (debt from P17). Narrow patch. | Task cannot PASS without required gate evidence (unless WAIVED) |
| **3** | **E-01** | Owner experiment (TZ 11.9), not an agent code patch. Record results → finalize ADR-10. | Three task pairs written up |
| **4** | **P19x** | Only if ADR-10 enables `model_patch`: wire `code_author` → validate → GitHub commit/PR. Skip if E-01 fails threshold. | One successful or explicitly rejected model patch path |
| **5** | **P21** | BX-22.b: PR → evidence → human decision; pilot task | Human decision on a pilot PR |
| **6** | **P22** | BX-23: Repair Loop → **G3** | Repair stops on limits / no progress |
| **7** | **P15a** | BX-27.a: connection/quota monitoring (after G3 path, or earlier if owner wants alerts) | Weekly check does not break Router |
| **8** | **P23** | BX-24: security / injection corpus | Review |
| **9** | **P24** | BX-25: ops, backup, `/ops` | Drill restore |
| **10** | **P25** | BX-26: acceptance, pilot S3 → **G4** | Pilot idea → decision |
| — | **P15b** | Market/candidates — only on explicit owner command | |

## Do not start without owner command

Next agent work: **P20** only, unless the owner names another ID.

## Out of scope until named

- Full gates/code UI
- `GITHUB_DIFF_UPLOAD` / write permissions until needed
- Mixing P15a into P20–P22
