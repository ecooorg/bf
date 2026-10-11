# ADR-10 — CodeExecutor composition after E-01

## Status: PENDING E-01

## Context
BiForge_TZ_v3.md §11.9 requires a three-pair experiment comparing `manual` with `model_patch` on the same small real tasks, using prewritten acceptance tests. The decision threshold is defined by the TZ and must be based on measured results, not synthetic tests.

## Decision
No final decision is made by this patch. Until E-01 evidence is recorded and reviewed by the owner, the supported execution path remains `manual`; `model_patch` is not enabled and no Code Delivery capability is implied.

## Required evidence
For each of three task pairs, record: whether the patch applies, whether CI passes on the first attempt, number of repairs (maximum two), human time, model-call cost, checked commit SHA, test/CI links, and any `BLOCKED`/`NOT_RUN` checks.

## Decision rule
Apply the decision rule in BiForge_TZ_v3.md §11.9 without modification. If the threshold is met, the owner may approve `model_patch` for BX-21.b. If it is not met, keep Code Delivery in `manual` mode or narrow S3 as specified by the TZ.

## Consequences
BX-18.b and the G2 evidence package remain open until E-01 is performed and the owner records a final decision.
