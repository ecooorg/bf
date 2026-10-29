# Documentation Index — Canonical Navigation

Repository documents are internal working context for AI assistants. The Navigator may inspect the task, specification, roadmap and latest report to verify project direction. These files are not external product documentation. Maintain canonical rolling files in place; do not create versioned copies for each patch.

## Protected primary documents (P118.4+)

These three files are the authoritative engineering system. They may only be extended or refined; semantic reduction is forbidden without explicit Navigator approval (see AGENTS.md D1–D4).

1. `../TECHNICAL_SPECIFICATION.md` — complete system specification (architecture, data model, API contracts, three agents, REQ-IDs, acceptance criteria). Required reading for any implementation or verification work.
2. `../ROADMAP.md` — sole sequential implementation plan from empty repository through P118 and forward phases. Required for any phase transition or patch planning.
3. `../TECHNICAL_REPORT.md` — sole historical reconstruction and evidence record. Required when diagnosing past changes or writing new evidence entries.

## Read for every patch

**P118.5 active:** `ARCHIVE-DELIVERY-CANON.md` is mandatory reading for any App Builder / ZIP / download work.

1. `../AGENTS.md` — authority, charter (including D1–D4 documentation protection), authorization tiers, stop rule and the version/patch numbering rules (`package.json` in every patch).
2. `AI-OPERATING-RULES.md` — permanent operating, security and evidence rules.
3. `AI-NATIVE-RENOVATION-TASK.md` — current task, acceptance criteria and immediate next action.
4. `AI-USER-VALUE-SPEC.md` — approved three-agent target and user-outcome contracts (complements TECHNICAL_SPECIFICATION §6).
5. `AI-NATIVE-RENOVATION-ROADMAP.md` — programme gates (must stay consistent with `../ROADMAP.md`; the latter is the detailed reconstruction + forward plan).

Read `AI-USER-VALUE-REPORT.md` when diagnosing or changing user-facing behavior; newest record is at the top. New evidence of substance must also be summarised in `../TECHNICAL_REPORT.md`.

## On demand

- `AI-NATIVE-GLOBAL-AUDIT-2026-10.md` — prior broad source audit; historical baseline, not a current task list.
- `OPERATIONS.md` — configuration, deployment, rollback and diagnostic commands.
- `AI-ENVIRONMENT-CONTEXT.md` — Render deployment facts, authentication rules, live-test protocol; read before touching deployment or live workflows.
- `P121_Browser_based_Model_Providers.md` — planned P121 task (browser-based model access); not authorized, read only when P121 is discussed.
- `architecture-guardrails.md` — module boundaries, generators, App Builder invariants, and TypeScript/naming conventions (includes former typing-and-naming).
- `VIX-CONCEPT.md` — long-horizon strategy; not immediate implementation authorization.
- `../CHANGELOG.md` — patch history; newest entry first.

## Machine-readable files — preserve

Do not delete machine files or generated artifacts merely because prose documents are consolidated. Tool-consumed schemas: `schema-common.json`, `schema-intent-policy-contract.json`, `schema-change-impact-plan.json`, `schema-verification-plan.json`, `schema-evidence-record.json`, `schema-artifact-manifest.json`, `schema-handoff-report.json`, `schema-approval-decision.json`; verification manifest; architecture boundary/known-violation JSON; generated route/env/migration/module/check/capability inventories. Follow relevant generators and validators rather than hand-editing generated outputs.

## Documentation rules (binding from P118.4)

- One canonical file per ongoing purpose. The three protected primary documents above are the engineering backbone.
- Update protected files and rolling files in place. Keep the latest current instruction or evidence at the top.
- **Forbidden:** creating new `Pxx-SPEC.md`, `Pxx-REPORT.md`, `*-NOTES.md` or any parallel normative prose document outside the protected set and the listed rolling files.
- **Forbidden:** reducing the semantic content, deleting REQ-IDs, acceptance criteria, stage descriptions or evidence requirements from the three protected files without an explicit Navigator yes.
- Superseded duplicate prose documents are removed after useful current content has been transferred. The Navigator’s local backups preserve old versions.
- Never create a new normative document just to resolve a contradiction between existing ones. Stop, reconcile the authoritative files, and record the decision once.
- Machine guard: `npm run docs:integrity` (or the DAG node) must pass on every patch that touches documentation.
