# Phase 1 status vocabulary

Authoritative values for every Phase 1 evidence-bearing artifact:

| Status | Meaning |
|---|---|
| `PASS` | Check ran and met its acceptance criteria. |
| `FAIL` | Check ran and did not meet criteria. |
| `BLOCKED` | Could not run because a declared prerequisite failed or was unavailable. |
| `SKIPPED_BY_POLICY` | Intentionally not run under an explicit policy or authorization rule. |
| `TIMEOUT` | Started but did not finish within the allowed time. |
| `NOT_RUN` | Never started (plan item only, cancelled before start, or outside scope). |
| `UNKNOWN` | Outcome cannot be determined from available evidence. |
| `PARTIAL` | Some required evidence exists; material gaps remain. |

## Non-equivalence rule

`UNKNOWN`, `NOT_RUN`, `BLOCKED`, `TIMEOUT`, and `PARTIAL` are **never** to be treated or summarized as `PASS`.

Critical claims whose provenance is missing, malformed, contradictory, or redacted away must not be reported as successful.

## Schema files

- `schema-common.json` — shared `$defs` (status, provenance, schemaMeta)
- `schema-intent-policy-contract.json`
- `schema-change-impact-plan.json`
- `schema-verification-plan.json`
- `schema-evidence-record.json`
- `schema-artifact-manifest.json`
- `schema-handoff-report.json`
- `schema-approval-decision.json`

Validate instances with:

```bash
node scripts/schemaValidate.mjs --type evidence-record --file path/to/instance.json
node scripts/schemaValidate.mjs --dir path/to/dir --type handoff-report
```
