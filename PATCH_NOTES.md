# CI fix + UI polish

## Root cause of ui-check failure
`tests/ui-check.mjs` waited for `input[aria-label="Gemini API key"]`.
The UI patch renamed the aria-label → timeout on every viewport.

## Fix
1. `src/App.tsx` — aria-label restored to `Gemini API key` (visible text stays “Your Google AI key”)
2. `tests/ui-check.mjs` — accepts either aria-label

## check-and-build (3 FAIL)
Build step itself passed. The independent `npm run check` stages had 3 failures.
This package keeps all source patterns that bx06 / program-creation / package-c assert on.

If check-and-build still fails after this, open the job log lines like:
  [FAIL] test:something
and send those three names.

## Apply (bf-main root)
```bash
unzip -o ui-polish-ci-fix.zip
bash APPLY.sh
git add src/ tests/ui-check.mjs
git commit -m "UI polish + fix ui-check Gemini API key selector"
git push
```
