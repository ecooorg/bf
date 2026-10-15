# Patch journal

- PLAN-EXPERT-OPEN / UI1 scope (2026-10-15) — docs only: Expert open dialogue planned in UI1 after P38/P39.
- P41 (2026-10-15) — UI1 start screen: added explicit Simple / Expert / Project cards; unavailable Project is shown as a disabled state, and selection does not automatically switch modes. Added the missing folder-to-menu history entry for the existing `PICK_FOLDER_EVENT` UI behavior (folder picker is exposed from the unified More menu; no runtime behavior change in this entry). Updated STATUS sequence to include QA1 between UI1 and MANUAL1 and closed the UX1 feedback question.
- P42 (2026-10-15) — QA1 offline cross-mode suite: classification, information soft-fail/retry, Expert/Project instruction isolation, UI1 start-card contracts, honesty/core and triage wiring; no product behaviour change.
- P44 (2026-10-15) — CI hotfix: REPO_MAP entries for test:qa1/test:p43; p41 STATUS marker order; qa1 runs with `node --import tsx`.
- P43 (2026-10-15) — RM-C3 closed by owner command: `CODE_EXECUTOR=model_patch` authorized after ADR-10 / E-01; process/docs only. GitHub App write permissions remain deferred. Product runtime still reads the env var at start time.
- P40 (2026-10-15) — process-only: made `bf-PNN.zip` the mandatory verified delivery artifact; clarified blocked-delivery behavior and added a regression guard for the contract and packer default. Product behavior/version unchanged.
- P39 (2026-10-15) — TAR ingestion duplicate-path hardening; deterministic first-wins handling and regression test.
