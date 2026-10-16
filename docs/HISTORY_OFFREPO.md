> Progress pointer for humans: docs/STATUS.md (not this file).

# History kept off the GitHub repo (owner disk)

> **Policy (updated 2026-10-16).** Closed historical and non-binding concept files may live only on the owner’s disk (zip backup), not on main.
> After patch offrepo-B (relaxed path tests), the former CI-required ARCHIVE/CONCEPTS evidence files may also be removed from main once copied locally.
> Do not delete without a local copy (or a prior patch snapshot).

## How to archive

1. Save a zip outside the repo, e.g. bf-history-2026-10-16.zip.
2. Delete listed paths from main.
3. Keep ARCHIVE/README.md and CONCEPTS/README.md stubs.
4. Refresh this file’s date when the zip is updated.

## Safe to remove after local backup (group A + group B)

### ARCHIVE (entire bulk; keep only README)

- ARCHIVE/E01-NOTES.md
- ARCHIVE/E01-RESULTS.json
- ARCHIVE/GOLDEN-EVAL-REPORT.md
- ARCHIVE/P15-REPORT.md
- ARCHIVE/bf_v40_* (all audit csv/md)
- ARCHIVE/*-SPEC.md and ARCHIVE/*-REPORT.md (closed history)
- ARCHIVE/TZ_* excerpts

Keep: ARCHIVE/README.md only.

### CONCEPTS (entire bulk; keep only README)

- CONCEPTS/e01-lab-SETUP.md
- CONCEPTS/e01-task.yml
- CONCEPTS/TP_BiForge_Hallucination_CrossCheck.md
- CONCEPTS/TZ_BiForge_Instructions_Uncertainty.md
- CONCEPTS/universal_testing_protocol.md
- any other drafts under CONCEPTS/

Keep: CONCEPTS/README.md only.

### Root noise (if still present)

- e01-lab-SETUP.md, e01-task.yml
- CHANGELOG_UX1.md, CHANGELOG_snippet.md
- PATCH_NOTES.md, PI-03-README.md
- QA_DRIVE_CHECKLIST.md, TRANSLATION_STATUS.md, CHECKSUMS.txt

## Must remain on GitHub

- src/, server/, tests/, scripts/, migrations/, public/, .github/
- Living docs: STATUS, OWNER_OPS, REPO_MAP, CONNECTIONS, AGENTS, PATCH_JOURNAL, ADR_*, active SPEC/REPORT, TZ
- README.md, DEPLOY_RAILWAY.md, CHANGELOG.md, CHANGELOG_AGENT_BEHAVIOR.md (version-check)
- package.json, lockfiles, configs
- ARCHIVE/README.md, CONCEPTS/README.md

CHANGELOG_AGENT_BEHAVIOR.md is not optional: scripts/check-version.mjs requires matching ## vN headings.

## Tests (offrepo-B)

Path presence of ARCHIVE E01/P15/GOLDEN and CONCEPTS e01 is no longer asserted. Generators and ADR-10 remain covered offline.
