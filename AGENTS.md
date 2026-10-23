# BiForge — AI Entry Point

The Navigator owns decisions and acceptance. The AI Assistant implements explicitly authorized changes. Read this file first, then only relevant contracts and affected source files.

## Current status

* **p71–p74:** Phase 0–2b (audit, guardrails, server routes, App split, cycle break).
* **p75–p75.7:** Phase 3 start + CI stabilisation (imports, static tests, gitleaks, lease-loss timing).
* **p76 (Phase 3 closed):** branded path-param validation, shared idSchema in codeTaskService, `docs/phase3/PHASE3-COMPLETE.md`.
* **Next:** **p77** Phase 4 doc generators → **p78** Phase 5 acceptance — follow `docs/phase4-5-ROADMAP.md`.


## Navigation

* Permanent rules: `docs/AI-OPERATING-RULES.md`.
* Detailed transformation requirements and gates: `docs/AI-TRANSFORMATION-SPEC.md`.
* Domain reference index: `docs/DOCUMENTATION-INDEX.md`.
* Evidence and limits: `docs/DOCUMENTATION-BASELINE.md`.
* Phase 0 audit: `docs/phase0/BiForge-v70-Phase0-Audit.md`.
* Phase 1 guardrails: `docs/phase1/PHASE1-GUARDRAILS.md`.
* Current operational procedures: `docs/OPERATIONS.md`.

## Commands

`npm ci`; `npm run build`; `npm run check`; `npm run check:docs`; `npm run verify:change`; `npm run architecture:check`. Health endpoint: `GET /health`.

## Critical rules

Preserve behavior unless change is approved. Never commit secrets. Production deployment, GitHub write, billing, credentials, bypassing security controls and executing generated code on the host require explicit owner authorization. Report passed/failed/blocked/not-run checks separately. Deliver a ZIP containing changed/new files, list deletions separately, and update this status and `CHANGELOG.md` for every patch.

## Delegation of decisions

* **Tier 0:** Act (routine implementation inside authorised scope).
* **Tier 1:** Decide and disclose (local design choices that do not change product contract).
* **Tier 2:** Prepare a decision for the Navigator (product scope, security gates, external integrations).
* **Tier 3:** Never decide alone — merge to production, GitHub App write rights, billing, secrets, formal acceptance (MANUAL1), waiving gates.

Silence is never consent in Tiers 2 and 3.
