# BIForge — Current Task and Patch Control

**Current patch:** P117 — Expert problem-solving contract and model cascade foundations.
**Status:** source patch prepared for Navigator application. CI and runtime acceptance are not yet verified.
**Authority:** `AGENTS.md` > `docs/AI-OPERATING-RULES.md` > this task, the canonical roadmap, and the user-outcome specification.
**Current specification:** `docs/AI-USER-VALUE-SPEC.md`.
**Current evidence baseline:** `docs/AI-USER-VALUE-REPORT.md`.
**Only roadmap:** `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.

## Immediate objective

Replace fragmented normative documentation with a small canonical set. Ensure the current task, three-agent target, evidence baseline, and next patch are consistent. The Navigator applies the ZIP manually and removes the explicitly listed superseded documents. No manifest is required or included; the Navigator updates repository bookkeeping manually.

## P117 scope

- Strengthen the Expert conversation contract for structured, persistent investigation and actionable synthesis.
- Align primary Gemini cascade order to `gemini-3.5-flash-lite` then `gemini-3.1-flash-lite` in Simple, Expert, and Project workflows.
- Probe `gemini-3.6-flash`, `gemini-3.8-flash`, and `gemma-4` hourly using minimal requests; only a successful probe may promote a candidate into the cascade.
- Add Groq Cloud and Cloudflare Workers AI as explicit opt-in fallbacks, not silent defaults. Preserve JSON validation and existing safety boundaries.
- Add mocked regression tests for probe state and throttling.
- No claim of full independent Expert-agent state-machine completion; that remains part of the subsequent implementation/acceptance work.

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

## Next action after P117

Run CI. If green, validate the actual Expert conversation and project build flows with external fallback disabled, then enabled only after reviewing provider data/cost settings. P116 conversational-agent recovery remains a prerequisite if it has not been applied and accepted. Do not mark P117 as full Expert E2E acceptance.

## Delivery and verification protocol

- The Navigator keeps full local repository backups and handles deletion/version bookkeeping manually.
- Do not send a manifest unless explicitly requested.
- In the chat handoff, state the patch outcome, changed files, deletion list, verification actually performed, limitations, next action, and rollback guidance.
- Never equate implementation, build success, or green CI with verified user outcome.
- Keep `CHANGELOG.md` patch entries newest-first; keep the rolling evidence report newest-first.

Charter conflicts: none
