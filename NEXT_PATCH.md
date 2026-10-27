# P113 — Navigator handoff

**Decision requested:** accept the user-outcome architecture contract and authorize P114 end-to-end audit.  
**Patch type:** normative specification / roadmap / charter clarification only.  
**Runtime changes:** none. Existing four modes remain unchanged.

## What changed
- Defined exactly three target agents: Conversational, Expert Problem-Solving, Complex Software Architect.
- Made delivered user outcome the primary product acceptance criterion; green CI and internal activity alone do not prove success.
- Added canonical AI-facing contract, audit path AUD-1–AUD-6, acceptance scenarios, metrics, migration/rollback rules and proposed P114–P120 sequence.
- Clarified C1/C7 to distinguish AI-facing normative repository artifacts from external-reader documentation.

## Evidence status
- Source tree baseline: `bf-112.zip`, commit `b32357d23efceb5d02e193c5175f45a95a5e5316`.
- Owner reports four modes are currently unacceptable; recorded as symptoms requiring reproduction, not proven root causes.
- Prior logs include App Builder `invalid_spec`, verifier failures, AbortSignal listener warnings, browser `node:crypto` warnings and a high-severity dependency audit warning; detailed disposition belongs to P114.
- P113 runtime behavior tests: NOT_RUN (no runtime changes; not a claim of product correctness).
- Full CI/hosted CI for the assembled patch: NOT_RUN in this handoff.

## Next bounded action
P114: reproduce one normal and one failure/recovery scenario per current mode; trace UI → instructions/orchestration → model cascade/tools → validation → persistence → UI/artifact delivery; audit shared subsystems and P110–P112 runtime adoption; report findings with evidence and confidence. Do not rewrite components before this evidence exists.

## Rollback
Revert the files in this patch as one unit. No runtime state or user data changed.

Charter conflicts: none
