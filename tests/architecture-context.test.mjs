import test from 'node:test';
import assert from 'node:assert/strict';
import { planContext, baselineMetrics } from '../scripts/architectureContextLib.mjs';

const fixture = {
  modules: ['server/a.ts', 'server/b.ts', 'server/c.ts'],
  edges: { 'server/a.ts': ['server/b.ts'], 'server/b.ts': [], 'server/c.ts': ['server/a.ts'] },
};
const bodies = { 'server/a.ts': 'const key = process.env.TEST_FLAG;', 'server/b.ts': '', 'server/c.ts': '' };
const opts = { graph: fixture, readFile: (f) => bodies[f], fileExists: (f) => f in bodies || f === '.env.example' };

test('context plan includes direct imports and importers with explicit evidence', () => {
  const p = planContext(['server/a.ts'], opts);
  assert.deepEqual(p.staticContextCandidates.map((x) => x.file), ['server/b.ts', 'server/c.ts']);
  assert.deepEqual(p.supportingContext.map((x) => x.file), ['.env.example']);
  assert.ok(p.uncertainties.some((s) => /not exhaustively resolved/.test(s)));
});

test('context plan is deterministic, read-only and rejects unsafe paths', () => {
  assert.deepEqual(planContext(['server/a.ts'], opts), planContext(['server/a.ts'], opts));
  assert.throws(() => planContext(['../outside.ts'], opts), /unsafe/);
});

test('missing file is not silently treated as a graph node', () => {
  assert.throws(() => planContext(['server/missing.ts'], opts), /Missing/);
});

test('v80 baseline includes reproducible static measurements', () => {
  const b = baselineMetrics();
  assert.ok(b.modules > 100);
  assert.ok(b.staticEdges > 100);
  assert.ok(b.sampleContext.length >= 2);
});
