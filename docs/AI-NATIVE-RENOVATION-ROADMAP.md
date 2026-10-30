# BiForge — User-Outcome Programme Rules

**Purpose:** this file records the programme-wide rules for choosing and accepting work. The sole implementation sequence is `../ROADMAP.md`; do not maintain a competing patch roadmap here.
**Primary objective:** deliver useful, truthful, accessible user outcomes in the running product. Internal architecture, tests, CI, and evidence tooling support that objective and are never substitutes for it.

## Product target

BiForge exposes exactly three user-facing agents, with the contracts in `AI-USER-VALUE-SPEC.md`:

- **Conversational:** relevant answers, context continuity, current evidence when needed, calibrated uncertainty, useful recovery.
- **Expert:** sustained investigation, facts/hypotheses, meaningful alternatives, synthesis, prioritized action plan, durable progress.
- **Architect:** one user-facing mode and one coherent workflow from software goal to verified downloadable artifact or truthful actionable failure. No simplified/novice versus professional/advanced chooser or independent Architect paths.

## Current known gap

The inspected source still contains `ProjectPathChooser`, the labels “Simple words” and “Professional”, `builderPath`, and separate novice/professional branches. P120 E2E uses deterministic API fixtures for the Architect artifact; it does not establish live generation quality. These are explicit open product gaps, not acceptable transitional states.

## Rules for selecting work

1. Start from a specific user problem and the intended end result.
2. Name the product behavior that will change and the evidence that can prove the result.
3. Prefer the smallest change that closes a measured or contract-defined user-outcome gap.
4. Do not add internal abstractions, tests, providers, or roadmap branches without a concrete value hypothesis.
5. Capture representative baselines before changing prompts, orchestration, verifiers or model routing where feasible.
6. Distinguish source-level checks, mocked tests, CI, live-provider calls, deployed UI sessions and actual user artifacts.
7. Never claim success for unrun checks, empty artifacts, unsupported task types, or unverified output.
8. Failures must identify the stage, cause where known, partial artifacts if any, and the next safe action.
9. Security, privacy, authorization, evidence integrity and user data safety are non-negotiable.
10. Close the programme only when all three user-outcome contracts have representative evidence and the Navigator explicitly accepts the result.

## Current sequence

See `../ROADMAP.md` for the single authoritative sequence. The immediate product implementation is the single Architect workflow. After that, evaluate real Conversational and Expert tasks and apply the final user-value release gate. No separate universal model-resilience/provider-expansion project is part of the committed sequence unless a measured user outcome and explicit authorization justify it.
