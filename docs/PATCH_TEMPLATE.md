# Patch spec template

> Copy to `docs/PNN-SPEC.md` at the start of each patch (replace NN). Keep it short: one page.

## PNN — title

**Goal.** One or two sentences: what result exists after the patch.

**Base.** The archive the owner uploaded (name, date) and the last confirmed upload.

**May change.** Files and areas allowed.

**Must not change.** Files and behaviour that stay as they are (by default: everything else, Simple Mode behaviour, existing tests).

**Files.** Expected list: new / changed.

**PASS criteria.**
- Machine: which commands must pass in CI (`npm run check`, `npm run build`, others).
- What the owner will see and press on Railway (2–3 actions with the expected result).
  1. Action → expected result.
  2. Action → expected result.

**Read in the TZ.** Sections (see the table in `docs/START_HERE.md`).

**Tests to add or change.** File, what it proves. Tests change together with behaviour.

**`CHANGELOG.md`.** The line to add.

**Not done / postponed.** What is deliberately left out.
