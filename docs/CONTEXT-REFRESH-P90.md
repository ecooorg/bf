# P90 — Profile-guided context refresh

## Purpose

Measure the existing P85 task-context, P86 impact-lineage, P87 verification-plan, and P89 composed intent-contract work before introducing cache or incremental invalidation complexity. This patch intentionally adds a profiler, not a cache. A microbenchmark is not proof of human wait-time savings.

## Run

```bash
npm run test:context-refresh-profile
npm run context:refresh-profile
npm run context:refresh-profile -- --runs 10 --warmups 2 --json
npm run context:refresh-profile -- --runs 10 --warmups 2 --output /tmp/p90-profile.json
```

`--runs` accepts 2–30 and `--warmups` accepts 0–5. Output paths are never overwritten. JSON reports include operation timing (minimum, median, p95, maximum and mean), canonical output hashes, output byte counts, runtime details, and content hashes for the relevant planner/generator inputs and generated inventories. The top-level input fingerprint makes two runs easier to compare; it does not imply the same machine or workload.

## Interpreting the report

- `outputStable: true` means repeated outputs for this scenario had the same canonical JSON hash. It does not prove all runtime behavior is deterministic.
- `NO_CACHE_RECOMMENDED_BY_THIS_PROFILE` means no measured operation crossed the local 50 ms median threshold.
- `PROFILE_REPRESENTATIVE_REPEATED_WORKLOADS_BEFORE_CONSIDERING_CACHE` means at least one operation crossed the threshold. This is a prompt for representative P88 measurements, not authorization to add a cache.
- `DO_NOT_CACHE_UNTIL_NONDETERMINISM_IS_EXPLAINED` means the repeated output differed; investigate before caching.

The profiler runs operations in-process, includes warmups separately from measured runs, and uses a fixed representative Project Mode ZIP-download task. It does not invoke shell commands, model APIs, application generation, database calls, hosted CI, or HTTP downloads. Its measurements are not end-to-end latency and should not be compared across machines without environment context.

## P90 acceptance gate

1. Capture baseline output before proposing optimization.
2. Use P88 real-task paired runs to test whether repeated planning work is a real user-visible cost.
3. Only if a representative bottleneck is demonstrated, propose a separate cache implementation with content-hash keys, tool/schema versions, explicit invalidation, and safe full-rebuild fallback.
4. Any later cache must prove canonical equality with a full rebuild and test add/change/delete/rename, generator changes, branch switches, stale/corrupt cache and interrupted refresh.
5. Do not commit local timing output as a golden performance threshold; no machine-specific cache or generated artifact is introduced here.

## Human-simplicity gate

- **Human work removed:** provides a repeatable profile and input fingerprint instead of asking a maintainer to guess which planner is slow.
- **Evidence added:** per-operation timings and canonical-output stability.
- **Complexity introduced:** one read-only CLI and a small pure profiling library; no persistent state or cache invalidation system.
- **Value measurement:** compare repeated P88 baseline/context-engine tasks, including user-visible wait and total human effort. No savings are claimed by P90 itself.

## Rollback

Remove `context:refresh-profile` and `test:context-refresh-profile` from `package.json` and the `check` chain; delete `scripts/contextRefreshProfile.mjs`, `scripts/contextRefreshProfileLib.mjs`, `tests/context-refresh-profile.test.mjs`, and this document; revert P90 entries in `CHANGELOG.md`, `AGENTS.md`, the documentation index, and roadmap. No runtime, UI, API, database, persisted product data, or generated inventory changes are made.
