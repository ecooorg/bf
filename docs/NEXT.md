# Next patches (queue)

> Updated by the AI Assistant at the end of every patch. Plan: TZ 16.4.2; process rules: TZ 16.3.2 and 16.4.4.

## P13a — process automation (BX-28, TZ 16.3.2)
- **Goal.** One command builds the cumulative archive and the report; the preflight blocks a bad archive; CI result reaches the owner.
- **Read.** TZ 16.3, 16.3.2, 16.4.
- **Files (expected).** Scripts for pack, report and preflight in the `scripts/` folder; `package.json` (npm scripts); `.github/workflows/ci.yml` only as the SPEC allows; `docs/REPO_MAP.md`, `docs/START_HERE.md`, `CHANGELOG.md`.
- **Tests.** Preflight rejects an archive with a manifest, a nested folder, a secret or a changed `tests/acceptance/**` path; pack lists replaced and added files correctly; the report marks commands that were not run.
- **Owner check.** One run of the pack command gives an archive and a report; CI sends a short result.

## P13b — rest of BX-16 (TZ 8.4–8.6, 14, 16.4.4)
- **Goal.** Routes and the `/project` screen to confirm a plan and decide approvals; worker started from `server.ts` with a real handler; `guardModelCall` in `runAnalysis`, every call in the ledger with `run_id`; `writesArtifact` tied to the artifact registry (after P14).
- **Tests.** Extended set 16.4.4, group A (items 1–5) in full; group B where it applies.
- **Owner check.** Confirm a task plan on Railway; an over-budget run is visible and waits for a decision.

## P14 — BX-17.b, full artifact registry
- **Read.** TZ 14 (sections named in `docs/START_HERE.md`). **Tests.** 16.4.4 items 7, 9, 12.
