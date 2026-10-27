# BIForge — Authoritative Renovation Roadmap

**Authority:** `AGENTS.md` charter. This is the only roadmap. Update it in place; do not create per-patch roadmap files.
**Primary objective:** deliver useful, truthful user outcomes in the running product. Internal architecture and green CI are supporting means, not product acceptance.

## Current priority: recover the three user-facing agents

The Navigator reports that all four current modes fail to provide acceptable outcomes. P114 source/log evidence confirmed one real project-build failure (`invalid_spec`, zero files, one model call, about 73 seconds), opt-in web search with some requests skipped, shared Simple/Expert conversation orchestration, and multiple project build branches. The four end-to-end failures were not all reproduced in a live authenticated session. See `docs/AI-USER-VALUE-REPORT.md`; observed facts and hypotheses must remain distinct.

## Patch sequence

| Patch | Purpose | Completion gate |
|---|---|---|
| P113 | Three-agent user-outcome contract | Accepted; contract maintained in `docs/AI-USER-VALUE-SPEC.md` |
| P114 | Source/log audit baseline | Delivered; live reproduction incomplete; see rolling report |
| **P115** | Consolidate documentation, remove competing sources of truth, correct sequencing | One authoritative specification, roadmap, task, and rolling evidence report; no runtime claims |
| **P116** | Recover Conversational Agent | Representative stable-knowledge, freshness/search, multi-turn context, tool/provider failure and truthful-error scenarios pass; live-provider and mocked evidence separated |
| **P117** | Implement Expert Problem-Solving Agent and model cascade foundations | Expert prompt contract strengthened; primary Gemini order aligned across modes; hourly candidate probes and opt-in Groq/Cloudflare fallback covered by tests; full independent state machine and E2E acceptance remain open |
| **P118** | Implement Complex Software Architect Agent | Produces actual non-empty files; validates requirements; runs declared checks; packages and verifies archive; exposes downloadable artifact or truthful stage-specific failure and recovery action |
| **P119** | Migrate product from four legacy modes to three agents | UI exposes exactly three approved agents; old routing/state paths removed or explicitly isolated; no regression in accepted agent scenarios |
| **P120** | Cross-agent end-to-end acceptance and stabilization | Representative scenarios for all three agents pass; failures are truthful; artifacts are accessible and valid; remaining limitations explicit; no false-success claims |

## Programme rules and gates

1. One patch has one bounded outcome. Do not start the next patch until the current handoff is resolved as required by its authorization tier.
2. The target architecture and per-agent contracts are in `docs/AI-USER-VALUE-SPEC.md`. Do not duplicate them here.
3. The latest evidence is at the top of `docs/AI-USER-VALUE-REPORT.md`. Append a record there after each patch that changes or evaluates user-visible behavior; do not create a new report per patch.
4. A product claim requires evidence for the actual outcome. CI green alone does not prove a user got a useful answer or artifact.
5. Report each relevant check as PASS, FAIL, BLOCKED, TIMEOUT, PARTIAL, NOT_RUN, or UNKNOWN accurately. Never promote an unrun check to PASS.
6. Prefer the smallest implementation that improves a measured or explicitly scenario-tested user outcome. No unrelated refactoring.
7. Before prompt/instruction/model-cascade changes, capture baseline cases where feasible and compare outputs using a consistent rubric.
8. Security, privacy, authorization, evidence integrity, and existing verification gates must not be weakened to obtain green results.
9. Production deployment, GitHub writes, billing, secrets, privileged host execution, and formal acceptance retain their existing authorization tiers.
10. If a patch drifts toward internal restructuring without a concrete, testable user-outcome benefit, stop and ask the Navigator.

## Broader AI-native/VIX programme

Previously completed foundations remain available: schemas/evidence, verification DAG, bounded repair/diagnostics, intent-policy contracts, capability graph, and context/impact planning (P106–P112). They are not a reason to delay user-facing repairs unless a demonstrated defect blocks them.

The longer-horizon VIX phases remain strategic direction, not authorization for immediate broad implementation. Continue only when the current user-outcome track is accepted and the next VIX slice has an explicit value hypothesis, bounded scope, safety boundaries, and evidence gate.

## Status vocabulary

`PASS`, `FAIL`, `BLOCKED`, `TIMEOUT`, `PARTIAL`, `NOT_RUN`, `UNKNOWN`, `NOT_REPRODUCED`. These are not interchangeable. In particular, NOT_RUN and NOT_REPRODUCED never mean success.
