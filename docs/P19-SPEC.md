# P19 — model_patch executor (BX-21.b)

**Goal.** Implement the `model_patch` CodeExecutor: structured patch from `code_author`, deterministic validation (TZ 11.4), application via Git Data API to `biforge/<task_id>` and PR. ADR-10 is now Accepted after E-01 (PA-05); enablement still requires the owner to explicitly set `CODE_EXECUTOR=model_patch`.

**Base.** bf-v18 (P18 complete).

**May change.** `server/codeExecutor.ts` (schemas, validateModelPatch, createModelPatchExecutor), `server/codeTaskService.ts` (selectExecutorId, executorFor), tests, this SPEC, docs (CURRENT_STATE, NEXT, CHANGELOG, AGENTS, START_HERE), `scripts/pack-simple.mjs` (replacement packer), `scripts/patch-tools.mjs` (ALLOWED_TOP), ARCHIVE/ and CONCEPTS/ restructuring.

**Must not change.** Simple Mode, manual executor behaviour when CODE_EXECUTOR is not model_patch, Gate Engine, existing routes for human delivery.

**Acceptance (machine).**
- Protected path / path escape / size limit / schema-invalid patches are rejected (validateModelPatch).
- Valid structured patch converts to BranchChange and can be committed (when GitHub writes enabled).
- `npm run test:p18` and new model-patch unit tests pass; `npm run check` green where runnable.
- Pack produces `bf-P19.zip` with only changed/new files, correct relative paths, no deleted files inside ZIP.

**ADR-10.** Code is present and gated. E-01 is closed and ADR-10 is Accepted; final enablement still requires an explicit owner environment change. Default remains `manual`.

**Read in the TZ.** 11.4, 11.9, 16.4.2 (P19), ADR-10.
