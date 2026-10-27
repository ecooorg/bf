# BIForge — Current Task and Patch Control

**Current patch:** P117.1 — document the future Universal Model Resilience Layer.
**Status:** documentation-only patch prepared; no runtime changes or acceptance claims.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task, the canonical roadmap, and the user-outcome specification.
**Current specification:** `docs/AI-USER-VALUE-SPEC.md`.
**Current evidence baseline:** `docs/AI-USER-VALUE-REPORT.md`.
**Only roadmap:** `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.

## Immediate objective — P117.1

Record a bounded, user-outcome-oriented specification for a future model reliability system without implementing it now. The current user-facing-agent sequence remains P116–P120. P121 may begin only after that sequence has passed its required gates and the Navigator explicitly authorizes the work.

## P117.1 scope

- Specify a model/provider registry, health monitor, task-aware router, response validator, and recovery engine.
- Document health checks versus generation probes, resource budgets, error classes, circuit breakers, provider independence, context preservation, and honest failure behavior.
- Record model/provider families supplied by the Navigator as candidates, not as verified or enabled integrations.
- Define safeguards for cross-provider prompt transfer, free-tier quota consumption, unreviewed model discovery, and selective independent critique.
- Record open decisions for resolution before P121 launch.
- Change documentation only; do not change application code, provider settings, credentials, dependencies, package version, or runtime behavior.

## Current-line guardrails

- P116 Conversational Agent recovery remains in the authoritative roadmap and must be resolved according to the roadmap.
- P117's prepared implementation has not thereby become accepted: CI and representative runtime scenarios must be reported honestly.
- Do not start P121 or broad model integrations while P116–P120 are unresolved.
- The prior reported P115 version-consistency CI failure must not be treated as fixed without a new observed CI result.

## Acceptance criteria for P117.1

- Only the canonical specification, roadmap, current task, rolling evidence report, and changelog are updated.
- The future P121 objective and prerequisite gates are consistent across those files.
- The proposed system distinguishes reachability from answer quality and independent provider routes from multiple models behind one provider.
- Quota, billing, privacy, model-ID, probe-cost, and launch questions remain explicit rather than silently decided.
- No claim is made that any model, provider, test, build, or CI run is verified by this documentation patch.

## Delivery and verification protocol

The Navigator keeps full local backups and handles repository bookkeeping manually. Do not send a manifest unless explicitly requested. Every handoff states changed files, deletions (if any), verification actually performed, limitations, next action, and rollback guidance. Never equate documentation completeness or green CI with user-outcome acceptance.

Charter conflicts: none
