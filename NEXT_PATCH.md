# P118.3 — Spec-stage bounded repair + assistant diagnostics

**Evidence from live #3 (commit 6990277):** staged library task → one planner call succeeded (STOP) → `invalid_spec` without recovery. Recovery only ran on unparseable JSON; parseable-but-invalid Spec failed immediately. Transcript/`build-report` lacked model text and validation issues.

**This slice (product):** bounded repair of the Spec stage (A3) and maximum diagnostic events for AI assistants. Version bump to 119.

## Changes
- `appBuilder/core-engine.ts`: `parseJsonLenient` (fences/prose), `validateSpec` (issues + light coerce `schemaVersion "1"`→1), one recovery call listing concrete issues when Spec is missing or invalid, events `spec_attempt` / `spec_repair` / `spec_failed` / `spec_accepted` / `spec_coerced` / `plan_attempt` / `plan_validate_failed` with text previews and issue lists; `error.detail` carries issues.
- `server/appBuilderAdapter.ts`: model success logs `responsePreview`/`responseChars`/`promptChars`; event port forwards full (bounded) diagnostic payloads into application logs instead of keys-only.
- `tests/app-builder-spec-repair-p118.test.mjs`: coerce, fence recovery, malformed→repair→SUCCESS, double-fail with concrete issues.
- Docs/changelog/status.

## Verification
- Unit tests (spec repair + existing app-builder): run via `npm run test:app-builder`.
- Hosted CI: NOT_RUN until apply.
- Live workflow: NOT_RUN until after green CI + deploy of version 119.

## Next action
Apply → green CI → deploy → dispatch **P118 architect live** once. Expect either SUCCESS/PARTIAL with ZIP or FAILED with concrete `invalid_spec: …` issues and response previews in diagnostics.

Charter conflicts: none
