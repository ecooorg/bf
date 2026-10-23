#!/usr/bin/env node
/**
 * Enforce import cycles (ratchet) and layer boundary rules.
 * Exit 0 if only known violations remain; exit 1 on new violations.
 */
import {
  buildGraph,
  findCycles,
  cycleKey,
  layerOf,
  readJson,
  root,
} from './architectureLib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const RULES_PATH = 'docs/architecture-boundary-rules.json';
const KNOWN_PATH = 'docs/architecture-known-violations.json';

const rules = readJson(RULES_PATH);
const known = readJson(KNOWN_PATH, { knownCycles: [], knownBoundaryViolations: [] });

if (!rules) {
  console.error(`Missing ${RULES_PATH}`);
  process.exit(1);
}

const { edges } = buildGraph();
const cycles = findCycles(edges);

const knownCycleKeys = new Set((known.knownCycles || []).map((c) => c.key));
const newCycles = [];
const residualKnown = [];

for (const c of cycles) {
  const key = cycleKey(c);
  if (knownCycleKeys.has(key)) residualKnown.push({ key, path: c });
  else newCycles.push({ key, path: c });
}

// Fixed cycles that were in ratchet but no longer present — informational
const foundKeys = new Set(cycles.map((c) => cycleKey(c)));
const fixedCycles = (known.knownCycles || []).filter((c) => !foundKeys.has(c.key));

// Boundary edges
const allowedEdgeSet = new Set(
  (rules.allowedEdges || []).map((e) => `${e.from}->${e.to}`),
);
const exceptionSet = new Set(
  (rules.allowedExceptions || []).map((e) => `${e.from}=>${e.to}`),
);
const knownBoundaryKeys = new Set(
  (known.knownBoundaryViolations || []).map((v) => `${v.from}=>${v.to}`),
);

const boundaryViolations = [];
for (const [from, dests] of Object.entries(edges)) {
  const fromLayer = layerOf(from);
  for (const to of dests) {
    const toLayer = layerOf(to);
    if (fromLayer === toLayer) continue;
    const edgeKey = `${fromLayer}->${toLayer}`;
    const pairKey = `${from}=>${to}`;
    if (exceptionSet.has(pairKey)) continue;
    if (allowedEdgeSet.has(edgeKey)) continue;
    boundaryViolations.push({ from, to, fromLayer, toLayer });
  }
}

const newBoundary = [];
const residualBoundary = [];
for (const v of boundaryViolations) {
  const k = `${v.from}=>${v.to}`;
  if (knownBoundaryKeys.has(k)) residualBoundary.push(v);
  else newBoundary.push(v);
}

const report = {
  status: newCycles.length === 0 && newBoundary.length === 0 ? 'PASSED' : 'FAILED',
  cycles: {
    found: cycles.length,
    knownResidual: residualKnown.length,
    new: newCycles,
    fixedSinceRatchet: fixedCycles.map((c) => c.key),
  },
  boundaries: {
    violationsFound: boundaryViolations.length,
    knownResidual: residualBoundary.length,
    new: newBoundary,
    exceptionsInForce: (rules.allowedExceptions || []).length,
  },
};

// Human-readable output
console.log('architecture:check');
console.log(`  cycles: ${cycles.length} found, ${residualKnown.length} known, ${newCycles.length} new`);
if (newCycles.length) {
  for (const c of newCycles) {
    console.error(`  NEW CYCLE: ${c.key}`);
    console.error(`    ${c.path.join(' → ')}`);
  }
}
if (fixedCycles.length) {
  console.log(`  fixed since ratchet (safe to remove from known-violations):`);
  for (const c of fixedCycles) console.log(`    ${c.key}`);
}

console.log(
  `  boundaries: ${boundaryViolations.length} violations, ${residualBoundary.length} known, ${newBoundary.length} new`,
);
if (newBoundary.length) {
  for (const v of newBoundary) {
    console.error(`  NEW BOUNDARY: ${v.from} (${v.fromLayer}) → ${v.to} (${v.toLayer})`);
  }
}

const outDir = path.join(root, 'docs');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'generated-boundary-report.json'),
  JSON.stringify(report, null, 2) + '\n',
  'utf8',
);

if (report.status === 'FAILED') {
  console.error('architecture:check FAILED — new violations require a fix or an explicit ratchet update');
  process.exit(1);
}
console.log('architecture:check PASSED (ratchet holds)');
process.exit(0);
