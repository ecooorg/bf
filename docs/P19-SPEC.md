# P19 — model_patch executor (BX-21.b)

**Goal.** Implement the `model_patch` CodeExecutor: structured patch from `code_author`, deterministic validation (TZ 11.4), application via Git Data API to `biforge/<task_id>` and PR. Gated by `CODE_EXECUTOR=model_patch` until ADR-10 final decision after E-01.

**Base.** bf-v18 (P18 complete).

**May change.** `server/codeExecutor.ts` (schemas, validateModelPatch, createModelPatchExecutor), `server/codeTaskService.ts` (selectExecutorId, executorFor), tests, this SPEC, docs (CURRENT_STATE, NEXT, CHANGELOG, AGENTS, START_HERE), `scripts/pack-simple.mjs` (replacement packer), `scripts/patch-tools.mjs` (ALLOWED_TOP), ARCHIVE/ and CONCEPTS/ restructuring.

**Must not change.** Simple Mode, manual executor behaviour when CODE_EXECUTOR is not model_patch, Gate Engine, existing routes for human delivery.

**Acceptance (machine).**
- Protected path / path escape / size limit / schema-invalid patches are rejected (validateModelPatch).
- Valid structured patch converts to BranchChange and can be committed (when GitHub writes enabled).
- `npm run test:p18` and new model-patch unit tests pass; `npm run check` green where runnable.
- Pack produces `bf-P19.zip` with only changed/new files, correct relative paths, no deleted files inside ZIP.

**ADR-10.** Code is present and gated. Final enablement remains pending E-01 evidence and owner decision. Default remains `manual`.

**Read in the TZ.** 11.4, 11.9, 16.4.2 (P19), ADR-10.
