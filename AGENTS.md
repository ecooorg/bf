# BiForge — AI Entry Point

The Navigator owns decisions and acceptance. The AI Assistant implements explicitly authorized changes. Read this file first, then only relevant contracts and affected source files.

## Current status

* **P81:** Dependency Intelligence context planner and deterministic pre-P81 v80 baseline.
* **P82:** Conversation/brief UI and compatibility-route extractions; Navigator reports GitHub CI green. Local full verification was blocked by an `npm ci` timeout.
* **P83:** Project Mode pagination contracts and negative tests; Navigator reports GitHub CI green. See `docs/contracts-verification-p83.json` for scope and limitations.
* **P84:** Read-only AI-native context benchmark with six curated scenarios, a pinned v80 + p80.1 comparison, gold-set recall/false-positive metrics and explicit measurement limitations. The Navigator reports GitHub CI green after the P56 check-chain fix. Gold-set maintainer review is still required; no regression gate is enabled. See `docs/context-benchmark-p84.json` and `docs/context-benchmark-verification-p84.json`.*
* **P84.2:** Documentation-only revision of the P85–P91 roadmap, selectively integrating VIX-inspired intent, invariant, counterexample, intent-diff, traceability and honest-uncertainty principles. Human simplicity is an explicit acceptance gate; no separate VIX subsystem or runtime behavior is introduced.
  * `docs/VIX-CONCEPT.md` preserves the broader VIX target architecture as a long-term conceptual reference; it does not expand the near-term implementation scope by itself.

* **Transformation track (p71–p78): ACCEPTED** (Navigator, 2026-10-23, commit `2232cb9`).
* **p79:** CI `ui-check` Playwright cache (skip apt on cache hit).
* **p80.1:** CI preflight now permits the approved flat `archive/` directory; regression coverage added.
* **p80:** Flat docs/scripts layout — phase folders removed; historical copies in `archive/`; active tools use prefixed script names under `scripts/`.
* Optional later: domain file prefixes in `server/` (`codeTask*`, …), stricter TypeScript, remaining monolith splits.

### Product / runtime (P43 / ADR-06)

* Code delivery executor **`model_patch`** is documented and env-gated: set `CODE_EXECUTOR=model_patch` only after Navigator approval (ADR-10 / E-01). Default remains `manual`.
* **GitHub write** (diff upload / App write to the repo) is **deferred** (ADR-06): off unless `GITHUB_DIFF_UPLOAD=true` and App credentials are configured. Do not enable by default.

## Navigation

* Permanent rules: `docs/AI-OPERATING-RULES.md`.
* Transformation contract (historical + gates): `docs/AI-TRANSFORMATION-SPEC.md`.
* Domain index: `docs/DOCUMENTATION-INDEX.md`.
* Baseline notes: `docs/DOCUMENTATION-BASELINE.md`.
* Operations: `docs/OPERATIONS.md`.
* Architecture guardrails: `docs/architecture-guardrails.md`.
* AI-native delivery plan P81–P84: `docs/AI-NATIVE-ROADMAP-P81-P84.md`.
* Next AI-native roadmap P85–P91: `docs/AI-NATIVE-ROADMAP-P85-P91.md` (VIX-inspired principles integrated into existing workflows; human-effort gate; future work, one patch at a time, green CI required between patches).
* Typing conventions: `docs/typing-and-naming.md`.
* Accepted Phase 5 record (archive): `archive/phase5-ACCEPTANCE.md`.
* Generated inventories: `docs/generated-*-inventory.json`, `docs/generated-module-map.json`.

## Commands

`npm ci`; `npm run build`; `npm run check`; `npm run check:docs`; `npm run docs:generate`; `npm run docs:check`; `npm run verify:change`; `npm run architecture:check`; `npm run context:plan -- --file server/codeTaskService.ts`; `npm run benchmark:context`; `npm run test:context-benchmark`; `npm run acceptance:report`. Health: `GET /health`.

## Critical rules

Preserve behavior unless change is approved. Never commit secrets. Production deployment, GitHub write, billing, credentials, bypassing security controls and executing generated code on the host require explicit owner authorization. Report passed/failed/blocked/not-run checks separately. Deliver a ZIP containing changed/new files, list deletions separately, and update this status and `CHANGELOG.md` for every patch.

Prefer a **flat** tree under `docs/` and `scripts/` (prefixed filenames). Do not add new directory levels without Navigator approval. Historical material belongs in `archive/`.

## Delegation of decisions

* **Tier 0:** Act (routine implementation inside authorised scope).
* **Tier 1:** Decide and disclose (local design choices that do not change product contract).
* **Tier 2:** Prepare a decision for the Navigator (product scope, security gates, external integrations).
* **Tier 3:** Never decide alone — merge to production, GitHub App write rights, billing, secrets, formal acceptance (MANUAL1), waiving gates.

Silence is never consent in Tiers 2 and 3.
