#!/usr/bin/env node
/**
 * Generate machine-readable module map from static imports.
 * Output: docs/generated-module-map.json
 */
import {
  buildGraph,
  findCycles,
  cycleKey,
  layerOf,
  writeJson,
  root,
} from './architectureLib.mjs';
import path from 'node:path';

const OUT = 'docs/generated-module-map.json';

const { modules, edges, lines } = buildGraph();
const cycles = findCycles(edges).map((c) => ({
  key: cycleKey(c),
  path: c,
}));

const fanIn = {};
for (const mod of modules) fanIn[mod] = 0;
for (const dests of Object.values(edges)) {
  for (const d of dests) {
    if (fanIn[d] !== undefined) fanIn[d] += 1;
  }
}

const byLayer = { server: [], src: [], other: [] };
for (const m of modules) {
  const layer = layerOf(m);
  const bucket = byLayer[layer] ? layer : 'other';
  byLayer[bucket].push(m);
}

const map = {
  generatedAt: new Date().toISOString(),
  generator: 'scripts/architectureGenerateModuleMap.mjs',
  root: path.basename(root),
  summary: {
    moduleCount: modules.length,
    edgeCount: Object.values(edges).reduce((n, a) => n + a.length, 0),
    cycleCount: cycles.length,
    totalLines: Object.values(lines).reduce((a, b) => a + b, 0),
  },
  cycles,
  layers: {
    server: byLayer.server.length,
    src: byLayer.src.length,
    other: byLayer.other.length,
  },
  modules: modules.map((m) => ({
    path: m,
    layer: layerOf(m),
    lines: lines[m] || 0,
    imports: edges[m] || [],
    fanIn: fanIn[m] || 0,
  })),
  topFanIn: Object.entries(fanIn)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([path, count]) => ({ path, count })),
  largest: Object.entries(lines)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([path, n]) => ({ path, lines: n })),
};

writeJson(OUT, map);
console.log(
  `module-map OK: ${map.summary.moduleCount} modules, ${map.summary.edgeCount} edges, ${map.summary.cycleCount} cycles → ${OUT}`,
);
