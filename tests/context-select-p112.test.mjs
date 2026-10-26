import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  loadCapabilityGraph,
  seedsFromPaths,
  selectContext,
  buildImpactPlan,
  planFromPaths,
} from '../scripts/contextSelectLib.mjs';

const graph = loadCapabilityGraph();

test('P112 capability graph is available for context selection', () => {
  assert.ok(graph, 'run docs:generate first');
  assert.equal(graph.kind, 'capability-graph');
  assert.ok((graph.nodes || []).length > 0);
});

test('P112 seedsFromPaths resolves module paths and reports unknown', () => {
  const sample = (graph.nodes || []).find((n) => n.type === 'module' && n.refs?.path);
  assert.ok(sample, 'need at least one module node');
  const { seeds, unknownPaths } = seedsFromPaths(graph, [sample.refs.path, 'no/such/file.ts']);
  assert.ok(seeds.some((s) => s.includes(sample.refs.path) || s === sample.id));
  assert.ok(unknownPaths.includes('no/such/file.ts'));
});

test('P112 selectContext is bounded by maxDepth and lists unknown explicitly', () => {
  const sample = (graph.nodes || []).find((n) => n.type === 'module');
  const ctx = selectContext(graph, [sample.id], { maxDepth: 1 });
  assert.ok(ctx.nodeCount >= 1);
  assert.ok(ctx.nodes.every((n) => n.depth <= 1));
  assert.equal(typeof ctx.unknownCount, 'number');
  for (const n of ctx.nodes) {
    assert.ok(['known', 'unknown', 'stale'].includes(n.status));
  }
});

test('P112 buildImpactPlan matches required schema fields and fail-closed unknown', () => {
  const sample = (graph.nodes || []).find((n) => n.type === 'module' && n.refs?.path);
  const ctx = selectContext(graph, [sample.id], { maxDepth: 2 });
  // force an unknown into context view
  ctx.unknownCount = Math.max(ctx.unknownCount, 1);
  const plan = buildImpactPlan({
    summary: 'test plan',
    status: 'PASS',
    seedPaths: [sample.refs.path],
    context: ctx,
  });
  assert.equal(plan.meta.artifactType, 'change-impact-plan');
  assert.ok(plan.impacts.length >= 1);
  assert.ok(['PASS', 'PARTIAL', 'UNKNOWN', 'BLOCKED'].includes(plan.status));
  // status demoted when unknown present
  assert.equal(plan.status, 'PARTIAL');
  assert.ok(plan.risks?.some((r) => /unknown/i.test(r)));
});

test('P112 planFromPaths returns schema-validatable plan for a real module seed', () => {
  const sample = (graph.nodes || []).find((n) => n.type === 'module' && n.refs?.path);
  const result = planFromPaths([sample.refs.path], { maxDepth: 2 });
  assert.equal(result.ok, true);
  assert.ok(result.plan.meta.schemaId.includes('change-impact-plan'));
  assert.ok(result.context.pathCount >= 1 || result.context.nodeCount >= 1);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p112-'));
  const file = path.join(dir, 'plan.json');
  fs.writeFileSync(file, JSON.stringify(result.plan, null, 2));
  const r = spawnSync(
    process.execPath,
    ['scripts/schemaValidate.mjs', '--type', 'change-impact-plan', '--file', file],
    { encoding: 'utf8', cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), '..') },
  );
  // schemaValidate may print to stdout; exit 0 is the contract
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('P112 missing graph yields BLOCKED plan without throwing', () => {
  const result = planFromPaths(['src/config.ts'], {
    graphPath: 'docs/no-such-capability-graph.json',
  });
  assert.equal(result.ok, false);
  assert.equal(result.plan.status, 'BLOCKED');
});
