# BiForge — Current Task and Patch Control

**Current patch:** P120.0.8 — reconcile the normative documentation around user value and the single Architect workflow. Documentation only; no runtime behavior changes.
**Current product state:** P119's three top-level agent names and P120's reported technical E2E/evidence gates exist. The inspected source still exposes two Architect submodes. Therefore the product is not complete against the user-outcome contract, regardless of green CI.
**Next implementation:** P120.0.9 — implement one Architect mode and one coherent workflow as specified by `TECHNICAL_SPECIFICATION.md` §6.3 / REQ-A3-002 and `ROADMAP.md` Phase 7.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task and the top of `NEXT_PATCH.md` > protected root documents for product and engineering contracts.

## Current evidence

- Navigator-supplied P120 Acceptance Evidence and P120 Commit-Bound Evidence report PASS for commit `d411b982186276708d31173f62b574aed19ebd63`. This confirms the listed technical checks for that commit only; it does not prove live generation quality or the missing single-mode contract.
- The checked source contains `src/ProjectPathChooser.tsx`, “Simple words” / “Professional” cards, `builderPath`, `ProjectNoviceWizard`, and a separate professional workspace branch.
- `tests/p120-architect-e2e.test.mjs` uses deterministic project/build API fixtures. It verifies browser download and ZIP validators against a fixture, not arbitrary live model-generated software.
- Historical P118 live evidence recorded one successful staged ZIP delivery. It remains valid historical evidence for that run, not a universal guarantee for the current workflow.
- No remote repository or live deployment was independently inspected as part of the documentation patch.

## Product acceptance rule

A product task is complete only when a representative user receives the intended useful, truthful, accessible result, or a truthful actionable failure. CI, typecheck, architecture checks, deterministic mocks, and browser wiring are supporting evidence and must be labelled accurately; none alone closes product-value acceptance.

## Next implementation scope — P120.0.9

1. Remove the Architect mode chooser from the user journey.
2. Remove `builderPath` branching between separate novice and professional workflows.
3. Implement one state machine from software goal through requirement confirmation, planning, generation, validation/build, bounded repair, package verification and delivery/recovery.
4. Reuse existing code only when it serves the target workflow; preserve useful capabilities inside the one workflow, not as a second mode.
5. Add a regression assertion that the chooser and submode labels are absent and that the single completion contract is used.
6. Run a real generated-project scenario on the deployed application, with redacted transcript and artifact integrity evidence; report failure honestly if no valid artifact is produced.
7. Avoid unrelated changes to other agents or provider infrastructure unless a demonstrated dependency blocks the user outcome.

## Required product gate after implementation

- Architect: no submode selector; one workflow; real generation; relevant build/validation; verified non-empty ZIP; user-accessible download, or stage-specific failure and recovery.
- Conversational: current representative live tasks cover direct answers, freshness, context follow-up and tool failure.
- Expert: representative live multi-turn task covers investigation, facts vs hypotheses, distinct alternatives, synthesis, action plan and recovery.
- Final programme closure requires all three agent contracts to be evaluated against actual user-visible outcomes and explicit Navigator acceptance.

## Constraints

- Do not revive superseded roadmap branches or provider-expansion proposals as active work.
- Do not remove or weaken security, privacy, authorization, artifact-integrity or evidence-integrity controls.
- Do not claim a live run, CI run, deployment check or generated artifact that was not actually observed.
- Preserve optional P118 residuals (PARTIAL-download policy and dependency audit for `zod`, `body-parser`, `qs`) as OPEN until separately verified; do not let them displace the known product-value work unless a concrete release risk is established.
