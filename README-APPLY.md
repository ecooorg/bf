# P26a CI fix 2 — green check-and-build

Fixes the 3 remaining FAIL after typecheck/build were green:

1. **check:docs** — `docs/REPO_MAP.md` describes `tests/workspace-*.test.mjs`, `test:p26a`, and related PA tests.
2. **test:files** — content-based text acceptance no longer treats MZ/ELF executables as text (`tool.exe` still 415).
3. **test:p13a** — `scripts/patch-tools.mjs` preflight allows `src/workspace/*` (depth-3 under `src/workspace`), same pattern as `.github/workflows`.

Also includes prior hotfix (ingest TS narrowing, codeTaskService Uint8Array).

```bash
cp -r src/workspace ./src/
cp server/files.ts server/codeTaskService.ts ./server/
cp scripts/patch-tools.mjs ./scripts/
cp tests/workspace-*.test.mjs ./tests/
cp docs/REPO_MAP.md ./docs/
# other docs from package if not already applied
npm run check:docs
npm run test:files
npm run test:p13a
npm run test:p26a
```

Verified locally: files 25/25, p13a 12/12, p26a green, check:docs OK.
