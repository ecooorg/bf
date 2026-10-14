# History kept off the GitHub repo (owner disk)

> **Policy (14 October 2026).** Closed historical and non-binding concept files may live **only on the owner’s disk** (zip backup), not on `main`.
> This file is the **canonical list** of paths safe to remove from the remote repository **after** you have saved them locally.
> Do **not** delete without a local copy. CI and the product do not need these paths.

## How to archive (Android / desktop)

1. Download the listed files from GitHub (or clone once on desktop).
2. Save one zip, e.g. `bf-history-2026-10-14.zip`, somewhere safe **outside** the repo.
3. On GitHub: delete those paths from `main` (web UI or a cleanup commit).
4. Leave `ARCHIVE/README.md` and `CONCEPTS/README.md` in the repo (stubs point here).
5. Update the date line in this file when the off-repo zip is refreshed.

## Full path list (remove from repo after local backup)

### `ARCHIVE/`

```
ARCHIVE/1
ARCHIVE/BX-06-REPORT.md
ARCHIVE/BX-07-REPORT.md
ARCHIVE/E01-NOTES.md
ARCHIVE/E01-RESULTS.json
ARCHIVE/GOLDEN-EVAL-REPORT.md
ARCHIVE/P08-SPEC.md
ARCHIVE/P09-SPEC.md
ARCHIVE/P10-SPEC.md
ARCHIVE/P11-REPORT.md
ARCHIVE/P11-SPEC.md
ARCHIVE/P12-REPORT.md
ARCHIVE/P12-SPEC.md
ARCHIVE/P13-SPEC.md
ARCHIVE/P13a-SPEC.md
ARCHIVE/P13b-REPORT.md
ARCHIVE/P13b-SPEC.md
ARCHIVE/P14-SPEC.md
ARCHIVE/P15-REPORT.md
ARCHIVE/P16-REPORT.md
ARCHIVE/P16-SPEC.md
ARCHIVE/P17-REPORT.md
ARCHIVE/P17-SPEC.md
ARCHIVE/TZ_v3.0_APPENDIX_C_traceability.md
ARCHIVE/TZ_v3.0_APPENDIX_F_jules_mistral.md
ARCHIVE/TZ_v3.0_APPENDIX_G_monitoring.md
ARCHIVE/TZ_v3.0_PATCH_HISTORY.md
ARCHIVE/TZ_v3.0_SECTION_16_7.md
ARCHIVE/TZ_v3.0_monolith.md
```

Keep in repo after cleanup: **`ARCHIVE/README.md` only**.

### `CONCEPTS/`

```
CONCEPTS/BiForge_Agent_Instructions_v1_Extracted.md
CONCEPTS/BiForge_Agent_Instructions_v2_Target.md
CONCEPTS/BiForge_Avanproekt_v3.md
CONCEPTS/BiForge_analytical_note_recommendations.md
CONCEPTS/DECISION_CARD_TEMPLATE.md
CONCEPTS/DELEGATION_PROPOSAL.md
CONCEPTS/EVIDENCE_RENDERER_SETUP.md
CONCEPTS/PA-01-SPEC_DRAFT.md
CONCEPTS/TP_BiForge_Hallucination_CrossCheck.md
CONCEPTS/TZ_BiForge_Instructions_Uncertainty.md
CONCEPTS/e01-lab-SETUP.md
CONCEPTS/e01-task.yml
CONCEPTS/universal_testing_protocol.md
```

Keep in repo after cleanup: **`CONCEPTS/README.md` only**.

### Repository root (optional)

```
CHANGELOG_AGENT_BEHAVIOR.md
```

Product history remains in `CHANGELOG.md`. Agent-behavior changelog is optional local history.

## Do **not** put on this list (stay on GitHub)

- `src/`, `server/`, `tests/`, `scripts/`, `migrations/`, `public/`, `.github/`
- Living docs: `docs/START_HERE.md`, `CURRENT_STATE.md`, `NEXT.md`, `OWNER_OPS.md`, `REPO_MAP.md`, `CONNECTIONS.md`, `AGENTS.md`, `PATCH_JOURNAL.md`, active `P26*` / `P27*` SPEC/REPORT, `BiForge_TZ_*.md`, SPEC_*, ADR_*, policies
- `README.md`, `DEPLOY_RAILWAY.md`, `CHANGELOG.md`, `package.json`, lockfiles, configs

## After a future patch closes

Move **closed** `docs/PNN-SPEC.md` + `docs/PNN-REPORT.md` into the **next** off-repo history zip (or back into a thin `ARCHIVE/` only if you want them on GitHub). Prefer off-repo for bulk; record one line in `docs/PATCH_JOURNAL.md`.

## Must remain on GitHub (CI / acceptance tests)

These were on the off-repo list but **tests open them by path** — keep on `main`:

```
ARCHIVE/GOLDEN-EVAL-REPORT.md
ARCHIVE/P15-REPORT.md
ARCHIVE/E01-NOTES.md
ARCHIVE/E01-RESULTS.json
CONCEPTS/e01-task.yml
CONCEPTS/e01-lab-SETUP.md
CHANGELOG_AGENT_BEHAVIOR.md
```

(`scripts/check-version.mjs` requires `## v24` in `CHANGELOG_AGENT_BEHAVIOR.md`.)

