# BiForge — Current Task and Patch Control

**Applied patch:** P118.3.2 (program version 118; source: `package.json` only).
**Phase:** P118 Complex Software Architect Agent — NOT closed.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task, the canonical roadmap, and the user-outcome specification.
**Current specification:** `docs/AI-USER-VALUE-SPEC.md` section A3.
**Version rules:** `AGENTS.md` "Version and patch numbering". `package.json` is in every patch.

## State (evidence in `docs/AI-USER-VALUE-REPORT.md`)

- P116 accepted with residual B3. P117.3 closed.
- P118 completion contract, live workflow `p118-architect-live`, CSRF runner fix, evidence enrichment: delivered (P118 / P118.2 / P118.2.1 / P118.2.2).
- P118.3: Spec-stage bounded repair + assistant diagnostics. Commit `1a98a6a` was RED in hosted CI (type errors + version gate).
- P118.3.1: CI repair (type narrowing in `appBuilder/core-engine.ts` under `strict:false`; version label). Local DAG: 23 PASS, 3 BLOCKED (database checks need Postgres). Hosted CI: NOT_RECORDED here.
- P118.3.2: version single-source mechanism + documentation audit. No product behavior change.
- Live Architect runs: #1 BLOCKED (runner CSRF defect, fixed); #2/#3 and the 2026-10-28 run on commit `7c51c5e` = HONEST_NON_PASS (`invalid_spec`, one call, no ZIP). That last run executed the old engine, so P118.3 is NOT yet evaluated live.

## Next (in order)

1. Apply P118.3.1 and P118.3.2; hosted CI must be green on the resulting commit.
2. Deploy; confirm `/health` commit equals that commit.
3. Dispatch `p118-architect-live` once. Record the result in the report (newest first).
4. Decide by the P118 exit gate in the roadmap: closed → P119; otherwise fix by the concrete stage/cause now visible in diagnostics (`spec_attempt` / `spec_repair` / `spec_failed` events, `error.detail.issues`, model response previews).

## Not authorized

P119 work (UI migration to three agents) before the P118 exit gate is met and the Navigator accepts P118.
