# P13a — Process automation (BX-28)

**Goal.** One command builds the cumulative archive and the report, the preflight refuses a bad archive, and the CI result reaches the owner as one line. TZ: 16.3.2, 16.4 (P13a), BX-28. Builds on P14.

**Base.** Archive `bf-main.zip` (repository after P14).

**Defaults chosen.**
1. Command: `npm run patch:pack -- --base <archive.zip|folder> --patch <PNN> --agent "<tool, model>"` with options `--out` (default `patch.zip`), `--report` (default `patch-report.md`), `--ci`, `--skip typecheck,check,live,build`, `--notes`, `--owner-steps "a;b;c"`. Both default outputs and any `*.zip` in the root are ignored by the diff, so they never enter an archive.
2. No new dependency: archives are read and written with `jszip` (already a dependency); no `zip`/`unzip` program is needed.
3. Diff: changed = replace, new = add, missing from the work tree = delete (listed in the line and the report, never in the archive). A single wrapper folder of the base archive (GitHub `repo-main/`) is stripped.
4. Preflight (any violation: no archive, exit 1): manifest or file-list file in the root; nested folder (only the root, one level in `server src tests scripts docs migrations public`, and `.github/workflows` are allowed); wrapper or new top-level folder; unsafe path; possible secret (patterns for common key formats, private keys, passwords in URLs, long quoted secrets; paths allowlisted in `.gitleaks.toml` are skipped, as gitleaks does); a change or deletion of `tests/acceptance/**`; stale document links (`scripts/check-docs.mjs` on the work tree). This is a first line of defence; the gitleaks scan in CI stays the authority.
5. Report: Russian, from `docs/STEP_REPORT_TEMPLATE.md` headings; only commands the script really ran, each `PASS`, `FAIL`, `BLOCKED` (no `node_modules`) or `NOT_RUN` with the reason (not requested, skipped, no `DATABASE_URL`). `check` and `build` run without `DATABASE_URL` (as in CI); live tests run only when it is set. Overall status `PASS` only means local checks; CI gives the real PASS (D-08). A failed command: report written, no archive, exit 2. The report ends with three owner actions (default text unless `--owner-steps`).
6. CI result: `ci.yml` keeps its steps, writes the logs of `check`, live tests and API tests with `tee`, and a last step `if: always()` runs `scripts/ci-summary.mjs`: one line in the job summary and, when red, an error annotation with the first failed test (GitHub sends the failure notification; no new secret, no network). Not changed: triggers, permissions, services, gitleaks step.
7. `docs/NEXT.md` stays a manual update at the end of every patch (AGENTS.md section 5).

**Extended tests (TZ 16.4.4).** Item 12 (documents) is already enforced by `check:docs` (P14); the new scripts and test are described in `docs/REPO_MAP.md`. Items 1-11 and 13 do not apply: no routes, plans, database or screen.

**May change.** New `scripts/patch-tools.mjs`, `scripts/patch-pack.mjs`, `scripts/ci-summary.mjs`, `tests/p13a-acceptance.test.mjs`; `.github/workflows/ci.yml` (logs and the last step only), `package.json` (scripts `patch:pack`, `test:p13a`), docs, `CHANGELOG.md`.
**Must not change.** Simple Mode, `server.ts`, `server/`, migrations, earlier tests, `tests/acceptance/**`, `AGENTS.md`.

**PASS.** `npm run check` (with `test:p13a`), `npm run build`. Preflight rejects a manifest, a nested folder, a secret and a changed `tests/acceptance/**` path; the pack lists replaced, added and deleted files correctly; the report shows unrun commands as `NOT_RUN`.

**Not done.** Running `npm run patch:pack` by the owner on a phone (it is a command for the AI Assistant's environment); the gitleaks scan of the archive (CI does it after upload); mail or chat notification beyond the standard GitHub one.

**Owner check.** After upload, open the Actions run of the commit: the job summary shows `CI: green` (or `CI: red. First failed: ...`). The first real use of `patch:pack` is the next patch, P13b.
