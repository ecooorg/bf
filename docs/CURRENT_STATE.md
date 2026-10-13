# Current state

> Updated 13 October 2026 after PA-05 (E-01 close + ADR-10 Accepted).

## Product

- Version **24**. P19x `driveModelPatch` gated; default `manual`. Product-facing program creation flow added in this patch: Task Package → Router JSON code author → validated ZIP artifact → optional gated GitHub PR. Generated code is not executed by BiForge; build/runtime verification remains pending CI and a separately designed sandbox runner.
- ADR-10 **Accepted** (2026-10-13). Owner may enable `CODE_EXECUTOR=model_patch` (RM-C3).
- CI: `test:p19x` / `test:pa02` / `test:pa04` scripts present.

## E-01

- Lab: `ecooorg/biforge-e01-lab`.
- **Closed.** Six pairs recorded in `ARCHIVE/E01-NOTES.md` + `ARCHIVE/E01-RESULTS.json`.
- TZ §11.9: PASS (3/3 green first, 0 fixes, model humanMinutes 0.75 ≤ manual 0.75).
- Owner decision: `ok ADR-10` (13 October 2026).

## Gates

- ADR-10 **Accepted**. Stage C (P19x enablement) open on owner command.
- RM-B5 and RM-B6 closed. Next gate steps remain owner actions (RM-B4, RM-B7, …).

## P26a (2026-10-13)

- Workspace core ingest (zip) + path/classify/hash + in-memory store.
- ADR-12 Accepted (server unpack only in Project Mode).
- `server/files.ts`: code extensions as text; openZip `..` segment fix.
- AC-01: bf-v24.zip → 345 files, stable manifestHash.
- Early model experiment: NOT_RUN (owner staging).
- Next: P26a.2 (tar, IndexedDB, WORKSPACE context) then P26b (ChangeSet).
