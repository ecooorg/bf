#!/usr/bin/env node
/**
 * P111 — write docs/generated-capability-graph.json
 * Usage:
 *   node scripts/capabilityGenerateGraph.mjs
 *   node scripts/capabilityGenerateGraph.mjs --check   # exit 1 if missing/stale vs current inventories
 *   node scripts/capabilityGenerateGraph.mjs --intent path/to/contract.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCapabilityGraph, loadIntentContracts, root } from './capabilityGraphLib.mjs';

const outRel = 'docs/generated-capability-graph.json';
const outPath = path.join(root, outRel);

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const intentArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--intent' && args[i + 1]) {
    intentArgs.push(args[++i]);
  }
}

const contracts = loadIntentContracts(intentArgs);
const graph = buildCapabilityGraph({ intentContracts: contracts });

// Deterministic JSON (stable key order already from sort)
const rendered = JSON.stringify(graph, null, 1) + '\n';

if (checkOnly) {
  if (!fs.existsSync(outPath)) {
    console.error(`${outRel} is missing; run npm run docs:generate`);
    process.exit(1);
  }
  const current = fs.readFileSync(outPath, 'utf8');
  // Compare structural summary + node/edge counts; full byte compare is brittle on generatedAt
  let prev;
  try {
    prev = JSON.parse(current);
  } catch {
    console.error(`${outRel} is not valid JSON; run npm run docs:generate`);
    process.exit(1);
  }
  const sameShape =
    prev.kind === graph.kind &&
    prev.summary?.nodeCount === graph.summary.nodeCount &&
    prev.summary?.edgeCount === graph.summary.edgeCount &&
    JSON.stringify(prev.summary?.nodeCounts) === JSON.stringify(graph.summary.nodeCounts);
  if (!sameShape) {
    console.error(`${outRel} is stale relative to current inventories; run npm run docs:generate`);
    process.exit(1);
  }
  console.log(`${outRel} is up to date (${graph.summary.nodeCount} nodes, ${graph.summary.edgeCount} edges)`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, rendered);
console.log(
  `Wrote ${outRel}: ${graph.summary.nodeCount} nodes, ${graph.summary.edgeCount} edges; unknown=${graph.summary.unknownNodes} stale=${graph.summary.staleNodes}`,
);
