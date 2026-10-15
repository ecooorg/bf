# P44 — CI hotfix for P42/P43

**Goal.** Make `npm run check` green after P42/P43: fix `check:docs` REPO_MAP gaps, p41 STATUS marker regression, and qa1 TypeScript loader in CI.

**Base.** main after P43 upload (CI red: check:docs 4 problems; test:p41; test:qa1).

**May change.** `docs/REPO_MAP.md`, `docs/STATUS.md`, `docs/PATCH_JOURNAL.md`, `CHANGELOG.md`, `tests/p41-ui1.test.mjs`, `package.json`, this SPEC/REPORT.

**Must not change.** Product runtime behaviour, model_patch env gate, App.tsx semantics.

**PASS.** `check:docs` clean for new tests/scripts; `test:p41` and `test:qa1` pass under the same runner flags as CI.
