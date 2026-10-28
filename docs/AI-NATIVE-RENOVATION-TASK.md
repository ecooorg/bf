# BiForge — Current Task and Patch Control

**Current patch:** P118 — Complex Software Architect Agent (completion contract and false-success gate).
**Status:** implementation in progress. P116 accepted by Navigator with residual B3. P117.3 closed.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task, the canonical roadmap, and the user-outcome specification.
**Current specification:** `docs/AI-USER-VALUE-SPEC.md` section A3.
**Current evidence baseline:** `docs/AI-USER-VALUE-REPORT.md`.
**Only roadmap:** `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.

## Closed — P117.3 / P116 residual

- Live retest #2: 12/15 PASS (80%), 0 hard failures. Stock caveats on B6/D1 removed. B3 (Node LTS concrete version) remains PARTIAL.
- Navigator decision: **P116 Yes with residual B3**; residual tracked for optional follow-up, does not block P118.
- P117.3 closed as the Conversational Agent recovery implementation line for this programme sequence.

## Immediate objective — P118

Implement the Complex Software Architect Agent completion contract on top of the existing App Builder / Project Mode pipeline so that:

1. `SUCCESS` requires non-empty project files, required validators actually run and pass, and a non-empty integrity-checked archive.
2. `PARTIAL` / `FAILED` expose `failedStage`, `failureReason`, and truthful `checksDeclared` / `checksRun` / `checksNotRun`.
3. False success (empty panels, empty ZIP, validators not run marked as complete) is impossible under the report contract.
4. Representative unit tests cover SUCCESS path and empty-artifact non-SUCCESS.

### Out of scope for this first P118 slice

- Removing legacy four-mode UI (P119).
- Full multi-stack generation beyond current static-site validators.
- Live E2E browser acceptance of Architect (later slice with evidence).
- P121 model resilience layer.
- Fixing residual B3 Node LTS SERP extraction (optional backlog).

### Acceptance for this slice

- Unit tests green for outcome fields and empty-artifact gate.
- Hosted CI green on version 118.
- No claim of full A3 product acceptance until a representative live artifact scenario is evidenced.

## Residual backlog (non-blocking)

- B3: extract concrete Node.js LTS version number from SERP/digest when present.
- B1: tighter week window on climate news (ND-4 kept conservative).
