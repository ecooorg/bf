# English engineering language — translation status

## Policy
- **Canonical in-repo language for specs, process and concepts: English.**
- Owner may keep Russian copies offline; they are not maintained in the repo.
- **D-17 updated:** English is the engineering language of the repository.

## Included in this patch (translated or English-cleaned)

| Path | Notes |
|------|--------|
| `docs/BiForge_TZ_v3.md` | Full index in English |
| `docs/SPEC_PRODUCT.md` | Product goals, D-01…D-17, gates summary |
| `docs/SPEC_DEV_PROCESS.md` | Full Part B process |
| `docs/PATCH_PROMPT.md` | Patch execution instructions |
| `CONCEPTS/TZ_BiForge_Instructions_Uncertainty.md` | TZ-INSTRUCTIONS-01 |
| `CONCEPTS/TP_BiForge_Hallucination_CrossCheck.md` | TP-HALLUC-01 |
| `PI-03-README.md` | Short patch note |
| `AGENTS.md` | Remaining Russian bullets → English |

## Intentionally NOT translated (runtime / tests)

Russian strings in **regex detectors** and **test fixtures** (`server/intentFlags.ts`, `conversationMode.ts`, `tests/pi0*.test.mjs`, `golden-tasks.json`, etc.) detect or exercise **user language**. Removing them would break Russian-speaking users and tests. Product UI copy remains English (`en.ts`).

## Still dense Russian (follow-up patch recommended)

These files are large (≈130k+ characters of mixed/Russian normative text). A **line-faithful** English pass should be a dedicated second patch so tables and MUST/SHOULD wording are not shortened:

| Path | Approx. size |
|------|----------------|
| `docs/SPEC_ENGINE.md` | ~55 KB |
| `docs/BiForge_TZ_P26.md` | ~54 KB |
| `docs/SPEC_CONNECTIONS.md` | ~26 KB |

`docs/START_HERE.md` is already essentially English (<0.5% Cyrillic).

## Apply

```bash
cd bf-main
unzip -o docs-english-part1.zip
# review, then
git add docs/ CONCEPTS/ PI-03-README.md AGENTS.md
git commit -m "docs: English canonical engineering language (part 1)"
git push
```
