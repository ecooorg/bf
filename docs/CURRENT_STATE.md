# Current state

> Updated at the end of every patch (AGENTS.md section 8).

## Product

- **Simple Mode** (`/`): works; internal version 19; not changed by P19.
- **Project Mode** (`/project`, opt-in, PostgreSQL): built patch by patch from `docs/BiForge_TZ_v3.md` (plan: TZ 16.4.2).

## Done (see `CHANGELOG.md` for details)

| Patch | Result |
| --- | --- |
| P02–P18 | As in previous CURRENT_STATE (through CodeExecutor `manual`, Gate Engine, GitHub integration). |
| P19 | `model_patch` executor: structured-patch schema, `validateModelPatch`, `createModelPatchExecutor`; gated by `CODE_EXECUTOR=model_patch` (ADR-10 interim). Repository restructure: `ARCHIVE/` (historical SPECs/reports), `CONCEPTS/` (future drafts). Packer replaced by `scripts/pack-simple.mjs` (timeout-safe, no hanging child processes). |

## Open

- Owner: GitHub App, E-01 evidence into ADR-10 / final decision on enabling `model_patch`.
- P17/P18 limits unchanged (no UI for gates/code; package commit vs Test Integrity open for P20).
- Next: P15a or P20 per owner command; P19 enablement only after E-01.
