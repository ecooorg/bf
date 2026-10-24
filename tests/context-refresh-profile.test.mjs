import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalize, stableJson, sha256, profileOperations } from '../scripts/contextRefreshProfileLib.mjs';

test('P90 canonical JSON sorts object keys without reordering arrays', () => {
  assert.equal(stableJson({ z: 1, a: { y: 2, b: 3 }, list: [2, 1] }), '{"a":{"b":3,"y":2},"list":[2,1],"z":1}');
  assert.deepEqual(canonicalize([ { z: 1, a: 2 }, 3 ]), [{ a: 2, z: 1 }, 3]);
});

test('P90 SHA-256 is stable for equivalent object key order', () => {
  assert.equal(sha256({ b: 2, a: 1 }), sha256({ a: 1, b: 2 }));
});

test('P90 profile reports timing and stable output without implementing a cache', () => {
  let clock = 0;
  const report = profileOperations([{ name: 'fixture', run: () => ({ answer: 42 }) }], {
    runs: 3, warmups: 0, clock: () => { clock += 4; return clock; },
  });
  assert.equal(report.operations[0].runs, 3);
  assert.equal(report.operations[0].medianMs, 4);
  assert.equal(report.operations[0].outputStable, true);
  assert.equal(report.operations[0].outputBytes, Buffer.byteLength('{"answer":42}'));
  assert.equal(report.cacheRecommendation, 'NO_CACHE_RECOMMENDED_BY_THIS_PROFILE');
});

test('P90 refuses to recommend cache when output is nondeterministic', () => {
  let sequence = 0;
  const report = profileOperations([{ name: 'unstable', run: () => ({ sequence: ++sequence }) }], {
    runs: 3, warmups: 0,
  });
  assert.equal(report.deterministicOutputs, false);
  assert.deepEqual(report.unstableOperations, ['unstable']);
  assert.equal(report.cacheRecommendation, 'DO_NOT_CACHE_UNTIL_NONDETERMINISM_IS_EXPLAINED');
});

test('P90 only recommends representative workload profiling for slow operations', () => {
  let clock = 0;
  const report = profileOperations([{ name: 'slow', run: () => true }], {
    runs: 2, warmups: 0, clock: () => { clock += 75; return clock; },
  });
  assert.equal(report.operations[0].medianMs, 75);
  assert.equal(report.cacheRecommendation, 'PROFILE_REPRESENTATIVE_REPEATED_WORKLOADS_BEFORE_CONSIDERING_CACHE');
});

test('P90 validates run and warmup bounds', () => {
  assert.throws(() => profileOperations([], { runs: 1 }), /runs must be an integer/);
  assert.throws(() => profileOperations([], { runs: 2, warmups: 6 }), /warmups must be an integer/);
});
