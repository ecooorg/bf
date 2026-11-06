# Project Mode Recovery and Improvement Plan

**Status:** Four-patch implementation programme; Patch 1 is in progress.  
**Boundary:** Changes in this programme are confined to Project Mode and `appBuilder`. Simple and Expert behavior, prompts, routing, model selection, and interfaces must remain unchanged.

## Product outcome

Project Mode must manage a project through a durable lifecycle: create, generate, validate, repair, package, register, inspect, and continue development. A `PARTIAL` or `FAILED` result must never be represented as a completed deliverable. Every file and archive created by Project Mode must remain discoverable and downloadable after navigation, browser restart, or server recovery.

## Four-patch delivery plan

### Patch 1 — Build Reliability (P127.5)

**Objective:** Make static-site validation accurate and actionable, and establish a reliable base for bounded repair.

Scope:
- Normalize generated-project references. A leading `/` is rooted at the generated project, not the host filesystem; relative paths are resolved from the referencing HTML file.
- Keep traversal protection and reject unresolved local references.
- Make the `static_site` execution contract explicit: raw `.ts`/`.tsx` is not browser-executable without a build step. Reject TypeScript entry points with a clear validator message instead of allowing a misleading green result.
- Keep module-contract validation strict for local imports and exports, including filename/case mismatches.
- Add regression tests for root-absolute references, nested relative references, TypeScript entry points, and unresolved/case-mismatched imports.
- In subsequent Patch 1 work, extend the engine's existing bounded syntax/DOM repair approach to other actionable required-validator failures. Every proposed repair must be trial-validated, must not break validators that previously passed, must not destructively shrink source, and must respect model-call/time budgets.

Acceptance:
- Root-absolute and nested relative references resolve only to files inside the generated project.
- Traversal and missing references fail closed.
- `static_site` does not accept uncompiled TypeScript as executable output.
- Local import failures are reported with source path and import specifier.
- Targeted app-builder tests, typecheck, and the project test suite pass; unavailable checks are recorded as `NOT_RUN`.

### Patch 2 — Project Continuation and Version History

**Objective:** Continue an existing project rather than silently starting a fresh generation.

Scope:
- Add a distinct “Continue development” operation.
- Load the selected project's latest immutable source snapshot, original goal/specification, plan, build reports, validator findings, and prior change history.
- Apply targeted changes while preserving unchanged files.
- Create a new immutable version for every accepted iteration.
- Provide version comparison and rollback without deleting later versions.
- Resume from durable checkpoints and avoid duplicate concurrent runs for the same project/version.

Acceptance:
- A follow-up task demonstrably receives the previous project files as input.
- Unchanged files remain byte-identical unless the task requires a change.
- Previous versions remain retrievable and rollback is tested.

### Patch 3 — Project Workspace, Files, and Archives

**Objective:** Make every project artifact visible and durable to the user.

Scope:
- Provide a single project workspace with Results, Plan, Files & Archives, History, and Continue Development sections.
- Display every generated file with path, size, version, modified time, preview, and download action.
- Display every archive with version, creation time, size, file count, validation outcome, and download action.
- Register artifacts durably and link them to project, build, and version identifiers; verify checksums and archive contents.
- Restore the workspace from server-side records after navigation or a new browser session.
- Issue download links only after the artifact exists and its registry record is committed.

Acceptance:
- The UI lists all artifacts belonging to the selected project, including older versions.
- Every displayed download resolves to a real stored artifact.
- ZIP integrity, manifest/file agreement, and checksum checks pass.

### Patch 4 — Recovery, Navigation, and End-to-End Acceptance

**Objective:** Make Project Mode resilient to interruptions and prevent accidental mode changes.

Scope:
- Persist safe checkpoints for specification, planning, generation, repair, validation, packaging, and artifact registration.
- Resume from the last safe checkpoint after browser disconnect or server restart; preserve completed files.
- Remove unconfirmed navigation from Project Mode. Confirm intentional exits; open unrelated conversation tools in a separate tab where appropriate.
- Record navigation actions and outcomes for diagnostics.
- Prevent conversational modes from presenting fabricated artifact links. Keep any shared guard behavior-compatible with Simple and Expert; do not change their generation flows.
- Run browser-level acceptance against a real generated project, including download and a follow-up edit.

Acceptance:
- Interrupted jobs resume without duplicate destructive work.
- Project Mode remains selected unless the user confirms leaving it.
- Simple and Expert regression suites pass unchanged.
- A real downloaded project launches outside BiForge and can be continued into a new version.

## Non-negotiable mode isolation

- Do not edit Simple or Expert prompts, route selection, model selection, response transformation, or interfaces.
- Do not move Project Mode build logic into the conversational endpoint.
- Project-specific behavior must be gated by Project Mode routes/components and appBuilder services.
- If a shared low-level component must change, preserve its existing Simple/Expert contract and add regression coverage for both modes in the same patch.

## Shared implementation principles

- Reuse the existing job, artifact, manifest, and recovery stores where possible; extend schemas rather than creating parallel registries.
- Keep previous project versions immutable.
- Bound repair attempts, elapsed time, and model calls. Save intermediate state before stopping.
- `SUCCESS` requires all required validators to have run and passed and the final archive to have been saved and registered. `PARTIAL` is not a completed project.
- Distinguish deterministic static validation from actual runtime/browser verification. Never claim the latter based only on static checks.
- Record source tests, typecheck, build, CI, browser tests, live-provider tests, and deployed user outcomes separately. Use `NOT_RUN` when evidence is unavailable.
