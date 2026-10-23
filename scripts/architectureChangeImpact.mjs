#!/usr/bin/env node
/**
 * Estimate change impact from a list of changed files (args or stdin).
 * Prints affected importers (reverse deps), layers, suggested test areas.
 *
 * Usage:
 *   node scripts/architectureChangeImpact.mjs server/taskService.ts
 *   git diff --name-only | node scripts/architectureChangeImpact.mjs
 */
import {
  buildGraph,
  layerOf,
  listSourceFiles,
  root,
} from './architectureLib.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { readFileSync } from 'node:fs';

function collectChangedFromArgs() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  if (args.length) return args.map((a) => a.replace(/\\/g, '/'));
  // stdin
  if (!process.stdin.isTTY) {
    const text = readFileSync(0, 'utf8');
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((a) => a.replace(/\\/g, '/'));
  }
  return [];
}

const TEST_HINTS = [
  { match: /^server\/(taskService|gateService|codeTaskService|gateEngine)/, tests: ['test:gates', 'test:project', 'test:pipeline'] },
  { match: /^server\/(router|modelHealth|modelRegistry|adapter|gemini|openai)/, tests: ['test:models'] },
  { match: /^server\/(security|redact|untrustedData)/, tests: ['test:security'] },
  { match: /^server\/(files|documents)/, tests: ['test:files'] },
  { match: /^server\/(database|projectRepository|stateService)/, tests: ['test:database', 'test:project'] },
  { match: /^server\/(githubIntegration)/, tests: ['test:integrations'] },
  { match: /^server\/(webSearch|epistemic)/, tests: ['test:web'] },
  { match: /^server\.ts$/, tests: ['test:core', 'test:security', 'test:project'] },
  { match: /^src\/workspace\//, tests: ['test:workspace'] },
  { match: /^src\/(App|ProjectMode|ConversationFiles)/, tests: ['test:project', 'test:ui'] },
  { match: /^src\//, tests: ['test:core'] },
  { match: /^migrations\//, tests: ['test:database'] },
  { match: /^tests\/feature-manifest/, tests: ['test:regression'] },
];

const changed = collectChangedFromArgs();
if (!changed.length) {
  console.error('change-impact: provide changed file paths as args or on stdin');
  process.exit(2);
}

const { modules, edges } = buildGraph();
const moduleSet = new Set(modules);

// Reverse graph
const importers = {};
for (const m of modules) importers[m] = [];
for (const [from, dests] of Object.entries(edges)) {
  for (const to of dests) {
    if (!importers[to]) importers[to] = [];
    importers[to].push(from);
  }
}

const normalized = changed.map((c) => {
  let p = c.replace(/^\.\//, '');
  if (p.startsWith('bf-main/')) p = p.slice('bf-main/'.length);
  return p;
});

const directModules = normalized.filter((p) => moduleSet.has(p));
const otherFiles = normalized.filter((p) => !moduleSet.has(p));

// BFS reverse deps
const affected = new Set(directModules);
const queue = [...directModules];
while (queue.length) {
  const n = queue.shift();
  for (const imp of importers[n] || []) {
    if (!affected.has(imp)) {
      affected.add(imp);
      queue.push(imp);
    }
  }
}

const suggestedTests = new Set();
for (const f of normalized) {
  for (const h of TEST_HINTS) {
    if (h.match.test(f)) h.tests.forEach((t) => suggestedTests.add(t));
  }
}

const byLayer = { server: [], src: [], other: [] };
for (const m of [...affected].sort()) {
  const layer = layerOf(m);
  const bucket = byLayer[layer] ? layer : 'other';
  byLayer[bucket].push(m);
}

const report = {
  status: 'PASSED',
  changedInput: normalized,
  directModules,
  nonModuleFiles: otherFiles,
  affectedModuleCount: affected.size,
  affectedModules: [...affected].sort(),
  affectedByLayer: byLayer,
  suggestedNpmScripts: [...suggestedTests].sort(),
  notes: [
    'Impact is static reverse-import reachability only.',
    'HTTP contract, DB schema and feature-manifest links are not fully modeled yet.',
    'Always run full `npm run check` before release; use suggested scripts for focused iteration.',
  ],
};

const outPath = path.join(root, 'docs/generated-change-impact-last.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');

console.log('change-impact');
console.log(`  input files: ${normalized.length}`);
console.log(`  direct modules: ${directModules.length}`);
console.log(`  affected modules (reverse deps): ${affected.size}`);
if (byLayer.server.length) console.log(`  server: ${byLayer.server.slice(0, 12).join(', ')}${byLayer.server.length > 12 ? '…' : ''}`);
if (byLayer.src.length) console.log(`  src: ${byLayer.src.slice(0, 12).join(', ')}${byLayer.src.length > 12 ? '…' : ''}`);
console.log(`  suggested: ${report.suggestedNpmScripts.join(', ') || '(none — run npm run check)'}`);
console.log(`  report → docs/generated-change-impact-last.json`);
