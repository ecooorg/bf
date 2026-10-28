## P118.3 — Spec bounded repair + assistant diagnostics

- Live #3: planner returned parseable JSON that failed Spec validation; recovery did not run (only on unparseable).
- Spec stage: explicit `schemaVersion:1`, `parseJsonLenient`, `validateSpec` with issue list, one recovery call that includes previous issues, concrete `failureReason` / `error.detail`.
- Diagnostics: `spec_attempt`/`spec_repair`/`spec_failed` events with text previews; adapter logs model `responsePreview` and forwards event data into application logs.
- Tests: `tests/app-builder-spec-repair-p118.test.mjs`.
- APP_VERSION → 119.

