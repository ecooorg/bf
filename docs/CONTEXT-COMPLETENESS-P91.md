# P91 — Context completeness and material-uncertainty guard

> **P103:** the automated tests for this tool (`test:*` script and test file) were removed in the test audit. The tool itself is unchanged and is now a candidate for removal; see `docs/test-audit-p103.md`.

## Purpose

P91 combines the existing P85 task-context, P86 impact-lineage, P87 verification-plan and P89 intent-contract outputs into one read-only evidence summary. It is a guard against false confidence, not a formal proof engine and not a new source of truth.

## Run

```bash
npm run test:context-completeness
npm run context:completeness -- --task "Fix Project Mode ZIP download" --file server/projectRoutes.ts
npm run context:completeness -- --task "Fix Project Mode ZIP download" --file server/projectRoutes.ts --json
npm run context:completeness -- --task "Fix Project Mode ZIP download" --file server/projectRoutes.ts --evidence /tmp/p91-evidence.json --output /tmp/p91-report.json --json
```

The tool does not execute suggested commands, call a model, access a database/network, change files in the repository, or set a CI gate. Output paths are created exclusively and are not overwritten.

## States

- `COMPLETE`: all declared-scope requirements have supplied evidence under the current rules. This is scoped completeness, not proof of the entire application.
- `PARTIAL`: the relevant planning inputs exist, but one or more material issues remain unresolved.
- `UNVERIFIED`: one or more required planning/evidence sources are absent, so adequacy cannot be established.

Every material issue includes a consequence, missing evidence and a recommended next action. A planner's `SUGGESTED_NOT_RUN` command is never execution evidence. A `PASS` requires `source: "observed_execution_evidence"` plus a reference such as a CI run or log. The required hosted GitHub Actions workflow is a separate gate; local checks cannot substitute for it. The tool checks that reference metadata is supplied; it does not fetch or authenticate the referenced external resource.

## Optional evidence file

Example shape (replace illustrative references with real ones; do not claim a command passed unless it actually ran):

```json
{
  "checks": [
    {
      "command": "npm run check",
      "status": "PASS",
      "source": "observed_execution_evidence",
      "logRef": "ci://run/123/check"
    },
    {
      "command": "npm run build",
      "status": "PASS",
      "source": "observed_execution_evidence",
      "logRef": "ci://run/123/build"
    },
    {
      "name": "GitHub Actions required workflow",
      "status": "PASS",
      "source": "observed_execution_evidence",
      "logRef": "ci://run/123"
    }
  ],
  "criteria": [
    {
      "id": "AC-I1",
      "status": "PASS",
      "source": "observed_execution_evidence",
      "evidence": [{ "ref": "ci://run/123/acceptance" }]
    }
  ],
  "expectedDependencies": ["server/artifactRepository.ts"],
  "observedDependencies": ["server/artifactRepository.ts"],
  "scopeReview": {
    "taskContext": {
      "status": "COMPLETE",
      "source": "human_review",
      "reference": "review://PR-123/context"
    },
    "impact": {
      "status": "COMPLETE",
      "source": "human_review",
      "reference": "review://PR-123/impact"
    }
  },
  "resolvedIssues": []
}
```

`scopeReview` is an explicit review assertion, not automatically inferred from static analysis. To resolve a particular issue, `resolvedIssues` must identify the exact `code` and `missingEvidence` string from the report, plus `source` (`human_review`, `observed_execution_evidence` or `repository_evidence`), `reference` and a short `note`. This prevents one resolution record from hiding every issue that happens to share a code. Known missing gold dependencies, unproven required checks and unsupported PASS claims are hard blockers and cannot be dismissed by a generic resolution note. Review and resolution records remain visible in the report.

The expected/observed dependency lists are optional. When an expected dependency is supplied but absent from observed dependencies, the guard reports `P91_GOLD_DEPENDENCY_MISSING`; a missing known dependency cannot silently become complete. Correcting a reviewed gold set requires maintainer review rather than weakening the guard.

## P91 acceptance gate

- Missing planning sources result in `UNVERIFIED`, never `COMPLETE`.
- Missing expected dependencies, stale/invalid generated artifacts, unknown required gates and unverified acceptance criteria remain visible.
- Every unresolved issue has a consequence, evidence gap and next action.
- `COMPLETE` requires traceable observed evidence for required commands and acceptance criteria, or explicit referenced human review for scoped coverage; suggestions alone never count.
- No strict CI failure mode is enabled by this patch. The guard reports uncertainty only; any future required gate needs separate review of false positives/negatives and explicit owner approval.

## Human-simplicity gate

- **Human work removed:** consolidates repeated interpretation of P85–P89 outputs into one short status and actionable issue list.
- **Safety/evidence added:** prevents missing sources, unaccounted-for known dependencies and unsupported PASS claims from being mistaken for success.
- **Complexity introduced:** one pure evaluation library, one read-only CLI and a focused test file; no cache, persistence or runtime behavior.
- **Value measurement:** review whether P88 task runs find material omissions earlier, reduce diagnosis/rework time, and avoid noisy warnings. No measured improvement is claimed by this patch.

## Rollback

Remove `context:completeness` and `test:context-completeness` from `package.json` and remove the test from `npm run check`. Delete `scripts/contextCompletenessGuard.mjs`, `scripts/contextCompletenessGuardLib.mjs`, `tests/context-completeness-guard.test.mjs` and this document; revert P91 entries in `CHANGELOG.md`, `AGENTS.md`, `docs/DOCUMENTATION-INDEX.md` and `docs/AI-NATIVE-ROADMAP-P85-P91.md`.
