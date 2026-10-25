# Documentation Index

Start with repository-level `AGENTS.md`. Read only documents relevant to the task.

## Active AI-NATIVE-RENOVATION programme

* `AI-NATIVE-RENOVATION-TASK.md` — current Phase 0 task and completion criteria.
* `AI-NATIVE-RENOVATION-ROADMAP.md` — programme phases, deliverables and evidence gates.
* `AI-NATIVE-RENOVATION-MANDATE.md` — global architecture assignment and non-negotiable rules.
* `AI-NATIVE-GLOBAL-AUDIT-2026-10.md` — audit findings, evidence limits, and prioritised risks.
* `VIX-CONCEPT.md` — long-horizon strategic destination (Intent Review, formal verification, Dataflow synthesis, safe evolution). Conceptual reference; not blanket authorization for immediate implementation.
* `AI-OPERATING-RULES.md` — permanent AI operating, authorization, security and evidence rules.

## Phase 1 schemas and evidence vocabulary

Flat files under `docs/` (no nested schema directory):

* `SCHEMA-STATUS-VOCABULARY.md` — authoritative status values and non-equivalence rule.
* `schema-common.json` — shared definitions (status, provenance, schemaMeta).
* `schema-intent-policy-contract.json`, `schema-change-impact-plan.json`, `schema-verification-plan.json`, `schema-evidence-record.json`, `schema-artifact-manifest.json`, `schema-handoff-report.json`, `schema-approval-decision.json`.
* Validate: `node scripts/schemaValidate.mjs --type <artifact-type> --file <instance.json>`.

## Other active product and operational documents

* `../AGENTS.md` — repository entry point, current programme status and authorization boundaries.
* `OPERATIONS.md` — operational, deployment, rollback and backup guidance.
* `USER-GUIDE.md` — product usage for Simple, Expert and Project modes.
* `architecture-guardrails.md` — current architecture map, boundaries and inventory commands.
* `architecture-boundary-rules.json` / `architecture-known-violations.json` — architecture enforcement policy and ratchet baseline.
* `typing-and-naming.md` — current coding conventions.
* `generated-route-inventory.json`, `generated-env-inventory.json`, `generated-migration-inventory.json`, `generated-module-map.json` — generated inventories; do not hand-edit. Regenerate: `npm run docs:generate`.
* `context-baseline-v80.json` — frozen historical pre-P81 baseline (not a current generated inventory).

## Historical material and archive policy

Phase-specific reports, superseded roadmaps (P81–P91), the accepted transformation spec, documentation baseline, P103 test audit, Project Mode diagnostics proposal, App Builder TZ, and historical benchmark/verification snapshots are **candidates** for relocation into root `archive/`.

**No candidate is archived until its exact path and basename have been checked against code, tests, scripts, workflows, package scripts and active documentation.** The root `ARCHIVE-MOVE-LIST.md` is the manual checklist. Preserve original contents and dates; do not delete historical evidence.

Until manual moves are completed, those files may still exist under `docs/` but are **not** active entry points. Prefer the AI-NATIVE-RENOVATION programme documents above.

See `../ARCHIVE-MOVE-LIST.md` for the exhaustive grouped list (Groups A–D), hold reasons, and the per-file procedure.

## Generated inventories

Regenerate current inventories with `npm run docs:generate`; validate them with the repository's documentation checks. Do not hand-edit generated files.
