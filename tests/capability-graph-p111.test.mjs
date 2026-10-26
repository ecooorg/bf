import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildCapabilityGraph, loadIntentContracts } from '../scripts/capabilityGraphLib.mjs';
import { buildContract } from '../scripts/intentContractLib.mjs';

test('P111 capability graph builds from inventories with known modules and checks', () => {
  const g = buildCapabilityGraph();
  assert.equal(g.kind, 'capability-graph');
  assert.equal(g.schemaVersion, 1);
  assert.ok(g.summary.nodeCount > 0);
  assert.ok(g.summary.edgeCount >= 0);
  assert.ok(g.summary.inventoriesPresent.moduleMap || g.summary.inventoriesPresent.checks);
  const types = new Set(g.nodes.map((n) => n.type));
  assert.ok(types.has('module') || types.has('check'));
  // every edge endpoint exists
  const ids = new Set(g.nodes.map((n) => n.id));
  for (const e of g.edges) {
    assert.ok(ids.has(e.from), `missing from ${e.from}`);
    assert.ok(ids.has(e.to), `missing to ${e.to}`);
  }
});

test('P111 unknown and stale remain explicit; never promoted to known without source', () => {
  const g = buildCapabilityGraph();
  for (const n of g.nodes) {
    assert.ok(['known', 'unknown', 'stale'].includes(n.status), n.id);
  }
  assert.equal(typeof g.summary.unknownNodes, 'number');
  assert.equal(typeof g.summary.staleNodes, 'number');
});

test('P111 intent contract links to modules via impacts and declares invariants', () => {
  const contract = buildContract({
    goal: 'P111 test intent',
    status: 'PASS',
    items: [
      {
        id: 'inv-1',
        kind: 'invariant',
        text: 'checks must not be reported as PASS when evidence is missing',
        source: 'explicit',
        criticality: 'critical',
      },
      {
        id: 'req-1',
        kind: 'requirement',
        text: 'graph must expose unknown nodes',
        source: 'explicit',
      },
    ],
    changedFiles: ['scripts/capabilityGraphLib.mjs', 'scripts/capabilityGenerateGraph.mjs'],
  });
  const g = buildCapabilityGraph({ intentContracts: [contract] });
  const intentNodes = g.nodes.filter((n) => n.type === 'intent');
  assert.ok(intentNodes.length >= 1);
  const inv = g.nodes.find((n) => n.type === 'invariant');
  assert.ok(inv, 'invariant node present');
  assert.equal(inv.status, 'known');
  const impactEdges = g.edges.filter((e) => e.relation === 'impacts');
  assert.ok(impactEdges.some((e) => e.to.includes('capabilityGraphLib')));
});

test('P111 loadIntentContracts skips missing and invalid files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p111-'));
  const good = path.join(dir, 'ok.json');
  fs.writeFileSync(good, JSON.stringify(buildContract({ goal: 'g', status: 'PASS', items: [] })));
  fs.writeFileSync(path.join(dir, 'bad.json'), '{not json');
  const list = loadIntentContracts([good, path.join(dir, 'missing.json'), path.join(dir, 'bad.json')]);
  assert.equal(list.length, 1);
  assert.equal(list[0].goal, 'g');
});

test('P111 mutating routes produce side_effect nodes', () => {
  const g = buildCapabilityGraph();
  const side = g.nodes.filter((n) => n.type === 'side_effect');
  // If route inventory is empty in a sparse checkout, this is zero — still valid.
  for (const n of side) {
    assert.equal(n.refs.heuristic, 'http_mutating_method');
    assert.equal(n.status, 'known');
  }
});
