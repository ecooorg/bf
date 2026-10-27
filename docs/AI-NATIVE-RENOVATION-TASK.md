# BIForge — Current Task and Patch Control

**Current patch:** P115 — optimized documentation set and corrected forward plan.
**Status:** documentation-only patch prepared for Navigator application. No runtime behavior is changed or claimed repaired.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task, the canonical roadmap, and the user-outcome specification.
**Current specification:** `docs/AI-USER-VALUE-SPEC.md`.
**Current evidence baseline:** `docs/AI-USER-VALUE-REPORT.md`.
**Only roadmap:** `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.

## Immediate objective

Replace fragmented normative documentation with a small canonical set. Ensure the current task, three-agent target, evidence baseline, and next patch are consistent. The Navigator applies the ZIP manually and removes the explicitly listed superseded documents. No manifest is required or included; the Navigator updates repository bookkeeping manually.

## P115 scope

- Create/update the canonical three-agent user-outcome specification.
- Consolidate P114 findings into one rolling evidence report.
- Correct the roadmap so specification precedes agent implementation and migration follows the three individual agents.
- Clarify that repository docs are internal AI working material; the Navigator may inspect selected documents to verify direction. Only the application UI is external user-facing.
- Establish one-source-of-truth documentation policy.
- Update handoff, index and changelog.
- No runtime/source implementation changes.

## Acceptance criteria

- Exactly one current user-outcome specification: `docs/AI-USER-VALUE-SPEC.md`.
- Exactly one roadmap: `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.
- Exactly one current task/control file: this file.
- Exactly one rolling user-outcome evidence report: `docs/AI-USER-VALUE-REPORT.md`, newest record first.
- Charter, operating rules, index, roadmap, spec, report, and handoff do not prescribe conflicting patch order.
- Superseded duplicates are listed for deletion in the Navigator handoff, not embedded in a generated manifest.
- No claims of runtime repair or product acceptance.
- No unrelated source-code refactoring.

## Current product reality

The Navigator reports that Simple, Expert, and both Project workflows do not deliver acceptable results. The P114 audit observed a production build failure with `invalid_spec`, no files, one model call and approximately 73 seconds elapsed. Web search is optional in current code and logs show some requests skipped it. Simple and Expert share conversation orchestration. Other concerns (verifier errors, AbortSignal listener warnings, browser crypto/ZIP fallback, dependency audit, stale generated inventories) are evidence-limited risks, not established causes of every user symptom.

End-to-end reproduction of all four legacy workflows was NOT_RUN in P114. Do not infer root causes beyond evidence. See the rolling report for the carried-forward findings.

## Next action after P115

P116: recover the Conversational Agent against representative scenarios. Inspect runtime paths and capture baseline outputs first; fix only demonstrated causes that materially improve answer relevance, freshness, context retention, and truthful failure handling. If implementation becomes internal architecture work without a testable user-outcome gain, stop and ask the Navigator.

## Delivery and verification protocol

- The Navigator keeps full local repository backups and handles deletion/version bookkeeping manually.
- Do not send a manifest unless explicitly requested.
- In the chat handoff, state the patch outcome, changed files, deletion list, verification actually performed, limitations, next action, and rollback guidance.
- Never equate implementation, build success, or green CI with verified user outcome.
- Keep `CHANGELOG.md` patch entries newest-first; keep the rolling evidence report newest-first.

Charter conflicts: none
