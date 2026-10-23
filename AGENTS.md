# BiForge — AI Entry Point

The Navigator owns decisions and acceptance. The AI Assistant implements explicitly authorized changes. Read this file first, then only relevant contracts and affected source files.

## Current status

* Code delivery: scaffold ZIP works without a model; optional model slice uses `CODE_EXECUTOR=model_patch` and `APP_BUILDER_MODEL_SLICE=true`. The legacy `engine: "model_patch"` path remains available, subject to runtime gates.
* GitHub write: deferred (ADR-06), disabled by default; `GITHUB_DIFF_UPLOAD` is an explicit opt-in switch and `model_patch` alone never enables write.
* **p71 (Phase 0 audit):** static forensic audit complete — inventories and report under `docs/phase0/`.
* **p72 (Phase 1 guardrails):** architecture map, cycle/boundary ratchet, change-impact, `npm run verify:change`.
* **p73 (Phase 2a):** `server.ts` route groups extracted to `server/authRoutes.ts`, `server/projectRoutes.ts`, `server/opsRoutes.ts`. Behaviour preserved; middleware order unchanged.
* Next authorized work: **p74** (Phase 2b — App.tsx / large services) after Navigator accepts p73.

Owner retains the original prototype archive. Previous state and evidence are in `CHANGELOG.md`; historical claims are not proof of current behavior.

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
