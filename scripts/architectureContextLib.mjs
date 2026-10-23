/** P81: conservative, deterministic context discovery. No application code execution. */
import fs from 'node:fs';
import path from 'node:path';
import { buildGraph, root } from './architectureLib.mjs';

const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^bf-main\//, '');
const uniq = (xs) => [...new Set(xs)].sort();
const relatedTests = [
  [/^server\/(taskService|gateService|codeTaskService|gateEngine)/, ['test:gates', 'test:project', 'test:pipeline']],
  [/^server\/(security|redact|untrustedData)/, ['test:security']],
  [/^server\/(database|projectRepository|stateService)/, ['test:database', 'test:project']],
  [/^server\/(files|documents)/, ['test:files']],
  [/^server\/(githubIntegration)/, ['test:integrations']],
  [/^src\/workspace\//, ['test:workspace']],
  [/^src\//, ['test:core']],
  [/^migrations\//, ['test:database']],
  [/^server\.ts$/, ['test:core', 'test:security', 'test:project']],
];
const tokenRE = /\b(?:[A-Z][A-Z0-9_]{3,}|[a-z][a-zA-Z0-9_]*_id)\b/g;

export function planContext(inputs, { graph = buildGraph(), readFile = read, fileExists = exists } = {}) {
  const targets = uniq(inputs.map(norm));
  const moduleSet = new Set(graph.modules);
  const incoming = new Map(graph.modules.map((p) => [p, []]));
  for (const [from, dests] of Object.entries(graph.edges)) {
    for (const dest of dests) if (incoming.has(dest)) incoming.get(dest).push(from);
  }
  const confirmed = new Map();
  const add = (file, reason) => {
    if (!fileExists(file) || targets.includes(file)) return;
    if (!confirmed.has(file)) confirmed.set(file, new Set());
    confirmed.get(file).add(reason);
  };
  const uncertainty = new Set([
    'Static imports do not establish runtime behavior or dynamic-import reachability.',
    'HTTP request/response schemas, database column use, and feature-manifest links are not exhaustively resolved.',
    'Suggested tests are hints, not proof of coverage; run npm run check before release.',
  ]);
  const suggested = new Set();
  const invalid = targets.filter((p) => p.startsWith('/') || p.includes('..') || !fileExists(p));
  if (invalid.length) throw new Error(`Missing or unsafe target(s): ${invalid.join(', ')}`);
  for (const target of targets) {
    if (moduleSet.has(target)) {
      for (const dep of graph.edges[target] || []) add(dep, `static import from ${target}`);
      for (const importer of incoming.get(target) || []) add(importer, `static importer of ${target}`);
    } else uncertainty.add(`No static TypeScript module graph entry for ${target}.`);
    for (const [pattern, tests] of relatedTests) if (pattern.test(target)) tests.forEach((t) => suggested.add(t));
    // Explicit textual evidence, never interpreted as an authoritative runtime dependency.
    const body = readFile(target);
    const envNames = uniq([...body.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)].map((m) => m[1]));
    if (envNames.length && fileExists('.env.example')) add('.env.example', `environment names in ${target}: ${envNames.join(', ')}`);
    if (/\b(?:fetch\(|app\.(?:get|post|put|patch|delete)\(|router\.(?:get|post|put|patch|delete)\()/.test(body)) {
      uncertainty.add(`HTTP contract usage detected in ${target}; endpoints and consumers require manual verification.`);
    }
    if (/\b(?:SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE)\b/i.test(body)) {
      uncertainty.add(`SQL usage detected in ${target}; migration/column compatibility requires manual verification.`);
      if (fileExists('docs/generated-migration-inventory.json')) add('docs/generated-migration-inventory.json', `SQL evidence in ${target}; inventory is navigation only`);
    }
    if (/feature.manifest|featureManifest/i.test(body) && fileExists('tests/feature-manifest.json')) {
      add('tests/feature-manifest.json', `feature-manifest reference in ${target}`);
    }
  }
  const evidence = [...confirmed].sort(([a], [b]) => a.localeCompare(b)).map(([file, reasons]) => ({ file, reasons: [...reasons].sort() }));
  return {
    schemaVersion: 1,
    targets,
    staticContextCandidates: evidence.filter((e) => e.reasons.some((r) => r.startsWith('static '))),
    supportingContext: evidence.filter((e) => !e.reasons.some((r) => r.startsWith('static '))),
    suggestedNpmScripts: [...suggested].sort(),
    verification: ['npm run architecture:check', 'npm run check:docs', 'npm run check'],
    uncertainties: [...uncertainty].sort(),
    scope: 'One-hop static imports and importers; explicit source evidence for selected non-import links. Not a complete dependency graph.',
  };
}

export function baselineMetrics(graph = buildGraph()) {
  const files = graph.modules;
  const lines = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(root, f), 'utf8').split(/\r?\n/).length]));
  const incoming = Object.fromEntries(files.map((f) => [f, 0]));
  for (const dests of Object.values(graph.edges)) for (const dest of dests) if (dest in incoming) incoming[dest]++;
  return {
    schemaVersion: 1,
    source: 'v80 + p80.1 before P81 code changes',
    measurement: 'Static TS/TSX imports; one-hop context only; line counts are a token-cost proxy, not tokens.',
    modules: files.length,
    staticEdges: Object.values(graph.edges).reduce((n, a) => n + a.length, 0),
    totalSourceLines: Object.values(lines).reduce((n, x) => n + x, 0),
    largest: Object.entries(lines).sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 15).map(([file, count]) => ({file, lines:count})),
    sampleContext: ['src/ExpertStepScreens.tsx', 'server.ts', 'server/codeTaskService.ts'].filter((f) => files.includes(f)).map((target) => {
      const neighborhood = uniq([target, ...(graph.edges[target] || []), ...files.filter((f) => (graph.edges[f] || []).includes(target))]);
      return { target, oneHopFiles: neighborhood.length, oneHopLines: neighborhood.reduce((n, f) => n + (lines[f] || 0), 0) };
    }),
  };
}
