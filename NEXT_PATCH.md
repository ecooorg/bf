# P115 — Navigator handoff

**Outcome:** optimized canonical documentation set and corrected patch sequence.
**Patch type:** documentation/control-plane consolidation only.
**Runtime changes:** none. No agent is claimed repaired.
**Manifest:** intentionally omitted per Navigator instruction; version/manifest bookkeeping is handled manually by the Navigator.

## What changed

- Established `docs/AI-USER-VALUE-SPEC.md` as the single current three-agent architecture and user-outcome contract.
- Consolidated P114 audit findings into `docs/AI-USER-VALUE-REPORT.md`, a single rolling evidence report with newest record first.
- Corrected the sequence: P115 documentation consolidation; P116 Conversational Agent; P117 Expert Problem-Solving Agent; P118 Complex Software Architect Agent; P119 migration to three agents; P120 cross-agent acceptance.
- Replaced the active task with current scope, acceptance criteria, product reality and next action.
- Clarified that repository documents are internal AI working material; the Navigator may inspect selected files for control, while only the app UI is external-user-facing.
- Established the default to update ongoing documents in place rather than duplicate them per patch.
- Updated documentation index and changelog.

## Files in this patch

Updated:
- `AGENTS.md`
- `CHANGELOG.md`
- `NEXT_PATCH.md`
- `package.json`
- `package-lock.json`
- `docs/AI-OPERATING-RULES.md`
- `docs/AI-NATIVE-RENOVATION-TASK.md`
- `docs/AI-NATIVE-RENOVATION-ROADMAP.md`
- `docs/DOCUMENTATION-INDEX.md`

Added:
- `docs/AI-USER-VALUE-SPEC.md`
- `docs/AI-USER-VALUE-REPORT.md`

## Files for deletion after applying the patch

Delete these superseded/duplicate prose documents. Useful current content is carried into the canonical files above; old versions remain available in the Navigator's local backups.

- `docs/AI-USER-VALUE-ARCHITECTURE-P113.md` — replaced by `docs/AI-USER-VALUE-SPEC.md`.
- `docs/AI-USER-VALUE-AUDIT-P114.md` — rolled into `docs/AI-USER-VALUE-REPORT.md`.
- `docs/AI-NATIVE-RENOVATION-MANDATE.md` — enduring rules and current phase policy consolidated into charter, operating rules and roadmap.
- `docs/AI-TRANSFORMATION-SPEC.md` — superseded transformation plan; enduring rules are consolidated into current charter, operating rules and roadmap.
- `docs/AI-NATIVE-ROADMAP-P81-P84.md` — historical duplicate roadmap.
- `docs/AI-NATIVE-ROADMAP-P85-P91.md` — historical duplicate roadmap.

Do not delete `docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md`, `docs/VIX-CONCEPT.md`, `docs/OPERATIONS.md`, `docs/architecture-guardrails.md`, `docs/typing-and-naming.md`, schemas, verification manifests, generated inventories, or machine-readable policy files in this patch. They have distinct strategic, operational, or tool-consumed purposes.

## Verification and limitations

- Documentation paths, cross-references, patch order and package version alignment: checked locally.
- Runtime tests, browser E2E, live-provider tests, full CI and hosted CI: NOT_RUN for this documentation-only patch.
- P114 end-to-end reproduction gaps remain. The four reported legacy workflow failures were not all reproduced end-to-end.
- No product behavior is claimed to have improved in P115. The intended benefit is eliminating competing instructions so implementation proceeds against one agreed target and sequence.

## Next action

P116: recover the Conversational Agent against representative scenarios. Inspect runtime paths and capture baseline outputs first; fix only demonstrated causes that materially improve directness, freshness, context continuity and truthful tool/provider failure handling.

## Rollback

Restore updated files from the Navigator's local pre-patch backup and remove the two added canonical files. Deletions are performed manually by the Navigator after applying the patch.

Charter conflicts: none
