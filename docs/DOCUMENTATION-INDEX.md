# Documentation index

Repository audience: AI assistants (see `AI-NATIVE-RENOVATION-TASK.md`, section 1). Read only what the trigger names. Sizes are approximate.

## Mandatory for every session

| File | Size | Content |
|---|---|---|
| `../AGENTS.md` | 11 KB | Status, authorization tiers, critical rules, commands, documentation policy |
| `AI-OPERATING-RULES.md` | 5 KB | Permanent AI operating, authorization, security and evidence rules |
| `AI-NATIVE-RENOVATION-TASK.md` | sections 1–2 and the current patch | Directive, per-patch scope, gates |

## On demand

| File | Read when |
|---|---|
| `AI-NATIVE-RENOVATION-ROADMAP.md` | Planning a phase transition or a gate |
| `AI-NATIVE-RENOVATION-MANDATE.md` | Questions about delivery constraints, acceptance rules, evidence semantics |
| `AI-NATIVE-GLOBAL-AUDIT-2026-10.md` | Need the findings and evidence limits behind the programme |
| `VIX-CONCEPT.md` | Phase 3+ design only; not authorization for implementation |
| `OPERATIONS.md` | Configuration, deployment, rollback, backup, `test:ai`, Project Mode diagnostics |
| `architecture-guardrails.md` | Touching module boundaries, generators, or `appBuilder/` |
| `typing-and-naming.md` | Writing TypeScript in this repository |
| `SCHEMA-STATUS-VOCABULARY.md` | Any status or evidence artifact |
| `../CHANGELOG.md` | Read the top entries only; older entries are plain-text history |

## Machine files in `docs/` (not prose; tools read them; do not hand-edit generated ones)

* Schemas: `schema-common.json`, `schema-intent-policy-contract.json`, `schema-change-impact-plan.json`, `schema-verification-plan.json`, `schema-evidence-record.json`, `schema-artifact-manifest.json`, `schema-handoff-report.json`, `schema-approval-decision.json`. Validate: `node scripts/schemaValidate.mjs --type <artifact-type> --file <instance.json>`.
* Architecture policy: `architecture-boundary-rules.json`, `architecture-known-violations.json` (consumed by `npm run architecture:check`).
* Generated: `generated-route-inventory.json`, `generated-env-inventory.json`, `generated-migration-inventory.json`, `generated-module-map.json`. Regenerate with `npm run docs:generate`.

Superseded specs, roadmaps, reports, benchmark snapshots and the old archive were deleted in P104. Nothing in tests or CI reads documentation prose.
