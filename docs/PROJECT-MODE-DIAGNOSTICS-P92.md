# P92 — Project Mode diagnostics

P92 implements the three More menu actions: **Run system diagnostics**, **View recent operations**, and **Download diagnostic logs**. All three use the existing Project Mode authenticated, rate-limited API boundary. No third-party telemetry service is added.

## Evidence

Build requests emit a generated operation ID, generation start, ZIP verification, storage start and readback verification. The HTTP finish callback records whether the response completed; this does **not** prove that the browser saved a ZIP. Artifact downloads record start, finished or interrupted response, and reject invalid stored ZIPs. ZIP checks use JSZip with CRC validation and compare packaged source bytes with the generator output. Persisted bytes are read back and compared before a URL is returned.

Structured event data contain only operation IDs, stage/status, timestamps, error codes, durations, file counts and byte counts. They do not contain prompts, generated source, cookies or credentials. PostgreSQL retains event rows with opportunistic seven-day pruning; when the database cannot be queried, a bounded 1,000-event process-local memory fallback is used. **Memory events do not survive a restart.** Operations list returns at most 200 events, and export contains at most 200 events. Database outage can still block the authenticated route's existing rate limiter; diagnostics do not bypass this security boundary.

The diagnostic ZIP contains `README.txt`, `manifest.json`, `operations/recent-operations.json`, `diagnostics/diagnostic-summary.json` and `logs/application.jsonl`. No arbitrary server logs or application source files are included. The manifest records hashes and sizes of included entries. System checks include database connectivity, diagnostic schema, Project Mode configuration; artifact-storage check is explicitly `NOT RUN` unless a build exercises the path. The export is a snapshot, not a continuous server log archive.

## Deployment and limitations

Apply migration `015_project_diagnostics.sql` via `npm run db:migrate` before enabling the new routes. Project Mode requires authentication. Logging is best-effort and does not turn an otherwise successful build into a failure merely because diagnostic storage is down. The model_patch legacy path currently has only build-start and HTTP-finish events, not the pipeline's granular ZIP checks. An HTTP 2xx and server-side `finish` event cannot establish browser-side download completion. There is no active synthetic external-provider health check, and no separate log collector.

Human-simplicity gate: replaces manual server-log correlation with three actions in More; adds a small DB table and isolated diagnostic helper, no new telemetry infrastructure. Measure value by ability to identify last completed stage and time to explain an invalid ZIP; do not claim measured savings without production evidence.


## P92.2 note

Diagnostic export is verified (CRC read-back and manifest hashes) before it is sent and fails with HTTP 422 otherwise. Google Drive synchronization of diagnostics is not implemented in code. CI logs live in the `ci-execution-logs` workflow artifact (`artifacts/ci-checks/`), not in the diagnostic ZIP.
