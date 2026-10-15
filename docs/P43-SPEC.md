# P43 — RM-C3 close: authorize `model_patch`

**Goal.** Close owner checklist **RM-C3** after explicit owner command: record that `CODE_EXECUTOR=model_patch` is authorized following accepted ADR-10 / E-01 evidence. No product code path change; runtime still gates on the environment variable.

**Base.** Repository state after P42 (QA1 offline suite) on top of `bf-v40.zip`.

**Owner command.** 2026-10-15: «хорошо давай сделаем этот патч и откроем эту возможность» (enable RM-C3 / `model_patch`).

**May change.** `docs/STATUS.md`, `docs/NEXT.md`, `docs/PATCH_JOURNAL.md`, `docs/OWNER_OPS.md`, `docs/DELEGATION.md`, `docs/P43-SPEC.md`, `docs/P43-REPORT.md`, `CHANGELOG.md`, `.env.example`, `tests/p43-rm-c3.test.mjs`, `package.json` (test script only).

**Must not change.** `server/codeExecutor.ts`, `server/codeTaskService.ts` behaviour; GitHub App permissions; `GITHUB_DIFF_UPLOAD` default; merge rules; Simple Mode; product `APP_VERSION` (process gate, same precedent as P40).

**PASS criteria.**
- STATUS / NEXT / OWNER_OPS record RM-C3 closed and owner authorization date.
- Docs state clearly: enablement at runtime requires Railway (or equivalent) `CODE_EXECUTOR=model_patch`; default without the var remains `manual`.
- GitHub App **write** remains deferred (ADR-06); not opened by this patch.
- `node --test tests/p43-rm-c3.test.mjs` passes (docs + env-gate contract).
- No claim that Railway Variables were modified by the agent.

**Not done.** Live Project Mode code-task smoke with real provider; GitHub write permission changes; MANUAL1.
