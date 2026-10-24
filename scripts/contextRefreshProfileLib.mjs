/** P90 benchmark-first profiling helpers. No cache, writes, or command execution. */
import { createHash } from 'node:crypto';

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
}

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

export function summarizeMeasurements(name, durationsMs, outputHashes) {
  const sorted = [...durationsMs].sort((a, b) => a - b);
  const hashes = [...new Set(outputHashes)];
  const totalMs = durationsMs.reduce((sum, value) => sum + value, 0);
  return {
    name,
    runs: durationsMs.length,
    minMs: round(sorted[0] ?? 0),
    medianMs: round(percentile(sorted, 0.5)),
    p95Ms: round(percentile(sorted, 0.95)),
    maxMs: round(sorted.at(-1) ?? 0),
    meanMs: round(durationsMs.length ? totalMs / durationsMs.length : 0),
    outputBytes: null,
    outputStable: hashes.length <= 1,
    outputHash: hashes.length === 1 ? hashes[0] : null,
    distinctOutputHashes: hashes.length,
  };
}

export function profileOperations(operations, { runs = 5, warmups = 1, clock = () => performance.now() } = {}) {
  if (!Number.isInteger(runs) || runs < 2 || runs > 30) throw new Error('runs must be an integer from 2 to 30');
  if (!Number.isInteger(warmups) || warmups < 0 || warmups > 5) throw new Error('warmups must be an integer from 0 to 5');
  const results = [];
  for (const operation of operations) {
    for (let i = 0; i < warmups; i += 1) operation.run();
    const durations = [];
    const hashes = [];
    let outputBytes = 0;
    for (let i = 0; i < runs; i += 1) {
      const start = clock();
      const output = operation.run();
      durations.push(Math.max(0, clock() - start));
      const serialized = stableJson(output);
      hashes.push(sha256(serialized));
      outputBytes = Buffer.byteLength(serialized, 'utf8');
    }
    results.push({ ...summarizeMeasurements(operation.name, durations, hashes), outputBytes });
  }
  const totalMedianMs = round(results.reduce((sum, item) => sum + item.medianMs, 0));
  const unstable = results.filter((item) => !item.outputStable).map((item) => item.name);
  const slow = results.filter((item) => item.medianMs >= 50).map((item) => item.name);
  return {
    schemaVersion: 1,
    kind: 'biforge-context-refresh-profile',
    method: 'in-process wall-clock profiling; warmups excluded; canonical output hashes compared across repeated runs',
    runs,
    warmups,
    operations: results,
    totalMedianMs,
    deterministicOutputs: unstable.length === 0,
    unstableOperations: unstable,
    cacheRecommendation: unstable.length
      ? 'DO_NOT_CACHE_UNTIL_NONDETERMINISM_IS_EXPLAINED'
      : slow.length
        ? 'PROFILE_REPRESENTATIVE_REPEATED_WORKLOADS_BEFORE_CONSIDERING_CACHE'
        : 'NO_CACHE_RECOMMENDED_BY_THIS_PROFILE',
    recommendationBasis: {
      thresholdMsPerOperation: 50,
      operationsAboveThreshold: slow,
      note: 'This micro-profile alone does not prove user wait-time savings. No cache is implemented. Use P88 paired real-task runs before adding invalidation complexity.',
    },
  };
}

function round(value) { return Math.round(value * 1000) / 1000; }
