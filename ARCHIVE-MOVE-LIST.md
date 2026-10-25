# Manual Archive Migration List — AI-NATIVE-RENOVATION Phase 0

**Purpose:** move completed or superseded technical documents from `docs/` into the root `archive/` directory after reference checks.  
**Status:** proposed checklist; **no listed files have been moved by this patch**.  
**Safety rule:** do not move a file while a live source, test, workflow, script, or current operational instruction depends on its path or unique requirements.  
**Target location:** root `archive/<original-basename>` (flat archive preference).  
**Patch that introduced this list:** ANR-P0-001.

## Canonical documents that remain active (do not move)

- `AGENTS.md`
- `CHANGELOG.md`
- `docs/AI-OPERATING-RULES.md`
- `docs/VIX-CONCEPT.md`
- `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md`
- `docs/AI-NATIVE-RENOVATION-MANDATE.md`
- `docs/AI-NATIVE-RENOVATION-ROADMAP.md`
- `docs/AI-NATIVE-RENOVATION-TASK.md`
- `docs/OPERATIONS.md`
- `docs/USER-GUIDE.md`
- `docs/architecture-guardrails.md`
- `docs/architecture-boundary-rules.json`
- `docs/architecture-known-violations.json`
- Current generated inventories (see Group C — marked Do not move while active)
- Generator/check scripts under `scripts/` and their package.json entries
- Unresolved policy/architecture decisions until migrated to an approved canonical source

## Group A — completed P81–P91 / P92–P93 implementation specifications

Move only after checking all references and preserving any unique active requirements in the canonical renovation documents.

| Current path | Why candidate | Canonical replacement / retained source | Reference-check status |
|---|---|---|---|
| `docs/TASK-CONTEXT-P85.md` | Completed phase-specific tool spec | Global audit; renovation mandate; roadmap | Pending |
| `docs/CHANGE-IMPACT-P86.md` | Completed phase-specific tool spec | Global audit; renovation mandate; roadmap | Pending |
| `docs/VERIFICATION-PLANNER-P87.md` | Completed phase-specific tool spec | Global audit; renovation mandate; roadmap | Pending |
| `docs/REAL-TASK-BENCHMARK-P88.md` | Completed benchmark pilot spec | Global audit; renovation mandate; roadmap; benchmark workstream | Pending |
| `docs/INTENT-CONTRACT-P89.md` | Prior draft-contract spec; superseded as strategic direction | Renovation mandate (intent/policy); roadmap Phase 3 | Pending |
| `docs/CONTEXT-REFRESH-P90.md` | Completed profiler spec | Global audit; roadmap | Pending |
| `docs/CONTEXT-COMPLETENESS-P91.md` | Completed guard spec | Global audit; mandate evidence semantics | Pending |
| `docs/PROJECT-MODE-DIAGNOSTICS-P92.md` | Completed diagnostics phase write-up | Renovation mandate; roadmap; OPERATIONS.md for ops notes | Pending |
| `docs/TEST-HARNESS-P93.7.md` | Completed AI test-harness spec | Renovation mandate; roadmap; scripts/ai-test-harness-p93-7.mjs remains active | Pending |
| `docs/AI-NATIVE-ROADMAP-P81-P84.md` | Superseded phase roadmap | Global audit; `docs/AI-NATIVE-RENOVATION-ROADMAP.md` | Pending |
| `docs/AI-NATIVE-ROADMAP-P85-P91.md` | Superseded phase roadmap | Global audit; `docs/AI-NATIVE-RENOVATION-ROADMAP.md` | Pending |

## Group B — accepted transformation plan and completed audits / proposals

These documents may contain useful history. Preserve them unchanged in `archive/`; do not discard them.

| Current path | Why candidate | Canonical replacement / retained source | Reference-check status |
|---|---|---|---|
| `docs/AI-TRANSFORMATION-SPEC.md` | Prior transformation phases marked accepted/closed; replaced as active programme mandate | `docs/AI-NATIVE-RENOVATION-MANDATE.md`; `docs/AI-NATIVE-RENOVATION-ROADMAP.md` | Pending |
| `docs/DOCUMENTATION-BASELINE.md` | Historical baseline report | `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md` (new baseline is not a byte-for-byte replacement) | Pending |
| `docs/test-audit-p103.md` | Completed P103 test audit | Global audit + CHANGELOG history | Pending |
| `docs/PROJECT-MODE-DIAGNOSTICS-ROADMAP.md` | Historical proposal tied to P85–P91 roadmap | Renovation mandate; roadmap | Pending |
| `docs/tz-appbuilder.md` | Phase-specific App Builder technical spec; review before moving | Renovation mandate; VIX Stage I concepts; `appBuilder/` source remains authoritative | Pending |

## Group C — historical benchmark and verification snapshots

These are evidence records. Prefer archive only after confirming no test, script, or CI step reads the current path as a live gold/fixture.

| Current path | Why candidate | Notes / replacement | Reference-check status |
|---|---|---|---|
| `docs/context-locality-p82.json` | Historical P82 evidence snapshot | Archive after reference search | Pending |
| `docs/contracts-verification-p83.json` | Historical P83 evidence snapshot | Archive after reference search | Pending |
| `docs/context-benchmark-p84.json` | Historical P84 metrics snapshot | Archive after reference search | Pending |
| `docs/context-benchmark-verification-p84.json` | Historical P84 verification record | **Known consumer:** `tests/context-benchmark.test.mjs` reads this path — migrate consumer first or keep until test updated | Pending (blocked by test) |
| `docs/context-baseline-v80.json` | Frozen pre-P81 baseline; retain as historical evidence | Search references; if moved, preserve explicit historical designation | Pending |
| `docs/generated-acceptance-summary.json` | Generated report; may be consumed by tools | **Review required:** inspect generator/consumer before any move | Pending |
| `docs/generated-boundary-report.json` | Generated report; may be consumed by tools | **Review required:** inspect generator/consumer before any move | Pending |
| `docs/generated-env-inventory.json` | Current generated inventory | **Do not move** while active as current inventory | Hold |
| `docs/generated-migration-inventory.json` | Current generated inventory | **Do not move** while active as current inventory | Hold |
| `docs/generated-module-map.json` | Current generated inventory | **Do not move** while active as current inventory | Hold |
| `docs/generated-route-inventory.json` | Current generated inventory | **Do not move** while active as current inventory | Hold |

## Group D — review required; do not move in the first pass

| Current path | Reason to hold |
|---|---|
| `docs/architecture-boundary-rules.json` | Active architecture policy input consumed by `npm run architecture:check` |
| `docs/architecture-known-violations.json` | Active ratchet baseline |
| `docs/typing-and-naming.md` | May still guide current changes; confirm coverage by permanent rules before archive |
| `docs/generated-*` (current inventories) | Generator/check scripts and CI expect current paths |
| `docs/context-benchmark-verification-p84.json` | Hard reference from `tests/context-benchmark.test.mjs` |

## Manual procedure (per file)

1. Search all repository files for the exact current path and basename (`rg -n 'path/or/basename'`).
2. Inspect any code/test/workflow/script consumer. If a live consumer exists, migrate that consumer first in a **separate** patch.
3. Move the file to `archive/<original-basename>`; preserve content and original headings/dates.
4. Update only links that are meant to remain navigable. Historical documents may retain historical references; active navigation must point to canonical current documents.
5. Run Markdown/link checks and any impacted tests (`npm run check:docs`, focused tests).
6. Add a changelog note listing moved paths.
7. Recheck the generated patch manifest and ensure no source contract was lost.
8. Mark the row complete only after the move and checks actually happened.

**Do not use this list as permission to bulk-move every candidate at once.** Some documents may still be referenced by tools, tests, or generated inventories.

## Already in `archive/` (historical; no action)

These predate the AI-NATIVE-RENOVATION programme and stay where they are:

- `archive/phase0-BiForge-v70-Phase0-Audit.md` and related phase0-* inventories
- `archive/phase1-PHASE1-GUARDRAILS.md`
- `archive/phase3-PHASE3-COMPLETE.md`
- `archive/phase4-PHASE4-GENERATORS.md`
- `archive/phase4-5-ROADMAP.md`
- `archive/phase5-ACCEPTANCE.md` / `phase5-acceptance-summary.json`
- `archive/generated-*-last.json` snapshots

## Completion criteria for the archive migration step

Phase 0 archival execution is complete only when:

- Every Group A and Group B file that remains a pure historical record has been moved after reference checks, **or** an explicit hold reason is recorded.
- Group C files with known consumers have either been left in place or had their consumers updated in prior patches.
- `AGENTS.md` and `docs/DOCUMENTATION-INDEX.md` no longer present moved paths as active entry points.
- CHANGELOG records the actual moves performed.
- No unique active requirement was discarded.
