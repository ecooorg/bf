# P86 — Change impact and generator lineage

P86 adds a read-only report that connects a supplied change surface to existing static-import evidence and declared generated-artifact relationships. It explicitly covers the inventory generator gap: `scripts/docsGenerateInventories.mjs` produces the route, environment and migration inventories; those inventories feed the inventory checker and acceptance report.

## Usage

```sh
npm run impact:lineage -- --task "Update route inventory generation" scripts/docsGenerateInventories.mjs
npm run impact:lineage -- --task "Review generated route inventory" --file docs/generated-route-inventory.json --json
npm run impact:lineage -- --file server/projectRoutes.ts --details
npm run test:impact-lineage
```

Pass one or more repository-relative paths as positional arguments or with `--file`. `CHANGED_FILES` is also supported when explicit paths are omitted. `--json` prints the full machine-readable report. The default summary is bounded; `--details` prints more evidence edges. The command does not write a report, mutate generated inventories, run tests, or call a model/network service.

## Evidence model

- **`imports`** comes from the existing static module graph (`scripts/architectureLib.mjs`). Reverse reachability identifies importing modules affected by a changed module; cycles are visited once.
- **`generatedBy`** comes from the generator metadata in a generated artifact and the explicit mapping of generator outputs in the P86 library.
- **`consumesArtifact`** comes from an explicit known-consumer map. **`coveredByTest`** comes from a declared regression-test mapping. The report deliberately avoids scanning the whole repository on every request and does not infer relationships from arbitrary text or filenames.
- **`registers`** connects route source files to route records in `docs/generated-route-inventory.json`.
- **`readsEnv`** connects source files to environment-variable records in `docs/generated-env-inventory.json`.
- **`declaresMigration`** connects migration source files to entries in `docs/generated-migration-inventory.json`.
- **`includedIn`** connects route/migration records to the generated inventory containing them.

Every edge includes provenance and a confidence/evidence label. Filename similarity alone never creates a generator relationship. When dynamic imports/require calls are detected, the report adds uncertainty rather than inventing edges.

## Artifact health and intent diff

The report checks that known generated artifacts exist, parse as JSON, name the expected generator, have the expected collection shape, and do not reference missing source files. A generator metadata mismatch or missing referenced source path is reported as `STALE`; absent artifacts are `MISSING`; invalid JSON/shape is `INVALID`; missing generator source is `UNKNOWN`. `PRESENT` means these limited structural checks passed—it does **not** prove that an artifact is current with every source change. Existing artifacts have no source fingerprint, so freshness beyond these checks remains unknown.

The concise intent diff reports the supplied task text, changed files, statically observed impact surfaces, suggested verification commands marked `SUGGESTED_NOT_RUN`, and explicit limitations. It is not a semantic diff, test-coverage proof, or guarantee that all runtime/external consumers have been found. Unknown relationships remain unknown.

## Human-simplicity gate

- **Human work removed:** reduces repeated manual tracing from generator script to generated inventory to known checks/consumers, and surfaces route/env/migration relationships from existing inventories.
- **Evidence added:** typed edges with provenance, artifact structural health, reverse-import impact and explicit uncertainty; focused counterexamples cover missing generators, stale metadata, multiple consumers, cycles, dynamic imports and false filename-based inference.
- **Complexity cost:** one read-only CLI, one library, a fixed generator-output map and focused tests. New generators, consumers and regression-test relationships need their declared mapping maintained.
- **Measure:** evaluate route-inventory scenario recall and false-positive rate against the P84 gold scenarios; measure time to identify the correct generator/checks and human rework. No benchmark improvement or time saving is claimed in this patch.

## Rollback

Revert the P86 files listed in `README-PATCH.md`, including the `package.json` additions and the P86 status/documentation entries. No database migration, product runtime behavior, public API, UI, generated inventory or persisted format is changed.
