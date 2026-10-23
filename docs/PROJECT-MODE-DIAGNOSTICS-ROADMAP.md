# Project Mode observability and artifact diagnostics — roadmap input for P85–P91

Status: proposal for future implementation, 2026-10-23. **Documentation only.** This document adds diagnostics requirements to the existing P85–P91 roadmap; it does not implement logging, change runtime behavior, approve new dependencies, or authorise external telemetry.

## Purpose

Make Project Mode failures explainable without repeating long experiments or manually reconstructing execution. BiForge should distinguish a task that was requested, files that were actually produced, an archive that was actually assembled, an artifact that was durably stored, and bytes that were actually sent to the browser. A generated URL alone is not evidence that the user received a valid archive.

Use existing logging, artifact, operation, context-plan and verification mechanisms wherever possible. Do not create a parallel VIX subsystem, duplicate source of truth, or a new database solely for diagnostics.

## Design principles

1. **Correlate the whole operation.** Assign one opaque `operationId` to a Project Mode build and carry it through generation, source-file validation, ZIP assembly, archive validation, artifact persistence, download request and client-side completion signal where available.
2. **Log events, not secrets or entire projects.** Prefer structured JSONL events with timestamp, level, event name, operation ID, stage, outcome, duration, safe numeric metadata and a stable error code. Do not log API keys, auth headers, cookies, credentials, or full prompts/source code by default.
3. **Prove each transition.** A stage may report success only after its output has been checked. The next stage should consume the checked output, not a separately reconstructed approximation.
4. **Keep failure evidence.** A failed or timed-out operation must retain its start event, last completed stage, duration and failure reason. Diagnostic collection must not depend exclusively on the same database or artifact path being diagnosed.
5. **Bound retention and overhead.** Use configurable rotation/retention and hard size limits. Begin with a small pilot (for example, seven days / 50 MB total) and tune from observed volume rather than treating these values as final requirements.
6. **Honest delivery semantics.** Server-side response completion does not prove that a browser saved a file. Distinguish `response_started`, `response_finished` when observable, and optional client-confirmed download/integrity check. Avoid claiming more than the instrumentation can know.
7. **Privacy by default.** Diagnostic ZIPs require redaction and a final secret scan. Include project source files only through an explicit, separate opt-in. Make clear what is exported.
8. **Useful when the product is broken.** The log export and basic health report should remain available when Project Mode generation fails, to the extent supported by the app's runtime and storage design.

## Structured event contract (proposal)

Common fields:

- `timestamp` (UTC ISO-8601), `level`, `event`, `operationId`, `stage`, `status`;
- `durationMs` where meaningful;
- safe references such as `projectId`/`artifactId` only if existing policy permits; prefer opaque IDs and do not expose secrets;
- stage-specific counts and byte lengths;
- `errorCode` and a sanitized, bounded `errorMessage` on failure;
- optional `traceId`/request correlation ID where an existing HTTP middleware supports it.

Suggested stage events (names are examples, not existing events):

`PROJECT_BUILD_STARTED` → `GENERATION_COMPLETED` → `SOURCE_FILES_VALIDATED` → `ZIP_ASSEMBLY_STARTED` → `ZIP_ASSEMBLY_COMPLETED` → `ZIP_INTEGRITY_CHECKED` → `ARTIFACT_SAVE_STARTED` → `ARTIFACT_SAVE_VERIFIED` → `DOWNLOAD_REQUESTED` → `DOWNLOAD_RESPONSE_FINISHED` → optional `CLIENT_DOWNLOAD_VERIFIED`.

Failures should use explicit events such as `SOURCE_VALIDATION_FAILED`, `ZIP_VALIDATION_FAILED`, `ARTIFACT_SAVE_FAILED`, `ARTIFACT_READBACK_FAILED`, `DOWNLOAD_FAILED`, and `OPERATION_TIMED_OUT`. Do not emit a success event before the corresponding assertion has passed.

## Required artifact checks

For a successful Project Mode ZIP build, the eventual implementation should verify, at minimum:

1. The generator returned a non-empty set of expected files and at least one plausible source file; allow documented exceptions for intentionally non-code project types.
2. File paths are normalized and safe; reject absolute paths, traversal segments, duplicate normalized paths, and unsupported empty payloads according to file-type policy.
3. The assembled ZIP is non-empty, has a valid ZIP structure, and can be opened and enumerated.
4. The archive contains the expected file set, including required metadata files; counts and names are compared with the source manifest.
5. Each extracted entry matches the bytes supplied to the packager; where practical, perform full archive read/CRC validation rather than signature-only checks.
6. The persisted artifact's byte length and SHA-256 match the assembled ZIP; read it back and verify again before publishing a successful download URL.
7. The download route sends the verified bytes with the correct content type and content length. A test client should compare the received body byte-for-byte or by SHA-256 with the stored artifact.
8. A valid archive is not automatically a valid application. App-specific behavior checks (for example, Tetris controls, rotation, collision, line clearing and scoring) belong to the separate application verification layer.

If any required check fails, fail closed: do not return a success status or a download URL that implies a verified artifact. Return a safe, actionable error code and correlate it to diagnostic logs. Preserve existing auth, access controls, and response contracts unless an explicitly approved compatibility change is made.

## More menu: proposed developer tools

During single-user development, consider adding a developer-only `More` section with:

- **Download diagnostic logs** — exports a bounded, redacted archive of logs and verification summaries;
- **Run system diagnostics** — checks required components and reports `PASS`, `WARN`, `FAIL`, `BLOCKED`, or `NOT RUN` with evidence;
- **View recent operations** — shows recent build/verification/download stages and the last completed stage.

These are proposals. Before implementation, inspect the existing `More` menu, access-control conventions and current logging setup. Do not assume single-user status means endpoints can be left unauthenticated if the app later becomes network-accessible.

Suggested diagnostic archive contents (only include files that actually exist and are safe to export):

- `README.txt` describing time range, filters, redaction and limitations;
- `manifest.json` with export timestamp, selected range, file sizes and hashes;
- `logs/application.jsonl`, `logs/frontend.jsonl`, `logs/errors.jsonl` as available;
- `operations/recent-operations.json` and `operations/failed-operations.json`;
- `artifacts/verification-results.json`;
- `diagnostics/diagnostic-summary.json`.

Do not create empty placeholder files that make the export appear more complete than it is. The manifest must list actual exported entries only.

## Incremental integration with P85–P91

| Patch | Diagnostics contribution | Boundary / acceptance evidence |
|---|---|---|
| **P85 — Task-Aware Context Engine** | Let task plans identify relevant Project Mode build stages, existing logs, artifact validators and failure tests when a request concerns generation/download. Keep diagnostic context bounded and evidence-backed. | Plan names relevant sources/tests and marks missing observability as unknown; no claim that logs exist unless confirmed. |
| **P86 — Change Impact Graph and generator lineage** | Trace requested goal → generator/engine → generated file manifest → ZIP assembly → artifact ID/download route, using existing identifiers where possible. | A report can show known links and explicit gaps; no invented lineage or duplicate inventory. |
| **P87 — Verification Planner** | Recommend stage-by-stage positive and negative tests: empty output, malformed/truncated ZIP, missing entry, modified persisted bytes, missing artifact, interrupted download and timeout. | Suggested tests are wired into existing check/CI chain when implemented; each failure has an expected status and diagnostic evidence. |
| **P88 — Real-task AI benchmark** | Add a small, reviewed Project Mode artifact scenario set and measure diagnostic usefulness: stage-localization rate, false success rate, time to identify failure, human investigation/rework. | Baseline results include denominator, run conditions and limits; no claims about saved time without measurement. |
| **P89 — Lightweight Intent Contract** | Add optional expected-artifact properties derived from task intent (e.g., project kind, minimum expected entry classes, required behavior checks), without mandatory user forms. | Expected checks have provenance; uncertainty stays explicit; a generic ZIP integrity pass is not presented as feature correctness. |
| **P90 — Incremental architecture/context refresh** | Refresh only stale diagnostic/source lineage and test mappings if profiling shows that stale evidence causes missed failures. | Demonstrate measured stale-evidence problem and incremental benefit before adding refresh machinery. |
| **P91 — Context completeness and uncertainty guard** | Block a confident success claim when required artifact evidence is missing or contradictory; report `UNKNOWN`/`PARTIAL`/`BLOCKED` instead. | Tests show missing size/hash/entry evidence cannot be silently treated as verified success; avoid noisy warnings for irrelevant evidence. |

This mapping supplements, and does not replace, each patch's existing scope, dependencies, acceptance gates, stop conditions and the human-simplicity gate in `AI-NATIVE-ROADMAP-P85-P91.md`.

## Suggested rollout and test strategy

1. Start with an inventory of current logs, request IDs, artifact metadata, route responses and tests; do not implement before confirming the existing baseline.
2. Add instrumentation at existing stage boundaries rather than refactoring the whole pipeline.
3. Build unit tests for validators and failure classification, then an integration test through save/readback, then an HTTP download test, then an end-to-end browser check where the environment supports it.
4. Test intentional failures and verify both the outward status and the diagnostic event. Include timeouts and interrupted transfer where reliably testable.
5. Verify log rotation, export size limits, redaction and operation correlation. Make export work when the generation path is failing.
6. Record each command as `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`, `PARTIAL`, or `UNKNOWN`; keep local and CI evidence distinct.

## Human-simplicity gate

For every implementation patch, state:

- which manual investigation or repeated experiment becomes unnecessary;
- which false-success or blind-spot scenario is now detected;
- added storage, CPU, retention, UI and maintenance costs;
- how usefulness is measured (for example, correct stage localization and reduced diagnosis time);
- why extending existing logging/verification is simpler than introducing a new subsystem.

## Non-goals and decisions reserved for the Navigator

This document does not authorise production telemetry, external log shipping, a new database, source-code export by default, generated-code execution, auth changes, automatic deployment, automatic acceptance, or weakening existing security/CI gates. Any persistent schema, new dependency, external integration, public API change or materially new retention policy requires explicit review under the main roadmap.
