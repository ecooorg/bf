/** P86: evidence-backed change-impact and generated-artifact lineage. Read-only. */
import fs from 'node:fs';
import path from 'node:path';

const INVENTORIES = [
  {
    artifact: 'docs/generated-route-inventory.json',
    generator: 'scripts/docsGenerateInventories.mjs',
    collection: 'routes',
    sourceField: 'file',
    edgeType: 'registers',
  },
  {
    artifact: 'docs/generated-env-inventory.json',
    generator: 'scripts/docsGenerateInventories.mjs',
    collection: 'variables',
    sourceField: 'files',
    edgeType: 'readsEnv',
  },
  {
    artifact: 'docs/generated-migration-inventory.json',
    generator: 'scripts/docsGenerateInventories.mjs',
    collection: 'migrations',
    sourceField: 'file',
    edgeType: 'declaresMigration',
  },
  {
    artifact: 'docs/generated-module-map.json',
    generator: 'scripts/architectureGenerateModuleMap.mjs',
    collection: 'modules',
    sourceField: 'path',
    edgeType: 'imports',
  },
];

const DECLARED_CONSUMERS = new Map([
  ['docs/generated-route-inventory.json', ['scripts/docsCheckInventories.mjs', 'scripts/acceptanceReport.mjs']],
  ['docs/generated-env-inventory.json', ['scripts/docsCheckInventories.mjs', 'scripts/acceptanceReport.mjs']],
  ['docs/generated-migration-inventory.json', ['scripts/docsCheckInventories.mjs', 'scripts/acceptanceReport.mjs']],
  ['docs/generated-module-map.json', []],
]);
const DECLARED_TESTS = new Map([
  ['docs/generated-route-inventory.json', ['tests/impact-lineage.test.mjs']],
  ['docs/generated-env-inventory.json', ['tests/impact-lineage.test.mjs']],
  ['docs/generated-migration-inventory.json', ['tests/impact-lineage.test.mjs']],
  ['docs/generated-module-map.json', ['tests/impact-lineage.test.mjs']],
]);

const KNOWN_GENERATOR_OUTPUTS = new Map();
for (const item of INVENTORIES) {
  if (!KNOWN_GENERATOR_OUTPUTS.has(item.generator)) KNOWN_GENERATOR_OUTPUTS.set(item.generator, []);
  KNOWN_GENERATOR_OUTPUTS.get(item.generator).push(item.artifact);
}

const TEST_HINTS = [
  { match: /^scripts\/docsGenerateInventories\.mjs$/, tests: ['docs:check', 'check:docs', 'test:regression'] },
  { match: /^scripts\/architectureGenerateModuleMap\.mjs$/, tests: ['architecture:check', 'test:regression'] },
  { match: /^tests\/impact-lineage\.test\.mjs$/, tests: ['test:impact-lineage'] },
  { match: /^server\/(?:.*Routes|server)\.ts$|^server\.ts$/, tests: ['test:core', 'test:project', 'test:security'] },
  { match: /^migrations\//, tests: ['test:database'] },
  { match: /^tests\//, tests: ['test:regression'] },
];

const norm = (value) => String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^bf-main\//, '');
const node = (id, kind, evidence) => ({ id, kind, evidence });
const edge = (from, to, type, provenance, confidence = 'explicit') => ({ from, to, type, provenance, confidence });

function readJson(rootDir, relativePath, readText) {
  try {
    return { data: JSON.parse(readText(path.join(rootDir, relativePath))), error: null };
  } catch (error) {
    return { data: null, error: error?.code === 'ENOENT' ? 'MISSING' : 'INVALID' };
  }
}

function artifactHealth(rootDir, spec, { exists, readText }) {
  const generatorExists = exists(path.join(rootDir, spec.generator));
  const artifactPath = path.join(rootDir, spec.artifact);
  if (!exists(artifactPath)) return { status: 'MISSING', generatorExists, reason: 'Generated artifact is absent.' };
  const parsed = readJson(rootDir, spec.artifact, readText);
  if (!parsed.data) return { status: parsed.error || 'INVALID', generatorExists, reason: 'Generated artifact is not valid JSON.' };
  if (parsed.data.generator !== spec.generator) {
    return { status: 'STALE', generatorExists, reason: `Artifact generator metadata does not match expected ${spec.generator}.` };
  }
  if (!generatorExists) return { status: 'UNKNOWN', generatorExists, reason: 'Artifact names a generator that is missing from this checkout.' };
  const records = parsed.data[spec.collection];
  if (!Array.isArray(records)) return { status: 'INVALID', generatorExists, reason: `Expected ${spec.collection}[] in generated artifact.` };
  const sourcePaths = [];
  for (const record of records) {
    const raw = record?.[spec.sourceField];
    if (Array.isArray(raw)) sourcePaths.push(...raw);
    else if (typeof raw === 'string') sourcePaths.push(raw);
  }
  const missingSources = [...new Set(sourcePaths.map(norm).filter((p) => p && !exists(path.join(rootDir, p))))].sort();
  if (missingSources.length) {
    return { status: 'STALE', generatorExists, reason: 'Artifact references source paths that are missing.', missingSources };
  }
  return { status: 'PRESENT', generatorExists, reason: 'JSON shape, generator metadata and referenced source paths are consistent.' };
}

function addInventoryEdges(rootDir, spec, edges, nodes, deps) {
  const parsed = readJson(rootDir, spec.artifact, deps.readText);
  if (!parsed.data) return;
  const data = parsed.data;
  const generatorNode = node(spec.generator, 'generator', 'declared in source generator metadata and explicit generator map');
  const artifactNode = node(spec.artifact, 'generated-artifact', `generator metadata: ${spec.generator}`);
  nodes.set(generatorNode.id, generatorNode);
  nodes.set(artifactNode.id, artifactNode);
  edges.push(edge(spec.generator, spec.artifact, 'generatedBy', `metadata:${spec.artifact}.generator`));

  const declaredConsumers = DECLARED_CONSUMERS.get(spec.artifact) || [];
  for (const consumer of declaredConsumers) {
    nodes.set(consumer, node(consumer, 'consumer', `declared consumer of ${spec.artifact}`));
    edges.push(edge(consumer, spec.artifact, 'consumesArtifact', `declared-consumer-map:${spec.artifact}`, 'explicit'));
  }
  for (const testFile of DECLARED_TESTS.get(spec.artifact) || []) {
    nodes.set(testFile, node(testFile, 'test', `declared lineage regression test for ${spec.artifact}`));
    edges.push(edge(testFile, spec.artifact, 'coveredByTest', `declared-test-map:${spec.artifact}`, 'explicit'));
  }

  const records = data[spec.collection];
  if (!Array.isArray(records)) return;
  if (spec.artifact === 'docs/generated-route-inventory.json') {
    for (const record of records) {
      if (!record || typeof record.path !== 'string' || typeof record.method !== 'string' || typeof record.file !== 'string') continue;
      const routeId = `route:${record.method.toUpperCase()} ${record.path}`;
      nodes.set(routeId, node(routeId, 'route', `recorded in ${spec.artifact}`));
      nodes.set(record.file, node(record.file, 'source', `route source recorded in ${spec.artifact}`));
      edges.push(edge(record.file, routeId, 'registers', `inventory:${spec.artifact}`, 'static-inventory'));
      edges.push(edge(routeId, spec.artifact, 'includedIn', `inventory:${spec.artifact}`, 'static-inventory'));
    }
  } else if (spec.artifact === 'docs/generated-env-inventory.json') {
    for (const record of records) {
      if (!record || typeof record.name !== 'string' || !Array.isArray(record.files)) continue;
      const envId = `env:${record.name}`;
      nodes.set(envId, node(envId, 'environment-variable', `recorded in ${spec.artifact}`));
      for (const file of record.files.filter((v) => typeof v === 'string')) {
        nodes.set(file, node(file, 'source', `environment reference recorded in ${spec.artifact}`));
        edges.push(edge(file, envId, 'readsEnv', `inventory:${spec.artifact}`, 'static-inventory'));
      }
    }
  } else if (spec.artifact === 'docs/generated-migration-inventory.json') {
    for (const record of records) {
      if (!record || typeof record.file !== 'string') continue;
      const migrationId = `migration:${record.file}`;
      nodes.set(record.file, node(record.file, 'migration-source', `recorded in ${spec.artifact}`));
      nodes.set(migrationId, node(migrationId, 'migration-record', `recorded in ${spec.artifact}`));
      edges.push(edge(record.file, migrationId, 'declaresMigration', `inventory:${spec.artifact}`, 'static-inventory'));
      edges.push(edge(migrationId, spec.artifact, 'includedIn', `inventory:${spec.artifact}`, 'static-inventory'));
    }
  } else if (spec.artifact === 'docs/generated-module-map.json') {
    for (const record of records) {
      if (!record || typeof record.path !== 'string' || !Array.isArray(record.imports)) continue;
      nodes.set(record.path, node(record.path, 'source', `module recorded in ${spec.artifact}`));
      for (const target of record.imports.filter((v) => typeof v === 'string')) {
        edges.push(edge(record.path, target, 'imports', `module-map:${spec.artifact}`, 'static-analysis'));
      }
    }
  }
}

function staticImpact(changedFiles, modules, importEdges) {
  const moduleSet = new Set(modules);
  const reverse = new Map();
  for (const file of modules) reverse.set(file, []);
  for (const item of importEdges) {
    if (!reverse.has(item.to)) reverse.set(item.to, []);
    reverse.get(item.to).push(item.from);
  }
  const direct = changedFiles.filter((file) => moduleSet.has(file));
  const affected = new Set(direct);
  const queue = [...direct];
  while (queue.length) {
    const current = queue.shift();
    for (const importer of reverse.get(current) || []) {
      if (!affected.has(importer)) { affected.add(importer); queue.push(importer); }
    }
  }
  return { direct, affected: [...affected].sort(), reverse };
}

export function buildImpactLineage({
  changedFiles = [], task = '', rootDir = process.cwd(),
  modules = [], importEdges = [],
  exists = fs.existsSync,
  readText = (file) => fs.readFileSync(file, 'utf8'),
} = {}) {
  const normalized = [...new Set(changedFiles.map(norm).filter(Boolean))].sort();
  const nodes = new Map();
  const edges = importEdges.map((item) => edge(item.from, item.to, item.type || 'imports', item.provenance || 'static-import-graph', item.confidence || 'static-analysis'));
  const deps = { exists, readText };
  const health = {};
  for (const spec of INVENTORIES) {
    health[spec.artifact] = artifactHealth(rootDir, spec, deps);
    addInventoryEdges(rootDir, spec, edges, nodes, deps);
  }

  const staticResult = staticImpact(normalized, modules, importEdges);
  for (const file of normalized) nodes.set(file, node(file, 'changed-file', 'explicit CLI input'));
  for (const file of staticResult.affected) {
    nodes.set(file, node(file, file === normalized.find((x) => x === file) ? 'changed-file' : 'importer', 'static import graph'));
  }

  const byArtifact = new Map(INVENTORIES.map((spec) => [spec.artifact, spec]));
  const impacted = new Set([...normalized, ...staticResult.affected]);
  const impactPaths = [];
  const uncertainties = [];
  const addImpact = (id, reason, via = []) => {
    impacted.add(id);
    impactPaths.push({ target: id, reason, via });
  };

  for (const file of normalized) {
    const asGenerator = KNOWN_GENERATOR_OUTPUTS.get(file);
    if (asGenerator) {
      for (const artifact of asGenerator) {
        addImpact(artifact, 'Output declared by changed generator.', [file, artifact]);
        const consumers = [...new Set([...(DECLARED_CONSUMERS.get(artifact) || []), ...(DECLARED_TESTS.get(artifact) || [])])];
        for (const consumer of consumers) {
          addImpact(consumer, consumer.startsWith('tests/') ? 'Declared regression test for generated artifact.' : 'Declared executable consumer of generated artifact.', [file, artifact, consumer]);
        }
      }
    }
    if (byArtifact.has(file)) {
      const spec = byArtifact.get(file);
      addImpact(spec.generator, 'Declared generator for changed artifact.', [file, spec.generator]);
      const consumers = [...new Set([...(DECLARED_CONSUMERS.get(file) || []), ...(DECLARED_TESTS.get(file) || [])])];
      for (const consumer of consumers) {
        addImpact(consumer, consumer.startsWith('tests/') ? 'Declared regression test for changed artifact.' : 'Declared executable consumer of changed artifact.', [file, consumer]);
      }
      // Include only records belonging to the changed artifact; do not fan out to sibling inventories.
      for (const includeEdge of edges.filter((e) => e.to === file && e.type === 'includedIn')) {
        addImpact(includeEdge.from, 'Record included in changed generated artifact.', [file, includeEdge.from]);
        for (const sourceEdge of edges.filter((e) => e.to === includeEdge.from && ['registers', 'readsEnv', 'declaresMigration'].includes(e.type))) {
          addImpact(sourceEdge.from, 'Source represented by a record in the changed artifact.', [file, includeEdge.from, sourceEdge.from]);
        }
      }
      if (health[file]?.status !== 'PRESENT') uncertainties.push(`${file} lineage health is ${health[file]?.status || 'UNKNOWN'}: ${health[file]?.reason || 'no status'}`);
    }

    // A source route/env/migration entry can be connected only when the current inventory records it.
    for (const e of edges) {
      if (e.from === file && ['registers', 'readsEnv', 'declaresMigration'].includes(e.type)) {
        addImpact(e.to, `Relationship recorded by ${e.provenance}.`, [file, e.to]);
        const artifact = e.provenance.match(/^inventory:(.+)$/)?.[1];
        if (artifact) addImpact(artifact, 'Generated inventory records this source relationship.', [file, e.to, artifact]);
      }
    }

    let text = '';
    try { text = readText(path.join(rootDir, file)); } catch { /* Missing or non-text target is handled as uncertainty below. */ }
    if (/\bimport\s*\(\s*[^'"`]/.test(text) || /require\s*\(\s*[A-Za-z_$]/.test(text)) {
      uncertainties.push(`${file} contains a dynamic import/require pattern; static impact may be incomplete.`);
    }
    const hasLineageEvidence = edges.some((item) => item.from === file || item.to === file);
    if (!byArtifact.has(file) && !asGenerator && !staticResult.affected.includes(file) && !hasLineageEvidence) {
      uncertainties.push(`${file} has no explicit generator-lineage mapping; no lineage edge was inferred from its filename.`);
    }
  }

  const suggestedTests = new Set();
  for (const file of [...normalized, ...staticResult.affected, ...impacted]) {
    for (const hint of TEST_HINTS) if (hint.match.test(file)) hint.tests.forEach((test) => suggestedTests.add(test));
  }
  const uniqueEdges = [...new Map(edges.map((e) => [`${e.from}\0${e.to}\0${e.type}\0${e.provenance}`, e])).values()]
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.type.localeCompare(b.type));
  const relevantIds = new Set([...impacted, ...impactPaths.flatMap((p) => p.via)]);
  const relevantEdges = uniqueEdges.filter((e) => relevantIds.has(e.from) || relevantIds.has(e.to));
  const relevantNodes = [...nodes.values()].filter((n) => relevantIds.has(n.id) || normalized.includes(n.id)).sort((a, b) => a.id.localeCompare(b.id));

  const knownEvidence = normalized.some((file) => byArtifact.has(file) || KNOWN_GENERATOR_OUTPUTS.has(file)) || staticResult.affected.length > 0 || impactPaths.length > 0;
  return {
    schemaVersion: 1,
    kind: 'change-impact-lineage',
    status: !normalized.length ? 'UNKNOWN' : knownEvidence ? 'PARTIAL' : 'UNKNOWN',
    task: task.trim() || null,
    intentDiff: {
      requestedIntent: task.trim() || null,
      requestedIntentEvidence: task.trim() ? 'user-supplied text; not semantically verified' : 'not supplied',
      changedSurface: normalized,
      observedImpact: [...impacted].sort(),
      verification: [...suggestedTests].sort().map((name) => ({ command: `npm run ${name}`, status: 'SUGGESTED_NOT_RUN' })),
      unverified: [
        'This is a static, evidence-backed impact estimate, not a semantic source diff or proof of behavior.',
        'Dynamic dispatch, generated code outside declared generators and external consumers may be missing.',
        ...uncertainties,
      ],
    },
    changedFiles: normalized,
    staticImportImpact: { directModules: staticResult.direct, affectedModules: staticResult.affected },
    generatedArtifacts: health,
    nodes: relevantNodes,
    edges: relevantEdges,
    impactPaths: [...new Map(impactPaths.map((p) => [`${p.target}\0${p.reason}`, p])).values()]
      .sort((a, b) => a.target.localeCompare(b.target) || a.reason.localeCompare(b.reason)),
    uncertainties: [...new Set(uncertainties)].sort(),
    scope: 'Read-only deterministic lineage from declared generator metadata, exact source references, generated inventories and supplied static import graph. No runtime execution, network access or semantic inference.',
  };
}

export const P86_INVENTORY_SPECS = INVENTORIES.map((item) => ({ ...item }));
