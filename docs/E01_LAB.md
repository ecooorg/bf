# E-01 live lab — continuation guide (Android tablet, GitHub web only)

> Binding process note for RM-B5 / TZ 11.9. **No token, no Codespaces, no Railway.** Work happens in the test repo; metrics are recorded in this repository.

## Repositories

| Role | Repo |
| --- | --- |
| Test lab | `ecooorg/biforge-e01-lab` (Private) |
| Product (notes + final table) | `ecooorg/bf` — files `ARCHIVE/E01-NOTES.md`, later `ARCHIVE/E01-RESULTS.json` |

## Lab conventions (learned 13 Oct 2026)

1. Use **`.js`**, not `.ts`, in the lab (Node 22 test runner without strip-types).
2. Each task branch sets `package.json` → `"test": "node --test tests/acceptance/<this-task>.test.mjs"` so other tasks do not fail the job.
3. `ci.yml` runs `npm test` only.
4. Branch names: `biforge/e01-tN-model` and `biforge/e01-tN-manual`.
5. **Do not merge** lab PRs until the three pairs are recorded (optional later).
6. `ciGreenFirst: да` only if the **first** CI run on that PR was green; after a fix → `нет` and `fixes: 1` (max 2).
7. `humanMinutes` = wall time you spent from “start” to green check.
8. Tool for manual side on tablet: `github-web`.

## Task definitions

| Id | Goal | Test file | Implementation |
| --- | --- | --- | --- |
| e01-t1 | `hello` function | `tests/acceptance/hello.test.mjs` | `src/hello.js` exports `hello` |
| e01-t2 | `clamp(n,lo,hi)` | `tests/acceptance/util.test.mjs` | extend `src/util.js` (from `src/util.ts` on main — convert to `.js` on the task branch) |
| e01-t3 | remove obsolete file | `tests/acceptance/obsolete.test.mjs` | delete `src/obsolete.ts` / `.js` |

## Progress (update when continuing)

| Pair | Status | Notes |
| --- | --- | --- |
| e01-t1 model_patch | **DONE** (green PR #1 after 1 fix) | sha ~`6eb8dd6`; ciGreenFirst: нет; fixes: 1 |
| e01-t1 manual | **IN PROGRESS** / next | branch `biforge/e01-t1-manual` from main; same package.json/ci/hello.js pattern |
| e01-t2 model_patch | not started | |
| e01-t2 manual | not started | |
| e01-t3 model_patch | not started | |
| e01-t3 manual | not started | |

## Next actions for the Navigator (exact order)

1. Finish **e01-t1 manual** (stage 6): branch from `main`, set package.json test to hello only, ci.yml → `npm test`, hello.test imports `.js`, create `src/hello.js`, open PR `e01-t1 manual`, wait green, fill `ARCHIVE/E01-NOTES.md`.
2. **e01-t2 model_patch**: branch `biforge/e01-t2-model` from main; package.json test → `util.test.mjs`; convert util to `.js` + add `clamp`; fix test import to `.js`; PR; record notes.
3. **e01-t2 manual**: same as model but code typed by human in web.
4. **e01-t3 model_patch** / **manual**: delete obsolete file; package.json test → `obsolete.test.mjs`.
5. Fill all six blocks in `ARCHIVE/E01-NOTES.md` (sha, ciUrl, humanMinutes).
6. Add `ARCHIVE/E01-RESULTS.json` (machine table) and ask the Assistant for the ADR-10 decision card.
7. Reply `ok ADR-10` or `no ADR-10: reason`.

## package.json snippet (per task branch)

```json
{
  "name": "biforge-e01-lab",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/acceptance/hello.test.mjs"
  }
}
```

For t2 replace `hello` with `util`; for t3 with `obsolete`.

## ci.yml snippet (all task branches)

```yaml
name: ci
on:
  push:
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: Run acceptance tests
        run: npm test
```

## Decision rule (TZ 11.9, sum of human minutes)

Positive if `model_patch` brings **≥ 2 of 3** tasks to green CI with **≤ 2** fixes each and summed `humanMinutes` for model_patch **≤** summed manual. Otherwise NEGATIVE or NEEDS_HUMAN (slower but otherwise ok). Final enablement of product `CODE_EXECUTOR=model_patch` is Tier 3 after ADR-10.

## Related

- `docs/PA-02-SPEC.md`, `scripts/e01-harness.mjs` (dry-run table helper; live on tablet is web-manual as above)
- `docs/P19x-SPEC.md`, `driveModelPatch` in `server/codeTaskService.ts` (product path; gated)
- `docs/DELEGATION.md` — test repo approved 13 Oct 2026
